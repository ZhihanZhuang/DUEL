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
        window.audioManager?.playEntityHit(this, attacker, amt);
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
    takeDamage(amt, attacker) {
        if (this.dead) return;
        window.audioManager?.playEntityHit(this, attacker, amt);
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

class UkonShadow extends Entity {
    constructor(owner, target) {
        const targetX = target ? target.x + target.w/2 - owner.w/2 : owner.x;
        const targetY = target ? target.y : owner.y;
        super(Math.max(0, Math.min(CANVAS_W - owner.w, targetX)), targetY, owner.w, owner.h);
        this.owner = owner;
        this.type = 'ukon_shadow';
        this.targetId = target?.id || null;
        this.target = target || null;
        this.hp = 18;
        this.maxHp = 18;
        this.life = 4200;
        this.maxLife = this.life;
        this.speed = 11.5;
        this.facing = owner.facing;
        this.spawnTimer = 220;
        this.buffs = {};
    }
    getTarget() {
        const locked = this.target && !this.target.dead && this.target !== this.owner ? this.target : null;
        if (locked) return locked;
        const summons = (game.minions || []).filter(target => target && target !== this && target.owner !== this.owner && !target.dead && !target.untargetable
            && target.type !== 'time_anchor' && target.type !== 'temporal_echo' && typeof target.takeDamage === 'function');
        const candidates = typeof game.getOpponentsOf === 'function'
            ? game.getOpponentsOf(this.owner).filter(target => target && !target.dead && !target.untargetable)
            : [];
        return [...candidates, ...summons].reduce((best, target) => {
            if (!best) return target;
            const targetDistance = Math.hypot(target.x + target.w/2 - (this.x + this.w/2), target.y + target.h/2 - (this.y + this.h/2));
            const bestDistance = Math.hypot(best.x + best.w/2 - (this.x + this.w/2), best.y + best.h/2 - (this.y + this.h/2));
            if (targetDistance < bestDistance - 0.5) return target;
            if (Math.abs(targetDistance - bestDistance) <= 0.5 && summons.includes(target) && !summons.includes(best)) return target;
            return best;
        }, null);
    }
    takeDamage(amt, attacker) {
        if (this.dead) return;
        window.audioManager?.playEntityHit(this, attacker, amt);
        this.hp -= Math.max(0, amt || 0);
        if (this.hp > 0) return;
        this.dead = true;
        for (let i = 0; i < 16; i++) {
            game.particles.push(new Particle(this.x + this.w/2, this.y + this.h/2, i % 2 ? '#ffc0a8' : '#7a2430', (Math.random()-0.5)*12, (Math.random()-0.5)*12, 360, 4));
        }
    }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0 || this.owner?.dead) {
            this.dead = true;
            return;
        }
        const target = this.getTarget();
        if (!target) {
            this.dead = true;
            return;
        }

        if (this.spawnTimer > 0) {
            this.spawnTimer = Math.max(0, this.spawnTimer - dt);
            if (Math.random() < 0.8) {
                game.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, '#a33a45', (Math.random()-0.5)*3, -2-Math.random()*2, 250, 4));
            }
            return;
        }

        const dx = target.x + target.w/2 - (this.x + this.w/2);
        const dy = target.y + target.h/2 - (this.y + this.h/2);
        const distance = Math.max(1, Math.hypot(dx, dy));
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = dx / distance * this.speed;
        this.vy = dy / distance * this.speed;
        this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x + this.vx));
        this.y = Math.max(25, Math.min(GROUND_Y - this.h, this.y + this.vy));

        if (distance <= 58 || checkAABB(this, target)) {
            target.takeDamage(15, this.owner);
            if (target.buffs) {
                target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 280);
                target.buffs.slow = Math.max(target.buffs.slow || 0, 900);
            }
            target.vx = this.facing * 7;
            target.vy = Math.min(target.vy || 0, -3);
            for (let i = 0; i < 18; i++) {
                game.particles.push(new Particle(target.x + target.w/2, target.y + target.h/2, i % 2 ? '#ffe0ca' : '#a33a45', (Math.random()-0.5)*14, (Math.random()-0.5)*14, 380, 4));
            }
            this.dead = true;
        } else if (Math.random() < 0.55) {
            game.particles.push(new Particle(this.x + this.w/2 - this.vx*1.4, this.y + this.h/2 - this.vy*1.4, '#a33a45', -this.vx*0.18, -this.vy*0.18, 260, 5));
        }
    }
    draw(ctx) {
        const alpha = Math.max(0.22, Math.min(0.62, this.life / this.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x + this.w/2, this.y);
        if (this.facing < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#6f2632';
        ctx.fillRect(-this.w/2, 8, this.w, this.h - 8);
        ctx.fillStyle = '#f3b5a5';
        ctx.fillRect(-this.w/2 + 7, 9, this.w - 14, 13);
        ctx.fillStyle = '#2b1719';
        ctx.fillRect(-this.w/2, 27, this.w, 10);
        ctx.save();
        ctx.translate(8, 31);
        ctx.rotate(0.72);
        ctx.fillStyle = '#242424';
        ctx.fillRect(-4, -58, 8, 82);
        ctx.fillStyle = '#a4a4a4';
        ctx.fillRect(-6, -60, 12, 7);
        ctx.restore();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#190b0d';
        ctx.fillRect(this.x - 1, this.y - 13, this.w + 2, 7);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(this.x, this.y - 12, this.w * Math.max(0, this.hp / this.maxHp), 5);
        ctx.restore();
    }
}

class PeachTree extends Entity {
    constructor(owner, centerX) {
        const width = 176;
        const top = 34;
        super(Math.max(0, Math.min(CANVAS_W - width, centerX - width/2)), top, width, GROUND_Y - top);
        this.owner = owner;
        this.type = 'peach_tree';
        this.life = 18000;
        this.maxLife = this.life;
        this.age = 0;
        this.untargetable = true;
        this.seed = Math.random() * Math.PI * 2;
    }
    update(dt) {
        this.age += dt;
        if (!this.owner || this.owner.dead || !this.owner.ukonUltimatePhase) this.dead = true;
    }
    draw(ctx) {
        const grow = Math.min(1, this.age / 420);
        const baseY = this.y + this.h;
        const crownY = this.y + 62;
        ctx.save();
        ctx.globalAlpha = Math.min(1, grow * 1.4);
        ctx.translate(0, baseY);
        ctx.scale(1, grow);
        ctx.translate(0, -baseY);

        ctx.strokeStyle = '#4d2b22';
        ctx.lineCap = 'round';
        ctx.lineWidth = 34;
        ctx.beginPath();
        ctx.moveTo(this.x + this.w/2, baseY);
        ctx.bezierCurveTo(this.x + this.w*0.42, baseY - 180, this.x + this.w*0.63, crownY + 150, this.x + this.w/2, crownY);
        ctx.stroke();
        ctx.strokeStyle = '#84513d';
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(this.x + this.w/2 - 6, baseY);
        ctx.bezierCurveTo(this.x + this.w*0.36, baseY - 220, this.x + this.w*0.62, crownY + 120, this.x + this.w/2 - 8, crownY);
        ctx.stroke();

        const branches = [
            [-62, 102, -8, 168], [66, 118, 7, 194], [-72, 190, -8, 250], [74, 232, 8, 286]
        ];
        ctx.strokeStyle = '#5b3428';
        ctx.lineWidth = 13;
        for (const [endX, endOffset, startX, startOffset] of branches) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2 + startX, crownY + startOffset);
            ctx.quadraticCurveTo(this.x + this.w/2 + endX*0.42, crownY + endOffset + 34, this.x + this.w/2 + endX, crownY + endOffset);
            ctx.stroke();
        }

        const time = Date.now() * 0.0015 + this.seed;
        for (let i = 0; i < 22; i++) {
            const angle = i * 2.4 + this.seed;
            const radiusX = 34 + (i % 5) * 15;
            const radiusY = 28 + (i % 4) * 13;
            const px = this.x + this.w/2 + Math.cos(angle) * radiusX + Math.sin(time + i) * 3;
            const py = crownY + 58 + Math.sin(angle) * radiusY + (i % 3) * 28;
            ctx.fillStyle = i % 3 ? '#3f8f52' : '#62ad61';
            ctx.beginPath(); ctx.arc(px, py, 22 + (i % 4) * 3, 0, Math.PI*2); ctx.fill();
            if (i % 4 === 0) {
                ctx.fillStyle = '#ff8f9f';
                ctx.beginPath(); ctx.arc(px + 8, py + 3, 7, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#ffd0d6';
                ctx.fillRect(px + 5, py, 3, 3);
            }
        }
        ctx.restore();

        if (this.owner && (this.owner.ukonUltimatePhase === 'aim' || this.owner.ukonUltimatePhase === 'drop')) {
            const markerX = this.owner.ukonDropTargetX;
            const markerY = this.owner.ukonDropTargetY;
            const pulse = 26 + Math.sin(Date.now() * 0.02) * 7;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 86, 91, 0.9)';
            ctx.fillStyle = 'rgba(255, 86, 91, 0.16)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(markerX, markerY, pulse, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(markerX - 40, markerY); ctx.lineTo(markerX + 40, markerY); ctx.moveTo(markerX, markerY - 40); ctx.lineTo(markerX, markerY + 40); ctx.stroke();
            ctx.restore();
        }
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
        window.audioManager?.playEntityHit(this, attacker, amt);
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
        window.audioManager?.playEntityHit(this, attacker, amt);
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
        window.audioManager?.playEntityHit(this, attacker, amt);
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
            let targets = Array.from(new Set([
                ...game.getOpponentsOf(this.owner),
                ...game.minions.filter(m => m && m.owner !== this.owner),
                ...game.projectiles.filter(projectile => projectile && projectile !== this && projectile.type === 'lapis_stone' && projectile.owner !== this.owner)
            ]));
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
                        const healthBeforeHit = t.hp;
                        let noKnockback = (this.type === "bullet" || this.type === "skeleton_arrow" || this.type === "archor_arrow" || this.type === "homing_bullet" || this.type === "ki_blast" || this.type === "magic_burst" || this.type === "paper_plane" || this.type === "blue_paper_plane" || this.type === "fire_bolt" || this.type === "water_bolt" || this.type === "tidal_wave" || this.type === "volt_laser" || this.type === "pickaxe" || this.type === "chiq_blade" || this.type === "chiq_super_blade" || this.type === "em_ball" || this.type === "chrono_bolt" || this.type === "raigo_golden_spear");
                        t.takeDamage(this.damage, this.owner, false, noKnockback);
                        if (this.type === "chiq_super_blade" && this.owner?.heroName === 'Itan' && typeof this.owner.heal === 'function') this.owner.heal(Math.max(0, healthBeforeHit - t.hp));
                        if (this.type === "raigo_golden_spear" && this.owner?.heroName === 'Raigo') {
                            const actual = Number.isFinite(healthBeforeHit) && Number.isFinite(t.hp) ? Math.max(0, healthBeforeHit - Math.max(0, t.hp)) : this.damage;
                            this.owner.healRaigoFromDamage?.(actual);
                            const pullX = (this.owner.x + this.owner.w/2) - (t.x + t.w/2);
                            const pullY = (this.owner.y + this.owner.h/2) - (t.y + t.h/2);
                            const pullDistance = Math.max(1, Math.hypot(pullX, pullY));
                            t.vx = (t.vx || 0) + pullX / pullDistance * 8;
                            t.vy = (t.vy || 0) + pullY / pullDistance * 4 - 1;
                            this.owner.vx = (this.owner.vx || 0) - Math.sign(this.vx || this.owner.facing || 1) * 2.5;
                            for(let i=0;i<10;i++)game.particles.push(new Particle(t.x+t.w/2,t.y+t.h/2,i%2?'#ffd84d':'#dffcff',(Math.random()-.5)*10,(Math.random()-.5)*10,320,4));
                        }
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
                            if (this.type === "chrono_bolt") t.buffs.slow = Math.max(t.buffs.slow || 0, 400);
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
        } else if (this.type === "chrono_bolt") {
            ctx.save(); ctx.strokeStyle = 'rgba(166,108,255,.45)'; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(this.x - this.vx * 2, this.y - this.vy * 2); ctx.lineTo(this.x + this.w/2, this.y + this.h/2); ctx.stroke();
            ctx.fillStyle = '#e0c8ff'; ctx.shadowBlur = 14; ctx.shadowColor = '#9d5cff';
            ctx.beginPath(); ctx.ellipse(this.x+this.w/2,this.y+this.h/2,this.w/2,this.h/2,0,0,Math.PI*2); ctx.fill(); ctx.restore();
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
        } else if (this.type === "raigo_golden_spear") {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.strokeStyle = 'rgba(255,216,77,.45)';
            ctx.lineWidth = 8;
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#ffd84d';
            ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(18, 0); ctx.stroke();
            ctx.fillStyle = '#fff7b0';
            ctx.fillRect(-20, -2, 32, 4);
            ctx.fillStyle = '#ffd84d';
            ctx.beginPath();
            ctx.moveTo(28, 0);
            ctx.lineTo(10, -9);
            ctx.lineTo(15, 0);
            ctx.lineTo(10, 9);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
            game.particles.push(new Particle(this.x + this.w/2 - this.vx*.4, this.y + this.h/2 - this.vy*.4, '#ffd84d', 0, 0, 120, 3));
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

function getHostileTargets(owner, exclude = null) {
    return Array.from(new Set([
        ...(typeof game.getOpponentsOf === 'function' ? game.getOpponentsOf(owner) : []),
        ...(game.minions || []).filter(entity => entity && entity !== exclude && entity.owner !== owner && !entity.untargetable)
    ])).filter(entity => entity && !entity.dead && entity !== exclude && !(entity.invincible > 0));
}

class TimeAnchor extends Entity {
    constructor(owner, x, y) {
        super(x, y, 1, 1); this.owner = owner; this.type = 'time_anchor';
        this.life = 12000; this.maxLife = 12000; this.age = 0; this.untargetable = true;
    }
    update(dt) { this.age += dt; this.life -= dt; if (this.life <= 0 || !this.owner || this.owner.dead) this.dead = true; }
    draw(ctx) {
        const pulse = 28 + Math.sin(this.age * 0.012) * 5;
        ctx.save(); ctx.translate(this.x, this.y); ctx.strokeStyle = 'rgba(185,120,255,0.9)';
        ctx.shadowBlur = 15; ctx.shadowColor = '#9d5cff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0,0,pulse,0,Math.PI*2); ctx.stroke();
        ctx.rotate(this.age * 0.002); ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*1.4); ctx.stroke(); ctx.restore();
    }
}

