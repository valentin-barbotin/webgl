/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Vector3Tuple } from 'three';
import IUser from './User';

interface MessageData {
    [k: string]: any,
}

interface IMessageSync {
    id: string,
    position: Vector3Tuple,
    rotation: number[],
}

interface IMessageNewUserJoined extends IUser {}

interface IMessage {
    type: string;
    data: IMessageNewUserJoined | {[k: string]: any};
}

export {
  IMessage, MessageData, IMessageNewUserJoined, IMessageSync,
};
