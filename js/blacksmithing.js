/**
 * blacksmithing.js - Blacksmithing module for RuneText
 * Handles smithing and smelting mechanics, UI, and automation
 */

'use strict';

import { playerData, getLevelFromXp, savePlayerData, logMessage, playSound, sounds, getEnchantmentBonus, handleLevelUp } from './utils.js';
import { showSection, updateHud, setActiveSkill, clearActiveSkill } from './ui.js';
import { SWORD_DATA, ARMOR_DATA, HELMET_DATA, RING_DATA, BAR_DATA, getItemDetails } from './data.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { getStructurePerkEffect } from './builds.js';
import { getGuildDoubleCraftingChance } from './guild.js';
import { trackEquipmentCollection, trackItemObtained, isAchievementCompleted } from './achievements.js';

// State variables for blacksmithing
export let isAutoSmelting = false;
export let autoSmeltingInterval = null;
export let currentSmeltingTarget = null;
export let maxSmeltableForCurrentTarget = 0;

export let isAutoSmithing = false;
export let autoSmithingInterval = null;
export let currentSmithingTarget = null;
export let currentSmithingCategory = 'weapons'; // 'weapons', 'armor', 'helmets', 'accessories'

/**
 * Calculates the current smelting action time
 */
export function calculateSmeltingActionTime() {
    const baseTime = 3000;
    let interval = baseTime;
    
    // Apply crafting speed bonus from ring enchantments (reduce time in milliseconds)
    const craftingSpeedBonus = getEnchantmentBonus('crafting_speed');
    if (craftingSpeedBonus > 0) {
        interval -= (craftingSpeedBonus * 1000); // Convert seconds to milliseconds
    }
    
    // Calculate smelt interval with perks and structures
    const effects = getSummedPyramidPerkEffects();
    let totalSpeedBoost = (effects.smelt_speed || 0) + (effects.global_skill_speed_boost || 0);
    
    // Add global skill speed boost from structures
    const structureSpeedBonus = getStructurePerkEffect('stronghold', 'global_skill_speed_boost') || 0;
    totalSpeedBoost += structureSpeedBonus;
    
    interval *= (1 - totalSpeedBoost);
    interval = Math.max(500, interval);
    
    return interval;
}

/**
 * Calculates the current smithing action time
 */
export function calculateSmithingActionTime() {
    const baseTime = 3000;
    let interval = baseTime;
    
    // Apply crafting speed bonus from ring enchantments (reduce time in milliseconds)
    const craftingSpeedBonus = getEnchantmentBonus('crafting_speed');
    if (craftingSpeedBonus > 0) {
        interval -= (craftingSpeedBonus * 1000); // Convert seconds to milliseconds
    }
    
    // Apply speed bonuses from perks and structures (future enhancement)
    const effects = getSummedPyramidPerkEffects();
    let totalSpeedBoost = (effects.smith_speed || 0) + (effects.global_skill_speed_boost || 0);
    
    // Add global skill speed boost from structures
    const structureSpeedBonus = getStructurePerkEffect('stronghold', 'global_skill_speed_boost') || 0;
    totalSpeedBoost += structureSpeedBonus;
    
    if (totalSpeedBoost > 0) {
        interval *= (1 - totalSpeedBoost);
    }
    
    // Minimum interval should be 500ms
    interval = Math.max(500, interval);
    
    return interval;
}

// Utility: Convert a string to Title Case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// Helper function to get achievement ID for armor items
function getArmorAchievementId(armorName) {
    const achievementMap = {
        'bronze chestplate': 'bronzeChestplateDiscovery',
        'iron chestplate': 'ironChestplateDiscovery',
        'steel chestplate': 'steelChestplateDiscovery',
        'mithril chestplate': 'mithrilChestplateDiscovery',
        'adamant chestplate': 'adamantChestplateDiscovery',
        'rune chestplate': 'runeChestplateDiscovery',
        'dragon chestplate': 'dragonChestplateDiscovery'
    };
    return achievementMap[armorName] || null;
}

// Helper function to get achievement ID for helmet items
function getHelmetAchievementId(helmetName) {
    const achievementMap = {
        'full dragon helmet': 'fullDragonHelmetDiscovery'
    };
    return achievementMap[helmetName] || null;
}

/**
 * Show the blacksmithing menu
 */
export function showBlacksmithingMenu() {
    showSection('blacksmithing-menu-section');
}

/**
 * Show the smelting interface
 */
export function showSmeltingMenu() {
    showSection('smelting-section');
    updateSmeltingDisplay();
}

/**
 * Show the smithing interface
 */
export function showSmithingMenu() {
    showSection('smithing-section');
    updateSmithingRecipesDisplay();
}

/**
 * Update the smelting display
 */
function updateSmeltingDisplay() {
    // Check for permit status display
    const smithyPermitStatusDiv = document.getElementById('smithy-permit-status-display');
    if (smithyPermitStatusDiv) {
        const hasSmithyPermit = playerData.permits && playerData.permits.smithy;
        
        if (hasSmithyPermit) {
            smithyPermitStatusDiv.textContent = "📜 Smithy Permit Active: Continuous smelting through level ups!";
            smithyPermitStatusDiv.className = "permit-status";
        } else {
            smithyPermitStatusDiv.textContent = "📜 Smithy Permit Needed: Required to continue smelting after level-ups!";
            smithyPermitStatusDiv.className = "permit-status inactive";
        }
    }
    
    // Use BAR_DATA for bar definitions
    // Get container element
    const smeltingContainer = document.getElementById('available-bars-to-smelt-list');
    if (!smeltingContainer) return;
    
    // Clear container
    smeltingContainer.innerHTML = '';
    
    // Current blacksmithing level
    const bsLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    
    // Create elements for each bar (show all, grey out if locked)
    for (const [barName, barData] of Object.entries(BAR_DATA)) {
        const meetsLevel = bsLevel >= (barData.level_req || barData.level);
        const maxCraftable = calculateMaxCraftableForBar(barName);
        const hasMaterials = maxCraftable > 0;
        const canCraft = meetsLevel && hasMaterials;
        
        const barDiv = document.createElement('div');
        barDiv.className = 'skill-resource mining-resource';
        
        if (!meetsLevel) {
            barDiv.classList.add('greyed-out');
        }
        
        // Add active class if currently auto-smelting this bar
        if (isAutoSmelting && currentSmeltingTarget === barName) {
            barDiv.classList.add('active-resource');
        }
        
        barDiv.style.cursor = canCraft ? 'pointer' : 'not-allowed';
        // Add data-bar-name attribute for reliable selection
        barDiv.setAttribute('data-bar-name', barName);
        // Use emoji and display name from BAR_DATA
        const emoji = barData.emoji || '🔥';
        const displayName = barData.displayName || toTitleCase(barName);
        // Combine Level and XP
        const levelXp = `Level: ${(barData.level_req || barData.level)}  <span class='resource-xp'>+${barData.xp_gain || barData.xp} XP</span>`;
        // Recipe with colored text and emojis if available
        const recipeHtml = Object.entries(barData.recipe)
            .map(([ore, amount]) => {
                const oreDetails = getItemDetails(ore);
                const oreEmoji = oreDetails?.emoji || '';
                const playerHas = playerData.inventory[ore] || 0;
                const hasEnough = playerHas >= amount;
                const colorClass = hasEnough ? 'have-enough' : 'have-not-enough';
                return `<span class='resource-ingredient'>${oreEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(ore)}</span> (<span class="${colorClass}">${playerHas}</span>)</span>`;
            })
            .join(', ');
        barDiv.innerHTML = `
            <div class="resource-icon">${emoji}</div>
            <div class="resource-name">${displayName}</div>
            <div class="resource-details compact-details">
                <div>${levelXp}</div>
                <div class="resource-recipe">Recipe: ${recipeHtml}</div>
                <div>Max: ${maxCraftable}</div>
                ${!meetsLevel ? `<div class='locked-label'>Locked (Level ${(barData.level_req || barData.level)})</div>` : ''}
                ${meetsLevel && !hasMaterials ? `<div class='locked-label'>Insufficient Materials</div>` : ''}
            </div>
            <div class="resource-inventory-count">${playerData.inventory[barName] || 0}</div>
        `;
        // Add click event to the whole container if craftable
        if (canCraft) {
            barDiv.addEventListener('click', () => selectBarForSmelting(barName));
        }
        smeltingContainer.appendChild(barDiv);
    }
}

