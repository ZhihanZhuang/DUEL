/**
 * Otokojuku Duel CPU controller.
 * Supports one-on-one duels and multiple independent CPU fighters.
 */

const AI_DIFFICULTY = {
    easy: {
        label: 'Easy', reactionMs: 210, aimLead: 4, mistakeChance: 0.28,
        dodgeChance: 0.45, meleeDodgeChance: 0.25, skillChance: 0.55,
        highGroundChance: 0.22, doubleJumpDelay: 620, tacticMs: 1700
    },
    normal: {
        label: 'Normal', reactionMs: 115, aimLead: 8, mistakeChance: 0.09,
        dodgeChance: 0.78, meleeDodgeChance: 0.62, skillChance: 0.84,
        highGroundChance: 0.58, doubleJumpDelay: 560, tacticMs: 1100
    },
    hard: {
        label: 'Hard', reactionMs: 75, aimLead: 12, mistakeChance: 0.025,
        dodgeChance: 0.93, meleeDodgeChance: 0.86, skillChance: 0.95,
        highGroundChance: 0.82, doubleJumpDelay: 525, tacticMs: 800
    },
    expert: {
        label: 'Expert', reactionMs: 45, aimLead: 16, mistakeChance: 0,
        dodgeChance: 1, meleeDodgeChance: 0.98, skillChance: 1,
        highGroundChance: 1, doubleJumpDelay: 510, tacticMs: 600
    }
};

const DEFAULT_HERO_TACTIC = {
    role: 'fighter', aggression: 0.75, caution: 0.65, burst: 0.8,
    kite: 0.45, setup: 0.25, highGround: 0.55, retreatHp: 0.28,
    retreatFireChance: 0.45
};

const HERO_TACTICS = {
    Hason:   { role: 'zoner', aggression: 0.58, caution: 0.72, burst: 1.00, kite: 1.15, setup: 0.20, highGround: 1.00, retreatHp: 0.34, retreatFireChance: 0.38 },
    Hunter:  { role: 'hybrid', aggression: 0.82, caution: 0.65, burst: 0.90, kite: 0.80, setup: 0.40, highGround: 0.78, retreatHp: 0.30, retreatFireChance: 0.50 },
    Macu:    { role: 'reach', aggression: 0.92, caution: 0.48, burst: 0.95, kite: 0.20, setup: 0.10, highGround: 0.35, retreatHp: 0.22, retreatFireChance: 0.20 },
    Willi:   { role: 'skirmisher', aggression: 0.72, caution: 1.35, burst: 1.65, kite: 1.45, setup: 0.20, highGround: 1.15, retreatHp: 0.42, retreatFireChance: 0.24 },
    Artu:    { role: 'commander', aggression: 0.62, caution: 0.72, burst: 0.72, kite: 0.10, setup: 1.35, highGround: 0.28, retreatHp: 0.24, retreatFireChance: 0.15 },
    Duke:    { role: 'charger', aggression: 1.15, caution: 0.42, burst: 1.10, kite: 0.10, setup: 0.12, highGround: 0.20, retreatHp: 0.20, retreatFireChance: 0.15 },
    Kadaxi:  { role: 'grappler', aggression: 1.12, caution: 0.50, burst: 1.20, kite: 0.10, setup: 0.20, highGround: 0.35, retreatHp: 0.23, retreatFireChance: 0.15 },
    Euclid:  { role: 'summoner', aggression: 0.62, caution: 0.85, burst: 0.92, kite: 1.00, setup: 1.30, highGround: 0.95, retreatHp: 0.35, retreatFireChance: 0.36 },
    Lique:   { role: 'berserker', aggression: 1.45, caution: 0.18, burst: 1.20, kite: 0.05, setup: 0.05, highGround: 0.18, retreatHp: 0.12, retreatFireChance: 0.10 },
    Kae:     { role: 'assassin', aggression: 1.28, caution: 0.48, burst: 1.45, kite: 0.12, setup: 0.12, highGround: 0.35, retreatHp: 0.22, retreatFireChance: 0.12 },
    Ugo:     { role: 'puppeteer', aggression: 0.50, caution: 1.00, burst: 0.85, kite: 1.10, setup: 1.55, highGround: 0.90, retreatHp: 0.38, retreatFireChance: 0.30 },
    Kila:    { role: 'controller', aggression: 0.58, caution: 0.88, burst: 0.85, kite: 1.10, setup: 1.30, highGround: 1.00, retreatHp: 0.34, retreatFireChance: 0.34 },
    Volt:    { role: 'aerial', aggression: 0.68, caution: 1.05, burst: 1.20, kite: 1.30, setup: 0.20, highGround: 1.45, retreatHp: 0.36, retreatFireChance: 0.22 },
    Gensan:  { role: 'trickster', aggression: 1.02, caution: 0.72, burst: 1.28, kite: 0.25, setup: 1.00, highGround: 0.50, retreatHp: 0.28, retreatFireChance: 0.18 },
    Noae:    { role: 'trapper', aggression: 0.52, caution: 0.92, burst: 0.78, kite: 1.05, setup: 1.60, highGround: 1.05, retreatHp: 0.36, retreatFireChance: 0.30 },
    Wolf:    { role: 'hunter', aggression: 1.30, caution: 0.35, burst: 1.38, kite: 0.08, setup: 0.08, highGround: 0.45, retreatHp: 0.18, retreatFireChance: 0.10 },
    Kuro:    { role: 'sniper', aggression: 0.48, caution: 1.42, burst: 1.70, kite: 1.55, setup: 1.25, highGround: 1.65, retreatHp: 0.44, retreatFireChance: 0.18 },
    Sola:    { role: 'sentinel', aggression: 1.02, caution: 0.82, burst: 1.18, kite: 0.12, setup: 0.18, highGround: 0.45, retreatHp: 0.27, retreatFireChance: 0.12 },
    Nyra:    { role: 'skirmisher', aggression: 0.74, caution: 1.12, burst: 1.30, kite: 1.28, setup: 0.42, highGround: 1.05, retreatHp: 0.38, retreatFireChance: 0.48 },
    Orion:   { role: 'gravity', aggression: 1.12, caution: 0.55, burst: 1.25, kite: 0.08, setup: 0.95, highGround: 0.38, retreatHp: 0.24, retreatFireChance: 0.10 },
    Archor:  { role: 'rapid_archer', aggression: 0.82, caution: 1.18, burst: 1.45, kite: 1.38, setup: 0.20, highGround: 1.28, retreatHp: 0.38, retreatFireChance: 0.62 },
    Itan:    { role: 'polearm', aggression: 0.92, caution: 0.68, burst: 1.35, kite: 0.18, setup: 0.45, highGround: 0.55, retreatHp: 0.28, retreatFireChance: 0.12 },
    D2F1:    { role: 'drone_commander', aggression: 0.68, caution: 1.22, burst: 1.28, kite: 1.42, setup: 1.55, highGround: 1.24, retreatHp: 0.40, retreatFireChance: 0.56 },
    Laegon:  { role: 'thunder_mage', aggression: 0.86, caution: 0.90, burst: 1.42, kite: 1.20, setup: 0.72, highGround: 1.18, retreatHp: 0.34, retreatFireChance: 0.55 },
    Veyra:   { role: 'chronomancer', aggression: 0.48, caution: 1.42, burst: 0.72, kite: 1.38, setup: 1.75, highGround: 1.30, retreatHp: 0.45, retreatFireChance: 0.35 },
    Vaeilash:{ role: 'blood_assassin', aggression: 1.38, caution: 0.42, burst: 1.55, kite: 0.15, setup: 0.55, highGround: 0.35, retreatHp: 0.24, retreatFireChance: 0.08 },
    Brom:    { role: 'demolitionist', aggression: 0.52, caution: 1.08, burst: 1.55, kite: 1.18, setup: 1.85, highGround: 0.92, retreatHp: 0.36, retreatFireChance: 0.30 },
    Axeron:  { role: 'power_assassin', aggression: 1.32, caution: 0.62, burst: 1.75, kite: 0.32, setup: 0.85, highGround: 0.48, retreatHp: 0.30, retreatFireChance: 0.08 },
    Ukon:    { role: 'dash_assassin', aggression: 1.38, caution: 0.58, burst: 1.82, kite: 0.36, setup: 1.05, highGround: 0.84, retreatHp: 0.27, retreatFireChance: 0.06 },
    Mori:    { role: 'mechanist', aggression: 0.46, caution: 1.22, burst: 0.72, kite: 1.34, setup: 1.92, highGround: 1.28, retreatHp: 0.40, retreatFireChance: 0.42 },
    Roka:    { role: 'recoil_artillery', aggression: 0.62, caution: 1.35, burst: 1.65, kite: 1.55, setup: 0.85, highGround: 1.42, retreatHp: 0.42, retreatFireChance: 0.72 },
    Voss:    { role: 'copycat', aggression: 0.72, caution: 1.05, burst: 1.38, kite: 0.92, setup: 1.45, highGround: 0.85, retreatHp: 0.36, retreatFireChance: 0.48 },
    Raigo:   { role: 'thunder_bruiser', aggression: 1.28, caution: 0.58, burst: 1.55, kite: 0.18, setup: 0.32, highGround: 0.65, retreatHp: 0.27, retreatFireChance: 0.10 },
    Gelann:  { role: 'flame_zoner', aggression: 1.08, caution: 0.72, burst: 1.24, kite: 0.52, setup: 1.18, highGround: 0.78, retreatHp: 0.32, retreatFireChance: 0.18 },
    Dogel:   { role: 'chain_bruiser', aggression: 1.28, caution: 0.52, burst: 1.55, kite: 0.12, setup: 1.05, highGround: 0.48, retreatHp: 0.24, retreatFireChance: 0.08 },
    Lapis:   { role: 'stone_mage', aggression: 0.68, caution: 1.08, burst: 1.45, kite: 1.25, setup: 1.32, highGround: 1.08, retreatHp: 0.38, retreatFireChance: 0.42 },
    Tonia:   { role: 'suppressor', aggression: 0.78, caution: 1.02, burst: 1.35, kite: 1.28, setup: 0.78, highGround: 1.02, retreatHp: 0.36, retreatFireChance: 0.68 },
    Ge:      { role: 'initiator', aggression: 1.24, caution: 0.52, burst: 1.48, kite: 0.12, setup: 0.78, highGround: 0.48, retreatHp: 0.24, retreatFireChance: 0.08 },
    Lak:     { role: 'terrain_tank', aggression: 0.82, caution: 0.82, burst: 1.18, kite: 0.08, setup: 1.72, highGround: 0.62, retreatHp: 0.18, retreatFireChance: 0.06 },
    Pat:     { role: 'controller', aggression: 0.48, caution: 1.32, burst: 1.08, kite: 1.38, setup: 1.62, highGround: 1.12, retreatHp: 0.42, retreatFireChance: 0.56 }
    ,Feng:   { role: 'wind_martial_artist', aggression: 1.12, caution: 0.62, burst: 1.45, kite: 0.72, setup: 0.35, highGround: 0.72, retreatHp: 0.28, retreatFireChance: 0.18 }
};

