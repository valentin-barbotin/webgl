import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const loader = new THREE.TextureLoader();

const controls = new OrbitControls( camera, renderer.domElement );

camera.position.x = 5;
camera.position.y = 20;
camera.position.z = 60;

const pillarDiameter = 2;
const buildingLength = 80;
const buildingHeigth = 22;
const space = -(buildingLength * 0.18) + pillarDiameter * 3;


const materials = [
    new THREE.MeshBasicMaterial({map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-1.jpg')}),
    new THREE.MeshBasicMaterial({map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-2.jpg')}),
    new THREE.MeshBasicMaterial({map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-3.jpg')}),
    new THREE.MeshBasicMaterial({map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-4.jpg')}),
    new THREE.MeshBasicMaterial({map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-5.jpg')}),
    new THREE.MeshBasicMaterial({map: loader.load('https://threejsfundamentals.org/threejs/resources/images/flower-6.jpg')}),
];

const ground = new THREE.Mesh( 
    new THREE.BoxGeometry(buildingLength, 2, buildingLength * 0.3),
    materials
);

ground.position.set(0, 0, 0);

const roof = new THREE.Mesh( 
    new THREE.BoxGeometry(buildingLength, 2, buildingLength * 0.3),
    new THREE.MeshBasicMaterial( {
        map: loader.load('https://threejsfundamentals.org/threejs/resources/images/wall.jpg')
    })
);

roof.position.set(0, buildingHeigth, 0);

scene.add( ground );
scene.add( roof );

const positions = [
    [-35],
    [-25],
    [-15],
    [-5],
    [5],
    [15],
    [25],
    [35],
]

for (let index = 0; index < 2; index++) {
    for (const position of positions) {
        const geometry = new THREE.CylinderGeometry(2, 2, buildingHeigth);
        const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
        const pilier = new THREE.Mesh( geometry, material );
        pilier.position.set(
            position[0],
            buildingHeigth / 2,
            index ? Math.abs(space) : space,
            );
        scene.add( pilier );
    }
}

const animate = function () {
    requestAnimationFrame( animate );

    // sol.rotation.x += 0.01;
    // sol.rotation.y += 0.01;

    renderer.render( scene, camera );
}

animate();
