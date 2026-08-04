/**
 * Otokojuku: Legends Duel
 * Entities & Minions
 */

class Entity {
    constructor(x, y, w, h) {
        this.x = x || 0;
        this.y = y || 0;
        this.w = w || 0;
        this.h = h || 0;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.untargetable = false;
    }
    update(dt) {} draw(ctx) {}
    takeDamage(amt, attacker, isDoT = false, noKnockback = false) {}
}

class Particle extends Entity {
    constructor(x, y, color, vx, vy, life, size=4) {
        super(x, y, size, size);
        this.color = color; this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
        this.untargetable = true;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy; this.vy += GRAVITY * 0.5;
        this.life -= dt; if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.globalAlpha = 1.0;
    }
}

class SwordShadow extends Entity {
    constructor(owner, x, y) {
        super(x, y, 40, 70);
        this.owner = owner;
        this.type = "sword_shadow";
        this.life = 20000;
        this.maxLife = 20000;
        this.facing = owner.facing;
        this.hp = 10;
        this.maxHp = 10;
        this.untargetable = false;
        this.buffs = {};
    }
    takeDamage(amt, attacker) {
        this.hp -= amt;
        if (this.hp <= 0) {
            this.dead = true;
            for(let i=0; i<15; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#fff", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 400));
        }
    }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
        if (Math.random() < 0.1) {
            game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#fff", 0, -2, 400, 2));
        }
    }
    draw(ctx) {
        ctx.globalAlpha = (this.life / this.maxLife) * 0.5;
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        if (this.facing === -1) ctx.scale(-1, 1);
        ctx.translate(0, -this.h/2);

        ctx.fillStyle = "#fff";
        ctx.fillRect(-this.w/2, 0, this.w, this.h);
        ctx.fillStyle = "#222";
        ctx.fillRect(this.w/2 - 12, 10, 8, 8);
        ctx.fillStyle = "#ddd";
        ctx.fillRect(-this.w/2-2, -50, 4, 50);

        ctx.restore();

        ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 12, this.w, 4);
        ctx.fillStyle = "#fff"; ctx.fillRect(this.x, this.y - 12, this.w * Math.max(0, this.hp/this.maxHp), 4);

        ctx.globalAlpha = 1.0;
    }
}

class KuroDecoy extends Entity {
    constructor(owner, x, y) {
        super(x, y, owner.w, owner.h);
        this.owner = owner;
        this.type = "kuro_decoy";
        this.hp = 1;
        this.maxHp = 1;
        this.life = 6000;
        this.maxLife = this.life;
        this.facing = owner.facing;
        this.isGrounded = !!owner.isGrounded;
        this.attackState = 'idle';
        this.buffs = {};
        this.speed = Math.max(2.8, (owner.baseSpeed || 5.2) * 0.78);
        this.moveDirection = Math.random() < 0.5 ? -1 : 1;
        this.moveTimer = 450 + Math.random() * 750;
        this.jumpTimer = 650 + Math.random() * 950;
    }
    takeDamage(amt) {
        if (this.dead) return;
        this.hp -= Math.max(0, amt || 0);
        if (this.hp <= 0) {
            this.dead = true;
            for (let i = 0; i < 14; i++) {
                game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, "#9ad8c0", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 350, 3));
            }
        }
    }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            this.dead = true;
            return;
        }

        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            const movementRoll = Math.random();
            this.moveDirection = movementRoll < 0.16 ? 0 : (movementRoll < 0.58 ? -1 : 1);
            this.moveTimer = 450 + Math.random() * 850;
        }

        this.jumpTimer -= dt;
        if (this.isGrounded && this.jumpTimer <= 0) {
            if (Math.random() < 0.62) {
                this.vy = -(this.owner.baseJump || 14) * 0.82;
                this.isGrounded = false;
            }
            this.jumpTimer = 650 + Math.random() * 1100;
        }

        if (this.moveDirection) {
            this.vx = this.moveDirection * this.speed;
            this.facing = this.moveDirection;
        } else {
            this.vx *= 0.72;
            if (Math.abs(this.vx) < 0.2) this.vx = 0;
        }

        this.x += this.vx;
        if (this.x <= 0 || this.x + this.w >= CANVAS_W) {
            this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x));
            this.moveDirection = this.x <= 0 ? 1 : -1;
            this.facing = this.moveDirection;
        }

        const previousBottom = this.y + this.h;
        this.vy += GRAVITY;
        this.y += this.vy;
        this.isGrounded = false;
        if (this.vy >= 0) {
            for (const platform of PLATFORMS) {
                if (previousBottom <= platform.y && this.y + this.h >= platform.y && this.x + this.w > platform.x && this.x < platform.x + platform.w) {
                    this.y = platform.y - this.h;
                    this.vy = 0;
                    this.isGrounded = true;
                    break;
                }
            }
        }
        if (this.y + this.h >= GROUND_Y) {
            this.y = GROUND_Y - this.h;
            this.vy = 0;
            this.isGrounded = true;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.18, this.life / this.maxLife * 0.72);
        ctx.translate(this.x + this.w/2, this.y);
        if (this.facing === -1) ctx.scale(-1, 1);
        ctx.fillStyle = "#18352b";
        ctx.fillRect(-this.w/2, 0, this.w, this.h);
        ctx.fillStyle = "#d8e8df";
        ctx.fillRect(-this.w/2 + 6, 9, this.w - 12, 11);
        ctx.fillStyle = "#17221d";
        ctx.fillRect(-this.w/2, 25, this.w, 8);
        ctx.fillStyle = "#26342d";
        ctx.fillRect(this.w/2 - 4, 25, 62, 5);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.w/2 + 35, 22, 4, 4);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#080d0b";
        ctx.fillRect(this.x - 1, this.y - 13, this.w + 2, 7);
        ctx.fillStyle = "#9b1c2e";
        ctx.fillRect(this.x, this.y - 12, this.w, 5);
        ctx.fillStyle = "#4caf50";
        ctx.fillRect(this.x, this.y - 12, this.w * Math.max(0, this.hp / this.maxHp), 5);
        ctx.restore();
    }
}

class GiantSword extends Entity {
    constructor(owner, x, y) {
        super(x, y, 60, 150);
        this.owner = owner;
        this.vy = 25;
        this.damageDealt = false;
        this.hitTargets = new Set();
        this.untargetable = true;
        this.life = 1000;
    }
    getTargets() {
        return [
            ...game.getOpponentsOf(this.owner),
            ...game.minions.filter(minion => minion && minion !== this && minion.owner !== this.owner && !minion.untargetable)
        ].filter(target => target && !target.dead && !(target.invincible > 0));
    }
    isOnArenaFloor(target) {
        return target.y + target.h >= GROUND_Y - 3;
    }
    hitTarget(target) {
        if (this.hitTargets.has(target)) return;
        target.takeDamage(90, this.owner);
        this.hitTargets.add(target);
        if (!target.dead && this.isOnArenaFloor(target) && target.buffs) {
            target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 5000);
        }
    }
    damageGroundImpact() {
        const impactX = this.x + this.w/2;
        const impactY = this.y + this.h;
        for (const target of this.getTargets()) {
            const distance = Math.hypot(target.x + target.w/2 - impactX, target.y + target.h/2 - impactY);
            if (distance > 150) continue;
            this.hitTarget(target);
            if (!target.dead && this.isOnArenaFloor(target) && target.buffs) {
                target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 5000);
            }
        }
    }
    update(dt) {
        if (this.life <= 0) { this.dead = true; return; }

        if (!this.damageDealt) {
            const previousY = this.y;
            this.y += this.vy;
            let hitGround = false;
            if (this.y + this.h >= GROUND_Y) {
                this.y = GROUND_Y - this.h;
                hitGround = true;
            }

            const sweptHitbox = {
                x: this.x,
                y: previousY,
                w: this.w,
                h: this.h + Math.max(0, this.y - previousY)
            };
            for (const target of this.getTargets()) {
                if (checkAABB(sweptHitbox, target)) this.hitTarget(target);
            }

            if (hitGround) {
                this.damageDealt = true;
                this.damageGroundImpact();
                for(let i=0; i<30; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h, "#fff", (Math.random()-0.5)*20, -Math.random()*15, 600));
            }
        } else {
            this.life -= dt;
        }
    }
    draw(ctx) {
        ctx.globalAlpha = this.damageDealt ? this.life / 1000 : 1;
        ctx.fillStyle = "#fff";
        ctx.fillRect(this.x + 20, this.y, 20, this.h);
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(this.x + 10, this.y + 20, 40, 10);
        ctx.globalAlpha = 1.0;
    }
}

class LandMine extends Entity {
    constructor(owner, x, y) {
        super(x, y, 20, 10);
        this.owner = owner;
        this.hp = 10;
        this.maxHp = 10;
        this.type = "landmine";
        this.life = 20000;
        this.untargetable = false;
        this.blinkTimer = 0;
    }
    takeDamage(amt, attacker) {
        if (this.dead) return;
        this.explode();
    }
    explode() {
        if (this.dead) return;
        this.dead = true;
        game.createExplosion(this.x + this.w/2, this.y + this.h/2, 60, 25, this.owner, false, 400);
    }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
        this.blinkTimer += dt;

        const enemy = game.getOpponentsOf(this.owner).find(candidate =>
            Math.hypot((candidate.x + candidate.w / 2) - (this.x + this.w / 2), (candidate.y + candidate.h / 2) - (this.y + this.h / 2)) < 50
        );
        if (enemy) {
            this.explode();
        }
    }
    draw(ctx) {
        ctx.fillStyle = "#555";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        if (this.blinkTimer % 500 < 250) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x + 8, this.y - 4, 4, 4);
        }
    }
}

class Minecart extends Entity {
    constructor(owner, x, y) {
        super(x, y, 60, 40);
        this.owner = owner;
        this.facing = owner.facing;
        this.vx = this.facing * 15;
        this.life = 4500;
        this.hp = 80;
        this.maxHp = 80;
        this.untargetable = false;
        this.hitTargets = new Map();
    }
    takeDamage(amt, attacker) {
        this.hp -= amt;
        if (this.hp <= 0) {
            this.dead = true;
            game.createExplosion(this.x+this.w/2, this.y+this.h/2, 60, 10, this.owner, false);
        }
    }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) this.dead = true;

        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        let isGrounded = false;
        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; isGrounded = true; }

        if (this.vy >= 0) {
            for (let plat of PLATFORMS) {
                if (this.y + this.h - this.vy <= plat.y && this.y + this.h >= plat.y && this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                    this.y = plat.y - this.h; this.vy = 0; isGrounded = true;
                }
            }
        }

        if (this.x <= 0) {
            this.x = 0; this.vx *= -1; this.facing = 1;
            for(let i=0;i<5;i++) game.particles.push(new Particle(this.x, this.y+this.h, "#ffaa00", (Math.random())*5, -Math.random()*5, 300));
            this.hitTargets.clear();
        } else if (this.x + this.w >= CANVAS_W) {
            this.x = CANVAS_W - this.w; this.vx *= -1; this.facing = -1;
            for(let i=0;i<5;i++) game.particles.push(new Particle(this.x+this.w, this.y+this.h, "#ffaa00", -(Math.random())*5, -Math.random()*5, 300));
            this.hitTargets.clear();
        }

        let targets = [...game.getFighters(), ...game.minions].filter(t => t && t !== this && t !== this.owner && t.owner !== this.owner && !t.dead);
        for(let t of targets) {
            if (checkAABB(this, t)) {
                if (t instanceof LandMine) {
                    t.explode();
                } else if (!t.untargetable && (!this.hitTargets.has(t) || Date.now() - this.hitTargets.get(t) > 1000)) {
                    t.takeDamage(20, this.owner);
                    if (t.buffs) t.buffs.dizzy = Math.max(t.buffs.dizzy || 0, 500);
                    this.hitTargets.set(t, Date.now());
                }
            }
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        if (this.facing === -1) ctx.scale(-1, 1);

        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h - 10);
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(-this.w/2 + 15, this.h/2 - 5, 10, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.w/2 - 15, this.h/2 - 5, 10, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = "#ffd700";
        ctx.fillRect(-10, -this.h/2 - 5, 20, 10);

        ctx.restore();

        ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 10, this.w, 4);
        ctx.fillStyle = "#00ff00"; ctx.fillRect(this.x, this.y - 10, this.w * (this.hp/this.maxHp), 4);
    }
}