/**
 * Calculate maximum number of craftable bars based on inventory
 * @param {string} barName - Name of the bar to craft
 * @returns {number} - Maximum number that can be crafted
 */
export function calculateMaxCraftableForBar(barName) {
    const recipe = BAR_DATA[barName];
    if (!recipe || !recipe.recipe) return 0;
    let maxCraftable = Infinity;
    for (const [oreName, oreAmount] of Object.entries(recipe.recipe)) {
        const availableOre = playerData.inventory[oreName] || 0;
        const maxFromThisOre = Math.floor(availableOre / oreAmount);
        maxCraftable = Math.min(maxCraftable, maxFromThisOre);
    }
    return maxCraftable || 0;
}

/**
 * Select a specific bar for smelting
 * @param {string} barName - Name of the bar to smelt
 */
export function selectBarForSmelting(barName) {
    // If already smelting this bar, stop smelting
    if (isAutoSmelting && currentSmeltingTarget === barName) {
        stopAutoSmelting();
        return;
    }
    
    // Otherwise, set up new smelting target
    currentSmeltingTarget = barName;
    maxSmeltableForCurrentTarget = calculateMaxCraftableForBar(barName);
    
    // Check if we can smelt any
    if (maxSmeltableForCurrentTarget <= 0) {
        logMessage(`Not enough materials to smelt ${barName}`, 'fore-red');
        return;
    }
    
    // Start auto smelting
    startAutoSmelting();
    
    // Update UI
    updateSmeltingDisplay();
}

/**
 * Start auto-smelting process
 */
export function startAutoSmelting() {
    if (isAutoSmelting || !currentSmeltingTarget) return;
    
    isAutoSmelting = true;
    
    // Use centralized smelting action time calculation
    const interval = calculateSmeltingActionTime();
    autoSmeltingInterval = setInterval(() => {
        console.log(`[DEBUG] Smelt tick at ${new Date().toLocaleTimeString()}`);
        singleSmeltAction();
    }, interval);
    
    logMessage(`Auto-smelting ${currentSmeltingTarget} started.`, 'fore-cyan');
    updateHud();
    setActiveSkill('bs');
    
    // Add smelting class for animation
    const hudElement = document.getElementById('hud-bs');
    if (hudElement) {
        hudElement.classList.add('smelting');
        hudElement.classList.remove('smithing');
    }
}

/**
 * Stop auto-smelting process
 */
export function stopAutoSmelting() {
    if (!isAutoSmelting) return;
    
    isAutoSmelting = false;
    
    if (autoSmeltingInterval) {
        clearInterval(autoSmeltingInterval);
        autoSmeltingInterval = null;
    }
    
    logMessage('Auto-smelting stopped.', 'fore-warning');
    
    // Update UI
    updateSmeltingDisplay();
    updateHud();
    clearActiveSkill();
    
    // Remove smelting class
    const hudElement = document.getElementById('hud-bs');
    if (hudElement) {
        hudElement.classList.remove('smelting');
    }
}

/**
 * Perform a single smelting action
 */
