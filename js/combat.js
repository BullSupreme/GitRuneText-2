/**
 * combat.js - Combat module for RuneText
 * Handles combat mechanics, monster selection, combat rounds, 
 * auto-attack toggling, and encounter management
 */

'use strict';

// Import necessary functions and data
import { 
    playerData, 
    savePlayerData, 
    getLevelFromXp, 
    logMessage, 
    playSound, 
    sounds, 
    titleCase,
    getEnchantmentBonus,
    setLowHealthWarningResetCallback,
    handleLevelUp,
    getMaxHp
} from './utils.js';
import { trackStatistic, trackEquipmentCollection, trackItemObtained } from './achievements.js';
import { showSection, updateHud, showFloatingCombatText, setActiveSkill, clearActiveSkill } from './ui.js';
import { stopAllAutoActions, showActionsMenu } from './actions.js';
import { MONSTER_DATA, ALL_MONSTER_NAMES, SWORD_DATA, ARMOR_DATA, HELMET_DATA, TOOL_DATA, FOOD_DATA, PERK_DATA, CHEST_DROP_RATES } from './data.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { showEatFoodModal, setupEatFoodModalEvents } from './cooking.js'; // Import showEatFoodModal and setupEatFoodModalEvents
import { getPlayerCombatStats } from './characterinfo.js';
import { getStructurePerkEffect } from './builds.js';

// Constants for combat settings
export const BASE_COMBAT_INTERVAL = 3000; // 3 seconds base interval

// Combat state variables
export let isAutoAttacking = false;
export let autoAttackInterval = null;
export let currentMonsterTarget = null;
export let currentEncounter = []; // Array of active monster instances
export let currentPlayerTargetIndex = 0; // Index of the current target in the encounter
let lowHealthWarningTriggered = false; // Track if low health warning has been shown
let pendingMonsterAttacks = []; // Track all pending monster attack timeouts
let manuallyStoppedAutoAttack = false; // Track if user manually stopped auto-attack

// Export functions to manage low health warning state
export function isLowHealthWarningTriggered() {
    return lowHealthWarningTriggered;
}

export function setLowHealthWarningTriggered(value) {
    lowHealthWarningTriggered = value;
}

// Register callback to reset warning on heal from other modules
setLowHealthWarningResetCallback(() => {
    lowHealthWarningTriggered = false;
});

/**
 * Clear all pending monster attack timeouts
 */
function clearPendingMonsterAttacks() {
    pendingMonsterAttacks.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });
    pendingMonsterAttacks = [];
}

/**
 * Show the combat section and initialize the display
 * @param {boolean} skipStop - Whether to skip stopping other auto actions
 */
export function showCombat(skipStop = false) {
    // Stop other auto actions if requested
    if (!skipStop) stopAllAutoActions();
    
    const monsterListDiv = document.getElementById('available-monsters-list');
    if (!monsterListDiv) {
        console.error('Monster list div not found');
        return;
    }
    
    // Clear previous list
    monsterListDiv.innerHTML = '';
    
    // Hide arena initially
    const arenaDisplay = document.getElementById('combat-arena-display');
    if (arenaDisplay) {
        arenaDisplay.classList.add('hidden');
    }
    
    // Update permit status display
    const combatPermitStatusDiv = document.getElementById('combat-permit-status-display');
    if (combatPermitStatusDiv) {
        if (playerData.permits && playerData.permits.hunter) {
            combatPermitStatusDiv.textContent = "📜 Hunter's Permit Active: Continuous combat through Attack level ups!";
            combatPermitStatusDiv.className = "permit-status";
        } else {
            combatPermitStatusDiv.textContent = "📜 Hunter's Permit Needed: Purchase to continue fighting through level ups!";
            combatPermitStatusDiv.className = "permit-status inactive";
        }
    }
    
    // Populate monster list based on player level
    const atkLvl = getLevelFromXp(playerData.skills.attack.xp);
    let available = false;
    
    ALL_MONSTER_NAMES.forEach(monsterName => {
        const monster = MONSTER_DATA[monsterName];
        // If monster.level_req is undefined or 0, default to 1 for the check.
        if (atkLvl >= (monster.level_req || 1)) {
            available = true;
            const monsterDiv = document.createElement('div');
            monsterDiv.className = `skill-resource ${monster.color || ''}`; 
            monsterDiv.id = `combat-monster-${monsterName.replace(/\s+/g, '-').toLowerCase()}`;
            // Display Lvl: 1 if monster.level_req is undefined
            monsterDiv.innerHTML = `<span class="resource-main-text">${monster.emoji} ${titleCase(monsterName)}</span>`;
            // Click handler for monster selection
            monsterDiv.onclick = () => selectMonsterForCombat(monsterName);
            
            // Add active class if this monster is currently being attacked
            if (isAutoAttacking && currentMonsterTarget === monsterName) {
                monsterDiv.classList.add('active-action-item', 'attacking-monster-list-item');
            }
            
            monsterListDiv.appendChild(monsterDiv);
        }
    });
    
    // Show message if no monsters available
    if (!available) {
        monsterListDiv.innerHTML += "<p style='text-align:center;'>No monsters available at your level.</p>";
    }
    
    // Remove any existing dungeon entrance from combat section
    const existingEntrance = document.getElementById('dungeon-entrance-container');
    if (existingEntrance) {
        existingEntrance.remove();
    }
    
    // Show the combat section
    showSection('combat-section', true);
    setupCombatEvents(); // Setup combat specific events
    setupEatFoodModalEvents(); // Setup modal events when showing combat section
}

/**
 * Setup combat section event listeners
 */
function setupCombatEvents() {
    // Eat Food button event listener
    const eatFoodCombatBtn = document.getElementById('eat-food-combat-btn');
    if (eatFoodCombatBtn) {
        eatFoodCombatBtn.addEventListener('click', showEatFoodModal);
    }
    // Combat back button event listener
    const combatBackBtn = document.getElementById('combat-back-button');
    if (combatBackBtn) {
        combatBackBtn.addEventListener('click', () => {
            stopAutoAttack(); // Stop auto-attack if active
            showActionsMenu(); // Go back to Actions menu
        });
    }
}

/**
 * Select a monster for combat
 * @param {string} monsterName - Name of the monster to fight
 */
export function selectMonsterForCombat(monsterName) {
    // If already attacking this monster, stop
    if (isAutoAttacking && currentMonsterTarget === monsterName) {
        stopAutoAttack();
    } else {
        // Otherwise, start attacking the new monster
        if (isAutoAttacking) {
            stopAutoAttack();
        }
        startAutoAttack(monsterName);
    }
}

/**
 * Start auto-attacking a monster
 * @param {string} monsterName - Name of the monster to attack
 */
