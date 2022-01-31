/* eslint-disable max-len */
/* eslint-disable lines-between-class-members */
/* eslint-disable no-underscore-dangle */

import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import * as THREE from 'three';

class GameController {
  private _moveForward = false;

  private _moveBackward = false;

  private _moveLeft = false;

  private _moveRight = false;

  public _controls: PointerLockControls;

  // Used by onKeyDown and onKeyUp because this keyword is different when the event comes from window
  private _this = this;

  constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    window.addEventListener('keydown', this.onKeyDown.bind(this)); // bind is used to set the this keyword, because if we don't, this keyword will be window
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this._controls = new PointerLockControls(camera, renderer.domElement);
    console.log(this._controls);
    console.log(`is locked = ${this._controls.isLocked}`);
    console.log(`is locked2 = ${this.controls.isLocked}`);
  }

  public get moveForward() : boolean { return this._moveForward; }

  public set moveForward(v : boolean) { this._moveForward = v; }

  public get moveBackward() : boolean { return this._moveBackward; }
  public set moveBackward(v : boolean) { this._moveBackward = v; }

  public get moveLeft() : boolean { return this._moveLeft; }
  public set moveLeft(v : boolean) { this._moveLeft = v; }

  public get moveRight() : boolean { return this._moveRight; }
  public set moveRight(v : boolean) { this._moveRight = v; }

  public get controls() : PointerLockControls { return this._controls; }

  private onKeyUp(event: KeyboardEvent) {
    const key = event.code;
    switch (key) {
      case 'KeyZ':
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'KeyA':
      case 'KeyQ':
        this.moveLeft = false;
        break;
      case 'KeyD':
        this.moveRight = false;
        break;
      case 'KeyS':
        this.moveBackward = false;
        break;

      case 'KeyE':
        if (this._controls.isLocked) {
          this._controls.unlock(); // Unlock the controls
          break;
        }
        this._controls.lock(); // Lock the controls

        break;

      default:
        break;
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    const key = event.code;
    switch (key) {
      case 'KeyZ':
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'KeyA':
      case 'KeyQ':
        this.moveLeft = true;
        break;
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'KeyS':
        this.moveBackward = true;
        break;

      default:
        break;
    }
  }
}

export default GameController;