function getHeroTactic(ai) {
    return { ...DEFAULT_HERO_TACTIC, ...(HERO_TACTICS[ai.heroName] || {}) };
}

class AdaptiveAIProfile {
    constructor() {
        this.aggression = 0.5;
        this.jumpRate = 0.25;
        this.skillRate = 0.2;
    }

    observePlayer(player, dt) {
        if (!player || player.dead) return;
        const alpha = Math.min(0.03, dt / 20000);
        this.aggression = lerp01(this.aggression, keys[currentBinds.p1.attack] ? 1 : 0, alpha);
        this.jumpRate = lerp01(this.jumpRate, keys[currentBinds.p1.jump] ? 1 : 0, alpha);
        this.skillRate = lerp01(this.skillRate, keys[currentBinds.p1.super] ? 1 : 0, alpha * 2);
    }
}

function lerp01(value, target, amount) {
    return Math.max(0, Math.min(1, value + (target - value) * amount));
}

function centerX(entity) {
    return entity.x + entity.w / 2;
}

function centerY(entity) {
    return entity.y + entity.h / 2;
}

function distanceBetween(first, second) {
    return Math.hypot(centerX(second) - centerX(first), centerY(second) - centerY(first));
}

function getSurfacePlatform(entity) {
    if (!entity) return null;
    if (entity.currentPlatform) return entity.currentPlatform;
    const bottom = entity.y + entity.h;
    return PLATFORMS.find(platform =>
        Math.abs(bottom - platform.y) <= 8 &&
        entity.x + entity.w > platform.x &&
        entity.x < platform.x + platform.w
    ) || null;
}

function makeBrain(ai) {
    if (ai.aiBrain) return ai.aiBrain;
    ai.aiBrain = {
        decisionTimer: Math.random() * 80,
        targetTimer: 0,
        actionLock: 450 + Math.random() * 650,
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
        tacticTimer: 450 + Math.random() * 700,
        evadeTimer: 0,
        evadeDirection: 0,
        evadeDrop: false,
        strafeTimer: 0,
        strafeDirection: Math.random() < 0.5 ? -1 : 1,
        combatState: 'neutral',
        combatStateTimer: 0,
        tacticScores: {},
        targetWasVulnerable: false,
        voltRecovering: false,
        kuroChargeTimer: 0,
        solaEscapeTapTimer: 0,
        stuckTimer: 0,
        lastX: ai.x,
        lastY: ai.y,
        intent: { left: false, right: false, down: false, holdJump: false, holdAttack: false, holdSuper: false },
        profile: new AdaptiveAIProfile()
    };
    return ai.aiBrain;
}

function clearAIInput(ai) {
    if (!ai?.controls) return;
    Object.values(ai.controls).forEach(code => {
        keys[code] = false;
        delete keysPressed[code];
    });
}

function applyHeldInput(ai, brain) {
    keys[ai.controls.left] = !!brain.intent.left;
    keys[ai.controls.right] = !!brain.intent.right;
    keys[ai.controls.down] = !!brain.intent.down;
    keys[ai.controls.jump] = !!brain.intent.holdJump;
    keys[ai.controls.attack] = !!brain.intent.holdAttack;
    keys[ai.controls.super] = !!brain.intent.holdSuper;
}

function press(ai, action) {
    const code = ai.controls[action];
    if (code) keysPressed[code] = true;
}

function pickTarget(game, ai, brain, dt) {
    const opponents = game.getOpponentsOf(ai);
    if (!opponents.length) {
        ai.aiTarget = null;
        return null;
    }

    const canPerceive = candidate => {
        if (!candidate?.kuroCloaked) return true;
        const hasDecoy = game.minions?.some(minion => minion.type === 'kuro_decoy' && minion.owner === candidate && !minion.dead);
        if (hasDecoy) return true;
        const fullyInvisible = typeof candidate.isKuroFullyInvisible === 'function'
            ? candidate.isKuroFullyInvisible()
            : candidate.kuroAbsoluteCloakTimer > 0 || Math.hypot(candidate.vx || 0, candidate.vy || 0) <= 1.2;
        if (fullyInvisible) return false;
        const distance = distanceBetween(ai, candidate);
        return Math.abs(candidate.vx || 0) > 2.2 && distance < 340;
    };

    brain.targetTimer -= dt;
    if (ai.lastAttacker && !ai.lastAttacker.dead && ai.lastAttackerTimer > 0 && canPerceive(ai.lastAttacker)) {
        ai.aiTarget = ai.lastAttacker;
        brain.targetTimer = Math.max(brain.targetTimer, 900);
        return ai.aiTarget;
    }

    if (ai.aiTarget && !ai.aiTarget.dead && brain.targetTimer > 0 && canPerceive(ai.aiTarget)) return ai.aiTarget;

    const perceivedOpponents = opponents.filter(canPerceive);
    if (!perceivedOpponents.length) {
        ai.aiTarget = null;
        brain.targetTimer = 220;
        return null;
    }

    const targetLoad = new Map();
    for (const otherAI of game.aiFighters || []) {
        if (otherAI !== ai && otherAI.aiTarget && !otherAI.aiTarget.dead) {
            targetLoad.set(otherAI.aiTarget, (targetLoad.get(otherAI.aiTarget) || 0) + 1);
        }
    }

    ai.aiTarget = perceivedOpponents.reduce((best, candidate) => {
        const candidateScore = distanceBetween(ai, candidate)
            + (candidate.hp / candidate.maxHp) * 55
            + (targetLoad.get(candidate) || 0) * 125
            + Math.random() * 90;
        if (!best || candidateScore < best.score) return { fighter: candidate, score: candidateScore };
        return best;
    }, null).fighter;
    brain.targetTimer = 1300 + Math.random() * 1700;
    return ai.aiTarget;
}

function getControlledEntity(game, ai) {
    if (ai.heroName !== 'Ugo') return ai;
    return game.minions.find(minion => minion.type === 'puppet' && minion.owner === ai && !minion.dead) || ai;
}