class Hazard extends Entity {
    constructor(x, y, w, h, delay, duration, damage, owner, color, ccDuration = 0) {
        super(x, y, w, h);
        this.delay = delay;
        this.duration = duration;
        this.damage = damage;
        this.owner = owner;
        this.color = color;
        this.ccDuration = ccDuration;
        this.hitTargets = new Set();
        this.untargetable = true;
    }
    update(dt) {
        if (this.delay > 0) {
            this.delay -= dt;
            return;
        }
        this.duration -= dt;
        if (this.duration <= 0) {
            this.dead = true;
            return;
        }
        let targets = [...game.getFighters(), ...game.minions].filter(t => t && !t.untargetable && t !== this.owner && t.owner !== this.owner && !t.dead && !(t.invincible > 0));
        for (let t of targets) {
            if (checkAABB(this, t) && !this.hitTargets.has(t)) {
                t.takeDamage(this.damage, this.owner);
                if (this.ccDuration > 0 && t.buffs) {
                    t.buffs.dizzy = Math.max(t.buffs.dizzy || 0, this.ccDuration);
                }
                this.hitTargets.add(t);
            }
        }
    }
    draw(ctx) {
        if (this.delay > 0) {
            ctx.fillStyle = "rgba(255,0,0,0.3)";
            ctx.fillRect(this.x, this.y + this.h - 5, this.w, 5);
        } else {
            ctx.fillStyle = this.color;
            for(let i=0; i<this.w; i+=15) {
                ctx.beginPath();
                ctx.moveTo(this.x+i, this.y+this.h);
                ctx.lineTo(this.x+i+7.5, this.y);
                ctx.lineTo(this.x+i+15, this.y+this.h);
                ctx.fill();
            }
        }
    }
}

class FireDragon extends Entity {
    constructor(owner, x, y) {
        super(x, y, 40, 40);
        this.owner = owner;
        this.type = "firedragon";
        this.hp = 50;
        this.maxHp = 50;
        this.color = "#ff4500";
        this.speed = 12;
    }
    takeDamage(amt, attacker) {
        this.hp -= amt;
        if (this.hp <= 0) {
            this.dead = true;
            for(let i=0; i<20; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#ff4500", (Math.random()-0.5)*10, (Math.random()-0.5)*10, 400));
        }
    }
    update(dt) {
        let enemy = game.getEnemyOf(this.owner);
        if (enemy && !enemy.dead) {
            let dx = (enemy.x+enemy.w/2) - (this.x+this.w/2);
            let dy = (enemy.y+enemy.h/2) - (this.y+this.h/2);
            let angle = Math.atan2(dy, dx);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            this.x += this.vx; this.y += this.vy;
            game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#ff4500", -this.vx*0.5, -this.vy*0.5, 200, 5));

            if (Math.hypot(dx, dy) < 40) {
                this.dead = true;
                game.createExplosion(this.x+this.w/2, this.y+this.h/2, 80, 100, this.owner, false, 0);
            }
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x+this.w/2, this.y+this.h/2, this.w/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(this.x+this.w/2 + (this.vx>0?5:-15), this.y+this.h/2-5, 10, 10);
    }
}

class Projectile extends Entity {
    constructor(x, y, w, h, vx, vy, damage, owner, color, type="normal") {
        super(x, y, w, h);
        this.vx = vx; this.vy = vy; this.damage = damage; this.owner = owner;
        this.color = color; this.type = type; this.timer = 0;
        this.hitTargets = new Set();
        this.phantomDizzyApplied = false;
        this.returning = false;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy;

        if (this.type === "dynamite") {
            this.vy += GRAVITY;
            if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vx *= 0.8; this.vy = 0; }
            this.timer += dt;
            if (this.timer >= 1500) {
                this.dead = true;
                game.createExplosion(this.x + this.w/2, this.y + this.h/2, 120, 153, this.owner);
            }
        } else if (this.type === "chakram" || this.type === "chakram_super") {
            this.timer += dt;
            const returnDelay = this.type === "chakram_super" ? 750 : 600;
            if (!this.returning && this.timer >= returnDelay) {
                this.returning = true;
                this.hitTargets.clear();
            }
            if (this.returning && this.owner && !this.owner.dead) {
                const dx = this.owner.x + this.owner.w/2 - (this.x + this.w/2);
                const dy = this.owner.y + this.owner.h/2 - (this.y + this.h/2);
                const distance = Math.hypot(dx, dy);
                if (distance < 34) {
                    this.dead = true;
                } else {
                    const speed = this.type === "chakram_super" ? 19 : 24;
                    this.vx += (dx / Math.max(1, distance) * speed - this.vx) * 0.2;
                    this.vy += (dy / Math.max(1, distance) * speed - this.vy) * 0.2;
                }
            }
        } else if (this.type === "homing_bullet" || this.type === "magic_burst" || this.type === "volt_laser" || this.type === "tracking_bird") {
            const prioritizedTarget = this.owner?.isCPU && this.owner.aiCombatTarget && !this.owner.aiCombatTarget.dead && !this.owner.aiCombatTarget.untargetable
                ? this.owner.aiCombatTarget
                : null;
            let target = prioritizedTarget || game.getEnemyOf(this.owner);
            let minDist = target ? Math.hypot(target.x - this.x, target.y - this.y) : 9999;
            if (!prioritizedTarget) {
                for (let m of game.minions) {
                    if (m && m.owner !== this.owner && !m.dead && !m.untargetable) {
                        let d = Math.hypot(m.x - this.x, m.y - this.y);
                        if (d < minDist) { minDist = d; target = m; }
                    }
                }
            }
            if (target && !target.dead && !(target.invincible > 0)) {
                const trackingExpired = (this.type === "volt_laser" && this.timer >= 1500)
                    || (this.type === "tracking_bird" && this.timer >= 2000);
                if (!trackingExpired) {
                    let tx = target.x + target.w/2; let ty = target.y + target.h/2;
                    let angle = Math.atan2(ty - (this.y + this.h/2), tx - (this.x + this.w/2));
                    let speed = this.type === "magic_burst" ? 18 : (this.type === "volt_laser" ? 15 : (this.type === "tracking_bird" ? 18 : 25));
                    let turnSpeed = this.type === "magic_burst" ? 0.08 : (this.type === "volt_laser" ? 0.05 : (this.type === "tracking_bird" ? 0.12 : 0.15));
                    this.vx += (Math.cos(angle) * speed - this.vx) * turnSpeed;
                    this.vy += (Math.sin(angle) * speed - this.vy) * turnSpeed;
                }
            }
            this.timer += dt;
            if (this.type === "tracking_bird" && this.timer >= 6000) this.dead = true;
        } else if (this.type === "knife" || this.type === "large_knife" || this.type === "enhanced_knife" || this.type === "ki_blast" || this.type === "thrown_axe") {
            if (this.type !== "ki_blast" && this.type !== "thrown_axe") this.vy += GRAVITY * 0.1;
        }

        if (this.x < -100 || this.x > CANVAS_W + 100 || this.y > CANVAS_H || this.y < -100) this.dead = true;

        if (!this.dead && game.hurricane && !game.hurricane.dead && this.owner !== game.hurricane.owner) {
            if (checkAABB(this, game.hurricane)) {
                this.dead = true;
                for(let i=0; i<5; i++) game.particles.push(new Particle(this.x, this.y, "#aaddff", (Math.random()-0.5)*8, (Math.random()-0.5)*8, 200));
                return;
            }
        }

        if (!this.dead && this.type !== "dynamite") {
            let targets = Array.from(new Set([...game.getOpponentsOf(this.owner), ...game.minions.filter(m => m && m.owner !== this.owner)]));
            for (let t of targets) {
                if (!t || t.untargetable) continue;

                if (!t.dead && !(t.invincible > 0) && checkAABB(this, t) && !this.hitTargets.has(t)) {
                    const solaChargeDeflect = t.heroName === 'Sola' && t.solaChargeTimer > 0;
                    const canDeflect = t.heroName === 'Sola'
                        && (solaChargeDeflect || ((t.attackState === 'windup' || t.attackState === 'active') && t.isMeleeAttack?.()))
                        && (solaChargeDeflect || this.type !== 'tidal_wave');
                    if (canDeflect) {
                        this.owner = t;
                        this.hitTargets.clear();
                        this.hitTargets.add(t);
                        this.vx = Math.abs(this.vx) < 1 ? t.facing * 16 : -this.vx * 1.15;
                        this.vy = -this.vy;
                        this.x = t.facing === 1 ? t.x + t.w + 4 : t.x - this.w - 4;
                        t.solaFocus = Math.min(3, (t.solaFocus || 0) + 1);
                        for (let i = 0; i < 14; i++) {
                            game.particles.push(new Particle(this.x, this.y, '#8ffcff', (Math.random()-0.5)*18, (Math.random()-0.5)*18, 280, 4));
                        }
                        return;
                    }

                    let isBlocked = false;
                    if (t.attackState === 'active' && t.isMeleeAttack() && (t.heroName === 'Artu' || (t.heroName === 'Duke' && !t.isMounted))) {
                        if (Math.random() < 0.5) isBlocked = true;
                    }

                    if (isBlocked) {
                        for(let i=0; i<15; i++) game.particles.push(new Particle(this.x, this.y, "#ffffff", (Math.random()-0.5)*20, (Math.random()-0.5)*20, 300, 6));
                        for(let i=0; i<10; i++) game.particles.push(new Particle(this.x, this.y, "#ffd700", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 400, 4));
                    } else {
                        if (this.type === "tracking_bird") {
                            this.dead = true;
                            game.createExplosion(this.x + this.w/2, this.y + this.h/2, 180, 70, this.owner, false, 2500);
                            return;
                        }
                        let noKnockback = (this.type === "bullet" || this.type === "homing_bullet" || this.type === "ki_blast" || this.type === "magic_burst" || this.type === "paper_plane" || this.type === "blue_paper_plane" || this.type === "fire_bolt" || this.type === "water_bolt" || this.type === "tidal_wave" || this.type === "volt_laser" || this.type === "pickaxe" || this.type === "chiq_blade" || this.type === "em_ball");
                        t.takeDamage(this.damage, this.owner, false, noKnockback);
                        if (this.damage > 0 && this.owner?.heroName === 'Archor' && typeof this.owner.onArchorHit === 'function') this.owner.onArchorHit(t);

                        if (t.buffs) {
                            if (this.type === "large_knife" || this.type === "enhanced_knife") t.buffs.slow = 5000;
                            if (this.type === "enhanced_knife") {
                                let dir = this.vx > 0 ? 1 : -1;
                                t.vx = dir * 30;
                                t.vy = -5;
                            }
                            if (this.type === "ki_blast") {
                                t.buffs.dizzy = 750;
                                let dir = this.vx > 0 ? 1 : -1;
                                t.vx = dir * 45;
                                t.vy = -8;
                            }
                            if (this.type === "fire_bolt") {
                                t.buffs.burn = 3000;
                                t.buffs.slow = 1000;
                            }
                            if (this.type === "water_bolt") {
                                if (t.waterStunImmunity <= 0) {
                                    t.buffs.dizzy = 500;
                                    t.waterStunImmunity = 1000;
                                }
                            }
                            if (this.type === "tidal_wave") {
                                t.buffs.slow = 4500;
                                t.buffs.dizzy = 1000;
                                t.vx += (this.vx > 0 ? 1 : -1) * 15;
                            }
                            if (this.type === "sniper_round_full") t.buffs.slow = Math.max(t.buffs.slow || 0, 2000);
                            if (this.type === "phantom_round" && t.heroName && !this.phantomDizzyApplied) {
                                t.buffs.dizzy = Math.max(t.buffs.dizzy || 0, 1000);
                                this.phantomDizzyApplied = true;
                            }
                            if (this.type === "chiq_blade") {
                                t.buffs.slow = Math.max(t.buffs.slow || 0, this.chiqNu ? 7000 : 3500);
                                t.buffs.bleed = Math.max(t.buffs.bleed || 0, 6000);
                            }
                        }

                        if (this.type === "bullet" && this.owner.heroName === 'Duke') {
                            this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + 50);
                            for(let i=0; i<8; i++) game.particles.push(new Particle(this.owner.x + Math.random()*this.owner.w, this.owner.y + Math.random()*this.owner.h, "#32CD32", 0, -Math.random()*4, 500, 5));
                        }
                        if (this.type === "pickaxe") {
                            for(let i=0; i<8; i++) game.particles.push(new Particle(this.x, this.y, "#888", (Math.random()-0.5)*8, (Math.random()-0.5)*8, 200, 3));
                        } else {
                            for(let i=0; i<5; i++) game.particles.push(new Particle(this.x, this.y, this.color, (Math.random()-0.5)*5, (Math.random()-0.5)*5, 300));
                        }
                    }

                    this.hitTargets.add(t);
                    const piercesMinion = this.type === "sniper_round_full" && !t.heroName;
                    const piercesEverything = this.type === "phantom_round" || this.type === "chakram" || this.type === "chakram_super";
                    if (this.type !== "blue_paper_plane" && this.type !== "tidal_wave" && !piercesMinion && !piercesEverything) {
                        this.dead = true;
                        break;
                    }
                }
            }
        }
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.type === "dynamite") {
            ctx.fillStyle = "#ff3333"; ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = "#ffff00"; ctx.fillRect(this.x + this.w/2, this.y - 5, 2, 5);
        } else if (this.type === "knife" || this.type === "large_knife" || this.type === "enhanced_knife") {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(this.vx > 0 ? this.timer*0.02 : -this.timer*0.02);
            if (this.type === "large_knife") { ctx.scale(2, 2); ctx.fillStyle = "#0ff"; }
            else if (this.type === "enhanced_knife") { ctx.scale(1.5, 1.5); ctx.fillStyle = "#ff5500"; }
            else ctx.fillStyle = "#ddd";
            ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(10, 0); ctx.lineTo(-10, 2); ctx.fill();
            ctx.restore(); this.timer += 16;

            if (this.type === "enhanced_knife") game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, "#ff5500", 0, 0, 150, 4));
        } else if (this.type === "ki_blast") {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.fillStyle = "rgba(0, 191, 255, 0.8)";
            ctx.beginPath(); ctx.ellipse(0, 0, this.w/2, this.h/2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.ellipse(0, 0, this.w/4, this.h/4, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, "#00bfff", 0, 0, 150, 6));
        } else if (this.type === "magic_burst") {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(this.timer * 0.05);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.rotate(Math.PI/4);
            ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.restore();
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, this.color, 0, 0, 150, 4));
            this.timer += 16;
        } else if (this.type === "thrown_axe") {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(this.timer * 0.05 * (this.vx > 0 ? 1 : -1));
            ctx.fillStyle = "#8B4513"; ctx.fillRect(-3, -15, 6, 30);
            ctx.fillStyle = "#ccc";
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(15, -20); ctx.lineTo(20, 0); ctx.lineTo(0, 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-15, -20); ctx.lineTo(-20, 0); ctx.lineTo(0, 5); ctx.fill();
            ctx.restore();
            this.timer += 16;
        } else if (this.type === "pickaxe") {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(this.timer * 0.02 * (this.vx > 0 ? 1 : -1));
            ctx.fillStyle = "#8B4513";
            ctx.fillRect(-3, -15, 6, 30);
            ctx.fillStyle = "#A9A9A9";
            ctx.beginPath();
            ctx.moveTo(-15, -10);
            ctx.quadraticCurveTo(0, -25, 15, -10);
            ctx.lineTo(15, -5);
            ctx.quadraticCurveTo(0, -15, -15, -5);
            ctx.fill();
            ctx.restore();
            this.timer += 16;
        } else if (this.type === "paper_plane" || this.type === "blue_paper_plane") {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y + this.h/2);
            let pAngle = Math.atan2(this.vy, this.vx);
            ctx.rotate(pAngle);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.w/2, 0);
            ctx.lineTo(-this.w/2, this.h/2);
            ctx.lineTo(-this.w/4, 0);
            ctx.lineTo(-this.w/2, -this.h/2);
            ctx.fill();
            ctx.restore();
            if (this.type === "blue_paper_plane" && Math.random() < 0.5) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#88ccff", 0, 0, 150, 3));
        } else if (this.type === "em_ball") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.fillStyle = '#dffcff';
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#35d5e8';
            ctx.beginPath(); ctx.arc(0, 0, this.w/2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#35d5e8';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, this.w/2 + 4 + Math.sin(Date.now()*0.02)*2, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, '#35d5e8', 0, 0, 120, 3));
        } else if (this.type === "fire_bolt" || this.type === "water_bolt" || this.type === "boss_fire_orb") {
            ctx.fillStyle = this.color;
            if (this.type === "boss_fire_orb") {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff5a36';
            }
            ctx.beginPath(); ctx.arc(this.x+this.w/2, this.y+this.h/2, this.w/2, 0, Math.PI*2); ctx.fill();
            game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, this.color, 0, 0, 100, 3));
            ctx.shadowBlur = 0;
        } else if (this.type === "volt_laser") {
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00FFFF";
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.shadowBlur = 0;
            game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#00FFFF", 0, 0, 100, 2));
        } else if (this.type === "tidal_wave") {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            game.particles.push(new Particle(this.x+Math.random()*this.w, this.y+Math.random()*this.h, "#fff", 0, -2, 100, 2));
        } else if (this.type === "bullet" || this.type === "homing_bullet") {
            ctx.fillStyle = this.type === "homing_bullet" ? "#ff5500" : "#fff";
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else if (this.type === "chakram" || this.type === "chakram_super") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(this.timer * 0.025);
            ctx.strokeStyle = this.type === "chakram_super" ? "#ffd166" : this.color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(0, 0, this.w/2 - 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#f4f4f4";
            ctx.fillRect(-2, -this.h/2, 4, 7);
            ctx.fillRect(-2, this.h/2 - 7, 4, 7);
            ctx.shadowBlur = 0;
            ctx.restore();
        } else if (this.type === "sniper_round" || this.type === "sniper_round_full" || this.type === "phantom_round") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.fillStyle = this.type === "phantom_round" ? "#ffffff" : (this.type === "sniper_round_full" ? "#9ad8c0" : "#d8e8df");
            ctx.shadowBlur = this.type === "phantom_round" ? 18 : 8;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fillRect(-this.w * 1.8, -1.5, this.w * 2.3, 3);
            ctx.restore();
        } else if (this.type === "archor_arrow") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.fillStyle = '#ffffa8';
            ctx.fillRect(-this.w/2, -1, this.w, 2);
            ctx.fillStyle = '#7df0aa';
            ctx.beginPath(); ctx.moveTo(this.w/2, 0); ctx.lineTo(this.w/2-7, -4); ctx.lineTo(this.w/2-7, 4); ctx.fill();
            ctx.restore();
        } else if (this.type === "tracking_bird") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.scale(1.45, 1.45);
            const wing = Math.sin(this.timer * 0.018) * 8;
            ctx.fillStyle = '#e0a800';
            ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-9, -4); ctx.lineTo(-18, -12-wing); ctx.lineTo(-5, 1); ctx.lineTo(-18, 12+wing); ctx.lineTo(-9, 4); ctx.fill();
            ctx.fillStyle = '#fff06a';
            ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(9, -5); ctx.lineTo(9, 5); ctx.fill();
            ctx.restore();
        } else if (this.type === "chiq_blade") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.fillStyle = this.chiqNu ? 'rgba(255, 48, 48, 0.34)' : 'rgba(77, 184, 255, 0.30)';
            ctx.shadowBlur = 16;
            ctx.shadowColor = this.chiqNu ? '#ff3030' : '#4db8ff';
            ctx.beginPath();
            ctx.moveTo(this.w/2, 0);
            ctx.quadraticCurveTo(0, -this.h, -this.w/2, 0);
            ctx.quadraticCurveTo(0, this.h, this.w/2, 0);
            ctx.fill();
            ctx.strokeStyle = this.chiqNu ? '#ffe0e0' : '#dff7ff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-this.w/2, 0); ctx.lineTo(this.w/2, 0); ctx.stroke();
            ctx.restore();
        } else {
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
}

