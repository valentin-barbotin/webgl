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
import Assets from './Assets';
import Game from './Game';
import { addVecToMenu } from './utils';

const groundSize = 100;

(async () => {
  const assets = new Assets();
  await assets.setup();
  const game = new Game();
  game.assets = assets;
  game.setCharacter(await assets.getModel(game.assets.modelList.meuf));
  game.startGame();

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(groundSize * 20, 1, groundSize * 20),
    new THREE.MeshPhongMaterial({ map: await assets.getTexture(assets.textureList.concrete) }),
  );

  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.position.set(0, -1, 0);
  game.scene.add(ground);

  const _skyboxTextures: Promise<THREE.Texture>[] = [];

  const textureToFlip = assets.skybox.findIndex((tex, index) => {
    if (tex.endsWith('posy.jpg')) {
      return index;
    }
    return false;
  });

  assets.skybox.forEach((side) => {
    const texture = assets.getTexture(side);
    _skyboxTextures.push(texture);
  });

  const skyboxTextures: THREE.Texture[] = await Promise.all(_skyboxTextures);

  skyboxTextures.at(textureToFlip)!.rotation = Math.PI;
  skyboxTextures.at(textureToFlip)!.center = new Vector2(0.5, 0.5);

  const skyboxSides = skyboxTextures.map((texture) => new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));
  const skyboxGeometry = new THREE.BoxGeometry(10000, 10000, 10000);
  const skybox = new THREE.Mesh(
    skyboxGeometry,
    skyboxSides,
  );
  skybox.position.set(0, 0, 0);
  game.scene.add(skybox);

  const gui = new dat.GUI();
  if (!game.Character) return;
  addVecToMenu(gui, game.Character.ped.scene.scale, 'Scale');
  addVecToMenu(gui, game.Character.ped.scene.position, 'Position');
  addVecToMenu(gui, game.GameController.controls.getObject().position, 'Position (camera)');
})();
