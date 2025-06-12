import { playerData, savePlayerData, formatNumber, logMessage, getLevelFromXp, titleCase, getEnchantmentBonus, playSound, sounds, getMaxHp } from './utils.js';
import { showSection, updateHud, showFloatingCombatText, updateDungeoneeringButtonVisibility } from './ui.js';
import { getExpToNextLevel, SWORD_DATA, TOOL_DATA } from './data.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { updatePlayerCombatInfo, handlePlayerDefeat } from './combat.js';
import { tryDropItems } from './inventory.js';
import { trackStatistic } from './achievements.js';
import { getPlayerCombatStats } from './characterinfo.js';

// Helper function to apply perk bonuses
function applyPerkBonus(type, defaultValue = 1) {
    const perkEffects = getSummedPyramidPerkEffects();
    if (type === 'combatExp' && perkEffects.combat_xp_multiplier) {
        return defaultValue * perkEffects.combat_xp_multiplier;
    }
    // For dungeoneering exp, we don't have a specific perk yet
    return defaultValue;
}

// Dungeon state
let currentDungeon = null;
let currentWave = 0;
let waveMonsters = [];
let dungeonInProgress = false;
let dungeonAbilities = {};
let lastAbilityUse = {};
let combatInterval = null;
let waveTransitionInProgress = false;
let cooldownUpdateInterval = null;

// Dungeon abilities data
const DUNGEON_ABILITIES = {
    whirlwind: {
        id: 'whirlwind',
        name: 'Whirlwind',
        description: 'Deal 120% damage to all enemies',
        unlockLevel: 1,
        baseCooldown: 5000,
        baseMultiplier: 1.2,
        upgrades: [
            { level: 15, bonus: 'damage', value: 0.1, description: '+10% damage' },
            { level: 30, bonus: 'cooldown', value: -500, description: '-0.5s cooldown' },
            { level: 45, bonus: 'damage', value: 0.15, description: '+15% damage' },
            { level: 60, bonus: 'cooldown', value: -500, description: '-0.5s cooldown' },
            { level: 75, bonus: 'damage', value: 0.2, description: '+20% damage' }
        ]
    },
    healingAura: {
        id: 'healingAura',
        name: 'Healing Aura',
        description: 'Restore 15% of max health',
        unlockLevel: 10,
        baseCooldown: 8000,
        baseHealPercent: 0.15,
        upgrades: [
            { level: 20, bonus: 'heal', value: 0.05, description: '+5% healing' },
            { level: 35, bonus: 'cooldown', value: -1000, description: '-1s cooldown' },
            { level: 50, bonus: 'heal', value: 0.1, description: '+10% healing' },
            { level: 65, bonus: 'cooldown', value: -1000, description: '-1s cooldown' },
            { level: 80, bonus: 'heal', value: 0.15, description: '+15% healing' }
        ]
    },
    berserkerRage: {
        id: 'berserkerRage',
        name: 'Berserker Rage',
        description: '+50% damage and +20% crit chance for 10s',
        unlockLevel: 25,
        baseCooldown: 15000,
        baseDuration: 10000,
        baseDamageBonus: 0.5,
        baseCritBonus: 20,
        upgrades: [
            { level: 35, bonus: 'damage', value: 0.1, description: '+10% damage bonus' },
            { level: 45, bonus: 'duration', value: 2000, description: '+2s duration' },
            { level: 55, bonus: 'crit', value: 10, description: '+10% crit chance' },
            { level: 70, bonus: 'cooldown', value: -2000, description: '-2s cooldown' },
            { level: 85, bonus: 'damage', value: 0.2, description: '+20% damage bonus' }
        ]
    },
    shadowStrike: {
        id: 'shadowStrike',
        name: 'Shadow Strike',
        description: 'Deal 300% damage to single target with 50% crit chance',
        unlockLevel: 40,
        baseCooldown: 7000,
        baseMultiplier: 3.0,
        baseCritBonus: 50,
        upgrades: [
            { level: 50, bonus: 'damage', value: 0.5, description: '+50% damage' },
            { level: 60, bonus: 'crit', value: 20, description: '+20% crit chance' },
            { level: 70, bonus: 'cooldown', value: -1000, description: '-1s cooldown' },
            { level: 80, bonus: 'damage', value: 0.75, description: '+75% damage' },
            { level: 90, bonus: 'lifesteal', value: 0.25, description: '+25% lifesteal' }
        ]
    },
    divineShield: {
        id: 'divineShield',
        name: 'Divine Shield',
        description: 'Block next 3 attacks',
        unlockLevel: 55,
        baseCooldown: 12000,
        baseCharges: 3,
        upgrades: [
            { level: 65, bonus: 'charges', value: 1, description: '+1 charge' },
            { level: 75, bonus: 'cooldown', value: -2000, description: '-2s cooldown' },
            { level: 85, bonus: 'charges', value: 1, description: '+1 charge' },
            { level: 95, bonus: 'reflect', value: 0.5, description: 'Reflect 50% damage' },
            { level: 105, bonus: 'charges', value: 2, description: '+2 charges' }
        ]
    },
    apocalypse: {
        id: 'apocalypse',
        name: 'Apocalypse',
        description: 'Deal massive damage to all enemies based on missing health',
        unlockLevel: 75,
        baseCooldown: 20000,
        baseMultiplier: 2.0,
        upgrades: [
            { level: 85, bonus: 'damage', value: 0.5, description: '+50% base damage' },
            { level: 95, bonus: 'execute', value: 0.2, description: 'Execute below 20% HP' },
            { level: 105, bonus: 'cooldown', value: -3000, description: '-3s cooldown' },
            { level: 115, bonus: 'damage', value: 1.0, description: '+100% base damage' },
            { level: 120, bonus: 'reset', value: 0.25, description: '25% chance to reset cooldown' }
        ]
    }
};

// Dungeon data
const DUNGEONS = [
    {
        id: 'corrupted_catacombs',
        name: 'Corrupted Catacombs',
        description: 'Ancient burial grounds corrupted by dark magic',
        requiredLevel: 1,
        requiredDarkDragonKills: 100,
        waves: 9,
        monsterLevel: 90,
        bossLevel: 92,
        monsters: ['Super Chicken', 'Hobgoblin', 'Corrupted Skeleton'],
        boss: {
            name: 'Bone Lord',
            maxHealth: 4000,
            attack: 120,
            defense: 100,
            exp: 5000,
            dungeoneeringExp: 1000
        },
        rewards: {
            gold: { min: 5000, max: 10000 },
            chestChance: 0.3,
            rareDropChance: 0.1
        }
    },
    {
        id: 'shadow_sanctum',
        name: 'Shadow Sanctum',
        description: 'A place where shadows come alive',
        requiredLevel: 10,
        requiredDarkDragonKills: 100,
        waves: 9,
        monsterLevel: 91,
        bossLevel: 94,
        monsters: ['Shadow Imp', 'Dark Acolyte', 'Nightmare Spider'],
        boss: {
            name: 'Shadow Priest',
            maxHealth: 6500,
            attack: 140,
            defense: 120,
            exp: 7500,
            dungeoneeringExp: 1500
        },
        rewards: {
            gold: { min: 7500, max: 15000 },
            chestChance: 0.35,
            rareDropChance: 0.12
        }
    },
    {
        id: 'infernal_forge',
        name: 'Infernal Forge',
        description: 'Demonic forge where weapons of chaos are made',
        requiredLevel: 20,
        requiredDarkDragonKills: 100,
        waves: 9,
        monsterLevel: 92,
        bossLevel: 96,
        monsters: ['Fire Imp', 'Magma Golem', 'Flame Wraith'],
        boss: {
            name: 'Forge Master',
            maxHealth: 9000,
            attack: 160,
            defense: 140,
            exp: 10000,
            dungeoneeringExp: 2000
        },
        rewards: {
            gold: { min: 10000, max: 20000 },
            chestChance: 0.4,
            rareDropChance: 0.15
        }
    },
    {
        id: 'frozen_citadel',
        name: 'Frozen Citadel',
        description: 'Ice fortress ruled by ancient frost magic',
        requiredLevel: 30,
        requiredDarkDragonKills: 100,
        waves: 10,
        monsterLevel: 93,
        bossLevel: 98,
        monsters: ['Frost Elemental', 'Ice Wraith', 'Frozen Knight'],
        boss: {
            name: 'Ice Queen',
            maxHealth: 14000,
            attack: 180,
            defense: 160,
            exp: 15000,
            dungeoneeringExp: 2500
        },
        rewards: {
            gold: { min: 15000, max: 30000 },
            chestChance: 0.45,
            rareDropChance: 0.18
        }
    },
    {
        id: 'void_fortress',
        name: 'Void Fortress',
        description: 'A fortress between dimensions',
        requiredLevel: 40,
        requiredDarkDragonKills: 100,
        waves: 10,
        monsterLevel: 94,
        bossLevel: 100,
        monsters: ['Void Walker', 'Chaos Spawn', 'Dimensional Horror'],
        boss: {
            name: 'Void Lord',
            maxHealth: 19000,
            attack: 200,
            defense: 180,
            exp: 20000,
            dungeoneeringExp: 3000
        },
        rewards: {
            gold: { min: 20000, max: 40000 },
            chestChance: 0.5,
            rareDropChance: 0.2
        }
    },
    {
        id: 'blood_temple',
        name: 'Blood Temple',
        description: 'Ancient temple of blood sacrifices',
        requiredLevel: 50,
        requiredDarkDragonKills: 100,
        waves: 11,
        monsterLevel: 95,
        bossLevel: 102,
        monsters: ['Blood Cultist', 'Vampire Spawn', 'Crimson Demon'],
        boss: {
            name: 'Blood Patriarch',
            maxHealth: 24000,
            attack: 220,
            defense: 200,
            exp: 25000,
            dungeoneeringExp: 3500
        },
        rewards: {
            gold: { min: 25000, max: 50000 },
            chestChance: 0.55,
            rareDropChance: 0.22
        }
    },
    {
        id: 'plague_chambers',
        name: 'Plague Chambers',
        description: 'Diseased halls spreading corruption',
        requiredLevel: 60,
        requiredDarkDragonKills: 100,
        waves: 11,
        monsterLevel: 96,
        bossLevel: 104,
        monsters: ['Plague Bearer', 'Toxic Slime', 'Diseased Abomination'],
        boss: {
            name: 'Plague Doctor',
            maxHealth: 29000,
            attack: 240,
            defense: 220,
            exp: 30000,
            dungeoneeringExp: 4000
        },
        rewards: {
            gold: { min: 30000, max: 60000 },
            chestChance: 0.6,
            rareDropChance: 0.25
        }
    },
    {
        id: 'celestial_palace',
        name: 'Celestial Palace',
        description: 'Corrupted palace of fallen angels',
        requiredLevel: 70,
        requiredDarkDragonKills: 100,
        waves: 12,
        monsterLevel: 97,
        bossLevel: 106,
        monsters: ['Fallen Angel', 'Corrupted Seraph', 'Divine Aberration'],
        boss: {
            name: 'Fallen Archangel',
            maxHealth: 39000,
            attack: 260,
            defense: 240,
            exp: 40000,
            dungeoneeringExp: 4500
        },
        rewards: {
            gold: { min: 40000, max: 80000 },
            chestChance: 0.65,
            rareDropChance: 0.28
        }
    },
    {
        id: 'abyssal_depths',
        name: 'Abyssal Depths',
        description: 'The deepest, darkest dungeon',
        requiredLevel: 80,
        requiredDarkDragonKills: 100,
        waves: 12,
        monsterLevel: 98,
        bossLevel: 108,
        monsters: ['Abyssal Horror', 'Deep One', 'Eldritch Spawn'],
        boss: {
            name: 'Abyssal Leviathan',
            maxHealth: 49000,
            attack: 280,
            defense: 260,
            exp: 50000,
            dungeoneeringExp: 5000
        },
        rewards: {
            gold: { min: 50000, max: 100000 },
            chestChance: 0.7,
            rareDropChance: 0.3
        }
    },
    {
        id: 'chaos_realm',
        name: 'Chaos Realm',
        description: 'The ultimate test - pure chaos incarnate',
        requiredLevel: 90,
        requiredDarkDragonKills: 100,
        waves: 13,
        monsterLevel: 99,
        bossLevel: 110,
        monsters: ['Chaos Lord', 'Reality Shredder', 'Entropy Incarnate'],
        boss: {
            name: 'Primordial Chaos',
            maxHealth: 74000,
            attack: 300,
            defense: 280,
            exp: 75000,
            dungeoneeringExp: 6000
        },
        rewards: {
            gold: { min: 75000, max: 150000 },
            chestChance: 0.75,
            rareDropChance: 0.35
        }
    }
];