export function startAutoAttack(monsterName) {
    // Reset manual stop flag when starting new auto-attack
    manuallyStoppedAutoAttack = false;
    
    // Prevent duplicate intervals: clear any existing auto-attack interval
    if (autoAttackInterval) {
        clearInterval(autoAttackInterval);
        autoAttackInterval = null;
    }
    
    // Check if player is alive
    if (playerData.hp <= 0) {
        logMessage("You are too weak to fight. Heal up!", "fore-red", "💔");
        return;
    }
    
    // Validate monster target
    if (!monsterName || !MONSTER_DATA[monsterName]) {
        logMessage("Invalid monster target.", "fore-red", "🎯❓");
        return;
    }
    
    // Reset encounter
    currentEncounter = [];
    currentPlayerTargetIndex = 0;
    
    // Get monster data
    const baseMonsterData = MONSTER_DATA[monsterName];
    
    // Determine encounter size (chance for multiple monsters)
    let encounterSize = 1;
    const multiMonsterChance = 0.2; // 20% chance for multi-monster
    
    // For chickens at attack levels 1-5, limit to single spawns
    const playerAttackLevel = getLevelFromXp(playerData.skills.attack.xp);
    const isChickenEarlyLevel = monsterName === "chicken" && playerAttackLevel >= 1 && playerAttackLevel <= 5;
    
    if (!isChickenEarlyLevel && Math.random() < multiMonsterChance) {
        encounterSize = Math.random() < 0.5 ? 2 : 3; // 50% chance for 2 monsters, 50% for 3 if multi-monster
    }
    
    // Check if manually stopped during encounter creation
    if (manuallyStoppedAutoAttack) {
        return; // Exit early if manually stopped
    }
    
    // Create monster instances for the encounter
    for (let i = 0; i < encounterSize; i++) {
        // Check again during loop in case user stops mid-creation
        if (manuallyStoppedAutoAttack) {
            return;
        }
        
        currentEncounter.push({
            id: `${monsterName}_${i + 1}`, // Unique ID for each monster
            name: baseMonsterData.name || monsterName, // Use the display name from data, fallback to key
            monsterKey: monsterName, // Keep the key for reference
            currentHP: baseMonsterData.hp,
            data: baseMonsterData // Reference to base monster data
        });
    }
    
    // Final check before setting target  
    if (manuallyStoppedAutoAttack) {
        return;
    }
    
    // Set current target
    currentMonsterTarget = monsterName;
    isAutoAttacking = true;
    
    // Log encounter start
    if (encounterSize > 1) {
        logMessage(`A group of ${encounterSize} ${titleCase(monsterName)}s appears!`, "fore-yellow", "⚔️⚔️");
    } else {
        logMessage(`Auto-attacking ${titleCase(monsterName)}...`, "fore-red", "⚔️");
    }
    
    // Update UI: highlight the selected monster and hide others
    document.querySelectorAll('#available-monsters-list .skill-resource').forEach(el => {
        if (el.id === `combat-monster-${monsterName.replace(/\\s+/g, '-').toLowerCase()}`) {
            el.classList.remove('hidden');
            el.classList.add('active-action-item', 'attacking-monster-list-item');
            
            // Add enhanced click handling for the active monster
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
            newEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectMonsterForCombat(monsterName);
            }, { passive: false });
        } else {
            el.classList.add('hidden');
        }
    });
    
    // Show the combat arena
    const arenaDiv = document.getElementById('combat-arena-display');
    if (arenaDiv) {
        arenaDiv.classList.remove('hidden');
    }
    
    // Prepare combat arena UI
    prepareCombatArena(currentEncounter);
    
    // Determine weapon stats for base attack speed
    let weaponStats = TOOL_DATA.axe.fists;
    if (playerData && typeof playerData.equipment === 'object') {
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
    } else {
        // Log a warning if equipment data is missing
        console.warn("playerData or playerData.equipment is undefined. Using fists as default weapon.");
    }
    // Calculate attack interval with weapon base speed, attack_speed perks, and enchantments
    const combatEffects = getSummedPyramidPerkEffects();
    const enchantmentAttackSpeed = getEnchantmentBonus('attack_speed');
    const baseInterval = weaponStats.attack_speed != null
        ? Math.floor(weaponStats.attack_speed * 1000)
        : BASE_COMBAT_INTERVAL;
    let interval = baseInterval * (1 - (combatEffects.attack_speed || 0) - enchantmentAttackSpeed);
    interval = Math.max(200, interval);
    autoAttackInterval = setInterval(singleCombatRound, interval);
    
    // Update HUD
    updateHud();
    setActiveSkill('atk');
    
    // Setup weapon animation on current target
    setupWeaponAnimation(interval);
}

/**
 * Stop auto-attacking
 */
export function stopAutoAttack() {
    if (!isAutoAttacking) return;
    
    isAutoAttacking = false;
    manuallyStoppedAutoAttack = true; // Mark as manually stopped
    
    // Clear interval and pending attacks
    if (autoAttackInterval) {
        clearInterval(autoAttackInterval);
        autoAttackInterval = null;
    }
    clearPendingMonsterAttacks();
    
    // Update UI
    if (currentMonsterTarget) {
        const monsterListItem = document.getElementById(`combat-monster-${currentMonsterTarget.replace(/\s+/g, '-').toLowerCase()}`);
        if (monsterListItem) {
            monsterListItem.classList.remove('active-action-item', 'attacking-monster-list-item');
        }
    }
    
    // Log stop
    logMessage("Auto-attack stopped.", "fore-yellow", "🛑");
    
    // Show all monsters in list
    document.querySelectorAll('#available-monsters-list .skill-resource').forEach(el => {
        el.classList.remove('hidden');
    });
    
    // Update HUD
    updateHud();
    clearActiveSkill();
    
    // Hide combat arena and clear previous monster display when stopping auto-attack
    const arenaDiv = document.getElementById('combat-arena-display');
    if (arenaDiv) {
        arenaDiv.classList.add('hidden');
    }
    const monsterDisplayContainer = document.getElementById('monster-display-combat');
    if (monsterDisplayContainer) {
        monsterDisplayContainer.innerHTML = '';
    }
}

/**
 * Stop combat and return to actions menu
 */
export function stopCombatAndReturn() {
    stopAutoAttack();
    showSection('actions-menu-section');
}

/**
 * Prepare the combat arena UI for a new encounter
 * @param {Array} monsterEncounter - Array of monster instances
 */
export function prepareCombatArena(monsterEncounter) {
    // Get container
    const monsterDisplayContainer = document.getElementById('monster-display-combat');
    if (!monsterDisplayContainer) {
        console.error("Error: monster-display-combat element not found. Make sure the element exists in the HTML.");
        // Create a backup container if needed
        const arenaDisplay = document.getElementById('combat-arena-display');
        if (arenaDisplay) {
            console.log("Attempting to create monster display container...");
            const newContainer = document.createElement('div');
            newContainer.id = 'monster-display-combat';
            arenaDisplay.appendChild(newContainer);
            return prepareCombatArena(monsterEncounter); // Try again with the new container
        }
        return;
    }
    
    // Clear previous encounter
    monsterDisplayContainer.innerHTML = '';
    
    // Create monster cards
    monsterEncounter.forEach((monsterInstance, index) => {
        const monsterData = monsterInstance.data;
        const isActive = index === currentPlayerTargetIndex;
        
        // Create monster card
        const monsterCard = document.createElement('div');
        monsterCard.id = `monster-instance-${monsterInstance.id}`;
        monsterCard.className = 'monster-combat-instance';
        if (isActive) monsterCard.classList.add('player-current-target');
        
        // Create health bar
        const healthPercent = (monsterInstance.currentHP / monsterData.hp) * 100;
        
        // Place the monster name and HP text inside the HP bar
        monsterCard.innerHTML = `
            <div class="monster-hp-bar-container">
                <div class="monster-hp-bar-fill" style="width: ${healthPercent}%"></div>
                <div class="monster-hp-bar-center-text">
                    <span class="monster-name">${monsterData.emoji} ${titleCase(monsterInstance.name)}</span>
                    <span class="monster-hp-bar-text">${monsterInstance.currentHP}/${monsterData.hp}</span>
                </div>
            </div>
        `;
        
        // Add click event for targeting with improved responsiveness
        monsterCard.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only allow targeting if not defeated
            if (monsterInstance.currentHP > 0) {
                manualTargetMonster(index);
            }
        }, { passive: false });
        
        monsterDisplayContainer.appendChild(monsterCard);
    });
    
    // Update player HP display
    const playerHpDisplayElement = document.getElementById('player-hp-combat-display');
    if (playerHpDisplayElement) {
        const currentHp = Math.round(Math.max(0, playerData.hp));
        const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
        playerHpDisplayElement.textContent = `${currentHp}/${maxHp}`;
    } else {
        console.error("Error: player-hp-combat-display element not found in prepareCombatArena.");
    }
    
    // Ensure player combat info container has proper styling
    const playerCombatInfoContainer = document.getElementById('player-combat-info-container');
    if (playerCombatInfoContainer) {
        playerCombatInfoContainer.style.clear = 'both';
        playerCombatInfoContainer.style.maxWidth = '200px';
        playerCombatInfoContainer.style.marginLeft = 'auto';
        playerCombatInfoContainer.style.marginRight = 'auto';
        playerCombatInfoContainer.style.marginTop = '0px';
    }
}

