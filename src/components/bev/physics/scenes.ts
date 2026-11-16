/**
 * Physical World · the 3D scenes. Each builder places objects (Havok bodies where physics matters,
 * plain meshes for scenery) and returns a tick(dt) that runs scripted actions at set times: a kick,
 * a paw, a strike, a pump switched off. Impacts, falls and breaks are computed by Havok; thresholds and
 * masses are ASSUMED (src/lib/physics-scenes.ts) and logged as events.
 */

import * as B from "@babylonjs/core";
import type { SimScene } from "@/lib/physics-scenes";
import { SKIES, type Item, type Kit, type Sky, type V3 } from "./kit";

export interface SceneDef {
  sky: Sky;
  cam: { pos: V3; target: V3 };
  /** variant: e.g. the data-center energy pathway, or the double-slit detector switch */
  build: (k: Kit, variant?: string) => (dt: number) => void;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/* ---------- a room with a table (cup and generic scenes) ---------------------------------------- */
export function room(k: Kit) {
  k.ground(16, k.mat("planks", { tex: "planks", uv: [6, 6], rough: 0.55, clearcoat: 0.3 }), 0.5);
  const wall = k.mat("plaster", { tex: "plaster", uv: [3, 1.5], rough: 0.9 });
  k.box("backWall", [8, 3, 0.15], [0, 1.5, -1.6], wall, { cast: false });
  k.box("sideWall", [0.15, 3, 6], [-3, 1.5, 1.4], wall, { cast: false });
  k.box("skirting", [8, 0.1, 0.03], [0, 0.05, -1.51], k.mat("skirting", { color: "#f4f1ea", rough: 0.4 }), { cast: false });
  const wood = k.mat("table", { tex: "wood", uv: [1, 1], rough: 0.35, clearcoat: 0.6 });
  const top = k.box("tableTop", [1.4, 0.05, 0.8], [-0.2, 0.755, 0], wood, { mass: 0, friction: 0.4 });
  for (const [x, z] of [[-0.82, -0.33], [0.42, -0.33], [-0.82, 0.33], [0.42, 0.33]]) k.box("leg", [0.06, 0.73, 0.06], [x, 0.365, z], wood);
  // a rug and a chair for scale
  k.box("rug", [2.2, 0.01, 1.6], [0.3, 0.005, 0.2], k.mat("rug", { color: "#6b3e3e", rough: 1, sheen: "#a86a5a" }), { cast: false });
  return top;
}

/* ---------- scenes ------------------------------------------------------------------------------ */

export const SCENES: Record<SimScene, SceneDef> = {
  /* A child kicks a ball; Havok computes the flight; the glass breaks if the impact is above 3 m/s. */
  ball_window: {
    sky: SKIES.day,
    cam: { pos: [-3.2, 2.1, 7.4], target: [0.6, 1.2, 0] },
    build(k) {
      k.ground(60, k.mat("grass", { tex: "grass", uv: [30, 30], rough: 0.95 }), 0.7);
      k.box("path", [3, 0.01, 1.2], [-3.5, 0.005, 0.2], k.mat("concrete", { tex: "concrete", uv: [3, 1], rough: 0.85 }), { cast: false });
      const wx = 3, t = 0.25; // front wall plane and thickness
      const brick = (n: string, size: V3, pos: V3) => k.box(n, size, pos, k.mat("brick", { tex: "brick", uv: [size[2] / 1.0, size[1] / 1.0], rough: 0.88 }), { mass: 0 });
      brick("wallL", [t, 3.2, 3.1], [wx, 1.6, -2.45]);
      brick("wallR", [t, 3.2, 3.1], [wx, 1.6, 2.45]);
      brick("wallBottom", [t, 0.9, 1.8], [wx, 0.45, 0]);
      brick("wallTop", [t, 0.9, 1.8], [wx, 2.75, 0]);
      const plaster = k.mat("plaster", { tex: "plaster", uv: [2, 1], rough: 0.9 });
      k.box("sideL", [4, 3.2, 0.2], [wx + 2, 1.6, -4], plaster, { mass: 0 });
      k.box("sideR", [4, 3.2, 0.2], [wx + 2, 1.6, 4], plaster, { mass: 0 });
      k.box("back", [0.2, 3.2, 8], [wx + 4, 1.6, 0], plaster, { mass: 0, cast: false });
      k.box("roof", [4.6, 0.25, 8.6], [wx + 2, 3.33, 0], k.mat("roof", { color: "#4a3f3a", rough: 0.8 }));
      k.box("roofEdge", [0.4, 0.15, 8.8], [wx - 0.15, 3.25, 0], k.mat("trim", { color: "#efece4", rough: 0.4 }));
      // window frame (painted wood) and sill
      const trim = k.mat("trim", { color: "#efece4", rough: 0.4 });
      k.box("frameTop", [0.3, 0.08, 1.96], [wx - 0.02, 2.34, 0], trim, { mass: 0 });
      k.box("sill", [0.42, 0.07, 2.1], [wx - 0.08, 0.88, 0], trim, { mass: 0 });
      k.box("frameL", [0.3, 1.48, 0.08], [wx - 0.02, 1.6, -0.94], trim, { mass: 0 });
      k.box("frameR", [0.3, 1.48, 0.08], [wx - 0.02, 1.6, 0.94], trim, { mass: 0 });
      // glass: 8 × 6 panes held still (animated) until a hit above the threshold breaks them free
      const glass = k.mat("glass", { color: "#d8ecff", rough: 0.03, alpha: 0.22 });
      const cols = 8, rows = 6, gw = 1.8 / cols, gh = 1.4 / rows;
      const tiles: Item[] = [];
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        tiles.push(k.box("pane", [0.012, gh, gw], [wx, 0.9 + gh / 2 + j * gh, -0.9 + gw / 2 + i * gw], glass, { mass: 0.06, animated: true, extents: [0.1, gh, gw], friction: 0.5, cast: false }));
      }
      // indoor furniture seen through the window
      k.box("sofa", [0.9, 0.7, 2.2], [wx + 3.2, 0.35, -1.5], k.mat("sofa", { color: "#3f5878", rough: 0.9, sheen: "#7a96b8" }), { mass: 0 });
      k.tree([-1.2, 0, -3.6], 3.4, 1);
      k.tree([-6, 0, -5], 4, 1.2);
      for (let z = -6; z <= 6; z += 1.2) k.box("hedge", [0.8, 0.8 + (Math.abs(z) % 2) * 0.1, 1.15], [8.6, 0.4, z], k.mat("leaves", { color: "#3f6e2e", rough: 0.85, sheen: "#7fae5a" }));

      const child = k.human("child", [-4.78, 0, 0.2], { shirt: "#c8456c", pants: "#2e3d5c", height: 1.25 });
      const ball = k.sphere("ball", 0.22, [-4.47, 0.112, 0.2], k.mat("ball", { color: "#f4f4f0", rough: 0.35, clearcoat: 0.5 }), { mass: 0.43, restitution: 0.55, friction: 0.6, seg: 28 });
      for (let p = 0; p < 6; p++) { const s = k.sphere("patch", 0.07, [0, 0, 0], k.mat("patch", { color: "#161616", rough: 0.4 }), { seg: 8, cast: false }); s.mesh.parent = ball.mesh; const a = p * 1.05, b = (p % 3) * 1.1; s.mesh.position.set(Math.cos(a) * Math.sin(b + 0.5) * 0.1, Math.cos(b + 0.5) * 0.1, Math.sin(a) * Math.sin(b + 0.5) * 0.1); s.mesh.scaling.set(1, 1, 0.35); s.mesh.lookAt(ball.mesh.position); }
      let kicked = false, broken = false;
      k.onHit(ball.agg!, (h) => {
        if (broken || !tiles.some((tl) => tl.agg!.body === h.other)) return;
        if (h.speed > 3) {
          broken = true;
          k.log(`the ball hits the pane at ${h.speed.toFixed(1)} m/s: above 3 m/s, the glass breaks`);
          const at = h.point ?? ball.mesh.position;
          for (const tl of tiles) {
            const b = tl.agg!.body;
            b.setMotionType(B.PhysicsMotionType.DYNAMIC);
            const d = B.Vector3.Distance(tl.mesh.position, at), f = Math.max(0.15, 1.2 - d);
            b.setLinearVelocity(new B.Vector3(2.5 * f + k.rng(), (k.rng() - 0.3) * f * 2, (tl.mesh.position.z - at.z) * 2 * f));
            b.setAngularVelocity(new B.Vector3((k.rng() - 0.5) * 8, (k.rng() - 0.5) * 8, (k.rng() - 0.5) * 8));
          }
          // the pane gives way: the ball carries on through with part of its speed instead of bouncing
          ball.agg!.body.setLinearVelocity(h.vel.scale(0.6));
          k.burst(at, { n: 60, color: "#e8f4ff", kind: "dust", power: [1, 3], size: [0.01, 0.03], life: [0.3, 0.9] });
        } else k.log(`the ball touches the pane at ${h.speed.toFixed(1)} m/s: below the threshold, no break`);
      });
      return () => {
        const t = k.t;
        // kicking leg: back swing, then through the ball
        const swing = t < 0.25 ? -0.7 * ease(t / 0.25) : t < 0.36 ? -0.7 + 1.7 * ease((t - 0.25) / 0.11) : 1.0 - 1.0 * ease((t - 0.36) / 0.5);
        child.hipR.rotation.z = swing; child.shL.rotation.z = -swing * 0.5; child.shR.rotation.z = swing * 0.3;
        if (!kicked && t >= 0.34) { kicked = true; ball.agg!.body.setLinearVelocity(new B.Vector3(11.5, 4.8, -0.1)); ball.agg!.body.setAngularVelocity(new B.Vector3(0, 0, -25)); k.log("the child kicks the ball (≈12.5 m/s, assumed)"); }
      };
    },
  },

