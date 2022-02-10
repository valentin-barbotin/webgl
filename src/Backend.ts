/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
import * as THREE from 'three';
import Game from './Game';
import { IMessage, IMessageSync, MessageData } from './interfaces/Message';
import IUser from './interfaces/User';
import { BufferToObject, objectToBuffer } from './utils';
import gameConfig from './config/config';
import Character from './Character';
import User from './User';
import IBullet from './interfaces/Bullet';

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

    const model = this.game.assets.modelList.meuf;

    if (username.length === 0 || password.length === 0) return;

    this.user = {
      _id: '',
      _name: username,
      _model: model,
      getPed: () => this.user.character?.ped.scene,
    };
    this.loginWithBackend(password);
    // this.roomID = window.prompt('Enter choose a room');
  }

  /**
   * Login with the backend
   * @return {void}
   */
  private loginWithBackend(password: string): void {
    this.endpoint = new WebSocket(`ws://${gameConfig.hostname}:${gameConfig.port}`);
    this.endpoint.onclose = (ev) => this.onDisconnect.call(this, ev);
    this.endpoint.onopen = (ev) => this.connected.call(this, ev, password);
    this.endpoint.onmessage = (m) => this.processMessage.call(this, m);
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
  private connected(ev: Event, password: string): void {
    if (!this.endpoint) return;
    if (this.endpoint.readyState === this.endpoint.OPEN) {
      const user = {
        ...this.user,
      };

      delete user.getPed;
      delete user.character;

      const response: IMessage = {
        type: 'login',
        data: {
          user,
          password,
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

  public async processMessage(m: MessageEvent) {
    const message: Blob = m.data;
    const data = await message.arrayBuffer();
    // eslint-disable-next-line no-underscore-dangle
    const _message = BufferToObject(data);

    switch (_message.type) {
      case 'userQuit': {
        this.userQuit(_message.data as IUser);
        break;
      }
      case 'userJoined': {
        this.userJoined(_message.data as IUser[]);
        break;
      }
      case 'userSyncPos': {
        this.userSyncPos(_message.data as IMessageSync);
        break;
      }

      case 'bullet': {
        const bullet = _message.data as MessageData;
        console.log(bullet);
        if (!bullet.mass || !bullet.radius || !bullet.speed || !bullet.pos || !bullet.direction) return;
        console.log(bullet.pos);
        console.log(bullet.direction);
        this.game.physics.shootBullet(bullet as IBullet);
        break;
      }

      default:
        break;
    }
  }

  /**
   * Called when a player quit
   * Retrieve the player from the list of players and remove him from the scene
   * @param {IUser} message
   * @return {void}
   */
  private userQuit(message: IUser): void {
    if (!message._name || !message._id) {
      throw new Error('Invalid payload');
    }

    const user = this.game.players.get(message._id);

    if (!user) throw new Error('User doesn\'t exists'); // wtf
    const ped = user.getPed();
    if (!ped) throw new Error('Ped not found');
    ped.clear();
    ped.remove();
    ped.visible = false;

    if (!this.game.players.delete(message._id)) {
      throw new Error('User not found');
    }
    console.log(`${message._name} quited`);
  }

  /**
   * Called when a player moves
   * Get the rotation and position, and apply them to the concerned player
   * @param {IMessageSync} message
   * @return {void}
   */
  private userSyncPos(message: IMessageSync): void {
    const user = this.game.players.get(message.id);

    if (!user) throw new Error('User not found');

    const ped = user.getPed();
    if (!ped) throw new Error('Ped not found');
    ped.position.fromArray(message.position);
    ped.rotation.fromArray(message.rotation);
  }

  /**
   * Called when a user join the game
   * Also called when we join the game, to receive the list of users
   * Create new player(s) and add it/them to the scene
   * @param {IUser[]} message
   * @return {void}
   */
  private userJoined(message: IUser[]): void {
    // loop over the users
    message.forEach((user) => {
      if (!user._name || !user._id || !user._model) {
        throw new Error('Invalid payload');
      }

      // if the user is already in the scene, Error
      const exists = this.game.players.get(user._id);
      if (exists) throw new Error('User already exists');

      this.game.assets?.getModel(user._model ?? 'default').then((model) => {
        if (!model) throw new Error('No model');
        const character = new Character(model);
        const _user = new User(user._id!, user._name!, character);
        const ped = _user.getPed();
        if (!ped) {
          console.warn('User has no ped');
          return;
        }
        this.game.scene.add(ped);
        console.warn('User added', _user.id);
        this.game.players.set(_user.id, _user);
        console.log(`${user._name} joined the game`);
      });
    });
  }
}

export default Backend;
