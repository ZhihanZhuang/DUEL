// ==========================================
// Otokojuku: Legends Duel - 坚如磐石的联机模块
// ==========================================
console.log("【Debug】network.js 已经启动...");

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. Firebase 配置 ---
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

// 全局状态变量
window.myUserId = null;
window.myUserName = localStorage.getItem('otokojuku_username') || '';
window.currentRoomId = null;
window.isHost = false;
window.mySelectedHero = 'Noae';
window.currentRoomUnsub = null;

// 防连点锁
let hostHandlingRtc = false;
let clientHandlingRtc = false;

// --- 2. 初始化网络 ---
const initNetwork = async () => {
    try {
        updateStatus("正在连接 Firebase 服务器...");
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        await signInAnonymously(auth);
        
        onAuthStateChanged(auth, (u) => {
            if (u) {
                user = u;
                window.myUserId = u.uid;
                updateStatus("连接成功！服务器已就绪。");
                document.getElementById('room-match-ui').classList.remove('hidden');
            }
        });
    } catch (error) {
        console.error("Firebase 初始化失败:", error);
        updateStatus(`连接失败: ${error.message}`, true);
    }
};

// --- 3. 动态劫持单机游戏循环 ---
function applyNetworkPatch() {
    if (window.Game && window.Game.prototype) {
        console.log("【成功】已读取到 game.js，正在注入网络联机补丁...");
        
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
                    left: window.keys[window.currentBinds?.p1?.left || 'KeyA'], right: window.keys[window.currentBinds?.p1?.right || 'KeyD'],
                    jump: window.keys[window.currentBinds?.p1?.jump || 'KeyW'], down: window.keys[window.currentBinds?.p1?.down || 'KeyS'],
                    pJump: window.keysPressed[window.currentBinds?.p1?.jump || 'KeyW'], pAttack: window.keysPressed[window.currentBinds?.p1?.attack || 'Space'],
                    pSuper: window.keysPressed[window.currentBinds?.p1?.super || 'KeyE'], pSwitch: window.keysPressed[window.currentBinds?.p1?.switch || 'KeyT'],
                    pExtra: window.keysPressed[window.currentBinds?.p1?.extra || 'KeyG']
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
    } else {
        console.warn("【等待】game.js 尚未就绪，0.5秒后重试...");
        setTimeout(applyNetworkPatch, 500); 
    }
}
applyNetworkPatch();


// --- 4. 登录交互逻辑 ---
document.getElementById('btn-online').onclick = () => {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    if (window.myUserName) document.getElementById('username-input').value = window.myUserName;
    initNetwork();
};

document.getElementById('btn-login-cancel').onclick = () => {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
};

document.getElementById('btn-login').onclick = () => {
    const inputName = document.getElementById('username-input').value.trim();
    if (inputName.length < 1) return alert("请输入名字！");
    window.myUserName = inputName;
    localStorage.setItem('otokojuku_username', inputName);
    document.getElementById('login-title').innerText = `你好, ${inputName}`;
    updateStatus("身份配置已保存。");
};

// --- 5. 聊天系统 ---
function appendChat(sender, text, isSys=false) {
    const box = document.getElementById('chat-messages');
    if (!box) return;
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
    
    try {
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId);
        await updateDoc(roomRef, { messages: arrayUnion({ sender: window.myUserName, text: text, ts: Date.now() }) });
        input.value = ''; 
    } catch (err) {
        console.error("发送聊天失败:", err);
        alert("发送失败，可能是网络延迟或数据库权限被拦截: " + err.message);
    }
};
document.getElementById('chat-input').onkeypress = (e) => { if(e.key === 'Enter') document.getElementById('btn-send-chat').click(); };


// --- 6. 房间创建与匹配逻辑 ---
document.getElementById('btn-create-room').onclick = async () => {
    if (!window.myUserName) return alert("请先连接服务器");
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    try {
        hostHandlingRtc = false;
        clientHandlingRtc = false;
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
        await setDoc(roomRef, {
            status: 'waiting', hostId: window.myUserId, hostName: window.myUserName, hostHero: 'Noae',
            clientId: null, clientName: null, clientHero: 'Wolf', 
            messages: [{ sender: 'System', text: `房间创建成功！告诉朋友代码：${roomId}`, ts: Date.now() }],
            callerCandidates: [], calleeCandidates: []
        });
        
        window.currentRoomId = roomId;
        window.isHost = true;
        enterRoom(roomId);
    } catch (err) {
        alert("建房失败，请检查网络: " + err.message);
    }
};

