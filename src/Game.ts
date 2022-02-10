/* eslint-disable no-plusplus */
/* eslint-disable new-cap */
/* eslint-disable no-case-declarations */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Quaternion, Vector2, Vector3, Vector3Tuple } from 'three';
import Ammo from 'ammojs-typed';
import GameController from './GameController';
import Character from './Character';
import Assets from './Assets';
import { BufferToObject, prepareVec3, reduceVec3 } from './utils';
import { IMessageSync, IMessage, MessageData } from './interfaces/Message';
import Backend from './Backend';
import IUser from './interfaces/User';
import User from './User';
import Sounds from './Sound';

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

  private lastPosition?: THREE.Vector3Tuple;

  private lastRotation?: THREE.Vector3Tuple;

  private players: Map<string, User>;

  private allPhysXObjects: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[] = [];

  public Ammo?: typeof Ammo;

  public PhysXWorld?: Ammo.btDiscreteDynamicsWorld;

  public sounds: Sounds;

  // private ammoPhysics: AmmoPhysics;

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
    this.PhysXClock = new THREE.Clock();
    this.previousTime = 0;

    this.raycaster = new THREE.Raycaster();


    this.GameController = new GameController(this.camera, this.renderer, this);
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    this.backend = new Backend(this);
    this.assets = assets;
    this.sounds = new Sounds(this);
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
    this.Character.ped.scene.visible = false;
  }

  public async startGame() {
    console.log('Game started');
    if (!this.Character) return;
    this.setupAmmo();

    {
      const quat = new Quaternion(0, 0, 0, 1);
      const dimensions: Vector3Tuple = [20, 10, 10];
      const position: Vector3Tuple = [1, 50, 1];

      const objjj = new THREE.Mesh(
        new THREE.BoxGeometry(...dimensions),
        new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
      );

      this.createPhysxCube(dimensions, position, 40, quat, objjj);
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

      this.createPhysxCube(dimensions, position, 2000, quat, objjj);
      this.scene.add(objjj);
    }

    console.log('render');
    this.renderScene();
  }

  public createPhysxCube(dimensions: Vector3Tuple, pos: Vector3Tuple, mass: number, quat: Quaternion, obj: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>): void {
    if (!this.PhysXWorld) throw new Error('PhysXWorld is not defined');
    if (!this.Ammo) throw new Error('Ammo is not defined');
    if (dimensions.some((d) => (d < 0))) return;

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new this.Ammo.btVector3(...pos)); // position
    transform.setRotation(new this.Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)); // rotation
    const motionState = new this.Ammo.btDefaultMotionState(transform);

    const colision = new this.Ammo.btBoxShape(new this.Ammo.btVector3(dimensions[0] * 0.5, dimensions[1] * 0.5, dimensions[2] * 0.5));
    colision.setMargin(0.05);
    const localInertia = new this.Ammo.btVector3(0, 0, 0);
    colision.calculateLocalInertia(mass, localInertia);

    const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(mass, motionState, colision, localInertia);
    const body = new this.Ammo.btRigidBody(rbInfo);

    body.setFriction(0.5);

    this.PhysXWorld.addRigidBody(body);

    obj.userData.PhysXBody = body; // link graphics object to physics body

    this.allPhysXObjects.push(obj);
  }

  public createPhysXObj(shape: Ammo.btCollisionShape, pos: Vector3, mass: number, quat: Quaternion, obj: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>): Ammo.btRigidBody {
    if (!this.PhysXWorld) throw new Error('PhysXWorld is not defined');
    if (!this.Ammo) throw new Error('Ammo is not defined');

    const transform = new this.Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new this.Ammo.btVector3(pos.x, pos.y, pos.z)); // position
    transform.setRotation(new this.Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)); // rotation
    const motionState = new this.Ammo.btDefaultMotionState(transform);

    const localInertia = new this.Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    const body = new this.Ammo.btRigidBody(rbInfo);

    body.setFriction(0.5);

    // body.setLinearVelocity( new Ammo.btVector3( vel.x, vel.y, vel.z ) ); //todo

    this.PhysXWorld.addRigidBody(body);

    this.scene.add(obj);

    obj.userData.PhysXBody = body; // link graphics object to physics body

    this.allPhysXObjects.push(obj);

    return body;
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
    this.allPhysXObjects.forEach((realObj) => {
      const PhysXObj = realObj.userData.PhysXBody as Ammo.btRigidBody;
      const motionState = PhysXObj.getMotionState();
      if (!motionState) {
        throw new Error("Object doesn't have a motion state");
      }

      if (motionState) {
        motionState.getWorldTransform(transform);
        const p = transform.getOrigin();
        const q = transform.getRotation();
        realObj.position.set(p.x(), p.y(), p.z());
        realObj.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    });
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

    const raycasterPos = this.raycaster.ray.origin;

    const baseCameraY = this.camera.position.y;

    let blockPlayer = false;
    // Max ray distance instead of Infinity
    this.raycaster.far = 20;
    // Creates an array with all objects the ray intersects. //
    const objetsToCheck = this.scene.children.filter((obj) => obj.name !== 'ground');
    const duplicate: Set<string> = new Set();
    const intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];

    // Send many raycasts to check if the player is on a block
    for (let index = raycasterPos.y; index > 1; index--) {
      if (blockPlayer) break;
      // for (let index = raycasterPos.y; index > 1; index = Math.ceil(index / 4)) {
      this.raycaster.camera.position.y = index;
      this.raycaster.ray.origin.y = index;
      this.raycaster.intersectObjects(objetsToCheck, true, intersects); // intersects est un tableau d'objets

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

    if (true) {
      this.GameController.velocity.y = Math.max(0, this.GameController.velocity.y); // clamping (prevents going through the ground)
    }

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
      ped.position.x = camera.position.x;
      // character.position.y = character.geometry.parameters.height / 2;
      ped.position.z = camera.position.z;
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
    // if (!this.ammoPhysics) return;
    this.light.target.updateMatrixWorld();
    this.light.shadow.camera.updateProjectionMatrix();

    const time = performance.now();

    this.updatePhysXWorld(this.PhysXClock.getDelta());

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

  /**
   * Setup physics world
   * @param {Ammo} ammo
   * @return {void}
   */
  public async setupAmmo(): Promise<void> {
    if (!this.Ammo) return;

    const collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
    const overlappingPairCache = new this.Ammo.btDbvtBroadphase();
    const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
    this.PhysXWorld = new this.Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    this.PhysXWorld.setGravity(new this.Ammo.btVector3(0, -9.81, 0));

    window.addEventListener('pointerdown', (e) => {
      if (!this.Ammo) return;

      this.raycaster.setFromCamera(new Vector2(0, 0), this.camera);

      const bulletMass = 50;
      const bulletRadius = 0.7;
      const bulletSpeed = 200;
      const bulletMesh = new THREE.Mesh(
        new THREE.SphereGeometry(bulletRadius, 10, 10),
        new THREE.MeshPhongMaterial({ color: 0xffffff }),
      );
      bulletMesh.castShadow = true;
      bulletMesh.receiveShadow = true;

      const quaternion = new Quaternion(0, 0, 0, 1);
      const pos = new Vector3(0, 0, 0);
      const direction = new Vector3(0, 0, 0);
      pos.copy(this.raycaster.ray.direction);
      pos.add(this.raycaster.ray.origin);
      const bulletShape = new this.Ammo.btSphereShape(bulletRadius);
      bulletShape.setMargin(0.05);

      const bullet = this.createPhysXObj(bulletShape, pos, bulletMass, quaternion, bulletMesh);

      direction.copy(this.raycaster.ray.direction);
      direction.multiplyScalar(bulletSpeed);
      bullet.setLinearVelocity(new this.Ammo.btVector3(direction.x, direction.y, direction.z));
    });

    // window.Ammo = this.Ammo;
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