  /* A cat's paw pushes a cup; it slides, falls 0.78 m and breaks above 2.5 m/s. */
  cup: {
    sky: SKIES.indoor,
    cam: { pos: [1.55, 1.35, 2.2], target: [0.25, 0.7, 0] },
    build(k) {
      room(k);
      const floor = k.scene.getMeshByName("ground")!;
      const porcelain = k.mat("porcelain", { color: "#f3f1ec", rough: 0.18, clearcoat: 0.8 });
      const cup = k.cyl("cup", { h: 0.1, top: 0.09, bottom: 0.074, tess: 40 }, [0.36, 0.83, -0.1], porcelain, { mass: 0.3, friction: 0.35, restitution: 0.2 });
      const handle = B.MeshBuilder.CreateTorus("handle", { diameter: 0.055, thickness: 0.011, tessellation: 24 }, k.scene);
      handle.parent = cup.mesh; handle.position.set(0, 0.005, 0.05); handle.rotation.y = Math.PI / 2; handle.rotation.z = Math.PI / 2; handle.material = porcelain; k.addShadow(handle);
      const tea = B.MeshBuilder.CreateCylinder("tea", { height: 0.004, diameter: 0.082, tessellation: 32 }, k.scene);
      tea.parent = cup.mesh; tea.position.y = 0.035; tea.material = k.mat("tea", { color: "#7a3f12", rough: 0.05, clearcoat: 1 });
      // the cat: body, head, ears, eyes, tail and the pushing paw
      const fur = k.mat("fur", { color: "#c47a32", rough: 0.85, sheen: "#f2b672" });
      const furDark = k.mat("furDark", { color: "#8a4f1c", rough: 0.85, sheen: "#d19050" });
      k.sphere("catBody", 1, [-0.02, 0.89, -0.1], fur, { scale: [0.3, 0.2, 0.17], seg: 28 });
      k.sphere("catChest", 1, [0.1, 0.92, -0.1], fur, { scale: [0.14, 0.2, 0.15], seg: 20 });
      const head = k.sphere("catHead", 0.13, [0.17, 1.03, -0.1], fur, { seg: 28 });
      head.mesh.scaling.set(1, 0.92, 1.05);
      k.sphere("muzzle", 0.06, [0.225, 1.01, -0.1], k.mat("muzzle", { color: "#f1dcc3", rough: 0.8, sheen: "#fff0dd" }), { scale: [0.8, 0.7, 1.1], seg: 16 });
      for (const z of [-0.14, -0.06]) {
        k.cyl("ear", { h: 0.05, top: 0.001, bottom: 0.04, tess: 4 }, [0.16, 1.105, z], furDark, { rot: [z < -0.1 ? 0.25 : -0.25, 0, 0] });
        k.sphere("eye", 0.018, [0.225, 1.045, z + 0.017 * (z < -0.1 ? 1 : -1)], k.mat("eye", { color: "#9bd24a", rough: 0.05, clearcoat: 1, emissive: "#3a5a10", emissiveIntensity: 0.4 }), { seg: 10, cast: false });
      }
      const tailPath: B.Vector3[] = [];
      for (let i = 0; i <= 16; i++) { const s = i / 16; tailPath.push(new B.Vector3(-0.16 - s * 0.22, 0.84 + Math.sin(s * 2.6) * 0.16, -0.1 + Math.sin(s * 3) * 0.08)); }
      const tail = B.MeshBuilder.CreateTube("tail", { path: tailPath, radiusFunction: (i) => 0.022 - i * 0.0008, tessellation: 12, cap: B.Mesh.CAP_ALL }, k.scene);
      tail.material = furDark; k.addShadow(tail); tail.receiveShadows = true;
      const paw = k.sphere("paw", 1, [0.2, 0.8, -0.1], fur, { scale: [0.07, 0.035, 0.04], seg: 14 });
      // a book and a plant for context
      k.box("book", [0.2, 0.04, 0.28], [-0.62, 0.8, 0.12], k.mat("book", { color: "#2d4f7c", rough: 0.6 }), { mass: 0.6 });
      k.cyl("pot", { h: 0.14, top: 0.13, bottom: 0.1 }, [-0.7, 0.85, -0.22], k.mat("pot", { color: "#b5653d", rough: 0.7 }), { mass: 0 });
      k.sphere("plant", 0.24, [-0.7, 1.02, -0.22], k.mat("leaves", { color: "#3f6e2e", rough: 0.85, sheen: "#7fae5a" }), { seg: 12, scale: [1, 1.2, 1] });

      let pushed = false, broke = false;
      k.onHit(cup.agg!, (h) => {
        if (broke || h.other.transformNode !== floor) return;
        if (h.speed > 2.5) {
          broke = true;
          k.log(`the cup hits the floor at ${h.speed.toFixed(1)} m/s: above 2.5 m/s, porcelain shatters`);
          const at = cup.mesh.getAbsolutePosition().clone();
          k.remove(cup);
          k.shatter(at, 12, 0.022, porcelain, [0.4, 0.8, 0], 1.4);
          k.burst(at.add(new B.Vector3(0, 0.02, 0)), { n: 80, color: "#6a3610", kind: "splash", power: [0.6, 1.8], size: [0.008, 0.02], life: [0.3, 0.7] });
          k.log("tea spills across the floor");
        } else k.log(`the cup lands at ${h.speed.toFixed(1)} m/s: below 2.5 m/s, it probably survives`);
      });
      return () => {
        const t = k.t;
        const reach = t < 0.4 ? 0 : t < 0.62 ? ease((t - 0.4) / 0.22) : 1 - ease((t - 0.75) / 0.4);
        paw.mesh.position.x = 0.2 + reach * 0.12;
        paw.mesh.position.y = 0.8 + Math.sin(reach * Math.PI) * 0.03;
        head.mesh.rotation.y = -0.2 * reach;
        tail.rotation.x = Math.sin(t * 3) * 0.06;
        if (!pushed && t >= 0.62) { pushed = true; cup.agg!.body.applyImpulse(new B.Vector3(0.4, 0.01, 0), cup.mesh.getAbsolutePosition()); k.log("the cat's paw pushes the cup toward the edge"); }
      };
    },
  },

