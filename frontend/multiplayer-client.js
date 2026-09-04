/**
 * Socket.io online client: private rooms, quick match, friends, spectators,
 * remote inputs, and host-authoritative state snapshots.
 */

const backendProtocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const backendHost = window.location.hostname || 'localhost';
const isLocalBackendHost = ['localhost', '127.0.0.1', ''].includes(backendHost);
const BACKEND_URL = window.DUEL_BACKEND_URL || (
    isLocalBackendHost ? `${backendProtocol}//${backendHost || 'localhost'}:3001` : window.location.origin
);

let mpSocket = null;
let mpConnected = false;
let pendingRegistration = false;
let latencyTimer = null;

function initMultiplayerClient() {
    if (mpSocket) return mpSocket;
    if (typeof io === 'undefined') {
        updateMpStatus('Socket.io client unavailable', true);
        window.updateLoginStatus?.('Online client failed to load.', true);
        return null;
    }

    mpSocket = io(BACKEND_URL, { transports: ['websocket'], upgrade: false });

    mpSocket.on('connect', () => {
        mpConnected = true;
        updateMpStatus('Duel server connected');
        window.updateLoginStatus?.('Server connected. Enter a nickname.');
        startLatencyMonitor();
        if (window.myUserName || pendingRegistration) registerBackendUser(window.myUserName);
    });

    mpSocket.on('disconnect', () => {
        mpConnected = false;
        window.clearOnlineRemoteInputs?.();
        stopLatencyMonitor();
        updateMpStatus('Duel server offline', true);
        window.updateLoginStatus?.('Connection lost. Reconnecting...', true);
    });

    mpSocket.on('connect_error', () => {
        updateMpStatus('Start the server with: npm run server', true);
        window.updateLoginStatus?.('Duel server is not running.', true);
    });

    mpSocket.on('user:registered', data => {
        pendingRegistration = false;
        window.backendUserId = data.userId;
        document.getElementById('room-match-ui')?.classList.remove('hidden');
        document.getElementById('login-title').innerText = `ONLINE: ${data.name}`;
        updateMpStatus(`Ready as ${data.name}`);
        window.updateLoginStatus?.('Choose a room or quick match.');
    });

    mpSocket.on('user:error', data => window.updateLoginStatus?.(data.message, true));
    mpSocket.on('friends:list', renderFriendsList);
    mpSocket.on('friends:update', renderFriendsList);
    mpSocket.on('friends:error', data => window.appendChat?.('System', data.message, true));
    mpSocket.on('friends:added', data => window.appendChat?.('System', `Added friend: ${data.name}`, true));
    mpSocket.on('friends:invite', data => window.appendChat?.('System', `${data.from} invited you to a match.`, true));

    mpSocket.on('matchmaking:queued', data => {
        const status = document.getElementById('queue-status');
        if (status) status.innerText = `Searching... position ${data.position}`;
    });
    mpSocket.on('matchmaking:left', () => {
        const status = document.getElementById('queue-status');
        if (status) status.innerText = 'Queue left';
    });
    mpSocket.on('matchmaking:queue', data => {
        const count = document.getElementById('global-queue-count');
        if (count) count.innerText = `${data.count} in queue`;
    });
    mpSocket.on('matchmaking:found', state => {
        window.appendChat?.('System', 'Opponent found.', true);
        showMatchLobby(state);
    });

    mpSocket.on('room:state', showMatchLobby);
    mpSocket.on('room:error', data => window.updateLoginStatus?.(data.message, true));
    mpSocket.on('room:chat', data => window.appendChat?.(data.sender, data.text));

    mpSocket.on('match:start', startOnlineMatch);
    mpSocket.on('match:input', data => window.applyRemoteOnlineInputs?.(data.inputs));
    mpSocket.on('match:state', data => {
        if (window.game?.isOnline && window.game.netRole === 'client') window.game.importState?.(data.state);
    });
    mpSocket.on('match:finished', data => {
        if (window.game?.isOnline && window.game.netRole === 'client') window.game.endGame(data.winnerText || 'Opponent');
        window.currentMatchId = null;
        window.clearOnlineRemoteInputs?.();
    });
    mpSocket.on('match:opponent_left', data => {
        window.currentMatchId = null;
        window.clearOnlineRemoteInputs?.();
        if (data?.match) showMatchLobby(data.match, 'Opponent left. Room is open again.');
        else if (window.game?.state === 'PLAYING') window.game.endGame('Remaining Player');
        else leaveRoom(false);
    });

    mpSocket.on('matches:update', refreshSpectateList);
    mpSocket.on('spectate:joined', enterSpectatorMode);
    mpSocket.on('spectate:state', data => {
        if (window.game?.isSpectator && data.state) window.game.importState?.(data.state);
    });
    mpSocket.on('spectate:ended', () => {
        if (window.game?.isSpectator) window.game.endGame('Match Ended');
    });
    mpSocket.on('spectate:error', data => window.updateLoginStatus?.(data.message, true));

    return mpSocket;
}

