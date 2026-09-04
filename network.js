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
    const localFighter = window.game?.getLocalControlledFighter?.();
    const binds = localFighter?.controls || window.currentBinds.p1;
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
    const binds = window.currentBinds.p2;
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

if (window.Game && !window.Game.prototype.socketSyncPatched) {
    const entityClasses = {
        Particle,
        SwordShadow,
        KuroDecoy,
        UkonShadow,
        PeachTree,
        GiantSword,
        LandMine,
        Minecart,
        Hazard,
        FireDragon,
        Projectile,
        GravityWell,
        ChiqPath,
        D2FDrone,
        D2FTargetBeacon,
        D2FGiantRobot,
        Minion,
        Skeleton,
        Puppet,
        Hurricane
    };

    const cloneEntity = entity => {
        if (!entity) return null;
        const clone = { classType: entity.constructor.name };
        for (const key in entity) {
            if (['owner', 'hitTargets', 'grappledBy', 'grappleTarget', 'aiTarget', 'aiBrain', 'controls'].includes(key)) continue;
            const value = entity[key];
            if (typeof value !== 'function' && (value === null || typeof value !== 'object')) clone[key] = value;
            else if (key === 'buffs') clone.buffs = { ...value };
            else if (Array.isArray(value) && value.every(item => item === null || typeof item !== 'object')) clone[key] = [...value];
        }
        if (entity.owner) clone.ownerId = entity.owner.id;
        return clone;
    };

    window.Game.prototype.exportState = function() {
        return {
            p1: cloneEntity(this.p1),
            p2: cloneEntity(this.p2),
            projectiles: this.projectiles.map(cloneEntity),
            minions: this.minions.map(cloneEntity),
            particles: this.particles.slice(-ONLINE_PARTICLE_SNAPSHOT_LIMIT).map(cloneEntity),
            hazards: this.hazards.map(cloneEntity),
            hurricane: cloneEntity(this.hurricane),
            hitstop: this.hitstop,
            screenShakeTimer: this.screenShakeTimer,
            screenShakeMagnitude: this.screenShakeMagnitude,
            camera: { ...(this.camera || { x: 0 }) }
        };
    };

    window.Game.prototype.importState = function(state) {
        if (!state || !this.p1 || !this.p2 || !state.p1 || !state.p2) return;
        const owners = { p1: this.p1, p2: this.p2 };
        const hydrate = data => {
            if (!data) return null;
            const EntityClass = entityClasses[data.classType];
            const entity = EntityClass ? Object.create(EntityClass.prototype) : {};
            Object.assign(entity, data);
            if (data.ownerId) entity.owner = owners[data.ownerId] || null;
            if (data.buffs) entity.buffs = { ...data.buffs };
            return entity;
        };
        const mergeFighter = (fighter, data) => {
            for (const key in data) {
                if (['classType', 'ownerId', 'controls'].includes(key)) continue;
                if (key === 'buffs') fighter.buffs = { ...data.buffs };
                else fighter[key] = data[key];
            }
        };

        mergeFighter(this.p1, state.p1);
        mergeFighter(this.p2, state.p2);
        this.fighters = [this.p1, this.p2];
        this.projectiles = (state.projectiles || []).map(hydrate);
        this.minions = (state.minions || []).map(hydrate);
        this.particles = (state.particles || []).map(hydrate);
        this.hazards = (state.hazards || []).map(hydrate);
        this.hurricane = hydrate(state.hurricane);
        this.hitstop = state.hitstop || 0;
        this.screenShakeTimer = state.screenShakeTimer || 0;
        this.screenShakeMagnitude = state.screenShakeMagnitude || 0;
        if (state.camera) this.camera = { ...this.camera, ...state.camera };
    };

    const originalUpdate = window.Game.prototype.update;
    window.Game.prototype.update = function(dt) {
        if (this.isOnline && this.netRole === 'client') {
            window.sendBackendInputs?.(collectLocalOnlineInputs());
            this.updateUI();
            return;
        }

        originalUpdate.call(this, dt);
        if (this.isOnline && this.netRole === 'host') {
            this.onlineStateTimer = (this.onlineStateTimer || 0) + dt;
            if (this.onlineStateTimer >= ONLINE_STATE_INTERVAL_MS) {
                this.onlineStateTimer = 0;
                window.sendBackendState?.(this.exportState());
            }
        }
    };

    const originalEndGame = window.Game.prototype.endGame;
    window.Game.prototype.endGame = function(winnerText) {
        const wasPlaying = this.state !== 'GAMEOVER';
        originalEndGame.call(this, winnerText);
        if (wasPlaying && this.isOnline && this.netRole === 'host') {
            window.finishBackendMatch?.(winnerText);
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