  /* A driver passes a ROAD CLOSED sign at 10 m/s, then brakes 12 m before the barrier. */
  driver: {
    sky: SKIES.day,
    cam: { pos: [-9, 4.6, 12], target: [6, 0.6, 0] },
    build(k) {
      k.ground(120, k.mat("grass", { tex: "grass", uv: [50, 50], rough: 0.95 }), 0.7);
      const road = k.box("road", [60, 0.02, 6.4], [6, 0.01, 0], k.mat("asphalt", { tex: "asphalt", uv: [1, 9.4], rough: 0.8 }), { mass: 0, friction: 0, cast: false });
      void road;
      // sign at the junction
      k.cyl("signPole", { h: 2.1, d: 0.07 }, [0, 1.05, -3.6], k.mat("steel", { tex: "metal", color: "#cfd3d8", rough: 0.35, metal: 0.9 }));
      const sign = B.MeshBuilder.CreatePlane("sign", { width: 1.1, height: 0.7, sideOrientation: B.Mesh.DOUBLESIDE }, k.scene);
      sign.position.set(-0.04, 1.85, -3.6); sign.rotation.y = Math.PI / 2; sign.material = k.mat("roadSign", { tex: "roadSign", rough: 0.4, clearcoat: 0.4 }); k.addShadow(sign);
      // barrier and cones at the closure
      k.box("barrier", [0.3, 1.0, 6.2], [16, 0.5, 0], k.mat("stripes", { tex: "stripes", uv: [6, 1], rough: 0.5 }), { mass: 0 });
      for (const z of [-2.4, -1.2, 0, 1.2, 2.4]) {
        // cones stand just in front of the barrier, beyond the car's stopping point (front ≈ 15.1 m)
        k.cyl("cone", { h: 0.7, top: 0.04, bottom: 0.34, tess: 24 }, [15.65, 0.35, z], k.mat("cone", { color: "#ef6a1a", rough: 0.45 }), { mass: 3 });
        k.cyl("coneBand", { h: 0.1, top: 0.15, bottom: 0.19, tess: 24 }, [15.65, 0.42, z], k.mat("band", { color: "#f2f2ee", rough: 0.3 }), { cast: false });
      }
      for (const [x, z, h] of [[-4, -8, 4], [4, -9, 3.6], [12, -8.5, 4.4], [20, -9, 3.8], [26, -7, 4.2], [22, 9, 3.6], [30, 6, 4]] as const) k.tree([x, 0, z], h, 1.1);

      // the car: one Havok body (rotation locked, no rolling model); wheels and cabin are visual
      const paint = k.mat("paint", { color: "#1f4e8c", rough: 0.32, metal: 0.55, clearcoat: 1 });
      const car = k.box("car", [4.2, 0.6, 1.8], [-8, 0.55, -1.5], paint, { mass: 1200, friction: 0, restitution: 0, extents: [4.2, 0.83, 1.8], center: [0, -0.115, 0] });
      car.mesh.scaling.set(1, 1, 1);
      const parent = { parent: car.mesh as B.TransformNode };
      k.box("cabin", [2.2, 0.55, 1.62], [-0.25, 0.56, 0], k.mat("cabinGlass", { color: "#1a222c", rough: 0.05, metal: 0.2, clearcoat: 1 }), parent);
      k.box("roof", [1.7, 0.06, 1.66], [-0.3, 0.85, 0], paint, parent);
      const tail = k.mat("tailLight", { color: "#5a0d0d", rough: 0.3, emissive: "#ff2a1a", emissiveIntensity: 0.2 });
      for (const z of [-0.65, 0.65]) {
        k.box("tail", [0.04, 0.12, 0.3], [-2.11, 0.12, z], tail, { ...parent, cast: false });
        k.box("head", [0.04, 0.12, 0.3], [2.11, 0.1, z], k.mat("headLight", { color: "#ffffff", rough: 0.1, emissive: "#fff6dc", emissiveIntensity: 1.5 }), { ...parent, cast: false });
      }
      const wheels: B.TransformNode[] = [];
      const tyre = k.mat("tyre", { color: "#161616", rough: 0.9 }), rim = k.mat("rim", { color: "#c8ccd2", rough: 0.25, metal: 1 });
      for (const [x, z] of [[1.35, -0.86], [1.35, 0.86], [-1.35, -0.86], [-1.35, 0.86]]) {
        const hub = new B.TransformNode("hub", k.scene); hub.parent = car.mesh; hub.position.set(x, -0.22, z);
        const w = k.cyl("wheel", { h: 0.24, d: 0.66, tess: 28 }, [0, 0, 0], tyre, { parent: hub, rot: [Math.PI / 2, 0, 0] });
        k.cyl("rim", { h: 0.25, d: 0.4, tess: 10 }, [0, 0, 0], rim, { parent: hub, rot: [Math.PI / 2, 0, 0], cast: false });
        void w; wheels.push(hub);
      }
      const body = car.agg!.body;
      body.setMassProperties({ mass: 1200, inertia: B.Vector3.Zero() });
      body.setLinearDamping(0);
      body.setLinearVelocity(new B.Vector3(10, 0, 0));
      k.log("the driver ignores the ROAD CLOSED sign and drives on (10 m/s)");
      let passed = false, braking = false, stopped = false;
      const vel = new B.Vector3();
      return (dt) => {
        const x = car.mesh.position.x, front = x + 2.1;
        body.getLinearVelocityToRef(vel);
        wheels.forEach((w) => (w.rotation.z -= (vel.x * dt) / 0.33));
        if (!passed && front > 0) { passed = true; k.log("the car passes the sign onto the closed road"); }
        if (!braking && front > 16 - 12) { braking = true; tail.emissiveIntensity = 3; k.log("the driver sees the barrier and brakes (4.5 m/s², assumed)"); }
        if (braking && !stopped) {
          const nx = Math.max(0, vel.x - 4.5 * dt);
          body.setLinearVelocity(new B.Vector3(nx, vel.y, 0));
          if (nx === 0) { stopped = true; k.log(`the car stops ${(16 - 0.15 - front).toFixed(1)} m before the barrier: no incident`); }
        } else if (!braking) body.setLinearVelocity(new B.Vector3(10, vel.y, 0));
      };
    },
  },