// Wave monster templates (balanced for level 90+ content, scaled to be reasonable compared to Dark Dragon)
const WAVE_MONSTERS = {
    'Super Chicken': { baseHealth: 2500, baseAttack: 85, baseDefense: 60, exp: 800, dungeoneeringExp: 150 },
    'Hobgoblin': { baseHealth: 2800, baseAttack: 95, baseDefense: 70, exp: 900, dungeoneeringExp: 180 },
    'Corrupted Skeleton': { baseHealth: 2650, baseAttack: 90, baseDefense: 65, exp: 850, dungeoneeringExp: 165 },
    'Shadow Imp': { baseHealth: 3200, baseAttack: 105, baseDefense: 80, exp: 1000, dungeoneeringExp: 200 },
    'Dark Acolyte': { baseHealth: 3500, baseAttack: 115, baseDefense: 90, exp: 1100, dungeoneeringExp: 220 },
    'Nightmare Spider': { baseHealth: 3800, baseAttack: 125, baseDefense: 100, exp: 1200, dungeoneeringExp: 240 },
    'Fire Imp': { baseHealth: 4200, baseAttack: 135, baseDefense: 110, exp: 1300, dungeoneeringExp: 260 },
    'Magma Golem': { baseHealth: 4800, baseAttack: 145, baseDefense: 125, exp: 1500, dungeoneeringExp: 300 },
    'Flame Wraith': { baseHealth: 4500, baseAttack: 155, baseDefense: 120, exp: 1400, dungeoneeringExp: 280 },
    'Frost Elemental': { baseHealth: 5200, baseAttack: 165, baseDefense: 140, exp: 1700, dungeoneeringExp: 340 },
    'Ice Wraith': { baseHealth: 4900, baseAttack: 175, baseDefense: 135, exp: 1600, dungeoneeringExp: 320 },
    'Frozen Knight': { baseHealth: 5800, baseAttack: 185, baseDefense: 155, exp: 1900, dungeoneeringExp: 380 },
    'Void Walker': { baseHealth: 6200, baseAttack: 195, baseDefense: 165, exp: 2000, dungeoneeringExp: 400 },
    'Chaos Spawn': { baseHealth: 6600, baseAttack: 205, baseDefense: 175, exp: 2200, dungeoneeringExp: 440 },
    'Dimensional Horror': { baseHealth: 7000, baseAttack: 215, baseDefense: 185, exp: 2400, dungeoneeringExp: 480 },
    'Blood Cultist': { baseHealth: 7500, baseAttack: 225, baseDefense: 195, exp: 2600, dungeoneeringExp: 520 },
    'Vampire Spawn': { baseHealth: 8000, baseAttack: 235, baseDefense: 205, exp: 2800, dungeoneeringExp: 560 },
    'Crimson Demon': { baseHealth: 8500, baseAttack: 245, baseDefense: 215, exp: 3000, dungeoneeringExp: 600 },
    'Plague Bearer': { baseHealth: 9000, baseAttack: 255, baseDefense: 225, exp: 3200, dungeoneeringExp: 640 },
    'Toxic Slime': { baseHealth: 9500, baseAttack: 265, baseDefense: 235, exp: 3400, dungeoneeringExp: 680 },
    'Diseased Abomination': { baseHealth: 10000, baseAttack: 275, baseDefense: 245, exp: 3600, dungeoneeringExp: 720 },
    'Fallen Angel': { baseHealth: 11000, baseAttack: 295, baseDefense: 265, exp: 4000, dungeoneeringExp: 800 },
    'Corrupted Seraph': { baseHealth: 12000, baseAttack: 315, baseDefense: 285, exp: 4500, dungeoneeringExp: 900 },
    'Divine Aberration': { baseHealth: 13000, baseAttack: 335, baseDefense: 305, exp: 5000, dungeoneeringExp: 1000 },
    'Abyssal Horror': { baseHealth: 14500, baseAttack: 355, baseDefense: 325, exp: 5500, dungeoneeringExp: 1100 },
    'Deep One': { baseHealth: 16000, baseAttack: 375, baseDefense: 345, exp: 6000, dungeoneeringExp: 1200 },
    'Eldritch Spawn': { baseHealth: 17500, baseAttack: 395, baseDefense: 365, exp: 6500, dungeoneeringExp: 1300 },
    'Chaos Lord': { baseHealth: 20000, baseAttack: 425, baseDefense: 395, exp: 7500, dungeoneeringExp: 1500 },
    'Reality Shredder': { baseHealth: 23000, baseAttack: 455, baseDefense: 425, exp: 8500, dungeoneeringExp: 1700 },
    'Entropy Incarnate': { baseHealth: 26000, baseAttack: 485, baseDefense: 455, exp: 10000, dungeoneeringExp: 2000 }
};

// Initialize dungeoneering
export function initDungeoneering() {
    if (!playerData.dungeoneering) {
        playerData.dungeoneering = {
            unlocked: false,
            level: 1,
            exp: 0,
            dungeonsCompleted: {},
            totalDungeonsCompleted: 0,
            abilities: {},
            abilityUpgrades: {}
        };
    }
    
    // Initialize abilities
    Object.values(DUNGEON_ABILITIES).forEach(ability => {
        if (!playerData.dungeoneering.abilities[ability.id]) {
            playerData.dungeoneering.abilities[ability.id] = {
                unlocked: false,
                currentUpgrade: 0
            };
        }
        lastAbilityUse[ability.id] = 0;
    });
}

// Check if dungeoneering should be unlocked
export function checkDungeoneeringUnlock() {
    if (!playerData.dungeoneering.unlocked && playerData.combat.enemiesKilled['Dark Dragon'] >= 100) {
        playerData.dungeoneering.unlocked = true;
        logMessage('Dungeoneering unlocked! A mysterious entrance appears near the Dark Dragon lair...', 'fore-yellow', '🏰');
        
        // Initialize skills object entry for dungeoneering
        if (!playerData.skills.dungeoneering) {
            playerData.skills.dungeoneering = { level: 1, xp: 0 };
        }
        syncDungeoneeringSkill();
        
        // Unlock first ability
        playerData.dungeoneering.abilities.whirlwind.unlocked = true;
        
        // Update button visibility
        updateDungeoneeringButtonVisibility();
        
        savePlayerData();
        return true;
    }
    return false;
}

// Show dungeoneering menu
export function showDungeoneeringMenu() {
    showSection('dungeoneering-menu');
    updateDungeoneeringDisplay();
}

// Show specific dungeon
export function showDungeon(dungeonId) {
    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    if (!dungeon) return;
    
    if (playerData.dungeoneering.level < dungeon.requiredLevel) {
        logMessage(`Dungeoneering level ${dungeon.requiredLevel} required!`, 'fore-red', '❌');
        return;
    }
    
    currentDungeon = dungeon;
    showSection('dungeon-active');
    updateDungeonDisplay();
    
    // Auto-start the dungeon after 2 seconds
    logMessage(`Preparing to enter ${dungeon.name}...`, 'fore-yellow', '⏳');
    
    // Show countdown
    let countdown = 2;
    const countdownInterval = setInterval(() => {
        if (!currentDungeon || currentDungeon !== dungeon || dungeonInProgress) {
            clearInterval(countdownInterval);
            return;
        }
        
        if (countdown > 0) {
            logMessage(`Starting in ${countdown}...`, 'fore-yellow', '⏱️');
            countdown--;
        } else {
            clearInterval(countdownInterval);
            startDungeon();
        }
    }, 1000);
}