class TemporalEcho extends Entity {
    constructor(owner, x, y) {
        super(x, y, owner.w, owner.h); this.owner = owner; this.type = 'temporal_echo';
        this.life = 3000; this.maxLife = 3000; this.untargetable = true; this.touched = new Set();
    }
    update(dt) {
        this.life -= dt;
        for (const target of getHostileTargets(this.owner, this)) {
            if (!this.touched.has(target) && checkAABB(this, target)) {
                target.buffs = target.buffs || {}; target.buffs.slow = Math.max(target.buffs.slow || 0, 1000);
                this.touched.add(target);
            }
        }
        if (this.life <= 0 || !this.owner || this.owner.dead) this.dead = true;
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0.12, this.life / this.maxLife * 0.42); ctx.fillStyle = '#a66cff';
        ctx.shadowBlur = 12; ctx.shadowColor = '#9d5cff'; ctx.fillRect(this.x, this.y, this.w, this.h); ctx.restore();
    }
}

class HeavensThunder extends Entity {
    constructor(owner, x, y) { super(x-60, y-60, 120, 120); this.owner=owner; this.type='heavens_thunder'; this.life=600; this.maxLife=600; this.untargetable=true; }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0) {
            for (const target of getHostileTargets(this.owner, this)) {
                if (Math.hypot(target.x+target.w/2-(this.x+60), target.y+target.h/2-(this.y+60)) > 60) continue;
                const damage = target.heroName ? 30 : 45; target.takeDamage(damage, this.owner, false, true);
                target.buffs = target.buffs || {}; target.buffs.dizzy = Math.max(target.buffs.dizzy || 0, 250);
            }
            for(let i=0;i<28;i++) game.particles.push(new Particle(this.x+60, this.y+60+(Math.random()-.5)*120, i%2?'#fff':'#b06cff',(Math.random()-.5)*8,(Math.random()-.5)*8,350,4));
            this.dead = true;
        }
    }
    draw(ctx) { const a=0.18+0.3*(1-this.life/this.maxLife); ctx.save(); ctx.fillStyle=`rgba(176,108,255,${a})`; ctx.fillRect(this.x+48,0,24,this.y+this.h); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(this.x+60,this.y+60,60,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
}

class LaegonLightning extends Entity {
    constructor(owner,x,y,vx,vy,generation=0,hitTargets=null) {
        super(x,y,20,5); this.owner=owner; this.type='laegon_lightning'; this.vx=vx; this.vy=vy;
        this.originX=x; this.originY=y; this.generation=generation; this.hitTargets=hitTargets || new Set(); this.life=900;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy; this.life -= dt;
        for (const target of getHostileTargets(this.owner, this)) {
            if (this.hitTargets.has(target) || !checkAABB(this,target)) continue;
            this.hitTargets.add(target); const damage=target.heroName?8:10; target.takeDamage(damage,this.owner,false,true);
            this.owner?.onLaegonHit?.(target,damage,false);
            if (this.generation < 2) {
                const candidates=getHostileTargets(this.owner,this).filter(item=>!this.hitTargets.has(item)).sort((a,b)=>Math.hypot(a.x-this.x,a.y-this.y)-Math.hypot(b.x-this.x,b.y-this.y)).slice(0,2);
                for(const next of candidates){const angle=Math.atan2(next.y+next.h/2-this.y,next.x+next.w/2-this.x); game.projectiles.push(new LaegonLightning(this.owner,this.x,this.y,Math.cos(angle)*24,Math.sin(angle)*24,this.generation+1,this.hitTargets));}
            }
            this.dead=true; break;
        }
        if(this.life<=0||this.x<-50||this.x>CANVAS_W+50||this.y<-50||this.y>CANVAS_H+50)this.dead=true;
    }
    draw(ctx){
        const endX=this.x+this.w/2,endY=this.y+this.h/2,dx=endX-this.originX,dy=endY-this.originY;
        const length=Math.hypot(dx,dy),segments=Math.max(4,Math.ceil(length/28)),normalX=-dy/Math.max(1,length),normalY=dx/Math.max(1,length);
        ctx.save();ctx.strokeStyle='#d8c0ff';ctx.shadowBlur=16;ctx.shadowColor='#9d5cff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(this.originX,this.originY);
        for(let index=1;index<segments;index++){const ratio=index/segments;const jitter=(index%2?1:-1)*(6+((index*7+this.generation*3)%9));ctx.lineTo(this.originX+dx*ratio+normalX*jitter,this.originY+dy*ratio+normalY*jitter);}
        ctx.lineTo(endX,endY);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.shadowBlur=0;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
    }
}

class LaegonHammerStrike extends Entity {
    constructor(owner,x,y){super(x-100,0,200,GROUND_Y);this.owner=owner;this.type='laegon_hammer_strike';this.life=800;this.maxLife=800;this.targetX=x;this.targetY=y;this.untargetable=true;}
    update(dt){this.life-=dt;if(this.life<=0){for(const target of getHostileTargets(this.owner,this)){if(Math.hypot(target.x+target.w/2-this.targetX,target.y+target.h/2-this.targetY)<=100)target.takeDamage(50,this.owner);}game.projectiles.push(new LaegonHammer(this.owner,this.targetX-18,this.targetY-15,0,0,'ultimate_return'));this.dead=true;}}
    draw(ctx){ctx.save();ctx.strokeStyle='rgba(255,215,80,.9)';ctx.fillStyle='rgba(139,92,246,.18)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(this.targetX,this.targetY,100,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d9b84f';ctx.fillRect(this.targetX-18,-50,36,55);ctx.restore();}
}

class LaegonHammer extends Entity {
    constructor(owner,x,y,vx,vy,phase){super(x,y,36,30);this.owner=owner;this.type='laegon_hammer';this.vx=vx;this.vy=vy;this.phase=phase;this.returning=phase==='ultimate_return';this.life=3500;this.hitTargets=new Set();this.outboundTime=0;}
    update(dt){
        this.life-=dt;this.outboundTime+=dt;
        if(this.phase==='combat'&&!this.returning&&this.outboundTime>650){this.returning=true;this.hitTargets.clear();}
        if(this.returning){const dx=this.owner.x+this.owner.w/2-(this.x+this.w/2),dy=this.owner.y+this.owner.h/2-(this.y+this.h/2),d=Math.hypot(dx,dy);if(d<34){this.dead=true;this.owner.laegonHammerInFlight=false;if(this.phase==='ultimate_return')this.owner.thunderGodTimer=8000;return;}this.vx=dx/Math.max(1,d)*20;this.vy=dy/Math.max(1,d)*20;}
        this.x+=this.vx;this.y+=this.vy;
        for(const target of getHostileTargets(this.owner,this)){if(!this.hitTargets.has(target)&&checkAABB(this,target)){const damage=this.phase==='combat'?40:30;target.takeDamage(damage,this.owner);this.owner?.onLaegonHit?.(target,damage,true);this.hitTargets.add(target);}}
        if(this.life<=0){this.dead=true;this.owner.laegonHammerInFlight=false;}
    }
    draw(ctx){ctx.save();ctx.translate(this.x+18,this.y+15);ctx.rotate(Date.now()*.015);ctx.fillStyle='#6f42c1';ctx.shadowBlur=14;ctx.shadowColor='#ffd75a';ctx.fillRect(-15,-10,30,20);ctx.fillStyle='#ffd75a';ctx.fillRect(-3,8,6,25);ctx.restore();}
}

class BromExplosive extends Entity {
    explode(radius,damage,stun,visited=new Set(),knockback=12){
        if(this.dead||visited.has(this))return;visited.add(this);this.dead=true;const cx=this.x+this.w/2,cy=this.y+this.h/2;
        for(const target of getHostileTargets(this.owner,this)){const dx=target.x+target.w/2-cx,dy=target.y+target.h/2-cy,d=Math.hypot(dx,dy);if(d>radius)continue;target.takeDamage(damage,this.owner,false,true);target.vx=dx/Math.max(1,d)*knockback;target.vy=Math.min(-3,dy/Math.max(1,d)*knockback-4);if(stun){target.buffs=target.buffs||{};target.buffs.dizzy=Math.max(target.buffs.dizzy||0,stun);}}
        for(const bomb of [...(game.projectiles||[]),...(game.minions||[])])if(bomb instanceof BromExplosive&&!bomb.dead&&!visited.has(bomb)&&Math.hypot(bomb.x+bomb.w/2-cx,bomb.y+bomb.h/2-cy)<=radius)bomb.detonate(visited);
        for(let i=0;i<30;i++)game.particles.push(new Particle(cx,cy,i%2?'#ffb020':'#3b2b22',(Math.random()-.5)*16,(Math.random()-.5)*16,550,6));
    }
}

class BromBlastCharge extends BromExplosive {
    constructor(owner,x,y,vx,vy){super(x,y,16,16);this.owner=owner;this.type='brom_blast';this.vx=vx;this.vy=vy;this.life=2200;}
    detonate(visited){this.explode(65,60,120,visited,9);}
    update(dt){this.x+=this.vx;this.y+=this.vy;this.vy+=GRAVITY*.08;this.life-=dt;for(const target of getHostileTargets(this.owner,this)){if(checkAABB(this,target)){target.takeDamage(60,this.owner,false,true);this.detonate(new Set());return;}}const surface=this.y+this.h>=GROUND_Y||this.x<=0||this.x+this.w>=CANVAS_W||PLATFORMS.some(p=>checkAABB(this,p));if(surface||this.life<=0)this.detonate(new Set());}
    draw(ctx){ctx.save();ctx.fillStyle='#ff9f1c';ctx.shadowBlur=10;ctx.shadowColor='#ff5a1f';ctx.beginPath();ctx.arc(this.x+8,this.y+8,8,0,Math.PI*2);ctx.fill();ctx.restore();}
}

class BromStickyBomb extends BromExplosive {
    constructor(owner,x,y,vx,vy){super(x,y,18,18);this.owner=owner;this.type='brom_sticky';this.vx=vx;this.vy=vy;this.life=4000;this.attached=null;this.offsetX=0;this.offsetY=0;}
    detonate(visited){this.explode(100,150,300,visited,18);}
    update(dt){
        this.life-=dt;if(this.attached){if(this.attached.dead){this.attached=null;}else{this.x=this.attached.x+this.offsetX;this.y=this.attached.y+this.offsetY;}}
        else{this.x+=this.vx;this.y+=this.vy;this.vy+=GRAVITY*.35;const target=getHostileTargets(this.owner,this).find(item=>checkAABB(this,item));if(target){this.attached=target;this.offsetX=this.x-target.x;this.offsetY=this.y-target.y;this.vx=0;this.vy=0;}else if(this.y+this.h>=GROUND_Y||this.x<=0||this.x+this.w>=CANVAS_W||PLATFORMS.some(p=>checkAABB(this,p))){this.vx=0;this.vy=0;this.y=Math.min(this.y,GROUND_Y-this.h);}}
        if(this.life<=0)this.detonate(new Set());
    }
    draw(ctx){ctx.save();ctx.translate(this.x+9,this.y+9);ctx.rotate(Date.now()*.006);ctx.fillStyle=Math.floor(this.life/200)%2?'#ffdf5d':'#e34234';ctx.fillRect(-8,-8,16,16);ctx.fillStyle='#222';ctx.fillRect(-3,-3,6,6);ctx.restore();}
}

class MechanismNode extends Entity {
    constructor(owner, x, y) {
        super(Math.max(3, Math.min(CANVAS_W - 15, x - 6)), Math.max(3, Math.min(GROUND_Y - 12, y - 6)), 12, 12);
        this.owner = owner; this.type = 'mori_node'; this.life = 5000; this.maxLife = 5000; this.untargetable = true;
        this.serial = owner.moriNodeSerial = (owner.moriNodeSerial || 0) + 1;
    }
    update(dt) { this.life -= dt; if (this.life <= 0 || !this.owner || this.owner.dead) this.dead = true; }
    draw(ctx) {
        const pulse = 1 + Math.sin(Date.now() * 0.014 + this.serial) * 0.15;
        ctx.save(); ctx.translate(this.x + 6, this.y + 6); ctx.scale(pulse, pulse); ctx.rotate(Date.now() * 0.004);
        ctx.fillStyle = '#2b3135'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#f0a33b';
        ctx.beginPath(); for (let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?5:8;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();
        ctx.restore();
    }
}

class MoriEnergyWire extends Entity {
    constructor(owner, first, second) {
        const minX=Math.min(first.x,second.x),minY=Math.min(first.y,second.y),maxX=Math.max(first.x,second.x),maxY=Math.max(first.y,second.y);
        super(minX, minY, Math.max(8,maxX-minX), Math.max(8,maxY-minY));
        this.owner=owner;this.type='mori_wire';this.first=first;this.second=second;this.untargetable=true;this.life=Math.min(first.life,second.life);
    }
    distanceTo(target) {
        const ax=this.first.x+6,ay=this.first.y+6,bx=this.second.x+6,by=this.second.y+6,px=target.x+target.w/2,py=target.y+target.h/2;
        const dx=bx-ax,dy=by-ay,lengthSq=dx*dx+dy*dy;
        const t=lengthSq?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/lengthSq)):0;
        return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));
    }
    update(dt) {
        this.life-=dt;
        if(this.life<=0||this.first.dead||this.second.dead||!this.owner||this.owner.dead){this.dead=true;return;}
        for(const target of getHostileTargets(this.owner,this)){
            if(this.distanceTo(target)>Math.max(13,Math.min(target.w,target.h)*0.38))continue;
            target.takeDamage(20,this.owner,false,true);target.buffs=target.buffs||{};target.buffs.slow=Math.max(target.buffs.slow||0,1000);
            for(let i=0;i<18;i++)game.particles.push(new Particle(target.x+target.w/2,target.y+target.h/2,i%2?'#fff3b0':'#f0a33b',(Math.random()-.5)*10,(Math.random()-.5)*10,300,3));
            this.dead=true;break;
        }
    }
    draw(ctx){const ax=this.first.x+6,ay=this.first.y+6,bx=this.second.x+6,by=this.second.y+6;ctx.save();ctx.strokeStyle='#ffd166';ctx.shadowBlur=12;ctx.shadowColor='#f0a33b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.strokeStyle='#fff6cf';ctx.lineWidth=1.5;ctx.setLineDash([8,6]);ctx.lineDashOffset=-Date.now()*.03;ctx.stroke();ctx.restore();}
}