export function singleSmeltAction() {
    if (!isAutoSmelting || !currentSmeltingTarget) {
        stopAutoSmelting();
        return;
    }
    const recipe = BAR_DATA[currentSmeltingTarget];
    if (!recipe || !recipe.recipe) {
        stopAutoSmelting();
        return;
    }
    // Check if player has required level
    if (getLevelFromXp(playerData.skills.blacksmithing.xp) < (recipe.level_req || recipe.level)) {
        logMessage(`You need level ${(recipe.level_req || recipe.level)} Blacksmithing to smelt ${currentSmeltingTarget}`, 'fore-red');
        stopAutoSmelting();
        return;
    }
    // Check if player has required ores
    for (const [oreName, oreAmount] of Object.entries(recipe.recipe)) {
        const availableOre = playerData.inventory[oreName] || 0;
        if (availableOre < oreAmount) {
            logMessage(`Not enough ${oreName} to continue smelting ${currentSmeltingTarget}`, 'fore-red');
            stopAutoSmelting();
            return;
        }
    }
    // Consume ores
    for (const [oreName, oreAmount] of Object.entries(recipe.recipe)) {
        playerData.inventory[oreName] -= oreAmount;
    }
    
    // Determine bar yield with double crafting chance
    let barYield = 1;
    const doubleCraftChance = getGuildDoubleCraftingChance();
    if (doubleCraftChance > 0 && Math.random() < doubleCraftChance) {
        barYield = 2;
        logMessage(`Guild bonus: Double yield! Got ${barYield} ${currentSmeltingTarget}!`, 'fore-cyan', '✨');
    }
    
    // Add bar to inventory
    playerData.inventory[currentSmeltingTarget] = (playerData.inventory[currentSmeltingTarget] || 0) + barYield;
    // Track item discovery for achievements
    trackItemObtained(currentSmeltingTarget);
    // Grant XP (with xp_boost perks)
    const oldLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    const smeltEffects = getSummedPyramidPerkEffects();
    const xpBoost = smeltEffects.xp_boost_percentage_blacksmithing || 0;
    const xpGain = Math.floor((recipe.xp_gain || recipe.xp) * (1 + xpBoost));
    playerData.skills.blacksmithing.xp += xpGain;
    // Play smelting sound
    if (sounds && sounds.smelting) {
        const smeltingSound = typeof sounds.smelting === 'function' ? sounds.smelting() : sounds.smelting;
        playSound(smeltingSound);
    }
    // Log the action
    logMessage(`+${barYield} ${currentSmeltingTarget} smelted! (+${xpGain} XP)`, 'fore-cyan');
    // Show static gain text on the bar container
    const smeltingContainer = document.getElementById('available-bars-to-smelt-list');
    let gainTextShown = false;
    if (smeltingContainer) {
        const barData = BAR_DATA[currentSmeltingTarget];
        const barDiv = smeltingContainer.querySelector(`.mining-resource[data-bar-name="${currentSmeltingTarget}"]`);
        if (barDiv) {
            showStaticGainText(barDiv, `+${barYield}  ${barData.emoji}  (+${barData.xp_gain || barData.xp} XP)`, true, true);
            // Highlight active container
            Array.from(smeltingContainer.getElementsByClassName('mining-resource')).forEach(div => div.classList.remove('active-resource'));
            barDiv.classList.add('active-resource');
            gainTextShown = true;
        }
    }
    // Check for level up
    const newLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('blacksmithing', oldLevel, newLevel);
        
        // Check for smithy permit
        if (!playerData.permits || !playerData.permits.smithy) {
            logMessage("Purchase a Smithy Permit to continue smelting through level ups!", "fore-warning", "📜");
            stopAutoSmelting();
        }
    }
    // Recalculate max smeltable
    maxSmeltableForCurrentTarget = calculateMaxCraftableForBar(currentSmeltingTarget);
    // Stop if we can't smelt any more
    if (maxSmeltableForCurrentTarget <= 0) {
        logMessage(`No more materials to smelt ${currentSmeltingTarget}`, 'fore-warning');
        stopAutoSmelting();
    }
    // Save game data
    savePlayerData();
    // Delay UI update if gain text was shown
    if (gainTextShown) {
        setTimeout(() => {
            updateSmeltingDisplay();
            updateHud();
        }, 1200);
    } else {
        updateSmeltingDisplay();
        updateHud();
    }
}

// Helper to show static gain text inside a resource container
function showStaticGainText(container, text, right = false, small = false) {
    if (!container) return;
    // Remove any existing static gain text
    const prev = container.querySelector('.static-gain-text');
    if (prev) prev.remove();
    const gainDiv = document.createElement('div');
    gainDiv.className = 'static-gain-text' + (right ? ' right' : '') + (small ? ' small' : '');
    gainDiv.innerHTML = text;
    container.appendChild(gainDiv);
    setTimeout(() => {
        if (gainDiv.parentNode) gainDiv.parentNode.removeChild(gainDiv);
    }, 1200);
}

/**
 * Update the smithing recipes display
 */
export function updateSmithingRecipesDisplay() {
    // Show the appropriate category first
    showSmithingCategory(currentSmithingCategory);
    
    if (currentSmithingCategory === 'weapons') {
        populateSmithingWeapons();
    } else if (currentSmithingCategory === 'armor') {
        populateSmithingArmor();
    } else if (currentSmithingCategory === 'helmets') {
        populateSmithingHelmets();
    } else if (currentSmithingCategory === 'accessories') {
        populateSmithingAccessories();
    }
}

/**
 * Populate the sword smelting grid with craftable swords
 */
export function populateSwordSmeltingGrid() {
    const container = document.getElementById('smithing-weapons-category-list');
    if (!container) return;
    container.innerHTML = '';
    for (const [swordName, swordData] of Object.entries(SWORD_DATA)) {
        const meetsLevel = getLevelFromXp(playerData.skills.blacksmithing.xp) >= swordData.smith_level_req;
        // Calculate max craftable
        let maxCraftable = Infinity;
        Object.entries(swordData.recipe).forEach(([item, amount]) => {
            const playerHas = playerData.inventory[item] || 0;
            const canCraft = Math.floor(playerHas / amount);
            maxCraftable = Math.min(maxCraftable, canCraft);
        });
        if (!isFinite(maxCraftable)) maxCraftable = 0;
        const hasMaterials = maxCraftable > 0;
        const canCraft = meetsLevel && hasMaterials;
        const inventoryCount = playerData.inventory[swordName] || 0;
        
        const div = document.createElement('div');
        div.className = 'skill-resource mining-resource';
        
        if (!meetsLevel) {
            div.classList.add('greyed-out');
        }
        
        div.style.cursor = canCraft ? 'pointer' : 'not-allowed';
        
        // Add data attribute for 2-handed swords to enable smaller container styling
        if (swordName.includes('2h sword')) {
            div.setAttribute('data-weapon-type', '2h-sword');
        }
        
        // Use image if available, otherwise fallback to emoji
        const iconHtml = `<img src="assets/${swordName.toLowerCase().replace(/ /g, '-').replace('-2h-sword', '-2hsword')}.png" alt="${toTitleCase(swordName)}" class="inventory-item-icon">`;
        // Combine Level and XP
        const levelXp = `Level: ${swordData.smith_level_req}  <span class='resource-xp'>+${swordData.xp_gain} XP</span>`;
        // Recipe with colored text and emojis if available
        const recipeHtml = Object.entries(swordData.recipe)
            .map(([item, amount]) => {
                const itemDetails = getItemDetails(item);
                const itemEmoji = itemDetails?.emoji || '';
                const playerHas = playerData.inventory[item] || 0;
                const hasEnough = playerHas >= amount;
                const colorClass = hasEnough ? 'have-enough' : 'have-not-enough';
                return `<span class='resource-ingredient'>${itemEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(item)}</span> (<span class="${colorClass}">${playerHas}</span>)</span>`;
            })
            .join(', ');
        div.innerHTML = `
            <div class="resource-icon" style="color: ${swordData.color}">${iconHtml}</div>
            <div class="resource-name">${swordData.displayName || toTitleCase(swordName)}</div>
            <div class="resource-details compact-details">
                <div>${levelXp}</div>
                <div class="resource-recipe">Recipe: ${recipeHtml}</div>
                <div>Max: ${maxCraftable}</div>
                ${!meetsLevel ? `<div class='locked-label'>Locked (Level ${swordData.smith_level_req})</div>` : ''}
                ${meetsLevel && !hasMaterials ? `<div class='locked-label'>Insufficient Materials</div>` : ''}
            </div>
            <div class="resource-inventory-count">${inventoryCount}</div>
        `;
        // Add active class if currently auto-smithing this weapon
        if (isAutoSmithing && currentSmithingTarget === swordName && currentSmithingCategory === 'weapons') {
            div.classList.add('active-resource');
        }
        // Add click event to the whole container if craftable
        if (canCraft) {
            div.addEventListener('click', () => selectWeaponForAutoSmithing(swordName));
        }
        container.appendChild(div);
    }
}

