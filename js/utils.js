/**
 * utils.js - Core utility functions and global state for RuneText
 * Manages game state, saving/loading, and utility functions.
 */

'use strict';

// Import game data constants
import { LEVEL_PROGRESSION, TOOL_DATA, ITEM_DATA, TREE_DATA, ORE_DATA, BAR_DATA, PERK_DATA, FOOD_DATA, SWORD_DATA, ARMOR_DATA, HELMET_DATA, ENCHANTMENT_STAT_TIER_COLORS } from './data.js'; // Added more imports
import { getSummedPyramidPerkEffects } from './perks.js';


// Sound effects - Combat
const attackLightSound = new Audio('sounds/attack.light.mp3');
attackLightSound.volume = 0.3;
const attackHardSound = new Audio('sounds/attack.Hard.mp3');
attackHardSound.volume = 0.3;

// Monster death sounds
const chickenDeathSound = new Audio('sounds/chicken-death.mp3');
chickenDeathSound.volume = 0.3;
const goblinDeathSound = new Audio('sounds/goblin-death.mp3');
goblinDeathSound.volume = 0.3;
const wolfDeath1Sound = new Audio('sounds/wolf-death1.mp3');
wolfDeath1Sound.volume = 0.3;
const wolfDeath2Sound = new Audio('sounds/wolf-death2.mp3');
wolfDeath2Sound.volume = 0.3;
const bearDeathSound = new Audio('sounds/bear-death.mp3');
bearDeathSound.volume = 0.3;
const ogreDeath1Sound = new Audio('sounds/ogre-death1.mp3');
ogreDeath1Sound.volume = 0.3;
const ogreDeath2Sound = new Audio('sounds/ogre-death2.mp3');
ogreDeath2Sound.volume = 0.3;
const dragonDeath1Sound = new Audio('sounds/dragon-death1.mp3');
dragonDeath1Sound.volume = 0.3;
const dragonDeath2Sound = new Audio('sounds/dragon-death2.mp3');
dragonDeath2Sound.volume = 0.3;

// Player sounds
const playerDeathSound = new Audio('sounds/player-death.mp3');
playerDeathSound.volume = 0.4;
const lowHealthSound = new Audio('sounds/low-health.mp3');
lowHealthSound.volume = 0.3;

// Skill sounds
const woodcutting1Sound = new Audio('sounds/woodcutting1.mp3');
woodcutting1Sound.volume = 0.3;
const woodcutting2Sound = new Audio('sounds/woodcutting2.mp3');
woodcutting2Sound.volume = 0.3;
const chopSound = new Audio('sounds/chop.mp3');
chopSound.volume = 0.3;
const mining1Sound = new Audio('sounds/mining1.mp3');
mining1Sound.volume = 0.3;
const mining2Sound = new Audio('sounds/mining2.mp3');
mining2Sound.volume = 0.3;
const miningSound = new Audio('sounds/mining.mp3');
miningSound.volume = 0.3;
const smithing1Sound = new Audio('sounds/smithing1.mp3');
smithing1Sound.volume = 0.3;
const smithing2Sound = new Audio('sounds/smithing2.mp3');
smithing2Sound.volume = 0.3;
const cooking1Sound = new Audio('sounds/cooking1.mp3');
cooking1Sound.volume = 0.3;

// UI and progression sounds
const levelUp1Sound = new Audio('sounds/levelup.mp3');
levelUp1Sound.volume = 0.4;
const levelUp2Sound = new Audio('sounds/levelup2.mp3');
levelUp2Sound.volume = 0.4;
const dingSound = new Audio('sounds/ding.mp3');
dingSound.volume = 0.3;
const perkSound = new Audio('sounds/perk.mp3');
perkSound.volume = 0.3;
const enchantSound = new Audio('sounds/enchant.mp3');
enchantSound.volume = 0.3;
const equipSound = new Audio('sounds/equip1.mp3');
equipSound.volume = 0.3;

// Special sounds
const rareDrop1Sound = new Audio('sounds/rare-drop1.mp3');
rareDrop1Sound.volume = 0.4;
const rareDrop2Sound = new Audio('sounds/rare-drop2.mp3');
rareDrop2Sound.volume = 0.4;
const legendarySound = new Audio('sounds/lagendary.mp3');
legendarySound.volume = 0.4;
const sellingBuyingSound = new Audio('sounds/selling-and-buying.mp3');
sellingBuyingSound.volume = 0.3;
const eating1Sound = new Audio('sounds/eating1.mp3');
eating1Sound.volume = 0.3;
const eating2Sound = new Audio('sounds/eating2.mp3');
eating2Sound.volume = 0.3;
const memberFinishTaskSound = new Audio('sounds/member-finishtask.mp3');