class MechanicFanBlade extends Entity {
    constructor(owner,x,y,vx,vy){super(x,y,28,12);this.owner=owner;this.type='mori_fan';this.vx=vx;this.vy=vy;this.life=720;this.hit=false;}
    plantNode(){if(this.dead)return;this.dead=true;this.owner?.createMoriNode?.(this.x+this.w/2,this.y+this.h/2);}
    update(dt){
        this.x+=this.vx;this.y+=this.vy;this.life-=dt;
        for(const target of getHostileTargets(this.owner,this)){if(!checkAABB(this,target))continue;target.takeDamage(25,this.owner,false,true);this.owner?.onMoriFanHit?.(target);this.dead=true;return;}
        const surface=this.x<=0||this.x+this.w>=CANVAS_W||this.y<=0||this.y+this.h>=GROUND_Y||PLATFORMS.some(platform=>checkAABB(this,platform));
        if(surface)this.plantNode();else if(this.life<=0)this.dead=true;
    }
    draw(ctx){ctx.save();ctx.translate(this.x+this.w/2,this.y+this.h/2);ctx.rotate(Math.atan2(this.vy,this.vx));ctx.fillStyle='rgba(255,225,145,.32)';ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.shadowBlur=10;ctx.shadowColor='#f0a33b';ctx.beginPath();ctx.moveTo(14,0);ctx.quadraticCurveTo(0,-12,-14,0);ctx.quadraticCurveTo(0,12,14,0);ctx.fill();ctx.stroke();ctx.restore();}
}

class MoriTrap extends Entity {
    constructor(owner,kind,x,surfaceY,life=6500){
        const dimensions=kind==='blade'?{w:150,h:8}:kind==='bomb'?{w:20,h:20}:kind==='machinegun'?{w:40,h:26}:{w:34,h:kind==='spear'?70:18};
        super(Math.max(0,Math.min(CANVAS_W-dimensions.w,x-dimensions.w/2)),surfaceY-dimensions.h,dimensions.w,dimensions.h);
        this.owner=owner;this.kind=kind;this.type='mori_ultimate_trap';this.life=life;this.warning=kind==='bomb'?500:700;this.triggered=false;this.hitTargets=new Set();this.vx=kind==='bomb'?(Math.random()<.5?-1:1)*4.5:0;this.untargetable=true;this.fireTimer=0;this.ammo=kind==='machinegun'?6:0;this.aimAngle=0;
    }
    hit(target,damage){target.takeDamage(damage,this.owner,false,true);this.hitTargets.add(target);}
    update(dt){
        this.life-=dt;this.warning=Math.max(0,this.warning-dt);if(this.life<=0||!this.owner||this.owner.dead){this.dead=true;return;}
        if(this.kind==='bomb'&&this.warning<=0){this.x+=this.vx;this.vy+=GRAVITY*.3;this.y+=this.vy;if(this.y+this.h>=GROUND_Y){this.y=GROUND_Y-this.h;this.vy=0;}if(this.x<=0||this.x+this.w>=CANVAS_W)this.vx*=-1;}
        if(this.warning>0)return;
        if(this.kind==='machinegun'){
            this.fireTimer-=dt;const targets=getHostileTargets(this.owner,this).filter(target=>Math.hypot(target.x+target.w/2-(this.x+this.w/2),target.y+target.h/2-(this.y+this.h/2))<=650);
            if(targets.length&&this.fireTimer<=0&&this.ammo>0){const target=targets.reduce((closest,candidate)=>Math.hypot(candidate.x-this.x,candidate.y-this.y)<Math.hypot(closest.x-this.x,closest.y-this.y)?candidate:closest);this.aimAngle=Math.atan2(target.y+target.h/2-(this.y+10),target.x+target.w/2-(this.x+this.w/2));const muzzleX=this.x+this.w/2+Math.cos(this.aimAngle)*25,muzzleY=this.y+10+Math.sin(this.aimAngle)*25;game.projectiles.push(new Projectile(muzzleX,muzzleY,10,4,Math.cos(this.aimAngle)*23,Math.sin(this.aimAngle)*23,8,this.owner,'#ffd166','mori_machinegun'));for(let i=0;i<5;i++)game.particles.push(new Particle(muzzleX,muzzleY,'#fff0a8',Math.cos(this.aimAngle)*(2+Math.random()*5),Math.sin(this.aimAngle)*(2+Math.random()*5),150,2));this.ammo--;this.fireTimer=140;}
            if(this.ammo<=0)this.dead=true;return;
        }
        for(const target of getHostileTargets(this.owner,this)){
            if(this.hitTargets.has(target)||!checkAABB(this,target))continue;
            if(this.kind==='spear'){this.hit(target,50);target.vx+=(target.x+target.w/2<this.x+this.w/2?-1:1)*8;target.vy=-9;this.dead=true;}
            else if(this.kind==='spring'){this.hit(target,20);target.vy=-23;target.vx*=.45;target.attackState='idle';this.dead=true;}
            else if(this.kind==='blade'){this.hit(target,40);target.buffs=target.buffs||{};target.buffs.dizzy=Math.max(target.buffs.dizzy||0,500);this.dead=true;}
            else {this.hit(target,60);const direction=target.x+target.w/2<this.x+this.w/2?-1:1;target.vx=direction*16;target.vy=-10;for(let i=0;i<28;i++)game.particles.push(new Particle(this.x+10,this.y+10,i%2?'#ffb13b':'#5c3022',(Math.random()-.5)*16,(Math.random()-.5)*16,480,5));this.dead=true;}
            break;
        }
    }
    draw(ctx){
        ctx.save();const blink=.35+Math.sin(Date.now()*.025)*.2;if(this.warning>0){ctx.fillStyle=`rgba(255,196,76,${blink})`;ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.strokeRect(this.x-5,this.y-5,this.w+10,this.h+10);ctx.fillRect(this.x,this.y+this.h-5,this.w,5);ctx.restore();return;}
        ctx.shadowBlur=10;ctx.shadowColor='#f0a33b';
        if(this.kind==='spear'){ctx.fillStyle='#d8dde0';ctx.beginPath();ctx.moveTo(this.x+this.w/2,this.y);ctx.lineTo(this.x+this.w,this.y+this.h);ctx.lineTo(this.x,this.y+this.h);ctx.fill();}
        else if(this.kind==='spring'){ctx.strokeStyle='#ffd166';ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<5;i++)ctx.lineTo(this.x+(i%2?this.w:0),this.y+i*this.h/4);ctx.stroke();}
        else if(this.kind==='blade'){ctx.strokeStyle='#fff1b0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(this.x,this.y+4);ctx.lineTo(this.x+this.w,this.y+4);ctx.stroke();ctx.strokeStyle='#f0a33b';ctx.setLineDash([7,5]);ctx.lineDashOffset=-Date.now()*.04;ctx.stroke();}
        else if(this.kind==='machinegun'){ctx.translate(this.x+this.w/2,this.y+10);ctx.fillStyle='#353b3e';ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.fillRect(-15,-9,30,18);ctx.strokeRect(-15,-9,30,18);ctx.rotate(this.aimAngle);ctx.fillStyle='#69747a';ctx.fillRect(0,-4,30,8);ctx.fillStyle='#ffd166';ctx.fillRect(25,-2,9,4);ctx.rotate(-this.aimAngle);ctx.fillStyle='#252a2d';ctx.fillRect(-18,9,36,7);}
        else {ctx.translate(this.x+10,this.y+10);ctx.rotate(Date.now()*.01);ctx.fillStyle='#35383b';ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#f04f3d';ctx.fillRect(-3,-3,6,6);}
        ctx.restore();
    }
}

class ThousandMechanisms extends Entity {
    constructor(owner){super(0,0,CANVAS_W,GROUND_Y);this.owner=owner;this.type='thousand_mechanisms';this.life=8000;this.maxLife=8000;this.spawnTimer=0;this.spawnCount=0;this.untargetable=true;}
    validSurfaces(){return [...PLATFORMS.map(platform=>({x:platform.x,w:platform.w,y:platform.y})),{x:30,w:Math.max(80,CANVAS_W-60),y:GROUND_Y}].filter(surface=>surface.w>=90);}
    spawnTrap(){
        const surfaces=this.validSurfaces();if(!surfaces.length)return;const surface=surfaces[this.spawnCount%surfaces.length];const kind=['spear','spring','blade','bomb','machinegun'][this.spawnCount%5];
        let x=surface.x+surface.w*(.2+Math.random()*.6);const enemies=getHostileTargets(this.owner,this);for(let attempt=0;attempt<4&&enemies.some(target=>Math.abs(target.x+target.w/2-x)<70&&Math.abs(target.y+target.h-surface.y)<90);attempt++)x=surface.x+surface.w*(.12+Math.random()*.76);
        game.hazards.push(new MoriTrap(this.owner,kind,x,surface.y,Math.min(6500,this.life)));this.spawnCount++;
    }
    update(dt){this.life-=dt;this.spawnTimer-=dt;while(this.spawnTimer<=0&&this.spawnCount<20&&this.life>0){this.spawnTrap();this.spawnTimer+=380;}if(this.life<=0){for(const hazard of game.hazards||[])if(hazard!==this&&hazard.owner===this.owner&&hazard.type==='mori_ultimate_trap')hazard.dead=true;this.dead=true;}}
    draw(ctx){ctx.save();ctx.fillStyle='rgba(240,163,59,.035)';ctx.fillRect(0,0,CANVAS_W,GROUND_Y);ctx.strokeStyle='rgba(255,209,102,.16)';ctx.lineWidth=1;for(let x=0;x<CANVAS_W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+80,GROUND_Y);ctx.stroke();}ctx.restore();}
}

