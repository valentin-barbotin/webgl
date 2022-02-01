import { Vector3Tuple } from 'three';

interface MessageData {
    [k: string]: any,
    type: string,
    position: Vector3Tuple,
    rotation: number[],
}

interface Message {
    type: string;
    data: {[k: string]: any};
}

export { Message, MessageData };
