/**
 * Socket.io game-state synchronization and online screen wiring.
 * The host simulates the match; the challenger sends inputs and renders host snapshots.
 */

window.myUserName = localStorage.getItem('otokojuku_username') || '';
window.mySelectedHero = window.game?.p1Choice || 'Noae';
window.currentMatchId = null;
window.onlineMatchRole = null;
window.isHost = false;
const ONLINE_STATE_INTERVAL_MS = 33;
const ONLINE_PARTICLE_SNAPSHOT_LIMIT = 12;
const ONLINE_REMOTE_BINDS = {
    left: 'ONLINE_REMOTE_LEFT',
    right: 'ONLINE_REMOTE_RIGHT',
    jump: 'ONLINE_REMOTE_JUMP',
    down: 'ONLINE_REMOTE_DOWN',
    attack: 'ONLINE_REMOTE_ATTACK',
    super: 'ONLINE_REMOTE_SUPER',
    switch: 'ONLINE_REMOTE_SWITCH',
    extra: 'ONLINE_REMOTE_EXTRA'
};

window.ONLINE_REMOTE_BINDS = ONLINE_REMOTE_BINDS;

function getOnlineP1Binds() {
    return window.currentBinds?.p1 || (typeof currentBinds !== 'undefined' ? currentBinds.p1 : null);
}

function updateLoginStatus(message, isError = false) {
    const status = document.getElementById('login-status');
    if (!status) return;
    status.innerText = message;
    status.style.color = isError ? '#ff5252' : '#aaa';
}

function updateOnlineHeroLabel() {
    const label = document.getElementById('online-current-hero');
    const hero = HEROES[window.mySelectedHero];
    if (label && hero) label.innerText = `Fighter: ${hero.name}`;
}

function appendChat(sender, message, isSystem = false) {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    const row = document.createElement('div');
    row.className = `msg ${isSystem ? 'sys' : ''}`;
    row.innerText = isSystem ? message : `[${sender}]: ${message}`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
}

window.appendChat = appendChat;
window.updateLoginStatus = updateLoginStatus;
window.updateOnlineHeroLabel = updateOnlineHeroLabel;

function collectLocalOnlineInputs() {
    // In online duels each player is alone on their own keyboard, so the local
    // machine always reads the P1/WASD-style bindings regardless of host/client role.
    const binds = getOnlineP1Binds();
    if (!binds) return {};
    return {
        left: !!window.keys[binds.left],
        right: !!window.keys[binds.right],
        jump: !!window.keys[binds.jump],
        down: !!window.keys[binds.down],
        attack: !!window.keys[binds.attack],
        super: !!window.keys[binds.super],
        pJump: !!window.keysPressed[binds.jump],
        pAttack: !!window.keysPressed[binds.attack],
        pSuper: !!window.keysPressed[binds.super],
        pSwitch: !!window.keysPressed[binds.switch],
        pExtra: !!window.keysPressed[binds.extra]
    };
}

window.applyRemoteOnlineInputs = function(inputs) {
    if (!inputs) return;
    const binds = ONLINE_REMOTE_BINDS;
    window.keys[binds.left] = !!inputs.left;
    window.keys[binds.right] = !!inputs.right;
    window.keys[binds.jump] = !!inputs.jump;
    window.keys[binds.down] = !!inputs.down;
    window.keys[binds.attack] = !!inputs.attack;
    window.keys[binds.super] = !!inputs.super;
    if (inputs.pJump) window.keysPressed[binds.jump] = true;
    if (inputs.pAttack) window.keysPressed[binds.attack] = true;
    if (inputs.pSuper) window.keysPressed[binds.super] = true;
    if (inputs.pSwitch) window.keysPressed[binds.switch] = true;
    if (inputs.pExtra) window.keysPressed[binds.extra] = true;
};
window.collectLocalOnlineInputs = collectLocalOnlineInputs;

function clearOnlineRemoteInputs() {
    Object.values(ONLINE_REMOTE_BINDS).forEach(key => {
        window.keys[key] = false;
        window.keysPressed[key] = false;
    });
}

