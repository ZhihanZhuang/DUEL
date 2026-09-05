const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadAudio(stored = '{}') {
    let saved = null;
    const context = {
        window: {},
        document: { getElementById: () => null, addEventListener() {} },
        localStorage: {
            getItem: () => stored,
            setItem: (_key, value) => { saved = value; }
        },
        performance: { now: () => 1000 },
        setInterval: () => 1,
        clearInterval() {},
        console
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'audio.js'), 'utf8');
    vm.runInContext(source, context, { filename: 'audio.js' });
    return { context, audio: context.window.audioManager, getSaved: () => saved };
}

test('audio settings load, clamp, and persist without requiring browser audio support', () => {
    const harness = loadAudio('{"master":0.4,"music":0.3,"sfx":0.8,"muted":true}');
    assert.equal(harness.audio.settings.master, 0.4);
    assert.equal(harness.audio.settings.muted, true);
    assert.doesNotThrow(() => harness.audio.playAttack({ id: 'p1', heroName: 'Roka', x: 0, w: 40 }));

    harness.audio.setVolume('music', 2);
    harness.audio.setMuted(false);
    assert.equal(harness.audio.settings.music, 1);
    assert.equal(harness.audio.settings.muted, false);
    assert.equal(JSON.parse(harness.getSaved()).music, 1);
});

test('every arena receives a distinct procedural music arrangement', () => {
    const { audio } = loadAudio();
    const arenaIds = ['dojo', 'cliff', 'foundry', 'citadel', 'grand_arena'];
    const themes = arenaIds.map(id => audio.getTheme(id));
    assert.equal(new Set(themes.map(theme => theme.bpm)).size, arenaIds.length);
    themes.forEach(theme => {
        assert.equal(theme.melody.length, 16);
        assert.equal(theme.bass.length, 4);
        assert.ok(theme.scale.length >= 6);
    });
});

test('every roster hero has a distinct T and Super sound profile', () => {
    const { audio } = loadAudio();
    const heroes = [
        'Hason', 'Hunter', 'Macu', 'Willi', 'Artu', 'Duke', 'Kadaxi', 'Euclid',
        'Lique', 'Kae', 'Ugo', 'Kila', 'Volt', 'Gensan', 'Noae', 'Wolf',
        'Kuro', 'Sola', 'Nyra', 'Orion', 'Archor', 'Itan', 'D2F1', 'Laegon',
        'Veyra', 'Brom', 'Axeron', 'Ukon', 'Mori', 'Roka', 'Voss', 'Raigo', 'Gelann',
        'Dogel', 'Lapis', 'Tonia', 'Ge', 'Lak', 'Pat', 'Feng', 'Ocel', 'Magnetar'
    ];
    assert.deepEqual(Object.keys(audio.heroProfiles).sort(), heroes.slice().sort());
    assert.equal(new Set(heroes.map(hero => audio.heroProfiles[hero].root)).size, heroes.length);
    for (const hero of heroes) {
        const profile = audio.heroProfiles[hero];
        assert.ok(profile.root > 0);
        assert.ok(['sine', 'square', 'sawtooth', 'triangle'].includes(profile.wave));
        assert.ok(['sine', 'square', 'sawtooth', 'triangle'].includes(profile.accent));
        assert.ok(['lowpass', 'bandpass', 'highpass'].includes(profile.filter));
        assert.ok(profile.direction === 1 || profile.direction === -1);
    }
});

test('entity hit audio shares the confirmed-hit path', () => {
    const { audio } = loadAudio();
    let call = null;
    audio.playHit = (...args) => { call = args; };
    const target = { type: 'puppet' };
    const attacker = { heroName: 'Ukon' };
    audio.playEntityHit(target, attacker, 25, false);
    assert.deepEqual(call, [target, attacker, 25, false]);
});
