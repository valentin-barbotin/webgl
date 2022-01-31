/* eslint-disable no-underscore-dangle */
import { Texture, TextureLoader } from 'three';

class Assets {
  private textureMap: Map<string, Texture>;
  //   private modelsMap: Map<string, string>;

  private TextureLoader: TextureLoader;

  public textureList = {
    concrete: '/dist/assets/concrete.jpg',
    grass: '/dist/assets/grass.png',
    dirt: '/dist/assets/dirt.jpg',
    dirtGrass: '/dist/assets/dirtgrass.jpg',
    marble: '/dist/assets/marble.jpg',
  };

  constructor() {
    this.textureMap = new Map<string, Texture>();
    this.TextureLoader = new TextureLoader();
    // 3Ds

    // Textures
    const soundLoadingTime = performance.now();
    Object.values(this.textureList).forEach((value) => {
      this.textureMap.set(value, this.TextureLoader.load(value));
    });
    console.log(`${performance.now() - soundLoadingTime} ms to load textures`);
  }

  public async getTexture(key: string): Promise<Texture> {
    const path = this.textureMap.has(key);

    if (!path) {
      throw new Error(`${key} not found`);
    } // TODO: throw error
    return this.TextureLoader.loadAsync(key, (texture: ProgressEvent<EventTarget>) => {});
  }
}

export default Assets;
