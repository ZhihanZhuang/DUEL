// ==========================================
// Otokojuku: Legends Duel - 纯 Firebase 实时同步模块
// 彻底放弃 WebRTC 穿透，确保 100% 连接成功率
// ==========================================
console.log("【Debug】network.js (Firebase Sync 版) 已经启动...");

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, arrayUnion, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
window.gameSyncUnsub = null;

// 防连点锁
let isGameStarting = false;

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

// --- 3. 动态劫持单机游戏循环 (改为纯 Firebase 同步) ---
function applyNetworkPatch() {
    if (window.Game && window.Game.prototype) {
        console.log("【成功】已读取到 game.js，正在注入 Firebase 实时同步补丁...");
        
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
                // 为了节省带宽，粒子特效不同步，各算各的
                hazards: this.hazards.map(cloneEntity),
                hurricane: cloneEntity(this.hurricane), hitstop: this.hitstop
            };
        };

        window.Game.prototype.importState = function(state) {
            if (!this.p1 || !state) return;
            const hydrate = (stateObj) => {
                if(!stateObj) return null;
                let Cls = window[stateObj.classType];
                let inst = Cls ? Object.create(Cls.prototype) : {};
                for(let k in stateObj) inst[k] = stateObj[k];
                if(inst.ownerId === 'p1') inst.owner = this.p1;
                else if(inst.ownerId === 'p2') inst.owner = this.p2;
                return inst;
            };
            const merge = (target, src) => { 
                if(!src || !target) return;
                for(let k in src) if(k!=='classType' && k!=='ownerId') target[k] = src[k]; 
            };
            merge(this.p1, state.p1); merge(this.p2, state.p2);
            if (state.projs) this.projectiles = state.projs.map(hydrate); 
            if (state.mins) this.minions = state.mins.map(hydrate);
            if (state.hazards) this.hazards = state.hazards.map(hydrate);
            if (state.hurricane !== undefined) this.hurricane = state.hurricane ? hydrate(state.hurricane) : null;
            if (state.hitstop !== undefined) this.hitstop = state.hitstop;
        };

        const originalUpdate = window.Game.prototype.update;
        
        // 控制同步频率 (Firebase 建议 10-15帧/秒)
        let lastSyncTime = 0;
        const SYNC_INTERVAL = 100; 

        window.Game.prototype.update = function(dt) {
            if (this.isOnline && this.netRole === 'client') {
                // 客户端：只收集输入，并在满足间隔时写入 Firebase
                let myInputs = {
                    left: window.keys[window.currentBinds?.p1?.left || 'KeyA'] || false, 
                    right: window.keys[window.currentBinds?.p1?.right || 'KeyD'] || false,
                    jump: window.keys[window.currentBinds?.p1?.jump || 'KeyW'] || false, 
                    down: window.keys[window.currentBinds?.p1?.down || 'KeyS'] || false,
                    pJump: window.keysPressed[window.currentBinds?.p1?.jump || 'KeyW'] || false, 
                    pAttack: window.keysPressed[window.currentBinds?.p1?.attack || 'Space'] || false,
                    pSuper: window.keysPressed[window.currentBinds?.p1?.super || 'KeyE'] || false, 
                    pSwitch: window.keysPressed[window.currentBinds?.p1?.switch || 'KeyT'] || false,
                    pExtra: window.keysPressed[window.currentBinds?.p1?.extra || 'KeyG'] || false
                };

                let now = performance.now();
                if (now - lastSyncTime > SYNC_INTERVAL && window.currentRoomId) {
                    lastSyncTime = now;
                    // 异步写入，不阻塞主循环
                    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId), {
                        clientInputs: myInputs
                    }).catch(e => console.error("输入同步失败", e));
                }

                // 客户端自己也要更新一下特效动画
                this.particles.forEach(p => p.update(dt));
                this.particles = this.particles.filter(p => !p.dead);
                
                this.updateUI();
                return;
            }

            // 房主：运行完整的游戏逻辑
            originalUpdate.call(this, dt);

            if (this.isOnline && this.netRole === 'host' && window.currentRoomId) {
                let now = performance.now();
                if (now - lastSyncTime > SYNC_INTERVAL) {
                    lastSyncTime = now;
                    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId), {
                        gameState: this.exportState()
                    }).catch(e => console.error("状态同步失败", e));
                }
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
        isGameStarting = false;
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
        await setDoc(roomRef, {
            status: 'waiting', 
            hostId: window.myUserId, hostName: window.myUserName, hostHero: 'Noae',
            clientId: null, clientName: null, clientHero: 'Wolf', 
            messages: [{ sender: 'System', text: `房间创建成功！告诉朋友代码：${roomId}`, ts: Date.now() }],
            gameState: null,
            clientInputs: null
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
        isGameStarting = false;
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

// --- 7. 房间大厅与游戏循环核心 ---
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
        if (!snap.exists()) { 
            alert("房间已被解散"); 
            leaveRoom(); 
            return; 
        }
        const data = snap.data();
        
        // --- 1. 更新大厅 UI ---
        if (document.getElementById('room-screen').classList.contains('hidden') === false) {
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
            
            if (window.isHost) {
                if (data.status === 'playing') {
                    btnStart.style.display = 'none';
                    statusText.innerText = "马上进入战场...";
                } else if (data.clientId) {
                    btnStart.style.display = 'inline-block'; 
                    statusText.innerText = "双方已就绪！";
                    btnStart.onclick = async () => {
                        if (isGameStarting) return;
                        isGameStarting = true;
                        btnStart.style.display = 'none';
                        statusText.innerText = "通知客户端...";
                        await updateDoc(roomRef, { status: 'playing' });
                        startGameInstance(data);
                    };
                } else {
                    btnStart.style.display = 'none'; 
                    statusText.innerText = "等待挑战者加入...";
                }
            } else {
                if (data.status === 'waiting') {
                    statusText.innerText = "等待房主开始游戏...";
                } else if (data.status === 'playing' && !isGameStarting) {
                    isGameStarting = true;
                    statusText.innerText = "房主已开始，马上进入战场...";
                    startGameInstance(data);
                }
            }
        }

        // --- 2. 游戏中的状态同步处理 ---
        if (window.game && window.game.isOnline && data.status === 'playing') {
            if (window.isHost && data.clientInputs) {
                // 房主应用客户端传来的按键
                let remote = data.clientInputs;
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
            } else if (!window.isHost && data.gameState) {
                // 客户端强制覆盖由房主计算好的游戏状态
                window.game.importState(data.gameState);
            }
        }

    }, (err) => {
        console.error("Snapshot error:", err);
    });
}

function startGameInstance(roomData) {
    setTimeout(() => {
        document.getElementById('room-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        document.getElementById('ping-display').classList.remove('hidden');
        document.getElementById('ping-display').innerText = "Firebase Cloud Sync";
        document.getElementById('ping-display').style.color = "#00bfff";
        
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
}

document.getElementById('btn-leave-room').onclick = async () => {
    if (window.isHost && window.currentRoomId) {
        // 房主离开时，解散房间
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', window.currentRoomId));
        } catch(e){}
    }
    leaveRoom();
};

function leaveRoom() {
    if (window.currentRoomUnsub) { window.currentRoomUnsub(); window.currentRoomUnsub = null; }
    window.currentRoomId = null; window.isHost = false;
    isGameStarting = false;
    
    document.getElementById('room-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    if (window.game && window.game.state === 'PLAYING') {
        window.game.state = 'MENU';
        document.getElementById('game-ui').classList.add('hidden');
    }
}