function startLatencyMonitor() {
    stopLatencyMonitor();
    latencyTimer = setInterval(() => {
        if (!mpSocket?.connected) return;
        const sentAt = performance.now();
        mpSocket.timeout(1200).emit('ping:measure', sentAt, error => {
            if (error) {
                updatePingDisplay('PING TIMEOUT', true);
                return;
            }
            updatePingDisplay(`${Math.round(performance.now() - sentAt)} ms`);
        });
    }, 2000);
}

function stopLatencyMonitor() {
    if (latencyTimer) clearInterval(latencyTimer);
    latencyTimer = null;
}

function updatePingDisplay(message, isError = false) {
    const display = document.getElementById('ping-display');
    if (!display || display.classList.contains('hidden')) return;
    const role = window.onlineMatchRole === 'host' ? 'HOST' : window.onlineMatchRole === 'client' ? 'CHALLENGER' : 'ONLINE';
    display.innerText = `${role} ${message}`;
    display.style.color = isError ? '#ff6b6b' : '#7bed9f';
}

function updateMpStatus(message, isError = false) {
    const status = document.getElementById('backend-status');
    if (!status) return;
    status.innerText = message;
    status.style.color = isError ? '#ff6b6b' : '#7bed9f';
}

function registerBackendUser(name) {
    const socket = initMultiplayerClient();
    if (!name) return;
    pendingRegistration = true;
    if (!socket?.connected) return;
    socket.emit('user:register', { name, hero: window.mySelectedHero || window.game?.p1Choice || 'Noae' });
}

function ensureRegistered() {
    if (!window.myUserName) {
        window.updateLoginStatus?.('Enter and confirm a nickname first.', true);
        return false;
    }
    registerBackendUser(window.myUserName);
    return true;
}

function buildOnlineHeroGrid() {
    const grid = document.getElementById('room-hero-grid');
    if (!grid || grid.dataset.ready === 'true') return;
    grid.innerHTML = '';
    Object.keys(HEROES).forEach(heroKey => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hero-card';
        button.dataset.hero = heroKey;
        button.innerText = HEROES[heroKey].name;
        button.onclick = () => {
            if (!window.currentMatchId) return;
            window.mySelectedHero = heroKey;
            mpSocket?.emit('room:hero', { matchId: window.currentMatchId, hero: heroKey });
        };
        grid.appendChild(button);
    });
    grid.dataset.ready = 'true';
}

function stopOnlineArenaForLobby() {
    const game = window.game;
    if (game?.isOnline || game?.state === 'PLAYING' || game?.state === 'GAMEOVER') {
        game.stopLoop?.();
        game.audio?.stopMusic?.();
        if (game.endGameTimer) {
            clearTimeout(game.endGameTimer);
            game.endGameTimer = null;
        }
        game.state = 'ONLINE_LOBBY';
        game.isOnline = false;
        game.netRole = 'spectator';
    }
    window.clearOnlineRemoteInputs?.();
    document.getElementById('game-ui')?.classList.add('hidden');
    document.getElementById('game-over-screen')?.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    document.getElementById('spectator-banner')?.classList.add('hidden');
    document.getElementById('ping-display')?.classList.add('hidden');
}

