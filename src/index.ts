/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { Vector, Vector3, Vector3Tuple } from 'three';
import GameController from './GameController';
import Assets from './Assets';
import {
  objectToBuffer, BufferToObject, ws, Message, sendMessageToWS, getPos, getClient2Pos,
} from './ws';
import Game from './Game';

const pillarDiameter = 2;
const buildingLength = 80;
const buildingHeigth = 22;
const space = -(buildingLength * 0.18) + pillarDiameter * 3;

(async () => {
  const assets = new Assets();
  await assets.setup();
  const game = new Game();
  game.assets = assets;
  game.setCharacter(assets.getModel(game.assets.modelList.boug));
  game.startGame();

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(buildingLength * 10, 1, buildingLength * 10),
    new THREE.MeshPhongMaterial({ map: await assets.getTexture(assets.textureList.concrete) }),
  );

  ground.receiveShadow = true;
  ground.castShadow = true;
  ground.position.set(0, -1, 0);
  game.scene.add(ground);
})();
