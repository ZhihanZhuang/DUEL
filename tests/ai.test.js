const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class Minion {}

function loadAI() {
    const deterministicMath = Object.create(Math);
    deterministicMath.random = () => 0.5;
    const context = {
        window: {},
        Math: deterministicMath,
        Minion,
        CANVAS_W: 1280,
        GROUND_Y: 660,
        PLATFORMS: [
            { x: 300, y: 480, w: 400, h: 20, type: 'center' },
            { x: 100, y: 310, w: 250, h: 20, type: 'side' }
        ],
        keys: {},
        keysPressed: {},
        currentBinds: { p1: { attack: 'P1_ATTACK', jump: 'P1_JUMP', super: 'P1_SUPER' } },
        localStorage: { getItem: () => 'normal' }
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'ai.js'), 'utf8');
    vm.runInContext(source, context, { filename: 'frontend/ai.js' });
    return context;
}

function makeControls(prefix) {
    return {
        left: `${prefix}_LEFT`, right: `${prefix}_RIGHT`, jump: `${prefix}_JUMP`, down: `${prefix}_DOWN`,
        attack: `${prefix}_ATTACK`, super: `${prefix}_SUPER`, switch: `${prefix}_SWITCH`, extra: `${prefix}_EXTRA`
    };
}

function makeFighter(heroName, id = 'cpu') {
    return {
        id,
        heroName,
        controls: makeControls(id),
        x: 360,
        y: 580,
        w: 40,
        h: 70,
        vx: 0,
        vy: 0,
        hp: 700,
        maxHp: 700,
        dead: false,
        isGrounded: true,
        attackState: 'idle',
        superCooldown: 0,
        superCooldownMax: 10000,
        buffs: { battleCry: 0, bloodFrenzy: 0 },
        hasonSuperCharges: 0,
        williSuperCharges: 0,
        williDashCooldown: 0,
        hunterWeapon: 'musket',
        hunterMusketCD: 0,
        isMounted: false,
        runTimer: 0,
        grapplePhase: 0,
        grappleTimer: 0,
        euclidWeapon: 'magic',
        euclidSwitchTimer: 0,
        kilaElement: 'fire',
        kilaSwitchTimer: 0,
        kilaSwitchCD: 1000,
        energy: 50,
        isOverloaded: false,
        gensanShadows: [],
        gensanShadowCD: 1000,
        gensanSwitchCD: 0,
        isMeleeAttack() {
            return !['Hason', 'Willi', 'Ugo', 'Kila', 'Volt', 'Noae'].includes(this.heroName)
                && !(this.heroName === 'Hunter' && this.hunterWeapon === 'musket')
                && !(this.heroName === 'Euclid' && this.euclidWeapon === 'magic');
        }
    };
}

function readyBrain(ai, target) {
    ai.aiTarget = target;
    ai.aiBrain = {
        decisionTimer: 0,
        targetTimer: 1000,
        actionLock: 0,
        airJumpUsed: false,
        airborneMs: 0,
        jumpHoldTimer: 0,
        wasGrounded: !!ai.isGrounded,
        navGoal: null,
        navStep: null,
        navPurpose: null,
        navTimer: 0,
        highGroundHoldTimer: 0,
        anchorPlatform: null,
        tacticTimer: 1000,
        evadeTimer: 0,
        evadeDirection: 0,
        evadeDrop: false,
        strafeTimer: 0,
        strafeDirection: 1,
        combatState: 'neutral',
        combatStateTimer: 0,
        tacticScores: {},
        targetWasVulnerable: false,
        voltRecovering: false,
        stuckTimer: 0,
        lastX: ai.x,
        lastY: ai.y,
        intent: { left: false, right: false, down: false, holdJump: false },
        profile: { observePlayer() {} }
    };
}

function makeGame(ai, target) {
    return {
        aiDifficulty: 'normal',
        isBattleRoyale: false,
        p1: target,
        aiFighters: [ai],
        minions: [],
        projectiles: [],
        hazards: [],
        getOpponentsOf(fighter) {
            return fighter === ai ? [target] : [ai];
        }
    };
}