function showMatchLobby(state, notice = '') {
    if (!state?.matchId) return;
    if (state.status === 'lobby') stopOnlineArenaForLobby();
    window.currentMatchId = state.matchId;
    window.onlineMatchRole = state.role;
    window.isHost = state.role === 'host';
    window.onlineMatchState = state;

    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('room-screen')?.classList.remove('hidden');
    document.getElementById('display-room-code').innerText = state.matchId.toUpperCase();
    document.getElementById('room-p1-name').innerText = state.host?.name || 'Waiting...';
    document.getElementById('room-p2-name').innerText = state.client?.name || 'Waiting for challenger...';
    document.getElementById('room-p1-hero').innerText = HEROES[state.host?.hero]?.name || 'None';
    document.getElementById('room-p2-hero').innerText = HEROES[state.client?.hero]?.name || 'None';

    buildOnlineHeroGrid();
    document.querySelectorAll('#room-hero-grid .hero-card').forEach(card => {
        card.classList.toggle('selected-p1', card.dataset.hero === state.host?.hero);
        card.classList.toggle('selected-p2', card.dataset.hero === state.client?.hero);
    });

    const start = document.getElementById('btn-start-game');
    const status = document.getElementById('room-status-text');
    const canStart = state.role === 'host' && !!state.client && state.status === 'lobby';
    start.style.display = canStart ? 'inline-block' : 'none';
    start.onclick = () => mpSocket?.emit('match:ready', { matchId: state.matchId });
    if (notice) status.innerText = notice;
    else if (state.status === 'playing') status.innerText = 'Match in progress';
    else if (canStart) status.innerText = 'Both fighters ready';
    else if (state.role === 'host') status.innerText = 'Waiting for challenger';
    else status.innerText = 'Waiting for host';
}

function startOnlineMatch(state) {
    if (!window.game || !state.host || !state.client) return;
    window.currentMatchId = state.matchId;
    window.onlineMatchRole = state.role;
    window.onlineMatchState = state;
    window.isHost = state.role === 'host';

    window.game.p1Choice = state.host.hero;
    window.game.p2Choice = state.client.hero;
    window.game.isOnline = true;
    window.game.netRole = state.role;
    window.game.isSpectator = false;
    document.getElementById('room-screen')?.classList.add('hidden');
    document.getElementById('game-ui')?.classList.remove('hidden');
    document.getElementById('ping-display')?.classList.remove('hidden');
    document.getElementById('ping-display').innerText = state.role === 'host' ? 'HOST connecting...' : 'CHALLENGER connecting...';
    window.game.startGame(false);
    window.game.isOnline = true;
    window.game.netRole = state.role;
    window.setupOnlineControls?.(window.game);
    document.getElementById('p1-name').innerText = `[HOST] ${state.host.name}: ${HEROES[state.host.hero].name}`;
    document.getElementById('p2-name').innerText = `[CHALLENGER] ${state.client.name}: ${HEROES[state.client.hero].name}`;
}

function joinMatchmakingQueue() {
    const socket = initMultiplayerClient();
    if (!socket?.connected) {
        window.updateLoginStatus?.('Duel server is not connected.', true);
        return;
    }
    if (!ensureRegistered()) return;
    window.mySelectedHero = window.game?.p1Choice || window.mySelectedHero || 'Noae';
    socket.emit('matchmaking:join', { hero: window.mySelectedHero });
}

function leaveMatchmakingQueue() {
    mpSocket?.emit('matchmaking:leave');
}

function createPrivateRoom() {
    if (!ensureRegistered()) return;
    window.mySelectedHero = window.game?.p1Choice || window.mySelectedHero || 'Noae';
    mpSocket?.emit('room:create', { hero: window.mySelectedHero });
}

function joinPrivateRoom() {
    if (!ensureRegistered()) return;
    const input = document.getElementById('join-room-code');
    const matchId = input?.value?.trim().toUpperCase();
    if (!matchId || matchId.length !== 4) {
        window.updateLoginStatus?.('Enter a 4-character room code.', true);
        return;
    }
    window.mySelectedHero = window.game?.p1Choice || window.mySelectedHero || 'Noae';
    mpSocket?.emit('room:join', { matchId, hero: window.mySelectedHero });
}

function leaveRoom(showLogin = true) {
    if (window.currentMatchId) mpSocket?.emit('room:leave', { matchId: window.currentMatchId });
    window.currentMatchId = null;
    window.onlineMatchRole = null;
    window.clearOnlineRemoteInputs?.();
    document.getElementById('room-screen')?.classList.add('hidden');
    if (showLogin) document.getElementById('login-screen')?.classList.remove('hidden');
}

