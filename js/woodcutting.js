/**
 * woodcutting.js - Woodcutting skill module for RuneText
 * Handles woodcutting actions, tree selection, and auto-woodcutting
 */

'use strict';

// Import necessary functions and data
import { playerData, savePlayerData, getLevelFromXp, getXpForDisplay, logMessage, playSound, sounds, getEnchantmentBonus, handleLevelUp } from './utils.js';
import { trackStatistic } from './achievements.js';
import { showSection, updateHud, setActiveSkill, clearActiveSkill } from './ui.js';
import { stopAllAutoActions } from './actions.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { getStructurePerkEffect } from './builds.js';
import { TREE_DATA, TOOL_DATA, ITEM_DATA } from './data.js';

// Woodcutting state variables
let isAutoWoodcutting = false;
let autoWoodcuttingInterval = null;
let currentWoodcuttingTarget = null;

/**
 * Shows the woodcutting section and initializes the display
 * @param {boolean} skipStop - Whether to skip stopping other auto actions
 */
export function showWoodcutting(skipStop = false) {
    // Stop other auto actions if requested
    if (!skipStop) stopAllAutoActions();
    
    // Get active status
    const isActive = playerData && playerData.skills && playerData.skills.woodcutting 
        ? playerData.skills.woodcutting.is_active 
        : false;
    
    // Show the woodcutting section
    showSection('woodcutting-section', isActive);
    
    // Update the woodcutting display
    updateWoodcuttingDisplay();
}

/**
 * Calculates the current woodcutting action time
 */
export function calculateWoodcuttingActionTime() {
    const baseTime = 3000;
    let interval = baseTime;
    
    // Get equipped axe from equipment system
    const equippedAxeName = playerData.equipment ? playerData.equipment.axe || "none" : "none";
    if (equippedAxeName !== "none" && TOOL_DATA.axe[equippedAxeName]) {
        const axeData = TOOL_DATA.axe[equippedAxeName];
        // Apply axe speed multiplier if available
        if (axeData.speed_multiplier) {
            interval *= axeData.speed_multiplier;
        } else {
            // Fallback to tier-based multipliers
            const tierMultipliers = {
                bronze: 1.0, iron: 0.967, steel: 0.933, mithril: 0.9, adamant: 0.9, rune: 0.867, dragon: 0.833
            };
            const tier = equippedAxeName.toLowerCase();
            if (tierMultipliers[tier]) {
                interval *= tierMultipliers[tier];
            }
        }
    }
    
    const speedEffects = getSummedPyramidPerkEffects();
    let totalSpeedBoost = speedEffects.gather_speed || 0;
    
    // Add global skill speed boost from perks and structures
    totalSpeedBoost += speedEffects.global_skill_speed_boost || 0;
    const structureSpeedBoost = getStructurePerkEffect('stronghold', 'global_skill_speed_boost') || 0;
    totalSpeedBoost += structureSpeedBoost;
    
    if (totalSpeedBoost > 0) {
        interval *= (1 - totalSpeedBoost);
    }
    
    // Apply gathering speed enchantments from axe
    const gatheringSpeedBonus = getEnchantmentBonus('gathering_speed', 'axe');
    if (gatheringSpeedBonus > 0) {
        interval *= (1 - gatheringSpeedBonus);
    }
    
    return Math.max(500, interval);
}

/**
 * Updates the woodcutting display with available trees and permit status
 */