function getTargetEntity(game, ai, target, source) {
    if (ai.heroName === 'Ukon') {
        const summons = game.minions.filter(minion => minion && minion.owner !== ai && !minion.dead && !minion.untargetable
            && minion.type !== 'time_anchor' && minion.type !== 'temporal_echo' && typeof minion.takeDamage === 'function');
        return [target, ...summons].filter(Boolean).reduce((best, candidate) => {
            if (!best) return candidate;
            const candidateDistance = distanceBetween(source, candidate);
            const bestDistance = distanceBetween(source, best);
            if (candidateDistance < bestDistance - 0.5) return candidate;
            if (Math.abs(candidateDistance - bestDistance) <= 0.5 && summons.includes(candidate) && !summons.includes(best)) return candidate;
            return best;
        }, null);
    }
    const drones = game.minions.filter(minion => minion.type === 'd2f_drone' && minion.owner !== ai && !minion.dead && !minion.untargetable);
    if (drones.length) {
        return drones.reduce((best, drone) => {
            const score = distanceBetween(source, drone) - (drone.laserActive ? 240 : 0) + (drone.hp / Math.max(1, drone.maxHp)) * 35;
            const bestScore = distanceBetween(source, best) - (best.laserActive ? 240 : 0) + (best.hp / Math.max(1, best.maxHp)) * 35;
            return score < bestScore ? drone : best;
        });
    }
    if (ai.heroName === 'Laegon') {
        const summons = game.minions.filter(minion => minion && minion.owner !== ai && !minion.dead && !minion.untargetable
            && minion.type !== 'time_anchor' && minion.type !== 'temporal_echo' && typeof minion.takeDamage === 'function');
        if (summons.length) {
            const closest = summons.reduce((best, summon) => distanceBetween(source, summon) < distanceBetween(source, best) ? summon : best);
            if (distanceBetween(source, closest) <= distanceBetween(source, target) + 260) return closest;
        }
    }
    const decoy = game.minions.find(minion => minion.type === 'kuro_decoy' && minion.owner === target && !minion.dead);
    if (decoy && (target.kuroCloaked || distanceBetween(source, decoy) < distanceBetween(source, target) * 0.9)) return decoy;
    const puppet = game.minions.find(minion => minion.type === 'puppet' && minion.owner === target && !minion.dead);
    if (puppet && distanceBetween(source, puppet) < distanceBetween(source, target) * 0.8) return puppet;
    return target;
}

function platformCenterX(platform) {
    return platform.x + platform.w / 2;
}

function arenaGroundY(source) {
    return typeof GROUND_Y === 'number' ? GROUND_Y : source.y + source.h;
}

function chooseRouteStep(source, goal) {
    if (!goal) return null;
    const current = getSurfacePlatform(source);
    if (current === goal) return goal;

    const sourceLevel = current ? current.y : arenaGroundY(source);
    const upwardGap = sourceLevel - goal.y;
    const horizontalGap = current
        ? Math.max(0, Math.max(current.x, goal.x) - Math.min(current.x + current.w, goal.x + goal.w))
        : 0;

    if (upwardGap > 20 && upwardGap <= 220) return goal;

    if (upwardGap > 220) {
        const upwardSteps = PLATFORMS.filter(platform => {
            if (platform === goal || platform === current) return false;
            const stepGap = sourceLevel - platform.y;
            return stepGap > 25 && stepGap <= 220 && platform.y > goal.y + 20;
        });
        upwardSteps.sort((first, second) => {
            const firstScore = Math.abs(platformCenterX(first) - centerX(source)) + (first.y - goal.y) * 0.3;
            const secondScore = Math.abs(platformCenterX(second) - centerX(source)) + (second.y - goal.y) * 0.3;
            return firstScore - secondScore;
        });
        if (upwardSteps.length) return upwardSteps[0];
    }

    if (current && (goal.y > current.y + 20 || (Math.abs(goal.y - current.y) <= 20 && horizontalGap > 320))) {
        const transferSteps = PLATFORMS.filter(platform =>
            platform !== current &&
            platform.y > current.y + 25 &&
            platform.y <= arenaGroundY(source) - 20
        );
        transferSteps.sort((first, second) => {
            const firstScore = Math.abs(platformCenterX(first) - centerX(source)) + Math.abs(platformCenterX(first) - platformCenterX(goal));
            const secondScore = Math.abs(platformCenterX(second) - centerX(source)) + Math.abs(platformCenterX(second) - platformCenterX(goal));
            return firstScore - secondScore;
        });
        if (transferSteps.length) return transferSteps[0];
    }

    return goal;
}

function pickHighGroundGoal(game, ai, source, target, brain, profile, diff) {
    const targetPlatform = getSurfacePlatform(target);
    const currentPlatform = getSurfacePlatform(source);
    const targetAbove = centerY(target) < centerY(source) - 65;

    if (targetAbove && targetPlatform) {
        brain.navPurpose = 'pursue';
        brain.navTimer = 7000;
        return targetPlatform;
    }

    if (brain.navGoal && brain.navTimer > 0) return brain.navGoal;
    if (brain.highGroundHoldTimer > 0 || brain.tacticTimer > 0 || !PLATFORMS.length) return null;

    brain.tacticTimer = diff.tacticMs * (0.8 + Math.random() * 0.7);
    const lowHealth = ai.hp / ai.maxHp < 0.42;
    const farFromTarget = distanceBetween(ai, target) > 210;
    const wantsHighGround = (profile.ranged && farFromTarget) || lowHealth || (targetPlatform && targetPlatform !== currentPlatform);
    const heroBias = profile.tactics?.highGround || 0.55;
    const chance = Math.min(1, (wantsHighGround ? diff.highGroundChance : diff.highGroundChance * 0.28) * heroBias);
    if (Math.random() > chance) return null;

    const candidates = PLATFORMS.filter(platform => platform !== currentPlatform);
    candidates.sort((first, second) => {
        const firstScore = first.y * 1.6
            + Math.abs(platformCenterX(first) - centerX(source)) * 0.35
            + Math.abs(platformCenterX(first) - centerX(target)) * 0.2;
        const secondScore = second.y * 1.6
            + Math.abs(platformCenterX(second) - centerX(source)) * 0.35
            + Math.abs(platformCenterX(second) - centerX(target)) * 0.2;
        return firstScore - secondScore;
    });

    brain.navPurpose = 'highground';
    brain.navTimer = 7000;
    return candidates[0] || null;
}

function navigatePlatforms(ai, source, target, brain, diff, goal) {
    const result = { overrideMovement: false, jump: false, doubleJump: false, drop: false };
    const sourcePlatform = getSurfacePlatform(source);

    if (brain.navStep && source.isGrounded && sourcePlatform === brain.navStep) {
        if (brain.navStep === brain.navGoal) {
            brain.anchorPlatform = brain.navGoal;
            brain.highGroundHoldTimer = brain.navPurpose === 'highground' ? 2600 + Math.random() * 1800 : 500;
            brain.navGoal = null;
            brain.navStep = null;
            brain.navPurpose = null;
            brain.navTimer = 0;
            return result;
        }
        brain.navStep = null;
    }

    if (!goal) {
        if (centerY(target) > centerY(source) + 115 && sourcePlatform) {
            result.overrideMovement = true;
            result.drop = true;
        }
        return result;
    }

    if (!brain.navStep || (source.isGrounded && brain.navStep === sourcePlatform)) {
        brain.navStep = chooseRouteStep(source, goal);
    }
    const step = brain.navStep;
    if (!step) return result;

    const landingInset = Math.min(45, step.w * 0.22);
    const landingMin = step.x + landingInset;
    const landingMax = step.x + step.w - landingInset;
    const goalX = step === brain.navGoal ? centerX(target) : platformCenterX(step);
    const desiredX = Math.max(landingMin, Math.min(landingMax, goalX));
    const sourceBottom = source.y + source.h;
    const verticalGap = sourceBottom - step.y;
    const stepIsHigher = step.y < sourceBottom - 25;
    let movementX = desiredX;

    if (source.isGrounded && sourcePlatform && stepIsHigher) {
        const takeoffInset = Math.min(40, sourcePlatform.w * 0.18);
        movementX = Math.max(
            sourcePlatform.x + takeoffInset,
            Math.min(sourcePlatform.x + sourcePlatform.w - takeoffInset, desiredX)
        );
    }
    const dx = movementX - centerX(source);

    result.overrideMovement = true;
    brain.intent.left = dx < -14;
    brain.intent.right = dx > 14;

    if (source.isGrounded) {
        if (stepIsHigher) {
            const alignedForTakeoff = Math.abs(dx) < (sourcePlatform ? 42 : Math.max(80, step.w * 0.3));
            if (alignedForTakeoff) {
                result.jump = true;
                brain.airJumpUsed = false;
                brain.airborneMs = 0;
            }
        } else {
            const overlapsLanding = centerX(source) > step.x + 15 && centerX(source) < step.x + step.w - 15;
            if (overlapsLanding) {
                result.drop = true;
                brain.intent.down = true;
            }
        }
    } else {
        const landingDx = desiredX - centerX(source);
        brain.intent.left = landingDx < -14;
        brain.intent.right = landingDx > 14;
        if (source === ai && ai.heroName !== 'Volt') {
            const hasAirJump = typeof ai.jumpsLeft !== 'number' || ai.jumpsLeft > 0;
            const stillNeedsHeight = sourceBottom > step.y - 8;
            const canFollowUp = !brain.airJumpUsed && hasAirJump && brain.airborneMs >= diff.doubleJumpDelay;
            if (canFollowUp && stillNeedsHeight && ai.vy > -8) {
                result.doubleJump = true;
            }
        }
    }

    return result;
}