/**
 * Select a weapon for auto-smithing (toggle)
 * @param {string} swordName - Name of the sword to smith
 */
function selectWeaponForAutoSmithing(swordName) {
    // If already auto-smithing this weapon, stop
    if (isAutoSmithing && currentSmithingTarget === swordName && currentSmithingCategory === 'weapons') {
        stopAutoSmithing();
        return;
    }
    // Otherwise, set up new smithing target
    currentSmithingTarget = swordName;
    currentSmithingCategory = 'weapons';
    startAutoSmithing();
    updateSmithingRecipesDisplay();
}

/**
 * Select armor for auto-smithing (toggle)
 * @param {string} armorName - Name of the armor to smith
 */
function selectArmorForAutoSmithing(armorName) {
    // If already auto-smithing this armor, stop
    if (isAutoSmithing && currentSmithingTarget === armorName && currentSmithingCategory === 'armor') {
        stopAutoSmithing();
        return;
    }
    // Otherwise, set up new smithing target
    currentSmithingTarget = armorName;
    currentSmithingCategory = 'armor';
    startAutoSmithing();
    updateSmithingRecipesDisplay();
}

/**
 * Select a helmet for auto-smithing (toggle)
 * @param {string} helmetName - Name of the helmet to smith
 */
function selectHelmetForAutoSmithing(helmetName) {
    // If already auto-smithing this helmet, stop
    if (isAutoSmithing && currentSmithingTarget === helmetName && currentSmithingCategory === 'helmets') {
        stopAutoSmithing();
        return;
    }
    // Otherwise, set up new smithing target
    currentSmithingTarget = helmetName;
    currentSmithingCategory = 'helmets';
    startAutoSmithing();
    updateSmithingRecipesDisplay();
}

/**
 * Select an accessory for auto-smithing (toggle)
 * @param {string} accessoryName - Name of the accessory to smith
 */
function selectAccessoryForAutoSmithing(accessoryName) {
    // If already auto-smithing this accessory, stop
    if (isAutoSmithing && currentSmithingTarget === accessoryName && currentSmithingCategory === 'accessories') {
        stopAutoSmithing();
        return;
    }
    // Otherwise, set up new smithing target
    currentSmithingTarget = accessoryName;
    currentSmithingCategory = 'accessories';
    startAutoSmithing();
    updateSmithingRecipesDisplay();
}

/**
 * Craft a sword
 * @param {string} swordName - Name of the sword to craft
 */
export function craftSword(swordName) {
    const swordData = SWORD_DATA[swordName];
    // Check if player has required bars
    const hasRequiredBars = Object.entries(swordData.recipe).every(([item, amount]) => {
        return playerData.inventory[item] >= amount;
    });
    if (!hasRequiredBars) {
        logMessage(`Insufficient materials to craft ${swordName}`, "fore-red");
        return;
    }
    // Check smithing level
    if (getLevelFromXp(playerData.skills.blacksmithing.xp) < swordData.smith_level_req) {
        logMessage(`Insufficient smithing level to craft ${swordName}`, "fore-red");
        return;
    }
    // Deduct materials
    Object.entries(swordData.recipe).forEach(([item, amount]) => {
        playerData.inventory[item] -= amount;
    });
    
    // Determine yield with double crafting chance
    let swordYield = 1;
    const doubleCraftChance = getGuildDoubleCraftingChance();
    if (doubleCraftChance > 0 && Math.random() < doubleCraftChance) {
        swordYield = 2;
        logMessage(`Guild bonus: Double yield! Got ${swordYield} ${swordName}!`, 'fore-cyan', '✨');
    }
    
    // Add sword to inventory
    playerData.inventory[swordName] = (playerData.inventory[swordName] || 0) + swordYield;
    trackEquipmentCollection(swordName, 'weapon');
    trackItemObtained(swordName);
    // Grant XP
    const oldLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    playerData.skills.blacksmithing.xp += swordData.xp_gain;
    const newLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('blacksmithing', oldLevel, newLevel);
        
        // Check for smithy permit when smithing
        if (isAutoSmithing && (!playerData.permits || !playerData.permits.smithy)) {
            logMessage("Purchase a Smithy Permit to continue smithing through level ups!", "fore-warning", "📜");
            stopAutoSmithing();
        }
    }
    // Play smithing sound
    if (sounds && sounds.smithing) {
        const smithingSound = typeof sounds.smithing === 'function' ? sounds.smithing() : sounds.smithing;
        playSound(smithingSound);
    }
    // Update UI
    populateSwordSmeltingGrid();
    updateHud();
    // Log message with XP
    logMessage(`Crafted ${swordYield}x ${swordData.emoji} ${swordName}! (+${swordData.xp_gain} XP)`, swordData.color);
    // Show static gain text on the weapon container
    const smithingContainer = document.getElementById('smithing-weapons-category-list');
    if (smithingContainer) {
        const displayName = swordData.displayName || toTitleCase(swordName);
        const weaponDiv = Array.from(smithingContainer.getElementsByClassName('mining-resource')).find(div => {
            return div.querySelector('.resource-name') && div.querySelector('.resource-name').textContent === displayName;
        });
        if (weaponDiv) {
            showStaticGainText(weaponDiv, `+${swordYield}  ${swordData.emoji}  (+${swordData.xp_gain} XP)`, true);
        }
    }
    // Save game data
    savePlayerData();
}

/**
 * Populate the smithing weapons display
 */
export function populateSmithingWeapons() {
    populateSwordSmeltingGrid();
}

/**
 * Populate the smithing armor display
 */
