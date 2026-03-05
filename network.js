// ==========================================
// Otokojuku: Legends Duel - Network & P2P Module
// ==========================================
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion, collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. Firebase 初始化与配置 ---
// 在 WebStorm 本地开发时，请替换为你自己的 Firebase 配置，否则联机服务将无法连接。
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBmBPtd8ugMe4nOnH5o0u60EbTCEtU-_n0",
    authDomain: "duel-48831.firebaseapp.com",
    projectId: "duel-48831",
    storageBucket: "duel-48831.firebasestorage.app",
    messagingSenderId: "908084167975",
    appId: "1:908084167975:web:4df8cb555e8aabd3309502"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'otokojuku-duel-local';
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase not properly configured. Online features will be disabled.");
}

// --- 2. 全局网络状态 ---
let myUserId = null;
let myUserName = localStorage.getItem('otokojuku_username') || '';
let currentRoomId = null;
let currentRoomUnsub = null;
let isHost = false;
let mySelectedHero = 'Noae';

// --- 3. 动态热更新 (Monkey Patch) 单机游戏引擎 ---
// 这里是网络模块最核心的魔术：不修改 game.js 的前提下，通过劫持原型链实现状态导出与远程输入接管！
if (window.Game && window.Game.prototype) {

    // 3.1 序列化所有类与物理状态
    window.Game.prototype.exportState = function() {
        const cloneEntity = (e) => {
            if (!e) return null;
            let obj = { classType: e.constructor.name };
            for (let key in e) {
                if (key === 'owner' || key === 'hitTargets' || key === 'grappledBy' || key === 'grappleTarget') continue;
                if (typeof e[key] !== 'function' && typeof e[key] !== 'object') {
                    obj[key] = e[key];
                } else if (Array.isArray(e[key]) && (e[key].length === 0 || typeof e[key][0] !== 'object')) {
                    obj[key] = [...e[key]];
                } else if (key === 'buffs') {
                    obj.buffs = {...e[key]};
                }
            }
            if (e.owner) obj.ownerId = e.owner.id;
            return obj;
        };
        return {
            p1: cloneEntity(this.p1), p2: cloneEntity(this.p2),
            projs: this.projectiles.map(cloneEntity), mins: this.minions.map(cloneEntity),
            parts: this.particles.slice(-150).map(cloneEntity), hazards: this.hazards.map(cloneEntity),
            hurricane: cloneEntity(this.hurricane), hitstop: this.hitstop
        };
    };

    // 3.2 反序列化从房主传来的物理状态
    window.Game.prototype.importState = function(state) {
        if (!this.p1) return;
        const hydrate = (stateObj) => {
            if(!stateObj) return null;
            // 动态利用 game.js 暴露在全局的类
            let Cls = window.eval(stateObj.classType);
            let inst = Cls ? Object.create(Cls.prototype) : {};
            for(let k in stateObj) inst[k] = stateObj[k];
            if(inst.ownerId === 'p1') inst.owner = this.p1;
            else if(inst.ownerId === 'p2') inst.owner = this.p2;
            return inst;
        };
        const merge = (target, src) => { for(let k in src) if(k!=='classType' && k!=='ownerId') target[k] = src[k]; };

        merge(this.p1, state.p1); merge(this.p2, state.p2);
        this.projectiles = state.projs.map(hydrate); this.minions = state.mins.map(hydrate);
        this.particles = state.parts.map(hydrate); this.hazards = state.hazards.map(hydrate);
        this.hurricane = state.hurricane ? hydrate(state.hurricane) : null;
        this.hitstop = state.hitstop;
    };

    // 3.3 劫持 update 循环，分离客户端与主机的物理计算
    const originalUpdate = window.Game.prototype.update;
    window.Game.prototype.update = function(dt) {
        if (this.isOnline && this.netRole === 'client') {
            // [Client] 不执行本地物理，仅仅收集自己的按键发送给 Host！
            let myInputs = {
                left: window.keys[window.currentBinds.p1.left], right: window.keys[window.currentBinds.p1.right],
                jump: window.keys[window.currentBinds.p1.jump], down: window.keys[window.currentBinds.p1.down],
                pJump: window.keysPressed[window.currentBinds.p1.jump], pAttack: window.keysPressed[window.currentBinds.p1.attack],
                pSuper: window.keysPressed[window.currentBinds.p1.super], pSwitch: window.keysPressed[window.currentBinds.p1.switch],
                pExtra: window.keysPressed[window.currentBinds.p1.extra]
            };
            if(window.dataChannel && window.dataChannel.readyState === 'open') {
                window.dataChannel.send(JSON.stringify({ type: 'inputs', inputs: myInputs }));
            }
            this.updateUI(); // 客户端强制更新本地 UI
            return;
        }

        // [Host] 或者 [Offline]：正常跑所有的游戏物理与判定
        originalUpdate.call(this, dt);

        if (this.isOnline && this.netRole === 'host' && window.dataChannel && window.dataChannel.readyState === 'open') {
            window.dataChannel.send(JSON.stringify({ type: 'state', state: this.exportState() }));
        }
    };
}


