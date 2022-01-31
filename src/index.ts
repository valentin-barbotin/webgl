/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import dat from 'dat.gui';
import { Vector3 } from 'three';
import GameController from './GameController';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const dancerPath = '/dist/assets/Capoeira.fbx';
const concretePath = '/dist/assets/concrete.jpg';
const grassPath = '/dist/assets/grass.png';
const dirtPath = '/dist/assets/dirt.jpg';
const dirtGrassPath = '/dist/assets/dirtgrass.jpg';
const marblePath = '/dist/assets/marble.jpg';

const pillarDiameter = 2;
const buildingLength = 80;
const buildingHeigth = 22;
const space = -(buildingLength * 0.18) + pillarDiameter * 3;

const loader = new THREE.TextureLoader();
const marbleMaterial = new THREE.MeshPhongMaterial({ map: loader.load(marblePath) });

/**
 * Create a pillar
 * @param {number} buildingHeigth
 * @param {THREE.Scene} scene
 * @return {THREE.Mesh<THREE.CylinderGeometry, THREE.MeshPhongMaterial>} pillar
 */
function createAPillar(scene: THREE.Scene): THREE.Mesh<THREE.CylinderGeometry, THREE.MeshPhongMaterial> {
  const [topRadius, bottomRadius] = [2, 2];
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, buildingHeigth);
  const material = marbleMaterial.clone();
  const piller = new THREE.Mesh(geometry, material);
  piller.receiveShadow = true;
  piller.castShadow = true;
  scene.add(piller);
  return piller;
}

/**
 * Setup the window renderer
 * @return {THREE.WebGLRenderer}
 */
function setupRenderer(): THREE.WebGLRenderer {
  const _renderer = new THREE.WebGLRenderer({ antialias: true });
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(_renderer.domElement);
  return _renderer;
}

/**
 * Used to manimulate x y z
 * @param {dat.GUI} gui
 * @param {Vector3} vec
 * @param {string} name
 * @return {void}
 */
function addVecToMenu(gui: dat.GUI, vec: Vector3, name: string): void {
  const folder = gui.addFolder(name);
  folder.add(vec, 'x', -100, 100);
  folder.add(vec, 'y', -100, 100);
  folder.add(vec, 'z', -100, 100);
}

const renderer = setupRenderer();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); // resize the canvas (the view)
}
window.addEventListener('resize', onWindowResize, false);

const scene = new THREE.Scene();

// ambient light
const ambiantLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambiantLight);

// light that can be source of shadows
const light = new THREE.SpotLight(0xffffff, 1.3); // white light
light.position.set(50, 50, 50);
light.target.position.set(0, 0, 0);
// max shadow distance from source and objet
light.shadow.camera.near = 0.01;
light.shadow.camera.far = 500;
light.castShadow = true;
// shadows quality
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;

scene.add(light);

const helper = new THREE.SpotLightHelper(light, 5);
scene.add(helper);

// pillars positions (one side) * 2
const positions = [
  -35,
  -25,
  -15,
  -5,
  5,
  15,
  25,
  35,
];

/**
 * Place the pillars on the floor
 * @param {number} index
 * @return {void}
 */
function setupSide(index: number) {
  for (const position of positions) {
    createAPillar(scene).position.set(
      position,
      buildingHeigth / 2,
      index ? Math.abs(space) : space,
    );
  }
}

// camera base position
camera.position.x = 5;
camera.position.y = 20;
camera.position.z = 60;

// box got 6 faces, so 6 materials
// clone the materials
const materials = [
  marbleMaterial.clone(),
  marbleMaterial.clone(),
  marbleMaterial.clone(),
  marbleMaterial.clone(),
  marbleMaterial.clone(),
  marbleMaterial.clone(),
];

if (!materials) {
  console.log('Material not found');
}
// create a box
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(buildingLength, 2, buildingLength * 0.3),
  materials,
);

// define the position of the floor in the scene
floor.position.set(0, 0, 0);
floor.receiveShadow = true;
floor.castShadow = true;

// create a box
const roof = new THREE.Mesh(
  new THREE.BoxGeometry(buildingLength, 2, buildingLength * 0.3),
  marbleMaterial.clone(),
);

// define the position of the ceil in the scene, higher than the floor
roof.position.set(0, buildingHeigth, 0);
roof.receiveShadow = true;
roof.castShadow = true;
// add the meshs in the scene
scene.add(floor);
scene.add(roof);

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(buildingLength * 10, 1, buildingLength * 10),
  new THREE.MeshPhongMaterial({ map: loader.load(concretePath) }),
);

ground.receiveShadow = true;
ground.castShadow = true;
ground.position.set(0, -1, 0);
scene.add(ground);

// add the pillars on the sides
for (let index = 0; index < 2; index++) {
  setupSide(index);
}

// Create the chest and add it to the scene
let chest: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial[]> | undefined;
{
  const grass = new THREE.MeshPhongMaterial({ map: loader.load(grassPath) });
  const dirt = new THREE.MeshPhongMaterial({ map: loader.load(dirtPath) });
  const dirtAndGrass = new THREE.MeshPhongMaterial({ map: loader.load(dirtGrassPath) });
  const _materials = [
    dirtAndGrass,
    dirtAndGrass,
    grass,
    dirt,
    dirtAndGrass,
    dirtAndGrass,
  ];

  chest = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    _materials,
  );
  chest.position.set(-5, roof.position.y + roof.geometry.parameters.height + 10, 0);
  chest.receiveShadow = true;
  chest.castShadow = true;
  scene.add(chest);
}

const gui = new dat.GUI();
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'z', -100, 100);
cameraFolder.open();

const lightFolder = gui.addFolder('Light');
lightFolder.add(light, 'penumbra', 0, 10);
lightFolder.add(light, 'intensity', 0, 5);
lightFolder.add(light.shadow.camera, 'far', 0, 1000);

addVecToMenu(gui, light.position, 'Position');
addVecToMenu(gui, light.target.position, 'Target');

const gameController = new GameController(camera, renderer);

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let previousTime = performance.now();

(function animate() {
  light.target.updateMatrixWorld();
  light.shadow.camera.updateProjectionMatrix();
  helper.update();
  if (chest) {
    chest.rotateX(0.005);
    chest.rotateY(0.01);
  }

  const mass = 80;
  const time = performance.now();
  if (gameController.controls.isLocked) {
    const delta = (time - previousTime) / 1000; // camera speed (high value = slow)
    velocity.x -= velocity.x * 10.0 * delta; // friction (current velocity * friction * delta)
    velocity.z -= velocity.z * 10.0 * delta; // friction
    velocity.y -= 9.8 * mass * delta; // gravity * mass

    direction.z = Number(gameController.moveForward) - Number(gameController.moveBackward); // 1 = forward, -1 = backward
    direction.x = Number(gameController.moveRight) - Number(gameController.moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions+

    if (gameController.moveForward || gameController.moveBackward) velocity.z -= direction.z * 400.0 * delta; // acceleration (direction * speed)
    if (gameController.moveLeft || gameController.moveRight) velocity.x -= direction.x * 400.0 * delta;

    if (true) {
      velocity.y = Math.max(0, velocity.y); // clamping (prevents going through the ground)
    }

    gameController.controls.moveRight(-velocity.x * delta); // delta used to make movement smooth
    gameController.controls.moveForward(-velocity.z * delta);

    gameController.controls.getObject().position.y += (velocity.y * delta); // apply gravity
    if (gameController.controls.getObject().position.y < 10) {
      velocity.y = 0;
    }
  }

  previousTime = time;

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}());
