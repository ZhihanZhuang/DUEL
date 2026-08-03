const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadArenaConfig() {
    const context = {
        window: { innerWidth: 1200, innerHeight: 800, addEventListener() {} },
        localStorage: { getItem: () => null, setItem() {} },
        document: { getElementById: () => null },
        console
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
    vm.runInContext(source, context, { filename: 'config.js' });
    return context;
}

test('four selectable duel arenas fit the viewport and have distinct layouts', () => {
    const context = loadArenaConfig();
    const ids = ['dojo', 'cliff', 'foundry', 'citadel'];
    const signatures = new Set();

    for (const id of ids) {
        const layout = context.buildArenaLayout(id, 1200, 800);
        assert.equal(layout.worldWidth, 1200);
        assert.equal(layout.groundY, 700);
        assert.ok(layout.platforms.length >= 3);
        assert.ok(layout.platforms.every(platform => platform.x >= 0 && platform.x + platform.w <= layout.worldWidth));
        signatures.add(layout.platforms.map(platform => `${platform.x}:${platform.y}:${platform.w}`).join('|'));
    }

    assert.equal(signatures.size, ids.length);
});

test('survival arena is a wide navigable world with tiered platforms', () => {
    const context = loadArenaConfig();
    const layout = context.buildArenaLayout('grand_arena', 1200, 800);
    const elevations = [...new Set(layout.platforms.map(platform => layout.groundY - platform.y))].sort((a, b) => a - b);

    assert.ok(layout.worldWidth >= 2600);
    assert.ok(layout.worldWidth > 1200 * 2);
    assert.equal(layout.platforms.length, 10);
    assert.ok(elevations.length >= 3);
    for (let index = 1; index < elevations.length; index++) {
        assert.ok(elevations[index] - elevations[index - 1] <= 180, 'platform tiers exceed the AI jump route');
    }
});

test('duel platforms remain inside a narrow mobile arena', () => {
    const context = loadArenaConfig();
    for (const id of ['dojo', 'cliff', 'foundry', 'citadel']) {
        const layout = context.buildArenaLayout(id, 390, 844);
        assert.ok(layout.platforms.every(platform => platform.x >= 0 && platform.x + platform.w <= layout.worldWidth));
    }
});
