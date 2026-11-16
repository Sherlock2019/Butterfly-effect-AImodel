// Copies Havok's physics engine file (WebAssembly, MIT) into public/havok so the Physical view loads it
// from ACMP itself: nothing is fetched from the internet. Runs after `npm install`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@babylonjs", "havok", "lib", "esm", "HavokPhysics.wasm");
const dst = join(root, "public", "havok");
if (!existsSync(src)) {
  console.warn("@babylonjs/havok is not installed; the 3D physics view will fall back to the schematic");
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
copyFileSync(src, join(dst, "HavokPhysics.wasm"));
console.log("copied Havok physics to public/havok");
