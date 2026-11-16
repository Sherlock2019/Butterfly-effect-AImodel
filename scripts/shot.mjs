// Dev helper: screenshot a page of the running UI with headless Chrome (puppeteer).
//   node scripts/shot.mjs <url> <out.png> [waitMs] [clickSelector] [afterClickWaitMs]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_PATH ?? "puppeteer");

const [url, out, wait = "6000", click, after = "0"] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setViewport({ width: Number(process.env.VW ?? 1600), height: Number(process.env.VH ?? 900) });
if (process.env.REDUCED) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
// STORE="key=value" presets localStorage (e.g. acmp.3d.quality=light); SELECTOR="css" screenshots one element
if (process.env.STORE) await page.evaluateOnNewDocument((kv) => { const [k, v] = kv.split("="); try { localStorage.setItem(k, v); } catch {} }, process.env.STORE);
const logs = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, Number(wait)));
if (click && click !== "-") {
  await page.evaluate((sel) => {
    const el = [...document.querySelectorAll("button, a")].find((b) => b.textContent.includes(sel));
    el?.click();
  }, click);
  await new Promise((r) => setTimeout(r, Number(after)));
}
const target = process.env.SELECTOR ? await page.$(process.env.SELECTOR) : null;
await (target ? target.screenshot({ path: out }) : page.screenshot({ path: out }));
console.log(logs.slice(0, 15).join("\n") || "no console errors");
await browser.close();