function loadPhysicsGame(heroName = 'Hunter') {
    let clock = 0;
    const deterministicMath = Object.create(Math);
    deterministicMath.random = () => 0.5;

    class Entity {
        constructor(x, y, w, h) {
            this.x = x; this.y = y; this.w = w; this.h = h;
            this.vx = 0; this.vy = 0; this.dead = false; this.untargetable = false;
        }
    }
    class Particle extends Entity {}

    const platforms = [
        { x: 300, y: 480, w: 400, h: 20, type: 'center' },
        { x: 100, y: 310, w: 250, h: 20, type: 'side' }
    ];
    const context = {
        window: {},
        Math: deterministicMath,
        Entity,
        Particle,
        Minion,
        CANVAS_W: 1280,
        CANVAS_H: 760,
        GROUND_Y: 660,
        GRAVITY: 0.6,
        PLATFORMS: platforms,
        HEROES: {
            Hunter: { maxHp: 750, speed: 4.5, jump: 14, width: 45, height: 70, color: '#008080', superCD: 20000 },
            Willi: { maxHp: 500, speed: 6.5, jump: 16, width: 35, height: 65, color: '#2F4F4F', superCD: 12000 },
            Volt: { maxHp: 650, speed: 4, jump: 15, width: 35, height: 65, color: '#FFD700', superCD: 30000 }
        },
        keys: {},
        keysPressed: {},
        currentBinds: { p1: { attack: 'P1_ATTACK', jump: 'P1_JUMP', super: 'P1_SUPER' } },
        localStorage: { getItem: () => 'expert' },
        performance: { now: () => clock },
        checkAABB: () => false
    };
    vm.createContext(context);
    const fighterSource = fs.readFileSync(path.join(__dirname, '..', 'fighter.js'), 'utf8');
    vm.runInContext(`${fighterSource}\nwindow.Fighter = Fighter;`, context, { filename: 'fighter.js' });
    const aiSource = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'ai.js'), 'utf8');
    vm.runInContext(aiSource, context, { filename: 'frontend/ai.js' });

    const controls = makeControls('CPU');
    const ai = new context.window.Fighter('cpu', heroName, 610, controls, false);
    ai.isCPU = true;
    ai.isGrounded = true;
    ai.y = context.GROUND_Y - ai.h;
    ai.superCooldown = 999999;
    ai.attackState = 'recovery';
    ai.stateTimer = 999999;

    const upper = platforms[1];
    const target = {
        id: 'player', heroName: 'Hunter', x: 175, y: upper.y - 70, w: 45, h: 70,
        vx: 0, vy: 0, hp: 750, maxHp: 750, dead: false, invincible: 0,
        isGrounded: true, currentPlatform: upper, attackState: 'idle',
        isMeleeAttack: () => false
    };
    const game = {
        aiDifficulty: 'expert', isBattleRoyale: false, p1: target, aiFighters: [ai],
        minions: [], projectiles: [], particles: [], hazards: [], hurricane: null,
        getOpponentsOf: fighter => fighter === ai ? [target] : [ai],
        getEnemyOf: fighter => fighter === ai ? target : ai,
        createExplosion() {}
    };
    context.game = game;
    const step = () => {
        context.window.runAI(game, 16);
        ai.update(16);
        for (const key in context.keysPressed) delete context.keysPressed[key];
        clock += 16;
    };
    return { context, ai, target, platforms, step };
}

test('CPU waits out the flip window before its airborne follow-up jump', () => {
    const context = loadAI();
    const ai = makeFighter('Macu');
    const target = makeFighter('Noae', 'player');
    ai.y = 530;
    ai.vy = -3;
    ai.isGrounded = false;
    target.x = 430;
    target.y = 390;
    target.currentPlatform = context.PLATFORMS[0];
    ai.superCooldown = 5000;
    readyBrain(ai, target);
    ai.aiBrain.airborneMs = 570;
    ai.aiBrain.wasGrounded = false;

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(context.keysPressed[ai.controls.jump], true);
    assert.equal(ai.aiBrain.airJumpUsed, true);
});

test('CPU physically routes through the center and lands on an upper platform', () => {
    const simulation = loadPhysicsGame();
    let landedCenter = false;
    let landedUpper = false;

    for (let frame = 0; frame < 900; frame++) {
        simulation.step();
        if (simulation.ai.isGrounded && simulation.ai.currentPlatform === simulation.platforms[0]) landedCenter = true;
        if (simulation.ai.isGrounded && simulation.ai.currentPlatform === simulation.platforms[1]) {
            landedUpper = true;
            break;
        }
    }

    assert.equal(landedCenter, true, 'CPU skipped or failed the intermediate platform');
    assert.equal(landedUpper, true, `CPU never landed on the target upper platform: ${JSON.stringify({
        x: simulation.ai.x,
        y: simulation.ai.y,
        grounded: simulation.ai.isGrounded,
        navPurpose: simulation.ai.aiBrain?.navPurpose,
        navGoalY: simulation.ai.aiBrain?.navGoal?.y,
        navStepY: simulation.ai.aiBrain?.navStep?.y,
        stuckTimer: simulation.ai.aiBrain?.stuckTimer
    })}`);
    assert.equal(simulation.ai.hasFlipped, false, 'navigation accidentally triggered the flip lockout');
});

