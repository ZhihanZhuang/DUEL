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
        hazards: [],
        opponents: [],
        getEnemyOf: () => null,
        getOpponentsOf() { return this.opponents; },
        getFighters() { return this.opponents; },
        createExplosion() {}
    };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, '..', 'entities.js'), 'utf8');
    vm.runInContext(`${source}\nwindow.Projectile = Projectile; window.KuroDecoy = KuroDecoy; window.UkonShadow = UkonShadow; window.PeachTree = PeachTree; window.GiantSword = GiantSword; window.GravityWell = GravityWell; window.ChiqPath = ChiqPath; window.D2FDrone = D2FDrone; window.D2FTargetBeacon = D2FTargetBeacon; window.D2FGiantRobot = D2FGiantRobot; window.TimeAnchor = TimeAnchor; window.TemporalEcho = TemporalEcho; window.LaegonLightning = LaegonLightning; window.LaegonHammer = LaegonHammer; window.LaegonHammerStrike = LaegonHammerStrike; window.BromBlastCharge = BromBlastCharge; window.BromStickyBomb = BromStickyBomb; window.DemolitionZone = DemolitionZone; window.TitanAxe = TitanAxe; window.MechanismNode = MechanismNode; window.MoriEnergyWire = MoriEnergyWire; window.MechanicFanBlade = MechanicFanBlade; window.MoriTrap = MoriTrap; window.ThousandMechanisms = ThousandMechanisms; window.GelannFlameCone = GelannFlameCone; window.GelannArrowRain = GelannArrowRain; window.RokaCannonball = RokaCannonball; window.RokaMortarShell = RokaMortarShell; window.TemporalBolt = TemporalBolt; window.VossTemporalDouble = VossTemporalDouble; window.DogelChainHook = DogelChainHook; window.LapisStone = LapisStone; window.ToniaGrenade = ToniaGrenade; window.ToniaMissile = ToniaMissile; window.LakEarthWall = LakEarthWall; window.LakShockwave = LakShockwave; window.LakMountainBreaker = LakMountainBreaker; window.PatThread = PatThread; window.PatMarionette = PatMarionette; window.FengQigong = FengQigong; window.FengWindWave = FengWindWave; window.OcelFeatheredSerpent = OcelFeatheredSerpent; window.OcelRitualZone = OcelRitualZone; window.OcelFifthSun = OcelFifthSun; window.ElectromagneticMatrix = ElectromagneticMatrix; window.MagneticRepulsion = MagneticRepulsion; window.MatrixBombardment = MatrixBombardment; window.BlackSpike = BlackSpike; window.BlackShard = BlackShard; window.HellHand = HellHand; window.HellTearEffect = HellTearEffect; window.GateOfHell = GateOfHell; window.NerathResurrection = NerathResurrection;`, context, { filename: 'entities.js' });
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
        laegonEnergy: 100,
        laegonSwitchCooldown: 0,
        thunderCharges: 0,
        thunderGodTimer: 0,
        veyraHistory: [],
        veyraAnchors: [],
        veyraReversalTimer: 0,
        bromStickyBomb: null,
        axeronCombo: 0,
        axeronMarks: [],
        axeronRushTimer: 0,
        axeronRushCooldown: 0,
        ukonDashCooldown: 0,
        ukonShadowCooldown: 0,
        ukonUltimatePhase: null,
        moriGrappleCooldown: 0,
        rokaMortarCooldown: 0,
        rokaArtilleryTimer: 0,
        vossCopyCooldown: 0,
        vossCopyTimer: 0,
        vossCopiedMelee: false,
        raigoEnergy: 100,
        raigoArmorTimer: 0,
        gelannBreathCooldown: 0,
        dogelChainCooldown: 0,
        lapisJudgmentCooldown: 0,
        lapisWhipTimer: 0,
        toniaHeat: 0,
        toniaGrenadeCooldown: 0,
        toniaOverheated: false,
        isMeleeAttack() {
            if (this.heroName === 'Laegon') return this.thunderGodTimer > 0;
            if (this.heroName === 'Voss') return this.vossCopyTimer > 0 && this.vossCopiedMelee;
            if (this.heroName === 'Lapis') return this.lapisWhipTimer > 0;
            return !['Hason', 'Willi', 'Ugo', 'Kila', 'Volt', 'Noae', 'Kuro', 'Nyra', 'Archor', 'D2F1', 'Veyra', 'Brom', 'Mori', 'Roka', 'Tonia'].includes(this.heroName)
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
    class UkonShadow extends Entity {
        constructor(owner, target) {
            super(target.x, target.y, owner.w, owner.h);
            Object.assign(this, { owner, target, targetId: target.id, type: 'ukon_shadow', hp: 18, maxHp: 18, buffs: {} });
        }
    }
    class PeachTree extends Entity {
        constructor(owner, centerX) {
            super(centerX - 88, 34, 176, 626);
            Object.assign(this, { owner, type: 'peach_tree', life: 18000, untargetable: true });
        }
    }
    class MechanismNode extends Entity { constructor(owner,x,y){super(x,y,12,12);Object.assign(this,{owner,type:'mori_node',life:5000,serial:++owner.moriNodeSerial});} }
    class MoriEnergyWire extends Entity { constructor(owner,first,second){super(first.x,first.y,100,8);Object.assign(this,{owner,first,second,type:'mori_wire',life:5000});} }
    class MechanicFanBlade extends Entity { constructor(owner,x,y,vx,vy){super(x,y,28,12);Object.assign(this,{owner,vx,vy,type:'mori_fan'});} }
    class ThousandMechanisms extends Entity { constructor(owner){super(0,0,1280,660);Object.assign(this,{owner,type:'thousand_mechanisms',life:8000});} }
    class GelannFlameCone extends Entity { constructor(owner){super(owner.x,owner.y,190,120);Object.assign(this,{owner,type:'gelann_flame_cone',life:1200});} }
    class GelannArrowRain extends Entity { constructor(owner,targetX){super(targetX-280,0,560,660);Object.assign(this,{owner,type:'gelann_arrow_rain',warning:750,duration:2500});} }
    class DogelChainHook extends Entity { constructor(owner,target){super(owner.x,owner.y,18,18);Object.assign(this,{owner,target,type:'dogel_chain_hook'});} }
    class LapisStone extends Entity { constructor(owner,index,target,judgment=false){super(owner.x,owner.y,20,20);Object.assign(this,{owner,index,target,judgment,type:'lapis_stone'});owner.lapisStoneInFlight[index]++;owner.lapisStoneAvailable[index]=false;} finish(){this.owner.lapisStoneInFlight[this.index]=Math.max(0,this.owner.lapisStoneInFlight[this.index]-1);this.owner.lapisStoneAvailable[this.index]=this.owner.lapisStoneInFlight[this.index]===0;this.dead=true;} }
    class ToniaGrenade extends Entity { constructor(owner,vx,vy){super(owner.x,owner.y,14,14);Object.assign(this,{owner,vx,vy,type:'tonia_grenade'});} }
    class ToniaMissile extends Entity { constructor(owner,target,offset){super(owner.x,owner.y,30,12);Object.assign(this,{owner,target,offset,type:'tonia_missile'});} }
    class LakEarthWall extends Entity { constructor(owner){super(owner.x,owner.y,52,112);Object.assign(this,{owner,type:'lak_earth_wall',life:4000});} }
    class LakShockwave extends Entity { constructor(owner,damage=12,radius=115){super(owner.x-radius,owner.y,radius*2,34);Object.assign(this,{owner,damage,radius,type:'lak_shockwave'});} }
    class LakMountainBreaker extends Entity { constructor(owner){super(0,0,1280,760);Object.assign(this,{owner,type:'lak_mountain_breaker',waveCount:5});} }
    class PatThread extends Entity { constructor(owner,target,binding=false){super(owner.x,owner.y,18,6);Object.assign(this,{owner,target,binding,type:binding?'pat_binding_thread':'pat_thread_lash'});} }
    class PatMarionette extends Entity { constructor(owner,target){super(0,0,1280,760);Object.assign(this,{owner,target,type:'pat_marionette',life:3000});} }
    class FengQigong extends Entity { constructor(owner,angle){super(owner.x,owner.y,18,18);Object.assign(this,{owner,angle,type:'feng_qigong',vx:Math.cos(angle)*16,vy:Math.sin(angle)*16});} }
    class FengWindWave extends Entity { constructor(owner,angle,ultimate=false){super(owner.x,owner.y,52,38);Object.assign(this,{owner,angle,ultimate,type:'feng_wind_wave',vx:Math.cos(angle)*12,vy:Math.sin(angle)*12});} }
    class OcelFeatheredSerpent extends Entity { constructor(owner){super(owner.x,owner.y,112,58);Object.assign(this,{owner,type:'ocel_feathered_serpent'});} }
    class OcelRitualZone extends Entity { constructor(owner){super(owner.x,owner.y,290,34);Object.assign(this,{owner,type:'ocel_ritual_zone',life:4000});} }
    class OcelFifthSun extends Entity { constructor(owner){super(0,0,1280,760);Object.assign(this,{owner,type:'ocel_fifth_sun',life:6500});} }
    class ElectromagneticMatrix extends Entity { constructor(owner,angle,overcharged=false){super(owner.x,owner.y,overcharged?142:112,overcharged?82:64);Object.assign(this,{owner,angle,overcharged,type:'electromagnetic_matrix'});} }
    class MagneticRepulsion extends Entity { constructor(owner){super(owner.x,owner.y,380,380);Object.assign(this,{owner,type:'magnetic_repulsion'});} }
    class MatrixBombardment extends Entity { constructor(owner,target){super(0,0,620,660);Object.assign(this,{owner,target,type:'matrix_bombardment'});} }
    class BlackShard extends Entity { constructor(owner,angle){super(owner.x,owner.y,22,16);Object.assign(this,{owner,angle,type:'black_shard'});} }
    class HellHand extends Entity { constructor(owner,target,side,castId){super(target.x,target.y,48,50);Object.assign(this,{owner,target,side,castId,type:'hell_hand',hp:30});} }
    class GateOfHell extends Entity { constructor(owner,target){super(target.x,590,500,70);Object.assign(this,{owner,target,type:'gate_of_hell'});} }
    class NerathResurrection extends Entity { constructor(owner){super(owner.x,owner.y,180,150);Object.assign(this,{owner,type:'nerath_resurrection'});} }
    class RokaCannonball extends Entity { constructor(owner,x,y,vx,vy,artillery){super(x,y,28,28);Object.assign(this,{owner,vx,vy,artillery,type:'roka_cannonball',damage:artillery?50:40,radius:artillery?165:110});} }
    class RokaMortarShell extends Entity { constructor(owner,x,y){super(x,y,20,26);Object.assign(this,{owner,targetX:x,targetY:y,type:'roka_mortar'});} }
    class TemporalBolt extends Entity { constructor(owner,x,y,vx,vy,damage,kind){super(x,y,18,14);Object.assign(this,{owner,vx,vy,damage,kind,type:kind==='copy'?'voss_copy_bolt':'temporal_shard'});} }
    class TemporalEcho extends Entity { constructor(owner,x,y){super(x,y,owner.w,owner.h);Object.assign(this,{owner,type:'temporal_echo',life:3000,maxLife:3000});} }
    class VossTemporalDouble extends Entity { constructor(owner,x,y){super(x,y,owner.w,owner.h);Object.assign(this,{owner,type:'voss_double',life:6000,queue:[]});} mirrorAttack(data){this.queue.push(data);} }
    class Hurricane extends Entity { constructor(owner,x,y){super(x,y,120,120);Object.assign(this,{owner,type:'hurricane',life:5000});} }

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
        UkonShadow,
        PeachTree,
        MechanismNode,
        MoriEnergyWire,
        MechanicFanBlade,
        ThousandMechanisms,
        GelannFlameCone,
        GelannArrowRain,
        DogelChainHook,
        LapisStone,
        ToniaGrenade,
        ToniaMissile,
        LakEarthWall,
        LakShockwave,
        LakMountainBreaker,
        PatThread,
        PatMarionette,
        FengQigong,
        FengWindWave,
        OcelFeatheredSerpent,
        OcelRitualZone,
        OcelFifthSun,
        ElectromagneticMatrix,
        MagneticRepulsion,
        MatrixBombardment,
        BlackShard,
        HellHand,
        GateOfHell,
        NerathResurrection,
        RokaCannonball,
        RokaMortarShell,
        TemporalBolt,
        TemporalEcho,
        VossTemporalDouble,
        Hurricane,
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
            Itan: { maxHp: 820, speed: 5, jump: 14.5, width: 42, height: 72, color: '#9f3347', superCD: 5000 },
            D2F1: { maxHp: 520, speed: 7.2, jump: 16, width: 40, height: 66, color: '#35d5e8', superCD: 35000 },
            Veyra: { maxHp: 700, speed: 6.2, jump: 14.5, width: 39, height: 69, color: '#9d5cff', superCD: 18000 },
            Axeron: { maxHp: 700, speed: 6.5, jump: 16, width: 39, height: 68, color: '#2468c9', superCD: 22000 },
            Ukon: { maxHp: 850, speed: 7.4, jump: 17, width: 42, height: 72, color: '#b94b3f', superCD: 28000 },
            Mori: { maxHp: 800, speed: 5.4, jump: 15, width: 40, height: 70, color: '#c58a32', superCD: 26000 },
            Roka: { maxHp: 600, speed: 4.6, jump: 14, width: 42, height: 70, color: '#496d7b', superCD: 24000 },
            Voss: { maxHp: 750, speed: 5.6, jump: 15, width: 40, height: 70, color: '#5660a8', superCD: 22000 },
            Raigo: { maxHp: 800, speed: 6.4, jump: 16, width: 42, height: 72, color: '#287b8f', superCD: 22000 },
            Gelann: { maxHp: 750, speed: 6.1, jump: 15.5, width: 40, height: 70, color: '#b6422b', superCD: 24000 },
            Vaeilash: { maxHp: 700, speed: 7.2, jump: 16, width: 36, height: 67, color: '#a71930', superCD: 24000 },
            Dogel: { maxHp: 800, speed: 5.8, jump: 15, width: 42, height: 72, color: '#7c2538', superCD: 26000 },
            Lapis: { maxHp: 650, speed: 5.2, jump: 14.5, width: 40, height: 68, color: '#4066b1', superCD: 24000 },
            Tonia: { maxHp: 700, speed: 4.9, jump: 14, width: 44, height: 70, color: '#61706e', superCD: 25000 },
            Ge: { maxHp: 850, speed: 5.5, jump: 15, width: 43, height: 72, color: '#9a6a2f', superCD: 26000 },
            Lak: { maxHp: 1000, speed: 4.2, jump: 13, width: 48, height: 76, color: '#6f6759', superCD: 30000 },
            Pat: { maxHp: 700, speed: 5.2, jump: 14.5, width: 39, height: 69, color: '#a34887', superCD: 28000 },
            Feng: { maxHp: 800, speed: 6.8, jump: 16.5, width: 40, height: 70, color: '#dffbff', superCD: 24000 },
            Ocel: { maxHp: 900, speed: 5.7, jump: 15, width: 44, height: 73, color: '#137f78', superCD: 20000 },
            Magnetar: { maxHp: 850, speed: 4.2, jump: 13.5, width: 48, height: 75, color: '#385985', superCD: 28000 },
            Nerath: { maxHp: 720, speed: 5.5, jump: 14.5, width: 40, height: 70, color: '#541627', superCD: 26000 }
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
        'Lique', 'Kae', 'Kila', 'Volt', 'Gensan', 'Noae', 'Wolf', 'Kuro', 'Sola', 'Nyra', 'Orion', 'Archor', 'Itan', 'D2F1', 'Laegon', 'Veyra', 'Brom', 'Axeron', 'Ukon', 'Mori', 'Roka', 'Voss', 'Raigo', 'Gelann', 'Dogel', 'Lapis', 'Tonia', 'Ge', 'Lak', 'Pat'
    ];

    for (const heroName of directSuperHeroes) {
        context.keysPressed = {};
        const ai = makeFighter(heroName, `cpu_${heroName}`);
        const target = makeFighter('Noae', `target_${heroName}`);
        target.x = heroName === 'Lique' ? 510 : 540;
        if (heroName === 'Kuro') target.hp = target.maxHp * 0.35;
        if (heroName === 'Sola') ai.solaFocus = 1;
        if (heroName === 'Artu') ai.superCooldown = 0;
        if (heroName === 'Laegon') ai.hp = ai.maxHp * 0.4;
        if (heroName === 'Veyra') { ai.veyraHistory = [{ x: ai.x, y: ai.y, hp: ai.hp, age: 3000 }]; ai.hp *= 0.5; }
        if (heroName === 'Brom') target.buffs.dizzy = 1000;
        if (heroName === 'Axeron') target.hp = target.maxHp * 0.35;
        if (heroName === 'Ukon') target.hp = target.maxHp * 0.35;
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
        { hero: 'Orion', role: 'gravity' },
        { hero: 'Laegon', role: 'thunder_mage' },
        { hero: 'Veyra', role: 'chronomancer' },
        { hero: 'Brom', role: 'demolitionist' },
        { hero: 'Axeron', role: 'power_assassin' },
        { hero: 'Ukon', role: 'dash_assassin' },
        { hero: 'Mori', role: 'mechanist' }
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

test('Itan has a wide Naginata swing and a damageable, debuff-immune 2s Chiq cast', () => {
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
    assert.equal(ai.invincible, 0);
    assert.equal(ai.superCooldown, 5000);
    assert.equal(context.game.projectiles.length, 0);

    ai.update(1000);
    assert.equal(context.game.projectiles.length, 0, 'Chiq released before the 2s cast completed');
    const hpBeforeHit = ai.hp;
    ai.takeDamage(10, target);
    assert.equal(ai.hp, hpBeforeHit - 10, 'Itan did not take damage during the Chiq windup');
    ai.buffs.dizzy = 900;
    ai.buffs.slow = 1200;
    ai.buffs.poison = 1500;
    ai.stunTimer = 300;
    ai.update(16);
    assert.equal(ai.buffs.dizzy, 0);
    assert.equal(ai.buffs.slow, 0);
    assert.equal(ai.buffs.poison, 0);
    assert.equal(ai.stunTimer, 0);
    assert.equal(ai.itanSuperWindupTimer, 984);
    ai.update(984);
    const blades = context.game.projectiles.filter(projectile => projectile.type === 'chiq_super_blade');
    assert.equal(blades.length, 3);
    assert.ok(blades.every(blade => blade.damage === 60));
    assert.ok(blades.every(blade => Math.abs(Math.hypot(blade.vx, blade.vy) - 8) < 1e-9));
    assert.equal(context.game.minions.filter(minion => minion.type === 'chiq_path').length, 0);
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

test('Hoin regular arrows deal damage without knockback', () => {
    const context = loadProjectileContext();
    const owner = { id: 'archor', heroName: 'Archor' };
    const hit = [];
    const target = {
        x: 100, y: 100, w: 40, h: 70, dead: false, invincible: 0,
        buffs: {}, attackState: 'idle',
        takeDamage(amount, attacker, isDoT, noKnockback) { hit.push({ amount, attacker, isDoT, noKnockback }); }
    };
    context.game.opponents = [target];

    new context.window.Projectile(100, 100, 36, 4, 0, 0, 6, owner, '#ffffa8', 'archor_arrow').update(16);

    assert.equal(hit.length, 1);
    assert.equal(hit[0].amount, 6);
    assert.equal(hit[0].attacker, owner);
    assert.equal(hit[0].noKnockback, true);
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
    assert.equal(ai.superCooldown, 35000);
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

test('Force Choke victims escape through a hidden five-to-fifteen attack-tap check', () => {
    const simulation = loadPhysicsGame('Sola');
    const { ai, context } = simulation;
    const target = new context.window.Fighter('victim', 'Hunter', 175, makeControls('VICTIM'), true);
    target.isGrounded = true;
    target.y = context.GROUND_Y - target.h;
    context.game.p1 = target;
    context.game.getOpponentsOf = fighter => fighter === ai ? [target] : [ai];
    context.game.getEnemyOf = fighter => fighter === ai ? target : ai;
    context.game.getFighters = () => [ai, target];
    ai.attackState = 'idle';
    ai.superCooldown = 0;
    context.keys[ai.controls.super] = true;
    ai.performSuper();

    assert.ok(target.solaForceEscapeTarget >= 5 && target.solaForceEscapeTarget <= 15);
    assert.equal(target.solaForceEscapeTaps, 0);
    target.solaForceEscapeTarget = 5;

    for (let tap = 1; tap < 5; tap++) {
        context.keysPressed[target.controls.attack] = true;
        target.update(16);
        assert.equal(target.solaForceHeld, true);
        assert.equal(target.solaForceEscapeTaps, tap);
        assert.equal(target.attackState, 'idle', 'escape tap triggered a normal attack');
    }

    context.keysPressed[target.controls.attack] = true;
    target.update(16);
    assert.equal(target.solaForceHeld, false);
    assert.equal(ai.solaForceActive, false);
    assert.equal(target.solaForceEscapeTarget, 0);
    assert.equal(target.solaForceEscapeTaps, 0);
    assert.equal(target.attackState, 'idle');

    target.solaForceHeld = true;
    const calls = [];
    const drawContext = new Proxy({ calls }, {
        get(object, key) {
            if (key in object) return object[key];
            return (...args) => calls.push({ method: key, args });
        },
        set(object, key, value) { object[key] = value; return true; }
    });
    target.draw(drawContext);
    const promptText = calls.filter(call => call.method === 'fillText').map(call => call.args[0]);
    assert.deepEqual(promptText.slice(0, 2), ['RAPIDLY TAP REGULAR', 'ATTACK TO ESCAPE']);
    assert.equal(promptText.some(text => /\d/.test(String(text))), false, 'escape requirement leaked its hidden tap count');
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

test('CPU fighters rapidly tap Basic Attack while held by Force Choke', () => {
    const context = loadAI();
    const ai = makeFighter('Hunter');
    const sola = makeFighter('Sola', 'player');
    readyBrain(ai, sola);
    const game = makeGame(ai, sola);
    ai.solaForceHeld = true;
    ai.solaForceEscapeTarget = 10;

    context.window.runAI(game, 16);

    assert.equal(context.keysPressed[ai.controls.attack], true);
    assert.equal(context.keys[ai.controls.left], false);
    assert.equal(context.keys[ai.controls.right], false);
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
    assert.equal(context.window.keys[p2.super], undefined);
    assert.equal(context.window.keys[context.window.ONLINE_REMOTE_BINDS.super], true);
    assert.equal(context.window.keysPressed[context.window.ONLINE_REMOTE_BINDS.super], true);

    context.window.applyRemoteOnlineInputs({ super: false });
    assert.equal(context.window.keys[context.window.ONLINE_REMOTE_BINDS.super], false);

    context.window.game = {
        getLocalControlledFighter: () => ({ controls: p2 })
    };
    context.window.keys[p1.super] = false;
    context.window.keysPressed[p1.super] = false;
    context.window.keys[p2.right] = true;
    context.window.keys[p2.super] = true;
    context.window.keysPressed[p2.super] = true;
    const challengerInputs = context.window.collectLocalOnlineInputs();
    assert.equal(challengerInputs.right, false);
    assert.equal(challengerInputs.super, false);
    assert.equal(challengerInputs.pSuper, false);

    context.window.keys[p1.right] = true;
    context.window.keys[p1.super] = true;
    context.window.keysPressed[p1.super] = true;
    const localWasdInputs = context.window.collectLocalOnlineInputs();
    assert.equal(localWasdInputs.right, true);
    assert.equal(localWasdInputs.super, true);
    assert.equal(localWasdInputs.pSuper, true);
});

test('Laegon lightning branches without duplicate hits and gains anti-summon damage', () => {
    const context = loadProjectileContext();
    const hits = [];
    const owner = { id: 'laegon', heroName: 'Laegon', onLaegonHit(target) { hits.push(target.id); } };
    const makeTarget = (id, x, heroName) => ({
        id, heroName, x, y: 100, w: 30, h: 40, hp: 100, dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    });
    const fighter = makeTarget('fighter', 100, 'Hunter');
    const summon = makeTarget('summon', 155, undefined);
    const third = makeTarget('third', 215, 'Willi');
    context.game.opponents = [fighter, third];
    context.game.minions = [summon];
    const bolt = new context.window.LaegonLightning(owner, 95, 115, 8, 0);
    context.game.projectiles = [bolt];

    bolt.update(16);
    assert.equal(fighter.hp, 92);
    assert.equal(context.game.projectiles.length, 3, 'first hit should create two branches');

    for (let frame = 0; frame < 20; frame++) {
        for (const projectile of [...context.game.projectiles]) if (!projectile.dead) projectile.update(16);
        context.game.projectiles = context.game.projectiles.filter(projectile => !projectile.dead);
    }
    assert.equal(summon.hp, 90, 'summoned units should take 25% bonus damage');
    assert.equal(new Set(hits).size, hits.length, 'one lightning attack hit the same target more than once');
});

test('Laegon CPU prioritizes nearby hostile summons for anti-summon pressure', () => {
    const context = loadAI();
    const ai = makeFighter('Laegon', 'cpu_laegon');
    const target = makeFighter('Artu', 'target_artu');
    target.x = 850;
    const summon = { id: 'summon', type: 'minion', owner: target, x: 560, y: 580, w: 30, h: 60, hp: 30, maxHp: 30, dead: false, untargetable: false, takeDamage() {} };
    const game = makeGame(ai, target);
    game.minions.push(summon);
    ai.superCooldown = 5000;
    ai.laegonSwitchCooldown = 5000;
    readyBrain(ai, target);

    context.window.runAI(game, 16);

    assert.equal(ai.aiCombatTarget, summon);
});

test('Brom chain reactions detonate each explosive once and preserve strong control', () => {
    const context = loadProjectileContext();
    const owner = { id: 'brom', heroName: 'Brom' };
    const target = {
        id: 'target', heroName: 'Hunter', x: 105, y: 100, w: 40, h: 70, vx: 0, vy: 0,
        hp: 200, dead: false, invincible: 0, buffs: {}, takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    const first = new context.window.BromStickyBomb(owner, 100, 120, 0, 0);
    const second = new context.window.BromStickyBomb(owner, 155, 120, 0, 0);
    context.game.projectiles = [first, second];

    first.detonate(new Set());

    assert.equal(first.dead, true);
    assert.equal(second.dead, true);
    assert.equal(target.hp, -100, 'both tripled-damage bombs should damage once during the chain');
    assert.equal(target.buffs.dizzy, 300);
    assert.ok(Math.abs(target.vx) > 0);
});

test('Veyra anchors expire and temporal echoes slow only on contact', () => {
    const context = loadProjectileContext();
    const owner = { id: 'veyra', heroName: 'Veyra', dead: false, w: 39, h: 69 };
    const target = {
        id: 'target', heroName: 'Hunter', x: 100, y: 100, w: 40, h: 70,
        dead: false, invincible: 0, buffs: {}, takeDamage() {}
    };
    context.game.opponents = [target];
    const anchor = new context.window.TimeAnchor(owner, 200, 200);
    anchor.update(11999);
    assert.equal(anchor.dead, false);
    anchor.update(1);
    assert.equal(anchor.dead, true);

    const echo = new context.window.TemporalEcho(owner, 100, 100);
    echo.update(16);
    assert.equal(target.buffs.slow, 1000);
    target.buffs.slow = 0;
    echo.update(16);
    assert.equal(target.buffs.slow, 0, 'one echo repeatedly reapplied its slow to the same target');
    echo.update(2968);
    assert.equal(echo.dead, true);
});

test('Veyra reversal restores position and half of recent HP loss only', () => {
    const simulation = loadPhysicsGame('Veyra');
    simulation.ai.x = 700;
    simulation.ai.y = 500;
    simulation.ai.hp = 400;
    simulation.ai.veyraHistory = [{ x: 220, y: 360, hp: 600, age: 3000 }];
    simulation.ai.veyraAnchors = [];

    simulation.ai.completeTimeReversal();

    assert.equal(simulation.ai.x, 220);
    assert.equal(simulation.ai.y, 360);
    assert.equal(simulation.ai.hp, 500);
    assert.equal(simulation.ai.superCooldown, 999999, 'reversal should not restore spent abilities');
});

test('Veyra has increased movement speed and doubled Chrono Bolt damage', () => {
    const simulation = loadPhysicsGame('Veyra');
    simulation.ai.facing = 1;
    simulation.ai.executeActiveAttack();

    assert.equal(simulation.ai.baseSpeed, 6.2);
    assert.equal(simulation.context.game.projectiles.length, 1);
    assert.equal(simulation.context.game.projectiles[0].type, 'chrono_bolt');
    assert.equal(simulation.context.game.projectiles[0].damage, 30);
});

test('Brom Demolition Zone triples damage and applies field slow and dizzy pulses', () => {
    const context = loadProjectileContext();
    const owner = { id: 'brom', heroName: 'Brom' };
    const target = {
        id: 'target', heroName: 'Hunter', x: 450, y: 170, w: 40, h: 70, vx: 0, vy: 0,
        hp: 1000, dead: false, invincible: 0, buffs: {}, takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    const zone = new context.window.DemolitionZone(owner, 300, 200);

    zone.update(2000);
    assert.ok(target.buffs.slow >= 400, 'active field did not apply slowdown');
    zone.update(500);

    assert.ok(target.buffs.dizzy >= 220, 'active field did not apply its dizzy pulse');
    assert.ok(target.hp <= 880, 'outer explosion did not use tripled damage');
});

test('Axeron applies a five-second mark on the second hit and rushes its target', () => {
    const simulation = loadPhysicsGame('Axeron');
    simulation.ai.attackState = 'idle';
    simulation.ai.stateTimer = 0;
    simulation.context.checkAABB = () => true;

    for (let hit=0; hit<2; hit++) {
        simulation.ai.attackState = 'active'; simulation.ai.stateTimer = 100;
        simulation.ai.maxStateTimer = 100; simulation.ai.hasHit = false;
        simulation.ai.update(16);
    }

    assert.equal(simulation.ai.axeronCombo, 0);
    assert.equal(simulation.ai.axeronMarks.length, 1);
    assert.equal(simulation.ai.axeronMarks[0].target, simulation.target);
    assert.ok(simulation.ai.axeronMarks[0].life >= 4900);

    const hpBeforeRush = simulation.target.hp;
    simulation.target.x = 900;
    simulation.target.y = 500;
    simulation.ai.attackState = 'idle';
    assert.equal(simulation.ai.startAxeronRush(), true);
    assert.equal(simulation.ai.axeronRushCooldown, 3000);
    assert.equal(simulation.ai.startAxeronRush(), false);
    simulation.ai.updateAxeronRush(180);

    assert.equal(simulation.target.hp, hpBeforeRush - 25);
    assert.ok(simulation.target.buffs.dizzy >= 260);
    assert.ok(simulation.target.vx > 20);
    assert.ok(simulation.ai.x < simulation.target.x);

    simulation.ai.update(1000);
    assert.equal(simulation.ai.axeronRushCooldown, 2000);
    assert.equal(simulation.ai.startAxeronRush(), false);
});

test('Axeron misses do not reset his every-second-hit mark counter', () => {
    const simulation = loadPhysicsGame('Axeron');
    simulation.ai.axeronCombo = 1;
    simulation.ai.attackState = 'active'; simulation.ai.stateTimer = 1;
    simulation.ai.maxStateTimer = 100; simulation.ai.hasHit = false;
    simulation.context.checkAABB = () => false;

    simulation.ai.update(16);

    assert.equal(simulation.ai.axeronCombo, 1);
    assert.equal(simulation.ai.axeronMarks.length, 0);

    simulation.ai.attackState = 'active'; simulation.ai.stateTimer = 100;
    simulation.ai.maxStateTimer = 100; simulation.ai.hasHit = false;
    simulation.context.checkAABB = () => true;
    simulation.ai.update(16);

    assert.equal(simulation.ai.axeronCombo, 0);
    assert.equal(simulation.ai.axeronMarks.length, 1);
});

test('Titan Descent heals Axeron from actual damage and grants nothing on invulnerability', () => {
    const context = loadProjectileContext();
    const owner = { id: 'axeron', heroName: 'Axeron', hp: 400, maxHp: 700, dead: false };
    const target = {
        id: 'target', heroName: 'Hunter', x: 180, y: 100, w: 40, h: 70, hp: 50,
        dead: false, invincible: 0, buffs: {}, takeDamage(amount) { this.hp = Math.max(0, this.hp-amount); }
    };
    context.game.opponents = [target];
    const axe = new context.window.TitanAxe(owner, 200, 170);
    axe.update(1450);

    assert.equal(target.hp, 0);
    assert.equal(owner.hp, 412.5, 'lifesteal used theoretical rather than actual damage');
    assert.ok(Math.abs(target.vx) > 0 || target.vy <= -12);

    const invulnerable = { ...target, id: 'invulnerable', hp: 100, invincible: 100, takeDamage() { throw new Error('invulnerable target was damaged'); } };
    context.game.opponents = [invulnerable];
    const secondAxe = new context.window.TitanAxe(owner, 200, 170);
    secondAxe.update(1450);
    assert.equal(owner.hp, 412.5);
});

test('Ukon replaces walking with discrete dashes that stop at platforms', () => {
    const simulation = loadPhysicsGame('Ukon');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.stateTimer = 0;
    ai.x = 230;
    ai.y = 480;
    ai.vx = 0;
    ai.vy = 0;

    context.keysPressed[ai.controls.right] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.right];
    assert.ok(ai.ukonDashTimer > 0, JSON.stringify({
        heroName: ai.heroName, attackState: ai.attackState, dashTimer: ai.ukonDashTimer,
        dashCooldown: ai.ukonDashCooldown, x: ai.x, y: ai.y, vx: ai.vx, vy: ai.vy,
        pressed: context.keysPressed[ai.controls.right]
    }));
    assert.ok(ai.vx > 16);

    ai.update(16);
    ai.update(16);
    assert.equal(ai.x, 300 - ai.w, 'right dash passed through the platform edge');
    assert.equal(ai.ukonDashTimer, 0);

    ai.x = 100;
    ai.y = context.GROUND_Y - ai.h;
    ai.vx = 0;
    ai.vy = 0;
    ai.ukonDashCooldown = 100;
    context.keys[ai.controls.right] = true;
    ai.update(16);
    assert.equal(ai.x, 100, 'held movement produced ordinary walking during dash cooldown');

    context.keys[ai.controls.right] = false;
    ai.ukonDashCooldown = 0;
    ai.isGrounded = true;
    ai.y = context.GROUND_Y - ai.h;
    context.keysPressed[ai.controls.jump] = true;
    ai.update(16);
    assert.ok(ai.vy < 0, 'Jump no longer uses the shared fighter jump behavior');
    assert.equal(ai.isGrounded, false);
});

test('Ukon Iron Rod Charge hits only when the target begins within reach', () => {
    const close = loadPhysicsGame('Ukon');
    close.ai.isCPU = false;
    close.ai.attackState = 'idle';
    close.ai.stateTimer = 0;
    close.ai.x = 100;
    close.ai.y = close.context.GROUND_Y - close.ai.h;
    close.target.x = 250;
    close.target.y = close.context.GROUND_Y - close.target.h;
    const closeHp = close.target.hp;
    close.ai.performAttack();
    assert.equal(close.ai.ukonRodCooldown, 800);
    assert.equal(close.ai.startUkonRodCharge(), false, 'Iron Rod Charge bypassed its cooldown');
    for (let frame = 0; frame < 12 && close.target.hp === closeHp; frame++) close.ai.update(16);

    assert.equal(close.target.hp, closeHp - 40, JSON.stringify({
        x: close.ai.x, y: close.ai.y, chargeTimer: close.ai.ukonChargeTimer,
        chargeCanStrike: close.ai.ukonChargeCanStrike, attackState: close.ai.attackState,
        targetX: close.target.x, targetY: close.target.y
    }));
    assert.ok(close.target.buffs.dizzy >= 320);
    assert.ok(Math.abs(close.target.vx) >= 19);

    close.ai.update(800);
    assert.equal(close.ai.ukonRodCooldown, 0);

    const far = loadPhysicsGame('Ukon');
    far.ai.isCPU = false;
    far.ai.attackState = 'idle';
    far.ai.stateTimer = 0;
    far.ai.x = 100;
    far.ai.y = far.context.GROUND_Y - far.ai.h;
    far.target.x = 900;
    far.target.y = far.context.GROUND_Y - far.target.h;
    const farHp = far.target.hp;
    far.ai.performAttack();
    for (let frame = 0; frame < 30; frame++) far.ai.update(16);

    assert.equal(far.target.hp, farHp, 'mobility-only charge damaged an initially distant target');
    assert.ok(far.ai.x > 250, 'mobility-only charge did not move Ukon');
    assert.ok(far.ai.x < 430, 'mobility-only charge exceeded its travel cap');
});

test('Ukon selects the closest target and summons win equal-distance ties', () => {
    const simulation = loadPhysicsGame('Ukon');
    const { ai, target, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.x = 300;
    ai.y = 500;
    target.x = 360;
    target.y = 500;
    const summon = {
        id: 'hostile_skeleton', type: 'skeleton', owner: target,
        x: 470, y: 500, w: 34, h: 60, hp: 100, maxHp: 100,
        dead: false, untargetable: false, buffs: {}, vx: 0, vy: 0,
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.minions.push(summon);

    assert.equal(ai.getUkonTarget(), target, 'a farther summon outranked the closest fighter');
    const ukonCenterX = ai.x + ai.w/2;
    const ukonCenterY = ai.y + ai.h/2;
    target.x = ukonCenterX + 100 - target.w/2;
    target.y = ukonCenterY - target.h/2;
    summon.x = ukonCenterX - 100 - summon.w/2;
    summon.y = ukonCenterY - summon.h/2;
    assert.equal(ai.getUkonTarget(), summon);
    assert.equal(ai.startUkonRodCharge(), true);
    assert.equal(ai.ukonChargeTarget, summon);
    ai.x = summon.x;
    ai.y = summon.y;
    assert.equal(ai.resolveUkonRodHit(), true);
    assert.equal(summon.hp, 60);
    assert.equal(target.hp, target.maxHp, 'Ukon attacked the fighter instead of its summon');
});

test('Ukon CPU navigates toward a closer hostile summon before its owning fighter', () => {
    const context = loadAI();
    const ai = makeFighter('Ukon', 'cpu_ukon_summon');
    const target = makeFighter('Euclid', 'target_summoner');
    target.x = 780;
    const summon = {
        type: 'skeleton', owner: target, x: 560, y: 570, w: 34, h: 60,
        hp: 60, maxHp: 60, dead: false, untargetable: false,
        takeDamage() {}
    };
    const game = makeGame(ai, target);
    game.minions.push(summon);
    readyBrain(ai, target);

    context.window.runAI(game, 16);

    assert.equal(ai.aiCombatTarget, summon);
});

test('Ukon Iron Shadow chases once, controls its target, and disappears', () => {
    const context = loadProjectileContext();
    const owner = { id: 'ukon', heroName: 'Ukon', x: 100, y: 500, w: 42, h: 72, facing: 1, dead: false };
    const target = {
        id: 'target', heroName: 'Hunter', x: 500, y: 500, w: 45, h: 70, hp: 300,
        dead: false, untargetable: false, buffs: {}, vx: 0, vy: 0,
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    const shadow = new context.window.UkonShadow(owner, target);
    shadow.update(16);
    assert.equal(target.hp, 300, 'shadow attacked before its materialization window ended');
    for (let frame = 0; frame < 20 && !shadow.dead; frame++) shadow.update(16);

    assert.equal(target.hp, 285);
    assert.ok(target.buffs.dizzy >= 280);
    assert.ok(target.buffs.slow >= 900);
    assert.equal(shadow.dead, true);
});

test('Heavenly Peach Tree requires a second press and scales Heavenly Drop by actual fall distance', () => {
    const longFall = loadPhysicsGame('Ukon');
    longFall.ai.isCPU = false;
    longFall.ai.attackState = 'idle';
    longFall.ai.stateTimer = 0;
    longFall.ai.superCooldown = 0;
    assert.equal(longFall.ai.startUkonUltimate(), true);
    assert.equal(longFall.ai.ukonUltimatePhase, 'climb');
    assert.equal(longFall.context.game.minions.some(minion => minion.type === 'peach_tree'), true);

    longFall.ai.updateUkonUltimate(4000);
    assert.equal(longFall.ai.ukonUltimatePhase, 'ready');
    assert.equal(longFall.ai.startUkonHeavenlyDrop(), true);
    assert.equal(longFall.ai.ukonUltimatePhase, 'aim');
    longFall.ai.updateUkonUltimate(320);
    assert.equal(longFall.ai.ukonUltimatePhase, 'drop');

    longFall.ai.x = longFall.target.x;
    longFall.ai.y = longFall.context.GROUND_Y - longFall.ai.h;
    longFall.target.y = longFall.context.GROUND_Y - longFall.target.h;
    longFall.ai.isGrounded = true;
    longFall.ai.ukonDropStartY = 54;
    const longHp = longFall.target.hp;
    assert.equal(longFall.ai.resolveUkonDropImpact(), true);
    assert.equal(longFall.ai.ukonLastDropDamage, 160);
    assert.equal(longFall.target.hp, longHp - 160);
    assert.equal(longFall.ai.ukonUltimatePhase, null);
    assert.ok(longFall.context.game.screenShakeTimer >= 480);

    const shortFall = loadPhysicsGame('Ukon');
    shortFall.ai.isCPU = false;
    shortFall.ai.ukonUltimatePhase = 'drop';
    shortFall.ai.ukonDropStartY = 500;
    shortFall.ai.x = shortFall.target.x;
    shortFall.ai.y = shortFall.context.GROUND_Y - shortFall.ai.h;
    shortFall.target.y = shortFall.context.GROUND_Y - shortFall.target.h;
    shortFall.ai.isGrounded = true;
    const shortHp = shortFall.target.hp;
    assert.equal(shortFall.ai.resolveUkonDropImpact(), true);
    assert.ok(shortFall.ai.ukonLastDropDamage >= 60 && shortFall.ai.ukonLastDropDamage < 100);
    assert.equal(shortFall.target.hp, shortHp - shortFall.ai.ukonLastDropDamage);
});

test('Mori caps Mechanism Nodes at three and links active pairs', () => {
    const simulation = loadPhysicsGame('Mori');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.createMoriNode(100, 500);
    ai.createMoriNode(220, 500);
    ai.createMoriNode(340, 500);
    ai.createMoriNode(460, 500);

    const nodes = context.game.minions.filter(item => item.type === 'mori_node' && !item.dead);
    const wires = context.game.minions.filter(item => item.type === 'mori_wire' && !item.dead);
    assert.equal(nodes.length, 3);
    assert.equal(nodes.some(node => node.serial === 1), false, 'oldest node was not retired');
    assert.ok(wires.length >= 2, 'active nodes did not form linked mechanisms');
});

test('Mori Energy Wire triggers once for damage and slow', () => {
    const context = loadProjectileContext();
    const owner = { id: 'mori', heroName: 'Mori', dead: false, moriNodeSerial: 0 };
    const target = { id: 'target', x: 145, y: 92, w: 40, h: 70, hp: 300, dead: false, buffs: {}, vx: 0, vy: 0, takeDamage(amount) { this.hp -= amount; } };
    context.game.opponents = [target];
    const first = new context.window.MechanismNode(owner, 100, 130);
    const second = new context.window.MechanismNode(owner, 240, 130);
    const wire = new context.window.MoriEnergyWire(owner, first, second);

    wire.update(16);
    assert.equal(target.hp, 280);
    assert.equal(target.buffs.slow, 1000);
    assert.equal(wire.dead, true);
});

test('Mori fan and ultimate traps use their augmented damage values', () => {
    const context = loadProjectileContext();
    const owner = { id: 'mori', heroName: 'Mori', dead: false, onMoriFanHit() {} };
    const makeTarget = () => ({
        id: `target-${Math.random()}`, x: 100, y: 430, w: 40, h: 70, hp: 300, dead: false,
        buffs: {}, vx: 0, vy: 0, attackState: 'idle', takeDamage(amount) { this.hp -= amount; }
    });

    const fanTarget = makeTarget();
    fanTarget.y = 100;
    context.game.opponents = [fanTarget];
    const fan = new context.window.MechanicFanBlade(owner, 100, 100, 0, 0);
    fan.update(16);
    assert.equal(fanTarget.hp, 275);

    for (const [kind, damage] of [['spear', 50], ['spring', 20], ['blade', 40], ['bomb', 60]]) {
        const target = makeTarget();
        context.game.opponents = [target];
        const trap = new context.window.MoriTrap(owner, kind, 120, 500);
        trap.warning = 0;
        trap.update(16);
        assert.equal(target.hp, 300 - damage, `${kind} trap damage was not augmented`);
    }

    const gunTarget = makeTarget();
    gunTarget.x = 300;
    context.game.opponents = [gunTarget];
    const machinegun = new context.window.MoriTrap(owner, 'machinegun', 120, 500);
    machinegun.warning = 0;
    machinegun.update(16);
    const bullet = context.game.projectiles.find(projectile => projectile.type === 'mori_machinegun');
    assert.equal(bullet.damage, 8);
    assert.equal(machinegun.ammo, 5);
    for (let shot = 0; shot < 5; shot++) machinegun.update(140);
    assert.equal(context.game.projectiles.filter(projectile => projectile.type === 'mori_machinegun').length, 6);
    assert.equal(machinegun.dead, true);
});

test('Mori Grappling Wire disrupts enemies and Thousand Mechanisms rotates all trap types', () => {
    const simulation = loadPhysicsGame('Mori');
    const { ai, target } = simulation;
    ai.isCPU = false;
    target.x = ai.x + 260;
    target.y = ai.y;
    target.vx = 0;
    assert.equal(ai.fireMoriGrapple(), true);
    assert.ok(target.vx < 0, 'enemy was not pulled toward Mori');
    assert.equal(ai.moriGrappleCooldown, 3000);

    const entityContext = loadProjectileContext();
    entityContext.PLATFORMS.push({ x: 100, y: 500, w: 500, h: 20, type: 'center' });
    const owner = { id: 'mori', heroName: 'Mori', dead: false };
    const field = new entityContext.window.ThousandMechanisms(owner);
    entityContext.game.hazards = [field];
    field.update(2000);
    const firstKinds = entityContext.game.hazards.filter(item => item.type === 'mori_ultimate_trap').map(item => item.kind);
    assert.deepEqual(firstKinds.slice(0, 5), ['spear', 'spring', 'blade', 'bomb', 'machinegun']);
    field.update(5500);
    const kinds = entityContext.game.hazards.filter(item => item.type === 'mori_ultimate_trap').map(item => item.kind);
    assert.equal(kinds.length, 20);
});

test('Roka charges cannon fire, recoils opposite the shot, and empowers artillery projectiles', () => {
    const simulation = loadPhysicsGame('Roka');
    const { ai, context } = simulation;
    ai.isCPU = false;
    ai.attackState = 'idle';
    ai.performAttack();
    assert.equal(ai.stateTimer, 800);

    ai.attackState = 'active';
    ai.executeActiveAttack();
    const normal = context.game.projectiles.at(-1);
    assert.equal(normal.type, 'roka_cannonball');
    assert.equal(normal.damage, 40);
    assert.equal(normal.radius, 110);
    assert.equal(Math.hypot(normal.vx, normal.vy), 21);
    assert.ok(normal.vx * ai.vx <= 0, 'Roka did not recoil opposite the cannonball');

    ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(ai.rokaArtilleryTimer, 10000);
    ai.executeActiveAttack();
    const artillery = context.game.projectiles.at(-1);
    assert.equal(artillery.damage, 50);
    assert.equal(artillery.radius, 165);

    assert.equal(ai.fireRokaMortar(), true);
    assert.equal(context.game.projectiles.at(-1).type, 'roka_mortar');
    assert.equal(ai.rokaMortarCooldown, 6000);
});

test('Roka cannon and mortar explosions apply specified damage and directional knockback', () => {
    const context = loadProjectileContext();
    const owner = { id: 'roka', heroName: 'Roka', dead: false };
    const target = { x: 120, y: 100, w: 40, h: 70, hp: 100, vx: 0, vy: 0, buffs: {}, takeDamage(amount) { this.hp -= amount; } };
    context.game.opponents = [target];
    const shell = new context.window.RokaCannonball(owner, 100, 130, 0, 0, false);
    shell.explode();
    assert.equal(target.hp, 60);
    assert.ok(target.vy < 0);

    target.hp = 100; target.vy = 0;
    const mortar = new context.window.RokaMortarShell(owner, 140, 160);
    mortar.targetX = target.x + target.w/2;
    mortar.targetY = target.y + target.h/2;
    mortar.impact();
    assert.equal(target.hp, 70);
    assert.equal(target.vy, -18);
});

test('Voss gains the opponent kit for three seconds while her own cooldowns stay frozen', () => {
    const simulation = loadPhysicsGame('Voss');
    const { ai, context, target } = simulation;
    ai.isCPU = false;
    ai.superCooldown = 5000;
    assert.equal(ai.startVossCopy(), true);
    assert.equal(ai.vossCopiedHero, 'Hunter');
    assert.equal(ai.heroName, 'Hunter');
    assert.equal(ai.vossCopyActive, true);
    assert.equal(ai.vossCopyTimer, 3000);
    assert.equal(ai.vossCopyCooldown, 7500);
    assert.equal(ai.superCooldown, 0);

    ai.attackState = 'active';
    ai.executeActiveAttack();
    const copiedShot = context.game.projectiles.at(-1);
    assert.equal(copiedShot.owner, ai);
    assert.equal(copiedShot.type, 'homing_bullet');

    ai.attackState = 'idle';
    context.keysPressed[ai.controls.switch] = true;
    ai.update(16);
    delete context.keysPressed[ai.controls.switch];
    assert.equal(ai.hunterWeapon, 'sword');
    ai.hunterWeapon = 'musket';
    ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(context.game.hurricane.owner, ai);
    assert.equal(ai.vossDouble, null);

    ai.hunterMusketCD = 1000;
    ai.update(984);
    assert.equal(ai.hunterMusketCD, 16, 'copied Basic Attack cooldown was reset during the copy interval');
    assert.equal(ai.superCooldown, ai.superCooldownMax - 984, 'copied Super cooldown was reset during the copy interval');
    assert.equal(ai.vossCopyCooldown, 7500);
    assert.equal(ai.vossOwnSuperCooldown, 5000);

    ai.update(2000);
    assert.equal(ai.heroName, 'Voss');
    assert.equal(ai.vossCopyActive, false);
    assert.equal(ai.superCooldown, 5000);
    assert.equal(ai.vossCopyCooldown, 7500);

    ai.update(1000);
    assert.equal(ai.superCooldown, 4000);
    assert.equal(ai.vossCopyCooldown, 6500);
});

test('Voss Temporal Double moves to the mirrored arena position and attacks for half damage', () => {
    const entityContext = loadProjectileContext();
    const owner = { id: 'voss', heroName: 'Voss', x: 100, y: 500, w: 40, h: 70, facing: 1, dead: false };
    const duplicate = new entityContext.window.VossTemporalDouble(owner, 300, 500);
    const startX = duplicate.x;
    duplicate.update(16.667);
    assert.ok(duplicate.x > startX);
    assert.equal(duplicate.facing, -1);
    owner.x = 1100;
    duplicate.update(16.667);
    assert.ok(duplicate.x < 320);

    duplicate.mirrorAttack({ damage: 40, kind: 'copy', targetX: 500, targetY: 520, facing: 1 });
    duplicate.update(180);
    assert.equal(entityContext.game.projectiles.length, 1);
    assert.equal(entityContext.game.projectiles[0].damage, 20);
    assert.equal(entityContext.game.projectiles[0].owner, owner);
});

test('Raigo builds Energy, spends Thunder Strike, and lifesteals from actual armored damage', () => {
    const simulation = loadPhysicsGame('Raigo');
    const { ai, target, context } = simulation;
    ai.isCPU = false;
    ai.raigoEnergy = 55;
    ai.raigoEmpoweredAttack = false;
    ai.onRaigoBasicHit(target, 28);
    assert.equal(ai.raigoEnergy, 70);

    ai.attackState = 'idle';
    ai.performAttack();
    assert.equal(ai.raigoEnergy, 0);
    assert.equal(ai.getMeleeDamage(), 60);
    ai.onRaigoBasicHit(target, 60);
    assert.equal(target.buffs.dizzy, 500);

    ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(ai.raigoArmorTimer, 10000);
    assert.equal(ai.getMeleeDamage(), 28);
    ai.hp = 700;
    ai.healRaigoFromDamage(40);
    assert.equal(ai.hp, 714);

    ai.raigoArmorTimer = 0;
    ai.raigoEnergy = 25;
    assert.equal(ai.startRaigoCharge(), true);
    assert.equal(ai.raigoEnergy, 0);
    const hpBefore = target.hp;
    const raigoHpBefore = ai.hp;
    context.checkAABB = () => true;
    ai.updateRaigoCharge(16);
    assert.equal(target.hp, hpBefore - 30);
    assert.equal(ai.hp, raigoHpBefore);
    assert.ok(target.vx < 0);

    ai.attackState = 'idle';
    ai.raigoArmorTimer = 10000;
    const projectileCount = context.game.projectiles.length;
    assert.equal(ai.throwRaigoGoldenSpear(), true);
    assert.equal(context.game.projectiles.length, projectileCount + 1);
    const spear = context.game.projectiles.at(-1);
    assert.equal(spear.type, 'raigo_golden_spear');
    assert.equal(spear.released, false);
    assert.equal(spear.launchDelay, 1500);
    assert.equal(spear.launchSpeed, 42);
    assert.ok(Math.abs(Math.hypot(spear.floatDriftDirection.x, spear.floatDriftDirection.y) - 1) < 0.001);
    assert.equal(spear.aimAtTargetOnLaunch, true);
    assert.equal(spear.straightFlight, true);
    assert.equal(spear.damage, 32);

    ai.attackState = 'idle';
    const beforeTriple = context.game.projectiles.length;
    assert.equal(ai.startRaigoCharge(), true);
    const tripleSpears = context.game.projectiles.slice(beforeTriple);
    assert.equal(tripleSpears.length, 3);
    assert.deepEqual(tripleSpears.map(item => item.launchDelay), [90, 220, 350]);
    assert.deepEqual(tripleSpears.map(item => item.damage), [18, 18, 18]);
    assert.equal(tripleSpears.every(item => item.stunDuration === 420), true);
});

test('Raigo golden spears heal and pull enemies during Super', () => {
    const context = loadProjectileContext();
    let healed = 0;
    const owner = {
        id: 'raigo', heroName: 'Raigo', x: 500, y: 520, w: 42, h: 72, hp: 600, maxHp: 800, facing: 1,
        healRaigoFromDamage(amount) { healed += amount * 0.35; }
    };
    const target = {
        id: 'target', heroName: 'Hunter', x: 650, y: 520, w: 42, h: 70, hp: 100, maxHp: 100,
        vx: 0, vy: 0, dead: false, invincible: 0, buffs: {},
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [target];
    context.game.projectiles = [];
    const spear = new context.window.Projectile(642, 548, 44, 14, 40, 0, 32, owner, '#ffd84d', 'raigo_golden_spear');
    spear.released = true;
    spear.chargeRatio = .6;
    spear.lifestealRatio = .35;
    context.game.projectiles = [spear];

    spear.update(16);

    assert.equal(target.hp, 68);
    assert.equal(healed, 11.2);
    assert.ok(target.vx < 0, 'golden spear should pull the enemy toward Raigo');
    assert.equal(spear.dead, true);
});

test('Raigo golden spears drift independently before launching automatically', () => {
    const context = loadProjectileContext();
    const owner = {
        id: 'raigo', heroName: 'Raigo', x: 500, y: 520, w: 42, h: 72, dead: false, facing: 1,
        healRaigoFromDamage() {}
    };
    context.game.opponents = [];
    const spear = new context.window.Projectile(499, 551, 44, 12, 0, 0, 32, owner, '#ffd84d', 'raigo_golden_spear');
    spear.released = false;
    spear.launchDelay = 150;
    spear.launchTimer = 0;
    spear.launchSpeed = 34;
    spear.launchDirection = { x: 1, y: 0 };
    spear.floatDriftDirection = { x: .8, y: .6 };
    spear.floatSpeed = .042;
    spear.floatOffsetIndex = 0;
    const startX = spear.x;
    const startY = spear.y;

    spear.update(75);
    assert.equal(spear.released, false);
    assert.ok(spear.x > startX, 'golden spear should drift horizontally');
    assert.ok(spear.y > startY, 'golden spear should follow its random drift direction');
    owner.x = 100;
    owner.y = 100;

    spear.update(75);
    assert.equal(spear.released, true);
    assert.equal(spear.vx, 34);
    assert.ok(spear.x > 490 && spear.y > 540, 'drifting spear should not remain attached to its moving owner');
});

test('Raigo Arsenal basic drifts for 1.5 seconds then snapshots the enemy direction', () => {
    const context = loadProjectileContext();
    const owner = {
        id: 'raigo', heroName: 'Raigo', x: 500, y: 520, w: 42, h: 72, dead: false, facing: 1,
        healRaigoFromDamage() {}
    };
    const target = { id: 'target', x: 620, y: 520, w: 40, h: 70, dead: false, invincible: 0 };
    context.game.opponents = [target];
    const spear = new context.window.Projectile(499, 551, 44, 12, 0, 0, 32, owner, '#ffd84d', 'raigo_golden_spear');
    Object.assign(spear, {
        released: false, launchDelay: 1500, launchTimer: 0, launchSpeed: 42,
        launchDirection: { x: 1, y: 0 }, aimAtTargetOnLaunch: true, straightFlight: true,
        target, chargeRatio: .6, floatOffsetIndex: 0, floatDriftDirection: { x: 0, y: -1 }
    });

    spear.update(750);
    assert.equal(spear.released, false);
    target.x = 390;
    target.y = 360;
    spear.update(749);
    assert.equal(spear.released, false);
    spear.update(1);
    assert.equal(spear.released, true);
    assert.ok(spear.vx < 0, 'spear should aim at the enemy position when the float ends');
    assert.ok(spear.vy < 0, 'spear should aim vertically toward the enemy as well');
    assert.ok(Math.abs(Math.hypot(spear.vx, spear.vy) - 42) < 0.001);

    const vx = spear.vx;
    const vy = spear.vy;
    target.x = 900;
    target.y = 600;
    spear.update(16);
    assert.equal(spear.vx, vx, 'released spear must not track horizontally');
    assert.equal(spear.vy, vy, 'released spear must not track vertically');
});

test('Gelann uses a fast 2 WRD scimitar and deploys both zone-control skills', () => {
    const simulation = loadPhysicsGame('Gelann');
    const { ai, context, target } = simulation;
    ai.attackState = 'idle';
    ai.superCooldown = 0;
    target.x = ai.x + 120;
    target.y = ai.y;

    assert.equal(ai.getMeleeDamage(), 20);
    assert.equal(ai.getMeleeHitbox().w, 74);
    assert.equal(ai.startGelannFlameBreath(), true);
    assert.equal(ai.gelannBreathCooldown, 6000);
    ai.gelannBreathWindup = 1;
    ai.update(16);
    assert.equal(context.game.hazards.at(-1).type, 'gelann_flame_cone');

    ai.performSuper();
    assert.equal(ai.superCooldown, ai.superCooldownMax);
    assert.equal(context.game.hazards.at(-1).type, 'gelann_arrow_rain');
});

test('Vaeilash can move without auto-triggering Blood Moon', () => {
    const simulation = loadPhysicsGame('Vaeilash');
    const { ai, context } = simulation;
    ai.attackState = 'idle';
    ai.superCooldown = 0;
    context.keys[ai.controls.right] = true;

    ai.update(16);

    assert.ok(ai.vx > 0, 'Vaeilash did not enter the shared movement path');
    assert.equal(ai.vaeilashBloodMoon, 0, 'Blood Moon should not start without Super input');
});

test('Vaeilash Blood Moon starts from Super and boosts movement speed', () => {
    const simulation = loadPhysicsGame('Vaeilash');
    const { ai, context } = simulation;
    ai.attackState = 'idle';
    ai.superCooldown = 0;

    ai.performSuper();
    context.keys[ai.controls.right] = true;
    ai.update(16);

    assert.ok(ai.vaeilashBloodMoon > 0);
    assert.equal(ai.superCooldown > 0, true);
    assert.ok(ai.vx > ai.baseSpeed * 0.25, 'Blood Moon movement boost was not applied');
});

test('Vaeilash uses assassin-speed attack timings', () => {
    const simulation = loadPhysicsGame('Vaeilash');
    const { ai } = simulation;
    ai.attackState = 'idle';

    ai.performAttack();
    assert.equal(ai.stateTimer, 35);
    ai.stateTimer = 0;
    ai.update(16);
    assert.equal(ai.attackState, 'active');
    assert.equal(ai.stateTimer, 70);
    ai.stateTimer = 0;
    ai.update(16);
    assert.equal(ai.attackState, 'recovery');
    assert.equal(ai.stateTimer, 85);

    ai.attackState = 'idle';
    ai.vaeilashBloodMoon = 8000;
    ai.performAttack();
    assert.equal(ai.stateTimer, 18);
    ai.stateTimer = 0;
    ai.update(16);
    assert.equal(ai.stateTimer, 45);
    ai.stateTimer = 0;
    ai.update(16);
    assert.equal(ai.stateTimer, 55);
});

test('Gelann Flame Breath is a capped cone that burns and slows targets', () => {
    const context = loadProjectileContext();
    const owner = { id: 'gelann', heroName: 'Gelann', x: 100, y: 500, w: 40, h: 70, facing: 1, dead: false };
    const target = { id: 'target', heroName: 'Hunter', x: 185, y: 500, w: 40, h: 70, hp: 100, buffs: {}, dead: false, invincible: 0, takeDamage(amount) { this.hp -= amount; } };
    const behind = { id: 'behind', heroName: 'Hunter', x: 35, y: 500, w: 40, h: 70, hp: 100, buffs: {}, dead: false, invincible: 0, takeDamage(amount) { this.hp -= amount; } };
    context.game.opponents = [target, behind];
    const cone = new context.window.GelannFlameCone(owner);

    cone.update(300); cone.update(300); cone.update(300); cone.update(300);

    assert.equal(target.hp, 85);
    assert.equal(behind.hp, 100);
    assert.equal(target.buffs.burn, 2000);
    assert.ok(target.buffs.gelannFlameSlow > 0);
});

test('Gelann Rain of Arrows telegraphs then deals 6 WRD with an exact 45% slow', () => {
    const context = loadProjectileContext();
    const owner = { id: 'gelann', heroName: 'Gelann', x: 100, y: 500, w: 40, h: 70, facing: 1, dead: false };
    const target = { id: 'target', heroName: 'Hunter', x: 350, y: 500, w: 40, h: 70, hp: 100, buffs: {}, dead: false, invincible: 0, takeDamage(amount) { this.hp -= amount; } };
    const farTarget = { id: 'far-target', heroName: 'Hunter', x: 1080, y: 500, w: 40, h: 70, hp: 100, buffs: {}, dead: false, invincible: 0, takeDamage(amount) { this.hp -= amount; } };
    context.game.opponents = [target, farTarget];
    const rain = new context.window.GelannArrowRain(owner, target.x + target.w/2);

    rain.update(750);
    assert.equal(target.hp, 100, 'warning phase dealt damage');
    for (let hit = 0; hit < 5; hit++) rain.update(500);

    assert.equal(target.hp, 40);
    assert.equal(farTarget.hp, 40, 'full-arena rain missed a distant target');
    assert.equal(target.buffs.gelannArrowSlow, 2000);
});

test('Dogel holds a capped charge and attacks immediately on release', () => {
    const simulation = loadPhysicsGame('Dogel');
    const { ai, context, target } = simulation;
    ai.attackState = 'idle';
    context.keys[ai.controls.attack] = true;
    ai.performAttack();
    ai.update(900);
    assert.equal(ai.attackState, 'dogel_charging');
    assert.ok(ai.dogelCharge >= 900);

    ai.update(ai.dogelChargeMax);
    assert.equal(ai.attackState, 'dogel_charging', 'full charge released while attack was held');
    assert.equal(ai.dogelCharge, ai.dogelChargeMax);

    context.checkAABB = () => true;
    const hpBeforeRelease = target.hp;
    context.keys[ai.controls.attack] = false;
    ai.update(16);
    assert.equal(ai.attackState, 'active');
    assert.equal(ai.dogelChargedDamage, 50);
    assert.equal(target.hp, hpBeforeRelease - 50, 'release did not activate the swing hitbox immediately');

    ai.attackState = 'idle';
    context.keys[ai.controls.attack] = true;
    ai.performAttack();
    ai.update(800);
    context.keys[ai.controls.attack] = false;
    ai.update(16);
    assert.ok(ai.dogelChargedDamage > 20 && ai.dogelChargedDamage < 50);

    ai.attackState = 'idle';
    assert.equal(ai.fireDogelChain(), true);
    assert.equal(context.game.projectiles.at(-1).type, 'dogel_chain_hook');

    ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(ai.dogelReaperTimer, 10000);
});

test('Lapis launches available stones, converges all five, and forms Stone Whip', () => {
    const simulation = loadPhysicsGame('Lapis');
    const { ai, context, target } = simulation;
    ai.x = 300;
    ai.y = 500;
    target.x = 850;
    target.y = 500;
    const summon = {
        id: 'nearby_summon', type: 'skeleton', owner: target,
        x: 430, y: 500, w: 35, h: 60, hp: 100, maxHp: 100,
        dead: false, untargetable: false, buffs: {}, vx: 0, vy: 0,
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.minions.push(summon);
    ai.attackState = 'idle';
    ai.executeActiveAttack();
    assert.equal(context.game.projectiles.filter(entity => entity.type === 'lapis_stone').length, 1);
    assert.equal(ai.lapisStoneAvailable.filter(Boolean).length, 4);
    assert.equal(context.game.projectiles.at(-1).target, summon, 'Basic Attack ignored the nearest summon');

    ai.lapisStoneAvailable.fill(true);
    assert.equal(ai.fireLapisJudgment(), true);
    assert.equal(context.game.projectiles.filter(entity => entity.type === 'lapis_stone' && entity.judgment).length, 5);
    assert.ok(context.game.projectiles.filter(entity => entity.judgment).every(stone => stone.target === summon), 'Judgment ignored the nearest summon');

    ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(ai.lapisWhipTimer, 9000);
    assert.equal(ai.isMeleeAttack(), true);
    assert.equal(ai.getMeleeDamage(), 24);

    ai.attackState = 'active';
    ai.maxStateTimer = 95;
    ai.stateTimer = 95;
    const startPoints = ai.getLapisWhipPoints(0);
    ai.stateTimer = 20;
    const snapPoints = ai.getLapisWhipPoints(40);
    assert.equal(snapPoints.length, 6);
    for (let segment = 1; segment < snapPoints.length; segment++) {
        assert.ok(Math.abs(Math.hypot(snapPoints[segment].x-snapPoints[segment-1].x,snapPoints[segment].y-snapPoints[segment-1].y)-30)<.001, 'whip segments disconnected');
    }
    const baseTravel = Math.hypot(snapPoints[1].x-startPoints[1].x,snapPoints[1].y-startPoints[1].y);
    const tipTravel = Math.hypot(snapPoints[5].x-startPoints[5].x,snapPoints[5].y-startPoints[5].y);
    assert.ok(tipTravel > baseTravel * 2, 'whip tip did not amplify the delayed base motion');
});

test('Lapis stones can be destroyed and Sola deflects them back to their caster', () => {
    const context = loadProjectileContext();
    const lapis = {
        id: 'lapis', heroName: 'Lapis', x: 100, y: 500, w: 40, h: 68, dead: false,
        hp: 650, lapisStoneInFlight: [0,0,0,0,0], lapisStoneAvailable: [true,true,true,true,true],
        getLapisOrbitPosition: () => ({ x: 120, y: 530 }),
        takeDamage(amount) { this.hp -= amount; }
    };
    const sola = {
        id: 'sola', heroName: 'Sola', x: 300, y: 500, w: 40, h: 70, dead: false,
        hp: 780, solaFocus: 0, solaChargeTimer: 0, attackState: 'active',
        isMeleeAttack: () => true,
        takeDamage(amount) { this.hp -= amount; }
    };
    context.game.opponents = [sola];

    const blockedStone = new context.window.LapisStone(lapis, 0, sola);
    blockedStone.castTimer = 0;
    context.game.projectiles.push(blockedStone);
    const blocker = new context.window.Projectile(blockedStone.x, blockedStone.y, blockedStone.w, blockedStone.h, 0, 0, 20, sola, '#fff', 'bullet');
    context.game.projectiles.push(blocker);
    blocker.update(16);
    assert.equal(blockedStone.dead, true, 'hostile projectile did not destroy the stone');
    assert.equal(lapis.lapisStoneAvailable[0], true, 'destroyed stone did not return to Lapis');

    const reflectedStone = new context.window.LapisStone(lapis, 1, sola);
    reflectedStone.castTimer = 0;
    reflectedStone.x = sola.x;
    reflectedStone.y = sola.y;
    context.game.projectiles.push(reflectedStone);
    reflectedStone.update(16);
    assert.equal(reflectedStone.owner, sola);
    assert.equal(reflectedStone.target, lapis);
    assert.equal(reflectedStone.deflected, true);
    assert.equal(sola.solaFocus, 1);
    assert.equal(sola.hp, 780, 'Sola took damage while deflecting the stone');

    reflectedStone.x = lapis.x;
    reflectedStone.y = lapis.y;
    reflectedStone.update(16);
    assert.ok(lapis.hp < 650, 'deflected stone did not damage its original caster');
    assert.equal(lapis.lapisStoneAvailable[1], true, 'deflected stone did not restore its original orbit slot');
});

test('Tonia builds Heat with held fire, launches six grenades, and resets with missiles', () => {
    const simulation = loadPhysicsGame('Tonia');
    const { ai, context } = simulation;
    ai.attackState = 'idle';
    for (let shot = 0; shot < 5; shot++) { ai.toniaFireTimer = 0; ai.fireToniaBullet(); }
    assert.equal(context.game.projectiles.filter(entity => entity.type === 'bullet').length, 5);
    assert.ok(ai.toniaHeat > 0);

    assert.equal(ai.fireToniaGrenades(), true);
    assert.equal(context.game.projectiles.filter(entity => entity.type === 'tonia_grenade').length, 6);

    ai.toniaHeat = 95;
    ai.toniaOverheated = true;
    ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(ai.toniaHeat, 0);
    assert.equal(ai.toniaOverheated, false);
    assert.equal(context.game.projectiles.filter(entity => entity.type === 'tonia_missile').length, 3);
});

test('Ge hooks an enemy back and completes the Bronze God transformation', () => {
    const { ai, context, target } = loadPhysicsGame('Ge');
    ai.attackState = 'idle';
    context.checkAABB = (first, second) => second === target;
    assert.equal(ai.startGeHookingThrust(), true);
    ai.updateGeHookingThrust(16);
    assert.equal(target.hp, 730);
    assert.equal(target.buffs.dizzy, 1000);
    assert.equal(ai.geThrustPhase, 'return');

    ai.geThrustTimer = 0; ai.geThrustPhase = null; ai.superCooldown = 0;
    ai.performSuper();
    assert.equal(ai.geDanceTimer, 2500);
    const before = ai.hp;
    ai.takeDamage(20, target);
    assert.equal(ai.hp, before - 20, 'ritual incorrectly prevented damage');
    assert.equal(ai.stunTimer, 0, 'ritual was interrupted by hit reaction');
    ai.geDanceTimer = 1; ai.update(16);
    assert.equal(ai.geGodTimer, 10000);
    assert.equal(ai.getMeleeDamage(), 60);
});

test('Lak resists grounded damage and turns hammer combos into arena control', () => {
    const { ai, context, target } = loadPhysicsGame('Lak');
    ai.attackState = 'idle'; ai.isGrounded = true;
    ai.takeDamage(100, target);
    assert.equal(ai.hp, 915);
    assert.ok(Math.abs(ai.vx) < 15, 'Heavy Ground did not reduce displacement');

    for (let hit = 0; hit < 3; hit++) ai.executeActiveAttack();
    assert.equal(context.game.hazards.filter(entity => entity.type === 'lak_shockwave').length, 1);
    ai.lakWallCooldown = 0; ai.stunTimer = 0;
    context.keysPressed[ai.controls.switch] = true; ai.update(16); delete context.keysPressed[ai.controls.switch];
    assert.equal(context.game.hazards.some(entity => entity.type === 'lak_earth_wall'), true);
    ai.superCooldown = 0; ai.performSuper();
    assert.equal(context.game.hazards.some(entity => entity.type === 'lak_mountain_breaker'), true);
});

test('Pat builds three Puppet Marks, empowers Binding Thread, and summons Marionette', () => {
    const { ai, context, target } = loadPhysicsGame('Pat');
    ai.attackState = 'active'; ai.executeActiveAttack();
    assert.equal(context.game.projectiles.at(-1).type, 'pat_thread_lash');

    ai.addPatMark(target); ai.addPatMark(target); ai.addPatMark(target);
    assert.equal(ai.patMarks.get(target).length, 3);
    assert.equal(ai.consumePatMarks(target), true);
    assert.equal(ai.patMarks.has(target), false);

    ai.attackState = 'idle'; ai.patBindingCooldown = 0;
    context.keysPressed[ai.controls.switch] = true; ai.update(16); delete context.keysPressed[ai.controls.switch];
    assert.equal(context.game.projectiles.at(-1).type, 'pat_binding_thread');
    ai.superCooldown = 0; ai.performSuper();
    assert.equal(ai.patMarionette.type, 'pat_marionette');
    assert.equal(ai.patMarionette.target, target);
});

test('Feng Light Step is a visible armored parabolic movement skill', () => {
    const { ai, context } = loadPhysicsGame('Feng');
    ai.attackState = 'idle';
    context.keys[ai.controls.right] = true;
    assert.equal(ai.startFengLightStep(), true);
    assert.equal(ai.fengStepActive, true);
    assert.equal(ai.fengStepTimer, 5000);
    assert.ok(ai.vx > 0 && ai.vy <= -20, 'Light Step did not receive the increased launch height');
    const launchVx = ai.vx;
    const hpBefore = ai.hp;
    ai.takeDamage(20, { x: ai.x-50, w: 40, heroName: 'Hunter' });
    assert.equal(ai.hp, hpBefore-20, 'super armor should not make Feng invulnerable');
    assert.equal(ai.stunTimer, 0);
    assert.equal(ai.vx, launchVx, 'Light Step was interrupted by knockback');
});

test('Feng third basic releases one full-strength ultimate wind wave', () => {
    const { ai, context } = loadPhysicsGame('Feng');
    ai.attackState = 'idle';
    ai.executeActiveAttack(); ai.executeActiveAttack(); ai.executeActiveAttack();
    const projectiles = context.game.projectiles;
    assert.equal(projectiles.filter(projectile => projectile.type === 'feng_qigong').length, 2);
    const enhanced = projectiles.find(projectile => projectile.type === 'feng_wind_wave');
    assert.ok(enhanced);
    assert.equal(enhanced.ultimate, true);
});

test('Feng vaults before hovering, fires six snapshot-aimed waves, then falls', () => {
    const { ai, target, context } = loadPhysicsGame('Feng');
    ai.attackState = 'idle'; ai.superCooldown = 0; ai.x = 300; ai.y = 590;
    target.x = 760; target.y = 250;
    ai.performSuper();
    assert.equal(ai.fengUltimatePhase, 'launch');
    assert.equal(ai.vy, -21);
    for (let frame=0; frame<33; frame++) ai.update(16);
    assert.equal(ai.fengUltimatePhase, 'hover');
    assert.ok(ai.y < 300, 'Feng did not visibly vault high before hovering');
    for (let shot=0; shot<6; shot++) ai.performAttack();
    const waves = context.game.projectiles.filter(projectile => projectile.type === 'feng_wind_wave');
    assert.equal(waves.length, 6);
    assert.ok(waves.every(wave => wave.vx > 0 && wave.vy > 0), 'waves did not aim at the enemy snapshot');
    const initialVectors = waves.map(wave => [wave.vx,wave.vy]);
    target.x = 50; target.y = 590;
    assert.deepEqual(waves.map(wave => [wave.vx,wave.vy]), initialVectors, 'existing waves tracked the moved enemy');
    assert.equal(ai.fengUltimatePhase, 'ending');
    ai.update(440);
    assert.equal(ai.fengUltimatePhase, 'fall');
    assert.ok(ai.vy > 0);
});

test('Feng wind waves reflect from arena walls instead of sticking', () => {
    const context = loadProjectileContext();
    const owner = { x: 1210, y: 220, w: 40, h: 70, facing: 1, dead: false };
    const wave = new context.window.FengWindWave(owner, 0, true);
    context.game.projectiles.push(wave);
    wave.update(16);
    assert.ok(wave.vx < 0);
    assert.equal(wave.bounces, 1);
    assert.ok(wave.bounceFlash > 0);

    const attacker = { x: 100, y: 220, w: 40, h: 70, facing: 1, dead: false };
    const victim = { x: 152, y: 220, w: 40, h: 70, hp: 100, dead: false, untargetable: false, buffs: {}, vx: 0, vy: 0, takeDamage(amount){this.hp-=amount;} };
    context.game.opponents = [victim];
    const gust = new context.window.FengWindWave(attacker, 0, true);
    gust.update(16);
    assert.equal(victim.hp, 80);
    assert.ok(victim.vx >= 30, 'fan-shaped wind wave did not strongly blow the enemy away');
});

test('Ocel has 90 WRD and all three combat skills are reachable', () => {
    const { ai, context } = loadPhysicsGame('Ocel');
    assert.equal(ai.maxHp, 900);
    ai.ocelSpawnTimer=0;ai.attackState='idle';
    context.keysPressed[ai.controls.switch]=true;ai.update(16);delete context.keysPressed[ai.controls.switch];
    assert.equal(context.game.hazards.at(-1).type,'ocel_ritual_zone');
    ai.attackState='idle';context.keysPressed[ai.controls.extra]=true;ai.update(16);delete context.keysPressed[ai.controls.extra];
    assert.equal(context.game.projectiles.at(-1).type,'ocel_feathered_serpent');
    ai.attackState='idle';ai.superCooldown=0;ai.performSuper();
    assert.equal(ai.ocelUltimatePhase,'sun');
    assert.equal(context.game.hazards.at(-1).type,'ocel_fifth_sun');
});

test('Ocel third Venom Mark erupts and Godbound changes his basic attack', () => {
    const { ai, target } = loadPhysicsGame('Ocel');
    ai.ocelSpawnTimer=0;const start=target.hp;
    ai.onOcelBasicHit(target);ai.onOcelBasicHit(target);
    assert.equal(target.ocelVenomMarks,2);assert.equal(target.ocelVenomMarkTimer,5000);
    ai.onOcelBasicHit(target);
    assert.equal(target.hp,start-40);assert.equal(target.ocelVenomMarks,0);
    assert.equal(ai.getMeleeDamage(),25);ai.ocelGodboundTimer=5000;assert.equal(ai.getMeleeDamage(),28);
});

test('Ocel Fifth Sun has a ritual startup, serpent impact, and five-second transformation', () => {
    const context=loadProjectileContext();
    const owner={id:'ocel',heroName:'Ocel',x:300,y:560,w:44,h:73,facing:1,dead:false,ocelUltimatePhase:'ritual',ocelGodboundTimer:0,hp:700,maxHp:900,heal(amount){this.hp=Math.min(this.maxHp,this.hp+amount);},applyOcelPoison(target,duration,dps){target.poison=[duration,dps];}};
    const victim={id:'victim',heroName:'Hunter',x:520,y:560,w:45,h:70,hp:750,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];context.game.getFighters=()=>[owner,victim];
    const sun=new context.window.OcelFifthSun(owner);sun.update(899);assert.equal(owner.ocelUltimatePhase,'sun');assert.equal(victim.hp,750);
    sun.update(1);assert.equal(owner.ocelUltimatePhase,'serpent');assert.equal(victim.hp,750);
    sun.update(900);assert.equal(owner.ocelUltimatePhase,'strike');assert.equal(victim.hp,750);
    sun.update(449);assert.equal(victim.hp,750,'damage landed before Quetzalcoatl struck the ground');
    sun.update(1);assert.equal(owner.ocelUltimatePhase,'godbound');assert.equal(owner.ocelGodboundTimer,5000);assert.equal(victim.hp,670);assert.deepEqual(victim.poison,[5000,8]);
    sun.update(5000);assert.equal(sun.dead,true);assert.equal(owner.ocelUltimatePhase,null);
});

test('Ocel Feathered Serpent turns toward enemies slowly, then stuns and heavily poisons', () => {
    const context=loadProjectileContext();
    const owner={id:'ocel',heroName:'Ocel',x:100,y:500,w:44,h:73,facing:1,dead:false,addOcelVenomMark(){},applyOcelPoison(target,duration,dps){target.poison=[duration,dps];}};
    const victim={id:'victim',heroName:'Hunter',x:190,y:430,w:45,h:70,hp:750,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];const serpent=new context.window.OcelFeatheredSerpent(owner);const startingAngle=serpent.angle;
    serpent.update(16);assert.ok(Math.abs(serpent.angle-startingAngle)>0&&Math.abs(serpent.angle-startingAngle)<=.045,'serpent did not use limited homing turn speed');
    serpent.x=victim.x;serpent.y=victim.y;serpent.update(16);
    assert.equal(victim.hp,720);assert.equal(victim.buffs.dizzy,900);assert.deepEqual(victim.poison,[4000,7]);
});

test('Ocel ritual zone continuously applies its stronger movement slow', () => {
    const context=loadProjectileContext();
    const owner={id:'ocel',heroName:'Ocel',x:280,y:560,w:44,h:73,facing:1,dead:false,addOcelVenomMark(){},applyOcelPoison(){}};
    const zone=new context.window.OcelRitualZone(owner);const victim={id:'victim',heroName:'Hunter',x:zone.x+100,y:560,w:45,h:70,hp:750,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];zone.update(16);assert.equal(victim.buffs.ocelRitualSlow,240);assert.equal(victim.hp,710);
});

test('Magnetar has 85 WRD and charges its matrix for 0.8 seconds', () => {
    const { ai, context } = loadPhysicsGame('Magnetar');
    assert.equal(ai.maxHp, 850);
    ai.attackState = 'idle';
    ai.performAttack();
    assert.equal(ai.attackState, 'windup');
    assert.equal(ai.stateTimer, 800);
    ai.update(799);
    assert.equal(context.game.projectiles.length, 0);
    ai.update(1);
    assert.equal(context.game.projectiles.at(-1).type, 'electromagnetic_matrix');
});

test('Magnetar matrix pierces targets and grants only one Overload stack per shot', () => {
    const context = loadProjectileContext();
    const owner = { id:'magnetar', x:100, y:500, w:48, h:75, facing:1, dead:false, magnetarOverload:0 };
    const makeVictim = (id, x) => ({ id, x, y:510, w:45, h:70, hp:300, dead:false, untargetable:false, buffs:{}, vx:0, vy:0, takeDamage(amount){this.hp-=amount;} });
    const first=makeVictim('first',150),second=makeVictim('second',180);
    context.game.opponents=[first,second];
    const matrix=new context.window.ElectromagneticMatrix(owner,0,false);
    matrix.update(16);
    assert.equal(first.hp,240);assert.equal(second.hp,240);
    assert.equal(owner.magnetarOverload,1);
    assert.equal(matrix.dead,false);
});

test('Magnetar consumes three Overload stacks to fire a 9 WRD stunning matrix', () => {
    const { ai, context } = loadPhysicsGame('Magnetar');
    ai.magnetarOverload=3;ai.attackState='idle';ai.executeActiveAttack();
    const matrix=context.game.projectiles.at(-1);
    assert.equal(ai.magnetarOverload,0);assert.equal(matrix.overcharged,true);

    const projectileContext=loadProjectileContext();
    const owner={id:'magnetar',x:100,y:500,w:48,h:75,facing:1,dead:false,magnetarOverload:0};
    const victim={id:'victim',x:150,y:500,w:45,h:70,hp:300,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    projectileContext.game.opponents=[victim];const charged=new projectileContext.window.ElectromagneticMatrix(owner,0,true);charged.update(16);
    assert.equal(victim.hp,210);assert.equal(victim.buffs.dizzy,800);
});

test('Magnetic Repulsion damages, launches, clears small shots, and grants brief armor', () => {
    const context=loadProjectileContext();
    const owner={id:'magnetar',x:300,y:500,w:48,h:75,facing:1,dead:false};
    const victim={id:'victim',x:360,y:510,w:45,h:70,hp:300,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    const small={owner:victim,x:340,y:520,w:12,h:8,dead:false};const large={owner:victim,x:340,y:520,w:60,h:60,dead:false};
    context.game.opponents=[victim];context.game.projectiles=[small,large];
    const pulse=new context.window.MagneticRepulsion(owner);pulse.update(16);
    assert.equal(victim.hp,280);assert.ok(victim.vx>20);assert.ok(victim.vy<0);
    assert.equal(small.dead,true);assert.equal(large.dead,false);

    const simulation=loadPhysicsGame('Magnetar');simulation.ai.attackState='idle';
    assert.equal(simulation.ai.fireMagneticRepulsion(),true);assert.equal(simulation.ai.magnetarArmorTimer,300);
    const xVelocity=simulation.ai.vx;simulation.ai.takeDamage(20,simulation.target);
    assert.equal(simulation.ai.vx,xVelocity,'super armor should prevent knockback');
    assert.equal(simulation.ai.hp,830,'super armor should not prevent damage');
});

test('Matrix Bombardment warns for 3 seconds before six 10 WRD slowing strikes', () => {
    const context=loadProjectileContext();
    const owner={id:'magnetar',x:300,y:500,w:48,h:75,facing:1,dead:false};
    const victim={id:'victim',x:600,y:590,w:45,h:70,hp:1000,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];const bombardment=new context.window.MatrixBombardment(owner,victim);
    bombardment.update(2999);assert.equal(victim.hp,1000);
    for(let strike=0;strike<6;strike++){
        victim.x=bombardment.strikeXs[strike]-victim.w/2;
        bombardment.update(strike===0?1:430);
    }
    assert.equal(victim.hp,400);assert.equal(victim.buffs.slow,1500);
    assert.equal(bombardment.struck.length,6);assert.equal(bombardment.struck.every(Boolean),true);
});

test('Magnetar CPU uses repulsion up close and bombardment to control a setup', () => {
    const context=loadAI();const ai=makeFighter('Magnetar');const target=makeFighter('Hunter','player');
    ai.magnetarPulseCooldown=0;ai.superCooldown=5000;ai.x=300;target.x=410;readyBrain(ai,target);
    context.window.runAI(makeGame(ai,target),16);
    assert.equal(context.keysPressed[ai.controls.switch],true);

    Object.keys(context.keysPressed).forEach(key=>delete context.keysPressed[key]);
    ai.magnetarPulseCooldown=5000;ai.superCooldown=0;target.x=760;readyBrain(ai,target);ai.aiBrain.combatState='setup';ai.aiBrain.tacticTimer=9999;
    context.window.runAI(makeGame(ai,target),16);
    assert.equal(context.keysPressed[ai.controls.super],true);
});

test('Nerath fires a large fast 1.5 WRD shard that shatters into four spikes', () => {
    const context=loadProjectileContext();
    const owner={id:'nerath',x:100,y:500,w:40,h:70,facing:1,dead:false,getNerathPower:()=>1};
    const victim={id:'victim',x:145,y:500,w:45,h:70,hp:200,dead:false,untargetable:false,buffs:{},takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];const shard=new context.window.BlackShard(owner,0);shard.update(16);
    assert.equal(shard.w,34);assert.equal(shard.h,26);
    assert.equal(victim.hp,185);assert.equal(shard.dead,true);
    assert.equal(context.game.projectiles.filter(item=>item.type==='black_spike').length,4);
});

test('Nerath Twin Hands are destructible and tear only after both complete the hold', () => {
    const context=loadProjectileContext();
    const owner={id:'nerath',x:100,y:500,w:40,h:70,facing:1,dead:false,getNerathPower:()=>1};
    const victim={id:'victim',x:500,y:500,w:45,h:70,hp:300,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];context.game.getFighters=()=>[victim];
    const left=new context.window.HellHand(owner,victim,-1,'cast');const right=new context.window.HellHand(owner,victim,1,'cast');context.game.minions=[left,right];
    left.x=victim.x-43;left.y=victim.y+10;right.x=victim.x+victim.w+1;right.y=victim.y+10;
    left.update(16);right.update(16);assert.equal(left.phase,'holding');assert.equal(right.phase,'holding');assert.equal(victim.hp,300);
    left.update(799);right.update(799);left.update(1);
    assert.equal(victim.hp,270);assert.equal(victim.buffs.slow,1500);assert.equal(context.game.hazards.at(-1).type,'hell_tear_effect');

    const spare=new context.window.HellHand(owner,victim,-1,'spare');spare.takeDamage(30,owner);
    assert.equal(spare.dead,true);assert.equal(spare.maxHp,30);
});

test('Gate of Hell gives an escape window, then captures and throws a trapped target', () => {
    const context=loadProjectileContext();
    const owner={id:'nerath',x:100,y:500,w:40,h:70,facing:1,dead:false,getNerathPower:()=>1};
    const victim={id:'victim',x:590,y:590,w:45,h:70,hp:500,dead:false,untargetable:false,buffs:{},vx:0,vy:0,takeDamage(amount){this.hp-=amount;}};
    context.game.opponents=[victim];context.game.getFighters=()=>[owner,victim];
    const escaped=new context.window.GateOfHell(owner,victim);escaped.update(850);victim.x=escaped.x+escaped.w+20;escaped.update(16);
    assert.equal(escaped.dead,true);assert.equal(victim.nerathHellCaptured,undefined);

    victim.x=590;const gate=new context.window.GateOfHell(owner,victim);gate.update(849);assert.equal(victim.hp,500);gate.update(1);
    for(let second=0;second<4;second++){victim.x=gate.x+gate.w/2-victim.w/2;gate.update(1000);}
    assert.equal(victim.hp,420);assert.equal(victim.nerathHellCaptured,true);assert.equal(victim.untargetable,true);
    gate.update(1600);assert.equal(victim.nerathHellCaptured,false);assert.equal(victim.untargetable,false);assert.equal(victim.nerathFallPending,true);assert.ok(victim.y<0);assert.ok(victim.vy>0);
});

test('Nerath Second Death triggers once at 25% HP and recovers from half power', () => {
    const {ai,context}=loadPhysicsGame('Nerath');assert.equal(ai.maxHp,720);
    ai.takeDamage(900,context.game.p1);assert.equal(ai.dead,false);assert.equal(ai.hp,180);assert.equal(ai.nerathSecondDeathUsed,true);assert.equal(ai.getNerathPower(),.5);assert.equal(context.game.hazards.at(-1).type,'nerath_resurrection');
    ai.nerathRecoveryTimer=5000;assert.equal(ai.getNerathPower(),.75);ai.nerathRecoveryTimer=0;assert.equal(ai.getNerathPower(),1);
    ai.invincible=0;ai.takeDamage(900,context.game.p1);assert.equal(ai.dead,true);
});

test('Nerath height-based Hell fall damage resolves only on landing', () => {
    const {ai,target}=loadPhysicsGame('Nerath');ai.nerathFallPending=true;ai.nerathFallSourceId=target.id;ai.nerathFallPeakY=-100;ai.y=590;ai.isGrounded=false;
    const hp=ai.hp;ai.applyNerathFallDamage();assert.equal(ai.hp,hp);
    ai.isGrounded=true;ai.applyNerathFallDamage();assert.equal(ai.hp,hp-75);assert.equal(ai.nerathFallPending,false);
});

test('Nerath CPU sets up Twin Hands and commits Gate of Hell on pressure', () => {
    const context=loadAI();const ai=makeFighter('Nerath');const target=makeFighter('Hunter','player');ai.x=200;target.x=570;ai.nerathHandsCooldown=0;ai.superCooldown=5000;readyBrain(ai,target);
    context.window.runAI(makeGame(ai,target),16);assert.equal(context.keysPressed[ai.controls.switch],true);
    Object.keys(context.keysPressed).forEach(key=>delete context.keysPressed[key]);ai.nerathHandsCooldown=5000;ai.superCooldown=0;readyBrain(ai,target);ai.aiBrain.combatState='pressure';ai.aiBrain.tacticTimer=9999;
    context.window.runAI(makeGame(ai,target),16);assert.equal(context.keysPressed[ai.controls.super],true);
});