class GelannFlameCone extends Entity {
    constructor(owner) {
        super(owner.x, owner.y, 190, 120);
        this.owner = owner;
        this.type = 'gelann_flame_cone';
        this.life = 1200;
        this.tickTimer = 0;
        this.hitTicks = new Map();
        this.untargetable = true;
    }
    contains(target) {
        const originX = this.owner.x + this.owner.w/2 + this.owner.facing * 18;
        const originY = this.owner.y + this.owner.h * 0.4;
        const dx = (target.x + target.w/2 - originX) * this.owner.facing;
        const dy = target.y + target.h/2 - originY;
        return dx >= 0 && dx <= 190 && Math.abs(dy) <= 24 + dx * 0.38;
    }
    update(dt) {
        if (!this.owner || this.owner.dead || this.life <= 0) { this.dead = true; return; }
        this.life -= dt;
        this.x = this.owner.facing > 0 ? this.owner.x + this.owner.w : this.owner.x - this.w;
        this.y = this.owner.y - 20;
        this.tickTimer -= dt;
        if (this.tickTimer <= 0) {
            this.tickTimer += 300;
            for (const target of getHostileTargets(this.owner, this)) {
                if (!this.contains(target)) continue;
                const ticks = this.hitTicks.get(target) || 0;
                if (ticks >= 3) continue;
                target.takeDamage(5, this.owner, true, true);
                target.buffs = target.buffs || {};
                target.buffs.burn = Math.max(target.buffs.burn || 0, 2000);
                target.buffs.gelannFlameSlow = Math.max(target.buffs.gelannFlameSlow || 0, 350);
                this.hitTicks.set(target, ticks + 1);
            }
        }
        const originX = this.owner.x + this.owner.w/2 + this.owner.facing * 22;
        const originY = this.owner.y + this.owner.h * 0.4;
        for (let i = 0; i < 3; i++) {
            const distance = 35 + Math.random() * 145;
            game.particles.push(new Particle(originX + this.owner.facing * distance, originY + (Math.random()-.5) * (20 + distance*.45), i % 2 ? '#ff7a18' : '#ffd166', this.owner.facing * (4 + Math.random()*5), (Math.random()-.5)*2, 180, 4 + Math.random()*5));
        }
    }
    draw(ctx) {
        const originX = this.owner.x + this.owner.w/2 + this.owner.facing * 18;
        const originY = this.owner.y + this.owner.h * 0.4;
        ctx.save();
        ctx.translate(originX, originY);
        if (this.owner.facing < 0) ctx.scale(-1, 1);
        const pulse = 0.13 + Math.sin(Date.now()*.025)*0.04;
        ctx.fillStyle = `rgba(255,92,22,${pulse})`;
        ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(190,-88);ctx.lineTo(190,88);ctx.lineTo(0,18);ctx.closePath();ctx.fill();
        ctx.strokeStyle = 'rgba(255,205,92,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-18);ctx.quadraticCurveTo(100,-70,190,-88);ctx.moveTo(0,18);ctx.quadraticCurveTo(100,70,190,88);ctx.stroke();
        ctx.restore();
    }
}

class GelannArrowRain extends Entity {
    constructor(owner, targetX) {
        const width = CANVAS_W;
        super(0, 0, width, GROUND_Y);
        this.owner = owner;
        this.type = 'gelann_arrow_rain';
        this.warning = 750;
        this.duration = 2500;
        this.tickTimer = 0;
        this.hitCooldowns = new Map();
        this.untargetable = true;
        this.arrows = Array.from({ length: 34 }, (_, index) => ({ x: (index * 83) % width, delay: (index * 97) % 520, speed: 18 + index % 6 }));
    }
    update(dt) {
        if (!this.owner || this.owner.dead) { this.dead = true; return; }
        if (this.warning > 0) { this.warning = Math.max(0, this.warning - dt); return; }
        this.duration -= dt;
        for (const [target, cooldown] of this.hitCooldowns) {
            const next = cooldown - dt;
            if (next <= 0 || !target || target.dead) this.hitCooldowns.delete(target);
            else this.hitCooldowns.set(target, next);
        }
        this.tickTimer -= dt;
        if (this.tickTimer <= 0) {
            this.tickTimer += 500;
            for (const target of getHostileTargets(this.owner, this)) {
                const centerX = target.x + target.w/2;
                if (centerX < this.x || centerX > this.x + this.w || this.hitCooldowns.has(target)) continue;
                target.takeDamage(12, this.owner, false, true);
                target.buffs = target.buffs || {};
                target.buffs.gelannArrowSlow = Math.max(target.buffs.gelannArrowSlow || 0, 2000);
                this.hitCooldowns.set(target, 450);
            }
        }
        if (this.duration <= 0) this.dead = true;
    }
    draw(ctx) {
        ctx.save();
        if (this.warning > 0) {
            const blink = .12 + Math.sin(Date.now()*.025)*.07;
            ctx.fillStyle = `rgba(215,53,38,${blink})`;ctx.fillRect(this.x,0,this.w,GROUND_Y);
            ctx.strokeStyle = '#ffcf66';ctx.lineWidth=3;ctx.setLineDash([14,9]);ctx.strokeRect(this.x+2,2,this.w-4,GROUND_Y-4);
        } else {
            ctx.fillStyle = 'rgba(84,20,18,.09)';ctx.fillRect(this.x,0,this.w,GROUND_Y);
            const elapsed = 2500 - this.duration;
            for (const arrow of this.arrows) {
                const y = ((elapsed - arrow.delay) * arrow.speed * .1) % (GROUND_Y + 100) - 70;
                if (y < -60) continue;
                const ax = this.x + arrow.x;
                ctx.strokeStyle = '#34302b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ax,y);ctx.lineTo(ax-5,y-34);ctx.stroke();
                ctx.fillStyle='#d8b45d';ctx.beginPath();ctx.moveTo(ax,y+8);ctx.lineTo(ax-6,y-3);ctx.lineTo(ax+3,y-1);ctx.closePath();ctx.fill();
            }
        }
        ctx.restore();
    }
}

class RokaCannonball extends Entity {
    constructor(owner, x, y, vx, vy, artillery = false) {
        super(x - 14, y - 14, 28, 28);
        this.owner = owner; this.type = 'roka_cannonball'; this.vx = vx; this.vy = vy;
        this.damage = artillery ? 50 : 40; this.radius = artillery ? 165 : 110;
        this.knockback = artillery ? 22.5 : 15; this.life = 2200; this.artillery = artillery;
    }
    explode() {
        if (this.dead) return;
        this.dead = true;
        const cx = this.x + this.w/2, cy = this.y + this.h/2;
        for (const target of getHostileTargets(this.owner, this)) {
            const dx = target.x + target.w/2 - cx, dy = target.y + target.h/2 - cy;
            const distance = Math.hypot(dx, dy);
            if (distance > this.radius) continue;
            target.takeDamage(this.damage, this.owner, false, true);
            const scale = 1 - distance / this.radius * 0.45;
            target.vx = dx / Math.max(1, distance) * this.knockback * scale;
            target.vy = Math.min(-5, dy / Math.max(1, distance) * this.knockback - 5);
        }
        for (let i = 0; i < (this.artillery ? 62 : 44); i++) {
            const angle = Math.random() * Math.PI * 2, speed = 4 + Math.random() * (this.artillery ? 20 : 15);
            game.particles.push(new Particle(cx, cy, i % 3 ? '#ff9f1c' : '#fff2b2', Math.cos(angle)*speed, Math.sin(angle)*speed, 420 + Math.random()*280, 4 + Math.random()*6));
        }
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy; this.vy += GRAVITY * 0.08; this.life -= dt;
        if (getHostileTargets(this.owner, this).some(target => checkAABB(this, target))) return this.explode();
        const surface = this.x <= 0 || this.x + this.w >= CANVAS_W || this.y <= 0 || this.y + this.h >= GROUND_Y
            || PLATFORMS.some(platform => checkAABB(this, platform));
        if (surface || this.life <= 0) this.explode();
    }
    draw(ctx) {
        const cx=this.x+this.w/2,cy=this.y+this.h/2;
        ctx.save();ctx.translate(cx,cy);ctx.fillStyle='#263238';ctx.strokeStyle=this.artillery?'#ffe066':'#9ed6e5';ctx.lineWidth=4;
        ctx.shadowBlur=this.artillery?18:9;ctx.shadowColor=this.artillery?'#ffb000':'#7dd7ef';ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    }
}

class RokaMortarShell extends Entity {
    constructor(owner, targetX, targetY) {
        super(owner.x + owner.w/2 - 10, owner.y + 8, 20, 26);
        this.owner=owner;this.type='roka_mortar';this.targetX=Math.max(30,Math.min(CANVAS_W-30,targetX));
        this.targetY=Math.max(80,Math.min(GROUND_Y,targetY));this.elapsed=0;this.riseTime=650;this.warningTime=1300;
        this.damage=30;this.radius=105;this.untargetable=true;
    }
    impact() {
        if(this.dead)return;this.dead=true;
        for(const target of getHostileTargets(this.owner,this)){
            const dx=target.x+target.w/2-this.targetX,dy=target.y+target.h/2-this.targetY,distance=Math.hypot(dx,dy);
            if(distance>this.radius)continue;target.takeDamage(this.damage,this.owner,false,true);target.vx=dx/Math.max(1,distance)*7;target.vy=-18;
        }
        for(let i=0;i<40;i++){const angle=Math.random()*Math.PI*2,speed=3+Math.random()*14;game.particles.push(new Particle(this.targetX,this.targetY,i%2?'#ffb347':'#5d6970',Math.cos(angle)*speed,Math.sin(angle)*speed,500,4+Math.random()*5));}
    }
    update(dt){
        this.elapsed+=dt;
        if(this.elapsed<this.riseTime){const progress=this.elapsed/this.riseTime;this.x+=(this.targetX-this.x)*.035;this.y=this.owner.y+8-progress*420;}
        else {const progress=Math.min(1,(this.elapsed-this.riseTime)/(this.warningTime-this.riseTime));this.x=this.targetX-this.w/2;this.y=-55+(this.targetY+35)*progress*progress;}
        if(this.elapsed>=this.warningTime)this.impact();
    }
    draw(ctx){
        const blink=.25+Math.sin(Date.now()*.025)*.16;ctx.save();ctx.fillStyle=`rgba(255,92,35,${blink})`;ctx.strokeStyle='#ff9f1c';ctx.lineWidth=3;
        ctx.beginPath();ctx.ellipse(this.targetX,this.targetY,55,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.fillStyle='#30383c';ctx.strokeStyle='#ffd166';ctx.fillRect(this.x,this.y,this.w,this.h);ctx.strokeRect(this.x,this.y,this.w,this.h);ctx.restore();
    }
}

class TemporalBolt extends Entity {
    constructor(owner,x,y,vx,vy,damage=15,kind='shard'){
        super(x-9,y-7,18,14);this.owner=owner;this.type=kind==='copy'?'voss_copy_bolt':'temporal_shard';this.vx=vx;this.vy=vy;
        this.damage=damage;this.kind=kind;this.life=1200;this.hitTargets=new Set();
    }
    update(dt){
        this.x+=this.vx;this.y+=this.vy;this.life-=dt;
        for(const target of getHostileTargets(this.owner,this)){if(this.hitTargets.has(target)||!checkAABB(this,target))continue;target.takeDamage(this.damage,this.owner,false,true);target.buffs=target.buffs||{};target.buffs.slow=Math.max(target.buffs.slow||0,this.kind==='copy'?550:700);this.hitTargets.add(target);this.dead=true;break;}
        if(this.life<=0||this.x<-40||this.x>CANVAS_W+40||this.y<-40||this.y>CANVAS_H+40)this.dead=true;
    }
    draw(ctx){ctx.save();ctx.translate(this.x+this.w/2,this.y+this.h/2);ctx.rotate(Math.atan2(this.vy,this.vx));ctx.fillStyle=this.kind==='copy'?'#f5c2ff':'#8be9ff';ctx.shadowBlur=13;ctx.shadowColor='#8c6cff';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-7);ctx.lineTo(-3,0);ctx.lineTo(-8,7);ctx.closePath();ctx.fill();ctx.restore();}
}

class VossTemporalDouble extends Entity {
    constructor(owner,x,y){super(Math.max(0,Math.min(CANVAS_W-owner.w,x)),Math.max(0,Math.min(GROUND_Y-owner.h,y)),owner.w,owner.h);this.owner=owner;this.type='voss_double';this.life=6000;this.maxLife=6000;this.untargetable=true;this.queue=[];this.facing=-owner.facing;this.moveSpeed=20;}
    mirrorAttack(data){if(!this.dead)this.queue.push({...data,delay:180});}
    fire(data){
        const px=this.x+this.w/2+this.facing*this.w*.45,py=this.y+this.h*.4;
        const dx=data.targetX-px,dy=data.targetY-py,length=Math.max(1,Math.hypot(dx,dy));
        game.projectiles.push(new TemporalBolt(this.owner,px,py,dx/length*18,dy/length*18,Math.max(1,data.damage*.5),data.kind||'copy'));
        for(let i=0;i<9;i++)game.particles.push(new Particle(px,py,'#c9b8ff',(Math.random()-.5)*7,(Math.random()-.5)*7,260,3));
    }
    update(dt){
        this.life-=dt;
        if(this.owner&&!this.owner.dead){
            const targetX=Math.max(0,Math.min(CANVAS_W-this.w,CANVAS_W-this.owner.x-this.owner.w));
            const targetY=Math.max(0,Math.min(GROUND_Y-this.h,this.owner.y));
            const frameScale=Math.max(0,dt/16.667),dx=targetX-this.x,dy=targetY-this.y,distance=Math.hypot(dx,dy),step=this.moveSpeed*frameScale;
            if(distance<=step){this.x=targetX;this.y=targetY;}else if(distance>0){this.x+=dx/distance*step;this.y+=dy/distance*step;}
            this.facing=-this.owner.facing;
        }
        for(const item of this.queue)item.delay-=dt;const ready=this.queue.filter(item=>item.delay<=0);this.queue=this.queue.filter(item=>item.delay>0);ready.forEach(item=>this.fire(item));if(this.life<=0||!this.owner||this.owner.dead)this.dead=true;
    }
    draw(ctx){ctx.save();ctx.globalAlpha=.28+.28*this.life/this.maxLife;ctx.translate(this.x+this.w/2,this.y);if(this.facing<0)ctx.scale(-1,1);ctx.fillStyle='#29225b';ctx.fillRect(-this.w/2,0,this.w,this.h);ctx.strokeStyle='#b8a6ff';ctx.lineWidth=3;ctx.strokeRect(-this.w/2-3,-3,this.w+6,this.h+6);ctx.fillStyle='#dffaff';ctx.fillRect(this.w/2-12,10,8,7);ctx.restore();}
}

