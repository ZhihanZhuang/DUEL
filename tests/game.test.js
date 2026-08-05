const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function makeElement(hidden = true) {
    const classes = new Set(hidden ? ['hidden'] : []);
    return {
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            contains: name => classes.has(name),
            toggle(name, force) {
                const enabled = force === undefined ? !classes.has(name) : force;
                if (enabled) classes.add(name);
                else classes.delete(name);
                return enabled;
            }
        },
        dataset: {},
        style: {},
        innerText: '',
        innerHTML: ''
    };
}

function loadGameClass() {
    const elements = new Map();
    const getElement = id => {
        if (!elements.has(id)) elements.set(id, makeElement(id !== 'menu-screen'));
        return elements.get(id);
    };
    const animation = { requested: [], cancelled: [] };
    let settingsBuilds = 0;
    const context = {
        window: { innerWidth: 1280, innerHeight: 720, addEventListener() {} },
        document: { getElementById: getElement },
        localStorage: { getItem: () => null, setItem() {} },
        keys: {},
        keysPressed: {},
        currentBinds: {
            p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', attack: 'Space', super: 'KeyE', switch: 'KeyT', extra: 'KeyG' },
            p2: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', attack: 'Numpad9', super: 'NumpadEnter', switch: 'Numpad8', extra: 'Numpad7' }
        },
        performance: { now: () => 4321 },
        requestAnimationFrame(callback) {
            animation.requested.push(callback);
            return 100 + animation.requested.length;
        },
        cancelAnimationFrame(id) { animation.cancelled.push(id); },
        clearTimeout() {},
        console,
        buildSettingsUI() { settingsBuilds++; }
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
    const classOnlySource = source.slice(0, source.indexOf('var game = new Game();'));
    vm.runInContext(classOnlySource, context, { filename: 'game.js' });
    return { context, Game: context.window.Game, elements, getElement, animation, getSettingsBuilds: () => settingsBuilds };
}

function makeLifecycleGame(harness) {
    const game = Object.create(harness.Game.prototype);
    Object.assign(game, {
        state: 'PLAYING',
        isSinglePlayer: true,
        isBattleRoyale: false,
        isSpectator: false,
        isOnline: false,
        loopGeneration: 4,
        animationFrameId: 77,
        endGameTimer: null,
        settingsReturnToPause: false,
        p1: { controls: harness.context.currentBinds.p1 },
        aiFighters: [{ controls: { left: 'AI_LEFT', attack: 'AI_ATTACK' } }],
        loop() {}
    });
    return game;
}

test('single-player pause freezes one loop and resume starts exactly one new frame', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);
    harness.context.keys.KeyA = true;
    harness.context.keys.AI_LEFT = true;
    harness.context.keysPressed.Space = true;

    game.pauseGame();

    assert.equal(game.state, 'PAUSED');
    assert.equal(game.loopGeneration, 5);
    assert.equal(game.animationFrameId, null);
    assert.deepEqual(harness.animation.cancelled, [77]);
    assert.equal(harness.getElement('pause-screen').classList.contains('hidden'), false);
    assert.equal(Object.keys(harness.context.keys).length, 0);
    assert.equal(Object.keys(harness.context.keysPressed).length, 0);

    game.resumeGame();
    game.resumeGame();

    assert.equal(game.state, 'PLAYING');
    assert.equal(game.lastTime, 4321);
    assert.equal(harness.animation.requested.length, 1);
    assert.equal(game.animationFrameId, 101);
    assert.equal(harness.getElement('pause-screen').classList.contains('hidden'), true);
});

test('match lifecycle pauses, resumes, and stops arena music', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);
    const audioEvents = [];
    game.audio = {
        pauseMusic: () => audioEvents.push('pause'),
        resumeMusic: () => audioEvents.push('resume'),
        stopMusic: () => audioEvents.push('stop')
    };

    game.pauseGame();
    game.resumeGame();
    game.returnToMenu();

    assert.deepEqual(audioEvents, ['pause', 'resume', 'stop']);
});