// Set default volumes for all sounds
const defaultVolume = 0.15;
const allSounds = [
    attackLightSound, attackHardSound,
    chickenDeathSound, goblinDeathSound, wolfDeath1Sound, wolfDeath2Sound,
    bearDeathSound, ogreDeath1Sound, ogreDeath2Sound, dragonDeath1Sound, dragonDeath2Sound,
    playerDeathSound, lowHealthSound,
    woodcutting1Sound, woodcutting2Sound, mining1Sound, mining2Sound, miningSound,
    smithing1Sound, smithing2Sound, cooking1Sound,
    levelUp1Sound, levelUp2Sound, dingSound, perkSound, enchantSound, equipSound,
    rareDrop1Sound, rareDrop2Sound, legendarySound, sellingBuyingSound,
    eating1Sound, eating2Sound, memberFinishTaskSound
];

// Apply default volume to all sounds
allSounds.forEach(sound => {
    if (sound) sound.volume = defaultVolume;
});

// Main theme music
let mainThemeMusic = null;

// Sound state and functions
export let soundsMuted = false;
export let musicVolume = 50;
export let soundVolume = 15;

export function playSound(sound) {
    if (soundsMuted) return;
    if (sound && typeof sound.play === 'function') {
        sound.currentTime = 0;
        sound.play().catch(e => console.warn("Sound play prevented:", e));
    }
}

export function toggleMute() {
    soundsMuted = !soundsMuted;
    localStorage.setItem('runetextSoundsMuted', soundsMuted.toString()); // Persist mute state
    logMessage(soundsMuted ? "Sounds Muted" : "Sounds Unmuted", "fore-cyan");

    // Update button icon
    const muteSettingBtn = document.getElementById('mute-toggle-setting');
    if (muteSettingBtn) {
        muteSettingBtn.textContent = soundsMuted ? "🔇" : "🔊";
    }
}

export function setSoundVolume(volume) {
    soundVolume = volume;
    localStorage.setItem('runetextSoundVolume', volume.toString());
    
    // Update all sound volumes
    allSounds.forEach(sound => {
        if (sound) sound.volume = volume / 100;
    });
}
// On load, set initial mute state from localStorage
const savedMuteState = localStorage.getItem('runetextSoundsMuted');
if (savedMuteState !== null) {
    soundsMuted = savedMuteState === 'true';
}

// On load, set initial sound volume from localStorage
const savedSoundVolume = localStorage.getItem('runetextSoundVolume');
if (savedSoundVolume !== null) {
    soundVolume = parseInt(savedSoundVolume);
    allSounds.forEach(sound => {
        if (sound) sound.volume = soundVolume / 100;
    });
}

// Music functions
export function initializeMainThemeMusic() {
    if (!mainThemeMusic) {
        mainThemeMusic = document.getElementById('main-theme-music');
        if (mainThemeMusic) {
            mainThemeMusic.volume = musicVolume / 100;
        }
    }
}

let musicStartPending = false;

export function startMainThemeMusic() {
    initializeMainThemeMusic();
    if (mainThemeMusic && musicVolume > 0) {
        mainThemeMusic.play().catch(e => {
            console.warn("Music play prevented:", e);
            // Mark music as pending to start on first user interaction
            musicStartPending = true;
            setupUserInteractionListener();
        });
    }
}

function setupUserInteractionListener() {
    // Only set up listener if music is pending and we haven't already set it up
    if (musicStartPending && !document.hasUserInteractionListener) {
        document.hasUserInteractionListener = true;
        
        const startMusicOnInteraction = () => {
            if (musicStartPending && musicVolume > 0) {
                initializeMainThemeMusic();
                if (mainThemeMusic) {
                    mainThemeMusic.play().catch(e => console.warn("Music still blocked:", e));
                    musicStartPending = false;
                }
            }
            // Remove listeners after first interaction
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
            document.hasUserInteractionListener = false;
        };
        
        // Listen for any user interaction
        document.addEventListener('click', startMusicOnInteraction);
        document.addEventListener('keydown', startMusicOnInteraction);
        document.addEventListener('touchstart', startMusicOnInteraction);
    }
}

export function stopMainThemeMusic() {
    if (mainThemeMusic) {
        mainThemeMusic.pause();
        mainThemeMusic.currentTime = 0;
    }
}