export function populateSmithingArmor() {
    const container = document.getElementById('smithing-armor-category-list');
    if (!container) return;
    container.innerHTML = '';
    
    let hasUnlockedArmor = false;
    
    for (const [armorName, armorData] of Object.entries(ARMOR_DATA)) {
        // Check if armor has been unlocked via achievement (unless in god mode)
        const godMode = !!playerData.godModeActive;
        
        // Get the corresponding achievement ID for this armor
        const achievementId = getArmorAchievementId(armorName);
        const isUnlocked = godMode || isAchievementCompleted(achievementId);
        
        // Skip locked armor entirely - don't show them in the interface
        if (!isUnlocked) {
            continue;
        }
        
        hasUnlockedArmor = true;
        
        const meetsLevel = getLevelFromXp(playerData.skills.blacksmithing.xp) >= armorData.smith_level_req;
        
        // Calculate max craftable
        let maxCraftable = Infinity;
        Object.entries(armorData.recipe).forEach(([item, amount]) => {
            const playerHas = playerData.inventory[item] || 0;
            const canCraft = Math.floor(playerHas / amount);
            maxCraftable = Math.min(maxCraftable, canCraft);
        });
        if (!isFinite(maxCraftable)) maxCraftable = 0;
        
        const hasRequiredBars = meetsLevel && maxCraftable > 0;
        const inventoryCount = playerData.inventory[armorName] || 0;
        
        const div = document.createElement('div');
        div.className = 'skill-resource mining-resource';
        
        if (!meetsLevel) {
            div.classList.add('greyed-out');
        }
        
        div.style.cursor = hasRequiredBars ? 'pointer' : 'not-allowed';

        // Use image for armor icon
        const iconHtml = `<img src="assets/${armorName.toLowerCase().replace(/ /g, '-')}.png" alt="${toTitleCase(armorName)}" class="inventory-item-icon">`;
        
        // Combine Level and XP
        const levelXp = `Level: ${armorData.smith_level_req}  <span class='resource-xp'>+${armorData.xp_gain} XP</span>`;
        
        // Recipe with colored text and emojis if available
        const recipeHtml = Object.entries(armorData.recipe)
            .map(([item, amount]) => {
                const itemDetails = getItemDetails(item);
                const itemEmoji = itemDetails?.emoji || '';
                const playerHas = playerData.inventory[item] || 0;
                const hasEnough = playerHas >= amount;
                const colorClass = hasEnough ? 'have-enough' : 'have-not-enough';
                return `<span class='resource-ingredient'>${itemEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(item)}</span> (<span class="${colorClass}">${playerHas}</span>)</span>`;
            })
            .join(', ');

        div.innerHTML = `
            <div class="resource-icon" style="color: ${armorData.color}">${iconHtml}</div>
            <div class="resource-name">${toTitleCase(armorName)}</div>
            <div class="resource-details compact-details">
                <div>${levelXp}</div>
                <div class="resource-recipe">Recipe: ${recipeHtml}</div>
                <div>Max: ${maxCraftable}</div>
                <div>Defense: +${(armorData.defense * 100).toFixed(1)}%</div>
                ${!meetsLevel ? `<div class='locked-label'>Locked (Level ${armorData.smith_level_req})</div>` : ''}
                ${meetsLevel && !hasRequiredBars ? `<div class='locked-label'>Insufficient Materials</div>` : ''}
            </div>
            <div class="resource-inventory-count">${inventoryCount}</div>
        `;
        
        // Add active class if currently auto-smithing this armor
        if (isAutoSmithing && currentSmithingTarget === armorName && currentSmithingCategory === 'armor') {
            div.classList.add('active-resource');
        }
        
        // Add click event to the whole container if craftable
        if (hasRequiredBars) {
            div.addEventListener('click', () => selectArmorForAutoSmithing(armorName));
        }
        
        container.appendChild(div);
    }
    
    // Show message if no armor is unlocked
    if (!hasUnlockedArmor) {
        container.innerHTML = '<p class="no-items-message">No armor unlocked yet. Find chestplates as loot to unlock crafting!</p>';
    }
}

/**
 * Populate the smithing helmets display
 */
export function populateSmithingHelmets() {
    const container = document.getElementById('smithing-helmets-category-list');
    if (!container) return;
    container.innerHTML = '';
    
    let hasUnlockedHelmets = false;
    
    for (const [helmetName, helmetData] of Object.entries(HELMET_DATA)) {
        // Check if helmet has been unlocked via achievement (unless in god mode)
        const godMode = !!playerData.godModeActive;
        
        // Get the corresponding achievement ID for this helmet
        const achievementId = getHelmetAchievementId(helmetName);
        const isUnlocked = godMode || isAchievementCompleted(achievementId);
        
        // Skip locked helmets entirely - don't show them in the interface
        if (!isUnlocked) {
            continue;
        }
        
        hasUnlockedHelmets = true;
        
        const meetsLevel = getLevelFromXp(playerData.skills.blacksmithing.xp) >= helmetData.smith_level_req;
        
        // Calculate max craftable
        let maxCraftable = Infinity;
        Object.entries(helmetData.recipe).forEach(([item, amount]) => {
            const playerHas = playerData.inventory[item] || 0;
            const canCraft = Math.floor(playerHas / amount);
            maxCraftable = Math.min(maxCraftable, canCraft);
        });
        if (!isFinite(maxCraftable)) maxCraftable = 0;
        
        const hasRequiredBars = meetsLevel && maxCraftable > 0;
        const inventoryCount = playerData.inventory[helmetName] || 0;
        
        const div = document.createElement('div');
        div.className = 'skill-resource mining-resource';
        
        if (!meetsLevel) {
            div.classList.add('greyed-out');
        }
        
        div.style.cursor = hasRequiredBars ? 'pointer' : 'not-allowed';

        // Use image for helmet icon
        let imageName = helmetName.toLowerCase().replace(/ /g, '-');
        // Special case for Full Dragon Helmet
        if (helmetName === 'full dragon helmet') {
            imageName = 'Dragon-Full-Helmet';
        }
        const iconHtml = `<img src="assets/${imageName}.png" alt="${toTitleCase(helmetName)}" class="inventory-item-icon">`;
        
        // Combine Level and XP
        const levelXp = `Level: ${helmetData.smith_level_req}  <span class='resource-xp'>+${helmetData.xp_gain} XP</span>`;
        
        // Recipe with colored text and emojis if available
        const recipeHtml = Object.entries(helmetData.recipe)
            .map(([item, amount]) => {
                const itemDetails = getItemDetails(item);
                const itemEmoji = itemDetails?.emoji || '';
                const playerHas = playerData.inventory[item] || 0;
                const hasEnough = playerHas >= amount;
                const colorClass = hasEnough ? 'have-enough' : 'have-not-enough';
                return `<span class='resource-ingredient'>${itemEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(item)}</span> (<span class="${colorClass}">${playerHas}</span>)</span>`;
            })
            .join(', ');

        div.innerHTML = `
            <div class="resource-icon" style="color: ${helmetData.color}">${iconHtml}</div>
            <div class="resource-name">${toTitleCase(helmetName)}</div>
            <div class="resource-details compact-details">
                <div>${levelXp}</div>
                <div class="resource-recipe">Recipe: ${recipeHtml}</div>
                <div>Max: ${maxCraftable}</div>
                <div>Defense: +${(helmetData.defense * 100).toFixed(1)}%</div>
                <div>Block: ${(helmetData.block_chance * 100).toFixed(1)}% chance, ${helmetData.block_amount} amount</div>
                ${!meetsLevel ? `<div class='locked-label'>Locked (Level ${helmetData.smith_level_req})</div>` : ''}
                ${meetsLevel && !hasRequiredBars ? `<div class='locked-label'>Insufficient Materials</div>` : ''}
            </div>
            <div class="resource-inventory-count">${inventoryCount}</div>
        `;
        
        // Add active class if currently auto-smithing this helmet
        if (isAutoSmithing && currentSmithingTarget === helmetName && currentSmithingCategory === 'helmets') {
            div.classList.add('active-resource');
        }
        
        // Add click event to the whole container if craftable
        if (hasRequiredBars) {
            div.addEventListener('click', () => selectHelmetForAutoSmithing(helmetName));
        }
        
        container.appendChild(div);
    }
    
    // Show message if no helmets are unlocked
    if (!hasUnlockedHelmets) {
        container.innerHTML = '<p class="no-items-message">No helmets unlocked yet. Find helmets as loot to unlock crafting!</p>';
    }
}