function getCombatProfile(ai, source = ai) {
    const tactics = getHeroTactic(ai);
    if (source !== ai) return { range: 70, preferred: 44, ranged: false, tactics };
    let range = ai.isMeleeAttack() ? 78 : 330;
    let preferred = ai.isMeleeAttack() ? 55 : 235;
    switch (ai.heroName) {
        case 'Macu': range = 165; preferred = 115; break;
        case 'Duke': range = ai.isMounted ? 120 : 70; preferred = ai.isMounted ? 95 : 50; break;
        case 'Kadaxi': range = 105; preferred = 65; break;
        case 'Lique': range = 66; preferred = 42; break;
        case 'Kae': range = 58; preferred = 38; break;
        case 'Euclid': range = ai.euclidWeapon === 'magic' ? 430 : 65; preferred = ai.euclidWeapon === 'magic' ? 285 : 45; break;
        case 'Ugo': range = 340; preferred = 240; break;
        case 'Kila': range = ai.kilaElement === 'earth' ? 500 : 370; preferred = 270; break;
        case 'Volt': range = 350; preferred = 250; break;
        case 'Gensan': range = 62; preferred = 42; break;
        case 'Noae': range = 330; preferred = 220; break;
        case 'Wolf': range = 62; preferred = 38; break;
        case 'Kuro': range = 920; preferred = 610; break;
        case 'Sola': range = 86; preferred = 58; break;
        case 'Nyra': range = 390; preferred = 255; break;
        case 'Orion': range = 116; preferred = 76; break;
        case 'Archor': range = 620; preferred = 390; break;
        case 'Itan': range = 155; preferred = 105; break;
        case 'D2F1': range = 700; preferred = 420; break;
        case 'Laegon': range = ai.thunderGodTimer > 0 ? 360 : 650; preferred = ai.thunderGodTimer > 0 ? 150 : 390; break;
        case 'Veyra': range = 430; preferred = 285; break;
        case 'Brom': range = 390; preferred = 255; break;
        case 'Axeron': range = 96; preferred = 62; break;
        case 'Ukon': range = 365; preferred = 88; break;
        case 'Mori': range = 430; preferred = 270; break;
        case 'Roka': range = 650; preferred = 410; break;
        case 'Voss': range = ai.vossCopyTimer > 0 && ai.vossCopiedMelee ? 92 : 430; preferred = ai.vossCopyTimer > 0 && ai.vossCopiedMelee ? 62 : 275; break;
        case 'Raigo': range = 112; preferred = 72; break;
        case 'Gelann': range = 96; preferred = 66; break;
        case 'Dogel': range = 205; preferred = 105; break;
        case 'Lapis': range = ai.lapisWhipTimer > 0 ? 185 : 520; preferred = ai.lapisWhipTimer > 0 ? 105 : 330; break;
        case 'Tonia': range = 560; preferred = 350; break;
        case 'Ge': range = 142; preferred = 92; break;
        case 'Lak': range = 110; preferred = 72; break;
        case 'Pat': range = 620; preferred = 390; break;
        case 'Feng': range = ai.fengWindTimer > 0 ? 900 : 430; preferred = ai.fengWindTimer > 0 ? 360 : 270; break;
    }
    return { range, preferred, ranged: !ai.isMeleeAttack(), tactics };
}

function healthRatio(fighter) {
    return fighter?.maxHp > 0 ? Math.max(0, Math.min(1, fighter.hp / fighter.maxHp)) : 0;
}

function isVulnerableTarget(target) {
    return !!target && ((target.buffs?.dizzy || 0) > 0 || (target.stunTimer || 0) > 180 || !!target.grappledBy);
}

function hasCleanseableDebuff(fighter) {
    return !!fighter && ((fighter.stunTimer || 0) > 0
        || ['poison', 'dizzy', 'slow', 'gravitySlow', 'burn', 'bleed'].some(name => (fighter.buffs?.[name] || 0) > 0)
        || !!fighter.grappledBy || !!fighter.solaForceHeld);
}

function hasSetupOpportunity(game, ai) {
    const owned = type => game.minions.filter(minion => minion && minion.owner === ai && minion.type === type && !minion.dead).length;
    switch (ai.heroName) {
        case 'Artu': return owned('minion') < 3 && ai.superCooldown <= 0;
        case 'Euclid': return owned('skeleton') < 3 && ai.superCooldown <= 0;
        case 'Ugo': return owned('puppet') === 0;
        case 'Gensan': return (ai.gensanShadows?.length || 0) < 2 && ai.gensanShadowCD <= 0;
        case 'Noae': return owned('landmine') < 2;
        case 'Kila': return ai.kilaSwitchCD <= 0 && ai.kilaSwitchTimer <= 0;
        case 'Kuro': return ai.kuroDecoyCooldown <= 0 && owned('kuro_decoy') === 0;
        case 'D2F1': return ai.d2fDroneCooldown <= 0 && owned('d2f_drone') < 3;
        case 'Veyra': return owned('time_anchor') < 2;
        case 'Brom': return !ai.bromStickyBomb || ai.bromStickyBomb.dead;
        case 'Laegon': return ai.laegonSwitchCooldown <= 0;
        case 'Axeron': return ai.axeronRushCooldown <= 0 && (ai.axeronMarks || []).some(mark => mark.life > 0 && mark.target && !mark.target.dead);
        case 'Ukon': return ai.ukonShadowCooldown <= 0 && owned('ukon_shadow') === 0;
        case 'Mori': return owned('mori_node') < 3;
        case 'Roka': return ai.rokaMortarCooldown <= 0;
        case 'Voss': return ai.vossCopyTimer <= 0 && ai.vossCopyCooldown <= 0;
        case 'Raigo': return ai.raigoEnergy >= 25;
        case 'Gelann': return ai.gelannBreathCooldown <= 0;
        case 'Lak': return ai.lakWallCooldown <= 0;
        case 'Pat': return ai.patBindingCooldown <= 0;
        default: return false;
    }
}

function selectCombatState(game, ai, source, target, targetEntity, brain, profile, threat) {
    const tactics = profile.tactics;
    const ownHealth = healthRatio(ai);
    const targetHealth = healthRatio(target);
    const distance = distanceBetween(source, targetEntity);
    const vulnerable = isVulnerableTarget(target);
    const losing = Math.max(0, targetHealth - ownHealth);
    const tooClose = distance < profile.preferred * 0.68;
    const targetAbove = centerY(targetEntity) < centerY(source) - 85;
    const setupReady = hasSetupOpportunity(game, ai);

    if (ai.heroName === 'Volt') {
        if (!brain.voltRecovering && (ai.isOverloaded || ai.energy < 58)) brain.voltRecovering = true;
        if (brain.voltRecovering && !ai.isOverloaded && ai.energy >= 125) brain.voltRecovering = false;
    }

    const scores = {
        neutral: 0.45,
        evade: threat ? 12 : 0,
        burst: vulnerable ? 8.5 + tactics.burst * 2.5 : Math.max(0, 0.28 - targetHealth) * tactics.burst * 5,
        retreat: ownHealth < tactics.retreatHp
            ? 4.5 + (tactics.retreatHp - ownHealth) * 10 * tactics.caution + losing * 3
            : (tooClose && profile.ranged ? tactics.caution * 0.8 : 0),
        pressure: tactics.aggression * (1.2 + Math.max(0, ownHealth - targetHealth) * 2) + (!profile.ranged ? 1.4 : 0),
        kite: profile.ranged ? tactics.kite * (1.2 + (tooClose ? 1.8 : 0)) : 0,
        setup: setupReady ? tactics.setup * 3.2 : 0,
        highground: profile.ranged && (targetAbove || !getSurfacePlatform(source)) ? tactics.highGround * 1.4 : 0,
        recover: ai.heroName === 'Volt' && brain.voltRecovering ? 10 : 0
    };

    if (tactics.role === 'charger' && ai.isMounted && ai.runTimer < 3000) scores.pressure += 4.5;
    if (tactics.role === 'grappler' && (ai.grapplePhase === 1 || distance < 180)) scores.pressure += 2.2;
    if (tactics.role === 'berserker' && ownHealth < 0.45) {
        scores.pressure += 3.5;
        scores.retreat *= 0.2;
    }
    if (['assassin', 'power_assassin', 'dash_assassin'].includes(tactics.role) && (target.attackState !== 'idle' || vulnerable)) scores.burst += 2.5;
    if (tactics.role === 'trapper' && setupReady) scores.setup += 2.2;
    if (tactics.role === 'puppeteer' && source !== ai) scores.kite += 1.6;
    if (tactics.role === 'aerial' && !brain.voltRecovering) scores.kite += 1.2;
    if (tactics.role === 'sniper') {
        if (ai.kuroCloaked) scores.highground += 2.2;
        if (ai.kuroRelocateTimer > 0) scores.retreat += 10;
        if (vulnerable) scores.burst += 3.5;
    }

    let selected = Object.entries(scores).reduce((best, entry) => entry[1] > best[1] ? entry : best, ['neutral', -Infinity]);
    const currentScore = scores[brain.combatState] || 0;
    const urgentChange = !!threat || vulnerable !== brain.targetWasVulnerable || ((brain.combatState === 'recover') !== !!brain.voltRecovering);
    if (!urgentChange && brain.combatStateTimer > 0 && currentScore >= selected[1] * 0.82) {
        selected = [brain.combatState, currentScore];
    } else {
        brain.combatStateTimer = 240 + Math.random() * 260;
    }

    brain.combatState = selected[0];
    brain.tacticScores = scores;
    brain.targetWasVulnerable = vulnerable;
    ai.aiTacticalState = selected[0];
    ai.aiTacticalRole = tactics.role;
    return selected[0];
}