export function setMusicVolume(volume) {
    musicVolume = Math.max(0, Math.min(100, volume));
    localStorage.setItem('runetextMusicVolume', musicVolume.toString());
    
    // Save to playerData if it exists
    if (playerData && playerData.settings) {
        playerData.settings.musicVolume = musicVolume;
    }
    
    initializeMainThemeMusic();
    if (mainThemeMusic) {
        mainThemeMusic.volume = musicVolume / 100;
        
        // Start music if volume > 0 and it's not already playing
        if (musicVolume > 0 && mainThemeMusic.paused) {
            startMainThemeMusic();
        } else if (musicVolume === 0) {
            stopMainThemeMusic();
        }
    }
    
    // Update display
    const musicVolumeDisplay = document.getElementById('music-volume-display');
    if (musicVolumeDisplay) {
        musicVolumeDisplay.textContent = `${musicVolume}%`;
    }
}



// Helper functions for random sound selection
function getRandomAttackSound() {
    return Math.random() < 0.5 ? attackLightSound : attackHardSound;
}

function getRandomWoodcuttingSound() {
    const sounds = [woodcutting1Sound, woodcutting2Sound];
    return sounds[Math.floor(Math.random() * sounds.length)];
}

function getRandomMiningSound() {
    const sounds = [mining1Sound, mining2Sound, miningSound];
    return sounds[Math.floor(Math.random() * sounds.length)];
}

function getRandomSmithingSound() {
    return Math.random() < 0.5 ? smithing1Sound : smithing2Sound;
}

function getRandomLevelUpSound() {
    return Math.random() < 0.5 ? levelUp1Sound : levelUp2Sound;
}

function getRandomEatingSound() {
    return Math.random() < 0.5 ? eating1Sound : eating2Sound;
}

function getRandomRareDropSound() {
    return Math.random() < 0.5 ? rareDrop1Sound : rareDrop2Sound;
}

function getMonsterDeathSound(monsterName) {
    switch (monsterName.toLowerCase()) {
        case 'chicken': return chickenDeathSound;
        case 'goblin': return goblinDeathSound;
        case 'wolf': return Math.random() < 0.5 ? wolfDeath1Sound : wolfDeath2Sound;
        case 'bear': return bearDeathSound;
        case 'ogre': 
        case 'troll':
        case 'giant': return Math.random() < 0.5 ? ogreDeath1Sound : ogreDeath2Sound;
        case 'demon':
        case 'dark_dragon': return Math.random() < 0.5 ? dragonDeath1Sound : dragonDeath2Sound;
        default: return attackHardSound; // Fallback
    }
}

// Export sound objects for use in other modules
export const sounds = {
    // Combat
    attack: getRandomAttackSound,
    attackLight: attackLightSound,
    attackHard: attackHardSound,
    monsterDeath: getMonsterDeathSound,
    playerDeath: playerDeathSound,
    lowHealth: lowHealthSound,
    
    // Skills
    woodcutting: getRandomWoodcuttingSound,
    mining: getRandomMiningSound,
    smithing: getRandomSmithingSound,
    smelting: getRandomSmithingSound, // Same as smithing
    cooking: cooking1Sound,
    
    // UI & Progression
    levelUp: getRandomLevelUpSound,
    ding: dingSound,
    perk: perkSound,
    enchant: enchantSound,
    equip: equipSound,
    achievement: levelUp2Sound, // Use levelup2 for achievements
    
    // Shop & Items
    buy: sellingBuyingSound,
    sell: sellingBuyingSound,
    eat: getRandomEatingSound,
    
    // Special Events
    rareDrop: getRandomRareDropSound,
    legendary: legendarySound,
    memberFinishTask: memberFinishTaskSound,
    
    // Legacy compatibility
    monsterKill: attackHardSound,
    playerDie: playerDeathSound,
    sellItem: sellingBuyingSound,
    skillRound: getRandomWoodcuttingSound
};

// Game state - the main player data object
export let playerData = null;

// XP and level utility functions
export function getLevelFromXp(xp) {
    for (let i = 1; i < LEVEL_PROGRESSION.length; i++) {
        if (xp < LEVEL_PROGRESSION[i]) return i;
    }
    return LEVEL_PROGRESSION.length - 1;
}

export function getXpForLevel(level) {
    if (level <= 0) return 0;
    if (level >= LEVEL_PROGRESSION.length) return LEVEL_PROGRESSION[LEVEL_PROGRESSION.length - 1];
    return LEVEL_PROGRESSION[level];
}

export function getXpForDisplay(xp) {
    const level = getLevelFromXp(xp);
    const currentLevelThreshold = getXpForLevel(level - 1);
    const nextLevelThreshold = getXpForLevel(level);
    const xpInCurrentLevel = xp - currentLevelThreshold;
    const xpRequiredForNextLevel = nextLevelThreshold - currentLevelThreshold;
    const percentToNextLevel = xpRequiredForNextLevel > 0
        ? Math.floor((xpInCurrentLevel / xpRequiredForNextLevel) * 100)
        : 0;
    return {
        level,
        currentXp: xp,
        xpInCurrentLevel,
        xpRequiredForNextLevel,
        percentToNextLevel
    };
}