/**
 * Populate the smithing accessories display
 */
export function populateSmithingAccessories() {
    const container = document.getElementById('smithing-accessories-category-list');
    if (!container) return;
    container.innerHTML = '';
    
    for (const [ringName, ringData] of Object.entries(RING_DATA)) {
        const meetsLevel = getLevelFromXp(playerData.skills.blacksmithing.xp) >= ringData.smith_level_req;
        
        // Calculate max craftable
        let maxCraftable = Infinity;
        Object.entries(ringData.recipe).forEach(([item, amount]) => {
            const playerHas = playerData.inventory[item] || 0;
            const canCraft = Math.floor(playerHas / amount);
            maxCraftable = Math.min(maxCraftable, canCraft);
        });
        if (!isFinite(maxCraftable)) maxCraftable = 0;
        
        const hasRequiredBars = meetsLevel && maxCraftable > 0;
        const inventoryCount = playerData.inventory[ringName] || 0;
        
        const div = document.createElement('div');
        div.className = 'skill-resource mining-resource';
        
        if (!meetsLevel) {
            div.classList.add('greyed-out');
        }
        
        div.style.cursor = hasRequiredBars ? 'pointer' : 'not-allowed';
        
        // Combine Level and XP
        const levelXp = `Level: ${ringData.smith_level_req}  <span class='resource-xp'>+${ringData.xp_gain} XP</span>`;
        
        // Recipe with colored text and emojis if available
        const recipeHtml = Object.entries(ringData.recipe)
            .map(([item, amount]) => {
                const itemDetails = getItemDetails(item);
                const itemEmoji = itemDetails?.emoji || '';
                const playerHas = playerData.inventory[item] || 0;
                const hasEnough = playerHas >= amount;
                const colorClass = hasEnough ? 'have-enough' : 'have-not-enough';
                return `<span class='resource-ingredient'>${itemEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(item)}</span> (<span class="${colorClass}">${playerHas}</span>)</span>`;
            })
            .join(', ');

        div.innerHTML = `
            <div class="resource-icon" style="color: ${ringData.color}">${ringData.emoji}</div>
            <div class="resource-name">${toTitleCase(ringName)}</div>
            <div class="resource-details compact-details">
                <div>${levelXp}</div>
                <div class="resource-recipe">Recipe: ${recipeHtml}</div>
                <div>Max: ${maxCraftable}</div>
                <div>Stats: +${ringData.hp_bonus} HP, +${(ringData.crit_chance * 100).toFixed(1)}% Crit, +${(ringData.str_percentage * 100).toFixed(1)}% Str</div>
                ${!meetsLevel ? `<div class='locked-label'>Locked (Level ${ringData.smith_level_req})</div>` : ''}
                ${meetsLevel && !hasRequiredBars ? `<div class='locked-label'>Insufficient Materials</div>` : ''}
            </div>
            <div class="resource-inventory-count">${inventoryCount}</div>
        `;
        
        // Add active class if currently auto-smithing this accessory
        if (isAutoSmithing && currentSmithingTarget === ringName && currentSmithingCategory === 'accessories') {
            div.classList.add('active-resource');
        }
        
        // Add click event to the whole container if craftable
        if (hasRequiredBars) {
            div.addEventListener('click', () => selectAccessoryForAutoSmithing(ringName));
        }
        
        container.appendChild(div);
    }
}

/**
 * Craft ring item
 * @param {string} ringName - Name of the ring to craft
 */
export function craftRing(ringName) {
    const ringData = RING_DATA[ringName];
    
    // Check if player has required bars
    const hasRequiredBars = Object.entries(ringData.recipe).every(([item, amount]) => {
        return playerData.inventory[item] >= amount;
    });

    if (!hasRequiredBars) {
        logMessage(`Insufficient materials to craft ${ringName}`, "fore-red");
        return;
    }

    // Check smithing level
    if (getLevelFromXp(playerData.skills.blacksmithing.xp) < ringData.smith_level_req) {
        logMessage(`Insufficient smithing level to craft ${ringName}`, "fore-red");
        return;
    }

    // Deduct materials
    Object.entries(ringData.recipe).forEach(([item, amount]) => {
        playerData.inventory[item] -= amount;
    });

    // Determine yield with double crafting chance
    let ringYield = 1;
    const doubleCraftChance = getGuildDoubleCraftingChance();
    if (doubleCraftChance > 0 && Math.random() < doubleCraftChance) {
        ringYield = 2;
        logMessage(`Guild bonus: Double yield! Got ${ringYield} ${ringName}!`, 'fore-cyan', '✨');
    }

    // Add ring to inventory
    playerData.inventory[ringName] = (playerData.inventory[ringName] || 0) + ringYield;
    trackEquipmentCollection(ringName, 'ring');
    trackItemObtained(ringName);
    
    // Grant XP
    const oldLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    playerData.skills.blacksmithing.xp += ringData.xp_gain;
    const newLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('blacksmithing', oldLevel, newLevel);
        
        // Check for smithy permit when smithing
        if (isAutoSmithing && (!playerData.permits || !playerData.permits.smithy)) {
            logMessage("Purchase a Smithy Permit to continue smithing through level ups!", "fore-warning", "📜");
            stopAutoSmithing();
        }
    }
    
    // Play smithing sound
    if (sounds && sounds.smithing) {
        const smithingSound = typeof sounds.smithing === 'function' ? sounds.smithing() : sounds.smithing;
        playSound(smithingSound);
    }
    
    // Update UI
    populateSmithingAccessories();
    updateHud();
    savePlayerData();
    
    // Log message
    logMessage(`Crafted ${ringYield} ${ringName}! (+${ringData.xp_gain} Blacksmithing XP)`, "fore-yellow", "💍");
}

/**
 * Craft armor item
 * @param {string} armorName - Name of the armor to craft
 */
