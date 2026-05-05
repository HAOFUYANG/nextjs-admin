import { io } from 'socket.io-client';

const endpoint = process.env.WS_ENDPOINT || 'http://localhost:3030/realtime';
const room = process.env.WS_ROOM || 'demo-room';

const clientA = io(endpoint, { transports: ['websocket'] });
const clientB = io(endpoint, { transports: ['websocket'] });

const attachListeners = (name, socket) => {
  socket.on('connect', () => {
    console.log(`[${name}] connected`, socket.id);
    socket.emit('client:join', { room });
    socket.emit('client:ping', { from: name, message: 'hello server' });
  });

  socket.on('server:welcome', (payload) => {
    console.log(`[${name}] welcome`, payload);
  });

  socket.on('server:pong', (payload) => {
    console.log(`[${name}] pong`, payload);
  });

  socket.on('server:joined', (payload) => {
    console.log(`[${name}] joined`, payload);
  });

  socket.on('server:message', (payload) => {
    console.log(`[${name}] message`, payload);
  });

  socket.on('server:tick', (payload) => {
    console.log(`[${name}] tick`, payload.sequence);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[${name}] disconnected`, reason);
  });
};

attachListeners('clientA', clientA);
attachListeners('clientB', clientB);

setTimeout(() => {
  clientA.emit('client:broadcast', {
    room,
    message: 'hello from clientA',
  });
}, 1500);

setTimeout(() => {
  clientA.close();
  clientB.close();
  process.exit(0);
}, 12000);
