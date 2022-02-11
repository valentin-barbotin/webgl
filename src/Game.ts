/* eslint-disable no-plusplus */
/* eslint-disable new-cap */
/* eslint-disable no-case-declarations */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
import * as THREE from 'three';
import { Quaternion, Vector2, Vector3, Vector3Tuple } from 'three';
import Ammo from 'ammojs-typed';
import GameController from './GameController';
import Character from './Character';
import Assets from './Assets';
import { prepareVec3, reduceVec3 } from './utils';
import { IMessage } from './interfaces/Message';
import Backend from './Backend';
import IUser from './interfaces/User';
import User from './User';
import Sounds from './Sound';
import Physics from './Physics';

class Game {
  public renderer: THREE.WebGLRenderer;

  public camera: THREE.PerspectiveCamera;

  public scene: THREE.Scene;

  private ambiantLight: THREE.AmbientLight;

  private light: THREE.SpotLight;

  public mixers: THREE.AnimationMixer[];

  private clock: THREE.Clock;

  private PhysXClock: THREE.Clock;

  public GameController: GameController;

  public Character?: Character;

  public assets: Assets;

  private previousTime: number;

  public raycaster: THREE.Raycaster;

  public backend: Backend;

  private lastPosition?: THREE.Vector3Tuple;

  private lastRotation?: THREE.Vector3Tuple;

  public players: Map<string, User>;

  public Ammo?: typeof Ammo;

  public PhysXWorld?: Ammo.btDiscreteDynamicsWorld;

  public sounds: Sounds;

  public physics: Physics;

  constructor(assets: Assets) {
    this.assets = assets;
    this.renderer = this.setupRenderer();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.x = 0;
    this.camera.position.y = 20;
    this.camera.position.z = 0;

    this.players = new Map<string, User>();

    this.scene = new THREE.Scene();
    [this.ambiantLight, this.light] = this.setupLights();
    this.mixers = [];
    this.clock = new THREE.Clock();
    this.PhysXClock = new THREE.Clock();
    this.previousTime = 0;

    this.raycaster = new THREE.Raycaster();

    this.GameController = new GameController(this.camera, this.renderer, this);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.backend = new Backend(this);
    this.sounds = new Sounds(this);
    this.physics = new Physics(this);
    console.log('Game created');
  }

  private get currentUser() : IUser {
    return this.backend.user;
  }

  /**
   * Triggered when the window is resized
   * @return {void}
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight); // resize the canvas (the view)
  }

  /**
   * Add a new player to the scene
   * For the local player
   * @param {string} key
   * @return {void}
   */
  public async setCharacter(modelKey: string): Promise<void> {
    if (!this.assets) return;
    const ped = await this.assets.getModel(modelKey);

    // Create the character and the user, add the character to the scene
    this.Character = new Character(ped, modelKey);
    this.scene.add(this.Character.ped.scene);
    this.mixers.push(this.Character.mixer);

    // Tell the backend the current user
    this.backend.user.character = this.Character;
    this.backend.user.getPed = () => this.Character?.ped.scene;

    // Used to sync the character, smaller values are better for syncing and transmission
    const reduction = {
      reducedPos: reduceVec3(this.Character.ped.scene.position),
      reducedRot: reduceVec3(ped.scene.rotation.toVector3()),
    };

    this.lastPosition = reduction.reducedPos;
    this.lastRotation = reduction.reducedRot;
    this.Character.ped.scene.visible = true;
  }

  /**
   * Launch the game
   * @return {Promise<void>}
   */
  public async startGame(): Promise<void> {
    console.log('Game started');
    if (!this.Character) return;
    await this.physics.setupAmmo();

    {
      const quat = new Quaternion(0, 0, 0, 1);
      const dimensions: Vector3Tuple = [20, 10, 10];
      const position: Vector3Tuple = [1, 50, 1];

      const objjj = new THREE.Mesh(
        new THREE.BoxGeometry(...dimensions),
        new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
      );

      this.physics.createPhysxCube(dimensions, position, 40, quat, objjj);
      this.scene.add(objjj);
    }
    {
      const quat = new Quaternion(0, 0, 0, 1);
      const dimensions: Vector3Tuple = [10, 10, 10];
      const position: Vector3Tuple = [1, 70, 1];

      const objjj = new THREE.Mesh(
        new THREE.BoxGeometry(...dimensions),
        new THREE.MeshPhongMaterial({ color: 0x00ffff }),
      );

      this.physics.createPhysxCube(dimensions, position, 2000, quat, objjj);
      this.scene.add(objjj);
    }

    console.log('render');
    this.renderScene();
  }