// --- 4. 大厅 UI 控制逻辑 ---
const screens = ['login-screen', 'menu-screen', 'room-screen', 'game-ui', 'game-over-screen'];
function showScreen(screenId) {
    screens.forEach(id => document.getElementById(id).classList.add('hidden'));
    if(screenId) document.getElementById(screenId).classList.remove('hidden');
}

// 修改原单机重启逻辑，使其在联机下退回房间
const originalRestart = document.getElementById('btn-restart').onclick;
document.getElementById('btn-restart').onclick = async (e) => {
    if (window.game && window.game.isOnline) {
        showScreen('room-screen');
        window.game.state = 'MENU'; window.game.isOnline = false;
        if (window.pc) { window.pc.close(); window.pc = null; }
        if (isHost && currentRoomId) {
            const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomId);
            await updateDoc(roomRef, { status: 'waiting', offer: null, answer: null, callerCandidates: [], calleeCandidates: [] });
        }
    } else {
        originalRestart(e);
    }
};

// 进入联机模式
document.getElementById('btn-online').onclick = () => {
    showScreen('login-screen');
    if(myUserName) {
        document.getElementById('username-input').value = myUserName;
        document.getElementById('btn-login').click(); // 自动尝试登录
    } else {
        initAuth();
    }
};
document.getElementById('btn-login-cancel').onclick = () => showScreen('menu-screen');

// 身份验证
const initAuth = async () => {
    if(!auth) return;
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (e) {
        document.getElementById('login-status').innerText = "Connection Failed.";
    }
};

if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            myUserId = user.uid;
            document.getElementById('login-status').innerText = "Connected to Server!";
            document.getElementById('room-match-ui').classList.remove('hidden');
        }
    });
}

document.getElementById('btn-login').onclick = () => {
    const inputName = document.getElementById('username-input').value.trim();
    if (inputName.length < 2) return alert("Nickname must be at least 2 characters.");
    if (!myUserId) return alert("Waiting for server connection...");

    myUserName = inputName;
    localStorage.setItem('otokojuku_username', myUserName);
    document.getElementById('login-title').innerText = `Welcome, ${myUserName}`;
    document.getElementById('login-status').innerText = "Profile Saved.";
};


// --- 5. 房间与匹配系统 ---
function appendChat(sender, text, isSys=false) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${isSys ? 'sys' : ''}`;
    div.innerText = isSys ? text : `[${sender}]: ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

document.getElementById('btn-send-chat').onclick = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !currentRoomId || !myUserId) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomId);
    await updateDoc(roomRef, { messages: arrayUnion({ sender: myUserName, text: text, ts: Date.now() }) });
    input.value = '';
};
document.getElementById('chat-input').onkeypress = (e) => { if(e.key === 'Enter') document.getElementById('btn-send-chat').click(); };

document.getElementById('btn-create-room').onclick = async () => {
    if (!myUserName) return alert("Please set a nickname first and click 'Connect'!");
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    currentRoomId = roomId; isHost = true;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await setDoc(roomRef, {
        status: 'waiting', hostId: myUserId, hostName: myUserName, hostHero: 'Noae',
        clientId: null, clientName: null, clientHero: 'Gensan',
        messages: [{ sender: 'System', text: `Room created! Your Code is ${roomId}`, ts: Date.now() }],
        callerCandidates: [], calleeCandidates: []
    });
    enterRoom(roomId);
};