document.getElementById('btn-join-room').onclick = async () => {
    if (!window.myUserName) return alert("请先连接服务器");
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (code.length !== 4) return alert("请输入4位房间代码");
    
    try {
        hostHandlingRtc = false;
        clientHandlingRtc = false;
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
    } catch (err) {
        alert("加入失败: " + err.message);
    }
};

// --- 7. 房间大厅渲染 ---
function enterRoom(roomId) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('room-screen').classList.remove('hidden');
    document.getElementById('display-room-code').innerText = roomId;
    document.getElementById('chat-messages').innerHTML = '';
    
    const grid = document.getElementById('room-hero-grid');
    grid.innerHTML = '';
    
    if (window.HEROES) {
        Object.keys(window.HEROES).forEach(heroKey => {
            const heroData = window.HEROES[heroKey];
            let btn = document.createElement('button'); 
            btn.className = 'hero-card';
            btn.innerText = heroData.name;
            btn.id = `card-${heroKey}`;
            
            btn.onclick = async () => {
                if (!window.currentRoomId || !window.myUserId) return;
                try {
                    window.mySelectedHero = heroKey;
                    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId);
                    if (window.isHost) await updateDoc(roomRef, { hostHero: heroKey });
                    else await updateDoc(roomRef, { clientHero: heroKey });
                } catch(err) {
                    console.error("同步失败", err);
                }
            };
            grid.appendChild(btn);
        });
    }

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    let lastMsgCount = 0;

    window.currentRoomUnsub = onSnapshot(roomRef, (snap) => {
        if (!snap.exists()) { alert("房间被关闭"); leaveRoom(); return; }
        const data = snap.data();
        
        if (document.getElementById('room-p1-name')) document.getElementById('room-p1-name').innerText = data.hostName || '等待中...';
        if (document.getElementById('room-p2-name')) document.getElementById('room-p2-name').innerText = data.clientName || '等待加入...';
        if (document.getElementById('room-p1-hero')) document.getElementById('room-p1-hero').innerText = (window.HEROES && window.HEROES[data.hostHero]?.name) || data.hostHero || '无';
        if (document.getElementById('room-p2-hero')) document.getElementById('room-p2-hero').innerText = (window.HEROES && window.HEROES[data.clientHero]?.name) || data.clientHero || '无';
        
        document.querySelectorAll('.hero-card').forEach(c => { c.classList.remove('selected-p1'); c.classList.remove('selected-p2'); });
        let p1Card = document.getElementById(`card-${data.hostHero}`);
        let p2Card = document.getElementById(`card-${data.clientHero}`);
        if (p1Card) p1Card.classList.add('selected-p1');
        if (p2Card) p2Card.classList.add('selected-p2');

        if (data.messages && data.messages.length > lastMsgCount) {
            for (let i = lastMsgCount; i < data.messages.length; i++) {
                let m = data.messages[i];
                appendChat(m.sender, m.text, m.sender === 'System');
            }
            lastMsgCount = data.messages.length;
        }

        const btnStart = document.getElementById('btn-start-game');
        const statusText = document.getElementById('room-status-text');
        
        // 修复状态互相覆盖的Bug
        if (window.isHost) {
            if (data.status === 'starting' || data.status === 'playing') {
                // 如果已经在建立连接或游戏中，隐藏按钮并锁死文字
                btnStart.style.display = 'none';
                statusText.innerText = data.status === 'starting' ? "正在建立 P2P 网络直连..." : "游戏中...";
            } else if (data.clientId) {
                btnStart.style.display = 'inline-block'; 
                statusText.innerText = "双方已就绪！";
                btnStart.onclick = () => initiateWebRTC(roomId, data);
            } else {
                btnStart.style.display = 'none'; 
                statusText.innerText = "等待挑战者加入...";
            }
        } else {
            if (data.status === 'waiting') {
                statusText.innerText = "等待房主开始游戏...";
            } else if (data.status === 'starting') {
                statusText.innerText = "正在建立 P2P 网络直连...";
                handleClientWebRTC(roomId, data);
            } else if (data.status === 'playing') {
                statusText.innerText = "游戏中...";
            }
        }
    }, (err) => {
        console.error("Snapshot error:", err);
    });
}

document.getElementById('btn-leave-room').onclick = leaveRoom;
function leaveRoom() {
    if (window.currentRoomUnsub) { window.currentRoomUnsub(); window.currentRoomUnsub = null; }
    window.currentRoomId = null; window.isHost = false;
    hostHandlingRtc = false;
    clientHandlingRtc = false;
    if (window.pc) { window.pc.close(); window.pc = null; }
    if (window.dataChannel) { window.dataChannel.close(); window.dataChannel = null; }
    document.getElementById('room-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}


// --- 8. WebRTC 穿透核心 (P2P 对战) ---
const rtcConfig = { iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }] };