/**
 * Target a specific monster in the encounter
 * @param {number} targetIndex - Index of the monster to target
 */
export function manualTargetMonster(targetIndex) {
    if (!currentEncounter || targetIndex >= currentEncounter.length) {
        return;
    }
    
    // Set new target index
    currentPlayerTargetIndex = targetIndex;
    
    // Highlight the new target
    const monsterCards = document.querySelectorAll('.monster-combat-instance');
    monsterCards.forEach((card, index) => {
        card.classList.remove('player-current-target');
        if (index === targetIndex) {
            card.classList.add('player-current-target');
        }
    });
    
    // Setup weapon animation on new target
    if (isAutoAttacking && autoAttackInterval) {
        // Get current attack interval from the existing interval
        // We'll use a default duration and let it sync up on next attack
        const estimatedInterval = BASE_COMBAT_INTERVAL; // Default fallback
        setupWeaponAnimation(estimatedInterval);
    }
    
    logMessage(`Targeting ${titleCase(currentEncounter[targetIndex].name)} #${targetIndex + 1}...`, "fore-cyan", "🎯");
}

/**
 * Update the player's combat info display
 */
export function updatePlayerCombatInfo() {
    const playerHpDisplay = document.getElementById('player-hp-combat-display');
    if (!playerHpDisplay) return;
    
    const currentHp = Math.round(Math.max(0, playerData.hp));
    const maxHp = Math.round(getMaxHp(getLevelFromXp(playerData.skills.attack.xp)));
    playerHpDisplay.textContent = `${currentHp}/${maxHp}`;
    
    // Update health bar if it exists
    const playerHpBar = document.getElementById('player-hp-combat-bar');
    if (playerHpBar) {
        const hpPercent = Math.max(0, Math.min(100, (playerData.hp / maxHp) * 100));
        playerHpBar.style.width = `${hpPercent}%`;
    }
}


/**
 * Execute a single combat round
 */
export function singleCombatRound() {
    // Only run while auto-attacking
    if (!isAutoAttacking) return;
    // If no encounter exists, stop auto-attack
    if (currentEncounter.length === 0) {
        stopAutoAttack();
        return;
    }
    // If all monsters defeated, spawn next until level up stops it (unless manually stopped)
    if (!currentEncounter.some(m => m.currentHP > 0)) {
        // Only restart if not manually stopped
        if (!manuallyStoppedAutoAttack) {
            // Small delay to let player see the last monster die visually
            setTimeout(() => {
                startAutoAttack(currentMonsterTarget);
            }, 300); // Brief 300ms delay for visual feedback
        }
        return;
    }
    
    // Get the current target
    const targetMonsterInstance = currentEncounter[currentPlayerTargetIndex];
    
    // Check if target is defeated
    if (!targetMonsterInstance || targetMonsterInstance.currentHP <= 0) {
        // Find next available target
        for (let i = 0; i < currentEncounter.length; i++) {
            if (currentEncounter[i].currentHP > 0) {
                manualTargetMonster(i);
                break;
            }
        }
        
        // If all defeated, end combat
        if (!currentEncounter.some(m => m.currentHP > 0)) {
            logMessage("All opponents defeated!", "fore-green", "✨");
            // stopAutoAttack(); // commented out to keep auto-attack running
            return;
        }
    }
    
    // Execute player attack
    executePlayerAttack();
}

/**
 * Execute the player's attack in combat
 */