document.getElementById('btn-join-room').onclick = async () => {
    if (!myUserName) return alert("Please set a nickname first and click 'Connect'!");
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (code.length !== 4) return alert("Please enter a 4-letter room code.");

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return alert("Room not found!");
    if (snap.data().clientId && snap.data().clientId !== myUserId) return alert("Room is full!");

    currentRoomId = code; isHost = false;
    await updateDoc(roomRef, { clientId: myUserId, clientName: myUserName, messages: arrayUnion({ sender: 'System', text: `${myUserName} joined the room!`, ts: Date.now() }) });
    enterRoom(code);
};

function enterRoom(roomId) {
    showScreen('room-screen');
    document.getElementById('display-room-code').innerText = roomId;
    document.getElementById('chat-messages').innerHTML = '';

    // Generate Heroes Grid in Lobby
    const grid = document.getElementById('room-hero-grid');
    grid.innerHTML = '';
    if(window.HEROES) {
        Object.keys(window.HEROES).forEach(key => {
            let div = document.createElement('div');
            div.className = 'hero-card';
            div.innerText = window.HEROES[key].name;
            div.id = `card-${key}`;
            div.onclick = async () => {
                if (!currentRoomId || !myUserId) return;
                mySelectedHero = key;
                const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomId);
                if (isHost) await updateDoc(roomRef, { hostHero: key });
                else await updateDoc(roomRef, { clientHero: key });
            };
            grid.appendChild(div);
        });
    }

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    let lastMsgCount = 0;

    currentRoomUnsub = onSnapshot(roomRef, async (snap) => {
        if (!snap.exists()) { alert("Room closed."); leaveRoom(); return; }
        const data = snap.data();

        document.getElementById('room-p1-name').innerText = data.hostName || 'Waiting...';
        document.getElementById('room-p2-name').innerText = data.clientName || 'Waiting for player...';
        document.getElementById('room-p1-hero').innerText = window.HEROES[data.hostHero]?.name || 'None';
        document.getElementById('room-p2-hero').innerText = window.HEROES[data.clientHero]?.name || 'None';

        document.querySelectorAll('.hero-card').forEach(c => { c.classList.remove('selected-p1'); c.classList.remove('selected-p2'); });
        if (document.getElementById(`card-${data.hostHero}`)) document.getElementById(`card-${data.hostHero}`).classList.add('selected-p1');
        if (document.getElementById(`card-${data.clientHero}`)) document.getElementById(`card-${data.clientHero}`).classList.add('selected-p2');

        if (data.messages && data.messages.length > lastMsgCount) {
            for (let i = lastMsgCount; i < data.messages.length; i++) {
                let m = data.messages[i]; appendChat(m.sender, m.text, m.sender === 'System');
            }
            lastMsgCount = data.messages.length;
        }

        const btnStart = document.getElementById('btn-start-game');
        const statusText = document.getElementById('room-status-text');

        if (isHost) {
            if (data.clientId) {
                btnStart.style.display = 'inline-block'; statusText.innerText = "Both players ready!";
                btnStart.onclick = () => initiateWebRTC(roomId, data);
            } else {
                btnStart.style.display = 'none'; statusText.innerText = "Waiting for challenger...";
            }
        } else {
            if (data.status === 'waiting') statusText.innerText = "Waiting for host to start...";
            else if (data.status === 'starting') {
                statusText.innerText = "Establishing P2P Connection...";
                handleClientWebRTC(roomId, data);
            }
        }
    }, (err) => console.error(err));
}

document.getElementById('btn-leave-room').onclick = leaveRoom;
function leaveRoom() {
    if (currentRoomUnsub) { currentRoomUnsub(); currentRoomUnsub = null; }
    currentRoomId = null; isHost = false;
    if (window.pc) { window.pc.close(); window.pc = null; }
    if (window.dataChannel) { window.dataChannel.close(); window.dataChannel = null; }
    showScreen('menu-screen');
}


// --- 6. WebRTC P2P 打洞与数据通道 (网络引擎核心) ---
const rtcConfig = { iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }] };
let clientHandlingRtc = false;

