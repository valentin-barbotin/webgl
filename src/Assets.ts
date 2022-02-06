/* eslint-disable max-len */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
import { Group, Texture, TextureLoader } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import EventEmitter from 'events';

class Assets {
  private textureMap: Map<string, Texture>;

  private modelMap: Map<string, Group>;
  //   private modelsMap: Map<string, string>;

  private TextureLoader: TextureLoader;

  private GLTFLoader: GLTFLoader;

  private texturesLoaded: number = 0;

  private assetsPath = '/assets/';

  public skybox = ['skybox/negx.jpg', 'skybox/posx.jpg', 'skybox/posy.jpg', 'skybox/negy.jpg', 'skybox/negz.jpg', 'skybox/posz.jpg'];

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
    meuf: '/assets/meuf2skin.glb',
    boug: '/assets/player.gltf',
    // boug: '/dist/assets/boug3.fbx',
    Capoeira: '/assets/Capoeira.fbx',
  };

  constructor() {
    this.textureMap = new Map<string, Texture>();
    this.modelMap = new Map<string, Group>();
    this.TextureLoader = new TextureLoader();
    this.GLTFLoader = new GLTFLoader();
    this.texturesLoaded = Object.keys(this.textureList).length;
  }

  /**
   * Triggered when the connection is closed
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
      this.textureMap.set(fullPath, data);
      this.texturesLoaded--;
      Tracker.emit('processed');
      console.log(value, 'loaded');
    });
    console.log(`${performance.now() - textureLoadingTime} ms to load textures`);

    // Wait all the textures to be loaded before returning a value, the game will be ready only after
    await new Promise<void>((resolve) => {
      Tracker.on('processed', () => {
        if (this.texturesLoaded === 0) {
          resolve();
        }
      });
    });
  }

  /**
   * Triggered when the connection is closed
   * @param {string} key
   * @return {Promise<GLTF>}
   */
  public async getModel(key: string): Promise<GLTF> {
    // Async because we don't want to use callbacks, but the value directly
    return this.GLTFLoader.loadAsync(key);
  }

  /**
   * Triggered when the connection is closed
   * @param {string} key
   * @return {Promise<Texture>}
   */
  public async getTexture(key: string): Promise<Texture> {
    const path = this.textureMap.has(key);

    if (!path) {
      throw new Error(`${key} not found`);
    } // TODO: throw error
    return this.textureMap.get(key) ?? new Texture();
  }
}

export default Assets;