export function executePlayerAttack() {
    // Check if combat is still active
    if (!isAutoAttacking || currentEncounter.length === 0) {
        return;
    }
    
    // Get current target
    const targetMonsterInstance = currentEncounter[currentPlayerTargetIndex];
    if (!targetMonsterInstance || targetMonsterInstance.currentHP <= 0) {
        return;
    }
    
    // Ensure playerData.equipment exists
    if (!playerData.equipment) {
        playerData.equipment = {
            weapon: "none",
            axe: "none",
            pickaxe: "none",
            helmet: "none",
            armor: "none",
            left_ring: "none",
            right_ring: "none"
        };
        console.warn("Player equipment was not initialized, setting defaults");
    }
    
    // Determine weapon stats
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
    
    // Calculate hit chance (80% base + 1% per Attack level over monster level)
    const playerLevel = getLevelFromXp(playerData.skills.attack.xp);
    const levelDiff = playerLevel - targetMonsterInstance.data.level_req;
    let hitChance = Math.min(0.95, Math.max(0.6, 0.8 + (levelDiff * 0.01)));
    // Apply global accuracy boost from perks
    const combatEffects = getSummedPyramidPerkEffects();
    const accBoost = (combatEffects.global_accuracy_boost_percentage || 0) + (combatEffects.global_accuracy_boost_percentage_attack || 0);
    hitChance = Math.min(1, hitChance + accBoost);
    
    // Calculate damage range
    let minDmg = actualWeaponStats.min_dmg || 1;
    let maxDmg = actualWeaponStats.max_dmg || 3;
    // Apply global flat damage boost from perks
    if (combatEffects.global_damage_boost_flat) {
        minDmg += combatEffects.global_damage_boost_flat;
        maxDmg += combatEffects.global_damage_boost_flat;
    }
    
    // Apply weapon damage multiplier from pyramid perks
    const weaponDamageMultiplier = combatEffects.weapon_damage_multiplier || 0;
    if (weaponDamageMultiplier > 0) {
        minDmg = Math.ceil(minDmg * (1 + weaponDamageMultiplier));
        maxDmg = Math.ceil(maxDmg * (1 + weaponDamageMultiplier));
    }
    
    // Apply global damage boost from structures (percentage-based)
    const structureGlobalDamageBoost = getStructurePerkEffect('stronghold', 'global_damage_boost') || 0;
    if (structureGlobalDamageBoost > 0) {
        minDmg = Math.ceil(minDmg * (1 + structureGlobalDamageBoost));
        maxDmg = Math.ceil(maxDmg * (1 + structureGlobalDamageBoost));
    }
    
    // Apply enchanted stats from all equipment slots (same logic as characterinfo.js)
    const enchantableSlots = ['weapon', 'armor', 'helmet', 'axe', 'pickaxe', 'left_ring', 'right_ring'];
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
                        const flatDamageBonus = (minDmg + maxDmg) / 2 * enchantment.value;
                        minDmg += flatDamageBonus;
                        maxDmg += flatDamageBonus;
                        break;
                    case 'str_percent':
                        // STR affects damage in many RPGs
                        const strDamageBonus = (minDmg + maxDmg) / 2 * enchantment.value;
                        minDmg += strDamageBonus;
                        maxDmg += strDamageBonus;
                        break;
                }
            });
        }
    });
    
    // Roll for hit
    if (Math.random() < hitChance) {
        // Calculate base damage
        const playerDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
        // Determine crit chance from weapon, pyramid perks, and enchantments
        const critEffects = getSummedPyramidPerkEffects();
        let critChance = actualWeaponStats.crit_chance || 0; // Base weapon crit chance
        critChance += (critEffects.crit || 0) + (critEffects.crit_attack || 0); // Pyramid perks
        
        // Apply enchantment crit chance bonuses
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    if (enchantment.stat === 'crit_chance') {
                        critChance += enchantment.value;
                    } else if (enchantment.stat === 'luk_percent') {
                        // LUK gives half the crit chance as direct crit (same as characterinfo.js)
                        critChance += enchantment.value * 0.5;
                    }
                });
            }
        });
        // Determine crit
        const isCrit = critChance > 0 && Math.random() < critChance;
        // Determine crit multiplier (base 1.5x plus any perk tree bonus and enchantments)
        const baseCritMult = 1.5;
        const extraCritMult = critEffects.crit_multiplier || 0;
        
        // Apply enchantment crit damage bonuses from rings
        let enchantmentCritDamage = 0;
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    if (enchantment.stat === 'crit_damage') {
                        enchantmentCritDamage += enchantment.value;
                    }
                });
            }
        });
        
        const critMult = isCrit ? (baseCritMult + extraCritMult + enchantmentCritDamage) : 1;
        const finalDmg = Math.floor(playerDmg * critMult);
        if (isCrit) logMessage("CRITICAL HIT!", "fore-lightred_ex", "💥");
        // Deal damage to monster
        targetMonsterInstance.currentHP -= finalDmg;
        
        // Track damage dealt
        trackStatistic('combat', 'damageDealt', finalDmg);
        
        // Track critical hits
        if (isCrit) {
            trackStatistic('combat', 'crit', 1);
        }
        
        // Log hit
        const hitEmoji = isCrit ? "⚔️💥" : "⚔️";
        logMessage(`You hit ${titleCase(targetMonsterInstance.name)} (#${currentPlayerTargetIndex + 1}) with ${titleCase(weaponName)} for ${finalDmg} damage!`, "fore-yellow", hitEmoji);
        
        // Play attack sound based on crit or normal hit
        if (sounds) {
            const attackSound = isCrit ? sounds.attackHard : sounds.attackLight;
            if (attackSound) {
                playSound(attackSound);
            }
        }
        
        // Floating damage text
        const hpBarContainer = document.querySelector(`#monster-instance-${targetMonsterInstance.id} .monster-hp-bar-container`);
        if (hpBarContainer) {
            showFloatingCombatText(`-${finalDmg}`, isCrit ? 'crit' : 'damage', hpBarContainer);
            }
        // AoE damage: combine weapon, perk, and enchantment chances
        const weaponAoE = actualWeaponStats.aoe_chance || 0;
        const perkAoE = (combatEffects.aoe_chance_attack || 0) + (combatEffects.aoe_chance || 0);
        
        // Apply enchantment AOE chance bonuses from rings
        let enchantmentAoeChance = 0;
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    if (enchantment.stat === 'aoe_chance') {
                        enchantmentAoeChance += enchantment.value;
                    }
                });
            }
        });
        
        const aoeChance = weaponAoE + perkAoE + enchantmentAoeChance;
        if (aoeChance > 0 && Math.random() < aoeChance) {
            logMessage("AOE attack triggered!", "fore-magenta", "💥");
            
            // Trigger whirlwind animation
            triggerAOEAnimation();
            
            // Play triple attack sound for AOE
            if (sounds && sounds.attackLight) {
                const aoeSound = sounds.attackLight;
                // Play the sound 3 times in quick succession
                playSound(aoeSound);
                setTimeout(() => {
                    aoeSound.currentTime = 0;
                    playSound(aoeSound);
                }, 100);
                setTimeout(() => {
                    aoeSound.currentTime = 0;
                    playSound(aoeSound);
                }, 200);
            }
            
            let aoeTargetsHit = 0;
            
            // Determine max targets: weapon targets OR at least 1 if perk AOE is active
            let maxTargets = actualWeaponStats.aoe_targets || 0;
            if (maxTargets === 0 && perkAoE > 0) {
                maxTargets = Math.min(2, currentEncounter.length - 1); // Default to hitting up to 2 other monsters
            }
            
            const weaponPct = actualWeaponStats.aoe_damage_percentage || 0;
            const perkPct = (combatEffects.aoe_damage_attack || 0) + (combatEffects.aoe_damage || 0);
            
            // Apply enchantment AOE damage bonuses from rings
            let enchantmentAoeDamage = 0;
            enchantableSlots.forEach(slotKey => {
                const enchantments = playerData.enchantedStats[slotKey];
                if (enchantments && enchantments.length > 0) {
                    enchantments.forEach(enchantment => {
                        if (enchantment.stat === 'aoe_damage') {
                            enchantmentAoeDamage += enchantment.value;
                        }
                    });
                }
            });
            
            let aoePct = weaponPct + perkPct + enchantmentAoeDamage;
            
            // If no weapon AOE damage but perk AOE is active, use default 30% damage
            if (aoePct === 0 && perkAoE > 0) {
                aoePct = 0.30;
            }
            for (let idx = 0; idx < currentEncounter.length && aoeTargetsHit < maxTargets; idx++) {
                if (idx === currentPlayerTargetIndex) continue;
                const other = currentEncounter[idx];
                if (other.currentHP > 0) {
                    const aoeDmg = Math.floor(finalDmg * aoePct);
                    other.currentHP -= aoeDmg;
                    logMessage(`AOE hit ${titleCase(other.name)} (#${idx + 1}) for ${aoeDmg} damage!`, "fore-magenta", "💥");
                    const otherHpBar = document.querySelector(`#monster-instance-${other.id} .monster-hp-bar-container`);
                    if (otherHpBar) showFloatingCombatText(`-${aoeDmg}`, 'damage', otherHpBar);
                    updateMonsterHpDisplay(other);
                    if (other.currentHP <= 0) handleMonsterDefeat(other);
                        aoeTargetsHit++;
                        }
                    }
                }
        // Apply weapon + perk lifesteal
        const totalWeaponLifestealChance = (actualWeaponStats.lifesteal_chance || 0) + (combatEffects.lifesteal || 0);
        if (totalWeaponLifestealChance > 0 && Math.random() < totalWeaponLifestealChance) {
            const lifestealAmount = Math.floor(finalDmg * totalWeaponLifestealChance);
            const oldHp = playerData.hp;
            const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
            
            if (oldHp < maxHp) {
                playerData.hp = Math.min(maxHp, playerData.hp + lifestealAmount);
                const actualHeal = playerData.hp - oldHp;
                logMessage(`Lifesteal! +${actualHeal} HP`, "fore-green", "💚");
            } else {
                logMessage(`Lifesteal blocked (at max HP)`, "fore-yellow", "⚠️");
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
            // Heal based on percentage of damage dealt
            const healAmount = Math.floor(finalDmg * totalLifestealChance);
            const oldHp = playerData.hp;
            const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
            
            if (oldHp < maxHp) {
                playerData.hp = Math.min(maxHp, playerData.hp + healAmount);
                const actualHeal = playerData.hp - oldHp;
                logMessage(`Enchantment Lifesteal! +${actualHeal} HP`, "fore-magenta", "💜");
            } else {
                logMessage(`Enchantment Lifesteal blocked (at max HP)`, "fore-yellow", "⚠️");
            }
        }
        
        // Apply elemental damage effects
        let totalFireDamage = 0;
        let totalIceChance = 0;
        
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    if (enchantment.stat === 'fire_damage') {
                        totalFireDamage += enchantment.value;
                    } else if (enchantment.stat === 'ice_damage') {
                        totalIceChance += enchantment.value;
                    }
                });
            }
        });
        
        // Apply Fire DoT
        if (totalFireDamage > 0) {
            // Store DoT effect on monster
            if (!targetMonsterInstance.statusEffects) {
                targetMonsterInstance.statusEffects = {};
            }
            
            // Check if already burning
            if (!targetMonsterInstance.statusEffects.fireDot) {
                // First time applying fire
                targetMonsterInstance.statusEffects.fireDot = {
                    damage: totalFireDamage,
                    duration: 6, // 6 ticks (6 seconds)
                    nextTick: Date.now() + 1000 // First tick in 1 second
                };
                logMessage(`🔥 ${titleCase(targetMonsterInstance.name)} ignites! Will burn for ${Math.floor(totalFireDamage)} damage/sec`, "fore-red", "🔥");
            } else {
                // Already burning - just refresh duration without message
                targetMonsterInstance.statusEffects.fireDot.duration = 6;
                // Optionally update damage if new fire damage is higher
                if (totalFireDamage > targetMonsterInstance.statusEffects.fireDot.damage) {
                    targetMonsterInstance.statusEffects.fireDot.damage = totalFireDamage;
                }
            }
        }
        
        // Apply Ice Slow
        if (totalIceChance > 0 && Math.random() < totalIceChance) {
            // Store slow effect on monster
            if (!targetMonsterInstance.statusEffects) {
                targetMonsterInstance.statusEffects = {};
            }
            
            // Check if already slowed
            if (!targetMonsterInstance.statusEffects.iceSlow) {
                // First time applying ice slow
                targetMonsterInstance.statusEffects.iceSlow = {
                    slowAmount: 0.30, // 30% slower attacks
                    duration: Date.now() + 5000 // 5 seconds
                };
                logMessage(`❄️ ${titleCase(targetMonsterInstance.name)} is slowed! (5 seconds)`, "fore-cyan", "❄️");
            } else {
                // Already slowed - just refresh duration without message
                targetMonsterInstance.statusEffects.iceSlow.duration = Date.now() + 5000;
            }
        }
        
        // Check if monster is defeated
        if (targetMonsterInstance.currentHP <= 0) {
            handleMonsterDefeat(targetMonsterInstance);
        } else {
            // Only update HP display if monster is still alive
            updateMonsterHpDisplay(targetMonsterInstance);
        }
    } else {
        // Miss
        logMessage(`You missed ${titleCase(targetMonsterInstance.name)} (#${currentPlayerTargetIndex + 1})!`, "fore-yellow", "⚔️❌");
        // Update HP display for misses (monster still alive)
        updateMonsterHpDisplay(targetMonsterInstance);
    }
    
    // If monster is still alive, schedule its attack
    if (targetMonsterInstance.currentHP > 0 && currentEncounter.some(m => m.currentHP > 0)) {
        const timeoutId = setTimeout(() => {
            // Remove this timeout from the pending list
            const index = pendingMonsterAttacks.indexOf(timeoutId);
            if (index > -1) {
                pendingMonsterAttacks.splice(index, 1);
            }
            
            if (targetMonsterInstance.currentHP > 0 && currentEncounter.some(m => m.currentHP > 0) && playerData.hp > 0) {
                performMonsterAttack();
            }
        }, 600);
        
        // Track this timeout so we can cancel it if needed
        pendingMonsterAttacks.push(timeoutId);
    }
    
    // Update player info
    updatePlayerCombatInfo();
}

