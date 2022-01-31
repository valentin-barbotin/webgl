import { Vector3 } from 'three';

/* eslint-disable no-console */
console.log('Connecting to server ...');

interface Message {
    type: string;
    data: string;
}

const objectToBuffer = (obj: Message): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(obj)).buffer;
};

const BufferToObject = (obj: ArrayBuffer) => {
  const encoder = new TextDecoder();
  const payload = encoder.decode(obj);
  const message: Message = JSON.parse(payload);
  return message;
};

function disconnected() {
  console.log('Disconnected from server ...');
}

let lastVecFromSRV = new Vector3();
let lastVecFromSRVCLient2 = new Vector3();
async function processMessage(socket: WebSocket, m:MessageEvent) {
  const message: Blob = m.data;
  const data = await message.arrayBuffer();
  // eslint-disable-next-line no-underscore-dangle
  const _message: Message = BufferToObject(data);
  console.log(_message.data);

  if (_message.type === 'res_syncPosition') {
    console.log('Received sync position from server');
    const position = _message.data.split(',').map((v) => parseFloat(v));
    lastVecFromSRV = new Vector3(position[0], position[1], position[2]);
  }

  if (_message.type === 'receivePosition') {
    console.log('Received player\'s position from server');
    console.log(_message.data);

    interface Player {
      player: string;
      position: string;
    }

    const player: Player = JSON.parse(_message.data);
    const position = player.position.split(',').map((v) => parseFloat(v));
    lastVecFromSRVCLient2 = new Vector3(position[0], position[1], position[2]);
  }

//   const response: Message = {
//     type: 'getAll',
//     data: 'welcome ok',
//   };
//   const payload = objectToBuffer(response);
//   socket.send(payload);
}

function getPos() {
  return lastVecFromSRV;
}

function getClient2Pos() {
  return lastVecFromSRVCLient2;
}

const ws = new WebSocket('ws://192.168.1.162:5000');
ws.onmessage = (m) => processMessage(ws, m);
ws.onclose = disconnected;

async function sendMessageToWS(message: Message) {
  console.log(ws.OPEN);
  if (ws.readyState === ws.OPEN) {
    const payload = objectToBuffer(message);
    ws.send(payload);
  }
}

export type { Message };
export {
  objectToBuffer, BufferToObject, ws, sendMessageToWS, getPos, getClient2Pos,
};
