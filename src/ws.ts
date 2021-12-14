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
async function processMessage(socket: WebSocket, m:MessageEvent) {
  const message: Blob = m.data;
  const data = await message.arrayBuffer();
  // eslint-disable-next-line no-underscore-dangle
  const _message: Message = BufferToObject(data);
  console.log(_message.data);

//   const response: Message = {
//     type: 'getAll',
//     data: 'welcome ok',
//   };
//   const payload = objectToBuffer(response);
//   socket.send(payload);
}

const ws = new WebSocket('ws://localhost:5000');
ws.onmessage = (m) => processMessage(ws, m);
ws.onclose = disconnected;

export type { Message };
export { objectToBuffer, BufferToObject, ws };
