import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);

const rooms = new Map();

function randomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function randomId(prefix = 'p') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createSeed() {
  return (Math.random() * 0x7fffffff) ^ Date.now();
}

function send(socket, payload) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function roomView(room) {
  return {
    roomCode: room.code,
    hostId: room.hostId,
    seed: room.seed,
    selectedGameId: room.selectedGameId,
    gameOptions: room.gameOptions || {},
    roomConfig: room.roomConfig || null,
    started: room.started,
    startedAt: room.startedAt,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      connected: p.connected
    }))
  };
}

function broadcastRoom(room) {
  const payload = { type: 'room_state', room: roomView(room) };
  for (const player of room.players) {
    if (player.socket) send(player.socket, payload);
  }
}

function canStart(room) {
  const connected = room.players.filter((p) => p.connected);
  return connected.length >= 2 && connected.every((p) => p.ready);
}

function handleCreate(socket, displayName) {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();

  const playerId = randomId('host');
  const token = randomId('tok');

  const room = {
    code,
    hostId: playerId,
    seed: createSeed(),
    selectedGameId: 'pixelpuck',
    gameOptions: {},
    roomConfig: {
      name: 'Open Bar',
      privacy: 'private',
      theme: 'classic-green-felt',
      houseRules: 'Best of 3. No rage quits.',
      playlist: ['pixelpuck'],
      bettingPool: 0,
      voiceEnabled: false
    },
    started: false,
    startedAt: null,
    players: [
      {
        id: playerId,
        token,
        name: String(displayName || 'Host'),
        ready: false,
        connected: true,
        socket
      }
    ]
  };

  rooms.set(code, room);
  socket.roomCode = code;
  socket.playerId = playerId;

  send(socket, {
    type: 'room_joined',
    roomCode: code,
    playerId,
    hostId: playerId,
    role: 'host',
    token,
    seed: room.seed
  });
  broadcastRoom(room);
}

function handleJoin(socket, roomCode, displayName) {
  const room = rooms.get(String(roomCode || '').toUpperCase());
  if (!room) {
    send(socket, { type: 'error', message: 'Room not found' });
    return;
  }

  const playerId = randomId('p');
  const token = randomId('tok');

  room.players.push({
    id: playerId,
    token,
    name: String(displayName || 'Player'),
    ready: false,
    connected: true,
    socket
  });

  socket.roomCode = room.code;
  socket.playerId = playerId;

  send(socket, {
    type: 'room_joined',
    roomCode: room.code,
    playerId,
    hostId: room.hostId,
    role: 'client',
    token,
    seed: room.seed
  });

  const host = room.players.find((p) => p.id === room.hostId);
  if (host?.socket) {
    send(host.socket, { type: 'peer_joined', peerId: playerId });
  }

  broadcastRoom(room);
}

function handleResume(socket, roomCode, playerId, token) {
  const room = rooms.get(String(roomCode || '').toUpperCase());
  if (!room) {
    send(socket, { type: 'error', message: 'Room not found for resume' });
    return;
  }

  const player = room.players.find((entry) => entry.id === playerId && entry.token === token);
  if (!player) {
    send(socket, { type: 'error', message: 'Resume denied' });
    return;
  }

  player.connected = true;
  player.socket = socket;
  socket.roomCode = room.code;
  socket.playerId = player.id;

  send(socket, {
    type: 'room_joined',
    roomCode: room.code,
    playerId: player.id,
    hostId: room.hostId,
    role: player.id === room.hostId ? 'host' : 'client',
    token: player.token,
    seed: room.seed
  });

  if (player.id !== room.hostId) {
    const host = room.players.find((entry) => entry.id === room.hostId);
    if (host?.socket) {
      send(host.socket, { type: 'peer_joined', peerId: player.id });
    }
  }

  broadcastRoom(room);
}

