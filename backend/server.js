/**
 * Otokojuku Duel - Backend API
 * Matchmaking queue, friends, user presence, spectator rooms
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const app = express();
app.use(cors({ origin: allowedOrigins.includes('*') ? '*' : allowedOrigins }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: allowedOrigins.includes('*') ? '*' : allowedOrigins, methods: ['GET', 'POST'] }
});

// --- In-memory stores (swap for Redis/DB in production) ---
const users = new Map();           // socketId -> { id, name, hero, status, friendIds }
const usersByName = new Map();     // lowercase name -> socketId
const friendships = new Map();     // userId -> Set<friendUserId>
const matchQueue = [];             // { socketId, userId, name, hero, rating, joinedAt }
const activeMatches = new Map();   // matchId -> { hostId, clientId, hostSocket, clientSocket, spectators: Set, status }
const socketToUser = new Map();

function getUser(socketId) {
    return users.get(socketId);
}

function broadcastOnlineFriends(userId) {
    const friends = friendships.get(userId) || new Set();
    friends.forEach(fid => {
        const friendSocket = [...users.entries()].find(([, u]) => u.id === fid)?.[0];
        if (friendSocket) {
            io.to(friendSocket).emit('friends:update', buildFriendsList(friendSocket));
        }
    });
}

function buildFriendsList(socketId) {
    const user = getUser(socketId);
    if (!user) return [];
    const friendIds = friendships.get(user.id) || new Set();
    return [...friendIds].map(fid => {
        const entry = [...users.entries()].find(([, u]) => u.id === fid);
        if (!entry) return { id: fid, name: 'Offline', online: false, status: 'offline', hero: null };
        const [, u] = entry;
        return {
            id: u.id,
            name: u.name,
            online: u.status !== 'offline',
            status: u.status,
            hero: u.hero
        };
    });
}

function removeFromQueue(socketId) {
    const idx = matchQueue.findIndex(q => q.socketId === socketId);
    if (idx >= 0) matchQueue.splice(idx, 1);
}

function tryMatchmake() {
    while (matchQueue.length >= 2) {
        const p1 = matchQueue.shift();
        const p2 = matchQueue.shift();
        const matchId = uuidv4().slice(0, 8);
        const match = {
            id: matchId,
            hostId: p1.userId,
            clientId: p2.userId,
            hostSocket: p1.socketId,
            clientSocket: p2.socketId,
            hostName: p1.name,
            clientName: p2.name,
            hostHero: p1.hero,
            clientHero: p2.hero,
            spectators: new Set(),
            status: 'lobby',
            isPrivate: false
        };
        activeMatches.set(matchId, match);

        [p1.socketId, p2.socketId].forEach(sid => {
            const u = getUser(sid);
            if (u) u.status = 'in_match';
        });

        io.to(p1.socketId).emit('matchmaking:found', matchState(match, 'host'));
        io.to(p2.socketId).emit('matchmaking:found', matchState(match, 'client'));

        broadcastQueueStatus();
        broadcastOnlineFriends(p1.userId);
        broadcastOnlineFriends(p2.userId);
    }
}

function broadcastQueueStatus() {
    io.emit('matchmaking:queue', { count: matchQueue.length });
}

function matchState(match, role) {
    return {
        matchId: match.id,
        role,
        status: match.status,
        isPrivate: !!match.isPrivate,
        host: { name: match.hostName, hero: match.hostHero },
        client: match.clientSocket ? { name: match.clientName, hero: match.clientHero } : null
    };
}

function emitMatchState(match) {
    if (match.hostSocket) io.to(match.hostSocket).emit('room:state', matchState(match, 'host'));
    if (match.clientSocket) io.to(match.clientSocket).emit('room:state', matchState(match, 'client'));
}

function makeRoomCode() {
    let code;
    do code = Math.random().toString(36).slice(2, 6).toUpperCase();
    while (activeMatches.has(code));
    return code;
}

// --- REST endpoints ---
app.get('/api/health', (_, res) => {
    res.json({
        ok: true,
        online: users.size,
        queue: matchQueue.length,
        matches: activeMatches.size
    });
});

app.get('/api/matches', (_, res) => {
    const list = [...activeMatches.values()]
        .filter(m => m.status === 'playing' || m.status === 'lobby')
        .map(m => ({
            id: m.id,
            hostName: m.hostName,
            clientName: m.clientName,
            hostHero: m.hostHero,
            clientHero: m.clientHero,
            status: m.status,
            spectatorCount: m.spectators.size
        }));
    res.json(list);
});

// --- Socket.io ---
io.on('connection', (socket) => {
    socket.on('user:register', ({ name, hero }) => {
        const trimmed = (name || 'Fighter').trim().slice(0, 12);
        const key = trimmed.toLowerCase();

        if (usersByName.has(key) && usersByName.get(key) !== socket.id) {
            socket.emit('user:error', { message: 'Nickname already in use' });
            return;
        }

        const existing = users.get(socket.id);
        const userId = existing?.id || uuidv4();
        const user = {
            id: userId,
            name: trimmed,
            hero: hero || 'Noae',
            status: existing?.status || 'online',
            rating: existing?.rating || 1000
        };

        if (existing && existing.name.toLowerCase() !== key) usersByName.delete(existing.name.toLowerCase());
        users.set(socket.id, user);
        usersByName.set(key, socket.id);
        socketToUser.set(socket.id, userId);
        if (!friendships.has(userId)) friendships.set(userId, new Set());

        socket.emit('user:registered', { userId, name: trimmed });
        socket.emit('friends:list', buildFriendsList(socket.id));
        broadcastQueueStatus();
    });

    socket.on('user:update', ({ hero, status }) => {
        const user = getUser(socket.id);
        if (!user) return;
        if (hero) user.hero = hero;
        if (status) user.status = status;
        broadcastOnlineFriends(user.id);
    });

    // Friends
    socket.on('friends:add', ({ friendName }) => {
        const user = getUser(socket.id);
        if (!user) return;
        const targetSocket = usersByName.get((friendName || '').trim().toLowerCase());
        if (!targetSocket) {
            socket.emit('friends:error', { message: 'Player not found or offline' });
            return;
        }
        const friend = getUser(targetSocket);
        if (!friend || friend.id === user.id) {
            socket.emit('friends:error', { message: 'Cannot add yourself' });
            return;
        }
        friendships.get(user.id).add(friend.id);
        friendships.get(friend.id).add(user.id);
        socket.emit('friends:list', buildFriendsList(socket.id));
        io.to(targetSocket).emit('friends:list', buildFriendsList(targetSocket));
        socket.emit('friends:added', { name: friend.name });
    });

    socket.on('friends:remove', ({ friendId }) => {
        const user = getUser(socket.id);
        if (!user) return;
        friendships.get(user.id)?.delete(friendId);
        friendships.get(friendId)?.delete(user.id);
        socket.emit('friends:list', buildFriendsList(socket.id));
        broadcastOnlineFriends(friendId);
    });

    socket.on('friends:invite', ({ friendId, matchId }) => {
        const user = getUser(socket.id);
        const targetSocket = [...users.entries()].find(([, u]) => u.id === friendId)?.[0];
        if (targetSocket) {
            io.to(targetSocket).emit('friends:invite', {
                from: user?.name,
                matchId
            });
        }
    });

    // Private rooms
    socket.on('room:create', ({ hero }) => {
        const user = getUser(socket.id);
        if (!user) return;
        const matchId = makeRoomCode();
        const match = {
            id: matchId,
            hostId: user.id,
            clientId: null,
            hostSocket: socket.id,
            clientSocket: null,
            hostName: user.name,
            clientName: null,
            hostHero: hero || user.hero,
            clientHero: null,
            spectators: new Set(),
            status: 'lobby',
            isPrivate: true
        };
        activeMatches.set(matchId, match);
        user.hero = match.hostHero;
        user.status = 'in_lobby';
        emitMatchState(match);
        io.emit('matches:update');
    });

    socket.on('room:join', ({ matchId, hero }) => {
        const user = getUser(socket.id);
        const code = String(matchId || '').trim().toUpperCase();
        const match = activeMatches.get(code);
        if (!user || !match || !match.isPrivate) {
            socket.emit('room:error', { message: 'Room not found' });
            return;
        }
        if (match.clientSocket && match.clientSocket !== socket.id) {
            socket.emit('room:error', { message: 'Room is full' });
            return;
        }
        if (match.hostSocket === socket.id) return;
        match.clientId = user.id;
        match.clientSocket = socket.id;
        match.clientName = user.name;
        match.clientHero = hero || user.hero;
        user.hero = match.clientHero;
        user.status = 'in_lobby';
        emitMatchState(match);
        io.emit('matches:update');
    });

    socket.on('room:hero', ({ matchId, hero }) => {
        const match = activeMatches.get(matchId);
        const user = getUser(socket.id);
        if (!match || !user || !hero) return;
        if (match.hostSocket === socket.id) match.hostHero = hero;
        else if (match.clientSocket === socket.id) match.clientHero = hero;
        else return;
        user.hero = hero;
        emitMatchState(match);
    });

    socket.on('room:chat', ({ matchId, text }) => {
        const match = activeMatches.get(matchId);
        const user = getUser(socket.id);
        if (!match || !user || (match.hostSocket !== socket.id && match.clientSocket !== socket.id)) return;
        const message = String(text || '').trim().slice(0, 80);
        if (!message) return;
        [match.hostSocket, match.clientSocket].filter(Boolean).forEach(socketId => {
            io.to(socketId).emit('room:chat', { sender: user.name, text: message });
        });
    });

    socket.on('room:leave', ({ matchId }) => {
        const match = activeMatches.get(matchId);
        const user = getUser(socket.id);
        if (!match) return;
        if (match.hostSocket === socket.id) {
            if (match.clientSocket) io.to(match.clientSocket).emit('match:opponent_left');
            activeMatches.delete(matchId);
        } else if (match.clientSocket === socket.id) {
            match.clientId = null;
            match.clientSocket = null;
            match.clientName = null;
            match.clientHero = null;
            match.status = 'lobby';
            emitMatchState(match);
        }
        if (user) user.status = 'online';
        io.emit('matches:update');
    });

    // Matchmaking queue
    socket.on('matchmaking:join', ({ hero }) => {
        const user = getUser(socket.id);
        if (!user) return;
        removeFromQueue(socket.id);
        if (hero) user.hero = hero;
        user.status = 'queued';
        matchQueue.push({
            socketId: socket.id,
            userId: user.id,
            name: user.name,
            hero: user.hero,
            rating: user.rating,
            joinedAt: Date.now()
        });
        socket.emit('matchmaking:queued', { position: matchQueue.length });
        broadcastQueueStatus();
        tryMatchmake();
    });

    socket.on('matchmaking:leave', () => {
        removeFromQueue(socket.id);
        const user = getUser(socket.id);
        if (user) user.status = 'online';
        socket.emit('matchmaking:left');
        broadcastQueueStatus();
    });

    socket.on('match:ready', ({ matchId }) => {
        const match = activeMatches.get(matchId);
        if (!match || match.hostSocket !== socket.id || !match.clientSocket) return;
        match.status = 'playing';
        io.to(match.hostSocket).emit('match:start', matchState(match, 'host'));
        io.to(match.clientSocket).emit('match:start', matchState(match, 'client'));
        io.emit('matches:update');
    });

    socket.on('match:input', ({ matchId, inputs }) => {
        const match = activeMatches.get(matchId);
        if (!match || match.status !== 'playing' || match.clientSocket !== socket.id) return;
        io.to(match.hostSocket).emit('match:input', { inputs });
    });

    socket.on('match:state', ({ matchId, state }) => {
        const match = activeMatches.get(matchId);
        if (!match || match.status !== 'playing' || match.hostSocket !== socket.id || !state) return;
        io.to(match.clientSocket).emit('match:state', { state });
        io.to(`spectate:${matchId}`).emit('spectate:state', { state });
    });

    socket.on('match:end', ({ matchId, winnerText }) => {
        const match = activeMatches.get(matchId);
        if (!match || match.hostSocket !== socket.id) return;
        if (match.clientSocket) io.to(match.clientSocket).emit('match:finished', { winnerText });
        match.spectators.forEach(sid => io.to(sid).emit('spectate:ended', { matchId }));
        [match.hostSocket, match.clientSocket].filter(Boolean).forEach(socketId => {
            const participant = getUser(socketId);
            if (participant) participant.status = 'online';
        });
        activeMatches.delete(matchId);
        io.emit('matches:update');
    });

    // Spectator
    socket.on('spectate:join', ({ matchId }) => {
        const match = activeMatches.get(matchId);
        if (!match) {
            socket.emit('spectate:error', { message: 'Match not found' });
            return;
        }
        match.spectators.add(socket.id);
        const user = getUser(socket.id);
        if (user) user.status = 'spectating';
        socket.join(`spectate:${matchId}`);
        socket.emit('spectate:joined', {
            matchId,
            hostName: match.hostName,
            clientName: match.clientName,
            hostHero: match.hostHero,
            clientHero: match.clientHero
        });
        io.emit('matches:update');
    });

    socket.on('spectate:leave', ({ matchId }) => {
        const match = activeMatches.get(matchId);
        if (match) match.spectators.delete(socket.id);
        socket.leave(`spectate:${matchId}`);
        const user = getUser(socket.id);
        if (user) user.status = 'online';
    });

    socket.on('spectate:state', ({ matchId, state }) => {
        socket.to(`spectate:${matchId}`).emit('spectate:state', { state });
    });

    socket.on('disconnect', () => {
        removeFromQueue(socket.id);
        const user = getUser(socket.id);
        if (user) {
            usersByName.delete(user.name.toLowerCase());
            broadcastOnlineFriends(user.id);
            [...activeMatches.entries()].forEach(([mid, m]) => {
                if (m.hostSocket === socket.id || m.clientSocket === socket.id) {
                    const other = m.hostSocket === socket.id ? m.clientSocket : m.hostSocket;
                    if (other) io.to(other).emit('match:opponent_left');
                    m.spectators.forEach(sid => io.to(sid).emit('spectate:ended', { matchId: mid }));
                    activeMatches.delete(mid);
                }
            });
        }
        users.delete(socket.id);
        socketToUser.delete(socket.id);
        broadcastQueueStatus();
        io.emit('matches:update');
    });
});

server.listen(PORT, () => {
    console.log(`Duel backend running on http://localhost:${PORT}`);
});
