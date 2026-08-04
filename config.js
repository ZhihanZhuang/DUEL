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
        ui: { hp: "80 WRD", atk: "3.2 WRD (Sword)", passive: "Every 4th attack deals 5.2 WRD with +30% range and slows for 1.2s. Press [Extra] to leave a Sword Shadow (Max 2, 3s CD).", super: "<span class='skill-tag'>White Peak Array</span> Drops 3 giant swords at the enemy's position (9 WRD AoE, 5s Stun) and leaves a Sword Shadow at your position for 8s. Press [Switch] to teleport to furthest shadow (No CD)." }
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
        color: "#167d8d", maxHp: 780, speed: 5.8, jump: 15, width: 40, height: 70, superCD: 22000,
        ui: { hp: "78 WRD", atk: "2.8 WRD (Lightsaber)", passive: "<span class='skill-tag'>Luminous Guard</span> Lightsaber attacks deflect most projectiles. Each deflection stores 1 Focus (max 3), adding 0.8 WRD to the next saber hit. Press [Switch] for an invincible short Force Step (6s CD).", super: "<span class='skill-tag'>Singularity Slash</span> Pulls nearby enemies into saber range and strikes for 8.5 WRD + 1.5 WRD per stored Focus, then dizzies them for 0.7s." }
    },
    Nyra: {
        name: "Nyra", desc: "Chakram Rift Dancer",
        color: "#d84b78", maxHp: 680, speed: 6.2, jump: 16, width: 36, height: 66, superCD: 24000,
        ui: { hp: "68 WRD", atk: "2.2 WRD Out + 2.2 WRD Return (Chakram)", passive: "Thrown chakrams reverse after 0.6s and can hit again on the way back. Press [Switch] to Rift Shift to one of your active chakrams and destroy it (7s CD).", super: "<span class='skill-tag'>Halo Storm</span> Launches six returning chakrams in every direction. Each deals 2 WRD on the outward and return paths." }
    },
    Orion: {
        name: "Orion", desc: "Gravity Gauntlet Warden",
        color: "#4056a1", maxHp: 900, speed: 4.6, jump: 13.5, width: 46, height: 74, superCD: 28000,
        ui: { hp: "90 WRD", atk: "3.0 WRD (Gravity Gauntlets)", passive: "Melee hits build Gravity Charges (max 3). Press [Switch] to consume every charge in a close Gravity Pulse, dealing 1 WRD + 1.5 WRD per charge and briefly pulling enemies inward (5s CD).", super: "<span class='skill-tag'>Event Horizon</span> Creates a 4s gravity well at the enemy's position. It drags enemies toward its core and deals 1 WRD each second." }
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
