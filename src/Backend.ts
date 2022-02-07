/* eslint-disable no-underscore-dangle */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
import Game from './Game';
import { IMessageWithoutID, Message } from './interfaces/Message';
import IUser from './interfaces/User';
import { objectToBuffer } from './utils';
import gameConfig from './config/config';

class Backend {
  private endpoint?: WebSocket;

  public user: IUser;

  private roomID?: string;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    const usernameField = document.getElementById('username') as HTMLInputElement;
    const passwordField = document.getElementById('password') as HTMLInputElement;
    
    const username = usernameField.value;
    const password = passwordField.value;
    
    if (username.length == 0 || password.length == 0) return;
    
    this.user = {
      id: '',
      name: username,
      getPed: () => this.user.character?.ped.scene,
    };

    this.loginWithBackend(password);
    // this.roomID = window.prompt('Enter choose a room');
  }

  private loginWithBackend(password: string) {
    this.endpoint = new WebSocket(`ws://${gameConfig.hostname}:${gameConfig.port}`);
    this.endpoint.onclose = (ev) => this.onDisconnect.call(this, ev);
    this.endpoint.onopen = (ev) => this.connected.call(this, ev, password);
    this.endpoint.onmessage = (m) => this.game.processMessage.call(this.game, m);
  }

  private onDisconnect(ev: Event) {
    if (!this.endpoint) return;
    console.log('Disconnected');
    console.log('Trying to reconnect to backend');
    // this.loginWithBackend(); // removed
    // this.endpoint.close();
    // setInterval(
    //   () => this.loginWithBackend.call(this),
    //   5000,
    // );
  }

  private connected(ev: Event, password: string) {
    if (!this.endpoint) return;
    if (this.endpoint.readyState === this.endpoint.OPEN) {
      const response: IMessageWithoutID = {
        type: 'login',
        data: {
          user: this.user,
          password: password,
        },
      };
      const payload = objectToBuffer(response);
      this.endpoint.send(payload);
    }
  }

//   public static handleLoginResponse(message: Message): boolean {
//     // wait backend
//     return true;

//     // if (message.data.login) {
//     //   console.log('Login success');
//     //   return true;
//     // }
//     // return false;
//   }

  public sendMessage(message: IMessageWithoutID) {
    if (!this.endpoint) return;
    if (this.endpoint.readyState !== this.endpoint.OPEN) {
      throw new Error("Can't send message, endpoint is not open");
    }
    const payload = objectToBuffer(message);
    this.endpoint.send(payload);
  }
}

export default Backend;
