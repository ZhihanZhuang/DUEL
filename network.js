// ==========================================
// Otokojuku: Legends Duel - 完整联机网络模块
// ==========================================
console.log("【Debug】network.js 已经启动...");

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. Firebase 配置 (请确认这些信息与你的 Firebase 控制台一致) ---
const firebaseConfig = {
    apiKey: "AIzaSyBmBPtd8ugMe4nOnH5o0u60EbTCEtU-_n0",
    authDomain: "duel-48831.firebaseapp.com",
    projectId: "duel-48831",
    storageBucket: "duel-48831.firebasestorage.app",
    messagingSenderId: "908084167975",
    appId: "1:908084167975:web:4df8cb555e8aabd3309502"
};

const appId = 'otokojuku-duel-local';
let auth, db, user;

const statusEl = document.getElementById('login-status');
const updateStatus = (msg, isError = false) => {
    if (statusEl) {
        statusEl.innerText = msg;
        statusEl.style.color = isError ? "#ff5252" : "#aaa";
    }
    console.log(`[Network Status] ${msg}`);
};

// 全局状态变量，挂载在 window 上以确保各个函数能读到
window.myUserId = null;
window.myUserName = localStorage.getItem('otokojuku_username') || '';
window.currentRoomId = null;
window.isHost = false;
window.mySelectedHero = 'Noae';
window.currentRoomUnsub = null;

// --- 2. 初始化与连接自检 ---
const initNetwork = async () => {
    try {
        updateStatus("正在连接 Firebase 服务器...");
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // 匿名登录
        await signInAnonymously(auth);

        onAuthStateChanged(auth, (u) => {
            if (u) {
                user = u;
                window.myUserId = u.uid;
                updateStatus("连接成功！服务器已就绪。");
                document.getElementById('room-match-ui').classList.remove('hidden');
            } else {
                updateStatus("未验证身份，请检查 Firebase Auth 设置。", true);
            }
        });

    } catch (error) {
        console.error("Firebase 初始化失败:", error);
        updateStatus(`连接失败: ${error.code || error.message}`, true);
    }
};

