/**
 * Otokojuku: Legends Duel
 * Config & Data
 */

// --- Input & KeyBinding Manager ---
const DEFAULT_BINDS = {
    p1: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS', attack: 'Space', super: 'KeyE', switch: 'KeyT', extra: 'KeyG' },
    p2: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown', attack: 'Numpad9', super: 'NumpadEnter', switch: 'Numpad8', extra: 'Numpad7' }
};

var currentBinds = JSON.parse(localStorage.getItem('otokojuku_binds')) || JSON.parse(JSON.stringify(DEFAULT_BINDS));
window.currentBinds = currentBinds;

function saveBinds() {
    localStorage.setItem('otokojuku_binds', JSON.stringify(currentBinds));
    updateControlsDisplay();
}

let listeningKey = null;

window.addEventListener('keydown', e => {
    if (listeningKey) {
        e.preventDefault();
        currentBinds[listeningKey.player][listeningKey.action] = e.code;
        listeningKey.btn.innerText = formatKey(e.code);
        listeningKey.btn.classList.remove('listening');
        listeningKey = null;
        saveBinds();
    } else {
        keys[e.code] = true;
        if (!e.repeat) keysPressed[e.code] = true;
    }
});
window.addEventListener('keyup', e => {
    if (!listeningKey) keys[e.code] = false;
});

function formatKey(code) {
    if (!code) return 'UNBOUND';
    return code.replace('Key', '').replace('Arrow', '').replace('Numpad', 'Num ');
}

function updateControlsDisplay() {
    let p1Disp = document.getElementById('p1-controls-display');
    let p2Disp = document.getElementById('p2-controls-display');
    if (p1Disp) {
        p1Disp.innerHTML = `
            Move: <span>${formatKey(currentBinds.p1.left)}, ${formatKey(currentBinds.p1.down)}, ${formatKey(currentBinds.p1.right)}</span><br>
            Jump: <span>${formatKey(currentBinds.p1.jump)}</span><br>
            Attack: <span>${formatKey(currentBinds.p1.attack)}</span><br>
            Super: <span>${formatKey(currentBinds.p1.super)}</span><br>
            Switch/Misc: <span>${formatKey(currentBinds.p1.switch)}</span><br>
            Extra (Shadow): <span>${formatKey(currentBinds.p1.extra)}</span>
        `;
    }
    if (p2Disp) {
        p2Disp.innerHTML = `
            Move: <span>${formatKey(currentBinds.p2.left)}, ${formatKey(currentBinds.p2.down)}, ${formatKey(currentBinds.p2.right)}</span><br>
            Jump: <span>${formatKey(currentBinds.p2.jump)}</span><br>
            Attack: <span>${formatKey(currentBinds.p2.attack)}</span><br>
            Super: <span>${formatKey(currentBinds.p2.super)}</span><br>
            Switch/Misc: <span>${formatKey(currentBinds.p2.switch)}</span><br>
            Extra (Shadow): <span>${formatKey(currentBinds.p2.extra)}</span>
        `;
    }
}

function buildSettingsUI() {
    ['p1', 'p2'].forEach(p => {
        const container = document.getElementById(`${p}-bindings`);
        if(!container) return;
        container.innerHTML = '';
        Object.keys(currentBinds[p]).forEach(action => {
            let row = document.createElement('div');
            row.className = 'keybind-row';
            row.innerHTML = `<span style="text-transform:capitalize">${action}:</span>`;
            let btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.innerText = formatKey(currentBinds[p][action]);
            btn.onclick = () => {
                if (listeningKey) listeningKey.btn.classList.remove('listening');
                listeningKey = { player: p, action: action, btn: btn };
                btn.classList.add('listening');
                btn.innerText = 'Press Any Key...';
            };
            row.appendChild(btn);
            container.appendChild(row);
        });
    });
}

// --- Constants & Game Data ---
var CANVAS_W = window.innerWidth;
var CANVAS_H = window.innerHeight;
const GRAVITY = 0.6;
var GROUND_Y = CANVAS_H - 100;

