/**
 * Dantao: Legends Duel
 * Main Engine Core
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.state = 'MENU';

        this.p1Choice = 'Noae';
        this.p2Choice = 'Wolf';

        this.setupMenu();
        updateControlsDisplay();
    }

    setupMenu() {
        const p1Roster = document.getElementById('p1-roster');
        const p2Roster = document.getElementById('p2-roster');

        p1Roster.innerHTML = '';
        p2Roster.innerHTML = '';

        const attachHover = (btn, key) => {
            btn.onmouseover = () => {
                const info = HEROES[key];
                document.getElementById('info-name').innerText = info.name;
                document.getElementById('info-desc').innerText = info.desc;
                document.getElementById('info-details').innerHTML = `
                    <div class="info-stat">HP: <span style="color:#4caf50">${info.ui.hp}</span></div>
                    <div class="info-stat">ATK: <span style="color:#ff5252">${info.ui.atk}</span></div><br>
                    <div class="info-stat">Passive:</div> <div class="info-desc">${info.ui.passive}</div>
                    <div class="info-stat">Super Skill:</div> <div class="info-desc">${info.ui.super}</div>
                `;
            };
        };

        Object.keys(HEROES).forEach(key => {
            let b1 = document.createElement('button');
            b1.className = `hero-btn ${key === this.p1Choice ? 'selected' : ''}`;
            b1.innerText = `${HEROES[key].name}`;
            b1.onclick = () => {
                this.p1Choice = key;
                Array.from(p1Roster.children).forEach(c => c.classList.remove('selected'));
                b1.classList.add('selected');
            };
            attachHover(b1, key);
            p1Roster.appendChild(b1);

            let b2 = document.createElement('button');
            b2.className = `hero-btn ${key === this.p2Choice ? 'selected' : ''}`;
            b2.innerText = `${HEROES[key].name}`;
            b2.onclick = () => {
                this.p2Choice = key;
                Array.from(p2Roster.children).forEach(c => c.classList.remove('selected'));
                b2.classList.add('selected');
            };
            attachHover(b2, key);
            p2Roster.appendChild(b2);
        });

        if (p1Roster.children.length > 0) {
            p1Roster.children[Object.keys(HEROES).indexOf(this.p1Choice)].onmouseover();
        }

        document.getElementById('btn-sp').onclick = () => this.startGame(true);
        document.getElementById('btn-mp').onclick = () => this.startGame(false);

        document.getElementById('btn-restart').onclick = () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('menu-screen').classList.remove('hidden');
            this.state = 'MENU';
        };

        document.getElementById('btn-open-settings').onclick = () => {
            buildSettingsUI();
            document.getElementById('settings-screen').classList.remove('hidden');
        };
        document.getElementById('btn-close-settings').onclick = () => {
            document.getElementById('settings-screen').classList.add('hidden');
        };
        document.getElementById('btn-reset-bindings').onclick = () => {
            currentBinds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
            saveBinds();
            buildSettingsUI();
        };
    }

    startGame(isSinglePlayer) {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');

        this.isSinglePlayer = isSinglePlayer;

        let p2StartX = CANVAS_W - 150;

        this.p1 = new Fighter('p1', this.p1Choice, 100, currentBinds.p1, true);
        this.p2 = new Fighter('p2', this.p2Choice, p2StartX, currentBinds.p2, false);
        this.p2.facing = -1;

        this.projectiles = [];
        this.particles = [];
        this.minions = [];
        this.hazards = [];
        this.hurricane = null;
        this.hitstop = 0;
        this.aiTimer = 0;

        document.getElementById('p1-name').innerText = `Player 1: ${HEROES[this.p1Choice].name}`;
        document.getElementById('p2-name').innerText = `Player 2: ${HEROES[this.p2Choice].name}${isSinglePlayer ? ' [CPU]' : ''}`;

        document.getElementById('p1-horse-container').classList.toggle('hidden', this.p1Choice !== 'Duke' && this.p1Choice !== 'Volt');
        document.getElementById('p2-horse-container').classList.toggle('hidden', this.p2Choice !== 'Duke' && this.p2Choice !== 'Volt');

        this.state = 'PLAYING';
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    getEnemyOf(fighter) { return fighter === this.p1 ? this.p2 : this.p1; }

    createExplosion(x, y, radius, damage, owner, friendlyFire = true, stunDuration = 0) {
        for(let i=0; i<30; i++) this.particles.push(new Particle(x, y, i%2===0 ? "#ff5500" : "#555", (Math.random()-0.5)*15, (Math.random()-0.5)*15, 600));
        let targets = [this.p1, this.p2, ...this.minions];
        for (let t of targets) {
            if (!t || t.untargetable) continue;
            if (!friendlyFire && (t === owner || t.owner === owner)) continue;
            if (!t.dead && Math.hypot((t.x + t.w/2) - x, (t.y + t.h/2) - y) <= radius) {
                t.takeDamage(damage, owner);
                if (stunDuration > 0 && !t.dead && !(t.invincible > 0)) {
                    if(!t.buffs) t.buffs = {};
                    t.buffs.dizzy = Math.max(t.buffs.dizzy || 0, stunDuration);
                }
            }
        }
    }

    updateUI() {
        document.getElementById('p1-hp').style.width = `${Math.max(0, (this.p1.hp / this.p1.maxHp) * 100)}%`;
        if (this.p1.heroName === 'Duke') {
            document.getElementById('p1-horse-hp').style.width = `${Math.max(0, (this.p1.horseHp / this.p1.maxHorseHp) * 100)}%`;
            document.getElementById('p1-horse-hp').style.background = '#8B4513';
        } else if (this.p1.heroName === 'Volt') {
            document.getElementById('p1-horse-hp').style.width = `${Math.max(0, (this.p1.energy / this.p1.maxEnergy) * 100)}%`;
            document.getElementById('p1-horse-hp').style.background = this.p1.isOverloaded ? '#ff0000' : (this.p1.energy <= 20 && Math.floor(Date.now()/200)%2===0 ? '#ff0000' : '#FFFF00');
        }

        let p1Sup = 100 - (this.p1.superCooldown / this.p1.superCooldownMax) * 100;
        document.getElementById('p1-super').style.width = `${p1Sup}%`;
        if (p1Sup >= 100) document.getElementById('p1-super').classList.add('ready'); else document.getElementById('p1-super').classList.remove('ready');

        let p1Stat = "";
        if (this.p1.heroName === 'Hason') {
            p1Stat = this.p1.hasonAmmo <= 0 ? `Ammo: RELOADING...` : `Ammo: ${this.p1.hasonAmmo}/6`;
            if (this.p1.hasonSuperCharges > 0) p1Stat += ` [DYNAMITE x${this.p1.hasonSuperCharges}]`;
        }
        if (this.p1.heroName === 'Willi') {
            if (this.p1.williSuperCharges > 0) p1Stat += ` [DASH x${this.p1.williSuperCharges}]`;
            if (this.p1.williHealBuffTimer > 0) p1Stat += ` [LIFESTEAL ACTIVE]`;
        }
        if (this.p1.heroName === 'Hunter') p1Stat = `Wep: ${this.p1.hunterWeapon.toUpperCase()} ${this.p1.hunterMusketCD>0 ? '(Rld)' : ''}`;
        if (this.p1.heroName === 'Duke') p1Stat = this.p1.isMounted ? (this.p1.runTimer >= 3000 ? "LANCE READY" : "Charging...") : "DISMOUNTED";
        if (this.p1.heroName === 'Kadaxi' && this.p1.comboCount > 0) p1Stat += ` [COMBO: ${this.p1.comboCount}/2]`;
        if (this.p1.heroName === 'Kae') {
            if (this.p1.kaeComboCount > 0) p1Stat += ` [CHARGE: ${this.p1.kaeComboCount}/3]`;
            if (this.p1.kaeAwakened) p1Stat += " [AWAKENED]";
        }
        if (this.p1.heroName === 'Lique' && this.p1.buffs.bloodFrenzy > 0) p1Stat += " [BLOOD FRENZY]";
        if (this.p1.heroName === 'Euclid') {
            let skelCount = this.minions.filter(m => m.type === 'skeleton' && m.owner === this.p1).length;
            p1Stat += `Wep: ${this.p1.euclidWeapon.toUpperCase()} [Skulls: ${skelCount}/5]`;
            if (this.p1.euclidSwitchTimer > 0) p1Stat += ` (SWITCHING)`;
            else if (this.p1.superWindupTimer > 0) p1Stat += ` (SUMMONING)`;
            else if (this.p1.attackState === 'windup' && this.p1.euclidWeapon === 'magic') p1Stat += ` (CASTING)`;
        }
        if (this.p1.heroName === 'Ugo') {
            let pCount = this.minions.filter(m => m.type === 'puppet' && m.owner === this.p1).length;
            if (pCount > 0) p1Stat += " [PUPPET ACTIVE]";
            if (this.p1.ugoSummoning) p1Stat += " (SUMMONING)";
        }
        if (this.p1.heroName === 'Kila') {
            let elName = this.p1.kilaElement === 'fire' ? "FIRE" : (this.p1.kilaElement === 'water' ? "WATER" : "EARTH");
            p1Stat += `Stance: ${elName}`;
            if (this.p1.kilaSwitchTimer > 0) p1Stat += ` (SWITCHING)`;
            else if (this.p1.kilaSwitchCD > 0) p1Stat += ` [CD: ${(this.p1.kilaSwitchCD/1000).toFixed(1)}s]`;
        }
        if (this.p1.heroName === 'Gensan') {
            p1Stat += `[Combo: ${this.p1.gensanCombo}/3] [Shadows: ${this.p1.gensanShadows.length}/2]`;
            if (this.p1.gensanShadowCD > 0) p1Stat += ` (Shadow CD: ${(this.p1.gensanShadowCD/1000).toFixed(1)}s)`;
        }
        if (this.p1.heroName === 'Volt') {
            p1Stat += ` [ENERGY: ${Math.floor(this.p1.energy)}/200]`;
            if (this.p1.isOverloaded) p1Stat += " [OVERLOAD!]";
            if (this.p1.overdriveTimer > 0) p1Stat += " [OVERDRIVE]";
        }
        if (this.p1.heroName === 'Noae') {
            let mineCount = this.minions.filter(m => m.type === 'landmine' && m.owner === this.p1).length;
            p1Stat += `[Mines: ${mineCount}/3]`;
        }
        if (this.p1.heroName === 'Wolf') {
            p1Stat += `[Marks: ${this.p1.wolfComboCount}/5]`;
            if (this.p1.wolfAttackTimer >= 1500) p1Stat += " [INSTINCT READY]";
        }

        if (this.p1.buffs.poison > 0) p1Stat += " [POISONED]";
        if (this.p1.buffs.burn > 0) p1Stat += " [BURN]";
        if (this.p1.buffs.dizzy > 0) p1Stat += " [DIZZY]";
        if (this.p1.buffs.slow > 0) p1Stat += " [SLOWED]";
        if (this.p1.buffs.bleed > 0) p1Stat += " [BLEEDING]";
        document.getElementById('p1-status').innerText = p1Stat;

        document.getElementById('p2-hp').style.width = `${Math.max(0, (this.p2.hp / this.p2.maxHp) * 100)}%`;
        if (this.p2.heroName === 'Duke') {
            document.getElementById('p2-horse-hp').style.width = `${Math.max(0, (this.p2.horseHp / this.p2.maxHorseHp) * 100)}%`;
            document.getElementById('p2-horse-hp').style.background = '#8B4513';
        } else if (this.p2.heroName === 'Volt') {
            document.getElementById('p2-horse-hp').style.width = `${Math.max(0, (this.p2.energy / this.p2.maxEnergy) * 100)}%`;
            document.getElementById('p2-horse-hp').style.background = this.p2.isOverloaded ? '#ff0000' : (this.p2.energy <= 20 && Math.floor(Date.now()/200)%2===0 ? '#ff0000' : '#FFFF00');
        }

        let p2Sup = 100 - (this.p2.superCooldown / this.p2.superCooldownMax) * 100;
        document.getElementById('p2-super').style.width = `${p2Sup}%`;
        if (p2Sup >= 100) document.getElementById('p2-super').classList.add('ready'); else document.getElementById('p2-super').classList.remove('ready');

        let p2Stat = "";
        if (this.p2.heroName === 'Hason') {
            p2Stat = this.p2.hasonAmmo <= 0 ? `Ammo: RELOADING...` : `Ammo: ${this.p2.hasonAmmo}/6`;
            if (this.p2.hasonSuperCharges > 0) p2Stat += ` [DYNAMITE x${this.p2.hasonSuperCharges}]`;
        }
        if (this.p2.heroName === 'Willi') {
            if (this.p2.williSuperCharges > 0) p2Stat += ` [DASH x${this.p2.williSuperCharges}]`;
            if (this.p2.williHealBuffTimer > 0) p2Stat += ` [LIFESTEAL ACTIVE]`;
        }
        if (this.p2.heroName === 'Hunter') p2Stat = `Wep: ${this.p2.hunterWeapon.toUpperCase()} ${this.p2.hunterMusketCD>0 ? '(Rld)' : ''}`;
        if (this.p2.heroName === 'Duke') p2Stat = this.p2.isMounted ? (this.p2.runTimer >= 3000 ? "LANCE READY" : "Charging...") : "DISMOUNTED";
        if (this.p2.heroName === 'Kadaxi' && this.p2.comboCount > 0) p2Stat += ` [COMBO: ${this.p2.comboCount}/2]`;
        if (this.p2.heroName === 'Kae') {
            if (this.p2.kaeComboCount > 0) p2Stat += ` [CHARGE: ${this.p2.kaeComboCount}/3]`;
            if (this.p2.kaeAwakened) p2Stat += " [AWAKENED]";
        }
        if (this.p2.heroName === 'Lique' && this.p2.buffs.bloodFrenzy > 0) p2Stat += " [BLOOD FRENZY]";
        if (this.p2.heroName === 'Euclid') {
            let skelCount = this.minions.filter(m => m.type === 'skeleton' && m.owner === this.p2).length;
            p2Stat += `Wep: ${this.p2.euclidWeapon.toUpperCase()} [Skulls: ${skelCount}/5]`;
            if (this.p2.euclidSwitchTimer > 0) p2Stat += ` (SWITCHING)`;
            else if (this.p2.superWindupTimer > 0) p2Stat += ` (SUMMONING)`;
            else if (this.p2.attackState === 'windup' && this.p2.euclidWeapon === 'magic') p2Stat += ` (CASTING)`;
        }
        if (this.p2.heroName === 'Ugo') {
            let pCount = this.minions.filter(m => m.type === 'puppet' && m.owner === this.p2).length;
            if (pCount > 0) p2Stat += " [PUPPET ACTIVE]";
            if (this.p2.ugoSummoning) p2Stat += " (SUMMONING)";
        }
        if (this.p2.heroName === 'Kila') {
            let elName = this.p2.kilaElement === 'fire' ? "FIRE" : (this.p2.kilaElement === 'water' ? "WATER" : "EARTH");
            p2Stat += `Stance: ${elName}`;
            if (this.p2.kilaSwitchTimer > 0) p2Stat += ` (SWITCHING)`;
            else if (this.p2.kilaSwitchCD > 0) p2Stat += ` [CD: ${(this.p2.kilaSwitchCD/1000).toFixed(1)}s]`;
        }
        if (this.p2.heroName === 'Gensan') {
            p2Stat += `[Combo: ${this.p2.gensanCombo}/3] [Shadows: ${this.p2.gensanShadows.length}/2]`;
            if (this.p2.gensanShadowCD > 0) p2Stat += ` (Shadow CD: ${(this.p2.gensanShadowCD/1000).toFixed(1)}s)`;
        }
        if (this.p2.heroName === 'Volt') {
            p2Stat += ` [ENERGY: ${Math.floor(this.p2.energy)}/200]`;
            if (this.p2.isOverloaded) p2Stat += " [OVERLOAD!]";
            if (this.p2.overdriveTimer > 0) p2Stat += " [OVERDRIVE]";
        }
        if (this.p2.heroName === 'Noae') {
            let mineCount = this.minions.filter(m => m.type === 'landmine' && m.owner === this.p2).length;
            p2Stat += `[Mines: ${mineCount}/3]`;
        }
        if (this.p2.heroName === 'Wolf') {
            p2Stat += `[Marks: ${this.p2.wolfComboCount}/5]`;
            if (this.p2.wolfAttackTimer >= 1500) p2Stat += " [INSTINCT READY]";
        }

        if (this.p2.buffs.poison > 0) p2Stat += " [POISONED]";
        if (this.p2.buffs.burn > 0) p2Stat += " [BURN]";
        if (this.p2.buffs.dizzy > 0) p2Stat += " [DIZZY]";
        if (this.p2.buffs.slow > 0) p2Stat += " [SLOWED]";
        if (this.p2.buffs.bleed > 0) p2Stat += " [BLEEDING]";
        document.getElementById('p2-status').innerText = p2Stat;

        let promptsHTML = '';
        if (this.p1.grapplePhase === 1) promptsHTML += `<div class="prompt-text" style="left:${this.p1.x}px; top:${this.p1.y - 40}px">Press ${formatKey(this.p1.controls.super)} to THROW!</div>`;
        if (this.p2.grapplePhase === 1) promptsHTML += `<div class="prompt-text" style="left:${this.p2.x}px; top:${this.p2.y - 40}px">Press ${formatKey(this.p2.controls.super)} to THROW!</div>`;
        document.getElementById('dynamic-prompts').innerHTML = promptsHTML;
    }

    endGame(winnerText) {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';
        setTimeout(() => {
            document.getElementById('game-ui').classList.add('hidden');
            document.getElementById('game-over-screen').classList.remove('hidden');
            document.getElementById('winner-text').innerText = `${winnerText} Wins!`;
        }, 1500);
    }

    loop(timestamp) {
        if (this.state !== 'PLAYING' && this.state !== 'GAMEOVER') return;

        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (dt > 100) dt = 16;

        if (this.hitstop > 0) {
            this.hitstop -= dt; this.draw();
            for (let k in keysPressed) delete keysPressed[k];
            requestAnimationFrame(t => this.loop(t));
            return;
        }

        if (this.state === 'PLAYING' && this.isSinglePlayer && !this.p1.dead && !this.p2.dead) this.updateAI(dt);

        this.update(dt);
        this.draw();

        for (let k in keysPressed) delete keysPressed[k];
        requestAnimationFrame(t => this.loop(t));
    }

    updateAI(dt) {
        this.aiTimer -= dt;
        let p1 = this.p1;
        let p2 = this.p2;

        if (this.aiTimer <= 0) {
            this.aiTimer = 100 + Math.random() * 100;

            p2.aiIntent.left = false;
            p2.aiIntent.right = false;

            let hpRatioP1 = p1.hp / p1.maxHp;
            let hpRatioP2 = p2.hp / p2.maxHp;
            let hpDiff = hpRatioP2 - hpRatioP1;
            let skillReady = (p2.superCooldown <= 0 || (p2.heroName === 'Hason' && p2.hasonSuperCharges > 0) || (p2.heroName === 'Willi' && p2.williSuperCharges > 0));

            let tacticalState = 'neutral';
            if (hpDiff > 0.2 || hpRatioP1 < 0.3 || skillReady) {
                tacticalState = 'aggressive';
            } else if (hpDiff < -0.25 || hpRatioP2 < 0.25) {
                tacticalState = 'defensive';
            }

            let targetEntity = p1;
            let p1Puppet = this.minions.find(m => m.type === 'puppet' && m.owner === p1 && !m.dead);
            if (p1Puppet) {
                targetEntity = p1Puppet;
            }

            let sourceEntity = p2;
            let p2Puppet = this.minions.find(m => m.type === 'puppet' && m.owner === p2 && !m.dead);
            if (p2Puppet) {
                sourceEntity = p2Puppet;
            }

            let predX = Math.max(0, Math.min(CANVAS_W, targetEntity.x + (targetEntity.vx * 15)));
            let predY = targetEntity.y + (targetEntity.vy * 5);
            let dx = predX - sourceEntity.x;
            let dy = predY - sourceEntity.y;
            let dist = Math.abs(dx);

            let isMelee = p2.isMeleeAttack();
            if (p2.heroName === 'Ugo' && p2Puppet) isMelee = true;

            let attackRange = isMelee ? 80 : 350;
            if (p2.heroName === 'Kadaxi') attackRange = 100;
            if (p2.heroName === 'Duke' && p2.isMounted) attackRange = 120;
            if (p2.heroName === 'Macu') attackRange = 160;
            if (p2.heroName === 'Lique') attackRange = 65;
            if (p2.heroName === 'Kae') attackRange = 55;
            if (p2.heroName === 'Euclid' && p2.euclidWeapon === 'magic') attackRange = 400;
            if (p2.heroName === 'Noae') attackRange = 300;
            if (p2.heroName === 'Wolf') attackRange = 60;

            if (p2.heroName === 'Kadaxi') {
                if (p2.grapplePhase === 1) {
                    if (p2.grappleTimer <= 4500) keysPressed[p2.controls.super] = true;
                } else if (dist <= 180 && Math.abs(dy) < 50 && p2.superCooldown <= 0) {
                    keysPressed[p2.controls.super] = true;
                }
            }

            let scores = {
                moveForward: 0,
                moveBackward: 0,
                attack: 0,
                superSkill: 0,
                jump: 0,
                switch: 0
            };

            let p1EdgeDist = Math.min(p1.x, CANVAS_W - (p1.x + p1.w));
            let nearEdge = p1EdgeDist < 100;

            if (dist > attackRange * 0.8) scores.moveForward += 50;
            if (tacticalState === 'aggressive') scores.moveForward += 30;
            if (nearEdge && tacticalState !== 'defensive') scores.moveForward += 20;
            if (p2.heroName === 'Duke' && p2.isMounted && p2.runTimer < 3000) scores.moveForward += 40;

            if (p2.heroName === 'Lique') {
                if (dist < 100 && hpRatioP2 < 0.7 && p2.superCooldown <= 0) scores.superSkill += 500;
                if (p2.buffs.bloodFrenzy > 0) {
                    scores.moveForward += 200;
                    scores.moveBackward = -100;
                    scores.attack += 100;
                }
            }

            if (p2.heroName === 'Kae') {
                if (p2.kaeAggroTimer > 0) p2.kaeAggroTimer -= dt;
                if (hpRatioP2 > 0.3 && p2.superCooldown <= 0 && p1.superCooldown > 0) {
                    scores.superSkill += 500;
                }
                if (p2.kaeAggroTimer > 0) {
                    scores.moveForward += 200;
                    scores.moveBackward = -100;
                    scores.attack += 150;
                }
            }

            if (p2.heroName === 'Gensan') {
                if (tacticalState === 'defensive' && p2.gensanSwitchCD <= 0 && p2.gensanShadows.length > 0) {
                    scores.switch += 200;
                }
                if (dist < 300 && p2.superCooldown <= 0) {
                    scores.superSkill += 150;
                }
            }

            if (p2.heroName === 'Wolf') {
                if (dist < 200 && p2.superCooldown <= 0) {
                    scores.superSkill += 300;
                }
                scores.moveForward += 50;
            }

            if (p2.heroName === 'Ugo') {
                if (p2Puppet) {
                    scores.moveForward += 100;
                    scores.attack += 30;
                    let distToPuppet = Math.hypot((p2.x+p2.w/2) - (p2Puppet.x+p2Puppet.w/2), (p2.y+p2.h/2) - (p2Puppet.y+p2Puppet.h/2));
                    if (distToPuppet < 80 && dist > 150) scores.switch += 150;
                    if (dist < 60) scores.switch += 200;
                    if (dist < 100 && p2.superCooldown <= 0) scores.superSkill += 200;
                } else {
                    scores.moveBackward += 60;
                    if (dist > 150 && p2.attackState === 'idle') scores.switch += 100;
                    if (dist < 150 && p2.superCooldown <= 0) scores.superSkill += 150;
                }
            }

            if (p2.heroName === 'Kila') {
                let isSwitching = p2.kilaSwitchTimer > 0;
                let switchReady = p2.kilaSwitchCD <= 0;

                if (!isSwitching) {
                    if (switchReady) {
                        if (hpRatioP2 < 0.3) {
                            scores.switch += 200;
                        } else if (dist > 300 && p2.kilaElement === 'water') {
                            scores.switch += 100;
                        } else if (dist < 150 && p2.kilaElement === 'earth') {
                            scores.switch += 100;
                        }
                    }

                    if (p2.kilaElement === 'fire') {
                        if (dist < 400 && p2.superCooldown <= 0) scores.superSkill += 150;
                    } else if (p2.kilaElement === 'water') {
                        if (dist < 300 && p2.superCooldown <= 0) scores.superSkill += 200;
                    } else if (p2.kilaElement === 'earth') {
                        if (dist < 600 && p2.superCooldown <= 0) scores.superSkill += 150;
                    }
                }
            }

            if (p2.heroName === 'Noae') {
                let mineCount = this.minions.filter(m => m.type === 'landmine' && m.owner === p2).length;
                if (mineCount < 3 && dist > 150 && Math.random() < 0.05) {
                    scores.switch += 150;
                }
                if (dist < 300 && p2.superCooldown <= 0) {
                    scores.superSkill += 200;
                }
            }

            if (p2.heroName === 'Volt') {
                if (p2.energy < 50 && p2.superCooldown <= 0) scores.superSkill += 500;
                if (p2.isOverloaded) {
                    scores.moveBackward += 200;
                } else {
                    if (p2.energy > 30) {
                        if (p2.y > targetEntity.y - 150) scores.jump += 200;
                        if (p2.y < targetEntity.y - 250) keys[p2.controls.down] = true;
                        scores.attack += 100;
                        scores.moveBackward += 50;
                    } else {
                        scores.moveBackward += 150;
                    }
                }
            }

            if (dist < attackRange - 30 && !isMelee && p2.heroName !== 'Volt') scores.moveBackward += 60;
            if (tacticalState === 'defensive') scores.moveBackward += 40;
            if (p2.heroName === 'Kadaxi' && p2.comboCount === 2) scores.moveBackward += 20;

            if (p2.heroName === 'Euclid') {
                if (p2.euclidWeapon === 'magic') {
                    scores.moveBackward += 60;
                    if (p2.superCooldown <= 0 && dist > 300) scores.superSkill += 150;
                    if (dist < 100 && p2.euclidSwitchTimer <= 0) scores.switch += 90;
                } else {
                    if (dist > 250 && p2.euclidSwitchTimer <= 0) scores.switch += 90;
                }
            }

            if (dist <= attackRange && Math.abs(dy) < 60) {
                scores.attack += 80;
            }
            if (nearEdge) scores.attack += 15;
            scores.attack += Math.random() * 10;

            let superRange = (p2.heroName === 'Duke' && !p2.isMounted) ? 600 : attackRange + 100;
            if (p2.heroName === 'Kadaxi') superRange = 200;

            if (skillReady && dist <= superRange && Math.abs(dy) < 60 && p2.heroName !== 'Kae' && p2.heroName !== 'Ugo' && p2.heroName !== 'Kila' && p2.heroName !== 'Volt' && p2.heroName !== 'Gensan' && p2.heroName !== 'Wolf') {
                scores.superSkill += 100;
                if (tacticalState === 'aggressive') scores.superSkill += 50;
            }
            if (p2.heroName === 'Kadaxi' && p2.grapplePhase === 1) {
                scores.superSkill += 500;
            }

            if (dy < -40 && p2.heroName !== 'Volt') {
                if (sourceEntity.isGrounded) {
                    scores.jump += 100;
                } else if (p2.jumpsLeft > 0 && p2.vy > -2) {
                    scores.jump += 100;
                }
            }

            if (dist < 100 && Math.random() < 0.2 && p2.heroName !== 'Volt') scores.jump += 60;

            if (p2.heroName === 'Kadaxi' && !sourceEntity.isGrounded && !p2.hasFlipped && p2.flipCooldown <= 0) {
                if (dist < 150 && Math.abs(dy) < 80) scores.jump += 100;
            }

            for (let proj of this.projectiles) {
                if (proj.owner !== p2 && !proj.dead && proj.type !== "dynamite") {
                    let dxProj = sourceEntity.x - proj.x;
                    let isHeadingTowards = (dxProj > 0 && proj.vx > 0) || (dxProj < 0 && proj.vx < 0);
                    let isYAligned = (proj.y + proj.h > sourceEntity.y - 20) && (proj.y < sourceEntity.y + sourceEntity.h + 80);

                    if (isHeadingTowards && isYAligned && Math.abs(dxProj) < 300) {
                        if (!sourceEntity.isGrounded && sourceEntity.vy < -2 && p2.heroName !== 'Kadaxi' && p2.heroName !== 'Volt') {
                        } else {
                            scores.jump += 200;
                        }

                        scores.moveBackward += 80;

                        if (!sourceEntity.isGrounded && Math.abs(dxProj) < 200 && p2.heroName !== 'Volt') {
                            if (!p2.hasFlipped && p2.flipCooldown <= 0) {
                                scores.jump += 300;
                                setTimeout(() => { if (!p2.dead) keysPressed[p2.controls.jump] = true; }, 50);
                            }
                        }
                        break;
                    }
                }
            }

            if (p2.heroName === 'Hunter') {
                if (dist < 120 && p2.hunterWeapon === 'musket') scores.switch += 80;
                if (dist > 200 && p2.hunterWeapon === 'sword' && p2.hunterMusketCD <= 0) scores.switch += 80;
            }

            if (scores.moveForward > scores.moveBackward) {
                if (dx > 0) p2.aiIntent.right = true; else p2.aiIntent.left = true;
            } else if (scores.moveBackward > scores.moveForward) {
                if (dx > 0) p2.aiIntent.left = true; else p2.aiIntent.right = true;
            }

            if (scores.jump > 50) keysPressed[p2.controls.jump] = true;

            if (scores.superSkill > 80) keysPressed[p2.controls.super] = true;
            else if (scores.attack > 60) keysPressed[p2.controls.attack] = true;

            if (scores.switch > 50) keysPressed[p2.controls.switch] = true;
        }

        keys[p2.controls.left] = p2.aiIntent.left;
        keys[p2.controls.right] = p2.aiIntent.right;
    }

    update(dt) {
        this.p1.update(dt); this.p2.update(dt);
        if (this.hurricane && !this.hurricane.dead) this.hurricane.update(dt);

        this.minions.forEach(m => m.update(dt));
        this.projectiles.forEach(p => p.update(dt));
        this.particles.forEach(p => p.update(dt));
        this.hazards.forEach(h => h.update(dt));

        this.minions = this.minions.filter(m => !m.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.particles = this.particles.filter(p => !p.dead);
        this.hazards = this.hazards.filter(h => !h.dead);

        if (this.state === 'PLAYING') {
            if (!this.p1.dead && !this.p2.dead && checkAABB(this.p1, this.p2) && !this.p1.grappledBy && !this.p2.grappledBy && this.p1.grapplePhase !== 1 && this.p2.grapplePhase !== 1) {
                let overlapX = (Math.min(this.p1.x + this.p1.w, this.p2.x + this.p2.w) - Math.max(this.p1.x, this.p2.x)) / 2;
                let c1 = this.p1.x + this.p1.w/2; let c2 = this.p2.x + this.p2.w/2;
                if (c1 < c2) { this.p1.x -= overlapX; this.p2.x += overlapX; } else { this.p1.x += overlapX; this.p2.x -= overlapX; }
            }
            this.updateUI();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        this.ctx.fillStyle = "#111820"; this.ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
        this.ctx.fillStyle = "#4caf50"; this.ctx.fillRect(0, GROUND_Y, CANVAS_W, 5);

        for (let plat of PLATFORMS) {
            if (plat.type === 'center') {
                this.ctx.fillStyle = "#add8e6"; this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                this.ctx.fillStyle = "#87cefa"; this.ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 10);
            } else {
                this.ctx.fillStyle = "#5c4033"; this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                this.ctx.fillStyle = "#3e2723"; this.ctx.fillRect(plat.x, plat.y + plat.h, plat.w, 10);
            }
        }

        if (this.hurricane && !this.hurricane.dead) this.hurricane.draw(this.ctx);
        this.hazards.forEach(h => h.draw(this.ctx));
        this.minions.forEach(m => m.draw(this.ctx));
        if (!this.p1.dead) this.p1.draw(this.ctx);
        if (!this.p2.dead) this.p2.draw(this.ctx);

        this.projectiles.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
    }
}

window.Game = Game;

var game = new Game();
window.game = game;

window.addEventListener('resize', () => {
    CANVAS_W = window.innerWidth; CANVAS_H = window.innerHeight;
    game.canvas.width = CANVAS_W; game.canvas.height = CANVAS_H;
    GROUND_Y = CANVAS_H - 100;

    PLATFORMS = [
        { x: CANVAS_W / 2 - 200, y: GROUND_Y - 180, w: 400, h: 20, type: 'center' },
        { x: Math.max(50, CANVAS_W / 4 - 150), y: GROUND_Y - 350, w: 250, h: 20, type: 'side' },
        { x: Math.min(CANVAS_W - 300, CANVAS_W * (3/4) - 100), y: GROUND_Y - 350, w: 250, h: 20, type: 'side' }
    ];
});
window.dispatchEvent(new Event('resize'));
