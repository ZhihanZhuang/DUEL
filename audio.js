/**
 * Procedural music and combat audio for Otokojuku: Legends Duel.
 * Sounds are synthesized at runtime so the game has no external audio licenses or asset downloads.
 */
class DuelAudio {
    constructor() {
        const stored = this.readSettings();
        this.settings = {
            master: this.clamp(stored.master ?? 0.72),
            music: this.clamp(stored.music ?? 0.42),
            sfx: this.clamp(stored.sfx ?? 0.78),
            muted: stored.muted === true
        };
        this.context = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.noiseBuffer = null;
        this.musicTimer = null;
        this.musicArena = null;
        this.musicStep = 0;
        this.nextMusicTime = 0;
        this.musicVoices = new Set();
        this.musicPaused = false;
        this.lastPlayed = new Map();
        this.eventCount = 0;
        this.heroProfiles = DuelAudio.HERO_PROFILES;
        this.bindControls();
        document.addEventListener('pointerdown', () => this.unlock(), { once: true });
        document.addEventListener('keydown', () => this.unlock(), { once: true });
    }

    readSettings() {
        try { return JSON.parse(localStorage.getItem('otokojuku_audio') || '{}'); }
        catch (_) { return {}; }
    }

    saveSettings() {
        localStorage.setItem('otokojuku_audio', JSON.stringify(this.settings));
    }

    clamp(value) {
        return Math.max(0, Math.min(1, Number(value) || 0));
    }

    ensureContext() {
        if (this.context) return true;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.sfxGain = this.context.createGain();
        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 18;
        compressor.ratio.value = 7;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.18;
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(compressor);
        compressor.connect(this.context.destination);
        this.applyVolumes(true);
        this.syncState('ready');
        return true;
    }

    syncState(eventName) {
        if (!document.body) return;
        document.body.dataset.audioState = this.context?.state || 'unavailable';
        document.body.dataset.audioArena = this.musicArena || '';
        if (eventName) {
            document.body.dataset.audioEvent = eventName;
            document.body.dataset.audioEventCount = String(++this.eventCount);
        }
    }

    unlock() {
        if (!this.ensureContext()) return false;
        if (this.context.state === 'suspended') this.context.resume();
        return true;
    }

    applyVolumes(immediate = false) {
        if (!this.context) return;
        const now = this.context.currentTime;
        const setGain = (node, value) => {
            node.gain.cancelScheduledValues(now);
            if (immediate) node.gain.setValueAtTime(value, now);
            else node.gain.setTargetAtTime(value, now, 0.025);
        };
        setGain(this.masterGain, this.settings.muted ? 0 : this.settings.master);
        setGain(this.musicGain, this.musicPaused ? 0.0001 : this.settings.music);
        setGain(this.sfxGain, this.settings.sfx);
    }

    setVolume(channel, value) {
        if (!['master', 'music', 'sfx'].includes(channel)) return;
        this.settings[channel] = this.clamp(value);
        this.saveSettings();
        this.applyVolumes();
        this.updateControlLabels();
    }

    setMuted(muted) {
        this.settings.muted = !!muted;
        this.saveSettings();
        this.applyVolumes();
        this.updateControlLabels();
    }

    bindControls() {
        const channels = ['master', 'music', 'sfx'];
        for (const channel of channels) {
            const input = document.getElementById(`audio-${channel}`);
            if (!input) continue;
            input.value = String(Math.round(this.settings[channel] * 100));
            input.addEventListener('input', () => {
                this.unlock();
                this.setVolume(channel, Number(input.value) / 100);
            });
        }
        const mute = document.getElementById('audio-muted');
        if (mute) {
            mute.checked = this.settings.muted;
            mute.addEventListener('change', () => {
                this.unlock();
                this.setMuted(mute.checked);
            });
        }
        this.updateControlLabels();
        document.addEventListener('click', event => {
            if (event.target.closest('button')) this.playUI('click');
        });
    }

    updateControlLabels() {
        for (const channel of ['master', 'music', 'sfx']) {
            const output = document.getElementById(`audio-${channel}-value`);
            if (output) output.textContent = `${Math.round(this.settings[channel] * 100)}%`;
        }
        const muteLabel = document.getElementById('audio-muted-label');
        if (muteLabel) muteLabel.textContent = this.settings.muted ? 'Muted' : 'Sound On';
    }