var ARENAS = {
    dojo: {
        name: 'Moonlit Dojo', worldScale: 1,
        theme: {
            sky: '#0d0818', horizon: '#241438', ground: '#1a1028', groundLine: '#3d5a3d',
            groundDetail: '#2d4a2d', center: '#6eb5d4', centerEdge: '#4a8aaa',
            side: '#6b4423', sideEdge: '#4a2f18', accent: '#d9c26c'
        },
        platforms: [
            { x: 0.50, elevation: 180, w: 400, type: 'center' },
            { x: 0.22, elevation: 350, w: 250, type: 'side' },
            { x: 0.78, elevation: 350, w: 250, type: 'side' }
        ]
    },
    cliff: {
        name: 'Storm Cliffs', worldScale: 1,
        theme: {
            sky: '#101820', horizon: '#263847', ground: '#20242b', groundLine: '#b8d5df',
            groundDetail: '#53636b', center: '#8ea4b0', centerEdge: '#5d737e',
            side: '#59636a', sideEdge: '#343d43', accent: '#d7eef5'
        },
        platforms: [
            { x: 0.18, elevation: 165, w: 270, type: 'side' },
            { x: 0.43, elevation: 320, w: 230, type: 'center' },
            { x: 0.69, elevation: 165, w: 290, type: 'side' },
            { x: 0.86, elevation: 350, w: 210, type: 'center' }
        ]
    },
    foundry: {
        name: 'Iron Foundry', worldScale: 1,
        theme: {
            sky: '#171717', horizon: '#302b29', ground: '#24201f', groundLine: '#d68a45',
            groundDetail: '#62554d', center: '#8f9699', centerEdge: '#555d61',
            side: '#995b35', sideEdge: '#59331f', accent: '#ffd166'
        },
        platforms: [
            { x: 0.23, elevation: 150, w: 290, type: 'side' },
            { x: 0.50, elevation: 300, w: 330, type: 'center' },
            { x: 0.77, elevation: 150, w: 290, type: 'side' },
            { x: 0.13, elevation: 425, w: 180, type: 'center' },
            { x: 0.87, elevation: 425, w: 180, type: 'center' }
        ]
    },
    citadel: {
        name: 'Sun Citadel', worldScale: 1,
        theme: {
            sky: '#18212a', horizon: '#374451', ground: '#28241d', groundLine: '#d7b35c',
            groundDetail: '#625a48', center: '#d7c68c', centerEdge: '#a28c4e',
            side: '#9d6b53', sideEdge: '#633f31', accent: '#f4e3a1'
        },
        platforms: [
            { x: 0.50, elevation: 145, w: 430, type: 'center' },
            { x: 0.25, elevation: 285, w: 235, type: 'side' },
            { x: 0.75, elevation: 285, w: 235, type: 'side' },
            { x: 0.50, elevation: 425, w: 260, type: 'center' }
        ]
    },
    grand_arena: {
        name: 'Grand Warfield', worldScale: 2.35, minWorldWidth: 2600, survivalOnly: true,
        theme: {
            sky: '#10171d', horizon: '#26333a', ground: '#1c211d', groundLine: '#748f5d',
            groundDetail: '#3e4b38', center: '#b3a36c', centerEdge: '#776b43',
            side: '#66757d', sideEdge: '#3d494f', accent: '#d9c26c'
        },
        platforms: [
            { x: 0.10, elevation: 155, w: 280, type: 'side' },
            { x: 0.31, elevation: 155, w: 310, type: 'center' },
            { x: 0.55, elevation: 155, w: 310, type: 'side' },
            { x: 0.82, elevation: 155, w: 300, type: 'center' },
            { x: 0.20, elevation: 310, w: 260, type: 'center' },
            { x: 0.43, elevation: 315, w: 330, type: 'side' },
            { x: 0.69, elevation: 310, w: 290, type: 'center' },
            { x: 0.91, elevation: 325, w: 230, type: 'side' },
            { x: 0.35, elevation: 465, w: 240, type: 'center' },
            { x: 0.61, elevation: 470, w: 270, type: 'center' }
        ]
    }
};

function buildArenaLayout(arenaId, viewportWidth, viewportHeight) {
    const resolvedId = Object.prototype.hasOwnProperty.call(ARENAS, arenaId) ? arenaId : 'dojo';
    const arena = ARENAS[resolvedId];
    const worldWidth = Math.max(
        viewportWidth,
        arena.minWorldWidth || 0,
        Math.round(viewportWidth * (arena.worldScale || 1))
    );
    const groundY = viewportHeight - 100;
    const platforms = arena.platforms.map(platform => {
        const width = Math.min(platform.w, Math.max(150, worldWidth - 40));
        return {
            x: Math.max(20, Math.min(worldWidth - width - 20, worldWidth * platform.x - width / 2)),
            y: groundY - platform.elevation,
            w: width,
            h: 20,
            type: platform.type
        };
    });
    return { id: resolvedId, arena, worldWidth, worldHeight: viewportHeight, groundY, platforms };
}

var PLATFORMS = buildArenaLayout('dojo', CANVAS_W, CANVAS_H).platforms;

window.ARENAS = ARENAS;
window.buildArenaLayout = buildArenaLayout;

var BOSSES = {
    tyrannt: {
        name: 'TYRANNT', title: 'Drone Overlord', color: '#35d5e8', maxHp: 9000,
        summary: 'Laser Matrix / Drone Swarm / Giant Units'
    },
    dragon: {
        name: 'DRAGON', title: 'Infernal Sky Tyrant', color: '#ff5a36', maxHp: 7500,
        summary: 'Flame Breath / Skyfall Dash / Fire Demons'
    },
    libertus: {
        name: 'LIBERTUS', title: 'Titan Knight', color: '#e8d39c', maxHp: 8500,
        summary: 'Colossal Swing / Knight Legion'
    },
    abyss: {
        name: 'ABYSS', title: 'The Leviathan', color: '#2aa8b8', maxHp: 8800,
        summary: 'Abyssal Bite / Tidal Wave / Drowning'
    },
    chronos: {
        name: 'CHRONOS', title: 'The Time Golem', color: '#d2b35c', maxHp: 8200,
        summary: 'Time Hammer / Time Stop / Rewind'
    },
    mortem: {
        name: 'MORTEM', title: 'Necromancer King', color: '#9a5ec4', maxHp: 8400,
        summary: 'Death Cleave / Undead Army / Soul Harvest'
    }
};