export function craftArmor(armorName) {
    const armorData = ARMOR_DATA[armorName];
    
    // Check if player has required bars
    const hasRequiredBars = Object.entries(armorData.recipe).every(([item, amount]) => {
        return playerData.inventory[item] >= amount;
    });

    if (!hasRequiredBars) {
        logMessage(`Insufficient materials to craft ${armorName}`, "fore-red");
        return;
    }

    // Check smithing level
    if (getLevelFromXp(playerData.skills.blacksmithing.xp) < armorData.smith_level_req) {
        logMessage(`Insufficient smithing level to craft ${armorName}`, "fore-red");
        return;
    }

    // Deduct materials
    Object.entries(armorData.recipe).forEach(([item, amount]) => {
        playerData.inventory[item] -= amount;
    });

    // Determine yield with double crafting chance
    let armorYield = 1;
    const doubleCraftChance = getGuildDoubleCraftingChance();
    if (doubleCraftChance > 0 && Math.random() < doubleCraftChance) {
        armorYield = 2;
        logMessage(`Guild bonus: Double yield! Got ${armorYield} ${armorName}!`, 'fore-cyan', '✨');
    }

    // Add armor to inventory
    playerData.inventory[armorName] = (playerData.inventory[armorName] || 0) + armorYield;
    trackEquipmentCollection(armorName, 'armor');
    trackItemObtained(armorName);
    // Grant XP
    const oldLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    playerData.skills.blacksmithing.xp += armorData.xp_gain;
    const newLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('blacksmithing', oldLevel, newLevel);
        
        // Check for smithy permit when smithing
        if (isAutoSmithing && (!playerData.permits || !playerData.permits.smithy)) {
            logMessage("Purchase a Smithy Permit to continue smithing through level ups!", "fore-warning", "📜");
            stopAutoSmithing();
        }
    }
    
    // Play smithing sound
    if (sounds && sounds.smithing) {
        const smithingSound = typeof sounds.smithing === 'function' ? sounds.smithing() : sounds.smithing;
        playSound(smithingSound);
    }
    
    // Update UI
    populateSmithingArmor();
    updateHud();

    logMessage(`Crafted ${armorYield}x ${armorData.emoji} ${armorName}!`, armorData.color);
    
    // Save game data
    savePlayerData();
}

/**
 * Craft helmet item
 * @param {string} helmetName - Name of the helmet to craft
 */
export function craftHelmet(helmetName) {
    const helmetData = HELMET_DATA[helmetName];
    
    // Check if player has required materials
    const hasRequiredBars = Object.entries(helmetData.recipe).every(([item, amount]) => {
        return playerData.inventory[item] >= amount;
    });

    if (!hasRequiredBars) {
        logMessage(`Insufficient materials to craft ${helmetName}`, "fore-red");
        return;
    }

    // Check smithing level
    if (getLevelFromXp(playerData.skills.blacksmithing.xp) < helmetData.smith_level_req) {
        logMessage(`Insufficient smithing level to craft ${helmetName}`, "fore-red");
        return;
    }

    // Deduct materials
    Object.entries(helmetData.recipe).forEach(([item, amount]) => {
        playerData.inventory[item] -= amount;
    });

    // Determine yield with double crafting chance
    let helmetYield = 1;
    const doubleCraftChance = getGuildDoubleCraftingChance();
    if (doubleCraftChance > 0 && Math.random() < doubleCraftChance) {
        helmetYield = 2;
        logMessage(`Guild bonus: Double yield! Got ${helmetYield} ${helmetName}!`, 'fore-cyan', '✨');
    }

    // Add helmet to inventory
    playerData.inventory[helmetName] = (playerData.inventory[helmetName] || 0) + helmetYield;
    trackEquipmentCollection(helmetName, 'helmet');
    trackItemObtained(helmetName);
    // Grant XP
    const oldLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    playerData.skills.blacksmithing.xp += helmetData.xp_gain;
    const newLevel = getLevelFromXp(playerData.skills.blacksmithing.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('blacksmithing', oldLevel, newLevel);
        
        // Check for smithy permit when smithing
        if (isAutoSmithing && (!playerData.permits || !playerData.permits.smithy)) {
            logMessage("Purchase a Smithy Permit to continue smithing through level ups!", "fore-warning", "📜");
            stopAutoSmithing();
        }
    }
    
    // Play smithing sound
    if (sounds && sounds.smithing) {
        const smithingSound = typeof sounds.smithing === 'function' ? sounds.smithing() : sounds.smithing;
        playSound(smithingSound);
    }
    
    // Update UI
    populateSmithingHelmets();
    updateHud();

    logMessage(`Crafted ${helmetYield}x ${helmetData.emoji} ${helmetName}!`, helmetData.color);
    
    // Save game data
    savePlayerData();
}

/**
 * Show specific smithing category
 * @param {string} category - Category to show ('weapons', 'armor', 'helmets')
 */
export function showSmithingCategory(category) {
    // Hide all category lists
    const weaponsList = document.getElementById('smithing-weapons-category-list');
    const armorList = document.getElementById('smithing-armor-category-list');
    const helmetsList = document.getElementById('smithing-helmets-category-list');
    const accessoriesList = document.getElementById('smithing-accessories-category-list');
    if (weaponsList) weaponsList.classList.add('hidden');
    if (armorList) armorList.classList.add('hidden');
    if (helmetsList) helmetsList.classList.add('hidden');
    if (accessoriesList) accessoriesList.classList.add('hidden');
    // Show selected category
    if (category === 'weapons' && weaponsList) weaponsList.classList.remove('hidden');
    if (category === 'armor' && armorList) armorList.classList.remove('hidden');
    if (category === 'helmets' && helmetsList) helmetsList.classList.remove('hidden');
    if (category === 'accessories' && accessoriesList) accessoriesList.classList.remove('hidden');
    currentSmithingCategory = category;
    
    // Populate the selected category
    if (category === 'weapons') {
        populateSmithingWeapons();
    } else if (category === 'armor') {
        populateSmithingArmor();
    } else if (category === 'helmets') {
        populateSmithingHelmets();
    } else if (category === 'accessories') {
        populateSmithingAccessories();
    }
    
    // Toggle tab buttons
    const weaponsTabBtn = document.getElementById('smithing-weapons-tab-btn');
    const armorTabBtn = document.getElementById('smithing-armor-tab-btn');
    const helmetsTabBtn = document.getElementById('smithing-helmets-tab-btn');
    const accessoriesTabBtn = document.getElementById('smithing-accessories-tab-btn');
    if (weaponsTabBtn) weaponsTabBtn.classList.toggle('active-tab', category === 'weapons');
    if (armorTabBtn) armorTabBtn.classList.toggle('active-tab', category === 'armor');
    if (helmetsTabBtn) helmetsTabBtn.classList.toggle('active-tab', category === 'helmets');
    if (accessoriesTabBtn) accessoriesTabBtn.classList.toggle('active-tab', category === 'accessories');
}

/**
 * Calculate maximum number of craftable items
 * @param {string} itemName - Name of the item
 * @param {Object} recipe - Recipe data
 * @returns {number} - Maximum number that can be crafted
 */
