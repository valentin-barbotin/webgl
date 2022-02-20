/* eslint-disable new-cap */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import Ammo from 'ammojs-typed';
import {
  Quaternion,
  Scene, Vector, Vector2, Vector3, Vector3Tuple,
} from 'three';
import dat from 'dat.gui';
import Assets from './Assets';
import Game from './Game';
import { addVecToMenu, preloadObject } from './utils';
import Backend from './Backend';

const groundSize = 200;

/**
 * Create a ground and add it to the scene
 * @param {Game} game
 * @return {void}
 */
async function createGround(game: Game): Promise<void> {
  const dimensions: Vector3Tuple = [3000, 1, 3000];
  const position: Vector3Tuple = [0, -1, 0];
  const texture = game.assets.getTexture(game.assets.textureList.negy);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  const ground = new THREE.Mesh(
    new THREE.BoxBufferGeometry(...dimensions),
    new THREE.MeshPhongMaterial({ map: texture }),
  );
  ground.position.fromArray(position);
  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.name = 'ground';
  game.scene.add(ground);

  const quat = new Quaternion(0, 0, 0, 1);
  game.physics.createPhysxCube(dimensions, position, 0, quat, ground);
}

/**
 * Create the skybox
 * @param {Game} game
 * @return {void}
 */
async function createSkybox(game: Game): Promise<void> {
  const skyboxTextures: THREE.Texture[] = [];

  // Load the skybox textures
  // Edit the texture to invert
  Object.entries(game.assets.skybox).forEach(([key, value]) => {
    const texture = game.assets.getTexture(value);
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
  game.scene.add(skybox);
}

async function init(model: string) {
  // Setup the assets and preload them
  const assets = new Assets();
  await assets.setup();
  // Setup the game, this will create the scene and the renderer
  const game = new Game(assets, model);

  await game.setCharacter();

  game.backend = new Backend(game);

  if (Object.prototype.hasOwnProperty.call(window, 'Ammo')) {
    // start rendering
    await game.startGame();

    createGround(game);
    createSkybox(game);
  }
  // Add the gui
  const gui = new dat.GUI();
  if (!game.Character) return;
  addVecToMenu(gui, game.Character.ped.scene.scale, 'Scale');
  addVecToMenu(gui, game.Character.ped.scene.position, 'Position');
  addVecToMenu(gui, game.GameController.controls.getObject().position, 'Position (camera)');
  const fd = gui.addFolder('speeds');
  fd.add(game.speeds, 'sprint', 300, 1000);
  fd.add(game.speeds, 'walk', 300, 1000);

  const vol = {
    Volume: 50,
  };
  gui.add(vol, 'Volume', 0, 100, 1).onChange(() => {
    game.assets.getSound(game.assets.soundList.bgForest).setVolume(vol.Volume / 100);
  });

  const world = await assets.getModel(game.assets.modelList.world);
  world.scene.scale.set(7, 7, 7);
  world.scene.position.set(0, 0, 0);

  world.scene.traverse((child) => {
    if (child) {
      if (child instanceof THREE.Mesh) {
        preloadObject(child, game.scene, game.renderer, game.camera);
        // eslint-disable-next-line no-param-reassign
        child.castShadow = true;
        // eslint-disable-next-line no-param-reassign
        child.receiveShadow = true;
      }

      const animation = child.animations.shift();
      if (animation) {
        const mixer = new THREE.AnimationMixer(child);
        const action = mixer.clipAction(animation).play();
        game.mixers.push(mixer);
        action.play();
      }
    }
  });

  game.scene.add(world.scene);
}

// Add init function to window
window.init = init;