// Start dungeon
export function startDungeon() {
    if (dungeonInProgress) return;
    
    // Start button has been removed from UI
    
    // Add 1 second delay before starting
    setTimeout(() => {
        dungeonInProgress = true;
        waveTransitionInProgress = false;
        currentWave = 1;
        
        // Ensure player has full HP when entering dungeon
        const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
        playerData.hp = maxHp;
        
        // Clear any active buffs
        dungeonAbilities.berserkerActive = false;
        dungeonAbilities.berserkerEnd = 0;
        dungeonAbilities.shieldCharges = 0;
        
        generateWaveMonsters();
        startDungeonCombat();
        startCooldownUpdates();
        updateDungeonDisplay();
    }, 1000);
}

// Generate monsters for current wave
function generateWaveMonsters() {
    waveMonsters = [];
    
    // Clear previous monster attack timers to prevent timer accumulation
    if (window.monsterAttackTimers) {
        window.monsterAttackTimers = {};
    }
    
    const monsterCount = Math.floor(Math.random() * 7) + 4; // 4-10 monsters
    const isBossWave = currentWave > currentDungeon.waves;
    
    if (isBossWave) {
        // Boss wave
        const boss = currentDungeon.boss;
        waveMonsters.push({
            id: 'boss',
            name: boss.name,
            level: currentDungeon.bossLevel,
            maxHealth: boss.maxHealth,
            currentHealth: boss.maxHealth,
            attack: boss.attack,
            defense: boss.defense,
            exp: boss.exp,
            dungeoneeringExp: boss.dungeoneeringExp,
            isBoss: true
        });
    } else {
        // Regular wave
        for (let i = 0; i < monsterCount; i++) {
            const monsterType = currentDungeon.monsters[Math.floor(Math.random() * currentDungeon.monsters.length)];
            const template = WAVE_MONSTERS[monsterType];
            const levelMultiplier = currentDungeon.monsterLevel / 90;
            
            waveMonsters.push({
                id: `monster_${i}`,
                name: monsterType,
                level: currentDungeon.monsterLevel,
                maxHealth: Math.floor(template.baseHealth * levelMultiplier),
                currentHealth: Math.floor(template.baseHealth * levelMultiplier),
                attack: Math.floor(template.baseAttack * levelMultiplier),
                defense: Math.floor(template.baseDefense * levelMultiplier),
                exp: Math.floor(template.exp * levelMultiplier),
                dungeoneeringExp: Math.floor(template.dungeoneeringExp * levelMultiplier),
                isBoss: false
            });
        }
    }
}

// Start dungeon combat with exact same timing as regular combat
function startDungeonCombat() {
    if (combatInterval) clearInterval(combatInterval);
    
    // Get the exact same attack speed calculation as regular combat
    let weaponStats = TOOL_DATA.axe.fists; // Default
    
    if (playerData.equipment.weapon !== "none" && SWORD_DATA[playerData.equipment.weapon]) {
        weaponStats = SWORD_DATA[playerData.equipment.weapon];
    } else {
        const axeKey = playerData.equipment.axe;
        const pickKey = playerData.equipment.pickaxe;
        if (axeKey !== "none" && TOOL_DATA.axe[axeKey]) {
            weaponStats = TOOL_DATA.axe[axeKey];
        } else if (pickKey !== "none" && TOOL_DATA.pickaxe[pickKey]) {
            weaponStats = TOOL_DATA.pickaxe[pickKey];
        }
    }
    
    // Calculate attack interval exactly like regular combat
    const combatEffects = getSummedPyramidPerkEffects();
    const enchantmentAttackSpeed = getEnchantmentBonus('attack_speed');
    const baseInterval = weaponStats.attack_speed != null
        ? Math.floor(weaponStats.attack_speed * 1000)
        : 3000; // 3 seconds default
    let interval = baseInterval * (1 - (combatEffects.attack_speed || 0) - enchantmentAttackSpeed);
    interval = Math.max(200, interval); // Minimum 200ms
    
    combatInterval = setInterval(() => {
        if (!dungeonInProgress || waveMonsters.length === 0) {
            clearInterval(combatInterval);
            return;
        }
        
        dungeonCombatRound();
    }, interval);
}