test('pause is ignored for local multiplayer and outside an active match', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);

    game.isSinglePlayer = false;
    game.pauseGame();
    assert.equal(game.state, 'PLAYING');
    assert.deepEqual(harness.animation.cancelled, []);

    game.isSinglePlayer = true;
    game.state = 'GAMEOVER';
    game.pauseGame();
    assert.equal(game.state, 'GAMEOVER');
    assert.deepEqual(harness.animation.cancelled, []);
});

test('pause options apply current bindings and return to the pause menu', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);
    game.state = 'PAUSED';

    game.openSettings(true);
    assert.equal(harness.getSettingsBuilds(), 1);
    assert.equal(harness.getElement('pause-screen').classList.contains('hidden'), true);
    assert.equal(harness.getElement('settings-screen').classList.contains('hidden'), false);

    const reboundControls = { ...harness.context.currentBinds.p1, attack: 'KeyF' };
    harness.context.currentBinds.p1 = reboundControls;
    game.closeSettings();

    assert.equal(game.p1.controls, reboundControls);
    assert.equal(harness.getElement('settings-screen').classList.contains('hidden'), true);
    assert.equal(harness.getElement('pause-screen').classList.contains('hidden'), false);
    assert.equal(game.settingsReturnToPause, false);
});

test('back to menu clears pause and match UI state', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);
    game.state = 'PAUSED';
    harness.getElement('pause-screen').classList.remove('hidden');
    harness.getElement('game-ui').classList.remove('hidden');
    harness.getElement('game-ui').classList.add('survival-mode');
    harness.getElement('btn-pause-menu').classList.remove('hidden');

    game.returnToMenu();

    assert.equal(game.state, 'MENU');
    assert.equal(game.isSinglePlayer, false);
    assert.equal(game.isBattleRoyale, false);
    assert.equal(harness.getElement('menu-screen').classList.contains('hidden'), false);
    assert.equal(harness.getElement('game-ui').classList.contains('hidden'), true);
    assert.equal(harness.getElement('pause-screen').classList.contains('hidden'), true);
    assert.equal(harness.getElement('btn-pause-menu').classList.contains('hidden'), true);
    assert.equal(harness.getElement('game-ui').classList.contains('survival-mode'), false);
});

test('fully invisible Kuro redirects targeting to the moving shade', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);
    const attacker = { id: 'attacker', x: 100, y: 0, w: 40, h: 70, dead: false, isCPU: false };
    const kuro = {
        id: 'kuro', heroName: 'Kuro', x: 400, y: 0, w: 38, h: 70, vx: 0,
        dead: false, kuroCloaked: true, kuroAbsoluteCloakTimer: 0,
        isKuroFullyInvisible() {
            return this.kuroCloaked && (this.kuroAbsoluteCloakTimer > 0 || Math.hypot(this.vx || 0, this.vy || 0) <= 1.2);
        }
    };
    game.fighters = [attacker, kuro];
    game.minions = [];

    assert.equal(game.getEnemyOf(attacker), null);

    kuro.vx = 4;
    assert.equal(game.getEnemyOf(attacker), kuro);

    kuro.kuroAbsoluteCloakTimer = 3000;
    assert.equal(game.getEnemyOf(attacker), null);

    const shade = { type: 'kuro_decoy', owner: kuro, dead: false };
    game.minions.push(shade);
    assert.equal(game.getEnemyOf(attacker), shade);
});

test('local viewing perspective follows online role and excludes spectators', () => {
    const harness = loadGameClass();
    const game = makeLifecycleGame(harness);
    game.p1 = { id: 'p1' };
    game.p2 = { id: 'p2' };

    assert.equal(game.getLocalControlledFighter(), game.p1);

    game.isOnline = true;
    game.netRole = 'client';
    assert.equal(game.getLocalControlledFighter(), game.p2);

    game.netRole = 'host';
    assert.equal(game.getLocalControlledFighter(), game.p1);

    game.isSpectator = true;
    assert.equal(game.getLocalControlledFighter(), null);
});