export function calculateMaxCraftableForItem(itemName, recipe) {
    if (!recipe) return 0;
    let maxCraftable = Infinity;
    Object.entries(recipe).forEach(([item, amount]) => {
        const playerHas = playerData.inventory[item] || 0;
        const canCraft = Math.floor(playerHas / amount);
        maxCraftable = Math.min(maxCraftable, canCraft);
    });
    return maxCraftable;
}

/**
 * Select an item for smithing
 * @param {string} itemName - Name of the item to smith
 * @param {string} category - Category of the item ('weapons', 'armor', 'helmets')
 */
export function selectItemForSmithing(itemName, category) {
    currentSmithingTarget = itemName;
    currentSmithingCategory = category;
    // Update UI to show selection
    updateSmithingRecipesDisplay();
    logMessage(`Selected ${itemName} for smithing.`, 'fore-cyan');
}

/**
 * Start auto-smithing process
 */
export function startAutoSmithing() {
    if (isAutoSmithing || !currentSmithingTarget) return;
    isAutoSmithing = true;
    
    // Use centralized smithing action time calculation
    const interval = calculateSmithingActionTime();
    
    autoSmithingInterval = setInterval(() => {
        console.log(`[DEBUG] Smith tick at ${new Date().toLocaleTimeString()}`);
        if (!checkCanStillSmith()) {
            stopAutoSmithing();
            return;
        }
        singleSmithAction();
    }, interval);
    logMessage(`Auto-smithing ${currentSmithingTarget} started.`, 'fore-cyan');
    updateHud();
    setActiveSkill('bs');
    
    // Add smithing class for animation
    const hudElement = document.getElementById('hud-bs');
    if (hudElement) {
        hudElement.classList.add('smithing');
        hudElement.classList.remove('smelting');
    }
}

/**
 * Stop auto-smithing process
 */
export function stopAutoSmithing() {
    if (!isAutoSmithing) return;
    isAutoSmithing = false;
    if (autoSmithingInterval) {
        clearInterval(autoSmithingInterval);
        autoSmithingInterval = null;
    }
    logMessage(`Auto-smithing stopped.`, 'fore-warning');
    // Update UI
    updateSmithingRecipesDisplay();
    updateHud();
    clearActiveSkill();
    
    // Remove smithing class
    const hudElement = document.getElementById('hud-bs');
    if (hudElement) {
        hudElement.classList.remove('smithing');
    }
}

/**
 * Perform a single smithing action
 */
export function singleSmithAction() {
    if (!currentSmithingTarget) return;
    if (currentSmithingCategory === 'weapons') {
        craftSword(currentSmithingTarget);
    } else if (currentSmithingCategory === 'armor') {
        craftArmor(currentSmithingTarget);
    } else if (currentSmithingCategory === 'helmets') {
        craftHelmet(currentSmithingTarget);
    } else if (currentSmithingCategory === 'accessories') {
        craftRing(currentSmithingTarget);
    }
}

/**
 * Check if player can still smith the current target
 * @returns {boolean} - True if smithing can continue
 */
export function checkCanStillSmith() {
    if (!currentSmithingTarget) return false;
    let itemData;
    let recipe;
    if (currentSmithingCategory === 'weapons') {
        itemData = SWORD_DATA[currentSmithingTarget];
    } else if (currentSmithingCategory === 'armor') {
        itemData = ARMOR_DATA[currentSmithingTarget];
    } else if (currentSmithingCategory === 'helmets') {
        itemData = HELMET_DATA[currentSmithingTarget];
    } else if (currentSmithingCategory === 'accessories') {
        itemData = RING_DATA[currentSmithingTarget];
    }
    if (!itemData) return false;
    recipe = itemData.recipe;
    // Check if player has all required materials
    return Object.entries(recipe).every(([item, amount]) => {
        return (playerData.inventory[item] || 0) >= amount;
    });
}

/**
 * Update sword smelting UI
 */
export function updateSwordSmeltingUI() {
    populateSwordSmeltingGrid();
}


// Add document ready event listener
document.addEventListener('DOMContentLoaded', () => {
    // Set up blacksmithing menu button listeners
    const blacksmithingBackBtn = document.getElementById('blacksmithing-back-btn');
    if (blacksmithingBackBtn) {
        blacksmithingBackBtn.addEventListener('click', () => {
            showSection('actions-menu-section');
        });
    }
    
    const blacksmithingFooterBackBtn = document.getElementById('blacksmithing-footer-back-btn');
    if (blacksmithingFooterBackBtn) {
        blacksmithingFooterBackBtn.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    const smeltingButton = document.querySelector('.btn-smelt-bars');
    if (smeltingButton) {
        smeltingButton.addEventListener('click', () => {
            showSmeltingMenu();
        });
    }
    
    const smithingButton = document.querySelector('.btn-smith-weapons');
    if (smithingButton) {
        smithingButton.addEventListener('click', () => {
            showSmithingMenu();
        });
    }
    
    // Set up smelting back buttons
    const smeltingBackBtn = document.getElementById('smelting-back-btn');
    if (smeltingBackBtn) {
        smeltingBackBtn.addEventListener('click', () => {
            stopAutoSmelting();
            showBlacksmithingMenu();
        });
    }
    
    const smeltingFooterBackBtn = document.getElementById('smelting-footer-back-btn');
    if (smeltingFooterBackBtn) {
        smeltingFooterBackBtn.addEventListener('click', () => {
            stopAutoSmelting();
            showSection('main-menu-section');
        });
    }
    
    // Set up smithing back buttons
    const smithingBackBtn = document.getElementById('smithing-back-btn');
    if (smithingBackBtn) {
        smithingBackBtn.addEventListener('click', () => {
            stopAutoSmithing();
            showBlacksmithingMenu();
        });
    }
    
    const smithingFooterBackBtn = document.getElementById('smithing-footer-back-btn');
    if (smithingFooterBackBtn) {
        smithingFooterBackBtn.addEventListener('click', () => {
            stopAutoSmithing();
            showSection('main-menu-section');
        });
    }
    
    // Set up smithing category tabs
    const weaponsTabBtn = document.getElementById('smithing-weapons-tab-btn');
    if (weaponsTabBtn) weaponsTabBtn.addEventListener('click', () => showSmithingCategory('weapons'));
    const armorTabBtn = document.getElementById('smithing-armor-tab-btn');
    if (armorTabBtn) armorTabBtn.addEventListener('click', () => showSmithingCategory('armor'));
    const helmetsTabBtn = document.getElementById('smithing-helmets-tab-btn');
    if (helmetsTabBtn) helmetsTabBtn.addEventListener('click', () => showSmithingCategory('helmets'));
    const accessoriesTabBtn = document.getElementById('smithing-accessories-tab-btn');
    if (accessoriesTabBtn) accessoriesTabBtn.addEventListener('click', () => showSmithingCategory('accessories'));
});