test('ranged CPU proactively claims high ground while its target stays on the ground', () => {
    const context = loadAI();
    const ai = makeFighter('Hason');
    const target = makeFighter('Macu', 'player');
    target.x = 820;
    target.y = 590;
    ai.superCooldown = 5000;
    readyBrain(ai, target);
    ai.aiBrain.tacticTimer = 0;

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(ai.aiBrain.navPurpose, 'highground');
    assert.equal(ai.aiBrain.navGoal, context.PLATFORMS[1]);
    assert.equal(ai.aiBrain.navStep, context.PLATFORMS[0]);
});

test('CPU predicts an incoming projectile and actively jumps away', () => {
    const context = loadAI();
    const ai = makeFighter('Macu');
    const target = makeFighter('Noae', 'player');
    target.x = 700;
    ai.superCooldown = 5000;
    readyBrain(ai, target);
    const game = makeGame(ai, target);
    game.aiDifficulty = 'expert';
    game.projectiles.push({
        x: ai.x - 180, y: ai.y + 20, w: 12, h: 8, vx: 20, vy: 0,
        owner: target, type: 'normal', dead: false
    });

    context.window.runAI(game, 16);

    assert.equal(context.keysPressed[ai.controls.jump], true);
    assert.equal(context.keys[ai.controls.right], true);
});

test('every hero with a direct super can decide to use it', () => {
    const context = loadAI();
    const directSuperHeroes = [
        'Hason', 'Willi', 'Hunter', 'Macu', 'Artu', 'Duke', 'Kadaxi', 'Euclid',
        'Lique', 'Kae', 'Kila', 'Volt', 'Gensan', 'Noae', 'Wolf'
    ];

    for (const heroName of directSuperHeroes) {
        context.keysPressed = {};
        const ai = makeFighter(heroName, `cpu_${heroName}`);
        const target = makeFighter('Noae', `target_${heroName}`);
        target.x = heroName === 'Lique' ? 510 : 540;
        if (heroName === 'Artu') ai.superCooldown = 0;
        const game = makeGame(ai, target);
        if (heroName === 'Noae') {
            game.minions.push(
                { type: 'landmine', owner: ai, dead: false },
                { type: 'landmine', owner: ai, dead: false }
            );
        }
        readyBrain(ai, target);

        context.window.runAI(game, 16);

        assert.equal(context.keysPressed[ai.controls.super], true, `${heroName} did not choose its super`);
    }
});

test('weapon, puppet, stance, shadow, and mine utility skills are reachable', () => {
    const cases = [
        { hero: 'Hunter', action: 'switch', setup: ai => { ai.superCooldown = 5000; ai.hunterWeapon = 'musket'; } },
        { hero: 'Euclid', action: 'switch', setup: ai => { ai.superCooldown = 5000; ai.euclidWeapon = 'magic'; } },
        { hero: 'Ugo', action: 'switch', setup: ai => { ai.superCooldown = 5000; } },
        { hero: 'Kila', action: 'switch', setup: ai => { ai.superCooldown = 5000; ai.kilaSwitchCD = 0; ai.kilaElement = 'water'; } },
        { hero: 'Gensan', action: 'extra', setup: ai => { ai.superCooldown = 5000; ai.gensanShadowCD = 0; } },
        { hero: 'Noae', action: 'switch', setup: ai => { ai.superCooldown = 5000; } }
    ];

    for (const testCase of cases) {
        const context = loadAI();
        const ai = makeFighter(testCase.hero, `cpu_${testCase.hero}`);
        const target = makeFighter('Noae', `target_${testCase.hero}`);
        target.x = testCase.hero === 'Hunter' || testCase.hero === 'Euclid'
            ? 420
            : (testCase.hero === 'Kila' ? 800 : 650);
        testCase.setup(ai);
        readyBrain(ai, target);

        context.window.runAI(makeGame(ai, target), 16);

        assert.equal(context.keysPressed[ai.controls[testCase.action]], true, `${testCase.hero} did not choose ${testCase.action}`);
    }
});