export function updateWoodcuttingDisplay() {
    // Check for permit or LumberMill status display
    const wcPermitStatusDiv = document.getElementById('woodcutting-permit-status-display');
    if (wcPermitStatusDiv) {
        const hasLumberMill = playerData.built_structures && playerData.built_structures.lumberMill;
        
        if (hasLumberMill) {
            wcPermitStatusDiv.textContent = "🏭 Lumber Mill Active: Continuous chopping through level ups!";
            wcPermitStatusDiv.className = "permit-status";
        } else {
            wcPermitStatusDiv.textContent = "🏭 Lumber Mill Needed: Required to continue chopping after level-ups!";
            wcPermitStatusDiv.className = "permit-status inactive";
        }
    }
    
    // Update action info display
    const actionInfoDiv = document.getElementById('woodcutting-action-info');
    if (actionInfoDiv) {
        const actionTime = calculateWoodcuttingActionTime();
        const timeInSeconds = (actionTime / 1000).toFixed(2);
        actionInfoDiv.textContent = `⏱️ Action Time: ${timeInSeconds}s`;
        actionInfoDiv.classList.remove('hidden');
    }
    
    // Populate available trees
    const wcLvl = getLevelFromXp(playerData.skills.woodcutting.xp);
    const availableTreesContainer = document.getElementById('available-trees-list');
    
    if (availableTreesContainer) {
        // Clear the container
        availableTreesContainer.innerHTML = '';
        
        // Get the player's equipped axe
        const equippedAxeName = playerData.equipment ? playerData.equipment.axe || "none" : "none";
        const currentAxeTierName = equippedAxeName; // Use the name for isTierSufficient
        
        // Use TREE_DATA from data.js and format it for display
        const trees = {};
        for (const [treeName, treeData] of Object.entries(TREE_DATA)) {
            trees[treeName] = {
                name: treeName.charAt(0).toUpperCase() + treeName.slice(1) + " Tree",
                emoji: treeData.emoji,
                level: treeData.level,
                min_tier: treeData.min_tier,
                xp: treeData.exp,
                yield: { item: treeData.log, amount: 1 }
            };
        }
        
        // Create tree items for each available tree
        for (const [treeName, tree] of Object.entries(trees)) {
            const treeDiv = document.createElement('div');
            treeDiv.className = 'action-list-item';
            treeDiv.id = `wc-tree-${treeName.replace(/\s+/g, '-')}`;
            treeDiv.setAttribute('data-tree-type', treeName);
            
            // Check if the player can chop this tree
            const meetsLevel = wcLvl >= tree.level;
            const hasAxe = currentAxeTierName !== "none";
            const meetsAxeReq = !tree.min_tier || isTierSufficient(currentAxeTierName, tree.min_tier);
            const canChop = meetsLevel && hasAxe && meetsAxeReq;
            
            if (!meetsLevel) {
                treeDiv.classList.add('greyed-out');
                treeDiv.title = `Requires Woodcutting Lvl ${tree.level}`;
            } else if (!canChop) {
                treeDiv.classList.add('action-list-item-disabled');
                treeDiv.title = !hasAxe ? 'Requires an axe' : `Requires a better axe.`;
            }
            
            treeDiv.style.cursor = canChop ? 'pointer' : 'not-allowed';
            
            // Create item content with proper structure
            let treeDisplayText = `${tree.emoji} ${tree.name} (Lvl: ${tree.level}, XP: ${tree.xp})`;
            if (tree.min_tier && canChop === false) {
                treeDisplayText += ` <span class="fore-red">(Req: ${tree.min_tier.charAt(0).toUpperCase() + tree.min_tier.slice(1)} Axe)</span>`;
            }
            
            treeDiv.innerHTML = `
                <span class="resource-main-text">${treeDisplayText}</span>
                <span class="resource-loot-notification" id="loot-notification-wc-${treeName}"></span>
                <span class="resource-inventory-count">${playerData.inventory[tree.yield.item] || 0}</span>
            `;
            
            treeDiv.onclick = () => canChop ? selectTreeForWoodcutting(treeName) : null;
            
            // Add active class if this is currently selected tree
            if (isAutoWoodcutting && currentWoodcuttingTarget === treeName) {
                treeDiv.classList.add('active-action-item');
                
                // Add equipped axe data for animation purposes
                const equippedAxe = playerData.equipment?.axe || 'none';
                console.log('Setting axe animation for:', treeName, 'with axe:', equippedAxe);
                if (equippedAxe !== 'none') {
                    treeDiv.setAttribute('data-equipped-axe', equippedAxe);
                }
                
                // Set animation duration based on woodcutting speed
                const actionTime = calculateWoodcuttingActionTime();
                const animationDuration = actionTime / 1000; // Convert ms to seconds
                treeDiv.style.setProperty('--axe-animation-duration', `${animationDuration}s`);
                console.log('Setting axe animation duration:', animationDuration, 'seconds (action time:', actionTime, 'ms)');
            }
            
            availableTreesContainer.appendChild(treeDiv);
        }
    }
}

