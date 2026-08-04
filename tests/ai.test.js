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

function loadProjectileContext() {
    const context = {
        window: {},
        Math,
        CANVAS_W: 1280,
        CANVAS_H: 760,
        GROUND_Y: 660,
        GRAVITY: 0.6,
        checkAABB(first, second) {
            return first.x < second.x + second.w && first.x + first.w > second.x
                && first.y < second.y + second.h && first.y + first.h > second.y;
        }
    };
    context.game = {
        hurricane: null,
        minions: [],
        particles: [],
        opponents: [],
        getEnemyOf: () => null,
        getOpponentsOf() { return this.opponents; },
        createExplosion() {}
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'entities.js'), 'utf8');
    vm.runInContext(`${source}\nwindow.Projectile = Projectile; window.KuroDecoy = KuroDecoy; window.GiantSword = GiantSword; window.GravityWell = GravityWell;`, context, { filename: 'entities.js' });
    return context;
}

function loadNetworkInputContext() {
    const p1 = makeControls('P1');
    const p2 = makeControls('P2');
    const context = {
        window: {
            keys: {},
            keysPressed: {},
            currentBinds: { p1, p2 }
        },
        localStorage: { getItem: () => '' }
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'network.js'), 'utf8');
    const inputOnlySource = source.slice(0, source.indexOf('if (window.Game'));
    vm.runInContext(inputOnlySource, context, { filename: 'network.js' });
    return { context, p1, p2 };
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
        kuroCloaked: false,
        kuroDecoyCooldown: 1000,
        kuroEmpoweredShot: false,
        kuroRelocateTimer: 0,
        solaFocus: 0,
        solaDashCooldown: 0,
        solaForceActive: false,
        nyraShiftCooldown: 0,
        orionCharges: 0,
        orionPulseCooldown: 0,
        isMeleeAttack() {
            return !['Hason', 'Willi', 'Ugo', 'Kila', 'Volt', 'Noae', 'Kuro', 'Nyra'].includes(this.heroName)
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
        kuroChargeTimer: 0,
        stuckTimer: 0,
        lastX: ai.x,
        lastY: ai.y,
        intent: { left: false, right: false, down: false, holdJump: false, holdAttack: false, holdSuper: false },
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
    class Projectile extends Entity {
        constructor(x, y, w, h, vx, vy, damage, owner, color, type) {
            super(x, y, w, h);
            Object.assign(this, { vx, vy, damage, owner, color, type });
        }
    }
    class KuroDecoy extends Entity {
        constructor(owner, x, y) {
            super(x, y, owner.w, owner.h);
            this.owner = owner;
            this.type = 'kuro_decoy';
            this.hp = 1;
            this.maxHp = 1;
            this.buffs = {};
        }
        update() {}
    }
    class GravityWell extends Entity {
        constructor(owner, x, y) {
            super(x - 30, y - 30, 60, 60);
            this.owner = owner;
            this.type = 'gravity_well';
            this.life = 5000;
            this.effectRadius = 430;
            this.tickDamage = 7;
            this.untargetable = true;
        }
    }

    const platforms = [
        { x: 300, y: 480, w: 400, h: 20, type: 'center' },
        { x: 100, y: 310, w: 250, h: 20, type: 'side' }
    ];
    const context = {
        window: {},
        Math: deterministicMath,
        Entity,
        Particle,
        Projectile,
        KuroDecoy,
        GravityWell,
        Minion,
        CANVAS_W: 1280,
        CANVAS_H: 760,
        GROUND_Y: 660,
        GRAVITY: 0.6,
        PLATFORMS: platforms,
        HEROES: {
            Hunter: { maxHp: 750, speed: 4.5, jump: 14, width: 45, height: 70, color: '#008080', superCD: 20000 },
            Willi: { maxHp: 500, speed: 6.5, jump: 16, width: 35, height: 65, color: '#2F4F4F', superCD: 12000 },
            Volt: { maxHp: 650, speed: 4, jump: 15, width: 35, height: 65, color: '#FFD700', superCD: 30000 },
            Kuro: { maxHp: 600, speed: 5.2, jump: 14, width: 38, height: 70, color: '#244d3b', superCD: 26000 },
            Sola: { maxHp: 780, speed: 5.8, jump: 15, width: 40, height: 70, color: '#167d8d', superCD: 15000 },
            Nyra: { maxHp: 680, speed: 6.2, jump: 16, width: 36, height: 66, color: '#d84b78', superCD: 24000 },
            Orion: { maxHp: 900, speed: 4.6, jump: 13.5, width: 46, height: 74, color: '#4056a1', superCD: 28000 }
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
        buffs: {},
        isMeleeAttack: () => false,
        takeDamage(amount) { this.hp -= amount; }
    };
    const game = {
        aiDifficulty: 'expert', isBattleRoyale: false, p1: target, aiFighters: [ai],
        minions: [], projectiles: [], particles: [], hazards: [], hurricane: null,
        getOpponentsOf: fighter => fighter === ai ? [target] : [ai],
        getEnemyOf: fighter => fighter === ai ? target : ai,
        getFighters: () => [ai, target],
        createExplosion() {},
        handleFighterDefeat() {}
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
        'Lique', 'Kae', 'Kila', 'Volt', 'Gensan', 'Noae', 'Wolf', 'Kuro', 'Sola', 'Nyra', 'Orion'
    ];

    for (const heroName of directSuperHeroes) {
        context.keysPressed = {};
        const ai = makeFighter(heroName, `cpu_${heroName}`);
        const target = makeFighter('Noae', `target_${heroName}`);
        target.x = heroName === 'Lique' ? 510 : 540;
        if (heroName === 'Kuro') target.hp = target.maxHp * 0.35;
        if (heroName === 'Sola') ai.solaFocus = 1;
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
        { hero: 'Lique', role: 'berserker', lowHealth: true },
        { hero: 'Sola', role: 'sentinel' },
        { hero: 'Nyra', role: 'skirmisher' },
        { hero: 'Orion', role: 'gravity' }
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

test('Kuro CPU holds Longshot, prioritizes range, and relocates after firing', () => {
    const context = loadAI();
    const ai = makeFighter('Kuro', 'cpu_kuro');
    const target = makeFighter('Macu', 'target_kuro');
    ai.superCooldown = 5000;
    ai.kuroDecoyCooldown = 5000;
    target.x = 700;
    readyBrain(ai, target);

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(ai.aiTacticalRole, 'sniper');
    assert.equal(context.keysPressed[ai.controls.attack], true, 'Kuro did not begin Longshot');
    assert.equal(context.keys[ai.controls.attack], true, 'Kuro did not hold the attack input to charge');
    assert.ok(ai.aiBrain.kuroChargeTimer >= 900);

    ai.kuroRelocateTimer = 1200;
    ai.aiBrain.decisionTimer = 0;
    ai.aiBrain.combatStateTimer = 0;
    context.window.runAI(makeGame(ai, target), 16);
    assert.equal(ai.aiTacticalState, 'retreat');
});

test('CPU loses distant Kuro while cloaked without a decoy or visible movement', () => {
    const context = loadAI();
    const ai = makeFighter('Hunter', 'cpu_hunter');
    const target = makeFighter('Kuro', 'target_kuro');
    ai.superCooldown = 5000;
    target.x = 900;
    target.kuroCloaked = true;
    target.vx = 0;
    readyBrain(ai, target);

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(ai.aiTarget, null);
    assert.equal(context.keysPressed[ai.controls.attack], undefined);
    assert.equal(context.keys[ai.controls.left], false);
    assert.equal(context.keys[ai.controls.right], false);
});

test('absolute cloak defeats AI last-attacker tracking while Kuro moves', () => {
    const context = loadAI();
    const ai = makeFighter('Hunter', 'cpu_hunter');
    const target = makeFighter('Kuro', 'target_kuro');
    target.kuroCloaked = true;
    target.kuroAbsoluteCloakTimer = 3000;
    target.vx = 5;
    ai.lastAttacker = target;
    ai.lastAttackerTimer = 2000;
    readyBrain(ai, target);

    context.window.runAI(makeGame(ai, target), 16);

    assert.equal(ai.aiTarget, null);
    assert.equal(context.keysPressed[ai.controls.attack], undefined);
});

test('Kuro cloaks patiently and fires a fully charged Phantom Round', () => {
    const simulation = loadPhysicsGame('Kuro');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;
    ai.superCooldown = 0;

    for (let frame = 0; frame < 80; frame++) ai.update(16);
    assert.equal(ai.kuroCloaked, true, 'Kuro did not enter Optical Veil');
    assert.equal(ai.isKuroFullyInvisible(), true, 'stationary Kuro was still visually exposed');
    let hiddenDrawCalls = 0;
    ai.draw({ fillRect() { hiddenDrawCalls++; } });
    assert.equal(hiddenDrawCalls, 0, 'stationary veil still drew Kuro or his HP bar');
    ai.vx = 3;
    assert.equal(ai.isKuroFullyInvisible(), false, 'passive veil hid Kuro while moving');
    ai.vx = 0;
    ai.vy = 3;
    assert.equal(ai.isKuroFullyInvisible(), false, 'passive veil hid Kuro while moving vertically');
    ai.vy = 0;

    ai.performSuper();
    assert.equal(ai.kuroEmpoweredShot, true);
    assert.equal(ai.kuroEmpoweredTimer, 7000);

    context.keys[ai.controls.attack] = true;
    context.keysPressed[ai.controls.attack] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.attack];
    assert.equal(ai.attackState, 'charging');

    for (let frame = 0; frame < 80; frame++) ai.update(16);

    assert.equal(context.game.projectiles.length, 1);
    assert.equal(context.game.projectiles[0].type, 'phantom_round');
    assert.equal(context.game.projectiles[0].damage, 130);
    assert.equal(ai.kuroEmpoweredShot, false);
    assert.equal(ai.kuroCloaked, false);
    assert.ok(ai.kuroRevealTimer > 0);
});

test('Kuro shade grants 5.5s absolute cloak through attacks and damage', () => {
    const simulation = loadPhysicsGame('Kuro');
    const { ai, target, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;

    context.keysPressed[ai.controls.switch] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.switch];

    assert.equal(context.game.minions.length, 1);
    assert.equal(context.game.minions[0].type, 'kuro_decoy');
    assert.equal(ai.kuroCloaked, true);
    assert.equal(ai.kuroAbsoluteCloakTimer, 5500);
    assert.equal(ai.kuroDecoyCooldown, 10000);

    context.keys[ai.controls.attack] = true;
    context.keysPressed[ai.controls.attack] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.attack];
    assert.equal(ai.attackState, 'charging');

    for (let frame = 0; frame < 80; frame++) ai.update(16);
    assert.equal(context.game.projectiles.length, 1);
    assert.equal(ai.kuroCloaked, true, 'attacking revealed Kuro during absolute cloak');
    assert.ok(ai.kuroAbsoluteCloakTimer > 0);

    context.keys[ai.controls.attack] = false;
    ai.attackState = 'charging';
    ai.kuroCharge = 300;

    ai.takeDamage(10, target);
    assert.equal(ai.attackState, 'idle');
    assert.equal(ai.kuroCloaked, true, 'damage revealed Kuro during absolute cloak');
    assert.equal(ai.kuroRevealTimer, 0);
    ai.vx = 5;
    assert.equal(ai.isKuroFullyInvisible(), true, 'movement exposed Kuro during absolute cloak');

    ai.update(ai.kuroAbsoluteCloakTimer);
    assert.equal(ai.kuroAbsoluteCloakTimer, 0);
    assert.equal(ai.kuroCloaked, false);
});

test('Kuro shade wanders and renders its own HP bar', () => {
    const context = loadProjectileContext();
    context.PLATFORMS = [];
    const owner = { w: 38, h: 70, facing: 1, isGrounded: true, baseSpeed: 5.2, baseJump: 14 };
    const shade = new context.window.KuroDecoy(owner, 200, context.GROUND_Y - 70);
    shade.moveDirection = 1;
    shade.moveTimer = 1000;
    shade.jumpTimer = 1000;
    const startX = shade.x;

    shade.update(16);

    assert.ok(shade.x > startX, 'shade did not wander');
    assert.equal(shade.isGrounded, true);

    const rectangles = [];
    const drawContext = {
        globalAlpha: 1,
        fillStyle: '',
        save() {}, restore() {}, translate() {}, scale() {},
        fillRect(x, y, w, h) { rectangles.push({ x, y, w, h, color: this.fillStyle }); }
    };
    shade.draw(drawContext);
    const hpRects = rectangles.filter(rect => rect.y === shade.y - 12 && rect.h === 5);
    assert.equal(hpRects.length, 2);
    assert.ok(hpRects.some(rect => rect.color === '#4caf50' && rect.w === shade.w));
});

test('Kuro sniper rounds apply their piercing and control effects', () => {
    const context = loadProjectileContext();
    const owner = { id: 'kuro', heroName: 'Kuro' };
    const makeTarget = (id, heroName = 'Hunter') => ({
        id, heroName, x: 100, y: 100, w: 40, h: 70, dead: false, invincible: 0,
        hp: 500, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    });
    const first = makeTarget('first');
    const second = makeTarget('second');
    context.game.opponents = [first, second];

    const phantom = new context.window.Projectile(100, 100, 22, 4, 0, 0, 130, owner, '#fff', 'phantom_round');
    phantom.update(16);

    assert.equal(first.hp, 370);
    assert.equal(second.hp, 370);
    assert.equal(first.buffs.dizzy, 1000);
    assert.equal(second.buffs.dizzy, undefined);
    assert.equal(phantom.dead, false);

    const minionA = makeTarget('minion-a', null);
    const minionB = makeTarget('minion-b', null);
    context.game.opponents = [];
    context.game.minions = [minionA, minionB];
    const fullRound = new context.window.Projectile(100, 100, 22, 4, 0, 0, 80, owner, '#9ad8c0', 'sniper_round_full');
    fullRound.update(16);

    assert.equal(minionA.hp, 420);
    assert.equal(minionB.hp, 420);
    assert.equal(minionA.buffs.slow, 2000);
    assert.equal(fullRound.dead, false);
});

test('Sola deflects projectiles into Focus and channels Force Choke at arena range', () => {
    const projectileContext = loadProjectileContext();
    const shooter = { id: 'shooter', heroName: 'Hason' };
    const sola = {
        id: 'sola', heroName: 'Sola', x: 108, y: 100, w: 40, h: 70,
        facing: -1, attackState: 'active', solaFocus: 0, dead: false, invincible: 0,
        isMeleeAttack: () => true,
        takeDamage() {}
    };
    projectileContext.game.opponents = [sola];
    const shot = new projectileContext.window.Projectile(100, 120, 12, 6, 10, 0, 28, shooter, '#fff', 'normal');

    shot.update(16);

    assert.equal(shot.owner, sola);
    assert.ok(shot.vx < 0, 'deflected projectile did not reverse direction');
    assert.equal(shot.dead, false);
    assert.equal(sola.solaFocus, 1);

    const simulation = loadPhysicsGame('Sola');
    simulation.ai.attackState = 'idle';
    simulation.ai.superCooldown = 0;
    simulation.ai.hp = 650;
    simulation.target.x = 5;
    simulation.target.y = 170;
    const targetStartY = simulation.target.y;
    simulation.context.keys[simulation.ai.controls.super] = true;

    simulation.ai.performSuper();

    assert.equal(simulation.ai.solaForceActive, true);
    assert.equal(simulation.target.solaForceHeld, true);
    assert.equal(simulation.ai.superCooldown, 15000);

    simulation.ai.update(249);
    assert.equal(simulation.target.hp, 750);
    simulation.ai.update(1);

    assert.equal(simulation.target.hp, 745);
    assert.equal(simulation.ai.hp, 655);
    assert.ok(simulation.target.y < targetStartY, 'Force Choke did not lift its distant target');

    simulation.context.keys[simulation.ai.controls.super] = false;
    simulation.ai.update(16);
    assert.equal(simulation.ai.solaForceActive, false);
    assert.equal(simulation.target.solaForceHeld, false);
});

test('Sola Force Choke stops on movement, damage, target loss, and its 4.5s cap', () => {
    const simulation = loadPhysicsGame('Sola');
    const { ai, target, context } = simulation;
    ai.attackState = 'idle';
    ai.hp = 600;
    context.keys[ai.controls.super] = true;

    ai.superCooldown = 0;
    ai.performSuper();
    context.keys[ai.controls.left] = true;
    ai.update(16);
    assert.equal(ai.solaForceActive, false);
    assert.equal(target.solaForceHeld, false);

    context.keys[ai.controls.left] = false;
    ai.superCooldown = 0;
    ai.performSuper();
    ai.takeDamage(10, target);
    assert.equal(ai.solaForceActive, false);
    assert.equal(target.solaForceHeld, false);

    ai.stunTimer = 0;
    ai.superCooldown = 0;
    ai.performSuper();
    target.dead = true;
    ai.update(16);
    assert.equal(ai.solaForceActive, false);
    assert.equal(target.solaForceHeld, false);

    target.dead = false;
    target.hp = 750;
    ai.superCooldown = 0;
    ai.performSuper();
    ai.update(4500);

    assert.equal(target.hp, 660, 'Force Choke must drain exactly 18 five-HP ticks');
    assert.equal(ai.hp, 680, 'Sola must heal only the HP actually drained');
    assert.equal(ai.solaForceActive, false);
    assert.equal(target.solaForceHeld, false);
});

test('Sola CPU starts and holds Force Choke without movement input', () => {
    const context = loadAI();
    const ai = makeFighter('Sola');
    const target = makeFighter('Hunter', 'player');
    target.x = 1220;
    readyBrain(ai, target);
    const game = makeGame(ai, target);

    context.window.runAI(game, 16);

    assert.equal(context.keysPressed[ai.controls.super], true);
    assert.equal(context.keys[ai.controls.super], true);
    assert.equal(context.keys[ai.controls.left], false);
    assert.equal(context.keys[ai.controls.right], false);

    ai.solaForceActive = true;
    ai.aiBrain.intent.left = true;
    context.window.runAI(game, 16);
    assert.equal(context.keys[ai.controls.super], true);
    assert.equal(context.keys[ai.controls.left], false);
});

test('Nyra chakrams return, support Rift Shift, and launch as a six-way Halo Storm', () => {
    const projectileContext = loadProjectileContext();
    const owner = { x: 100, y: 100, w: 36, h: 66, dead: false };
    projectileContext.game.opponents = [];
    const chakram = new projectileContext.window.Projectile(250, 120, 24, 24, 10, 0, 22, owner, '#ff7ba7', 'chakram');
    chakram.hitTargets.add({ id: 'outbound-target' });

    chakram.update(600);

    assert.equal(chakram.returning, true);
    assert.equal(chakram.hitTargets.size, 0, 'return path could not hit targets a second time');
    chakram.x = owner.x + owner.w/2 - chakram.w/2;
    chakram.y = owner.y + owner.h/2 - chakram.h/2;
    chakram.update(16);
    assert.equal(chakram.dead, true, 'returning chakram was not caught by its owner');

    const simulation = loadPhysicsGame('Nyra');
    simulation.ai.attackState = 'idle';
    const anchor = new simulation.context.Projectile(900, 400, 24, 24, 0, 0, 22, simulation.ai, '#ff7ba7', 'chakram');
    simulation.context.game.projectiles.push(anchor);
    simulation.context.keysPressed[simulation.ai.controls.switch] = true;
    simulation.ai.update(16);

    assert.ok(simulation.ai.x > 800, 'Rift Shift did not move Nyra to the chakram');
    assert.equal(anchor.dead, true);
    assert.equal(simulation.ai.nyraShiftCooldown, 7000);

    for (const key in simulation.context.keysPressed) delete simulation.context.keysPressed[key];
    simulation.ai.attackState = 'idle';
    simulation.ai.performAttack();
    assert.equal(simulation.ai.stateTimer, 70, 'Nyra basic throw windup was not accelerated');
    simulation.ai.update(70);
    const fastChakram = simulation.context.game.projectiles.find(projectile => projectile.type === 'chakram' && !projectile.dead);
    assert.ok(fastChakram, 'Nyra did not release her accelerated basic chakram');
    assert.ok(Math.abs(Math.hypot(fastChakram.vx, fastChakram.vy) - 23) < 0.001);
    simulation.ai.update(70);
    assert.equal(simulation.ai.attackState, 'recovery');
    assert.equal(simulation.ai.stateTimer, 140, 'Nyra basic throw recovery was not accelerated');

    simulation.ai.superCooldown = 0;
    simulation.ai.performSuper();
    const halo = simulation.context.game.projectiles.filter(projectile => projectile.type === 'chakram_super');
    assert.equal(halo.length, 6);
});

test('Gensan giant swords damage their falling path and only dizzy floor targets', () => {
    const context = loadProjectileContext();
    const owner = { id: 'gensan', heroName: 'Gensan' };
    const makeTarget = (x, y, grounded) => ({
        x, y, w: 40, h: 70, hp: 500, dead: false, invincible: 0,
        isGrounded: grounded, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    });
    const airbornePathTarget = makeTarget(110, 80, false);
    const floorPathTarget = makeTarget(110, context.GROUND_Y - 70, true);
    const impactOnlyTarget = makeTarget(240, context.GROUND_Y - 70, true);
    context.game.opponents = [airbornePathTarget, floorPathTarget, impactOnlyTarget];
    const sword = new context.window.GiantSword(owner, 100, -150);

    for (let frame = 0; frame < 40 && !sword.damageDealt; frame++) sword.update(16);

    assert.equal(sword.damageDealt, true);
    assert.equal(airbornePathTarget.hp, 410);
    assert.equal(airbornePathTarget.buffs.dizzy, undefined);
    assert.equal(floorPathTarget.hp, 410, 'floor path target was damaged more than once');
    assert.equal(floorPathTarget.buffs.dizzy, 5000);
    assert.equal(impactOnlyTarget.hp, 410);
    assert.equal(impactOnlyTarget.buffs.dizzy, 5000);
});

test('Orion spends Gravity Charges on a pulse and deploys a five-second Black Hole', () => {
    const simulation = loadPhysicsGame('Orion');
    simulation.ai.facing = 1;
    simulation.target.x = simulation.ai.x + simulation.ai.w + 70;
    const extendedHitbox = simulation.ai.getMeleeHitbox();
    assert.equal(extendedHitbox.w, 88);
    assert.ok(simulation.target.x < extendedHitbox.x + extendedHitbox.w, 'Orion regular attack did not gain range');

    simulation.ai.attackState = 'idle';
    simulation.ai.orionCharges = 3;
    simulation.target.x = simulation.ai.x + 90;
    simulation.target.y = simulation.ai.y;
    const hpBefore = simulation.target.hp;
    simulation.context.keysPressed[simulation.ai.controls.switch] = true;

    simulation.ai.update(16);

    assert.equal(hpBefore - simulation.target.hp, 55);
    assert.equal(simulation.ai.orionCharges, 0);
    assert.equal(simulation.ai.orionPulseCooldown, 5000);
    assert.ok(simulation.target.buffs.dizzy >= 750);

    simulation.ai.superCooldown = 0;
    simulation.ai.performSuper();
    const well = simulation.context.game.minions.find(minion => minion.type === 'gravity_well');
    assert.ok(well, 'Black Hole was not created');
    assert.equal(well.owner, simulation.ai);
    assert.equal(well.life, 5000);
    assert.equal(well.effectRadius, 430);
    assert.equal(well.tickDamage, 7);
});

test('Black Hole pulls, slows, and damages enemies every quarter-second for five seconds', () => {
    const context = loadProjectileContext();
    const owner = { id: 'orion', heroName: 'Orion' };
    const target = {
        x: 110, y: 175, w: 40, h: 70, vx: 0, vy: 0, hp: 200,
        dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    const well = new context.window.GravityWell(owner, 200, 200);

    well.update(250);

    assert.equal(target.hp, 193);
    assert.ok(target.vx > 0, 'gravity well did not pull the target toward its core');
    assert.ok(target.buffs.gravitySlow >= 350);
    assert.equal(well.life, 4750);

    well.update(750);
    assert.equal(target.hp, 172, 'large frames must preserve all 250ms damage ticks');
    assert.equal(well.life, 4000);

    well.update(4000);
    assert.equal(target.hp, 60);
    assert.equal(well.life, 0);
    assert.equal(well.dead, true);
});

test('Black Hole affects multiple survival opponents independently', () => {
    const context = loadProjectileContext();
    const owner = { id: 'orion', heroName: 'Orion' };
    const makeTarget = x => ({
        x, y: 175, w: 40, h: 70, vx: 0, vy: 0, hp: 100,
        dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    });
    const first = makeTarget(110);
    const second = makeTarget(590);
    context.game.opponents = [first, second];
    const well = new context.window.GravityWell(owner, 200, 200);

    well.update(250);

    assert.equal(first.hp, 93);
    assert.equal(second.hp, 93, 'expanded Black Hole range did not reach a distant opponent');
    assert.ok(first.buffs.gravitySlow >= 350);
    assert.ok(second.buffs.gravitySlow >= 350);
});

test('Black Hole gravity slow reduces movement more than a regular slow', () => {
    const regularSlow = loadPhysicsGame('Hunter');
    regularSlow.ai.attackState = 'idle';
    regularSlow.ai.buffs.slow = 350;
    regularSlow.context.keys[regularSlow.ai.controls.right] = true;
    regularSlow.ai.update(16);

    const gravitySlow = loadPhysicsGame('Hunter');
    gravitySlow.ai.attackState = 'idle';
    gravitySlow.ai.buffs.gravitySlow = 350;
    gravitySlow.context.keys[gravitySlow.ai.controls.right] = true;
    gravitySlow.ai.update(16);

    assert.ok(gravitySlow.ai.vx < regularSlow.ai.vx * 0.7);
});

test('online input synchronization preserves held and pressed Super states', () => {
    const { context, p1, p2 } = loadNetworkInputContext();
    context.window.keys[p1.super] = true;
    context.window.keysPressed[p1.super] = true;

    const inputs = context.window.collectLocalOnlineInputs();
    assert.equal(inputs.super, true);
    assert.equal(inputs.pSuper, true);

    context.window.applyRemoteOnlineInputs({ super: true, pSuper: true });
    assert.equal(context.window.keys[p2.super], true);
    assert.equal(context.window.keysPressed[p2.super], true);

    context.window.applyRemoteOnlineInputs({ super: false });
    assert.equal(context.window.keys[p2.super], false);
});
