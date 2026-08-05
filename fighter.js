/**
 * Otokojuku: Legends Duel
 * Fighter Class
 */

class Fighter extends Entity {
    constructor(id, heroName, x, controls, isP1) {
        let stats = HEROES[heroName];
        super(x, GROUND_Y - stats.height, stats.width, stats.height);
        this.id = id; this.heroName = heroName; this.controls = controls; this.isP1 = isP1; this.facing = isP1 ? 1 : -1;

        this.baseMaxHp = stats.maxHp; this.maxHp = stats.maxHp; this.hp = this.maxHp;
        this.baseSpeed = stats.speed; this.baseJump = stats.jump; this.color = stats.color;

        this.isGrounded = false; this.superCooldownMax = stats.superCD; this.superCooldown = 0; this.stunTimer = 0;
        this.coyoteTime = 0; this.jumpBuffer = 0; this.maxJumps = heroName === 'Willi' ? 2 : 1; this.jumpsLeft = this.maxJumps;
        this.currentPlatform = null; this.aiIntent = { left: false, right: false };
        this.attackState = 'idle'; this.stateTimer = 0; this.maxStateTimer = 0; this.hasHit = false;

        this.buffs = { poison: 0, battleCry: 0, shade: 0, dizzy: 0, slow: 0, gravitySlow: 0, hurricaneSlow: false, bloodFrenzy: 0, burn: 0, msBoost: 0, bleed: 0, bleedTick: 0, nuMode: 0 };
        this.invincible = 0; this.lastJumpTime = 0;
        this.flipActive = 0; this.hasHitFlip = false; this.hasFlipped = false;
        this.grapplePhase = 0; this.grappleTimer = 0;
        this.grappledBy = null;
        this.solaForceHeld = false;
        this.solaForceSourceId = null;
        this.solaForceProgress = 0;
        this.solaForceFallPending = false;
        this.solaForceFallSourceId = null;
        this.solaForceFallPeakY = this.y;
        this.flipCooldown = 0;
        this.timeSinceLastDamage = 0;
        this.flightDisabled = false;
        this.lastAttacker = null;
        this.lastAttackerTimer = 0;

        this.hasonAmmo = 6; this.hasonReloadTimer = 0; this.hasonSuperCharges = 0; this.hasonSuperWindow = 0;
        this.williSuperCharges = 0; this.williSuperWindow = 0; this.williDashCooldown = 0;
        this.williComboCount = 0; this.williHealBuffTimer = 0; this.williHasTriggeredHeal = false;

        this.hunterWeapon = 'musket'; this.hunterMusketCD = 0;
        this.euclidWeapon = 'magic'; this.euclidSwitchTimer = 0; this.superWindupTimer = 0;
        this.kaeComboCount = 0; this.kaeAggroTimer = 0; this.kaeAwakened = false;
        this.ugoSummoning = false;

        this.kilaElement = 'fire';
        this.kilaSwitchTimer = 0;
        this.kilaSwitchCD = 0;
        this.waterStunImmunity = 0;
        this.burnTick = 0;

        if (this.heroName === 'Volt') {
            this.energy = 200;
            this.maxEnergy = 200;
            this.isOverloaded = false;
            this.overdriveTimer = 0;
        }

        if (this.heroName === 'Gensan') {
            this.gensanCombo = 0;
            this.gensanShadowCD = 0;
            this.gensanShadows = [];
            this.gensanSwitchCD = 0;
        }

        if (this.heroName === 'Duke') {
            this.isMounted = true; this.maxHorseHp = 500; this.horseHp = 500; this.runTimer = 0;
            this.w = 70; this.h = 80;
        }

        if (this.heroName === 'Kadaxi') {
            this.comboCount = 0; this.comboTimer = 0;
            this.grappleTarget = null;
        }

        if (this.heroName === 'Wolf') {
            this.wolfAttackTimer = 1500;
            this.wolfComboCount = 0;
            this.wolfPassiveReady = false;
        }

        if (this.heroName === 'Kuro') {
            this.kuroCloakTimer = 0;
            this.kuroRevealTimer = 0;
            this.kuroCloaked = false;
            this.kuroAbsoluteCloakTimer = 0;
            this.kuroCharge = 0;
            this.kuroChargeMax = 1200;
            this.kuroDecoyCooldown = 0;
            this.kuroEmpoweredShot = false;
            this.kuroEmpoweredTimer = 0;
            this.kuroScopeGlintTimer = 0;
            this.kuroRelocateTimer = 0;
        }

        if (this.heroName === 'Sola') {
            this.solaFocus = 0;
            this.solaDashCooldown = 0;
            this.solaChargeTimer = 0;
            this.solaChargeDuration = 700;
            this.solaChargeDirection = this.facing;
            this.solaChargeElapsed = 0;
            this.solaChargeHitTargets = new Set();
            this.solaForceActive = false;
            this.solaForceTarget = null;
            this.solaForceTargetId = null;
            this.solaForceElapsed = 0;
            this.solaForceTickTimer = 0;
            this.solaForceMaxDuration = 4500;
            this.solaForceAnchorX = this.x;
            this.solaForceAnchorY = this.y;
        }

        if (this.heroName === 'Nyra') {
            this.nyraShiftCooldown = 0;
        }

        if (this.heroName === 'Orion') {
            this.orionCharges = 0;
            this.orionPulseCooldown = 0;
        }

        if (this.heroName === 'Archor') {
            this.archorDamageBonus = 0;
            this.archorDamageBonusMax = 30;
            this.archorSpeedCooldown = 0;
            this.archorHitChain = 0;
            this.archorHitChainTimer = 0;
            this.archorPassiveTimer = 0;
        }

        if (this.heroName === 'Itan') {
            this.itanSuperWindupTimer = 0;
            this.itanSuperWindupMax = 2000;
        }

        if (this.heroName === 'D2F1') {
            this.d2fDroneCooldown = 0;
            this.d2fDroneSerial = 0;
        }

        if (this.heroName === 'Laegon') {
            this.laegonEnergy = 100; this.laegonMaxEnergy = 100; this.laegonSwitchCooldown = 0;
            this.thunderCharges = 0; this.thunderChargeTimer = 0; this.laegonLastHitTarget = null;
            this.thunderGodTimer = 0; this.laegonHammerInFlight = false;
        }
        if (this.heroName === 'Veyra') {
            this.veyraAnchors = []; this.veyraHistory = []; this.veyraHistoryTimer = 0;
            this.veyraEchoTimer = 0; this.veyraReversalTimer = 0;
        }
        if (this.heroName === 'Brom') this.bromStickyBomb = null;
        if (this.heroName === 'Axeron') {
            this.axeronCombo = 0; this.axeronMarks = []; this.axeronRushTarget = null;
            this.axeronRushTimer = 0; this.axeronRushMax = 180; this.axeronRushHit = false;
        }
        if (this.heroName === 'Ukon') {
            this.ukonDashCooldown = 0;
            this.ukonDashTimer = 0;
            this.ukonDashDuration = 135;
            this.ukonBurstOriginX = this.x;
            this.ukonBurstOriginY = this.y;
            this.ukonBurstMaxDistance = 0;
            this.ukonChargeTimer = 0;
            this.ukonChargeTargetId = null;
            this.ukonChargeTarget = null;
            this.ukonChargeCanStrike = false;
            this.ukonShadowCooldown = 0;
            this.ukonUltimatePhase = null;
            this.ukonTree = null;
            this.ukonClimbTargetY = 54;
            this.ukonDropWarningTimer = 0;
            this.ukonDropTargetX = this.x + this.w/2;
            this.ukonDropTargetY = GROUND_Y;
            this.ukonDropStartY = this.y;
            this.ukonLastDropDamage = 0;
        }
        if (this.heroName === 'Mori') {
            this.moriFanCombo = 0;
            this.moriFanComboTimer = 0;
            this.moriNodeSerial = 0;
            this.moriGrappleCooldown = 0;
            this.moriGrappleTimer = 0;
            this.moriGrappleTargetX = this.x;
            this.moriGrappleTargetY = this.y;
        }
        if (this.heroName === 'Roka') {
            this.rokaMortarCooldown = 0;
            this.rokaArtilleryTimer = 0;
            this.rokaWeaponAngle = 0;
        }
        if (this.heroName === 'Voss') {
            this.vossCopyCooldown = 0;
            this.vossCopyTimer = 0;
            this.vossCopyActive = false;
            this.vossCopiedHero = null;
            this.vossCopiedTarget = null;
            this.vossCopiedMelee = false;
            this.vossOwnSuperCooldown = 0;
            this.vossDouble = null;
        }
        if (this.heroName === 'Raigo') {
            this.raigoEnergy = 0;
            this.raigoMaxEnergy = 100;
            this.raigoEmpoweredAttack = false;
            this.raigoChargeTimer = 0;
            this.raigoChargeHitTargets = new Set();
            this.raigoArmorTimer = 0;
        }
    }

    takeDamage(amt, attacker, isDoT = false, noKnockback = false, noHitReaction = false) {
        if (this.dead || this.invincible > 0 || (this.heroName === 'Sola' && this.solaChargeTimer > 0)) return;
        const itanSuperDebuffImmune = this.heroName === 'Itan' && this.itanSuperWindupTimer > 0;

        if (this.heroName === 'Sola' && this.solaForceActive) this.endSolaForce();
        if (this.heroName === 'Ukon' && (this.ukonDashTimer > 0 || this.ukonChargeTimer > 0)) this.finishUkonBurst(true);

        if (this.heroName === 'Kuro') {
            this.revealKuro(2000);
            if (this.attackState === 'charging') {
                this.attackState = 'idle';
                this.kuroCharge = 0;
                this.stateTimer = 0;
            }
        }

        if (attacker && attacker !== this && attacker.heroName) {
            this.lastAttacker = attacker;
            this.lastAttackerTimer = 2500;
        }

        if (!isDoT) {
            if (this.heroName === 'Kadaxi' && this.grapplePhase === 1) this.breakGrapple();
        }

        if (this.heroName === 'Volt' && !isDoT) {
            this.buffs.slow = Math.max(this.buffs.slow || 0, 200);
        }

        if (this.heroName === 'Artu') amt *= 0.9;
        if (attacker && attacker.buffs && attacker.buffs.battleCry > 0) amt *= 1.4;

        if (this.heroName === 'Duke' && this.isMounted) {
            this.horseHp -= amt;
            for(let i=0; i<6; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#FFF", (Math.random()-0.5)*12, (Math.random()-0.5)*12, 250));
            if (this.horseHp <= 0) {
                this.isMounted = false; this.horseHp = 0; this.buffs.dizzy = 5000;
                this.baseSpeed = 4.5; this.w = 45; this.h = 70;
                for(let i=0; i<30; i++) game.particles.push(new Particle(this.x, this.y+40, "#8B4513", (Math.random()-0.5)*20, -Math.random()*15, 800, 8));
            }
            return;
        }

        this.hp -= amt;
        if (!noHitReaction && !itanSuperDebuffImmune) this.stunTimer = 150;
        this.timeSinceLastDamage = 0;

        if (this.heroName === 'Willi' && this.hp < this.maxHp * 0.5 && !this.williHasTriggeredHeal) {
            this.williHasTriggeredHeal = true;
            this.williHealBuffTimer = 5000;
            for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#FF0000", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 800, 6));
        }

        if (this.heroName === 'Kae' && this.hp < this.maxHp * 0.5 && !this.kaeAwakened) {
            this.kaeAwakened = true;
            for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#000000", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 1000, 8));
        }

        if (this.heroName === 'Kae' || this.heroName === 'Ugo' || this.heroName === 'Kila' || this.heroName === 'Volt' || this.heroName === 'Gensan') {
            if (this.attackState === 'windup') {
                this.attackState = 'idle';
                this.superWindupTimer = 0;
                this.stateTimer = 0;
                this.ugoSummoning = false;
            }
        } else if (this.heroName === 'Euclid') {
            if (this.attackState === 'windup' && this.euclidWeapon === 'sword') {
                this.attackState = 'idle';
                this.superWindupTimer = 0;
                this.stateTimer = 0;
            }
        }

        if (!isDoT && !noKnockback && !this.grappledBy) {
            let direction = attacker ? (this.x + this.w/2 < attacker.x + attacker.w/2 ? -1 : 1) : (this.facing === 1 ? -1 : 1);
            this.vx = direction * (amt * 0.5);
            this.vy = -Math.min(amt * 0.3, 10);
            game.hitstop = 60;
            if (this.heroName === 'Volt') this.flightDisabled = true;
        }

        for(let i=0; i<6; i++) {
            let sparkColors = ["#FFA500", "#FFD700", "#FFFFFF"];
            let sColor = sparkColors[Math.floor(Math.random() * sparkColors.length)];
            game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, sColor, (Math.random()-0.5)*12, (Math.random()-0.5)*12, 250));
        }