test('match start exposes the Menu button only in single-player modes', () => {
    const harness = loadGameClass();
    const { context } = harness;
    context.CANVAS_W = 1280;
    context.CANVAS_H = 720;
    context.GROUND_Y = 620;
    context.PLATFORMS = [];
    context.ARENAS = {
        dojo: { name: 'Dojo' },
        grand_arena: { name: 'Grand Arena' }
    };
    context.HEROES = {
        Noae: { name: 'Noae' },
        Wolf: { name: 'Wolf' }
    };
    context.buildArenaLayout = arenaId => ({
        id: arenaId,
        arena: context.ARENAS[arenaId],
        worldWidth: 1280,
        worldHeight: 720,
        groundY: 620,
        platforms: []
    });
    context.Fighter = class {
        constructor(id, heroName, x, controls) {
            Object.assign(this, {
                id, heroName, x, controls,
                y: 0, w: 40, h: 70, vx: 0,
                maxHp: 100, hp: 100, dead: false,
                superCooldown: 0, superCooldownMax: 10000
            });
        }
    };

    const game = makeLifecycleGame(harness);
    Object.assign(game, {
        selectedArena: 'dojo',
        activeArena: context.ARENAS.dojo,
        activeArenaId: 'dojo',
        camera: { x: 0 },
        canvas: { width: 1280, height: 720, dataset: {} },
        p1Choice: 'Noae',
        p2Choice: 'Wolf',
        fighters: [],
        aiFighters: []
    });

    game.startGame(false);
    assert.equal(harness.getElement('btn-pause-menu').classList.contains('hidden'), true);

    game.startGame(true, 'duel');
    assert.equal(harness.getElement('btn-pause-menu').classList.contains('hidden'), false);
});

function configureBossGameHarness(harness) {
    const { context } = harness;
    context.CANVAS_W = 1280;
    context.CANVAS_H = 720;
    context.GROUND_Y = 620;
    context.PLATFORMS = [];
    context.ARENAS = {
        dojo: { name: 'Dojo' },
        grand_arena: { name: 'Grand Warfield' }
    };
    context.BOSSES = {
        tyrannt: { name: 'TYRANNT', color: '#35d5e8', maxHp: 9000 }
    };
    context.HEROES = {
        Noae: { name: 'Noae' },
        Wolf: { name: 'Wolf' }
    };
    context.buildArenaLayout = arenaId => ({
        id: arenaId,
        arena: context.ARENAS[arenaId],
        worldWidth: arenaId === 'grand_arena' ? 2800 : 1280,
        worldHeight: 720,
        groundY: 620,
        platforms: []
    });
    context.Fighter = class {
        constructor(id, heroName, x, controls) {
            Object.assign(this, {
                id, heroName, x, controls,
                y: 550, w: 40, h: 70, vx: 0,
                maxHp: 100, hp: 100, dead: false,
                superCooldown: 0, superCooldownMax: 10000,
                buffs: {}
            });
        }
    };
    context.createBoss = (bossId, x, groundY) => ({
        id: `boss-${bossId}`, bossId, displayName: 'TYRANNT', type: 'boss', isBoss: true,
        x, y: groundY - 170, w: 230, h: 170, hp: 9000, maxHp: 9000, dead: false,
        update() {}, draw() {}, takeDamage() {}
    });

    const game = makeLifecycleGame(harness);
    Object.assign(game, {
        selectedArena: 'dojo',
        activeArena: context.ARENAS.dojo,
        activeArenaId: 'dojo',
        camera: { x: 0 },
        canvas: { width: 1280, height: 720, dataset: {} },
        p1Choice: 'Noae',
        p2Choice: 'Wolf',
        bossChoice: 'tyrannt',
        bossPlayerCount: 1,
        fighters: [],
        aiFighters: []
    });
    return game;
}