function applyHeroTempo(ai, combatState) {
    if (ai.heroName !== 'Willi') return;
    if (combatState === 'burst') ai.aiAttackTempo = 2.55;
    else if (combatState === 'retreat' || combatState === 'evade') ai.aiAttackTempo = 0.62;
    else if (combatState === 'pressure') ai.aiAttackTempo = 1.35;
    else ai.aiAttackTempo = 1;
}

function projectileThreat(game, ai, source) {
    let best = null;
    let bestScore = Infinity;
    for (const projectile of game.projectiles) {
        if (!projectile || projectile.dead || projectile.owner === ai) continue;
        const relativeX = centerX(source) - centerX(projectile);
        const distance = Math.abs(relativeX);
        const vx = projectile.vx || 0;
        const framesToCross = Math.abs(vx) > 0.1 ? relativeX / vx : Infinity;
        const headingToward = framesToCross >= 0 && framesToCross <= 24;
        const predictedY = centerY(projectile) + (projectile.vy || 0) * Math.max(0, Math.min(24, framesToCross));
        const yAligned = predictedY > source.y - 45 && predictedY < source.y + source.h + 55;
        const dangerousDynamite = projectile.type === 'dynamite' && distance < 210;
        if (!((headingToward && yAligned && distance < 430) || dangerousDynamite)) continue;

        const score = dangerousDynamite ? distance * 0.55 : Math.max(0, framesToCross) * 18 + distance * 0.2;
        if (score < bestScore) {
            const direction = dangerousDynamite
                ? (centerX(source) < centerX(projectile) ? -1 : 1)
                : (vx >= 0 ? 1 : -1);
            best = { kind: 'projectile', entity: projectile, direction, jump: yAligned, drop: !!getSurfacePlatform(source) && !dangerousDynamite };
            bestScore = score;
        }
    }
    return best;
}

function hazardThreat(game, ai, source) {
    for (const hazard of game.hazards || []) {
        if (!hazard || hazard.dead || hazard.owner === ai || hazard.delay > 650) continue;
        const horizontalDanger = source.x + source.w + 45 > hazard.x && source.x - 45 < hazard.x + hazard.w;
        const verticalDanger = source.y + source.h > hazard.y - 80 && source.y < hazard.y + hazard.h + 40;
        if (horizontalDanger && verticalDanger) {
            return {
                kind: 'hazard',
                entity: hazard,
                direction: centerX(source) < centerX(hazard) ? -1 : 1,
                jump: source.isGrounded,
                drop: false
            };
        }
    }
    return null;
}

function meleeThreat(ai, source, target) {
    if (!target || target.dead || !['windup', 'active'].includes(target.attackState)) return null;
    const range = target.isMeleeAttack?.() ? 155 : 105;
    if (Math.abs(centerY(target) - centerY(source)) > 95 || distanceBetween(source, target) > range) return null;
    return {
        kind: 'melee',
        entity: target,
        direction: centerX(source) < centerX(target) ? -1 : 1,
        jump: source.isGrounded,
        drop: !!getSurfacePlatform(source)
    };
}

function findImmediateThreat(game, ai, source, target) {
    return hazardThreat(game, ai, source) || projectileThreat(game, ai, source) || meleeThreat(ai, source, target);
}

function chooseDefensiveAction(game, ai, target, threat) {
    if (!threat) return null;
    switch (ai.heroName) {
        case 'Willi':
            if (ai.williDashCooldown <= 0 && (ai.williSuperCharges > 0 || ai.superCooldown <= 0)) return 'super';
            break;
        case 'Hunter':
            if (ai.superCooldown <= 0) return 'super';
            break;
        case 'Kae':
            if (ai.superCooldown <= 0 && target && !target.dead) return 'super';
            break;
        case 'Ugo':
            if (ai.superCooldown <= 0) return 'super';
            break;
        case 'Kila':
            if (ai.kilaSwitchCD <= 0 && ai.kilaSwitchTimer <= 0) return 'switch';
            break;
        case 'Volt':
            if (ai.superCooldown <= 0 && (ai.energy < 120 || ai.isOverloaded)) return 'super';
            break;
        case 'Gensan':
            if (ai.gensanShadows?.length && ai.gensanSwitchCD <= 0) return 'switch';
            break;
        case 'Kuro':
            if (ai.kuroDecoyCooldown <= 0) return 'switch';
            break;
        case 'Sola':
            if (ai.solaDashCooldown <= 0) return 'switch';
            break;
        case 'Nyra':
            if (ai.nyraShiftCooldown <= 0 && game.projectiles.some(projectile => projectile.owner === ai && (projectile.type === 'chakram' || projectile.type === 'chakram_super'))) return 'switch';
            break;
        case 'Archor':
            if (ai.archorSpeedCooldown <= 0 && hasCleanseableDebuff(ai)) return 'switch';
            break;
        case 'D2F1':
            if (ai.d2fDroneCooldown <= 0 && game.minions.filter(minion => minion && minion.owner === ai && minion.type === 'd2f_drone' && !minion.dead).length < 3) return 'switch';
            break;
        case 'Veyra':
            if (ai.superCooldown <= 0 && (ai.hp < ai.maxHp * 0.65 || threat.kind === 'melee')) return 'super';
            break;
        case 'Ukon':
            if (ai.ukonShadowCooldown <= 0) return 'switch';
            break;
        case 'Mori':
            if (ai.moriGrappleCooldown <= 0) return 'switch';
            break;
        case 'Roka':
            if (ai.rokaMortarCooldown <= 0) return 'switch';
            break;
        case 'Raigo':
            if (ai.raigoEnergy >= 25) return 'switch';
            break;
    }
    return null;
}

function desiredKilaElement(game, ai, target, dist, threat) {
    if (threat) return 'water';
    const opponents = game.getOpponentsOf?.(ai) || [];
    const clustered = opponents.filter(opponent => distanceBetween(target, opponent) < 240).length >= 2;
    if (game.isBattleRoyale && clustered) return 'earth';
    if (getSurfacePlatform(target) && ai.superCooldown <= 0) return 'earth';
    if (dist < 145) return 'earth';
    if (dist < 330) return 'water';
    return 'fire';
}