// Dungeon combat round
function dungeonCombatRound() {
    // Check if dungeon is still in progress
    if (!dungeonInProgress) return;
    
    // Apply active buffs
    let damageMultiplier = 1;
    let critBonus = 0;
    
    if (dungeonAbilities.berserkerActive && Date.now() < dungeonAbilities.berserkerEnd) {
        const ability = DUNGEON_ABILITIES.berserkerRage;
        const upgrades = getAbilityUpgrades(ability);
        damageMultiplier *= 1 + ability.baseDamageBonus + upgrades.damage;
        critBonus += ability.baseCritBonus + upgrades.crit;
    } else if (dungeonAbilities.berserkerActive) {
        dungeonAbilities.berserkerActive = false;
    }
    
    // Player attacks with detailed combat like regular combat
    const aliveMonsters = waveMonsters.filter(m => m.currentHealth > 0);
    if (aliveMonsters.length === 0) return;
    
    // Select target (first alive monster for now)
    const targetMonster = aliveMonsters[0];
    const targetIndex = waveMonsters.indexOf(targetMonster);
    
    // Use the EXACT same combat calculation as regular combat
    const combatStats = getPlayerCombatStats();
    
    // Get weapon name for logging
    let weaponName = "Fists";
    let actualWeaponStats = TOOL_DATA.axe.fists;
    
    if (playerData.equipment.weapon !== "none" && SWORD_DATA[playerData.equipment.weapon]) {
        weaponName = playerData.equipment.weapon;
        actualWeaponStats = SWORD_DATA[weaponName];
    } else {
        const axeKey = playerData.equipment.axe;
        const pickKey = playerData.equipment.pickaxe;
        if (axeKey !== "none" && TOOL_DATA.axe[axeKey]) {
            weaponName = axeKey + " axe";
            actualWeaponStats = TOOL_DATA.axe[axeKey];
        } else if (pickKey !== "none" && TOOL_DATA.pickaxe[pickKey]) {
            weaponName = pickKey + " pickaxe";
            actualWeaponStats = TOOL_DATA.pickaxe[pickKey];
        }
    }
    
    // Calculate hit chance (same as regular combat)
    const playerLevel = getLevelFromXp(playerData.skills.attack.xp);
    const levelDiff = playerLevel - targetMonster.level;
    let hitChance = Math.min(0.95, Math.max(0.6, 0.8 + (levelDiff * 0.01)));
    
    const combatEffects = getSummedPyramidPerkEffects();
    const accBoost = (combatEffects.global_accuracy_boost_percentage || 0) + (combatEffects.global_accuracy_boost_percentage_attack || 0);
    hitChance = Math.min(1, hitChance + accBoost);
    
    // Parse the damage range from getPlayerCombatStats
    const damageRange = combatStats.damage.value.split(' - ');
    let minDmg = parseInt(damageRange[0]) || 1;
    let maxDmg = parseInt(damageRange[1]) || 3;
    
    // Validate damage values
    if (isNaN(minDmg) || minDmg < 1) {
        console.error('Invalid minDmg from combatStats:', minDmg, 'Using default: 1');
        minDmg = 1;
    }
    if (isNaN(maxDmg) || maxDmg < minDmg) {
        console.error('Invalid maxDmg from combatStats:', maxDmg, 'Using default:', Math.max(minDmg, 3));
        maxDmg = Math.max(minDmg, 3);
    }
    
    // Apply enchanted stats from all equipment slots (same logic as regular combat)
    const enchantableSlots = ['weapon', 'armor', 'helmet', 'axe', 'pickaxe'];
    enchantableSlots.forEach(slotKey => {
        const enchantments = playerData.enchantedStats[slotKey];
        if (enchantments && enchantments.length > 0) {
            enchantments.forEach(enchantment => {
                switch (enchantment.stat) {
                    case 'damage_flat':
                        minDmg += enchantment.value;
                        maxDmg += enchantment.value;
                        break;
                    case 'damage_percent':
                        const damageMultiplier = 1 + (enchantment.value / 100);
                        minDmg = Math.floor(minDmg * damageMultiplier);
                        maxDmg = Math.floor(maxDmg * damageMultiplier);
                        break;
                    case 'str_percent':
                        const strMultiplier = 1 + (enchantment.value / 100);
                        minDmg = Math.floor(minDmg * strMultiplier);
                        maxDmg = Math.floor(maxDmg * strMultiplier);
                        break;
                }
            });
        }
    });
    
    // Apply berserker rage bonus
    if (dungeonAbilities.berserkerActive && Date.now() < dungeonAbilities.berserkerEnd) {
        const ability = DUNGEON_ABILITIES.berserkerRage;
        const upgrades = getAbilityUpgrades(ability);
        const damageBonus = 1 + ability.baseDamageBonus + (upgrades.damage || 0);
        minDmg = Math.ceil(minDmg * damageBonus);
        maxDmg = Math.ceil(maxDmg * damageBonus);
        critBonus += ability.baseCritBonus + (upgrades.crit || 0);
    } else if (dungeonAbilities.berserkerActive) {
        dungeonAbilities.berserkerActive = false;
    }
    
    // Targeting message
    logMessage(`🎯 Targeting ${targetMonster.name} #${targetIndex + 1}...`, 'fore-cyan', '🎯');
    
    let bossDefeated = false;
    
    // Roll for hit
    if (Math.random() < hitChance) {
        // Calculate base damage with validation
        const playerDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
        
        // Validate base damage
        if (isNaN(playerDmg) || playerDmg < 1) {
            console.error('Invalid playerDmg:', playerDmg, 'minDmg:', minDmg, 'maxDmg:', maxDmg);
            return; // Skip this attack if damage is invalid
        }
        
        // Determine crit chance from weapon, pyramid perks, and enchantments (same as regular combat)
        let critChance = actualWeaponStats.crit_chance || 0; // Base weapon crit chance
        critChance += (combatEffects.crit || 0) + (combatEffects.crit_attack || 0); // Pyramid perks
        
        // Apply enchantment crit chance bonuses
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    if (enchantment.stat === 'crit_chance') {
                        critChance += enchantment.value;
                    } else if (enchantment.stat === 'luk_percent') {
                        critChance += enchantment.value * 0.5;
                    }
                });
            }
        });
        
        critChance += critBonus; // Add berserker rage bonus
        
        // Determine crit with validation
        const isCrit = critChance > 0 && Math.random() < critChance;
        const baseCritMult = 1.5;
        const extraCritMult = combatEffects.crit_multiplier || 0;
        const critMult = isCrit ? (baseCritMult + extraCritMult) : 1;
        
        // Validate crit multiplier
        if (isNaN(critMult) || critMult < 1) {
            console.error('Invalid critMult:', critMult, 'baseCritMult:', baseCritMult, 'extraCritMult:', extraCritMult);
            critMult = 1;
        }
        
        let finalDmg = Math.floor(playerDmg * critMult);
        
        // Validate final damage
        if (isNaN(finalDmg) || finalDmg < 1) {
            console.error('Invalid finalDmg:', finalDmg, 'playerDmg:', playerDmg, 'critMult:', critMult);
            finalDmg = 1; // Minimum 1 damage
        }
        
        if (isCrit) logMessage("💥 CRITICAL HIT!", "fore-lightred_ex", "💥");
        
        // Deal damage
        targetMonster.currentHealth = Math.max(0, targetMonster.currentHealth - finalDmg);
        
        // Track damage dealt
        trackStatistic('combat', 'damageDealt', finalDmg);
        if (isCrit) trackStatistic('combat', 'crit', 1);
        
        // Log hit with weapon name
        const hitEmoji = isCrit ? "⚔️💥" : "⚔️";
        logMessage(`You hit ${targetMonster.name} (#${targetIndex + 1}) with ${titleCase(weaponName)} for ${formatNumber(finalDmg)} damage!`, "fore-yellow", hitEmoji);
        
        // Play attack sound
        if (sounds) {
            const attackSound = isCrit ? sounds.attackHard : sounds.attackLight;
            if (attackSound) playSound(attackSound);
        }
        
        // Show floating combat text on monster health bar
        const monsterElement = document.getElementById(`monster-${targetMonster.id}`);
        if (monsterElement) {
            const healthBar = monsterElement.querySelector('.health-bar');
            if (healthBar) {
                const textType = isCrit ? 'damage-crit' : 'damage';
                showFloatingCombatText(`-${formatNumber(finalDmg)}`, textType, healthBar, 1.2, 0, -10, 'fade-up');
            }
        }
        
        // AOE damage from weapon/perks
        const weaponAoE = actualWeaponStats.aoe_chance || 0;
        const perkAoE = (combatEffects.aoe_chance_attack || 0) + (combatEffects.aoe_chance || 0);
        const aoeChance = weaponAoE + perkAoE;
        
        if (aoeChance > 0 && Math.random() < aoeChance && aliveMonsters.length > 1) {
            logMessage("💥 AOE attack triggered!", "fore-magenta", "💥");
            
            // AOE sound effect
            if (sounds && sounds.attackLight) {
                playSound(sounds.attackLight);
                setTimeout(() => playSound(sounds.attackLight), 100);
                setTimeout(() => playSound(sounds.attackLight), 200);
            }
            
            let maxTargets = actualWeaponStats.aoe_targets || 2;
            let aoePct = actualWeaponStats.aoe_damage_percentage || 0.3;
            if (perkAoE > 0) aoePct += (combatEffects.aoe_damage_attack || 0) + (combatEffects.aoe_damage || 0);
            
            let aoeTargetsHit = 0;
            aliveMonsters.forEach((monster, idx) => {
                if (monster.id !== targetMonster.id && aoeTargetsHit < maxTargets) {
                    let aoeDmg = Math.floor(finalDmg * aoePct);
                    
                    // Validate AOE damage
                    if (isNaN(aoeDmg) || aoeDmg < 1) {
                        console.error('Invalid aoeDmg:', aoeDmg, 'finalDmg:', finalDmg, 'aoePct:', aoePct);
                        aoeDmg = Math.max(1, Math.floor(finalDmg * 0.3)); // Fallback to 30% damage
                    }
                    
                    monster.currentHealth = Math.max(0, monster.currentHealth - aoeDmg);
                    logMessage(`💥 AOE hit ${monster.name} (#${waveMonsters.indexOf(monster) + 1}) for ${formatNumber(aoeDmg)} damage!`, "fore-magenta", "💥");
                    
                    const aoeElement = document.getElementById(`monster-${monster.id}`);
                    if (aoeElement && aoeDmg > 0) {
                        const aoeHealthBar = aoeElement.querySelector('.health-bar');
                        if (aoeHealthBar) {
                            showFloatingCombatText(`-${formatNumber(aoeDmg)}`, 'damage', aoeHealthBar, 1.0, 0, -10, 'fade-up');
                        }
                    }
                    
                    if (monster.currentHealth === 0) {
                        handleMonsterDefeat(monster);
                    }
                    aoeTargetsHit++;
                }
            });
        }
        
        // Apply weapon lifesteal with validation
        const totalWeaponLifestealChance = (actualWeaponStats.lifesteal_chance || 0) + (combatEffects.lifesteal || 0);
        if (totalWeaponLifestealChance > 0 && Math.random() < totalWeaponLifestealChance) {
            let lifestealAmount = Math.floor(finalDmg * totalWeaponLifestealChance);
            
            // Validate lifesteal amount
            if (isNaN(lifestealAmount) || lifestealAmount < 0) {
                console.error('Invalid lifestealAmount:', lifestealAmount);
                lifestealAmount = 0;
            }
            
            if (lifestealAmount > 0) {
                const oldHp = Math.round(playerData.hp);
                const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
                playerData.hp = Math.round(Math.min(maxHp, playerData.hp + lifestealAmount));
                const actualHeal = playerData.hp - oldHp;
                if (actualHeal > 0) {
                    logMessage(`💚 Lifesteal! +${actualHeal} HP`, "fore-green", "💚");
                }
            }
        }
        
        // Apply enchantment lifesteal
        let totalLifestealChance = 0;
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    if (enchantment.stat === 'life_steal') {
                        totalLifestealChance += enchantment.value;
                    }
                });
            }
        });
        
        if (totalLifestealChance > 0 && Math.random() < totalLifestealChance) {
            let healAmount = Math.floor(finalDmg * totalLifestealChance);
            
            // Validate enchantment lifesteal
            if (isNaN(healAmount) || healAmount < 0) {
                console.error('Invalid enchantment healAmount:', healAmount, 'finalDmg:', finalDmg, 'totalLifestealChance:', totalLifestealChance);
                healAmount = 0;
            }
            
            if (healAmount > 0) {
                const oldHp = Math.round(playerData.hp);
                const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
                playerData.hp = Math.round(Math.min(maxHp, playerData.hp + healAmount));
                const actualHeal = playerData.hp - oldHp;
                if (actualHeal > 0) {
                    logMessage(`💜 Enchantment Lifesteal! +${actualHeal} HP`, "fore-magenta", "💜");
                }
            }
        }
        
        // Check if target defeated
        if (targetMonster.currentHealth === 0) {
            bossDefeated = handleMonsterDefeat(targetMonster);
        }
        
    } else {
        // Player missed
        logMessage(`⚔️❌ You missed ${targetMonster.name} (#${targetIndex + 1})!`, "fore-yellow", "⚔️❌");
    }
    
    // If boss was defeated, complete dungeon and return early
    if (bossDefeated) {
        dungeonComplete();
        return;
    }
    
    // Monsters attack player - but only some attack each round for balance
    const remainingMonsters = waveMonsters.filter(m => m.currentHealth > 0);
    
    // Initialize monster attack timers if not already done
    if (!window.monsterAttackTimers) {
        window.monsterAttackTimers = {};
    }
    
    // Each monster has its own attack timer
    remainingMonsters.forEach((monster, index) => {
        const monsterId = monster.id;
        
        // Initialize timer for new monsters
        if (!window.monsterAttackTimers[monsterId]) {
            window.monsterAttackTimers[monsterId] = {
                lastAttack: Date.now() - (index * 500), // Stagger initial attacks
                attackSpeed: 2000 + (index * 200) // Base 2s + stagger
            };
        }
        
        const timer = window.monsterAttackTimers[monsterId];
        const now = Date.now();
        
        // Check if this monster should attack
        if (now - timer.lastAttack >= timer.attackSpeed) {
            timer.lastAttack = now;
            
            if (dungeonAbilities.shieldCharges > 0) {
                dungeonAbilities.shieldCharges--;
                logMessage(`Divine Shield blocks ${monster.name}'s attack! (${dungeonAbilities.shieldCharges} charges left)`, 'fore-cyan', '🛡️');
                
                // Check for reflect upgrade
                const divineShield = DUNGEON_ABILITIES.divineShield;
                const upgrades = getAbilityUpgrades(divineShield);
                if (upgrades.reflect > 0) {
                    const reflectDamage = calculateDamage(monster.attack * upgrades.reflect, monster.defense, 0);
                    monster.currentHealth = Math.max(0, monster.currentHealth - reflectDamage);
                    logMessage(`Shield reflects ${formatNumber(reflectDamage)} damage to ${monster.name}!`, 'fore-cyan', '✨');
                }
            } else {
                // Get player combat stats for block and defense
                const combatStats = getPlayerCombatStats();
                let playerDefensePercent = 0;
                let blockChance = 0;
                let blockAmount = 0;
                
                // Parse defense percentage
                if (combatStats && combatStats.defense && typeof combatStats.defense.value === 'string' && combatStats.defense.value.endsWith('%')) {
                    playerDefensePercent = parseFloat(combatStats.defense.value) / 100;
                }
                
                // Parse block chance and amount
                if (combatStats && combatStats.blockChance && combatStats.blockChance.value) {
                    blockChance = parseFloat(combatStats.blockChance.value) / 100;
                }
                if (combatStats && combatStats.blockAmount && combatStats.blockAmount.value) {
                    blockAmount = parseFloat(combatStats.blockAmount.value) / 100;
                }
                
                // Start with base monster damage
                let damage = monster.attack;
                
                // Apply block system first: chance → amount
                if (blockChance > 0 && Math.random() < blockChance) {
                    // Block succeeded - apply block amount mitigation
                    const blockedDamage = Math.floor(damage * blockAmount);
                    damage = damage - blockedDamage;
                    logMessage(`🛡️ Blocked! Reduced ${blockedDamage} damage (${Math.floor(blockAmount * 100)}% mitigation)`, "fore-blue", "🛡️");
                }
                
                // Then apply defense to remaining damage
                damage = Math.max(1, Math.floor(damage * (1 - playerDefensePercent)));
                
                // Apply damage to correct HP variable
                playerData.hp = Math.round(Math.max(0, playerData.hp - damage));
                
                if (damage > 0) {
                    // Show player damage floating text
                    const playerHealthElement = document.getElementById('player-health-dungeon');
                    if (playerHealthElement) {
                        showFloatingCombatText(`-${formatNumber(damage)}`, 'player-damage', playerHealthElement, 1.0, 0, -15, 'fade-up');
                    }
                    
                    logMessage(`💥 ${monster.name} (#${waveMonsters.indexOf(monster) + 1}) hit you for ${formatNumber(damage)} damage!`, 'fore-red', '💥');
                    
                    // Get max HP for screen shake calculation
                    const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
                    
                    // Screen shake effect for big hits
                    if (damage > maxHp * 0.15) {
                        document.body.classList.add('screen-shake');
                        setTimeout(() => document.body.classList.remove('screen-shake'), 300);
                    }
                    
                    // Track damage taken
                    trackStatistic('combat', 'damageTaken', damage);
                }
                
                if (playerData.hp <= 0) {
                    dungeonFailed();
                    return;
                }
            }
        }
    });
    
    // Clean up timers for dead monsters
    Object.keys(window.monsterAttackTimers).forEach(monsterId => {
        if (!remainingMonsters.find(m => m.id === monsterId)) {
            delete window.monsterAttackTimers[monsterId];
        }
    });
    
    // Delay wave completion check to allow visual death state to render
    setTimeout(() => {
        const remainingMonstersDelayed = waveMonsters.filter(m => m.currentHealth > 0);
        
        // Check if wave is complete (only if dungeon still in progress)
        if (dungeonInProgress && remainingMonstersDelayed.length === 0 && !waveTransitionInProgress) {
            // Add delay before next wave
            waveTransitionInProgress = true;
            clearInterval(combatInterval); // Stop combat during transition
            
            logMessage('✨ Wave cleared! Preparing next wave...', 'fore-green', '✨');
            
            setTimeout(() => {
                if (dungeonInProgress) {
                    waveComplete();
                    waveTransitionInProgress = false;
                }
            }, 2500); // 2.5 second additional delay for next wave
        }
    }, 500); // 500ms delay to let visual death state show
    
    updateDungeonDisplay();
    updatePlayerCombatInfo();
}