  /**
   * On each frame, we check if the player can move forward
   * @todo: Switch to AmmoJS
   * @return {boolean}
   */
  private handleRaycastColision(index: number, duplicate: Set<string>, intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[], objects: THREE.Object3D<THREE.Event>[]): boolean {
    this.raycaster.camera.position.y = index;
    this.raycaster.ray.origin.y = index;
    this.raycaster.intersectObjects(objects, true, intersects); // intersects est un tableau d'objets

    const filtered = intersects.reduce((acc, curr) => {
      if (curr.distance > 2000) return acc; // si l'objet est trop loin, on le filtre

      if (duplicate.has(curr.object.name)) return acc; // si l'objet est deja dans le tableau, on le filtre

      duplicate.add(curr.object.name); // on ajoute l'objet a la liste des objets filtres

      return [...acc, curr];
    }, intersects);
    const first = filtered.shift()?.distance ?? 100;
    return (first < 5);
  }

  /**
   * Update the local player
   * @param {THREE.Camera} camera
   * @return {void}
   */
  private updateLocalPlayer(camera: THREE.Camera): void {
    const ped = this.currentUser.getPed();
    if (!ped) return;
    let goSync = false;
    ped.setRotationFromEuler(
      camera.rotation,
    );

    // TODO: Calcule the right vector
    ped.position.x = camera.position.x + 6;
    // character.position.y = character.geometry.parameters.height / 2;
    ped.position.z = camera.position.z + 6;
    const pedPos = ped.position.clone();

    // Reduce positions and rotations before sending them to the server
    const reduction = {
      reducedPos: reduceVec3(pedPos),
      reducedRot: reduceVec3(ped.rotation.toVector3()),
    };

    const preparedVec3Pos = prepareVec3(reduction.reducedPos);
    const preparedVec3Rotation = prepareVec3(reduction.reducedRot);
    // if previous position is too much different from previous one, send it to the server
    if (this.lastPosition && prepareVec3(this.lastPosition) !== preparedVec3Pos) {
      goSync = true;
    }

    // if previous rotation is too much different from previous one, send it to the server
    if (this.lastRotation && prepareVec3(this.lastRotation) !== preparedVec3Rotation) {
      goSync = true;
    }
    // Update values for the next round
    this.lastPosition = reduction.reducedPos;
    this.lastRotation = reduction.reducedRot;
    if (goSync) this.syncCharacter();
  }

  /**
   * Called when the user is moving and rotating
   * @return {void}
   */
  private handlePlayerMoves(time: number): void {
    const camera = this.GameController.controls.getObject();
    const pointer = new THREE.Vector2(0, 0);

    // Updates the ray with a new origin and direction. //
    this.raycaster.setFromCamera(pointer, camera); // il dirige le rayon a partir de la camera vers le centre de l'ecran

    const raycasterPos = this.raycaster.ray.origin;

    const baseCameraY = this.camera.position.y;

    // Max ray distance instead of Infinity
    this.raycaster.far = 20;
    // Creates an array with all objects the ray intersects. //
    const objetsToCheck = this.scene.children.filter((obj) => obj.name !== 'ground');
    const duplicate: Set<string> = new Set();
    const intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];

    let blockPlayer = false;
    // Send many raycasts to check if the player is on a block
    for (let index = raycasterPos.y; index > 1; index--) {
      blockPlayer = this.handleRaycastColision(index, duplicate, intersects, objetsToCheck);
      if (blockPlayer) break;
    }
    // Set back the original y position of the camera
    camera.position.y = baseCameraY;

    const mass = 80; // mass in Kg
    const delta = (time - this.previousTime) / 1000; // camera speed (high value = slow)

    this.GameController.velocity.x -= this.GameController.velocity.x * 10.0 * delta; // friction (current velocity * friction * delta)
    this.GameController.velocity.z -= this.GameController.velocity.z * 10.0 * delta; // friction
    this.GameController.velocity.y -= 9.8 * mass * delta; // gravity * mass