// --- 3. 动态补丁逻辑 (接管本地游戏引擎) ---
if (window.Game && window.Game.prototype) {
    window.Game.prototype.exportState = function() {
        const cloneEntity = (e) => {
            if (!e) return null;
            let obj = { classType: e.constructor.name };
            for (let key in e) {
                if (['owner', 'hitTargets', 'grappledBy', 'grappleTarget'].includes(key)) continue;
                if (typeof e[key] !== 'function' && typeof e[key] !== 'object') obj[key] = e[key];
                else if (Array.isArray(e[key]) && (e[key].length === 0 || typeof e[key][0] !== 'object')) obj[key] = [...e[key]];
                else if (key === 'buffs') obj.buffs = {...e[key]};
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

    window.Game.prototype.importState = function(state) {
        if (!this.p1) return;
        const hydrate = (stateObj) => {
            if(!stateObj) return null;
            let Cls = window[stateObj.classType];
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

    const originalUpdate = window.Game.prototype.update;
    window.Game.prototype.update = function(dt) {
        if (this.isOnline && this.netRole === 'client') {
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
            this.updateUI();
            return;
        }
        originalUpdate.call(this, dt);
        if (this.isOnline && this.netRole === 'host' && window.dataChannel && window.dataChannel.readyState === 'open') {
            window.dataChannel.send(JSON.stringify({ type: 'state', state: this.exportState() }));
        }
    };
}

// --- 4. 登录与大厅交互逻辑 ---
document.getElementById('btn-online').onclick = () => {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    if (window.myUserName) document.getElementById('username-input').value = window.myUserName;
    initNetwork(); // 点开联机面板就开始初始化
};

document.getElementById('btn-login-cancel').onclick = () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
};

document.getElementById('btn-login').onclick = () => {
    const inputName = document.getElementById('username-input').value.trim();
    if (inputName.length < 2) return alert("昵称至少2个字符！");
    window.myUserName = inputName;
    localStorage.setItem('otokojuku_username', inputName);
    document.getElementById('login-title').innerText = `你好, ${inputName}`;
    updateStatus("身份配置已保存，可以创建或加入房间了。");
};

// 聊天系统
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
    if (!text || !window.currentRoomId || !window.myUserId) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId);
    await updateDoc(roomRef, { messages: arrayUnion({ sender: window.myUserName, text: text, ts: Date.now() }) });
    input.value = '';
};
document.getElementById('chat-input').onkeypress = (e) => { if(e.key === 'Enter') document.getElementById('btn-send-chat').click(); };


// --- 5. 房间创建与匹配逻辑 ---
document.getElementById('btn-create-room').onclick = async () => {
    if (!window.myUserName) return alert("请先输入昵称并点击『连接至服务器』");
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await setDoc(roomRef, {
        status: 'waiting', hostId: window.myUserId, hostName: window.myUserName, hostHero: 'Noae',
        clientId: null, clientName: null, clientHero: 'Gensan',
        messages: [{ sender: 'System', text: `房间创建成功！把房间号 ${roomId} 告诉朋友吧！`, ts: Date.now() }],
        callerCandidates: [], calleeCandidates: []
    });

    window.currentRoomId = roomId;
    window.isHost = true;
    enterRoom(roomId);
};

document.getElementById('btn-join-room').onclick = async () => {
    if (!window.myUserName) return alert("请先输入昵称并点击『连接至服务器』");
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (code.length !== 4) return alert("请输入4位房间代码");

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return alert("房间不存在或已解散！");
    if (snap.data().clientId && snap.data().clientId !== window.myUserId) return alert("房间已满！");

    await updateDoc(roomRef, {
        clientId: window.myUserId,
        clientName: window.myUserName,
        messages: arrayUnion({ sender: 'System', text: `${window.myUserName} 加入了房间！`, ts: Date.now() })
    });

    window.currentRoomId = code;
    window.isHost = false;
    enterRoom(code);
};

// 补回上次丢失的大厅核心渲染与监听逻辑
function enterRoom(roomId) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('room-screen').classList.remove('hidden');
    document.getElementById('display-room-code').innerText = roomId;
    document.getElementById('chat-messages').innerHTML = '';

    // 生成英雄选择列表
    const grid = document.getElementById('room-hero-grid');
    grid.innerHTML = '';

    // 如果由于文件拆分没读到 HEROES，提供一个后备的硬编码列表
    const fallbackHeroes = ["Hason", "Hunter", "Macu", "Willi", "Artu", "Duke", "Kadaxi", "Euclid", "Lique", "Kae", "Ugo", "Kila", "Volt", "Gensan", "Noae"];
    const heroesSource = window.HEROES ? Object.keys(window.HEROES) : fallbackHeroes;

    heroesSource.forEach(key => {
        let div = document.createElement('div');
        div.className = 'hero-card';
        div.innerText = (window.HEROES && window.HEROES[key]) ? window.HEROES[key].name : key;
        div.id = `card-${key}`;

        // 点击选择英雄，并立刻同步到 Firebase
        div.onclick = async () => {
            if (!window.currentRoomId || !window.myUserId) return;
            window.mySelectedHero = key;
            const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId);
            if (window.isHost) await updateDoc(roomRef, { hostHero: key });
            else await updateDoc(roomRef, { clientHero: key });
        };
        grid.appendChild(div);
    });

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    let lastMsgCount = 0;

    // 实时监听房间变化（聊天、英雄选择、准备状态）
    window.currentRoomUnsub = onSnapshot(roomRef, async (snap) => {
        if (!snap.exists()) { alert("房间已解散"); leaveRoom(); return; }
        const data = snap.data();

        // 刷新双方状态
        document.getElementById('room-p1-name').innerText = data.hostName || '等待中...';
        document.getElementById('room-p2-name').innerText = data.clientName || '等待加入...';
        document.getElementById('room-p1-hero').innerText = (window.HEROES && window.HEROES[data.hostHero]?.name) || data.hostHero || '无';
        document.getElementById('room-p2-hero').innerText = (window.HEROES && window.HEROES[data.clientHero]?.name) || data.clientHero || '无';

        // 刷新选中边框特效
        document.querySelectorAll('.hero-card').forEach(c => { c.classList.remove('selected-p1'); c.classList.remove('selected-p2'); });
        if (document.getElementById(`card-${data.hostHero}`)) document.getElementById(`card-${data.hostHero}`).classList.add('selected-p1');
        if (document.getElementById(`card-${data.clientHero}`)) document.getElementById(`card-${data.clientHero}`).classList.add('selected-p2');

        // 刷新聊天
        if (data.messages && data.messages.length > lastMsgCount) {
            for (let i = lastMsgCount; i < data.messages.length; i++) {
                let m = data.messages[i];
                appendChat(m.sender, m.text, m.sender === 'System');
            }
            lastMsgCount = data.messages.length;
        }

        // 开始对战逻辑
        const btnStart = document.getElementById('btn-start-game');
        const statusText = document.getElementById('room-status-text');

        if (window.isHost) {
            if (data.clientId) {
                btnStart.style.display = 'inline-block'; statusText.innerText = "双方已就绪！";
                btnStart.onclick = () => initiateWebRTC(roomId, data);
            } else {
                btnStart.style.display = 'none'; statusText.innerText = "等待挑战者加入房间...";
            }
        } else {
            if (data.status === 'waiting') statusText.innerText = "等待房主开始游戏...";
            else if (data.status === 'starting') {
                statusText.innerText = "正在建立 P2P 直连...";
                handleClientWebRTC(roomId, data);
            }
        }
    }, (err) => console.error("房间数据同步错误:", err));
}

