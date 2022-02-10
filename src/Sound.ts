import * as THREE from 'three';
import Game from './Game';

class Sounds {
    public listener = new THREE.AudioListener();

    private _game: Game;

    constructor(game: Game) {
        this._game = game;
        game.camera.add( this.listener );
    }

    public startSound(soundKey: string) {
        const sound = this._game.assets.getSound(soundKey)
        sound.play();
    }
}

export default Sounds;
