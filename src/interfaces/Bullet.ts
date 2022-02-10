import { Vector3, Mesh, BufferGeometry, MeshPhongMaterial, Vector3Tuple } from 'three';
import Ammo from 'ammojs-typed';

interface IBullet {
    mass: number;
    radius: number;
    speed: number;
    pos: Vector3Tuple;
    direction: Vector3Tuple;
    gfxObj?: Mesh<BufferGeometry, MeshPhongMaterial>;
    physObj?: Ammo.btRigidBody;
}

export default IBullet;
