/* eslint-disable no-underscore-dangle */
import Character from './Character';

class User {
  private _id: string;

  private _name: string;

  private _Character: Character;

  constructor(id: string, name: string, character: Character) {
    this._id = id;
    this._name = name;
    this._Character = character;
  }

  public getPed() {
    return this._Character.ped.scene;
  }

  public get Character() {
    return this._Character;
  }

  public set Character(character: Character) {
    this._Character = character;
  }

  public get id() {
    return this._id;
  }

  public set id(id: string) {
    this._id = id;
  }

  public get name() {
    return this._name;
  }

  public set name(name: string) {
    this._name = name;
  }
}

export default User;