window.BOSSES = BOSSES;

var HEROES = {
    Hason: {
        name: "Hason", desc: "Cowboy with Colt Revolver",
        color: "#8B4513", maxHp: 750, speed: 5, jump: 15, width: 40, height: 70, superCD: 10000,
        ui: { hp: "75 WRD", atk: "2.8 WRD (Ranged)", passive: "Empties 6 shots then reloads for 2s. Out of combat for 5s fully restores ammo.", super: "Throws up to 3 Dynamites (15.3 WRD AoE each) in quick succession." }
    },
    Hunter: {
        name: "Hunter", desc: "Pirate with Musket & Great Sword",
        color: "#008080", maxHp: 750, speed: 4.5, jump: 14, width: 45, height: 70, superCD: 20000,
        ui: { hp: "75 WRD", atk: "1.7 WRD (Sword) / 2.0 WRD (Musket Homing)", passive: "Press [Switch] to swap weapons. Switching instantly resets musket cooldown (1s).", super: "Summons a hurricane that damages, stuns (0.5s), and blocks projectiles. Boosts HP & Jump." }
    },
    Macu: {
        name: "Macu", desc: "Ainu Warrior with Long Spear",
        color: "#2E8B57", maxHp: 900, speed: 4, jump: 16, width: 40, height: 75, superCD: 45000,
        ui: { hp: "90 WRD", atk: "2.2 WRD (Long Range Melee)", passive: "Spear dynamically tracks the closest enemy's height. Extended melee range.", super: "[BattleCry] +40% Speed, +20% Jump, +40% Damage. Grants 3s Poison on hit." }
    },
    Willi: {
        name: "Willi", desc: "Ninja with Throwing Knives",
        color: "#2F4F4F", maxHp: 500, speed: 6.5, jump: 16, width: 35, height: 65, superCD: 12000,
        ui: { hp: "50 WRD", atk: "2.3 WRD (Ranged)", passive: "Double Jump. Every 3rd attack knocks back & slows. Below 50% HP for the first time, gains 5s of +1 WRD Lifesteal.", super: "Invincible Dash. Press twice! (1s CD between dashes). Leaves a Giant Knife (5.3 WRD + 5s Slow)." }
    },
    Artu: {
        name: "Artu", desc: "Daimyo with Great Armor & Ashigaru",
        color: "#8B0000", maxHp: 1000, speed: 3.5, jump: 13, width: 50, height: 75, superCD: 65000,
        ui: { hp: "100 WRD", atk: "7.3 WRD (Heavy Melee)", passive: "Takes 10% less damage. Attacking has a 50% chance to block/deflect projectiles.", super: "Summons 5 Ashigaru soldiers (3 WRD HP) that auto-fire 1.3 WRD bullets every 1.5s." }
    },
    Duke: {
        name: "Duke", desc: "Cavalry Rider with Lance & Handgun",
        color: "#4682B4", maxHp: 750, speed: 6.5, jump: 12, width: 45, height: 70, superCD: 20000,
        ui: { hp: "Horse 50 WRD / Duke 75 WRD", atk: "3.3 WRD (Lance) / 1.5 WRD (Sabre)", passive: "Run continuously for 3s to charge Lance (3s Stun). Dismounts when horse dies (Sabre blocks 50% projectiles and heals 1.5 WRD on hit).", super: "Fires a deadly precise Handgun bullet (13.3 WRD) with no knockback. Heals 5 WRD on hit." }
    },
    Kadaxi: {
        name: "Kadaxi", desc: "Judo Master (Control & Combos)",
        color: "#1E90FF", maxHp: 850, speed: 5.5, jump: 15, width: 40, height: 75, superCD: 25000,
        ui: { hp: "85 WRD", atk: "3.3 WRD (Melee Combo)", passive: "<span class='skill-tag'>Karate Combo</span> Every 3rd attack fires a Blue Ki Blast (5.3 WRD, Huge Knockback, 0.75s Stun).<br><span class='skill-tag'>Flip Attack</span> Double Jump quickly to backflip (6.3 WRD, 3s CD).", super: "<span class='skill-tag'>2-Phase Grapple</span><br>1) Vacuum pull nearby enemies.<br>2) Press Super again within 5s to Judo Throw (13.3 WRD + 5s Stun)." }
    },
    Euclid: {
        name: "Euclid", desc: "Necromantic Geometric Mage",
        color: "#8A2BE2", maxHp: 700, speed: 4.5, jump: 14, width: 40, height: 70, superCD: 20000,
        ui: { hp: "70 WRD", atk: "1.2 WRD (Sword) / 10.3 WRD (Homing Burst)", passive: "Press [Switch] for Melee/Ranged (2s Invincible Channel). Magic takes 0.5s to cast (Uninterruptible), homes in, or heals skeletons if out of range.", super: "<span class='skill-tag'>Necromantic Summoning</span> 1s cast to summon 5 slow but deadly melee skeletons. Skeletons deal 6 WRD damage and explode on death (2.3 WRD)." }
    },
    Lique: {
        name: "Lique", desc: "Berserker with Hatchets",
        color: "#B22222", maxHp: 950, speed: 5.5, jump: 13, width: 40, height: 70, superCD: 25000,
        ui: { hp: "95 WRD", atk: "1.8 WRD (Fast Melee)", passive: "Pure relentless melee pressure with virtually no attack windup.", super: "<span class='skill-tag'>Blood Frenzy</span> Dual-wields for 10s. Attack speed x2, movement speed slightly reduced. Heals 0.5 WRD per hit on heroes. Throws a 10.3 WRD axe when it ends." }
    },
    Kae: {
        name: "Kae", desc: "Assassin of Thunder",
        color: "#00CED1", maxHp: 650, speed: 6.0, jump: 16, width: 35, height: 65, superCD: 12000,
        ui: { hp: "65 WRD", atk: "2.5 WRD (Thunder Fist)", passive: "Fast melee. Every 4th hit deals +1.4 WRD & stuns target for 1s. Below 50% HP, turns into a shadow, doubling ATK & move speed, increasing damage by 40%.", super: "<span class='skill-tag'>Shadow Thunder Step</span> Teleports behind an enemy anywhere in the arena and stuns them for 1s. 0.3s cast time." }
    },
    Ugo: {
        name: "Ugo", desc: "Puppet Master Mage",
        color: "#E6E6FA", maxHp: 700, speed: 4.5, jump: 14, width: 40, height: 70, superCD: 15000,
        ui: { hp: "70 WRD", atk: "1.7 WRD (Paper Planes) / 2.0 WRD (Puppet)", passive: "Press [Switch] to summon Puppet. You take control of the Puppet while Ugo stands still. Detonate with [Switch] for massive 10 WRD AoE + 0.5s Stun. Stunned for 3s if puppet dies.", super: "With Puppet: Instantly swap positions (0.2s invincibility). Without Puppet: Long backstep & fires a piercing Blue Plane (5 WRD)." }
    },
    Kila: {
        name: "Kila", desc: "Elemental Stance Mage",
        color: "#555555", maxHp: 750, speed: 4.8, jump: 14, width: 40, height: 70, superCD: 18000,
        ui: { hp: "75 WRD", atk: "3~5 WRD (Multi)", passive: "Press [Switch] to rotate Elements (Fire->Water->Earth). 2s Invincibility while switching, but heavily slowed and cannot attack. 10s CD.", super: "Fire: Homing explosive Dragon. Water: Massive CC Wave. Earth: Spawns spikes on platforms and ground (10 WRD, 5s Stun)." }
    },
    Volt: {
        name: "Volt", desc: "Flying Energy Marksman",
        color: "#FFD700", maxHp: 650, speed: 4.0, jump: 15, width: 35, height: 65, superCD: 30000,
        ui: { hp: "65 WRD", atk: "0.6 WRD (Homing Lasers)", passive: "Hold [Jump]/[Down] to Free Fly. Flight costs 15 Energy/s, Attacks cost 25 Energy. Depleting Energy causes Overload (No attack/flight, take 3 WRD dmg). Below 20 Energy warning.", super: "<span class='skill-tag'>Overdrive Mode</span> Unlimited Energy and +100% Attack Speed for 10 seconds. Forces overload when it ends." }
    },
    Gensan: {
        name: "Gensan", desc: "Phantom Blade Master",
        color: "#cccccc", maxHp: 800, speed: 7, jump: 15, width: 40, height: 70, superCD: 18000,
        ui: { hp: "80 WRD", atk: "3.2 WRD (Sword)", passive: "Every 4th attack deals 5.2 WRD with +30% range and slows for 1.2s. Press [Extra] to leave a Sword Shadow (Max 2, 3s CD).", super: "<span class='skill-tag'>White Peak Array</span> Drops 3 giant swords at the enemy's position. Falling swords deal 9 WRD along their path and on impact; only enemies struck on the arena floor are dizzied for 5s. Leaves a Sword Shadow at your position for 8s. Press [Switch] to teleport to furthest shadow (No CD)." }
    },
    Noae: {
        name: "Noae", desc: "Mine Engineer",
        color: "#B8860B", maxHp: 650, speed: 4.8, jump: 14, width: 40, height: 70, superCD: 22000,
        ui: { hp: "65 WRD", atk: "1.9 WRD (Pickaxe)", passive: "Press [Switch] to plant a Land Mine (Max 3, 2.5 WRD + 0.4s stun).", super: "Summons a bouncing Minecart (4.5s) that deals 2 WRD + 0.5s stun. Minecart detonates mines." }
    },
    Wolf: {
        name: "Wolf King", desc: "High Mobility Assassin",
        color: "#696969", maxHp: 700, speed: 7.5, jump: 16, width: 40, height: 70, superCD: 20000,
        ui: { hp: "70 WRD", atk: "2.0 WRD (Fast Claw)", passive: "Out of combat 1.5s: Next attack grants +30% SPD (2s) and deals +1.0 WRD. <br><span class='skill-tag'>Hunting Mark</span> 5 consecutive hits inflict 4s Bleed (0.5 WRD/s).", super: "<span class='skill-tag'>King's Pounce</span> 0.35s windup. Instantly leaps in front of the enemy for 15.0 WRD + 2.5s 40% Slow." }
    },
    Kuro: {
        name: "Kuro", desc: "Invisible Phantom Marksman",
        color: "#244d3b", maxHp: 600, speed: 5.2, jump: 14, width: 38, height: 70, superCD: 26000,
        ui: { hp: "60 WRD", atk: "2 / 5 / 8 WRD (Charged Rifle)", passive: "<span class='skill-tag'>Optical Veil</span> After 1.25s without attacking or taking damage, standing still conceals Kuro and his HP completely; moving leaves visible distortion. Hold Attack to charge Longshot; full charge pierces minions and slows. Press [Switch] to leave a moving 1 HP shade and vanish completely for 5.5s, even while moving or attacking (10s CD).", super: "<span class='skill-tag'>Phantom Round</span> Loads one 13 WRD execution shot for 7s. It pierces every target; the first fighter hit is dizzied for 1s. Charging exposes a bright scope glint." }
    },
    Sola: {
        name: "Sola", desc: "Lightsaber Sentinel",
        color: "#167d8d", maxHp: 780, speed: 5.8, jump: 15, width: 40, height: 70, superCD: 15000,
        ui: { hp: "78 WRD", atk: "5.6 WRD (Fast Lightsaber)", passive: "<span class='skill-tag'>Luminous Guard</span> Lightsaber attacks deflect most projectiles. Each deflection stores 1 Focus (max 3), adding 0.8 WRD to the next saber hit. Press [Switch] to charge in the chosen direction while swinging continuously, damaging enemies and deflecting every attack (6s CD).", super: "<span class='skill-tag'>Force Choke</span> Hold [Super] to seize an enemy anywhere in the arena for up to 4.5s. They rise inside a lightning sphere while Sola steals 0.5 WRD every 0.25s. Victims can rapidly tap Basic Attack to break free after a hidden random number of taps. Released victims take up to 6 WRD impact damage when they land, based on fall distance. Releasing [Super], moving, or taking damage ends the channel. 15s CD." }
    },
    Nyra: {
        name: "Nyra", desc: "Chakram Rift Dancer",
        color: "#d84b78", maxHp: 680, speed: 6.2, jump: 16, width: 36, height: 66, superCD: 24000,
        ui: { hp: "68 WRD", atk: "2.2 WRD Out + 2.2 WRD Return (Fast Chakram)", passive: "Thrown chakrams reverse after 0.6s and can hit again on the way back. Nyra recovers rapidly between throws. Press [Switch] to Rift Shift to one of your active chakrams and destroy it (7s CD).", super: "<span class='skill-tag'>Halo Storm</span> Launches six returning chakrams in every direction. Each deals 2 WRD on the outward and return paths." }
    },
    Orion: {
        name: "Orion", desc: "Gravity Gauntlet Warden",
        color: "#4056a1", maxHp: 900, speed: 4.6, jump: 13.5, width: 46, height: 74, superCD: 28000,
        ui: { hp: "90 WRD", atk: "3.0 WRD (Extended Gravity Gauntlets)", passive: "Melee hits build Gravity Charges (max 3). Press [Switch] to consume every charge in a close Gravity Pulse, dealing 1 WRD + 1.5 WRD per charge and briefly pulling enemies inward (5s CD).", super: "<span class='skill-tag'>Black Hole</span> Creates a massive black hole for 5s at the enemy's position. It strongly pulls and heavily slows nearby enemies, dealing 0.7 WRD every 0.25s." }
    },
    Archor: {
        name: "Hoin", desc: "Bloodhunt Rapid Archer",
        color: "#2f8f62", maxHp: 340, speed: 5.8, jump: 15, width: 38, height: 68, superCD: 18000,
        ui: { hp: "34 WRD", atk: "0.6-3.6 WRD (Rapid Arrows)", passive: "<span class='skill-tag'>Bloodhunt</span> Land 3 continuous fighter hits to activate Bloodhunt for 3.5s. During Bloodhunt, hits heal Hoin for 1 WRD and add 0.2 WRD arrow damage, up to +3 WRD until the effect ends. Press [Switch] to cleanse all debuffs (8s CD).", super: "<span class='skill-tag'>Hunting Roc</span> Fires a bird that tracks for 2s, then continues unguided. On impact it explodes for 7 WRD in a wide area and dizzies affected opponents for 2.5s." }
    },
    Itan: {
        name: "Itan", desc: "Naginata Chiq Warrior",
        color: "#9f3347", maxHp: 820, speed: 5.0, jump: 14.5, width: 42, height: 72, superCD: 5000,
        ui: { hp: "82 WRD", atk: "3.2 WRD (Wide Naginata Swing)", passive: "Wide sweeping melee attacks control a large area. Press [Switch] for 8s Nu mode: red outline, faster attacks and movement, and empowered red Chiq.", super: "<span class='skill-tag'>Threefold Chiq</span> Swings for 2s while ignoring debuffs and control, but still takes damage, then releases three fast, blockable blue blades. Each deals 5 WRD, slows, bleeds, and leaves a 5s path that controls enemies and heals Itan. Nu Chiq is red with double damage, slowdown, and path healing. 5s CD." }
    },
    D2F1: {
        name: "D2F-1", desc: "Autonomous Drone Consciousness",
        color: "#35d5e8", maxHp: 520, speed: 7.2, jump: 16, width: 40, height: 66, superCD: 35000,
        ui: { hp: "52 WRD", atk: "0.5 WRD (Electromagnetic Ball)", passive: "Fast ranged chassis. Press [Switch] to deploy 3 autonomous laser drones (10s CD). Drones evade incoming projectiles and maintain firing distance; their 2s beams cycle every 2.5s and inflict continuous burn damage.", super: "<span class='skill-tag'>Orbital Drop Unit</span> Deploys 4 laser drones and marks an enemy for 1s, slowing them while the target reticle blinks. A giant melee robot then drops onto the mark, dealing 8.5 WRD and 0.75s dizzy on landing before fighting for D2F-1. 35s CD." }
    },
    Laegon: {
        name: "Laegon", desc: "Thunder God and Anti-Summon Mage",
        color: "#8b5cf6", maxHp: 750, speed: 4.5, jump: 14, width: 42, height: 72, superCD: 26000,
        ui: { hp: "75 WRD", atk: "0.8 WRD (Long Branching Lightning Current)", passive: "Lightning uses 10 Energy and projects a long current that splits 1 -> 2 -> 4 without hitting the same target twice. Different consecutive targets build up to 5 Thunder Charges (+3% attack speed each). Press [Switch] for Heaven's Thunder: a delayed 3 WRD strike with bonus summon damage (8s CD).", super: "<span class='skill-tag'>Purple-Gold Thunder Hammer</span> Calls a 5 WRD hammer impact that returns for 3 WRD piercing damage. Catching it grants 8s Thunder God Mode: melee/returning throws, 20% lifesteal, and infinite Energy." }
    },
    Veyra: {
        name: "Veyra", desc: "Chronomancer Battlefield Controller",
        color: "#9d5cff", maxHp: 700, speed: 6.2, jump: 14.5, width: 39, height: 69, superCD: 18000,
        ui: { hp: "70 WRD", atk: "3 WRD (Chrono Bolt)", passive: "Movement leaves up to 3 temporal echoes that slow enemies on contact. Press [Switch] to place a visible 12s Time Anchor (max 2; oldest is replaced).", super: "<span class='skill-tag'>Time Reversal</span> After a 1s charge, returns Veyra to his position about 3s ago or a recent valid anchor, and restores half the HP lost during those 3s. Only Veyra's position and HP are reversed." }
    },
    Vaeilash: {
        name: "Vaeilash", desc: "Twin-Blade Blood Assassin",
        color: "#a71930", maxHp: 700, speed: 7.2, jump: 16, width: 36, height: 67, superCD: 24000,
        ui: { hp: "70 WRD", atk: "1.5 WRD (Twin Blades)", passive: "Rapid close-range attacks build Blood Marks. Every third consecutive hit on one target restores 1 WRD and three marks trigger Bleeding.", super: "Blood Moon empowers Vaeilash for 8s: +35% movement, +50% attack speed, 0.5 WRD lifesteal per hit, longer marks, and a 6 WRD finishing cross-slash." }
    },
    Brom: {
        name: "Brom", desc: "Demolitionist and Area Controller",
        color: "#e67e22", maxHp: 800, speed: 5.8, jump: 14, width: 43, height: 71, superCD: 24000,
        ui: { hp: "80 WRD", atk: "6 WRD Direct + 6 WRD Explosion", passive: "Slow Blast Charges explode on impact and trigger nearby Brom explosives. Press [Switch] to throw a 4s Sticky Bomb; press again to detonate it for 15 WRD, strong knockback, and 0.3s stun.", super: "<span class='skill-tag'>Demolition Zone</span> Marks a large area for 2s, then creates a slowing, dizzying field with staggered 30 WRD central and 12 WRD outer explosions over 1.5s." }
    },
    Axeron: {
        name: "Axeron", desc: "Gold-Blue Labrys Assassin",
        color: "#2468c9", maxHp: 700, speed: 6.5, jump: 16, width: 39, height: 68, superCD: 22000,
        ui: { hp: "70 WRD", atk: "3 WRD (Very Fast Mechanical Labrys)", passive: "Every second consecutive basic attack hit applies a visible Axe Mark for 5s. Misses do not reset the hit count, and multiple marks may coexist. Hold a direction and press [Switch] to rush a marked enemy for 2.5 WRD, strong knockback, and brief hit-stun (3s CD).", super: "<span class='skill-tag'>Titan's Descent</span> Warns the target area, then drops a gigantic gold-blue labrys for 10 WRD in a large shockwave. Very strong knockback; heals Axeron for 25% of actual damage dealt." }
    },
    Ukon: {
        name: "Ukon", desc: "Iron Rod Burst Warrior",
        color: "#b94b3f", maxHp: 850, speed: 7.4, jump: 17, width: 42, height: 72, superCD: 28000,
        ui: { hp: "85 WRD", atk: "4 WRD (Iron Rod Charge)", passive: "<span class='skill-tag'>Iron Momentum</span> Ukon cannot walk. [Left], [Down], and [Right] launch short collision-aware directional dashes with a fast recharge; [Jump] works normally. Basic Attack locks a direction and travels a limited distance toward the closest enemy; it only strikes if that enemy began within reach, otherwise it is a mobility dash (0.8s CD). Hostile summoned units are valid targets and win equal-distance ties. Press [Switch] to summon a fragile Iron Shadow at the enemy that chases once, strikes for 1.5 WRD, and briefly slows and stuns (8s CD).", super: "<span class='skill-tag'>Heavenly Peach Tree</span> Summons a towering peach tree and carries vulnerable Ukon to its crown. Press [Super] again to predict the enemy's position and perform Heavenly Drop after a short warning. Deals 6-16 WRD based on actual fall distance with heavy knockback, stun, debris, and screen shake." }
    },
    Mori: {
        name: "Mori", desc: "Mechanist Trap Controller",
        color: "#c58a32", maxHp: 800, speed: 5.4, jump: 15, width: 40, height: 70, superCD: 26000,
        ui: { hp: "80 WRD", atk: "2.5 WRD (Mechanic Fan)", passive: "<span class='skill-tag'>Linked Mechanisms</span> Fan blades leave 5s Mechanism Nodes on walls and platforms (max 3). Nearby nodes connect with a one-use Energy Wire that deals 2 WRD and slows for 1s. Every third consecutive fan hit gains knockback. Press [Switch] to fire Grappling Wire toward an enemy, node, or surface (3s CD).", super: "<span class='skill-tag'>Thousand Mechanisms</span> For 8s, valid arena surfaces deploy up to 20 warned traps: spears, springs, blade wires, rolling bombs, and tracking mini machine guns. Each machine gun fires six blockable 0.8 WRD rounds. Mori remains fully vulnerable." }
    },
    Roka: {
        name: "Roka", desc: "Recoil Heavy Cannon Gunner",
        color: "#496d7b", maxHp: 600, speed: 4.6, jump: 14, width: 42, height: 70, superCD: 24000,
        ui: { hp: "60 WRD", atk: "4 WRD (Charged Cannon)", passive: "<span class='skill-tag'>Recoil Movement</span> Every cannon shot immediately launches Roka opposite the aimed direction, including while airborne. Hold a direction while firing to aim. Press [Switch] for a marked Mortar shell that falls from above (6s CD).", super: "<span class='skill-tag'>Heavy Artillery</span> For 10s, Cannon Shot charges faster and deals 5 WRD with 1.5x explosion radius and knockback. Recoil is 1.25x stronger, enabling sustained aerial movement." }
    },
    Voss: {
        name: "Voss", desc: "Temporal Copycat",
        color: "#5660a8", maxHp: 750, speed: 5.6, jump: 15, width: 40, height: 70, superCD: 22000,
        ui: { hp: "75 WRD", atk: "1.5 WRD (Temporal Shard)", passive: "<span class='skill-tag'>Temporal Copy</span> Press [Switch] to become the opponent for 3s (7.5s CD), gaining their Basic, [Switch], and Super with copied cooldowns reset to zero. Voss's own skills are unavailable and their cooldowns freeze until the copy ends.", super: "<span class='skill-tag'>Temporal Double</span> Summons a duplicate for 6s that moves as Voss's reflection across the arena center and repeats Voss's attacks after a short delay for 50% damage. It cannot create another double." }
    },
    Raigo: {
        name: "Raigo", desc: "Golden Thunder Rider",
        color: "#287b8f", maxHp: 800, speed: 6.4, jump: 16, width: 42, height: 72, superCD: 22000,
        ui: { hp: "80 WRD", atk: "2.8 WRD (Lightning Spear)", passive: "<span class='skill-tag'>Static Energy</span> Basic hits generate 15 Energy. At 70, the next attack becomes a 6 WRD Thunder Strike with a brief stun and consumes all Energy. Press [Switch] to spend 25 Energy on a directional 3 WRD Thunder Charge.", super: "<span class='skill-tag'>Golden Spear Arsenal</span> For 10s, Raigo switches into a marksman stance. Basic Attack lets a golden spear drift freely in a random direction for 1.5s, then rapidly hurls it toward the enemy's current position. During Arsenal, [Switch] launches three lower-damage spears one after another; each hit briefly stuns." }
    },
    Gelann: {
        name: "Gelann", desc: "Flameblade Archer",
        color: "#b6422b", maxHp: 750, speed: 6.1, jump: 15.5, width: 40, height: 70, superCD: 24000,
        ui: { hp: "75 WRD", atk: "2 WRD (Fast Scimitar)", passive: "<span class='skill-tag'>Flame Breath</span> Press [Switch] for a short wind-up, then breathe a close cone of fire for 1.5 WRD. The flame burns for 2s and slows enemies while they remain inside (6s CD).", super: "<span class='skill-tag'>Rain of Arrows</span> Telegraphs a large target area, then rains arrows for 2.5s. The full volley deals 6 WRD per target and refreshes a 45% slow for 2s." }
    },
    Dogel: {
        name: "Dogel", desc: "Chain Reaper",
        color: "#7c2538", maxHp: 800, speed: 5.8, jump: 15, width: 42, height: 72, superCD: 26000,
        ui: { hp: "80 WRD", atk: "2-5 WRD (Charged Kusarigama)", passive: "<span class='skill-tag'>Chain Pull</span> Hold Attack while moving to spin and enlarge the kusarigama, then release for up to 5 WRD, Bleed, and Slow. Press [Switch] to hook and pull an enemy to Dogel (7s CD).", super: "<span class='skill-tag'>Blood Reaper</span> For 10s, gain 40% attack speed, 20% movement speed, larger attacks, and 25% lifesteal from actual damage dealt." }
    },
    Lapis: {
        name: "Lapis", desc: "The Five Stones",
        color: "#4066b1", maxHp: 650, speed: 5.2, jump: 14.5, width: 40, height: 68, superCD: 24000,
        ui: { hp: "65 WRD", atk: "1.5-5 WRD (Random Arcane Stone)", passive: "Five differently sized stones always orbit Lapis. Basic Attack raises and launches a random available stone. Press [Switch] for Fivefold Judgment, converging all five stones on one enemy (8s CD).", super: "<span class='skill-tag'>Stone Whip</span> Connects all five stones for 9s, granting rapid extended melee attacks, stronger knockback, and 20% lifesteal." }
    },
    Tonia: {
        name: "Tonia", desc: "The Iron Rain",
        color: "#61706e", maxHp: 700, speed: 4.9, jump: 14, width: 44, height: 70, superCD: 25000,
        ui: { hp: "70 WRD", atk: "0.25 WRD (Held Gatling Fire)", passive: "Hold Attack for rapid suppressive fire. Each bullet builds Heat; at 100 Heat the gun overheats and cannot fire until it cools. Press [Switch] to launch six arcing 1.5 WRD grenades (7s CD).", super: "<span class='skill-tag'>Missile Salvo</span> Clears all Heat and launches three 4 WRD explosive missiles that track for 1.5s before flying straight." }
    },
    Ge: {
        name: "Ge", desc: "The Bronze Shaman",
        color: "#9a6a2f", maxHp: 850, speed: 5.5, jump: 15, width: 43, height: 72, superCD: 26000,
        ui: { hp: "85 WRD", atk: "3 WRD (Long Bronze Ge)", passive: "<span class='skill-tag'>Hooking Thrust</span> Press [Switch] to charge through walls. A hit deals 2 WRD, stuns for 1s, and drags the victim back to Ge's starting point (7s CD).", super: "<span class='skill-tag'>Bronze God</span> Perform an uninterruptible 2.5s ritual, then transform for 10s. Damage doubles, movement speed rises by 30%, and actual damage heals Ge for 25%." }
    },
    Lak: {
        name: "Lak", desc: "The Earthshaker",
        color: "#6f6759", maxHp: 1000, speed: 4.2, jump: 13, width: 48, height: 76, superCD: 30000,
        ui: { hp: "100 WRD", atk: "2.5 WRD (Stone Hammer)", passive: "<span class='skill-tag'>Heavy Ground</span> While grounded, Lak takes 15% less damage and greatly resists knockback. Every third attack creates a shockwave; hard landings create a small earthquake. Press [Switch] to raise a 4s projectile-blocking stone wall that can be stood on (8s CD).", super: "<span class='skill-tag'>Mountain Breaker</span> Sends five connected-surface shockwaves forward for 8 WRD total, slowing on every hit before the final wave launches enemies and erupts into a giant pillar." }
    },
    Pat: {
        name: "Pat", desc: "The Puppet Master",
        color: "#a34887", maxHp: 700, speed: 5.2, jump: 14.5, width: 39, height: 69, superCD: 28000,
        ui: { hp: "70 WRD", atk: "1.2 WRD (Thread Lash)", passive: "Thread hits apply up to 3 Puppet Marks for 5s. Press [Switch] to fire Binding Thread for 1.5 WRD and a 1.5s root (9s CD); at 3 marks it also pulls the victim toward Pat and consumes the marks.", super: "<span class='skill-tag'>Marionette</span> Controls the enemy's movement for 3s while a puppet lashes for 0.8 WRD every 0.5s. The finale deals 3 WRD, stuns for 1s, and violently pulls the enemy toward Pat." }
    },
    Feng: {
        name: "Feng", desc: "Qinggong Wind Martial Artist",
        color: "#dffbff", maxHp: 800, speed: 6.8, jump: 16.5, width: 40, height: 70, superCD: 24000,
        ui: { hp: "80 WRD", atk: "2 WRD (White Qigong)", passive: "Every third Qigong becomes one full-strength fan-shaped Wind Wave with extreme knockback. Press [Switch] for a higher armored Qinggong leap (5s CD).", super: "<span class='skill-tag'>Drifting Wind</span> Vault high, float for 4s, and press Attack up to 6 times. Each fan-shaped wave blows enemies away, locks its direction when fired, reflects from arena surfaces, then Feng spins and falls." }
    }
};

window.HEROES = HEROES;

var keys = {};
var keysPressed = {};
window.keys = keys;
window.keysPressed = keysPressed;

function checkAABB(r1, r2) {
    if (!r1 || !r2) return false;
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}