// Handle monster defeat with loot and effects
function handleMonsterDefeat(monster) {
    const monsterElement = document.getElementById(`monster-${monster.id}`);
    if (monsterElement) {
        if (monster.isBoss) {
            showFloatingCombatText('BOSS DEFEATED!', 'boss-defeat', monsterElement, 2.0, 0, -50, 'fade-up');
        } else {
            showFloatingCombatText('DEFEATED!', 'defeat', monsterElement, 1.5, 0, -30, 'fade-up');
        }
        // Death animation is now handled by the .defeated class in CSS
    }
    
    logMessage(`🏆 Defeated ${monster.name}! +${formatNumber(monster.exp)} XP`, 'fore-green', '🏆');
    
    // Play monster death sound
    if (sounds && sounds.bearDeath) {
        playSound(sounds.bearDeath);
    }
    
    // Award experience
    playerData.combat.exp += Math.floor(monster.exp * applyPerkBonus('combatExp'));
    playerData.dungeoneering.exp += Math.floor(monster.dungeoneeringExp * applyPerkBonus('dungeoneeringExp', 1));
    
    // Sync with skills object for HUD consistency
    syncDungeoneeringSkill();
    
    checkDungeoneeringLevelUp();
    
    // Individual monster loot drops based on monster tier
    const baseDungeonGold = currentDungeon.monsterLevel * 10; // Base gold scales with dungeon level
    const goldVariation = Math.floor(baseDungeonGold * 0.5); // ±50% variation
    const goldDrop = Math.floor(Math.random() * (goldVariation * 2)) + (baseDungeonGold - goldVariation);
    playerData.gold += goldDrop;
    logMessage(`💰 Found ${formatNumber(goldDrop)} gold!`, 'fore-yellow', '💰');
    
    // Dungeon monster specific drops based on type
    const dropTables = {
        'Super Chicken': [
            { item: 'health potion (s)', chance: 0.4, quantity: [1, 2] },
            { item: 'raw meat', chance: 0.6, quantity: [2, 4] }
        ],
        'Hobgoblin': [
            { item: 'health potion (s)', chance: 0.3, quantity: [1, 2] },
            { item: 'bronze bar', chance: 0.2, quantity: [1, 2] }
        ],
        'Corrupted Skeleton': [
            { item: 'health potion (s)', chance: 0.35, quantity: [1, 2] },
            { item: 'bone', chance: 0.8, quantity: [1, 3] }
        ],
        'Shadow Imp': [
            { item: 'health potion (s)', chance: 0.4, quantity: [1, 3] },
            { item: 'sapphire', chance: 0.1, quantity: [1, 1] }
        ],
        'Dark Acolyte': [
            { item: 'health potion (s)', chance: 0.5, quantity: [2, 3] },
            { item: 'ancient_tomes', chance: 0.15, quantity: [1, 3] }
        ],
        'Nightmare Spider': [
            { item: 'health potion (s)', chance: 0.4, quantity: [1, 2] },
            { item: 'spider silk', chance: 0.7, quantity: [1, 2] }
        ],
        'Fire Imp': [
            { item: 'health potion (s)', chance: 0.45, quantity: [2, 3] },
            { item: 'ruby', chance: 0.12, quantity: [1, 1] }
        ],
        'Magma Golem': [
            { item: 'health potion (s)', chance: 0.5, quantity: [2, 4] },
            { item: 'iron bar', chance: 0.3, quantity: [1, 2] }
        ],
        'Flame Wraith': [
            { item: 'health potion (s)', chance: 0.4, quantity: [1, 3] },
            { item: 'ancient_tomes', chance: 0.2, quantity: [2, 4] }
        ],
        'Frost Elemental': [
            { item: 'health potion (s)', chance: 0.6, quantity: [2, 4] },
            { item: 'diamond', chance: 0.08, quantity: [1, 1] }
        ],
        'Ice Wraith': [
            { item: 'health potion (s)', chance: 0.5, quantity: [2, 3] },
            { item: 'ancient_tomes', chance: 0.25, quantity: [2, 5] }
        ],
        'Frozen Knight': [
            { item: 'health potion (s)', chance: 0.7, quantity: [3, 5] },
            { item: 'mithril bar', chance: 0.2, quantity: [1, 1] }
        ],
        'Void Walker': [
            { item: 'health potion (s)', chance: 0.6, quantity: [2, 4] },
            { item: 'ancient_tomes', chance: 0.3, quantity: [3, 6] }
        ],
        'Chaos Spawn': [
            { item: 'health potion (s)', chance: 0.7, quantity: [3, 5] },
            { item: 'emerald', chance: 0.15, quantity: [1, 2] }
        ],
        'Dimensional Horror': [
            { item: 'health potion (s)', chance: 0.8, quantity: [3, 6] },
            { item: 'ancient_tomes', chance: 0.35, quantity: [4, 8] }
        ],
        'Blood Cultist': [
            { item: 'health potion (s)', chance: 0.9, quantity: [4, 6] },
            { item: 'ancient_tomes', chance: 0.4, quantity: [5, 10] }
        ],
        'Vampire Spawn': [
            { item: 'health potion (s)', chance: 0.8, quantity: [3, 5] },
            { item: 'ruby', chance: 0.25, quantity: [1, 2] }
        ],
        'Crimson Demon': [
            { item: 'health potion (s)', chance: 0.9, quantity: [4, 7] },
            { item: 'ancient_tomes', chance: 0.45, quantity: [6, 12] }
        ],
        'Plague Bearer': [
            { item: 'health potion (s)', chance: 0.8, quantity: [3, 6] },
            { item: 'ancient_tomes', chance: 0.5, quantity: [7, 14] }
        ],
        'Toxic Slime': [
            { item: 'health potion (s)', chance: 0.7, quantity: [2, 4] },
            { item: 'emerald', chance: 0.3, quantity: [1, 3] }
        ],
        'Diseased Abomination': [
            { item: 'health potion (s)', chance: 0.9, quantity: [4, 8] },
            { item: 'ancient_tomes', chance: 0.55, quantity: [8, 16] }
        ],
        'Fallen Angel': [
            { item: 'health potion (s)', chance: 1.0, quantity: [5, 8] },
            { item: 'ancient_tomes', chance: 0.6, quantity: [10, 20] },
            { item: 'diamond', chance: 0.2, quantity: [1, 2] }
        ],
        'Corrupted Seraph': [
            { item: 'health potion (s)', chance: 1.0, quantity: [6, 10] },
            { item: 'ancient_tomes', chance: 0.7, quantity: [12, 25] },
            { item: 'dragon gem', chance: 0.05, quantity: [1, 1] }
        ],
        'Divine Aberration': [
            { item: 'health potion (s)', chance: 1.0, quantity: [7, 12] },
            { item: 'ancient_tomes', chance: 0.8, quantity: [15, 30] },
            { item: 'diamond', chance: 0.3, quantity: [1, 3] }
        ],
        'Abyssal Horror': [
            { item: 'health potion (s)', chance: 1.0, quantity: [8, 15] },
            { item: 'ancient_tomes', chance: 0.9, quantity: [20, 40] },
            { item: 'dragon gem', chance: 0.08, quantity: [1, 1] }
        ],
        'Deep One': [
            { item: 'health potion (s)', chance: 1.0, quantity: [10, 18] },
            { item: 'ancient_tomes', chance: 1.0, quantity: [25, 50] },
            { item: 'emerald', chance: 0.5, quantity: [2, 4] }
        ],
        'Eldritch Spawn': [
            { item: 'health potion (s)', chance: 1.0, quantity: [12, 20] },
            { item: 'ancient_tomes', chance: 1.0, quantity: [30, 60] },
            { item: 'dragon gem', chance: 0.12, quantity: [1, 2] }
        ],
        'Chaos Lord': [
            { item: 'health potion (s)', chance: 1.0, quantity: [15, 25] },
            { item: 'ancient_tomes', chance: 1.0, quantity: [40, 80] },
            { item: 'diamond', chance: 0.6, quantity: [2, 5] }
        ],
        'Reality Shredder': [
            { item: 'health potion (s)', chance: 1.0, quantity: [18, 30] },
            { item: 'ancient_tomes', chance: 1.0, quantity: [50, 100] },
            { item: 'dragon gem', chance: 0.15, quantity: [1, 3] }
        ],
        'Entropy Incarnate': [
            { item: 'health potion (s)', chance: 1.0, quantity: [20, 35] },
            { item: 'ancient_tomes', chance: 1.0, quantity: [60, 120] },
            { item: 'dragon gem', chance: 0.2, quantity: [2, 4] }
        ]
    };
    
    // Process monster-specific drops
    const monsterDrops = dropTables[monster.name] || [];
    monsterDrops.forEach(drop => {
        if (Math.random() < drop.chance) {
            const quantity = Array.isArray(drop.quantity) 
                ? Math.floor(Math.random() * (drop.quantity[1] - drop.quantity[0] + 1)) + drop.quantity[0]
                : drop.quantity;
            tryDropItems([drop.item], quantity);
        }
    });
    
    // Chance for rare bonus loot (scales with dungeon level)
    const bonusChance = 0.1 + (currentDungeon.monsterLevel - 90) * 0.01; // 10% base, +1% per level above 90
    if (Math.random() < bonusChance) {
        logMessage(`🍀 Lucky! Extra combat loot!`, 'fore-green', '🍀');
        const bonusGold = Math.floor(Math.random() * (goldDrop * 1.5)) + goldDrop;
        playerData.gold += bonusGold;
        logMessage(`💰🍀 Lucky bonus: +${formatNumber(bonusGold)} gold!`, 'fore-yellow', '💰');
        
        // Chest chance for high-tier monsters
        if (monster.level >= 95 && Math.random() < 0.3) {
            tryDropItems(['chest'], 1);
        }
    }
    
    return monster.isBoss;
}