export function getEnchantmentBonus(statType, slot = null) {
    if (!playerData || !playerData.itemEnchantments) return 0;
    
    let totalBonus = 0;
    
    if (slot) {
        // Get enchantments from specific slot
        const equippedItemName = playerData.equipment && playerData.equipment[slot];
        if (equippedItemName && equippedItemName !== 'none') {
            const itemKey = `${slot}:${equippedItemName}`;
            const itemEnchantData = playerData.itemEnchantments[itemKey];
            if (itemEnchantData && itemEnchantData.enchantments) {
                itemEnchantData.enchantments.forEach(enchantment => {
                    if (enchantment.stat === statType) {
                        totalBonus += enchantment.value;
                    }
                });
            }
        }
    } else {
        // Get enchantments from all enchantable slots (backward compatibility)
        const enchantableSlots = ['weapon', 'armor', 'helmet', 'axe', 'pickaxe'];
        
        enchantableSlots.forEach(slotKey => {
            const equippedItemName = playerData.equipment && playerData.equipment[slotKey];
            if (equippedItemName && equippedItemName !== 'none') {
                const itemKey = `${slotKey}:${equippedItemName}`;
                const itemEnchantData = playerData.itemEnchantments[itemKey];
                if (itemEnchantData && itemEnchantData.enchantments) {
                    itemEnchantData.enchantments.forEach(enchantment => {
                        if (enchantment.stat === statType) {
                            totalBonus += enchantment.value;
                        }
                    });
                }
            }
        });
    }
    
    return totalBonus;
}

/**
 * Helper function to format enchantment stats for display
 */
export function formatEnchantmentStat(statType, value) {
    switch (statType) {
        case 'damage_flat':
            return `+${Math.floor(value)} Damage`;
        case 'damage_percent':
            return `+${Math.floor(value * 100)}% Damage`;
        case 'crit_chance':
            return `+${Math.floor(value * 100)}% Crit`;
        case 'str_percent':
            return `+${Math.floor(value * 100)}% STR`;
        case 'luk_percent':
            return `+${Math.floor(value * 100)}% LUK`;
        case 'defense_percent':
            return `+${Math.floor(value * 100)}% Defense`;
        case 'hp_flat':
            return `+${Math.floor(value)} HP`;
        case 'attack_speed':
            return `+${Math.floor(value * 100)}% AS`;
        // Gathering tool enchantments
        case 'gathering_speed':
            return `+${Math.floor(value * 100)}% Gathering Speed`;
        case 'gathering_double_chance':
            return `+${Math.floor(value * 100)}% 2x Loot`;
        case 'gathering_triple_chance':
            return `+${Math.floor(value * 100)}% 3x Loot`;
        case 'gathering_quad_chance':
            return `+${Math.floor(value * 100)}% 4x Loot`;
        case 'aoe_mining_chance':
            return `+${Math.floor(value * 100)}% AoE Mining`;
        case 'aoe_woodcutting_chance':
            return `+${Math.floor(value * 100)}% AoE Chopping`;
        case 'gem_find_chance':
            return `+${Math.floor(value * 100)}% Gem Find`;
        case 'rare_wood_chance':
            return `+${Math.floor(value * 100)}% Rare Wood`;
        case 'ancient_tome_chance':
            return `+${(value * 100).toFixed(2)}% Ancient Tome`;
        case 'bonus_hp':
            return `+${Math.floor(value)} Bonus HP`;
        // Wizard Tower enchantments
        case 'life_steal':
            return `+${Math.floor(value * 100)}% Life Steal`;
        case 'fire_damage':
            return `+${Math.floor(value)} Fire DoT`;
        case 'ice_damage':
            return `+${Math.floor(value * 100)}% Ice Slow`;
        default:
            return `+${value} ${statType}`;
    }
}

export function getMaxHp(attackLevel) {
    const base = 10 + Math.floor(attackLevel * 2.5);
    const effects = getSummedPyramidPerkEffects();
    const flatHpPerk = effects.hp || 0; // Assuming 'hp' is the key from pyramid for flat HP
    const enchantmentHp = getEnchantmentBonus('hp_flat');
    const toolBonusHp = getEnchantmentBonus('bonus_hp');
    return base + flatHpPerk + enchantmentHp + toolBonusHp;
}

// Function to handle low health warning reset on heal
// This is called from outside modules to avoid circular imports
let lowHealthWarningResetCallback = null;

