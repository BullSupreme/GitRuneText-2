/**
 * mining.js - Mining skill module for RuneText
 * Handles mining actions, ore selection, and auto-mining
 */

'use strict';

// Import necessary functions and data
import { playerData, savePlayerData, getLevelFromXp, getXpForDisplay, logMessage, playSound, sounds, getEnchantmentBonus, handleLevelUp } from './utils.js';
import { trackStatistic } from './achievements.js';
import { showSection, updateHud, setActiveSkill, clearActiveSkill } from './ui.js';
import { stopAllAutoActions } from './actions.js';
import { ORE_DATA, ITEM_DATA, TOOL_DATA } from './data.js';
import { getSummedPyramidPerkEffects } from './perks.js';

// Mining state variables
let isAutoMining = false;
let autoMiningInterval = null;
let currentMiningTarget = null;

/**
 * Shows the mining section and initializes the display
 * @param {boolean} skipStop - Whether to skip stopping other auto actions
 */
export function showMining(skipStop = false) {
    // Stop other auto actions if requested
    if (!skipStop) stopAllAutoActions();
    
    // Get active status
    const isActive = playerData && playerData.skills && playerData.skills.mining 
        ? playerData.skills.mining.is_active 
        : false;
    
    // Show the mining section
    showSection('mining-section', isActive);
    
    // Update the mining display
    updateMiningDisplay();
}

/**
 * Calculates the current mining action time
 */
export function calculateMiningActionTime() {
    const baseTime = 3000;
    let interval = baseTime;
    
    // Get equipped pickaxe from equipment system
    const equippedPickaxeName = playerData.equipment ? playerData.equipment.pickaxe || "none" : "none";
    if (equippedPickaxeName !== "none" && TOOL_DATA.pickaxe[equippedPickaxeName]) {
        const pickaxeData = TOOL_DATA.pickaxe[equippedPickaxeName];
        // Apply pickaxe speed multiplier if available
        if (pickaxeData.speed_multiplier) {
            interval *= pickaxeData.speed_multiplier;
        } else {
            // Fallback to tier-based multipliers
            const tierMultipliers = {
                bronze: 1.0, iron: 0.9, steel: 0.85, mithril: 0.8, adamant: 0.75, rune: 0.7, dragon: 0.6
            };
            const tier = equippedPickaxeName.toLowerCase();
            if (tierMultipliers[tier]) {
                interval *= tierMultipliers[tier];
            }
        }
    }
    
    const speedEffects = getSummedPyramidPerkEffects();
    if (speedEffects.gather_speed) {
        interval *= (1 - speedEffects.gather_speed);
    }
    
    // Apply gathering speed enchantments from pickaxe
    const gatheringSpeedBonus = getEnchantmentBonus('gathering_speed', 'pickaxe');
    if (gatheringSpeedBonus > 0) {
        interval *= (1 - gatheringSpeedBonus);
    }
    
    return Math.max(500, interval);
}

/**
 * Updates the mining display with available ores and permit status
 */