/**
 * Selects a tree for woodcutting
 * @param {string} treeName - The name of the tree to select
 */
function selectTreeForWoodcutting(treeName) {
    // If the same tree is selected, stop auto woodcutting
    if (isAutoWoodcutting && currentWoodcuttingTarget === treeName) {
        stopAutoWoodcutting();
    } else {
        // Otherwise, stop any current auto woodcutting and start on the new tree
        if (isAutoWoodcutting) stopAutoWoodcutting();
        startAutoWoodcutting(treeName);
    }
}

/**
 * Starts auto woodcutting on a selected tree
 * @param {string} treeName - The name of the tree to chop
 */
function startAutoWoodcutting(treeName) {
    // Use TREE_DATA from data.js and format it for use
    const trees = {};
    for (const [treeName, treeData] of Object.entries(TREE_DATA)) {
        trees[treeName] = {
            name: treeName.charAt(0).toUpperCase() + treeName.slice(1) + " Tree",
            level: treeData.level,
            xp: treeData.exp,
            yield: { item: treeData.log, amount: 1 }
        };
    }
    
    // Get equipped axe
    const equippedAxeName = playerData.equipment ? playerData.equipment.axe || "none" : "none";
    console.log(`[startAutoWoodcutting] equippedAxeName: '${equippedAxeName}'`);
    console.log(`[startAutoWoodcutting] playerData.tools object:`, playerData.tools ? JSON.parse(JSON.stringify(playerData.tools)) : {});
    const axeProps = playerData.tools ? playerData.tools[equippedAxeName] : undefined;
    console.log(`[startAutoWoodcutting] axeProps for '${equippedAxeName}':`, axeProps ? JSON.parse(JSON.stringify(axeProps)) : undefined);
    
    // Validate axe properties
    if (!axeProps) {
        logMessage("Error: Equipped axe data not found.", "fore-red", "❗");
        stopAutoWoodcutting();
        currentWoodcuttingTarget = null;
        return false;
    }
    
    // Set current target and auto status
    currentWoodcuttingTarget = treeName;
    isAutoWoodcutting = true;
    
    // Calculate action interval using the same function as display
    const interval = calculateWoodcuttingActionTime();
    
    // Start the auto-woodcutting interval
    logMessage(`Started chopping ${trees[treeName].name}.`, "fore-green", "🌲");
    autoWoodcuttingInterval = setInterval(singleChopAction, interval);
    
    // Update UI
    updateWoodcuttingDisplay();
    updateHud();
    setActiveSkill('wc');
    
    return true;
}

/**
 * Stops auto woodcutting
 */
export function stopAutoWoodcutting() {
    if (autoWoodcuttingInterval) {
        clearInterval(autoWoodcuttingInterval);
        autoWoodcuttingInterval = null;
    }
    
    if (isAutoWoodcutting) {
        logMessage(`Stopped chopping.`, "fore-warning", "🛑");
        isAutoWoodcutting = false;
        currentWoodcuttingTarget = null;
        
        // Update UI
        updateWoodcuttingDisplay();
        updateHud();
        clearActiveSkill();
    }
}

/**
 * Performs a single woodcutting action
 */