function handleSignal(socket, to, data) {
  const room = rooms.get(socket.roomCode);
  if (!room) return;
  const target = room.players.find((player) => player.id === to);
  if (!target?.socket) return;
  send(target.socket, {
    type: 'signal',
    from: socket.playerId,
    data
  });
}

function handleDisconnect(socket) {
  const room = rooms.get(socket.roomCode);
  if (!room) return;

  const player = room.players.find((entry) => entry.id === socket.playerId);
  if (player) {
    player.connected = false;
    player.ready = false;
    player.socket = null;
  }

  broadcastRoom(room);
}

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.roomCode = '';
  socket.playerId = '';

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      send(socket, { type: 'error', message: 'Invalid message json' });
      return;
    }

    if (message.type === 'create_room') {
      handleCreate(socket, message.displayName);
      return;
    }

    if (message.type === 'join_room') {
      handleJoin(socket, message.roomCode, message.displayName);
      return;
    }

    if (message.type === 'resume_room') {
      handleResume(socket, message.roomCode, message.playerId, message.token);
      return;
    }

    const room = rooms.get(socket.roomCode);
    if (!room) {
      send(socket, { type: 'error', message: 'Join a room first' });
      return;
    }

    if (message.type === 'set_ready') {
      const player = room.players.find((entry) => entry.id === socket.playerId);
      if (!player) return;
      player.ready = Boolean(message.ready);
      broadcastRoom(room);
      return;
    }

    if (message.type === 'select_game') {
      if (socket.playerId !== room.hostId) {
        send(socket, { type: 'error', message: 'Only host can select game' });
        return;
      }
      room.selectedGameId = String(message.gameId || 'pixelpuck');
      room.gameOptions = {};
      broadcastRoom(room);
      return;
    }

    if (message.type === 'set_game_options') {
      if (socket.playerId !== room.hostId) {
        send(socket, { type: 'error', message: 'Only host can set game options' });
        return;
      }
      const options = message.gameOptions && typeof message.gameOptions === 'object' ? message.gameOptions : {};
      room.gameOptions = { ...room.gameOptions, ...options };
      broadcastRoom(room);
      return;
    }

    if (message.type === 'set_room_config') {
      if (socket.playerId !== room.hostId) {
        send(socket, { type: 'error', message: 'Only host can edit room config' });
        return;
      }
      const config = message.roomConfig && typeof message.roomConfig === 'object' ? message.roomConfig : {};
      room.roomConfig = { ...room.roomConfig, ...config };
      broadcastRoom(room);
      return;
    }

    if (message.type === 'start_game') {
      if (socket.playerId !== room.hostId) {
        send(socket, { type: 'error', message: 'Only host can start game' });
        return;
      }
      if (!canStart(room)) {
        send(socket, { type: 'error', message: 'Need 2+ connected ready players' });
        return;
      }
      room.started = true;
      room.startedAt = Date.now();
      room.seed = createSeed();
      const payload = {
        type: 'game_started',
        gameId: room.selectedGameId,
        seed: room.seed,
        startedAt: room.startedAt,
        gameOptions: room.gameOptions || {}
      };
      for (const player of room.players) {
        if (player.socket) send(player.socket, payload);
      }
      broadcastRoom(room);
      return;
    }

    if (message.type === 'return_lobby') {
      if (socket.playerId !== room.hostId) {
        send(socket, { type: 'error', message: 'Only host can reset lobby' });
        return;
      }
      room.started = false;
      room.startedAt = null;
      room.seed = createSeed();
      for (const player of room.players) player.ready = false;
      broadcastRoom(room);
      return;
    }

    if (message.type === 'signal') {
      handleSignal(socket, message.to, message.data);
      return;
    }

    if (message.type === 'ping') {
      send(socket, { type: 'pong', echo: String(message.echo || '') });
    }
  });

  socket.on('close', () => {
    handleDisconnect(socket);
  });
});

server.listen(PORT, () => {
  console.log(`GameGrid signaling server running on ws://localhost:${PORT}`);
});
