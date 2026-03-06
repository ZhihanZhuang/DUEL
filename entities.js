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

class GiantSword extends Entity {
    constructor(owner, x, y) {
        super(x, y, 60, 150);
        this.owner = owner;
        this.vy = 25;
        this.damageDealt = false;
        this.untargetable = true;
        this.life = 1000;
    }
    update(dt) {
        if (this.life <= 0) { this.dead = true; return; }

        if (!this.damageDealt) {
            this.y += this.vy;
            let hitGround = false;
            if (this.y + this.h >= GROUND_Y) {
                this.y = GROUND_Y - this.h;
                hitGround = true;
            }

            if (hitGround) {
                this.damageDealt = true;
                game.createExplosion(this.x + this.w/2, this.y + this.h, 150, 90, this.owner, false, 5000);
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

        let enemy = game.getEnemyOf(this.owner);
        if (enemy && !enemy.dead && Math.hypot((enemy.x+enemy.w/2) - (this.x+this.w/2), (enemy.y+enemy.h/2) - (this.y+this.h/2)) < 50) {
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

        let targets = [game.p1, game.p2, ...game.minions].filter(t => t && t !== this && t !== this.owner && !t.dead);
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
        let targets = [game.p1, game.p2, ...game.minions].filter(t => t && !t.untargetable && t !== this.owner && t.owner !== this.owner && !t.dead && !(t.invincible > 0));
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
        } else if (this.type === "homing_bullet" || this.type === "magic_burst" || this.type === "volt_laser") {
            let target = game.getEnemyOf(this.owner);
            let minDist = target ? Math.hypot(target.x - this.x, target.y - this.y) : 9999;
            for (let m of game.minions) {
                if (m && m.owner !== this.owner && !m.dead && !m.untargetable) {
                    let d = Math.hypot(m.x - this.x, m.y - this.y);
                    if (d < minDist) { minDist = d; target = m; }
                }
            }
            if (target && !target.dead && !(target.invincible > 0)) {
                if (this.type !== "volt_laser" || this.timer < 1500) {
                    let tx = target.x + target.w/2; let ty = target.y + target.h/2;
                    let angle = Math.atan2(ty - (this.y + this.h/2), tx - (this.x + this.w/2));
                    let speed = this.type === "magic_burst" ? 18 : (this.type === "volt_laser" ? 15 : 25);
                    let turnSpeed = this.type === "magic_burst" ? 0.08 : (this.type === "volt_laser" ? 0.05 : 0.15);
                    this.vx += (Math.cos(angle) * speed - this.vx) * turnSpeed;
                    this.vy += (Math.sin(angle) * speed - this.vy) * turnSpeed;
                }
            }
            this.timer += dt;
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
            let targets = [game.getEnemyOf(this.owner), ...game.minions.filter(m => m && m.owner !== this.owner)];
            for (let t of targets) {
                if (!t || t.untargetable) continue;

                if (!t.dead && !(t.invincible > 0) && checkAABB(this, t) && !this.hitTargets.has(t)) {
                    let isBlocked = false;
                    if (t.attackState === 'active' && t.isMeleeAttack() && (t.heroName === 'Artu' || (t.heroName === 'Duke' && !t.isMounted))) {
                        if (Math.random() < 0.5) isBlocked = true;
                    }

                    if (isBlocked) {
                        for(let i=0; i<15; i++) game.particles.push(new Particle(this.x, this.y, "#ffffff", (Math.random()-0.5)*20, (Math.random()-0.5)*20, 300, 6));
                        for(let i=0; i<10; i++) game.particles.push(new Particle(this.x, this.y, "#ffd700", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 400, 4));
                    } else {
                        let noKnockback = (this.type === "bullet" || this.type === "homing_bullet" || this.type === "ki_blast" || this.type === "magic_burst" || this.type === "paper_plane" || this.type === "blue_paper_plane" || this.type === "fire_bolt" || this.type === "water_bolt" || this.type === "tidal_wave" || this.type === "volt_laser" || this.type === "pickaxe");
                        t.takeDamage(this.damage, this.owner, false, noKnockback);

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
                    if (this.type !== "blue_paper_plane" && this.type !== "tidal_wave") {
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
        } else if (this.type === "fire_bolt" || this.type === "water_bolt") {
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x+this.w/2, this.y+this.h/2, this.w/2, 0, Math.PI*2); ctx.fill();
            game.particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, this.color, 0, 0, 100, 3));
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
        } else {
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
}

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
                let enemy = game.getEnemyOf(this.owner);
                let targetsHit = [];
                if (enemy && !enemy.dead && !enemy.untargetable && checkAABB(hitBox, enemy)) targetsHit.push(enemy);
                for (let m of game.minions) {
                    if (m && m.owner !== this.owner && !m.dead && !m.untargetable && checkAABB(hitBox, m)) targetsHit.push(m);
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
            let enemy = game.getEnemyOf(this.owner);
            if (enemy && checkAABB(this, enemy)) enemy.takeDamage(0.6, this.owner, true);
            for (let m of game.minions) {
                if (m && m.owner !== this.owner && !m.dead && !m.untargetable && checkAABB(this, m)) m.takeDamage(0.6, this.owner, true);
            }
        }
        this.stunTickTimer += dt;
        if (this.stunTickTimer >= 1000) {
            this.stunTickTimer = 0;
            let targets = [game.getEnemyOf(this.owner), ...game.minions.filter(m => m && m.owner !== this.owner && !m.untargetable)];
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