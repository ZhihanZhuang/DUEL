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

        this.buffs = { poison: 0, battleCry: 0, shade: 0, dizzy: 0, slow: 0, hurricaneSlow: false, bloodFrenzy: 0, burn: 0, msBoost: 0, bleed: 0, bleedTick: 0 };
        this.invincible = 0; this.lastJumpTime = 0;
        this.flipActive = 0; this.hasHitFlip = false; this.hasFlipped = false;
        this.grapplePhase = 0; this.grappleTimer = 0;
        this.grappledBy = null;
        this.flipCooldown = 0;
        this.timeSinceLastDamage = 0;
        this.flightDisabled = false;

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
    }

    takeDamage(amt, attacker, isDoT = false, noKnockback = false) {
        if (this.dead || this.invincible > 0) return;

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
        this.stunTimer = 150;
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
            game.endGame(this.isP1 ? "Player 2" : "Player 1");
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

    update(dt) {
        if (this.dead) return;

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

        if (this.waterStunImmunity > 0) this.waterStunImmunity -= dt;
        if (this.kilaSwitchCD > 0) this.kilaSwitchCD -= dt;

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
        let canAct = (this.stunTimer <= 0 && this.buffs.dizzy <= 0 && this.grapplePhase !== 1 && this.superWindupTimer <= 0 && this.euclidSwitchTimer <= 0 && !isKilaSwitching);
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

        if (this.buffs.msBoost > 0) currentSpeed *= (this.heroName === 'Wolf' ? 1.3 : 1.2);

        if (this.buffs.dizzy > 0) {
            this.buffs.dizzy -= dt;
            if (this.attackState !== 'idle') this.attackState = 'idle';
            if (this.heroName === 'Volt') this.flightDisabled = true;
        }
        if (this.buffs.slow > 0) {
            this.buffs.slow -= dt; currentSpeed *= 0.5;
            if(Math.random()<0.1) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#add8e6", (Math.random()-0.5)*2, -2, 300));
        }
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

        if (this.superCooldown > 0) this.superCooldown -= dt;
        if (this.stunTimer > 0) this.stunTimer -= dt;
        if (this.hunterMusketCD > 0) this.hunterMusketCD -= dt;

        if (this.hasonSuperWindow > 0) { this.hasonSuperWindow -= dt; if (this.hasonSuperWindow <= 0) this.hasonSuperCharges = 0; }
        if (this.williSuperWindow > 0) { this.williSuperWindow -= dt; if (this.williSuperWindow <= 0) this.williSuperCharges = 0; }

        let applyGravity = true;

        if (this.heroName === 'Volt' && !this.isOverloaded && (this.overdriveTimer > 0 || this.energy > 0) && canAct && !this.flightDisabled) {
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
        if (this.heroName === 'Willi' && this.invincible > 0) {
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

        this.vx += (targetVx - this.vx) * friction;

        if (canAct && this.flipActive <= 0) {
            if (this.attackState === 'windup') {
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
                        if (this.heroName === 'Kae') activeTime = 100;
                        if (this.heroName === 'Ugo') activeTime = 100;
                        if (this.heroName === 'Kila') activeTime = 150;
                        if (this.heroName === 'Volt') activeTime = this.overdriveTimer > 0 ? 25 : 50;
                        if (this.heroName === 'Gensan') activeTime = 150;
                        if (this.heroName === 'Wolf') activeTime = 100;

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
                    let enemy = game.getEnemyOf(this);

                    let targetsHit = [];
                    if (enemy && !enemy.dead && !enemy.untargetable && checkAABB(hitBox, enemy)) {
                        enemy.takeDamage(this.getMeleeDamage(), this);
                        targetsHit.push(enemy);
                    }
                    for (let m of game.minions) {
                        if (m && m.owner !== this && !m.dead && !m.untargetable && checkAABB(hitBox, m)) {
                            m.takeDamage(this.getMeleeDamage(), this);
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
                    if (this.heroName === 'Kadaxi') recTime = 200;
                    if (this.heroName === 'Lique') recTime = this.buffs.bloodFrenzy > 0 ? 90 : 180;
                    if (this.heroName === 'Kae') recTime = this.kaeAwakened ? 100 : 200;
                    if (this.heroName === 'Ugo') recTime = 150;
                    if (this.heroName === 'Kila') recTime = 200;
                    if (this.heroName === 'Volt') recTime = this.overdriveTimer > 0 ? 75 : 150;
                    if (this.heroName === 'Gensan') recTime = 150;
                    if (this.heroName === 'Wolf') recTime = 100;

                    this.attackState = 'recovery';
                    this.stateTimer = recTime;
                    this.maxStateTimer = this.stateTimer;
                }
            } else if (this.attackState === 'recovery') {
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) this.attackState = 'idle';
            }

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
                }
            }
            if (keysPressed[this.controls.attack] && this.attackState === 'idle') {
                if (hasPuppet) {
                    activePuppet.doAttack();
                } else {
                    this.performAttack();
                }
            }
        }

        if (canAct || this.grapplePhase === 1) {
            if (keysPressed[this.controls.super] && (this.superCooldown <= 0 || (this.heroName === 'Hason' && this.hasonSuperCharges > 0) || (this.heroName === 'Willi' && this.williSuperCharges > 0) || this.grapplePhase === 1)) {
                this.performSuper();
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

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) { this.x = 0; }
        if (this.x + this.w > CANVAS_W) { this.x = CANVAS_W - this.w; }

        this.isGrounded = false; this.currentPlatform = null;

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
    }

    isMeleeAttack() {
        if (this.heroName === 'Hason' || this.heroName === 'Willi' || this.heroName === 'Ugo' || this.heroName === 'Kila' || this.heroName === 'Volt' || this.heroName === 'Noae') return false;
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

        this.attackState = 'windup';
        this.stateTimer = (this.heroName === 'Hunter' && this.hunterWeapon === 'sword') ? 200 : 100;

        if (this.heroName === 'Duke' && this.isMounted) this.stateTimer = 50;
        if (this.heroName === 'Hason') this.stateTimer = 50;
        if (this.heroName === 'Kadaxi') this.stateTimer = 100;
        if (this.heroName === 'Euclid') this.stateTimer = (this.euclidWeapon === 'sword') ? 50 : 500;
        if (this.heroName === 'Lique') this.stateTimer = this.buffs.bloodFrenzy > 0 ? 10 : 20;
        if (this.heroName === 'Kae') this.stateTimer = this.kaeAwakened ? 25 : 50;
        if (this.heroName === 'Ugo') this.stateTimer = 150;
        if (this.heroName === 'Kila') this.stateTimer = this.kilaElement === 'fire' ? 500 : (this.kilaElement === 'water' ? 250 : 500);
        if (this.heroName === 'Volt') this.stateTimer = this.overdriveTimer > 0 ? 25 : 50;
        if (this.heroName === 'Gensan') this.stateTimer = 100;
        if (this.heroName === 'Noae') this.stateTimer = 150;
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
        let target = game.getEnemyOf(this);

        if (this.heroName === 'Hason' || this.heroName === 'Willi' || this.heroName === 'Euclid' || this.heroName === 'Ugo' || this.heroName === 'Kila' || this.heroName === 'Volt' || this.heroName === 'Noae') {
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
    }

    performSuper() {
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

    draw(ctx) {
        if (this.buffs.shade > 0) ctx.globalAlpha = 0.15;
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

        ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 12, this.w, 5);
        ctx.fillStyle = "#4caf50"; ctx.fillRect(this.x, this.y - 12, this.w * (this.hp / this.maxHp), 5);
    }
}