function chooseHeroAction(game, ai, target, targetEntity, dist, verticalDistance, brain, threat, combatState) {
    const aligned = Math.abs(verticalDistance) < 90;
    const superReady = ai.superCooldown <= 0;
    const minions = game.minions;

    if (ai.grapplePhase === 1 && ai.grappleTimer <= 4500) return 'super';
    if (ai.heroName === 'Ukon' && ai.ukonUltimatePhase === 'ready') return 'super';
    if (ai.heroName === 'Ukon' && ai.ukonUltimatePhase) return null;
    if (ai.heroName === 'Hason' && ai.hasonSuperCharges > 0 && dist < 560) return 'super';
    if (ai.heroName === 'Willi' && ai.williSuperCharges > 0 && ai.williDashCooldown <= 0 && dist < 600 && combatState !== 'burst') return 'super';

    const defensiveAction = chooseDefensiveAction(game, ai, target, threat);
    if (defensiveAction) return defensiveAction;

    switch (ai.heroName) {
        case 'Hason':
            if (superReady && dist < 520 && Math.abs(verticalDistance) < 210) return 'super';
            break;
        case 'Willi':
            if (ai.williDashCooldown <= 0 && superReady) {
                if ((combatState === 'retreat' || combatState === 'evade') && dist < 360) return 'super';
                if (combatState === 'pressure' && dist > 280 && dist < 520) return 'super';
                if (combatState === 'kite' && dist < 220) return 'super';
            }
            break;
        case 'Hunter':
            if (superReady && (dist < 470 || ai.hp < ai.maxHp * 0.7)) return 'super';
            if (ai.hunterWeapon === 'musket' && dist < 115) return 'switch';
            if (ai.hunterWeapon === 'sword' && (dist > 185 || Math.abs(verticalDistance) > 80) && ai.hunterMusketCD <= 0) return 'switch';
            break;
        case 'Macu':
            if (superReady && ai.buffs.battleCry <= 0 && dist < 620) return 'super';
            break;
        case 'Artu':
            if (superReady && combatState === 'setup' && minions.filter(minion => minion.owner === ai && minion.type === 'minion' && !minion.dead).length < 5) return 'super';
            break;
        case 'Duke':
            if (superReady && aligned && dist < 720) return 'super';
            break;
        case 'Kadaxi':
            if (superReady && aligned && dist < 195) return 'super';
            break;
        case 'Euclid': {
            const skeletons = minions.filter(minion => minion.type === 'skeleton' && minion.owner === ai && !minion.dead).length;
            if (superReady && skeletons < 3 && (dist < 650 || ai.hp < ai.maxHp * 0.7)) return 'super';
            if (ai.euclidSwitchTimer <= 0 && ai.euclidWeapon === 'magic' && dist < 105) return 'switch';
            if (ai.euclidSwitchTimer <= 0 && ai.euclidWeapon === 'sword' && (dist > 210 || Math.abs(verticalDistance) > 75)) return 'switch';
            break;
        }
        case 'Lique':
            if (superReady && ai.buffs.bloodFrenzy <= 0 && (dist < 230 || ai.hp < ai.maxHp * 0.75)) return 'super';
            break;
        case 'Kae':
            if (superReady && !target.dead && (dist > 90 || Math.abs(verticalDistance) > 70 || target.attackState !== 'idle')) return 'super';
            break;
        case 'Ugo': {
            const puppet = minions.find(minion => minion.type === 'puppet' && minion.owner === ai && !minion.dead);
            if (!puppet && ai.attackState === 'idle' && (combatState === 'setup' || dist > 80)) return 'switch';
            if (puppet) {
                const puppetDistance = distanceBetween(puppet, targetEntity);
                const bodyDistance = distanceBetween(ai, target);
                if (puppetDistance < 88 && (puppet.hp < puppet.maxHp * 0.7 || target.hp < target.maxHp * 0.45)) return 'switch';
                if (superReady && (ai.hp < ai.maxHp * 0.38 && bodyDistance < 180 || bodyDistance + 90 < puppetDistance)) return 'super';
            } else if (superReady && dist < 170) return 'super';
            break;
        }
        case 'Kila': {
            const desiredElement = desiredKilaElement(game, ai, target, dist, threat);
            if (ai.kilaElement !== desiredElement && ai.kilaSwitchCD <= 0 && ai.kilaSwitchTimer <= 0) return 'switch';
            if (superReady && ai.kilaSwitchTimer <= 0 && (dist < 520 || ai.kilaElement === 'earth')) return 'super';
            break;
        }
        case 'Volt':
            if (superReady && (combatState === 'recover' || combatState === 'burst' || ai.hp < ai.maxHp * 0.55)) return 'super';
            break;
        case 'Gensan':
            if (ai.gensanShadows.length < 2 && ai.gensanShadowCD <= 0) return 'extra';
            if (superReady && dist < 620) return 'super';
            if (ai.gensanShadows.length && (ai.hp < ai.maxHp * 0.45 || dist < 75)) return 'switch';
            break;
        case 'Noae': {
            const mines = minions.filter(minion => minion.type === 'landmine' && minion.owner === ai && !minion.dead).length;
            if (mines < 2 && combatState === 'setup' && dist > 75 && dist < 430) return 'switch';
            if (superReady && dist < 500) return 'super';
            if (mines < 3 && brain.anchorPlatform && dist > 100) return 'switch';
            break;
        }
        case 'Wolf':
            if (superReady && dist > 70 && dist < 650) return 'super';
            break;
        case 'Kuro': {
            const decoy = minions.find(minion => minion.type === 'kuro_decoy' && minion.owner === ai && !minion.dead);
            if (superReady && aligned && dist < 920 && (isVulnerableTarget(target) || target.hp < target.maxHp * 0.42)) return 'super';
            if (!decoy && ai.kuroDecoyCooldown <= 0 && (combatState === 'setup' || combatState === 'retreat' || combatState === 'evade' || dist < 210)) return 'switch';
            break;
        }
        case 'Sola':
            if (superReady && (combatState !== 'evade' || ai.hp < ai.maxHp * 0.4)) return 'super';
            if (ai.solaDashCooldown <= 0 && aligned && dist > 155 && dist < 430 && combatState === 'pressure') return 'switch';
            break;
        case 'Nyra': {
            const activeChakram = game.projectiles.some(projectile => projectile.owner === ai && !projectile.dead && (projectile.type === 'chakram' || projectile.type === 'chakram_super'));
            if (superReady && dist < 520 && Math.abs(verticalDistance) < 240) return 'super';
            if (activeChakram && ai.nyraShiftCooldown <= 0 && (dist < 115 || combatState === 'evade')) return 'switch';
            break;
        }
        case 'Orion':
            if (ai.orionCharges > 0 && ai.orionPulseCooldown <= 0 && dist < 205) return 'switch';
            if (superReady && dist < 680) return 'super';
            break;
        case 'Archor':
            if (superReady && dist < 900) return 'super';
            if (ai.archorSpeedCooldown <= 0 && hasCleanseableDebuff(ai)) return 'switch';
            break;
        case 'Itan':
            if (superReady && dist < 850 && Math.abs(verticalDistance) < 260 && (combatState === 'burst' || combatState === 'pressure' || dist > 170)) return 'super';
            if (!(ai.buffs?.nuMode > 0) && (combatState === 'pressure' || combatState === 'burst' || dist < 190)) return 'switch';
            break;
        case 'D2F1': {
            const drones = minions.filter(minion => minion && minion.owner === ai && minion.type === 'd2f_drone' && !minion.dead).length;
            if (superReady && dist < 900 && Math.abs(verticalDistance) < 330) return 'super';
            if (ai.d2fDroneCooldown <= 0 && (drones < 3 || combatState === 'setup' || combatState === 'pressure')) return 'switch';
            break;
        }
        case 'Laegon': {
            const enemySummons = minions.filter(minion => minion && minion.owner !== ai && !minion.dead && !minion.untargetable).length;
            if (superReady && (enemySummons >= 2 || combatState === 'burst' || ai.hp < ai.maxHp * 0.42)) return 'super';
            if (ai.laegonSwitchCooldown <= 0 && (isVulnerableTarget(target) || dist < 620)) return 'switch';
            break;
        }
        case 'Veyra': {
            const anchors = minions.filter(minion => minion?.type === 'time_anchor' && minion.owner === ai && !minion.dead).length;
            if (superReady && ai.veyraHistory?.length && (ai.hp < ai.maxHp * 0.58 || combatState === 'retreat' || combatState === 'evade')) return 'super';
            if (anchors < 2 && (combatState === 'setup' || combatState === 'highground' || dist > 180)) return 'switch';
            break;
        }
        case 'Brom': {
            if (superReady && dist < 650 && (combatState === 'burst' || isVulnerableTarget(target))) return 'super';
            if (ai.bromStickyBomb && !ai.bromStickyBomb.dead) {
                const bombDistance = Math.hypot(ai.bromStickyBomb.x - target.x, ai.bromStickyBomb.y - target.y);
                if (bombDistance < 115) return 'switch';
            } else if (combatState === 'setup' || (dist > 120 && dist < 430)) return 'switch';
            break;
        }
        case 'Axeron': {
            const marked = (ai.axeronMarks || []).some(mark => mark.life > 0 && mark.target && !mark.target.dead);
            if (ai.axeronRushCooldown <= 0 && marked && (dist > 105 || isVulnerableTarget(target))) return 'switch';
            if (superReady && dist < 720 && (combatState === 'burst' || isVulnerableTarget(target) || target.hp < target.maxHp*.42)) return 'super';
            break;
        }
        case 'Ukon': {
            const shadow = minions.find(minion => minion && minion.owner === ai && minion.type === 'ukon_shadow' && !minion.dead);
            if (superReady && (combatState === 'burst' || combatState === 'pressure' || target.hp < target.maxHp * 0.48)) return 'super';
            if (!shadow && ai.ukonShadowCooldown <= 0 && (combatState === 'setup' || combatState === 'pressure' || dist < 240)) return 'switch';
            break;
        }
        case 'Mori': {
            const nodes=minions.filter(item=>item&&item.owner===ai&&item.type==='mori_node'&&!item.dead).length;
            if(superReady&&dist<700&&(nodes>=2||combatState==='pressure'||combatState==='burst'||dist<360))return 'super';
            if(ai.moriGrappleCooldown<=0&&(combatState==='evade'||combatState==='highground'||dist<135))return 'switch';
            break;
        }
        case 'Roka':
            if(superReady&&dist<760)return 'super';
            if(ai.rokaMortarCooldown<=0&&(Math.abs(verticalDistance)>80||combatState==='setup'||isVulnerableTarget(target)))return 'switch';
            break;
        case 'Voss':
            if(superReady&&dist<620)return 'super';
            if(ai.vossCopyTimer>0&&(combatState==='burst'||isVulnerableTarget(target)))return 'switch';
            if(ai.vossCopyCooldown<=0)return 'switch';
            break;
        case 'Raigo':
            if(superReady&&dist<520)return 'super';
            if(ai.raigoEnergy>=25&&(dist>105||Math.abs(verticalDistance)>65||combatState==='pressure'))return 'switch';
            break;
        case 'Gelann':
            if(superReady&&dist<700&&(combatState==='setup'||combatState==='pressure'||combatState==='burst'||isVulnerableTarget(target)))return 'super';
            if(ai.gelannBreathCooldown<=0&&dist<220&&Math.abs(verticalDistance)<105)return 'switch';
            break;
        case 'Dogel':
            if(superReady&&dist<260)return 'super';
            if(ai.dogelChainCooldown<=0&&dist>90&&dist<620)return 'switch';
            break;
        case 'Lapis':
            if(superReady&&dist<260)return 'super';
            if(ai.lapisJudgmentCooldown<=0&&dist<700)return 'switch';
            break;
        case 'Tonia':
            if(superReady&&dist<700)return 'super';
            if(ai.toniaGrenadeCooldown<=0&&dist<520)return 'switch';
            break;
        case 'Ge':
            if(superReady&&dist<320)return 'super';
            if(ai.geThrustCooldown<=0&&dist>75&&dist<430)return 'switch';
            break;
        case 'Lak':
            if(superReady&&dist<650)return 'super';
            if(ai.lakWallCooldown<=0&&(dist>100||combatState==='setup'))return 'switch';
            break;
        case 'Pat':
            if(superReady&&dist<700)return 'super';
            if(ai.patBindingCooldown<=0&&dist<700)return 'switch';
            break;
        case 'Feng':
            if(superReady&&(dist<620||combatState==='burst'||combatState==='evade'))return 'super';
            if(ai.fengStepTimer<=0&&(dist>150||Math.abs(verticalDistance)>70))return 'switch';
            break;
    }
    return null;
}