export function updateMiningDisplay() {
    // Check for permit status display
    const mnPermitStatusDiv = document.getElementById('mining-permit-status-display');
    if (mnPermitStatusDiv) {
        if (playerData.permits && playerData.permits.miner) {
            mnPermitStatusDiv.textContent = "📜 Miner's Permit Active: Continuous mining through level ups!";
            mnPermitStatusDiv.className = "permit-status";
        } else {
            mnPermitStatusDiv.textContent = "📜 Miner's Permit Needed: Purchase to continue mining after level-ups!";
            mnPermitStatusDiv.className = "permit-status inactive";
        }
    }
    
    // Update action info display
    const actionInfoDiv = document.getElementById('mining-action-info');
    if (actionInfoDiv) {
        const actionTime = calculateMiningActionTime();
        const timeInSeconds = (actionTime / 1000).toFixed(2);
        actionInfoDiv.textContent = `⏱️ Action Time: ${timeInSeconds}s`;
        actionInfoDiv.classList.remove('hidden');
    }
    
    // Populate available ores
    const mnLvl = getLevelFromXp(playerData.skills.mining.xp);
    const availableOresContainer = document.getElementById('available-ores-list');
    
    if (availableOresContainer) {
        // Clear the container
        availableOresContainer.innerHTML = '<div class="section-title" style="text-align:left; font-size:1.2em; border:none; padding-bottom:5px;">Available Ores</div>';
        
        // Get the player's equipped pickaxe
        const equippedPickaxeName = playerData.equipment ? playerData.equipment.pickaxe || "none" : "none";
        const currentPickaxeTierName = equippedPickaxeName;
        
        // Use ORE_DATA for available ores
        for (const [oreName, oreData] of Object.entries(ORE_DATA)) {
            const oreDiv = document.createElement('div');
            oreDiv.className = 'action-list-item';
            oreDiv.id = `mn-ore-${oreName.replace(/\s+/g, '-')}`;
            
            // Check if the player can mine this ore
            const canMine = mnLvl >= oreData.level_req && currentPickaxeTierName !== "none" &&
                (!oreData.required_pickaxe_tier || isTierSufficient(currentPickaxeTierName, oreData.required_pickaxe_tier));
            
            if (!canMine) {
                oreDiv.classList.add('action-list-item-disabled');
                oreDiv.title = mnLvl < oreData.level_req ? `Requires Mining Lvl ${oreData.level_req}` : `Requires a better pickaxe.`;
            }
            
            // Use ORE_DATA for emoji and name
            let oreDisplayText = `${oreData.emoji} ${oreData.item_name.replace(/\b(ore)\b/i, 'Ore').replace(/\b(coal)\b/i, 'Coal').replace(/\b(special dragon ore)\b/i, 'Special Dragon Ore')} (Lvl: ${oreData.level_req}, XP: ${oreData.xp})`;
            if (oreData.required_pickaxe_tier && canMine === false) {
                oreDisplayText += ` <span class="fore-red">(Req: ${oreData.required_pickaxe_tier.charAt(0).toUpperCase() + oreData.required_pickaxe_tier.slice(1)} Pickaxe)</span>`;
            }
            
            oreDiv.innerHTML = `
                <span class="resource-main-text">${oreDisplayText}</span>
                <span class="resource-loot-notification" id="loot-notification-mn-${oreName}"></span>
                <span class="resource-inventory-count">${playerData.inventory[oreData.item_name] || 0}</span>
            `;
            
            oreDiv.onclick = () => canMine ? selectOreForMining(oreName) : null;
            
            // Add active class if this is currently selected ore
            if (isAutoMining && currentMiningTarget === oreName) {
                oreDiv.classList.add('active-action-item');
            }
            
            availableOresContainer.appendChild(oreDiv);
        }
    }
}

/**
 * Selects an ore for mining
 * @param {string} oreName - The name of the ore to select
 */
function selectOreForMining(oreName) {
    // If the same ore is selected, stop auto mining
    if (isAutoMining && currentMiningTarget === oreName) {
        stopAutoMining();
    } else {
        // Otherwise, stop any current auto mining and start on the new ore
        if (isAutoMining) stopAutoMining();
        startAutoMining(oreName);
    }
}

/**
 * Starts auto mining on a selected ore
 * @param {string} oreName - The name of the ore to mine
 */
function startAutoMining(oreName) {
    const oreData = ORE_DATA[oreName];
    
    // Get equipped pickaxe
    const equippedPickaxeName = playerData.equipment ? playerData.equipment.pickaxe || "none" : "none";
    const pickaxeProps = playerData.tools ? playerData.tools[equippedPickaxeName] : undefined;
    
    // Validate pickaxe properties
    if (!pickaxeProps) {
        logMessage("Error: Equipped pickaxe data not found.", "fore-red", "❗");
        stopAutoMining();
        currentMiningTarget = null;
        return false;
    }
    
    // Set current target and auto status
    currentMiningTarget = oreName;
    isAutoMining = true;
    
    // Calculate action interval using the same function as display
    const interval = calculateMiningActionTime();
    
    // Start the auto-mining interval
    logMessage(`Started mining ${oreData.item_name.replace(/\b(ore)\b/i, 'Ore').replace(/\b(coal)\b/i, 'Coal').replace(/\b(special dragon ore)\b/i, 'Special Dragon Ore')}.`, "fore-cyan", "⛏️");
    autoMiningInterval = setInterval(singleMineAction, interval);
    
    // Update UI
    updateMiningDisplay();
    updateHud();
    setActiveSkill('mn');
    
    return true;
}