document.getElementById('btn-leave-room').onclick = leaveRoom;
function leaveRoom() {
    if (window.currentRoomUnsub) { window.currentRoomUnsub(); window.currentRoomUnsub = null; }
    window.currentRoomId = null; window.isHost = false;
    if (window.pc) { window.pc.close(); window.pc = null; }
    if (window.dataChannel) { window.dataChannel.close(); window.dataChannel = null; }
    document.getElementById('room-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}


// --- 6. WebRTC P2P 打洞与数据通道 ---
const rtcConfig = { iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }] };
let clientHandlingRtc = false;

async function initiateWebRTC(roomId, roomData) {
    document.getElementById('btn-start-game').style.display = 'none';
    document.getElementById('room-status-text').innerText = "生成连接凭证中...";

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
        document.getElementById('room-status-text').innerText = "P2P 穿透成功！正在加载战场...";

        setTimeout(() => {
            document.getElementById('room-screen').classList.add('hidden');
            document.getElementById('game-ui').classList.remove('hidden');
            document.getElementById('ping-display').classList.remove('hidden');
            document.getElementById('ping-display').innerText = "P2P Online Active";

            if (window.isHost) {
                const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId);
                updateDoc(roomRef, { status: 'playing' });
            }

            if (window.game) {
                window.game.isOnline = true;
                window.game.netRole = window.isHost ? 'host' : 'client';
                window.game.p1Choice = roomData.hostHero;
                window.game.p2Choice = roomData.clientHero;
                document.getElementById('p1-name').innerText = `[HOST] ${roomData.hostName}`;
                document.getElementById('p2-name').innerText = `[CLIENT] ${roomData.clientName}`;

                window.game.startGame(false);
            }
            clientHandlingRtc = false;
        }, 1000);
    };

    channel.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state' && !window.isHost && window.game) {
            window.game.importState(msg.state);
        } else if (msg.type === 'inputs' && window.isHost && window.game) {
            let remote = msg.inputs;
            let p2Binds = window.currentBinds.p2;
            window.keys[p2Binds.left] = remote.left;
            window.keys[p2Binds.right] = remote.right;
            window.keys[p2Binds.jump] = remote.jump;
            window.keys[p2Binds.down] = remote.down;
            if(remote.pJump) window.keysPressed[p2Binds.jump] = true;
            if(remote.pAttack) window.keysPressed[p2Binds.attack] = true;
            if(remote.pSuper) window.keysPressed[p2Binds.super] = true;
            if(remote.pSwitch) window.keysPressed[p2Binds.switch] = true;
            if(remote.pExtra) window.keysPressed[p2Binds.extra] = true;
        }
    };

    channel.onclose = () => {
        document.getElementById('ping-display').innerText = "连接已断开";
        setTimeout(()=> document.getElementById('btn-restart').click(), 2000);
    };
}