    canPlay(key, interval = 0) {
        if (!this.unlock() || this.settings.muted) return false;
        const now = performance.now();
        const last = this.lastPlayed.get(key) || -Infinity;
        if (now - last < interval) return false;
        this.lastPlayed.set(key, now);
        return true;
    }

    createPanner(pan = 0) {
        if (!this.context.createStereoPanner) return null;
        const panner = this.context.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        return panner;
    }

    tone(freq, duration, options = {}) {
        if (!this.ensureContext()) return null;
        const start = options.start ?? this.context.currentTime;
        const gainValue = Math.max(0.0001, options.gain ?? 0.08);
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const destination = options.music ? this.musicGain : this.sfxGain;
        const panner = this.createPanner(options.pan || 0);
        oscillator.type = options.type || 'triangle';
        oscillator.frequency.setValueAtTime(Math.max(20, freq), start);
        if (options.slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.slide), start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(gainValue, start + Math.min(0.025, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        if (panner) { gain.connect(panner); panner.connect(destination); }
        else gain.connect(destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
        if (options.music) {
            this.musicVoices.add(oscillator);
            oscillator.onended = () => this.musicVoices.delete(oscillator);
        }
        return oscillator;
    }

    getNoiseBuffer() {
        if (this.noiseBuffer) return this.noiseBuffer;
        const length = this.context.sampleRate * 1.5;
        const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
        return buffer;
    }

    noise(duration, options = {}) {
        if (!this.ensureContext()) return null;
        const start = options.start ?? this.context.currentTime;
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        const destination = options.music ? this.musicGain : this.sfxGain;
        const panner = this.createPanner(options.pan || 0);
        source.buffer = this.getNoiseBuffer();
        filter.type = options.filterType || 'bandpass';
        filter.frequency.setValueAtTime(options.frequency || 900, start);
        filter.Q.value = options.q || 0.7;
        gain.gain.setValueAtTime(Math.max(0.0001, options.gain || 0.05), start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        filter.connect(gain);
        if (panner) { gain.connect(panner); panner.connect(destination); }
        else gain.connect(destination);
        source.start(start);
        source.stop(start + duration + 0.02);
        if (options.music) {
            this.musicVoices.add(source);
            source.onended = () => this.musicVoices.delete(source);
        }
        return source;
    }

    fighterPan(fighter) {
        if (!fighter || typeof CANVAS_W === 'undefined') return 0;
        return Math.max(-0.75, Math.min(0.75, ((fighter.x + fighter.w/2) / Math.max(1, CANVAS_W) - 0.5) * 1.5));
    }

    playUI(kind = 'click') {
        if (!this.canPlay(`ui-${kind}`, 35)) return;
        this.syncState(`ui:${kind}`);
        const now = this.context.currentTime;
        this.tone(kind === 'confirm' ? 620 : 420, 0.055, { start: now, gain: 0.025, type: 'square' });
        this.tone(kind === 'confirm' ? 930 : 560, 0.04, { start: now + 0.025, gain: 0.015, type: 'triangle' });
    }

    playAttack(fighter) {
        const hero = fighter?.heroName || 'Unknown';
        if (!this.canPlay(`attack-${fighter?.id || hero}`, 45)) return;
        this.syncState(`attack:${hero}`);
        const now = this.context.currentTime;
        const pan = this.fighterPan(fighter);
        const gun = ['Hason', 'Kuro', 'D2F1', 'Roka'].includes(hero) || (hero === 'Hunter' && fighter.hunterWeapon === 'musket');
        const energy = ['Volt', 'Sola', 'Nyra', 'Orion', 'Archor', 'Laegon', 'Veyra', 'Voss', 'Raigo'].includes(hero);
        const heavy = ['Artu', 'Duke', 'Kadaxi', 'Brom', 'Axeron', 'Ukon'].includes(hero);
        const mechanical = ['Noae', 'Ugo', 'Mori'].includes(hero);
        if (gun) {
            this.noise(hero === 'Roka' ? 0.24 : 0.09, { start: now, gain: hero === 'Roka' ? 0.19 : 0.095, frequency: hero === 'Roka' ? 180 : 1400, filterType: 'lowpass', pan });
            this.tone(hero === 'Roka' ? 72 : 130, hero === 'Roka' ? 0.3 : 0.11, { start: now, gain: hero === 'Roka' ? 0.2 : 0.075, slide: 45, type: 'square', pan });
        } else if (energy) {
            this.tone(hero === 'Sola' ? 190 : 520, 0.18, { start: now, gain: 0.07, slide: hero === 'Sola' ? 760 : 1040, type: 'sawtooth', pan });
            this.noise(0.12, { start: now, gain: 0.035, frequency: 2400, pan });
        } else if (mechanical) {
            this.tone(170, 0.11, { start: now, gain: 0.07, slide: 95, type: 'square', pan });
            this.noise(0.07, { start: now, gain: 0.045, frequency: 2100, pan });
        } else {
            this.noise(heavy ? 0.2 : 0.12, { start: now, gain: heavy ? 0.095 : 0.06, frequency: heavy ? 420 : 1100, pan });
            this.tone(heavy ? 105 : 240, heavy ? 0.22 : 0.12, { start: now, gain: heavy ? 0.09 : 0.045, slide: heavy ? 62 : 160, type: 'triangle', pan });
        }
    }

    playHit(victim, attacker, damage = 1, isDoT = false) {
        if (damage <= 0) return;
        const key = isDoT ? 'dot-hit' : `hit-${victim?.id || 'target'}`;
        if (!this.canPlay(key, isDoT ? 130 : 42)) return;
        this.syncState(`hit:${attacker?.heroName || 'world'}>${victim?.heroName || victim?.type || 'target'}`);
        const now = this.context.currentTime;
        const pan = this.fighterPan(victim);
        const strength = Math.max(0.35, Math.min(1.35, Math.sqrt(Math.max(1, damage) / 35)));
        if (isDoT) {
            this.tone(210, 0.055, { start: now, gain: 0.025, slide: 150, type: 'square', pan });
            return;
        }
        this.noise(0.075 + strength * 0.055, { start: now, gain: 0.065 * strength, frequency: 780 - strength * 210, pan });
        this.tone(115 - strength * 22, 0.12 + strength * 0.08, { start: now, gain: 0.085 * strength, slide: 55, type: 'triangle', pan });
        if (damage >= 70) this.tone(48, 0.3, { start: now, gain: 0.12, slide: 31, type: 'sine', pan });
    }

    playEntityHit(target, attacker, damage = 1, isDoT = false) {
        this.playHit(target, attacker, damage, isDoT);
    }

    playSkill(fighter, kind = 'switch') {
        const hero = fighter?.heroName || 'Unknown';
        if (!this.canPlay(`skill-${fighter?.id || hero}-${kind}`, kind === 'super' ? 220 : 100)) return;
        this.syncState(`${kind}:${hero}`);
        const now = this.context.currentTime;
        const pan = this.fighterPan(fighter);
        const profile = this.heroProfiles[hero] || { root: 260, wave: 'triangle', texture: 1600, direction: 1 };
        const direction = kind === 'super' ? profile.direction : -profile.direction;
        if (kind === 'super') {
            [0.5, 1, 1.5, 2].forEach((ratio, index) => {
                const frequency = profile.root * ratio;
                this.tone(frequency, 0.46 + index * 0.1, {
                    start: now + index * 0.045,
                    gain: 0.07,
                    slide: frequency * (direction > 0 ? 1.45 : 0.68),
                    type: index % 2 ? profile.wave : profile.accent,
                    pan
                });
            });
            this.noise(0.62, { start: now, gain: 0.085, frequency: profile.texture, filterType: profile.filter, q: profile.q, pan });
            return;
        }
        this.tone(profile.root, 0.24, { start: now, gain: 0.06, slide: profile.root * (direction > 0 ? 1.8 : 0.55), type: profile.wave, pan });
        this.tone(profile.root * 1.5, 0.16, { start: now + 0.045, gain: 0.035, slide: profile.root * (direction > 0 ? 2.1 : 0.8), type: profile.accent, pan });
        this.noise(0.18, { start: now, gain: 0.045, frequency: profile.texture, filterType: profile.filter, q: profile.q, pan });
    }

    playExplosion(radius = 80, damage = 0) {
        if (!this.canPlay('explosion', 55)) return;
        this.syncState('explosion');
        const now = this.context.currentTime;
        const size = Math.max(0.5, Math.min(1.5, radius / 100 + damage / 250));
        this.noise(0.24 + size * 0.22, { start: now, gain: 0.11 * size, frequency: 340 / size, filterType: 'lowpass' });
        this.tone(70 / size, 0.35 + size * 0.16, { start: now, gain: 0.13 * size, slide: 32, type: 'sine' });
    }

    playVictory() {
        if (!this.canPlay('victory', 1000)) return;
        this.syncState('victory');
        const now = this.context.currentTime;
        [261.63, 329.63, 392, 523.25].forEach((freq, index) => this.tone(freq, 0.7, { start: now + index * 0.12, gain: 0.075, type: 'triangle' }));
    }

    midi(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    getTheme(arenaId) {
        const themes = {
            dojo: { bpm: 94, scale: [57,60,62,64,67,69], melody: [0,null,2,3,null,2,4,null,5,4,3,null,2,0,null,4], bass: [45,45,48,43], wave: 'triangle', hat: 0.018 },
            cliff: { bpm: 108, scale: [50,53,55,57,60,62], melody: [0,2,null,4,5,null,4,2,0,null,3,4,null,2,1,null], bass: [38,41,36,43], wave: 'sine', hat: 0.026 },
            foundry: { bpm: 126, scale: [52,53,55,58,59,62], melody: [0,null,1,3,2,null,4,1,0,3,null,5,4,2,1,null], bass: [40,40,41,38], wave: 'square', hat: 0.038 },
            citadel: { bpm: 104, scale: [60,62,64,67,69,72], melody: [0,2,4,null,5,4,2,null,1,3,5,null,4,3,2,null], bass: [48,43,45,47], wave: 'triangle', hat: 0.022 },
            grand_arena: { bpm: 134, scale: [45,48,50,52,53,57], melody: [0,null,2,4,null,5,4,2,1,null,3,5,4,null,2,1], bass: [33,36,38,40], wave: 'sawtooth', hat: 0.04 }
        };
        return themes[arenaId] || themes.dojo;
    }

    startMusic(arenaId) {
        if (!this.unlock()) return;
        this.stopMusic();
        this.musicPaused = false;
        this.musicArena = arenaId;
        this.syncState('music:start');
        this.musicStep = 0;
        this.nextMusicTime = this.context.currentTime + 0.05;
        this.scheduleMusic();
        this.musicTimer = setInterval(() => this.scheduleMusic(), 80);
    }

    scheduleMusic() {
        if (!this.context || !this.musicArena || this.context.state === 'suspended') return;
        const theme = this.getTheme(this.musicArena);
        const stepDuration = 60 / theme.bpm / 2;
        while (this.nextMusicTime < this.context.currentTime + 0.28) {
            const step = this.musicStep % 16;
            const melodyIndex = theme.melody[step];
            if (melodyIndex !== null && melodyIndex !== undefined) {
                this.tone(this.midi(theme.scale[melodyIndex]), stepDuration * 0.72, { start: this.nextMusicTime, gain: 0.055, type: theme.wave, music: true, pan: (step % 4 - 1.5) * 0.12 });
            }
            if (step % 4 === 0) {
                const bassNote = theme.bass[Math.floor(step / 4)];
                this.tone(this.midi(bassNote), stepDuration * 2.8, { start: this.nextMusicTime, gain: 0.08, type: 'triangle', music: true });
                this.tone(82, 0.16, { start: this.nextMusicTime, gain: 0.085, slide: 42, type: 'sine', music: true });
            }
            if (step === 4 || step === 12) this.noise(0.12, { start: this.nextMusicTime, gain: 0.045, frequency: 1050, music: true });
            if (step % 2 === 0) this.noise(0.035, { start: this.nextMusicTime, gain: theme.hat, frequency: 5400, q: 1.6, music: true });
            if (step === 0 || step === 8) {
                const chordRoot = theme.scale[step === 0 ? 0 : 3];
                [0, 4, 7].forEach(interval => this.tone(this.midi(chordRoot + interval - 12), stepDuration * 7.5, { start: this.nextMusicTime, gain: 0.014, type: 'sine', music: true, pan: interval === 4 ? 0.25 : -0.25 }));
            }
            this.nextMusicTime += stepDuration;
            this.musicStep++;
        }
    }

    pauseMusic() {
        if (!this.context || !this.musicGain) return;
        this.musicPaused = true;
        this.syncState('music:pause');
        this.musicGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);
    }

    resumeMusic() {
        if (!this.context || !this.musicGain) return;
        this.musicPaused = false;
        this.syncState('music:resume');
        this.unlock();
        this.musicGain.gain.setTargetAtTime(this.settings.music, this.context.currentTime, 0.08);
    }

    stopMusic() {
        if (this.musicTimer) clearInterval(this.musicTimer);
        this.musicTimer = null;
        this.musicArena = null;
        this.musicPaused = false;
        this.syncState('music:stop');
        for (const voice of this.musicVoices) {
            try { voice.stop(); } catch (_) {}
        }
        this.musicVoices.clear();
    }
}

DuelAudio.HERO_PROFILES = Object.freeze({
    Hason:   { root: 110.00, wave: 'square',   accent: 'sawtooth', texture: 420,  filter: 'lowpass',  q: 0.7, direction: -1 },
    Hunter:  { root: 116.54, wave: 'triangle', accent: 'square',   texture: 1850, filter: 'bandpass', q: 1.0, direction: 1 },
    Macu:    { root: 123.47, wave: 'sawtooth', accent: 'triangle', texture: 720,  filter: 'lowpass',  q: 0.8, direction: 1 },
    Willi:   { root: 130.81, wave: 'square',   accent: 'sine',     texture: 3100, filter: 'highpass', q: 1.8, direction: 1 },
    Artu:    { root: 138.59, wave: 'triangle', accent: 'sawtooth', texture: 360,  filter: 'lowpass',  q: 0.6, direction: -1 },
    Duke:    { root: 146.83, wave: 'square',   accent: 'triangle', texture: 980,  filter: 'bandpass', q: 1.1, direction: -1 },
    Kadaxi:  { root: 155.56, wave: 'sawtooth', accent: 'square',   texture: 1250, filter: 'bandpass', q: 1.4, direction: -1 },
    Euclid:  { root: 164.81, wave: 'sine',     accent: 'triangle', texture: 2300, filter: 'highpass', q: 2.0, direction: 1 },
    Lique:   { root: 174.61, wave: 'sawtooth', accent: 'sine',     texture: 640,  filter: 'lowpass',  q: 1.2, direction: -1 },
    Kae:     { root: 185.00, wave: 'triangle', accent: 'square',   texture: 1480, filter: 'bandpass', q: 1.6, direction: 1 },
    Ugo:     { root: 196.00, wave: 'square',   accent: 'triangle', texture: 840,  filter: 'bandpass', q: 0.9, direction: -1 },
    Kila:    { root: 207.65, wave: 'sine',     accent: 'sawtooth', texture: 2050, filter: 'bandpass', q: 1.3, direction: 1 },
    Volt:    { root: 220.00, wave: 'sawtooth', accent: 'square',   texture: 3900, filter: 'highpass', q: 2.7, direction: 1 },
    Gensan:  { root: 233.08, wave: 'sine',     accent: 'triangle', texture: 2700, filter: 'highpass', q: 1.7, direction: -1 },
    Noae:    { root: 246.94, wave: 'square',   accent: 'sawtooth', texture: 300,  filter: 'lowpass',  q: 0.7, direction: -1 },
    Wolf:    { root: 261.63, wave: 'triangle', accent: 'sawtooth', texture: 1050, filter: 'bandpass', q: 1.1, direction: 1 },
    Kuro:    { root: 277.18, wave: 'sine',     accent: 'square',   texture: 3350, filter: 'highpass', q: 2.2, direction: -1 },
    Sola:    { root: 293.66, wave: 'sawtooth', accent: 'sine',     texture: 2600, filter: 'bandpass', q: 2.0, direction: 1 },
    Nyra:    { root: 311.13, wave: 'sine',     accent: 'triangle', texture: 2250, filter: 'highpass', q: 1.6, direction: -1 },
    Orion:   { root: 329.63, wave: 'sine',     accent: 'sawtooth', texture: 1380, filter: 'bandpass', q: 2.4, direction: -1 },
    Archor:  { root: 349.23, wave: 'triangle', accent: 'sine',     texture: 4200, filter: 'highpass', q: 1.8, direction: 1 },
    Itan:    { root: 369.99, wave: 'square',   accent: 'triangle', texture: 920,  filter: 'bandpass', q: 1.0, direction: -1 },
    D2F1:    { root: 392.00, wave: 'square',   accent: 'sawtooth', texture: 1780, filter: 'bandpass', q: 1.9, direction: 1 },
    Laegon:  { root: 415.30, wave: 'sawtooth', accent: 'square',   texture: 4600, filter: 'highpass', q: 3.0, direction: 1 },
    Veyra:   { root: 440.00, wave: 'sine',     accent: 'triangle', texture: 2420, filter: 'bandpass', q: 2.6, direction: -1 },
    Brom:    { root: 466.16, wave: 'square',   accent: 'sine',     texture: 250,  filter: 'lowpass',  q: 0.6, direction: -1 },
    Axeron:  { root: 493.88, wave: 'sawtooth', accent: 'triangle', texture: 520,  filter: 'lowpass',  q: 0.9, direction: -1 },
    Ukon:    { root: 523.25, wave: 'triangle', accent: 'square',   texture: 760,  filter: 'bandpass', q: 1.4, direction: 1 },
    Mori:    { root: 554.37, wave: 'square',   accent: 'sawtooth', texture: 1650, filter: 'bandpass', q: 2.1, direction: 1 },
    Roka:    { root: 587.33, wave: 'square',   accent: 'sine',     texture: 190,  filter: 'lowpass',  q: 0.5, direction: -1 },
    Voss:    { root: 622.25, wave: 'sine',     accent: 'sawtooth', texture: 2880, filter: 'highpass', q: 2.8, direction: -1 },
    Raigo:   { root: 659.25, wave: 'sawtooth', accent: 'square',   texture: 5100, filter: 'highpass', q: 3.2, direction: 1 },
    Gelann:  { root: 698.46, wave: 'triangle', accent: 'sawtooth', texture: 1180, filter: 'bandpass', q: 2.3, direction: 1 },
    Dogel:   { root: 739.99, wave: 'sawtooth', accent: 'triangle', texture: 680, filter: 'lowpass', q: 1.4, direction: -1 },
    Lapis:   { root: 783.99, wave: 'sine', accent: 'square', texture: 2140, filter: 'bandpass', q: 2.5, direction: 1 },
    Tonia:   { root: 830.61, wave: 'square', accent: 'sawtooth', texture: 330, filter: 'lowpass', q: 0.8, direction: -1 },
    Ge:      { root: 176.20, wave: 'triangle', accent: 'sawtooth', texture: 610, filter: 'lowpass', q: 1.2, direction: 1 },
    Lak:     { root: 111.70, wave: 'square', accent: 'triangle', texture: 180, filter: 'lowpass', q: 0.5, direction: -1 },
    Pat:     { root: 905.30, wave: 'sine', accent: 'triangle', texture: 3100, filter: 'bandpass', q: 2.7, direction: 1 },
    Feng:    { root: 932.33, wave: 'sine', accent: 'triangle', texture: 3650, filter: 'highpass', q: 1.9, direction: 1 },
    Ocel:    { root: 987.77, wave: 'sawtooth', accent: 'sine', texture: 570, filter: 'lowpass', q: 1.5, direction: -1 },
    Magnetar:{ root: 1046.50, wave: 'square', accent: 'sawtooth', texture: 4400, filter: 'bandpass', q: 3.1, direction: -1 },
    Nerath:  { root: 1108.73, wave: 'sawtooth', accent: 'square', texture: 145, filter: 'lowpass', q: 3.4, direction: -1 }
});

window.DuelAudio = DuelAudio;
window.audioManager = new DuelAudio();
