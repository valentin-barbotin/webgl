/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import Character from '../Character';

interface IUser {
    id: string;
    name: string;
    character?: Character;
}

export default IUser;
