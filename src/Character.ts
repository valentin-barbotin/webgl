import * as THREE from 'three';

class Character {
  public ped: THREE.Group;

  public mixer: THREE.AnimationMixer;

  constructor(ped: THREE.Group) {
    ped.traverse((child) => {
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
    const mixer = new THREE.AnimationMixer(ped);
    if (animation) {
      const action = mixer.clipAction(animation);
      action.play();
    }

    ped.scale.set(0.05, 0.05, 0.05);
    this.ped = ped;
    this.mixer = mixer;
  }
}

export default Character;
