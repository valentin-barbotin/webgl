/* eslint-disable no-plusplus */
/* eslint-disable new-cap */
/* eslint-disable no-case-declarations */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Quaternion, Vector2 } from 'three';
import Ammo from 'ammojs-typed';
import dat from 'dat.gui';
import GameController from './GameController';
import Character from './Character';
import Assets from './Assets';
import { BufferToObject, prepareVec3, reduceVec3, addVecToMenu } from './utils';
import { IMessageSync, IMessage } from './interfaces/Message';
import Backend from './Backend';
import IUser from './interfaces/User';
import User from './User';

/**
 * Create the WEBGL renderer, and add it to the DOM
 * @return {THREE.WebGLRenderer}
 */
// eslint-disable-next-line class-methods-use-this
function setupRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // document.body.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Create all the lights in the scene
 * @param {THREE.Scene} scene
 * @return {[THREE.AmbientLight, THREE.SpotLight]}
 */
function setupLights(scene: THREE.Scene): [THREE.AmbientLight, THREE.SpotLight] {
  const ambiantLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambiantLight);

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
  scene.add(light);
  return [ambiantLight, light];
}

const renderer = setupRenderer();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.x = 0;
camera.position.y = 20;
camera.position.z = 0;

let character: Character | null = null;
let assets: Assets;
const players = new Map<string, User>();

const scene = new THREE.Scene();
const [ambiantLight, light] = setupLights(scene);
const mixers: THREE.AnimationMixer[] = [];
const clock = new THREE.Clock();
const PhysXClock = new THREE.Clock();
let previousTime = 0;

const raycaster = new THREE.Raycaster();

const gameController = new GameController(camera, renderer);
const backend = new Backend();

let lastPosition: THREE.Vector3Tuple = [0, 0, 0];
let lastRotation: THREE.Vector3Tuple = [0, 0, 0];
const groundSize = 200;

console.log('Game created');

/**
 * Create the skybox
 * @return {void}
 */
async function createSkybox(): void {
  const skyboxTextures: THREE.Texture[] = [];

  // Load the skybox textures
  // Edit the texture to invert
  Object.entries(assets.skybox).forEach(([key, value]) => {
    const texture = assets.getTexture(value);
    if (key === 'posy') {
      texture.rotation = Math.PI;
      texture.center = new Vector2(0.5, 0.5);
    }
    skyboxTextures.push(texture);
  });

  // Create all the materials
  const skyboxSides = skyboxTextures.map((texture) => new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));
  // Create the skybox itself
  const skyboxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
  const skybox = new THREE.Mesh(
    skyboxGeometry,
    skyboxSides,
  );
  skybox.position.set(0, 0, 0);
  scene.add(skybox);
}

/**
 * Create a ground and add it to the scene
 * @return {void}
 */
function createGround(): void {
  const texture = assets.getTexture(assets.textureList.negy);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(groundSize * 20, 1, groundSize * 20),
    new THREE.MeshPhongMaterial({ map: texture }),
  );

  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.position.set(0, -1, 0);
  ground.name = 'ground';
  scene.add(ground);
}
/**
 * Send the current position and rotation of the player to the server
 * @return {void}
 */
function syncCharacter(): void {
  if (!character) {
    throw new Error('Character is not set');
  }

  const toSend = {
    type: 'userSyncPos',
    position: lastPosition,
    rotation: lastRotation,
  };

  const message: IMessage = {
    type: toSend.type,
    data: toSend,
  };
  backend.sendMessage(message);
}

function currentUser() : IUser {
  return backend.user;
}

/**
 * Each frame, we update animations of players and their rotation
 * @return {void}
 */
function updatePlayers(): void {
  const clockDelta = clock.getDelta();

  currentUser().character?.mixer?.update(clockDelta);

  players.forEach((player) => {
    const ped = player.getPed();
    player.Character.mixer.update(clockDelta);
    if (ped) {
      ped.setRotationFromEuler(ped.rotation);
    }
  });
}

