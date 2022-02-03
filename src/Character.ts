import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

class Character {
  public ped: GLTF;

  public mixer: THREE.AnimationMixer;

  constructor(ped: GLTF) {
    ped.scene.traverse((child) => {
      if (child) {
        if (child instanceof THREE.Mesh) {
          // eslint-disable-next-line no-param-reassign
          child.castShadow = true;
          // eslint-disable-next-line no-param-reassign
          child.receiveShadow = true;
        }
      }
    });

    const animation = ped.animations.shift();
    const mixer = new THREE.AnimationMixer(ped.scene);
    if (animation) {
      const action = mixer.clipAction(animation);
      action.play();
    }

    ped.scene.scale.set(10, 10, 10);
    ped.scene.position.set(0, 0, 0);

    this.ped = ped;
    this.mixer = mixer;
  }
}

export default Character;