    this.GameController.direction.z = Number(this.GameController.moveForward) - Number(this.GameController.moveBackward); // 1 = forward, -1 = backward
    this.GameController.direction.x = Number(this.GameController.moveRight) - Number(this.GameController.moveLeft);
    this.GameController.direction.normalize(); // this ensures consistent movements in all directions+
    if (this.GameController.moveForward || this.GameController.moveBackward) this.GameController.velocity.z -= this.GameController.direction.z * (this.GameController.sprint ? 800 : 400) * delta; // acceleration (direction * speed)
    if (this.GameController.moveLeft || this.GameController.moveRight) this.GameController.velocity.x -= this.GameController.direction.x * (this.GameController.sprint ? 800 : 400) * delta;

    this.GameController.velocity.y = Math.max(0, this.GameController.velocity.y); // clamping (prevents going through the ground)

    const forwardVelocity = -this.GameController.velocity.z;

    // Le joueur peut se deplacer à gauche et à droite
    this.GameController.controls.moveRight(-this.GameController.velocity.x * delta); // delta used to make movement smooth

    // Si le joueur est bloqué et tente d'avancer on le bloque, il peut toujours reculer
    if ((blockPlayer && forwardVelocity < 0) || !blockPlayer) {
      this.GameController.controls.moveForward(forwardVelocity * delta);
    }

    this.GameController.controls.getObject().position.y += (this.GameController.velocity.y * delta); // apply gravity
    if (this.GameController.controls.getObject().position.y < 10) {
      this.GameController.velocity.y = 0;
    }

    // If the player ped exists, rotate the player ped to the camera direction.
    // Also update the player position to be the same as the camera position.
    // 3rd person camera
    // 1st person camera
    this.updateLocalPlayer(camera);
  }

  /**
   * Each frame, we update animations of players and their rotation
   * @return {void}
   */
  private updatePlayers(): void {
    const clockDelta = this.clock.getDelta();

    this.currentUser.character?.mixer?.update(clockDelta);

    this.players.forEach((player) => {
      const ped = player.getPed();
      player.Character.mixer.update(clockDelta);
      if (ped) {
        ped.setRotationFromEuler(ped.rotation);
      }
    });
  }

  /**
   * Recursivly render the scene
   * @return {void}
   */
  private renderScene(): void {
    if (!this.Character) return;
    this.light.target.updateMatrixWorld();
    this.light.shadow.camera.updateProjectionMatrix();

    const time = performance.now();

    this.physics.updatePhysXWorld(this.PhysXClock.getDelta());

    // If the controls is enabled, update the camera.
    if (this.GameController.controls.isLocked) {
      this.handlePlayerMoves(time);
    }

    this.updatePlayers();

    requestAnimationFrame(this.renderScene.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.previousTime = time;
  }

  /**
   * Send the current position and rotation of the player to the server
   * @return {void}
   */
  private syncCharacter(): void {
    if (!this.Character) {
      throw new Error('Character is not set');
    }

    const toSend = {
      type: 'userSyncPos',
      position: this.lastPosition,
      rotation: this.lastRotation,
    };

    const message: IMessage = {
      type: toSend.type,
      data: toSend,
    };
    this.backend.sendMessage(message);
  }

  /**
   * Create the WEBGL renderer, and add it to the DOM
   * @return {THREE.WebGLRenderer}
   */
  // eslint-disable-next-line class-methods-use-this
  private setupRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    return renderer;
  }

  /**
   * Create all the lights in the scene
   * @return {[THREE.AmbientLight, THREE.SpotLight]}
   */
  private setupLights(): [THREE.AmbientLight, THREE.SpotLight] {
    const ambiantLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambiantLight);

    const light = new THREE.SpotLight(0xffffff, 1.3);
    light.position.set(0, 100, -20);
    light.target.position.set(0, 0, 80);
    // max shadow distance from source and objet
    light.shadow.camera.near = 0;
    light.shadow.camera.far = 4000;
    light.castShadow = true;
    // shadows quality
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    this.scene.add(light);
    return [ambiantLight, light];
  }
}

export default Game;