class GravityWell extends Entity {
    constructor(owner, x, y) {
        super(x - 30, y - 30, 60, 60);
        this.owner = owner;
        this.type = "gravity_well";
        this.life = 5000;
        this.maxLife = this.life;
        this.tickTimer = 0;
        this.effectRadius = 430;
        this.tickDamage = 7;
        this.untargetable = true;
    }

    update(dt) {
        if (this.dead || this.life <= 0) { this.dead = true; return; }
        const activeDt = Math.min(Math.max(0, dt), this.life);
        this.life = Math.max(0, this.life - activeDt);
        this.tickTimer += activeDt;

        const centerX = this.x + this.w/2;
        const centerY = this.y + this.h/2;
        const damageTicks = Math.floor(this.tickTimer / 250);
        if (damageTicks > 0) this.tickTimer %= 250;
        const targets = Array.from(new Set([
            ...game.getOpponentsOf(this.owner),
            ...game.minions.filter(minion => minion && minion !== this && minion.owner !== this.owner && !minion.untargetable)
        ]));

        for (const target of targets) {
            if (!target || target.dead) continue;
            const dx = centerX - (target.x + target.w/2);
            const dy = centerY - (target.y + target.h/2);
            const distance = Math.hypot(dx, dy);
            if (distance > this.effectRadius) continue;
            const strength = 1 - distance / this.effectRadius;
            const frameScale = Math.min(2, activeDt / 16.67);
            target.vx += dx / Math.max(1, distance) * (0.5 + strength * 0.9) * frameScale;
            target.vy += dy / Math.max(1, distance) * (0.1 + strength * 0.22) * frameScale;
            target.vx = Math.max(-14, Math.min(14, target.vx));
            target.vy = Math.max(-12, Math.min(12, target.vy));
            if (target.buffs) target.buffs.gravitySlow = Math.max(target.buffs.gravitySlow || 0, 350);
            for (let tick = 0; tick < damageTicks && !target.dead; tick++) target.takeDamage(this.tickDamage, this.owner, true, true);
        }

        if (Math.random() < 0.35) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 70;
            game.particles.push(new Particle(centerX + Math.cos(angle)*radius, centerY + Math.sin(angle)*radius, '#a8b8ff', -Math.cos(angle)*2, -Math.sin(angle)*2, 300, 3));
        }
        if (this.life <= 0) this.dead = true;
    }

    draw(ctx) {
        const progress = Math.max(0, this.life / this.maxLife);
        const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.08;
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = `rgba(10, 12, 28, ${0.7 * progress + 0.15})`;
        ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(168, 184, 255, ${0.85 * progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(216, 75, 120, ${0.65 * progress})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

class ChiqPath extends Entity {
    constructor(owner, startX, startY, endX, endY, nuMode = false) {
        super(Math.min(startX, endX), Math.min(startY, endY) - 18, Math.abs(endX - startX), Math.abs(endY - startY) + 36);
        this.owner = owner;
        this.type = 'chiq_path';
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.nuMode = nuMode;
        this.life = 5000;
        this.maxLife = 5000;
        this.healTimer = 0;
        this.untargetable = true;
    }

    distanceToPath(target) {
        const px = target.x + target.w/2;
        const py = target.y + target.h;
        const dx = this.endX - this.startX;
        const dy = this.endY - this.startY;
        const lengthSquared = dx*dx + dy*dy;
        const projection = lengthSquared > 0
            ? Math.max(0, Math.min(1, ((px-this.startX)*dx + (py-this.startY)*dy) / lengthSquared))
            : 0;
        return Math.hypot(px - (this.startX + dx*projection), py - (this.startY + dy*projection));
    }

    update(dt) {
        if (this.dead) return;
        this.life = Math.max(0, this.life - dt);
        const targets = game.getOpponentsOf(this.owner).filter(target => target && !target.dead && !(target.invincible > 0));
        let touchingEnemy = false;
        for (const target of targets) {
            if (this.distanceToPath(target) > 24) continue;
            touchingEnemy = true;
            if (!target.buffs) target.buffs = {};
            if (this.nuMode) target.buffs.gravitySlow = Math.max(target.buffs.gravitySlow || 0, 650);
            else target.buffs.slow = Math.max(target.buffs.slow || 0, 650);
            target.buffs.bleed = Math.max(target.buffs.bleed || 0, 1500);
        }

        this.healTimer += dt;
        const healTicks = Math.floor(this.healTimer / 500);
        if (healTicks > 0) {
            this.healTimer %= 500;
            if (touchingEnemy && this.owner && !this.owner.dead) {
                const healing = (this.nuMode ? 6 : 3) * healTicks;
                this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + healing);
            }
        }
        if (this.life <= 0) this.dead = true;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const color = this.nuMode ? `rgba(255, 48, 48, ${0.55*alpha})` : `rgba(77, 184, 255, ${0.52*alpha})`;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.shadowBlur = 14;
        ctx.shadowColor = this.nuMode ? '#ff3030' : '#4db8ff';
        ctx.lineWidth = 20;
        ctx.beginPath(); ctx.moveTo(this.startX, this.startY); ctx.lineTo(this.endX, this.endY); ctx.stroke();
        ctx.strokeStyle = this.nuMode ? `rgba(255, 210, 210, ${0.8*alpha})` : `rgba(210, 245, 255, ${0.8*alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(this.startX, this.startY); ctx.lineTo(this.endX, this.endY); ctx.stroke();
        ctx.restore();
    }
}

class D2FDrone extends Entity {
    constructor(owner, x, y, formationSlot = 0) {
        super(x, y, 34, 24);
        this.owner = owner;
        this.type = 'd2f_drone';
        this.hp = 33;
        this.maxHp = 33;
        this.life = 18000;
        this.maxLife = 18000;
        this.formationSlot = formationSlot;
        this.cycleTimer = (formationSlot * 140) % 2500;
        this.laserTickTimer = 0;
        this.laserActive = false;
        this.laserTargetId = null;
        this.laserEndX = x;
        this.laserEndY = y;
        this.evading = false;
        this.moveSpeedMultiplier = 0.3;
        this.buffs = { dizzy: 0, slow: 0, burn: 0 };
        this.invincible = 0;
    }

    takeDamage(amount) {
        if (this.dead || this.invincible > 0) return;
        this.hp -= Math.max(0, amount || 0);
        if (this.hp <= 0) {
            this.dead = true;
            for (let i = 0; i < 12; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, i % 2 ? '#35d5e8' : '#ffb347', (Math.random()-0.5)*10, (Math.random()-0.5)*10, 360, 4));
        }
    }

    getTargets() {
        return Array.from(new Set([
            ...(typeof game.getOpponentsOf === 'function' ? game.getOpponentsOf(this.owner) : []),
            ...game.minions.filter(minion => minion && minion !== this && minion.owner !== this.owner && !minion.untargetable)
        ])).filter(target => target && !target.dead && !(target.invincible > 0));
    }

    getTarget() {
        const targets = this.getTargets();
        if (!targets.length) return null;
        const cx = this.x + this.w/2;
        const cy = this.y + this.h/2;
        return targets.reduce((closest, candidate) => {
            const candidateDistance = Math.hypot(candidate.x + candidate.w/2 - cx, candidate.y + candidate.h/2 - cy);
            const closestDistance = Math.hypot(closest.x + closest.w/2 - cx, closest.y + closest.h/2 - cy);
            return candidateDistance < closestDistance ? candidate : closest;
        });
    }

    findProjectileThreat() {
        let best = null;
        let bestTime = Infinity;
        const cx = this.x + this.w/2;
        const cy = this.y + this.h/2;
        for (const projectile of game.projectiles) {
            if (!projectile || projectile.dead || projectile.owner === this.owner || projectile.owner?.owner === this.owner) continue;
            const speedSquared = (projectile.vx || 0) ** 2 + (projectile.vy || 0) ** 2;
            if (speedSquared < 1) continue;
            const rx = cx - (projectile.x + projectile.w/2);
            const ry = cy - (projectile.y + projectile.h/2);
            const frames = (rx * (projectile.vx || 0) + ry * (projectile.vy || 0)) / speedSquared;
            if (frames < 0 || frames > 24) continue;
            const missX = rx - (projectile.vx || 0) * frames;
            const missY = ry - (projectile.vy || 0) * frames;
            if (Math.hypot(missX, missY) > 62 || frames >= bestTime) continue;
            best = { projectile, missX, missY };
            bestTime = frames;
        }
        return best;
    }

    beamTouches(target, startX, startY, endX, endY) {
        const px = target.x + target.w/2;
        const py = target.y + target.h/2;
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSquared = dx*dx + dy*dy;
        const projection = lengthSquared > 0
            ? Math.max(0, Math.min(1, ((px-startX)*dx + (py-startY)*dy) / lengthSquared))
            : 0;
        const closestX = startX + dx*projection;
        const closestY = startY + dy*projection;
        return Math.hypot(px - closestX, py - closestY) <= Math.max(target.w, target.h) * 0.48 + 7;
    }

    update(dt) {
        if (this.dead) return;
        this.life = Math.max(0, this.life - dt);
        if (this.life <= 0 || !this.owner || this.owner.dead) { this.dead = true; return; }
        if (this.buffs.dizzy > 0) {
            this.buffs.dizzy = Math.max(0, this.buffs.dizzy - dt);
            this.laserActive = false;
            return;
        }

        const target = this.getTarget();
        const frameScale = Math.min(2, Math.max(0.25, dt / 16.67));
        const threat = this.findProjectileThreat();
        this.evading = !!threat;

        let desiredVx = 0;
        let desiredVy = 0;
        if (threat) {
            const projectile = threat.projectile;
            const perpendicularX = -(projectile.vy || 0);
            const perpendicularY = projectile.vx || 0;
            const direction = perpendicularY === 0 ? (this.y > GROUND_Y * 0.45 ? -1 : 1) : (threat.missY >= 0 ? 1 : -1);
            const magnitude = Math.max(1, Math.hypot(perpendicularX, perpendicularY));
            desiredVx = perpendicularX / magnitude * direction * 8;
            desiredVy = perpendicularY / magnitude * direction * 10;
        } else if (target) {
            const cx = this.x + this.w/2;
            const cy = this.y + this.h/2;
            const tx = target.x + target.w/2;
            const ty = target.y + target.h/2;
            const dx = tx - cx;
            const dy = ty - cy;
            const distance = Math.hypot(dx, dy);
            const side = dx >= 0 ? -1 : 1;
            const desiredX = tx + side * (315 + (this.formationSlot % 3 - 1) * 34);
            const desiredY = Math.max(75, Math.min(GROUND_Y - 115, ty - 100 + (this.formationSlot % 4 - 1.5) * 32));
            if (distance < 275) desiredVx = -dx / Math.max(1, distance) * 7.5;
            else if (distance > 360) desiredVx = Math.max(-7.5, Math.min(7.5, (desiredX - cx) * 0.045));
            else desiredVx = Math.max(-4, Math.min(4, (desiredX - cx) * 0.025));
            desiredVy = Math.max(-7, Math.min(7, (desiredY - cy) * 0.055));
        } else if (this.owner) {
            desiredVx = Math.max(-5, Math.min(5, this.owner.x + this.owner.w/2 - (this.x + this.w/2))) * 0.08;
            desiredVy = Math.max(-5, Math.min(5, this.owner.y - 80 - this.y)) * 0.08;
        }

        desiredVx *= this.moveSpeedMultiplier;
        desiredVy *= this.moveSpeedMultiplier;
        this.vx += (desiredVx - this.vx) * 0.22 * frameScale;
        this.vy += (desiredVy - this.vy) * 0.22 * frameScale;
        this.x += this.vx * frameScale;
        this.y += this.vy * frameScale;
        this.x = Math.max(8, Math.min(CANVAS_W - this.w - 8, this.x));
        this.y = Math.max(45, Math.min(GROUND_Y - this.h - 28, this.y));

        this.cycleTimer = (this.cycleTimer + dt) % 2500;
        this.laserActive = !!target && this.cycleTimer < 2000
            && Math.hypot(target.x + target.w/2 - (this.x + this.w/2), target.y + target.h/2 - (this.y + this.h/2)) <= 620;
        if (this.laserActive) {
            const startX = this.x + this.w/2;
            const startY = this.y + this.h/2;
            this.laserTargetId = target.id || null;
            this.laserEndX = target.x + target.w/2;
            this.laserEndY = target.y + target.h/2;
            this.laserTickTimer += dt;
            const ticks = Math.floor(this.laserTickTimer / 250);
            if (ticks > 0) this.laserTickTimer %= 250;
            for (const enemy of this.getTargets()) {
                if (!this.beamTouches(enemy, startX, startY, this.laserEndX, this.laserEndY)) continue;
                for (let tick = 0; tick < ticks && !enemy.dead; tick++) enemy.takeDamage(2, this.owner, true, true, true);
            }
        } else {
            this.laserTickTimer = 0;
            this.laserTargetId = null;
        }
    }

    draw(ctx) {
        if (this.laserActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 78, 44, 0.25)';
            ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(this.x + this.w/2, this.y + this.h/2); ctx.lineTo(this.laserEndX, this.laserEndY); ctx.stroke();
            ctx.strokeStyle = '#ffec9a';
            ctx.shadowBlur = 14;
            ctx.shadowColor = '#ff5335';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(this.x + this.w/2, this.y + this.h/2); ctx.lineTo(this.laserEndX, this.laserEndY); ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        const tilt = Math.max(-0.22, Math.min(0.22, this.vx * 0.025));
        ctx.rotate(tilt);
        ctx.fillStyle = '#17252b';
        ctx.fillRect(-13, -8, 26, 16);
        ctx.fillStyle = '#35d5e8';
        ctx.fillRect(-8, -5, 16, 10);
        ctx.fillStyle = '#dffcff';
        ctx.fillRect(8, -2, 8, 4);
        ctx.strokeStyle = '#8cf4ff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(-24, -13); ctx.moveTo(16, -8); ctx.lineTo(24, -13); ctx.stroke();
        ctx.fillStyle = this.evading ? '#ffdf58' : '#35d5e8';
        ctx.fillRect(-23, -15, 8, 3);
        ctx.fillRect(15, -15, 8, 3);
        ctx.restore();

        ctx.fillStyle = '#27151a'; ctx.fillRect(this.x, this.y - 9, this.w, 3);
        ctx.fillStyle = '#35d5e8'; ctx.fillRect(this.x, this.y - 9, this.w * Math.max(0, this.hp / this.maxHp), 3);
    }
}

class D2FTargetBeacon extends Entity {
    constructor(owner, target) {
        super(target.x - 12, target.y - 18, target.w + 24, target.h + 36);
        this.owner = owner;
        this.type = 'd2f_target_beacon';
        this.targetId = target.id;
        this.life = 1000;
        this.maxLife = 1000;
        this.untargetable = true;
        this.robotSpawned = false;
    }

    getTarget() {
        if (typeof game.getFighters === 'function') {
            const fighter = game.getFighters().find(candidate => candidate && candidate.id === this.targetId);
            if (fighter) return fighter;
        }
        return (typeof game.getOpponentsOf === 'function' ? game.getOpponentsOf(this.owner) : [])
            .find(candidate => candidate && candidate.id === this.targetId) || null;
    }

    update(dt) {
        if (this.dead) return;
        const target = this.getTarget();
        if (!target || target.dead || !this.owner || this.owner.dead) { this.dead = true; return; }
        this.x = target.x - 12;
        this.y = target.y - 18;
        this.w = target.w + 24;
        this.h = target.h + 36;
        target.buffs = target.buffs || {};
        target.buffs.slow = Math.max(target.buffs.slow || 0, 280);
        this.life = Math.max(0, this.life - dt);
        if (this.life <= 0 && !this.robotSpawned) {
            this.robotSpawned = true;
            game.minions.push(new D2FGiantRobot(this.owner, target));
            this.dead = true;
        }
    }

    draw(ctx) {
        if (Math.floor(this.life / 100) % 2 !== 0) return;
        const cx = this.x + this.w/2;
        const cy = this.y + this.h/2;
        const radius = Math.max(this.w, this.h) * 0.62;
        ctx.save();
        ctx.strokeStyle = '#ff334f';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff334f';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-radius-10, cy); ctx.lineTo(cx-radius/2, cy); ctx.moveTo(cx+radius/2, cy); ctx.lineTo(cx+radius+10, cy); ctx.moveTo(cx, cy-radius-10); ctx.lineTo(cx, cy-radius/2); ctx.moveTo(cx, cy+radius/2); ctx.lineTo(cx, cy+radius+10); ctx.stroke();
        ctx.restore();
    }
}

class D2FGiantRobot extends Entity {
    constructor(owner, target) {
        const spawnX = Math.max(0, Math.min(CANVAS_W - 88, target.x + target.w/2 - 44));
        super(spawnX, Math.max(-112, target.y - 330), 88, 112);
        this.owner = owner;
        this.type = 'd2f_giant_robot';
        this.hp = 150;
        this.maxHp = 150;
        this.life = 14000;
        this.maxLife = 14000;
        this.targetId = target.id;
        this.dropping = true;
        this.landingImpactDone = false;
        this.isGrounded = false;
        this.attackCooldown = 0;
        this.facing = target.x >= spawnX ? 1 : -1;
        this.vy = 5;
        this.buffs = { dizzy: 0, slow: 0, burn: 0 };
        this.invincible = 0;
    }

    takeDamage(amount) {
        if (this.dead || this.invincible > 0) return;
        this.hp -= Math.max(0, amount || 0);
        if (this.hp <= 0) {
            this.dead = true;
            for (let i = 0; i < 22; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, i % 2 ? '#35d5e8' : '#ffb347', (Math.random()-0.5)*14, (Math.random()-0.5)*14, 500, 6));
        }
    }

    getTarget() {
        const fighters = typeof game.getOpponentsOf === 'function' ? game.getOpponentsOf(this.owner) : [];
        const preferred = fighters.find(candidate => candidate && candidate.id === this.targetId && !candidate.dead);
        if (preferred) return preferred;
        const targets = Array.from(new Set([
            ...fighters,
            ...game.minions.filter(minion => minion && minion !== this && minion.owner !== this.owner && !minion.untargetable)
        ])).filter(target => target && !target.dead && !(target.invincible > 0));
        if (!targets.length) return null;
        const cx = this.x + this.w/2;
        const cy = this.y + this.h/2;
        return targets.reduce((closest, candidate) => Math.hypot(candidate.x+candidate.w/2-cx, candidate.y+candidate.h/2-cy) < Math.hypot(closest.x+closest.w/2-cx, closest.y+closest.h/2-cy) ? candidate : closest);
    }

    impact() {
        if (this.landingImpactDone) return;
        this.landingImpactDone = true;
        const hitbox = { x: this.x - 35, y: this.y + this.h - 68, w: this.w + 70, h: 78 };
        const targets = Array.from(new Set([
            ...(typeof game.getOpponentsOf === 'function' ? game.getOpponentsOf(this.owner) : []),
            ...game.minions.filter(minion => minion && minion !== this && minion.owner !== this.owner && !minion.untargetable)
        ]));
        for (const target of targets) {
            if (!target || target.dead || target.invincible > 0 || !checkAABB(hitbox, target)) continue;
            target.takeDamage(42.5, this.owner);
            target.buffs = target.buffs || {};
            target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 750);
        }
        for (let i = 0; i < 34; i++) game.particles.push(new Particle(this.x + this.w/2, this.y + this.h, i % 2 ? '#35d5e8' : '#dffcff', (Math.random()-0.5)*18, -Math.random()*12, 520, 6));
    }

    update(dt) {
        if (this.dead) return;
        this.life = Math.max(0, this.life - dt);
        if (this.life <= 0 || !this.owner || this.owner.dead) { this.dead = true; return; }
        if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        if (this.buffs.dizzy > 0) {
            this.buffs.dizzy = Math.max(0, this.buffs.dizzy - dt);
            return;
        }

        const frameScale = Math.min(2, Math.max(0.25, dt / 16.67));
        const target = this.getTarget();
        if (this.dropping) {
            if (target) this.x += Math.max(-4, Math.min(4, target.x + target.w/2 - (this.x + this.w/2))) * frameScale;
            const previousBottom = this.y + this.h;
            this.vy += GRAVITY * 1.6 * frameScale;
            this.y += this.vy * frameScale;
            let landingY = GROUND_Y;
            for (const platform of PLATFORMS) {
                const crosses = previousBottom <= platform.y && this.y + this.h >= platform.y;
                const overlaps = this.x + this.w > platform.x && this.x < platform.x + platform.w;
                if (crosses && overlaps) landingY = Math.min(landingY, platform.y);
            }
            if (this.y + this.h >= landingY) {
                this.y = landingY - this.h;
                this.vy = 0;
                this.dropping = false;
                this.isGrounded = true;
                this.impact();
            }
            return;
        }

        this.isGrounded = false;
        const previousBottom = this.y + this.h;
        this.vy += GRAVITY * frameScale;
        if (target) {
            const dx = target.x + target.w/2 - (this.x + this.w/2);
            const dy = target.y + target.h/2 - (this.y + this.h/2);
            this.facing = dx >= 0 ? 1 : -1;
            this.vx += (this.facing * (Math.abs(dx) > 62 ? 4.4 : 0) - this.vx) * 0.24 * frameScale;
            if (this.vy >= 0 && Math.abs(this.vy) < 0.8 && (dy < -55 || (Math.abs(dx) > 120 && Math.abs(dx) < 260))) this.vy = -13;
            if (Math.abs(dx) < 82 && Math.abs(dy) < 95 && this.attackCooldown <= 0) {
                target.takeDamage(14, this.owner);
                this.attackCooldown = 850;
                for (let i = 0; i < 10; i++) game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, '#35d5e8', this.facing*(2+Math.random()*5), (Math.random()-0.5)*7, 260, 4));
            }
        } else {
            this.vx *= 0.82;
        }

        this.x += this.vx * frameScale;
        this.y += this.vy * frameScale;
        let landingY = GROUND_Y;
        if (this.vy >= 0) {
            for (const platform of PLATFORMS) {
                const crosses = previousBottom <= platform.y && this.y + this.h >= platform.y;
                const overlaps = this.x + this.w > platform.x && this.x < platform.x + platform.w;
                if (crosses && overlaps) landingY = Math.min(landingY, platform.y);
            }
        }
        if (this.y + this.h >= landingY) {
            this.y = landingY - this.h;
            this.vy = 0;
            this.isGrounded = true;
        }
        this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x));
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        if (this.facing < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#121b20';
        ctx.fillRect(-34, -38, 68, 68);
        ctx.fillStyle = '#2c454d';
        ctx.fillRect(-28, -32, 56, 48);
        ctx.fillStyle = '#35d5e8';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#35d5e8';
        ctx.fillRect(8, -22, 12, 8);
        ctx.fillRect(-9, -10, 18, 18);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#17252b';
        ctx.fillRect(-47, -28, 14, 54);
        ctx.fillRect(33, -28, 14, 54);
        ctx.fillRect(-27, 30, 19, 26);
        ctx.fillRect(8, 30, 19, 26);
        if (!this.dropping && this.attackCooldown > 620) {
            ctx.fillStyle = '#dffcff';
            ctx.fillRect(42, -12, 34, 22);
        }
        ctx.restore();
        ctx.fillStyle = '#27151a'; ctx.fillRect(this.x, this.y - 12, this.w, 5);
        ctx.fillStyle = '#35d5e8'; ctx.fillRect(this.x, this.y - 12, this.w * Math.max(0, this.hp / this.maxHp), 5);
    }
}

class BossBase extends Entity {
    constructor(bossId, x, groundY, w, h) {
        super(x, groundY - h, w, h);
        const definition = BOSSES[bossId];
        this.id = `boss-${bossId}`;
        this.bossId = bossId;
        this.type = 'boss';
        this.isBoss = true;
        this.owner = this;
        this.displayName = definition.name;
        this.hp = definition.maxHp;
        this.maxHp = definition.maxHp;
        this.color = definition.color;
        this.facing = -1;
        this.invincible = 0;
        this.buffs = { dizzy: 0, slow: 0, burn: 0, poison: 0, bleed: 0 };
        this.statusTickTimer = 0;
        this.solaForceHeld = false;
        this.solaForceSourceId = null;
    }

    getPlayers() {
        return typeof game.getFighters === 'function'
            ? game.getFighters().filter(player => player && !player.dead)
            : [];
    }

    getNearestPlayer() {
        const players = this.getPlayers();
        if (!players.length) return null;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        return players.reduce((closest, player) => {
            const distance = Math.hypot(player.x + player.w / 2 - cx, player.y + player.h / 2 - cy);
            const closestDistance = Math.hypot(closest.x + closest.w / 2 - cx, closest.y + closest.h / 2 - cy);
            return distance < closestDistance ? player : closest;
        });
    }

    updateBossStatus(dt) {
        this.invincible = Math.max(0, (this.invincible || 0) - dt);
        for (const key of ['slow', 'burn', 'poison', 'bleed']) {
            this.buffs[key] = Math.max(0, (this.buffs[key] || 0) - dt);
        }
        this.buffs.dizzy = Math.max(0, Math.min(300, this.buffs.dizzy || 0) - dt);
        this.statusTickTimer += dt;
        while (this.statusTickTimer >= 1000 && !this.dead) {
            this.statusTickTimer -= 1000;
            const damage = (this.buffs.burn > 0 ? 5 : 0) + (this.buffs.poison > 0 ? 2 : 0) + (this.buffs.bleed > 0 ? 5 : 0);
            if (damage > 0) this.takeDamage(damage, null, true);
        }
        return !this.dead && !this.solaForceHeld && this.buffs.dizzy <= 0;
    }

    getMoveMultiplier() {
        return this.buffs.slow > 0 ? 0.72 : 1;
    }

    takeDamage(amount, attacker) {
        if (this.dead || this.invincible > 0) return;
        this.hp -= Math.max(0, Number(amount) || 0);
        if (this.hp > 0) return;
        this.hp = 0;
        this.dead = true;
        for (let i = 0; i < 70; i++) {
            game.particles.push(new Particle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, i % 3 ? this.color : '#ffffff', (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 18, 900, 5 + Math.random() * 5));
        }
        if (typeof game.handleBossDefeat === 'function') game.handleBossDefeat(this, attacker);
    }

    drawBossHealth(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(this.x, this.y - 18, this.w, 8);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 2, this.y - 16, (this.w - 4) * Math.max(0, this.hp / this.maxHp), 4);
    }
}

class BossLaserStrike extends Entity {
    constructor(owner, centerX, delay = 1000) {
        super(Math.max(0, Math.min(CANVAS_W - 92, centerX - 46)), 20, 92, Math.max(80, GROUND_Y - 20));
        this.owner = owner;
        this.type = 'boss_laser_strike';
        this.delay = delay;
        this.duration = 450;
        this.hitTargets = new Set();
        this.untargetable = true;
    }

    update(dt) {
        if (this.dead || !this.owner || this.owner.dead) { this.dead = true; return; }
        if (this.delay > 0) { this.delay = Math.max(0, this.delay - dt); return; }
        this.duration -= dt;
        for (const target of game.getOpponentsOf(this.owner)) {
            if (!target || target.dead || target.invincible > 0 || this.hitTargets.has(target) || !checkAABB(this, target)) continue;
            target.takeDamage(70, this.owner, false, true);
            this.hitTargets.add(target);
        }
        if (this.duration <= 0) this.dead = true;
    }

    draw(ctx) {
        ctx.save();
        if (this.delay > 0) {
            const pulse = 0.25 + 0.25 * Math.sin(Date.now() * 0.025);
            ctx.fillStyle = `rgba(255, 56, 70, ${pulse})`;
            ctx.fillRect(this.x, GROUND_Y - 12, this.w, 12);
            ctx.strokeStyle = 'rgba(255, 102, 102, 0.7)';
            ctx.setLineDash([9, 8]);
            ctx.strokeRect(this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = 'rgba(53, 213, 232, 0.36)';
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#35d5e8';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = '#eaffff';
            ctx.fillRect(this.x + this.w * 0.42, this.y, this.w * 0.16, this.h);
        }
        ctx.restore();
    }
}

class TyranntBoss extends BossBase {
    constructor(x, groundY) {
        super('tyrannt', x, groundY, 230, 170);
        this.y = 105;
        this.droneTimer = 0;
        this.giantTimer = 0;
        this.laserTimer = 0;
        this.hoverPhase = 0;
    }

    summonDrones() {
        const count = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
            game.minions.push(new D2FDrone(this, this.x + this.w / 2 - 17 + (Math.random() - 0.5) * 140, this.y + this.h - 35 + Math.random() * 55, i));
        }
    }

    summonGiants() {
        const players = this.getPlayers();
        if (!players.length) return;
        for (let i = 0; i < 2; i++) game.minions.push(new D2FGiantRobot(this, players[i % players.length]));
    }

    fireLaserMatrix() {
        for (const player of this.getPlayers()) {
            const center = player.x + player.w / 2;
            for (const offset of [-108, 0, 108]) game.hazards.push(new BossLaserStrike(this, center + offset));
        }
    }

    update(dt) {
        if (!this.updateBossStatus(dt)) return;
        const target = this.getNearestPlayer();
        const frameScale = Math.min(2, Math.max(0.25, dt / 16.67));
        this.hoverPhase += dt * 0.002;
        if (target) {
            const targetCenter = target.x + target.w / 2;
            this.facing = targetCenter < this.x + this.w / 2 ? -1 : 1;
            const desiredX = targetCenter + (this.facing > 0 ? -520 : 520) - this.w / 2;
            const desiredY = 90 + Math.sin(this.hoverPhase) * 42;
            const movement = this.getMoveMultiplier();
            this.x += Math.max(-3.2, Math.min(3.2, (desiredX - this.x) * 0.018)) * movement * frameScale;
            this.y += Math.max(-2, Math.min(2, (desiredY - this.y) * 0.035)) * movement * frameScale;
        }
        this.x = Math.max(20, Math.min(CANVAS_W - this.w - 20, this.x));
        this.y = Math.max(45, Math.min(GROUND_Y - this.h - 80, this.y));

        this.droneTimer += dt;
        this.giantTimer += dt;
        this.laserTimer += dt;
        while (this.droneTimer >= 6000) { this.droneTimer -= 6000; this.summonDrones(); }
        while (this.giantTimer >= 10000) { this.giantTimer -= 10000; this.summonGiants(); }
        while (this.laserTimer >= 12000) { this.laserTimer -= 12000; this.fireLaserMatrix(); }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        if (this.facing < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#101a20';
        ctx.fillRect(-82, -48, 164, 96);
        ctx.fillStyle = '#294653';
        ctx.fillRect(-66, -38, 132, 70);
        ctx.fillStyle = '#35d5e8';
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#35d5e8';
        ctx.fillRect(28, -22, 30, 16);
        ctx.fillRect(-22, -12, 44, 28);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#17252b';
        ctx.fillRect(-115, -20, 34, 54);
        ctx.fillRect(81, -20, 34, 54);
        ctx.fillStyle = '#8cf4ff';
        for (const x of [-98, -48, 48, 98]) ctx.fillRect(x - 13, -62, 26, 6);
        ctx.fillStyle = '#dffcff';
        ctx.fillRect(60, -8, 18, 8);
        ctx.restore();
        this.drawBossHealth(ctx);
    }
}

class BossFireDemon extends Entity {
    constructor(owner, x, y, slot = 0) {
        super(x, y, 46, 38);
        this.owner = owner;
        this.type = 'boss_fire_demon';
        this.hp = 35;
        this.maxHp = 35;
        this.life = 22000;
        this.slot = slot;
        this.shootTimer = 500 + slot * 260;
        this.buffs = { dizzy: 0, slow: 0, burn: 0 };
        this.invincible = 0;
    }

    takeDamage(amount) {
        if (this.dead || this.invincible > 0) return;
        this.hp -= Math.max(0, amount || 0);
        if (this.hp <= 0) this.dead = true;
    }

    update(dt) {
        if (this.dead) return;
        this.life -= dt;
        if (this.life <= 0 || !this.owner || this.owner.dead) { this.dead = true; return; }
        if (this.buffs.dizzy > 0) { this.buffs.dizzy = Math.max(0, this.buffs.dizzy - dt); return; }
        const targets = game.getOpponentsOf(this.owner);
        if (!targets.length) return;
        const target = targets.reduce((closest, player) => Math.hypot(player.x - this.x, player.y - this.y) < Math.hypot(closest.x - this.x, closest.y - this.y) ? player : closest);
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        const tx = target.x + target.w / 2;
        const ty = target.y + target.h / 2;
        const dx = tx - cx;
        const dy = ty - cy;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const desiredDistance = 390 + (this.slot % 3 - 1) * 45;
        const radial = distance > desiredDistance + 50 ? 4.2 : (distance < desiredDistance - 50 ? -4.2 : 0);
        const desiredVx = dx / distance * radial;
        const desiredY = Math.max(70, Math.min(GROUND_Y - 170, ty - 130 + (this.slot % 3 - 1) * 55));
        this.vx += (desiredVx - this.vx) * 0.12;
        this.vy += (Math.max(-4, Math.min(4, (desiredY - cy) * 0.04)) - this.vy) * 0.12;
        const frameScale = Math.min(2, Math.max(0.25, dt / 16.67));
        this.x = Math.max(10, Math.min(CANVAS_W - this.w - 10, this.x + this.vx * frameScale));
        this.y = Math.max(45, Math.min(GROUND_Y - this.h - 45, this.y + this.vy * frameScale));
        this.shootTimer += dt;
        if (this.shootTimer >= 1800) {
            this.shootTimer %= 1800;
            const angle = Math.atan2(ty - cy, tx - cx);
            const orb = new Projectile(cx, cy, 15, 15, Math.cos(angle) * 9, Math.sin(angle) * 9, 10, this.owner, '#ff7a32', 'boss_fire_orb');
            game.projectiles.push(orb);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        if (this.vx < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#6e1f1a';
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-9, -15); ctx.lineTo(-20, -4); ctx.lineTo(-12, 0); ctx.lineTo(-20, 13); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffb347';
        ctx.fillRect(8, -5, 8, 6);
        ctx.restore();
        ctx.fillStyle = '#240d0d'; ctx.fillRect(this.x, this.y - 8, this.w, 3);
        ctx.fillStyle = '#ff6a35'; ctx.fillRect(this.x, this.y - 8, this.w * Math.max(0, this.hp / this.maxHp), 3);
    }
}

class DragonBoss extends BossBase {
    constructor(x, groundY) {
        super('dragon', x, groundY, 290, 178);
        this.y = 120;
        this.flameCooldown = 0;
        this.flameTimer = 0;
        this.flameTickTimer = 0;
        this.flameAngle = Math.PI;
        this.demonTimer = 0;
        this.dashCooldown = 0;
        this.dashPhase = null;
        this.dashTimer = 0;
        this.dashHitTargets = new Set();
    }

    summonDemons() {
        for (let i = 0; i < 4; i++) game.minions.push(new BossFireDemon(this, this.x + this.w / 2 - 23 + (Math.random() - 0.5) * 180, this.y + 60 + Math.random() * 90, i));
    }

    startDash(target) {
        if (!target) return;
        this.dashPhase = 'rise';
        this.dashTimer = 900;
        this.dashTargetId = target.id;
        this.dashHitTargets.clear();
        this.dashCooldown = 0;
    }

    getDashTarget() {
        return this.getPlayers().find(player => player.id === this.dashTargetId) || this.getNearestPlayer();
    }

    damageDashPath(hitbox, impact = false) {
        for (const target of this.getPlayers()) {
            if (target.dead || target.invincible > 0 || (!impact && this.dashHitTargets.has(target)) || !checkAABB(hitbox, target)) continue;
            target.takeDamage(impact ? 75 : 105, this, false, true);
            target.buffs.slow = Math.max(target.buffs.slow || 0, impact ? 1800 : 3200);
            target.vx += this.facing * 12;
            if (!impact) this.dashHitTargets.add(target);
        }
    }

    updateDash(dt) {
        const target = this.getDashTarget();
        if (this.dashPhase === 'rise') {
            this.dashTimer -= dt;
            this.y = Math.max(35, this.y - dt * 0.28);
            if (target) this.x += Math.max(-4, Math.min(4, target.x + target.w / 2 - (this.x + this.w / 2))) * Math.min(2, dt / 16.67);
            if (this.dashTimer <= 0) {
                this.dashPhase = 'dive';
                this.dashTimer = 680;
                this.dashMaxTimer = 680;
                this.dashFromX = this.x;
                this.dashFromY = this.y;
                const aim = target || { x: this.x, w: 0 };
                this.dashEndX = Math.max(10, Math.min(CANVAS_W - this.w - 10, aim.x + aim.w / 2 - this.w / 2));
                this.dashEndY = GROUND_Y - this.h;
                this.facing = this.dashEndX >= this.x ? 1 : -1;
            }
            return;
        }
        if (this.dashPhase === 'dive') {
            const previous = { x: this.x, y: this.y, w: this.w, h: this.h };
            this.dashTimer = Math.max(0, this.dashTimer - dt);
            const progress = 1 - this.dashTimer / this.dashMaxTimer;
            this.x = this.dashFromX + (this.dashEndX - this.dashFromX) * progress;
            this.y = this.dashFromY + (this.dashEndY - this.dashFromY) * progress;
            const swept = {
                x: Math.min(previous.x, this.x) - 30,
                y: Math.min(previous.y, this.y) - 20,
                w: this.w + Math.abs(this.x - previous.x) + 60,
                h: this.h + Math.abs(this.y - previous.y) + 40
            };
            this.damageDashPath(swept, false);
            if (this.dashTimer <= 0) {
                this.damageDashPath({ x: this.x - 120, y: GROUND_Y - 210, w: this.w + 240, h: 220 }, true);
                for (let i = 0; i < 45; i++) game.particles.push(new Particle(this.x + this.w / 2, GROUND_Y, i % 2 ? '#ff5a36' : '#ffd166', (Math.random() - 0.5) * 20, -Math.random() * 16, 650, 6));
                this.dashPhase = 'recover';
                this.dashTimer = 600;
            }
            return;
        }
        this.dashTimer -= dt;
        if (this.dashTimer <= 0) this.dashPhase = null;
    }

    updateFlame(dt, target) {
        if (target) {
            const desired = Math.atan2(target.y + target.h / 2 - (this.y + this.h * 0.48), target.x + target.w / 2 - (this.x + this.w / 2));
            this.flameAngle = desired;
            this.facing = Math.cos(desired) >= 0 ? 1 : -1;
        }
        this.flameTimer = Math.max(0, this.flameTimer - dt);
        this.flameTickTimer += dt;
        const ticks = Math.floor(this.flameTickTimer / 250);
        if (ticks > 0) this.flameTickTimer %= 250;
        const startX = this.x + this.w / 2 + Math.cos(this.flameAngle) * 105;
        const startY = this.y + this.h * 0.48 + Math.sin(this.flameAngle) * 35;
        const endX = startX + Math.cos(this.flameAngle) * 720;
        const endY = startY + Math.sin(this.flameAngle) * 720;
        for (const player of this.getPlayers()) {
            const px = player.x + player.w / 2;
            const py = player.y + player.h / 2;
            const dx = endX - startX;
            const dy = endY - startY;
            const projection = Math.max(0, Math.min(1, ((px - startX) * dx + (py - startY) * dy) / Math.max(1, dx * dx + dy * dy)));
            const distance = Math.hypot(px - (startX + dx * projection), py - (startY + dy * projection));
            if (projection <= 0 || distance > 45 + projection * 105) continue;
            for (let tick = 0; tick < ticks && !player.dead; tick++) player.takeDamage(9, this, true, true, true);
            player.buffs.burn = Math.max(player.buffs.burn || 0, 600);
        }
    }

    update(dt) {
        if (!this.updateBossStatus(dt)) return;
        const target = this.getNearestPlayer();
        this.demonTimer += dt;
        this.flameCooldown += dt;
        this.dashCooldown += dt;
        while (this.demonTimer >= 10000) { this.demonTimer -= 10000; this.summonDemons(); }

        if (this.dashPhase) { this.updateDash(dt); return; }
        if (this.flameTimer > 0) { this.updateFlame(dt, target); return; }
        if (this.flameCooldown >= 12000) {
            this.flameCooldown -= 12000;
            this.flameTimer = 5000;
            this.flameTickTimer = 0;
            this.updateFlame(0, target);
            return;
        }
        if (this.dashCooldown >= 9000) { this.startDash(target); return; }

        if (target) {
            this.facing = target.x + target.w / 2 >= this.x + this.w / 2 ? 1 : -1;
            const desiredX = target.x + (this.facing > 0 ? -470 : 470) - this.w / 2;
            const desiredY = 105 + Math.sin(Date.now() * 0.0018) * 55;
            const frameScale = Math.min(2, Math.max(0.25, dt / 16.67)) * this.getMoveMultiplier();
            this.x += Math.max(-3, Math.min(3, (desiredX - this.x) * 0.018)) * frameScale;
            this.y += Math.max(-2.2, Math.min(2.2, (desiredY - this.y) * 0.035)) * frameScale;
        }
        this.x = Math.max(15, Math.min(CANVAS_W - this.w - 15, this.x));
        this.y = Math.max(40, Math.min(GROUND_Y - this.h, this.y));
    }

    draw(ctx) {
        ctx.save();
        if (this.flameTimer > 0) {
            const startX = this.x + this.w / 2 + Math.cos(this.flameAngle) * 100;
            const startY = this.y + this.h * 0.48 + Math.sin(this.flameAngle) * 35;
            const endX = startX + Math.cos(this.flameAngle) * 720;
            const endY = startY + Math.sin(this.flameAngle) * 720;
            const sideX = -Math.sin(this.flameAngle) * 120;
            const sideY = Math.cos(this.flameAngle) * 120;
            ctx.fillStyle = 'rgba(255, 82, 30, 0.48)';
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff8a28';
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX + sideX, endY + sideY); ctx.lineTo(endX - sideX, endY - sideY); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        if (this.facing < 0) ctx.scale(-1, 1);
        const wing = Math.sin(Date.now() * 0.009) * 18;
        ctx.fillStyle = '#7a201c';
        ctx.beginPath(); ctx.moveTo(-55, -18); ctx.lineTo(-145, -70 - wing); ctx.lineTo(-82, 12); ctx.lineTo(-150, 70 + wing); ctx.lineTo(-34, 40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a93122';
        ctx.beginPath(); ctx.ellipse(0, 10, 94, 48, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(62, -8); ctx.lineTo(126, -30); ctx.lineTo(145, 4); ctx.lineTo(92, 25); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd166'; ctx.fillRect(116, -12, 14, 9);
        ctx.fillStyle = '#4f1215';
        ctx.beginPath(); ctx.moveTo(-80, 20); ctx.lineTo(-145, 52); ctx.lineTo(-112, 4); ctx.fill();
        ctx.restore();
        this.drawBossHealth(ctx);
    }
}

class BossKnight extends Entity {
    constructor(owner, x) {
        super(x, GROUND_Y - 74, 42, 74);
        this.owner = owner;
        this.type = 'boss_knight';
        this.hp = 55;
        this.maxHp = 55;
        this.life = 24000;
        this.facing = -1;
        this.attackCooldown = Math.random() * 500;
        this.isGrounded = true;
        this.buffs = { dizzy: 0, slow: 0, burn: 0 };
        this.invincible = 0;
    }

    takeDamage(amount) {
        if (this.dead || this.invincible > 0) return;
        this.hp -= Math.max(0, amount || 0);
        if (this.hp <= 0) this.dead = true;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0 || !this.owner || this.owner.dead) { this.dead = true; return; }
        if (this.buffs.dizzy > 0) { this.buffs.dizzy = Math.max(0, this.buffs.dizzy - dt); return; }
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        const targets = game.getOpponentsOf(this.owner);
        if (!targets.length) return;
        const target = targets.reduce((closest, player) => Math.abs(player.x - this.x) < Math.abs(closest.x - this.x) ? player : closest);
        const dx = target.x + target.w / 2 - (this.x + this.w / 2);
        const dy = target.y + target.h / 2 - (this.y + this.h / 2);
        this.facing = dx >= 0 ? 1 : -1;
        const slow = this.buffs.slow > 0 ? 0.65 : 1;
        this.vx += (this.facing * (Math.abs(dx) > 55 ? 3.6 : 0) * slow - this.vx) * 0.2;
        if (this.isGrounded && dy < -65) { this.vy = -13; this.isGrounded = false; }
        const frameScale = Math.min(2, Math.max(0.25, dt / 16.67));
        const previousBottom = this.y + this.h;
        this.x += this.vx * frameScale;
        this.vy += GRAVITY * frameScale;
        this.y += this.vy * frameScale;
        let landingY = GROUND_Y;
        if (this.vy >= 0) {
            for (const platform of PLATFORMS) {
                if (previousBottom <= platform.y && this.y + this.h >= platform.y && this.x + this.w > platform.x && this.x < platform.x + platform.w) landingY = Math.min(landingY, platform.y);
            }
        }
        this.isGrounded = false;
        if (this.y + this.h >= landingY) { this.y = landingY - this.h; this.vy = 0; this.isGrounded = true; }
        this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x));
        if (Math.abs(dx) < 70 && Math.abs(dy) < 90 && this.attackCooldown <= 0) {
            target.takeDamage(12, this.owner);
            this.attackCooldown = 950;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        if (this.facing < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#5b5f68'; ctx.fillRect(-17, -26, 34, 52);
        ctx.fillStyle = '#b7bec8'; ctx.fillRect(-14, -34, 28, 18);
        ctx.fillStyle = '#16181d'; ctx.fillRect(6, -28, 8, 4);
        ctx.fillStyle = '#d8c07b'; ctx.fillRect(14, -8, 45, 7);
        ctx.restore();
        ctx.fillStyle = '#251313'; ctx.fillRect(this.x, this.y - 8, this.w, 3);
        ctx.fillStyle = '#d8c07b'; ctx.fillRect(this.x, this.y - 8, this.w * Math.max(0, this.hp / this.maxHp), 3);
    }
}

class LibertusBoss extends BossBase {
    constructor(x, groundY) {
        super('libertus', x, groundY, 176, 238);
        this.y = groundY - this.h;
        this.knightTimer = 0;
        this.swingTimer = 0;
        this.swingState = 'idle';
        this.swingStateTimer = 0;
        this.swingVisualTimer = 0;
        this.swingFacing = -1;
    }

    summonKnights() {
        for (let i = 0; i < 5; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const x = Math.max(10, Math.min(CANVAS_W - 52, this.x + this.w / 2 + side * (100 + Math.floor(i / 2) * 58)));
            game.minions.push(new BossKnight(this, x));
        }
    }

    startSwing(target) {
        this.swingState = 'windup';
        this.swingStateTimer = 1000;
        this.swingFacing = target && target.x + target.w / 2 >= this.x + this.w / 2 ? 1 : -1;
        this.swingTimer = 0;
    }

    releaseSwing() {
        this.swingState = 'active';
        this.swingStateTimer = 380;
        this.swingVisualTimer = 380;
        this.facing = this.swingFacing;
        const range = 440;
        const hitbox = {
            x: this.swingFacing > 0 ? this.x + this.w * 0.45 : this.x - range + this.w * 0.55,
            y: this.y - 45,
            w: range,
            h: this.h + 100
        };
        for (const player of this.getPlayers()) {
            if (!player.dead && player.invincible <= 0 && checkAABB(hitbox, player)) {
                player.takeDamage(125, this, false, true);
                player.vx = this.swingFacing * 22;
                player.vy = -7;
            }
        }
        for (let i = 0; i < 35; i++) game.particles.push(new Particle(this.x + this.w / 2 + this.swingFacing * Math.random() * range, this.y + 40 + Math.random() * this.h, '#e8d39c', this.swingFacing * (4 + Math.random() * 9), (Math.random() - 0.5) * 8, 500, 5));
    }

    update(dt) {
        if (!this.updateBossStatus(dt)) return;
        const target = this.getNearestPlayer();
        this.knightTimer += dt;
        this.swingTimer += dt;
        this.swingVisualTimer = Math.max(0, this.swingVisualTimer - dt);
        while (this.knightTimer >= 12000) { this.knightTimer -= 12000; this.summonKnights(); }

        if (this.swingState !== 'idle') {
            this.swingStateTimer -= dt;
            if (this.swingState === 'windup' && this.swingStateTimer <= 0) this.releaseSwing();
            else if (this.swingState === 'active' && this.swingStateTimer <= 0) this.swingState = 'idle';
            return;
        }
        if (this.swingTimer >= 10000) { this.startSwing(target); return; }

        if (target) {
            const dx = target.x + target.w / 2 - (this.x + this.w / 2);
            this.facing = dx >= 0 ? 1 : -1;
            const move = Math.abs(dx) > 210 ? this.facing * 2.25 * this.getMoveMultiplier() : 0;
            this.x += move * Math.min(2, Math.max(0.25, dt / 16.67));
        }
        this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x));
        this.y = GROUND_Y - this.h;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        if (this.facing < 0) ctx.scale(-1, 1);
        if (this.swingState === 'windup') {
            ctx.fillStyle = 'rgba(255, 218, 122, 0.18)';
            ctx.fillRect(25, -this.h / 2 - 35, 440, this.h + 70);
        }
        if (this.swingVisualTimer > 0) {
            ctx.strokeStyle = 'rgba(255, 235, 174, 0.75)';
            ctx.lineWidth = 34;
            ctx.beginPath(); ctx.arc(12, -5, 310, -1.15, 1.05); ctx.stroke();
        }
        ctx.fillStyle = '#3f444e'; ctx.fillRect(-63, -82, 126, 164);
        ctx.fillStyle = '#9ca4ad'; ctx.fillRect(-52, -108, 104, 54);
        ctx.fillStyle = '#111319'; ctx.fillRect(16, -88, 28, 8);
        ctx.fillStyle = '#e8d39c'; ctx.fillRect(42, -25, 150, 18);
        ctx.fillStyle = '#786a45'; ctx.fillRect(27, -40, 22, 50);
        ctx.fillStyle = '#2a2d34'; ctx.fillRect(-56, 78, 48, 40); ctx.fillRect(8, 78, 48, 40);
        ctx.restore();
        this.drawBossHealth(ctx);
    }
}

function createBoss(bossId, x, groundY) {
    if (bossId === 'dragon') return new DragonBoss(x, groundY);
    if (bossId === 'libertus') return new LibertusBoss(x, groundY);
    return new TyranntBoss(x, groundY);
}

window.createBoss = createBoss;

class Minion extends Entity {
    constructor(owner, x, y) {
        super(x, y, 35, 65);
        this.owner = owner; this.type = "minion"; this.hp = 30; this.maxHp = this.hp;
        this.shootTimer = Math.random() * 1000; this.color = "#f4f4f4";
        this.buffs = { dizzy: 0 }; this.invincible = 0;
    }
    takeDamage(amt, attacker) {
        if (this.grappledBy) return;
        this.hp -= amt;
        if (this.hp <= 0) {
            this.dead = true;
            if (attacker && attacker.heroName === 'Euclid') {
                game.minions.push(new Skeleton(attacker, this.x, this.y));
                for(let i=0; i<15; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#8A2BE2", (Math.random()-0.5)*10, -Math.random()*10, 500, 6));
            } else {
                for(let i=0; i<10; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#ff0000", (Math.random()-0.5)*10, Math.random()*-10, 500));
            }
        }
    }
    update(dt) {
        if (this.buffs.dizzy > 0) { this.buffs.dizzy -= dt; return; }

        this.vy += GRAVITY; this.y += this.vy;
        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; }
        if (this.vy > 0) {
            for (let plat of PLATFORMS) {
                if (this.y + this.h - this.vy <= plat.y && this.y + this.h >= plat.y && this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                    this.y = plat.y - this.h; this.vy = 0;
                }
            }
        }

        let enemy = game.getEnemyOf(this.owner);
        if (enemy && !enemy.dead) {
            this.shootTimer += dt;
            if (this.shootTimer >= 1500) {
                this.shootTimer = 0;
                let cx = this.x + this.w/2; let cy = this.y + 25;
                let ex = enemy.x + enemy.w/2; let ey = enemy.y + enemy.h/2;
                let angle = Math.atan2(ey - cy, ex - cx);
                game.projectiles.push(new Projectile(cx, cy, 6, 6, Math.cos(angle)*12, Math.sin(angle)*12, 13, this.owner, "#FFFF00"));
                game.particles.push(new Particle(cx + Math.cos(angle)*15, cy + Math.sin(angle)*15, "#FFA500", 0, 0, 100));
            }
        }
    }
    draw(ctx) {
        if (this.buffs.dizzy > 0) {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y - 15);
            let timeAngle = Date.now() * 0.005;
            for(let s=0; s<3; s++) {
                let offset = timeAngle + (s * (Math.PI*2/3));
                ctx.fillStyle = "#FFD700"; ctx.fillRect(Math.cos(offset)*15, Math.sin(offset)*4, 3, 3);
            }
            ctx.restore();
        }
        ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "#333"; ctx.fillRect(this.x, this.y + 35, this.w, 6);
        let enemy = game.getEnemyOf(this.owner);
        let dir = (enemy && enemy.x < this.x) ? -1 : 1;
        ctx.fillStyle = "#111"; ctx.fillRect(this.x + (dir > 0 ? 22 : 8), this.y + 15, 5, 4);
        ctx.fillStyle = "#dcb274"; ctx.beginPath(); ctx.moveTo(this.x + this.w / 2, this.y - 12); ctx.lineTo(this.x - 12, this.y + 8); ctx.lineTo(this.x + this.w + 12, this.y + 8); ctx.fill();
        ctx.strokeStyle = "#b58b4c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x - 12, this.y + 8); ctx.lineTo(this.x + this.w + 12, this.y + 8); ctx.stroke();
        ctx.fillStyle = "#4a2e15"; ctx.fillRect(this.x + (dir>0?10:-20), this.y + 25, 45, 5);
        ctx.fillStyle = "#222"; ctx.fillRect(this.x + (dir>0?25:-20), this.y + 23, 30, 3);
        ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 20, this.w, 4);
        ctx.fillStyle = "green"; ctx.fillRect(this.x, this.y - 20, this.w * (this.hp/this.maxHp), 4);
    }
}

class Skeleton extends Entity {
    constructor(owner, x, y) {
        super(x, y, 35, 60);
        this.owner = owner;
        this.type = "skeleton";
        this.hp = 20;
        this.maxHp = 100;
        this.color = "#e0e0e0";
        this.speed = 2.5;
        this.jumpPower = 20;
        this.attackCooldown = 0;
        this.buffs = { dizzy: 0 };
        this.invincible = 0;
    }
    takeDamage(amt, attacker) {
        if (this.grappledBy) return;
        this.hp -= amt;
        if (this.hp <= 0) {
            this.dead = true;
            game.createExplosion(this.x + this.w/2, this.y + this.h/2, 60, 23, this.owner, false);
            for(let i=0; i<15; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#aaa", (Math.random()-0.5)*10, Math.random()*-15, 500, 6));
        }
    }
    update(dt) {
        if (this.buffs.dizzy > 0) { this.buffs.dizzy -= dt; return; }

        this.vy += GRAVITY;
        this.y += this.vy;
        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; }

        if (this.vy >= 0) {
            for (let plat of PLATFORMS) {
                if (this.y + this.h - this.vy <= plat.y && this.y + this.h >= plat.y && this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                    this.y = plat.y - this.h; this.vy = 0;
                }
            }
        }

        let enemy = game.getEnemyOf(this.owner);
        if (enemy && !enemy.dead) {
            let dx = enemy.x + enemy.w/2 - (this.x + this.w/2);
            let dy = enemy.y + enemy.h/2 - (this.y + this.h/2);
            let dist = Math.abs(dx);

            if (dist > 30) {
                this.vx = (dx > 0 ? 1 : -1) * this.speed;
                this.x += this.vx;
            }

            if (dy < -40 && this.vy === 0 && dist < 150) {
                this.vy = -this.jumpPower;
            }

            if (this.attackCooldown > 0) this.attackCooldown -= dt;
            if (dist < 50 && Math.abs(dy) < 60 && this.attackCooldown <= 0) {
                enemy.takeDamage(60, this.owner);
                this.attackCooldown = 1000;
                game.particles.push(new Particle(this.x + this.w/2, this.y, "#8A2BE2", dx>0?5:-5, 0, 200, 8));
            }
        }

        if (this.x < 0) this.x = 0;
        if (this.x > CANVAS_W - this.w) this.x = CANVAS_W - this.w;
    }
    draw(ctx) {
        if (this.buffs.dizzy > 0) {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y - 15);
            let timeAngle = Date.now() * 0.005;
            for(let s=0; s<3; s++) {
                let offset = timeAngle + (s * (Math.PI*2/3));
                ctx.fillStyle = "#FFD700"; ctx.fillRect(Math.cos(offset)*10, Math.sin(offset)*3, 3, 3);
            }
            ctx.restore();
        }

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 5, this.y + 18, this.w - 10, this.h - 18);
        ctx.fillStyle = "#111";
        ctx.fillRect(this.x + 5, this.y + 25, this.w - 10, 4);
        ctx.fillRect(this.x + 5, this.y + 35, this.w - 10, 4);
        ctx.fillRect(this.x + 5, this.y + 45, this.w - 10, 4);

        ctx.fillStyle = "#fff";
        ctx.fillRect(this.x + 2, this.y, this.w - 4, 18);
        ctx.fillStyle = "#8A2BE2";
        let enemy = game.getEnemyOf(this.owner);
        let dir = (enemy && enemy.x > this.x) ? 1 : -1;
        ctx.fillRect(this.x + (dir>0?20:10), this.y + 4, 6, 6);

        ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 12, this.w, 4);
        ctx.fillStyle = "#8A2BE2"; ctx.fillRect(this.x, this.y - 12, this.w * (this.hp/this.maxHp), 4);
    }
}

class Puppet extends Entity {
    constructor(owner, x, y) {
        super(x, y, 35, 65);
        this.owner = owner;
        this.type = "puppet";
        this.hp = 250;
        this.maxHp = 250;
        this.color = "#aaaaaa";
        this.speed = 4.5;
        this.jumpPower = 15;
        this.attackCooldown = 0;
        this.buffs = { dizzy: 0 };
        this.invincible = 0;
        this.targetVx = 0;
        this.facing = owner.facing;
        this.attackState = 'idle';
        this.stateTimer = 0;
        this.hasHit = false;
        this.isGrounded = false;
    }
    takeDamage(amt, attacker) {
        if (this.grappledBy) return;
        this.hp -= amt;
        if (this.hp <= 0) {
            this.dead = true;
            for(let i=0; i<15; i++) game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, "#fff", (Math.random()-0.5)*10, Math.random()*-15, 500, 4));
            if (this.owner && !this.owner.dead) {
                this.owner.buffs.dizzy = 3000;
                this.owner.attackState = 'idle';
            }
        }
    }
    doJump() {
        if (this.isGrounded && this.attackState === 'idle') {
            this.vy = -this.jumpPower;
            this.isGrounded = false;
        }
    }
    doAttack() {
        if (this.attackState === 'idle') {
            this.attackState = 'windup';
            this.stateTimer = 100;
            this.hasHit = false;
        }
    }
    update(dt) {
        if (this.buffs.dizzy > 0) { this.buffs.dizzy -= dt; return; }

        this.vy += GRAVITY;

        if (this.attackState !== 'idle') this.targetVx = 0;
        this.vx += (this.targetVx - this.vx) * 0.25;

        this.x += this.vx;
        this.y += this.vy;

        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; this.isGrounded = true; }
        else this.isGrounded = false;

        if (this.vy > 0) {
            for (let plat of PLATFORMS) {
                if (this.y + this.h - this.vy <= plat.y && this.y + this.h >= plat.y && this.x + this.w > plat.x && this.x < plat.x + plat.w) {
                    this.y = plat.y - this.h; this.vy = 0; this.isGrounded = true;
                }
            }
        }

        if (this.x < 0) this.x = 0;
        if (this.x > CANVAS_W - this.w) this.x = CANVAS_W - this.w;

        if (this.attackState === 'windup') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.attackState = 'active';
                this.stateTimer = 100;

                let px = this.facing === 1 ? this.x + this.w : this.x - 40;
                let hitBox = { x: px, y: this.y + 10, w: 40, h: 40 };
                let targetsHit = [];
                for (const enemy of game.getOpponentsOf(this.owner)) {
                    if (!enemy.untargetable && checkAABB(hitBox, enemy)) targetsHit.push(enemy);
                }
                for (let m of game.minions) {
                    if (m && !m.isBoss && m.owner !== this.owner && !m.dead && !m.untargetable && checkAABB(hitBox, m)) targetsHit.push(m);
                }

                if (targetsHit.length > 0) {
                    this.hasHit = true;
                    targetsHit.forEach(t => t.takeDamage(20, this.owner));
                }
            }
        } else if (this.attackState === 'active') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.attackState = 'recovery';
                this.stateTimer = 150;
            }
        } else if (this.attackState === 'recovery') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) this.attackState = 'idle';
        }
    }
    draw(ctx) {
        if (this.buffs.dizzy > 0) {
            ctx.save(); ctx.translate(this.x + this.w/2, this.y - 15);
            let timeAngle = Date.now() * 0.005;
            for(let s=0; s<3; s++) {
                let offset = timeAngle + (s * (Math.PI*2/3));
                ctx.fillStyle = "#FFD700"; ctx.fillRect(Math.cos(offset)*10, Math.sin(offset)*3, 3, 3);
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        if (this.facing === -1) ctx.scale(-1, 1);

        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);

        ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-this.w/2, -this.h/2 + 20); ctx.lineTo(this.w/2, -this.h/2 + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-this.w/2, -this.h/2 + 40); ctx.lineTo(this.w/2, -this.h/2 + 40); ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(10, -this.h/2 + 10, 4, 0, Math.PI*2); ctx.fill();

        if (this.attackState !== 'idle') {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            let ext = this.attackState === 'active' ? 30 : (this.attackState === 'windup' ? 0 : 10);
            ctx.fillRect(this.w/2, -10, ext, 10);
        }

        ctx.restore();

        ctx.fillStyle = "red"; ctx.fillRect(this.x, this.y - 12, this.w, 4);
        ctx.fillStyle = "#fff"; ctx.fillRect(this.x, this.y - 12, this.w * (this.hp/this.maxHp), 4);
    }
}

class Hurricane extends Entity {
    constructor(owner, x, y) {
        super(x, y, 100, 120);
        this.owner = owner; this.timer = 5000; this.tickTimer = 0; this.stunTickTimer = 0;
    }
    update(dt) {
        this.timer -= dt; if (this.timer <= 0) this.dead = true;
        this.tickTimer += dt;
        if (this.tickTimer >= 200) {
            this.tickTimer = 0;
            for (const enemy of game.getOpponentsOf(this.owner)) {
                if (checkAABB(this, enemy)) enemy.takeDamage(0.6, this.owner, true);
            }
            for (let m of game.minions) {
                if (m && !m.isBoss && m.owner !== this.owner && !m.dead && !m.untargetable && checkAABB(this, m)) m.takeDamage(0.6, this.owner, true);
            }
        }
        this.stunTickTimer += dt;
        if (this.stunTickTimer >= 1000) {
            this.stunTickTimer = 0;
            let targets = Array.from(new Set([...game.getOpponentsOf(this.owner), ...game.minions.filter(m => m && m.owner !== this.owner && !m.untargetable)]));
            for (let t of targets) {
                if (t && !t.dead && checkAABB(this, t)) { t.buffs = t.buffs || {}; t.buffs.dizzy = 500; }
            }
        }
        if(Math.random() < 0.3) game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#aaddff", (Math.random()-0.5)*4, -Math.random()*5, 400));
    }
    draw(ctx) {
        ctx.globalAlpha = 0.5; ctx.fillStyle = "#88ccff";
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.w, this.y); ctx.lineTo(this.x + this.w/2 + 20, this.y + this.h); ctx.lineTo(this.x + this.w/2 - 20, this.y + this.h); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}
