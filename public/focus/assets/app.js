/* Focus Board: private, client-side encrypted notebook dashboard.
 * vault.enc.json is AES-256-GCM encrypted with a key derived from your password
 * (PBKDF2-SHA256, 600k iterations). Nothing is readable without the password.
 * Progress syncs back to the private GitHub repo through the Contents API with a
 * fine-grained token that is itself stored encrypted in this browser only. */
"use strict";
(() => {
  const ITER = 600000;
  const IDLE_LOCK_MS = 20 * 60 * 1000;
  const HEAT_WEEKS = 52;
  const LS = { vault: "fb.vault", tok: "fb.tok", cfg: "fb.cfg", fails: "fb.fails", ui: "fb.ui" };
  const DEFAULT_CFG = { owner: "Utshav-paudel", repo: "Medval", branch: "claude/inspiring-planck-ky76by", path: "vault.enc.json" };

  const $ = (s, el = document) => el.querySelector(s);
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https:\/\//i.test(u || "") ? esc(u) : "");
  const ext = (u, label, cls = "mini") => (safeUrl(u) ? `<a class="${cls}" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "");
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
    json(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  };

  // ---------- crypto ----------
  async function deriveKey(password, salt, iter = ITER) {
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base,
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function sealWith(key, salt, obj, iter = ITER) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj))));
    return { v: 1, kdf: "PBKDF2-SHA256", iter, salt: b64(salt), iv: b64(iv), ct: b64(ct), savedAt: obj.savedAt || null };
  }
  async function open(key, vault) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(vault.iv) }, key, unb64(vault.ct));
    return JSON.parse(dec.decode(pt));
  }

  // ---------- state ----------
  let S = null; // { data, key, salt, pw, iter }
  let ui = Object.assign({ view: "today", appSec: "send", kind: "all", hideDone: true, q: "", flagged: false, track: "all" }, ls.json(LS.ui, {}));
  let pushTimer = null, idleTimer = null, remoteSha = null;
  const cfg = () => Object.assign({}, DEFAULT_CFG, ls.json(LS.cfg, {}));

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
  }
  function setSync(text, state = "") { $("#sync").textContent = `kernel: utshav · ${text}`; $("#kdot").className = state; }

  // ---------- GitHub sync ----------
  async function getToken() {
    const raw = ls.json(LS.tok, null);
    if (!raw || !S) return null;
    try { return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(raw.iv) }, S.key, unb64(raw.ct))); }
    catch { return null; }
  }
  async function saveToken(tok) {
    if (!tok) { ls.del(LS.tok); return; }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, S.key, enc.encode(tok)));
    ls.set(LS.tok, JSON.stringify({ iv: b64(iv), ct: b64(ct) }));
  }
  function apiUrl() {
    const c = cfg();
    return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${c.path.split("/").map(encodeURIComponent).join("/")}`;
  }
  async function gh(tok, method, body) {
    const c = cfg();
    const url = apiUrl() + (method === "GET" ? `?ref=${encodeURIComponent(c.branch)}&t=${Date.now()}` : "");
    const r = await fetch(url, {
      method, cache: "no-store",
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; throw e; }
    return r.json();
  }
  async function pullRemote() {
    const tok = await getToken();
    if (!tok) return null;
    const j = await gh(tok, "GET");
    remoteSha = j.sha;
    return JSON.parse(dec.decode(unb64(j.content.replace(/\n/g, ""))));
  }
  function mergeProgress(a = {}, b = {}) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) if (!out[k] || (v.at || "") > (out[k].at || "")) out[k] = v;
    return out;
  }
  async function openAny(vault) {
    try {
      if (vault.salt === b64(S.salt) && (vault.iter || ITER) === S.iter) return await open(S.key, vault);
      const k = await deriveKey(S.pw, unb64(vault.salt), vault.iter || ITER);
      return await open(k, vault);
    } catch { return null; }
  }
  async function pushNow() {
    const tok = await getToken();
    if (!tok) { setSync("saved on device", "ok"); return; }
    setSync("syncing", "busy");
    try {
      if (!remoteSha) await pullRemote().catch(() => null);
      const vault = await sealWith(S.key, S.salt, S.data, S.iter);
      const body = { message: `Progress update ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, content: b64(enc.encode(JSON.stringify(vault))), branch: cfg().branch, sha: remoteSha || undefined };
      try {
        const r = await gh(tok, "PUT", body); remoteSha = r.content.sha;
      } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        const remote = await pullRemote();               // another device saved first: merge, retry once
        if (remote) { const other = await openAny(remote); if (other) S.data.progress = mergeProgress(other.progress, S.data.progress); }
        const v2 = await sealWith(S.key, S.salt, S.data, S.iter);
        const r = await gh(tok, "PUT", { ...body, content: b64(enc.encode(JSON.stringify(v2))), sha: remoteSha });
        remoteSha = r.content.sha;
      }
      setSync("synced to github", "ok");
    } catch (e) {
      setSync(e.status === 401 || e.status === 403 ? "token rejected" : "offline · saved on device", "err");
    }
  }
  async function persist() {
    S.data.savedAt = new Date().toISOString();
    ls.set(LS.vault, JSON.stringify(await sealWith(S.key, S.salt, S.data, S.iter)));
    setSync("saving", "busy");
    clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 1500);
  }

  // ---------- unlock / lock ----------
  async function loadBundled() {
    try { const r = await fetch("vault.enc.json", { cache: "no-store" }); if (r.ok) return r.json(); } catch {}
    return null;
  }
  async function unlock(pw) {
    const fails = ls.json(LS.fails, { n: 0, until: 0 });
    if (Date.now() < fails.until) throw new Error(`RateLimitError: too many attempts, retry in ${Math.ceil((fails.until - Date.now()) / 1000)}s`);
    const cands = [ls.json(LS.vault, null), await loadBundled()].filter(Boolean)
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
    if (!cands.length) throw new Error("FileNotFoundError: vault.enc.json (are you online?)");
    let data = null, used = null, key = null;
    for (const v of cands) {             // newest copy wins for content; ticks from every copy are merged
      try {
        const k = await deriveKey(pw, unb64(v.salt), v.iter || ITER), d = await open(k, v);
        if (!data) { data = d; used = v; key = k; } else data.progress = mergeProgress(d.progress, data.progress);
      } catch {}
    }
    if (!data) {
      fails.n += 1; if (fails.n >= 3) fails.until = Date.now() + Math.min(300000, 2 ** (fails.n - 3) * 15000);
      ls.set(LS.fails, JSON.stringify(fails));
      throw new Error("PermissionError: wrong password");
    }
    ls.del(LS.fails);
    S = { data, key, salt: unb64(used.salt), pw, iter: used.iter || ITER };
    try {
      const remote = await pullRemote();
      if (remote && String(remote.savedAt || "") > String(S.data.savedAt || "")) {
        const other = await openAny(remote);
        if (other) { other.progress = mergeProgress(S.data.progress, other.progress); S.data = other; ls.set(LS.vault, JSON.stringify(remote)); }
      }
      setSync(remote ? "synced to github" : "saved on device", "ok");
    } catch { setSync("offline · saved copy", "err"); }
  }
  function showApp(on) {
    $("#lock").hidden = on; $("#app").hidden = !on; $("#tabs").hidden = !on; $("#lockBtn").hidden = !on;
    $("#filename").textContent = on ? `focus/${ui.view}.ipynb` : "focus.ipynb";
  }
  function lock() {
    S = null; remoteSha = null; clearTimeout(pushTimer);
    $("#app").innerHTML = ""; showApp(false); setSync("locked", "");
    $("#lockOut").hidden = true; $("#pw").value = ""; $("#pw").focus();
  }
  function bumpIdle() { clearTimeout(idleTimer); if (S) idleTimer = setTimeout(() => { lock(); toast("Locked after 20 min idle"); }, IDLE_LOCK_MS); }

  // ---------- data helpers ----------
  const P = (id) => (S.data.progress[id] || {}).s;
  async function setP(id, s) {
    if (s) S.data.progress[id] = { s, at: new Date().toISOString() }; else delete S.data.progress[id];
    render(); await persist();
  }
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const trekDay = () => Math.floor((today() - parseDay(S.data.trek.start)) / 86400000) + 1;
  const lessonByNum = (n) => S.data.lessons.find((l) => l.num === n);
  const activeLessons = () => S.data.lessons.filter((l) => !l.supersededBy);

  // Every "done" tick counts on the day it happened; applications sent before the board existed count on their send date.
  function activity() {
    const m = new Map();
    const add = (k) => m.set(k, (m.get(k) || 0) + 1);
    for (const v of Object.values(S.data.progress)) if (v.s === "done" && v.at) add(dayKey(new Date(v.at)));
    for (const a of S.data.apps) if (a.section === "waiting" && a.date) add(a.date);
    return m;
  }
  function streaks(m) {
    let cur = 0, d = today();
    if (!m.get(dayKey(d))) d = addDays(d, -1);           // today not done yet doesn't break the streak
    while (m.get(dayKey(d))) { cur++; d = addDays(d, -1); }
    const keys = [...m.keys()].sort();
    let best = 0, run = 0, prev = null;
    for (const k of keys) {
      const dd = parseDay(k);
      run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
      best = Math.max(best, run); prev = dd;
    }
    return { cur, best };
  }

  // ---------- notebook cells ----------
  let n = 0;
  const md = (body, first = false) => `<div class="cell md${first ? " first" : ""}"><div class="cc"></div><div class="cb">${body}</div></div>`;
  const code = (src) => `<div class="cell code"><div class="cc in">In [${++n}]:</div><div class="cb">${src}</div></div>`;
  const out = (body) => `<div class="cell attached"><div class="cc outc">Out[${n}]:</div><div class="cb">${body}</div></div>`;
  const fn = (name, args = "") => `<span class="kw">${name}</span>(${args})`;
  const s_ = (v) => `<span class="str">"${esc(v)}"</span>`, n_ = (v) => `<span class="num">${esc(v)}</span>`;

  function render() {
    if (!S) return;
    n = 0;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.view === ui.view));
    $("#filename").textContent = `focus/${ui.view}.ipynb`;
    ls.set(LS.ui, JSON.stringify(ui));
    ({ today: viewToday, lessons: viewLessons, apps: viewApps, settings: viewSettings }[ui.view] || viewToday)();
    $("#app").querySelectorAll("[data-w]").forEach((i) => { i.style.width = i.dataset.w + "%"; }); // CSP: no inline style attrs
    $("#app").querySelectorAll(".heat-scroll").forEach((h) => { h.scrollLeft = h.scrollWidth; }); // newest weeks in view on phones
  }

  function statsHtml() {
    const L = activeLessons(), ld = L.filter((l) => P(l.id) === "done").length;
    const trek = S.data.trek.lessons.map(lessonByNum), td = trek.filter((l) => P(l.id) === "done").length;
    const send = S.data.apps.filter((a) => a.section === "send"), sd = send.filter((a) => P(a.id)).length;
    const portal = S.data.apps.filter((a) => a.section === "portal"), pd = portal.filter((a) => P(a.id)).length;
    const card = (k, v, t) => `<div class="stat"><div class="k">${k}</div><div class="v">${v} <small>/ ${t}</small></div><div class="bar"><i data-w="${Math.round((v / t) * 100)}"></i></div></div>`;
    return `<div class="stats">${card("trek_lessons", td, trek.length)}${card("lessons", ld, L.length)}${card("drafts_handled", sd, send.length)}${card("portal_applies", pd, portal.length)}</div>`;
  }

  function heatHtml() {
    const m = activity(), { cur, best } = streaks(m), t = today();
    const start = addDays(t, -(HEAT_WEEKS * 7 - 1) - t.getDay());   // Sunday, HEAT_WEEKS weeks back
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let cells = `<span class="mo"></span>` + ["", "Mon", "", "Wed", "", "Fri", ""].map((d) => `<span class="dl">${d}</span>`).join("");
    let total = 0, lastMonth = -1, week = 0;
    for (let d = new Date(start); d <= addDays(t, 6 - t.getDay()); d = addDays(d, 7), week++) {
      const mo = d.getMonth(), showMo = mo !== lastMonth && (week > 0 || d.getDate() <= 7);
      cells += `<span class="mo">${showMo ? months[mo] : ""}</span>`;
      if (showMo) lastMonth = mo;
      for (let i = 0; i < 7; i++) {
        const day = addDays(d, i), k = dayKey(day), c = m.get(k) || 0;
        if (day > t) { cells += `<span class="d fut"></span>`; continue; }
        total += c;
        const lvl = c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : c <= 5 ? 3 : 4;
        cells += `<span class="d${lvl ? " l" + lvl : ""}${k === dayKey(t) ? " today" : ""}" title="${c} done · ${day.toDateString()}"></span>`;
      }
    }
    return `<div class="heat-wrap">
      <div class="heat-head"><span><b>${total}</b> things done in the last year</span><span><b>${cur}</b> day streak</span><span><b>${best}</b> longest</span><span><b>${m.get(dayKey(t)) || 0}</b> today</span></div>
      <div class="heat-scroll"><div class="heat">${cells}</div></div>
      <div class="legend">Less <span class="d l0"></span><span class="d l1"></span><span class="d l2"></span><span class="d l3"></span><span class="d l4"></span> More</div>
    </div>`;
  }

  function lessonRow(l) {
    const st = P(l.id);
    return `<div class="row ${st ? "done" : ""}">
      <button class="check ${st === "done" ? "on" : ""}" data-toggle="${l.id}" aria-label="Mark lesson ${l.num} done"></button>
      <div><div class="t">Lesson ${l.num} <span class="sub">· ${esc(l.title)}</span></div>
        <div class="s">${esc(l.track)} · ~${l.minutes} min${l.trekDay ? ` · trek day ${l.trekDay}` : ""}${st === "skip" ? " · skipped" : ""}</div></div>
      <div class="act">${ext(l.url, "open ↗", "mini go")}
        ${st ? `<button class="mini" data-set="${l.id}:">undo</button>` : `<button class="mini" data-set="${l.id}:skip">skip</button>`}</div>
    </div>`;
  }

  function appRow(a) {
    const st = P(a.id);
    const doneLabel = { send: "sent", portal: "applied", waiting: "replied" }[a.section];
    const links = [a.gmail && ext(a.gmail, "gmail draft ↗", "mini go"), ext(a.posting, "posting ↗"), ext(a.notion, "notion ↗")].filter(Boolean).join("");
    const chips = [
      `<span class="chip">${esc({ job: "job", pitch: "consulting pitch", followup: "follow-up" }[a.kind] || a.kind)}</span>`,
      a.fit ? `<span class="chip ok">fit ${esc(a.fit)}/10</span>` : "",
      a.date ? `<span class="chip">${esc(a.date)}</span>` : "",
      ...a.flags.map((f) => `<span class="chip warn">${esc(f)}</span>`),
    ].join("");
    return `<div class="row ${st ? "done" : ""}">
      <button class="check ${st === "done" ? "on" : ""}" data-toggle="${esc(a.id)}" aria-label="Mark ${esc(a.company)} ${doneLabel}"></button>
      <div><div class="t">${esc(a.company)} <span class="sub">· ${esc(a.title)}</span></div>
        <div class="s">${a.to ? esc(a.to) : a.section === "portal" ? "no email · apply on the posting" : ""}${st === "skip" ? " · skipped" : st === "done" ? ` · ${doneLabel}` : ""}</div>
        <div class="chips">${chips}</div>
        ${links ? `<div class="links">${links}</div>` : ""}
        ${a.snippet ? `<details class="more"><summary>${a.section === "send" ? "preview" : "notes"}</summary><p>${esc(a.snippet)}</p></details>` : ""}
      </div>
      <div class="act">${st ? `<button class="mini" data-set="${esc(a.id)}:">undo</button>` : `<button class="mini" data-set="${esc(a.id)}:skip">skip</button>`}</div>
    </div>`;
  }

  function viewToday() {
    const d = trekDay(), N = S.data.trek.days, nums = S.data.trek.lessons;
    const strip = nums.map((x, i) => `<div class="${P(lessonByNum(x).id) === "done" ? "done" : ""} ${d === i + 1 ? "now" : ""}" title="Day ${i + 1}: Lesson ${x}">${i + 1}</div>`).join("");
    let hero;
    if (d < 1) {
      hero = `<h2 class="h">Trek starts in ${1 - d} day${d === 0 ? "" : "s"}</h2><p class="prose">${esc(S.data.trek.minimum)}</p>`;
    } else if (d <= N) {
      const l = lessonByNum(nums[d - 1]), done = P(l.id) === "done";
      hero = `<h2 class="h">Day ${d}: ${esc(l.title)}</h2>
        <p class="prose">Lesson ${l.num}, about ${l.minutes} minutes. ${done ? "Done for today. Rest well." : "That's the minimum for tonight. Anything more is a bonus."}</p>
        <div class="actions">${ext(l.url, "open lesson ↗", "btn")}<button class="btn ghost" data-toggle="${l.id}">${done ? "mark not done" : "mark done"}</button></div>`;
    } else {
      hero = `<h2 class="h">Trek done. Welcome back.</h2><p class="prose">Back to the full backlog and the drafts queue.</p>`;
    }
    const bonus = activeLessons().filter((l) => !P(l.id) && !nums.includes(l.num)).slice(0, 3);
    const pick = S.data.apps.filter((a) => a.section === "send" && !P(a.id) && !a.flags.length)
      .sort((a, b) => (b.kind === "followup") - (a.kind === "followup") || (b.fit || 0) - (a.fit || 0) || a.age - b.age).slice(0, 3);
    const checklist = S.data.checklist.map((c) => `<div class="row ${P(c.id) ? "done" : ""}"><button class="check ${P(c.id) === "done" ? "on" : ""}" data-toggle="${c.id}" aria-label="Done"></button><div class="t">${esc(c.title)}</div><div></div></div>`).join("");
    const hour = new Date().getHours(), greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    $("#app").innerHTML =
      md(`<h1 class="title">${greet}, Utshav</h1><p class="lede">One lesson an evening keeps the streak alive. Everything else is a bonus.</p>`, true) +
      code(`board.${fn("summary")}`) + out(statsHtml()) +
      code(`activity.${fn("heatmap", `weeks=${n_(HEAT_WEEKS)}`)}`) + out(heatHtml()) +
      code(`trek.${fn("tonight")}  <span class="cm"># starts ${esc(S.data.trek.start)}, ${N} days</span>`) + out(`${hero}<div class="days">${strip}</div>`) +
      code(`queue.${fn("next", `limit=${n_(3)}`)}  <span class="cm"># only if there's signal</span>`) +
      out(`<div class="two"><div class="list">${pick.map(appRow).join("") || `<div class="empty">queue clear</div>`}</div>
        <div><h3 class="h">before the trek</h3><div class="list">${checklist}</div>
        <h3 class="h gap">bonus lessons</h3><div class="list">${bonus.map(lessonRow).join("")}</div></div></div>`);
  }

  function viewLessons() {
    const tracks = ["all", ...new Set(S.data.lessons.map((l) => l.track))];
    let L = activeLessons();
    if (ui.track !== "all") L = L.filter((l) => l.track === ui.track);
    const total = L.length, doneN = L.filter((l) => P(l.id) === "done").length;
    if (ui.hideDone) L = L.filter((l) => !P(l.id));
    const trek = L.filter((l) => l.trekDay).sort((a, b) => a.trekDay - b.trekDay), rest = L.filter((l) => !l.trekDay);
    const old = S.data.lessons.filter((l) => l.supersededBy);
    $("#app").innerHTML =
      md(`<h1 class="title">Lessons</h1><p class="lede">${doneN} of ${total} done. ${old.length} older lessons were rewritten later in fuller versions, so only the newer ones are listed.</p>`, true) +
      code(`lessons.${fn("filter", `track=${s_(ui.track)}, hide_done=<span class="kw">${ui.hideDone ? "True" : "False"}</span>`)}`) +
      out(`<div class="toolrow"><div class="seg">${tracks.map((t) => `<button data-track="${esc(t)}" class="${ui.track === t ? "on" : ""}">${esc(t.toLowerCase())}</button>`).join("")}</div>
        <label class="toggle"><input type="checkbox" id="hideDone" ${ui.hideDone ? "checked" : ""}> hide done</label></div>
        ${trek.length ? `<h3 class="h">trek plan · one per evening</h3><div class="list">${trek.map(lessonRow).join("")}</div><br>` : ""}
        <h3 class="h">backlog · ${rest.length}</h3><div class="list">${rest.map(lessonRow).join("") || `<div class="empty">nothing left here</div>`}</div>
        <details class="more"><summary>${old.length} replaced lessons</summary><p>${old.map((l) => `Lesson ${l.num} → Lesson ${l.supersededBy}`).join("\n")}</p></details>`);
  }

  function viewApps() {
    const secs = [["send", "review_and_send"], ["portal", "apply_via_portal"], ["waiting", "waiting_on_reply"]];
    let A = S.data.apps.filter((a) => a.section === ui.appSec);
    const counts = Object.fromEntries(secs.map(([k]) => [k, S.data.apps.filter((a) => a.section === k && !P(a.id)).length]));
    if (ui.kind !== "all") A = A.filter((a) => a.kind === ui.kind);
    if (ui.hideDone) A = A.filter((a) => !P(a.id));
    if (ui.flagged) A = A.filter((a) => a.flags.length);
    if (ui.q) { const q = ui.q.toLowerCase(); A = A.filter((a) => `${a.company} ${a.title} ${a.to || ""}`.toLowerCase().includes(q)); }
    A.sort((a, b) => (b.kind === "followup") - (a.kind === "followup") || (b.fit || 0) - (a.fit || 0) || String(b.date || "").localeCompare(String(a.date || "")));
    const hint = { send: "Open each draft in Gmail, read it, hit Send, then tick it here. Fix the amber warnings first.",
      portal: "These roles had no email address. Apply on the posting, or find a contact, then tick.",
      waiting: "Already sent. Tick when they reply. Follow up if it's been a week." }[ui.appSec];
    $("#app").innerHTML =
      md(`<h1 class="title">Applications</h1><p class="lede">${hint}</p>`, true) +
      code(`apps.${fn("queue", s_(ui.appSec))}`) +
      out(`<div class="toolrow"><div class="seg">${secs.map(([k, t]) => `<button data-sec="${k}" class="${ui.appSec === k ? "on" : ""}">${t} · ${counts[k]}</button>`).join("")}</div></div>
        <div class="toolrow"><input id="q" type="search" placeholder="search company or role" value="${esc(ui.q)}">
          <select id="kind"><option value="all">all types</option><option value="job">jobs</option><option value="pitch">consulting pitches</option><option value="followup">follow-ups</option></select>
          <label class="toggle"><input type="checkbox" id="hideDone" ${ui.hideDone ? "checked" : ""}> hide done</label>
          ${ui.appSec === "send" ? `<label class="toggle"><input type="checkbox" id="flagged" ${ui.flagged ? "checked" : ""}> needs a fix</label>` : ""}</div>
        <div class="list">${A.map(appRow).join("") || `<div class="empty">nothing here</div>`}</div>`);
    $("#kind").value = ui.kind;
  }

  function viewSettings() {
    const c = cfg();
    $("#app").innerHTML =
      md(`<h1 class="title">Settings</h1><p class="lede">Sync, trek dates and password. Auto-locks after 20 minutes idle.</p>`, true) +
      code(`sync.${fn("configure")}`) +
      out(`<div class="form">
        <p>Ticks save on this device instantly. Add a fine-grained GitHub token (Contents: read and write, only this repo) to also commit every change. The token is encrypted with your password and only ever sent to api.github.com.</p>
        <label for="tok">token</label><input id="tok" type="password" placeholder="${ls.get(LS.tok) ? "saved · enter a new one to replace" : "github_pat_…"}" autocomplete="off">
        <label for="repo">repository</label><input id="repo" value="${esc(c.owner + "/" + c.repo)}">
        <label for="branch">branch</label><input id="branch" value="${esc(c.branch)}">
        <div class="act"><button class="btn" id="saveSync">save &amp; test</button><button class="btn ghost" id="clearTok">remove token</button></div></div>`) +
      code(`trek.${fn("set_start")}`) +
      out(`<div class="form"><label for="trekStart">start date</label><input id="trekStart" type="date" value="${esc(S.data.trek.start)}">
        <div class="act"><button class="btn" id="saveTrek">save</button></div></div>`) +
      code(`vault.${fn("change_password")}`) +
      out(`<div class="form"><p>Re-encrypts everything with a new key. Use 4 or more random words. Other devices need the new password after this.</p>
        <label for="np1">new password</label><input id="np1" type="password" autocomplete="new-password">
        <label for="np2">repeat</label><input id="np2" type="password" autocomplete="new-password">
        <div class="act"><button class="btn" id="savePw">change password</button></div></div>`) +
      code(`device.${fn("forget")}`) +
      out(`<div class="form"><p>Wipes the cached vault and token from this browser.</p><div class="act"><button class="btn ghost" id="forget">forget this device</button></div></div>`);
  }

  // ---------- events ----------
  function toggleTheme() {
    const r = document.documentElement, dark = !r.classList.contains("dark");
    r.classList.toggle("dark", dark); ls.set("theme", dark ? "dark" : "light");
  }
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.id === "themeBtn") return toggleTheme();
    if (!S) return;
    if (t.dataset.view) { ui.view = t.dataset.view; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.toggle) { const id = t.dataset.toggle; await setP(id, P(id) === "done" ? null : "done"); return; }
    if (t.dataset.set) { const [id, s] = t.dataset.set.split(":"); await setP(id, s || null); return; }
    if (t.dataset.sec) { ui.appSec = t.dataset.sec; ui.flagged = false; render(); return; }
    if (t.dataset.track) { ui.track = t.dataset.track; render(); return; }
    switch (t.id) {
      case "lockBtn": lock(); break;
      case "saveSync": {
        const [owner, repo] = $("#repo").value.trim().split("/");
        ls.set(LS.cfg, JSON.stringify({ ...cfg(), owner, repo, branch: $("#branch").value.trim() }));
        const tok = $("#tok").value.trim(); if (tok) await saveToken(tok);
        remoteSha = null;
        try { await pullRemote(); toast("Connected to GitHub"); await pushNow(); } catch (err) { toast(`Could not reach repo (${err.message})`); }
        break;
      }
      case "clearTok": ls.del(LS.tok); setSync("saved on device", "ok"); toast("Token removed"); render(); break;
      case "saveTrek": S.data.trek.start = $("#trekStart").value || S.data.trek.start; await persist(); toast("Trek date saved"); render(); break;
      case "savePw": {
        const a = $("#np1").value, b = $("#np2").value;
        if (a.length < 12) return toast("Use at least 12 characters");
        if (a !== b) return toast("Passwords don't match");
        const tok = await getToken();
        S.salt = crypto.getRandomValues(new Uint8Array(16)); S.iter = ITER; S.pw = a;
        S.key = await deriveKey(a, S.salt);
        if (tok) await saveToken(tok);
        await persist(); clearTimeout(pushTimer); await pushNow();
        toast("Password changed"); render(); break;
      }
      case "forget": if (confirm("Remove the cached vault and token from this browser?")) { [LS.vault, LS.tok, LS.cfg, LS.ui].forEach(ls.del); lock(); } break;
    }
  });
  document.addEventListener("input", (e) => {
    if (S && e.target.id === "q") { ui.q = e.target.value; const pos = e.target.selectionStart; render(); const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos); }
  });
  document.addEventListener("change", (e) => {
    if (!S) return;
    if (e.target.id === "kind") { ui.kind = e.target.value; render(); }
    if (e.target.id === "hideDone") { ui.hideDone = e.target.checked; render(); }
    if (e.target.id === "flagged") { ui.flagged = e.target.checked; render(); }
  });
  ["mousemove", "keydown", "touchstart", "scroll"].forEach((ev) => addEventListener(ev, bumpIdle, { passive: true }));

  $("#lockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#unlockBtn");
    btn.disabled = true; btn.textContent = "◌ running…"; $("#lockOut").hidden = true;
    $("#lockForm .cc").textContent = "In [*]:"; setSync("busy", "busy");
    try {
      await unlock($("#pw").value);
      $("#pw").value = ""; showApp(true); bumpIdle(); render();
    } catch (err) {
      $("#lockMsg").textContent = err.message; $("#lockOut").hidden = false; setSync("locked", "err");
    } finally { btn.disabled = false; btn.textContent = "▶ Run"; $("#lockForm .cc").textContent = "In [1]:"; }
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
