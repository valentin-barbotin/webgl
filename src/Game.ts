/* eslint-disable new-cap */
/* eslint-disable no-case-declarations */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import Ammo from 'ammojs-typed';
import GameController from './GameController';
import Character from './Character';
import Assets from './Assets';
import { BufferToObject, prepareVec3, reduceVec3 } from './utils';
import { IMessageSync, IMessage, MessageData } from './interfaces/Message';
import Backend from './Backend';
import IUser from './interfaces/User';
import User from './User';

type Ammo = typeof Ammo;
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

  public assets: Assets;

  private previousTime: number;

  private raycaster: THREE.Raycaster;

  private backend: Backend;

  private lastPosition?: THREE.Vector3Tuple;

  private lastRotation?: THREE.Vector3Tuple;

  private players: Map<string, User>;

  private ammo: Ammo;

  constructor(assets: Assets) {
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
    this.previousTime = 0;

    this.raycaster = new THREE.Raycaster();

    this.GameController = new GameController(this.camera, this.renderer);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.backend = new Backend(this);
    this.assets = assets;
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
  public setCharacter(ped: GLTF): void {
    if (!this.assets) return;
    // Create the character and the user, add the character to the scene
    this.Character = new Character(ped);
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
  }

  public startGame() {
    if (!this.Character) return;
    this.renderScene();
  }

  public async processMessage(m: MessageEvent) {
    const message: Blob = m.data;
    const data = await message.arrayBuffer();
    // eslint-disable-next-line no-underscore-dangle
    const _message = BufferToObject(data);

    switch (_message.type) {
      case 'userQuit': {
        this.userQuit(_message.data as IUser);
        break;
      }
      case 'userJoined': {
        this.userJoined(_message.data as IUser[]);
        break;
      }
      case 'userSyncPos': {
        this.userSyncPos(_message.data as IMessageSync);
        break;
      }

      default:
        break;
    }
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

    const intersects = this.raycaster.intersectObjects(this.scene.children, true); // intersects est un tableau d'objets

    // Creates an array with all objects the ray intersects. //
    const duplicate: Set<string> = new Set();
    const filtered = intersects.reduce((acc, curr) => {
      if (curr.distance > 2000) return acc; // si l'objet est trop loin, on le filtre

      if (duplicate.has(curr.object.name)) return acc; // si l'objet est deja dans le tableau, on le filtre

      duplicate.add(curr.object.name); // on ajoute l'objet a la liste des objets filtres

      return [...acc, curr];
    }, [] as THREE.Intersection[]);
    let blockPlayer = false;
    const first = filtered.shift()?.distance ?? 100;
    if (first < 10) { //distance
      blockPlayer = true;
    }

    const mass = 80; // mass in Kg
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

    console.log('forward velocity', -this.GameController.velocity.z);

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
    const ped = this.currentUser.getPed();
    if (ped) {
      let goSync = false;
      ped.setRotationFromEuler(
        camera.rotation,
      );

      // TODO: Calcule the right vector
      ped.position.x = camera.position.x + 4;
      // character.position.y = character.geometry.parameters.height / 2;
      ped.position.z = camera.position.z + 4;
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

  public setupAmmo(ammo: Ammo) {
    this.ammo = ammo;
  }

  /**
   * Called when a player quit
   * Retrieve the player from the list of players and remove him from the scene
   * @param {IUser} message
   * @return {void}
   */
  private userQuit(message: IUser): void {
    if (!message._name || !message._id) {
      throw new Error('Invalid payload');
    }

    const user = this.players.get(message._id);

    if (!user) throw new Error('User doesn\'t exists'); // wtf
    const ped = user.getPed();
    if (!ped) throw new Error('Ped not found');
    ped.clear();
    ped.remove();
    ped.visible = false;

    if (!this.players.delete(message._id)) {
      throw new Error('User not found');
    }
    console.log(`${message._name} quited`);
  }

  /**
   * Called when a player moves
   * Get the rotation and position, and apply them to the concerned player
   * @param {IMessageSync} message
   * @return {void}
   */
  private userSyncPos(message: IMessageSync): void {
    const user = this.players.get(message.id);

    if (!user) throw new Error('User not found');

    const ped = user.getPed();
    if (!ped) throw new Error('Ped not found');
    ped.position.fromArray(message.position);
    ped.rotation.fromArray(message.rotation);
  }

  /**
   * Called when a user join the game
   * Also called when we join the game, to receive the list of users
   * Create new player(s) and add it/them to the scene
   * @param {IUser[]} message
   * @return {void}
   */
  private userJoined(message: IUser[]): void {
    // loop over the users
    message.forEach((user) => {
      if (!user._name || !user._id) {
        throw new Error('Invalid payload');
      }

      // if the user is already in the scene, Error
      const exists = this.players.get(user._id);
      if (exists) throw new Error('User already exists');

      this.assets?.getModel(this.assets.modelList.meuf).then((model) => {
        if (!model) throw new Error('No model');
        const character = new Character(model);
        const _user = new User(user._id!, user._name!, character);
        const ped = _user.getPed();
        if (!ped) {
          console.warn('User has no ped');
          return;
        }
        this.scene.add(ped);
        console.warn('User added', _user.id);
        this.players.set(_user.id, _user);
        console.log(`${user._name} joined the game`);
      });
    });
  }
}

export default Game;
