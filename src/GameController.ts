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

  public velocity: THREE.Vector3;

  public direction: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    window.addEventListener('keydown', this.onKeyDown.bind(this)); // bind is used to set the this keyword, because if we don't, this keyword will be window
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this._controls = new PointerLockControls(camera, renderer.domElement);

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
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
    // if the key is released, we set the value to false
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
    // if the key is released, we set the value to false, the player can move forward and left at the same time if he don't release the forward key
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
