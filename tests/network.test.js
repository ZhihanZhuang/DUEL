const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const test = require('node:test');

function loadNetwork() {
    let now = 0;
    const context = {
        console, performance: { now: () => now },
        window: { innerWidth: 1280, innerHeight: 720, addEventListener() {}, Game: class Game {} },
        document: { getElementById: () => ({ style: {}, classList: { add() {}, remove() {} } }) },
        localStorage: { getItem: () => null },
        setTimeout() {}, clearTimeout() {}
    };
    vm.createContext(context);
    for (const file of ['config.js', 'entities.js', 'fighter.js', 'network.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
    }
    vm.runInContext(`
        window.Game.prototype.update = window.Game.prototype.update;
        window.testGame = new window.Game();
        var game = window.testGame;
        game.getFighters = () => [game.p1, game.p2];
        game.getEnemyOf = fighter => fighter === game.p1 ? game.p2 : game.p1;
        Object.assign(window.testGame, {
            p1: new Fighter('p1', 'Noae', 100, currentBinds.p1, true),
            p2: new Fighter('p2', 'Wolf', 900, currentBinds.p2, false),
            projectiles: [], minions: [], particles: [], hazards: [], hurricane: null,
            camera: { x: 0 }, hitstop: 0, screenShakeTimer: 0, screenShakeMagnitude: 0
        });
    `, context);
    return { context, game: context.window.testGame, setTime: value => { now = value; } };
}

test('wire snapshots restore newer attack prototypes, nested arrays, maps and cyclic owner links', () => {
    const { context, game } = loadNetwork();
    vm.runInContext(`
        const g = window.testGame;
        const trap = Object.create(MoriTrap.prototype);
        Object.assign(trap, { owner: g.p1, target: g.p2, x: 200, y: 300, path: [{ x: 10, y: 20 }] });
        g.hazards.push(trap);
        g.p1.linkedTrap = trap;
        g.p2.grappledBy = g.p1;
        g.p1.marks = new Map([[g.p2, { count: 2 }]]);
    `, context);
    const wire = JSON.parse(JSON.stringify(game.exportState()));
    game.importState(wire);
    assert.equal(game.hazards[0].constructor.name, 'MoriTrap');
    assert.equal(typeof game.hazards[0].draw, 'function');
    assert.equal(game.hazards[0].owner, game.p1);
    assert.equal(game.hazards[0].target, game.p2);
    assert.equal(game.p1.linkedTrap, game.hazards[0]);
    assert.equal(game.p2.grappledBy, game.p1);
    assert.equal(game.p1.marks.get(game.p2).count, 2);
    assert.equal(game.hazards[0].path[0].x, 10);
});

test('all selectable heroes survive a JSON snapshot round trip and can draw', () => {
    const { context, game } = loadNetwork();
    const heroes = vm.runInContext('Object.keys(HEROES)', context);
    vm.runInContext(`
        window.testContext = new Proxy({}, { get(target, key) {
            return key in target ? target[key] : (() => new Proxy({}, { get: () => () => {} }));
        }, set(target, key, value) { target[key] = value; return true; } });
    `, context);
    for (const hero of heroes) {
        context.heroUnderTest = hero;
        vm.runInContext("window.testGame.p1 = new Fighter('p1', heroUnderTest, 100, currentBinds.p1, true)", context);
        game.importState(JSON.parse(JSON.stringify(game.exportState())));
        assert.doesNotThrow(() => game.p1.draw(context.window.testContext), hero);
    }
});

test('snapshot interpolation smooths movement and snaps teleports without overshooting', () => {
    const { game, setTime } = loadNetwork();
    const a = game.exportState();
    game.p1.x = 200;
    const b = game.exportState();
    game.receiveOnlineState(a);
    setTime(33); game.receiveOnlineState(b);
    setTime(49.5); game.interpolateOnlineState();
    assert.equal(game.p1.x, 150);
    setTime(1000); game.interpolateOnlineState();
    assert.equal(game.p1.x, 200);
    game.p1.x = 900;
    const teleport = game.exportState();
    setTime(1033); game.receiveOnlineState(teleport);
    setTime(1066); game.interpolateOnlineState();
    assert.equal(game.p1.x, 900);
});
