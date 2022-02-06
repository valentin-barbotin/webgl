/* eslint-disable no-underscore-dangle */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
import Game from './Game';
import { IMessage } from './interfaces/Message';
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
    this.password = 'password'; // to edit

    this.user = {
      _id: '',
      _name: username,
      getPed: () => this.user.character?.ped.scene,
    };
  }

  /**
   * Triggered when the connection is closed
   * @return {void}
   */
  private loginWithBackend(): void {
    this.endpoint = new WebSocket(`ws://${gameConfig.hostname}:${gameConfig.port}`);
    this.endpoint.onclose = (ev) => this.onDisconnect.call(this, ev);
    this.endpoint.onopen = (ev) => this.connected.call(this, ev);
    this.endpoint.onmessage = (m) => this.game.processMessage.call(this.game, m);
  }

  /**
   * Triggered when the connection is closed
   * @param {Event} ev
   * @return {void}
   */
  private onDisconnect(ev: Event): void {
    if (!this.endpoint) return;
    console.log('Disconnected');
    console.log('Trying to reconnect to backend');
  }

  /**
   * Triggered when the connection is opened
   * We send a login message containing the username and password
   * This is the first message we send to the backend
   * The backend will forward this message to all clients
   * @param {Event} ev
   * @return {void}
   */
  private connected(ev: Event): void {
    if (!this.endpoint) return;
    if (this.endpoint.readyState === this.endpoint.OPEN) {
      const _user = {
        name: this.user._name,
      };
      const response: IMessage = {
        type: 'login',
        data: {
          user: _user,
          password: this.password,
        },
      };
      const payload = objectToBuffer(response);
      this.endpoint.send(payload);
    }
  }

  /**
  * Send a message to the backend
  * @param {IMessage} message
  * @return {void}
  */
  public sendMessage(message: IMessage): void {
    if (!this.endpoint) return;
    if (this.endpoint.readyState !== this.endpoint.OPEN) {
      throw new Error("Can't send message, endpoint is not open");
    }
    const payload = objectToBuffer(message);
    this.endpoint.send(payload);
  }
}

export default Backend;
