/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Group } from 'three';
import Character from '../Character';

interface IUser {
    _id?: string;
    _name?: string;
    character?: Character;
    getPed(): Group | undefined;
}

export default IUser;