// Calculate simple damage for monster attacks
function calculateDamage(attack, defense, critBonus = 0) {
    const baseDamage = Math.max(1, attack - defense);
    return baseDamage;
}

// Wave complete
function waveComplete() {
    const waveBonus = currentWave * 0.1;
    logMessage(`Wave ${currentWave} complete! Bonus exp: ${Math.floor(waveBonus * 100)}%`, 'fore-green', '✅');
    
    // Drop rewards for wave
    const goldReward = Math.floor(Math.random() * 
        (currentDungeon.rewards.gold.max - currentDungeon.rewards.gold.min) + 
        currentDungeon.rewards.gold.min) / 10; // Divide by 10 for wave rewards
    
    playerData.gold += goldReward;
    
    if (Math.random() < currentDungeon.rewards.chestChance / 5) { // Lower chance for waves
        tryDropItems(['chest'], 1);
    }
    
    currentWave++;
    
    // Check if we should generate the boss wave or continue with regular waves
    if (currentWave === currentDungeon.waves + 1) {
        // This is the boss wave
        generateWaveMonsters();
        updateDungeonDisplay();
        startDungeonCombat(); // Restart combat for boss wave
    } else if (currentWave <= currentDungeon.waves) {
        // Continue with regular waves
        generateWaveMonsters();
        updateDungeonDisplay();
        startDungeonCombat(); // Restart combat for next wave
    } else {
        // This should not happen - if we get here, complete the dungeon
        console.error('Wave complete called after boss wave - completing dungeon');
        dungeonComplete();
    }
}

// Start cooldown update system for smooth Guild Wars 1 style square timers
function startCooldownUpdates() {
    if (cooldownUpdateInterval) clearInterval(cooldownUpdateInterval);
    
    cooldownUpdateInterval = setInterval(() => {
        updateCooldownTimers();
    }, 250); // Update every 250ms to prevent blinking from combat intervals
}

// Stop cooldown updates
function stopCooldownUpdates() {
    if (cooldownUpdateInterval) {
        clearInterval(cooldownUpdateInterval);
        cooldownUpdateInterval = null;
    }
}

// Update square cooldown timers in real-time (optimized to prevent blinking)
function updateCooldownTimers() {
    if (!dungeonInProgress) return;
    
    Object.values(DUNGEON_ABILITIES).forEach(ability => {
        if (!playerData.dungeoneering.abilities[ability.id].unlocked) return;
        
        const button = document.querySelector(`.ability-button[data-ability="${ability.id}"]`);
        if (!button) return;
        
        const now = Date.now();
        const upgrades = getAbilityUpgrades(ability);
        const cooldown = ability.baseCooldown + (upgrades.cooldown || 0);
        const timeSinceUse = now - lastAbilityUse[ability.id];
        const onCooldown = timeSinceUse < cooldown;
        
        if (onCooldown) {
            const remaining = Math.ceil((cooldown - timeSinceUse) / 1000);
            const cooldownProgress = (cooldown - timeSinceUse) / cooldown;
            const cooldownAngle = Math.max(0, Math.min(360, cooldownProgress * 360));
            
            // Only update angle if it has changed significantly (reduce flicker)
            const currentAngle = parseFloat(button.style.getPropertyValue('--cooldown-angle')) || 0;
            if (Math.abs(cooldownAngle - currentAngle) > 2) {
                button.style.setProperty('--cooldown-angle', `${cooldownAngle}deg`);
            }
            
            // Only update text if the remaining time has changed
            const cooldownText = button.querySelector('.cooldown-text');
            if (cooldownText && cooldownText.textContent !== `${remaining}s`) {
                cooldownText.textContent = `${remaining}s`;
            }
        } else if (button.disabled || button.classList.contains('on-cooldown')) {
            // Only process completion once to prevent blinking
            const cooldownOverlay = button.querySelector('.cooldown-overlay');
            const cooldownText = button.querySelector('.cooldown-text');
            
            if (cooldownOverlay) cooldownOverlay.remove();
            if (cooldownText) cooldownText.remove();
            
            button.disabled = false;
            button.classList.remove('on-cooldown');
            button.style.removeProperty('--cooldown-angle');
        }
    });
}

// Dungeon complete
function dungeonComplete() {
    dungeonInProgress = false;
    waveTransitionInProgress = false;
    clearInterval(combatInterval);
    stopCooldownUpdates();
    
    const firstTime = !playerData.dungeoneering.dungeonsCompleted[currentDungeon.id];
    playerData.dungeoneering.dungeonsCompleted[currentDungeon.id] = 
        (playerData.dungeoneering.dungeonsCompleted[currentDungeon.id] || 0) + 1;
    playerData.dungeoneering.totalDungeonsCompleted++;
    
    // Rewards
    const goldReward = Math.floor(Math.random() * 
        (currentDungeon.rewards.gold.max - currentDungeon.rewards.gold.min) + 
        currentDungeon.rewards.gold.min);
    
    playerData.gold += goldReward;
    
    // First time bonus
    if (firstTime) {
        const bonusExp = currentDungeon.boss.dungeoneeringExp * 5;
        playerData.dungeoneering.exp += bonusExp;
        syncDungeoneeringSkill();
        checkDungeoneeringLevelUp();
        logMessage(`First clear bonus! +${formatNumber(bonusExp)} Dungeoneering exp!`, 'fore-yellow', '⭐');
    }
    
    // Chest drops
    if (Math.random() < currentDungeon.rewards.chestChance) {
        tryDropItems(['chest'], Math.floor(Math.random() * 3) + 1);
    }
    
    // Rare drops
    if (Math.random() < currentDungeon.rewards.rareDropChance) {
        // Add special dungeon drops here
        logMessage('Rare dungeon drop!', 'fore-yellow', '💎');
    }
    
    logMessage(`Dungeon complete! Rewards: ${formatNumber(goldReward)} gold`, 'success');
    savePlayerData();
    
    // Don't automatically exit - let player manually leave
    // showDungeoneeringMenu();
}

// Dungeon failed
function dungeonFailed() {
    dungeonInProgress = false;
    waveTransitionInProgress = false;
    clearInterval(combatInterval);
    stopCooldownUpdates();
    
    handlePlayerDefeat();
    logMessage('Dungeon failed! You have been defeated...', 'error');
    
    showDungeoneeringMenu();
}

// Leave dungeon
export function leaveDungeon() {
    // Allow leaving even if dungeon is completed
    if (!dungeonInProgress && !currentDungeon) return;
    
    const confirmMessage = dungeonInProgress ? 
        'Are you sure? You will lose all progress in this dungeon!' : 
        'Leave this completed dungeon?';
    
    if (confirm(confirmMessage)) {
        dungeonInProgress = false;
        waveTransitionInProgress = false;
        clearInterval(combatInterval);
        stopCooldownUpdates();
        currentDungeon = null;
        waveMonsters = [];
        
        // Start button has been removed from UI
        
        showDungeoneeringMenu();
    }
}

// Use dungeon ability
export function useDungeonAbility(abilityId) {
    if (!dungeonInProgress) return;
    
    const ability = DUNGEON_ABILITIES[abilityId];
    if (!ability || !playerData.dungeoneering.abilities[abilityId].unlocked) return;
    
    const now = Date.now();
    const upgrades = getAbilityUpgrades(ability);
    const cooldown = ability.baseCooldown + (upgrades.cooldown || 0);
    
    if (now - lastAbilityUse[abilityId] < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastAbilityUse[abilityId])) / 1000);
        logMessage(`${ability.name} on cooldown: ${remaining}s`, 'error');
        return;
    }
    
    lastAbilityUse[abilityId] = now;
    
    switch (abilityId) {
        case 'whirlwind':
            useWhirlwind(ability, upgrades);
            break;
        case 'healingAura':
            useHealingAura(ability, upgrades);
            break;
        case 'berserkerRage':
            useBerserkerRage(ability, upgrades);
            break;
        case 'shadowStrike':
            useShadowStrike(ability, upgrades);
            break;
        case 'divineShield':
            useDivineShield(ability, upgrades);
            break;
        case 'apocalypse':
            useApocalypse(ability, upgrades);
            break;
    }
    
    updateDungeonDisplay();
}