/**
 * Called when the user is moving and rotating
 * @return {void}
 */
function handlePlayerMoves(time: number): void {
  const pointerLockCamera = gameController.controls.getObject();
  const pointer = new THREE.Vector2(0, 0);

  // Updates the ray with a new origin and direction. //
  raycaster.setFromCamera(pointer, pointerLockCamera); // il dirige le rayon a partir de la camera vers le centre de l'ecran

  const raycasterPos = raycaster.ray.origin;

  const baseCameraY = camera.position.y;

  let blockPlayer = false;
  // Max ray distance instead of Infinity
  raycaster.far = 20;
  // Creates an array with all objects the ray intersects. //
  const objetsToCheck = scene.children.filter((obj) => obj.name !== 'ground');
  const duplicate: Set<string> = new Set();
  const intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];

  // Send many raycasts to check if the player is on a block
  for (let index = raycasterPos.y; index > 1; index--) {
    if (blockPlayer) break;
    // for (let index = raycasterPos.y; index > 1; index = Math.ceil(index / 4)) {
    raycaster.camera.position.y = index;
    raycaster.ray.origin.y = index;
    raycaster.intersectObjects(objetsToCheck, true, intersects); // intersects est un tableau d'objets

    const filtered = intersects.reduce((acc, curr) => {
      if (curr.distance > 2000) return acc; // si l'objet est trop loin, on le filtre

      if (duplicate.has(curr.object.name)) return acc; // si l'objet est deja dans le tableau, on le filtre

      duplicate.add(curr.object.name); // on ajoute l'objet a la liste des objets filtres

      return [...acc, curr];
    }, intersects);
    const first = filtered.shift()?.distance ?? 100;
    if (first < 5) { // distance
      blockPlayer = true;
    }
  }
  // Set back the original y position of the camera
  pointerLockCamera.position.y = baseCameraY;

  const mass = 80; // mass in Kg
  const delta = (time - previousTime) / 1000; // camera speed (high value = slow)

  gameController.velocity.x -= gameController.velocity.x * 10.0 * delta; // friction (current velocity * friction * delta)
  gameController.velocity.z -= gameController.velocity.z * 10.0 * delta; // friction
  gameController.velocity.y -= 9.8 * mass * delta; // gravity * mass

  gameController.direction.z = Number(gameController.moveForward) - Number(gameController.moveBackward); // 1 = forward, -1 = backward
  gameController.direction.x = Number(gameController.moveRight) - Number(gameController.moveLeft);
  gameController.direction.normalize(); // this ensures consistent movements in all directions+
  if (gameController.moveForward || gameController.moveBackward) gameController.velocity.z -= gameController.direction.z * (gameController.sprint ? 800 : 400) * delta; // acceleration (direction * speed)
  if (gameController.moveLeft || gameController.moveRight) gameController.velocity.x -= gameController.direction.x * (gameController.sprint ? 800 : 400) * delta;

  if (true) {
    gameController.velocity.y = Math.max(0, gameController.velocity.y); // clamping (prevents going through the ground)
  }

  const forwardVelocity = -gameController.velocity.z;

  // Le joueur peut se deplacer à gauche et à droite
  gameController.controls.moveRight(-gameController.velocity.x * delta); // delta used to make movement smooth

  // Si le joueur est bloqué et tente d'avancer on le bloque, il peut toujours reculer
  if ((blockPlayer && forwardVelocity < 0) || !blockPlayer) {
    gameController.controls.moveForward(forwardVelocity * delta);
  }

  gameController.controls.getObject().position.y += (gameController.velocity.y * delta); // apply gravity
  if (gameController.controls.getObject().position.y < 10) {
    gameController.velocity.y = 0;
  }

  // If the player ped exists, rotate the player ped to the camera direction.
  // Also update the player position to be the same as the camera position.
  // 3rd person camera
  // 1st person camera
  const ped = currentUser().getPed();
  if (ped) {
    let goSync = false;
    ped.setRotationFromEuler(
      pointerLockCamera.rotation,
    );

    // TODO: Calcule the right vector
    ped.position.x = pointerLockCamera.position.x;
    // character.position.y = character.geometry.parameters.height / 2;
    ped.position.z = pointerLockCamera.position.z;
    const pedPos = ped.position.clone();

    // Reduce positions and rotations before sending them to the server
    const reduction = {
      reducedPos: reduceVec3(pedPos),
      reducedRot: reduceVec3(ped.rotation.toVector3()),
    };

    const preparedVec3Pos = prepareVec3(reduction.reducedPos);
    const preparedVec3Rotation = prepareVec3(reduction.reducedRot);
    // if previous position is too much different from previous one, send it to the server
    if (lastPosition && prepareVec3(lastPosition) !== preparedVec3Pos) {
      goSync = true;
    }

    // if previous rotation is too much different from previous one, send it to the server
    if (lastRotation && prepareVec3(lastRotation) !== preparedVec3Rotation) {
      goSync = true;
    }
    // Update values for the next round
    lastPosition = reduction.reducedPos;
    lastRotation = reduction.reducedRot;
    if (goSync) syncCharacter();
  }
}

