/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import { Vector3Tuple } from 'three';
import IUser from './User';

interface MessageData {
    [k: string]: any,
}

interface IMessageSync {
    position: Vector3Tuple,
    rotation: number[],
}

interface IMessageNewUserJoined extends IUser {}

interface IMessageWithoutID {
    type: string;
    data: IMessageNewUserJoined | {[k: string]: any};
}

interface Message extends IMessageWithoutID {
    id: string,
}

export {
  Message, MessageData, IMessageNewUserJoined, IMessageSync, IMessageWithoutID,
};