  /* Lightning hits the transformer feeding a server hall; sparks are Havok bodies. */
  lightning: {
    sky: SKIES.night,
    cam: { pos: [7.5, 5.2, 10], target: [1.2, 1.2, 0] },
    build(k) {
      k.ground(80, k.mat("grassNight", { tex: "grass", uv: [30, 30], color: "#8a9a8a", rough: 0.9 }), 0.7);
      const yard = k.box("yard", [4, 0.1, 4], [-3.5, 0.05, 0], k.mat("concrete", { tex: "concrete", uv: [2, 2], rough: 0.85 }), { mass: 0, cast: false });
      void yard;
      const { tankMat, transformer } = substation(k, [-3.5, 0, 0]);
      const hall = serverHall(k, [0.8, 0, 0]);
      // power lines from the transformer to the hall
      const line = k.mat("cable", { color: "#1b1b1b", rough: 0.6 });
      for (const z of [-0.3, 0, 0.3]) { const c = k.cyl("line", { h: 4.6, d: 0.03, tess: 8 }, [-1.2, 2.25, z], line, { rot: [0, 0, Math.PI / 2 - 0.08], cast: false }); void c; }
      k.tree([-8, 0, -5], 4.5, 1.3); k.tree([-9, 0, 4], 3.8, 1.1);
      // yard floodlights so the substation is visible at night
      k.cyl("floodPole", { h: 4, d: 0.1 }, [-1.6, 2, 2], k.mat("steel", { tex: "metal", color: "#cfd3d8", rough: 0.35, metal: 0.9 }));
      const lamp = new B.SpotLight("flood", new B.Vector3(-1.6, 4, 2), new B.Vector3(-0.5, -1, -0.5), 1.1, 2, k.scene);
      lamp.intensity = 60; lamp.diffuse = k.lin("#ffe2b0"); lamp.range = 20;
      const wallLamp = new B.PointLight("wallLamp", new B.Vector3(0.5, 2.6, 2.2), k.scene);
      wallLamp.intensity = 6; wallLamp.range = 8; wallLamp.diffuse = k.lin("#cfe0ff");
      k.rain(700, [1, 0, 0]);
      k.glow(1.0);
      const flash = new B.PointLight("flash", new B.Vector3(-3.5, 9, 0), k.scene);
      flash.intensity = 0; flash.diffuse = k.lin("#cfdcff"); flash.range = 60;
      const boltMat = k.mat("bolt", { color: "#ffffff", emissive: "#dbe6ff", emissiveIntensity: 6, unlit: true });
      let struck = false, dark = false, bolt: B.Mesh[] = [];
      return () => {
        const t = k.t;
        if (!struck && t >= 1) {
          struck = true;
          k.log("lightning strikes the transformer");
          const pts: B.Vector3[] = [];
          for (let i = 0; i <= 16; i++) pts.push(new B.Vector3(-3.5 + (i < 16 ? (k.rng() - 0.5) * 1.2 : 0), 30 - i * (28.2 / 16), (i < 16 ? (k.rng() - 0.5) * 0.8 : 0)));
          bolt.push(B.MeshBuilder.CreateTube("bolt", { path: pts, radius: 0.05, tessellation: 6 }, k.scene));
          for (let b = 0; b < 2; b++) { const s = 4 + b * 5, br = [pts[s]]; for (let i = 1; i < 5; i++) br.push(br[i - 1].add(new B.Vector3((k.rng() - 0.5) * 1.6 + (b ? 0.8 : -0.8), -1.3, (k.rng() - 0.5) * 0.6))); bolt.push(B.MeshBuilder.CreateTube("branch", { path: br, radius: 0.025, tessellation: 5 }, k.scene)); }
          bolt.forEach((m) => (m.material = boltMat));
          flash.intensity = 900; k.skyFlash(0.9);
          const top = transformer.getAbsolutePosition().add(new B.Vector3(0, 1.0, 0));
          for (let i = 0; i < 18; i++) { const s = k.sphere("spark", 0.045, [top.x, top.y, top.z], k.mat("spark", { color: "#ffcf5a", emissive: "#ffb020", emissiveIntensity: 4, unlit: true }), { mass: 0.02, restitution: 0.4, cast: false }); s.agg!.body.setLinearVelocity(new B.Vector3((k.rng() - 0.5) * 6, 3 + k.rng() * 4, (k.rng() - 0.5) * 6)); }
          k.burst(top, { n: 120, color: "#ffd27a", kind: "spark", power: [2, 6], size: [0.02, 0.06], life: [0.3, 0.9] });
          tankMat.albedoColor = k.lin("#2a2724"); tankMat.roughness = 0.9;
          k.log("sparks fly; the transformer is damaged (20 g sparks, assumed)");
          k.smoke(top, "#2c2c2c", 50);
        }
        if (struck) {
          flash.intensity *= 0.82; k.skyFlash(Math.max(0, 0.9 - (t - 1) * 3));
          if (bolt.length && t > 1.22) { bolt.forEach((m) => m.dispose()); bolt = []; }
          if (!dark && t >= 1.6) { dark = true; k.log("the server hall loses grid power: racks go dark"); }
          if (dark) hall.setPower(Math.max(0, 1 - (t - 1.6) * 2.5));
        }
      };
    },
  },