test('multi-stage hero skills choose their required follow-up inputs', () => {
    const cases = [
        { hero: 'Hason', action: 'super', setup: ai => { ai.superCooldown = 5000; ai.hasonSuperCharges = 1; } },
        { hero: 'Willi', action: 'super', setup: ai => { ai.superCooldown = 5000; ai.williSuperCharges = 1; ai.williDashCooldown = 0; } },
        { hero: 'Kadaxi', action: 'super', setup: ai => { ai.superCooldown = 5000; ai.grapplePhase = 1; ai.grappleTimer = 4000; } }
    ];

    for (const testCase of cases) {
        const context = loadAI();
        const ai = makeFighter(testCase.hero, `cpu_${testCase.hero}`);
        const target = makeFighter('Noae', `target_${testCase.hero}`);
        target.x = 470;
        testCase.setup(ai);
        readyBrain(ai, target);

        context.window.runAI(makeGame(ai, target), 16);

        assert.equal(context.keysPressed[ai.controls[testCase.action]], true, `${testCase.hero} missed its follow-up`);
    }
});

test('Ugo detonates a damaged puppet in range and Gensan teleports from danger', () => {
    {
        const context = loadAI();
        const ai = makeFighter('Ugo', 'cpu_ugo');
        const target = makeFighter('Noae', 'target_ugo');
        target.x = 470;
        ai.superCooldown = 5000;
        const puppet = {
            type: 'puppet', owner: ai, x: 430, y: 580, w: 35, h: 65,
            vx: 0, vy: 0, hp: 80, maxHp: 250, dead: false, isGrounded: true,
            attackState: 'idle', facing: 1
        };
        const game = makeGame(ai, target);
        game.minions.push(puppet);
        readyBrain(ai, target);

        context.window.runAI(game, 16);

        assert.equal(context.keysPressed[ai.controls.switch], true, 'Ugo did not detonate the vulnerable puppet');
    }

    {
        const context = loadAI();
        const ai = makeFighter('Gensan', 'cpu_gensan');
        const target = makeFighter('Noae', 'target_gensan');
        target.x = 700;
        ai.superCooldown = 5000;
        ai.gensanShadows = [{ x: 100, y: 580, dead: false }];
        readyBrain(ai, target);
        const game = makeGame(ai, target);
        game.aiDifficulty = 'expert';
        game.projectiles.push({
            x: ai.x - 160, y: ai.y + 20, w: 12, h: 8, vx: 20, vy: 0,
            owner: target, type: 'normal', dead: false
        });

        context.window.runAI(game, 16);

        assert.equal(context.keysPressed[ai.controls.switch], true, 'Gensan did not teleport from the projectile');
    }
});

test('mounted Duke keeps moving until the lance is charged, then attacks', () => {
    const context = loadAI();
    const ai = makeFighter('Duke', 'cpu_duke');
    const target = makeFighter('Noae', 'target_duke');
    ai.isMounted = true;
    ai.runTimer = 0;
    ai.superCooldown = 5000;
    target.x = ai.x + 45;
    readyBrain(ai, target);
    const game = makeGame(ai, target);
    game.aiDifficulty = 'expert';

    context.window.runAI(game, 16);
    assert.equal(context.keys[ai.controls.right] || context.keys[ai.controls.left], true, 'Duke stopped before charging the lance');
    assert.equal(context.keysPressed[ai.controls.attack], undefined);

    context.keysPressed = {};
    ai.runTimer = 3000;
    ai.aiBrain.decisionTimer = 0;
    ai.aiBrain.actionLock = 0;
    context.window.runAI(game, 16);

    assert.equal(context.keysPressed[ai.controls.attack], true, 'Duke did not use the charged lance');
});

test('Willi immediately accelerates his fire cadence against a dizzy target', () => {
    const context = loadAI();
    const ai = makeFighter('Willi', 'cpu_willi');
    const target = makeFighter('Macu', 'target_willi');
    target.x = 580;
    target.buffs.dizzy = 1800;
    ai.superCooldown = 5000;
    ai.williSuperCharges = 1;
    ai.williDashCooldown = 0;
    readyBrain(ai, target);

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(ai.aiTacticalState, 'burst');
    assert.equal(ai.aiAttackTempo, 2.55);
    assert.equal(context.keysPressed[ai.controls.attack], true);
    assert.equal(context.keysPressed[ai.controls.super], undefined);
    assert.equal(ai.aiBrain.actionLock, 20);
});