async function initiateWebRTC(roomId, roomData) {
    if (hostHandlingRtc) return; // 防连点锁
    hostHandlingRtc = true;

    document.getElementById('btn-start-game').style.display = 'none';
    document.getElementById('room-status-text').innerText = "生成连接凭证中...";
    
    window.pc = new RTCPeerConnection(rtcConfig);
    window.dataChannel = window.pc.createDataChannel('gameSync');
    setupDataChannel(window.dataChannel, roomData);

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    window.pc.onicecandidate = async e => {
        if (e.candidate) {
            try { await updateDoc(roomRef, { callerCandidates: arrayUnion(e.candidate.toJSON()) }); } catch(err){}
        }
    };

    const offer = await window.pc.createOffer();
    await window.pc.setLocalDescription(offer);
    
    await updateDoc(roomRef, { status: 'starting', offer: { type: offer.type, sdp: offer.sdp }, answer: null, callerCandidates: [], calleeCandidates: [] });

    // 监听客户端的应答
    const unsubRtc = onSnapshot(roomRef, async (snap) => {
        const data = snap.data();
        if (!data || data.status !== 'starting') return;
        
        if (data.answer && !window.pc.currentRemoteDescription) {
            await window.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        
        // 必须等 remoteDescription 设置好之后才能添加 candidate，防止报错
        if (window.pc.currentRemoteDescription && data.calleeCandidates && data.calleeCandidates.length > 0) {
            data.calleeCandidates.forEach(async c => { 
                try { await window.pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} 
            });
        }
    });
}

async function handleClientWebRTC(roomId, roomData) {
    if (clientHandlingRtc || !roomData.offer) return;
    clientHandlingRtc = true; // 防重复执行锁
    
    window.pc = new RTCPeerConnection(rtcConfig);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);

    window.pc.onicecandidate = async e => {
        if (e.candidate) {
            try { await updateDoc(roomRef, { calleeCandidates: arrayUnion(e.candidate.toJSON()) }); } catch(err){}
        }
    };

    window.pc.ondatachannel = e => {
        window.dataChannel = e.channel;
        setupDataChannel(window.dataChannel, roomData);
    };

    await window.pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
    const answer = await window.pc.createAnswer();
    await window.pc.setLocalDescription(answer);
    
    await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

    // 监听房主的候选凭证
    const unsubRtc = onSnapshot(roomRef, async (snap) => {
        const data = snap.data();
        if (!data || data.status !== 'starting') return;
        
        if (window.pc.currentRemoteDescription && data.callerCandidates && data.callerCandidates.length > 0) {
            data.callerCandidates.forEach(async c => { 
                try { await window.pc.addIceCandidate(new RTCIceCandidate(c)); } catch(e){} 
            });
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
            
            if (window.Game && window.game) {
                window.game.isOnline = true;
                window.game.netRole = window.isHost ? 'host' : 'client';
                window.game.p1Choice = roomData.hostHero;
                window.game.p2Choice = roomData.clientHero;
                document.getElementById('p1-name').innerText = `[HOST] ${roomData.hostName}`;
                document.getElementById('p2-name').innerText = `[CLIENT] ${roomData.clientName}`;
                window.game.startGame(false);
            } else {
                alert("严重错误：游戏引擎未加载完成！");
            }
        }, 1000);
    };
    
    channel.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state' && !window.isHost && window.game) {
            window.game.importState(msg.state);
        } else if (msg.type === 'inputs' && window.isHost && window.game) {
            let remote = msg.inputs;
            let p2Binds = window.currentBinds.p2;
            window.keys[p2Binds.left] = remote.left; window.keys[p2Binds.right] = remote.right;
            window.keys[p2Binds.jump] = remote.jump; window.keys[p2Binds.down] = remote.down;
            if(remote.pJump) window.keysPressed[p2Binds.jump] = true;
            if(remote.pAttack) window.keysPressed[p2Binds.attack] = true;
            if(remote.pSuper) window.keysPressed[p2Binds.super] = true;
            if(remote.pSwitch) window.keysPressed[p2Binds.switch] = true;
            if(remote.pExtra) window.keysPressed[p2Binds.extra] = true;
        }
    };
    
    channel.onclose = () => { 
        document.getElementById('ping-display').innerText = "连接已断开"; 
        setTimeout(()=> { if (document.getElementById('btn-restart')) document.getElementById('btn-restart').click(); }, 2000);
    };
}
