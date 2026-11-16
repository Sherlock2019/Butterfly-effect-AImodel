// Copies Cesium's prebuilt static build into public/cesium so the globe loads it with a plain
// <script> tag (no bundler config). Runs after `npm install`.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "cesium", "Build", "Cesium");
const dst = join(root, "public", "cesium");
if (!existsSync(src)) {
  console.warn("cesium is not installed; the globe will not load (npm install cesium)");
  process.exit(0);
}
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
console.log("copied Cesium build to public/cesium");