test('low-health Willi retreats, slows his cadence, and suppresses unsafe fire', () => {
    const context = loadAI();
    const ai = makeFighter('Willi', 'cpu_willi');
    const target = makeFighter('Macu', 'target_willi');
    ai.hp = ai.maxHp * 0.2;
    ai.superCooldown = 5000;
    target.x = ai.x + 145;
    readyBrain(ai, target);

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(ai.aiTacticalState, 'retreat');
    assert.equal(ai.aiAttackTempo, 0.62);
    assert.equal(context.keys[ai.controls.left], true);
    assert.equal(context.keysPressed[ai.controls.attack], undefined);
});

test('Volt flies to a firing altitude and lands to recover low energy', () => {
    {
        const context = loadAI();
        const ai = makeFighter('Volt', 'cpu_volt');
        const target = makeFighter('Macu', 'target_volt');
        ai.energy = 180;
        ai.superCooldown = 5000;
        target.x = 700;
        target.y = 390;
        readyBrain(ai, target);

        context.window.runAI(makeGame(ai, target), 16);

        assert.equal(ai.aiTacticalRole, 'aerial');
        assert.equal(context.keys[ai.controls.jump], true, 'Volt did not take off toward its firing altitude');
    }

    {
        const context = loadAI();
        const ai = makeFighter('Volt', 'cpu_volt');
        const target = makeFighter('Macu', 'target_volt');
        ai.energy = 40;
        ai.superCooldown = 5000;
        ai.isGrounded = false;
        ai.y = 260;
        target.x = 700;
        readyBrain(ai, target);

        context.window.runAI(makeGame(ai, target), 16);

        assert.equal(ai.aiTacticalState, 'recover');
        assert.equal(context.keys[ai.controls.down], true, 'Volt did not descend to recharge');
        assert.equal(context.keysPressed[ai.controls.attack], undefined);
    }
});

test('Volt physically gains altitude and returns to the ground to recharge', () => {
    {
        const simulation = loadPhysicsGame('Volt');
        simulation.ai.energy = 180;
        simulation.target.x = 920;
        simulation.target.y = simulation.context.GROUND_Y - simulation.target.h;
        simulation.target.currentPlatform = null;
        const startingY = simulation.ai.y;

        for (let frame = 0; frame < 100; frame++) simulation.step();

        assert.ok(simulation.ai.y < startingY - 45, `Volt did not gain meaningful altitude: ${simulation.ai.y}`);
        assert.equal(simulation.ai.isGrounded, false);
    }

    {
        const simulation = loadPhysicsGame('Volt');
        simulation.ai.energy = 40;
        simulation.ai.isGrounded = false;
        simulation.ai.y = 230;
        simulation.ai.vy = 0;
        simulation.target.x = 920;
        simulation.target.y = simulation.context.GROUND_Y - simulation.target.h;
        simulation.target.currentPlatform = null;

        for (let frame = 0; frame < 160; frame++) simulation.step();

        assert.equal(simulation.ai.isGrounded, true, 'Volt did not land during its recovery state');
        assert.ok(simulation.ai.energy > 40, `Volt did not recharge after landing: ${simulation.ai.energy}`);
    }
});

test('hero archetypes expose distinct tactical roles and low-health priorities', () => {
    const cases = [
        { hero: 'Hason', role: 'zoner' },
        { hero: 'Noae', role: 'trapper' },
        { hero: 'Kadaxi', role: 'grappler' },
        { hero: 'Lique', role: 'berserker', lowHealth: true }
    ];

    for (const testCase of cases) {
        const context = loadAI();
        const ai = makeFighter(testCase.hero, `cpu_${testCase.hero}`);
        const target = makeFighter('Macu', `target_${testCase.hero}`);
        ai.superCooldown = 5000;
        if (testCase.lowHealth) ai.hp = ai.maxHp * 0.18;
        target.x = ai.x + 170;
        readyBrain(ai, target);

        context.window.runAI(makeGame(ai, target), 16);

        assert.equal(ai.aiTacticalRole, testCase.role);
        if (testCase.hero === 'Lique') assert.notEqual(ai.aiTacticalState, 'retreat');
    }
});
