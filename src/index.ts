/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

function createAPillar(buildingHeigth: number, scene: THREE.Scene) {
  const [topRadius, bottomRadius] = [2, 2];
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, buildingHeigth);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const piller = new THREE.Mesh(geometry, material);
  scene.add(piller);
  return piller;
}

function setupRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  return renderer;
}

const renderer = setupRenderer();
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); // resize the canvas (the view)
}
window.addEventListener('resize', onWindowResize, false);

const pillarDiameter = 2;
const buildingLength = 80;
const buildingHeigth = 22;
const space = -(buildingLength * 0.18) + pillarDiameter * 3;

const scene = new THREE.Scene();
const loader = new THREE.TextureLoader();
const controls = new OrbitControls(camera, renderer.domElement); // add the ability to move the camera around the scene

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

function setupSide(index: number) {
  for (const position of positions) {
    createAPillar(buildingHeigth, scene).position.set(
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
const materials = [
  new THREE.MeshBasicMaterial({ map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-1.jpg') }),
  new THREE.MeshBasicMaterial({ map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-2.jpg') }),
  new THREE.MeshBasicMaterial({ map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-3.jpg') }),
  new THREE.MeshBasicMaterial({ map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-4.jpg') }),
  new THREE.MeshBasicMaterial({ map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-5.jpg') }),
  new THREE.MeshBasicMaterial({ map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-6.jpg') }),
];

// create a box
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(buildingLength, 2, buildingLength * 0.3),
  materials,
);

// define the position of the floor in the scene
floor.position.set(0, 0, 0);

// create a box
const roof = new THREE.Mesh(
  new THREE.BoxGeometry(buildingLength, 2, buildingLength * 0.3),
  new THREE.MeshBasicMaterial({
    map: loader.load('https://threejsfundamentals.org/threejs/resources/images/wall.jpg'),
  }),
);

// define the position of the ceil in the scene, higher than the floor
roof.position.set(0, buildingHeigth, 0);

// add the meshs in the scene
scene.add(floor);
scene.add(roof);

// add the pillars on the sides
for (let index = 0; index < 2; index++) {
  setupSide(index);
}

(function animate() {
  requestAnimationFrame(animate);

  // sol.rotation.x += 0.01;
  // sol.rotation.y += 0.01;

  renderer.render(scene, camera);
}());
