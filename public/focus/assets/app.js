/* Focus Board: private, client-side encrypted dashboard.
 * The vault (vault.enc.json) is AES-256-GCM encrypted with a key derived from your
 * password via PBKDF2-SHA256 (600k iterations). Nothing is readable without the password.
 * Progress syncs back to the private GitHub repo through the Contents API using a
 * fine-grained token that is itself stored encrypted in this browser only. */
"use strict";
(() => {
  const ITER = 600000;
  const IDLE_LOCK_MS = 20 * 60 * 1000;
  const LS = { vault: "fb.vault", tok: "fb.tok", cfg: "fb.cfg", fails: "fb.fails", ui: "fb.ui" };
  const DEFAULT_CFG = { owner: "Utshav-paudel", repo: "Medval", branch: "claude/inspiring-planck-ky76by", path: "vault.enc.json" };

  const $ = (s, el = document) => el.querySelector(s);
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https:\/\//i.test(u || "") ? esc(u) : "");
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
  function setSync(text, cls = "") { const el = $("#sync"); el.textContent = text; el.className = "sync " + cls; }

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
    const txt = dec.decode(unb64(j.content.replace(/\n/g, "")));
    return JSON.parse(txt);
  }
  function mergeProgress(a = {}, b = {}) {
    const out = { ...a };
    for (const [k, v] of Object.entries(b)) if (!out[k] || (v.at || "") > (out[k].at || "")) out[k] = v;
    return out;
  }
  async function pushNow() {
    const tok = await getToken();
    if (!tok) { setSync("Saved on this device", ""); return; }
    setSync("Syncing…");
    try {
      if (!remoteSha) await pullRemote().catch(() => null);
      const vault = await sealWith(S.key, S.salt, S.data, S.iter);
      const body = { message: `Progress update ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, content: b64(enc.encode(JSON.stringify(vault))), branch: cfg().branch, sha: remoteSha || undefined };
      try {
        const r = await gh(tok, "PUT", body); remoteSha = r.content.sha;
      } catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        const remote = await pullRemote();               // someone else saved first: merge and retry once
        if (remote) {
          const other = await openAny(remote);
          if (other) S.data.progress = mergeProgress(other.progress, S.data.progress);
        }
        const v2 = await sealWith(S.key, S.salt, S.data, S.iter);
        const r = await gh(tok, "PUT", { ...body, content: b64(enc.encode(JSON.stringify(v2))), sha: remoteSha });
        remoteSha = r.content.sha;
      }
      setSync("Synced to GitHub", "ok");
    } catch (e) {
      setSync(e.status === 401 || e.status === 403 ? "Token rejected: check Settings" : "Offline: saved on device", "err");
    }
  }
  async function openAny(vault) {
    try {
      if (vault.salt === b64(S.salt) && (vault.iter || ITER) === S.iter) return await open(S.key, vault);
      const k = await deriveKey(S.pw, unb64(vault.salt), vault.iter || ITER);
      return await open(k, vault);
    } catch { return null; }
  }

  async function persist() {
    S.data.savedAt = new Date().toISOString();
    const vault = await sealWith(S.key, S.salt, S.data, S.iter);
    ls.set(LS.vault, JSON.stringify(vault));
    setSync("Saving…");
    clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 1500);
  }

  // ---------- unlock / lock ----------
  async function loadBundled() {
    try { const r = await fetch("vault.enc.json", { cache: "no-store" }); if (r.ok) return r.json(); } catch {}
    return null;
  }
  async function unlock(pw) {
    const fails = ls.json(LS.fails, { n: 0, until: 0 });
    if (Date.now() < fails.until) throw new Error(`Too many attempts. Try again in ${Math.ceil((fails.until - Date.now()) / 1000)}s.`);
    const cands = [ls.json(LS.vault, null), await loadBundled()].filter(Boolean)
      .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
    if (!cands.length) throw new Error("No vault found. Are you online?");
    let data = null, used = null, key = null;
    for (const v of cands) {
      try { const k = await deriveKey(pw, unb64(v.salt), v.iter || ITER); data = await open(k, v); used = v; key = k; break; } catch {}
    }
    if (!data) {
      fails.n += 1; if (fails.n >= 3) fails.until = Date.now() + Math.min(300000, 2 ** (fails.n - 3) * 15000);
      ls.set(LS.fails, JSON.stringify(fails));
      throw new Error("Wrong password.");
    }
    ls.del(LS.fails);
    S = { data, key, salt: unb64(used.salt), pw, iter: used.iter || ITER };
    // Pull newer progress from GitHub if a token is saved.
    try {
      const remote = await pullRemote();
      if (remote && String(remote.savedAt || "") > String(S.data.savedAt || "")) {
        const other = await openAny(remote);
        if (other) { other.progress = mergeProgress(S.data.progress, other.progress); S.data = other; ls.set(LS.vault, JSON.stringify(remote)); }
      }
      if (remote) setSync("Synced to GitHub", "ok"); else setSync("Saved on this device");
    } catch { setSync("Offline: using saved copy", "err"); }
  }
  function lock() {
    S = null; remoteSha = null; clearTimeout(pushTimer);
    $("#view").innerHTML = ""; $("#stats").innerHTML = "";
    $("#app").hidden = true; $("#lock").hidden = false; $("#pw").value = ""; $("#pw").focus();
  }
  function bumpIdle() { clearTimeout(idleTimer); if (S) idleTimer = setTimeout(() => { lock(); toast("Locked after inactivity"); }, IDLE_LOCK_MS); }

  // ---------- data helpers ----------
  const P = (id) => (S.data.progress[id] || {}).s;
  async function setP(id, s) {
    if (s) S.data.progress[id] = { s, at: new Date().toISOString() }; else delete S.data.progress[id];
    render(); await persist();
  }
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  function trekDay() { return Math.floor((today() - parseDay(S.data.trek.start)) / 86400000) + 1; }
  const lessonByNum = (n) => S.data.lessons.find((l) => l.num === n);
  const activeLessons = () => S.data.lessons.filter((l) => !l.supersededBy);

  // ---------- render ----------
  function render() {
    if (!S) return;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.view === ui.view));
    ls.set(LS.ui, JSON.stringify(ui));
    renderStats();
    ({ today: viewToday, lessons: viewLessons, apps: viewApps, settings: viewSettings }[ui.view] || viewToday)();
  }
  function statCard(k, v, total, pct) {
    return `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${v}${total != null ? ` <small>/ ${total}</small>` : ""}</div>${pct != null ? `<div class="bar"><i data-w="${Math.round(pct * 100)}"></i></div>` : ""}</div>`;
  }
  function renderStats() {
    const L = activeLessons(), ld = L.filter((l) => P(l.id) === "done").length;
    const trek = S.data.trek.lessons.map(lessonByNum), td = trek.filter((l) => P(l.id) === "done").length;
    const send = S.data.apps.filter((a) => a.section === "send"), sd = send.filter((a) => P(a.id)).length;
    const portal = S.data.apps.filter((a) => a.section === "portal"), pd = portal.filter((a) => P(a.id)).length;
    $("#stats").innerHTML = statCard("Trek lessons", td, trek.length, td / trek.length) + statCard("All lessons", ld, L.length, ld / L.length)
      + statCard("Drafts handled", sd, send.length, sd / send.length) + statCard("Portal applies", pd, portal.length, pd / portal.length);
    // CSP blocks inline style attributes, so bar widths are applied through the CSSOM.
    $("#stats").querySelectorAll(".bar i").forEach((i) => { i.style.width = i.dataset.w + "%"; });
  }

  function lessonRow(l, extra = "") {
    const st = P(l.id);
    return `<div class="row ${st ? "done" : ""}">
      <button class="check ${st === "done" ? "on" : ""}" data-toggle="${l.id}" aria-label="Mark lesson ${l.num} done"></button>
      <div><div class="t">Lesson ${l.num} · ${esc(l.title)}</div>
        <div class="s">${esc(l.track)} · ~${l.minutes} min${l.trekDay ? ` · Trek day ${l.trekDay}` : ""}${st === "skip" ? " · skipped" : ""}</div>${extra}</div>
      <div class="act"><a class="chip acc" href="${safeUrl(l.url)}" target="_blank" rel="noopener noreferrer">Open</a>
        ${st ? `<button class="ghost small" data-set="${l.id}:">Undo</button>` : `<button class="ghost small" data-set="${l.id}:skip">Skip</button>`}</div>
    </div>`;
  }

  function appRow(a) {
    const st = P(a.id);
    const doneLabel = { send: "Sent", portal: "Applied", waiting: "Replied" }[a.section];
    const links = [
      a.gmail && `<a href="${safeUrl(a.gmail)}" target="_blank" rel="noopener noreferrer">Open draft in Gmail</a>`,
      a.posting && `<a href="${safeUrl(a.posting)}" target="_blank" rel="noopener noreferrer">Posting</a>`,
      a.notion && `<a href="${safeUrl(a.notion)}" target="_blank" rel="noopener noreferrer">Notion</a>`,
    ].filter(Boolean).join("");
    const chips = [
      `<span class="chip">${esc({ job: "Job", pitch: "Consulting pitch", followup: "Follow-up" }[a.kind] || a.kind)}</span>`,
      a.fit ? `<span class="chip ok">Fit ${esc(a.fit)}/10</span>` : "",
      a.date ? `<span class="chip">${esc(a.date)}</span>` : "",
      ...a.flags.map((f) => `<span class="chip warn">${esc(f)}</span>`),
    ].join("");
    return `<div class="row ${st ? "done" : ""}">
      <button class="check ${st === "done" ? "on" : ""}" data-toggle="${esc(a.id)}" aria-label="Mark ${esc(a.company)} ${esc(doneLabel)}"></button>
      <div><div class="t">${esc(a.company)} <span class="muted">· ${esc(a.title)}</span></div>
        <div class="s">${a.to ? esc(a.to) : a.section === "portal" ? "No email: apply on the posting" : ""}${st === "skip" ? " · skipped" : st === "done" ? ` · ${doneLabel}` : ""}</div>
        <div class="chips">${chips}</div>
        ${links ? `<div class="links">${links}</div>` : ""}
        ${a.snippet ? `<details class="more"><summary>${a.section === "send" ? "Preview" : "Notes"}</summary><p>${esc(a.snippet)}</p></details>` : ""}
      </div>
      <div class="act">${st ? `<button class="ghost small" data-set="${esc(a.id)}:">Undo</button>` : `<button class="ghost small" data-set="${esc(a.id)}:skip">Skip</button>`}</div>
    </div>`;
  }

  function viewToday() {
    const d = trekDay(), N = S.data.trek.days, nums = S.data.trek.lessons;
    const strip = nums.map((n, i) => `<div class="${P(lessonByNum(n).id) === "done" ? "done" : ""} ${d === i + 1 ? "now" : ""}" title="Day ${i + 1}: Lesson ${n}">${i + 1}</div>`).join("");
    let hero;
    if (d < 1) {
      hero = `<div class="eyebrow">Trek starts in ${1 - d} day${d === 0 ? "" : "s"}</div><h2>Get ready before you leave</h2>
        <p class="muted">${esc(S.data.trek.minimum)}</p>`;
    } else if (d <= N) {
      const l = lessonByNum(nums[d - 1]), done = P(l.id) === "done";
      hero = `<div class="eyebrow">Trek day ${d} of ${N} · this evening</div><h2>Lesson ${l.num}: ${esc(l.title)}</h2>
        <p class="muted">~${l.minutes} minutes. ${done ? "Done for today. Rest well." : "That's the minimum. Anything more is a bonus."}</p>
        <div class="actions"><a class="btn" href="${safeUrl(l.url)}" target="_blank" rel="noopener noreferrer">Open lesson</a>
        <button class="ghost" data-toggle="${l.id}">${done ? "Mark not done" : "Mark done"}</button></div>`;
    } else {
      hero = `<div class="eyebrow">Trek finished</div><h2>Welcome back</h2><p class="muted">Pick up the lesson backlog and the drafts queue below.</p>`;
    }
    const nextLessons = activeLessons().filter((l) => !P(l.id) && !nums.includes(l.num)).slice(0, 3);
    const pick = S.data.apps.filter((a) => a.section === "send" && !P(a.id) && !a.flags.length)
      .sort((a, b) => (a.kind === "followup" ? -1 : 0) - (b.kind === "followup" ? -1 : 0) || (b.fit || 0) - (a.fit || 0) || a.age - b.age).slice(0, 3);
    const checklist = S.data.checklist.map((c) => `<div class="row ${P(c.id) ? "done" : ""}"><button class="check ${P(c.id) === "done" ? "on" : ""}" data-toggle="${c.id}" aria-label="Done"></button><div class="t">${esc(c.title)}</div><div></div></div>`).join("");
    $("#view").innerHTML = `<div class="grid2">
      <div class="stack"><div class="card hero">${hero}<div class="days">${strip}</div></div>
        <div><div class="group-h"><h3>If you have signal: one application</h3></div><div class="list">${pick.map(appRow).join("") || `<div class="empty">Queue clear.</div>`}</div></div>
      </div>
      <div class="stack"><div><div class="group-h"><h3>Before the trek</h3></div><div class="list">${checklist}</div></div>
        <div><div class="group-h"><h3>Bonus lessons</h3></div><div class="list">${nextLessons.map((l) => lessonRow(l)).join("")}</div></div></div>
    </div>`;
  }

  function viewLessons() {
    const tracks = ["all", ...new Set(S.data.lessons.map((l) => l.track))];
    let L = S.data.lessons.filter((l) => !l.supersededBy);
    if (ui.track !== "all") L = L.filter((l) => l.track === ui.track);
    if (ui.hideDone) L = L.filter((l) => !P(l.id));
    const trek = L.filter((l) => l.trekDay).sort((a, b) => a.trekDay - b.trekDay), rest = L.filter((l) => !l.trekDay);
    const old = S.data.lessons.filter((l) => l.supersededBy);
    $("#view").innerHTML = `<div class="toolbar">
        <div class="seg">${tracks.map((t) => `<button data-track="${esc(t)}" class="${ui.track === t ? "on" : ""}">${t === "all" ? "All" : esc(t)}</button>`).join("")}</div>
        <label class="toggle"><input type="checkbox" id="hideDone" ${ui.hideDone ? "checked" : ""}> Hide done</label></div>
      ${trek.length ? `<div class="group-h"><h3>Trek plan · 1 per evening</h3><span class="muted">${trek.length}</span></div><div class="list">${trek.map((l) => lessonRow(l)).join("")}</div>` : ""}
      <div class="group-h"><h3>Backlog</h3><span class="muted">${rest.length}</span></div>
      <div class="list">${rest.map((l) => lessonRow(l)).join("") || `<div class="empty">Nothing left here.</div>`}</div>
      <details class="more card"><summary>${old.length} older lessons replaced by a newer, fuller version (hidden to cut clutter)</summary>
        <p>${old.map((l) => `Lesson ${l.num} → see Lesson ${l.supersededBy}`).join("\n")}</p></details>`;
  }

  function viewApps() {
    const secs = [["send", "Review & send"], ["portal", "Apply via portal"], ["waiting", "Waiting on reply"]];
    let A = S.data.apps.filter((a) => a.section === ui.appSec);
    const counts = Object.fromEntries(secs.map(([k]) => [k, S.data.apps.filter((a) => a.section === k && !P(a.id)).length]));
    if (ui.kind !== "all") A = A.filter((a) => a.kind === ui.kind);
    if (ui.hideDone) A = A.filter((a) => !P(a.id));
    if (ui.flagged) A = A.filter((a) => a.flags.length);
    if (ui.q) { const q = ui.q.toLowerCase(); A = A.filter((a) => `${a.company} ${a.title} ${a.to || ""}`.toLowerCase().includes(q)); }
    A.sort((a, b) => (a.kind === "followup" ? -1 : 0) - (b.kind === "followup" ? -1 : 0) || (b.fit || 0) - (a.fit || 0) || String(b.date || "").localeCompare(String(a.date || "")));
    const hint = { send: "Open each draft in Gmail, check it, hit Send, then tick it here. Fix warnings first.",
      portal: "These had no email address. Apply on the posting (or find a contact), then tick.",
      waiting: "Already sent. Tick when they reply; follow up if it's been 7+ days." }[ui.appSec];
    $("#view").innerHTML = `<div class="toolbar">
        <div class="seg">${secs.map(([k, t]) => `<button data-sec="${k}" class="${ui.appSec === k ? "on" : ""}">${t} · ${counts[k]}</button>`).join("")}</div></div>
      <div class="toolbar">
        <input id="q" type="search" placeholder="Search company or role" value="${esc(ui.q)}">
        <select id="kind"><option value="all">All types</option><option value="job">Jobs</option><option value="pitch">Consulting pitches</option><option value="followup">Follow-ups</option></select>
        <label class="toggle"><input type="checkbox" id="hideDone" ${ui.hideDone ? "checked" : ""}> Hide done</label>
        ${ui.appSec === "send" ? `<label class="toggle"><input type="checkbox" id="flagged" ${ui.flagged ? "checked" : ""}> Needs a fix</label>` : ""}
      </div>
      <p class="muted">${hint}</p>
      <div class="list">${A.map(appRow).join("") || `<div class="empty">Nothing here. Nice.</div>`}</div>`;
    $("#kind").value = ui.kind;
  }

  function viewSettings() {
    const c = cfg();
    $("#view").innerHTML = `<div class="grid2"><div class="stack">
      <div class="card"><h2>GitHub sync</h2><div class="form">
        <p class="hint">Ticks save on this device instantly. Add a fine-grained token (Contents: read and write, only this repo) to also commit each change to GitHub. The token is encrypted with your password and never leaves this browser except to api.github.com.</p>
        <label for="tok">Token</label><input id="tok" type="password" placeholder="${ls.get(LS.tok) ? "Saved (enter a new one to replace)" : "github_pat_…"}" autocomplete="off">
        <label for="repo">Repository</label><input id="repo" value="${esc(c.owner + "/" + c.repo)}">
        <label for="branch">Branch</label><input id="branch" value="${esc(c.branch)}">
        <div class="toolbar"><button id="saveSync">Save & test</button><button class="ghost" id="clearTok">Remove token</button></div>
      </div></div>
      <div class="card"><h2>Trek</h2><div class="form">
        <label for="trekStart">Start date</label><input id="trekStart" type="date" value="${esc(S.data.trek.start)}">
        <button id="saveTrek">Save</button></div></div>
    </div><div class="stack">
      <div class="card"><h2>Change password</h2><div class="form">
        <p class="hint">Re-encrypts everything with a new key. Use 4+ random words. Other devices will need the new password.</p>
        <label for="np1">New password</label><input id="np1" type="password" autocomplete="new-password">
        <label for="np2">Repeat</label><input id="np2" type="password" autocomplete="new-password">
        <button id="savePw">Change password</button></div></div>
      <div class="card"><h2>This device</h2><div class="form">
        <p class="hint">Auto-locks after 20 minutes idle. "Forget" wipes the cached vault and token from this browser.</p>
        <div class="toolbar"><button class="ghost" id="theme">Toggle theme</button><button class="ghost" id="forget">Forget this device</button></div></div></div>
    </div></div>`;
  }

  // ---------- events ----------
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("button, [data-toggle]");
    if (!t || !S) return;
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
      case "clearTok": ls.del(LS.tok); setSync("Saved on this device"); toast("Token removed"); render(); break;
      case "saveTrek": S.data.trek.start = $("#trekStart").value || S.data.trek.start; await persist(); toast("Trek date saved"); break;
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
      case "theme": {
        const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
        r.dataset.theme = dark ? "light" : "dark"; ls.set("fb.theme", r.dataset.theme); break;
      }
      case "forget": if (confirm("Remove the cached vault and token from this browser?")) { [LS.vault, LS.tok, LS.cfg, LS.ui].forEach(ls.del); lock(); } break;
    }
  });
  document.addEventListener("input", (e) => {
    if (!S) return;
    if (e.target.id === "q") { ui.q = e.target.value; const pos = e.target.selectionStart; render(); const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos); }
  });
  document.addEventListener("change", (e) => {
    if (!S) return;
    if (e.target.id === "kind") { ui.kind = e.target.value; render(); }
    if (e.target.id === "hideDone") { ui.hideDone = e.target.checked; render(); }
    if (e.target.id === "flagged") { ui.flagged = e.target.checked; render(); }
  });
  ["mousemove", "keydown", "touchstart", "scroll"].forEach((ev) => addEventListener(ev, bumpIdle, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") bumpIdle(); });

  $("#lockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#unlockBtn"), msg = $("#lockMsg");
    btn.disabled = true; msg.textContent = ""; btn.textContent = "Unlocking…";
    try {
      await unlock($("#pw").value);
      $("#pw").value = ""; $("#lock").hidden = true; $("#app").hidden = false; bumpIdle(); render();
    } catch (err) { msg.textContent = err.message; }
    finally { btn.disabled = false; btn.textContent = "Unlock"; }
  });

  const th = ls.get("fb.theme"); if (th) document.documentElement.dataset.theme = th;
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
