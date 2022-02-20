/* eslint-disable no-underscore-dangle */
import * as THREE from 'three';
import Game from './Game';

class Sounds {
  public listener = new THREE.AudioListener();

  private _game: Game;

  constructor(game: Game) {
    this._game = game;
    game.camera.add(this.listener);
  }

  public startSound(soundKey: string) {
    const sound = this._game.assets.getSound(soundKey);
    if (!sound || sound == null || sound.isPlaying) return;
    // console.warn(sound);
    console.warn('start', sound.name);
    sound.play();
  }

  public stopSound(soundKey: string) {
    const sound = this._game.assets.getSound(soundKey);
    if (!sound || sound == null) return;
    console.log('volume = ', sound.getVolume());
    console.warn('stop', sound.name, sound.getVolume());
    sound.stop();
  }
}

export default Sounds;