class DemolitionZone extends Entity {
    constructor(owner,x,y){super(x-240,y-150,480,300);this.owner=owner;this.type='demolition_zone';this.life=3500;this.maxLife=3500;this.elapsed=0;this.nextBlast=2000;this.blastIndex=0;this.fieldPulseTimer=0;this.untargetable=true;}
    update(dt){
        this.elapsed+=dt;this.life-=dt;
        if(this.elapsed>=2000){
            this.fieldPulseTimer+=dt;const dizzyPulse=this.fieldPulseTimer>=500;if(dizzyPulse)this.fieldPulseTimer%=500;
            const cx=this.x+this.w/2,cy=this.y+this.h/2;
            for(const target of getHostileTargets(this.owner,this)){const nx=(target.x+target.w/2-cx)/(this.w/2),ny=(target.y+target.h/2-cy)/(this.h/2);if(nx*nx+ny*ny>1)continue;target.buffs=target.buffs||{};target.buffs.slow=Math.max(target.buffs.slow||0,420);if(dizzyPulse)target.buffs.dizzy=Math.max(target.buffs.dizzy||0,220);}
        }
        while(this.elapsed>=this.nextBlast&&this.blastIndex<8){const center=this.blastIndex===0;const angle=(this.blastIndex-1)*Math.PI*2/7;const radius=center?0:90+((this.blastIndex%2)*90);const x=this.x+this.w/2+Math.cos(angle)*radius,y=this.y+this.h/2+Math.sin(angle)*radius*.55;const marker=new BromBlastCharge(this.owner,x-8,y-8,0,0);marker.dead=false;marker.explode(center?115:80,center?300:120,center?350:160,new Set(),center?22:15);this.blastIndex++;this.nextBlast=2000+this.blastIndex*(1500/7);}if(this.life<=0)this.dead=true;
    }
    draw(ctx){ctx.save();const warning=this.elapsed<2000;ctx.fillStyle=warning?'rgba(255,90,30,.16)':'rgba(255,160,40,.09)';ctx.strokeStyle=warning?'#ff6a2a':'#ffb020';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(this.x+this.w/2,this.y+this.h/2,this.w/2,this.h/2,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
}

class TitanAxe extends Entity {
    constructor(owner,x,impactY){
        super(x-55,220,110,190);this.owner=owner;this.type='titan_axe';this.targetX=x;this.startY=220;
        this.impactY=Math.max(100,Math.min(GROUND_Y,impactY));this.elapsed=0;this.warningTime=900;this.fallTime=550;
        this.impacted=false;this.impactLife=450;this.untargetable=true;
    }
    impact(){
        if(this.impacted)return;this.impacted=true;let totalActualDamage=0;
        for(const target of getHostileTargets(this.owner,this)){
            const dx=target.x+target.w/2-this.targetX,dy=target.y+target.h/2-this.impactY,distance=Math.hypot(dx,dy);
            if(distance>150)continue;
            const usesHorse=target.heroName==='Duke'&&target.isMounted;
            const before=usesHorse?target.horseHp:target.hp;
            target.takeDamage(100,this.owner,false,true);
            const after=usesHorse?target.horseHp:target.hp;
            totalActualDamage+=Math.max(0,Math.max(0,before||0)-Math.max(0,after||0));
            target.vx=dx/Math.max(1,distance)*30;target.vy=-12;
        }
        if(totalActualDamage>0&&this.owner&&!this.owner.dead)this.owner.hp=Math.min(this.owner.maxHp,this.owner.hp+totalActualDamage*.25);
        for(let i=0;i<58;i++)game.particles.push(new Particle(this.targetX,this.impactY,i%3===0?'#c9d0d4':(i%2?'#ffcf5a':'#2468c9'),(Math.random()-.5)*28,-Math.random()*20,700,7));
        game.hitstop=120;
    }
    update(dt){
        if(!this.owner||this.owner.dead){this.dead=true;return;}
        if(this.impacted){this.impactLife-=dt;if(this.impactLife<=0)this.dead=true;return;}
        this.elapsed+=dt;
        if(this.elapsed>this.warningTime){const progress=Math.min(1,(this.elapsed-this.warningTime)/this.fallTime);this.y=this.startY+(this.impactY-this.h-this.startY)*progress;if(progress>=1)this.impact();}
    }
    draw(ctx){
        ctx.save();
        if(!this.impacted){
            const pulse=1+Math.sin(this.elapsed*.025)*.08;ctx.strokeStyle='#ffcf5a';ctx.fillStyle='rgba(36,104,201,.18)';ctx.lineWidth=4;
            ctx.beginPath();ctx.ellipse(this.targetX,this.impactY,150*pulse,48*pulse,0,0,Math.PI*2);ctx.fill();ctx.stroke();
            ctx.translate(this.x+this.w/2,this.y+this.h/2);ctx.fillStyle='#102a52';ctx.fillRect(-11,-62,22,135);ctx.fillStyle='#ffcf5a';ctx.fillRect(-16,35,32,20);
            ctx.fillStyle='#2468c9';ctx.strokeStyle='#ffcf5a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-7,-88);ctx.lineTo(-47,-75);ctx.lineTo(-55,-42);ctx.lineTo(-35,0);ctx.lineTo(-7,-18);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.beginPath();ctx.moveTo(7,-88);ctx.lineTo(47,-75);ctx.lineTo(55,-42);ctx.lineTo(35,0);ctx.lineTo(7,-18);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.fillStyle='#ffcf5a';ctx.fillRect(-14,-47,28,18);ctx.fillRect(-5,-84,10,54);
        }else{
            const progress=1-this.impactLife/450;ctx.strokeStyle=`rgba(255,207,90,${1-progress})`;ctx.lineWidth=12*(1-progress)+2;
            ctx.beginPath();ctx.ellipse(this.targetX,this.impactY,40+progress*150,14+progress*42,0,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();
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

    takeDamage(amount, attacker) {
        if (this.dead || this.invincible > 0) return;
        window.audioManager?.playEntityHit(this, attacker, amount);
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

    takeDamage(amount, attacker) {
        if (this.dead || this.invincible > 0) return;
        window.audioManager?.playEntityHit(this, attacker, amount);
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

class DogelChainHook extends Entity {
    constructor(owner, target) {
        super(owner.x + owner.w/2, owner.y + 24, 18, 18);
        this.owner = owner; this.target = target; this.type = 'dogel_chain_hook';
        this.life = 900; this.phase = 'out'; this.hitTarget = null; this.speed = 19;
        const tx = target ? target.x + target.w/2 : this.x + owner.facing*520;
        const ty = target ? target.y + target.h/2 : this.y;
        const angle = Math.atan2(ty-this.y,tx-this.x); this.vx=Math.cos(angle)*this.speed; this.vy=Math.sin(angle)*this.speed;
        this.untargetable = true;
    }
    update(dt) {
        if (!this.owner || this.owner.dead) { this.dead=true; return; }
        this.life -= dt;
        if (this.phase === 'out') {
            this.x += this.vx; this.y += this.vy;
            const targets=[...game.getOpponentsOf(this.owner),...game.minions.filter(m=>m&&m!==this&&m.owner!==this.owner&&!m.dead&&!m.untargetable&&!m.isBoss)];
            const hit=targets.find(target=>checkAABB(this,target));
            if(hit){this.hitTarget=hit;this.phase='pull';this.life=650;hit.takeDamage(10,this.owner);if(hit.buffs)hit.buffs.dizzy=Math.max(hit.buffs.dizzy||0,320);}
        } else if (this.hitTarget && !this.hitTarget.dead) {
            const tx=this.owner.x+this.owner.w/2,ty=this.owner.y+this.owner.h/2;
            const hx=this.hitTarget.x+this.hitTarget.w/2,hy=this.hitTarget.y+this.hitTarget.h/2;
            const dx=tx-hx,dy=ty-hy,dist=Math.max(1,Math.hypot(dx,dy));
            this.hitTarget.x+=dx/dist*Math.min(22,dist);this.hitTarget.y+=dy/dist*Math.min(18,dist);
            this.x=hx;this.y=hy;
            if(dist<70)this.life=0;
        }
        if(this.life<=0||this.x<-60||this.x>CANVAS_W+60||this.y<-80||this.y>GROUND_Y+80)this.dead=true;
    }
    draw(ctx){ctx.save();ctx.strokeStyle='#b9a17a';ctx.lineWidth=3;ctx.setLineDash([7,4]);ctx.beginPath();ctx.moveTo(this.owner.x+this.owner.w/2,this.owner.y+30);ctx.lineTo(this.x+9,this.y+9);ctx.stroke();ctx.setLineDash([]);ctx.translate(this.x+9,this.y+9);let angle=Math.atan2(this.vy,this.vx);if(this.phase==='pull'&&this.hitTarget)angle=Math.atan2(this.owner.y+this.owner.h/2-this.y,this.owner.x+this.owner.w/2-this.x);ctx.rotate(angle);ctx.fillStyle='#4a2818';ctx.fillRect(-12,-3,16,6);ctx.fillStyle='#d8d3c4';ctx.strokeStyle='#747f86';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(3,-3);ctx.lineTo(27,-3);ctx.lineTo(34,0);ctx.lineTo(27,3);ctx.lineTo(3,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
}

class LapisStone extends Entity {
    constructor(owner,index,target,judgment=false) {
        const sizes=[14,20,28,38,50], orbit=owner.getLapisOrbitPosition?owner.getLapisOrbitPosition(index):{x:owner.x,y:owner.y};
        super(orbit.x-sizes[index]/2,orbit.y-sizes[index]/2,sizes[index],sizes[index]);
        this.owner=owner;this.sourceOwner=owner;this.target=target;this.index=index;this.type='lapis_stone';this.judgment=judgment;
        this.damage=[15,20,30,40,50][index];this.speed=[20,17,14,11,8][index];this.castTimer=judgment?180:360;
        this.maxHp=[10,14,18,24,32][index];this.hp=this.maxHp;
        this.life=4000;this.angle=index;this.hit=false;this.untargetable=false;this.deflected=false;
        if(owner.lapisStoneInFlight){owner.lapisStoneInFlight[index]++;owner.lapisStoneAvailable[index]=false;}
    }
    finish(){if(this.dead)return;if(this.sourceOwner?.lapisStoneInFlight){this.sourceOwner.lapisStoneInFlight[this.index]=Math.max(0,this.sourceOwner.lapisStoneInFlight[this.index]-1);this.sourceOwner.lapisStoneAvailable[this.index]=this.sourceOwner.lapisStoneInFlight[this.index]===0;}this.dead=true;}
    takeDamage(amount,attacker){
        if(this.dead||attacker===this.owner)return false;
        this.hp-=Math.max(0,amount||0);
        for(let i=0;i<6;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,'#b9d1ff',(Math.random()-.5)*9,(Math.random()-.5)*9,220,3));
        if(this.hp<=0)this.finish();
        return true;
    }
    canBeDeflectedBy(fighter){
        return fighter?.heroName==='Sola'&&(fighter.solaChargeTimer>0||((fighter.attackState==='windup'||fighter.attackState==='active')&&fighter.isMeleeAttack?.()));
    }
    deflect(deflector){
        if(this.dead||!this.canBeDeflectedBy(deflector))return false;
        const previousOwner=this.owner;
        this.owner=deflector;this.target=previousOwner;this.castTimer=0;this.judgment=false;this.hit=false;this.deflected=true;
        this.life=Math.max(this.life,2400);this.speed=Math.max(this.speed,18);
        deflector.solaFocus=Math.min(3,(deflector.solaFocus||0)+1);
        for(let i=0;i<14;i++)game.particles.push(new Particle(this.x+this.w/2,this.y+this.h/2,'#8ffcff',(Math.random()-.5)*16,(Math.random()-.5)*16,280,4));
        return true;
    }
    update(dt){
        if(!this.owner||this.owner.dead){this.finish();return;}this.life-=dt;this.angle+=dt*.008;
        if(this.castTimer>0){this.castTimer-=dt;const p=1-Math.max(0,this.castTimer)/(this.judgment?180:360);const origin=this.owner.getLapisOrbitPosition(this.index);this.x=origin.x-this.w/2;this.y=origin.y-this.h/2-45*Math.sin(p*Math.PI);return;}
        if(!this.target||this.target.dead){this.finish();return;}
        if(this.canBeDeflectedBy(this.target)&&checkAABB(this,this.target)){this.deflect(this.target);return;}
        const tx=this.target.x+this.target.w/2,ty=this.target.y+this.target.h/2;
        let dx=tx-(this.x+this.w/2),dy=ty-(this.y+this.h/2),dist=Math.max(1,Math.hypot(dx,dy));
        if(this.judgment){const a=this.index*Math.PI*2/5;dx+=Math.cos(a)*Math.min(80,dist*.25);dy+=Math.sin(a)*Math.min(80,dist*.25);dist=Math.max(1,Math.hypot(dx,dy));}
        this.x+=dx/dist*this.speed;this.y+=dy/dist*this.speed;
        if(this.canBeDeflectedBy(this.target)&&checkAABB(this,this.target)){this.deflect(this.target);return;}
        if((dist<this.speed+Math.max(this.w,this.h)*.5||checkAABB(this,this.target))&&!this.hit){
            this.hit=true;this.target.takeDamage(this.judgment?Math.max(10,this.damage*.45):this.damage,this.owner);
            if(this.target.buffs&&this.judgment)this.target.buffs.dizzy=Math.max(this.target.buffs.dizzy||0,420);
            this.target.vx=(this.x<tx?1:-1)*(3+this.index*2);this.target.vy=-2-this.index;
            for(let i=0;i<12;i++)game.particles.push(new Particle(tx,ty,this.index%2?'#8fb7ff':'#d7e3ff',(Math.random()-.5)*12,(Math.random()-.5)*12,320,4));
            this.finish();
        } else if(this.life<=0)this.finish();
    }
    draw(ctx){ctx.save();ctx.translate(this.x+this.w/2,this.y+this.h/2);ctx.rotate(this.angle);ctx.shadowBlur=12;ctx.shadowColor=this.deflected?'#8ffcff':'#7ca6ff';ctx.fillStyle=this.deflected?'#bffaff':['#c5dbff','#9dbde9','#7193ce','#4e70ad','#354c86'][this.index];ctx.fillRect(-this.w/2,-this.h/2,this.w,this.h);ctx.strokeStyle='#e8f1ff';ctx.lineWidth=2;ctx.strokeRect(-this.w/2+2,-this.h/2+2,this.w-4,this.h-4);if(this.hp<this.maxHp){ctx.strokeStyle='#33496f';ctx.beginPath();ctx.moveTo(-this.w*.25,-this.h*.45);ctx.lineTo(this.w*.08,-this.h*.08);ctx.lineTo(-this.w*.12,this.h*.2);ctx.lineTo(this.w*.3,this.h*.45);ctx.stroke();}ctx.restore();}
}

class ToniaGrenade extends Entity {
    constructor(owner,vx,vy){super(owner.x+owner.w/2,owner.y+22,14,14);this.owner=owner;this.vx=vx;this.vy=vy;this.type='tonia_grenade';this.life=2600;this.untargetable=true;}
    explode(){if(this.dead)return;this.dead=true;game.createExplosion(this.x+7,this.y+7,58,15,this.owner,false,300);}
    update(dt){this.life-=dt;this.x+=this.vx;this.y+=this.vy;this.vy+=GRAVITY*.55;if(this.y+this.h>=GROUND_Y||this.life<=0)this.explode();else{const t=game.getOpponentsOf(this.owner).find(o=>!o.dead&&checkAABB(this,o));if(t)this.explode();}}
    draw(ctx){ctx.save();ctx.translate(this.x+7,this.y+7);ctx.rotate(Date.now()*.02);ctx.fillStyle='#303838';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d1a44c';ctx.fillRect(-2,-9,4,5);ctx.restore();}
}

class ToniaMissile extends Entity {
    constructor(owner,target,offset){super(owner.x+owner.w/2+offset,owner.y+8,30,12);this.owner=owner;this.target=target;this.type='tonia_missile';this.life=5000;this.trackTimer=1500;this.angle=-Math.PI/2+offset*.012;this.speed=9;this.untargetable=true;}
    explode(){if(this.dead)return;this.dead=true;game.createExplosion(this.x+15,this.y+6,92,40,this.owner,false,520);}
    update(dt){this.life-=dt;this.trackTimer-=dt;if(this.trackTimer>0&&this.target&&!this.target.dead){const desired=Math.atan2(this.target.y+this.target.h/2-(this.y+6),this.target.x+this.target.w/2-(this.x+15));let diff=Math.atan2(Math.sin(desired-this.angle),Math.cos(desired-this.angle));this.angle+=Math.max(-.075,Math.min(.075,diff));}this.speed=Math.min(17,this.speed+.12);this.vx=Math.cos(this.angle)*this.speed;this.vy=Math.sin(this.angle)*this.speed;this.x+=this.vx;this.y+=this.vy;const hit=game.getOpponentsOf(this.owner).find(t=>!t.dead&&checkAABB(this,t));if(hit||this.life<=0||this.x<-80||this.x>CANVAS_W+80||this.y<-120||this.y>GROUND_Y+80)this.explode();}
    draw(ctx){ctx.save();ctx.translate(this.x+15,this.y+6);ctx.rotate(this.angle);ctx.fillStyle='#545d5b';ctx.fillRect(-13,-5,24,10);ctx.fillStyle='#d8d8cf';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(8,-6);ctx.lineTo(8,6);ctx.fill();ctx.fillStyle='#ff9f43';ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-24,-6);ctx.lineTo(-21,0);ctx.lineTo(-24,6);ctx.fill();ctx.restore();}
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
        window.audioManager?.playEntityHit(this, attacker, amount);
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
        this.hp = 20;
        this.maxHp = 20;
        this.life = 22000;
        this.slot = slot;
        this.shootTimer = 500 + slot * 260;
        this.buffs = { dizzy: 0, slow: 0, burn: 0 };
        this.invincible = 0;
    }

    takeDamage(amount, attacker) {
        if (this.dead || this.invincible > 0) return;
        window.audioManager?.playEntityHit(this, attacker, amount);
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
        this.flameTurnRate = 0.00055;
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
            const angleDifference = Math.atan2(Math.sin(desired - this.flameAngle), Math.cos(desired - this.flameAngle));
            const maxTurn = dt <= 0 ? Math.PI : this.flameTurnRate * dt;
            this.flameAngle += Math.max(-maxTurn, Math.min(maxTurn, angleDifference));
            this.facing = Math.cos(this.flameAngle) >= 0 ? 1 : -1;
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

    takeDamage(amount, attacker) {
        if (this.dead || this.invincible > 0) return;
        window.audioManager?.playEntityHit(this, attacker, amount);
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

class AbyssTentacle extends Entity {
    constructor(owner,x){super(x,GROUND_Y-92,42,92);this.owner=owner;this.type='abyss_tentacle';this.hp=28;this.maxHp=28;this.life=9000;this.attackTimer=550;this.buffs={dizzy:0,slow:0};}
    takeDamage(amount,attacker){this.hp-=Math.max(0,amount||0);if(this.hp<=0)this.dead=true;window.audioManager?.playEntityHit(this,attacker,amount);}
    update(dt){if(!this.owner||this.owner.dead){this.dead=true;return;}this.life-=dt;this.attackTimer-=dt;if(this.life<=0){this.dead=true;return;}if(this.buffs.dizzy>0){this.buffs.dizzy-=dt;return;}const target=game.getOpponentsOf(this.owner).filter(t=>!t.dead).sort((a,b)=>Math.abs(a.x-this.x)-Math.abs(b.x-this.x))[0];if(target&&Math.abs(target.x+target.w/2-(this.x+21))<105&&this.attackTimer<=0){target.takeDamage(22,this.owner);target.vy=-8;target.vx=(target.x<this.x?-1:1)*8;this.attackTimer=1100;}}
    draw(ctx){ctx.save();ctx.strokeStyle='#185e73';ctx.lineWidth=32;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(this.x+21,this.y+this.h);ctx.quadraticCurveTo(this.x-10+Math.sin(Date.now()*.008)*25,this.y+38,this.x+25,this.y+8);ctx.stroke();ctx.strokeStyle='#4fb8b0';ctx.lineWidth=6;ctx.stroke();ctx.restore();}
}

class AbyssWave extends Entity {
    constructor(owner,direction=1,giant=false){super(direction>0?-220:CANVAS_W,GROUND_Y-(giant?240:150),220,giant?240:150);this.owner=owner;this.direction=direction;this.type='abyss_wave';this.speed=(giant?13:10)*direction;this.damage=giant?65:38;this.hit=new Set();this.life=6000;this.untargetable=true;}
    update(dt){this.life-=dt;this.x+=this.speed*Math.min(2,Math.max(.25,dt/16.67));for(const target of game.getOpponentsOf(this.owner)){if(!this.hit.has(target)&&checkAABB(this,target)){this.hit.add(target);target.takeDamage(this.damage,this.owner);target.vx=this.direction*18;target.vy=-5;}}if(this.life<=0||this.x>CANVAS_W+260||this.x<-260)this.dead=true;}
    draw(ctx){ctx.save();ctx.fillStyle='rgba(36,164,190,.48)';ctx.strokeStyle='#8ee7e8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(this.x,this.y+this.h);for(let i=0;i<=5;i++){const px=this.x+i*this.w/5,py=this.y+32+Math.sin(Date.now()*.01+i)*18;ctx.lineTo(px,py);}ctx.lineTo(this.x+this.w,this.y+this.h);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
}

class AbyssBoss extends BossBase {
    constructor(x,groundY){super('abyss',x,groundY,260,220);this.type='boss_abyss';this.y=groundY-this.h;this.biteTimer=0;this.waveTimer=0;this.pullTimer=0;this.tentacleTimer=0;this.biteWarning=0;this.biteX=0;this.pullActive=0;this.drowningTimer=0;this.phaseTriggered=false;}
    summonTentacles(count=4){for(let i=0;i<count;i++)game.minions.push(new AbyssTentacle(this,80+Math.random()*(CANVAS_W-160)));}
    startBite(target){if(!target)return;this.biteWarning=750;this.biteX=target.x+target.w/2;}
    releaseBite(){const box={x:this.biteX-115,y:GROUND_Y-190,w:230,h:190};for(const p of this.getPlayers())if(checkAABB(box,p)){p.takeDamage(110,this,false,true);p.vx=(p.x<this.biteX?-1:1)*22;p.vy=-10;}this.biteWarning=0;}
    update(dt){if(!this.updateBossStatus(dt))return;const rate=this.drowningTimer>0?1.45:1;this.biteTimer+=dt*rate;this.waveTimer+=dt*rate;this.pullTimer+=dt*rate;this.tentacleTimer+=dt*rate;if(this.drowningTimer>0){this.drowningTimer=Math.max(0,this.drowningTimer-dt);for(const p of this.getPlayers())if(p.y+p.h>GROUND_Y-105)p.buffs.slow=Math.max(p.buffs.slow||0,180);}if(!this.phaseTriggered&&this.hp<=this.maxHp*.5){this.phaseTriggered=true;this.drowningTimer=15000;for(let i=0;i<4;i++)game.hazards.push(new AbyssWave(this,i%2?1:-1,true));}
        if(this.biteWarning>0){this.biteWarning-=dt;if(this.biteWarning<=0)this.releaseBite();}
        if(this.pullActive>0){this.pullActive-=dt;const mouthX=this.x+this.w/2;for(const p of this.getPlayers()){const dx=mouthX-(p.x+p.w/2),dist=Math.max(40,Math.abs(dx));p.vx+=Math.sign(dx)*(1.1+900/dist);if(this.pullActive<=0&&dist<105)p.takeDamage(125,this,false,true);}}
        if(this.biteTimer>=8000){this.biteTimer-=8000;this.startBite(this.getNearestPlayer());}if(this.waveTimer>=12000){this.waveTimer-=12000;game.hazards.push(new AbyssWave(this,this.x>CANVAS_W/2?-1:1));}if(this.pullTimer>=15000){this.pullTimer-=15000;this.pullActive=4000;}const interval=this.drowningTimer>0?6500:10000;if(this.tentacleTimer>=interval){this.tentacleTimer-=interval;this.summonTentacles(this.drowningTimer>0?6:4);}this.x=CANVAS_W-this.w-30;this.y=GROUND_Y-this.h;}
    draw(ctx){ctx.save();if(this.drowningTimer>0){ctx.fillStyle='rgba(15,105,138,.24)';ctx.fillRect(0,GROUND_Y-115,CANVAS_W,115);}if(this.biteWarning>0){ctx.fillStyle='rgba(255,74,74,.2)';ctx.strokeStyle='#ff6b6b';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(this.biteX,GROUND_Y-80,115,95,0,0,Math.PI*2);ctx.fill();ctx.stroke();}if(this.pullActive>0){ctx.strokeStyle='rgba(96,220,230,.38)';ctx.lineWidth=8;for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(this.x+this.w/2,this.y+95,70+i*48,Date.now()*.003+i,Date.now()*.003+i+2.3);ctx.stroke();}}ctx.translate(this.x+this.w/2,this.y+this.h/2);ctx.fillStyle='#103e51';ctx.beginPath();ctx.ellipse(20,25,128,96,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2c8290';ctx.beginPath();ctx.ellipse(-42,-48,76,62,-.25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#071c28';ctx.beginPath();ctx.ellipse(-82,-25,62,34,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dff7ef';for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(-122+i*18,-42);ctx.lineTo(-112+i*18,-17);ctx.lineTo(-102+i*18,-40);ctx.fill();}ctx.fillStyle='#75f1e4';ctx.beginPath();ctx.arc(-65,-65,9,0,Math.PI*2);ctx.fill();ctx.restore();this.drawBossHealth(ctx);}
}

class ChronosShockwave extends Entity {
    constructor(owner,x,direction,speed){super(x,GROUND_Y-34,42,34);this.owner=owner;this.type='chronos_shockwave';this.vx=direction*speed;this.life=3200;this.hit=new Set();this.untargetable=true;}
    update(dt){this.life-=dt;this.x+=this.vx*Math.min(2,Math.max(.25,dt/16.67));for(const p of game.getOpponentsOf(this.owner))if(!this.hit.has(p)&&checkAABB(this,p)){this.hit.add(p);p.takeDamage(28,this.owner);p.vy=-7;}if(this.life<=0||this.x<0||this.x>CANVAS_W)this.dead=true;}
    draw(ctx){ctx.strokeStyle='#e9cc6c';ctx.lineWidth=6;ctx.beginPath();ctx.arc(this.x+21,this.y+34,28,Math.PI,0);ctx.stroke();}
}

class TimeFragment extends Entity {
    constructor(owner,x,y){super(x,y,30,30);this.owner=owner;this.type='time_fragment';this.hp=24;this.maxHp=24;this.life=6500;this.buffs={};}
    takeDamage(amount,attacker){this.hp-=amount||0;if(this.hp<=0){this.dead=true;for(let i=0;i<10;i++)game.particles.push(new Particle(this.x+15,this.y+15,'#f4d76d',(Math.random()-.5)*9,(Math.random()-.5)*9,320,3));}}
    update(dt){this.life-=dt;if(this.life<=0){for(const p of game.getOpponentsOf(this.owner)){const d=Math.hypot(p.x+p.w/2-(this.x+15),p.y+p.h/2-(this.y+15));if(d<180){p.takeDamage(18,this.owner);p.buffs.slow=Math.max(p.buffs.slow||0,2400);}}this.dead=true;}}
    draw(ctx){ctx.save();ctx.translate(this.x+15,this.y+15);ctx.rotate(Date.now()*.002);ctx.fillStyle='#d5b755';ctx.strokeStyle='#fff2a8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(14,-5);ctx.lineTo(8,15);ctx.lineTo(-11,12);ctx.lineTo(-15,-7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
}

class ChronosBoss extends BossBase {
    constructor(x,groundY){super('chronos',x,groundY,190,238);this.type='boss_chronos';this.hammerTimer=0;this.stopCycle=0;this.fragmentTimer=0;this.rewindCycle=0;this.hammerWarning=0;this.hammerX=0;this.timeStopTimer=0;this.rewindTimer=0;this.rewindSnapshot=null;this.phaseTwo=false;}
    spawnFragments(){const count=this.phaseTwo?6:4;for(let i=0;i<count;i++)game.minions.push(new TimeFragment(this,100+Math.random()*(CANVAS_W-200),100+Math.random()*(GROUND_Y-260)));}
    releaseHammer(){const radius=180;for(const p of this.getPlayers())if(Math.abs(p.x+p.w/2-this.hammerX)<radius&&p.y+p.h>GROUND_Y-190){p.takeDamage(82,this,false,true);p.vy=-15;p.vx=(p.x<this.hammerX?-1:1)*9;}for(const direction of [-1,1])for(const speed of (this.phaseTwo?[6,9,13,17]:[7,11,15]))game.hazards.push(new ChronosShockwave(this,this.hammerX,direction,speed));this.hammerWarning=0;}
    update(dt){if(!this.updateBossStatus(dt))return;if(!this.phaseTwo&&this.hp<=this.maxHp*.5)this.phaseTwo=true;const rate=this.phaseTwo?1.28:1;this.hammerTimer+=dt*rate;this.stopCycle+=dt*rate;this.fragmentTimer+=dt*rate;this.rewindCycle+=dt;
        if(this.timeStopTimer>0){this.timeStopTimer=Math.max(0,this.timeStopTimer-dt);if(this.timeStopTimer<=0&&this.phaseTwo)this.x=Math.max(20,Math.min(CANVAS_W-this.w-20,CANVAS_W-this.x-this.w));return;}
        if(this.hammerWarning>0){this.hammerWarning-=dt;if(this.hammerWarning<=0)this.releaseHammer();}
        if(this.rewindTimer>0){this.rewindTimer-=dt;if(this.rewindTimer<=0&&this.rewindSnapshot){const lost=Math.max(0,this.rewindSnapshot.hp-this.hp),restore=lost*(this.phaseTwo?.25:.55);this.hp=Math.min(this.maxHp,this.hp+restore);this.x=this.rewindSnapshot.x;this.y=this.rewindSnapshot.y;this.buffs={dizzy:0,slow:0,burn:0,poison:0,bleed:0};this.rewindSnapshot=null;}}
        if(this.hammerTimer>=8000){this.hammerTimer-=8000;const t=this.getNearestPlayer();this.hammerX=t?t.x+t.w/2:this.x;this.hammerWarning=this.phaseTwo?520:800;}if(this.stopCycle>=15000){this.stopCycle-=15000;this.timeStopTimer=this.phaseTwo?2500:2000;this.x=80+Math.random()*(CANVAS_W-this.w-160);}if(this.fragmentTimer>=(this.phaseTwo?7000:10000)){this.fragmentTimer=0;this.spawnFragments();}if(this.rewindCycle>=20000&&!this.rewindTimer){this.rewindCycle=0;this.rewindSnapshot={x:this.x,y:this.y,hp:this.hp};this.rewindTimer=3000;}
        const target=this.getNearestPlayer();if(target&&!this.hammerWarning){const dx=target.x-(this.x+this.w/2);this.facing=dx>=0?1:-1;this.x+=this.facing*(Math.abs(dx)>210?1.5:0)*this.getMoveMultiplier()*Math.min(2,Math.max(.25,dt/16.67));}this.x=Math.max(0,Math.min(CANVAS_W-this.w,this.x));this.y=GROUND_Y-this.h;}
    draw(ctx){ctx.save();if(this.hammerWarning>0){ctx.fillStyle='rgba(255,80,70,.18)';ctx.strokeStyle='#ff6b5e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(this.hammerX,GROUND_Y,180,Math.PI,0);ctx.fill();ctx.stroke();}ctx.translate(this.x+this.w/2,this.y+this.h/2);if(this.facing<0)ctx.scale(-1,1);ctx.fillStyle='#4f5250';ctx.fillRect(-68,-92,136,180);ctx.fillStyle='#9b8d63';ctx.fillRect(-55,-108,110,48);ctx.fillStyle=this.phaseTwo?'#ff7a4d':'#ffe077';ctx.shadowBlur=22;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(0,-10,35,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#242728';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,-10,48,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#36393a';ctx.fillRect(55,-58,72,34);ctx.fillRect(-127,-58,72,34);ctx.restore();this.drawBossHealth(ctx);}
}

class MortemSkeleton extends Entity {
    constructor(owner,x,kind='melee',elite=false){super(x,GROUND_Y-(elite?88:66),elite?50:36,elite?88:66);this.owner=owner;this.kind=kind;this.elite=elite;this.type='mortem_skeleton';this.hp=elite?120:(kind==='shield'?48:30);this.maxHp=this.hp;this.speed=(elite?4.8:(kind==='shield'?2.3:4.2))*(owner.phaseTwo?1.25:1);this.attackTimer=500;this.life=26000;this.buffs={dizzy:0,slow:0};}
    takeDamage(amount,attacker){if(this.kind==='shield'&&attacker&&((attacker.x<this.x&&this.facing<0)||(attacker.x>this.x&&this.facing>0)))amount*=.35;this.hp-=amount||0;if(this.hp<=0){this.dead=true;if(this.owner?.deadSkeletons)this.owner.deadSkeletons.push({x:this.x,kind:this.kind});}window.audioManager?.playEntityHit(this,attacker,amount);}
    update(dt){this.life-=dt;if(this.life<=0||!this.owner||this.owner.dead){this.dead=true;return;}if(this.buffs.dizzy>0){this.buffs.dizzy-=dt;return;}this.attackTimer-=dt;const target=game.getOpponentsOf(this.owner).filter(t=>!t.dead).sort((a,b)=>Math.abs(a.x-this.x)-Math.abs(b.x-this.x))[0];if(!target)return;const dx=target.x+target.w/2-(this.x+this.w/2);this.facing=dx>=0?1:-1;if(this.kind==='archer'){if(Math.abs(dx)<520&&this.attackTimer<=0){game.projectiles.push(new Projectile(this.x+this.w/2,this.y+20,12,5,this.facing*9,-1,12,this.owner,'#b9a4cf','skeleton_arrow'));this.attackTimer=1450;}if(Math.abs(dx)<260)this.x-=this.facing*this.speed;}else if(Math.abs(dx)>55)this.x+=this.facing*this.speed;else if(this.attackTimer<=0){target.takeDamage(this.elite?32:16,this.owner);target.vx=this.facing*(this.elite?11:5);this.attackTimer=this.elite?800:1050;}this.x=Math.max(0,Math.min(CANVAS_W-this.w,this.x));}
    draw(ctx){ctx.save();ctx.translate(this.x+this.w/2,this.y);if(this.facing<0)ctx.scale(-1,1);ctx.fillStyle=this.elite?'#51335f':'#d8d2c4';ctx.fillRect(-this.w/2,14,this.w,this.h-14);ctx.fillStyle='#202024';ctx.fillRect(-this.w/2,34,this.w,8);if(this.kind==='shield'){ctx.fillStyle='#56496b';ctx.fillRect(12,25,18,35);}else if(this.kind==='archer'){ctx.strokeStyle='#8d6b45';ctx.lineWidth=3;ctx.beginPath();ctx.arc(18,34,18,-Math.PI/2,Math.PI/2);ctx.stroke();}else{ctx.fillStyle='#353039';ctx.fillRect(12,30,35,5);}ctx.restore();}
}

class SoulHarvest extends Entity {
    constructor(owner,target,large=false){const r=large?105:78;super(target.x+target.w/2-r,GROUND_Y-r*1.2,r*2,r*1.2);this.owner=owner;this.type='soul_harvest';this.warning=850;this.life=400;this.hit=new Set();this.untargetable=true;}
    update(dt){if(this.warning>0){this.warning-=dt;return;}this.life-=dt;for(const p of game.getOpponentsOf(this.owner))if(!this.hit.has(p)&&checkAABB(this,p)){this.hit.add(p);const before=p.hp;p.takeDamage(48,this.owner);const dealt=Math.max(0,before-Math.max(0,p.hp));this.owner.hp=Math.min(this.owner.maxHp,this.owner.hp+dealt*.5);}if(this.life<=0)this.dead=true;}
    draw(ctx){ctx.save();ctx.fillStyle=this.warning>0?'rgba(105,45,135,.18)':'rgba(83,20,108,.5)';ctx.strokeStyle='#c26ce1';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(this.x+this.w/2,this.y+this.h,this.w/2,this.h,0,Math.PI,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
}

class MortemBoss extends BossBase {
    constructor(x,groundY){super('mortem',x,groundY,190,240);this.type='boss_mortem';this.cleaveTimer=0;this.summonTimer=0;this.harvestTimer=0;this.resurrectTimer=0;this.eliteTimer=0;this.cleaveWarning=0;this.cleaveFacing=-1;this.resurrectionCast=0;this.castDamage=0;this.deadSkeletons=[];this.phaseTwo=false;}
    takeDamage(amount,attacker){if(this.resurrectionCast>0)this.castDamage+=Math.max(0,amount||0);super.takeDamage(amount,attacker);}
    summonArmy(count=6+Math.floor(Math.random()*5)){for(let i=0;i<count;i++){const roll=Math.random(),kind=roll<.55?'melee':roll<.8?'archer':'shield';game.minions.push(new MortemSkeleton(this,70+Math.random()*(CANVAS_W-140),kind));}}
    releaseCleave(){const range=520,box={x:this.cleaveFacing>0?this.x+this.w/2:this.x-range+this.w/2,y:this.y-20,w:range,h:this.h+40};for(const p of this.getPlayers())if(checkAABB(box,p)){p.takeDamage(95,this,false,true);p.vx=this.cleaveFacing*20;p.buffs.curse=Math.max(p.buffs.curse||0,3000);}this.cleaveWarning=0;}
    update(dt){if(!this.updateBossStatus(dt))return;if(!this.phaseTwo&&this.hp<=this.maxHp*.4)this.phaseTwo=true;const rate=this.phaseTwo?1.35:1;this.cleaveTimer+=dt*rate;this.summonTimer+=dt*rate;this.harvestTimer+=dt;this.resurrectTimer+=dt;this.eliteTimer+=dt;if(this.cleaveWarning>0){this.cleaveWarning-=dt;if(this.cleaveWarning<=0)this.releaseCleave();}
        if(this.resurrectionCast>0){this.resurrectionCast-=dt;if(this.castDamage>=450){this.resurrectionCast=0;this.deadSkeletons=[];}else if(this.resurrectionCast<=0){for(const dead of this.deadSkeletons.splice(-5))game.minions.push(new MortemSkeleton(this,dead.x,dead.kind));}return;}
        if(this.cleaveTimer>=8000){this.cleaveTimer-=8000;const t=this.getNearestPlayer();this.cleaveFacing=t&&t.x>this.x?1:-1;this.cleaveWarning=this.phaseTwo?480:750;}const summonInterval=this.phaseTwo?5600:8000;if(this.summonTimer>=summonInterval){this.summonTimer=0;this.summonArmy();}if(this.harvestTimer>=15000){this.harvestTimer=0;for(const p of this.getPlayers())game.hazards.push(new SoulHarvest(this,p,this.phaseTwo));}if(this.resurrectTimer>=20000&&this.deadSkeletons.length){this.resurrectTimer=0;this.resurrectionCast=1800;this.castDamage=0;}if(this.phaseTwo&&this.eliteTimer>=25000){this.eliteTimer=0;game.minions.push(new MortemSkeleton(this,this.x-80,'melee',true));}
        const t=this.getNearestPlayer();if(t&&!this.cleaveWarning){const dx=t.x-(this.x+this.w/2);this.facing=dx>=0?1:-1;if(Math.abs(dx)>230)this.x+=this.facing*1.25*Math.min(2,Math.max(.25,dt/16.67));}this.x=Math.max(0,Math.min(CANVAS_W-this.w,this.x));this.y=GROUND_Y-this.h;}
    draw(ctx){ctx.save();if(this.cleaveWarning>0){ctx.fillStyle='rgba(167,61,191,.16)';ctx.strokeStyle='#cf79e4';ctx.fillRect(this.cleaveFacing>0?this.x+this.w/2:this.x-520+this.w/2,this.y-20,520,this.h+40);}ctx.translate(this.x+this.w/2,this.y+this.h/2);if(this.facing<0)ctx.scale(-1,1);ctx.fillStyle='#27222d';ctx.fillRect(-63,-84,126,188);ctx.fillStyle='#786080';ctx.fillRect(-48,-112,96,58);ctx.fillStyle='#d4d0c5';ctx.fillRect(-30,-95,60,36);ctx.fillStyle=this.phaseTwo?'#d65cff':'#8b54a2';ctx.shadowBlur=20;ctx.shadowColor=ctx.fillStyle;ctx.fillRect(-16,-78,32,18);ctx.shadowBlur=0;ctx.save();ctx.translate(55,15);ctx.rotate(this.cleaveWarning>0?-1.35:.25);ctx.fillStyle='#0b0910';ctx.fillRect(-8,-150,16,190);ctx.fillStyle='#5e396c';ctx.fillRect(-21,-158,42,20);ctx.restore();ctx.restore();this.drawBossHealth(ctx);}
}

function createBoss(bossId, x, groundY) {
    if (bossId === 'dragon') return new DragonBoss(x, groundY);
    if (bossId === 'libertus') return new LibertusBoss(x, groundY);
    if (bossId === 'abyss') return new AbyssBoss(x, groundY);
    if (bossId === 'chronos') return new ChronosBoss(x, groundY);
    if (bossId === 'mortem') return new MortemBoss(x, groundY);
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
        window.audioManager?.playEntityHit(this, attacker, amt);
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
        window.audioManager?.playEntityHit(this, attacker, amt);
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
        window.audioManager?.playEntityHit(this, attacker, amt);
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

class LakEarthWall extends Entity {
    constructor(owner) {
        const surfaceY = owner.currentPlatform?.y || GROUND_Y;
        const x = Math.max(4, Math.min(CANVAS_W - 56, owner.facing > 0 ? owner.x + owner.w + 32 : owner.x - 84));
        super(x, surfaceY - 112, 52, 112);
        this.owner = owner; this.type = 'lak_earth_wall'; this.life = 4000; this.maxLife = 4000;
        this.platform = { x: this.x, y: this.y, w: this.w, h: 12, type: 'lak_wall' };
        this.spawnHit = new Set(); this.untargetable = true;
        PLATFORMS.push(this.platform);
    }
    removePlatform() { const index = PLATFORMS.indexOf(this.platform); if (index >= 0) PLATFORMS.splice(index, 1); }
    update(dt) {
        this.life -= dt;
        if (this.life <= 0 || !this.owner || this.owner.dead) { this.removePlatform(); this.dead = true; return; }
        for (const projectile of game.projectiles) {
            if (projectile && !projectile.dead && checkAABB(this, projectile)) {
                projectile.dead = true;
                for (let i = 0; i < 5; i++) game.particles.push(new Particle(projectile.x, projectile.y, '#a99b83', (Math.random()-.5)*7, (Math.random()-.5)*7, 260, 4));
            }
        }
        const fighters = typeof game.getFighters === 'function' ? game.getFighters() : [];
        for (const target of fighters) {
            if (!target || target.dead || target === this.owner || !checkAABB(this, target)) continue;
            if (!this.spawnHit.has(target)) { this.spawnHit.add(target); target.takeDamage(20, this.owner, false, true); target.vy = -16; }
            if (target.y + target.h <= this.y + 24) continue;
            if (target.x + target.w/2 < this.x + this.w/2) target.x = this.x - target.w;
            else target.x = this.x + this.w;
            target.vx = 0;
        }
    }
    draw(ctx) {
        const shake = Math.sin(Date.now()*.025) * Math.min(3, this.life / 900);
        ctx.save(); ctx.translate(shake, 0); ctx.fillStyle = '#625b50'; ctx.strokeStyle = '#b2a58d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(this.x+5,this.y+this.h); ctx.lineTo(this.x,this.y+28); ctx.lineTo(this.x+13,this.y); ctx.lineTo(this.x+38,this.y+7); ctx.lineTo(this.x+this.w,this.y+35); ctx.lineTo(this.x+this.w-4,this.y+this.h); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#3f3a34'; ctx.lineWidth = 2;
        for (let y=this.y+25;y<this.y+this.h;y+=24){ctx.beginPath();ctx.moveTo(this.x+5,y);ctx.lineTo(this.x+this.w-5,y+8);ctx.stroke();}
        ctx.restore();
    }
}

class LakShockwave extends Entity {
    constructor(owner, damage = 12, radius = 115) {
        super(owner.x + owner.w/2 - radius, owner.y + owner.h - 24, radius*2, 34);
        this.owner=owner;this.type='lak_shockwave';this.damage=damage;this.radius=radius;this.life=360;this.maxLife=360;this.hitTargets=new Set();this.untargetable=true;
    }
    update(dt) {
        this.life -= dt;
        for (const target of getHostileTargets(this.owner, this)) {
            if (!target || target.dead || this.hitTargets.has(target) || !checkAABB(this,target)) continue;
            this.hitTargets.add(target); target.takeDamage(this.damage,this.owner,false,true);
            const direction=target.x+target.w/2<this.owner.x+this.owner.w/2?-1:1; target.vx=direction*9; target.vy=-5;
        }
        if(this.life<=0)this.dead=true;
    }
    draw(ctx){const p=1-this.life/this.maxLife;ctx.save();ctx.strokeStyle=`rgba(190,174,142,${1-p})`;ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(this.x+this.w/2,this.y+this.h/2,18+p*this.radius,8+p*15,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
}

class LakMountainBreaker extends Entity {
    constructor(owner) {
        super(0,0,CANVAS_W,CANVAS_H);this.owner=owner;this.type='lak_mountain_breaker';this.direction=owner.facing;this.originX=owner.x+owner.w/2;
        this.elapsed=0;this.waveInterval=260;this.waveCount=5;this.hitByWave=Array.from({length:5},()=>new Set());this.untargetable=true;this.life=1900;
    }
    update(dt) {
        const previous=this.elapsed;this.elapsed+=dt;this.life-=dt;
        for(let wave=0;wave<this.waveCount;wave++){
            const start=wave*this.waveInterval;if(previous>=start+700||this.elapsed<start)continue;
            const progress=Math.min(1,(this.elapsed-start)/700);const x=this.originX+this.direction*(45+progress*(CANVAS_W*.72));
            for(const target of getHostileTargets(this.owner,this)){
                if(!target||target.dead||this.hitByWave[wave].has(target))continue;
                const surfaceGap=Math.abs(target.y+target.h-(target.currentPlatform?.y||GROUND_Y));
                if(Math.abs(target.x+target.w/2-x)>58||surfaceGap>45)continue;
                this.hitByWave[wave].add(target);target.takeDamage(16,this.owner,false,true);target.buffs=target.buffs||{};target.buffs.slow=Math.max(target.buffs.slow||0,900);
                target.vx=this.direction*(6+wave*2);if(wave===this.waveCount-1)target.vy=-19;
            }
        }
        if(this.life<=0)this.dead=true;
    }
    draw(ctx){ctx.save();for(let wave=0;wave<this.waveCount;wave++){const progress=Math.max(0,Math.min(1,(this.elapsed-wave*this.waveInterval)/700));if(progress<=0||progress>=1)continue;const x=this.originX+this.direction*(45+progress*(CANVAS_W*.72));const y=GROUND_Y;ctx.strokeStyle=`rgba(205,188,151,${1-progress*.55})`;ctx.lineWidth=5+wave;ctx.beginPath();ctx.moveTo(x-36,y);ctx.lineTo(x-19,y-13-wave*2);ctx.lineTo(x,y-3);ctx.lineTo(x+18,y-20-wave*3);ctx.lineTo(x+38,y);ctx.stroke();if(wave===4){ctx.fillStyle='#706758';ctx.beginPath();ctx.moveTo(x-25,y);ctx.lineTo(x-14,y-55*progress);ctx.lineTo(x+4,y-90*progress);ctx.lineTo(x+22,y-43*progress);ctx.lineTo(x+29,y);ctx.fill();}}ctx.restore();}
}

class PatThread extends Entity {
    constructor(owner, target, binding = false) {
        const x=owner.facing>0?owner.x+owner.w:owner.x-18;const y=owner.y+25;
        super(x,y,18,6);this.owner=owner;this.target=target;this.binding=binding;this.type=binding?'pat_binding_thread':'pat_thread_lash';
        const tx=target?target.x+target.w/2:x+owner.facing*600,ty=target?target.y+target.h/2:y;const angle=Math.atan2(ty-y,tx-x);
        this.vx=Math.cos(angle)*(binding?14:22);this.vy=Math.sin(angle)*(binding?14:22);this.life=binding?1500:900;this.untargetable=true;
    }
    update(dt){this.x+=this.vx;this.y+=this.vy;this.life-=dt;for(const target of getHostileTargets(this.owner,this)){if(!target||target.dead||!checkAABB(this,target))continue;target.takeDamage(this.binding?15:12,this.owner,false,true);target.buffs=target.buffs||{};if(this.binding){target.buffs.root=Math.max(target.buffs.root||0,1500);const empowered=this.owner.consumePatMarks?.(target);if(empowered){const direction=this.owner.x+this.owner.w/2<target.x+target.w/2?-1:1;target.vx=direction*12;}}else{target.buffs.slow=Math.max(target.buffs.slow||0,500);this.owner.addPatMark?.(target);}this.dead=true;break;}if(this.life<=0||this.x<-40||this.x>CANVAS_W+40||this.y<-40||this.y>CANVAS_H+40)this.dead=true;}
    draw(ctx){ctx.save();ctx.strokeStyle=this.binding?'#ff8ad8':'#d5a5ff';ctx.shadowBlur=9;ctx.shadowColor=ctx.strokeStyle;ctx.lineWidth=this.binding?5:3;ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x-this.vx*2.8,this.y-this.vy*2.8);ctx.stroke();ctx.restore();}
}

class PatMarionette extends Entity {
    constructor(owner,target){super(0,0,CANVAS_W,CANVAS_H);this.owner=owner;this.target=target;this.type='pat_marionette';this.life=3000;this.maxLife=3000;this.tickTimer=0;this.untargetable=true;}
    finish(){if(this.dead)return;const target=this.target;if(target&&!target.dead){target.takeDamage(30,this.owner,false,true);target.buffs=target.buffs||{};target.buffs.dizzy=Math.max(target.buffs.dizzy||0,1000);const dx=this.owner.x+this.owner.w/2-(target.x+target.w/2);target.vx=Math.sign(dx||1)*22;target.vy=-9;}this.dead=true;}
    update(dt){if(!this.owner||this.owner.dead||!this.target||this.target.dead){this.dead=true;return;}this.life-=dt;this.tickTimer+=dt;const horizontal=(keys[this.owner.controls.right]?1:0)-(keys[this.owner.controls.left]?1:0);const vertical=(keys[this.owner.controls.down]?1:0)-(keys[this.owner.controls.jump]?1:0);this.target.vx=horizontal*5.5;this.target.vy+=vertical*.7;while(this.tickTimer>=500){this.tickTimer-=500;this.target.takeDamage(8,this.owner,true,true);}if(this.life<=0)this.finish();}
    draw(ctx){if(!this.target||this.target.dead)return;const ox=this.owner.x+this.owner.w/2,oy=this.owner.y+8,tx=this.target.x+this.target.w/2,ty=this.target.y+this.target.h/2;ctx.save();ctx.strokeStyle='rgba(255,138,216,.8)';ctx.shadowBlur=10;ctx.shadowColor='#ff8ad8';ctx.lineWidth=2;for(let offset=-16;offset<=16;offset+=16){ctx.beginPath();ctx.moveTo(ox+offset,oy);ctx.quadraticCurveTo((ox+tx)/2+Math.sin(Date.now()*.012+offset)*18,(oy+ty)/2-55,tx+offset*.6,ty);ctx.stroke();}ctx.translate(tx,ty-70);ctx.strokeStyle='#ffd3f0';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-22,-22);ctx.lineTo(0,12);ctx.lineTo(22,-22);ctx.stroke();ctx.restore();}
}
