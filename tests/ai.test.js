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
        PLATFORMS: [],
        checkAABB(first, second) {
            return first.x < second.x + second.w && first.x + first.w > second.x
                && first.y < second.y + second.h && first.y + first.h > second.y;
        }
    };
    context.game = {
        hurricane: null,
        minions: [],
        projectiles: [],
        particles: [],
        opponents: [],
        getEnemyOf: () => null,
        getOpponentsOf() { return this.opponents; },
        getFighters() { return this.opponents; },
        createExplosion() {}
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'entities.js'), 'utf8');
    vm.runInContext(`${source}\nwindow.Projectile = Projectile; window.KuroDecoy = KuroDecoy; window.GiantSword = GiantSword; window.GravityWell = GravityWell; window.ChiqPath = ChiqPath; window.D2FDrone = D2FDrone; window.D2FTargetBeacon = D2FTargetBeacon; window.D2FGiantRobot = D2FGiantRobot;`, context, { filename: 'entities.js' });
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
        d2fDroneCooldown: 0,
        isMeleeAttack() {
            return !['Hason', 'Willi', 'Ugo', 'Kila', 'Volt', 'Noae', 'Kuro', 'Nyra', 'Archor', 'D2F1'].includes(this.heroName)
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
    class ChiqPath extends Entity {
        constructor(owner, startX, startY, endX, endY, nuMode) {
            super(startX, startY, Math.abs(endX-startX), 36);
            Object.assign(this, { owner, startX, startY, endX, endY, nuMode, type: 'chiq_path', life: 5000 });
        }
    }
    class D2FDrone extends Entity {
        constructor(owner, x, y, formationSlot) {
            super(x, y, 34, 24);
            Object.assign(this, { owner, formationSlot, type: 'd2f_drone', hp: 33, maxHp: 33, life: 18000, buffs: {} });
        }
    }
    class D2FTargetBeacon extends Entity {
        constructor(owner, target) {
            super(target.x - 12, target.y - 18, target.w + 24, target.h + 36);
            Object.assign(this, { owner, targetId: target.id, type: 'd2f_target_beacon', life: 1000, untargetable: true });
        }
    }
    class D2FGiantRobot extends Entity {}

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
        ChiqPath,
        D2FDrone,
        D2FTargetBeacon,
        D2FGiantRobot,
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
            Orion: { maxHp: 900, speed: 4.6, jump: 13.5, width: 46, height: 74, color: '#4056a1', superCD: 28000 },
            Archor: { maxHp: 340, speed: 5.8, jump: 15, width: 38, height: 68, color: '#2f8f62', superCD: 18000 },
            Itan: { maxHp: 820, speed: 5, jump: 14.5, width: 42, height: 72, color: '#9f3347', superCD: 3000 },
            D2F1: { maxHp: 520, speed: 7.2, jump: 16, width: 40, height: 66, color: '#35d5e8', superCD: 20000 }
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

test('CPUs prioritize D2F-1 drones beyond their normal engagement range', () => {
    {
        const context = loadAI();
        const ai = makeFighter('Hason', 'cpu_hason');
        const target = makeFighter('D2F1', 'player_d2f');
        target.x = 450;
        ai.superCooldown = 5000;
        const drone = {
            type: 'd2f_drone', owner: target, x: 1030, y: 480, w: 34, h: 24,
            vx: 0, vy: 0, hp: 65, maxHp: 65, dead: false, untargetable: false, laserActive: true
        };
        const game = makeGame(ai, target);
        game.aiDifficulty = 'expert';
        game.minions.push(drone);
        readyBrain(ai, target);

        context.window.runAI(game, 16);

        assert.equal(ai.aiCombatTarget, drone);
        assert.equal(context.keysPressed[ai.controls.attack], true, 'ranged CPU refused to fire beyond its old range limit');
        assert.equal(context.keys[ai.controls.right], true, 'ranged CPU did not close distance on the drone');
    }

    {
        const context = loadAI();
        const ai = makeFighter('Macu', 'cpu_macu');
        const target = makeFighter('D2F1', 'player_d2f');
        target.x = 430;
        ai.superCooldown = 5000;
        const drone = {
            type: 'd2f_drone', owner: target, x: 1000, y: 475, w: 34, h: 24,
            vx: 0, vy: 0, hp: 65, maxHp: 65, dead: false, untargetable: false, laserActive: false
        };
        const game = makeGame(ai, target);
        game.aiDifficulty = 'expert';
        game.minions.push(drone);
        readyBrain(ai, target);

        context.window.runAI(game, 16);

        assert.equal(ai.aiCombatTarget, drone);
        assert.equal(context.keys[ai.controls.right], true, 'melee CPU did not pursue the distant drone');
        assert.equal(context.keysPressed[ai.controls.attack], undefined, 'melee CPU attacked before reaching the drone');
    }
});

test('battle royale CPUs prioritize hostile drones owned by a fighter other than their current target', () => {
    const context = loadAI();
    const ai = makeFighter('Hason', 'cpu_hason');
    const currentTarget = makeFighter('Macu', 'cpu_macu');
    const d2fOwner = makeFighter('D2F1', 'player_d2f');
    currentTarget.x = 420;
    d2fOwner.x = 610;
    ai.superCooldown = 5000;
    const drone = {
        type: 'd2f_drone', owner: d2fOwner, x: 960, y: 430, w: 34, h: 24,
        vx: 0, vy: 0, hp: 65, maxHp: 65, dead: false, untargetable: false, laserActive: false
    };
    const game = makeGame(ai, currentTarget);
    game.isBattleRoyale = true;
    game.fighters = [ai, currentTarget, d2fOwner];
    game.aiFighters = [ai, currentTarget];
    game.minions.push(drone);
    game.aiDifficulty = 'expert';
    readyBrain(ai, currentTarget);

    context.window.runAI(game, 16);

    assert.equal(ai.aiCombatTarget, drone);
    assert.equal(context.keysPressed[ai.controls.attack], true);
});

test('CPU attacks and homing projectiles preserve the selected drone target', () => {
    const simulation = loadPhysicsGame('D2F1');
    const { ai, context, target } = simulation;
    const drone = {
        type: 'd2f_drone', owner: target, x: 1150, y: 300, w: 34, h: 24,
        vx: 0, vy: 0, hp: 65, maxHp: 65, dead: false, untargetable: false
    };
    context.game.minions.push(drone);
    ai.isCPU = true;
    ai.aiCombatTarget = drone;
    ai.executeActiveAttack();

    const electromagneticBall = context.game.projectiles[0];
    assert.ok(electromagneticBall.vx > 0, 'CPU projectile aimed back toward the nearer fighter');
    assert.ok(electromagneticBall.vy < 0, 'CPU projectile ignored the elevated drone');

    const projectileContext = loadProjectileContext();
    const enemyFighter = {
        id: 'fighter', x: 500, y: 500, w: 40, h: 70, dead: false, invincible: 0,
        buffs: {}, takeDamage() {}
    };
    const homingDrone = {
        id: 'drone', type: 'd2f_drone', x: 900, y: 260, w: 34, h: 24,
        dead: false, untargetable: false, invincible: 0, buffs: {}, takeDamage() {}
    };
    const owner = { id: 'cpu', heroName: 'Hunter', isCPU: true, aiCombatTarget: homingDrone };
    projectileContext.game.opponents = [enemyFighter];
    projectileContext.game.minions = [homingDrone];
    projectileContext.game.getEnemyOf = () => enemyFighter;
    const homingShot = new projectileContext.window.Projectile(400, 500, 12, 12, 25, 0, 20, owner, '#fff', 'homing_bullet');
    homingShot.update(16);

    assert.ok(homingShot.vy < 0, 'homing projectile retargeted the nearer fighter');
});

test('every hero with a direct super can decide to use it', () => {
    const context = loadAI();
    const directSuperHeroes = [
        'Hason', 'Willi', 'Hunter', 'Macu', 'Artu', 'Duke', 'Kadaxi', 'Euclid',
        'Lique', 'Kae', 'Kila', 'Volt', 'Gensan', 'Noae', 'Wolf', 'Kuro', 'Sola', 'Nyra', 'Orion', 'Archor', 'Itan', 'D2F1'
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
        { hero: 'Noae', action: 'switch', setup: ai => { ai.superCooldown = 5000; } },
        { hero: 'Archor', action: 'switch', setup: ai => { ai.superCooldown = 5000; ai.archorSpeedCooldown = 0; ai.buffs.slow = 1000; } },
        { hero: 'D2F1', action: 'switch', setup: ai => { ai.superCooldown = 5000; ai.d2fDroneCooldown = 0; } }
    ];

    for (const testCase of cases) {
        const context = loadAI();
        const ai = makeFighter(testCase.hero, `cpu_${testCase.hero}`);
        const target = makeFighter('Noae', `target_${testCase.hero}`);
        target.x = testCase.hero === 'Hunter' || testCase.hero === 'Euclid' || testCase.hero === 'Archor'
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

test('Itan has a wide Naginata swing and an invincible 2s Chiq cast', () => {
    const simulation = loadPhysicsGame('Itan');
    const { ai, target, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;
    ai.superCooldown = 0;

    const hitbox = ai.getMeleeHitbox();
    assert.equal(hitbox.w, 132);
    assert.equal(hitbox.h, 92);
    assert.equal(ai.getMeleeDamage(), 32);

    ai.performSuper();
    assert.equal(ai.itanSuperWindupTimer, 2000);
    assert.equal(ai.invincible, 2000);
    assert.equal(ai.superCooldown, 3000);
    assert.equal(context.game.projectiles.length, 0);

    ai.update(1000);
    assert.equal(context.game.projectiles.length, 0, 'Chiq released before the 2s cast completed');
    const hpBeforeHit = ai.hp;
    ai.takeDamage(10, target);
    assert.equal(ai.hp, hpBeforeHit, 'Itan took damage during the invincible Chiq windup');
    assert.equal(ai.itanSuperWindupTimer, 1000);
    ai.update(1000);
    const blades = context.game.projectiles.filter(projectile => projectile.type === 'chiq_blade');
    assert.equal(blades.length, 3);
    assert.ok(blades.every(blade => blade.damage === 50));
    assert.ok(blades.every(blade => Math.hypot(blade.vx, blade.vy) > 31));
    assert.equal(context.game.minions.filter(minion => minion.type === 'chiq_path').length, 3);
});

test('Itan Nu mode doubles attack cadence and empowers red Chiq', () => {
    const simulation = loadPhysicsGame('Itan');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;

    context.keysPressed[ai.controls.switch] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.switch];
    assert.equal(ai.buffs.nuMode, 8000);

    ai.performAttack();
    assert.equal(ai.stateTimer, 90, 'Nu mode did not double regular attack windup speed');
    ai.attackState = 'idle';
    ai.releaseItanChiq();
    const blades = context.game.projectiles.filter(projectile => projectile.type === 'chiq_blade');
    assert.equal(blades.length, 3);
    assert.ok(blades.every(blade => blade.damage === 100 && blade.chiqNu && blade.color === '#ff3030'));
    assert.ok(context.game.minions.filter(minion => minion.type === 'chiq_path').every(path => path.nuMode));
});

test('Itan Chiq applies heavy slow and bleed but can be deflected', () => {
    const context = loadProjectileContext();
    const owner = { id: 'itan', heroName: 'Itan' };
    const target = {
        x: 100, y: 100, w: 40, h: 70, vx: 0, vy: 0, hp: 200,
        dead: false, invincible: 0, buffs: {}, attackState: 'idle',
        isMeleeAttack: () => false,
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    const blade = new context.window.Projectile(100, 100, 42, 12, 0, 0, 50, owner, '#bffcff', 'chiq_blade');
    blade.update(16);
    assert.equal(target.hp, 150);
    assert.equal(target.buffs.slow, 3500);
    assert.equal(target.buffs.bleed, 6000);

    const sola = {
        x: 100, y: 100, w: 40, h: 70, vx: 0, vy: 0, hp: 200, facing: -1,
        heroName: 'Sola', dead: false, invincible: 0, buffs: {}, attackState: 'active', solaFocus: 0,
        isMeleeAttack: () => true,
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [sola];
    const blockedBlade = new context.window.Projectile(100, 100, 42, 12, 0, 0, 50, owner, '#bffcff', 'chiq_blade');
    blockedBlade.update(16);
    assert.equal(sola.hp, 200);
    assert.equal(blockedBlade.owner, sola);
    assert.equal(sola.solaFocus, 1);
});

test('Chiq paths last five seconds, control enemies, and heal Itan with Nu doubling', () => {
    const context = loadProjectileContext();
    const owner = { id: 'itan', heroName: 'Itan', hp: 100, maxHp: 200, dead: false };
    const target = { x: 180, y: 100, w: 40, h: 70, dead: false, invincible: 0, buffs: {} };
    context.game.opponents = [target];

    const path = new context.window.ChiqPath(owner, 100, 170, 500, 170, false);
    path.update(500);
    assert.equal(path.life, 4500);
    assert.equal(target.buffs.slow, 650);
    assert.equal(target.buffs.bleed, 1500);
    assert.equal(owner.hp, 103);
    path.update(4500);
    assert.equal(path.dead, true);

    owner.hp = 100;
    target.buffs = {};
    const nuPath = new context.window.ChiqPath(owner, 100, 170, 500, 170, true);
    nuPath.update(500);
    assert.equal(target.buffs.gravitySlow, 650);
    assert.equal(owner.hp, 106);
});

test('Hoin has exactly half of his former HP in the hero roster', () => {
    const context = {
        window: { innerWidth: 1280, innerHeight: 760, addEventListener() {} },
        localStorage: { getItem: () => null, setItem() {} },
        document: { getElementById: () => null }
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
    vm.runInContext(source, context, { filename: 'config.js' });

    assert.equal(context.window.HEROES.Archor.maxHp, 340);
    assert.equal(context.window.HEROES.Archor.ui.hp, '34 WRD');
});

test('D2F-1 fires 0.5 WRD electromagnetic balls and deploys exact drone groups', () => {
    const simulation = loadPhysicsGame('D2F1');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;

    ai.performAttack();
    assert.equal(ai.stateTimer, 60);
    ai.update(60);
    assert.equal(context.game.projectiles.length, 1);
    assert.equal(context.game.projectiles[0].type, 'em_ball');
    assert.equal(context.game.projectiles[0].damage, 5);

    ai.attackState = 'idle';
    ai.stateTimer = 0;
    context.keysPressed[ai.controls.switch] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.switch];
    assert.equal(context.game.minions.filter(minion => minion.type === 'd2f_drone' && !minion.dead).length, 3);
    assert.equal(ai.d2fDroneCooldown, 10000);

    ai.attackState = 'idle';
    ai.superCooldown = 0;
    const beforeSuper = context.game.minions.filter(minion => minion.type === 'd2f_drone' && !minion.dead).length;
    ai.performSuper();
    const afterSuper = context.game.minions.filter(minion => minion.type === 'd2f_drone' && !minion.dead).length;
    assert.equal(afterSuper - beforeSuper, 4);
    assert.equal(context.game.minions.filter(minion => minion.type === 'd2f_target_beacon').length, 1);
    assert.equal(ai.superCooldown, 20000);
});

test('D2F-1 drones predict projectile paths, hold range, and cycle damage-only lasers', () => {
    const context = loadProjectileContext();
    const owner = { id: 'd2f', heroName: 'D2F1', x: 160, y: 560, w: 40, h: 66, dead: false };
    const target = {
        id: 'target', heroName: 'Hunter', x: 560, y: 500, w: 45, h: 70,
        hp: 200, dead: false, invincible: 0, stunTimer: 0, buffs: { burn: 125, slow: 80, dizzy: 40 },
        takeDamage(amount, attacker, isDoT, noKnockback, noHitReaction) {
            this.hp -= amount;
            if (!noHitReaction) this.stunTimer = 150;
        }
    };
    context.game.opponents = [target];
    context.game.getEnemyOf = () => target;
    const drone = new context.window.D2FDrone(owner, 300, 500, 0);
    context.game.minions = [drone];
    context.game.projectiles = [{
        x: 120, y: drone.y + drone.h/2 - 3, w: 8, h: 6, vx: 20, vy: 0,
        owner: target, dead: false
    }];

    drone.update(16);
    assert.equal(drone.evading, true);
    assert.equal(drone.hp, 33);
    assert.equal(drone.maxHp, 33);
    assert.equal(drone.moveSpeedMultiplier, 0.3);
    assert.ok(Math.abs(drone.vy) > 0, 'drone did not leave the predicted projectile path');
    assert.ok(Math.abs(drone.vy) < 0.7, 'drone evasion remained above half of its previous speed');

    context.game.projectiles = [];
    drone.cycleTimer = 0;
    drone.laserTickTimer = 0;
    drone.update(250);
    assert.equal(drone.laserActive, true);
    assert.equal(target.hp, 198);
    assert.equal(target.stunTimer, 0, 'laser damage applied a movement-locking hit reaction');
    assert.deepEqual(target.buffs, { burn: 125, slow: 80, dizzy: 40 });

    drone.cycleTimer = 1990;
    drone.update(9);
    assert.equal(drone.laserActive, true);
    drone.update(1);
    assert.equal(drone.laserActive, false, 'laser exceeded its two-second firing window');
    drone.cycleTimer = 2490;
    drone.update(10);
    assert.equal(drone.laserActive, true, 'laser did not restart on its 2.5-second cycle');
});

test('reaction-free drone damage does not interrupt fighter movement', () => {
    const simulation = loadPhysicsGame('Hunter');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;
    ai.stunTimer = 0;
    const startingHp = ai.hp;
    const startingX = ai.x;
    context.keys[ai.controls.right] = true;

    ai.takeDamage(2, { heroName: 'D2F1', x: 200, w: 40 }, true, true, true);
    ai.update(16);

    assert.equal(ai.hp, startingHp - 2);
    assert.equal(ai.stunTimer, 0);
    assert.ok(ai.x > startingX, 'fighter could not move while taking drone laser damage');
});

test('D2F-1 target beacon slows before a damaging robot landing and melee follow-up', () => {
    const context = loadProjectileContext();
    const owner = { id: 'd2f', heroName: 'D2F1', x: 160, y: 560, w: 40, h: 66, dead: false };
    const target = {
        id: 'target', heroName: 'Hunter', x: 560, y: 590, w: 45, h: 70,
        hp: 300, dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    context.game.getEnemyOf = () => target;
    const beacon = new context.window.D2FTargetBeacon(owner, target);
    context.game.minions = [beacon];

    beacon.update(500);
    assert.equal(target.buffs.slow, 280);
    assert.equal(context.game.minions.filter(minion => minion.type === 'd2f_giant_robot').length, 0);
    beacon.update(500);
    const robot = context.game.minions.find(minion => minion.type === 'd2f_giant_robot');
    assert.ok(robot, 'beacon did not create the giant robot after one second');
    assert.equal(robot.maxHp, 150);
    assert.equal(robot.hp, 150);

    for (let frame = 0; frame < 120 && robot.dropping; frame++) robot.update(16);
    assert.equal(robot.dropping, false);
    assert.equal(target.hp, 257.5);
    assert.equal(target.buffs.dizzy, 750);

    robot.attackCooldown = 0;
    robot.update(16);
    assert.equal(target.hp, 243.5);
});

test('Hoin activates Bloodhunt after three continuous hits and loses it after 3.5s', () => {
    const simulation = loadPhysicsGame('Archor');
    const { ai, target, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;
    ai.hp = 300;

    ai.performAttack();
    assert.equal(ai.stateTimer, 20, 'Archor did not use the rapid attack windup');
    ai.update(20);
    assert.equal(context.game.projectiles.length, 1);
    assert.equal(context.game.projectiles[0].type, 'archor_arrow');
    assert.equal(context.game.projectiles[0].damage, 6);
    assert.equal(context.game.projectiles[0].w, 36);
    assert.equal(context.game.projectiles[0].color, '#ffffa8');

    ai.onArchorHit(target);
    assert.equal(ai.hp, 300, 'Bloodhunt healed before the third continuous hit');
    assert.equal(ai.archorHitChain, 1);
    ai.update(1501);
    assert.equal(ai.archorHitChain, 0, 'an interrupted hit chain did not reset');

    ai.onArchorHit(target);
    ai.onArchorHit(target);
    assert.equal(ai.hp, 300, 'Bloodhunt activated before the third hit');
    ai.onArchorHit(target);
    assert.equal(ai.archorPassiveTimer, 3500);
    assert.equal(ai.hp, 310, 'active Bloodhunt did not heal 1 WRD');
    assert.equal(ai.archorDamageBonus, 2);

    ai.attackState = 'idle';
    ai.executeActiveAttack();
    assert.equal(context.game.projectiles[1].damage, 8, 'Bloodhunt did not increase arrow damage');

    for (let hit = 0; hit < 30; hit++) ai.onArchorHit(target);
    assert.equal(ai.hp, ai.maxHp);
    assert.equal(ai.archorDamageBonus, 30, 'Bloodhunt exceeded its +3 WRD cap');

    ai.attackState = 'idle';
    ai.stateTimer = 0;
    ai.update(3500);
    assert.equal(ai.archorPassiveTimer, 0);
    assert.equal(ai.archorDamageBonus, 0, 'temporary Bloodhunt damage remained after expiry');
});

test('Hoin switch cleanses debuffs and tracking bird super exposes the full kit', () => {
    const simulation = loadPhysicsGame('Archor');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;

    ai.stunTimer = 500;
    ai.buffs.poison = 1000;
    ai.buffs.dizzy = 1000;
    ai.buffs.slow = 1000;
    ai.buffs.gravitySlow = 1000;
    ai.buffs.burn = 1000;
    ai.buffs.bleed = 1000;
    context.keysPressed[ai.controls.switch] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.switch];
    assert.equal(ai.stunTimer, 0);
    ['poison', 'dizzy', 'slow', 'gravitySlow', 'burn', 'bleed'].forEach(name => assert.equal(ai.buffs[name], 0));
    assert.equal(ai.buffs.msBoost, 0);
    assert.equal(ai.archorSpeedCooldown, 8000);

    ai.superCooldown = 0;
    ai.performSuper();
    const bird = context.game.projectiles.find(projectile => projectile.type === 'tracking_bird');
    assert.ok(bird, 'Hunting Roc was not launched');
    assert.equal(bird.w, 54);
    assert.equal(bird.h, 40);
    assert.equal(bird.color, '#ffd84d');
    assert.equal(ai.superCooldown, ai.superCooldownMax);
});

test('tracking bird impact creates wide 7 WRD AoE with 2.5s dizzy', () => {
    const context = loadProjectileContext();
    const owner = { id: 'archor', heroName: 'Archor' };
    const target = {
        x: 100, y: 100, w: 40, h: 70, vx: 0, vy: 0, hp: 200,
        dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    };
    let explosion = null;
    context.game.opponents = [target];
    context.game.createExplosion = (...args) => { explosion = args; };
    const bird = new context.window.Projectile(100, 100, 34, 24, 0, 0, 0, owner, '#7df0aa', 'tracking_bird');

    bird.update(16);

    assert.equal(bird.dead, true);
    assert.ok(explosion, 'tracking bird did not explode on impact');
    assert.equal(explosion[2], 180);
    assert.equal(explosion[3], 70);
    assert.equal(explosion[5], false);
    assert.equal(explosion[6], 2500);
});

test('Hoin bird tracks for two seconds and then keeps an unguided course', () => {
    const context = loadProjectileContext();
    const owner = { id: 'archor', heroName: 'Archor' };
    const target = {
        x: 700, y: 500, w: 40, h: 70, vx: 0, vy: 0, hp: 200,
        dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    context.game.getEnemyOf = () => target;

    const trackingBird = new context.window.Projectile(200, 200, 54, 40, 18, 0, 0, owner, '#ffd84d', 'tracking_bird');
    trackingBird.timer = 1900;
    trackingBird.update(16);
    assert.ok(trackingBird.vy > 0, 'bird did not steer toward its target before two seconds');

    const unguidedBird = new context.window.Projectile(200, 200, 54, 40, 12, 3, 0, owner, '#ffd84d', 'tracking_bird');
    unguidedBird.timer = 2000;
    unguidedBird.update(16);
    assert.equal(unguidedBird.vx, 12);
    assert.equal(unguidedBird.vy, 3);
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

test('fully concealed Kuro is visible only to the owner with a red frame and no overhead HP bar', () => {
    const { ai } = loadPhysicsGame('Kuro');
    ai.kuroCloaked = true;
    ai.kuroAbsoluteCloakTimer = 3000;
    ai.vx = 0;
    ai.vy = 0;

    const makeContext = () => {
        const calls = [];
        const ctx = new Proxy({ calls }, {
            get(target, key) {
                if (key in target) return target[key];
                return (...args) => calls.push({ method: key, args, strokeStyle: target.strokeStyle });
            },
            set(target, key, value) {
                target[key] = value;
                return true;
            }
        });
        return ctx;
    };

    const opponentContext = makeContext();
    ai.draw(opponentContext);
    assert.equal(opponentContext.calls.length, 0, 'opponent view rendered a fully concealed Kuro');

    const ownerContext = makeContext();
    ai.draw(ownerContext, { revealOwnedKuro: true });
    assert.ok(ownerContext.calls.some(call => call.method === 'fillRect'), 'owner could not see their concealed Kuro');
    assert.ok(ownerContext.calls.some(call => call.method === 'strokeRect' && call.strokeStyle === '#ff2d2d'), 'owner visibility frame was missing');
    assert.equal(ownerContext.calls.some(call => call.method === 'fillRect' && call.args[1] === ai.y - 12), false, 'concealed Kuro still rendered the overhead HP bar');
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
    assert.equal(simulation.target.solaForceFallPending, true);
    assert.ok(simulation.target.solaForceFallPeakY < targetStartY);
});

test('Sola attacks faster and charges in a locked direction with continuous saber protection', () => {
    const simulation = loadPhysicsGame('Sola');
    const { ai, target, context } = simulation;
    ai.attackState = 'idle';

    assert.equal(ai.getMeleeDamage(), 56);
    ai.solaFocus = 2;
    assert.equal(ai.getMeleeDamage(), 72, 'Focus should remain an additive 0.8 WRD per stack');
    ai.solaFocus = 0;

    ai.performAttack();
    assert.equal(ai.stateTimer, 60);
    ai.update(60);
    assert.equal(ai.attackState, 'active');
    assert.equal(ai.stateTimer, 100);
    ai.update(100);
    assert.equal(ai.attackState, 'recovery');
    assert.equal(ai.stateTimer, 120);

    ai.attackState = 'idle';
    ai.vx = 0;
    ai.facing = 1;
    ai.solaDashCooldown = 0;
    context.keys[ai.controls.left] = true;
    context.keysPressed[ai.controls.switch] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.switch];
    delete context.keys[ai.controls.left];

    assert.equal(ai.solaChargeTimer, 700);
    assert.equal(ai.solaChargeDirection, -1);
    assert.equal(ai.solaDashCooldown, 6000);

    const startX = ai.x;
    target.x = ai.x - 55;
    target.y = ai.y;
    const targetHp = target.hp;
    context.checkAABB = (first, second) => first.x < second.x + second.w && first.x + first.w > second.x
        && first.y < second.y + second.h && first.y + first.h > second.y;

    ai.update(16);
    assert.ok(ai.x < startX, 'Sola did not advance in the locked charge direction');
    assert.equal(ai.facing, -1);
    assert.equal(target.hp, targetHp - 28);

    ai.update(16);
    assert.equal(target.hp, targetHp - 28, 'the same target was damaged more than once by one charge');

    const hpBefore = ai.hp;
    ai.takeDamage(100, target);
    assert.equal(ai.hp, hpBefore, 'incoming direct damage pierced Sola charge protection');
});

test('Force Choke victims take distance-based damage only when they land', () => {
    const simulation = loadPhysicsGame('Sola');
    const { ai, target } = simulation;
    ai.attackState = 'idle';
    ai.x = 610;
    ai.y = 100;
    ai.vx = 0;
    ai.vy = 0;
    ai.isGrounded = false;
    ai.solaForceHeld = false;
    ai.solaForceFallPending = true;
    ai.solaForceFallSourceId = target.id;
    ai.solaForceFallPeakY = ai.y;
    const hpBefore = ai.hp;

    ai.update(16);
    assert.equal(ai.hp, hpBefore, 'fall damage was applied before landing');
    assert.equal(ai.solaForceFallPending, true);

    for (let i = 0; i < 80 && ai.solaForceFallPending; i++) ai.update(16);

    assert.equal(ai.isGrounded, true);
    assert.equal(ai.currentPlatform?.type, 'center');
    assert.equal(ai.hp, hpBefore - 60, 'long Force Choke fall should use the 6 WRD cap');
    assert.equal(ai.lastAttacker, target);
    assert.equal(ai.solaForceFallPending, false);
});

test('Sola charge deflects every projectile type while the saber is otherwise idle', () => {
    const context = loadProjectileContext();
    const shooter = { id: 'shooter', heroName: 'Kila' };
    const sola = {
        id: 'sola', heroName: 'Sola', x: 108, y: 100, w: 40, h: 70,
        facing: -1, attackState: 'idle', solaChargeTimer: 500, solaFocus: 0,
        dead: false, invincible: 0,
        isMeleeAttack: () => true,
        takeDamage() {}
    };
    context.game.opponents = [sola];
    const wave = new context.window.Projectile(100, 100, 80, 120, 12, 0, 10, shooter, '#168cff', 'tidal_wave');

    wave.update(16);

    assert.equal(wave.owner, sola);
    assert.ok(wave.vx < 0, 'the tidal wave did not reverse direction');
    assert.equal(wave.dead, false);
    assert.equal(sola.solaFocus, 1);
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