  /* A technician switches off cooling pump P3; temperature (colour) rises; the alarm trips. */
  pump: {
    sky: SKIES.hall,
    cam: { pos: [7.2, 4.4, 8.4], target: [1, 1.1, 0] },
    build(k) {
      k.ground(40, k.mat("hallFloor", { tex: "floorTiles", uv: [33, 33], rough: 0.45, clearcoat: 0.2 }), 0.6);
      const hall = serverHall(k, [0.8, 0, 0], true);
      // pump skid: motor, pump casing and a visible impeller
      const steel = k.mat("pumpSteel", { tex: "metal", color: "#9aa7b8", rough: 0.3, metal: 0.9 });
      const blue = k.mat("pumpBlue", { color: "#2f6fb5", rough: 0.35, metal: 0.3, clearcoat: 0.6 });
      k.box("skid", [2, 0.15, 1.1], [-3, 0.075, 0], k.mat("skid", { color: "#3c4148", rough: 0.6, metal: 0.6 }), { mass: 0 });
      k.cyl("motor", { h: 0.8, d: 0.5 }, [-3.4, 0.55, 0], blue, { rot: [0, 0, Math.PI / 2] });
      k.cyl("casing", { h: 0.35, d: 0.7 }, [-2.7, 0.55, 0], steel, { rot: [0, 0, Math.PI / 2] });
      const fan = new B.TransformNode("impeller", k.scene); fan.position.set(-2.5, 0.55, 0);
      for (let b = 0; b < 6; b++) { const bl = k.box("blade", [0.02, 0.28, 0.07], [0, 0.14, 0], k.mat("blade", { color: "#d8dde4", rough: 0.2, metal: 1 }), { parent: fan, cast: false }); const piv = new B.TransformNode("bp", k.scene); piv.parent = fan; piv.rotation.x = (b / 6) * Math.PI * 2; bl.mesh.parent = piv; }
      const pipeMat = k.mat("pipe", { color: "#3b82c4", rough: 0.3, metal: 0.4, clearcoat: 0.5 });
      k.cyl("riser", { h: 2.1, d: 0.16 }, [-2.2, 1.3, 0], pipeMat);
      k.cyl("header", { h: 6.4, d: 0.16 }, [1.0, 2.35, -1.6], pipeMat, { rot: [0, 0, Math.PI / 2] });
      k.cyl("feed", { h: 1.6, d: 0.16 }, [-2.2, 2.35, -0.8], pipeMat, { rot: [Math.PI / 2, 0, 0] });
      const panel = k.box("panel", [0.1, 0.6, 0.4], [-3.95, 1.3, 0.9], k.mat("panel", { color: "#d7d9dc", rough: 0.5 }), { mass: 0 });
      const led = k.mat("switchLed", { color: "#0a2a0a", emissive: "#2bff5a", emissiveIntensity: 2 });
      k.box("switch", [0.02, 0.08, 0.08], [-3.89, 1.42, 0.9], led, { cast: false });
      void panel;
      const tech = k.human("technician", [-3.4, 0, 1.4], { shirt: "#e3a21a", pants: "#2e3a48", facing: 2.4 });
      k.glow(0.7);
      const beaconMat = k.mat("beacon", { color: "#3a0b0b", emissive: "#ff2a1a", emissiveIntensity: 0 });
      k.cyl("beacon", { h: 0.14, d: 0.12 }, [6.9, 2.6, -2.2], beaconMat, { cast: false });
      const beacon = new B.PointLight("alarm", new B.Vector3(6.6, 2.5, -1.9), k.scene); beacon.diffuse = k.lin("#ff3a2a"); beacon.intensity = 0; beacon.range = 8;
      let stopped = false, warm = false, alarm = false, spin = 14;
      return (dt) => {
        const t = k.t;
        tech.shR.rotation.z = t < 1 ? ease(t / 0.9) * 1.2 : 1.2 - ease((t - 1) / 0.6) * 1.2;
        if (!stopped && t >= 1) { stopped = true; led.emissiveColor = k.lin("#ff3020"); k.log("the technician switches off cooling pump P3"); }
        if (stopped) spin = Math.max(0, spin - 9 * dt);
        fan.rotation.x += spin * dt;
        if (stopped) {
          const heat = Math.min(1, (t - 1) / 6);
          hall.setHeat(heat);
          if (!warm && heat >= 0.5) { warm = true; k.log("rack inlet temperature keeps rising (colour = temperature, not a heat model)"); }
          if (!alarm && heat >= 1) { alarm = true; k.log("over-temperature alarm: sensor threshold reached"); }
          if (alarm) { const on = Math.sin(t * 9) > 0 ? 1 : 0; beaconMat.emissiveIntensity = 4 * on; beacon.intensity = 6 * on; }
        }
      };
    },
  },