export function setLowHealthWarningResetCallback(callback) {
    lowHealthWarningResetCallback = callback;
}

export function checkAndResetLowHealthWarning() {
    if (lowHealthWarningResetCallback) {
        const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
        const hpPercent = playerData.hp / maxHp;
        if (hpPercent > 0.5) {
            lowHealthWarningResetCallback();
        }
    }
}

// Logging functions
export function logMessage(message, colorClass = "fore-white", emoji = "") {
    const gameLog = document.getElementById('game-log');
    if (!gameLog) return;

    const D = new Date();
    const timestamp = `${D.getHours().toString().padStart(2,'0')}:${D.getMinutes().toString().padStart(2,'0')}:${D.getSeconds().toString().padStart(2,'0')}`;
    
    const logEntryDiv = document.createElement('div');
    logEntryDiv.className = 'game-log-entry';
    
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'game-log-timestamp';
    timestampSpan.textContent = timestamp;
    
    const messageSpan = document.createElement('span');
    if (colorClass) messageSpan.classList.add(colorClass);
    
    if (emoji) {
        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'game-log-emoji';
        emojiSpan.textContent = emoji;
        messageSpan.appendChild(emojiSpan);
    }
    messageSpan.appendChild(document.createTextNode(" " + message));
    
    logEntryDiv.appendChild(timestampSpan);
    logEntryDiv.appendChild(messageSpan);
    
    gameLog.insertBefore(logEntryDiv, gameLog.firstChild);

    const MAX_LOG_ENTRIES = 50; 
    while (gameLog.children.length > MAX_LOG_ENTRIES) {
        gameLog.removeChild(gameLog.lastChild);
    }
    
    const gameLogContainer = document.getElementById('game-log-container');
    if (gameLogContainer && gameLogContainer.classList.contains('game-log-collapsed')) {
        gameLogContainer.classList.add('game-log-flash');
        setTimeout(() => { gameLogContainer.classList.remove('game-log-flash'); }, 500);
    }
}

export function clearGameLog() {
    const gameLog = document.getElementById('game-log');
    if (gameLog) gameLog.innerHTML = '';
}

// String utilities
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str) {
    if (!str) return '';
    return str.split(' ').map(word => capitalize(word)).join(' ');
}

