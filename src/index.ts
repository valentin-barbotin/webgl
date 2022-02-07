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
import {
  Scene, Vector, Vector2, Vector3, Vector3Tuple,
} from 'three';
import dat from 'dat.gui';
import Ammo from 'ammojs-typed';
import Assets from './Assets';
import Game from './Game';
import { addVecToMenu } from './utils';

const groundSize = 100;

/**
 * Create a ground and add it to the scene
 * @param {Game} game
 * @return {void}
 */
async function createGround(game: Game): Promise<void> {
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(groundSize * 20, 1, groundSize * 20),
    new THREE.MeshPhongMaterial({ map: game.assets.getTexture(game.assets.textureList.negy) }),
  );

  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.position.set(0, -1, 0);
  game.scene.add(ground);
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

(async () => {
  // Setup the assets and preload them
  const assets = new Assets();
  await assets.setup();
  // Setup the game, this will create the scene and the renderer
  const game = new Game(assets);

  createGround(game);
  createSkybox(game);

  // Create the character of the user (player)
  game.setCharacter(await assets.getModel(game.assets.modelList.meuf));
  // start rendering
  game.startGame();

  if (Object.prototype.hasOwnProperty.call(window, 'Ammo')) {
    const _ammo: typeof Ammo = await window['Ammo']();
    game.setupAmmo(_ammo);
  }

  // Add the gui
  const gui = new dat.GUI();
  if (!game.Character) return;
  addVecToMenu(gui, game.Character.ped.scene.scale, 'Scale');
  addVecToMenu(gui, game.Character.ped.scene.position, 'Position');
  addVecToMenu(gui, game.GameController.controls.getObject().position, 'Position (camera)');
})();