function setHorizontalIntent(brain, direction) {
    brain.intent.left = direction < 0;
    brain.intent.right = direction > 0;
}

function clampDirectionToArena(source, direction) {
    if (source.x < 55 && direction < 0) return 1;
    if (source.x + source.w > CANVAS_W - 55 && direction > 0) return -1;
    return direction;
}

function controlVoltFlight(ai, targetEntity, brain, combatState, threat) {
    if (ai.heroName !== 'Volt') return;
    brain.intent.holdJump = false;
    brain.intent.down = false;

    if (ai.isOverloaded || ai.flightDisabled) return;
    if (brain.voltRecovering || combatState === 'recover') {
        if (!ai.isGrounded) brain.intent.down = true;
        return;
    }

    const targetY = centerY(targetEntity);
    const desiredOffset = combatState === 'burst' ? 25 : (threat ? 135 : 85);
    const desiredY = Math.max(105, Math.min(GROUND_Y - 145, targetY - desiredOffset));
    const altitudeError = centerY(ai) - desiredY;

    if (altitudeError > 18) brain.intent.holdJump = true;
    else if (altitudeError < -30) brain.intent.down = true;

    if (ai.isGrounded && ai.energy > 85 && combatState !== 'retreat') brain.intent.holdJump = true;
}

function decideMovement(game, ai, source, target, targetEntity, brain, profile, diff, threat, combatState) {
    const dx = centerX(targetEntity) - centerX(source);
    const dist = Math.abs(dx);
    const lowHealth = ai.hp / ai.maxHp < 0.28;

    brain.intent.left = false;
    brain.intent.right = false;
    brain.intent.down = false;
    brain.intent.holdJump = (brain.jumpHoldTimer || 0) > 0;

    if (threat && brain.evadeTimer <= 0) {
        const dodgeChance = threat.kind === 'melee' ? diff.meleeDodgeChance : diff.dodgeChance;
        if (Math.random() < dodgeChance) {
            brain.evadeTimer = threat.kind === 'hazard' ? 650 : 360 + Math.random() * 260;
            brain.evadeDirection = clampDirectionToArena(source, threat.direction || -Math.sign(dx));
            brain.evadeDrop = !!threat.drop && !!getSurfacePlatform(source) && Math.random() < 0.45;
        }
    }

    if (brain.evadeTimer > 0) {
        brain.evadeDirection = clampDirectionToArena(source, brain.evadeDirection || -Math.sign(dx));
        setHorizontalIntent(brain, brain.evadeDirection);
        const shouldDrop = brain.evadeDrop && !!getSurfacePlatform(source);
        brain.intent.down = shouldDrop;
        if (ai.heroName === 'Volt' && !ai.isOverloaded && ai.energy > 20) {
            brain.intent.holdJump = !shouldDrop;
        } else if (!shouldDrop) {
            if (source.isGrounded) {
                press(ai, 'jump');
                brain.jumpHoldTimer = Math.max(brain.jumpHoldTimer || 0, 300);
                brain.intent.holdJump = true;
            }
            else if (source === ai && !brain.airJumpUsed && brain.airborneMs >= diff.doubleJumpDelay && ai.vy > -7) {
                press(ai, 'jump');
                brain.airJumpUsed = true;
                brain.jumpHoldTimer = Math.max(brain.jumpHoldTimer || 0, 260);
                brain.intent.holdJump = true;
            }
        }
        return;
    }

    if (ai.heroName === 'Volt') {
        brain.navGoal = null;
        brain.navStep = null;
        brain.navPurpose = null;
    }
    const canDetour = ai.heroName !== 'Volt' && !(combatState === 'burst' && Math.abs(centerY(targetEntity) - centerY(source)) < 100);
    const tacticalGoal = canDetour ? pickHighGroundGoal(game, ai, source, targetEntity, brain, profile, diff) : null;
    if (tacticalGoal && tacticalGoal !== brain.navGoal) {
        brain.navGoal = tacticalGoal;
        brain.navStep = null;
    }

    const navigation = navigatePlatforms(ai, source, targetEntity, brain, diff, brain.navGoal);
    if (navigation.drop) brain.intent.down = true;

    if (!navigation.overrideMovement) {
        let direction = 0;
        const currentPlatform = getSurfacePlatform(source);
        const holdingHighGround = brain.highGroundHoldTimer > 0 && currentPlatform && currentPlatform === brain.anchorPlatform;

        if (combatState === 'retreat' || combatState === 'recover') {
            direction = -Math.sign(dx) || brain.strafeDirection;
        } else if (combatState === 'burst') {
            if (dist > profile.preferred * 0.92) direction = Math.sign(dx);
            else if (profile.ranged && dist < profile.preferred * 0.45) direction = -Math.sign(dx);
            else direction = 0;
        } else if (ai.heroName === 'Duke' && ai.isMounted && ai.runTimer < 3000) {
            direction = Math.sign(dx) || brain.strafeDirection;
            if (dist < 65) direction = brain.strafeDirection;
        } else if (dist > profile.preferred + 45) direction = Math.sign(dx);
        else if (profile.ranged && dist < profile.preferred - 55) direction = -Math.sign(dx);
        else if (lowHealth && dist < 240) direction = -Math.sign(dx);
        else if (!profile.ranged && dist > profile.range * 0.65) direction = Math.sign(dx);
        else {
            if (brain.strafeTimer <= 0) {
                brain.strafeTimer = 450 + Math.random() * 750;
                brain.strafeDirection = Math.random() < 0.5 ? -1 : 1;
            }
            direction = brain.strafeDirection;
        }

        if (holdingHighGround) {
            const leftLimit = currentPlatform.x + 35;
            const rightLimit = currentPlatform.x + currentPlatform.w - 35;
            if (centerX(source) <= leftLimit && direction < 0) direction = 1;
            if (centerX(source) >= rightLimit && direction > 0) direction = -1;
        }

        direction = clampDirectionToArena(source, direction);
        if (Math.random() < diff.mistakeChance * 0.35) direction *= -1;
        setHorizontalIntent(brain, direction);
    }

    controlVoltFlight(ai, targetEntity, brain, combatState, threat);

    if (brain.stuckTimer > 750 && (brain.intent.left || brain.intent.right)) {
        if (source.isGrounded) navigation.jump = true;
        else if (source === ai && !brain.airJumpUsed && brain.airborneMs >= diff.doubleJumpDelay) navigation.doubleJump = true;
        if (brain.stuckTimer > 1500) {
            brain.strafeDirection *= -1;
            brain.navStep = null;
            brain.stuckTimer = 0;
        }
    }

    if (navigation.jump) {
        press(ai, 'jump');
        brain.jumpHoldTimer = Math.max(brain.jumpHoldTimer || 0, 360);
        brain.intent.holdJump = true;
    }
    if (navigation.doubleJump && !brain.airJumpUsed) {
        press(ai, 'jump');
        brain.airJumpUsed = true;
        brain.jumpHoldTimer = Math.max(brain.jumpHoldTimer || 0, 300);
        brain.intent.holdJump = true;
    }

    const pursuingDrone = targetEntity.type === 'd2f_drone';
    const droneAbove = centerY(targetEntity) < centerY(source) - 45;
    if (pursuingDrone && droneAbove && source.isGrounded && dist < (profile.ranged ? profile.range : 280)) {
        press(ai, 'jump');
        brain.jumpHoldTimer = Math.max(brain.jumpHoldTimer || 0, 320);
        brain.intent.holdJump = true;
    }
}