/**
 * Stops auto mining
 */
export function stopAutoMining() {
    if (autoMiningInterval) {
        clearInterval(autoMiningInterval);
        autoMiningInterval = null;
    }
    
    if (isAutoMining) {
        logMessage(`Stopped mining.`, "fore-warning", "🛑");
        isAutoMining = false;
        currentMiningTarget = null;
        
        // Update UI
        updateMiningDisplay();
        updateHud();
        clearActiveSkill();
    }
}

/**
 * Performs a single mining action
 */
function singleMineAction() {
    if (!isAutoMining || !currentMiningTarget) {
        stopAutoMining();
        return;
    }
    
    const oreData = ORE_DATA[currentMiningTarget];
    
    // Get equipped pickaxe
    const equippedPickaxeName = playerData.equipment ? playerData.equipment.pickaxe || "none" : "none";
    
    // Check if a pickaxe is equipped
    if (equippedPickaxeName === "none") {
        logMessage("No pickaxe equipped. Stopping.", "fore-red", "🚫⛏️");
        stopAutoMining();
        return;
    }
    
    const pickaxeProps = playerData.tools ? playerData.tools[equippedPickaxeName] : undefined;
    
    // Validate pickaxe properties
    if (!pickaxeProps || !pickaxeProps.yield_config) {
        logMessage("Error with pickaxe data.", "fore-red");
        stopAutoMining();
        return;
    }
    
    // Play sound if available
    if (sounds && sounds.mining) {
        playSound('mining');
    }
    
    // Calculate and add XP
    const oldLevel = getLevelFromXp(playerData.skills.mining.xp);
    const baseXP = oreData.xp;
    
    // Calculate yield - use pickaxe base yield if available, otherwise default to 1
    let baseYield = 1;
    if (pickaxeProps.yield_config && typeof pickaxeProps.yield_config.base === 'number') {
        baseYield = pickaxeProps.yield_config.base;
    } else if (oreData.yield && typeof oreData.yield.amount === 'number') {
        baseYield = oreData.yield.amount;
    }
    let totalYield = baseYield;
    
    // Apply base_yield_increase from pyramid perks
    const yieldEffects = getSummedPyramidPerkEffects();
    totalYield += yieldEffects.base_yield_increase_mining || 0;
    
    // Apply yield bonuses from pickaxe
    if (pickaxeProps.yield_config && pickaxeProps.yield_config.bonuses) {
        for (const bonus of pickaxeProps.yield_config.bonuses) {
            if (Math.random() < bonus.chance) {
                totalYield += bonus.amount;
            }
        }
    }
    
    // Apply gather_extra_loot, double_drop, and gem_drop_chance perks
    const effects = getSummedPyramidPerkEffects();
    const extraChance = effects.gather_extra_loot_mining || 0;
    if (Math.random() < extraChance) {
        totalYield += 1;
        logMessage("Perk bonus: Extra ore!", "fore-blue", "🌟");
    }
    const doubleChance = effects.double_drop_mining || 0;
    if (Math.random() < doubleChance) {
        totalYield *= 2;
        logMessage("Perk bonus: Double ore!", "fore-blue", "🌟");
    }
    const gemChance = effects.gem_drop_chance || 0;
    if (Math.random() < gemChance) {
        // Gem drop perk: choose gem type with weighted probabilities
        const rand = Math.random();
        let gemKey;
        if (rand < 0.40) {
            gemKey = 'gems'; // 40% Assorted Gems
        } else if (rand < 0.70) {
            gemKey = 'sapphire'; // 30% Sapphire
        } else if (rand < 0.85) {
            gemKey = 'emerald'; // 15% Emerald
        } else if (rand < 0.95) {
            gemKey = 'ruby'; // 10% Ruby
        } else {
            gemKey = 'diamond'; // 5% Diamond
        }
        const gemData = ITEM_DATA[gemKey];
        playerData.inventory[gemKey] = (playerData.inventory[gemKey] || 0) + 1;
        const gemName = gemData ? gemData.name : gemKey;
        const gemEmoji = gemData ? gemData.emoji : '💎';
        
        // Track rare gem drop
        trackStatistic('gathering', 'rare', 1);
        trackStatistic('gathering', 'item', 1, gemKey);
        
        logMessage(`Perk bonus: Found ${gemName}!`, "fore-magenta", gemEmoji);
    }
    
    // Apply luck-based extra loot from enchantments
    const luckBonus = getEnchantmentBonus('luk_percent');
    if (luckBonus > 0) {
        const luckChance = luckBonus * 0.5; // 50% of luck value as extra loot chance
        if (Math.random() < luckChance) {
            totalYield += 1;
            logMessage("Lucky! Extra ore found!", "fore-yellow", "🍀");
        }
    }
    
    // Ancient Tomes drop for high-tier ores (rune/dragon tier)
    if ((currentMiningTarget === 'runite_ore' || currentMiningTarget === 'dragon_gem_vein') && Math.random() < 0.005) {
        const tomesAmount = Math.floor(Math.random() * 3) + 1; // 1-3 tomes
        playerData.inventory['ancient_tomes'] = (playerData.inventory['ancient_tomes'] || 0) + tomesAmount;
        logMessage(`Discovered ${tomesAmount} Ancient Tomes while mining!`, "fore-purple", "📚");
    }
    
    // Apply enchantment bonuses from pickaxe
    
    // Gem Find Chance enchantment
    const gemFindChance = getEnchantmentBonus('gem_find_chance', 'pickaxe');
    if (gemFindChance > 0 && Math.random() < gemFindChance) {
        const rand = Math.random();
        let gemKey;
        if (rand < 0.40) {
            gemKey = 'gems'; // 40% Assorted Gems
        } else if (rand < 0.70) {
            gemKey = 'sapphire'; // 30% Sapphire
        } else if (rand < 0.85) {
            gemKey = 'emerald'; // 15% Emerald
        } else if (rand < 0.95) {
            gemKey = 'ruby'; // 10% Ruby
        } else {
            gemKey = 'diamond'; // 5% Diamond
        }
        const gemData = ITEM_DATA[gemKey];
        playerData.inventory[gemKey] = (playerData.inventory[gemKey] || 0) + 1;
        const gemName = gemData ? gemData.name : gemKey;
        const gemEmoji = gemData ? gemData.emoji : '💎';
        
        // Track rare gem drop from enchantment
        trackStatistic('gathering', 'rare', 1);
        trackStatistic('gathering', 'item', 1, gemKey);
        
        logMessage(`Enchantment bonus: Found ${gemName}!`, "fore-magenta", gemEmoji);
    }
    
    // Ancient Tome Chance enchantment
    const ancientTomeChance = getEnchantmentBonus('ancient_tome_chance', 'pickaxe');
    if (ancientTomeChance > 0 && Math.random() < ancientTomeChance) {
        const tomesAmount = Math.floor(Math.random() * 2) + 1; // 1-2 tomes
        playerData.inventory['ancient_tomes'] = (playerData.inventory['ancient_tomes'] || 0) + tomesAmount;
        logMessage(`Enchantment bonus: Discovered ${tomesAmount} Ancient Tomes!`, "fore-purple", "📚");
    }
    
    // Gathering Multi-Loot enchantments (applied in order: 2x, 3x, 4x)
    const enchantDoubleChance = getEnchantmentBonus('gathering_double_chance', 'pickaxe');
    if (enchantDoubleChance > 0 && Math.random() < enchantDoubleChance) {
        totalYield *= 2;
        logMessage("Enchantment bonus: 2x ore!", "fore-blue", "🌟");
    }
    
    const enchantTripleChance = getEnchantmentBonus('gathering_triple_chance', 'pickaxe');
    if (enchantTripleChance > 0 && Math.random() < enchantTripleChance) {
        totalYield *= 3;
        logMessage("Enchantment bonus: 3x ore!", "fore-blue", "✨");
    }
    
    const enchantQuadChance = getEnchantmentBonus('gathering_quad_chance', 'pickaxe');
    if (enchantQuadChance > 0 && Math.random() < enchantQuadChance) {
        totalYield *= 4;
        logMessage("Enchantment bonus: 4x ore!", "fore-blue", "💫");
    }
    
    // Add ore to inventory
    if (!playerData.inventory) playerData.inventory = {};
    playerData.inventory[oreData.item_name] = (playerData.inventory[oreData.item_name] || 0) + totalYield;
    
    // Track gathering statistics
    trackStatistic('gathering', 'item', totalYield, oreData.item_name);
    trackStatistic('gathering', 'node', 1);
    
    // Play mining sound
    if (sounds && sounds.mining) {
        playSound('mining');
    }
    
    // Add XP to player skills
    playerData.skills.mining.xp += baseXP;
    
    // Display notification in the UI
    const lootNotifEl = document.getElementById(`loot-notification-mn-${currentMiningTarget}`);
    if (lootNotifEl) {
        lootNotifEl.textContent = `+${baseXP} XP, +${totalYield} ${oreData.item_name}`;
        // Reset animation by removing and re-adding the class
        lootNotifEl.classList.remove('active');
        void lootNotifEl.offsetWidth; // Force reflow
        lootNotifEl.classList.add('active');
        
        // Clear previous timeout if exists
        if (lootNotifEl.timeout) clearTimeout(lootNotifEl.timeout);
        lootNotifEl.timeout = setTimeout(() => lootNotifEl.classList.remove('active'), 1500);
    }
    
    // Log resource gain
    logMessage(`+${baseXP} Mining XP | +${totalYield} ${oreData.item_name}`, "fore-cyan", "🪨");
    
    // Calculate total AOE chance from all sources
    let aoeChanceMining = (effects.aoe_chance_mining || 0) + (effects.aoe_chance || 0);
    
    // Add pickaxe built-in AOE chance
    if (equippedPickaxeName !== "none" && TOOL_DATA.pickaxe[equippedPickaxeName]) {
        const pickaxeAoeChance = TOOL_DATA.pickaxe[equippedPickaxeName].aoe_chance || 0;
        aoeChanceMining += pickaxeAoeChance;
    }
    
    // Add enchantment AOE chance
    const enchantmentAoeChance = getEnchantmentBonus('aoe_mining_chance', 'pickaxe');
    aoeChanceMining += enchantmentAoeChance;
    
    if (Math.random() < aoeChanceMining) {
        const oreKeys = Object.keys(ORE_DATA);
        const idx = oreKeys.indexOf(currentMiningTarget);
        const aoeResults = [];
        
        [idx - 1, idx + 1].forEach(adjIdx => {
            if (oreKeys[adjIdx]) {
                const adjOreName = oreKeys[adjIdx];
                const adjOreData = ORE_DATA[adjOreName];
                const adjItem = adjOreData.item_name;
                const adjYield = baseYield;
                playerData.inventory[adjItem] = (playerData.inventory[adjItem] || 0) + adjYield;
                aoeResults.push(`${adjYield} ${adjItem}`);
                // Update count display
                const adjCountSpan = document.querySelector(`#mn-ore-${adjOreName.replace(/\s+/g, '-')} .resource-inventory-count`);
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
    const newLevel = getLevelFromXp(playerData.skills.mining.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('mining', oldLevel, newLevel);
        
        // Check for permit
        if (!playerData.permits || !playerData.permits.miner) {
            logMessage("Purchase a Miner's Permit to continue mining through level ups!", "fore-warning", "📜");
            stopAutoMining();
        }
    }
    
    // Update inventory count display
    const countSpan = document.querySelector(`#mn-ore-${currentMiningTarget.replace(/\s+/g, '-')} .resource-inventory-count`);
    if (countSpan) {
        countSpan.textContent = playerData.inventory[oreData.item_name] || 0;
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
    // Add event listeners for mining-related elements
    const miningBackButton = document.getElementById('mining-back-button');
    if (miningBackButton) {
        miningBackButton.addEventListener('click', () => {
            stopAutoMining();
            showSection('actions-menu-section');
        });
    }
}); 