// Ability implementations
function useWhirlwind(ability, upgrades) {
    try {
        const multiplier = ability.baseMultiplier + (upgrades.damage || 0);
        
        // Use the same combat stats calculation as regular attacks
        const combatStats = getPlayerCombatStats();
        // Parse the damage range from the string format "X - Y"
        const damageRange = combatStats.damage.value.split(' - ');
        const damageMin = parseInt(damageRange[0]) || 1;
        const damageMax = parseInt(damageRange[1]) || 3;
        const baseDamage = (damageMin + damageMax) / 2; // Average damage
        const damage = baseDamage * multiplier;
        
        // Validate damage
        if (isNaN(damage) || damage < 1) {
            console.error('Invalid Whirlwind damage:', damage, 'baseDamage:', baseDamage, 'multiplier:', multiplier);
            logMessage('Whirlwind failed to activate!', 'error');
            return;
        }
        
        let monstersHit = 0;
        waveMonsters.forEach(monster => {
            if (monster.currentHealth > 0) {
                // Abilities should be more effective against armor - only reduce by 50% of defense
                const dmg = Math.max(Math.floor(damage * 0.5), Math.floor(damage - (monster.defense * 0.5)));
                monster.currentHealth = Math.max(0, monster.currentHealth - dmg);
                
                // Show floating damage text
                const monsterElement = document.getElementById(`monster-${monster.id}`);
                if (monsterElement) {
                    const healthBar = monsterElement.querySelector('.health-bar');
                    if (healthBar) {
                        showFloatingCombatText(`-${formatNumber(dmg)}`, 'ability-damage', healthBar, 1.0, 0, -10, 'fade-up');
                    }
                }
                
                // Check if defeated
                if (monster.currentHealth === 0) {
                    handleMonsterDefeat(monster);
                }
                monstersHit++;
            }
        });
        
        logMessage(`⚔️ Whirlwind strikes ${monstersHit} enemies!`, 'success', '⚔️');
        
        // Play attack sound
        if (sounds && sounds.attackHard) {
            playSound(sounds.attackHard);
        }
        
    } catch (error) {
        console.error('Whirlwind ability error:', error);
        logMessage('Whirlwind ability failed!', 'error');
    }
}

function useHealingAura(ability, upgrades) {
    const healPercent = ability.baseHealPercent + (upgrades.heal || 0);
    const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
    const healAmount = Math.floor(maxHp * healPercent);
    
    const oldHp = Math.round(playerData.hp);
    playerData.hp = Math.round(Math.min(maxHp, playerData.hp + healAmount));
    const actualHeal = playerData.hp - oldHp;
    
    if (actualHeal > 0) {
        logMessage(`💚 Healed for ${actualHeal} HP!`, 'fore-green', '💚');
    } else {
        logMessage(`💚 Already at full health!`, 'fore-green', '💚');
    }
}

function useBerserkerRage(ability, upgrades) {
    dungeonAbilities.berserkerActive = true;
    dungeonAbilities.berserkerEnd = Date.now() + ability.baseDuration + (upgrades.duration || 0);
    
    logMessage(`Berserker Rage activated!`, 'success');
}

function useShadowStrike(ability, upgrades) {
    try {
        const target = waveMonsters.find(m => m.currentHealth > 0);
        if (!target) {
            logMessage('No targets available for Shadow Strike!', 'error');
            return;
        }
        
        const multiplier = ability.baseMultiplier + (upgrades.damage || 0);
        const critBonus = ability.baseCritBonus + (upgrades.crit || 0);
        
        // Use proper combat stats
        const combatStats = getPlayerCombatStats();
        // Parse the damage range from the string format "X - Y"
        const damageRange = combatStats.damage.value.split(' - ');
        const damageMin = parseInt(damageRange[0]) || 1;
        const damageMax = parseInt(damageRange[1]) || 3;
        const baseDamage = (damageMin + damageMax) / 2;
        // Shadow Strike should penetrate armor better - only reduce by 30% of defense
        let damage = Math.max(Math.floor(baseDamage * multiplier * 0.5), Math.floor((baseDamage * multiplier) - (target.defense * 0.3)));
        
        // Apply crit chance
        const isCrit = critBonus > 0 && Math.random() * 100 < critBonus;
        if (isCrit) {
            damage = Math.floor(damage * 1.5);
            logMessage('💥 Shadow Strike CRITICAL!', 'fore-lightred_ex', '💥');
        }
        
        // Validate damage
        if (isNaN(damage) || damage < 1) {
            console.error('Invalid Shadow Strike damage:', damage);
            damage = 1;
        }
        
        target.currentHealth = Math.max(0, target.currentHealth - damage);
        
        // Show floating damage text
        const monsterElement = document.getElementById(`monster-${target.id}`);
        if (monsterElement) {
            const healthBar = monsterElement.querySelector('.health-bar');
            if (healthBar) {
                const textType = isCrit ? 'ability-damage-crit' : 'ability-damage';
                showFloatingCombatText(`-${formatNumber(damage)}`, textType, healthBar, 1.5, 0, -15, 'fade-up');
            }
        }
        
        // Lifesteal
        if (upgrades.lifesteal > 0) {
            const heal = Math.max(0, Math.floor(damage * upgrades.lifesteal));
            if (heal > 0) {
                const oldHp = Math.round(playerData.hp);
                const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
                playerData.hp = Math.round(Math.min(maxHp, playerData.hp + heal));
                const actualHeal = playerData.hp - oldHp;
                if (actualHeal > 0) {
                    logMessage(`🖤 Shadow Lifesteal! +${actualHeal} HP`, 'fore-magenta', '🖤');
                }
            }
        }
        
        // Check if target defeated
        if (target.currentHealth === 0) {
            handleMonsterDefeat(target);
        }
        
        logMessage(`🗡️ Shadow Strike deals ${formatNumber(damage)} damage!`, 'success', '🗡️');
        
        // Play attack sound
        if (sounds && sounds.attackHard) {
            playSound(sounds.attackHard);
        }
        
    } catch (error) {
        console.error('Shadow Strike ability error:', error);
        logMessage('Shadow Strike ability failed!', 'error');
    }
}

function useDivineShield(ability, upgrades) {
    dungeonAbilities.shieldCharges = ability.baseCharges + (upgrades.charges || 0);
    logMessage(`Divine Shield activated! ${dungeonAbilities.shieldCharges} charges`, 'success');
}

function useApocalypse(ability, upgrades) {
    try {
        const multiplier = ability.baseMultiplier + (upgrades.damage || 0);
        
        // Use proper combat stats
        const combatStats = getPlayerCombatStats();
        // Parse the damage range from the string format "X - Y"
        const damageRange = combatStats.damage.value.split(' - ');
        const damageMin = parseInt(damageRange[0]) || 1;
        const damageMax = parseInt(damageRange[1]) || 3;
        const baseDamage = (damageMin + damageMax) / 2;
        
        let monstersHit = 0;
        let executed = 0;
        
        waveMonsters.forEach(monster => {
            if (monster.currentHealth > 0) {
                const missingHealthPercent = 1 - (monster.currentHealth / monster.maxHealth);
                const totalDamage = baseDamage * multiplier * (1 + missingHealthPercent);
                // Apocalypse should bypass most armor - only reduce by 25% of defense
                let damage = Math.max(Math.floor(totalDamage * 0.6), Math.floor(totalDamage - (monster.defense * 0.25)));
                
                // Validate damage
                if (isNaN(damage) || damage < 1) {
                    console.error('Invalid Apocalypse damage:', damage);
                    damage = 1;
                }
                
                // Execute mechanic
                if (upgrades.execute > 0 && monster.currentHealth / monster.maxHealth < upgrades.execute) {
                    monster.currentHealth = 0;
                    logMessage(`💀 ${monster.name} executed by Apocalypse!`, 'legendary', '💀');
                    executed++;
                } else {
                    monster.currentHealth = Math.max(0, monster.currentHealth - damage);
                    
                    // Show floating damage text
                    const monsterElement = document.getElementById(`monster-${monster.id}`);
                    if (monsterElement) {
                        const healthBar = monsterElement.querySelector('.health-bar');
                        if (healthBar) {
                            showFloatingCombatText(`-${formatNumber(damage)}`, 'ability-damage', healthBar, 1.3, 0, -12, 'fade-up');
                        }
                    }
                }
                
                // Check if defeated
                if (monster.currentHealth === 0) {
                    handleMonsterDefeat(monster);
                }
                monstersHit++;
            }
        });
        
        // Reset chance
        if (upgrades.reset > 0 && Math.random() < upgrades.reset) {
            lastAbilityUse.apocalypse = 0;
            logMessage(`🔄 Apocalypse cooldown reset!`, 'legendary', '🔄');
        }
        
        logMessage(`🌋 Apocalypse devastates ${monstersHit} enemies! ${executed > 0 ? `(${executed} executed)` : ''}`, 'success', '🌋');
        
        // Play epic sound
        if (sounds && sounds.attackHard) {
            playSound(sounds.attackHard);
            // Play multiple times for epic effect
            setTimeout(() => playSound(sounds.attackHard), 100);
            setTimeout(() => playSound(sounds.attackHard), 200);
        }
        
    } catch (error) {
        console.error('Apocalypse ability error:', error);
        logMessage('Apocalypse ability failed!', 'error');
    }
}

// Get ability upgrades
function getAbilityUpgrades(ability) {
    const upgrades = {};
    const level = playerData.dungeoneering.level;
    
    ability.upgrades.forEach((upgrade, index) => {
        if (level >= upgrade.level) {
            if (!upgrades[upgrade.bonus]) upgrades[upgrade.bonus] = 0;
            upgrades[upgrade.bonus] += upgrade.value;
        }
    });
    
    return upgrades;
}