async function initiateWebRTC(roomId, roomData) {
    document.getElementById('btn-start-game').style.display = 'none';
    document.getElementById('room-status-text').innerText = "Generating connection credentials...";

    window.pc = new RTCPeerConnection(rtcConfig);
    window.dataChannel = window.pc.createDataChannel('gameSync');
    setupDataChannel(window.dataChannel, roomData);

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);

    window.pc.onicecandidate = async e => {
        if (e.candidate) await updateDoc(roomRef, { callerCandidates: arrayUnion(e.candidate.toJSON()) });
    };

    const offer = await window.pc.createOffer();
    await window.pc.setLocalDescription(offer);

    await updateDoc(roomRef, { status: 'starting', offer: { type: offer.type, sdp: offer.sdp }, answer: null, callerCandidates: [], calleeCandidates: [] });

    // Listen for Answer
    const unsubRtc = onSnapshot(roomRef, async (snap) => {
        const data = snap.data();
        if (!data || data.status !== 'starting') return;
        if (data.answer && !window.pc.currentRemoteDescription) await window.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        if (data.calleeCandidates && data.calleeCandidates.length > 0) {
            data.calleeCandidates.forEach(async c => { try { await window.pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} });
        }
    });
}

async function handleClientWebRTC(roomId, roomData) {
    if (clientHandlingRtc || !roomData.offer) return;
    clientHandlingRtc = true;

    window.pc = new RTCPeerConnection(rtcConfig);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);

    window.pc.onicecandidate = async e => {
        if (e.candidate) await updateDoc(roomRef, { calleeCandidates: arrayUnion(e.candidate.toJSON()) });
    };

    window.pc.ondatachannel = e => {
        window.dataChannel = e.channel;
        setupDataChannel(window.dataChannel, roomData);
    };

    await window.pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
    const answer = await window.pc.createAnswer();
    await window.pc.setLocalDescription(answer);

    await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

    const unsubRtc = onSnapshot(roomRef, async (snap) => {
        const data = snap.data();
        if (!data || data.status !== 'starting') return;
        if (data.callerCandidates && data.callerCandidates.length > 0) {
            data.callerCandidates.forEach(async c => { try { await window.pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} });
        }
    });
}

function setupDataChannel(channel, roomData) {
    channel.onopen = () => {
        document.getElementById('room-status-text').innerText = "P2P Success! Loading Battle...";

        setTimeout(() => {
            showScreen('game-ui');
            document.getElementById('ping-display').classList.remove('hidden');
            document.getElementById('ping-display').innerText = "Online Mode Active";

            if (isHost) {
                const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomId);
                updateDoc(roomRef, { status: 'playing' });
            }

            // 完美启动并覆盖本地 Game 实例
            if (window.game) {
                window.game.isOnline = true;
                window.game.netRole = isHost ? 'host' : 'client';
                window.game.p1Choice = roomData.hostHero;
                window.game.p2Choice = roomData.clientHero;
                // 注意这里 client 名字传到 p2 位置，因为在本地双方都是在自己的屏幕玩 p1 的位置控制 p1 或者 p2
                document.getElementById('p1-name').innerText = `[HOST] ${roomData.hostName}`;
                document.getElementById('p2-name').innerText = `[CHALLENGER] ${roomData.clientName}`;

                window.game.startGame(false);
            }
            clientHandlingRtc = false;
        }, 1000);
    };

    channel.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state' && !isHost && window.game) {
            // 客户端：接收并导入全图物理状态
            window.game.importState(msg.state);
        } else if (msg.type === 'inputs' && isHost && window.game) {
            // 房主：强行接管客户端在本地电脑上的玩家 2 的操作
            let remote = msg.inputs;
            let p2Binds = window.currentBinds.p2;

            window.keys[p2Binds.left] = remote.left;
            window.keys[p2Binds.right] = remote.right;
            window.keys[p2Binds.jump] = remote.jump;
            window.keys[p2Binds.down] = remote.down;

            // Pressed triggers (单次触发键)
            if(remote.pJump) window.keysPressed[p2Binds.jump] = true;
            if(remote.pAttack) window.keysPressed[p2Binds.attack] = true;
            if(remote.pSuper) window.keysPressed[p2Binds.super] = true;
            if(remote.pSwitch) window.keysPressed[p2Binds.switch] = true;
            if(remote.pExtra) window.keysPressed[p2Binds.extra] = true;
        }
    };

    channel.onclose = () => {
        document.getElementById('ping-display').innerText = "Connection Lost";
        setTimeout(()=> document.getElementById('btn-restart').click(), 2000);
    };
}