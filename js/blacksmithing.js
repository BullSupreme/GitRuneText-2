/**
 * blacksmithing.js - Blacksmithing module for RuneText
 * Handles smithing and smelting mechanics, UI, and automation
 */

'use strict';

import { playerData, getLevelFromXp, savePlayerData, logMessage, playSound, sounds } from './utils.js';
import { showSection, updateHud, setActiveSkill, clearActiveSkill } from './ui.js';
import { SWORD_DATA, ARMOR_DATA, HELMET_DATA, BAR_DATA, getItemDetails } from './data.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { getGuildDoubleCraftingChance } from './guild.js';
import { trackEquipmentCollection } from './achievements.js';

// State variables for blacksmithing
export let isAutoSmelting = false;
export let autoSmeltingInterval = null;
export let currentSmeltingTarget = null;
export let maxSmeltableForCurrentTarget = 0;

export let isAutoSmithing = false;
export let autoSmithingInterval = null;
export let currentSmithingTarget = null;
export let currentSmithingCategory = 'weapons'; // 'weapons', 'armor', 'helmets'

// Utility: Convert a string to Title Case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
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
    // Use BAR_DATA for bar definitions
    // Get container element
    const smeltingContainer = document.getElementById('available-bars-to-smelt-list');
    if (!smeltingContainer) return;
    
    // Clear container
    smeltingContainer.innerHTML = '';
    
    // Current blacksmithing level
    const bsLevel = getLevelFromXp(playerData.blacksmithing_xp);
    
    // Create elements for each bar (show all, grey out if locked)
    for (const [barName, barData] of Object.entries(BAR_DATA)) {
        const meetsLevel = bsLevel >= (barData.level_req || barData.level);
        const maxCraftable = meetsLevel ? calculateMaxCraftableForBar(barName) : 0;
        const canCraft = meetsLevel && maxCraftable > 0;
        const barDiv = document.createElement('div');
        barDiv.className = 'skill-resource mining-resource' + (meetsLevel ? '' : ' greyed-out');
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
                return `<span class='resource-ingredient'>${oreEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(ore)}</span></span>`;
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
    
    // Calculate smelt interval with perks
    const effects = getSummedPyramidPerkEffects();
    let interval = 3000;
    const speedBoost = (effects.smelt_speed || 0) + (effects.global_skill_speed_boost || 0);
    interval *= (1 - speedBoost);
    interval = Math.max(500, interval);
    autoSmeltingInterval = setInterval(() => {
        console.log(`[DEBUG] Smelt tick at ${new Date().toLocaleTimeString()}`);
        singleSmeltAction();
    }, interval);
    
    logMessage(`Auto-smelting ${currentSmeltingTarget} started.`, 'fore-cyan');
    updateHud();
    setActiveSkill('bs');
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
    if (getLevelFromXp(playerData.blacksmithing_xp) < (recipe.level_req || recipe.level)) {
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
    // Grant XP (with xp_boost perks)
    const smeltEffects = getSummedPyramidPerkEffects();
    const xpBoost = smeltEffects.xp_boost_percentage_blacksmithing || 0;
    const xpGain = Math.floor((recipe.xp_gain || recipe.xp) * (1 + xpBoost));
    playerData.blacksmithing_xp += xpGain;
    // Play smelting sound
    if (sounds && sounds.smelting) {
        playSound('smelting');
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
        const meetsLevel = getLevelFromXp(playerData.blacksmithing_xp) >= swordData.smith_level_req;
        // Calculate max craftable
        let maxCraftable = Infinity;
        Object.entries(swordData.recipe).forEach(([item, amount]) => {
            const playerHas = playerData.inventory[item] || 0;
            const canCraft = Math.floor(playerHas / amount);
            maxCraftable = Math.min(maxCraftable, canCraft);
        });
        if (!isFinite(maxCraftable)) maxCraftable = 0;
        const hasRequiredBars = meetsLevel && maxCraftable > 0;
        const inventoryCount = playerData.inventory[swordName] || 0;
        const div = document.createElement('div');
        div.className = 'skill-resource mining-resource' + (!meetsLevel || !hasRequiredBars ? ' greyed-out' : '');
        div.style.cursor = hasRequiredBars ? 'pointer' : 'not-allowed';
        
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
                return `<span class='resource-ingredient'>${itemEmoji}${amount} <span class='resource-ingredient-name'>${toTitleCase(item)}</span></span>`;
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
                ${meetsLevel && !hasRequiredBars ? `<div class='locked-label'>Insufficient Materials</div>` : ''}
            </div>
            <div class="resource-inventory-count">${inventoryCount}</div>
        `;
        // Add active class if currently auto-smithing this weapon
        if (isAutoSmithing && currentSmithingTarget === swordName && currentSmithingCategory === 'weapons') {
            div.classList.add('active-resource');
        }
        // Add click event to the whole container if craftable
        if (hasRequiredBars) {
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
    if (getLevelFromXp(playerData.blacksmithing_xp) < swordData.smith_level_req) {
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
    // Grant XP
    playerData.blacksmithing_xp += swordData.xp_gain;
    // Play smithing sound
    if (sounds && sounds.smithing) {
        playSound('smithing');
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
    
    for (const [armorName, armorData] of Object.entries(ARMOR_DATA)) {
        if (getLevelFromXp(playerData.blacksmithing_xp) >= armorData.smith_level_req) {
            const div = document.createElement('div');
            div.className = 'skill-resource';
            
            const hasRequiredBars = Object.entries(armorData.recipe).every(([item, amount]) => {
                return playerData.inventory[item] >= amount;
            });

            // Use image for armor icon
            const iconHtml = `<img src="assets/${armorName.toLowerCase().replace(/ /g, '-')}.png" alt="${toTitleCase(armorName)}" class="inventory-item-icon">`;

            div.innerHTML = `
                <div class="resource-icon" style="color: ${armorData.color}">${iconHtml}</div>
                <div class="resource-name">${armorName}</div>
                <div class="resource-details">
                    <div>Smith Level: ${armorData.smith_level_req}</div>
                    <div>Recipe: ${Object.entries(armorData.recipe)
                        .map(([item, amount]) => `${amount} ${item}`)
                        .join(', ')}</div>
                    <div>XP: ${armorData.xp_gain}</div>
                </div>
                <button class="skill-action-button" ${hasRequiredBars ? '' : 'disabled'}>
                    ${hasRequiredBars ? 'Craft' : 'Insufficient Materials'}
                </button>
            `;
            
            // Add event listener to the button
            const button = div.querySelector('.skill-action-button');
            if (button) {
                button.addEventListener('click', () => craftArmor(armorName));
            }
            
            container.appendChild(div);
        }
    }
}

/**
 * Populate the smithing helmets display
 */
export function populateSmithingHelmets() {
    const container = document.getElementById('smithing-helmets-category-list');
    if (!container) return;
    container.innerHTML = '';
    
    for (const [helmetName, helmetData] of Object.entries(HELMET_DATA)) {
        if (getLevelFromXp(playerData.blacksmithing_xp) >= helmetData.smith_level_req) {
            const div = document.createElement('div');
            div.className = 'skill-resource';
            
            const hasRequiredBars = Object.entries(helmetData.recipe).every(([item, amount]) => {
                return playerData.inventory[item] >= amount;
            });

            // Use image for helmet icon
            const iconHtml = `<img src="assets/${helmetName.toLowerCase().replace(/ /g, '-')}.png" alt="${toTitleCase(helmetName)}" class="inventory-item-icon">`;

            div.innerHTML = `
                <div class="resource-icon" style="color: ${helmetData.color}">${iconHtml}</div>
                <div class="resource-name">${helmetName}</div>
                <div class="resource-details">
                    <div>Smith Level: ${helmetData.smith_level_req}</div>
                    <div>Recipe: ${Object.entries(helmetData.recipe)
                        .map(([item, amount]) => `${amount} ${item}`)
                        .join(', ')}</div>
                    <div>XP: ${helmetData.xp_gain}</div>
                </div>
                <button class="skill-action-button" ${hasRequiredBars ? '' : 'disabled'}>
                    ${hasRequiredBars ? 'Craft' : 'Insufficient Materials'}
                </button>
            `;
            
            // Add event listener to the button
            const button = div.querySelector('.skill-action-button');
            if (button) {
                button.addEventListener('click', () => craftHelmet(helmetName));
            }
            
            container.appendChild(div);
        }
    }
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
    if (playerData.blacksmithing_xp < getLevelFromXp(armorData.smith_level_req)) {
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
    // Grant XP
    playerData.blacksmithing_xp += armorData.xp_gain;
    
    // Play smithing sound
    if (sounds && sounds.smithing) {
        playSound('smithing');
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
    if (getLevelFromXp(playerData.blacksmithing_xp) < helmetData.smith_level_req) {
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
    // Grant XP
    playerData.blacksmithing_xp += helmetData.xp_gain;
    
    // Play smithing sound
    if (sounds && sounds.smithing) {
        playSound('smithing');
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
    if (weaponsList) weaponsList.classList.add('hidden');
    if (armorList) armorList.classList.add('hidden');
    if (helmetsList) helmetsList.classList.add('hidden');
    // Show selected category
    if (category === 'weapons' && weaponsList) weaponsList.classList.remove('hidden');
    if (category === 'armor' && armorList) armorList.classList.remove('hidden');
    if (category === 'helmets' && helmetsList) helmetsList.classList.remove('hidden');
    currentSmithingCategory = category;
    // Toggle tab buttons
    const weaponsTabBtn = document.getElementById('smithing-weapons-tab-btn');
    const armorTabBtn = document.getElementById('smithing-armor-tab-btn');
    const helmetsTabBtn = document.getElementById('smithing-helmets-tab-btn');
    if (weaponsTabBtn) weaponsTabBtn.classList.toggle('active-tab', category === 'weapons');
    if (armorTabBtn) armorTabBtn.classList.toggle('active-tab', category === 'armor');
    if (helmetsTabBtn) helmetsTabBtn.classList.toggle('active-tab', category === 'helmets');
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
    // Smithing speed can be increased by buffs/perks in the future
    autoSmithingInterval = setInterval(() => {
        console.log(`[DEBUG] Smith tick at ${new Date().toLocaleTimeString()}`);
        if (!checkCanStillSmith()) {
            stopAutoSmithing();
            return;
        }
        singleSmithAction();
    }, 3000); // 3s per smith (future: scale with buffs/perks)
    logMessage(`Auto-smithing ${currentSmithingTarget} started.`, 'fore-cyan');
    updateHud();
    setActiveSkill('bs');
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
});