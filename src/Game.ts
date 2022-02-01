/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
import * as THREE from 'three';
import { Vector3 } from 'three';
import GameController from './GameController';
import Character from './Character';
import Assets from './Assets';
import { BufferToObject, prepareVec3 } from './utils';
import { Message } from './interfaces/Message';
import Backend from './Backend';
import IUser from './interfaces/User';

class Game {
  public renderer: THREE.WebGLRenderer;

  public camera: THREE.PerspectiveCamera;

  public scene: THREE.Scene;

  private ambiantLight: THREE.AmbientLight;

  private light: THREE.SpotLight;

  public mixers: THREE.AnimationMixer[];

  private clock: THREE.Clock;

  public GameController: GameController;

  public Character?: Character;

  public Character2?: Character; // to remove

  private lastVecFromSRVCLient2: THREE.Vector3; // to remove

  private lastDirFromSRVCLient2: THREE.Euler; // to remove

  public assets?: Assets;

  private previousTime: number;

  private raycaster: THREE.Raycaster;

  private backend: Backend;

  private lastPosition?: string;

  constructor() {
    this.renderer = this.setupRenderer();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.x = 0;
    this.camera.position.y = 20;
    this.camera.position.z = 0;

    this.scene = new THREE.Scene();
    [this.ambiantLight, this.light] = this.setupLights();
    this.mixers = [];
    this.clock = new THREE.Clock();
    this.previousTime = 0;

    this.raycaster = new THREE.Raycaster();

    this.GameController = new GameController(this.camera, this.renderer);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.lastVecFromSRVCLient2 = new Vector3(0, 0, 0); // to remove
    this.lastDirFromSRVCLient2 = new THREE.Euler(0, 0, 0); // to remove
    this.backend = new Backend(this);
  }

  private get currentUser() : IUser {
    return this.backend.user;
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight); // resize the canvas (the view)
  }

  public setAssets(assets: Assets) {
    this.assets = assets;
  }

  public setCharacter(ped: THREE.Group) {
    if (!this.assets) return;
    this.Character = new Character(ped);
    this.scene.add(this.Character.ped);
    this.mixers.push(this.Character.mixer);

    this.lastPosition = prepareVec3(this.Character.ped.position.clone());
  }

  public startGame() {
    if (!this.Character) return;
    this.renderScene();
  }

  public async processMessage(m: MessageEvent) {
    const message: Blob = m.data;
    const data = await message.arrayBuffer();
    // eslint-disable-next-line no-underscore-dangle
    const _message: Message = BufferToObject(data);

    const payload = _message.data;
    switch (_message.type) {
      case 'res_PositionAndDir':
        this.lastVecFromSRVCLient2 = new THREE.Vector3(...payload.position);
        this.lastDirFromSRVCLient2 = new THREE.Euler(...payload.rotation);
        break;

      default:
        break;
    }
  }

  private renderScene(): void {
    if (!this.Character) return;
    this.light.target.updateMatrixWorld();
    this.light.shadow.camera.updateProjectionMatrix();
    // helper.update();

    // eslint-disable-next-line no-restricted-syntax
    for (const mixer of this.mixers) {
      const clockDelta = this.clock.getDelta();
      mixer.update(clockDelta);
    }

    const mass = 80;
    const time = performance.now();
    if (this.GameController.controls.isLocked) {
      const delta = (time - this.previousTime) / 1000; // camera speed (high value = slow)
      this.GameController.velocity.x -= this.GameController.velocity.x * 10.0 * delta; // friction (current velocity * friction * delta)
      this.GameController.velocity.z -= this.GameController.velocity.z * 10.0 * delta; // friction
      this.GameController.velocity.y -= 9.8 * mass * delta; // gravity * mass

      this.GameController.direction.z = Number(this.GameController.moveForward) - Number(this.GameController.moveBackward); // 1 = forward, -1 = backward
      this.GameController.direction.x = Number(this.GameController.moveRight) - Number(this.GameController.moveLeft);
      this.GameController.direction.normalize(); // this ensures consistent movements in all directions+
      if (this.GameController.moveForward || this.GameController.moveBackward) this.GameController.velocity.z -= this.GameController.direction.z * 400.0 * delta; // acceleration (direction * speed)
      if (this.GameController.moveLeft || this.GameController.moveRight) this.GameController.velocity.x -= this.GameController.direction.x * 400.0 * delta;

      if (true) {
        this.GameController.velocity.y = Math.max(0, this.GameController.velocity.y); // clamping (prevents going through the ground)
      }

      this.GameController.controls.moveRight(-this.GameController.velocity.x * delta); // delta used to make movement smooth
      this.GameController.controls.moveForward(-this.GameController.velocity.z * delta);

      this.GameController.controls.getObject().position.y += (this.GameController.velocity.y * delta); // apply gravity
      if (this.GameController.controls.getObject().position.y < 10) {
        this.GameController.velocity.y = 0;
      }

      // Ch33_Eyelashes
      //   const eyes = this.Character.ped.getObjectByName('Ch33_Eyelashes');

      const camera = this.GameController.controls.getObject();
      const pointer = new THREE.Vector2(0, 0);

      // Updates the ray with a new origin and direction. //
      this.raycaster.setFromCamera(pointer, camera); // il dirige le rayon a partir de la camera vers le centre de l'ecran

      this.Character.ped.setRotationFromEuler(
        camera.rotation,
      );

      this.Character.ped.position.x = camera.position.x + 2;
      // character.position.y = character.geometry.parameters.height / 2;
      this.Character.ped.position.z = camera.position.z + 2;

      if (this.lastPosition !== prepareVec3(this.Character.ped.position.clone())) {
        this.syncCharacter(this.Character);
      }
    }

    if (this.Character2) {
      this.Character2.ped.position.x = this.lastVecFromSRVCLient2.x;
      this.Character2.ped.position.y = this.lastVecFromSRVCLient2.y;
      this.Character2.ped.position.z = this.lastVecFromSRVCLient2.z;

      this.Character2.ped.setRotationFromEuler(
        this.lastDirFromSRVCLient2,
      );
    }

    requestAnimationFrame(this.renderScene.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.previousTime = time;
  }

  private syncCharacter(character: Character) {
    if (!this.Character) {
      throw new Error('Character is not set');
    }

    const toSend = {
      type: 'PositionAndDir',
      position: character.ped.position.toArray(),
      rotation: this.camera.rotation.toArray(),
    };

    const message: Message = {
      type: toSend.type,
      data: toSend,
    };
    this.backend.sendMessage(message);
  }

  // eslint-disable-next-line class-methods-use-this
  private setupRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    return renderer;
  }

  private setupLights(): [THREE.AmbientLight, THREE.SpotLight] {
    const ambiantLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambiantLight);

    const light = new THREE.SpotLight(0xffffff, 1.3);
    light.position.set(50, 50, 50);
    light.target.position.set(0, 0, 0);
    // max shadow distance from source and objet
    light.shadow.camera.near = 0.01;
    light.shadow.camera.far = 500;
    light.castShadow = true;
    // shadows quality
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    this.scene.add(light);
    return [ambiantLight, light];
  }
}

export default Game;