/**
 * Recursivly render the scene
 * @return {void}
  */
function renderScene(): void {
  if (!Character) return;
  // if (!ammoPhysics) return;
  light.target.updateMatrixWorld();
  light.shadow.camera.updateProjectionMatrix();

  const time = performance.now();

  // ammoPhysics.update(this.PhysXClock.getDelta());
  // ammoPhysics.updateDebugger();

  // updatePhysXWorld(this.PhysXClock.getDelta());

  // If the controls is enabled, update the camera.
  if (gameController.controls.isLocked) {
    handlePlayerMoves(time);
  }

  // if (gameController.sprint) {
  // const quat = new Quaternion(0, 0, 0, 1);

  // this.createCube(10, [0, 0, 0], 100, quat);
  // this.createCube(15, new THREE.Vector3(0, 40, 0), 100, quat);
  // }

  updatePlayers();

  requestAnimationFrame(renderScene);
  renderer.render(scene, camera);
  previousTime = time;
}
/**
 * Setup physics world
 * @param {Ammo} ammo
 * @return {void}
 */
// async function setupAmmo(): Promise<void> {
//   if (!this.Ammo) return;

//   const collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
//   const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
//   const overlappingPairCache = new this.Ammo.btDbvtBroadphase();
//   const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
//   this.PhysXWorld = new this.Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
//   this.PhysXWorld.setGravity(new this.Ammo.btVector3(0, -9.81, 0));

//   window.Ammo = this.Ammo;
//   this.ammoPhysics = new AmmoPhysics(this.scene);
//   this.ammoPhysics.debug?.enable();
// }

/**
 * Add a new player to the scene
 * For the local player
 * @param {string} key
 * @return {void}
 */
function setCharacter(ped: GLTF): Character {
  // Create the character and the user, add the character to the scene
  const _character = new Character(ped);
  scene.add(_character.ped.scene);
  mixers.push(_character.mixer);

  // Tell the backend the current user
  backend.user!.character = _character;
  backend.user!.getPed = () => _character?.ped.scene;

  // Used to sync the character, smaller values are better for syncing and transmission
  const reduction = {
    reducedPos: reduceVec3(_character.ped.scene.position),
    reducedRot: reduceVec3(ped.scene.rotation.toVector3()),
  };

  lastPosition = reduction.reducedPos;
  lastRotation = reduction.reducedRot;
  _character.ped.scene.visible = false;
  return _character;
}

/**
 * Called when a player quit
 * Retrieve the player from the list of players and remove him from the scene
 * @param {IUser} message
 * @return {void}
 */
function userQuit(message: IUser): void {
  if (!message._name || !message._id) {
    throw new Error('Invalid payload');
  }

  const user = players.get(message._id);

  if (!user) throw new Error('User doesn\'t exists'); // wtf
  const ped = user.getPed();
  if (!ped) throw new Error('Ped not found');
  ped.clear();
  ped.remove();
  ped.visible = false;

  if (!players.delete(message._id)) {
    throw new Error('User not found');
  }
  console.log(`${message._name} quited`);
}

