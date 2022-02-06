/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Vector3, Vector3Tuple } from 'three';
import dat from 'dat.gui';
import { IMessage } from './interfaces/Message';

/**
 * Convert a Vector3 to a string
 * @param {Vector3} vec3
 * @returns {string} Vec3 as a string
 */
function prepareVec3(vec3: Vector3Tuple): string {
  return vec3.toString();
}

/**
 * Reduce a Vector3 precision
 * @param {Vector3} vec3
 * @returns {Vector3Tuple} Vector3Tuple
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
 * @returns {ArrayBufferLike}
 */
const objectToBuffer = (obj: IMessage): ArrayBufferLike => {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(obj)).buffer;
};

/**
 * Convert an ArrayBuffer to a key value object
 * @param {ArrayBuffer} obj
 * @returns {any}
 */
const BufferToObject = (obj: ArrayBuffer): IMessage => {
  const encoder = new TextDecoder();
  const payload = encoder.decode(obj);
  const message: IMessage = JSON.parse(payload);
  return message;
};

export {
  prepareVec3, reduceVec3, addVecToMenu, addArrToMenu, objectToBuffer, BufferToObject,
};