function setupOnlineControls(game) {
    if (!game) return;
    const p1Binds = getOnlineP1Binds();
    if (!p1Binds) return;
    if (game.p1) game.p1.controls = p1Binds;
    if (!game.p2 || game.p2 === game.p1) return;
    game.p2.controls = game.netRole === 'host' ? ONLINE_REMOTE_BINDS : p1Binds;
}

window.clearOnlineRemoteInputs = clearOnlineRemoteInputs;
window.setupOnlineControls = setupOnlineControls;

if (window.Game && !window.Game.prototype.socketSyncPatched) {
    const entityClasses = {
        ...(typeof Fighter !== 'undefined' ? { Fighter } : {}),
        ...(typeof Entity !== 'undefined' ? { Entity } : {}),
        ...(typeof Particle !== 'undefined' ? { Particle } : {}),
        ...(typeof SwordShadow !== 'undefined' ? { SwordShadow } : {}),
        ...(typeof KuroDecoy !== 'undefined' ? { KuroDecoy } : {}),
        ...(typeof UkonShadow !== 'undefined' ? { UkonShadow } : {}),
        ...(typeof PeachTree !== 'undefined' ? { PeachTree } : {}),
        ...(typeof GiantSword !== 'undefined' ? { GiantSword } : {}),
        ...(typeof LandMine !== 'undefined' ? { LandMine } : {}),
        ...(typeof Minecart !== 'undefined' ? { Minecart } : {}),
        ...(typeof Hazard !== 'undefined' ? { Hazard } : {}),
        ...(typeof FireDragon !== 'undefined' ? { FireDragon } : {}),
        ...(typeof Projectile !== 'undefined' ? { Projectile } : {}),
        ...(typeof TimeAnchor !== 'undefined' ? { TimeAnchor } : {}),
        ...(typeof TemporalEcho !== 'undefined' ? { TemporalEcho } : {}),
        ...(typeof HeavensThunder !== 'undefined' ? { HeavensThunder } : {}),
        ...(typeof LaegonLightning !== 'undefined' ? { LaegonLightning } : {}),
        ...(typeof LaegonHammerStrike !== 'undefined' ? { LaegonHammerStrike } : {}),
        ...(typeof LaegonHammer !== 'undefined' ? { LaegonHammer } : {}),
        ...(typeof BromExplosive !== 'undefined' ? { BromExplosive } : {}),
        ...(typeof BromBlastCharge !== 'undefined' ? { BromBlastCharge } : {}),
        ...(typeof BromStickyBomb !== 'undefined' ? { BromStickyBomb } : {}),
        ...(typeof MechanismNode !== 'undefined' ? { MechanismNode } : {}),
        ...(typeof MoriEnergyWire !== 'undefined' ? { MoriEnergyWire } : {}),
        ...(typeof MechanicFanBlade !== 'undefined' ? { MechanicFanBlade } : {}),
        ...(typeof MoriTrap !== 'undefined' ? { MoriTrap } : {}),
        ...(typeof ThousandMechanisms !== 'undefined' ? { ThousandMechanisms } : {}),
        ...(typeof GelannFlameCone !== 'undefined' ? { GelannFlameCone } : {}),
        ...(typeof GelannArrowRain !== 'undefined' ? { GelannArrowRain } : {}),
        ...(typeof RokaCannonball !== 'undefined' ? { RokaCannonball } : {}),
        ...(typeof RokaMortarShell !== 'undefined' ? { RokaMortarShell } : {}),
        ...(typeof TemporalBolt !== 'undefined' ? { TemporalBolt } : {}),
        ...(typeof VossTemporalDouble !== 'undefined' ? { VossTemporalDouble } : {}),
        ...(typeof DemolitionZone !== 'undefined' ? { DemolitionZone } : {}),
        ...(typeof TitanAxe !== 'undefined' ? { TitanAxe } : {}),
        ...(typeof GravityWell !== 'undefined' ? { GravityWell } : {}),
        ...(typeof ChiqPath !== 'undefined' ? { ChiqPath } : {}),
        ...(typeof D2FDrone !== 'undefined' ? { D2FDrone } : {}),
        ...(typeof D2FTargetBeacon !== 'undefined' ? { D2FTargetBeacon } : {}),
        ...(typeof D2FGiantRobot !== 'undefined' ? { D2FGiantRobot } : {}),
        ...(typeof DogelChainHook !== 'undefined' ? { DogelChainHook } : {}),
        ...(typeof LapisStone !== 'undefined' ? { LapisStone } : {}),
        ...(typeof ToniaGrenade !== 'undefined' ? { ToniaGrenade } : {}),
        ...(typeof ToniaMissile !== 'undefined' ? { ToniaMissile } : {}),
        ...(typeof BossBase !== 'undefined' ? { BossBase } : {}),
        ...(typeof BossLaserStrike !== 'undefined' ? { BossLaserStrike } : {}),
        ...(typeof TyranntBoss !== 'undefined' ? { TyranntBoss } : {}),
        ...(typeof BossFireDemon !== 'undefined' ? { BossFireDemon } : {}),
        ...(typeof DragonBoss !== 'undefined' ? { DragonBoss } : {}),
        ...(typeof BossKnight !== 'undefined' ? { BossKnight } : {}),
        ...(typeof LibertusBoss !== 'undefined' ? { LibertusBoss } : {}),
        ...(typeof AbyssTentacle !== 'undefined' ? { AbyssTentacle } : {}),
        ...(typeof AbyssWave !== 'undefined' ? { AbyssWave } : {}),
        ...(typeof AbyssBoss !== 'undefined' ? { AbyssBoss } : {}),
        ...(typeof ChronosShockwave !== 'undefined' ? { ChronosShockwave } : {}),
        ...(typeof TimeFragment !== 'undefined' ? { TimeFragment } : {}),
        ...(typeof ChronosBoss !== 'undefined' ? { ChronosBoss } : {}),
        ...(typeof MortemSkeleton !== 'undefined' ? { MortemSkeleton } : {}),
        ...(typeof SoulHarvest !== 'undefined' ? { SoulHarvest } : {}),
        ...(typeof MortemBoss !== 'undefined' ? { MortemBoss } : {}),
        ...(typeof Minion !== 'undefined' ? { Minion } : {}),
        ...(typeof Skeleton !== 'undefined' ? { Skeleton } : {}),
        ...(typeof Puppet !== 'undefined' ? { Puppet } : {}),
        ...(typeof Hurricane !== 'undefined' ? { Hurricane } : {}),
        ...(typeof LakEarthWall !== 'undefined' ? { LakEarthWall } : {}),
        ...(typeof LakShockwave !== 'undefined' ? { LakShockwave } : {}),
        ...(typeof LakMountainBreaker !== 'undefined' ? { LakMountainBreaker } : {}),
        ...(typeof PatThread !== 'undefined' ? { PatThread } : {}),
        ...(typeof PatMarionette !== 'undefined' ? { PatMarionette } : {}),
        ...(typeof FengQigong !== 'undefined' ? { FengQigong } : {}),
        ...(typeof FengWindWave !== 'undefined' ? { FengWindWave } : {}),
        ...(typeof PiashPellet !== 'undefined' ? { PiashPellet } : {}),
        ...(typeof PiashGrapple !== 'undefined' ? { PiashGrapple } : {}),
        ...(typeof PiashRopeSwing !== 'undefined' ? { PiashRopeSwing } : {}),
        ...(typeof OcelFeatheredSerpent !== 'undefined' ? { OcelFeatheredSerpent } : {}),
        ...(typeof OcelRitualZone !== 'undefined' ? { OcelRitualZone } : {}),
        ...(typeof OcelFifthSun !== 'undefined' ? { OcelFifthSun } : {}),
        ...(typeof ElectromagneticMatrix !== 'undefined' ? { ElectromagneticMatrix } : {}),
        ...(typeof MagneticRepulsion !== 'undefined' ? { MagneticRepulsion } : {}),
        ...(typeof MatrixBombardment !== 'undefined' ? { MatrixBombardment } : {}),
        ...(typeof BlackSpike !== 'undefined' ? { BlackSpike } : {}),
        ...(typeof BlackShard !== 'undefined' ? { BlackShard } : {}),
        ...(typeof HellHand !== 'undefined' ? { HellHand } : {}),
        ...(typeof HellTearEffect !== 'undefined' ? { HellTearEffect } : {}),
        ...(typeof GateOfHell !== 'undefined' ? { GateOfHell } : {}),
        ...(typeof NerathResurrection !== 'undefined' ? { NerathResurrection } : {}),
    };

    // Preserve shared references and nested attack data without serializing AI brains or controls.
    const entityIds = new WeakMap();
    let nextEntityId = 1;
    window.Game.prototype.exportState = function() {
        const nodes = [];
        const seen = new Map();
        const encode = value => {
            if (value === null || typeof value !== 'object') return value;
            if (seen.has(value)) return { ref: seen.get(value) };
            const ref = nodes.length;
            seen.set(value, ref);
            const type = Array.isArray(value) ? 'Array' : value.constructor?.name || 'Object';
            if (!entityIds.has(value)) entityIds.set(value, nextEntityId++);
            const node = { type, id: entityIds.get(value), data: null };
            nodes.push(node);
            if (value instanceof Map) node.data = [...value].map(([k, v]) => [encode(k), encode(v)]);
            else if (value instanceof Set || Array.isArray(value)) node.data = [...value].map(encode);
            else {
                node.data = {};
                for (const key of Object.keys(value)) {
                    if (['aiBrain', 'controls', 'hitTargets', 'aiTarget'].includes(key)) continue;
                    if (typeof value[key] !== 'function') node.data[key] = encode(value[key]);
                }
            }
            return { ref };
        };
        const root = encode({
            p1: this.p1, p2: this.p2,
            projectiles: this.projectiles, minions: this.minions,
            particles: this.particles.slice(-ONLINE_PARTICLE_SNAPSHOT_LIMIT),
            hazards: this.hazards, hurricane: this.hurricane,
            camera: this.camera, hitstop: this.hitstop, screenShakeTimer: this.screenShakeTimer,
            screenShakeMagnitude: this.screenShakeMagnitude
        });
        return { version: 2, nodes, root };
    };

    window.Game.prototype.importState = function(state) {
        if (state?.version !== 2 || !Array.isArray(state.nodes) || !this.p1 || !this.p2) return;
        const rootNode = state.nodes[state.root.ref];
        if (!rootNode?.data?.p1 || !rootNode?.data?.p2) return;
        const objects = state.nodes.map((node, index) => {
            if (index === rootNode.data.p1.ref) return this.p1;
            if (index === rootNode.data.p2.ref) return this.p2;
            if (node.type === 'Array') return [];
            if (node.type === 'Map') return new Map();
            if (node.type === 'Set') return new Set();
            return Object.create(entityClasses[node.type]?.prototype || Object.prototype);
        });
        const decode = value => value && typeof value === 'object' ? objects[value.ref] : value;
        state.nodes.forEach((node, index) => {
            const object = objects[index];
            if (node.type === 'Map') node.data.forEach(([k, v]) => object.set(decode(k), decode(v)));
            else if (node.type === 'Set') node.data.forEach(value => object.add(decode(value)));
            else if (node.type === 'Array') node.data.forEach(value => object.push(decode(value)));
            else {
                for (const [key, value] of Object.entries(node.data)) {
                    if (['__proto__', 'constructor', 'prototype', 'controls'].includes(key)) continue;
                    object[key] = decode(value);
                }
                Object.defineProperty(object, 'onlineEntityId', { value: node.id, configurable: true });
            }
        });
        const root = objects[state.root.ref];
        Object.assign(this, root);
        this.fighters = [this.p1, this.p2];
        setupOnlineControls(this);
    };

    window.Game.prototype.receiveOnlineState = function(state) {
        if (state?.version !== 2) return;
        const now = performance.now();
        this.onlineFrames ||= [];
        this.onlineFrames.push({ time: now, state });
        if (this.onlineFrames.length > 8) this.onlineFrames.shift();
        if (this.onlineFrames.length === 1) this.importState(state);
    };

    window.Game.prototype.interpolateOnlineState = function() {
        const frames = this.onlineFrames || [];
        if (!frames.length) return;
        // One snapshot of buffering smooths both fighters without speculative combat.
        const time = performance.now() - ONLINE_STATE_INTERVAL_MS;
        while (frames.length > 2 && frames[1].time <= time) frames.shift();
        const a = frames[0], b = frames[1] || a;
        const alpha = a === b ? 1 : Math.max(0, Math.min(1, (time - a.time) / Math.max(1, b.time - a.time)));
        this.importState(alpha >= 1 ? b.state : a.state);
        if (alpha >= 1 || a === b) return;
        const nextNodes = new Map(b.state.nodes.map(node => [node.id, node]));
        for (const entity of [this.p1, this.p2, ...this.projectiles, ...this.minions, ...this.particles, ...this.hazards]) {
            const next = nextNodes.get(entity.onlineEntityId)?.data;
            if (!next || Math.abs(next.x - entity.x) > 180 || Math.abs(next.y - entity.y) > 180) continue;
            for (const key of ['x', 'y']) {
                if (Number.isFinite(entity[key]) && Number.isFinite(next[key])) entity[key] += (next[key] - entity[key]) * alpha;
            }
        }
    };

    const originalUpdate = window.Game.prototype.update;
    window.Game.prototype.update = function(dt) {
        if (this.isOnline) setupOnlineControls(this);
        if (this.isSpectator || (this.isOnline && this.netRole === 'client')) {
            if (!this.isSpectator) window.sendBackendInputs?.(collectLocalOnlineInputs());
            this.interpolateOnlineState();
            this.updateUI();
            return;
        }

        if (this.isOnline && this.hitstop > 0) this.hitstop = Math.max(0, this.hitstop - dt);
        else originalUpdate.call(this, dt);
        if (this.isOnline && this.netRole === 'host') {
            this.onlineStateTimer = (this.onlineStateTimer || 0) + dt;
            if (this.onlineStateTimer >= ONLINE_STATE_INTERVAL_MS) {
                this.onlineStateTimer %= ONLINE_STATE_INTERVAL_MS;
                window.sendBackendState?.(this.exportState());
            }
        }
    };

    const originalEndGame = window.Game.prototype.endGame;
    window.Game.prototype.endGame = function(winnerText) {
        const wasPlaying = this.state !== 'GAMEOVER';
        originalEndGame.call(this, winnerText);
        if (wasPlaying && this.isOnline && this.netRole === 'host') {
            window.finishBackendMatch?.(winnerText, this.exportState());
        }
    };

    window.Game.prototype.socketSyncPatched = true;
}