function sendRoomChat() {
    const input = document.getElementById('chat-input');
    const text = input?.value?.trim();
    if (!text || !window.currentMatchId) return;
    mpSocket?.emit('room:chat', { matchId: window.currentMatchId, text });
    input.value = '';
}

function addFriend() {
    const input = document.getElementById('friend-name-input');
    const friendName = input?.value?.trim();
    if (!friendName) return;
    mpSocket?.emit('friends:add', { friendName });
    input.value = '';
}

function renderFriendsList(friends) {
    const list = document.getElementById('friends-list');
    if (!list) return;
    list.innerHTML = '';
    (friends || []).forEach(friend => {
        const row = document.createElement('div');
        row.className = 'friend-row';
        const name = document.createElement('span');
        name.className = `friend-name ${friend.online ? 'online' : ''}`;
        name.innerText = friend.name;
        const status = document.createElement('span');
        status.className = 'friend-status';
        status.innerText = friend.status || 'offline';
        const remove = document.createElement('button');
        remove.className = 'friend-remove';
        remove.innerText = 'X';
        remove.onclick = () => mpSocket?.emit('friends:remove', { friendId: friend.id });
        row.append(name, status, remove);
        list.appendChild(row);
    });
}

async function refreshSpectateList() {
    const list = document.getElementById('spectate-matches-list');
    if (!list) return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/matches`);
        const matches = await response.json();
        list.innerHTML = '';
        if (!matches.length) {
            list.innerHTML = '<div class="spectate-empty">No live matches</div>';
            return;
        }
        matches.forEach(match => {
            const button = document.createElement('button');
            button.className = 'spectate-match-btn';
            button.innerText = `${match.hostName} vs ${match.clientName}\n${match.hostHero} / ${match.clientHero}`;
            button.onclick = () => mpSocket?.emit('spectate:join', { matchId: match.id });
            list.appendChild(button);
        });
    } catch (error) {
        list.innerHTML = '<div class="spectate-empty">Duel server offline</div>';
    }
}

function enterSpectatorMode(state) {
    if (!window.game || !state.hostHero || !state.clientHero) return;
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('room-screen')?.classList.add('hidden');
    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('game-ui')?.classList.remove('hidden');
    document.getElementById('spectator-banner')?.classList.remove('hidden');
    window.game.p1Choice = state.hostHero;
    window.game.p2Choice = state.clientHero;
    window.game.isOnline = false;
    window.game.isSpectator = true;
    window.game.startGame(false);
    window.game.isSpectator = true;
    window.game.netRole = 'spectator';
    document.getElementById('p1-name').innerText = `[HOST] ${state.hostName}`;
    document.getElementById('p2-name').innerText = `[CHALLENGER] ${state.clientName}`;
}

window.sendBackendInputs = inputs => {
    if (mpSocket?.connected && window.currentMatchId) mpSocket.emit('match:input', { matchId: window.currentMatchId, inputs });
};
window.sendBackendState = state => {
    if (mpSocket?.connected && window.currentMatchId) mpSocket.emit('match:state', { matchId: window.currentMatchId, state });
};
window.finishBackendMatch = winnerText => {
    if (mpSocket?.connected && window.currentMatchId) {
        mpSocket.emit('match:end', { matchId: window.currentMatchId, winnerText });
        window.currentMatchId = null;
    }
};

document.getElementById('btn-create-room').onclick = createPrivateRoom;
document.getElementById('btn-join-room').onclick = joinPrivateRoom;
document.getElementById('btn-leave-room').onclick = () => leaveRoom(true);
document.getElementById('btn-quick-match').onclick = joinMatchmakingQueue;
document.getElementById('btn-leave-queue').onclick = leaveMatchmakingQueue;
document.getElementById('btn-send-chat').onclick = sendRoomChat;
document.getElementById('chat-input').onkeydown = event => {
    if (event.key === 'Enter') sendRoomChat();
};

window.initMultiplayerClient = initMultiplayerClient;
window.registerBackendUser = registerBackendUser;
window.joinMatchmakingQueue = joinMatchmakingQueue;
window.leaveMatchmakingQueue = leaveMatchmakingQueue;
window.addFriend = addFriend;
window.refreshSpectateList = refreshSpectateList;