  /* The ground slab moves (Havok animated body); bricks and a lamp post respond. */
  quake: {
    sky: SKIES.day,
    cam: { pos: [7.5, 4.8, 9], target: [0, 1.1, 0] },
    build(k) {
      k.ground(80, k.mat("asphaltPlain", { tex: "concrete", uv: [20, 20], color: "#7d7f80", rough: 0.85 }), 0.7);
      const slab = k.box("slab", [9, 0.2, 9], [0, 0.1, 0], k.mat("pavement", { tex: "concrete", uv: [6, 6], rough: 0.8 }), { mass: 0, animated: true, friction: 0.8, cast: false });
      const brickMats = ["#9c4a31", "#8f3f2b", "#a6573a"].map((c, i) => k.mat(`brickSolid${i}`, { color: c, rough: 0.9 }));
      const bricks: Item[] = [];
      // a masonry wall (running bond) and a pillar
      // running bond: odd rows are offset by half a brick and closed with half bricks at both ends,
      // so every brick rests at least half on the row below (nothing falls before the shaking)
      for (let row = 0; row < 7; row++) {
        const y = 0.2 + 0.14 + row * 0.285;
        const put = (x: number, w: number, i: number) => bricks.push(k.box("brick", [w, 0.28, 0.3], [x, y, -1.4], brickMats[(row + i) % 3], { mass: w > 0.4 ? 20 : 10, friction: 0.7, restitution: 0.05 }));
        if (row % 2 === 0) for (let i = 0; i < 6; i++) put(-1.75 + i * 0.6, 0.58, i);
        else { put(-1.895, 0.28, 0); for (let i = 0; i < 5; i++) put(-1.45 + i * 0.6, 0.58, i + 1); put(1.395, 0.28, 7); }
      }
      for (let j = 0; j < 8; j++) bricks.push(k.box("block", [0.5, 0.36, 0.5], [-3, 0.2 + 0.18 + j * 0.365, -0.6], k.mat("block", { color: "#a6a39a", rough: 0.85 }), { mass: 20, friction: 0.7, restitution: 0.05 }));
      const post = k.cyl("lampPost", { h: 3.2, d: 0.1 }, [3, 0.2 + 1.6, 0.4], k.mat("steel", { tex: "metal", color: "#cfd3d8", rough: 0.35, metal: 0.9 }), { mass: 40, friction: 0.8 });
      k.box("lampHead", [0.4, 0.1, 0.18], [0.15, 1.6, 0], k.mat("lamp", { color: "#2d3035", rough: 0.4, metal: 0.6 }), { parent: post.mesh, cast: true });
      k.tree([-6, 0, -6], 4, 1.2); k.tree([6, 0, -7], 3.6, 1.1);
      const startY = bricks.map((b) => b.mesh.position.y);
      let dusts = 0;
      bricks.forEach((b) => k.onHit(b.agg!, (h) => { if (dusts < 14 && h.speed > 2.2 && h.point) { dusts++; k.burst(h.point, { n: 50, color: "#b9ab95", kind: "dust", power: [0.3, 1], size: [0.15, 0.4], life: [1, 2.2] }); } }));
      let started = false, fell = false, ended = false;
      const base = slab.mesh.position.clone(), q = B.Quaternion.Identity(), p = new B.Vector3();
      return () => {
        const t = k.t;
        if (!started && t >= 0.5) { started = true; k.log("the ground starts shaking (0.05 m at 2 Hz ≈ 0.8 g peak, assumed)"); }
        const on = started && t < 6;
        const env = on ? Math.min(1, (t - 0.5) / 1.5) * Math.min(1, (6 - t) / 0.8) : 0;
        const s = Math.sin(2 * Math.PI * 2 * (t - 0.5)) * 0.05 * env;
        p.set(base.x + s, base.y, base.z + s * 0.4);
        slab.agg!.body.setTargetTransform(p, q);
        if (on && !fell && bricks.some((b, i) => startY[i] - b.mesh.position.y > 0.3)) { fell = true; k.log("bricks fall: the masonry is losing stability"); }
        if (started && !ended && t >= 6) { ended = true; k.log("shaking stops"); }
      };
    },
  },