        if (this.hp <= 0) {
            this.hp = 0; this.dead = true;
            if (this.heroName === 'Kadaxi') this.breakGrapple();
            if (this.solaForceHeld) {
                const forceSource = typeof game.getFighters === 'function'
                    ? game.getFighters().find(fighter => fighter.id === this.solaForceSourceId)
                    : null;
                if (forceSource && typeof forceSource.endSolaForce === 'function') forceSource.endSolaForce();
                else {
                    this.solaForceHeld = false;
                    this.solaForceSourceId = null;
                    this.solaForceProgress = 0;
                }
            }
            game.handleFighterDefeat(this, attacker);
        }
    }

    breakGrapple() {
        if (this.grappleTarget) {
            this.grappleTarget.grappledBy = null;
            this.grappleTarget = null;
            this.grapplePhase = 0;
            this.grappleTimer = 0;
        }
    }

    revealKuro(duration = 1500) {
        if (this.heroName !== 'Kuro') return;
        if (this.kuroAbsoluteCloakTimer > 0) return;
        this.kuroCloaked = false;
        this.kuroCloakTimer = 0;
        this.kuroRevealTimer = Math.max(this.kuroRevealTimer || 0, duration);
    }

    isKuroFullyInvisible() {
        if (this.heroName !== 'Kuro' || !this.kuroCloaked) return false;
        return this.kuroAbsoluteCloakTimer > 0 || Math.hypot(this.vx || 0, this.vy || 0) <= 1.2;
    }

    fireKuroLongshot() {
        if (this.heroName !== 'Kuro' || this.attackState !== 'charging') return;

        const chargeRatio = Math.max(0, Math.min(1, this.kuroCharge / this.kuroChargeMax));
        const empowered = this.kuroEmpoweredShot && this.kuroEmpoweredTimer > 0;
        const damage = empowered ? 130 : (chargeRatio >= 0.85 ? 80 : (chargeRatio >= 0.4 ? 50 : 20));
        const type = empowered ? 'phantom_round' : (chargeRatio >= 0.85 ? 'sniper_round_full' : 'sniper_round');
        const target = game.getEnemyOf(this);
        const px = this.facing === 1 ? this.x + this.w : this.x - 22;
        const py = this.y + 24;
        const tx = target ? target.x + target.w/2 : px + this.facing * 700;
        const ty = target ? target.y + target.h/2 : py;
        const aimAngle = Math.atan2(ty - py, tx - px);
        const speed = empowered ? 48 : 38;

        game.projectiles.push(new Projectile(px, py, 22, 4, Math.cos(aimAngle) * speed, Math.sin(aimAngle) * speed, damage, this, empowered ? '#ffffff' : '#9ad8c0', type));
        for (let i = 0; i < 9; i++) {
            game.particles.push(new Particle(px, py, i % 2 ? '#ffffff' : '#9ad8c0', Math.cos(aimAngle) * (3 + Math.random() * 5), Math.sin(aimAngle) * (3 + Math.random() * 5), 180, 3));
        }

        this.revealKuro(empowered ? 2000 : 1500);
        this.kuroRelocateTimer = empowered ? 1800 : 1250;
        this.kuroEmpoweredShot = false;
        this.kuroEmpoweredTimer = 0;
        this.kuroScopeGlintTimer = 0;
        this.kuroCharge = 0;
        this.attackState = 'recovery';
        this.stateTimer = empowered ? 500 : 320;
        this.maxStateTimer = this.stateTimer;
    }

    getSolaForceTarget() {
        if (this.solaForceTarget && this.solaForceTarget.id === this.solaForceTargetId) {
            return this.solaForceTarget;
        }
        if (typeof game.getFighters !== 'function') return null;
        this.solaForceTarget = game.getFighters().find(fighter => fighter && fighter.id === this.solaForceTargetId) || null;
        return this.solaForceTarget;
    }

    startSolaForce() {
        if (this.heroName !== 'Sola' || this.dead || this.solaForceActive || this.superCooldown > 0) return false;
        const isMoving = keys[this.controls.left] || keys[this.controls.right] || keys[this.controls.jump] || keys[this.controls.down];
        if (isMoving) return false;

        const opponents = game.getOpponentsOf(this).filter(target => target && !target.dead && !target.untargetable && !target.solaForceHeld);
        if (!opponents.length) return false;
        const preferred = this.aiTarget && opponents.includes(this.aiTarget) ? this.aiTarget : null;
        const centerX = this.x + this.w / 2;
        const centerY = this.y + this.h / 2;
        const target = preferred || opponents.reduce((closest, candidate) => {
            const candidateDistance = Math.hypot(candidate.x + candidate.w/2 - centerX, candidate.y + candidate.h/2 - centerY);
            const closestDistance = Math.hypot(closest.x + closest.w/2 - centerX, closest.y + closest.h/2 - centerY);
            return candidateDistance < closestDistance ? candidate : closest;
        });

        if (target.grappledBy && typeof target.grappledBy.breakGrapple === 'function') target.grappledBy.breakGrapple();
        if (target.grapplePhase === 1 && typeof target.breakGrapple === 'function') target.breakGrapple();

        this.solaForceActive = true;
        this.solaForceTarget = target;
        this.solaForceTargetId = target.id;
        this.solaForceElapsed = 0;
        this.solaForceTickTimer = 0;
        this.solaForceAnchorX = this.x;
        this.solaForceAnchorY = this.y;
        this.superCooldown = this.superCooldownMax;
        this.attackState = 'idle';
        this.stateTimer = 0;
        this.vx = 0;
        this.vy = 0;

        target.solaForceHeld = true;
        target.solaForceSourceId = this.id;
        target.solaForceProgress = 0;
        target.solaForceFallPending = false;
        target.solaForceFallSourceId = null;
        target.solaForceFallPeakY = target.y;
        target.attackState = 'idle';
        target.stateTimer = 0;
        target.superWindupTimer = 0;
        target.ugoSummoning = false;
        target.vx = 0;
        target.vy = 0;

        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, i % 2 ? '#ffffff' : '#bdefff', Math.cos(angle)*7, Math.sin(angle)*7, 420, 4));
        }
        return true;
    }

    endSolaForce() {
        if (this.heroName !== 'Sola') return;
        const target = this.getSolaForceTarget();
        if (target && target.solaForceSourceId === this.id) {
            target.solaForceHeld = false;
            target.solaForceSourceId = null;
            target.solaForceProgress = 0;
            target.solaForceFallPending = !target.dead;
            target.solaForceFallSourceId = this.id;
            target.solaForceFallPeakY = Math.min(target.solaForceFallPeakY ?? target.y, target.y);
            target.vx = 0;
            target.vy = Math.min(0, target.vy || 0);
        }
        this.solaForceActive = false;
        this.solaForceTarget = null;
        this.solaForceTargetId = null;
        this.solaForceElapsed = 0;
        this.solaForceTickTimer = 0;
    }

    updateSolaForce(dt) {
        if (this.heroName !== 'Sola' || !this.solaForceActive) return false;
        const target = this.getSolaForceTarget();
        const movementRequested = keys[this.controls.left] || keys[this.controls.right] || keys[this.controls.jump] || keys[this.controls.down];
        const interrupted = !keys[this.controls.super] || movementRequested || this.dead || this.stunTimer > 0
            || this.buffs.dizzy > 0 || this.grappledBy || !target || target.dead
            || !target.solaForceHeld || target.solaForceSourceId !== this.id;
        if (interrupted) {
            this.endSolaForce();
            return false;
        }

        const remaining = Math.max(0, this.solaForceMaxDuration - this.solaForceElapsed);
        const activeDt = Math.min(Math.max(0, dt), remaining);
        this.solaForceElapsed += activeDt;
        this.solaForceTickTimer += activeDt;
        this.x = this.solaForceAnchorX;
        this.y = this.solaForceAnchorY;
        this.vx = 0;
        this.vy = 0;

        target.x = Math.max(0, Math.min(CANVAS_W - target.w, target.x));
        target.y = Math.max(45, target.y - activeDt * 0.03);
        target.solaForceFallPeakY = Math.min(target.solaForceFallPeakY ?? target.y, target.y);
        target.vx = 0;
        target.vy = 0;
        target.solaForceProgress = Math.min(1, this.solaForceElapsed / this.solaForceMaxDuration);

        while (this.solaForceTickTimer >= 250 && !target.dead) {
            this.solaForceTickTimer -= 250;
            const drainsHorse = target.heroName === 'Duke' && target.isMounted;
            const healthBefore = drainsHorse ? target.horseHp : target.hp;
            target.takeDamage(5, this, true, true);
            const healthAfter = drainsHorse ? target.horseHp : target.hp;
            const stolen = Math.max(0, healthBefore - healthAfter);
            this.hp = Math.min(this.maxHp, this.hp + stolen);
            for (let i = 0; i < 4; i++) {
                game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, '#ffffff', (Math.random()-0.5)*5, (Math.random()-0.5)*5, 220, 3));
            }
        }

        if (this.solaForceElapsed >= this.solaForceMaxDuration || target.dead) {
            this.endSolaForce();
            return false;
        }
        return true;
    }

    clearItanSuperDebuffs() {
        if (this.heroName !== 'Itan' || this.itanSuperWindupTimer <= 0) return;
        this.stunTimer = 0;
        for (const name of ['poison', 'dizzy', 'slow', 'gravitySlow', 'burn', 'bleed']) this.buffs[name] = 0;
        this.buffs.hurricaneSlow = false;
        this.buffs.bleedTick = 0;
        this.burnTick = 0;
    }

    startSolaCharge() {
        if (this.heroName !== 'Sola' || this.dead || this.attackState !== 'idle' || this.solaDashCooldown > 0 || this.solaChargeTimer > 0) return false;

        if (keys[this.controls.left] && !keys[this.controls.right]) this.facing = -1;
        else if (keys[this.controls.right] && !keys[this.controls.left]) this.facing = 1;

        this.solaChargeDirection = this.facing;
        this.solaChargeTimer = this.solaChargeDuration;
        this.solaChargeElapsed = 0;
        this.solaChargeHitTargets.clear();
        this.solaDashCooldown = 6000;
        this.vx = this.solaChargeDirection * 18;
        this.vy = Math.max(this.vy, -1);
        for (let i = 0; i < 18; i++) {
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, i % 2 ? '#ffffff' : '#8ffcff', (Math.random()-0.5)*10, (Math.random()-0.5)*10, 300, 3));
        }
        return true;
    }

    getSolaChargeHitbox() {
        const range = 92;
        return {
            x: this.solaChargeDirection === 1 ? this.x + this.w - 8 : this.x - range + 8,
            y: this.y - 12,
            w: range,
            h: this.h + 24
        };
    }

    updateSolaCharge(dt) {
        if (this.heroName !== 'Sola' || this.solaChargeTimer <= 0) return false;

        this.solaChargeTimer = Math.max(0, this.solaChargeTimer - dt);
        this.solaChargeElapsed += dt;
        this.facing = this.solaChargeDirection;
        this.vx = this.solaChargeDirection * 18;

        const hitbox = this.getSolaChargeHitbox();
        const targets = Array.from(new Set([
            ...game.getOpponentsOf(this),
            ...game.minions.filter(minion => minion && minion.owner !== this && !minion.dead && !minion.untargetable)
        ]));
        for (const target of targets) {
            if (!target || target.dead || target.untargetable || this.solaChargeHitTargets.has(target) || !checkAABB(hitbox, target)) continue;
            target.takeDamage(28, this);
            this.solaChargeHitTargets.add(target);
            for (let i = 0; i < 10; i++) {
                game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, '#8ffcff', (Math.random()-0.5)*14, (Math.random()-0.5)*14, 260, 4));
            }
        }

        if (Math.random() < 0.65) {
            game.particles.push(new Particle(this.x + this.w/2 - this.solaChargeDirection * 12, this.y + 20 + Math.random()*this.h*0.6, '#8ffcff', -this.solaChargeDirection * 4, (Math.random()-0.5)*3, 220, 3));
        }

        if (this.solaChargeTimer <= 0) this.vx *= 0.35;
        return this.solaChargeTimer > 0;
    }

    applySolaForceFallDamage() {
        if (!this.solaForceFallPending || this.solaForceHeld || !this.isGrounded) return false;

        const fallDistance = Math.max(0, this.y - (this.solaForceFallPeakY ?? this.y));
        const source = typeof game.getFighters === 'function'
            ? game.getFighters().find(fighter => fighter && fighter.id === this.solaForceFallSourceId) || null
            : null;

        this.solaForceFallPending = false;
        this.solaForceFallSourceId = null;
        this.solaForceFallPeakY = this.y;

        if (fallDistance < 24) return false;
        const damage = Math.min(60, Math.max(10, Math.round(fallDistance * 0.35)));
        this.takeDamage(damage, source, false, true);
        for (let i = 0; i < 16; i++) {
            game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + this.h, i % 2 ? '#ffffff' : '#bdefff', (Math.random()-0.5)*10, -Math.random()*8, 360, 4));
        }
        return true;
    }

    update(dt) {
        const vossCopyWasActive = this.vossCopyActive === true;
        if (this.dead) return;

        if (this.heroName === 'Laegon') {
            this.laegonEnergy = Math.min(this.laegonMaxEnergy, this.laegonEnergy + dt / 30);
            if (this.laegonSwitchCooldown > 0) this.laegonSwitchCooldown = Math.max(0, this.laegonSwitchCooldown - dt);
            if (this.thunderGodTimer > 0) this.thunderGodTimer = Math.max(0, this.thunderGodTimer - dt);
            if (this.thunderChargeTimer > 0) {
                this.thunderChargeTimer = Math.max(0, this.thunderChargeTimer - dt);
                if (this.thunderChargeTimer <= 0) {
                    this.thunderCharges = Math.max(0, this.thunderCharges - 1);
                    if (this.thunderCharges > 0) this.thunderChargeTimer = 400;
                }
            }
        }
        if (this.heroName === 'Veyra') this.updateVeyraTime(dt);
        if (this.heroName === 'Brom' && this.bromStickyBomb?.dead) this.bromStickyBomb = null;
        if (this.heroName === 'Axeron') {
            this.axeronMarks.forEach(mark => mark.life -= dt);
            this.axeronMarks = this.axeronMarks.filter(mark => mark.life > 0 && mark.target && !mark.target.dead);
            if (this.axeronRushTimer > 0) this.updateAxeronRush(dt);
        }
        if (this.heroName === 'Ukon') {
            if (this.ukonDashCooldown > 0) this.ukonDashCooldown = Math.max(0, this.ukonDashCooldown - dt);
            if (this.ukonShadowCooldown > 0) this.ukonShadowCooldown = Math.max(0, this.ukonShadowCooldown - dt);
            this.updateUkonBurst(dt);
            this.updateUkonUltimate(dt);
            const ukonCanDash = this.stunTimer <= 0 && this.buffs.dizzy <= 0 && this.attackState === 'idle'
                && !this.ukonUltimatePhase && this.ukonDashTimer <= 0 && this.ukonChargeTimer <= 0 && this.ukonDashCooldown <= 0;
            if (ukonCanDash) {
                const cpuHeld = action => this.isCPU && keys[this.controls[action]];
                if (keysPressed[this.controls.down] || cpuHeld('down')) this.startUkonDirectionalDash(0, 1);
                else if (keysPressed[this.controls.left] || cpuHeld('left')) this.startUkonDirectionalDash(-1, 0);
                else if (keysPressed[this.controls.right] || cpuHeld('right')) this.startUkonDirectionalDash(1, 0);
            }
        }
        if (this.heroName === 'Mori') {
            this.moriGrappleCooldown = Math.max(0, this.moriGrappleCooldown - dt);
            this.moriFanComboTimer = Math.max(0, this.moriFanComboTimer - dt);
            if (this.moriFanComboTimer <= 0) this.moriFanCombo = 0;
            this.updateMoriGrapple(dt);
        }
        if (this.vossCopyActive) {
            this.vossCopyTimer = Math.max(0, this.vossCopyTimer - dt);
            this.resetVossCopiedCooldowns();
            if (this.vossCopyTimer <= 0) this.endVossCopy();
        }
        if (this.heroName === 'Roka') {
            this.rokaMortarCooldown = Math.max(0, this.rokaMortarCooldown - dt);
            this.rokaArtilleryTimer = Math.max(0, this.rokaArtilleryTimer - dt);
            const targetAngle = this.getRokaWeaponAimAngle();
            let angleDelta = targetAngle - this.rokaWeaponAngle;
            while(angleDelta > Math.PI) angleDelta -= Math.PI*2;
            while(angleDelta < -Math.PI) angleDelta += Math.PI*2;
            this.rokaWeaponAngle += angleDelta * Math.min(1, dt/90);
        }
        if (this.heroName === 'Voss' && !vossCopyWasActive) {
            this.vossCopyCooldown = Math.max(0, this.vossCopyCooldown - dt);
            if (this.vossDouble?.dead) this.vossDouble = null;
        }
        if (this.heroName === 'Raigo') {
            this.raigoArmorTimer = Math.max(0, this.raigoArmorTimer - dt);
            if (this.raigoChargeTimer > 0) this.updateRaigoCharge(dt);
            if (this.raigoArmorTimer > 0 && Math.random() < 0.45) {
                game.particles.push(new Particle(this.x+Math.random()*this.w,this.y+Math.random()*this.h,'#ffd84d',(Math.random()-.5)*5,-2-Math.random()*4,260,3));
            }
        }

        if (this.heroName === 'Archor') {
            if (this.archorSpeedCooldown > 0) this.archorSpeedCooldown = Math.max(0, this.archorSpeedCooldown - dt);
            if (keysPressed[this.controls.switch] && this.archorSpeedCooldown <= 0) this.cleanseHoinDebuffs();
        }
        if (this.heroName === 'D2F1' && this.d2fDroneCooldown > 0) this.d2fDroneCooldown = Math.max(0, this.d2fDroneCooldown - dt);

        if (this.heroName === 'Sola' && this.solaForceActive) this.updateSolaForce(dt);
        if (this.heroName === 'Sola' && this.solaChargeTimer > 0) this.updateSolaCharge(dt);

        if (this.heroName === 'Itan' && this.itanSuperWindupTimer > 0) {
            this.clearItanSuperDebuffs();
            this.itanSuperWindupTimer = Math.max(0, this.itanSuperWindupTimer - dt);
            this.vx *= 0.25;
            if (this.itanSuperWindupTimer <= 0) this.releaseItanChiq();
        }

        if (this.lastAttackerTimer > 0) {
            this.lastAttackerTimer -= dt;
            if (this.lastAttackerTimer <= 0) this.lastAttacker = null;
        }

        if (this.heroName === 'Wolf') {
            this.wolfAttackTimer += dt;
        }

        if (this.grappledBy) {
            this.x = this.grappledBy.x + this.grappledBy.facing * 40;
            this.y = this.grappledBy.y;
            this.vx = 0;
            this.vy = 0;
            return;
        }

        if (this.solaForceFallPending && !this.solaForceHeld) {
            this.solaForceFallPeakY = Math.min(this.solaForceFallPeakY ?? this.y, this.y);
        }

        if (this.waterStunImmunity > 0) this.waterStunImmunity -= dt;
        if (this.kilaSwitchCD > 0) this.kilaSwitchCD -= dt;
        if (this.heroName === 'Sola' && this.solaDashCooldown > 0) this.solaDashCooldown -= dt;
        if (this.heroName === 'Nyra' && this.nyraShiftCooldown > 0) this.nyraShiftCooldown -= dt;
        if (this.heroName === 'Orion' && this.orionPulseCooldown > 0) this.orionPulseCooldown -= dt;
        if (this.heroName === 'Archor') {
            if (this.archorPassiveTimer > 0) {
                this.archorPassiveTimer = Math.max(0, this.archorPassiveTimer - dt);
                if (this.archorPassiveTimer <= 0) {
                    this.archorDamageBonus = 0;
                    this.archorHitChain = 0;
                    this.archorHitChainTimer = 0;
                }
            } else if (this.archorHitChainTimer > 0) {
                this.archorHitChainTimer = Math.max(0, this.archorHitChainTimer - dt);
                if (this.archorHitChainTimer <= 0) this.archorHitChain = 0;
            }
        }
        if (this.heroName === 'Itan' && this.buffs.nuMode > 0) this.buffs.nuMode = Math.max(0, this.buffs.nuMode - dt);

        if (this.heroName === 'Kuro') {
            if (this.kuroDecoyCooldown > 0) this.kuroDecoyCooldown -= dt;
            if (this.kuroRelocateTimer > 0) this.kuroRelocateTimer -= dt;
            if (this.kuroScopeGlintTimer > 0) this.kuroScopeGlintTimer -= dt;
            if (this.kuroEmpoweredTimer > 0) {
                this.kuroEmpoweredTimer -= dt;
                if (this.kuroEmpoweredTimer <= 0) this.kuroEmpoweredShot = false;
            }
            if (this.kuroAbsoluteCloakTimer > 0) {
                this.kuroAbsoluteCloakTimer = Math.max(0, this.kuroAbsoluteCloakTimer - dt);
                this.kuroCloaked = this.kuroAbsoluteCloakTimer > 0;
                this.kuroCloakTimer = 0;
                this.kuroRevealTimer = 0;
            } else if (this.kuroRevealTimer > 0) {
                this.kuroRevealTimer -= dt;
                this.kuroCloaked = false;
            } else {
                this.kuroCloakTimer += dt;
                if (this.kuroCloakTimer >= 1250) this.kuroCloaked = true;
            }
        }

        if (this.invincible > 0) this.invincible -= dt;
        if (this.flipCooldown > 0) this.flipCooldown -= dt;
        if (this.williDashCooldown > 0) this.williDashCooldown -= dt;
        if (this.williHealBuffTimer > 0) {
            this.williHealBuffTimer -= dt;
            if (Math.random() < 0.2) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#FF0000", 0, -2, 300, 3));
        }
        if (this.buffs.msBoost > 0) this.buffs.msBoost -= dt;

        if (this.flipActive > 0) {
            this.flipActive -= dt;
            if (this.heroName === 'Kadaxi') {
                let enemy = game.getEnemyOf(this);
                if (enemy && !this.hasHitFlip && checkAABB(this, enemy)) {
                    enemy.takeDamage(63, this);
                    this.hasHitFlip = true;
                }
            }
        }

        let isKilaSwitching = this.heroName === 'Kila' && this.kilaSwitchTimer > 0;
        let hasPuppet = this.heroName === 'Ugo' && game.minions.some(m => m.type === 'puppet' && m.owner === this && !m.dead);
        const isSolaForceLocked = !!(this.solaForceActive || this.solaForceHeld);
        const isSolaCharging = this.heroName === 'Sola' && this.solaChargeTimer > 0;
        const isUkonBursting = this.heroName === 'Ukon' && (this.ukonDashTimer > 0 || this.ukonChargeTimer > 0);
        const isUkonUltimateLocked = this.heroName === 'Ukon' && !!this.ukonUltimatePhase;
        const isMoriGrappling = this.heroName === 'Mori' && this.moriGrappleTimer > 0;
        const isRaigoCharging = this.heroName === 'Raigo' && this.raigoChargeTimer > 0;
        let canAct = (this.stunTimer <= 0 && this.buffs.dizzy <= 0 && this.grapplePhase !== 1 && this.superWindupTimer <= 0 && this.euclidSwitchTimer <= 0 && !(this.itanSuperWindupTimer > 0) && !(this.veyraReversalTimer > 0) && !(this.axeronRushTimer > 0) && !isKilaSwitching && !isSolaForceLocked && !isSolaCharging && !isUkonBursting && !isUkonUltimateLocked && !isMoriGrappling && !isRaigoCharging);
        let canMoveAndAttack = canAct && !hasPuppet;

        if (this.heroName === 'Gensan') {
            if (this.gensanSwitchCD > 0) this.gensanSwitchCD -= dt;
            if (this.gensanShadowCD > 0) this.gensanShadowCD -= dt;

            if (canAct && keysPressed[this.controls.extra] && this.gensanShadowCD <= 0) {
                this.gensanShadowCD = 3000;
                let shadow = new SwordShadow(this, this.x, this.y);
                this.gensanShadows.push(shadow);
                game.minions.push(shadow);
                if (this.gensanShadows.length > 2) {
                    let oldShadow = this.gensanShadows.shift();
                    if(oldShadow) oldShadow.dead = true;
                }
                for(let i=0; i<15; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#fff", (Math.random()-0.5)*5, (Math.random()-0.5)*5, 400));
            }

            this.gensanShadows = this.gensanShadows.filter(s => s && !s.dead);
        }

        if (this.heroName === 'Volt') {
            if (this.overdriveTimer > 0) {
                this.overdriveTimer -= dt;
                this.energy = this.maxEnergy;
                this.isOverloaded = false;
                if (this.overdriveTimer <= 0) {
                    this.energy = 50;
                    this.isOverloaded = true;
                }
            } else {
                if (this.isOverloaded) {
                    this.energy += 25 * (dt / 1000);
                    if (this.energy >= 100) {
                        this.isOverloaded = false;
                    }
                } else {
                    if (this.isGrounded) {
                        this.energy += 15 * (dt / 1000);
                    } else {
                        this.energy -= 15 * (dt / 1000);
                    }
                }
                this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy));

                if (this.energy <= 0 && !this.isOverloaded && this.overdriveTimer <= 0) {
                    this.energy = 0;
                    this.isOverloaded = true;
                    this.takeDamage(30, null, true, true);
                    game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#ff0000", 0, 0, 500, 15));
                }
            }
        }

        if (this.heroName === 'Kadaxi') {
            if (this.comboTimer > 0) {
                this.comboTimer -= dt;
                if (this.comboTimer <= 0) this.comboCount = 0;
            }
            if (this.grapplePhase === 1) {
                this.grappleTimer -= dt;
                if (Math.random() < 0.3) game.particles.push(new Particle(this.x + this.facing*50 + Math.random()*20, this.y + Math.random()*this.h, "#1E90FF", -this.facing*5, 0, 200));
                if (this.grappleTimer <= 0) this.breakGrapple();
            }
        }

        if (this.heroName === 'Euclid') {
            if (this.euclidSwitchTimer > 0) {
                this.euclidSwitchTimer -= dt;
            }
        }

        if (this.heroName === 'Kae') {
            if (this.kaeAggroTimer > 0) this.kaeAggroTimer -= dt;
        }

        let activePuppet = null;
        if (this.heroName === 'Ugo') {
            activePuppet = game.minions.find(m => m.type === 'puppet' && m.owner === this && !m.dead);
        }

        if (this.buffs.bloodFrenzy > 0) {
            this.buffs.bloodFrenzy -= dt;
            if (Math.random() < 0.3) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#B22222", 0, -3, 300, 4));

            if (this.buffs.bloodFrenzy <= 0) {
                let px = this.facing === 1 ? this.x + this.w : this.x - 10;
                let py = this.y + 25;
                game.projectiles.push(new Projectile(px, py, 25, 25, this.facing * 20, 0, 103, this, "#B22222", "thrown_axe"));
            }
        }

        let currentSpeed = this.baseSpeed;
        let currentJump = this.baseJump;

        if (this.heroName === 'Kuro' && this.attackState === 'charging') currentSpeed *= 0.55;

        if (this.buffs.msBoost > 0) currentSpeed *= (this.heroName === 'Wolf' ? 1.3 : 1.2);
        if (this.heroName === 'Itan' && this.buffs.nuMode > 0) currentSpeed *= 1.35;

        if (this.buffs.dizzy > 0) {
            this.buffs.dizzy -= dt;
            if (this.attackState !== 'idle') this.attackState = 'idle';
            if (this.heroName === 'Volt') this.flightDisabled = true;
        }
        let slowMultiplier = 1;
        if (this.buffs.slow > 0) {
            this.buffs.slow -= dt;
            slowMultiplier = Math.min(slowMultiplier, 0.5);
            if(Math.random()<0.1) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#add8e6", (Math.random()-0.5)*2, -2, 300));
        }
        if (this.buffs.gravitySlow > 0) {
            this.buffs.gravitySlow -= dt;
            slowMultiplier = Math.min(slowMultiplier, 0.3);
            if(Math.random()<0.16) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#6f78ad", (Math.random()-0.5)*2, (Math.random()-0.5)*2, 260));
        }
        currentSpeed *= slowMultiplier;
        if (this.buffs.burn > 0) {
            this.buffs.burn -= dt;
            this.burnTick += dt;
            if (this.burnTick >= 1000) {
                this.takeDamage(5, null, true);
                this.burnTick = 0;
            }
            if(Math.random()<0.1) game.particles.push(new Particle(this.x+this.w/2, this.y, "#ff4500", 0, -2, 300));
        }
        if (this.buffs.poison > 0) {
            this.buffs.poison -= dt;
            if (!(this.heroName === 'Duke' && this.isMounted && this.runTimer > 0 && this.runTimer <= 3000)) currentSpeed *= 0.6;
            if (Math.floor(this.buffs.poison/1000) !== Math.floor((this.buffs.poison+dt)/1000)) this.takeDamage(2, null, true);
            if(Math.random()<0.1) game.particles.push(new Particle(this.x+this.w/2, this.y, "#00ff00", 0, -2, 300));
        }
        if (this.buffs.bleed > 0) {
            this.buffs.bleed -= dt;
            this.buffs.bleedTick += dt;
            if (this.buffs.bleedTick >= 1000) {
                this.takeDamage(5, null, true);
                this.buffs.bleedTick = 0;
                game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#8B0000", (Math.random()-0.5)*5, (Math.random()-0.5)*5, 300, 4));
            }
        }
        if (this.buffs.battleCry > 0) {
            this.buffs.battleCry -= dt;
            currentJump *= 1.2;
            currentSpeed *= 1.4;
            if(Math.random()<0.1) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#ff4500", 0, -3, 300));
        }
        if (this.buffs.shade > 0) this.buffs.shade -= dt;

        if (this.buffs.bloodFrenzy > 0) {
            currentSpeed *= 0.9;
        }

        if (this.heroName === 'Kae' && this.kaeAwakened) {
            currentSpeed *= 2.0;
            if (Math.random() < 0.3) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#000000", 0, -2, 300, 4));
        }

        if (this.heroName === 'Kila' && this.kilaSwitchTimer > 0) {
            this.kilaSwitchTimer -= dt;
            this.invincible = Math.max(this.invincible, 100);
            currentSpeed *= 0.5;
            if (this.kilaSwitchTimer <= 0) {
                if (this.kilaElement === 'fire') this.kilaElement = 'water';
                else if (this.kilaElement === 'water') this.kilaElement = 'earth';
                else this.kilaElement = 'fire';
                this.kilaSwitchCD = 8000;
            }
        }

        this.buffs.hurricaneSlow = false;
        if (game.hurricane && !game.hurricane.dead && game.hurricane.owner !== this) {
            if (checkAABB(this, game.hurricane)) {
                if (!(this.heroName === 'Duke' && this.isMounted && this.runTimer > 0 && this.runTimer <= 3000)) {
                    this.buffs.hurricaneSlow = true; currentSpeed *= 0.4;
                }
            }
        }

        if (this.superCooldown > 0 && !vossCopyWasActive) this.superCooldown -= dt;
        if (this.stunTimer > 0) this.stunTimer -= dt;
        if (this.hunterMusketCD > 0) this.hunterMusketCD -= dt;

        if (this.hasonSuperWindow > 0) { this.hasonSuperWindow -= dt; if (this.hasonSuperWindow <= 0) this.hasonSuperCharges = 0; }
        if (this.williSuperWindow > 0) { this.williSuperWindow -= dt; if (this.williSuperWindow <= 0) this.williSuperCharges = 0; }

        let applyGravity = true;

        if (isSolaForceLocked || (this.heroName === 'Axeron' && this.axeronRushTimer > 0) || isUkonBursting || isUkonUltimateLocked || isMoriGrappling || isRaigoCharging) {
            applyGravity = false;
            if (isSolaForceLocked) { this.vx = 0; this.vy = 0; }
            this.jumpBuffer = 0;
        } else if (this.heroName === 'Volt' && !this.isOverloaded && (this.overdriveTimer > 0 || this.energy > 0) && canAct && !this.flightDisabled) {
            if (!this.isGrounded || keys[this.controls.jump]) {
                applyGravity = false;
                this.vy *= 0.85;
                if (keys[this.controls.jump]) this.vy -= 1.2;
                if (keys[this.controls.down]) this.vy += 1.2;
                if (!this.isGrounded && Math.random() < 0.3) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#00FFFF", (Math.random()-0.5)*2, Math.random()*2, 200, 3));
            }
        } else {
            if (keysPressed[this.controls.jump]) {
                if (hasPuppet && canAct) {
                    activePuppet.doJump();
                } else {
                    this.jumpBuffer = 150;
                    if (!this.isGrounded && !this.hasFlipped && (canMoveAndAttack && this.flipCooldown <= 0)) {
                        let now = performance.now();
                        if (now - this.lastJumpTime <= 500) {
                            this.flipActive = 400;
                            this.hasHitFlip = false;
                            this.hasFlipped = true;
                            this.vy = -10;
                            this.flipCooldown = 3000;
                            this.jumpBuffer = 0;
                        }
                    }
                }
            } else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
        }

        if (this.isGrounded) {
            this.coyoteTime = 100;
            this.jumpsLeft = this.maxJumps;
            this.hasFlipped = false;
            this.flightDisabled = false;
        }
        else { this.coyoteTime -= dt; }

        this.timeSinceLastDamage += dt;

        if (this.heroName === 'Hason') {
            if (this.hasonAmmo <= 0) {
                this.hasonReloadTimer += dt;
                if (this.hasonReloadTimer >= 2000) {
                    this.hasonAmmo = 6;
                    this.hasonReloadTimer = 0;
                }
            } else if (this.hasonAmmo < 6 && this.timeSinceLastDamage >= 5000) {
                this.hasonAmmo = 6;
            }
        }

        if (this.superWindupTimer > 0) {
            this.superWindupTimer -= dt;

            if (this.heroName === 'Euclid') {
                if (Math.random() < 0.2) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, "#8A2BE2", (Math.random()-0.5)*5, -Math.random()*5, 400));
                if (this.superWindupTimer <= 0) {
                    this.superCooldown = this.superCooldownMax;
                    let currentSkeletons = game.minions.filter(m => m.type === 'skeleton' && m.owner === this);
                    currentSkeletons.forEach(s => s.dead = true);
                    for (let i = 0; i < 5; i++) {
                        let randomX = 50 + Math.random() * (CANVAS_W - 100);
                        game.minions.push(new Skeleton(this, randomX, GROUND_Y - 60));
                        for(let j=0; j<10; j++) game.particles.push(new Particle(randomX + 17, GROUND_Y - 30, "#8A2BE2", (Math.random()-0.5)*8, (Math.random()-0.5)*8, 400));
                    }
                    game.createExplosion(this.x + this.w/2, this.y + this.h/2, 100, 0, this);
                }
            } else if (this.heroName === 'Kae') {
                if (Math.random() < 0.5) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#00FFFF", (Math.random()-0.5)*2, -Math.random()*5, 200, 3));
                if (this.superWindupTimer <= 0) {
                    let enemy = game.getEnemyOf(this);

                    if (enemy && enemy.invincible <= 0 && !enemy.dead) {
                        this.superCooldown = this.superCooldownMax;
                        let behindX = enemy.facing === 1 ? enemy.x - this.w - 10 : enemy.x + enemy.w + 10;
                        let targetY = enemy.y;
                        let closestPlatY = GROUND_Y;

                        for (let plat of PLATFORMS) {
                            if (behindX + this.w > plat.x && behindX < plat.x + plat.w) {
                                if (plat.y >= enemy.y && plat.y < closestPlatY) {
                                    closestPlatY = plat.y;
                                }
                            }
                        }
                        targetY = closestPlatY - this.h;

                        this.x = behindX;
                        this.y = targetY;
                        this.facing = enemy.facing;

                        if (this.x < 0) this.x = 0;
                        if (this.x > CANVAS_W - this.w) this.x = CANVAS_W - this.w;

                        if(enemy.buffs) enemy.buffs.dizzy = 1000;
                        this.attackState = 'idle';
                        this.vy = 0;

                        for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#00FFFF", (Math.random()-0.5)*20, (Math.random()-0.5)*20, 400, 5));
                        for(let i=0; i<20; i++) game.particles.push(new Particle(enemy.x+enemy.w/2, enemy.y+enemy.h/2, "#FFFF00", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 300, 4));

                        this.kaeAggroTimer = 1500;
                    } else {
                        this.superCooldown = 3000;
                    }
                }
            } else if (this.heroName === 'Wolf') {
                if (Math.random() < 0.5) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + this.h, "#ccc", (Math.random()-0.5)*2, -Math.random()*5, 200, 3));
                if (this.superWindupTimer <= 0) {
                    this.superCooldown = this.superCooldownMax;
                    let enemy = game.getEnemyOf(this);

                    if (enemy && enemy.invincible <= 0 && !enemy.dead) {
                        let frontX = enemy.facing === 1 ? enemy.x + enemy.w + 10 : enemy.x - this.w - 10;

                        this.x = frontX;
                        this.y = enemy.y - 20;
                        this.facing = enemy.facing === 1 ? -1 : 1;

                        if (this.x < 0) this.x = 0;
                        if (this.x > CANVAS_W - this.w) this.x = CANVAS_W - this.w;

                        enemy.takeDamage(150, this);
                        if (enemy.buffs) enemy.buffs.slow = 2500;

                        for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#8B0000", (Math.random()-0.5)*20, (Math.random()-0.5)*20, 400, 6));

                        for(let i=-20; i<=20; i+=2) {
                            game.particles.push(new Particle(this.x+this.w/2 + i*2, this.y+this.h/2 + i*2, "#8B0000", 0, 0, 400, 6));
                            game.particles.push(new Particle(this.x+this.w/2 - i*2, this.y+this.h/2 + i*2, "#8B0000", 0, 0, 400, 6));
                        }
                    } else {
                        this.superCooldown = 3000;
                    }
                }
            }
        }

        let targetVx = 0;
        if (isSolaCharging) {
            targetVx = this.solaChargeDirection * 18;
        } else if (isRaigoCharging) {
            targetVx = this.vx;
        } else if (isMoriGrappling) {
            targetVx = this.vx;
        } else if (isUkonBursting || (this.heroName === 'Ukon' && this.ukonUltimatePhase === 'drop')) {
            targetVx = this.vx;
        } else if (this.heroName === 'Ukon') {
            targetVx = 0;
        } else if (this.heroName === 'Willi' && this.invincible > 0) {
            targetVx = this.facing * 40;
        } else if (canMoveAndAttack && this.flipActive <= 0) {
            if (keys[this.controls.left]) { targetVx = -currentSpeed; this.facing = -1; }
            else if (keys[this.controls.right]) { targetVx = currentSpeed; this.facing = 1; }

            if (this.attackState === 'windup' && (this.heroName === 'Euclid' || this.heroName === 'Kae' || this.heroName === 'Ugo' || this.heroName === 'Volt' || this.heroName === 'Gensan' || this.heroName === 'Wolf')) targetVx = 0;

            if (this.heroName === 'Duke' && this.isMounted) {
                if ((keys[this.controls.left] || keys[this.controls.right]) && this.attackState === 'idle') this.runTimer += dt;
                else this.runTimer = 0;
            }
        } else {
            if (this.heroName === 'Duke') this.runTimer = 0;
        }

        if (hasPuppet && canAct) {
            if (keys[this.controls.left]) { activePuppet.targetVx = -activePuppet.speed; activePuppet.facing = -1; }
            else if (keys[this.controls.right]) { activePuppet.targetVx = activePuppet.speed; activePuppet.facing = 1; }
            else { activePuppet.targetVx = 0; }
        } else if (activePuppet) {
            activePuppet.targetVx = 0;
        }

        let friction = 0.25;
        if (this.currentPlatform && this.currentPlatform.type === 'center') friction = 0.03;
        if (!canAct || ((this.heroName === 'Euclid' || this.heroName === 'Kae' || this.heroName === 'Ugo' || this.heroName === 'Volt' || this.heroName === 'Gensan' || this.heroName === 'Wolf') && this.attackState === 'windup') || hasPuppet) friction = 0.1;
        if (isSolaCharging) friction = 1;
        if (isRaigoCharging) friction = 1;
        if (isMoriGrappling) friction = 1;
        if (isUkonBursting || (this.heroName === 'Ukon' && this.ukonUltimatePhase === 'drop')) friction = 1;

        this.vx += (targetVx - this.vx) * friction;

        if (canAct && this.flipActive <= 0) {
            if (this.attackState === 'charging') {
                if (this.heroName !== 'Kuro') {
                    this.attackState = 'idle';
                } else {
                    this.kuroCharge = Math.min(this.kuroChargeMax, this.kuroCharge + dt);
                    this.stateTimer = this.kuroCharge;
                    this.maxStateTimer = this.kuroChargeMax;
                    if (this.kuroEmpoweredShot) this.kuroScopeGlintTimer = Math.max(this.kuroScopeGlintTimer, 100);
                    if (!keys[this.controls.attack] || this.kuroCharge >= this.kuroChargeMax) this.fireKuroLongshot();
                }
            } else if (this.attackState === 'windup') {
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    if (this.ugoSummoning) {
                        this.ugoSummoning = false;
                        let pX = this.facing === 1 ? this.x + this.w + 40 : this.x - 40 - 35;
                        pX = Math.max(0, Math.min(CANVAS_W - 35, pX));
                        game.minions.push(new Puppet(this, pX, this.y));

                        this.attackState = 'recovery';
                        this.stateTimer = 200;
                        this.maxStateTimer = 200;
                        for(let i=0; i<15; i++) game.particles.push(new Particle(pX+17, this.y+35, "#fff", (Math.random()-0.5)*5, -Math.random()*10, 400, 3));
                    } else {
                        let activeTime = 150;
                        if (this.heroName === 'Lique') activeTime = this.buffs.bloodFrenzy > 0 ? 50 : 100;
                        if (this.heroName === 'Willi') activeTime = Math.round(150 / Math.max(0.5, Math.min(3, this.aiAttackTempo || 1)));
                        if (this.heroName === 'Kae') activeTime = 100;
                        if (this.heroName === 'Ugo') activeTime = 100;
                        if (this.heroName === 'Kila') activeTime = 150;
                        if (this.heroName === 'Volt') activeTime = this.overdriveTimer > 0 ? 25 : 50;
                        if (this.heroName === 'Gensan') activeTime = 150;
                        if (this.heroName === 'Wolf') activeTime = 100;
                        if (this.heroName === 'Sola') activeTime = 100;
                        if (this.heroName === 'Nyra') activeTime = 70;
                        if (this.heroName === 'Orion') activeTime = 170;
                        if (this.heroName === 'Archor') activeTime = 25;
                        if (this.heroName === 'Itan') activeTime = this.buffs.nuMode > 0 ? 110 : 220;
                        if (this.heroName === 'Laegon') activeTime = this.thunderGodTimer > 0 ? 170 : 45;
                        if (this.heroName === 'Veyra') activeTime = 90;
                        if (this.heroName === 'Brom') activeTime = 130;
                        if (this.heroName === 'Axeron') activeTime = 120;

                        this.attackState = 'active';
                        this.stateTimer = activeTime;
                        this.maxStateTimer = activeTime;
                        this.executeActiveAttack();
                    }
                }
            } else if (this.attackState === 'active') {
                this.stateTimer -= dt;

                if (!this.hasHit && this.isMeleeAttack()) {
                    let hitBox = this.getMeleeHitbox();
                    let targetsHit = [];
                    for (const enemy of game.getOpponentsOf(this)) {
                        if (!enemy.untargetable && checkAABB(hitBox, enemy)) {
                            const hpBefore = Number.isFinite(enemy.hp) ? enemy.hp : null;
                            enemy.takeDamage(this.getMeleeDamage(), this);
                            if (this.heroName === 'Raigo') this.onRaigoBasicHit(enemy, hpBefore === null ? this.getMeleeDamage() : Math.max(0, hpBefore - Math.max(0, enemy.hp)));
                            targetsHit.push(enemy);
                        }
                    }
                    for (let m of game.minions) {
                        if (m && !m.isBoss && m.owner !== this && !m.dead && !m.untargetable && checkAABB(hitBox, m)) {
                            const hpBefore = Number.isFinite(m.hp) ? m.hp : null;
                            m.takeDamage(this.getMeleeDamage(), this);
                            if (this.heroName === 'Raigo') this.onRaigoBasicHit(m, hpBefore === null ? this.getMeleeDamage() : Math.max(0, hpBefore - Math.max(0, m.hp)));
                            targetsHit.push(m);
                        }
                    }

                    if (targetsHit.length > 0) {
                        this.hasHit = true;

                        targetsHit.forEach(t => {
                            if (this.heroName === 'Macu' && this.buffs.battleCry > 0 && t.buffs) t.buffs.poison = 3000;
                            if (this.heroName === 'Duke' && this.isMounted && t.buffs) t.buffs.dizzy = 3000;

                            if (this.heroName === 'Lique' && this.buffs.bloodFrenzy > 0 && t.heroName) {
                                this.hp = Math.min(this.maxHp, this.hp + 5);
                                for(let i=0; i<5; i++) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#ff0000", 0, -2, 300, 3));
                            }

                            if (this.heroName === 'Wolf') {
                                if (this.wolfPassiveReady) {
                                    t.takeDamage(10, this);
                                }
                                for(let i=0; i<8; i++) game.particles.push(new Particle(t.x+t.w/2, t.y+t.h/2, "#fff", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 300, 4));
                            }
                        });

                        if (this.heroName === 'Wolf') {
                            if (this.wolfPassiveReady) {
                                this.buffs.msBoost = 2000;
                                this.wolfPassiveReady = false;
                            }
                            this.wolfComboCount += targetsHit.length;
                            if (this.wolfComboCount >= 5) {
                                targetsHit.forEach(t => {
                                    if (t.buffs) t.buffs.bleed = 4000;
                                });
                                this.wolfComboCount = 0;
                                for(let i=0; i<15; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#8B0000", (Math.random()-0.5)*20, (Math.random()-0.5)*20, 500, 5));
                            }
                        }

                        if (this.heroName === 'Sola' && this.solaFocus > 0) this.solaFocus--;
                        if (this.heroName === 'Orion') this.orionCharges = Math.min(3, this.orionCharges + 1);
                        if (this.heroName === 'Laegon') targetsHit.forEach(target => this.onLaegonHit(target, this.getMeleeDamage(), true));
                        if (this.heroName === 'Axeron') {
                            this.axeronCombo++;
                            if (this.axeronCombo >= 3) {
                                this.axeronCombo = 0;
                                targetsHit.forEach(target => this.addAxeronMark(target));
                            }
                        }

                        if (this.heroName === 'Kae') {
                            this.kaeComboCount++;
                            if (this.kaeComboCount >= 4) {
                                this.kaeComboCount = 0;
                                targetsHit.forEach(t => {
                                    let extraDmg = this.kaeAwakened ? 14 : 10;
                                    t.takeDamage(extraDmg, this);
                                    if (t.buffs) t.buffs.dizzy = 1000;
                                    for(let i=0; i<10; i++) game.particles.push(new Particle(t.x + t.w/2, t.y + t.h/2, "#00FFFF", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 300, 5));
                                });
                            } else {
                                targetsHit.forEach(t => {
                                    for(let i=0; i<5; i++) game.particles.push(new Particle(t.x + t.w/2, t.y + t.h/2, "#FFFF00", (Math.random()-0.5)*5, (Math.random()-0.5)*5, 200, 3));
                                });
                            }
                        }

                        if (this.heroName === 'Gensan') {
                            this.gensanCombo++;
                            if (this.gensanCombo >= 4) {
                                this.gensanCombo = 0;
                                targetsHit.forEach(t => {
                                    t.takeDamage(13, this);
                                    if (t.buffs) t.buffs.slow = 1200;
                                });
                            }
                        }

                        if (this.heroName === 'Duke' && !this.isMounted) {
                            this.hp = Math.min(this.maxHp, this.hp + 15);
                            for(let i=0; i<8; i++) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#32CD32", 0, -Math.random()*4, 500, 5));
                        }
                    }
                }

                if (this.stateTimer <= 0) {
                    let recTime = 250;
                    if (this.heroName === 'Hason') recTime = 100;
                    if (this.heroName === 'Willi') recTime = Math.round(250 / Math.max(0.5, Math.min(3, this.aiAttackTempo || 1)));
                    if (this.heroName === 'Kadaxi') recTime = 200;
                    if (this.heroName === 'Lique') recTime = this.buffs.bloodFrenzy > 0 ? 90 : 180;
                    if (this.heroName === 'Kae') recTime = this.kaeAwakened ? 100 : 200;
                    if (this.heroName === 'Ugo') recTime = 150;
                    if (this.heroName === 'Kila') recTime = 200;
                    if (this.heroName === 'Volt') recTime = this.overdriveTimer > 0 ? 75 : 150;
                    if (this.heroName === 'Gensan') recTime = 150;
                    if (this.heroName === 'Wolf') recTime = 100;
                    if (this.heroName === 'Sola') recTime = 120;
                    if (this.heroName === 'Nyra') recTime = 140;
                    if (this.heroName === 'Orion') recTime = 300;
                    if (this.heroName === 'Archor') recTime = 55;
                    if (this.heroName === 'Itan') recTime = this.buffs.nuMode > 0 ? 125 : 250;
                    if (this.heroName === 'D2F1') recTime = 110;
                    if (this.heroName === 'Laegon') recTime = this.thunderGodTimer > 0 ? 170 : 45;
                    if (this.heroName === 'Veyra') recTime = 180;
                    if (this.heroName === 'Brom') recTime = 420;
                    if (this.heroName === 'Axeron') recTime = 80;
                    if (this.heroName === 'Roka') recTime = this.rokaArtilleryTimer > 0 ? 120 : 340;
                    if (this.heroName === 'Voss') recTime = 210;
                    if (this.heroName === 'Raigo') recTime = 115;

                    this.attackState = 'recovery';
                    this.stateTimer = recTime;
                    this.maxStateTimer = this.stateTimer;
                }
            } else if (this.attackState === 'recovery') {
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this.attackState = 'idle';
            }

            const mirrorCopiedSwitch = this.vossCopyActive && keysPressed[this.controls.switch];
            if (keysPressed[this.controls.switch]) {
                if (this.heroName === 'Hunter') {
                    this.hunterWeapon = this.hunterWeapon === 'musket' ? 'sword' : 'musket';
                    this.hunterMusketCD = 0;
                } else if (this.heroName === 'Euclid') {
                    this.euclidWeapon = this.euclidWeapon === 'magic' ? 'sword' : 'magic';
                    this.euclidSwitchTimer = 2000;
                    this.invincible = 2000;
                    this.attackState = 'idle';
                    for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#8A2BE2", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 800, 6));
                } else if (this.heroName === 'Ugo' && this.attackState === 'idle') {
                    if (activePuppet) {
                        activePuppet.dead = true;
                        game.createExplosion(activePuppet.x + activePuppet.w/2, activePuppet.y + activePuppet.h/2, 90, 100, this, false, 500);
                        for(let i=0; i<30; i++) game.particles.push(new Particle(activePuppet.x+activePuppet.w/2, activePuppet.y+activePuppet.h/2, "#fff", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 600, 5));
                    } else {
                        this.attackState = 'windup';
                        this.stateTimer = 800;
                        this.maxStateTimer = 800;
                        this.ugoSummoning = true;
                        this.vx = 0;
                    }
                } else if (this.heroName === 'Kila' && this.attackState === 'idle') {
                    if (this.kilaSwitchCD <= 0 && this.kilaSwitchTimer <= 0) {
                        this.kilaSwitchTimer = 2000;
                        this.attackState = 'idle';
                        let c = this.kilaElement === 'fire' ? "#1E90FF" : (this.kilaElement === 'water' ? "#8B4513" : "#ff4500");
                        for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, c, (Math.random()-0.5)*15, (Math.random()-0.5)*15, 800, 6));
                    }
                } else if (this.heroName === 'Gensan') {
                    if (this.gensanSwitchCD <= 0 && this.gensanShadows.length > 0) {
                        let targetShadow = this.gensanShadows[0];
                        let maxD = 0;
                        for(let s of this.gensanShadows) {
                            if (!s) continue;
                            let d = Math.hypot(this.x - s.x, this.y - s.y);
                            if (d > maxD) { maxD = d; targetShadow = s; }
                        }
                        if (targetShadow) {
                            for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#fff", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 400));
                            this.x = targetShadow.x;
                            this.y = targetShadow.y;
                            targetShadow.dead = true;
                            // Gensan teleport no longer has CD
                            this.gensanSwitchCD = 0;
                            this.invincible = 200;
                            if (this.buffs) this.buffs.msBoost = 500;
                            for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#fff", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 400));
                        }
                    }
                } else if (this.heroName === 'Noae' && this.attackState === 'idle') {
                    let mineCount = game.minions.filter(m => m.type === 'landmine' && m.owner === this).length;
                    if (mineCount >= 3) {
                        let oldestMine = game.minions.find(m => m.type === 'landmine' && m.owner === this);
                        if (oldestMine) oldestMine.dead = true;
                    }
                    game.minions.push(new LandMine(this, this.x + this.w/2 - 10, this.y + this.h - 10));
                } else if (this.heroName === 'Kuro' && this.attackState === 'idle' && this.kuroDecoyCooldown <= 0) {
                    game.minions.forEach(minion => {
                        if (minion.type === 'kuro_decoy' && minion.owner === this) minion.dead = true;
                    });
                    game.minions.push(new KuroDecoy(this, this.x, this.y));
                    this.kuroDecoyCooldown = 10000;
                    this.kuroAbsoluteCloakTimer = 5500;
                    this.kuroRevealTimer = 0;
                    this.kuroCloakTimer = 0;
                    this.kuroCloaked = true;
                    for (let i = 0; i < 16; i++) {
                        game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#9ad8c0', (Math.random()-0.5)*8, (Math.random()-0.5)*8, 350, 3));
                    }
                } else if (this.heroName === 'Sola' && this.attackState === 'idle' && this.solaDashCooldown <= 0) {
                    this.startSolaCharge();
                } else if (this.heroName === 'Nyra' && this.attackState === 'idle' && this.nyraShiftCooldown <= 0) {
                    const chakrams = game.projectiles.filter(projectile => projectile.owner === this && !projectile.dead && (projectile.type === 'chakram' || projectile.type === 'chakram_super'));
                    let anchor = null;
                    let farthestDistance = -1;
                    for (const chakram of chakrams) {
                        const distance = Math.hypot(chakram.x - this.x, chakram.y - this.y);
                        if (distance > farthestDistance) { anchor = chakram; farthestDistance = distance; }
                    }
                    if (anchor) {
                        for (let i = 0; i < 14; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, '#ff7ba7', (Math.random()-0.5)*10, (Math.random()-0.5)*10, 320, 4));
                        this.x = Math.max(0, Math.min(CANVAS_W - this.w, anchor.x - this.w/2));
                        this.y = Math.max(0, Math.min(GROUND_Y - this.h, anchor.y - this.h/2));
                        this.vx = anchor.vx * 0.25;
                        this.vy = Math.min(0, anchor.vy * 0.25);
                        anchor.dead = true;
                        this.invincible = 220;
                        this.nyraShiftCooldown = 7000;
                        for (let i = 0; i < 14; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, '#ffd166', (Math.random()-0.5)*10, (Math.random()-0.5)*10, 320, 4));
                    }
                } else if (this.heroName === 'Orion' && this.attackState === 'idle' && this.orionCharges > 0 && this.orionPulseCooldown <= 0) {
                    const charges = this.orionCharges;
                    const damage = 10 + charges * 15;
                    const centerX = this.x + this.w/2;
                    const centerY = this.y + this.h/2;
                    const targets = Array.from(new Set([...game.getOpponentsOf(this), ...game.minions.filter(minion => minion && minion.owner !== this && !minion.dead && !minion.untargetable)]));
                    for (const target of targets) {
                        const distance = Math.hypot(target.x + target.w/2 - centerX, target.y + target.h/2 - centerY);
                        if (distance > 210 || target.invincible > 0) continue;
                        target.takeDamage(damage, this, false, true);
                        const direction = target.x + target.w/2 < centerX ? 1 : -1;
                        target.vx = direction * (7 + charges * 2);
                        target.vy = -2 - charges;
                        if (target.buffs) target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, charges * 250);
                    }
                    this.orionCharges = 0;
                    this.orionPulseCooldown = 5000;
                    for (let i = 0; i < 24; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        game.particles.push(new Particle(centerX + Math.cos(angle)*45, centerY + Math.sin(angle)*45, '#a8b8ff', Math.cos(angle)*5, Math.sin(angle)*5, 420, 5));
                    }
                } else if (this.heroName === 'Archor' && this.archorSpeedCooldown <= 0) {
                    this.cleanseHoinDebuffs();
                } else if (this.heroName === 'Itan' && this.buffs.nuMode <= 0) {
                    this.buffs.nuMode = 8000;
                    for (let i = 0; i < 18; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#ff3030', (Math.random()-0.5)*13, (Math.random()-0.5)*13, 420, 4));
                } else if (this.heroName === 'D2F1' && this.attackState === 'idle' && this.d2fDroneCooldown <= 0) {
                    this.spawnD2FDrones(3);
                    this.d2fDroneCooldown = 10000;
                } else if (this.heroName === 'Laegon' && this.attackState === 'idle' && this.laegonSwitchCooldown <= 0) {
                    const target = game.getEnemyOf(this);
                    if (target) {
                        game.hazards.push(new HeavensThunder(this, target.x + target.w/2, target.y + target.h/2));
                        this.laegonSwitchCooldown = 8000;
                    }
                } else if (this.heroName === 'Veyra' && this.attackState === 'idle') {
                    const anchor = new TimeAnchor(this, this.x + this.w/2, this.y + this.h/2);
                    this.veyraAnchors = this.veyraAnchors.filter(item => item && !item.dead);
                    if (this.veyraAnchors.length >= 2) this.veyraAnchors.shift().dead = true;
                    this.veyraAnchors.push(anchor);
                    game.minions.push(anchor);
                } else if (this.heroName === 'Brom' && this.attackState === 'idle') {
                    if (this.bromStickyBomb && !this.bromStickyBomb.dead) {
                        this.bromStickyBomb.detonate(new Set());
                        this.bromStickyBomb = null;
                    } else {
                        this.bromStickyBomb = new BromStickyBomb(this, this.x + this.w/2, this.y + 20, this.facing * 10, -6);
                        game.projectiles.push(this.bromStickyBomb);
                    }
                } else if (this.heroName === 'Axeron' && this.attackState === 'idle') {
                    this.startAxeronRush();
                } else if (this.heroName === 'Ukon' && this.attackState === 'idle') {
                    this.summonUkonShadow();
                } else if (this.heroName === 'Mori' && this.attackState === 'idle') {
                    this.fireMoriGrapple();
                } else if (this.heroName === 'Roka' && this.attackState === 'idle') {
                    this.fireRokaMortar();
                } else if (this.heroName === 'Voss' && this.attackState === 'idle') {
                    this.startVossCopy();
                } else if (this.heroName === 'Raigo' && this.attackState === 'idle') {
                    this.startRaigoCharge();
                }
            }
            if (mirrorCopiedSwitch) {
                const target = game.getEnemyOf(this);
                this.queueVossMirror(this.getVossCopiedDamage(), 'copy', target ? target.x + target.w/2 : this.x + this.facing*180, target ? target.y + target.h/2 : this.y + this.h/2);
            }
            if (keysPressed[this.controls.attack] && this.attackState === 'idle') {
                if (hasPuppet) {
                    activePuppet.doAttack();
                } else {
                    this.performAttack();
                }
            }
        }

        const ukonDropFollowup = this.heroName === 'Ukon' && this.ukonUltimatePhase === 'ready';
        if (canAct || this.grapplePhase === 1 || ukonDropFollowup) {
            const superActivated = keysPressed[this.controls.super]
                || (this.heroName === 'Sola' && keys[this.controls.super] && !this.solaForceActive);
            if (superActivated && (this.superCooldown <= 0 || ukonDropFollowup || (this.heroName === 'Hason' && this.hasonSuperCharges > 0) || (this.heroName === 'Willi' && this.williSuperCharges > 0) || this.grapplePhase === 1)) {
                const mirrorCopiedSuper = this.vossCopyActive;
                this.performSuper();
                if (mirrorCopiedSuper) {
                    const target = game.getEnemyOf(this);
                    this.queueVossMirror(this.getVossCopiedDamage(), 'copy', target ? target.x + target.w/2 : this.x + this.facing*180, target ? target.y + target.h/2 : this.y + this.h/2);
                }
            }
        }

        if (applyGravity) {
            this.vy += GRAVITY;
            if (this.vy > 0) this.vy += GRAVITY * 0.4;
        }

        if (!keys[this.controls.jump] && this.vy < 0 && applyGravity) this.vy *= 0.8;

        if (this.jumpBuffer > 0 && canMoveAndAttack && applyGravity) {
            if (this.coyoteTime > 0 || this.jumpsLeft > 0) {
                if (this.coyoteTime <= 0) this.jumpsLeft--; else this.coyoteTime = 0;
                this.vy = -currentJump; this.isGrounded = false; this.jumpBuffer = 0;
                game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#ccc", -2, 0, 200));
                game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#ccc", 2, 0, 200));

                this.lastJumpTime = performance.now();
            }
        }

        const previousX = this.x;
        const previousY = this.y;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; }
        if (this.x + this.w > CANVAS_W) { this.x = CANVAS_W - this.w; }

        this.isGrounded = false; this.currentPlatform = null;

        this.resolveUkonRodHit();
        this.resolveUkonBurstCollision(previousX, previousY);

        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; this.isGrounded = true; }

        if (this.vy > 0) {
            for (let plat of PLATFORMS) {
                if (this.y + this.h - this.vy <= plat.y && this.y + this.h >= plat.y) {
                    if (this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                        let dropKey = this.controls.down;
                        if (!keys[dropKey]) {
                            this.y = plat.y - this.h; this.vy = 0; this.isGrounded = true; this.currentPlatform = plat;
                        }
                    }
                }
            }
        }

        this.resolveUkonDropImpact();
        this.applySolaForceFallDamage();
    }

    isMeleeAttack() {
        if (this.heroName === 'Hason' || this.heroName === 'Willi' || this.heroName === 'Ugo' || this.heroName === 'Kila' || this.heroName === 'Volt' || this.heroName === 'Noae' || this.heroName === 'Kuro' || this.heroName === 'Nyra' || this.heroName === 'Archor' || this.heroName === 'D2F1' || this.heroName === 'Veyra' || this.heroName === 'Brom' || this.heroName === 'Mori' || this.heroName === 'Roka') return false;
        if (this.heroName === 'Voss') return this.vossCopyTimer > 0 && this.vossCopiedMelee;
        if (this.heroName === 'Laegon') return this.thunderGodTimer > 0;
        if (this.heroName === 'Euclid' && this.euclidWeapon === 'magic') return false;
        if (this.heroName === 'Hunter' && this.hunterWeapon === 'musket') return false;
        if (this.heroName === 'Kadaxi' && this.comboCount === 3) return false;
        return true;
    }

    getMeleeHitbox() {
        let range = 50; let yOffset = 10; let h = 40;
        if (this.heroName === 'Hunter' && this.hunterWeapon === 'sword') range = 70;
        if (this.heroName === 'Artu' || (this.heroName === 'Duke' && !this.isMounted) || this.heroName === 'Kadaxi') range = 65;
        if (this.heroName === 'Duke' && this.isMounted) range = 90;
        if (this.heroName === 'Euclid' && this.euclidWeapon === 'sword') range = 50;
        if (this.heroName === 'Lique') range = 55;
        if (this.heroName === 'Kae') range = 45;
        if (this.heroName === 'Gensan') range = this.gensanCombo === 3 ? 65 : 50;
        if (this.heroName === 'Wolf') range = 45;
        if (this.heroName === 'Sola') range = 65;
        if (this.heroName === 'Orion') { range = 88; yOffset = 6; h = 54; }
        if (this.heroName === 'Itan') { range = 132; yOffset = -12; h = 92; }
        if (this.heroName === 'Laegon') { range = 82; yOffset = 2; h = 58; }
        if (this.heroName === 'Axeron') { range = 76; yOffset = 0; h = 62; }
        if (this.heroName === 'Voss') { range = 78; yOffset = 2; h = 58; }
        if (this.heroName === 'Raigo') { range = 92; yOffset = -3; h = 68; }

        if (this.heroName === 'Macu') {
            range = 110;
            let target = game.getEnemyOf(this);
            if (target) {
                let my = this.y + 20; let ey = target.y + target.h/2; let dy = ey - my;
                if (dy < -80) dy = -80; if (dy > 80) dy = 80;
                yOffset = Math.min(20, 20 + dy) - 20; h = Math.abs(dy) + 40;
            }
        }
        return { x: this.facing === 1 ? this.x + this.w : this.x - range, y: this.y + yOffset, w: range, h: h };
    }

    getMeleeDamage() {
        if (this.heroName === 'Duke' && this.isMounted) return 33;
        if (this.heroName === 'Artu') return 73;
        if (this.heroName === 'Macu') return 22;
        if (this.heroName === 'Hunter') return 17;
        if (this.heroName === 'Duke' && !this.isMounted) return 15;
        if (this.heroName === 'Kadaxi') return 33;
        if (this.heroName === 'Euclid') return 12;
        if (this.heroName === 'Lique') return 18;
        if (this.heroName === 'Kae') return this.kaeAwakened ? 35 : 25;
        if (this.heroName === 'Gensan') return this.gensanCombo === 3 ? 35 : 22;
        if (this.heroName === 'Wolf') return 20;
        if (this.heroName === 'Sola') return 56 + (this.solaFocus || 0) * 8;
        if (this.heroName === 'Orion') return 30;
        if (this.heroName === 'Itan') return 32;
        if (this.heroName === 'Laegon') return 30;
        if (this.heroName === 'Axeron') return 30;
        if (this.heroName === 'Voss') return this.getVossCopiedDamage();
        if (this.heroName === 'Raigo') {
            const damage = this.raigoEmpoweredAttack ? 50 : 22;
            return this.raigoArmorTimer > 0 ? damage * 1.5 : damage;
        }
        return 13;
    }

    performAttack() {
        if (this.attackState !== 'idle') return;
        if (this.heroName === 'Hason' && this.hasonAmmo <= 0) return;
        if (this.heroName === 'Hunter' && this.hunterWeapon === 'musket' && this.hunterMusketCD > 0) return;
        if (this.heroName === 'Duke' && this.isMounted && this.runTimer < 3000) return;
        if (this.heroName === 'Volt') {
            if (this.isOverloaded) return;
            if (this.overdriveTimer <= 0) {
                if (this.energy < 25) return;
                this.energy -= 25;
            }
        }
        if (this.heroName === 'Laegon' && this.thunderGodTimer <= 0) {
            if (this.laegonEnergy < 10) return;
            this.laegonEnergy -= 10;
        }
        if (this.heroName === 'Kuro') {
            this.attackState = 'charging';
            this.kuroCharge = 0;
            this.stateTimer = 0;
            this.maxStateTimer = this.kuroChargeMax;
            this.hasHit = false;
            return;
        }
        if (this.heroName === 'Ukon') {
            this.startUkonRodCharge();
            return;
        }
        if (this.heroName === 'Raigo') {
            this.raigoEmpoweredAttack = this.raigoEnergy >= this.raigoMaxEnergy;
            if (this.raigoEmpoweredAttack) this.raigoEnergy = 0;
        }

        this.attackState = 'windup';
        this.stateTimer = (this.heroName === 'Hunter' && this.hunterWeapon === 'sword') ? 200 : 100;

        if (this.heroName === 'Duke' && this.isMounted) this.stateTimer = 50;
        if (this.heroName === 'Hason') this.stateTimer = 50;
        if (this.heroName === 'Willi') this.stateTimer = Math.round(100 / Math.max(0.5, Math.min(3, this.aiAttackTempo || 1)));
        if (this.heroName === 'Kadaxi') this.stateTimer = 100;
        if (this.heroName === 'Euclid') this.stateTimer = (this.euclidWeapon === 'sword') ? 50 : 500;
        if (this.heroName === 'Lique') this.stateTimer = this.buffs.bloodFrenzy > 0 ? 10 : 20;
        if (this.heroName === 'Kae') this.stateTimer = this.kaeAwakened ? 25 : 50;
        if (this.heroName === 'Ugo') this.stateTimer = 150;
        if (this.heroName === 'Kila') this.stateTimer = this.kilaElement === 'fire' ? 500 : (this.kilaElement === 'water' ? 250 : 500);
        if (this.heroName === 'Volt') this.stateTimer = this.overdriveTimer > 0 ? 25 : 50;
        if (this.heroName === 'Gensan') this.stateTimer = 100;
        if (this.heroName === 'Noae') this.stateTimer = 150;
        if (this.heroName === 'Sola') this.stateTimer = 60;
        if (this.heroName === 'Nyra') this.stateTimer = 70;
        if (this.heroName === 'Orion') this.stateTimer = 170;
        if (this.heroName === 'Archor') this.stateTimer = 20;
        if (this.heroName === 'Itan') this.stateTimer = this.buffs.nuMode > 0 ? 90 : 180;
        if (this.heroName === 'D2F1') this.stateTimer = 60;
        if (this.heroName === 'Laegon') this.stateTimer = this.thunderGodTimer > 0 ? 135 : Math.max(25, 55 / (1 + this.thunderCharges * 0.03));
        if (this.heroName === 'Veyra') this.stateTimer = 110;
        if (this.heroName === 'Brom') this.stateTimer = 180;
        if (this.heroName === 'Axeron') this.stateTimer = 45;
        if (this.heroName === 'Mori') this.stateTimer = 160;
        if (this.heroName === 'Roka') this.stateTimer = this.rokaArtilleryTimer > 0 ? 280 : 800;
        if (this.heroName === 'Voss') this.stateTimer = this.vossCopyTimer > 0 ? 90 : 120;
        if (this.heroName === 'Raigo') this.stateTimer = 70;
        if (this.heroName === 'Wolf') {
            this.stateTimer = 50;
            this.wolfPassiveReady = this.wolfAttackTimer >= 1500;
            this.wolfAttackTimer = 0;
            this.vx = this.facing * 10;
        }

        this.maxStateTimer = this.stateTimer;
        this.hasHit = false;

        if (!this.isGrounded) this.vy = Math.max(this.vy, -2);
    }

    executeActiveAttack() {
        const combatTarget = this.isCPU && this.aiCombatTarget && !this.aiCombatTarget.dead && !this.aiCombatTarget.untargetable
            ? this.aiCombatTarget
            : null;
        let target = combatTarget || game.getEnemyOf(this);

        if (!combatTarget && (this.heroName === 'Hason' || this.heroName === 'Willi' || this.heroName === 'Euclid' || this.heroName === 'Ugo' || this.heroName === 'Kila' || this.heroName === 'Volt' || this.heroName === 'Noae' || this.heroName === 'Nyra' || this.heroName === 'Archor' || this.heroName === 'D2F1' || this.heroName === 'Laegon' || this.heroName === 'Veyra' || this.heroName === 'Brom')) {
            let minDist = target ? Math.hypot(target.x - this.x, target.y - this.y) : 9999;
            for (let m of game.minions) {
                if (m && m.owner !== this && !m.dead) {
                    let d = Math.hypot(m.x - this.x, m.y - this.y);
                    if (d < minDist) { minDist = d; target = m; }
                }
            }
            if (target) this.facing = (target.x + target.w/2 > this.x + this.w/2) ? 1 : -1;
        }

        let px = this.facing === 1 ? this.x + this.w : this.x - 10;
        let py = this.y + 25;

        let tx = target ? target.x + target.w/2 : this.x + this.facing * 100;
        let ty = target ? target.y + target.h/2 : this.y;
        let aimAngle = Math.atan2(ty - py, tx - px);

        if (this.heroName === 'Macu') this.vx = this.facing * 12;
        if (this.heroName === 'Voss' && this.vossCopyTimer > 0 && this.vossCopiedMelee) {
            this.queueVossMirror(this.getVossCopiedDamage(), 'copy', tx, ty);
            for(let i=0;i<10;i++)game.particles.push(new Particle(px,py,'#c9b8ff',this.facing*(3+Math.random()*6),(Math.random()-.5)*8,240,3));
            return;
        }

        if (this.heroName === 'Hason') {
            this.hasonAmmo--;
            this.timeSinceLastDamage = 0;
            let speed = 20;
            game.projectiles.push(new Projectile(px, py, 10, 5, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 28, this, "#FFD700"));
            game.particles.push(new Particle(px, py, "#FFA500", Math.cos(aimAngle)*2, Math.sin(aimAngle)*2, 100));
        }
        else if (this.heroName === 'Willi') {
            if (this.williHealBuffTimer > 0) {
                this.hp = Math.min(this.maxHp, this.hp + 10);
                for(let i=0; i<5; i++) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#32CD32", 0, -2, 300, 4));
            }

            this.williComboCount++;
            let speed = 18;
            if (this.williComboCount >= 3) {
                this.williComboCount = 0;
                game.projectiles.push(new Projectile(px, py, 25, 6, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 30, this, "#0ff", "enhanced_knife"));
            } else {
                game.projectiles.push(new Projectile(px, py, 20, 4, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 23, this, "#ccc", "knife"));
            }
        }
        else if (this.heroName === 'Hunter' && this.hunterWeapon === 'musket') {
            game.projectiles.push(new Projectile(px, py, 12, 12, this.facing * 25, 0, 20, this, "#222", "homing_bullet"));
            this.hunterMusketCD = 1000;
            game.particles.push(new Particle(px, py, "#FFA500", this.facing*5, -2, 150));
        }
        else if (this.heroName === 'Kadaxi') {
            if (this.comboCount >= 2) {
                this.comboCount = 0;
                let speed = 22;
                game.projectiles.push(new Projectile(px, py - 10, 30, 30, this.facing * speed, 0, 53, this, "#1E90FF", "ki_blast"));
            } else {
                this.comboCount++;
                this.comboTimer = 2000;
            }
        }
        else if (this.heroName === 'Ugo') {
            let speed = 20;
            game.projectiles.push(new Projectile(px, py, 15, 10, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 17, this, "#fff", "paper_plane"));
        }
        else if (this.heroName === 'Kila') {
            if (this.kilaElement === 'fire') {
                let speed = 20;
                game.projectiles.push(new Projectile(px, py, 15, 15, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 40, this, "#ff4500", "fire_bolt"));
            } else if (this.kilaElement === 'water') {
                let speed = 18;
                game.projectiles.push(new Projectile(px, py, 12, 12, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 30, this, "#1E90FF", "water_bolt"));
            } else if (this.kilaElement === 'earth') {
                game.hazards.push(new Hazard(tx - 20, GROUND_Y - 40, 40, 40, 500, 200, 50, this, "#8B4513"));
                game.particles.push(new Particle(px, py, "#8B4513", this.facing*5, 0, 150, 5));
            }
        }
        else if (this.heroName === 'Volt') {
            let speed = 20;
            game.projectiles.push(new Projectile(px, py, 15, 4, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 6, this, "#00FFFF", "volt_laser"));
        }
        else if (this.heroName === 'Euclid') {
            if (this.euclidWeapon === 'magic') {
                let dist = Math.hypot(tx - px, ty - py);
                let inRange = dist < 600 && Math.abs(ty - py) < 300;

                if (inRange) {
                    let speed = 15;
                    game.projectiles.push(new Projectile(px, py, 25, 25, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 103, this, "#8A2BE2", "magic_burst"));
                } else {
                    let skeletons = game.minions.filter(m => m && m.type === 'skeleton' && m.owner === this);
                    if (skeletons.length > 0) {
                        let healAmt = 100 / skeletons.length;
                        skeletons.forEach(s => {
                            if (s) {
                                s.hp = Math.min(s.maxHp, s.hp + healAmt);
                                for(let i=0; i<8; i++) game.particles.push(new Particle(s.x + Math.random()*s.w, s.y + Math.random()*s.h, "#00ff00", 0, -3, 400, 5));
                            }
                        });
                    }
                }
            } else {
                game.particles.push(new Particle(px, py, "#8A2BE2", this.facing*5, 0, 150, 5));
            }
        }
        else if (this.heroName === 'Lique') {
            let color = this.buffs.bloodFrenzy > 0 ? "#ff0000" : "#ffffff";
            for(let i=0; i<4; i++) game.particles.push(new Particle(px, py, color, this.facing*(Math.random()*5+5), (Math.random()-0.5)*5, 150, 3));
        }
        else if (this.heroName === 'Noae') {
            let speed = 18;
            game.projectiles.push(new Projectile(px, py, 25, 25, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 19, this, "#A9A9A9", "pickaxe"));
        }
        else if (this.heroName === 'Nyra') {
            let speed = 23;
            game.projectiles.push(new Projectile(px, py - 4, 24, 24, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 22, this, "#ff7ba7", "chakram"));
        }
        else if (this.heroName === 'Archor') {
            const speed = 29;
            const damage = 6 + Math.min(this.archorDamageBonusMax, this.archorDamageBonus);
            game.projectiles.push(new Projectile(px, py - 3, 36, 4, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, damage, this, "#ffffa8", "archor_arrow"));
        }
        else if (this.heroName === 'D2F1') {
            const speed = 24;
            game.projectiles.push(new Projectile(px, py - 5, 16, 16, Math.cos(aimAngle)*speed, Math.sin(aimAngle)*speed, 5, this, '#35d5e8', 'em_ball'));
            for (let i = 0; i < 5; i++) game.particles.push(new Particle(px, py, '#dffcff', Math.cos(aimAngle)*(2+Math.random()*3), Math.sin(aimAngle)*(2+Math.random()*3), 160, 3));
        }
        else if (this.heroName === 'Laegon') {
            if (this.thunderGodTimer > 0) {
                const distance = target ? Math.hypot(tx-px, ty-py) : 0;
                if (distance > 105 && !this.laegonHammerInFlight) {
                    this.laegonHammerInFlight = true;
                    game.projectiles.push(new LaegonHammer(this, px, py, Math.cos(aimAngle)*18, Math.sin(aimAngle)*18, 'combat'));
                }
            } else game.projectiles.push(new LaegonLightning(this, px, py, Math.cos(aimAngle)*25, Math.sin(aimAngle)*25));
        }
        else if (this.heroName === 'Veyra') {
            game.projectiles.push(new Projectile(px, py, 18, 9, Math.cos(aimAngle)*15, Math.sin(aimAngle)*15, 30, this, '#a66cff', 'chrono_bolt'));
        }
        else if (this.heroName === 'Brom') {
            game.projectiles.push(new BromBlastCharge(this, px, py, Math.cos(aimAngle)*10, Math.sin(aimAngle)*10));
        }
        else if (this.heroName === 'Mori') {
            game.projectiles.push(new MechanicFanBlade(this, px, py - 4, Math.cos(aimAngle)*17, Math.sin(aimAngle)*17));
        }
        else if (this.heroName === 'Roka') {
            const direction = this.getRokaAimVector();
            const speed = 15;
            const muzzleX = this.x + this.w/2 + direction.x*32, muzzleY = this.y + this.h*.42 + direction.y*24;
            game.projectiles.push(new RokaCannonball(this,muzzleX,muzzleY,direction.x*speed,direction.y*speed,this.rokaArtilleryTimer>0));
            const recoil = (this.rokaArtilleryTimer>0?18.75:15);
            this.vx -= direction.x*recoil;this.vy -= direction.y*recoil;
            for(let i=0;i<18;i++)game.particles.push(new Particle(muzzleX,muzzleY,i%2?'#ffb347':'#d8f4ff',direction.x*(3+Math.random()*8)+(Math.random()-.5)*4,direction.y*(3+Math.random()*8)+(Math.random()-.5)*4,260,3+Math.random()*3));
        }
        else if (this.heroName === 'Voss') {
            const copied = this.vossCopyTimer > 0;
            const damage = copied ? this.getVossCopiedDamage() : 15;
            game.projectiles.push(new TemporalBolt(this,px,py,Math.cos(aimAngle)*18,Math.sin(aimAngle)*18,damage,copied?'copy':'shard'));
            this.queueVossMirror(damage,copied?'copy':'shard',tx,ty);
        }
        if (this.vossCopyActive) this.queueVossMirror(this.getVossCopiedDamage(), 'copy', tx, ty);
    }

    getRokaAimVector() {
        let dx=(keys[this.controls.right]?1:0)-(keys[this.controls.left]?1:0);
        let dy=(keys[this.controls.down]?1:0)-(keys[this.controls.jump]?1:0);
        if(!dx&&!dy){const target=game.getEnemyOf(this);if(target){dx=target.x+target.w/2-(this.x+this.w/2);dy=target.y+target.h/2-(this.y+this.h*.42);}else dx=this.facing;}
        const length=Math.max(1,Math.hypot(dx,dy));if(dx)this.facing=dx>0?1:-1;return{x:dx/length,y:dy/length};
    }

    getRokaWeaponAimAngle() {
        const direction = this.getRokaAimVector();
        return Math.atan2(direction.y, Math.abs(direction.x));
    }

    fireRokaMortar() {
        if(this.heroName!=='Roka'||this.rokaMortarCooldown>0)return false;
        const target=game.getEnemyOf(this);let targetX=this.x+this.w/2+this.facing*260,targetY=GROUND_Y;
        if(target&&!target.dead){targetX=target.x+target.w/2;targetY=target.y+target.h;}
        game.projectiles.push(new RokaMortarShell(this,targetX,targetY));this.rokaMortarCooldown=6000;
        this.vx-=this.facing*4;this.vy=Math.min(this.vy,-3);return true;
    }

    getVossCopiedDamage() {
        if(!this.vossCopiedHero)return 15;
        const values={Hason:28,Hunter:20,Macu:22,Willi:23,Artu:73,Duke:33,Kadaxi:33,Euclid:35,Lique:18,Kae:25,Ugo:17,Kila:35,Volt:12,Gensan:32,Noae:19,Wolf:20,Kuro:35,Sola:56,Nyra:22,Orion:30,Archor:24,Itan:32,D2F1:15,Laegon:30,Veyra:30,Brom:45,Axeron:30,Ukon:40,Mori:25,Roka:40,Raigo:22};
        return values[this.vossCopiedHero]||30;
    }

    startVossCopy() {
        if(this.heroName!=='Voss'||this.vossCopyCooldown>0)return false;
        const target=game.getEnemyOf(this);if(!target||target.dead)return false;
        const copiedHero=target.heroName;
        if(!copiedHero||!HEROES[copiedHero]||copiedHero==='Voss')return false;
        this.initializeVossCopiedState(copiedHero);
        this.vossCopiedTarget=target;this.vossCopiedHero=copiedHero;
        this.vossCopiedMelee=typeof target.isMeleeAttack==='function'?target.isMeleeAttack():false;
        this.vossOwnSuperCooldown=this.superCooldown;
        this.vossCopyTimer=3000;this.vossCopyCooldown=7500;this.vossCopyActive=true;
        this.heroName=copiedHero;this.superCooldown=0;this.superCooldownMax=HEROES[copiedHero].superCD;
        this.attackState='idle';this.stateTimer=0;this.maxStateTimer=0;
        this.resetVossCopiedCooldowns();
        for(let i=0;i<22;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,i%2?'#c9b8ff':'#8be9ff',(Math.random()-.5)*12,(Math.random()-.5)*12,420,4));
        return true;
    }

    initializeVossCopiedState(heroName) {
        const template=new Fighter('__voss_copy__',heroName,this.x,this.controls,this.isP1);
        const protectedFields=new Set(['id','heroName','controls','isP1','x','y','w','h','vx','vy','hp','maxHp','baseMaxHp','baseSpeed','baseJump','color','facing','dead','buffs','invincible','superCooldown','superCooldownMax','vossCopyCooldown','vossCopyTimer','vossCopyActive','vossCopiedHero','vossCopiedTarget','vossCopiedMelee','vossOwnSuperCooldown','vossDouble']);
        for(const [key,value] of Object.entries(template)){
            if(protectedFields.has(key))continue;
            if(Array.isArray(value))this[key]=[...value];
            else if(value instanceof Set)this[key]=new Set(value);
            else if(value&&Object.getPrototypeOf(value)===Object.prototype)this[key]={...value};
            else this[key]=value;
        }
    }

    resetVossCopiedCooldowns() {
        if(!this.vossCopyActive)return;
        this.superCooldown=0;
        for(const key of Object.keys(this)){
            if(key==='vossCopyCooldown'||key==='vossOwnSuperCooldown')continue;
            if(/(?:Cooldown|CD)$/.test(key)&&typeof this[key]==='number')this[key]=0;
        }
        this.hasonAmmo=6;
        if(Number.isFinite(this.maxEnergy))this.energy=this.maxEnergy;
        if(Number.isFinite(this.laegonMaxEnergy))this.laegonEnergy=this.laegonMaxEnergy;
        if(Number.isFinite(this.raigoMaxEnergy))this.raigoEnergy=this.raigoMaxEnergy;
        if(this.heroName==='Duke')this.runTimer=3000;
    }

    endVossCopy() {
        if(!this.vossCopyActive)return;
        this.heroName='Voss';
        this.superCooldown=this.vossOwnSuperCooldown;
        this.superCooldownMax=HEROES.Voss.superCD;
        this.vossCopyActive=false;this.vossCopyTimer=0;
        this.vossCopiedTarget=null;this.vossCopiedMelee=false;
        this.attackState='idle';this.stateTimer=0;this.maxStateTimer=0;this.hasHit=false;
        this.overdriveTimer=0;this.thunderGodTimer=0;this.raigoArmorTimer=0;
        this.solaChargeTimer=0;this.solaForceActive=false;this.axeronRushTimer=0;this.raigoChargeTimer=0;
        this.ukonUltimatePhase=null;this.ukonDashTimer=0;this.ukonChargeTimer=0;
        for(let i=0;i<18;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,i%2?'#8be9ff':'#c9b8ff',(Math.random()-.5)*10,(Math.random()-.5)*10,360,3));
    }

    queueVossMirror(damage,kind,targetX,targetY) {
        if((this.heroName!=='Voss'&&!this.vossCopyActive)||!this.vossDouble||this.vossDouble.dead)return;
        this.vossDouble.mirrorAttack({damage,kind,targetX,targetY,facing:this.facing});
    }

    healRaigoFromDamage(actualDamage) {
        if(this.heroName!=='Raigo'||this.raigoArmorTimer<=0||actualDamage<=0)return;
        const healing=actualDamage*.25;this.hp=Math.min(this.maxHp,this.hp+healing);
        for(let i=0;i<5;i++)game.particles.push(new Particle(this.x+Math.random()*this.w,this.y+Math.random()*this.h,'#fff3a6',0,-2-Math.random()*3,300,3));
    }

    onRaigoBasicHit(target,actualDamage) {
        if(actualDamage<=0)return;
        if(this.raigoEmpoweredAttack){target.buffs=target.buffs||{};target.buffs.dizzy=Math.max(target.buffs.dizzy||0,500);for(let i=0;i<18;i++)game.particles.push(new Particle(target.x+target.w/2,target.y+target.h/2,i%2?'#ffd84d':'#dffcff',(Math.random()-.5)*14,(Math.random()-.5)*14,380,4));}
        else this.raigoEnergy=Math.min(this.raigoMaxEnergy,this.raigoEnergy+10);
        this.healRaigoFromDamage(actualDamage);
    }

    startRaigoCharge() {
        if(this.heroName!=='Raigo'||this.raigoEnergy<30||this.raigoChargeTimer>0)return false;
        let dx=(keys[this.controls.right]?1:0)-(keys[this.controls.left]?1:0),dy=(keys[this.controls.down]?1:0)-(keys[this.controls.jump]?1:0);
        if(!dx&&!dy)dx=this.facing;const length=Math.max(1,Math.hypot(dx,dy));this.raigoEnergy-=30;this.raigoChargeTimer=240;this.raigoChargeHitTargets=new Set();this.vx=dx/length*24;this.vy=dy/length*24;if(dx)this.facing=dx>0?1:-1;return true;
    }

    updateRaigoCharge(dt) {
        const damage=this.raigoArmorTimer>0?45:30;
        for(const target of [...game.getOpponentsOf(this),...game.minions.filter(item=>item&&item.owner!==this&&!item.dead&&!item.untargetable)]){
            if(this.raigoChargeHitTargets.has(target)||!checkAABB(this,target))continue;const hpBefore=Number.isFinite(target.hp)?target.hp:null;target.takeDamage(damage,this,false,true);const actual=hpBefore===null?damage:Math.max(0,hpBefore-Math.max(0,target.hp));this.healRaigoFromDamage(actual);target.buffs=target.buffs||{};target.buffs.dizzy=Math.max(target.buffs.dizzy||0,350);target.vx=this.facing*17;target.vy=-7;this.raigoChargeHitTargets.add(target);
        }
        for(let i=0;i<4;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,this.raigoArmorTimer>0?'#ffd84d':'#58e6ff',-this.vx*.2+(Math.random()-.5)*4,-this.vy*.2+(Math.random()-.5)*4,260,3));
        this.raigoChargeTimer=Math.max(0,this.raigoChargeTimer-dt);if(this.raigoChargeTimer<=0){this.vx*=.45;this.vy*=.45;}
    }

    getMoriNodes() {
        return (game.minions || []).filter(item => item && !item.dead && item.owner === this && item.type === 'mori_node');
    }

    createMoriNode(x, y) {
        const nodes = this.getMoriNodes();
        if (nodes.length >= 3) nodes.sort((a,b) => a.serial - b.serial)[0].dead = true;
        const node = new MechanismNode(this, x, y);
        game.minions.push(node);
        this.refreshMoriWires();
        return node;
    }

    refreshMoriWires() {
        const nodes = this.getMoriNodes();
        const liveWires = (game.minions || []).filter(item => item && !item.dead && item.owner === this && item.type === 'mori_wire');
        for (let first=0; first<nodes.length; first++) for (let second=first+1; second<nodes.length; second++) {
            const a=nodes[first],b=nodes[second];
            if (Math.hypot(a.x-b.x,a.y-b.y) > 520) continue;
            const exists=liveWires.some(wire => (wire.first===a&&wire.second===b)||(wire.first===b&&wire.second===a));
            if(!exists) game.minions.push(new MoriEnergyWire(this,a,b));
        }
    }

    onMoriFanHit(target) {
        this.moriFanCombo = (this.moriFanCombo || 0) + 1;
        this.moriFanComboTimer = 2200;
        const direction = target.x + target.w/2 >= this.x + this.w/2 ? 1 : -1;
        target.vx += direction * (this.moriFanCombo % 3 === 0 ? 9 : 4);
        target.vy = Math.min(target.vy || 0, this.moriFanCombo % 3 === 0 ? -5 : -2);
    }

    getMoriAimVector() {
        let dx=(keys[this.controls.right]?1:0)-(keys[this.controls.left]?1:0);
        let dy=(keys[this.controls.down]?1:0)-(keys[this.controls.jump]?1:0);
        if(!dx&&!dy){const target=game.getEnemyOf(this);if(target){dx=target.x+target.w/2-(this.x+this.w/2);dy=target.y+target.h/2-(this.y+this.h/2);}else dx=this.facing;}
        const length=Math.max(1,Math.hypot(dx,dy));return {x:dx/length,y:dy/length};
    }

    fireMoriGrapple() {
        if(this.heroName!=='Mori'||this.moriGrappleCooldown>0||this.moriGrappleTimer>0)return false;
        const origin={x:this.x+this.w/2,y:this.y+this.h/2},direction=this.getMoriAimVector(),range=540;
        const candidates=[...this.getMoriNodes(),...(typeof game.getOpponentsOf==='function'?game.getOpponentsOf(this):[])].filter(target=>target&&!target.dead);
        let best=null,bestAlong=Infinity;
        for(const target of candidates){const rx=target.x+target.w/2-origin.x,ry=target.y+target.h/2-origin.y,along=rx*direction.x+ry*direction.y,side=Math.abs(rx*direction.y-ry*direction.x);if(along>0&&along<=range&&side<=Math.max(32,target.w*.65)&&along<bestAlong){best=target;bestAlong=along;}}
        if(best&&best.type!=='mori_node'){
            const dx=origin.x-(best.x+best.w/2),dy=origin.y-(best.y+best.h/2),distance=Math.max(1,Math.hypot(dx,dy));best.vx+=(dx/distance)*10;best.vy+=(dy/distance)*7;
        } else {
            let point=best?{x:best.x+best.w/2,y:best.y+best.h/2}:null;
            if(!point){for(let step=24;step<=range;step+=12){const x=origin.x+direction.x*step,y=origin.y+direction.y*step;const onSurface=x<=3||x>=CANVAS_W-3||y<=3||y>=GROUND_Y-2||PLATFORMS.some(platform=>x>=platform.x&&x<=platform.x+platform.w&&y>=platform.y&&y<=platform.y+platform.h);if(onSurface){point={x,y};break;}}}
            if(!point)return false;
            this.moriGrappleTargetX=point.x-this.w/2;this.moriGrappleTargetY=point.y-this.h/2;this.moriGrappleTimer=340;
        }
        this.moriGrappleCooldown=3000;
        for(let i=0;i<14;i++)game.particles.push(new Particle(origin.x,origin.y,i%2?'#ffd166':'#667078',direction.x*(3+Math.random()*7),direction.y*(3+Math.random()*7),300,3));
        return true;
    }

    updateMoriGrapple(dt) {
        if(this.heroName!=='Mori'||this.moriGrappleTimer<=0)return;
        const dx=this.moriGrappleTargetX-this.x,dy=this.moriGrappleTargetY-this.y,distance=Math.hypot(dx,dy);
        if(distance<24){this.moriGrappleTimer=0;this.vx*=.35;this.vy*=.35;return;}
        this.vx=dx/Math.max(1,distance)*19;this.vy=dy/Math.max(1,distance)*19;this.moriGrappleTimer=Math.max(0,this.moriGrappleTimer-dt);
    }

    getUkonTarget() {
        const summons = (game.minions || []).filter(target => target && target.owner !== this && !target.dead && !target.untargetable
            && target.type !== 'time_anchor' && target.type !== 'temporal_echo' && typeof target.takeDamage === 'function');
        const opponents = typeof game.getOpponentsOf === 'function'
            ? game.getOpponentsOf(this).filter(target => target && !target.dead && !target.untargetable)
            : [];
        const candidates = [...opponents, ...summons];
        return candidates.reduce((best, target) => {
            if (!best) return target;
            const targetDistance = Math.hypot(target.x + target.w/2 - (this.x + this.w/2), target.y + target.h/2 - (this.y + this.h/2));
            const bestDistance = Math.hypot(best.x + best.w/2 - (this.x + this.w/2), best.y + best.h/2 - (this.y + this.h/2));
            if (targetDistance < bestDistance - 0.5) return target;
            if (Math.abs(targetDistance - bestDistance) <= 0.5 && summons.includes(target) && !summons.includes(best)) return target;
            return best;
        }, null);
    }

    startUkonDirectionalDash(dx, dy) {
        if (this.heroName !== 'Ukon' || this.dead || this.ukonDashCooldown > 0 || this.ukonDashTimer > 0
            || this.ukonChargeTimer > 0 || this.ukonUltimatePhase || this.attackState !== 'idle') return false;
        const distance = Math.hypot(dx, dy);
        if (distance <= 0) return false;
        this.ukonDashTimer = this.ukonDashDuration;
        this.ukonDashCooldown = 150;
        this.ukonBurstOriginX = this.x;
        this.ukonBurstOriginY = this.y;
        this.ukonBurstMaxDistance = 165;
        this.vx = dx / distance * 18;
        this.vy = dy / distance * 18;
        if (dx) this.facing = dx > 0 ? 1 : -1;
        this.isGrounded = false;
        this.jumpBuffer = 0;
        for (let i = 0; i < 12; i++) {
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, i % 2 ? '#ef8d78' : '#5c2425', -this.vx*(0.18 + Math.random()*0.16), -this.vy*(0.18 + Math.random()*0.16), 320, 5));
        }
        return true;
    }

    startUkonRodCharge() {
        if (this.heroName !== 'Ukon' || this.dead || this.attackState !== 'idle' || this.ukonDashTimer > 0
            || this.ukonChargeTimer > 0 || this.ukonUltimatePhase) return false;
        const target = this.getUkonTarget();
        const originX = this.x + this.w/2;
        const originY = this.y + this.h/2;
        const targetX = target ? target.x + target.w/2 : originX + this.facing * 300;
        const targetY = target ? target.y + target.h/2 : originY;
        const dx = targetX - originX;
        const dy = targetY - originY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        this.ukonChargeTargetId = target?.id || null;
        this.ukonChargeTarget = target || null;
        this.ukonChargeCanStrike = !!target && distance <= 365;
        this.ukonChargeTimer = 235;
        this.ukonBurstOriginX = this.x;
        this.ukonBurstOriginY = this.y;
        this.ukonBurstMaxDistance = 295;
        this.vx = dx / distance * 25;
        this.vy = dy / distance * 25;
        this.facing = dx >= 0 ? 1 : -1;
        this.attackState = 'ukon_charge';
        this.stateTimer = this.ukonChargeTimer;
        this.maxStateTimer = this.ukonChargeTimer;
        this.hasHit = true;
        this.isGrounded = false;
        this.jumpBuffer = 0;
        for (let i = 0; i < 16; i++) {
            game.particles.push(new Particle(originX, originY, i % 3 ? '#d65a4a' : '#d7c1ae', -this.vx*(0.12 + Math.random()*0.2), -this.vy*(0.12 + Math.random()*0.2), 360, 5));
        }
        return true;
    }

    finishUkonBurst(interrupted = false) {
        if (this.heroName !== 'Ukon') return;
        const wasCharge = this.ukonChargeTimer > 0 || this.attackState === 'ukon_charge';
        this.ukonDashTimer = 0;
        this.ukonChargeTimer = 0;
        this.ukonChargeTargetId = null;
        this.ukonChargeTarget = null;
        this.ukonChargeCanStrike = false;
        this.ukonBurstMaxDistance = 0;
        this.vx *= interrupted ? 0.12 : 0.24;
        this.vy *= interrupted ? 0.12 : 0.24;
        if (wasCharge) {
            this.attackState = 'recovery';
            this.stateTimer = interrupted ? 360 : 260;
            this.maxStateTimer = this.stateTimer;
        }
    }

    updateUkonBurst(dt) {
        if (this.heroName !== 'Ukon') return;
        if (this.ukonDashTimer > 0) this.ukonDashTimer = Math.max(0, this.ukonDashTimer - dt);
        if (this.ukonChargeTimer > 0) {
            this.ukonChargeTimer = Math.max(0, this.ukonChargeTimer - dt);
            this.stateTimer = this.ukonChargeTimer;
        }
        if (this.ukonDashTimer <= 0 && this.ukonChargeTimer <= 0 && this.attackState === 'ukon_charge') {
            this.finishUkonBurst(false);
            return;
        }
        if (this.ukonDashTimer <= 0 && this.ukonChargeTimer <= 0) return;

        if (Math.random() < 0.9) {
            const color = this.ukonChargeTimer > 0 ? '#f4a080' : '#a7433d';
            game.particles.push(new Particle(this.x + this.w/2 - this.vx*1.2, this.y + this.h/2 - this.vy*1.2, color, -this.vx*0.16, -this.vy*0.16, 260, 7));
        }
        const traveled = Math.hypot(this.x - this.ukonBurstOriginX, this.y - this.ukonBurstOriginY);
        if (this.ukonBurstMaxDistance > 0 && traveled >= this.ukonBurstMaxDistance) this.finishUkonBurst(false);
    }

    resolveUkonRodHit() {
        if (this.heroName !== 'Ukon' || this.ukonChargeTimer <= 0 || !this.ukonChargeCanStrike) return false;
        const target = this.ukonChargeTarget && !this.ukonChargeTarget.dead ? this.ukonChargeTarget : null;
        if (!target) return false;
        const distance = Math.hypot(target.x + target.w/2 - (this.x + this.w/2), target.y + target.h/2 - (this.y + this.h/2));
        if (distance > 72 && !checkAABB(this, target)) return false;

        target.takeDamage(40, this);
        if (target.buffs) target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 320);
        const direction = target.x + target.w/2 >= this.x + this.w/2 ? 1 : -1;
        target.vx = direction * 19;
        target.vy = -9;
        game.hitstop = Math.max(game.hitstop || 0, 90);
        for (let i = 0; i < 26; i++) {
            game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, i % 3 ? '#d9d1c5' : '#ff765f', direction*(3 + Math.random()*12), (Math.random()-0.5)*16, 430, 5));
        }
        this.finishUkonBurst(false);
        return true;
    }

    resolveUkonBurstCollision(previousX, previousY) {
        if (this.heroName !== 'Ukon' || (this.ukonDashTimer <= 0 && this.ukonChargeTimer <= 0)) return false;
        const movingX = this.vx;
        const movingY = this.vy;
        const crossedGround = movingY > 2 && previousY + this.h < GROUND_Y - 1 && this.y + this.h >= GROUND_Y;
        if (this.x <= 0 || this.x + this.w >= CANVAS_W || this.y <= 0 || crossedGround) {
            this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x));
            this.y = Math.max(0, Math.min(GROUND_Y - this.h, this.y));
            if (this.y + this.h >= GROUND_Y) this.isGrounded = true;
            this.finishUkonBurst(false);
            this.vx = 0;
            this.vy = 0;
            return true;
        }

        for (const platform of PLATFORMS) {
            const verticalOverlap = this.y + this.h > platform.y && this.y < platform.y + platform.h;
            const horizontalOverlap = this.x + this.w > platform.x && this.x < platform.x + platform.w;
            if (movingX > 0 && previousX + this.w <= platform.x && this.x + this.w >= platform.x && verticalOverlap) {
                this.x = platform.x - this.w;
                this.finishUkonBurst(false);
                this.vx = 0; this.vy = 0;
                return true;
            }
            if (movingX < 0 && previousX >= platform.x + platform.w && this.x <= platform.x + platform.w && verticalOverlap) {
                this.x = platform.x + platform.w;
                this.finishUkonBurst(false);
                this.vx = 0; this.vy = 0;
                return true;
            }
            if (movingY > 0 && previousY + this.h <= platform.y && this.y + this.h >= platform.y && horizontalOverlap) {
                this.y = platform.y - this.h;
                this.isGrounded = true;
                this.currentPlatform = platform;
                this.finishUkonBurst(false);
                this.vx = 0; this.vy = 0;
                return true;
            }
            if (movingY < 0 && previousY >= platform.y + platform.h && this.y <= platform.y + platform.h && horizontalOverlap) {
                this.y = platform.y + platform.h;
                this.finishUkonBurst(false);
                this.vx = 0; this.vy = 0;
                return true;
            }
        }
        return false;
    }

    summonUkonShadow() {
        if (this.heroName !== 'Ukon' || this.ukonShadowCooldown > 0 || this.attackState !== 'idle'
            || this.ukonDashTimer > 0 || this.ukonChargeTimer > 0 || this.ukonUltimatePhase) return false;
        const target = this.getUkonTarget();
        if (!target) return false;
        const existing = game.minions.find(minion => minion && minion.owner === this && minion.type === 'ukon_shadow' && !minion.dead);
        if (existing) existing.dead = true;
        game.minions.push(new UkonShadow(this, target));
        this.ukonShadowCooldown = 8000;
        for (let i = 0; i < 20; i++) {
            game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, i % 2 ? '#f2a999' : '#702936', (Math.random()-0.5)*13, (Math.random()-0.5)*13, 450, 5));
        }
        return true;
    }

    startUkonUltimate() {
        if (this.heroName !== 'Ukon' || this.dead || this.superCooldown > 0 || this.ukonUltimatePhase
            || this.attackState !== 'idle' || this.ukonDashTimer > 0 || this.ukonChargeTimer > 0) return false;
        const centerX = Math.max(88, Math.min(CANVAS_W - 88, this.x + this.w/2));
        this.ukonTree = new PeachTree(this, centerX);
        game.minions.push(this.ukonTree);
        this.ukonUltimatePhase = 'climb';
        this.ukonClimbTargetY = 54;
        this.superCooldown = this.superCooldownMax;
        this.attackState = 'idle';
        this.vx = 0;
        this.vy = 0;
        for (let i = 0; i < 32; i++) {
            game.particles.push(new Particle(centerX + (Math.random()-0.5)*140, GROUND_Y - 8, i % 3 ? '#75503b' : '#ff9faa', (Math.random()-0.5)*12, -Math.random()*14, 650, 6));
        }
        return true;
    }

    startUkonHeavenlyDrop() {
        if (this.heroName !== 'Ukon' || this.ukonUltimatePhase !== 'ready') return false;
        const target = this.getUkonTarget();
        if (!target) return false;
        const predictedX = target.x + target.w/2 + (target.vx || 0) * 9;
        const predictedY = Math.min(GROUND_Y, target.y + target.h);
        this.ukonDropTargetX = Math.max(25, Math.min(CANVAS_W - 25, predictedX));
        this.ukonDropTargetY = Math.max(50, predictedY);
        this.ukonDropWarningTimer = 320;
        this.ukonUltimatePhase = 'aim';
        this.vx = 0;
        this.vy = 0;
        return true;
    }

    updateUkonUltimate(dt) {
        if (this.heroName !== 'Ukon' || !this.ukonUltimatePhase) return;
        const treeCenter = this.ukonTree && !this.ukonTree.dead ? this.ukonTree.x + this.ukonTree.w/2 : this.x + this.w/2;
        if (this.ukonUltimatePhase === 'climb') {
            const targetX = treeCenter - this.w/2;
            this.x += (targetX - this.x) * Math.min(1, dt * 0.0045);
            this.y = Math.max(this.ukonClimbTargetY, this.y - dt * 0.19);
            this.vx = 0;
            this.vy = 0;
            if (Math.random() < 0.65) game.particles.push(new Particle(this.x + this.w/2 + (Math.random()-0.5)*36, this.y + this.h, '#ffb6c1', (Math.random()-0.5)*3, 2 + Math.random()*3, 430, 4));
            if (this.y <= this.ukonClimbTargetY + 0.5) {
                this.y = this.ukonClimbTargetY;
                this.ukonUltimatePhase = 'ready';
            }
            return;
        }
        if (this.ukonUltimatePhase === 'ready') {
            this.x += (treeCenter - this.w/2 - this.x) * Math.min(1, dt * 0.006);
            this.vx = 0;
            this.vy = 0;
            return;
        }
        if (this.ukonUltimatePhase === 'aim') {
            this.ukonDropWarningTimer = Math.max(0, this.ukonDropWarningTimer - dt);
            this.vx = 0;
            this.vy = 0;
            if (this.ukonDropWarningTimer <= 0) {
                this.ukonUltimatePhase = 'drop';
                this.ukonDropStartY = this.y;
                const horizontalDistance = this.ukonDropTargetX - (this.x + this.w/2);
                this.vx = Math.max(-15, Math.min(15, horizontalDistance / 14));
                this.vy = 8;
            }
            return;
        }
        if (this.ukonUltimatePhase === 'drop') {
            const horizontalError = this.ukonDropTargetX - (this.x + this.w/2);
            const desiredVx = Math.max(-15, Math.min(15, horizontalError / 9));
            this.vx += (desiredVx - this.vx) * Math.min(0.35, dt * 0.006);
            this.vy = Math.min(32, this.vy + dt * 0.042);
            if (Math.random() < 0.95) game.particles.push(new Particle(this.x + this.w/2 + (Math.random()-0.5)*18, this.y, Math.random() < 0.25 ? '#ffb6c1' : '#ded7c9', -this.vx*0.1, -4 - Math.random()*5, 330, 6));
        }
    }

    resolveUkonDropImpact() {
        if (this.heroName !== 'Ukon' || this.ukonUltimatePhase !== 'drop') return false;
        const targets = [
            ...(typeof game.getOpponentsOf === 'function' ? game.getOpponentsOf(this) : []),
            ...game.minions.filter(minion => minion && minion.owner !== this && !minion.dead && !minion.untargetable)
        ].filter(target => target && !target.dead && !target.untargetable);
        const directContact = targets.some(target => checkAABB(this, target));
        if (!directContact && !this.isGrounded) return false;

        const fallDistance = Math.max(0, this.y - this.ukonDropStartY);
        const damage = Math.round(Math.min(160, 60 + fallDistance * 0.22));
        this.ukonLastDropDamage = damage;
        const impactX = this.x + this.w/2;
        const impactY = this.y + this.h;
        for (const target of targets) {
            const dx = target.x + target.w/2 - impactX;
            const dy = target.y + target.h/2 - impactY;
            const distance = Math.hypot(dx, dy);
            if (distance > 150) continue;
            target.takeDamage(damage, this, false, true);
            if (target.buffs) target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 1100);
            const direction = dx >= 0 ? 1 : -1;
            target.vx = direction * (17 + Math.max(0, 1 - distance/150) * 8);
            target.vy = -10;
        }
        for (let i = 0; i < 68; i++) {
            const dust = i % 4 !== 0;
            game.particles.push(new Particle(impactX + (Math.random()-0.5)*70, impactY - Math.random()*18, dust ? '#8a674c' : '#ff9aaa', (Math.random()-0.5)*(dust ? 24 : 14), -Math.random()*(dust ? 18 : 12), 500 + Math.random()*420, dust ? 7 : 5));
        }
        game.hitstop = Math.max(game.hitstop || 0, 130);
        game.screenShakeTimer = Math.max(game.screenShakeTimer || 0, 480);
        game.screenShakeMagnitude = Math.max(game.screenShakeMagnitude || 0, 14);
        if (this.ukonTree) this.ukonTree.dead = true;
        this.ukonTree = null;
        this.ukonUltimatePhase = null;
        this.ukonDropWarningTimer = 0;
        this.attackState = 'recovery';
        this.stateTimer = 650;
        this.maxStateTimer = 650;
        this.vx *= 0.18;
        this.vy = 0;
        return true;
    }

    addAxeronMark(target) {
        if (this.heroName !== 'Axeron' || !target || target.dead) return;
        this.axeronMarks.push({ target, life: 5000 });
        for (let i=0; i<16; i++) game.particles.push(new Particle(target.x+target.w/2,target.y+8,i%2?'#ffcf5a':'#62b7ff',(Math.random()-.5)*10,(Math.random()-.5)*10,420,4));
    }

    selectAxeronMarkTarget() {
        const targets = Array.from(new Set(this.axeronMarks.filter(mark => mark.life > 0 && mark.target && !mark.target.dead).map(mark => mark.target)));
        if (!targets.length) return null;
        const preferred = this.aiCombatTarget || this.aiTarget;
        if (preferred && targets.includes(preferred)) return preferred;
        const centerX = this.x + this.w/2;
        const requestedDirection = keys[this.controls.left] ? -1 : (keys[this.controls.right] ? 1 : 0);
        const directional = requestedDirection === 0 ? targets : targets.filter(target => Math.sign(target.x+target.w/2-centerX) === requestedDirection);
        const candidates = directional.length ? directional : targets;
        return candidates.reduce((closest,target) => Math.hypot(target.x-this.x,target.y-this.y) < Math.hypot(closest.x-this.x,closest.y-this.y) ? target : closest);
    }

    startAxeronRush() {
        if (this.heroName !== 'Axeron' || this.axeronRushTimer > 0) return false;
        const target = this.selectAxeronMarkTarget();
        if (!target) return false;
        this.axeronRushTarget = target; this.axeronRushTimer = this.axeronRushMax; this.axeronRushHit = false;
        this.attackState = 'idle'; this.stateTimer = 0; this.vx = 0; this.vy = 0;
        for (let i=0;i<12;i++) game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,'#ffcf5a',(Math.random()-.5)*12,(Math.random()-.5)*12,280,4));
        return true;
    }

    updateAxeronRush(dt) {
        const target = this.axeronRushTarget;
        if (!target || target.dead) { this.axeronRushTimer=0; this.axeronRushTarget=null; return; }
        const direction = target.x+target.w/2 >= this.x+this.w/2 ? 1 : -1;
        this.facing = direction;
        const destinationX = direction > 0 ? target.x-this.w-5 : target.x+target.w+5;
        const destinationY = target.y+target.h-this.h;
        const step = Math.min(1, dt/Math.max(1,this.axeronRushTimer));
        this.x += (destinationX-this.x)*step; this.y += (destinationY-this.y)*step;
        this.vx=0; this.vy=0; this.axeronRushTimer=Math.max(0,this.axeronRushTimer-dt);
        game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,Math.random()>.35?'#2468c9':'#ffcf5a',-direction*(5+Math.random()*5),(Math.random()-.5)*5,180,4));
        if (this.axeronRushTimer<=0 && !this.axeronRushHit) {
            this.axeronRushHit=true; target.takeDamage(25,this,false,true); target.vx=direction*24; target.vy=-7;
            target.buffs=target.buffs||{}; target.buffs.dizzy=Math.max(target.buffs.dizzy||0,260);
            for(let i=0;i<32;i++) game.particles.push(new Particle(target.x+target.w/2,target.y+target.h/2,i%3?'#ffcf5a':'#777',(Math.random()-.5)*22,(Math.random()-.5)*18,520,6));
            game.hitstop=80; this.axeronRushTarget=null;
        }
    }

    updateVeyraTime(dt) {
        this.veyraAnchors = this.veyraAnchors.filter(anchor => anchor && !anchor.dead);
        this.veyraHistoryTimer += dt;
        this.veyraEchoTimer += dt;
        if (this.veyraHistoryTimer >= 100) {
            this.veyraHistoryTimer %= 100;
            this.veyraHistory.push({ x: this.x, y: this.y, hp: this.hp, age: 0 });
        }
        this.veyraHistory.forEach(sample => sample.age += dt);
        this.veyraHistory = this.veyraHistory.filter(sample => sample.age <= 3400);
        if (this.veyraEchoTimer >= 700 && Math.hypot(this.vx || 0, this.vy || 0) > 1.2) {
            this.veyraEchoTimer = 0;
            const echoes = game.minions.filter(item => item?.type === 'temporal_echo' && item.owner === this && !item.dead);
            if (echoes.length >= 3) echoes[0].dead = true;
            game.minions.push(new TemporalEcho(this, this.x, this.y));
        }
        if (this.veyraReversalTimer > 0) {
            this.veyraReversalTimer = Math.max(0, this.veyraReversalTimer - dt);
            this.vx = 0;
            if (this.veyraReversalTimer <= 0) this.completeTimeReversal();
        }
    }

    completeTimeReversal() {
        const old = this.veyraHistory.reduce((best, sample) => !best || Math.abs(sample.age - 3000) < Math.abs(best.age - 3000) ? sample : best, null);
        const recentAnchor = [...this.veyraAnchors].reverse().find(anchor => !anchor.dead && anchor.age <= 3000);
        if (!old && !recentAnchor) return;
        const destination = recentAnchor || old;
        const historicalHp = old?.hp ?? this.hp;
        this.x = Math.max(0, Math.min(CANVAS_W - this.w, destination.x - (recentAnchor ? this.w/2 : 0)));
        this.y = Math.max(0, Math.min(GROUND_Y - this.h, destination.y - (recentAnchor ? this.h/2 : 0)));
        this.hp = Math.min(this.maxHp, this.hp + Math.max(0, historicalHp - this.hp) * 0.5);
        this.vx = 0; this.vy = 0; this.attackState = 'idle';
        for (let i=0; i<28; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, '#b78aff', (Math.random()-0.5)*15, (Math.random()-0.5)*15, 500, 5));
    }

    onLaegonHit(target, damage, hammer = false) {
        if (!target) return;
        if (hammer && this.thunderGodTimer > 0) {
            this.hp = Math.min(this.maxHp, this.hp + damage * 0.2 * (target.heroName ? 1 : 0.5));
        }
        if (!hammer && target !== this.laegonLastHitTarget) {
            this.laegonLastHitTarget = target;
            this.thunderCharges = Math.min(5, this.thunderCharges + 1);
            this.thunderChargeTimer = 2000;
        }
    }

    spawnD2FDrones(count) {
        if (this.heroName !== 'D2F1' || count <= 0) return [];
        const active = game.minions.filter(minion => minion && minion.owner === this && minion.type === 'd2f_drone' && !minion.dead);
        const excess = Math.max(0, active.length + count - 10);
        active.sort((first, second) => (first.life || 0) - (second.life || 0));
        for (let index = 0; index < excess; index++) active[index].dead = true;

        const deployed = [];
        for (let index = 0; index < count; index++) {
            const slot = this.d2fDroneSerial++;
            const angle = (slot % 7) / 7 * Math.PI * 2;
            const drone = new D2FDrone(
                this,
                Math.max(8, Math.min(CANVAS_W - 42, this.x + this.w/2 + Math.cos(angle)*58 - 17)),
                Math.max(45, this.y - 55 + Math.sin(angle)*38),
                slot
            );
            deployed.push(drone);
            game.minions.push(drone);
        }
        for (let i = 0; i < count * 5; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + 12, '#35d5e8', (Math.random()-0.5)*12, (Math.random()-0.5)*12, 380, 4));
        return deployed;
    }

    cleanseHoinDebuffs() {
        if (this.heroName !== 'Archor' || this.archorSpeedCooldown > 0) return;
        if (this.grappledBy && typeof this.grappledBy.breakGrapple === 'function') this.grappledBy.breakGrapple();
        if (this.solaForceHeld) {
            const forceSource = typeof game.getFighters === 'function'
                ? game.getFighters().find(fighter => fighter.id === this.solaForceSourceId)
                : null;
            if (forceSource && typeof forceSource.endSolaForce === 'function') forceSource.endSolaForce();
            else {
                this.solaForceHeld = false;
                this.solaForceSourceId = null;
                this.solaForceProgress = 0;
            }
        }
        this.stunTimer = 0;
        ['poison', 'dizzy', 'slow', 'gravitySlow', 'burn', 'bleed', 'bleedTick'].forEach(name => { this.buffs[name] = 0; });
        this.buffs.hurricaneSlow = false;
        this.flightDisabled = false;
        this.archorSpeedCooldown = 8000;
        for (let i = 0; i < 18; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#ffffa8', (Math.random()-0.5)*13, (Math.random()-0.5)*13, 380, 4));
    }

    onArchorHit(target) {
        if (this.heroName !== 'Archor' || !target?.heroName || target === this) return;
        if (this.archorPassiveTimer <= 0) {
            this.archorHitChain++;
            this.archorHitChainTimer = 1500;
            if (this.archorHitChain < 3) return;
            this.archorPassiveTimer = 3500;
            this.archorHitChain = 0;
            this.archorHitChainTimer = 0;
        }
        this.hp = Math.min(this.maxHp, this.hp + 10);
        this.archorDamageBonus = Math.min(this.archorDamageBonusMax, this.archorDamageBonus + 2);
        for (let i = 0; i < 7; i++) {
            game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#7df0aa', 0, -2-Math.random()*2, 320, 3));
        }
    }

    releaseItanChiq() {
        if (this.heroName !== 'Itan' || this.dead) return;
        const nuMode = this.buffs.nuMode > 0;
        const chiqColor = nuMode ? '#ff3030' : '#4db8ff';
        const bladeDamage = nuMode ? 100 : 50;
        const combatTarget = this.isCPU && this.aiCombatTarget && !this.aiCombatTarget.dead && !this.aiCombatTarget.untargetable
            ? this.aiCombatTarget
            : null;
        const target = combatTarget || game.getEnemyOf(this);
        const px = this.facing === 1 ? this.x + this.w : this.x - 42;
        const py = this.y + 24;
        const tx = target && !target.dead ? target.x + target.w/2 : px + this.facing * 600;
        const ty = target && !target.dead ? target.y + target.h/2 : py;
        const baseAngle = Math.atan2(ty - py, tx - px);
        [-0.09, 0, 0.09].forEach((offset, index) => {
            const angle = baseAngle + offset;
            const blade = new Projectile(px, py + (index - 1) * 13, 42, 12, Math.cos(angle)*32, Math.sin(angle)*32, bladeDamage, this, chiqColor, 'chiq_blade');
            blade.chiqNu = nuMode;
            game.projectiles.push(blade);

            const pathLength = Math.min(900, Math.max(420, Math.abs(tx - px)));
            const endX = px + this.facing * pathLength;
            const pathY = GROUND_Y - 8 - (index - 1) * 18;
            game.minions.push(new ChiqPath(this, px, pathY, endX, pathY, nuMode));
        });
        for (let i = 0; i < 24; i++) game.particles.push(new Particle(px, py, chiqColor, (Math.random()-0.5)*16, (Math.random()-0.5)*16, 420, 4));
        this.attackState = 'recovery';
        this.stateTimer = 300;
        this.maxStateTimer = 300;
    }

    performSuper() {
        if (this.heroName === 'Roka') {
            if(this.superCooldown<=0){this.superCooldown=this.superCooldownMax;this.rokaArtilleryTimer=10000;for(let i=0;i<34;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,i%2?'#ffe066':'#9ed6e5',(Math.random()-.5)*15,(Math.random()-.5)*15,520,5));}
            return;
        }
        if (this.heroName === 'Voss') {
            if(this.superCooldown<=0){
                this.superCooldown=this.superCooldownMax;if(this.vossDouble&&!this.vossDouble.dead)this.vossDouble.dead=true;
                const x=CANVAS_W-this.x-this.w,y=this.y;
                this.vossDouble=new VossTemporalDouble(this,x,y);game.minions.push(this.vossDouble);
                for(let i=0;i<28;i++)game.particles.push(new Particle(this.vossDouble.x+this.w/2,this.vossDouble.y+this.h/2,'#c9b8ff',(Math.random()-.5)*14,(Math.random()-.5)*14,480,5));
            }
            return;
        }
        if (this.heroName === 'Raigo') {
            if(this.superCooldown<=0){this.superCooldown=this.superCooldownMax;this.raigoArmorTimer=8000;for(let i=0;i<42;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,i%2?'#ffd84d':'#fff7b0',(Math.random()-.5)*18,(Math.random()-.5)*18,600,5));}
            return;
        }
        if (this.heroName === 'Mori') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;
                game.hazards.push(new ThousandMechanisms(this));
                for(let i=0;i<28;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h,i%2?'#ffd166':'#454b50',(Math.random()-.5)*12,-Math.random()*13,520,5));
            }
            return;
        }
        if (this.heroName === 'Ukon') {
            if (this.ukonUltimatePhase === 'ready') this.startUkonHeavenlyDrop();
            else if (!this.ukonUltimatePhase && this.superCooldown <= 0) this.startUkonUltimate();
            return;
        }
        if (this.heroName === 'Axeron') {
            const target = game.getEnemyOf(this);
            if (this.superCooldown <= 0 && target) {
                this.superCooldown = this.superCooldownMax;
                game.hazards.push(new TitanAxe(this,target.x+target.w/2,target.y+target.h));
            }
            return;
        }
        if (this.heroName === 'Laegon') {
            const target = game.getEnemyOf(this);
            if (this.superCooldown <= 0 && target) {
                this.superCooldown = this.superCooldownMax;
                game.hazards.push(new LaegonHammerStrike(this, target.x + target.w/2, target.y + target.h/2));
            }
            return;
        }
        if (this.heroName === 'Veyra') {
            if (this.superCooldown <= 0 && this.veyraReversalTimer <= 0 && this.veyraHistory.length) {
                this.superCooldown = this.superCooldownMax;
                this.veyraReversalTimer = 1000;
                this.attackState = 'windup'; this.stateTimer = 1000; this.maxStateTimer = 1000; this.vx = 0;
            }
            return;
        }
        if (this.heroName === 'Brom') {
            const target = game.getEnemyOf(this);
            if (this.superCooldown <= 0 && target) {
                this.superCooldown = this.superCooldownMax;
                game.hazards.push(new DemolitionZone(this, target.x + target.w/2, target.y + target.h/2));
            }
            return;
        }
        if (this.heroName === 'D2F1') {
            if (this.superCooldown <= 0) {
                const opponents = typeof game.getOpponentsOf === 'function'
                    ? game.getOpponentsOf(this).filter(target => target && !target.dead && !target.untargetable)
                    : [];
                const preferred = this.aiTarget && opponents.includes(this.aiTarget) ? this.aiTarget : null;
                const target = preferred || game.getEnemyOf(this) || opponents[0];
                if (!target || target.dead) return;
                this.superCooldown = this.superCooldownMax;
                this.spawnD2FDrones(4);
                game.minions.push(new D2FTargetBeacon(this, target));
                for (let i = 0; i < 28; i++) game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, i % 2 ? '#ff334f' : '#35d5e8', (Math.random()-0.5)*14, (Math.random()-0.5)*14, 500, 5));
            }
            return;
        }

        if (this.heroName === 'Itan') {
            if (this.superCooldown <= 0 && this.itanSuperWindupTimer <= 0) {
                this.superCooldown = this.superCooldownMax;
                this.itanSuperWindupTimer = this.itanSuperWindupMax;
                this.attackState = 'windup';
                this.stateTimer = this.itanSuperWindupMax;
                this.maxStateTimer = this.itanSuperWindupMax;
                this.vx = 0;
                this.clearItanSuperDebuffs();
            }
            return;
        }

        if (this.heroName === 'Archor') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;
                const target = game.getEnemyOf(this);
                const px = this.facing === 1 ? this.x + this.w : this.x - 34;
                const py = this.y + 8;
                const tx = target ? target.x + target.w/2 : px + this.facing * 500;
                const ty = target ? target.y + target.h/2 : py;
                const angle = Math.atan2(ty - py, tx - px);
                game.projectiles.push(new Projectile(px, py, 54, 40, Math.cos(angle)*18, Math.sin(angle)*18, 0, this, '#ffd84d', 'tracking_bird'));
                for (let i = 0; i < 22; i++) game.particles.push(new Particle(px, py, '#ffd84d', (Math.random()-0.5)*14, (Math.random()-0.5)*14, 420, 4));
            }
            return;
        }

        if (this.heroName === 'Sola') {
            this.startSolaForce();
            return;
        }

        if (this.heroName === 'Nyra') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;
                const centerX = this.x + this.w/2;
                const centerY = this.y + this.h/2;
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3;
                    game.projectiles.push(new Projectile(centerX - 13, centerY - 13, 26, 26, Math.cos(angle)*17, Math.sin(angle)*17, 20, this, '#ffd166', 'chakram_super'));
                }
                for (let i = 0; i < 24; i++) game.particles.push(new Particle(centerX, centerY, '#ff7ba7', (Math.random()-0.5)*14, (Math.random()-0.5)*14, 420, 4));
            }
            return;
        }

        if (this.heroName === 'Orion') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;
                const target = game.getEnemyOf(this);
                const targetX = target && !target.dead ? target.x + target.w/2 : this.x + this.w/2 + this.facing * 240;
                const targetY = target && !target.dead ? target.y + target.h/2 : this.y + this.h/2;
                game.minions.push(new GravityWell(this, Math.max(45, Math.min(CANVAS_W - 45, targetX)), Math.max(60, Math.min(GROUND_Y - 45, targetY))));
                this.orionCharges = Math.min(3, this.orionCharges + 1);
                for (let i = 0; i < 28; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, '#a8b8ff', (Math.random()-0.5)*12, (Math.random()-0.5)*12, 500, 5));
            }
            return;
        }

        if (this.heroName === 'Kuro') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;
                this.kuroEmpoweredShot = true;
                this.kuroEmpoweredTimer = 7000;
                this.kuroScopeGlintTimer = 500;
                this.revealKuro(500);
                for (let i = 0; i < 18; i++) {
                    game.particles.push(new Particle(this.x + this.w/2, this.y + 18, '#ffffff', (Math.random()-0.5)*7, (Math.random()-0.5)*7, 450, 3));
                }
            }
            return;
        }

        if (this.heroName === 'Gensan') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;

                let enemy = game.getEnemyOf(this);
                let targetX = enemy && !enemy.dead ? enemy.x + enemy.w/2 : this.x + this.facing * 200;

                game.minions.push(new GiantSword(this, targetX - 150 - 30, -150));
                game.minions.push(new GiantSword(this, targetX - 30, -150));
                game.minions.push(new GiantSword(this, targetX + 150 - 30, -150));

                let shadow = new SwordShadow(this, this.x, this.y);
                shadow.life = 8000;
                shadow.maxLife = 8000;
                this.gensanShadows.push(shadow);
                game.minions.push(shadow);
            }
            return;
        }

        if (this.heroName === 'Volt') {
            if (this.superCooldown <= 0) {
                this.superCooldown = this.superCooldownMax;
                this.overdriveTimer = 10000;
                this.isOverloaded = false;
                this.energy = this.maxEnergy;
                for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#FFFF00", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 600, 6));
            }
            return;
        }

        if (this.heroName === 'Kila') {
            if (this.superCooldown <= 0 && this.kilaSwitchTimer <= 0) {
                this.superCooldown = this.superCooldownMax;
                if (this.kilaElement === 'fire') {
                    game.minions.push(new FireDragon(this, this.x + this.w/2, this.y));
                } else if (this.kilaElement === 'water') {
                    game.projectiles.push(new Projectile(this.facing === 1 ? this.x+this.w : this.x-80, this.y-50, 80, 120, this.facing * 12, 0, 10, this, "rgba(30, 144, 255, 0.7)", "tidal_wave"));
                } else if (this.kilaElement === 'earth') {
                    let earthDmg = 100; // 10 WRD
                    let earthCC = 5000; // 5 seconds stun
                    PLATFORMS.forEach(p => {
                        game.hazards.push(new Hazard(p.x, p.y - 30, p.w, 30, 0, 1500, earthDmg, this, "#8B4513", earthCC));
                    });
                    game.hazards.push(new Hazard(0, GROUND_Y - 30, CANVAS_W, 30, 0, 1500, earthDmg, this, "#8B4513", earthCC));
                }
            }
            return;
        }

        if (this.heroName === 'Kae') {
            if (this.superCooldown <= 0 && this.superWindupTimer <= 0) {
                this.superWindupTimer = 300;
            }
            return;
        }

        if (this.heroName === 'Lique') {
            this.superCooldown = this.superCooldownMax;
            this.buffs.bloodFrenzy = 10000;
            for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#B22222", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 600, 6));
            return;
        }

        if (this.heroName === 'Euclid') {
            if (this.superCooldown <= 0 && this.superWindupTimer <= 0) {
                this.superWindupTimer = 1000;
            }
            return;
        }

        if (this.heroName === 'Wolf') {
            if (this.superCooldown <= 0 && this.superWindupTimer <= 0) {
                this.superWindupTimer = 350;
            }
            return;
        }

        if (this.heroName === 'Ugo') {
            this.superCooldown = this.superCooldownMax;
            let activePuppet = game.minions.find(m => m.type === 'puppet' && m.owner === this && !m.dead);
            if (activePuppet) {
                let tempX = this.x; let tempY = this.y;
                this.x = activePuppet.x; this.y = activePuppet.y;
                activePuppet.x = tempX; activePuppet.y = tempY;
                this.invincible = 200;
                for(let i=0; i<15; i++) {
                    game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#fff", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 300));
                    game.particles.push(new Particle(tempX+this.w/2, tempY+this.h/2, "#fff", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 300));
                }
            } else {
                this.vy = -5;
                this.vx = -this.facing * 35; // Backstep
                this.invincible = 200;
                let py = this.y + 25;
                let px = this.facing === 1 ? this.x + this.w : this.x - 20;
                game.projectiles.push(new Projectile(px, py, 25, 15, this.facing * 25, 0, 50, this, "#00bfff", "blue_paper_plane"));
            }
            return;
        }

        if (this.heroName === 'Kadaxi') {
            if (this.grapplePhase === 0) {
                let enemy = game.getEnemyOf(this);
                if (enemy) {
                    let dx = Math.abs((this.x + this.w/2) - (enemy.x + enemy.w/2));
                    let dy = Math.abs(this.y - enemy.y);

                    let correctDirection = (this.facing === 1 && enemy.x > this.x) || (this.facing === -1 && enemy.x < this.x);

                    if (dx <= 200 && dy <= 50 && !enemy.dead && enemy.invincible <= 0 && correctDirection) {
                        this.grapplePhase = 1;
                        this.grappleTimer = 5000;
                        this.grappleTarget = enemy;
                        enemy.grappledBy = this;

                        for(let i=0; i<15; i++) game.particles.push(new Particle(enemy.x, enemy.y+20, "#1E90FF", -this.facing*15, (Math.random()-0.5)*10, 300));
                    } else {
                        this.superCooldown = this.superCooldownMax;
                    }
                }
            } else if (this.grapplePhase === 1) {
                if (this.grappleTimer <= 4500) {
                    this.attackState = 'active'; this.stateTimer = 400; this.maxStateTimer = 400;

                    let enemy = this.grappleTarget;
                    if (enemy) {
                        enemy.grappledBy = null;
                        enemy.takeDamage(133, this);
                        if (enemy.buffs) enemy.buffs.dizzy = 5000;
                        for(let i=0; i<20; i++) game.particles.push(new Particle(enemy.x, GROUND_Y, "#fff", (Math.random()-0.5)*20, -Math.random()*15, 600));
                    }

                    game.createExplosion(this.x + this.w/2 + this.facing*40, GROUND_Y, 80, 0, this);

                    this.grappleTarget = null;
                    this.grapplePhase = 0;
                    this.superCooldown = this.superCooldownMax;
                }
            }
            return;
        }

        if (this.heroName === 'Hason') {
            if (this.hasonSuperCharges <= 0) {
                this.superCooldown = this.superCooldownMax;
                this.hasonSuperCharges = 2;
                this.hasonSuperWindow = 4000;
            } else {
                this.hasonSuperCharges--;
                if (this.hasonSuperCharges <= 0) this.hasonSuperWindow = 0;
            }
            this.timeSinceLastDamage = 0;
            for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#ffeb3b", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 600));
            game.projectiles.push(new Projectile(this.x+this.w/2, this.y, 16, 16, this.facing * 12, -8, 0, this, "", "dynamite"));
            return;
        }

        if (this.heroName === 'Willi') {
            if (this.williDashCooldown > 0) return;

            if (this.williSuperCharges <= 0) {
                this.superCooldown = this.superCooldownMax;
                this.williSuperCharges = 1;
                this.williSuperWindow = 3000;
            } else {
                this.williSuperCharges--; if (this.williSuperCharges <= 0) this.williSuperWindow = 0;
            }

            this.williDashCooldown = 1000;
            this.invincible = 600; this.vx = this.facing * 40; this.vy = 0;
            for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#0ff", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 600));

            let knifeFacing = -this.facing;
            let px = knifeFacing === 1 ? this.x + this.w : this.x - 40; let py = this.y + 20;
            game.projectiles.push(new Projectile(px, py, 40, 8, knifeFacing * 25, 0, 53, this, "#0ff", "large_knife"));
            return;
        }

        if (this.heroName === 'Noae') {
            this.superCooldown = this.superCooldownMax;
            let mcX = this.facing === 1 ? this.x + this.w : this.x - 60;
            game.minions.push(new Minecart(this, mcX, this.y));
            return;
        }

        this.superCooldown = this.superCooldownMax;

        for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#ffeb3b", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 600));

        if (this.heroName === 'Hunter') {
            this.maxHp += 50; this.hp += 50; this.baseJump = 18;
            let hx = this.facing === 1 ? this.x + this.w + 10 : this.x - 110;
            game.hurricane = new Hurricane(this, hx, GROUND_Y - 120);
        }
        else if (this.heroName === 'Macu') {
            this.buffs.battleCry = 30000;
        }
        else if (this.heroName === 'Artu') {
            for (let i = 0; i < 5; i++) game.minions.push(new Minion(this, this.x + (Math.random() * 100 - 50), this.y - 50));
        }
        else if (this.heroName === 'Duke') {
            let px = this.facing === 1 ? this.x + this.w : this.x - 10; let py = this.y + 25;
            game.projectiles.push(new Projectile(px, py, 14, 4, this.facing * 35, 0, 133, this, "#fff", "bullet"));
            game.particles.push(new Particle(px, py, "#FFA500", this.facing*5, 0, 150));
        }
    }

    draw(ctx, view = {}) {
        if (this.solaForceHeld) {
            const centerX = this.x + this.w/2;
            const centerY = this.y + this.h/2;
            const radius = Math.max(this.w, this.h) * 0.7 + 12;
            const time = Date.now() * 0.006;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.fillStyle = 'rgba(235, 250, 255, 0.12)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, radius + Math.sin(time)*4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.lineWidth = 1.5;
            for (let bolt = 0; bolt < 7; bolt++) {
                const angle = time * (bolt % 2 ? -0.7 : 0.9) + bolt * Math.PI * 2 / 7;
                ctx.beginPath();
                for (let step = 0; step <= 5; step++) {
                    const distance = radius * (0.25 + step * 0.15);
                    const wobble = Math.sin(time * 2 + bolt * 3 + step * 4) * 7;
                    const px = Math.cos(angle) * distance + Math.cos(angle + Math.PI/2) * wobble;
                    const py = Math.sin(angle) * distance + Math.sin(angle + Math.PI/2) * wobble;
                    if (step === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            ctx.restore();
        }
        if (this.heroName === 'Ukon' && (this.ukonDashTimer > 0 || this.ukonChargeTimer > 0 || this.ukonUltimatePhase === 'drop')) {
            const speed = Math.max(1, Math.hypot(this.vx || 0, this.vy || 0));
            const nx = (this.vx || this.facing) / speed;
            const ny = (this.vy || 0) / speed;
            ctx.save();
            for (let trail = 4; trail >= 1; trail--) {
                ctx.globalAlpha = 0.07 + trail * 0.055;
                ctx.fillStyle = trail % 2 ? '#f29a82' : '#5b2528';
                ctx.fillRect(this.x - nx*trail*22, this.y - ny*trail*22, this.w, this.h);
            }
            ctx.restore();
        }
        if (this.heroName === 'Raigo' && this.raigoArmorTimer > 0) {
            const pulse=8+Math.sin(Date.now()*.02)*4;ctx.save();ctx.strokeStyle='#ffd84d';ctx.shadowBlur=24;ctx.shadowColor='#ffd84d';ctx.lineWidth=5;
            ctx.strokeRect(this.x-pulse,this.y-pulse,this.w+pulse*2,this.h+pulse*2);ctx.restore();
        }
        if (this.vossCopyActive) {
            ctx.save();ctx.strokeStyle='rgba(201,184,255,.75)';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.lineDashOffset=-Date.now()*.03;ctx.strokeRect(this.x-5,this.y-5,this.w+10,this.h+10);ctx.restore();
        }
        const kuroFullyInvisible = this.isKuroFullyInvisible();
        const revealOwnedKuro = kuroFullyInvisible && view.revealOwnedKuro === true;
        if (kuroFullyInvisible && !revealOwnedKuro) return;
        ctx.globalAlpha = 1.0;
        if (this.buffs.shade > 0) ctx.globalAlpha = 0.15;
        if (this.heroName === 'Kuro' && this.kuroCloaked) ctx.globalAlpha = 0.22;
        if (revealOwnedKuro) ctx.globalAlpha = 0.42;
        if (this.invincible > 0) ctx.globalAlpha = 0.5;

        if (this.buffs.dizzy > 0) {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y - 15);
            let timeAngle = Date.now() * 0.005;
            for(let s=0; s<3; s++) {
                let offset = timeAngle + (s * (Math.PI*2/3));
                ctx.fillStyle = "#FFD700"; ctx.fillRect(Math.cos(offset)*20, Math.sin(offset)*5, 4, 4);
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h/2);

        if (this.euclidSwitchTimer > 0) {
            ctx.save();
            ctx.rotate(-Date.now() * 0.005);
            ctx.strokeStyle = "rgba(138, 43, 226, 0.8)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 50 + Math.random() * 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        let phaseProg = 0;
        if (this.attackState !== 'idle' && this.maxStateTimer > 0) {
            phaseProg = 1 - (this.stateTimer / this.maxStateTimer);
            phaseProg = phaseProg * phaseProg * (3 - 2 * phaseProg);
        }

        if (this.superWindupTimer > 0) {
            if (this.heroName === 'Euclid' || this.heroName === 'Kae' || this.heroName === 'Wolf') {
                let prog = this.superWindupTimer > 0 ? this.superWindupTimer / (this.heroName === 'Euclid' ? 1000 : 300) : 1 - (this.stateTimer / 1000);
                ctx.save();
                ctx.rotate(Date.now() * 0.003);
                let spellColor = this.heroName === 'Euclid' ? `rgba(138, 43, 226, ${Math.min(1, Math.max(0.2, prog*2))})` : `rgba(0, 255, 255, ${Math.min(1, Math.max(0.2, prog*2))})`;
                if (this.heroName === 'Wolf') spellColor = `rgba(139, 0, 0, ${Math.min(1, Math.max(0.2, prog*2))})`;

                ctx.strokeStyle = spellColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(-40, -40, 80, 80);
                ctx.rotate(Math.PI / 4);
                ctx.strokeRect(-40, -40, 80, 80);
                ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke();
                ctx.restore();
            }
        }

        if (this.flipActive > 0) {
            let rot = ((400 - this.flipActive) / 400) * Math.PI * 2 * this.facing;
            ctx.rotate(rot);
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, this.color, 0, 0, 100, 10));
        }

        if (this.heroName === 'Volt' && this.overdriveTimer > 0) {
            ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
            ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI*2); ctx.fill();
        }

        if (this.facing === -1) ctx.scale(-1, 1);
        ctx.translate(0, -this.h/2);

        let hw = this.w / 2;
        let h = this.h;

        // Visuals (Body)
        if (this.heroName === 'Duke' && this.isMounted) {
            ctx.fillStyle = "#8B4513"; ctx.fillRect(-hw, 30, this.w, 40);
            ctx.fillRect(hw-10, 10, 15, 25); ctx.fillRect(hw-5, 5, 20, 10);
            let legOffset = this.runTimer > 0 ? Math.sin(Date.now() * 0.01) * 10 : 0;
            ctx.fillStyle = "#5c2e0b"; ctx.fillRect(-hw+5, 70, 8, 10 + legOffset); ctx.fillRect(hw-15, 70, 8, 10 - legOffset);
            ctx.fillStyle = this.color; ctx.fillRect(-hw+10, -10, 25, 40);
            hw = 25; h = 40; ctx.translate(0, -10);
        } else if (this.heroName === 'Euclid') {
            ctx.fillStyle = "#2E0854"; ctx.fillRect(-hw, 10, this.w, h-10);
            ctx.fillStyle = "#8A2BE2"; ctx.fillRect(-hw+5, 10, this.w-10, h-10);
            ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(-hw, 10); ctx.lineTo(hw, 10); ctx.lineTo(0, 30); ctx.fill();
        } else if (this.heroName === 'Kila') {
            let themeColor = this.kilaElement === 'fire' ? "#ff4500" : (this.kilaElement === 'water' ? "#1E90FF" : "#8B4513");
            ctx.fillStyle = "#333"; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = themeColor; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#222"; ctx.fillRect(-hw, h/2, this.w, 8);
            if (this.kilaSwitchTimer > 0) {
                ctx.save();
                ctx.translate(0, h/2);
                ctx.rotate(Date.now() * 0.01);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.stroke();
                ctx.restore();
            }
        } else if (this.heroName === 'Volt') {
            let voltColor = this.isOverloaded ? "#555" : this.color;
            ctx.fillStyle = "#111"; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = voltColor; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#00FFFF"; ctx.fillRect(-hw, 25, this.w, 4);
            if (this.isOverloaded && Math.floor(Date.now()/200)%2===0) {
                ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; ctx.fillRect(-hw, 0, this.w, h);
            }
        } else if (this.heroName === 'Gensan') {
            ctx.fillStyle = "#eee"; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#333"; ctx.fillRect(-hw, 20, this.w, 6);
            if (this.gensanSwitchCD <= 0 && this.gensanShadows.length > 0) {
                ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(-hw, -10, this.w, 4);
            }
        } else if (this.heroName === 'Lique') {
            ctx.fillStyle = "#333"; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#222"; ctx.fillRect(-hw, h/2 - 5, this.w, 10);
            if (this.buffs.bloodFrenzy > 0) {
                ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"; ctx.lineWidth = 4; ctx.strokeRect(-hw-4, -4, this.w+8, h+8);
            }
        } else if (this.heroName === 'Ugo') {
            ctx.fillStyle = "#E6E6FA";
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#333"; ctx.fillRect(-hw, 15, this.w, 4);
            if (this.ugoSummoning) {
                ctx.save();
                ctx.rotate(Date.now() * 0.005);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath(); ctx.arc(0, h/2, 40, 0, Math.PI*2); ctx.stroke();
                ctx.restore();
            }
        } else if (this.heroName === 'Kae') {
            let suitColor = this.kaeAwakened ? "#000000" : "#1a1a2e";
            let bodyColor = this.kaeAwakened ? "#222222" : this.color;
            let visorColor = this.kaeAwakened ? "#ff0000" : "#fff";

            ctx.fillStyle = suitColor; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = bodyColor; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#000"; ctx.fillRect(-hw, 20, this.w, 6);
            ctx.fillStyle = visorColor; ctx.fillRect(hw - 12, 10, 8, 4);

            if (this.kaeComboCount > 0) {
                ctx.fillStyle = this.kaeAwakened ? "#ff0000" : "#00FFFF";
                for(let i=0; i<this.kaeComboCount; i++) {
                    ctx.beginPath(); ctx.arc(-hw + 8 + i*8, -10, 3, 0, Math.PI*2); ctx.fill();
                }
            }
        } else if (this.heroName === 'Kuro') {
            ctx.fillStyle = "#10261d";
            ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#d8e8df";
            ctx.fillRect(-hw + 6, 8, this.w - 12, 13);
            ctx.fillStyle = "#151d19";
            ctx.fillRect(-hw + 5, 22, this.w - 10, 8);
            ctx.fillStyle = "#e8fff5";
            ctx.fillRect(hw - 11, 12, 6, 3);
        } else if (this.heroName === 'Sola') {
            ctx.fillStyle = "#111820";
            ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#d6e2e8";
            ctx.fillRect(-hw + 5, 8, this.w - 10, 14);
            ctx.fillStyle = "#29333a";
            ctx.fillRect(-hw, 31, this.w, 9);
            ctx.fillStyle = "#8ffcff";
            ctx.fillRect(hw - 11, 12, 6, 3);
            for (let i = 0; i < this.solaFocus; i++) {
                ctx.beginPath(); ctx.arc(-hw + 8 + i*10, -9, 3, 0, Math.PI*2); ctx.fill();
            }
        } else if (this.heroName === 'Nyra') {
            ctx.fillStyle = "#27152c";
            ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#ffd166";
            ctx.fillRect(-hw, 22, this.w, 5);
            ctx.fillStyle = "#2a9d8f";
            ctx.fillRect(-hw + 5, 36, this.w - 10, 16);
        } else if (this.heroName === 'Orion') {
            ctx.fillStyle = "#16192d";
            ctx.fillRect(-hw - 3, -3, this.w + 6, h + 6);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#a8b8ff";
            ctx.fillRect(-hw + 5, 10, this.w - 10, 10);
            ctx.fillStyle = "#d84b78";
            ctx.fillRect(-hw, 34, this.w, 6);
            ctx.fillStyle = "#a8b8ff";
            for (let i = 0; i < this.orionCharges; i++) {
                ctx.beginPath(); ctx.arc(-hw + 10 + i*12, -10, 4, 0, Math.PI*2); ctx.fill();
            }
        } else if (this.heroName === 'Archor') {
            ctx.fillStyle = "#153523";
            ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#d7f5c8";
            ctx.fillRect(-hw + 5, 8, this.w - 10, 13);
            ctx.fillStyle = "#523a25";
            ctx.fillRect(-hw, 29, this.w, 7);
            ctx.fillStyle = "#7df0aa";
            const marks = Math.min(5, Math.ceil((this.archorDamageBonus || 0) / 6));
            for (let i = 0; i < marks; i++) ctx.fillRect(-hw + 5 + i*6, -9, 4, 4);
        } else if (this.heroName === 'Itan') {
            ctx.fillStyle = "#351722";
            ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#efe7d0";
            ctx.fillRect(-hw + 5, 8, this.w - 10, 14);
            ctx.fillStyle = "#22252c";
            ctx.fillRect(-hw, 28, this.w, 9);
            ctx.fillStyle = "#d6aa45";
            ctx.fillRect(-hw + 4, 39, this.w - 8, 4);
        } else if (this.heroName === 'D2F1') {
            ctx.fillStyle = '#111b20';
            ctx.fillRect(-hw - 3, -3, this.w + 6, h + 6);
            ctx.fillStyle = this.color;
            ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = '#20353c';
            ctx.fillRect(-hw + 4, 6, this.w - 8, 17);
            ctx.fillRect(-hw, 39, this.w, 9);
            ctx.fillStyle = '#dffcff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#35d5e8';
            ctx.fillRect(hw - 12, 11, 8, 5);
            ctx.fillRect(-5, 28, 10, 10);
            ctx.shadowBlur = 0;
        } else if (this.heroName === 'Laegon') {
            ctx.fillStyle='#26183f';ctx.fillRect(-hw-3,-3,this.w+6,h+6);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);
            ctx.fillStyle='#ffd75a';ctx.fillRect(-hw,26,this.w,7);ctx.fillStyle='#e8dcff';ctx.fillRect(-hw+6,8,this.w-12,13);
            if(this.thunderGodTimer>0){ctx.strokeStyle='#ffd75a';ctx.shadowBlur=14;ctx.shadowColor='#9d5cff';ctx.lineWidth=4;ctx.strokeRect(-hw-6,-6,this.w+12,h+12);ctx.shadowBlur=0;}
        } else if (this.heroName === 'Veyra') {
            ctx.fillStyle='#25143d';ctx.fillRect(-hw-3,-3,this.w+6,h+6);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);
            ctx.fillStyle='#d9c0ff';ctx.fillRect(-hw+5,8,this.w-10,14);ctx.fillStyle='#3d2360';ctx.fillRect(-hw,31,this.w,8);
            ctx.strokeStyle='#e0c8ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,48,10,0,Math.PI*2);ctx.stroke();
        } else if (this.heroName === 'Brom') {
            ctx.fillStyle='#382116';ctx.fillRect(-hw-3,-3,this.w+6,h+6);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);
            ctx.fillStyle='#f5d29b';ctx.fillRect(-hw+5,8,this.w-10,14);ctx.fillStyle='#30251f';ctx.fillRect(-hw,30,this.w,10);
            ctx.fillStyle='#ffdf5d';ctx.fillRect(-hw+5,44,8,8);ctx.fillRect(hw-13,44,8,8);
        } else if (this.heroName === 'Axeron') {
            ctx.fillStyle='#102a52';ctx.fillRect(-hw-3,-3,this.w+6,h+6);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);
            ctx.fillStyle='#62b7ff';ctx.fillRect(-hw+5,7,this.w-10,14);ctx.fillStyle='#102a52';ctx.fillRect(-hw,29,this.w,9);
            ctx.fillStyle='#ffcf5a';ctx.fillRect(-hw,25,this.w,4);ctx.fillRect(-hw+3,38,5,20);ctx.fillRect(hw-8,38,5,20);
            ctx.shadowBlur=9;ctx.shadowColor='#ffcf5a';ctx.fillRect(hw-11,11,7,4);ctx.fillRect(-5,44,10,8);ctx.shadowBlur=0;
        } else if (this.heroName === 'Ukon') {
            ctx.fillStyle = '#421f24'; ctx.fillRect(-hw-3, -3, this.w+6, h+6);
            ctx.fillStyle = this.color; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = '#f0b5a1'; ctx.fillRect(-hw+6, 8, this.w-12, 14);
            ctx.fillStyle = '#2b2020'; ctx.fillRect(-hw, 29, this.w, 10);
            ctx.fillStyle = '#d7c1ae'; ctx.fillRect(-hw+4, 42, this.w-8, 4);
            ctx.fillStyle = '#6c272d'; ctx.fillRect(-hw+4, 50, 7, 17); ctx.fillRect(hw-11, 50, 7, 17);
        } else if (this.heroName === 'Mori') {
            ctx.fillStyle='#252b2e';ctx.fillRect(-hw-3,-3,this.w+6,h+6);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);
            ctx.fillStyle='#ddb18a';ctx.fillRect(-hw+6,8,this.w-12,14);ctx.fillStyle='#353b3e';ctx.fillRect(-hw,28,this.w,12);
            ctx.fillStyle='#ffd166';ctx.fillRect(-hw+4,43,this.w-8,4);ctx.fillStyle='#596269';ctx.fillRect(-hw+4,50,7,17);ctx.fillRect(hw-11,50,7,17);
            ctx.fillStyle='#1d2326';ctx.fillRect(-hw+4,2,this.w-8,5);
        } else if (this.heroName === 'Roka') {
            ctx.fillStyle='#263238';ctx.fillRect(-hw-4,-4,this.w+8,h+8);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);ctx.fillStyle='#b9d8df';ctx.fillRect(-hw+6,8,this.w-12,14);ctx.fillStyle='#1d2529';ctx.fillRect(-hw,30,this.w,11);ctx.fillStyle='#d5a94d';ctx.fillRect(-hw+3,44,this.w-6,5);
        } else if (this.heroName === 'Voss') {
            ctx.fillStyle='#252149';ctx.fillRect(-hw-3,-3,this.w+6,h+6);ctx.fillStyle=this.color;ctx.fillRect(-hw,0,this.w,h);ctx.fillStyle='#d5d0ff';ctx.fillRect(-hw+6,8,this.w-12,14);ctx.fillStyle='#27233f';ctx.fillRect(-hw,29,this.w,9);ctx.strokeStyle='#8be9ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,48,10,0,Math.PI*2);ctx.stroke();
        } else if (this.heroName === 'Raigo') {
            ctx.fillStyle=this.raigoArmorTimer>0?'#5f4b12':'#123b47';ctx.fillRect(-hw-4,-4,this.w+8,h+8);ctx.fillStyle=this.raigoArmorTimer>0?'#d7a928':this.color;ctx.fillRect(-hw,0,this.w,h);ctx.fillStyle='#dffaff';ctx.fillRect(-hw+6,8,this.w-12,14);ctx.fillStyle='#14313b';ctx.fillRect(-hw,29,this.w,10);ctx.fillStyle=this.raigoArmorTimer>0?'#fff3a6':'#58e6ff';ctx.fillRect(-hw+4,43,this.w-8,5);
        } else if (this.heroName === 'Wolf') {
            ctx.fillStyle = "#404040"; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color; ctx.fillRect(-hw, 0, this.w, h);
            ctx.fillStyle = "#fff"; ctx.fillRect(-hw, 10, this.w, 15);
            ctx.fillStyle = "#8B0000"; ctx.fillRect(hw - 10, 12, 4, 4);

            if (this.wolfComboCount > 0) {
                ctx.fillStyle = "#8B0000";
                for (let i = 0; i < this.wolfComboCount; i++) {
                    ctx.beginPath(); ctx.arc(-hw + 8 + i * 6, -10, 2, 0, Math.PI * 2); ctx.fill();
                }
            }
        } else {
            ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(-hw - 2, -2, this.w + 4, h + 4);
            ctx.fillStyle = this.color; ctx.fillRect(-hw, 0, this.w, h);
        }

        if (this.heroName !== 'Kae' && this.heroName !== 'Ugo' && this.heroName !== 'Wolf') {
            ctx.fillStyle = "#fff"; ctx.fillRect(hw - 12, 10, 8, 8);
        }

        // Visuals (Hats / Clothes)
        if (this.heroName === 'Hason') {
            ctx.fillStyle = "#3e1f0a"; ctx.fillRect(-hw - 12, -5, this.w + 24, 8); ctx.fillRect(-hw + 4, -20, this.w - 8, 15);
            ctx.fillStyle = "#a0522d"; ctx.beginPath(); ctx.moveTo(-hw, 15); ctx.lineTo(hw, 15); ctx.lineTo(hw + 6, 45); ctx.lineTo(-hw - 6, 45); ctx.fill();
            ctx.fillStyle = "#222"; ctx.fillRect(-hw, h - 25, this.w, 8); ctx.fillStyle = "gold"; ctx.fillRect(-4, h - 26, 8, 10);
        }
        else if (this.heroName === 'Artu') {
            ctx.fillStyle = "#d4af37"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -22); ctx.lineTo(4, -5); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(25, -22); ctx.lineTo(12, -5); ctx.fill();
            ctx.fillStyle = "#600000"; ctx.fillRect(-hw, 15, this.w, 14); ctx.fillStyle = "#b8860b"; ctx.fillRect(-hw - 6, 18, 10, 22); ctx.fillRect(hw - 4, 18, 10, 22);
            ctx.fillStyle = "#333"; ctx.fillRect(-hw, 35, this.w, 4); ctx.fillRect(-hw, 45, this.w, 4); ctx.fillRect(-hw, 55, this.w, 4);
        }
        else if (this.heroName === 'Duke') {
            ctx.fillStyle = "#fff"; ctx.fillRect(-hw, 20, this.w, 4); ctx.fillStyle = "#FFD700"; ctx.fillRect(-hw-2, 15, 8, 15);
        }
        else if (this.heroName === 'Macu') {
            ctx.fillStyle = "#a12222"; ctx.fillRect(-hw, 6, this.w, 8); ctx.fillStyle = "#fff"; ctx.fillRect(-hw + 6, 25, this.w - 12, 4); ctx.fillRect(-hw + 4, 40, this.w - 8, 4); ctx.fillRect(-hw + 6, 55, this.w - 12, 4);
        }
        else if (this.heroName === 'Hunter') {
            ctx.fillStyle = "#cc0000"; ctx.fillRect(-hw, -5, this.w, 12); ctx.beginPath(); ctx.moveTo(-hw, -5); ctx.lineTo(-hw - 15, 10); ctx.lineTo(-hw, 5); ctx.fill();
            ctx.fillStyle = "#111"; ctx.fillRect(hw - 14, 8, 12, 10); ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 15); ctx.stroke();
            ctx.fillStyle = "#cc0000"; ctx.fillRect(-hw, h - 25, this.w, 12); ctx.fillStyle = "#222"; ctx.fillRect(-hw, h - 22, this.w, 6);
        }
        else if (this.heroName === 'Willi') {
            ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-hw, 0, this.w, h); ctx.fillStyle = "#ffe0bd"; ctx.fillRect(-hw + 4, 10, this.w - 8, 8);
            ctx.fillStyle = "#800000"; ctx.fillRect(-hw, 20, this.w, 8); ctx.beginPath(); ctx.moveTo(-hw + 5, 25); ctx.lineTo(-hw - 20, 15); ctx.lineTo(-hw - 15, 30); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.fillRect(hw - 10, 12, 6, 4);
        }
        else if (this.heroName === 'Kuro') {
            ctx.fillStyle = "#17382b";
            ctx.beginPath();
            ctx.moveTo(-hw - 5, 10); ctx.lineTo(0, -16); ctx.lineTo(hw + 5, 10); ctx.lineTo(hw + 2, 28); ctx.lineTo(-hw - 2, 28); ctx.fill();
            ctx.fillStyle = "#d8e8df";
            ctx.fillRect(-hw + 6, 8, this.w - 12, 13);
            ctx.fillStyle = "#e8fff5";
            ctx.fillRect(hw - 11, 12, 6, 3);
            ctx.fillStyle = "#0c1712";
            ctx.fillRect(-hw - 7, 35, this.w + 14, 8);
        }
        else if (this.heroName === 'Kadaxi') {
            ctx.fillStyle = "#fff"; ctx.fillRect(-hw, 15, this.w, 20);
            ctx.fillStyle = "#000"; ctx.fillRect(-hw, 30, this.w, 8);
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-hw, 15); ctx.lineTo(hw, 15); ctx.lineTo(0, 30); ctx.fill();
            if (this.comboCount > 0) {
                ctx.fillStyle = "#0ff";
                for(let i=0; i<this.comboCount; i++) ctx.fillRect(-hw + i*10, -10, 6, 4);
            }
        }

        // Weapons / Active animations
        if (this.heroName === 'Hason') {
            ctx.save(); ctx.translate(hw, 25);
            let recoil = this.attackState === 'active' ? -0.5 * Math.sin(phaseProg * Math.PI) : 0;
            ctx.rotate(recoil); ctx.fillStyle = "#aaa"; ctx.fillRect(0, 0, 22, 6); ctx.fillRect(0, 0, 6, 14); ctx.restore();
        }
        else if (this.heroName === 'Kuro') {
            ctx.save();
            ctx.translate(hw - 14, 25);
            const chargeRatio = Math.max(0, Math.min(1, this.kuroCharge / this.kuroChargeMax));
            const recoil = this.attackState === 'recovery' ? -0.12 * Math.sin(phaseProg * Math.PI) : 0;
            ctx.rotate(recoil);
            ctx.fillStyle = "#34261c"; ctx.fillRect(-16, 2, 30, 7);
            ctx.fillStyle = "#202823"; ctx.fillRect(5, -1, 62, 5);
            ctx.fillStyle = "#0c100e"; ctx.fillRect(16, -7, 18, 7);
            ctx.fillStyle = "#355747"; ctx.fillRect(67, 0, 8, 3);
            if (this.attackState === 'charging') {
                ctx.fillStyle = "rgba(154, 216, 192, 0.35)";
                ctx.fillRect(12, -13, 56 * chargeRatio, 3);
            }
            if (this.kuroScopeGlintTimer > 0) {
                const previousAlpha = ctx.globalAlpha;
                ctx.globalAlpha = 1;
                ctx.fillStyle = "#ffffff";
                ctx.shadowBlur = 16;
                ctx.shadowColor = "#ffffff";
                ctx.fillRect(27, -8, 5, 5);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = previousAlpha;
            }
            ctx.restore();
        }
        else if (this.heroName === 'Sola') {
            ctx.save();
            ctx.translate(hw - 2, 29);
            let angle = -0.45;
            if (this.solaChargeTimer > 0) angle = -0.45 + (this.solaChargeElapsed / 95) * Math.PI * 2;
            else if (this.attackState === 'windup') angle = -0.45 - 1.35 * phaseProg;
            else if (this.attackState === 'active') angle = -1.8 + 3.45 * phaseProg;
            else if (this.attackState === 'recovery') angle = 1.65 - 2.1 * phaseProg;
            ctx.rotate(angle);
            if (this.attackState === 'active' || this.solaChargeTimer > 0) {
                ctx.beginPath(); ctx.arc(0, 0, 72, -1.8, angle);
                ctx.lineWidth = 13;
                ctx.strokeStyle = "rgba(143, 252, 255, 0.42)";
                ctx.stroke();
            }
            ctx.fillStyle = "#222";
            ctx.fillRect(-5, -4, 10, 24);
            ctx.fillStyle = "#cbd5da";
            ctx.fillRect(-7, -7, 14, 5);
            ctx.fillStyle = "#eaffff";
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#52f4ff";
            ctx.fillRect(-4, -72, 8, 67);
            ctx.fillStyle = "#8ffcff";
            ctx.fillRect(-2, -70, 4, 63);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
        else if (this.heroName === 'Nyra') {
            ctx.save();
            ctx.translate(hw - 2, 27);
            const spin = this.attackState === 'idle' ? Date.now() * 0.002 : phaseProg * Math.PI * 3;
            ctx.rotate(spin);
            ctx.strokeStyle = "#ffd166";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = "#f4f4f4";
            ctx.fillRect(-2, -16, 4, 7);
            ctx.fillRect(-2, 9, 4, 7);
            ctx.restore();
        }
        else if (this.heroName === 'Orion') {
            ctx.save();
            ctx.translate(hw, 28);
            const thrust = this.attackState === 'active' ? 52 * Math.sin(phaseProg * Math.PI) : 0;
            ctx.fillStyle = "#15182b";
            ctx.fillRect(-8, -13, 26 + thrust, 26);
            ctx.fillStyle = "#a8b8ff";
            ctx.fillRect(8 + thrust, -10, 14, 20);
            ctx.strokeStyle = "rgba(216, 75, 120, 0.85)";
            ctx.lineWidth = 3;
            ctx.strokeRect(8 + thrust, -10, 14, 20);
            if (this.attackState === 'active') {
                ctx.strokeStyle = "rgba(168, 184, 255, 0.45)";
                ctx.beginPath(); ctx.arc(22 + thrust, 0, 24, 0, Math.PI*2); ctx.stroke();
            }
            ctx.restore();
        }
        else if (this.heroName === 'Archor') {
            ctx.save();
            ctx.translate(hw - 2, 28);
            const draw = this.attackState === 'windup' ? 8 * phaseProg : 0;
            ctx.strokeStyle = "#d7b56d";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(-draw, 0, 25, -Math.PI/2, Math.PI/2); ctx.stroke();
            ctx.strokeStyle = "#e8f3df";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-draw, -25); ctx.lineTo(-draw-5, 0); ctx.lineTo(-draw, 25); ctx.stroke();
            ctx.fillStyle = "#d7f5c8";
            ctx.fillRect(-draw-5, -1, 32+draw, 2);
            ctx.restore();
        }
        else if (this.heroName === 'Itan') {
            ctx.save();
            ctx.translate(hw - 4, 31);
            let angle = 0.75;
            if (this.itanSuperWindupTimer > 0) {
                const progress = 1 - this.itanSuperWindupTimer / this.itanSuperWindupMax;
                angle = 1.65 - progress * 1.15;
                ctx.strokeStyle = this.buffs.nuMode > 0
                    ? `rgba(255, 48, 48, ${0.25 + progress * 0.7})`
                    : `rgba(77, 184, 255, ${0.2 + progress * 0.65})`;
                ctx.lineWidth = 7 + progress * 8;
                ctx.beginPath(); ctx.arc(0, 0, 105, 0.45, angle); ctx.stroke();
            } else if (this.attackState === 'windup') angle = 0.75 + 1.1 * phaseProg;
            else if (this.attackState === 'active') angle = 1.85 - 3.2 * phaseProg;
            else if (this.attackState === 'recovery') angle = -1.35 + 2.1 * phaseProg;
            ctx.rotate(angle);
            ctx.fillStyle = "#4d3020";
            ctx.fillRect(-3, -104, 6, 130);
            ctx.fillStyle = "#dce7e8";
            ctx.beginPath(); ctx.moveTo(0, -138); ctx.lineTo(-10, -101); ctx.lineTo(0, -94); ctx.lineTo(10, -101); ctx.fill();
            ctx.fillStyle = "#d6aa45";
            ctx.fillRect(-7, -103, 14, 5);
            ctx.restore();
        }
        else if (this.heroName === 'D2F1') {
            ctx.save();
            ctx.translate(hw - 3, 27);
            const recoil = this.attackState === 'active' ? -7 * Math.sin(phaseProg * Math.PI) : 0;
            ctx.fillStyle = '#17252b';
            ctx.fillRect(recoil, -8, 34, 16);
            ctx.fillStyle = '#2c5963';
            ctx.fillRect(17 + recoil, -5, 24, 10);
            ctx.fillStyle = '#dffcff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#35d5e8';
            ctx.fillRect(38 + recoil, -3, 8, 6);
            ctx.shadowBlur = 0;
            ctx.restore();
        }
        else if (this.heroName === 'Laegon') {
            ctx.save();ctx.translate(hw-2,28);
            if(this.thunderGodTimer>0){const angle=this.attackState==='active'?-1.2+2.6*phaseProg:.35;ctx.rotate(angle);ctx.fillStyle='#ffd75a';ctx.fillRect(-5,-58,10,65);ctx.fillStyle='#6f42c1';ctx.fillRect(-20,-70,40,18);}
            else{ctx.strokeStyle='#d8c0ff';ctx.shadowBlur=10;ctx.shadowColor='#9d5cff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(24,-4);ctx.lineTo(35,4);ctx.stroke();}
            ctx.restore();
        }
        else if (this.heroName === 'Veyra') {
            ctx.save();ctx.translate(hw-2,28);ctx.strokeStyle='#d8c0ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(16,0,12,0,Math.PI*1.7);ctx.stroke();ctx.fillStyle='#9d5cff';ctx.beginPath();ctx.arc(16,0,4,0,Math.PI*2);ctx.fill();ctx.restore();
        }
        else if (this.heroName === 'Brom') {
            ctx.save();ctx.translate(hw-2,28);const recoil=this.attackState==='active'?-6*Math.sin(phaseProg*Math.PI):0;ctx.fillStyle='#4b3426';ctx.fillRect(recoil,-8,38,16);ctx.fillStyle='#ff9f1c';ctx.fillRect(28+recoil,-6,15,12);ctx.restore();
        }
        else if (this.heroName === 'Axeron') {
            ctx.save();ctx.translate(hw-3,30);let angle=.55;
            if(this.attackState==='windup')angle=.55-1.5*phaseProg;else if(this.attackState==='active')angle=-.95+3.8*phaseProg;else if(this.attackState==='recovery')angle=2.85-2.3*phaseProg;
            if(this.attackState==='active'){ctx.strokeStyle='rgba(255,207,90,.52)';ctx.lineWidth=18;ctx.beginPath();ctx.arc(0,0,82,-.95,angle);ctx.stroke();ctx.strokeStyle='rgba(98,183,255,.78)';ctx.lineWidth=6;ctx.stroke();}
            ctx.rotate(angle);ctx.fillStyle='#102a52';ctx.fillRect(-5,-70,10,88);
            ctx.fillStyle='#2468c9';ctx.strokeStyle='#ffcf5a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-66);ctx.lineTo(-31,-60);ctx.lineTo(-36,-42);ctx.lineTo(-25,-25);ctx.lineTo(-4,-34);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.beginPath();ctx.moveTo(4,-66);ctx.lineTo(31,-60);ctx.lineTo(36,-42);ctx.lineTo(25,-25);ctx.lineTo(4,-34);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.fillStyle='#ffcf5a';ctx.fillRect(-9,-48,18,11);ctx.fillRect(-3,-68,6,34);ctx.restore();
        }
        else if (this.heroName === 'Ukon') {
            ctx.save();
            ctx.translate(hw - 4, 31);
            let angle = 0.78;
            if (this.attackState === 'ukon_charge') angle = -1.15 + Math.sin(Date.now()*0.03)*0.12;
            else if (this.ukonUltimatePhase === 'drop') angle = -0.15;
            else if (this.attackState === 'recovery') angle = 2.15 - phaseProg*1.35;
            ctx.rotate(angle);
            if (this.attackState === 'ukon_charge' || this.ukonUltimatePhase === 'drop') {
                ctx.strokeStyle = 'rgba(255, 201, 174, 0.42)';
                ctx.lineWidth = 18;
                ctx.beginPath(); ctx.arc(0, 0, 76, -1.4, 0.8); ctx.stroke();
            }
            ctx.fillStyle = '#202124';
            ctx.fillRect(-5, -75, 10, 96);
            ctx.fillStyle = '#91959a';
            ctx.fillRect(-8, -78, 16, 9);
            ctx.fillStyle = '#4b4e52';
            ctx.fillRect(-6, -44, 12, 7);
            ctx.fillStyle = '#5c2425';
            ctx.fillRect(-7, 8, 14, 16);
            ctx.restore();
        }
        else if (this.heroName === 'Mori') {
            ctx.save();ctx.translate(hw-4,31);let angle=.65;
            if(this.attackState==='windup')angle=.65-1.25*phaseProg;else if(this.attackState==='active')angle=-.6+2.8*phaseProg;else if(this.attackState==='recovery')angle=2.2-1.55*phaseProg;
            ctx.rotate(angle);ctx.fillStyle='#5b646a';ctx.fillRect(-3,-14,6,24);ctx.fillStyle='#ffd166';ctx.beginPath();ctx.moveTo(0,-12);ctx.arc(0,-12,34,-2.7,-.44);ctx.closePath();ctx.fill();ctx.strokeStyle='#31383c';ctx.lineWidth=2;for(let rib=-2.5;rib<-.55;rib+=.38){ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(Math.cos(rib)*32,Math.sin(rib)*32-12);ctx.stroke();}ctx.restore();
        }
        else if (this.heroName === 'Roka') {
            ctx.save();
            const idleBob=Math.sin(Date.now()*.006)*1.5;
            const windupPull=this.attackState==='windup'?phaseProg*7:0;
            const recoil=this.attackState==='active'?Math.sin(phaseProg*Math.PI)*13:0;
            ctx.translate(-hw+7-windupPull-recoil,19+idleBob);
            ctx.rotate(this.rokaWeaponAngle||0);
            if(this.rokaArtilleryTimer>0){ctx.shadowBlur=18;ctx.shadowColor='#ffe066';}
            ctx.fillStyle='#1c2428';ctx.fillRect(-17,5,32,13);
            ctx.fillStyle='#39484e';ctx.fillRect(-8,-10,77,24);
            ctx.fillStyle=this.rokaArtilleryTimer>0?'#d5a94d':'#71858c';ctx.fillRect(1,-7,59,18);
            ctx.fillStyle='#20292d';ctx.fillRect(13,-13,22,7);ctx.fillRect(22,-18,6,8);
            ctx.fillStyle='#a9c3ca';ctx.fillRect(58,-10,18,24);
            ctx.fillStyle='#111719';ctx.fillRect(70,-7,12,18);
            ctx.fillStyle='#d5a94d';ctx.fillRect(-12,-8,7,20);
            ctx.fillStyle='#252d31';ctx.beginPath();ctx.moveTo(-8,14);ctx.lineTo(8,14);ctx.lineTo(1,30);ctx.lineTo(-8,27);ctx.closePath();ctx.fill();
            ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(82,0);ctx.lineTo(73,-6);ctx.lineTo(73,6);ctx.closePath();ctx.fill();
            if(this.attackState==='active'){
                ctx.shadowBlur=14;ctx.shadowColor='#ff9f1c';ctx.fillStyle='#fff1a8';ctx.beginPath();ctx.moveTo(84,0);ctx.lineTo(101,-9);ctx.lineTo(95,0);ctx.lineTo(101,9);ctx.closePath();ctx.fill();
                ctx.shadowBlur=0;ctx.fillStyle='rgba(210,230,235,.55)';for(let puff=0;puff<3;puff++){ctx.beginPath();ctx.arc(-18-puff*8,(puff-1)*4,5+puff*2,0,Math.PI*2);ctx.fill();}
            }
            ctx.shadowBlur=0;ctx.restore();
        }
        else if (this.heroName === 'Raigo') {
            ctx.save();
            ctx.translate(hw - 4, 29);
            const charged = this.raigoArmorTimer > 0 || this.raigoEmpoweredAttack;
            const lightningColor = charged ? '#ffd84d' : '#58e6ff';
            const coreColor = charged ? '#fff7b0' : '#e8fbff';
            const time = Date.now() * 0.006;
            let angle = -0.12 + Math.sin(time) * 0.055;
            let thrust = Math.sin(time * 0.72) * 2;
            if (this.raigoChargeTimer > 0) {
                angle = Math.atan2(this.vy || 0, (this.vx || this.facing) * this.facing);
                thrust = 48 + Math.sin(time * 3.4) * 5;
            } else if (this.attackState === 'windup') {
                angle = 0.42 - phaseProg * 0.62;
                thrust = -18 * phaseProg;
            } else if (this.attackState === 'active') {
                angle = -0.2 + Math.sin(phaseProg * Math.PI) * 0.12;
                thrust = -18 + Math.sin(phaseProg * Math.PI) * 82;
            } else if (this.attackState === 'recovery') {
                angle = -0.2 + phaseProg * 0.22;
                thrust = 22 * (1 - phaseProg);
            }
            ctx.rotate(angle);

            if (this.attackState === 'active' || this.raigoChargeTimer > 0) {
                for (let trail = 3; trail >= 1; trail--) {
                    ctx.globalAlpha = 0.08 + trail * 0.05;
                    ctx.strokeStyle = lightningColor;
                    ctx.lineWidth = 11 - trail * 2;
                    ctx.beginPath();
                    ctx.moveTo(-10 + thrust - trail * 13, 0);
                    ctx.lineTo(102 + thrust - trail * 13, 0);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = lightningColor;
            ctx.shadowBlur = charged ? 18 : 11;
            ctx.shadowColor = lightningColor;
            ctx.lineWidth = charged ? 4 : 3;
            const arcCount = this.raigoChargeTimer > 0 ? 3 : (this.attackState === 'active' ? 2 : 1);
            for (let arc = 0; arc < arcCount; arc++) {
                ctx.beginPath();
                ctx.moveTo(4 + thrust, -5 + arc * 4);
                for (let step = 1; step <= 6; step++) {
                    const boltX = 4 + thrust + step * 16;
                    const boltY = Math.sin(time * 4 + arc * 2.3 + step * 2.8) * (charged ? 8 : 5);
                    ctx.lineTo(boltX, boltY);
                }
                ctx.stroke();
            }

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#35515a';
            ctx.fillRect(-15 + thrust, -5, 22, 10);
            ctx.fillStyle = coreColor;
            ctx.fillRect(4 + thrust, -3, 92, 6);
            ctx.fillStyle = lightningColor;
            ctx.fillRect(12 + thrust, -1, 78, 2);
            ctx.beginPath();
            ctx.moveTo(118 + thrust, 0);
            ctx.lineTo(92 + thrust, -14);
            ctx.lineTo(98 + thrust, 0);
            ctx.lineTo(92 + thrust, 14);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = coreColor;
            ctx.beginPath();
            ctx.moveTo(112 + thrust, 0);
            ctx.lineTo(96 + thrust, -7);
            ctx.lineTo(101 + thrust, 0);
            ctx.lineTo(96 + thrust, 7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        else if (this.heroName === 'Volt') {
            ctx.save(); ctx.translate(hw, 25);
            let recoil = this.attackState === 'active' ? -0.3 * Math.sin(phaseProg * Math.PI) : 0;
            ctx.rotate(recoil); ctx.fillStyle = "#222"; ctx.fillRect(0, -5, 25, 10); ctx.fillStyle = "#00FFFF"; ctx.fillRect(25, -2, 8, 4); ctx.restore();
        }
        else if (this.heroName === 'Duke') {
            ctx.save(); ctx.translate(hw, 25);
            if (this.isMounted) {
                let thrust = this.attackState === 'active' ? 40 * Math.sin(phaseProg * Math.PI) : 0;
                ctx.fillStyle = "#654321"; ctx.fillRect(0, 5, 80 + thrust, 4); ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.moveTo(80+thrust, 3); ctx.lineTo(100+thrust, 7); ctx.lineTo(80+thrust, 11); ctx.fill();
            } else {
                let angle = 0;
                if (this.attackState === 'windup') angle = -1.0 * phaseProg; else if (this.attackState === 'active') angle = -1.0 + (3.0 * phaseProg); else if (this.attackState === 'recovery') angle = 2.0 - (2.0 * phaseProg);
                ctx.rotate(angle);
                if (this.attackState === 'active') { ctx.beginPath(); ctx.arc(0, 0, 60, -1.0, angle); ctx.lineWidth = 10; ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.stroke(); }
                ctx.fillStyle = "#eee"; ctx.fillRect(-2, -60, 4, 60); ctx.fillStyle = "#d4af37"; ctx.fillRect(-6, 0, 12, 4);
            }
            ctx.restore();
        }
        else if (this.heroName === 'Hunter') {
            if (this.hunterWeapon === 'musket') {
                ctx.save(); ctx.translate(hw - 15, 25);
                let recoil = this.attackState === 'active' ? -0.2 * Math.sin(phaseProg * Math.PI) : 0;
                ctx.rotate(recoil); ctx.fillStyle = "#5c2e0e"; ctx.fillRect(-15, 0, 50, 8); ctx.fillStyle = "#222"; ctx.fillRect(20, -2, 35, 5); ctx.restore();
            } else {
                ctx.save(); ctx.translate(0, 20);
                let angle = -0.5;
                if (this.attackState === 'windup') angle = -0.5 - (1.5 * phaseProg); else if (this.attackState === 'active') angle = -2.0 + (3.5 * phaseProg); else if (this.attackState === 'recovery') angle = 1.5 - (2.0 * phaseProg);
                ctx.rotate(angle);
                if (this.attackState === 'active') { ctx.beginPath(); ctx.arc(0, 0, 75, -2.0, angle); ctx.lineWidth = 15; ctx.strokeStyle = "rgba(100, 200, 255, 0.4)"; ctx.stroke(); }
                ctx.fillStyle = "#d3d3d3"; ctx.fillRect(-8, -75, 16, 80); ctx.fillStyle = "#8b4513"; ctx.fillRect(-6, 5, 12, 20); ctx.fillStyle = "#ffd700"; ctx.fillRect(-12, 1, 24, 4); ctx.restore();
            }
        }
        else if (this.heroName === 'Macu') {
            ctx.save(); ctx.translate(0, 20);
            let enemy = game.getEnemyOf(this);
            if (enemy) {
                let mx = this.x + this.w/2; let my = this.y + 20; let ex = enemy.x + enemy.w/2; let ey = enemy.y + enemy.h/2;
                let rDx = (ex - mx) * this.facing; let rDy = ey - my; let baseAimAngle = Math.atan2(rDy, rDx);
                if (baseAimAngle > Math.PI/3) baseAimAngle = Math.PI/3; if (baseAimAngle < -Math.PI/3) baseAimAngle = -Math.PI/3;
                let thrust = 0; let angle = baseAimAngle;
                if (this.attackState === 'windup') { thrust = -30 * phaseProg; angle = baseAimAngle - (0.2 * phaseProg); }
                else if (this.attackState === 'active') { thrust = -30 + (140 * Math.sin(phaseProg * Math.PI)); angle = baseAimAngle; }
                else if (this.attackState === 'recovery') { thrust = 0; angle = baseAimAngle; }
                ctx.rotate(angle);
                if (this.attackState === 'active') { ctx.fillStyle = "rgba(200, 255, 200, 0.5)"; ctx.fillRect(-2, -50 - thrust, 4, thrust + 20); }
                ctx.fillStyle = "#8B4513"; ctx.fillRect(-3, -50 - thrust, 6, 110 + (this.attackState === 'active' ? 40 : 0));
                ctx.fillStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(0, -50 - thrust); ctx.lineTo(-6, -75 - thrust - (this.attackState==='active'?40:0)); ctx.lineTo(6, -75 - thrust - (this.attackState==='active'?40:0)); ctx.fill();
            }
            ctx.restore();
        }
        else if (this.heroName === 'Artu') {
            ctx.save(); ctx.translate(0, 25); let angle = 0;
            if (this.attackState === 'idle') { ctx.fillStyle = "#222"; ctx.fillRect(-6, 0, 8, 50); ctx.fillStyle = "#d4af37"; ctx.fillRect(-10, 0, 16, 4); }
            else {
                if (this.attackState === 'windup') angle = -1.0 * phaseProg; else if (this.attackState === 'active') angle = -1.0 + (3.0 * phaseProg); else if (this.attackState === 'recovery') angle = 2.0 - (2.0 * phaseProg);
                ctx.fillStyle = "#222"; ctx.fillRect(-6, 0, 8, 50); ctx.rotate(angle);
                if (this.attackState === 'active') { ctx.beginPath(); ctx.arc(0, 0, 60, -1.0, angle); ctx.lineWidth = 10; ctx.strokeStyle = "rgba(255, 200, 100, 0.4)"; ctx.stroke(); }
                ctx.fillStyle = "#eee"; ctx.fillRect(-2, -60, 4, 60); ctx.fillStyle = "#d4af37"; ctx.fillRect(-6, 0, 12, 4); ctx.fillStyle = "#111"; ctx.fillRect(-3, 4, 6, 15);
            } ctx.restore();
        }
        else if (this.heroName === 'Willi') {
            ctx.save(); ctx.translate(hw, 20); let angle = 0;
            if (this.attackState !== 'idle') {
                if (this.attackState === 'windup') angle = (-Math.PI/2) * phaseProg; else if (this.attackState === 'active') angle = -Math.PI/2 + (Math.PI * phaseProg); else if (this.attackState === 'recovery') angle = Math.PI/2 - ((Math.PI/2) * phaseProg);
                ctx.rotate(angle); ctx.fillStyle = "#1a1a1a"; ctx.fillRect(-4, 0, 8, 20);
                if (this.attackState === 'windup') { ctx.fillStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-4, 30); ctx.lineTo(4, 30); ctx.fill(); }
            } ctx.restore();
        }
        else if (this.heroName === 'Gensan') {
            ctx.save(); ctx.translate(0, 20);
            let angle = -0.5;
            let r = this.gensanCombo === 3 ? 85 : 65;
            if (this.attackState === 'windup') angle = -0.5 - (1.5 * phaseProg);
            else if (this.attackState === 'active') angle = -2.0 + (3.5 * phaseProg);
            else if (this.attackState === 'recovery') angle = 1.5 - (2.0 * phaseProg);
            ctx.rotate(angle);
            if (this.attackState === 'active') {
                ctx.beginPath(); ctx.arc(0, 0, r, -2.0, angle);
                ctx.lineWidth = 15;
                ctx.strokeStyle = this.gensanCombo === 3 ? "rgba(255, 255, 255, 0.8)" : "rgba(200, 200, 200, 0.4)";
                ctx.stroke();
            }
            ctx.fillStyle = "#ddd"; ctx.fillRect(-4, -60, 8, 80);
            ctx.fillStyle = "#8b4513"; ctx.fillRect(-6, 10, 12, 15);
            ctx.restore();
        }
        else if (this.heroName === 'Euclid') {
            if (this.euclidWeapon === 'sword') {
                ctx.save(); ctx.translate(hw, 25); let angle = 0;
                if (this.attackState === 'windup') angle = -1.0 * phaseProg;
                else if (this.attackState === 'active') angle = -1.0 + (3.0 * phaseProg);
                else if (this.attackState === 'recovery') angle = 2.0 - (2.0 * phaseProg);
                ctx.rotate(angle);
                if (this.attackState === 'active') { ctx.beginPath(); ctx.arc(0, 0, 50, -1.0, angle); ctx.lineWidth = 8; ctx.strokeStyle = "rgba(138, 43, 226, 0.4)"; ctx.stroke(); }
                ctx.fillStyle = "#8A2BE2"; ctx.fillRect(-2, -50, 4, 50); ctx.fillStyle = "#fff"; ctx.fillRect(-6, 0, 12, 4);
                ctx.restore();
            }
        }
        else if (this.heroName === 'Kae') {
            ctx.save(); ctx.translate(hw, 25);
            let thrust = 0;
            if (this.attackState === 'windup') thrust = 10 * phaseProg;
            else if (this.attackState === 'active') thrust = 35 * Math.sin(phaseProg * Math.PI);

            if (this.attackState !== 'idle') {
                ctx.fillStyle = this.kaeAwakened ? "rgba(255, 0, 0, 0.8)" : "rgba(0, 255, 255, 0.8)";
                ctx.fillRect(0, -5, thrust, 10);

                if (this.attackState === 'active') {
                    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(thrust/2, (Math.random()-0.5)*15); ctx.lineTo(thrust, 0); ctx.stroke();
                }
            }
            ctx.restore();
        }
        else if (this.heroName === 'Lique') {
            let drawHatchet = (angleOffset) => {
                ctx.save();
                ctx.rotate(angleOffset);
                ctx.fillStyle = "#5c2e0b"; ctx.fillRect(-3, -5, 6, 35);
                ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(15, -15); ctx.lineTo(18, 5); ctx.lineTo(-3, 10); ctx.fill();
                ctx.restore();
            };

            ctx.save(); ctx.translate(hw, 20);
            let angle = 0;
            if (this.attackState === 'windup') angle = -1.0 * phaseProg;
            else if (this.attackState === 'active') angle = -1.0 + (3.0 * phaseProg);
            else if (this.attackState === 'recovery') angle = 2.0 - (2.0 * phaseProg);

            if (this.attackState === 'active') {
                ctx.beginPath();
                ctx.arc(0, 0, 55, -1.0, angle);
                ctx.lineWidth = 15;
                ctx.strokeStyle = this.buffs.bloodFrenzy > 0 ? "rgba(220, 20, 20, 0.7)" : "rgba(220, 220, 220, 0.5)";
                ctx.stroke();
            }

            drawHatchet(angle);

            if (this.buffs.bloodFrenzy > 0) {
                ctx.translate(-this.w, 0);
                if (this.attackState === 'active') {
                    ctx.beginPath();
                    ctx.arc(0, 0, 55, -1.0 + Math.PI/4, angle + Math.PI/4);
                    ctx.lineWidth = 15;
                    ctx.strokeStyle = "rgba(255, 50, 50, 0.7)";
                    ctx.stroke();
                }
                drawHatchet(angle + Math.PI/4);
            }
            ctx.restore();
        }
        else if (this.heroName === 'Noae') {
            ctx.save(); ctx.translate(hw, 20);
            let angle = 0;
            if (this.attackState === 'windup') angle = -1.0 * phaseProg;
            else if (this.attackState === 'active') angle = -1.0 + (3.0 * phaseProg);
            else if (this.attackState === 'recovery') angle = 2.0 - (2.0 * phaseProg);
            ctx.rotate(angle);
            ctx.fillStyle = "#8B4513"; ctx.fillRect(-3, -20, 6, 40);
            ctx.fillStyle = "#A9A9A9";
            ctx.beginPath(); ctx.moveTo(-15, -15); ctx.quadraticCurveTo(0, -30, 15, -15); ctx.lineTo(15, -10); ctx.quadraticCurveTo(0, -20, -15, -10); ctx.fill();
            ctx.restore();
        }
        else if (this.heroName === 'Wolf') {
            ctx.save(); ctx.translate(hw, 25);
            let thrust = this.attackState === 'active' ? 30 * Math.sin(phaseProg * Math.PI) : 0;
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            if (this.attackState === 'active') {
                ctx.fillRect(0, -10, thrust, 4);
                ctx.fillRect(0, 0, thrust + 10, 4);
                ctx.fillRect(0, 10, thrust, 4);
            }
            ctx.restore();
        }

        ctx.restore();

        if (this.buffs.poison > 0) { ctx.fillStyle = "rgba(0, 255, 0, 0.3)"; ctx.fillRect(this.x, this.y, this.w, this.h); }

        if (this.heroName === 'Duke' && this.isMounted && this.runTimer >= 3000) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = 2; ctx.strokeRect(this.x-2, this.y-2, this.w+4, this.h+4);
        }

        if (this.heroName === 'Willi' && this.williHealBuffTimer > 0) {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.6)"; ctx.lineWidth = 3; ctx.strokeRect(this.x-2, this.y-2, this.w+4, this.h+4);
        }

        if (this.heroName === 'Itan' && this.buffs.nuMode > 0) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#ff3030";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#ff3030";
            ctx.strokeRect(this.x - 5, this.y - 5, this.w + 10, this.h + 10);
            ctx.shadowBlur = 0;
        }

        if (revealOwnedKuro) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#ff2d2d";
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 5, this.y - 5, this.w + 10, this.h + 10);
        }

        if (!kuroFullyInvisible) {
            ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 12, this.w, 5);
            ctx.fillStyle = "#4caf50"; ctx.fillRect(this.x, this.y - 12, this.w * (this.hp / this.maxHp), 5);
        }
        ctx.globalAlpha = 1.0;
    }
}