/**
 * Handle monster defeat
 * @param {Object} monsterInstance - The defeated monster instance
 */
export function handleMonsterDefeat(monsterInstance) {
    // Mark as defeated
    monsterInstance.currentHP = 0;
    
    // Update HP display to show 0 HP immediately
    updateMonsterHpDisplay(monsterInstance);
    
    // Update UI to show defeated state and display skull
    const monsterCard = document.getElementById(`monster-instance-${monsterInstance.id}`);
    if (monsterCard) {
        monsterCard.classList.add('defeated-monster');
        monsterCard.classList.remove('player-current-target');
        // Replace monster emoji with skull until respawn
        const headerEl = monsterCard.querySelector('.monster-hp-bar-center-text .monster-name');
        if (headerEl) {
            headerEl.textContent = `💀 ${titleCase(monsterInstance.name)}`;
        }
    }
    
    // Calculate XP reward
    const xpReward = monsterInstance.data.attack_xp; // Changed from xp_reward to attack_xp
    console.log(`[handleMonsterDefeat] Monster: ${monsterInstance.name}, XP Reward (attack_xp): ${xpReward}`);
    if (typeof xpReward !== 'number' || isNaN(xpReward)) {
        console.error(`[handleMonsterDefeat] Invalid xpReward! Value: ${xpReward}. Defaulting to 0.`);
        // xpReward = 0; // Let it proceed to see if playerData.skills.attack.xp itself is NaN
    }
    
    // Grant XP
    const oldLevel = getLevelFromXp(playerData.skills.attack.xp);
    
    // Ensure current XP is a number
    if (typeof playerData.skills.attack.xp !== 'number' || isNaN(playerData.skills.attack.xp)) {
        console.error(`[handleMonsterDefeat] Current attack XP is NaN! Value: ${playerData.skills.attack.xp}. Resetting to 0 before adding reward.`);
        playerData.skills.attack.xp = 0;
    }
    // Ensure xpReward is a number before adding
    if (typeof xpReward === 'number' && !isNaN(xpReward)) {
        playerData.skills.attack.xp += xpReward;
    } else {
        console.error(`[handleMonsterDefeat] Cannot add invalid xpReward (${xpReward}) to attack XP. Skipping XP addition.`);
    }
    console.log(`[handleMonsterDefeat] Attack XP after adding reward: ${playerData.skills.attack.xp}`);
    
    const newLevel = getLevelFromXp(playerData.skills.attack.xp);
    
    // Track monster kill (use lowercase name for achievements)
    trackStatistic('combat', 'kill', 1, monsterInstance.name.toLowerCase());
    
    // Check for dungeoneering unlock (after 100 Dark Dragon kills)
    if (monsterInstance.name === 'Dark Dragon') {
        // Check if we need to initialize the kill count
        if (!playerData.combat) {
            playerData.combat = { enemiesKilled: {} };
        }
        if (!playerData.combat.enemiesKilled) {
            playerData.combat.enemiesKilled = {};
        }
        
        // Track Dark Dragon kills
        playerData.combat.enemiesKilled['Dark Dragon'] = 
            (playerData.combat.enemiesKilled['Dark Dragon'] || 0) + 1;
        
        // Check for dungeoneering unlock
        if (playerData.combat.enemiesKilled['Dark Dragon'] === 100) {
            // Import and check dungeoneering unlock
            import('./dungeoneering.js').then(module => {
                module.checkDungeoneeringUnlock();
                updateMonsterList(); // Refresh the monster list to show dungeon entrance
            });
        }
    }
    
    // Log victory and rewards
    logMessage(`Defeated ${titleCase(monsterInstance.name)}! +${(typeof xpReward === 'number' && !isNaN(xpReward) ? xpReward : 0)} XP`, "fore-green", "🏆");
    
    // Play monster death sound
    if (sounds && sounds.monsterDeath) {
        const deathSound = sounds.monsterDeath(monsterInstance.name);
        if (deathSound) {
            playSound(deathSound);
        }
    }
    
    // Handle level up
    if (newLevel > oldLevel) {
        handleLevelUp('attack', oldLevel, newLevel);
        
        // Stop auto-attack on level up if no hunting permit
        if (!playerData.permits || !playerData.permits.hunter) {
            stopAutoAttack();
        }
    }
    
    // Grant gold and drops
    handleLoot(monsterInstance);
    // Apply heal-on-kill perks
    const combatEffects = getSummedPyramidPerkEffects();
    // Flat heal on kill
    const healFlat = combatEffects.heal_on_kill_flat || 0;
    if (healFlat > 0) {
        const oldHp = playerData.hp;
        const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
        playerData.hp = Math.min(maxHp, playerData.hp + healFlat);
        logMessage(`Perk heal on kill: +${playerData.hp - oldHp} HP`, "fore-green", "💚");
    }
    // Percent heal on kill (pyramid perks + structure perks)
    const pyramidHealPercent = combatEffects.heal_on_kill_percent || 0;
    const structureHealPercent = getStructurePerkEffect('stronghold', 'heal_on_kill_percent') || 0;
    const healPercent = pyramidHealPercent + structureHealPercent;
    if (healPercent > 0) {
        const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
        const healAmt = Math.floor(maxHp * healPercent);
        const oldHp2 = playerData.hp;
        playerData.hp = Math.min(maxHp, playerData.hp + healAmt);
        logMessage(`Structure heal on kill: +${playerData.hp - oldHp2} HP`, "fore-cyan", "💙");
    }
    
    // Check if all monsters are defeated
    if (!currentEncounter.some(m => m.currentHP > 0)) {
        logMessage("All opponents defeated!", "fore-green", "✨");
        // stopAutoAttack(); // commented out to keep auto-attack running
    } else {
        // Find next target
        for (let i = 0; i < currentEncounter.length; i++) {
            if (currentEncounter[i].currentHP > 0) {
                manualTargetMonster(i);
                break;
            }
        }
    }
    
    // Save player data
    savePlayerData();
    updateHud();
}

