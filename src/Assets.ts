/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */
import { Group, Texture, TextureLoader } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import EventEmitter from 'events';

class Assets {
  private textureMap: Map<string, Texture>;

  private modelMap: Map<string, Group>;
  //   private modelsMap: Map<string, string>;

  private TextureLoader: TextureLoader;

  private GLTFLoader: GLTFLoader;

  private texturesLoaded: number = 0;

  public textureList = {
    concrete: '/assets/concrete.jpg',
    grass: '/assets/grass.png',
    dirt: '/assets/dirt.jpg',
    dirtGrass: '/assets/dirtgrass.jpg',
    marble: '/assets/marble.jpg',
  };

  public modelList = {
    boug: '/dist/assets/player.gltf',
    // boug: '/dist/assets/boug3.fbx',
    Capoeira: '/dist/assets/Capoeira.fbx',
  };

  constructor() {
    this.textureMap = new Map<string, Texture>();
    this.modelMap = new Map<string, Group>();
    this.TextureLoader = new TextureLoader();
    this.GLTFLoader = new GLTFLoader();
    this.texturesLoaded = Object.keys(this.textureList).length;
  }

  public async setup() {
    const Tracker = new EventEmitter();
    // Textures
    const textureLoadingTime = performance.now();
    Object.values(this.textureList).forEach(async (value) => {
      const data = await this.TextureLoader.loadAsync(value);
      this.textureMap.set(value, data);
      this.texturesLoaded--;
      Tracker.emit('processed');
      console.log(value, 'loaded');
    });
    console.log(`${performance.now() - textureLoadingTime} ms to load textures`);

    await new Promise<void>((resolve) => {
      Tracker.on('processed', () => {
        if (this.texturesLoaded === 0) {
          resolve();
        }
      });
    });
  }

  public async getModel(key: string) {
    return this.GLTFLoader.loadAsync(key);

    // if (!path) {
    //   throw new Error(`${key} not found`);
    // } // TODO: throw error
    // return this.modelMap.get(key) ?? new Group();
  }

  public async getTexture(key: string) {
    console.log(this.textureMap.keys());
    const path = this.textureMap.has(key);

    if (!path) {
      throw new Error(`${key} not found`);
    } // TODO: throw error
    return this.textureMap.get(key) ?? new Texture();
  }
}

export default Assets;
