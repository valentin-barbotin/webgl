/* eslint-disable max-len */
/* eslint-disable lines-between-class-members */
/* eslint-disable no-underscore-dangle */

import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import * as THREE from 'three';
import Game from './Game';


class GameController {
  public camera: THREE.PerspectiveCamera | undefined;

  private _moveForward = false;

  private _moveBackward = false;

  private _moveLeft = false;

  private _moveRight = false;

  private _sprint = false;

  public _controls: PointerLockControls;

  public velocity: THREE.Vector3;

  public direction: THREE.Vector3;

  private _game: Game;

  constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, game: Game) {
    window.addEventListener('keydown', this.onKeyDown.bind(this)); // bind is used to set the this keyword, because if we don't, this keyword will be window
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this._controls = new PointerLockControls(camera, renderer.domElement);

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this._game = game;
  }

  public get moveForward() : boolean { return this._moveForward; }

  public set moveForward(v : boolean) { this._moveForward = v; }

  public get moveBackward() : boolean { return this._moveBackward; }
  public set moveBackward(v : boolean) { this._moveBackward = v; }

  public get moveLeft() : boolean { return this._moveLeft; }
  public set moveLeft(v : boolean) { this._moveLeft = v; }

  public get moveRight() : boolean { return this._moveRight; }
  public set moveRight(v : boolean) { this._moveRight = v; }

  public get sprint() : boolean { return this._sprint; }
  public set sprint(v : boolean) { this._sprint = v; }

  public get controls() : PointerLockControls { return this._controls; }

  private setupSound(bol: Boolean) {
    if (bol) {
      this._game.sounds.startSound(this._game.assets.soundList.leaf);
    } else {
      this._game.sounds.stopSound(this._game.assets.soundList.leaf);
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    const key = event.code;
    console.log(key);
    
    // if the key is released, we set the value to false
    switch (key) {
      case 'KeyZ':
      case 'KeyW':
        this.moveForward = false;
        this.setupSound(this.moveForward);
        break;
      case 'KeyA':
      case 'KeyQ':
        this.moveLeft = false;
        this.setupSound(this.moveForward);
        break;
      case 'KeyD':
        this.moveRight = false;
        this.setupSound(this.moveForward);
        break;
      case 'KeyS':
        this.moveBackward = false;
        this.setupSound(this.moveForward);
        break;
      case 'KeyE':
        if (this._controls.isLocked) {
          this._controls.unlock(); // Unlock the controls
          break;
        }
        this._controls.lock(); // Lock the controls

        break;

      case 'ShiftLeft': 
      case 'AltLeft':
        this.sprint = false; 
        break;

      default:
        break;
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    const key = event.code;
    //Add sound when character walk
    
    // if the key is released, we set the value to false, the player can move forward and left at the same time if he don't release the forward key
    switch (key) {
      case 'KeyZ':
      case 'KeyW':
        this.moveForward = true;
        this.setupSound(this.moveForward);
        break;
      case 'KeyA':
      case 'KeyQ':
        this.moveLeft = true;
        this.setupSound(this.moveForward);
        break;
      case 'KeyD':
        this.moveRight = true;
        this.setupSound(this.moveForward);
        break;
      case 'KeyS':
        this.moveBackward = true;
        this.setupSound(this.moveForward);
        break;
      case 'ShiftLeft': 
      case 'AltLeft':
        this.sprint = true; 
        break;

      default:
        break;
    }
  }
}


export default GameController;