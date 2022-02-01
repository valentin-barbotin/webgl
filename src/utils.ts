import { Vector3 } from 'three';
import dat from 'dat.gui';

/**
 * Convert a Vector3 to a string, also edit precision
 * @param {Vector3} vec3
 * @returns {string} Vec3 as a string
 */
function prepareVec3(vec3: Vector3): string {
  return vec3.toArray().map((v) => v.toFixed(20)).map((v) => parseFloat(v)).toString();
}

/**
 * Used to manimulate x y z
 * @param {dat.GUI} gui
 * @param {Vector3} vec
 * @param {string} name
 * @return {void}
 */
function addVecToMenu(gui: dat.GUI, vec: Vector3, name: string): void {
  const folder = gui.addFolder(name);
  folder.add(vec, 'x', -100, 100);
  folder.add(vec, 'y', -100, 100);
  folder.add(vec, 'z', -100, 100);
}

export { prepareVec3, addVecToMenu };