document.getElementById('btn-online').onclick = () => {
    if (window.game?.heroSelectUI) {
        window.game.heroSelectUI.open('online');
        return;
    }
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    window.mySelectedHero = window.game?.p1Choice || window.mySelectedHero || 'Noae';
    const input = document.getElementById('username-input');
    if (input && window.myUserName) input.value = window.myUserName;
    updateOnlineHeroLabel();
    updateLoginStatus('Connecting to the Duel server...');
    window.initMultiplayerClient?.();
};

document.getElementById('btn-login-cancel').onclick = () => {
    window.leaveMatchmakingQueue?.();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
};

document.getElementById('btn-login').onclick = () => {
    const name = document.getElementById('username-input').value.trim();
    if (name.length < 2) {
        updateLoginStatus('Nickname must contain at least 2 characters.', true);
        return;
    }
    window.myUserName = name.slice(0, 12);
    window.mySelectedHero = window.game?.p1Choice || window.mySelectedHero || 'Noae';
    localStorage.setItem('otokojuku_username', window.myUserName);
    updateOnlineHeroLabel();
    updateLoginStatus('Registering fighter...');
    window.registerBackendUser?.(window.myUserName);
};

updateOnlineHeroLabel();

// Losing keyboard focus must not leave movement or charged attacks held remotely.
window.addEventListener('blur', () => {
    if (!window.game?.isOnline) return;
    for (const key of Object.keys(window.keys)) window.keys[key] = false;
    for (const key of Object.keys(window.keysPressed)) delete window.keysPressed[key];
    if (window.game.netRole === 'client') window.sendBackendInputs?.({});
});