// Update dungeoneering display
export function updateDungeoneeringDisplay() {
    const level = playerData.dungeoneering.level;
    const exp = playerData.dungeoneering.exp;
    const expToNext = getExpToNextLevel(level, 'dungeoneering');
    
    document.getElementById('dungeoneering-level').textContent = level;
    document.getElementById('dungeoneering-exp').textContent = `${formatNumber(exp)}/${formatNumber(expToNext)}`;
    
    // Update dungeon list
    const dungeonList = document.getElementById('dungeon-list');
    dungeonList.innerHTML = '';
    
    DUNGEONS.forEach(dungeon => {
        const canEnter = level >= dungeon.requiredLevel;
        const completed = playerData.dungeoneering.dungeonsCompleted[dungeon.id] || 0;
        
        const dungeonDiv = document.createElement('div');
        dungeonDiv.className = `dungeon-entry ${canEnter ? 'clickable' : 'locked'}`;
        dungeonDiv.setAttribute('data-dungeon', dungeon.id);
        
        if (canEnter) {
            dungeonDiv.onclick = () => window.dungeoneering.showDungeon(dungeon.id);
            dungeonDiv.style.cursor = 'pointer';
        }
        
        dungeonDiv.innerHTML = `
            <div class="dungeon-particles"></div>
            <div class="dungeon-content">
                <h3>${dungeon.name}</h3>
                <p class="dungeon-description">${dungeon.description}</p>
                <div class="dungeon-stats">
                    <p><span class="stat-label">Level Required:</span> <span class="stat-value">${dungeon.requiredLevel}</span></p>
                    <p><span class="stat-label">Monster Level:</span> <span class="stat-value">${dungeon.monsterLevel}</span></p>
                    <p><span class="stat-label">Completed:</span> <span class="stat-value">${completed} times</span></p>
                </div>
                ${!canEnter ? '<p class="locked-text">🔒 Locked</p>' : '<p class="enter-hint">Click to Enter</p>'}
            </div>
        `;
        dungeonList.appendChild(dungeonDiv);
    });
    
    // Update abilities
    const abilityList = document.getElementById('dungeon-abilities');
    abilityList.innerHTML = '';
    
    Object.values(DUNGEON_ABILITIES).forEach(ability => {
        const unlocked = level >= ability.unlockLevel;
        const upgrades = getAbilityUpgrades(ability);
        
        if (unlocked) {
            playerData.dungeoneering.abilities[ability.id].unlocked = true;
            
            const abilityDiv = document.createElement('div');
            abilityDiv.className = 'ability-entry';
            abilityDiv.innerHTML = `
                <h4>${ability.name}</h4>
                <p>${ability.description}</p>
                <p>Cooldown: ${(ability.baseCooldown + (upgrades.cooldown || 0)) / 1000}s</p>
                <div class="ability-upgrades">
                    ${ability.upgrades.map(u => 
                        `<span class="${level >= u.level ? 'active' : 'inactive'}">${u.description}</span>`
                    ).join('')}
                </div>
            `;
            abilityList.appendChild(abilityDiv);
        }
    });
}

// Update active dungeon display
export function updateDungeonDisplay() {
    if (!currentDungeon) return;
    
    document.getElementById('dungeon-name').textContent = currentDungeon.name;
    document.getElementById('current-wave').textContent = `Wave ${currentWave}/${currentDungeon.waves + 1}`;
    
    // Use correct HP variables from main game system
    const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
    const currentHp = Math.round(Math.max(0, playerData.hp));
    document.getElementById('player-health-dungeon').textContent = 
        `${currentHp}/${maxHp}`;
    
    // Update monsters with FIXED GRID system (5x2 = 10 slots)
    const monsterList = document.getElementById('wave-monsters');
    monsterList.innerHTML = '';
    
    // Create 10 fixed grid slots
    const maxSlots = 10;
    const isBossWave = waveMonsters.length === 1 && waveMonsters[0] && waveMonsters[0].isBoss;
    
    for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'monster-slot';
        slotDiv.id = `monster-slot-${slotIndex}`;
        
        if (isBossWave && slotIndex === 0) {
            // Boss takes up entire grid (span all columns)
            const monster = waveMonsters[0];
            slotDiv.className = 'monster-slot boss-slot';
            slotDiv.id = `monster-${monster.id}`;
            
            const healthPercent = isNaN(monster.currentHealth) || isNaN(monster.maxHealth) || monster.maxHealth === 0 ? 0 : (monster.currentHealth / monster.maxHealth) * 100;
            const isDefeated = monster.currentHealth <= 0;
            const isLowHealth = healthPercent < 25 && !isDefeated;
            
            slotDiv.innerHTML = `
                <div class="monster-header boss-header">
                    <h2 class="monster-name boss-name">👑 ${monster.name} (Lv ${monster.level})</h2>
                    <div class="monster-stats boss-stats">
                        <span class="attack-stat">🔥🔥🔥 ${monster.attack}</span>
                        <span class="defense-stat">🛡️🛡️🛡️ ${monster.defense}</span>
                    </div>
                </div>
                <div class="monster-health-container boss-health-container">
                    <div class="health-bar boss-health ${isLowHealth ? 'low-health-bar' : ''}">
                        <div class="health-fill boss-health-fill" style="width: ${healthPercent}%"></div>
                        <div class="health-overlay"></div>
                        <span class="health-text boss-health-text">${isDefeated ? '💀 DEFEATED' : formatNumber(monster.currentHealth) + '/' + formatNumber(monster.maxHealth)}</span>
                    </div>
                </div>
            `;
        } else if (!isBossWave && slotIndex < waveMonsters.length) {
            // Regular monster in this slot
            const monster = waveMonsters[slotIndex];
            slotDiv.id = `monster-${monster.id}`;
            
            const healthPercent = isNaN(monster.currentHealth) || isNaN(monster.maxHealth) || monster.maxHealth === 0 ? 0 : (monster.currentHealth / monster.maxHealth) * 100;
            const isDefeated = monster.currentHealth <= 0;
            const isLowHealth = healthPercent < 25 && !isDefeated;
            
            slotDiv.className += ` ${isDefeated ? 'defeated' : ''} ${isLowHealth ? 'low-health' : ''}`;
            
            const attackPower = monster.attack > 200 ? '🔥🔥' : '🔥';
            const defenseIcon = monster.defense > 150 ? '🛡️🛡️' : '🛡️';
            
            slotDiv.innerHTML = `
                <div class="monster-header">
                    <div class="monster-stats">
                        <span class="monster-icon">⚔️</span>
                        <span class="attack-stat">🔥${monster.attack}</span>
                        <span class="defense-stat">🛡️${monster.defense}</span>
                    </div>
                    <h4 class="monster-name">${monster.name} (${monster.level})</h4>
                </div>
                <div class="monster-health-container">
                    <div class="health-bar ${isLowHealth ? 'low-health-bar' : ''}">
                        <div class="health-fill" style="width: ${healthPercent}%"></div>
                        <div class="health-overlay"></div>
                        <span class="health-text">${isDefeated ? '💀' : formatNumber(monster.currentHealth) + '/' + formatNumber(monster.maxHealth)}</span>
                    </div>
                </div>
            `;
        } else {
            // Empty slot
            slotDiv.className += ' empty-slot';
            slotDiv.innerHTML = '<div class="empty-slot-content"></div>';
        }
        
        monsterList.appendChild(slotDiv);
    }
    
    // Update abilities with cooldowns - Guild Wars 1 Style
    const abilityContainer = document.getElementById('dungeon-ability-buttons');
    abilityContainer.innerHTML = '';
    
    Object.values(DUNGEON_ABILITIES).forEach(ability => {
        if (!playerData.dungeoneering.abilities[ability.id].unlocked) return;
        
        const now = Date.now();
        const upgrades = getAbilityUpgrades(ability);
        const cooldown = ability.baseCooldown + (upgrades.cooldown || 0);
        const timeSinceUse = now - lastAbilityUse[ability.id];
        const onCooldown = timeSinceUse < cooldown;
        const remaining = onCooldown ? Math.ceil((cooldown - timeSinceUse) / 1000) : 0;
        
        // Calculate cooldown angle for circular timer (0-360 degrees)
        const cooldownProgress = onCooldown ? (cooldown - timeSinceUse) / cooldown : 0;
        const cooldownAngle = Math.min(360, cooldownProgress * 360);
        
        const button = document.createElement('button');
        button.className = `ability-button ${onCooldown ? 'on-cooldown' : ''}`;
        button.setAttribute('data-ability', ability.id);
        button.disabled = onCooldown;
        button.onclick = () => useDungeonAbility(ability.id);
        
        // Set CSS custom property for cooldown angle
        if (onCooldown) {
            button.style.setProperty('--cooldown-angle', `${cooldownAngle}deg`);
        }
        
        button.innerHTML = `
            <div class="ability-name">${ability.name}</div>
            ${onCooldown ? `<div class="cooldown-overlay"></div>` : ''}
            ${onCooldown ? `<div class="cooldown-text">${remaining}s</div>` : ''}
        `;
        
        abilityContainer.appendChild(button);
    });
}

// Check dungeoneering level up
// Sync dungeoneering data with skills object for HUD consistency
function syncDungeoneeringSkill() {
    if (!playerData.skills.dungeoneering) {
        playerData.skills.dungeoneering = { level: 1, xp: 0 };
    }
    playerData.skills.dungeoneering.level = playerData.dungeoneering.level;
    playerData.skills.dungeoneering.xp = playerData.dungeoneering.exp;
}

export function checkDungeoneeringLevelUp() {
    const currentLevel = playerData.dungeoneering.level;
    const exp = playerData.dungeoneering.exp;
    const expNeeded = getExpToNextLevel(currentLevel, 'dungeoneering');
    
    if (exp >= expNeeded && currentLevel < 120) {
        playerData.dungeoneering.level++;
        playerData.dungeoneering.exp -= expNeeded;
        
        // Sync with skills object for HUD consistency
        syncDungeoneeringSkill();
        
        logMessage(`Dungeoneering level up! Level ${playerData.dungeoneering.level}`, 'levelup');
        
        // Check for new ability unlocks
        Object.values(DUNGEON_ABILITIES).forEach(ability => {
            if (ability.unlockLevel === playerData.dungeoneering.level) {
                playerData.dungeoneering.abilities[ability.id].unlocked = true;
                logMessage(`New ability unlocked: ${ability.name}!`, 'legendary');
            }
        });
        
        savePlayerData();
        updateDungeoneeringDisplay();
        updateHud();
    }
}


// Export for window access
window.dungeoneering = {
    showDungeoneeringMenu,
    showDungeon,
    startDungeon,
    leaveDungeon,
    useDungeonAbility
};