/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { Vector, Vector3, Vector3Tuple } from 'three';
import dat from 'dat.gui';
import GameController from './GameController';
import Assets from './Assets';
import Game from './Game';
import { addVecToMenu } from './utils';
import Character from './Character';
import Backend from './Backend';

const groundSize = 80;

(async () => {
  const assets = new Assets();
  await assets.setup();
  const game = new Game();
  game.assets = assets;
  game.setCharacter(await assets.getModel(game.assets.modelList.boug));
  game.startGame();

  game.Character2 = new Character(await game.assets.getModel(game.assets.modelList.boug));
  game.scene.add(game.Character2.ped);
  game.mixers.push(game.Character2.mixer);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(groundSize * 10, 1, groundSize * 10),
    new THREE.MeshPhongMaterial({ map: await assets.getTexture(assets.textureList.concrete) }),
  );

  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.position.set(0, -1, 0);
  game.scene.add(ground);

  const gui = new dat.GUI();
  if (!game.Character) return;
  addVecToMenu(gui, game.Character.ped.scale, 'Scale');
  addVecToMenu(gui, game.Character.ped.position, 'Position');
  addVecToMenu(gui, game.GameController.controls.getObject().position, 'Position (camera)');
})();
