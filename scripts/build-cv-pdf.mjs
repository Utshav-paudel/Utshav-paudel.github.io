// Renders the /cv route with headless Chromium and writes a fresh public/cv.pdf.
// Usage:  npm run cv:pdf
//
// Flow: assumes `astro build` has already produced dist/. Spawns `astro preview`,
// waits for the server, opens /cv, exports a print-CSS PDF, then exits.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = 4322;
const URL = `http://localhost:${PORT}/cv/`;
const PUBLIC_PDF = path.join(root, "public", "cv.pdf");
const DIST_PDF = path.join(root, "dist", "cv.pdf");

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Preview server didn't come up at ${url} within ${timeoutMs}ms`);
}

const preview = spawn(
  "npx",
  ["astro", "preview", "--port", String(PORT)],
  { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
);

let exitCode = 0;
try {
  await waitForServer(URL);
  console.log(`✓ preview server up at ${URL}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.emulateMediaType("print");

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0.6in", bottom: "0.6in", left: "0.6in", right: "0.6in" },
  });
  await browser.close();

  await writeFile(PUBLIC_PDF, pdfBuffer);
  console.log(`✓ wrote ${path.relative(root, PUBLIC_PDF)} (${pdfBuffer.length} bytes)`);

  // If a dist build already exists, drop the fresh PDF in there too so a
  // local `astro preview` serves the up-to-date file without a rebuild.
  try {
    await access(path.dirname(DIST_PDF));
    await writeFile(DIST_PDF, pdfBuffer);
    console.log(`✓ wrote ${path.relative(root, DIST_PDF)}`);
  } catch {
    // dist/ doesn't exist yet — fine, next `astro build` will copy from public/.
  }
} catch (err) {
  console.error("✗ PDF generation failed:", err);
  exitCode = 1;
} finally {
  preview.kill();
  process.exit(exitCode);
}