/**
 * Called when a user join the game
 * Also called when we join the game, to receive the list of users
 * Create new player(s) and add it/them to the scene
 * @param {IUser[]} message
 * @return {void}
 */
function userJoined(message: IUser[]): void {
  // loop over the users
  message.forEach((user) => {
    if (!user._name || !user._id) {
      throw new Error('Invalid payload');
    }

    // if the user is already in the scene, Error
    const exists = players.get(user._id);
    if (exists) throw new Error('User already exists');

    assets?.getModel(assets.modelList.meuf).then((model) => {
      if (!model) throw new Error('No model');
      const character = new Character(model);
      const _user = new User(user._id!, user._name!, character);
      const ped = _user.getPed();
      if (!ped) {
        console.warn('User has no ped');
        return;
      }
      scene.add(ped);
      console.warn('User added', _user.id);
      players.set(_user.id, _user);
      console.log(`${user._name} joined the game`);
    });
  });
}

/**
 * Called when a player moves
 * Get the rotation and position, and apply them to the concerned player
 * @param {IMessageSync} message
 * @return {void}
 */
function userSyncPos(message: IMessageSync): void {
  const user = players.get(message.id);

  if (!user) throw new Error('User not found');

  const ped = user.getPed();
  if (!ped) throw new Error('Ped not found');
  ped.position.fromArray(message.position);
  ped.rotation.fromArray(message.rotation);
}

async function processMessage(m: MessageEvent) {
  const message: Blob = m.data;
  const data = await message.arrayBuffer();
  // eslint-disable-next-line no-underscore-dangle
  const _message = BufferToObject(data);

  switch (_message.type) {
    case 'userQuit': {
      userQuit(_message.data as IUser);
      break;
    }
    case 'userJoined': {
      userJoined(_message.data as IUser[]);
      break;
    }
    case 'userSyncPos': {
      userSyncPos(_message.data as IMessageSync);
      break;
    }

    default:
      break;
  }
}

/**
   * Triggered when the window is resized
   * @return {void}
   */
function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); // resize the canvas (the view)
}
window.addEventListener('resize', onWindowResize, false);