  /* Hurricane-force gusts push light objects; palms bend; rain is particles (visual only). */
  storm: {
    sky: SKIES.storm,
    cam: { pos: [6.5, 3.6, 9], target: [0, 1, 0] },
    build(k) {
      k.ground(80, k.mat("wetGrass", { tex: "grass", uv: [30, 30], color: "#8fa58c", rough: 0.55, clearcoat: 0.3 }), 0.6);
      k.box("street", [40, 0.02, 4], [0, 0.01, 3.5], k.mat("wetAsphalt", { tex: "asphalt", uv: [1, 10], rough: 0.25, clearcoat: 0.6 }), { mass: 0, cast: false });
      const crate = k.mat("crate", { tex: "wood", uv: [1, 1], rough: 0.7 });
      const light: Item[] = [];
      for (let i = 0; i < 6; i++) light.push(k.box("crate", [0.5, 0.5, 0.5], [-3 + (i % 3) * 1.4, 0.25, -1 + Math.floor(i / 3) * 1.6], crate, { mass: 4, friction: 0.5 }));
      for (let i = 0; i < 3; i++) light.push(k.cyl("bin", { h: 0.9, top: 0.5, bottom: 0.42 }, [-1.5 + i * 1.6, 0.45, 1.6], k.mat("bin", { color: "#2f6b45", rough: 0.5 }), { mass: 3, friction: 0.5 }));
      light.push(k.box("chair", [0.5, 0.06, 0.5], [0.8, 0.45, -2.4], k.mat("chairWhite", { color: "#eeeeea", rough: 0.4 }), { mass: 2, friction: 0.4 }));
      k.cyl("signPole", { h: 2.6, d: 0.08 }, [3.5, 1.3, 0], k.mat("steel", { tex: "metal", color: "#cfd3d8", rough: 0.35, metal: 0.9 }), { mass: 0 });
      // a garden wall downwind: blown objects pile up against it instead of leaving the frame
      k.box("gardenWall", [0.3, 1.1, 8], [4.6, 0.55, -0.5], k.mat("brick", { tex: "brick", uv: [8, 1.1], rough: 0.88 }), { mass: 0 });
      // palms: segmented trunks that bend with the gusts (animated, not simulated)
      const palms: { segs: B.TransformNode[]; crown: B.TransformNode }[] = [];
      for (const [x, z, h] of [[-5, -3, 5], [-1.5, -4.5, 5.6], [2.5, -3.8, 4.8], [6, -2, 5.2]] as const) {
        const segs: B.TransformNode[] = []; let parent: B.TransformNode | null = null;
        for (let i = 0; i < 7; i++) {
          const j: B.TransformNode = new B.TransformNode("palmSeg", k.scene);
          if (parent) { j.parent = parent; j.position.y = h / 7; } else j.position.set(x, 0, z);
          k.cyl("trunk", { h: h / 7 + 0.02, top: 0.2 - i * 0.012, bottom: 0.22 - i * 0.012, tess: 12 }, [0, h / 14, 0], k.mat("bark", { tex: "bark", uv: [1, 1], rough: 0.95 }), { parent: j });
          segs.push(j); parent = j;
        }
        const crown = new B.TransformNode("crown", k.scene); crown.parent = parent; crown.position.y = h / 7;
        for (let f = 0; f < 8; f++) { const piv = new B.TransformNode("frond", k.scene); piv.parent = crown; piv.rotation.y = (f / 8) * Math.PI * 2; const fr = k.sphere("leaf", 1, [0.9, -0.15, 0], k.mat("palmLeaf", { color: "#3d6b2a", rough: 0.7, sheen: "#88b060" }), { scale: [1.9, 0.06, 0.38], seg: 10, parent: piv }); fr.mesh.rotation.z = -0.35; }
        palms.push({ segs, crown });
      }
      k.rain(4200, [14, 0, 2]);
      let warned = false;
      return () => {
        const t = k.t;
        const gust = 40 + 30 * Math.max(0, Math.sin(t * 1.7)) + 6 * Math.sin(t * 7.3);
        for (const it of light) {
          const b = it.agg!.body, at = it.mesh.getAbsolutePosition();
          b.applyForce(new B.Vector3(gust, 0, gust * 0.2), at.add(new B.Vector3(0, 0.15, 0)));
        }
        const bend = 0.035 + 0.03 * (gust - 40) / 36;
        palms.forEach((p, i) => { p.segs.forEach((s, j) => (s.rotation.z = -(bend + Math.sin(t * 5 + i + j * 0.3) * 0.004) * (j ? 1 : 0.4))); p.crown.rotation.y = Math.sin(t * 3 + i) * 0.15; });
        if (!warned && t >= 2) { warned = true; k.log("light objects slide and topple in the wind (40–70 N, assumed)"); }
      };
    },
  },

