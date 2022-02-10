import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationAction } from 'three';
import Game from './Game';

enum ANIMATIONS {
    BOXING = 'BOXING',
    IDLE = 'IDLE',
    SPRINT = 'SPRINT',
    WALK_BACKWARD = 'WALK_BACKWARD',
    WALK_FORWARD = 'WALK_FORWARD',
}

class Character {
  public ped: GLTF;

  public mixer: THREE.AnimationMixer;

  public animations: AnimationAction[] = [];

  constructor(ped: GLTF) {
    this.ped = ped;
    // Once the character is loaded, shadow is enabled (cast/receive) on each meshs
    this.ped.scene.traverse((child) => {
      if (child) {
        if (child instanceof THREE.Mesh) {
          // eslint-disable-next-line no-param-reassign
          child.castShadow = true;
          // eslint-disable-next-line no-param-reassign
          child.receiveShadow = true;
        }
      }
    });

    // Once the character is loaded, we create a mixer for the animations
    this.mixer = new THREE.AnimationMixer(ped.scene);
    this.animations = ped.animations.map((animation) => this.mixer.clipAction(animation))
    
    ped.scene.scale.set(10, 10, 10);
    ped.scene.position.set(0, 0, 0);
  }

  public playAnimation(name: string) {
    let founded = false;
    this.animations.forEach((animation) => {
      console.log('value', animation.getClip().name);
      if (animation.getClip().name == name) {
        founded = true;
        animation.play();
      } else {
        animation.stop();
      }
    });
    if (!founded) {
      console.warn('Animation not found');
    }
  }
}

export { 
  ANIMATIONS
};

export default Character;
