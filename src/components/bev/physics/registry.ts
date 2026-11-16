/** Every 3D scene by id: simulations (scenes.ts), staged scenes and the double-slit experiment (staged.ts). */
import type { Scene3D } from "@/lib/physics-scenes";
import { SCENES, type SceneDef } from "./scenes";
import { EXPERIMENT_SCENES, STAGED_SCENES } from "./staged";

export const ALL_SCENES: Record<Scene3D, SceneDef> = { ...SCENES, ...STAGED_SCENES, ...EXPERIMENT_SCENES };