// type Ammo = typeof Ammo;
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

  private raycaster: THREE.Raycaster;

  private backend: Backend;

  // private lastPosition?: THREE.Vector3Tuple;

  // private lastRotation?: THREE.Vector3Tuple;

  private players: Map<string, User>;

  private allPhysXObjects: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[] = [];

  public Ammo?: typeof Ammo;

  public PhysXWorld?: Ammo.btDiscreteDynamicsWorld;

  constructor(assets: Assets) {
    // this.renderer = this.setupRenderer();
    // this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    // this.camera.position.x = 0;
    // this.camera.position.y = 20;
    // this.camera.position.z = 0;

    // this.players = new Map<string, User>();

    // this.scene = new THREE.Scene();
    // [this.ambiantLight, this.light] = this.setupLights();
    // this.mixers = [];
    // this.clock = new THREE.Clock();
    // this.PhysXClock = new THREE.Clock();
    // this.previousTime = 0;

    // this.raycaster = new THREE.Raycaster();

    // gameController = new GameController(this.camera, this.renderer);
    // window.addEventListener('resize', this.onWindowResize.bind(this), false);
    // this.backend = new Backend(this);
    // this.assets = assets;
    // console.log('Game created');
  }

  // public async startGame() {
  //   console.log('Game started');
  //   if (!this.Character) return;
  //   this.setupAmmo();

  //   console.log('render');
  //   this.renderScene();
  // }

  private createCube(scale: number, pos: THREE.Vector3, mass: number, quat: Quaternion): void {
    if (!this.PhysXWorld) return;
    if (scale < 1) return;
    if (!this.Ammo) return;

    const superCube = new THREE.Mesh(
      new THREE.BoxBufferGeometry(scale, scale, scale),
      new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
    );

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new this.Ammo.btVector3(pos.x, pos.y, pos.z)); // position
    transform.setRotation(new this.Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)); // rotation
    const motionState = new this.Ammo.btDefaultMotionState(transform);

    const colision = new this.Ammo.btBoxShape(new this.Ammo.btVector3(scale * 0.5, scale * 0.5, scale * 0.5));
    colision.setMargin(0.05);
    const localInertia = new this.Ammo.btVector3(0, 0, 0);
    colision.calculateLocalInertia(mass, localInertia);

    const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(0, motionState, colision, localInertia);
    const body = new this.Ammo.btRigidBody(rbInfo);

    body.setFriction(0.5);

    this.PhysXWorld.addRigidBody(body);

    superCube.userData.PhysXBody = body; // link graphics object to physics body
    superCube.position.set(pos.x, pos.y, pos.z);

    this.allPhysXObjects.push(superCube);
    this.scene.add(superCube);
  }

  /**
   * Update the PhysX world
   * @param {number} delta
   * @return {void}
   */
  private updatePhysXWorld(delta: number): void {
    if (!this.PhysXWorld) return;
    if (!this.Ammo) return;
    const transform = new this.Ammo.btTransform();
    this.PhysXWorld.stepSimulation(delta, 10);
    // Update rigid bodies
    for (let i = 0, il = this.allPhysXObjects.length; i < il; i++) {
      const objThree = this.allPhysXObjects[i];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();

      if (ms) {
        ms.getWorldTransform(transform);
        const p = transform.getOrigin();
        const q = transform.getRotation();
        objThree.position.set(p.x(), p.y(), p.z());
        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

        objThree.userData.collided = false;
      }
    }
    //   if (!this.Ammo) return;
    //   if (!this.PhysXWorld) {
    //     throw new Error('PhysXWorld is not defined');
    //   }
    //   this.PhysXWorld.stepSimulation(delta, 10);
    //   const transform = new this.Ammo.btTransform();
    //   this.allPhysXObjects.forEach((realObj) => {
    //     const PhysXObj = realObj.userData.PhysXBody as Ammo.btRigidBody;
    //     const motionState = PhysXObj.getMotionState();
    //     // if (!motionState) {
    //     //   throw new Error("Object doesn't have a motion state");
    //     // }

    //     if (motionState) {
    //       motionState.getWorldTransform(transform);
    //       const p = transform.getOrigin();
    //       const q = transform.getRotation();
    //       realObj.position.set(p.x(), p.y(), p.z());
    //       realObj.quaternion.set(q.x(), q.y(), q.z(), q.w());
    //     }

  //     // motionState.getWorldTransform(transform);
  //     // const pos = transform.getOrigin();
  //     // const quat = transform.getRotation();
  //     // // const posVec = [pos.x(), pos.y(), pos.z()];
  //     // realObj.position.set(pos.x(), pos.y(), pos.z());
  //     // // realObj.position.fromArray(posVec);
  //     // realObj.quaternion.fromArray([quat.x(), quat.y(), quat.z(), quat.w()]);
  //   });
  //   // console.log(this.allPhysXObjects.map((obj) => obj.position));
  }

  // public async processMessage(m: MessageEvent) {
  //   const message: Blob = m.data;
  //   const data = await message.arrayBuffer();
  //   // eslint-disable-next-line no-underscore-dangle
  //   const _message = BufferToObject(data);

  //   switch (_message.type) {
  //     case 'userQuit': {
  //       this.userQuit(_message.data as IUser);
  //       break;
  //     }
  //     case 'userJoined': {
  //       this.userJoined(_message.data as IUser[]);
  //       break;
  //     }
  //     case 'userSyncPos': {
  //       this.userSyncPos(_message.data as IMessageSync);
  //       break;
  //     }

  //     default:
  //       break;
  //   }
  // }

  // /**
  //  * Called when the user is moving and rotating
  //  * @return {void}
  //  */
  // private handlePlayerMoves(time: number): void {
  //   const camera = gameController.controls.getObject();
  //   const pointer = new THREE.Vector2(0, 0);

  //   // Updates the ray with a new origin and direction. //
  //   this.raycaster.setFromCamera(pointer, camera); // il dirige le rayon a partir de la camera vers le centre de l'ecran

  //   const raycasterPos = this.raycaster.ray.origin;

  //   const baseCameraY = this.camera.position.y;

  //   let blockPlayer = false;
  //   // Max ray distance instead of Infinity
  //   this.raycaster.far = 20;
  //   // Creates an array with all objects the ray intersects. //
  //   const objetsToCheck = this.scene.children.filter((obj) => obj.name !== 'ground');
  //   const duplicate: Set<string> = new Set();
  //   const intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];

  //   // Send many raycasts to check if the player is on a block
  //   for (let index = raycasterPos.y; index > 1; index--) {
  //     if (blockPlayer) break;
  //     // for (let index = raycasterPos.y; index > 1; index = Math.ceil(index / 4)) {
  //     this.raycaster.camera.position.y = index;
  //     this.raycaster.ray.origin.y = index;
  //     this.raycaster.intersectObjects(objetsToCheck, true, intersects); // intersects est un tableau d'objets

  //     const filtered = intersects.reduce((acc, curr) => {
  //       if (curr.distance > 2000) return acc; // si l'objet est trop loin, on le filtre

  //       if (duplicate.has(curr.object.name)) return acc; // si l'objet est deja dans le tableau, on le filtre

  //       duplicate.add(curr.object.name); // on ajoute l'objet a la liste des objets filtres

  //       return [...acc, curr];
  //     }, intersects);
  //     const first = filtered.shift()?.distance ?? 100;
  //     if (first < 5) { // distance
  //       blockPlayer = true;
  //     }
  //   }
  //   // Set back the original y position of the camera
  //   camera.position.y = baseCameraY;

  //   const mass = 80; // mass in Kg
  //   const delta = (time - this.previousTime) / 1000; // camera speed (high value = slow)

  //   gameController.velocity.x -= gameController.velocity.x * 10.0 * delta; // friction (current velocity * friction * delta)
  //   gameController.velocity.z -= gameController.velocity.z * 10.0 * delta; // friction
  //   gameController.velocity.y -= 9.8 * mass * delta; // gravity * mass

  //   gameController.direction.z = Number(gameController.moveForward) - Number(gameController.moveBackward); // 1 = forward, -1 = backward
  //   gameController.direction.x = Number(gameController.moveRight) - Number(gameController.moveLeft);
  //   gameController.direction.normalize(); // this ensures consistent movements in all directions+
  //   if (gameController.moveForward || gameController.moveBackward) gameController.velocity.z -= gameController.direction.z * (gameController.sprint ? 800 : 400) * delta; // acceleration (direction * speed)
  //   if (gameController.moveLeft || gameController.moveRight) gameController.velocity.x -= gameController.direction.x * (gameController.sprint ? 800 : 400) * delta;

  //   if (true) {
  //     gameController.velocity.y = Math.max(0, gameController.velocity.y); // clamping (prevents going through the ground)
  //   }

  //   const forwardVelocity = -gameController.velocity.z;

  //   // Le joueur peut se deplacer à gauche et à droite
  //   gameController.controls.moveRight(-gameController.velocity.x * delta); // delta used to make movement smooth

  //   // Si le joueur est bloqué et tente d'avancer on le bloque, il peut toujours reculer
  //   if ((blockPlayer && forwardVelocity < 0) || !blockPlayer) {
  //     gameController.controls.moveForward(forwardVelocity * delta);
  //   }

  //   gameController.controls.getObject().position.y += (gameController.velocity.y * delta); // apply gravity
  //   if (gameController.controls.getObject().position.y < 10) {
  //     gameController.velocity.y = 0;
  //   }

  //   // If the player ped exists, rotate the player ped to the camera direction.
  //   // Also update the player position to be the same as the camera position.
  //   // 3rd person camera
  //   // 1st person camera
  //   const ped = this.currentUser.getPed();
  //   if (ped) {
  //     let goSync = false;
  //     ped.setRotationFromEuler(
  //       camera.rotation,
  //     );

  //     // TODO: Calcule the right vector
  //     ped.position.x = camera.position.x;
  //     // character.position.y = character.geometry.parameters.height / 2;
  //     ped.position.z = camera.position.z;
  //     const pedPos = ped.position.clone();

  //     // Reduce positions and rotations before sending them to the server
  //     const reduction = {
  //       reducedPos: reduceVec3(pedPos),
  //       reducedRot: reduceVec3(ped.rotation.toVector3()),
  //     };

  //     const preparedVec3Pos = prepareVec3(reduction.reducedPos);
  //     const preparedVec3Rotation = prepareVec3(reduction.reducedRot);
  //     // if previous position is too much different from previous one, send it to the server
  //     if (this.lastPosition && prepareVec3(this.lastPosition) !== preparedVec3Pos) {
  //       goSync = true;
  //     }

  //     // if previous rotation is too much different from previous one, send it to the server
  //     if (this.lastRotation && prepareVec3(this.lastRotation) !== preparedVec3Rotation) {
  //       goSync = true;
  //     }
  //     // Update values for the next round
  //     this.lastPosition = reduction.reducedPos;
  //     this.lastRotation = reduction.reducedRot;
  //     if (goSync) this.syncCharacter();
  //   }
  // }

  // /**
  //  * Called when a player quit
  //  * Retrieve the player from the list of players and remove him from the scene
  //  * @param {IUser} message
  //  * @return {void}
  //  */
  // private userQuit(message: IUser): void {
  //   if (!message._name || !message._id) {
  //     throw new Error('Invalid payload');
  //   }

  //   const user = this.players.get(message._id);

  //   if (!user) throw new Error('User doesn\'t exists'); // wtf
  //   const ped = user.getPed();
  //   if (!ped) throw new Error('Ped not found');
  //   ped.clear();
  //   ped.remove();
  //   ped.visible = false;

  //   if (!this.players.delete(message._id)) {
  //     throw new Error('User not found');
  //   }
  //   console.log(`${message._name} quited`);
  // }

  // /**
  //  * Called when a user join the game
  //  * Also called when we join the game, to receive the list of users
  //  * Create new player(s) and add it/them to the scene
  //  * @param {IUser[]} message
  //  * @return {void}
  //  */
  // private userJoined(message: IUser[]): void {
  //   // loop over the users
  //   message.forEach((user) => {
  //     if (!user._name || !user._id) {
  //       throw new Error('Invalid payload');
  //     }

  //     // if the user is already in the scene, Error
  //     const exists = this.players.get(user._id);
  //     if (exists) throw new Error('User already exists');

  //     this.assets?.getModel(this.assets.modelList.meuf).then((model) => {
  //       if (!model) throw new Error('No model');
  //       const character = new Character(model);
  //       const _user = new User(user._id!, user._name!, character);
  //       const ped = _user.getPed();
  //       if (!ped) {
  //         console.warn('User has no ped');
  //         return;
  //       }
  //       this.scene.add(ped);
  //       console.warn('User added', _user.id);
  //       this.players.set(_user.id, _user);
  //       console.log(`${user._name} joined the game`);
  //     });
  //   });
  // }
}

export default Game;

async function init() {
  assets = new Assets();
  await assets.setup();
  createGround();
  createSkybox();
  document.body.appendChild(renderer.domElement);

  backend.init();
  character = setCharacter(await assets.getModel(assets.modelList.meuf));

  const gui = new dat.GUI();
  addVecToMenu(gui, character.ped.scene.scale, 'Scale');
  addVecToMenu(gui, character.ped.scene.position, 'Position');
  addVecToMenu(gui, gameController.controls.getObject().position, 'Position (camera)');

  renderScene();
}

// Add init function to window
window.init = init;
