const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadBossHarness() {
    const players = [];
    const context = {
        window: {},
        console,
        Date,
        Math,
        CANVAS_W: 2800,
        CANVAS_H: 720,
        GROUND_Y: 620,
        GRAVITY: 0.6,
        PLATFORMS: [],
        BOSSES: {
            tyrannt: { name: 'TYRANNT', color: '#35d5e8', maxHp: 9000 },
            dragon: { name: 'DRAGON', color: '#ff5a36', maxHp: 7500 },
            libertus: { name: 'LIBERTUS', color: '#e8d39c', maxHp: 8500 }
        },
        checkAABB(a, b) {
            return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        },
        game: {
            minions: [],
            projectiles: [],
            hazards: [],
            particles: [],
            getFighters: () => players,
            getOpponentsOf: owner => owner?.isBoss || owner?.owner?.isBoss ? players.filter(player => !player.dead) : [],
            handleBossDefeat() {},
            createExplosion() {}
        }
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'entities.js'), 'utf8');
    vm.runInContext(`${source}\nthis.__bossExports = { BossLaserStrike, TyranntBoss, BossFireDemon, DragonBoss, BossKnight, LibertusBoss, createBoss };`, context, { filename: 'entities.js' });
    return { context, players, ...context.__bossExports };
}

function makePlayer(id, x, y = 550) {
    return {
        id, x, y, w: 40, h: 70, hp: 1000, dead: false, invincible: 0,
        vx: 0, vy: 0, buffs: { slow: 0, burn: 0, dizzy: 0 },
        takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) this.dead = true;
        }
    };
}

test('TYRANNT summons 5-10 drones every 6s and two giants every 10s', () => {
    const harness = loadBossHarness();
    const player = makePlayer('p1', 250);
    harness.players.push(player);

    const droneBoss = new harness.TyranntBoss(1800, harness.context.GROUND_Y);
    harness.context.game.minions = [droneBoss];
    droneBoss.update(6000);
    const drones = harness.context.game.minions.filter(entity => entity.type === 'd2f_drone');
    assert.ok(drones.length >= 5 && drones.length <= 10);

    const giantBoss = new harness.TyranntBoss(1800, harness.context.GROUND_Y);
    harness.context.game.minions = [giantBoss];
    giantBoss.update(10000);
    assert.equal(harness.context.game.minions.filter(entity => entity.type === 'd2f_giant_robot').length, 2);
});

test('TYRANNT snapshots a three-column Laser Matrix on each player every 12s', () => {
    const harness = loadBossHarness();
    harness.players.push(makePlayer('p1', 300), makePlayer('p2', 750));
    const boss = new harness.TyranntBoss(1800, harness.context.GROUND_Y);
    harness.context.game.minions = [boss];

    boss.update(12000);

    assert.equal(harness.context.game.hazards.filter(hazard => hazard.type === 'boss_laser_strike').length, 6);
});

test('DRAGON summons fire demons and starts a five-second flame breath on schedule', () => {
    const harness = loadBossHarness();
    harness.players.push(makePlayer('p1', 600, 220));
    const boss = new harness.DragonBoss(1200, harness.context.GROUND_Y);
    harness.context.game.minions = [boss];

    boss.update(12000);

    assert.equal(harness.context.game.minions.filter(entity => entity.type === 'boss_fire_demon').length, 4);
    assert.equal(boss.flameTimer, 5000);
});

test('DRAGON flame breath ticks damage and skyfall applies heavy damage and slow', () => {
    const harness = loadBossHarness();
    const player = makePlayer('p1', 720, 235);
    harness.players.push(player);
    const boss = new harness.DragonBoss(300, harness.context.GROUND_Y);
    harness.context.game.minions = [boss];

    boss.flameTimer = 5000;
    boss.updateFlame(0, player);
    boss.updateFlame(250, player);
    assert.ok(player.hp < 1000);
    assert.ok(player.buffs.burn > 0);

    player.hp = 1000;
    player.y = harness.context.GROUND_Y - player.h;
    boss.x = 200;
    boss.y = 120;
    boss.startDash(player);
    boss.updateDash(900);
    boss.updateDash(680);
    assert.ok(player.hp <= 895);
    assert.ok(player.buffs.slow >= 3200);
});

test('DRAGON flame breath tracks moving players gradually and demons have reduced HP', () => {
    const harness = loadBossHarness();
    const player = makePlayer('p1', 800, 235);
    harness.players.push(player);
    const boss = new harness.DragonBoss(300, harness.context.GROUND_Y);
    boss.updateFlame(0, player);
    const initialAngle = boss.flameAngle;
    player.x = 380;
    player.y = 40;

    boss.updateFlame(250, player);

    const angularChange = Math.abs(Math.atan2(Math.sin(boss.flameAngle - initialAngle), Math.cos(boss.flameAngle - initialAngle)));
    assert.ok(angularChange > 0);
    assert.ok(angularChange <= boss.flameTurnRate * 250 + 0.000001);
    const demon = new harness.BossFireDemon(boss, 500, 150);
    assert.equal(demon.hp, 20);
    assert.equal(demon.maxHp, 20);
});

test('LIBERTUS summons five knights and releases a telegraphed colossal swing', () => {
    const harness = loadBossHarness();
    const player = makePlayer('p1', 720);
    harness.players.push(player);
    const boss = new harness.LibertusBoss(980, harness.context.GROUND_Y);
    harness.context.game.minions = [boss];

    boss.update(12000);
    assert.equal(harness.context.game.minions.filter(entity => entity.type === 'boss_knight').length, 5);
    assert.equal(boss.swingState, 'windup');

    boss.update(1000);
    assert.equal(boss.swingState, 'active');
    assert.ok(player.hp <= 875);
});

test('boss death delegates the match result exactly once', () => {
    const harness = loadBossHarness();
    const boss = new harness.TyranntBoss(1000, harness.context.GROUND_Y);
    let defeatedBoss = null;
    harness.context.game.handleBossDefeat = defeated => { defeatedBoss = defeated; };

    boss.takeDamage(boss.maxHp, { id: 'p1' });
    boss.takeDamage(10, { id: 'p1' });

    assert.equal(boss.dead, true);
    assert.equal(defeatedBoss, boss);
});