function singleChopAction() {
    if (!isAutoWoodcutting || !currentWoodcuttingTarget) {
        stopAutoWoodcutting();
        return;
    }
    
    // Use TREE_DATA from data.js and format it for use
    const trees = {};
    for (const [treeName, treeData] of Object.entries(TREE_DATA)) {
        trees[treeName] = {
            name: treeName.charAt(0).toUpperCase() + treeName.slice(1) + " Tree",
            emoji: treeData.emoji,
            level: treeData.level,
            xp: treeData.exp,
            yield: { item: treeData.log, amount: 1 }
        };
    }
    
    // Get equipped axe
    const equippedAxeName = playerData.equipment ? playerData.equipment.axe || "none" : "none";
    console.log(`[singleChopAction] equippedAxeName: '${equippedAxeName}'`);
    console.log(`[singleChopAction] playerData.tools object:`, playerData.tools ? JSON.parse(JSON.stringify(playerData.tools)) : {});
    
    // Check if an axe is equipped
    if (equippedAxeName === "none") {
        logMessage("No axe equipped. Stopping.", "fore-red", "🚫🪓");
        stopAutoWoodcutting();
        return;
    }
    
    const axeProps = playerData.tools ? playerData.tools[equippedAxeName] : undefined;
    console.log(`[singleChopAction] axeProps for '${equippedAxeName}':`, axeProps ? JSON.parse(JSON.stringify(axeProps)) : undefined);
    
    // Validate axe properties
    if (!axeProps || !axeProps.yield_config) {
        logMessage("Error with axe data.", "fore-red");
        stopAutoWoodcutting();
        return;
    }
    
    // Get tree properties
    const tree = trees[currentWoodcuttingTarget];
    if (!tree) {
        logMessage("Invalid tree selected.", "fore-red");
        stopAutoWoodcutting();
        return;
    }
    
    // Play sound if available
    if (sounds && sounds.woodcutting) {
        const woodcuttingSound = typeof sounds.woodcutting === 'function' ? sounds.woodcutting() : sounds.woodcutting;
        playSound(woodcuttingSound);
    }
    
    // Calculate and add XP
    const oldLevel = getLevelFromXp(playerData.skills.woodcutting.xp);
    const baseXP = tree.xp;
    
    // Calculate yield - use axe base yield if available, otherwise use tree default
    let baseYield = tree.yield.amount; // Default to tree yield (usually 1)
    if (axeProps.yield_config && typeof axeProps.yield_config.base === 'number') {
        baseYield = axeProps.yield_config.base;
    }
    let totalYield = baseYield;
    
    // Apply yield bonuses from axe based on tree type
    if (axeProps.yield_config && axeProps.yield_config.bonuses_by_tree) {
        const treeBonuses = axeProps.yield_config.bonuses_by_tree[currentWoodcuttingTarget];
        if (treeBonuses && Array.isArray(treeBonuses)) {
            for (const bonus of treeBonuses) {
                if (Math.random() < bonus.chance) {
                    totalYield += bonus.amount;
                }
            }
        }
    }
    
    // Apply gather_extra_loot and double_drop perks
    const effects = getSummedPyramidPerkEffects();
    const extraChance = effects.gather_extra_loot_woodcutting || 0;
    if (Math.random() < extraChance) {
        totalYield += 1;
        logMessage("Perk bonus: Extra log!", "fore-blue", "🌟");
    }
    const doubleChance = effects.double_drop_woodcutting || 0;
    if (Math.random() < doubleChance) {
        totalYield *= 2;
        logMessage("Perk bonus: Double logs!", "fore-blue", "🌟");
    }
    
    // Apply base_yield_increase from pyramid perks
    const yieldEffects = getSummedPyramidPerkEffects();
    totalYield += yieldEffects.base_yield_increase_woodcutting || 0;
    
    // Apply luck-based extra loot from enchantments
    const luckBonus = getEnchantmentBonus('luk_percent');
    if (luckBonus > 0) {
        const luckChance = luckBonus * 0.5; // 50% of luck value as extra loot chance
        if (Math.random() < luckChance) {
            totalYield += 1;
            logMessage("Lucky! Extra log found!", "fore-yellow", "🍀");
        }
    }
    
    // Ancient Tomes drop for high-tier trees (magic and divine)
    if ((currentWoodcuttingTarget === 'magic' || currentWoodcuttingTarget === 'divine') && Math.random() < 0.005) {
        const tomesAmount = Math.floor(Math.random() * 3) + 1; // 1-3 tomes
        playerData.inventory['ancient_tomes'] = (playerData.inventory['ancient_tomes'] || 0) + tomesAmount;
        logMessage(`Found ${tomesAmount} Ancient Tomes in the ancient tree!`, "fore-purple", "📚");
    }
    
    // Apply enchantment bonuses from axe
    
    // Rare Wood Chance enchantment
    const rareWoodChance = getEnchantmentBonus('rare_wood_chance', 'axe');
    if (rareWoodChance > 0 && Math.random() < rareWoodChance) {
        // Get a rare wood type - higher tier trees drop rarer wood
        let rareWoodType;
        const rand = Math.random();
        if (currentWoodcuttingTarget === 'magic' || currentWoodcuttingTarget === 'divine') {
            // High tier trees can drop any rare wood
            if (rand < 0.40) {
                rareWoodType = 'hardwood'; // 40% common rare wood
            } else if (rand < 0.70) {
                rareWoodType = 'yew logs'; // 30% yew
            } else if (rand < 0.85) {
                rareWoodType = 'magic logs'; // 15% magic
            } else {
                rareWoodType = 'divine logs'; // 15% divine
            }
        } else {
            // Lower tier trees drop simpler rare wood
            if (rand < 0.60) {
                rareWoodType = 'hardwood'; // 60% hardwood
            } else {
                rareWoodType = 'yew logs'; // 40% yew
            }
        }
        
        const rareWoodData = ITEM_DATA[rareWoodType];
        playerData.inventory[rareWoodType] = (playerData.inventory[rareWoodType] || 0) + 1;
        const woodName = rareWoodData ? rareWoodData.name : rareWoodType;
        const woodEmoji = rareWoodData ? rareWoodData.emoji : '🪵';
        logMessage(`Enchantment bonus: Found rare ${woodName}!`, "fore-magenta", woodEmoji);
    }
    
    // Ancient Tome Chance enchantment
    const ancientTomeChance = getEnchantmentBonus('ancient_tome_chance', 'axe');
    if (ancientTomeChance > 0 && Math.random() < ancientTomeChance) {
        const tomesAmount = Math.floor(Math.random() * 2) + 1; // 1-2 tomes
        playerData.inventory['ancient_tomes'] = (playerData.inventory['ancient_tomes'] || 0) + tomesAmount;
        logMessage(`Enchantment bonus: Discovered ${tomesAmount} Ancient Tomes!`, "fore-purple", "📚");
    }
    
    // Gathering Multi-Loot enchantments (applied in order: 2x, 3x, 4x)
    const enchantDoubleChance = getEnchantmentBonus('gathering_double_chance', 'axe');
    if (enchantDoubleChance > 0 && Math.random() < enchantDoubleChance) {
        totalYield *= 2;
        logMessage("Enchantment bonus: 2x logs!", "fore-blue", "🌟");
    }
    
    const enchantTripleChance = getEnchantmentBonus('gathering_triple_chance', 'axe');
    if (enchantTripleChance > 0 && Math.random() < enchantTripleChance) {
        totalYield *= 3;
        logMessage("Enchantment bonus: 3x logs!", "fore-blue", "✨");
    }
    
    const enchantQuadChance = getEnchantmentBonus('gathering_quad_chance', 'axe');
    if (enchantQuadChance > 0 && Math.random() < enchantQuadChance) {
        totalYield *= 4;
        logMessage("Enchantment bonus: 4x logs!", "fore-blue", "💫");
    }
    
    // Add logs to inventory
    if (!playerData.inventory) playerData.inventory = {};
    playerData.inventory[tree.yield.item] = (playerData.inventory[tree.yield.item] || 0) + totalYield;
    
    // Track gathering statistics
    trackStatistic('gathering', 'item', totalYield, tree.yield.item);
    trackStatistic('gathering', 'node', 1);
    
    // Play woodcutting sound
    if (sounds && sounds.woodcutting) {
        playSound('woodcutting');
    }
    
    // Add XP to player skills
    playerData.skills.woodcutting.xp += baseXP;
    
    // Display notification in the UI
    const lootNotifEl = document.getElementById(`loot-notification-wc-${currentWoodcuttingTarget}`);
    if (lootNotifEl) {
        lootNotifEl.textContent = `+${baseXP} XP, +${totalYield} ${tree.yield.item}`;
        // Reset animation by removing and re-adding the class
        lootNotifEl.classList.remove('active');
        void lootNotifEl.offsetWidth; // Force reflow
        lootNotifEl.classList.add('active');
        
        // Clear previous timeout if exists
        if (lootNotifEl.timeout) clearTimeout(lootNotifEl.timeout);
        lootNotifEl.timeout = setTimeout(() => lootNotifEl.classList.remove('active'), 1500);
    }
    
    // Log resource gain
    logMessage(`+${baseXP} Woodcutting XP | +${totalYield} ${tree.yield.item}`, "fore-green", "🪵");
    
    // Calculate total AOE chance from all sources
    let aoeChanceWoodcutting = (effects.aoe_chance_woodcutting || 0) + (effects.aoe_chance || 0);
    
    // Add axe built-in AOE chance
    if (equippedAxeName !== "none" && TOOL_DATA.axe[equippedAxeName]) {
        const axeAoeChance = TOOL_DATA.axe[equippedAxeName].aoe_chance || 0;
        aoeChanceWoodcutting += axeAoeChance;
    }
    
    // Add enchantment AOE chance
    const enchantmentAoeChance = getEnchantmentBonus('aoe_woodcutting_chance', 'axe');
    aoeChanceWoodcutting += enchantmentAoeChance;
    
    if (Math.random() < aoeChanceWoodcutting) {
        const treeKeys = Object.keys(TREE_DATA);
        const idx = treeKeys.indexOf(currentWoodcuttingTarget);
        const aoeResults = [];
        
        [idx - 1, idx + 1].forEach(adjIdx => {
            if (treeKeys[adjIdx]) {
                const adjTreeName = treeKeys[adjIdx];
                const adjTreeData = TREE_DATA[adjTreeName];
                const adjItem = adjTreeData.log;
                const adjYield = baseYield;
                playerData.inventory[adjItem] = (playerData.inventory[adjItem] || 0) + adjYield;
                aoeResults.push(`${adjYield} ${adjItem}`);
                // Update count display
                const adjCountSpan = document.querySelector(`#wc-tree-${adjTreeName.replace(/\s+/g, '-')} .resource-inventory-count`);
                if (adjCountSpan) adjCountSpan.textContent = playerData.inventory[adjItem];
            }
        });
        
        if (aoeResults.length > 0) {
            logMessage(`AOE: ${aoeResults.join(', ')}`, "fore-blue", "💥");
        }
    }
    
    // Save player data
    savePlayerData();
    // Update HUD with new XP
    updateHud();
    
    // Handle level up
    const newLevel = getLevelFromXp(playerData.skills.woodcutting.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('woodcutting', oldLevel, newLevel);
        
        // Check for LumberMill structure
        const hasLumberMill = playerData.built_structures && playerData.built_structures.lumberMill;
        if (!hasLumberMill) {
            logMessage("Build a Lumber Mill to continue chopping through level ups!", "fore-warning", "🏭");
            stopAutoWoodcutting();
        }
    }
    
    // Update inventory count display
    if (currentWoodcuttingTarget) {
        const countSpan = document.querySelector(`#wc-tree-${currentWoodcuttingTarget.replace(/\s+/g, '-')} .resource-inventory-count`);
        if (countSpan) {
            countSpan.textContent = playerData.inventory[tree.yield.item] || 0;
        }
    }
}

/**
 * Utility function to check if one tier is equal to or better than another
 * @param {string} currentTier - The current tier to check
 * @param {string} requiredTier - The required tier
 * @returns {boolean} - Whether the current tier is sufficient
 */
function isTierSufficient(currentTier, requiredTier) {
    const tierRanking = {
        none: 0,
        bronze: 1,
        iron: 2,
        steel: 3,
        mithril: 4,
        adamant: 5,
        rune: 6,
        dragon: 7
    };
    
    return tierRanking[currentTier] >= tierRanking[requiredTier];
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for woodcutting-related elements
    const woodcuttingBackButton = document.getElementById('woodcutting-back-button');
    if (woodcuttingBackButton) {
        woodcuttingBackButton.addEventListener('click', () => {
            stopAutoWoodcutting();
            showSection('actions-menu-section');
        });
    }
}); 
