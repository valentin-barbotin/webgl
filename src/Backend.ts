/* eslint-disable no-underscore-dangle */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
import Game from './Game';
import { Message } from './interfaces/Message';
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
      id: username,
      name: username,
    };

    // this.roomID = window.prompt('Enter choose a room');
  }

  private loginWithBackend() {
    if (this.endpoint?.readyState === this.endpoint?.OPEN) return;
    this.endpoint = new WebSocket(`ws://${gameConfig.hostname}:${gameConfig.port}`);
    this.endpoint.onclose = this.onDisconnect;
    this.endpoint.onopen = this.connected;
    this.endpoint.onmessage = (m) => this.game.processMessage.call(this.game.processMessage, m);
  }

  private onDisconnect() {
    if (!this.endpoint) return;
    console.log('Disconnected');
    this.endpoint.close();
    setInterval(
      () => this.loginWithBackend.call(this),
      5000,
    );
  }

  private connected() {
    if (!this.endpoint) return;
    if (this.endpoint.readyState === this.endpoint.OPEN) {
      const response: Message = {
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

  public sendMessage(message: Message) {
    if (!this.endpoint) return;
    if (this.endpoint.readyState !== this.endpoint.OPEN) {
      throw new Error("Can't send message, endpoint is not open");
    }
    const payload = objectToBuffer(message);
    this.endpoint.send(payload);
  }
}

export default Backend;
