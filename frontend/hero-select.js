class HeroSelectUI {
    constructor(game) {
        this.game = game;
        this.keys = Object.keys(HEROES);
        this.indices = {
            p1: Math.max(0, this.keys.indexOf(game.p1Choice)),
            p2: Math.max(0, this.keys.indexOf(game.p2Choice))
        };
        this.mode = null;
        this.variant = 'duel';
        this.step = 1;
        this.attackPulse = { p1: 0, p2: 0 };
        this.bossKeys = Object.keys(BOSSES);
        this.bossIndex = Math.max(0, this.bossKeys.indexOf(game.bossChoice));
        this.previewFighters = new Map();
        this.frame = 0;
    }

    mount() {
        this.stage = document.getElementById('hero-select-stage');
        this.stage.innerHTML = `${this.panelMarkup('p1', 'Player 1', 'p1')}${this.panelMarkup('p2', 'Player 2', 'p2')}`;
        this.panels = { p1: this.stage.querySelector('[data-slot="p1"]'), p2: this.stage.querySelector('[data-slot="p2"]') };
        this.bindPanel('p1');
        this.bindPanel('p2');
        this.renderPanel('p1');
        this.renderPanel('p2');
        this.mountBossShowcase();
        this.bindMainMenu();
        window.addEventListener('keydown', event => this.onKeyDown(event));
        this.animate(performance.now());
    }

    panelMarkup(slot, label, accent) {
        return `
            <section class="hero-showcase" data-slot="${slot}" data-accent="${accent}">
                <div class="hero-carousel" aria-label="${label} hero carousel">
                    <button class="carousel-arrow" type="button" data-direction="-1" aria-label="Previous hero">▲</button>
                    <div class="hero-neighbor previous"><canvas class="neighbor-avatar" width="56" height="72"></canvas><span></span></div>
                    <div class="hero-neighbor current"><canvas class="neighbor-avatar" width="56" height="72"></canvas><span></span></div>
                    <div class="hero-neighbor next"><canvas class="neighbor-avatar" width="56" height="72"></canvas><span></span></div>
                    <button class="carousel-arrow" type="button" data-direction="1" aria-label="Next hero">▼</button>
                </div>
                <div class="hero-figure" title="Preview attack animation">
                    <canvas class="hero-preview" width="360" height="430"></canvas>
                    <span class="preview-hint">Click fighter to preview attack</span>
                </div>
                <div class="hero-dossier">
                    <span class="hero-role">${label} // Fighter Select</span>
                    <h2 class="hero-name"></h2>
                    <h3 class="hero-title"></h3>
                    <p class="hero-tagline"></p>
                    <div class="hero-stats">
                        <div class="hero-stat"><span>HP</span><strong data-stat="hp"></strong></div>
                        <div class="hero-stat"><span>ATK</span><strong data-stat="atk"></strong></div>
                        <div class="hero-stat"><span>SPEED</span><strong data-stat="speed"></strong></div>
                    </div>
                    <div class="skill-list"></div>
                </div>
            </section>`;
    }

    bindPanel(slot) {
        const panel = this.panels[slot];
        panel.querySelectorAll('[data-direction]').forEach(button => {
            button.onclick = () => this.move(slot, Number(button.dataset.direction));
        });
        panel.addEventListener('wheel', event => {
            event.preventDefault();
            if (Math.abs(event.deltaY) < 4) return;
            const now = performance.now();
            if ((panel._lastWheel || 0) + 130 > now) return;
            panel._lastWheel = now;
            this.move(slot, event.deltaY > 0 ? 1 : -1);
        }, { passive: false });
        panel.querySelector('.hero-figure').onclick = () => { this.attackPulse[slot] = performance.now(); };
    }

    move(slot, direction) {
        this.indices[slot] = (this.indices[slot] + direction + this.keys.length) % this.keys.length;
        const key = this.keys[this.indices[slot]];
        if (slot === 'p1') this.game.p1Choice = key;
        else this.game.p2Choice = key;
        this.renderPanel(slot);
    }

    renderPanel(slot) {
        const panel = this.panels[slot];
        const index = this.indices[slot];
        const key = this.keys[index];
        const hero = HEROES[key];
        const neighbors = [
            { selector: '.previous', key: this.keys[(index - 1 + this.keys.length) % this.keys.length] },
            { selector: '.current', key },
            { selector: '.next', key: this.keys[(index + 1) % this.keys.length] }
        ];
        panel.querySelector('.hero-name').textContent = hero.name;
        panel.querySelector('.hero-title').textContent = hero.desc;
        panel.querySelector('.hero-tagline').textContent = this.heroTagline(hero);
        panel.querySelector('[data-stat="hp"]').textContent = hero.ui?.hp || `${Math.round(hero.maxHp / 10)} WRD`;
        panel.querySelector('[data-stat="atk"]').textContent = this.compact(hero.ui?.atk || 'Variable', 26);
        panel.querySelector('[data-stat="speed"]').textContent = this.speedStars(hero.speed);
        panel.querySelector('.skill-list').innerHTML = this.skillCards(hero);
        neighbors.forEach(item => {
            const node = panel.querySelector(item.selector);
            node.querySelector('span').textContent = HEROES[item.key].name;
            node.dataset.hero = item.key;
            this.drawMiniHero(node.querySelector('canvas'), item.key);
        });
        panel.style.setProperty('--hero-color', hero.color);
        document.getElementById('online-current-hero')?.replaceChildren(document.createTextNode(`Fighter: ${HEROES[this.game.p1Choice].name}`));
    }

    heroTagline(hero) {
        const passive = this.strip(hero.ui?.passive || '');
        const first = passive.split(/[.!?]/)[0];
        return this.compact(first || hero.desc, 118);
    }

    skillCards(hero) {
        const passiveText = this.strip(hero.ui?.passive || 'Special technique');
        const superText = this.strip(hero.ui?.super || 'Ultimate technique');
        const passiveName = this.tagName(hero.ui?.passive) || 'Special';
        const superName = this.tagName(hero.ui?.super) || 'Ultimate';
        return [
            ['ATK', 'Basic Attack', hero.ui?.atk || 'Core weapon attack'],
            ['T', passiveName, passiveText],
            ['E', superName, superText]
        ].map(([key, name, copy]) => `
            <div class="skill-card"><span class="skill-key">${key}</span>
                <div class="skill-copy"><strong>${name}</strong><small>${this.compact(copy, 105)}</small></div>
            </div>`).join('');
    }

    tagName(html = '') {
        const match = html.match(/skill-tag[^>]*>([^<]+)/i);
        return match ? match[1].trim() : '';
    }

    strip(html = '') {
        const node = document.createElement('div');
        node.innerHTML = html;
        return (node.textContent || '').replace(/\s+/g, ' ').trim();
    }

    compact(text, length) {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        return clean.length > length ? `${clean.slice(0, length - 3).trim()}...` : clean;
    }

    speedStars(speed) {
        const count = Math.max(1, Math.min(5, Math.round((Number(speed) - 3) / 1.05) + 1));
        return `${'★'.repeat(count)}${'☆'.repeat(5-count)}`;
    }

    open(mode, variant = 'duel') {
        this.mode = mode;
        this.variant = variant;
        this.step = 1;
        ['menu-screen','computer-mode-screen','boss-mode-screen','login-screen'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
        document.getElementById('hero-select-screen').classList.remove('hidden');
        document.getElementById('hero-select-title').textContent = mode === 'local' ? 'Local Versus' : mode === 'boss' ? 'Choose Challengers' : mode === 'online' ? 'Online Fighter' : 'Choose Your Fighter';
        this.updateLayout();
    }

    updateLayout() {
        const isComputer = this.mode === 'computer';
        const isSoloBoss = this.mode === 'boss' && this.game.bossPlayerCount === 1;
        const isSingle = this.mode === 'online' || isSoloBoss || (isComputer && this.step <= 2);
        const showP1 = !isComputer || this.step === 1;
        const showP2 = this.mode === 'local' || (this.mode === 'boss' && !isSoloBoss) || (isComputer && this.step === 2);
        this.panels.p1.classList.toggle('inactive', !showP1);
        this.panels.p2.classList.toggle('inactive', !showP2);
        this.panels.p1.classList.toggle('single', isSingle && showP1);
        this.panels.p2.classList.toggle('single', isSingle && showP2);
        this.panels.p1.classList.toggle('active', showP1);
        this.panels.p2.classList.toggle('active', showP2);
        this.panels.p1.querySelector('.hero-role').textContent = this.mode === 'boss' ? 'Player 1 // Boss Challenger' : 'Player 1 // Fighter Select';
        this.panels.p2.querySelector('.hero-role').textContent = isComputer ? 'CPU // Opponent Select' : this.mode === 'boss' ? 'Player 2 // Boss Challenger' : 'Player 2 // Fighter Select';
        document.getElementById('hero-select-step').textContent = isComputer ? `Step ${this.step} / 2` : this.mode === 'local' ? 'Two Player Select' : this.mode === 'boss' ? `${this.game.bossPlayerCount === 2 ? 'Co-op' : 'Solo'} Challenger Select` : 'Fighter Showcase';
        document.getElementById('btn-hero-confirm').textContent = isComputer && this.step === 1 ? 'Choose CPU' : this.mode === 'online' ? 'Continue' : 'Fight!';
        document.getElementById('select-difficulty').classList.toggle('hidden', !(isComputer && this.step === 2));
        document.getElementById('arena-select').classList.toggle('hidden', this.mode === 'boss');
    }

    confirm() {
        if (this.mode === 'computer' && this.step === 1) { this.step = 2; this.updateLayout(); return; }
        document.getElementById('hero-select-screen').classList.add('hidden');
        if (this.mode === 'computer') this.game.startGame(true, this.variant);
        else if (this.mode === 'local') this.game.startGame(false);
        else if (this.mode === 'boss') this.game.startBossGame();
        else if (this.mode === 'online') {
            document.getElementById('login-screen').classList.remove('hidden');
            window.mySelectedHero = this.game.p1Choice;
            document.getElementById('online-current-hero').textContent = `Fighter: ${HEROES[this.game.p1Choice].name}`;
            setTimeout(() => window.initMultiplayerClient?.(), 50);
        }
    }

    back() {
        if (this.mode === 'computer' && this.step === 2) { this.step = 1; this.updateLayout(); return; }
        document.getElementById('hero-select-screen').classList.add('hidden');
        if (this.mode === 'computer') this.game.showComputerModes(true);
        else if (this.mode === 'boss') this.game.showBossMenu(true);
        else document.getElementById('menu-screen').classList.remove('hidden');
        this.mode = null;
    }

    bindMainMenu() {
        document.getElementById('btn-sp').onclick = () => this.game.showComputerModes(true);
        document.getElementById('btn-sp-duel').onclick = () => this.open('computer', 'duel');
        document.getElementById('btn-sp-survival').onclick = () => this.open('computer', 'survival');
        document.getElementById('btn-mp').onclick = () => this.open('local');
        document.getElementById('btn-boss-mode').onclick = () => this.game.showBossMenu(true);
        document.getElementById('btn-online').onclick = () => this.open('online');
        document.getElementById('btn-hero-confirm').onclick = () => this.confirm();
        document.getElementById('btn-hero-back').onclick = () => this.back();
    }

    onKeyDown(event) {
        if (document.getElementById('hero-select-screen')?.classList.contains('hidden')) return;
        const activeP1 = !this.panels.p1.classList.contains('inactive');
        const activeP2 = !this.panels.p2.classList.contains('inactive');
        if (activeP1 && (event.code === 'KeyA' || event.code === 'KeyD')) this.move('p1', event.code === 'KeyA' ? -1 : 1);
        else if (activeP2 && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) this.move('p2', event.code === 'ArrowLeft' ? -1 : 1);
        else if (event.code === 'Enter') this.confirm();
        else if (event.code === 'Escape') this.back();
        else return;
        event.preventDefault();
    }

    mountBossShowcase() {
        document.getElementById('boss-prev').onclick = () => this.moveBoss(-1);
        document.getElementById('boss-next').onclick = () => this.moveBoss(1);
        document.getElementById('boss-visual').onclick = () => { this.bossAttackPulse = performance.now(); };
        this.renderBoss();
    }

    moveBoss(direction) {
        this.bossIndex = (this.bossIndex + direction + this.bossKeys.length) % this.bossKeys.length;
        this.game.bossChoice = this.bossKeys[this.bossIndex];
        document.querySelectorAll('[data-boss-id]').forEach(option => {
            const selected = option.dataset.bossId === this.game.bossChoice;
            option.classList.toggle('selected', selected);
            option.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        this.renderBoss();
    }

    renderBoss() {
        const boss = BOSSES[this.bossKeys[this.bossIndex]];
        document.getElementById('boss-name').textContent = boss.name;
        document.getElementById('boss-title').textContent = boss.title;
        document.getElementById('boss-summary').textContent = boss.summary.replaceAll(' / ', '. ');
        document.getElementById('boss-hp-label').textContent = `${Math.round(boss.maxHp/10)} WRD // EXTREME`;
    }

    animate(time) {
        for (const slot of ['p1','p2']) {
            const canvas = this.panels?.[slot]?.querySelector('.hero-preview');
            if (canvas) this.drawHero(canvas, this.keys[this.indices[slot]], time, time - this.attackPulse[slot] < 520, false, this.attackPulse[slot]);
        }
        const bossCanvas = document.getElementById('boss-preview');
        if (bossCanvas) this.drawBoss(bossCanvas, this.bossKeys[this.bossIndex], time, time - (this.bossAttackPulse || 0) < 600);
        this.frame = requestAnimationFrame(next => this.animate(next));
    }

    drawMiniHero(canvas, key) { this.drawHero(canvas, key, 0, false, true); }

    drawHero(canvas, key, time, attacking, mini = false, attackStarted = 0) {
        const ctx = canvas.getContext('2d');
        if (!mini) {
            const displayWidth = Math.max(1, Math.round(canvas.clientWidth));
            const displayHeight = Math.max(1, Math.round(canvas.clientHeight));
            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
            }
        }
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0,0,w,h);
        ctx.imageSmoothingEnabled = false;
        const scale = mini ? .22 : Math.max(.72, Math.min(w / 250, h / 300));
        const logicalW = w / scale;
        const logicalH = h / scale;
        const fighter = this.getPreviewFighter(key);
        const ground = mini ? logicalH - 22 : logicalH * .78;
        fighter.x = logicalW * (mini ? .36 : .38) - fighter.w / 2;
        fighter.y = ground - fighter.h;
        fighter.facing = 1;
        fighter.dead = false;
        fighter.flipActive = 0;
        this.setPreviewAttackState(fighter, attacking, time, attackStarted);

        ctx.fillStyle = mini ? 'rgba(0,0,0,.24)' : 'rgba(0,0,0,.42)';
        ctx.fillRect(w * .12, ground * scale, w * .76, mini ? 2 : 7);
        ctx.save();
        ctx.scale(scale, scale);
        fighter.draw(ctx, {
            revealOwnedKuro: true,
            previewTarget: { x: logicalW * .82, y: ground - fighter.h * .55, w: 1, h: 1 }
        });
        ctx.restore();
    }

    getPreviewFighter(key) {
        if (!this.previewFighters.has(key)) {
            const controls = currentBinds?.p1 || DEFAULT_BINDS.p1;
            this.previewFighters.set(key, new Fighter(`preview-${key}`, key, 0, controls, true));
        }
        return this.previewFighters.get(key);
    }

    setPreviewAttackState(fighter, attacking, time, attackStarted) {
        if (!attacking) {
            fighter.attackState = 'idle';
            fighter.stateTimer = 0;
            fighter.maxStateTimer = 0;
            return;
        }
        const elapsed = Math.max(0, time - attackStarted);
        const phases = [
            ['windup', 150],
            ['active', 220],
            ['recovery', 150]
        ];
        let remaining = elapsed;
        for (const [state, duration] of phases) {
            if (remaining <= duration) {
                fighter.attackState = state;
                fighter.maxStateTimer = duration;
                fighter.stateTimer = duration - remaining;
                return;
            }
            remaining -= duration;
        }
        fighter.attackState = 'idle';
        fighter.stateTimer = 0;
        fighter.maxStateTimer = 0;
    }

    drawBoss(canvas,key,time,attacking) {
        const ctx=canvas.getContext('2d'), boss=BOSSES[key], w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
        const pulse=1+Math.sin(time*.003)*.025+(attacking?.08:0);ctx.save();ctx.translate(w/2,h*.82);ctx.scale(pulse,pulse);
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(-145,-8,290,16);ctx.fillStyle='#11141b';ctx.fillRect(-104,-260,208,260);ctx.fillStyle=boss.color;ctx.fillRect(-94,-250,188,250);
        ctx.fillStyle=this.mix(boss.color,'#000000',.48);ctx.fillRect(-124,-205,248,55);ctx.fillRect(-135,-120,55,135);ctx.fillRect(80,-120,55,135);
        ctx.fillStyle='#08090d';ctx.fillRect(-65,-218,130,48);ctx.fillStyle='#ffede0';ctx.fillRect(-45,-199,24,10);ctx.fillRect(21,-199,24,10);
        ctx.strokeStyle=boss.color;ctx.shadowBlur=28;ctx.shadowColor=boss.color;ctx.lineWidth=8;ctx.strokeRect(-110,-270,220,280);ctx.restore();
    }

    mix(a,b,amount){const parse=value=>value.match(/[a-f\d]{2}/gi)?.map(v=>parseInt(v,16))||[128,128,128];const x=parse(a),y=parse(b);return`rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*amount)).join(',')})`;}
}

window.HeroSelectUI = HeroSelectUI;
