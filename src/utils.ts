/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Object3D, Vector3, Vector3Tuple, Scene, Renderer, Camera } from 'three';
import dat from 'dat.gui';
import { IMessage } from './interfaces/Message';

/**
 * Convert a Vector3 to a string
 * @param {Vector3} vec3
 * @return {string} Vec3 as a string
 */
function prepareVec3(vec3: Vector3Tuple): string {
  return vec3.toString();
}

/**
 * Reduce a Vector3 precision
 * @param {Vector3} vec3
 * @return {Vector3Tuple} Vector3Tuple
 */
function reduceVec3(vec3: Vector3): Vector3Tuple {
  return vec3.toArray().map((v) => parseFloat(v.toFixed(3))) as Vector3Tuple;
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

/**
 * Used to manimulate x y z
 * @param {dat.GUI} gui
 * @param {Vector3} vec
 * @param {string} name
 * @return {void}
 */
function addArrToMenu(gui: dat.GUI, vec: Vector3, name: string): void {
  const folder = gui.addFolder(name);
  folder.add(vec, 'x', -100, 100);
  folder.add(vec, 'y', -100, 100);
  folder.add(vec, 'z', -100, 100);
}

/**
 * Convert a key value object to a ArrayBuffer
 * @param {IMessage} obj
 * @return {ArrayBufferLike}
 */
const objectToBuffer = (obj: IMessage): ArrayBufferLike => {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(obj)).buffer;
};

/**
 * Convert an ArrayBuffer to a key value object
 * @param {ArrayBuffer} obj
 * @return {any}
 */
const BufferToObject = (obj: ArrayBuffer): IMessage => {
  const encoder = new TextDecoder();
  const payload = encoder.decode(obj);
  const message: IMessage = JSON.parse(payload);
  return message;
};

const preloadObject = (obj: Object3D, scene: Scene, renderer: Renderer, camera: Camera): void => {
  const originalPos = obj.position.clone();
  obj.position.set(0, 0, 0);

  const p = obj.parent;
  if (p) {
    p.remove(obj);
    scene.add(obj);
  }

  const culled = obj.frustumCulled;
  obj.frustumCulled = false;

  renderer.render(scene, camera);
  obj.position.copy(originalPos);

  if (p) {
    scene.remove(obj);
    p.add(obj);
  }
  obj.frustumCulled = culled;
};

export {
  prepareVec3, reduceVec3, addVecToMenu, addArrToMenu, objectToBuffer, BufferToObject, preloadObject
};
