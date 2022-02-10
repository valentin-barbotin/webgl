/* eslint-disable max-len */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
import { AudioLoader, Audio, Group, Texture, TextureLoader } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import EventEmitter from 'events';
import * as THREE from 'three';
import Sounds from './Sound';
import { resolve } from 'path/posix';


class Assets {
  private textureMap: Map<string, Texture>;

  private modelMap: Map<string, Group>;
  //   private modelsMap: Map<string, string>;
  private audioMap: Map<string, Audio>;

  private TextureLoader: TextureLoader;

  private GLTFLoader: GLTFLoader;

  private texturesLoaded: number = 0;
  private soundsLoaded: number = 0;

  private assetsPath = '/assets/';

  public camera: THREE.PerspectiveCamera;

  public listener = new THREE.AudioListener();

  public audioLoader = new THREE.AudioLoader();

  public skybox = {
    negx: 'skybox/negx.jpg',
    posx: 'skybox/posx.jpg',
    posy: 'skybox/posy.jpg',
    negy: 'skybox/negy.jpg',
    negz: 'skybox/negz.jpg',
    posz: 'skybox/posz.jpg',
  };

  // All the textures used in the game
  public textureList = {
    concrete: 'concrete.jpg',
    grass: 'grass.png',
    dirt: 'dirt.jpg',
    dirtGrass: 'dirtgrass.jpg',
    marble: 'marble.jpg',
    ...this.skybox,
  };

  // All the models used in the game
  public modelList = {
    world: '/assets/world.glb',
    meuf: '/assets/meuf2skin.glb',
    boug: '/assets/player.gltf',
    // boug: '/dist/assets/boug3.fbx',
    Capoeira: '/assets/Capoeira.fbx',
  };

  public soundList = {
    leaf: 'marchefeuille.ogg',
  }

  constructor() {
    //audio loader
    //map
    this.audioLoader = new AudioLoader;
    this.audioMap = new Map<string, Audio>();
    this.textureMap = new Map<string, Texture>();
    this.modelMap = new Map<string, Group>();
    this.TextureLoader = new TextureLoader();
    this.GLTFLoader = new GLTFLoader();
    this.texturesLoaded = Object.keys(this.textureList).length;
    this.soundsLoaded = Object.keys(this.soundList).length;
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.x = 0;
    this.camera.position.y = 20;
    this.camera.position.z = 0;
  }

  /**
   * 
   * @param {string} key
   * @return {Promise<void>}
   */
  public async setup(): Promise<void> {
    const Tracker = new EventEmitter();
    // Textures
    const textureLoadingTime = performance.now();
    // Store all the textures in a HashMap, with the key being the name of the texture
    Object.values(this.textureList).forEach(async (value) => {
      const fullPath = this.assetsPath + value;
      console.log(fullPath);
      const data = await this.TextureLoader.loadAsync(fullPath);
      this.textureMap.set(value, data);
      this.texturesLoaded--;
      Tracker.emit('processed');
      console.log(value, 'loaded');
    });
    console.log(`${performance.now() - textureLoadingTime} ms to load textures`);

    const audioLoadingTime = performance.now();
    Object.values(this.soundList).forEach(async (value) => {
      const fullPath = this.assetsPath + value;
      console.log(fullPath);
      const data = await this.audioLoader.loadAsync(fullPath);
      const sound = new THREE.Audio(this.listener);
      this.audioMap.set(value, sound.setBuffer(data).setVolume(0.5));
      this.soundsLoaded--;
      Tracker.emit('processed');
      console.log(value, 'loaded');
    });
    console.log(`${performance.now() - audioLoadingTime} ms to load audio`);

    // Wait all the textures to be loaded before returning a value, the game will be ready only after
    await new Promise<void>((resolve) => {
      Tracker.on('processed', () => {
        if (this.texturesLoaded === 0 && this.soundsLoaded === 0) {
          resolve();
        }
      });
    });
  }

  /**
   * 
   * @param {string} key
   * @return {Promise<GLTF>}
   */
  public async getModel(key: string): Promise<GLTF> {
    // Async because we don't want to use callbacks, but the value directly
    return this.GLTFLoader.loadAsync(key);
  }

  /**
   * 
   * @param {string} key
   * @return {Texture}
   */
  public getTexture(key: string): Texture {
    const path = this.textureMap.has(key);

    if (!path) {
      throw new Error(`${key} not found`);
    } // TODO: throw error
    return this.textureMap.get(key) ?? new Texture();
  }

  public getSound(key: string): Audio {
    const path = this.audioMap.has(key);
    if (!path) {
      throw new Error(`${key} not found`);
    }
    console.log('key found');
    return this.audioMap.get(key) ?? new Audio(this.listener);

  }
}

export default Assets;