export function formatNumber(num) {
    if (typeof num !== 'number') return String(num); // Handle non-numeric inputs gracefully
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function addItemToInventory(itemName, quantity = 1) {
    if (!playerData) return false;
    if (!playerData.inventory) playerData.inventory = {};
    if (playerData.inventory[itemName] === undefined) playerData.inventory[itemName] = 0;
    playerData.inventory[itemName] += quantity;

    if (TOOL_DATA.axe[itemName]) {
        if (!playerData.tools) playerData.tools = {};
        playerData.tools[itemName] = { ...TOOL_DATA.axe[itemName] };
    } else if (TOOL_DATA.pickaxe[itemName]) {
        if (!playerData.tools) playerData.tools = {};
        playerData.tools[itemName] = { ...TOOL_DATA.pickaxe[itemName] };
    }
    // savePlayerData(); // Usually called by the function that calls this
    return true;
}

export function removeItemFromInventory(itemName, quantity = 1) {
    if (!playerData || !playerData.inventory) return false;
    if (!playerData.inventory[itemName] || playerData.inventory[itemName] < quantity) return false;
    playerData.inventory[itemName] -= quantity;
    if (playerData.inventory[itemName] <= 0) delete playerData.inventory[itemName];
    // savePlayerData(); // Usually called by the function that calls this
    return true;
}

export function formatDurationHHMMSS(durationMs) {
    const seconds = Math.floor(durationMs / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hDisplay = h > 0 ? h.toString().padStart(2, '0') + ':' : '';
    return hDisplay + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

export function savePlayerData() {
    try {
        if (playerData && playerData.settings && typeof playerData.settings.uiMode === 'undefined') { // Ensure uiMode is saved
            playerData.settings.uiMode = 'mobile'; // Default if somehow missing
        }
        localStorage.setItem('runetext-player-data', JSON.stringify(playerData));
        return true;
    } catch (e) {
        console.error('Error saving player data:', e);
        return false;
    }
}

export function loadPlayerData() {
    const saved = localStorage.getItem('runetext-player-data');
    if (saved) {
        try {
            const parsedData = JSON.parse(saved);
            playerData = migratePlayerData(parsedData);
            
            if (playerData.itemEnchantments && playerData.equipment) {
                Object.keys(playerData.equipment).forEach(slot => {
                    const itemName = playerData.equipment[slot];
                    if (itemName && itemName !== 'none') {
                        const itemKey = `${slot}:${itemName}`;
                        if (playerData.itemEnchantments[itemKey]) {
                             if(!playerData.enchantedStats) playerData.enchantedStats = {}; // Ensure exists
                            playerData.enchantedStats[slot] = playerData.itemEnchantments[itemKey].enchantments;
                        }
                    }
                });
            }
            
            console.log('Player data loaded and migrated successfully');
        } catch (e) {
            console.error('Error loading player data:', e);
            playerData = getDefaultPlayerData();
        }
    } else {
        console.log('No saved data found, initializing new player');
        playerData = getDefaultPlayerData();
    }
    
    // Load music volume from playerData if available, otherwise from localStorage
    if (playerData && playerData.settings && typeof playerData.settings.musicVolume === 'number') {
        musicVolume = playerData.settings.musicVolume;
    } else {
        const savedMusicVolume = localStorage.getItem('runetextMusicVolume');
        if (savedMusicVolume !== null) {
            musicVolume = parseInt(savedMusicVolume, 10);
            // Migrate to playerData
            if (playerData && playerData.settings) {
                playerData.settings.musicVolume = musicVolume;
            }
        }
    }
     // After loading, update the mute button text based on the loaded mute state
    const muteSettingBtn = document.getElementById('mute-toggle-setting');
    if (muteSettingBtn) {
        muteSettingBtn.textContent = soundsMuted ? "Unmute Sounds" : "Mute Sounds";
    }
}

export function getDefaultPlayerData() {
    return {
        gold: 0, hp: 10, max_hp: 10,
        skills: {
            attack: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 },
            mining: { level: 1, xp: 0 }, blacksmithing: { level: 1, xp: 0 },
            cooking: { level: 1, xp: 0 }, farming: { level: 1, xp: 0 },
            enchanting: { level: 1, xp: 0 }
        },
        inventory: {},
        equipment: { weapon: "none", axe: "none", pickaxe: "none", armor: "none", helmet: "none" },
        tools: {},
        perk_points_earned: 0, perk_points_spent: 0,
        active_perks: {}, // For legacy, should be migrated to pyramidNodes
        pyramidNodes: [], // New for pyramid perk tree
        built_structures: {}, // Renamed from structures for clarity
        permits: {}, // Renamed from unlocked_permits
        guild: { joined: false, guild_id: null, rank: 0, contribution: 0, daily_contribution_limit: 100, last_contribution_time: 0, level: 1, xp: 0, members: {}, missions: {}, upgrades: {}, stash: {} },
        quest_progress: {},
        farm_animals: {}, farm_workers: {}, farm_crop_plots: {},
        last_animal_production: 0, last_farm_worker_payment: 0,
        farm_storage: {}, farm_managers_roles: { animal: null, crop: null },
        enchantedStats: {}, itemEnchantments: {}, // No enchantmentCounters needed if count is in itemEnchantments
        settings: { mute: false, uiMode: 'mobile', musicVolume: 50 } // Added uiMode and musicVolume
    };
}

export function migratePlayerData(data) {
    const migratedData = { ...getDefaultPlayerData(), ...data }; // Start with defaults, then overlay

    // Ensure nested objects are also merged correctly or initialized
    migratedData.skills = { ...getDefaultPlayerData().skills, ...data.skills };
    migratedData.equipment = { ...getDefaultPlayerData().equipment, ...data.equipment };
    migratedData.tools = { ...getDefaultPlayerData().tools, ...data.tools };
    migratedData.guild = { ...getDefaultPlayerData().guild, ...data.guild };
    migratedData.settings = { ...getDefaultPlayerData().settings, ...data.settings };
    migratedData.enchantedStats = { ...getDefaultPlayerData().enchantedStats, ...data.enchantedStats };
    migratedData.itemEnchantments = { ...getDefaultPlayerData().itemEnchantments, ...data.itemEnchantments };
    migratedData.pyramidNodes = Array.isArray(data.pyramidNodes) ? data.pyramidNodes : [];


    // Specific Migrations
    
    // Migrate equipment chestplate to armor
    if (migratedData.equipment && migratedData.equipment.chestplate && !migratedData.equipment.armor) {
        migratedData.equipment.armor = migratedData.equipment.chestplate;
        delete migratedData.equipment.chestplate;
    }
    
    if (data.structures && !data.built_structures) { // Rename 'structures' to 'built_structures'
        migratedData.built_structures = data.structures;
        delete migratedData.structures;
    }
    if (data.unlocked_permits && !data.permits) { // Rename 'unlocked_permits' to 'permits'
        migratedData.permits = {};
        data.unlocked_permits.forEach(p => { migratedData.permits[p] = true; });
        delete migratedData.unlocked_permits;
    }

    if (data.active_perks && Object.keys(data.active_perks).length > 0 && migratedData.pyramidNodes.length === 0) {
        console.log("Migrating legacy perks to pyramid system...");
        const legacyPerkMapping = {
            'weaponMaster1': 'n5', 'efficientCooking1': 'n16', 
            'masterChef1': 'n16', 'preciseStrikes1': 'n12'
        };
        Object.keys(data.active_perks).forEach(perkId => {
            if (legacyPerkMapping[perkId]) {
                const nodeId = legacyPerkMapping[perkId];
                if (!migratedData.pyramidNodes.find(n => n.id === nodeId)) {
                    migratedData.pyramidNodes.push({ id: nodeId, active: true });
                }
            }
        });
        delete migratedData.active_perks; // Remove old structure
    }
    
    if (migratedData.inventory && migratedData.inventory.logs !== undefined) {
        migratedData.inventory["normal logs"] = (migratedData.inventory["normal logs"] || 0) + migratedData.inventory.logs;
        delete migratedData.inventory.logs;
    }
    if (migratedData.farm_storage && migratedData.farm_storage['sheep milk'] !== undefined) {
        delete migratedData.farm_storage['sheep milk'];
    }
    if(typeof migratedData.settings.uiMode === 'undefined'){
        migratedData.settings.uiMode = 'mobile';
    }

    return migratedData;
}

export function exportSaveData() {
    if (!playerData) { logMessage('No game data to export.', 'fore-red'); return; }
    try {
        const dataStr = JSON.stringify(playerData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'runetext-save.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        logMessage('Game data exported successfully.', 'fore-green');
    } catch (e) {
        console.error('Failed to export game data:', e);
        logMessage('Failed to export game data.', 'fore-red');
    }
}

export function handleImportFile(event) { // Added event parameter
    const fileInput = event.target; // Get fileInput from event
    const file = fileInput.files[0];
    if (!file) { logMessage('No file selected for import.', 'fore-red'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!importedData || typeof importedData !== 'object') throw new Error('Invalid save file format');
            playerData = migratePlayerData(importedData); // Use migratePlayerData
            logMessage('Game data imported successfully. Reloading game...', 'fore-green');
            savePlayerData(); // Save the newly imported & migrated data
            setTimeout(() => window.location.reload(), 1500); // Reload to apply everything fresh
        } catch (e) {
            console.error('Failed to import game data:', e);
            logMessage('Failed to import game data. File may be corrupt or invalid format.', 'fore-red');
        } finally {
            fileInput.value = ''; // Reset file input
        }
    };
    reader.onerror = function() { logMessage('Error reading file.', 'fore-red'); };
    reader.readAsText(file);
}

export function confirmResetGame() {
    const modal = document.getElementById('reset-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Ensure modal is flex for centering
    }
}

export function resetGame() {
    playerData = getDefaultPlayerData();
    savePlayerData();
    clearGameLog();
    logMessage('Game has been reset to a new game. Reloading...', 'fore-green');
    const modal = document.getElementById('reset-confirm-modal');
    if (modal) modal.classList.add('hidden');
    
    localStorage.clear(); // More thorough reset
    setTimeout(() => window.location.reload(), 1000);
}

export function handleLevelUp(skillType, oldLevel, newLevel) {
    let skillName = capitalize(skillType);
    if (sounds && sounds.levelUp) {
        const levelUpSound = typeof sounds.levelUp === 'function' ? sounds.levelUp() : sounds.levelUp;
        playSound(levelUpSound);
    }
    logMessage(`🎉 ${skillName} level up! ${oldLevel} → ${newLevel}`, 'level-up', '🌟'); // Added emoji to log
    
    // updatePerkPoints(); // Assuming this function exists and handles PP logic

    if (skillType === 'attack') {
        playerData.max_hp = getMaxHp(newLevel);
        if (playerData.hp < playerData.max_hp) {
            playerData.hp = playerData.max_hp;
            // Reset low health warning when healing to full HP
            checkAndResetLowHealthWarning();
        }
    }
    // savePlayerData(); // Usually called by the function that triggers level up
}

export function isPerkActive(perkId) { // Keep for legacy compatibility if needed elsewhere
    return !!(playerData && playerData.active_perks && playerData.active_perks[perkId]);
}

export function applyCheat(cheatCode) {
    if (!cheatCode) return;
    cheatCode = cheatCode.trim().toLowerCase();
    let success = true;
    let message = 'Cheat activated: ';

    if (cheatCode === 'rosebud') playerData.gold += 50000;
    else if (cheatCode === 'rosebud+') playerData.gold += 1000000;
    else if (cheatCode === 'xpboost' || cheatCode === 'allxp') {
        Object.keys(playerData.skills).forEach(skill => {
            playerData.skills[skill].xp += 50000;
        });
        message += 'Added 50000 XP to all skills';
    }
    else if (cheatCode === 'maxhp' || cheatCode === 'health') {
        playerData.max_hp = 100; playerData.hp = 100;
        // Reset low health warning when using cheat
        checkAndResetLowHealthWarning();
        message += 'Set HP to 100';
    }
    else if (cheatCode === 'perks' || cheatCode === 'perkpoints') {
        playerData.perk_points_earned = (playerData.perk_points_earned || 0) + 5;
        message += 'Added 5 perk points';
    }
    else if (cheatCode === 'godmode') {
        message = 'Cheat activated: GOD MODE ENABLED!';
        playerData.godModeActive = true;
        playerData.gold += 1000000;
        Object.keys(playerData.skills).forEach(skill => {
            playerData.skills[skill].xp += 1000000000;
        });
        playerData.max_hp = 1000000; playerData.hp = 1000000;
        // Reset low health warning when using godmode cheat
        checkAndResetLowHealthWarning();
        playerData.perk_points_earned = (playerData.perk_points_earned || 0) + 1000000;
        Object.keys(ITEM_DATA).forEach(itemName => addItemToInventory(itemName, 100000));
        Object.values(TREE_DATA).forEach(tree => addItemToInventory(tree.log, 100000));
        Object.values(ORE_DATA).forEach(ore => addItemToInventory(ore.item_name, 100000));
        Object.keys(BAR_DATA).forEach(barName => addItemToInventory(barName, 100000));
        
        // Add 100 of each chest type
        addItemToInventory('common chest', 100);
        addItemToInventory('uncommon chest', 100);
        addItemToInventory('rare chest', 100);
        addItemToInventory('epic chest', 100);
        addItemToInventory('legendary chest', 100);
    }
    else {
        logMessage('Invalid cheat code', 'fore-red');
        success = false;
    }
    if (success) {
        logMessage(message, 'fore-yellow');
        savePlayerData();
        if (typeof updateHud === 'function') updateHud();
    }
    return success;
}

export function generateItemTooltip(item) {
    // console.log("Generating tooltip for:", item); // Debugging
    if (!item || (!item.name && !item.id)) return 'No item data available.'; // Handle undefined item

    let tooltipHtml = `<div class="tooltip-box-inner">`;
    tooltipHtml += `<div class="tooltip-box-title ${item.colorClass || ''}">${item.displayName || titleCase(item.name || item.id)}</div>`; // Use displayName, then name, then id

    if (item.tooltipDesc) tooltipHtml += `<div class="tooltip-box-desc">${item.tooltipDesc}</div>`;

    let statsHtml = '';
    // Example stats based on common properties. Adjust as needed.
    if (item.min_dmg !== undefined) statsHtml += `<span>Damage: ${item.min_dmg}-${item.max_dmg}</span>`;
    if (item.attack_speed !== undefined) statsHtml += `<span>Speed: ${item.attack_speed.toFixed(1)}</span>`;
    if (item.defense !== undefined) statsHtml += `<span>Defense: ${Math.floor(item.defense * 100)}%</span>`;
    if (item.heal_amount !== undefined) statsHtml += `<span>Heals: ${item.heal_amount} HP</span>`;
    
    if (item.effects && Array.isArray(item.effects)) { // Potion/Elixir effects
        statsHtml += '<span>Effects:<ul>';
        item.effects.forEach(eff => {
            statsHtml += `<li>+${eff.value * 100}% ${eff.type.replace(/_/g, ' ')} (${Math.floor(eff.duration / 60)} min)</li>`;
        });
        statsHtml += '</ul></span>';
    }


    if (item.enchantments && Array.isArray(item.enchantments)) {
        item.enchantments.forEach(ench => {
            const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
            const statDisplay = formatEnchantmentStat(ench.stat, ench.value); // Assuming formatEnchantmentStat is available
            statsHtml += `<span class="${colorClass}">${statDisplay}</span>`;
        });
        if(item.enchantmentCount) {
            statsHtml += `<span class="enchantment-count">Enchants: ${item.enchantmentCount}/12</span>`;
        }
    }


    if (statsHtml) tooltipHtml += `<div class="tooltip-box-stats">${statsHtml}</div>`;

    if (item.value > 0) tooltipHtml += `<div class="tooltip-box-value">Sell: 🪙 ${item.value}g</div>`;
    tooltipHtml += `</div>`;
    return tooltipHtml;
}

// Load playerData on script load
loadPlayerData();