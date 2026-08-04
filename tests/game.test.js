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