function runFighterAI(game, ai, dt, diff) {
    const brain = makeBrain(ai);
    if (ai.dead) {
        clearAIInput(ai);
        return;
    }

    if (ai.solaForceHeld) {
        brain.intent.left = false;
        brain.intent.right = false;
        brain.intent.down = false;
        brain.intent.holdJump = false;
        brain.intent.holdAttack = false;
        brain.intent.holdSuper = false;
        brain.solaEscapeTapTimer = Math.max(0, (brain.solaEscapeTapTimer || 0) - dt);
        if (brain.solaEscapeTapTimer <= 0) {
            press(ai, 'attack');
            brain.solaEscapeTapTimer = 105 + Math.random() * 95;
        }
        applyHeldInput(ai, brain);
        return;
    }

    brain.intent.holdSuper = ai.heroName === 'Sola' && !!ai.solaForceActive;
    if (brain.intent.holdSuper) {
        brain.intent.left = false;
        brain.intent.right = false;
        brain.intent.down = false;
        brain.intent.holdJump = false;
        brain.intent.holdAttack = false;
        applyHeldInput(ai, brain);
        return;
    }

    brain.tacticTimer = Math.max(0, (brain.tacticTimer || 0) - dt);
    brain.jumpHoldTimer = Math.max(0, (brain.jumpHoldTimer || 0) - dt);
    brain.navTimer = Math.max(0, (brain.navTimer || 0) - dt);
    brain.highGroundHoldTimer = Math.max(0, (brain.highGroundHoldTimer || 0) - dt);
    brain.evadeTimer = Math.max(0, (brain.evadeTimer || 0) - dt);
    brain.strafeTimer = Math.max(0, (brain.strafeTimer || 0) - dt);
    brain.combatStateTimer = Math.max(0, (brain.combatStateTimer || 0) - dt);
    brain.kuroChargeTimer = Math.max(0, (brain.kuroChargeTimer || 0) - dt);
    brain.dogelChargeTimer = Math.max(0, (brain.dogelChargeTimer || 0) - dt);
    brain.toniaBurstTimer = Math.max(0, (brain.toniaBurstTimer || 0) - dt);
    brain.intent.holdAttack = (ai.heroName === 'Kuro' && brain.kuroChargeTimer > 0)
        || (ai.heroName === 'Dogel' && brain.dogelChargeTimer > 0)
        || (ai.heroName === 'Tonia' && brain.toniaBurstTimer > 0 && !ai.toniaOverheated);
    if (ai.heroName !== 'Volt') brain.intent.holdJump = brain.jumpHoldTimer > 0;
    brain.actionLock = Math.max(0, brain.actionLock - dt);
    if (brain.navGoal && brain.navTimer <= 0) {
        brain.navGoal = null;
        brain.navStep = null;
        brain.navPurpose = null;
    }

    const target = pickTarget(game, ai, brain, dt);
    if (!target) {
        clearAIInput(ai);
        return;
    }

    const source = getControlledEntity(game, ai);
    if (source.isGrounded) {
        if (!brain.wasGrounded) {
            brain.airJumpUsed = false;
            brain.airborneMs = 0;
        }
    } else {
        brain.airborneMs = (brain.airborneMs || 0) + dt;
    }
    brain.wasGrounded = !!source.isGrounded;

    const movementDistance = Math.hypot(source.x - (brain.lastX ?? source.x), source.y - (brain.lastY ?? source.y));
    if ((brain.intent.left || brain.intent.right) && movementDistance < 0.75) brain.stuckTimer = (brain.stuckTimer || 0) + dt;
    else brain.stuckTimer = Math.max(0, (brain.stuckTimer || 0) - dt * 2);
    brain.lastX = source.x;
    brain.lastY = source.y;

    if (!game.isBattleRoyale) brain.profile.observePlayer(game.p1, dt);
    applyHeldInput(ai, brain);

    brain.decisionTimer -= dt;
    if (brain.decisionTimer > 0) return;
    brain.decisionTimer = diff.reactionMs * (0.75 + Math.random() * 0.5);

    const targetEntity = getTargetEntity(game, ai, target, source);
    ai.aiCombatTarget = targetEntity;
    const profile = getCombatProfile(ai, source);
    const threat = findImmediateThreat(game, ai, source, targetEntity);
    const combatState = selectCombatState(game, ai, source, target, targetEntity, brain, profile, threat);
    applyHeroTempo(ai, combatState);
    if (combatState === 'burst') brain.actionLock = Math.min(brain.actionLock, diff.reactionMs * 0.25);
    decideMovement(game, ai, source, target, targetEntity, brain, profile, diff, threat, combatState);
    applyHeldInput(ai, brain);

    const predictedX = centerX(targetEntity) + (targetEntity.vx || 0) * diff.aimLead;
    const predictedY = centerY(targetEntity) + (targetEntity.vy || 0) * Math.min(8, diff.aimLead);
    const dx = predictedX - centerX(source);
    const dy = predictedY - centerY(source);
    const dist = Math.abs(dx);

    if (Math.abs(dx) > 10) ai.facing = dx > 0 ? 1 : -1;
    if ((brain.actionLock > 0 && !threat) || Math.random() < diff.mistakeChance) return;

    const targetingDrone = targetEntity.type === 'd2f_drone';
    const heroAction = targetingDrone
        ? chooseDefensiveAction(game, ai, target, threat)
        : chooseHeroAction(game, ai, target, targetEntity, dist, dy, brain, threat, combatState);
    if (heroAction && Math.random() < diff.skillChance) {
        if (ai.heroName === 'Willi' && heroAction === 'super' && (threat || combatState === 'retreat' || combatState === 'evade')) {
            ai.facing = brain.evadeDirection || (dx > 0 ? -1 : 1);
        }
        if (ai.heroName === 'Sola' && heroAction === 'super') {
            brain.intent.left = false;
            brain.intent.right = false;
            brain.intent.down = false;
            brain.intent.holdJump = false;
            brain.intent.holdAttack = false;
            brain.intent.holdSuper = true;
            applyHeldInput(ai, brain);
        }
        press(ai, heroAction);
        brain.actionLock = heroAction === 'super' ? 300 : 210;
        return;
    }

    const engagementRange = targetingDrone && profile.ranged ? Math.max(profile.range, 780) : profile.range;
    const verticalTolerance = targetingDrone && profile.ranged ? 220 : (profile.ranged ? 115 : 72);
    const canAttack = dist <= engagementRange && Math.abs(dy) < verticalTolerance;
    const dukeCanAttack = ai.heroName !== 'Duke' || !ai.isMounted || ai.runTimer >= 3000;
    let attackCommitment = 0.78;
    if (combatState === 'burst') attackCommitment = 1;
    else if (combatState === 'retreat' || combatState === 'evade') attackCommitment = profile.tactics.retreatFireChance;
    else if (combatState === 'recover') attackCommitment = 0;
    else if (combatState === 'setup') attackCommitment = 0.42;
    else if (combatState === 'pressure') attackCommitment = profile.ranged ? 0.88 : 1;

    if (canAttack && dukeCanAttack && ai.attackState === 'idle' && Math.random() < attackCommitment) {
        if (ai.heroName === 'Kuro') {
            const desiredCharge = ai.kuroEmpoweredShot || combatState === 'burst'
                ? 1250
                : ((combatState === 'retreat' || combatState === 'evade') ? 480 : 920);
            brain.kuroChargeTimer = desiredCharge;
            brain.intent.holdAttack = true;
            keys[ai.controls.attack] = true;
        } else if (ai.heroName === 'Dogel') {
            brain.dogelChargeTimer = combatState === 'burst' ? 1450 : 760;
            brain.intent.holdAttack = true; keys[ai.controls.attack] = true;
        } else if (ai.heroName === 'Tonia') {
            brain.toniaBurstTimer = ai.toniaHeat > 75 ? 260 : 850;
            brain.intent.holdAttack = true; keys[ai.controls.attack] = true;
        }
        press(ai, 'attack');
        if (combatState === 'burst') brain.actionLock = 20;
        else if (combatState === 'retreat' || combatState === 'evade') brain.actionLock = profile.ranged ? 360 : 220;
        else brain.actionLock = profile.ranged ? 150 : 105;
    }
}

function runAI(game, dt) {
    const difficultyKey = game.aiDifficulty || localStorage.getItem('otokojuku_ai_difficulty') || 'normal';
    const diff = AI_DIFFICULTY[difficultyKey] || AI_DIFFICULTY.normal;
    const fighters = (game.aiFighters || []).filter(Boolean);
    for (const fighter of fighters) runFighterAI(game, fighter, dt, diff);
}

window.AI_DIFFICULTY = AI_DIFFICULTY;
window.HERO_TACTICS = HERO_TACTICS;
window.runAI = runAI;
window.AdaptiveAIProfile = AdaptiveAIProfile;