test('solo Boss Mode starts one player on Grand Warfield with boss HUD and pause', () => {
    const harness = loadGameClass();
    const game = configureBossGameHarness(harness);

    game.startBossGame();

    assert.equal(game.gameMode, 'boss');
    assert.equal(game.activeArenaId, 'grand_arena');
    assert.equal(game.fighters.length, 1);
    assert.equal(game.p2, game.p1);
    assert.equal(game.aiFighters.length, 0);
    assert.equal(game.minions.includes(game.boss), true);
    assert.equal(harness.getElement('hud-p2').classList.contains('hidden'), true);
    assert.equal(harness.getElement('boss-hud').classList.contains('hidden'), false);
    assert.equal(harness.getElement('btn-pause-menu').classList.contains('hidden'), false);
});

test('two-player Boss Mode creates distinct local fighters and remains pausable', () => {
    const harness = loadGameClass();
    const game = configureBossGameHarness(harness);
    game.bossPlayerCount = 2;

    game.startBossGame();
    assert.equal(game.fighters.length, 2);
    assert.notEqual(game.p1, game.p2);
    assert.equal(game.aiFighters.length, 0);
    assert.equal(harness.getElement('hud-p2').classList.contains('hidden'), false);

    game.pauseGame();
    assert.equal(game.state, 'PAUSED');
    assert.equal(harness.getElement('pause-screen').classList.contains('hidden'), false);
});

test('Boss Mode routes player attacks to the boss and boss units to living players', () => {
    const harness = loadGameClass();
    const game = configureBossGameHarness(harness);
    game.startBossGame();

    const bossUnit = { owner: game.boss };
    assert.equal(game.getOpponentsOf(game.p1).length, 1);
    assert.equal(game.getOpponentsOf(game.p1)[0], game.boss);
    assert.equal(game.getOpponentsOf(bossUnit).length, 1);
    assert.equal(game.getOpponentsOf(bossUnit)[0], game.p1);

    game.p1.dead = true;
    assert.equal(game.getOpponentsOf(game.boss).length, 0);
});

test('Boss Mode ends only after all players fall and cleans up boss-owned entities on victory', () => {
    const harness = loadGameClass();
    const game = configureBossGameHarness(harness);
    game.bossPlayerCount = 2;
    game.startBossGame();
    let winner = null;
    game.endGame = text => { winner = text; };

    game.p1.dead = true;
    game.handleFighterDefeat(game.p1, game.boss);
    assert.equal(winner, null);
    game.p2.dead = true;
    game.handleFighterDefeat(game.p2, game.boss);
    assert.equal(winner, 'TYRANNT');

    game.p1.dead = false;
    game.p2.dead = false;
    winner = null;
    const summon = { owner: game.boss, dead: false };
    game.minions.push(summon);
    game.handleBossDefeat(game.boss, game.p1);
    assert.equal(summon.dead, true);
    assert.equal(winner, 'Players');
});

test('Boss Mode camera follows a solo player and centers surviving co-op players', () => {
    const harness = loadGameClass();
    const game = configureBossGameHarness(harness);
    game.isBossMode = true;
    harness.context.CANVAS_W = 2800;
    game.canvas.width = 1000;
    game.p1 = { id: 'p1', x: 1900, y: 0, w: 40, h: 70, vx: 5, dead: false };
    game.p2 = game.p1;
    game.fighters = [game.p1];

    game.updateCamera(1000);
    assert.ok(game.camera.x > 1300);

    game.p2 = { id: 'p2', x: 2300, y: 0, w: 40, h: 70, vx: 0, dead: false };
    game.fighters = [game.p1, game.p2];
    game.camera.x = 0;
    game.updateCamera(1000);
    assert.ok(game.camera.x > 1500 && game.camera.x < 1800);
});