/**
 * Handle loot drops from defeated monster
 * @param {Object} monsterInstance - The defeated monster
 */
export function handleLoot(monsterInstance) {
    const monster = monsterInstance.data;
    
    // Gold drop (random between min and max)
    if (Array.isArray(monster.gold_drop) && monster.gold_drop.length === 2) {
        const [minGold, maxGold] = monster.gold_drop;
        const goldAmount = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
        if (goldAmount > 0) {
            playerData.gold += goldAmount;
            logMessage(`Found ${goldAmount} gold!`, "fore-gold", "💰");
        }
    }
    
    // Item drops
    if (Array.isArray(monster.drops)) {
        for (const drop of monster.drops) {
            const chance = drop.base_chance || 0;
            if (Math.random() < chance) {
                // Determine drop quantity
                const [minQty, maxQty] = Array.isArray(drop.quantity) ? drop.quantity : [1, 1];
                let qty = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;
                if (drop.always_drop_one && qty < 1) qty = 1;
                // Add to inventory
                playerData.inventory[drop.item_name] = (playerData.inventory[drop.item_name] || 0) + qty;
                logMessage(`${monster.emoji} ${titleCase(monsterInstance.name)} dropped ${titleCase(drop.item_name)} x${qty}!`, "fore-purple", "🎁");
                
                // Track item discovery for achievements
                trackItemObtained(drop.item_name);
                
                // Track equipment collection for unlocking crafting/shop
                if (ARMOR_DATA[drop.item_name]) {
                    trackEquipmentCollection(drop.item_name, 'armor');
                } else if (HELMET_DATA[drop.item_name]) {
                    trackEquipmentCollection(drop.item_name, 'helmet');
                } else if (SWORD_DATA[drop.item_name]) {
                    trackEquipmentCollection(drop.item_name, 'weapon');
                } else if (TOOL_DATA.axe[drop.item_name] || TOOL_DATA.pickaxe[drop.item_name]) {
                    trackEquipmentCollection(drop.item_name, 'tool');
                }
            }
        }
    }
    
    // Apply extra combat loot perk
    const lootEffects = getSummedPyramidPerkEffects();
    const extraChance = lootEffects.combat_extra_loot || 0;
    if (Math.random() < extraChance) {
        logMessage("Perk extra loot triggered!", "fore-magenta", "🎁");
        // Grant one extra gold
        if (Array.isArray(monster.gold_drop) && monster.gold_drop.length === 2) {
            const [minGold, maxGold] = monster.gold_drop;
            const goldAmount = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
            if (goldAmount > 0) {
                playerData.gold += goldAmount;
                logMessage(`Extra loot: +${goldAmount} gold!`, "fore-gold", "💰");
            }
        }
        // Duplicate each item drop once
        if (Array.isArray(monster.drops)) {
            for (const drop of monster.drops) {
                const chance = drop.base_chance || 0;
                if (Math.random() < chance) {
                    const [minQty, maxQty] = Array.isArray(drop.quantity) ? drop.quantity : [1, 1];
                    let qty = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;
                    if (drop.always_drop_one && qty < 1) qty = 1;
                    playerData.inventory[drop.item_name] = (playerData.inventory[drop.item_name] || 0) + qty;
                    logMessage(`Extra loot: ${titleCase(drop.item_name)} x${qty}!`, "fore-purple", "🎁");
                    
                    // Track item discovery for achievements
                    trackItemObtained(drop.item_name);
                    
                    // Track equipment collection for unlocking crafting/shop
                    if (ARMOR_DATA[drop.item_name]) {
                        trackEquipmentCollection(drop.item_name, 'armor');
                    } else if (HELMET_DATA[drop.item_name]) {
                        trackEquipmentCollection(drop.item_name, 'helmet');
                    } else if (SWORD_DATA[drop.item_name]) {
                        trackEquipmentCollection(drop.item_name, 'weapon');
                    } else if (TOOL_DATA.axe[drop.item_name] || TOOL_DATA.pickaxe[drop.item_name]) {
                        trackEquipmentCollection(drop.item_name, 'tool');
                    }
                }
            }
        }
    }
    
    // Apply luck-based extra loot from enchantments
    const luckBonus = getEnchantmentBonus('luk_percent');
    if (luckBonus > 0) {
        const luckChance = luckBonus * 0.3; // 30% of luck value as extra loot chance (lower than gathering)
        if (Math.random() < luckChance) {
            logMessage("Lucky! Extra combat loot!", "fore-yellow", "🍀");
            // Grant bonus gold
            if (Array.isArray(monster.gold_drop) && monster.gold_drop.length === 2) {
                const [minGold, maxGold] = monster.gold_drop;
                const goldAmount = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
                if (goldAmount > 0) {
                    playerData.gold += goldAmount;
                    logMessage(`Lucky bonus: +${goldAmount} gold!`, "fore-gold", "💰🍀");
                }
            }
            // Try for bonus item drops
            if (Array.isArray(monster.drops)) {
                for (const drop of monster.drops) {
                    const chance = drop.base_chance || 0;
                    if (Math.random() < chance) {
                        const [minQty, maxQty] = Array.isArray(drop.quantity) ? drop.quantity : [1, 1];
                        let qty = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;
                        if (drop.always_drop_one && qty < 1) qty = 1;
                        playerData.inventory[drop.item_name] = (playerData.inventory[drop.item_name] || 0) + qty;
                        logMessage(`Lucky bonus: ${titleCase(drop.item_name)} x${qty}!`, "fore-purple", "🎁🍀");
                        
                        // Track item discovery for achievements
                        trackItemObtained(drop.item_name);
                        
                        // Track equipment collection for unlocking crafting/shop
                        if (ARMOR_DATA[drop.item_name]) {
                            trackEquipmentCollection(drop.item_name, 'armor');
                        } else if (HELMET_DATA[drop.item_name]) {
                            trackEquipmentCollection(drop.item_name, 'helmet');
                        } else if (SWORD_DATA[drop.item_name]) {
                            trackEquipmentCollection(drop.item_name, 'weapon');
                        } else if (TOOL_DATA.axe[drop.item_name] || TOOL_DATA.pickaxe[drop.item_name]) {
                            trackEquipmentCollection(drop.item_name, 'tool');
                        }
                    }
                }
            }
        }
    }
    
    // Check for Ancient Tome drops from Wizard Tower
    if (playerData.built_structures && playerData.built_structures.wizardTower) {
        const ancientTomeChance = 0.01; // 1% chance
        if (Math.random() < ancientTomeChance) {
            const tomeAmount = Math.floor(Math.random() * 16) + 5; // 5-20 tomes
            playerData.inventory["ancient_tomes"] = (playerData.inventory["ancient_tomes"] || 0) + tomeAmount;
            logMessage(`${monster.emoji} ${titleCase(monsterInstance.name)} dropped ${tomeAmount} Ancient Tomes!`, "fore-purple", "📚");
        }
    }
    
    // Check for chest drops
    const monsterName = monsterInstance.name;
    const chestDropRates = CHEST_DROP_RATES[monsterName];
    
    if (chestDropRates) {
        for (const [chestType, dropChance] of Object.entries(chestDropRates)) {
            if (Math.random() < dropChance) {
                // Add chest to inventory
                playerData.inventory[chestType] = (playerData.inventory[chestType] || 0) + 1;
                
                // Get chest tier for color
                const chestData = {
                    "common chest": { emoji: "📦", color: "fore-white" },
                    "uncommon chest": { emoji: "🗃️", color: "fore-green" },
                    "rare chest": { emoji: "💼", color: "fore-blue" },
                    "epic chest": { emoji: "🎁", color: "fore-magenta" },
                    "legendary chest": { emoji: "🏆", color: "fore-gold" }
                };
                
                const chest = chestData[chestType] || { emoji: "📦", color: "fore-white" };
                logMessage(`${monster.emoji} ${titleCase(monsterInstance.name)} dropped a ${titleCase(chestType)}!`, chest.color, chest.emoji);
                
                // Play special sound for rare chest drops
                if (chestType === "legendary chest" && sounds && sounds.legendary) {
                    playSound('legendary');
                } else if ((chestType === "epic chest" || chestType === "rare chest") && sounds && sounds.rareDrop) {
                    playSound('rareDrop');
                }
                
                // Only drop one chest per monster
                break;
            }
        }
    }
}