  /* Fallback: a box pushed off the table. */
  generic: {
    sky: SKIES.indoor,
    cam: { pos: [1.8, 1.45, 2.4], target: [0.2, 0.65, 0] },
    build(k) {
      room(k);
      const b = k.box("box", [0.2, 0.2, 0.2], [0.15, 0.88, 0], k.mat("cardboard", { color: "#b58a5a", rough: 0.9 }), { mass: 2, friction: 0.35 });
      let pushed = false, landed = false;
      const floor = k.scene.getMeshByName("ground")!;
      k.onHit(b.agg!, (h) => { if (!landed && h.other.transformNode === floor) { landed = true; k.log(`the box hits the floor at ${h.speed.toFixed(1)} m/s`); } });
      return () => { if (!pushed && k.t >= 0.5) { pushed = true; b.agg!.body.applyImpulse(new B.Vector3(4, 0, 0), b.mesh.getAbsolutePosition()); k.log("a push moves the box toward the edge"); } };
    },
  },
};

/* ---------- shared set pieces ------------------------------------------------------------------- */

function substation(k: Kit, at: V3) {
  const tankMat = k.mat("tank", { tex: "metal", color: "#7d8590", rough: 0.45, metal: 0.7 });
  const transformer = k.box("transformer", [1.3, 1.5, 1.0], [at[0], 0.85, at[2]], tankMat, { mass: 0 }).mesh;
  for (let i = 0; i < 7; i++) k.box("fin", [0.04, 1.1, 0.28], [at[0] - 0.5 + i * 0.16, 0.8, at[2] + 0.64], tankMat);
  for (const z of [-0.3, 0, 0.3]) {
    k.cyl("bushing", { h: 0.5, d: 0.1 }, [at[0] + 0.3, 1.85, at[2] + z], k.mat("ceramic", { color: "#8a5a3a", rough: 0.2, clearcoat: 0.8 }));
  }
  const fence = k.mat("fence", { color: "#9aa0a6", rough: 0.4, metal: 0.8, alpha: 0.35 });
  k.box("fenceBack", [4, 2, 0.03], [at[0], 1, at[2] - 2], fence, { cast: false });
  k.box("fenceSide", [0.03, 2, 4], [at[0] - 2, 1, at[2]], fence, { cast: false });
  return { tankMat, transformer };
}

/** a cut-away server hall (no front wall, no roof) with two rows of racks and status LEDs */
export function serverHall(k: Kit, at: V3, hasFloor = false) {
  const concrete = k.mat("concrete", { tex: "concrete", uv: [3, 1], rough: 0.85 });
  if (!hasFloor) k.box("hallFloor", [7, 0.12, 5], [at[0] + 3.4, 0.06, at[2]], k.mat("hallTiles", { tex: "floorTiles", uv: [6, 4], rough: 0.45, clearcoat: 0.2 }), { mass: 0, cast: false });
  k.box("hallBack", [7, 3, 0.2], [at[0] + 3.4, 1.5, at[2] - 2.5], concrete, { mass: 0, cast: false });
  k.box("hallSide", [0.2, 3, 5], [at[0] + 6.9, 1.5, at[2]], concrete, { mass: 0, cast: false });
  k.box("hallLeft", [0.2, 3, 5], [at[0] - 0.1, 1.5, at[2]], concrete, { mass: 0 });
  const rackMat = k.mat("rack", { color: "#1c2128", rough: 0.4, metal: 0.6 });
  const fronts: B.PBRMaterial[] = [];
  const leds: B.PBRMaterial[] = [];
  const rackPos: B.Vector3[] = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = at[0] + 1 + i * 1.1, z = at[2] - 1.3 + row * 1.9;
    rackPos.push(new B.Vector3(x, 0, z));
    k.box("rack", [0.75, 2.1, 1.0], [x, 1.07, z], rackMat, { mass: 0 });
    const front = k.mat(`rackFront${row}${i}`, { color: "#202833", rough: 0.3, metal: 0.4, emissive: "#000000" });
    fronts.push(front);
    k.box("rackDoor", [0.7, 2.0, 0.02], [x, 1.07, z + 0.51], front, { cast: false });
    const led = k.mat(`led${row}${i}`, { color: "#062a10", emissive: i % 3 ? "#38ff7a" : "#4ab8ff", emissiveIntensity: 2.5 });
    leds.push(led);
    for (let u = 0; u < 7; u++) k.box("led", [0.5, 0.015, 0.01], [x, 0.4 + u * 0.26, z + 0.525], led, { cast: false });
  }
  const lamps: B.PointLight[] = [];
  for (let i = 0; i < 2; i++) { const l = new B.PointLight("hallLamp", new B.Vector3(at[0] + 2 + i * 3, 2.8, at[2]), k.scene); l.intensity = 4; l.range = 9; l.diffuse = k.lin("#dbe8ff"); lamps.push(l); }
  const cold = B.Color3.FromHexString("#000000"), hot = k.lin("#ff3a1a");
  return {
    rackPos,
    alertRack(i: number) { fronts[i].emissiveColor = hot; fronts[i].emissiveIntensity = 1.5; leds[i].emissiveColor = hot; },
    setPower(p: number) { leds.forEach((m) => (m.emissiveIntensity = 2.5 * p)); lamps.forEach((l) => (l.intensity = 4 * p)); },
    setHeat(h: number) { fronts.forEach((m) => { m.emissiveColor = B.Color3.Lerp(cold, hot, h * 0.6); m.emissiveIntensity = 1; }); },
  };
}
