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

  private password: string;

  private roomID?: string;

  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.loginWithBackend();
    const username = window.prompt('Enter your name', 'Anonymous') ?? 'Anonymous';
    this.password = window.prompt('Enter your password', 'password') ?? 'password';

    this.user = {
      id: '',
      name: username,
      getPed: () => this.user.character?.ped.scene,
    };

    // this.roomID = window.prompt('Enter choose a room');
  }

  private loginWithBackend() {
    this.endpoint = new WebSocket(`ws://${gameConfig.hostname}:${gameConfig.port}`);
    this.endpoint.onclose = (ev) => this.onDisconnect.call(this, ev);
    this.endpoint.onopen = (ev) => this.connected.call(this, ev);
    this.endpoint.onmessage = (m) => this.game.processMessage.call(this.game, m);
  }

  private onDisconnect(ev: Event) {
    if (!this.endpoint) return;
    console.log('Disconnected');
    console.log('Trying to reconnect to backend');
    this.loginWithBackend();
    // this.endpoint.close();
    // setInterval(
    //   () => this.loginWithBackend.call(this),
    //   5000,
    // );
  }

  private connected(ev: Event) {
    if (!this.endpoint) return;
    if (this.endpoint.readyState === this.endpoint.OPEN) {
      const response: IMessageWithoutID = {
        type: 'login',
        data: {
          user: this.user,
          password: this.password,
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