/**
 * Update monster HP display
 * @param {Object} monsterInstance - Monster instance to update
 */
export function updateMonsterHpDisplay(monsterInstance) {
    const monsterCard = document.getElementById(`monster-instance-${monsterInstance.id}`);
    if (!monsterCard) return;
    
    const hpFill = monsterCard.querySelector('.monster-hp-bar-fill');
    const hpText = monsterCard.querySelector('.monster-hp-bar-text');
    
    if (hpFill && hpText) {
        const hpPercent = Math.max(0, (monsterInstance.currentHP / monsterInstance.data.hp) * 100);
        hpFill.style.width = `${hpPercent}%`;
        hpText.textContent = `${Math.max(0, monsterInstance.currentHP)}/${monsterInstance.data.hp}`;
    }
}

/**
 * Execute monster attack on player
 */
export function performMonsterAttack() {
    if (playerData.hp <= 0) {
        handlePlayerDefeat();
        return;
    }
    
    // Get active monsters (those that can attack)
    const activeMonsters = currentEncounter.filter(m => m.currentHP > 0);
    if (activeMonsters.length === 0) return;
    
    // Process status effects before attacks
    for (const monsterInstance of activeMonsters) {
        if (monsterInstance.statusEffects) {
            // Process Fire DoT
            if (monsterInstance.statusEffects.fireDot && monsterInstance.statusEffects.fireDot.nextTick <= Date.now()) {
                const dotDamage = monsterInstance.statusEffects.fireDot.damage;
                monsterInstance.currentHP -= dotDamage;
                logMessage(`🔥 ${titleCase(monsterInstance.name)} burns for ${Math.floor(dotDamage)} damage!`, "fore-red", "🔥");
                
                // Show floating damage text
                const hpBarContainer = document.querySelector(`#monster-instance-${monsterInstance.id} .monster-hp-bar-container`);
                if (hpBarContainer) {
                    showFloatingCombatText(`-${Math.floor(dotDamage)}`, 'fire', hpBarContainer);
                }
                
                // Update display
                updateMonsterHpDisplay(monsterInstance);
                
                // Decrement duration and schedule next tick
                monsterInstance.statusEffects.fireDot.duration--;
                if (monsterInstance.statusEffects.fireDot.duration > 0) {
                    monsterInstance.statusEffects.fireDot.nextTick = Date.now() + 1000;
                } else {
                    delete monsterInstance.statusEffects.fireDot;
                    logMessage(`${titleCase(monsterInstance.name)} is no longer burning.`, "fore-yellow", "✨");
                }
                
                // Check if defeated by DoT
                if (monsterInstance.currentHP <= 0) {
                    handleMonsterDefeat(monsterInstance);
                    continue;
                }
            }
            
            // Clean up expired ice slow
            if (monsterInstance.statusEffects.iceSlow && monsterInstance.statusEffects.iceSlow.duration < Date.now()) {
                delete monsterInstance.statusEffects.iceSlow;
                logMessage(`${titleCase(monsterInstance.name)} is no longer slowed.`, "fore-yellow", "✨");
            }
        }
    }
    
    // For each active monster, attempt an attack
    for (const monsterInstance of activeMonsters) {
        if (monsterInstance.currentHP <= 0) continue;
        // Calculate hit chance
        const monsterLevel = monsterInstance.data.level_req;
        const playerLevel = getLevelFromXp(playerData.skills.attack.xp);
        const levelDiff = monsterLevel - playerLevel;
        const hitChance = Math.min(0.9, Math.max(0.5, 0.7 + (levelDiff * 0.01)));
        
        // Calculate potential damage
        const maxHit = monsterInstance.data.max_dmg;
        const minHit = Math.max(1, Math.floor(maxHit * 0.3));
        
        // Calculate player defense using getPlayerCombatStats
        let playerDefensePercent = 0;
        try {
            const stats = getPlayerCombatStats();
            if (stats && typeof stats.defense.value === 'string' && stats.defense.value.endsWith('%')) {
                playerDefensePercent = parseFloat(stats.defense.value) / 100;
            } else if (typeof stats.defense.value === 'number') {
                playerDefensePercent = stats.defense.value;
            }
        } catch (e) {
            console.warn('Error getting player defense from getPlayerCombatStats:', e);
        }
        
        // Roll for hit
        if (Math.random() < hitChance) {
            // Calculate base damage
            let monsterDmg = Math.floor(Math.random() * (maxHit - minHit + 1)) + minHit;
            console.log(`[performMonsterAttack] Monster: ${monsterInstance.name}, Initial monsterDmg: ${monsterDmg}`);
            
            // Apply block system: chance → amount → defense
            const combatStats = getPlayerCombatStats();
            let blockChance = 0;
            let blockAmount = 0;
            
            // Parse block chance and amount from combat stats
            if (combatStats && combatStats.blockChance && combatStats.blockChance.value) {
                blockChance = parseFloat(combatStats.blockChance.value) / 100; // Convert "15%" to 0.15
            }
            if (combatStats && combatStats.blockAmount && combatStats.blockAmount.value) {
                blockAmount = parseFloat(combatStats.blockAmount.value) / 100; // Convert "48%" to 0.48
            }
            
            // Check for block
            let damageAfterBlock = monsterDmg;
            if (blockChance > 0 && Math.random() < blockChance) {
                // Block succeeded - apply block amount mitigation
                const blockedDamage = Math.floor(monsterDmg * blockAmount);
                damageAfterBlock = monsterDmg - blockedDamage;
                logMessage(`🛡️ Blocked! Reduced ${blockedDamage} damage (${Math.floor(blockAmount * 100)}% mitigation)`, "fore-blue", "🛡️");
            }
            
            monsterDmg = damageAfterBlock;
            // Apply defense reduction
            let actualDamageTaken = monsterDmg; // Start with monsterDmg
            let damageMitigatedByDefense = 0;

            if (typeof playerDefensePercent === 'number' && !isNaN(playerDefensePercent) && playerDefensePercent > 0) {
                actualDamageTaken = Math.floor(monsterDmg * (1 - playerDefensePercent));
                damageMitigatedByDefense = monsterDmg - actualDamageTaken;
                actualDamageTaken = Math.max(1, actualDamageTaken); // Ensure at least 1 damage
                if (damageMitigatedByDefense > 0) {
                    logMessage(`Your armor absorbed ${damageMitigatedByDefense} damage!`, "fore-blue", "🛡️");
                }
            } else if (typeof playerDefensePercent !== 'number' || isNaN(playerDefensePercent)) {
                console.warn(`[performMonsterAttack] playerDefense is NaN or not a number: ${playerDefensePercent}`);
            }
            console.log(`[performMonsterAttack] actualDamageTaken after defense: ${actualDamageTaken}, damageMitigatedByDefense: ${damageMitigatedByDefense}`);

            if (typeof playerData.hp !== 'number' || isNaN(playerData.hp)) {
                console.error(`[performMonsterAttack] Player HP is NaN before taking damage! Value: ${playerData.hp}. Resetting to max HP.`);
                playerData.hp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp || 0));
            }

            if (typeof actualDamageTaken === 'number' && !isNaN(actualDamageTaken)) {
                playerData.hp -= actualDamageTaken;
                
                // Track damage taken
                trackStatistic('combat', 'damageTaken', actualDamageTaken);
                
                // Update HUD immediately after player takes damage
                updateHud();
                
                // Check for low health warning after taking damage
                const maxHp = getMaxHp(getLevelFromXp(playerData.skills.attack.xp));
                const hpPercent = playerData.hp / maxHp;
                
                // Trigger low health warning if HP drops below 30% and warning hasn't been triggered
                if (hpPercent < 0.3 && !lowHealthWarningTriggered && playerData.hp > 0) {
                    lowHealthWarningTriggered = true;
                    logMessage("Warning: Health is critically low!", "fore-red", "💔");
                    if (sounds && sounds.lowHealth) {
                        playSound(sounds.lowHealth);
                    }
                }
                
                // Reset warning flag when HP gets back above 50%
                if (hpPercent > 0.5 && lowHealthWarningTriggered) {
                    lowHealthWarningTriggered = false;
                }
            } else {
                console.error(`[performMonsterAttack] actualDamageTaken is NaN! Value: ${actualDamageTaken}. Player HP not changed.`);
                actualDamageTaken = 0; // Prevent logging NaN damage
            }
            
            // Log hit
            let damageMessageText = `${titleCase(monsterInstance.name)} (#${currentEncounter.indexOf(monsterInstance) + 1}) hit you for ${actualDamageTaken} damage!`;
            if (damageMitigatedByDefense > 0 && actualDamageTaken < monsterDmg) {
                 damageMessageText += ` (${damageMitigatedByDefense} absorbed)`;
            }
            logMessage(damageMessageText, "fore-red", "💥");
            
            // Show floating damage text on the player HP bar
            const playerHpBar = document.getElementById('player-hp-combat-bar');
            if (playerHpBar) {
                showFloatingCombatText(`-${actualDamageTaken}`, 'damage-taken', playerHpBar, 1);
            }
            
            // Check for player defeat
            if (playerData.hp <= 0 || isNaN(playerData.hp)) {
                handlePlayerDefeat();
                return;
            }
        } else {
            // Monster missed
            logMessage(`${titleCase(monsterInstance.name)} missed!`, "fore-yellow", "⚔️❌");
        }
    }
    // Update player info
    updatePlayerCombatInfo();
}

