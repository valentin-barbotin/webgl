/* eslint-disable max-len */
/* eslint-disable new-cap */
/* eslint-disable no-underscore-dangle */
import Ammo from 'ammojs-typed';
import * as THREE from 'three';
import Game from './Game';

class Physics {
  private _game: Game;

  public Ammo?: typeof Ammo;

  public PhysXWorld?: Ammo.btDiscreteDynamicsWorld;

  private allPhysXObjects: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>[] = [];

  constructor(game: Game) {
    this._game = game;
  }

  /**
   * Setup physics world
   * @return {Promise<void>}
   */
  public async setupAmmo(): Promise<void> {
    this.Ammo = await window['Ammo']();

    if (!this.Ammo) throw new Error('Ammo not found');

    const collisionConfiguration = new this.Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfiguration);
    const overlappingPairCache = new this.Ammo.btDbvtBroadphase();
    const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
    this.PhysXWorld = new this.Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    this.PhysXWorld.setGravity(new this.Ammo.btVector3(0, -9.81, 0));

    window.addEventListener('pointerdown', this.shootBullet.bind(this));
    window.Ammo = this.Ammo;
  }

  private shootBullet() {
    if (!this.Ammo) throw new Error('Ammo not found');
    this._game.raycaster.setFromCamera(new THREE.Vector2(0, 0), this._game.camera);
    const bulletMass = 50;
    const bulletRadius = 0.7;
    const bulletSpeed = 200;
    const bulletMesh = new THREE.Mesh(
      new THREE.SphereGeometry(bulletRadius, 10, 10),
      new THREE.MeshPhongMaterial({ color: 0xffffff }),
    );
    bulletMesh.castShadow = true;
    bulletMesh.receiveShadow = true;
    const quaternion = new THREE.Quaternion(0, 0, 0, 1);
    const pos = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 0, 0);
    pos.copy(this._game.raycaster.ray.direction);
    pos.add(this._game.raycaster.ray.origin);
    const bulletShape = new this.Ammo.btSphereShape(bulletRadius);
    bulletShape.setMargin(0.05);
    const bullet = this.createPhysXObj(bulletShape, pos, bulletMass, quaternion, bulletMesh);
    direction.copy(this._game.raycaster.ray.direction);
    direction.multiplyScalar(bulletSpeed);
    bullet.setLinearVelocity(new this.Ammo.btVector3(direction.x, direction.y, direction.z));
  }

  public createPhysXObj(shape: Ammo.btCollisionShape, pos: THREE.Vector3, mass: number, quat: THREE.Quaternion, obj: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhongMaterial>): Ammo.btRigidBody {
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

    this._game.scene.add(obj);

    obj.userData.PhysXBody = body; // link graphics object to physics body

    this.allPhysXObjects.push(obj);

    return body;
  }

  public createPhysxCube(dimensions: THREE.Vector3Tuple, pos: THREE.Vector3Tuple, mass: number, quat: THREE.Quaternion, obj: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>): void {
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

  /**
   * Update the PhysX world
   * @param {number} delta
   * @return {void}
   */
  public updatePhysXWorld(delta: number): void {
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
}

export default Physics;