/**
 * Handle player defeat
 */
export function handlePlayerDefeat() {
    // Track player death
    trackStatistic('combat', 'death', 1);
    
    logMessage("You have been defeated!", "fore-red", "💔");
    
    // Play player death sound
    if (sounds && sounds.playerDeath) {
        playSound(sounds.playerDeath);
    }
    
    // Clear all pending monster attacks immediately to prevent delayed hits
    clearPendingMonsterAttacks();
    
    stopAutoAttack();
    // Return to main menu to trigger revive logic
    showSection('main-menu-section');
}

/**
 * Setup weapon animation attributes on the current target monster
 * @param {number} attackInterval - The attack interval in milliseconds
 */
function setupWeaponAnimation(attackInterval) {
    // Find the current target monster
    const targetElement = document.querySelector('.monster-combat-instance.player-current-target');
    if (!targetElement) return;
    
    // Get equipped weapon info
    let equippedWeapon = "none";
    if (playerData.equipment && playerData.equipment.weapon !== "none" && SWORD_DATA[playerData.equipment.weapon]) {
        equippedWeapon = playerData.equipment.weapon;
    } else if (playerData.equipment && playerData.equipment.axe !== "none") {
        equippedWeapon = playerData.equipment.axe + " axe";
    } else if (playerData.equipment && playerData.equipment.pickaxe !== "none") {
        equippedWeapon = playerData.equipment.pickaxe + " pickaxe";
    }
    
    console.log('Setting weapon animation for combat with weapon:', equippedWeapon);
    
    // Set weapon data attribute
    if (equippedWeapon !== "none") {
        targetElement.setAttribute('data-equipped-weapon', equippedWeapon);
    } else {
        targetElement.removeAttribute('data-equipped-weapon');
    }
    
    // Set animation duration based on attack speed
    const animationDuration = attackInterval / 1000; // Convert ms to seconds
    targetElement.style.setProperty('--attack-animation-duration', `${animationDuration}s`);
    console.log('Setting attack animation duration:', animationDuration, 'seconds (attack interval:', attackInterval, 'ms)');
}

/**
 * Add AOE attack class for whirlwind animation
 */
export function triggerAOEAnimation() {
    const targetElement = document.querySelector('.monster-combat-instance.player-current-target');
    if (!targetElement) return;
    
    // Add AOE class
    targetElement.classList.add('aoe-attack');
    
    // Remove AOE class after animation completes
    setTimeout(() => {
        targetElement.classList.remove('aoe-attack');
    }, 1000); // Remove after 1 second
}
