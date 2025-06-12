/**
 * characterinfo.js - Character information module for RuneText
 * Handles character stats, equipment, and related UI
 * 
 * Perk System:
 * - The pyramid perk tree (from perks.js) is the authoritative source for all active perk effects
 * - Use getSummedPyramidPerkEffects() to access all currently active effects
 * - Legacy PERK_DATA is only used for backward compatibility and should be phased out
 */

'use strict';

import { playerData, getLevelFromXp, getXpForDisplay, getMaxHp, savePlayerData, titleCase, logMessage, getEnchantmentBonus, playSound, sounds, formatEnchantmentStat } from './utils.js';
import { showSection, updateHud } from './ui.js';
import { SWORD_DATA, ARMOR_DATA, HELMET_DATA, RING_DATA, TOOL_DATA, PERK_DATA, STRUCTURE_DATA, PERMIT_MASTER_LIST, TIERS, ENCHANTMENT_STAT_TIER_COLORS, SEED_DATA, CROP_ITEMS, ITEM_SELL_PRICES, MAX_ENCHANTMENTS } from './data.js';
import { calculateMiningActionTime } from './mining.js';
import { calculateWoodcuttingActionTime } from './woodcutting.js';
import { calculateCookingActionTime } from './cooking.js';
import { calculateSmeltingActionTime } from './blacksmithing.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { getStructurePerkEffect } from './builds.js';
import { isAutoAttacking, currentMonsterTarget } from './combat.js';
import { updateEnchantingDisplay } from './enchanting.js';
import { trackEquipmentEquipped } from './achievements.js';

// After imports, before any functions
let liveActivityUpdateInterval = null;

export function calculateTotalSkillXP() {
    if (!playerData || !playerData.skills) return 0;
    
    let total = 0;
    for (const skill in playerData.skills) {
        total += playerData.skills[skill].xp || 0;
    }
    return total;
}

function getSkillSpeedOverviewHTML() {
    const effects = getSummedPyramidPerkEffects();
    let html = '';
    
    // Helper function to build tooltip
    function buildTooltip(description, sources) {
        let tooltipText = `<div class="tooltip-desc">${description}</div>`;
        tooltipText += '<div class="tooltip-sources"><strong>Sources:</strong><br>';
        sources.forEach(s => {
            tooltipText += `${s.source}: ${s.value}<br>`;
        });
        tooltipText += '</div>';
        return `<span class="custom-tooltip-text">${tooltipText.trim()}</span>`;
    }
    
    // Attack Speed
    let attackSpeed = 3.0; // Default weapon speed
    let attackSpeedBonus = 0;
    let enchantmentBonus = 0;
    let attackSources = [];
    
    try {
        // Get equipped weapon attack speed
        let weaponName = "Fists";
        if (playerData.equipment?.weapon && playerData.equipment.weapon !== 'none' && SWORD_DATA[playerData.equipment.weapon]) {
            attackSpeed = SWORD_DATA[playerData.equipment.weapon].attack_speed || 3.0;
            weaponName = titleCase(playerData.equipment.weapon);
        } else if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
            attackSpeed = TOOL_DATA.axe[playerData.equipment.axe].attack_speed || 3.0;
            weaponName = titleCase(playerData.equipment.axe + " Axe");
        } else if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
            attackSpeed = TOOL_DATA.pickaxe[playerData.equipment.pickaxe].attack_speed || 3.0;
            weaponName = titleCase(playerData.equipment.pickaxe + " Pickaxe");
        }
        
        attackSources.push({ source: weaponName, value: `${attackSpeed}s base` });
        
        // Apply perk bonuses
        attackSpeedBonus = effects.attack_speed || 0;
        if (attackSpeedBonus > 0) {
            attackSources.push({ source: "Perk Tree", value: `+${(attackSpeedBonus * 100).toFixed(0)}% Speed` });
        }
        
        // Apply enchantment bonuses
        enchantmentBonus = getEnchantmentBonus('attack_speed');
        if (enchantmentBonus > 0) {
            attackSources.push({ source: "Enchantments", value: `+${(enchantmentBonus * 100).toFixed(0)}% Speed` });
        }
        
        const finalAttackSpeed = attackSpeed * (1 - attackSpeedBonus - enchantmentBonus);
        html += `<div><span style="color: #f44336;">⚔️ Attack:</span> ${finalAttackSpeed.toFixed(2)}s</div>`;
    } catch (e) {
        attackSources.push({ source: "Default", value: `${attackSpeed}s base` });
        html += `<div><span style="color: #f44336;">⚔️ Attack:</span> ${attackSpeed.toFixed(2)}s</div>`;
    }
    
    // Gathering Speed (Mining)
    const miningActionTimeMs = calculateMiningActionTime();
    const finalMiningSpeed = miningActionTimeMs / 1000; // Convert ms to seconds
    let miningSources = [];
    
    // Get mining speed sources
    let baseSpeed = 3.0; // Base mining speed
    miningSources.push({ source: "Base Speed", value: `${baseSpeed}s` });
    
    // Check for pickaxe bonus
    if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
        const pickaxeSpeed = TOOL_DATA.pickaxe[playerData.equipment.pickaxe].attack_speed || 3.0;
        miningSources.push({ source: titleCase(playerData.equipment.pickaxe + " Pickaxe"), value: `${pickaxeSpeed}s` });
    }
    
    // Check for gather speed bonus from perks
    const gatherSpeedBonus = effects.gather_speed || 0;
    if (gatherSpeedBonus > 0) {
        miningSources.push({ source: "Perk Tree", value: `+${(gatherSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    html += `<div><span style="color: #9e9e9e;">⛏️ Mining:</span> ${finalMiningSpeed.toFixed(2)}s</div>`;
    
    // Gathering Speed (Woodcutting)
    const woodcuttingActionTimeMs = calculateWoodcuttingActionTime();
    const finalWoodcuttingSpeed = woodcuttingActionTimeMs / 1000; // Convert ms to seconds
    let woodcuttingSources = [];
    
    // Get woodcutting speed sources
    woodcuttingSources.push({ source: "Base Speed", value: `${baseSpeed}s` });
    
    // Check for axe bonus
    if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
        const axeSpeed = TOOL_DATA.axe[playerData.equipment.axe].attack_speed || 3.0;
        woodcuttingSources.push({ source: titleCase(playerData.equipment.axe + " Axe"), value: `${axeSpeed}s` });
    }
    
    // Check for gather speed bonus from perks
    if (gatherSpeedBonus > 0) {
        woodcuttingSources.push({ source: "Perk Tree", value: `+${(gatherSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    html += `<div><span style="color: #4caf50;">🌲 Woodcutting:</span> ${finalWoodcuttingSpeed.toFixed(2)}s</div>`;
    
    // Show speed bonuses if any
    if (attackSpeedBonus > 0 || gatherSpeedBonus > 0 || enchantmentBonus > 0) {
        html += `<hr style="margin: 8px 0; border: 1px solid #444;">`;
        html += `<div style="font-size: 0.9em; color: #aaa; margin-top: 8px;">Speed Bonuses:</div>`;
        
        if (attackSpeedBonus > 0) {
            html += `<div style="font-size: 0.85em; color: #81c784;">• Perk Attack Speed: +${(attackSpeedBonus * 100).toFixed(0)}%</div>`;
        }
        if (enchantmentBonus > 0) {
            html += `<div style="font-size: 0.85em; color: #81c784;">• Enchant Attack Speed: +${(enchantmentBonus * 100).toFixed(0)}%</div>`;
        }
        if (gatherSpeedBonus > 0) {
            html += `<div style="font-size: 0.85em; color: #81c784;">• Gather Speed: +${(gatherSpeedBonus * 100).toFixed(0)}%</div>`;
        }
    }
    
    return html;
}

function populateSkillSpeedOverview(container) {
    container.innerHTML = '';
    const effects = getSummedPyramidPerkEffects();
    
    // Declare common speed bonuses once to avoid redeclaration
    const globalSkillSpeedBonus = effects.global_skill_speed_boost || 0;
    const structureSpeedBonus = getStructurePerkEffect('stronghold', 'global_skill_speed_boost') || 0;
    
    // Attack Speed
    let attackSpeed = 3.0;
    let attackSpeedBonus = 0;
    let enchantmentBonus = 0;
    let attackSources = [];
    
    try {
        let weaponName = "Fists";
        if (playerData.equipment?.weapon && playerData.equipment.weapon !== 'none' && SWORD_DATA[playerData.equipment.weapon]) {
            attackSpeed = SWORD_DATA[playerData.equipment.weapon].attack_speed || 3.0;
            weaponName = titleCase(playerData.equipment.weapon);
            attackSources.push({ source: weaponName + " 2h Sword", value: `${attackSpeed}s base` });
        } else if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
            attackSpeed = TOOL_DATA.axe[playerData.equipment.axe].attack_speed || 3.0;
            weaponName = titleCase(playerData.equipment.axe + " Axe");
            attackSources.push({ source: weaponName, value: `${attackSpeed}s base` });
        } else if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
            attackSpeed = TOOL_DATA.pickaxe[playerData.equipment.pickaxe].attack_speed || 3.0;
            weaponName = titleCase(playerData.equipment.pickaxe + " Pickaxe");
            attackSources.push({ source: weaponName, value: `${attackSpeed}s base` });
        } else {
            attackSources.push({ source: "Fists", value: `${attackSpeed}s base` });
        }
        
        attackSpeedBonus = effects.attack_speed || 0;
        if (attackSpeedBonus > 0) {
            attackSources.push({ source: "Perk Tree", value: `+${(attackSpeedBonus * 100).toFixed(0)}% Speed` });
        }
        
        enchantmentBonus = getEnchantmentBonus('attack_speed');
        if (enchantmentBonus > 0) {
            attackSources.push({ source: "Enchantments", value: `+${(enchantmentBonus * 100).toFixed(0)}% Speed` });
        }
        
        const finalAttackSpeed = attackSpeed * (1 - attackSpeedBonus - enchantmentBonus);
        createSkillSpeedRow(container, "⚔️ Attack:", finalAttackSpeed, "#f44336", "Time between attack actions.", attackSources);
    } catch (e) {
        attackSources.push({ source: "Default", value: `${attackSpeed}s base` });
        createSkillSpeedRow(container, "⚔️ Attack:", attackSpeed, "#f44336", "Time between attack actions.", attackSources);
    }
    
    // Mining Speed
    const miningActionTimeMs = calculateMiningActionTime();
    const finalMiningSpeed = miningActionTimeMs / 1000;
    let miningSources = [];
    
    let baseSpeed = 3.0;
    miningSources.push({ source: "Base Speed", value: `${baseSpeed}s` });
    
    if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
        // Calculate tier multiplier effect
        const tierMultipliers = {
            bronze: 1.0, iron: 0.967, steel: 0.933, mithril: 0.9, adamant: 0.9, rune: 0.867, dragon: 0.833
        };
        const tier = playerData.equipment.pickaxe.toLowerCase();
        const multiplier = tierMultipliers[tier] || 1.0;
        const speedReduction = ((1 - multiplier) * 100).toFixed(0);
        if (speedReduction > 0) {
            miningSources.push({ source: titleCase(playerData.equipment.pickaxe + " Pickaxe"), value: `-${speedReduction}% Time` });
        }
    }
    
    const gatherSpeedBonus = effects.gather_speed || 0;
    if (gatherSpeedBonus > 0) {
        miningSources.push({ source: "Perk Tree", value: `+${(gatherSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    const miningEnchantSpeedBonus = getEnchantmentBonus('gathering_speed', 'pickaxe');
    if (miningEnchantSpeedBonus > 0) {
        miningSources.push({ source: "Pickaxe Enchantments", value: `+${(miningEnchantSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (globalSkillSpeedBonus > 0) {
        miningSources.push({ source: "Global Skill Speed", value: `+${(globalSkillSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (structureSpeedBonus > 0) {
        miningSources.push({ source: "Stronghold", value: `+${(structureSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    // Calculate mining AOE stats for tooltip
    const miningAoeData = calculateGatheringAoeStats('mining');
    const miningDescription = `Time between mining actions.${miningAoeData.chance > 0 ? ` AOE: ${(miningAoeData.chance * 100).toFixed(0)}% chance to mine adjacent ores.` : ''}`;
    
    createSkillSpeedRow(container, "⛏️ Mining:", finalMiningSpeed, "#9e9e9e", miningDescription, miningSources, miningAoeData);
    
    // Woodcutting Speed
    const woodcuttingActionTimeMs = calculateWoodcuttingActionTime();
    const finalWoodcuttingSpeed = woodcuttingActionTimeMs / 1000;
    let woodcuttingSources = [];
    
    woodcuttingSources.push({ source: "Base Speed", value: `${baseSpeed}s` });
    
    if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
        // Calculate tier multiplier effect
        const tierMultipliers = {
            bronze: 1.0, iron: 0.967, steel: 0.933, mithril: 0.9, adamant: 0.9, rune: 0.867, dragon: 0.833
        };
        const tier = playerData.equipment.axe.toLowerCase();
        const multiplier = tierMultipliers[tier] || 1.0;
        const speedReduction = ((1 - multiplier) * 100).toFixed(0);
        if (speedReduction > 0) {
            woodcuttingSources.push({ source: titleCase(playerData.equipment.axe + " Axe"), value: `-${speedReduction}% Time` });
        }
    }
    
    if (gatherSpeedBonus > 0) {
        woodcuttingSources.push({ source: "Perk Tree", value: `+${(gatherSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    const woodcuttingEnchantSpeedBonus = getEnchantmentBonus('gathering_speed', 'axe');
    if (woodcuttingEnchantSpeedBonus > 0) {
        woodcuttingSources.push({ source: "Axe Enchantments", value: `+${(woodcuttingEnchantSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (globalSkillSpeedBonus > 0) {
        woodcuttingSources.push({ source: "Global Skill Speed", value: `+${(globalSkillSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (structureSpeedBonus > 0) {
        woodcuttingSources.push({ source: "Stronghold", value: `+${(structureSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    // Calculate woodcutting AOE stats for tooltip
    const woodcuttingAoeData = calculateGatheringAoeStats('woodcutting');
    const woodcuttingDescription = `Time between woodcutting actions.${woodcuttingAoeData.chance > 0 ? ` AOE: ${(woodcuttingAoeData.chance * 100).toFixed(0)}% chance to chop adjacent trees.` : ''}`;
    
    createSkillSpeedRow(container, "🌲 Woodcutting:", finalWoodcuttingSpeed, "#4caf50", woodcuttingDescription, woodcuttingSources, woodcuttingAoeData);
    
    // Cooking Speed
    const cookingActionTimeMs = calculateCookingActionTime();
    const finalCookingSpeed = cookingActionTimeMs / 1000;
    let cookingSources = [];
    
    cookingSources.push({ source: "Base Speed", value: `${baseSpeed}s` });
    
    // Crafting speed from ring enchantments
    const craftingSpeedBonus = getEnchantmentBonus('crafting_speed');
    if (craftingSpeedBonus > 0) {
        cookingSources.push({ source: "Ring Enchantments", value: `-${craftingSpeedBonus}s` });
    }
    
    const cookingSpeedBonus = effects.cooking_speed || 0;
    if (cookingSpeedBonus > 0) {
        cookingSources.push({ source: "Perk Tree", value: `+${(cookingSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (globalSkillSpeedBonus > 0) {
        cookingSources.push({ source: "Global Skill Speed", value: `+${(globalSkillSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (structureSpeedBonus > 0) {
        cookingSources.push({ source: "Stronghold", value: `+${(structureSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    const cookingDescription = "Time between cooking actions.";
    
    createSkillSpeedRow(container, "🍳 Cooking:", finalCookingSpeed, "#ffa500", cookingDescription, cookingSources);
    
    // Blacksmithing (Smelting) Speed
    const smeltingActionTimeMs = calculateSmeltingActionTime();
    const finalSmeltingSpeed = smeltingActionTimeMs / 1000;
    let smeltingSources = [];
    
    smeltingSources.push({ source: "Base Speed", value: `${baseSpeed}s` });
    
    // Crafting speed from ring enchantments (applies to both smelting and smithing)
    if (craftingSpeedBonus > 0) {
        smeltingSources.push({ source: "Ring Enchantments", value: `-${craftingSpeedBonus}s` });
    }
    
    const smeltSpeedBonus = effects.smelt_speed || 0;
    if (smeltSpeedBonus > 0) {
        smeltingSources.push({ source: "Perk Tree", value: `+${(smeltSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (globalSkillSpeedBonus > 0) {
        smeltingSources.push({ source: "Global Skill Speed", value: `+${(globalSkillSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    if (structureSpeedBonus > 0) {
        smeltingSources.push({ source: "Stronghold", value: `+${(structureSpeedBonus * 100).toFixed(0)}% Speed` });
    }
    
    const smeltingDescription = "Time between smelting actions.";
    
    createSkillSpeedRow(container, "🛠️ Blacksmithing:", finalSmeltingSpeed, "#b8860b", smeltingDescription, smeltingSources);
}

function createSkillSpeedRow(container, label, speed, color, description, sources, aoeData = null) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    
    // Build tooltip markup
    let tooltipText = `<div class="tooltip-desc">${description}</div>`;
    tooltipText += '<div class="tooltip-sources"><strong>Sources:</strong><br>';
    sources.forEach(s => {
        tooltipText += `${s.source}: ${s.value}<br>`;
    });
    tooltipText += '</div>';
    
    // Add AOE information if provided
    if (aoeData && aoeData.chance > 0) {
        tooltipText += '<div class="tooltip-aoe"><strong>AOE Sources:</strong><br>';
        aoeData.sources.forEach(s => {
            tooltipText += `${s.source}: ${s.value}<br>`;
        });
        tooltipText += '</div>';
    }
    
    row.innerHTML = `<span class="stat-name" style="color: ${color};">${label}</span>
                     <span class="stat-value">${speed.toFixed(2)}s</span>`;
    
    // Add custom tooltip
    const tooltipSpan = document.createElement('span');
    tooltipSpan.className = 'custom-tooltip-text';
    tooltipSpan.innerHTML = tooltipText.trim();
    row.appendChild(tooltipSpan);
    
    container.appendChild(row);
}

/**
 * Calculate AOE stats for gathering skills (mining/woodcutting)
 * @param {string} skill - The skill type ('mining' or 'woodcutting')
 * @returns {object} AOE data with chance and sources
 */
function calculateGatheringAoeStats(skill) {
    const effects = getSummedPyramidPerkEffects();
    const sources = [];
    let totalChance = 0;
    
    // Tool AOE chance  
    let toolAoeChance = 0;
    let toolName = "None";
    
    if (skill === 'mining') {
        if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
            toolAoeChance = TOOL_DATA.pickaxe[playerData.equipment.pickaxe].aoe_chance || 0;
            toolName = titleCase(playerData.equipment.pickaxe + " Pickaxe");
        }
        
        // Perk AOE chance for mining
        const perkAoeChance = (effects.aoe_chance_mining || 0) + (effects.aoe_chance || 0);
        
        if (toolAoeChance > 0) {
            sources.push({ source: toolName, value: `${(toolAoeChance * 100).toFixed(0)}%` });
            totalChance += toolAoeChance;
        }
        
        if (perkAoeChance > 0) {
            sources.push({ source: 'Perks', value: `${(perkAoeChance * 100).toFixed(0)}%` });
            totalChance += perkAoeChance;
        }
        
        // Enchantment AOE chance for mining
        const enchantAoeChance = getEnchantmentBonus('aoe_mining_chance', 'pickaxe');
        if (enchantAoeChance > 0) {
            sources.push({ source: 'Pickaxe Enchantments', value: `${(enchantAoeChance * 100).toFixed(0)}%` });
            totalChance += enchantAoeChance;
        }
        
    } else if (skill === 'woodcutting') {
        if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
            toolAoeChance = TOOL_DATA.axe[playerData.equipment.axe].aoe_chance || 0;
            toolName = titleCase(playerData.equipment.axe + " Axe");
        }
        
        // Perk AOE chance for woodcutting
        const perkAoeChance = (effects.aoe_chance_woodcutting || 0) + (effects.aoe_chance || 0);
        
        if (toolAoeChance > 0) {
            sources.push({ source: toolName, value: `${(toolAoeChance * 100).toFixed(0)}%` });
            totalChance += toolAoeChance;
        }
        
        if (perkAoeChance > 0) {
            sources.push({ source: 'Perks', value: `${(perkAoeChance * 100).toFixed(0)}%` });
            totalChance += perkAoeChance;
        }
        
        // Enchantment AOE chance for woodcutting
        const enchantAoeChance = getEnchantmentBonus('aoe_woodcutting_chance', 'axe');
        if (enchantAoeChance > 0) {
            sources.push({ source: 'Axe Enchantments', value: `${(enchantAoeChance * 100).toFixed(0)}%` });
            totalChance += enchantAoeChance;
        }
    }
    
    return {
        chance: totalChance,
        sources: sources.length > 0 ? sources : [{ source: 'Base', value: '0%' }]
    };
}


/**
 * Helper function to get enchanted stats HTML for a specific slot
 */
export function getEnchantedStatsHtml(slotKey) {
    // Handle slot name mapping for enchantments (chestplate equipment -> armor enchantments)
    const equipmentSlot = slotKey === 'chestplate' ? 'armor' : slotKey;
    
    // First check if there's an equipped item
    const equippedItemName = playerData.equipment && playerData.equipment[equipmentSlot];
    if (!equippedItemName || equippedItemName === 'none') {
        return '';
    }
    
    // IMPORTANT: Only show enchantments if enchantedStats has them
    // This prevents showing enchantments on unenchanted items
    if (!playerData.enchantedStats || !playerData.enchantedStats[equipmentSlot] || 
        playerData.enchantedStats[equipmentSlot].length === 0) {
        return '';
    }
    
    // Check for enchantments on the specific equipped item (use 'armor' for chestplate enchantments)
    const enchantmentSlotKey = slotKey === 'chestplate' ? 'armor' : slotKey;
    const itemKey = `${enchantmentSlotKey}:${equippedItemName}`;
    
    // Debug logging commented out
    /*
    if (slotKey === 'chestplate') {
        console.log('Debug armor enchantments:', {
            slotKey,
            equipmentSlot,
            equippedItemName,
            enchantmentSlotKey,
            itemKey,
            hasItemEnchantments: !!(playerData.itemEnchantments && playerData.itemEnchantments[itemKey]),
            itemEnchantments: playerData.itemEnchantments?.[itemKey],
            hasEnchantedStats: !!(playerData.enchantedStats && playerData.enchantedStats[enchantmentSlotKey])
        });
    }
    */
    
    // We already checked enchantedStats above, so we know they exist
    const enchantments = playerData.enchantedStats[equipmentSlot];
    
    // Debug logging to check enchantments
    console.log(`[getEnchantedStatsHtml] Slot: ${slotKey}, Equipment: ${equippedItemName}, Enchantments:`, enchantments);
    
    const enchantedLines = enchantments.map(enchantment => {
        // Use wizard tier color for Wizard Tower enchantments, otherwise use normal tier color
        const isWizardEnchantment = ['life_steal', 'fire_damage', 'ice_damage'].includes(enchantment.stat);
        const colorClass = isWizardEnchantment ? ENCHANTMENT_STAT_TIER_COLORS.wizard : (ENCHANTMENT_STAT_TIER_COLORS[enchantment.tier] || '');
        const statDisplay = formatEnchantmentStat(enchantment.stat, enchantment.value);
        return `<span class="${colorClass}">${statDisplay}</span>`;
    }).join(''); // Join with no separator - CSS will handle line breaks
    
    return enchantedLines ? `<br><div class="enchant-stats-container">${enchantedLines}</div>` : '';
}

/**
 * Updates enchanted stats when equipment changes
 */
export function updateEnchantedStatsForEquipment(slotKey, newItemName) {
    const itemKey = `${slotKey}:${newItemName}`;
    
    // Check if this specific item has enchantments
    if (playerData.itemEnchantments && playerData.itemEnchantments[itemKey]) {
        // Load enchantments for this specific item
        playerData.enchantedStats[slotKey] = playerData.itemEnchantments[itemKey].enchantments;
    } else {
        // Clear enchantments if the new item has none
        playerData.enchantedStats[slotKey] = [];
    }
}

/**
 * Show the character information section
 */
export function showCharacterSection() {
    console.log('Showing character section');
    showSection('character-section');
    
    // Clear any existing live activity update interval
    if (liveActivityUpdateInterval) {
        clearInterval(liveActivityUpdateInterval);
        liveActivityUpdateInterval = null;
    }
    
    // Clear previous content to prevent duplication
    const charInfoTarget = document.getElementById('char-info-target');
    if (charInfoTarget) {
        charInfoTarget.innerHTML = '';
        // === Main Card Container ===
        const mainCard = document.createElement('div');
        mainCard.className = 'character-info-card';

        // === Header ===
        const header = document.createElement('div');
        header.className = 'character-section-header';
        header.innerHTML = `
            <div class="character-header-row" style="justify-content: space-between; width: 100%;">
                <div class="character-header-title" style="font-size: 1.3em; text-align: left; display: flex; align-items: center; gap: 10px;">
                    <span class="character-header-emoji" style="font-size: 1.5em; margin-right: 8px;">🧙‍♂️</span> Character Information
                </div>
                <button class="btn-back-header" id="character-back-btn" style="font-size: 1.3em; margin-left: 18px;">⬅️</button>
            </div>
        `;
        mainCard.appendChild(header);

        // Set up back button event listener
        const backBtn = header.querySelector('#character-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Clear interval when leaving character section
                if (liveActivityUpdateInterval) {
                    clearInterval(liveActivityUpdateInterval);
                    liveActivityUpdateInterval = null;
                }
                showSection('main-menu-section');
            });
        }

        ensureSkillsInitialized();
        const atkLvl = getLevelFromXp(playerData.skills.attack.xp);
        const wcLvl = getLevelFromXp(playerData.skills.woodcutting.xp);
        const mnLvl = getLevelFromXp(playerData.skills.mining.xp);
        const ckLvl = getLevelFromXp(playerData.skills.cooking.xp);
        const bsLvl = getLevelFromXp(playerData.skills.blacksmithing.xp);
        const maxHp = getMaxHp(atkLvl);

        // === Content Wrapper for Two Columns ===
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'card-internal-wrapper';

        // === Left Column (Stats, Speed, Skills, Permits) ===
        const leftCol = document.createElement('div');
        leftCol.className = 'card-left-column';

        // Combat Stats Section
        const combatStatsCard = document.createElement('div');
        combatStatsCard.className = 'character-section-card';
        combatStatsCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">⚔️</span> Combat Stats</div><div id="combat-stats-grid" class="character-section-grid"></div>`;
        leftCol.appendChild(combatStatsCard);
        setTimeout(() => populateCombatStatsDisplay(), 0);

        // Skill Speed Overview
        const skillSpeedCard = document.createElement('div');
        skillSpeedCard.className = 'character-section-card';
        skillSpeedCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">⏱️</span> Skill Speed Overview</div>`;
        const skillSpeedOverview = document.createElement('div');
        skillSpeedOverview.className = 'character-skill-speed-overview';
        populateSkillSpeedOverview(skillSpeedOverview);
        skillSpeedCard.appendChild(skillSpeedOverview);
        leftCol.appendChild(skillSpeedCard);

        // Skill Levels Section
        const skillsCard = document.createElement('div');
        skillsCard.className = 'character-section-card';
        skillsCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">📈</span> Skill Levels <span class="character-section-total-xp">Total XP: <span class="fore-magenta">${calculateTotalSkillXP().toLocaleString()}</span></span></div><div class="character-section-grid skill-levels-section-grid"></div>`;
        leftCol.appendChild(skillsCard);
        // Populate skill levels
        const statsGrid = skillsCard.querySelector('.skill-levels-section-grid');
        const skillsData = [
            { name: "Attack", emoji: "⚔️", value: atkLvl, xp: getXpForDisplay(playerData.skills.attack.xp, atkLvl), color: "fore-red" },
            { name: "Woodcutting", emoji: "🌲", value: wcLvl, xp: getXpForDisplay(playerData.skills.woodcutting.xp, wcLvl), color: "fore-green" },
            { name: "Mining", emoji: "⛏️", value: mnLvl, xp: getXpForDisplay(playerData.skills.mining.xp, mnLvl), color: "fore-lightblack_ex" },
            { name: "Cooking", emoji: "🍳", value: ckLvl, xp: getXpForDisplay(playerData.skills.cooking.xp, ckLvl), color: "fore-yellow" },
            { name: "Blacksmithing", emoji: "🛠️", value: bsLvl, xp: getXpForDisplay(playerData.skills.blacksmithing.xp, bsLvl), color: "fore-orange" }
        ];
        skillsData.forEach(skill => {
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.title = `XP: ${skill.xp.xpInCurrentLevel} / ${skill.xp.xpRequiredForNextLevel} (${skill.xp.percentToNextLevel.toFixed(0)}%)`;
            row.innerHTML = `<span class="stat-name">${skill.emoji} ${skill.name}:</span>
                            <span class="stat-value ${skill.color || ''}">Lvl ${skill.value} (${skill.xp.xpInCurrentLevel}/${skill.xp.xpRequiredForNextLevel} XP, ${skill.xp.percentToNextLevel.toFixed(0)}%)</span>`;
            statsGrid.appendChild(row);
        });

        // Permits Section
        const permitsCard = document.createElement('div');
        permitsCard.className = 'character-section-card';
        permitsCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">📜</span> Active Permits</div><div id="active-permits-list-target" class="character-section-grid"></div>`;
        leftCol.appendChild(permitsCard);
        // Populate permits
        const activePermitsList = permitsCard.querySelector('#active-permits-list-target');
        let hasActivePermits = false;
        if (playerData.permits) {
            for (const permitKey in playerData.permits) {
                if (playerData.permits[permitKey]) {
                    hasActivePermits = true;
                    const permitRow = document.createElement('div');
                    permitRow.className = 'stat-row';
                    const permitDetails = PERMIT_MASTER_LIST[permitKey] || {displayName: titleCase(permitKey), emoji: '📜'};
                    if (permitDetails.tier) {
                        permitRow.classList.add('item-card-tier', permitDetails.tier);
                    }
                    permitRow.innerHTML = `<span class="stat-name">${permitDetails.emoji} ${permitDetails.displayName}</span>
                                         <span class="stat-value fore-green">Active</span>`;
                    activePermitsList.appendChild(permitRow);
                }
            }
        }
        if (!hasActivePermits) activePermitsList.innerHTML = "<p style='padding:8px; text-align:center;'><i>No active permits.</i></p>";

        // Live Activity & Timers Section
        const liveActivityCard = document.createElement('div');
        liveActivityCard.className = 'character-section-card';
        liveActivityCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">⏱️</span> Live Activity & Timers</div><div id="live-activity-list-target" class="character-section-grid"></div>`;
        leftCol.appendChild(liveActivityCard);
        setTimeout(() => populateLiveActivityDisplay(), 0);

        // Built Structures Section
        const structuresCard = document.createElement('div');
        structuresCard.className = 'character-section-card';
        structuresCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">🏗️</span> Built Structures</div><div id="built-structures-list-target" class="character-section-grid"></div>`;
        leftCol.appendChild(structuresCard);
        
        // Populate structures
        const structuresList = structuresCard.querySelector('#built-structures-list-target');
        let hasStructures = false;
        if (playerData.built_structures) {
            for (const structureKey in playerData.built_structures) {
                if (playerData.built_structures[structureKey]) {
                    hasStructures = true;
                    const structureData = STRUCTURE_DATA[structureKey];
                    if (structureData) {
                        const structureRow = document.createElement('div');
                        structureRow.className = 'stat-row';
                        if (structureData.tier) {
                            structureRow.classList.add('item-card-tier', structureData.tier);
                        }
                        structureRow.innerHTML = `<span class="stat-name">${structureData.emoji || '🏗️'} ${structureData.name}</span>
                                               <span class="stat-value fore-green">Built</span>`;
                        structuresList.appendChild(structureRow);
                    }
                }
            }
        }
        if (!hasStructures) structuresList.innerHTML = "<p style='padding:8px; text-align:center;'><i>No structures built.</i></p>";

        // === Right Column (Equipment) ===
        const rightCol = document.createElement('div');
        rightCol.className = 'card-right-column';
        const equipmentCard = document.createElement('div');
        equipmentCard.className = 'character-section-card';
        equipmentCard.innerHTML = `<div class="character-section-title"><span class="character-section-icon">🛡️</span> Equipment</div><div id="equipment-display-target" class="character-section-grid equipment-section-grid"></div>`;
        rightCol.appendChild(equipmentCard);
        setTimeout(() => populateEquipmentDisplay(), 0);

        // Add columns to wrapper
        contentWrapper.appendChild(leftCol);
        contentWrapper.appendChild(rightCol);
        // Add wrapper to main card
        mainCard.appendChild(contentWrapper);
        // Add everything to the target
        charInfoTarget.appendChild(mainCard);
        // Hide equip selection dialog
        hideEquipSelection();
        
        // Set up live activity update interval (update every 5 seconds)
        liveActivityUpdateInterval = setInterval(() => {
            try {
                populateLiveActivityDisplay();
            } catch (e) {
                console.warn('Error updating live activity display:', e);
            }
        }, 5000);
    }
    
    // Also set up the main back button (at the bottom of the page)
    const mainBackButton = document.getElementById('character-back-button');
    if (mainBackButton) {
        mainBackButton.addEventListener('click', () => {
            // Clear interval when leaving character section
            if (liveActivityUpdateInterval) {
                clearInterval(liveActivityUpdateInterval);
                liveActivityUpdateInterval = null;
            }
            showSection('main-menu-section');
        });
    }
}

/**
 * Ensure skills structure is initialized
 */
function ensureSkillsInitialized() {
    if (!playerData.skills) {
        // Initialize skills if missing (for old save data)
        console.warn("Skills object missing - initializing from old XP values if available");
        playerData.skills = {
            attack: { xp: playerData.attack_xp || 0, is_active: false },
            woodcutting: { xp: playerData.woodcutting_xp || 0, is_active: false },
            mining: { xp: playerData.mining_xp || 0, is_active: false },
            cooking: { xp: playerData.cooking_xp || 0, is_active: false },
            blacksmithing: { xp: playerData.blacksmithing_xp || 0, is_active: false }
        };
        savePlayerData();
    } else {
        // Check for missing individual skills and initialize them
        const requiredSkills = ['attack', 'woodcutting', 'mining', 'cooking', 'blacksmithing'];
        let needsSave = false;
        
        requiredSkills.forEach(skill => {
            // Check if skill object is missing
            if (!playerData.skills[skill]) {
                console.warn(`Missing skill '${skill}' - initializing`);
                playerData.skills[skill] = { 
                    xp: playerData[`${skill}_xp`] || 0, 
                    is_active: false 
                };
                needsSave = true;
            } 
            // Check if skill object exists but is missing the xp property
            else if (typeof playerData.skills[skill].xp === 'undefined') {
                console.warn(`Skill '${skill}' missing XP property - initializing from old value if available`);
                playerData.skills[skill].xp = playerData[`${skill}_xp`] || 0;
                needsSave = true;
            }
        });
        
        if (needsSave) {
            savePlayerData();
        }
    }
}

/**
 * Check if a perk is active
 * @param {string} perkId - Perk ID to check
 * @returns {boolean} Whether perk is active
 * @deprecated Use getSummedPyramidPerkEffects() instead to check for specific effects
 */
function isPerkActive(perkId) { 
    console.warn(`isPerkActive(${perkId}) is deprecated. Use getSummedPyramidPerkEffects() instead.`);
    // For backward compatibility, check both systems
    const pyramidEffects = getSummedPyramidPerkEffects();
    const hasPyramidEffect = Object.values(pyramidEffects).some(effect => effect > 0);
    return !!(playerData && playerData.active_perks && playerData.active_perks[perkId]) || hasPyramidEffect;
}

/**
 * Get player combat stats
 * @returns {Object} Combat stats object with values and sources
 */
export function getPlayerCombatStats() {
    try {
        let sources = {
            damageMin: [], damageMax: [], critChance: [], lifesteal: [], defense: [], blockChance: [], blockAmount: [], attackSpeed: []
        };
    
        // Ensure playerData.equipment exists
        if (!playerData.equipment) {
            console.warn("Player equipment was not initialized, setting defaults");
            playerData.equipment = {
                weapon: "none",
                axe: "none",
                pickaxe: "none",
                helmet: "none",
                armor: "none"
            };
            savePlayerData();
        }
    
        // Determine weapon stats
        let weaponKey = playerData.equipment.weapon;
        let weaponName = "Fists";
        let baseWeaponStats = TOOL_DATA.axe.fists;
    
        if (weaponKey !== "none" && SWORD_DATA[weaponKey]) {
            weaponName = titleCase(weaponKey);
            baseWeaponStats = SWORD_DATA[weaponKey];
        } else {
            const axeKey = playerData.equipment.axe;
            const pickKey = playerData.equipment.pickaxe;
            if (axeKey !== "none" && TOOL_DATA.axe[axeKey]) {
                weaponName = titleCase(axeKey + " Axe"); 
                baseWeaponStats = TOOL_DATA.axe[axeKey];
            } else if (pickKey !== "none" && TOOL_DATA.pickaxe[pickKey]) {
                weaponName = titleCase(pickKey + " Pickaxe"); 
                baseWeaponStats = TOOL_DATA.pickaxe[pickKey];
            }
        }
        
        // Check if baseWeaponStats exists and has required properties
        if (!baseWeaponStats || typeof baseWeaponStats.min_dmg === 'undefined' || typeof baseWeaponStats.max_dmg === 'undefined') {
            console.warn("Invalid base weapon stats, using defaults");
            baseWeaponStats = { min_dmg: 1, max_dmg: 2, skill_type: "attack" };
        }
        
        // Calculate damage
        let minDmg = baseWeaponStats.min_dmg;
        let maxDmg = baseWeaponStats.max_dmg;
        sources.damageMin.push({ source: weaponName, value: baseWeaponStats.min_dmg });
        sources.damageMax.push({ source: weaponName, value: baseWeaponStats.max_dmg });
    
        let currentMinDmgMultiplier = 1;
        let currentMaxDmgMultiplier = 1;
    
        // Get pyramid effects
        const perkEffects = getSummedPyramidPerkEffects();
        
        // Apply weapon damage multiplier from pyramid if available
        if (perkEffects.weapon_damage_multiplier) {
            const damageBonus = perkEffects.weapon_damage_multiplier;
            sources.damageMin.push({ source: "Perk Tree", value: `+${(damageBonus * 100).toFixed(0)}%` });
            sources.damageMax.push({ source: "Perk Tree", value: `+${(damageBonus * 100).toFixed(0)}%` });
            currentMinDmgMultiplier += damageBonus;
            currentMaxDmgMultiplier += damageBonus;
        }
        
        if (playerData.built_structures && playerData.built_structures.stronghold) {
            const damagePerk = STRUCTURE_DATA.stronghold.perks.find(p => p.type === "global_damage_boost");
            if (damagePerk) {
                const structureBonus = damagePerk.value;
                sources.damageMin.push({ source: "The Stronghold", value: `+${(structureBonus * 100).toFixed(0)}%` });
                sources.damageMax.push({ source: "The Stronghold", value: `+${(structureBonus * 100).toFixed(0)}%` });
                currentMinDmgMultiplier += structureBonus;
                currentMaxDmgMultiplier += structureBonus;
            }
        }
        
        minDmg = Math.floor(baseWeaponStats.min_dmg * currentMinDmgMultiplier);
        maxDmg = Math.floor(baseWeaponStats.max_dmg * currentMaxDmgMultiplier);
        
        // Calculate attack speed
        let attackSpeedBonus = 0;
        const baseAttackSpeed = baseWeaponStats.attack_speed || 3.0; // Default 3 seconds
        sources.attackSpeed.push({ source: weaponName, value: `${baseAttackSpeed}s base` });
    
        // Calculate crit chance (base weapon stat plus pyramid effects)
        let critChance = baseWeaponStats.crit_chance || 0;
        sources.critChance.push({ source: weaponName, value: `${(critChance * 100).toFixed(0)}%` });
        
        // Add global Crit chance from Perk Tree
        if (perkEffects.crit) {
            critChance += perkEffects.crit;
            sources.critChance.push({ source: "Perk Tree", value: `+${(perkEffects.crit * 100).toFixed(0)}%` });
        }
    
        // Calculate lifesteal
        let lifestealChance = baseWeaponStats.lifesteal_chance || 0;
        sources.lifesteal.push({ source: weaponName, value: `${( (baseWeaponStats.lifesteal_chance || 0) * 100).toFixed(0)}%` });
        
        // Add lifesteal from pyramid if available
        if (perkEffects.lifesteal) {
            lifestealChance += perkEffects.lifesteal;
            sources.lifesteal.push({ source: "Perk Tree", value: `+${(perkEffects.lifesteal * 100).toFixed(0)}%` });
        }
        
        // Add attack speed from perks
        if (perkEffects.attack_speed) {
            attackSpeedBonus += perkEffects.attack_speed;
            sources.attackSpeed.push({ source: "Perk Tree", value: `+${(perkEffects.attack_speed * 100).toFixed(0)}% Speed` });
        }
    
        // Calculate defense and block stats
        let baseDefense = 0;
        let defense = 0;
        sources.defense.push({ source: "Base", value: "0%" });
    
        let blockChance = 0;
        sources.blockChance.push({ source: "Base", value: "0%" });
        
        let blockAmount = 0;
        sources.blockAmount.push({ source: "Base", value: "0" });
    
        // Calculate BASE defense from equipment primary stats (armor + helmet)
        const equippedChestplateKey = playerData.equipment.armor || playerData.equipment.chestplate; // Support both keys for backward compatibility
        if (equippedChestplateKey !== "none" && ARMOR_DATA[equippedChestplateKey]) {
            const chestItem = ARMOR_DATA[equippedChestplateKey];
            if (typeof chestItem.defense === 'number') {
                baseDefense += chestItem.defense;
                sources.defense.push({ source: titleCase(equippedChestplateKey), value: `+${(chestItem.defense * 100).toFixed(0)}%` });
            }
    
            if (chestItem.block_chance) {
                blockChance += chestItem.block_chance;
                sources.blockChance.push({ source: titleCase(equippedChestplateKey), value: `+${(chestItem.block_chance * 100).toFixed(0)}%` });
            }
            
            if (chestItem.block_amount) {
                blockAmount += chestItem.block_amount;
                sources.blockAmount.push({ source: titleCase(equippedChestplateKey), value: `+${chestItem.block_amount}%` });
            }
        }
        
        // Add helmet defense stats to base
        const equippedHelmetKey = playerData.equipment.helmet;
        if (equippedHelmetKey !== "none" && HELMET_DATA[equippedHelmetKey]) {
            const helmetItem = HELMET_DATA[equippedHelmetKey];
            if (typeof helmetItem.defense === 'number') {
                baseDefense += helmetItem.defense;
                sources.defense.push({ source: titleCase(equippedHelmetKey), value: `+${(helmetItem.defense * 100).toFixed(0)}%` });
            }
    
            if (helmetItem.block_chance) {
                blockChance += helmetItem.block_chance;
                sources.blockChance.push({ source: titleCase(equippedHelmetKey), value: `+${(helmetItem.block_chance * 100).toFixed(0)}%` });
            }
            
            if (helmetItem.block_amount) {
                blockAmount += helmetItem.block_amount;
                sources.blockAmount.push({ source: titleCase(equippedHelmetKey), value: `+${helmetItem.block_amount}%` });
            }
        }

        // Start with base defense from equipment
        defense = baseDefense;

        // Add perk defense bonuses as percentages of base defense
        if (perkEffects.defense) {
            const perkBonus = baseDefense * perkEffects.defense;
            defense += perkBonus;
            sources.defense.push({ source: 'Perk Tree', value: `+${(perkBonus * 100).toFixed(1)}%` });
        }
        if (perkEffects.block) {
            blockChance += perkEffects.block;
            sources.blockChance.push({ source: 'Perk Tree', value: `+${(perkEffects.block * 100).toFixed(0)}%` });
        }
        if (perkEffects.block_amount) {
            blockAmount += (perkEffects.block_amount * 100); // Convert decimal to whole number format
            sources.blockAmount.push({ source: 'Perk Tree', value: `+${(perkEffects.block_amount * 100).toFixed(0)}%` });
        }

        // Now calculate enchanted defense bonuses as percentages of base defense
        // Each enchantment is a percentage of the base defense, applied sequentially
        const enchantableSlots = ['weapon', 'armor', 'helmet', 'axe', 'pickaxe', 'left_ring', 'right_ring'];
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                // Filter and sort defense enchantments to apply them in order
                const defenseEnchantments = enchantments.filter(e => e.stat === 'defense_percent');
                defenseEnchantments.forEach(enchantment => {
                    if (baseDefense > 0) { // Only apply if there's base defense to calculate from
                        const enchantmentBonus = baseDefense * enchantment.value;
                        defense += enchantmentBonus;
                        const sourceLabel = `Enchanted ${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`;
                        sources.defense.push({ 
                            source: sourceLabel, 
                            value: `+${(enchantmentBonus * 100).toFixed(2)}% (${(enchantment.value * 100).toFixed(0)}% of base)` 
                        });
                    }
                });
            }
        });

        // Apply legacy enchantment bonuses for backward compatibility
        // Only apply if no new enchantments exist (to avoid double-counting)
        let hasNewDefenseEnchantments = false;
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.some(e => e.stat === 'defense_percent')) {
                hasNewDefenseEnchantments = true;
            }
        });
        
        if (!hasNewDefenseEnchantments) {
            const defenseEnchantmentBonus = getEnchantmentBonus('defense_percent');
            if (defenseEnchantmentBonus > 0 && baseDefense > 0) {
                const legacyBonus = baseDefense * defenseEnchantmentBonus;
                defense += legacyBonus;
                sources.defense.push({ source: "Legacy Enchantments", value: `+${(legacyBonus * 100).toFixed(2)}% (${(defenseEnchantmentBonus * 100).toFixed(0)}% of base)` });
            }
        }

        // Apply remaining enchanted stats from all equipment slots (non-defense)
        enchantableSlots.forEach(slotKey => {
            const enchantments = playerData.enchantedStats[slotKey];
            if (enchantments && enchantments.length > 0) {
                enchantments.forEach(enchantment => {
                    const sourceLabel = `Enchanted ${slotKey.charAt(0).toUpperCase() + slotKey.slice(1)}`;
                    
                    switch (enchantment.stat) {
                        case 'damage_flat':
                            minDmg += enchantment.value;
                            maxDmg += enchantment.value;
                            sources.damageMin.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value)}` });
                            sources.damageMax.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value)}` });
                            break;
                        case 'damage_percent':
                            const flatDamageBonus = (minDmg + maxDmg) / 2 * enchantment.value;
                            minDmg += flatDamageBonus;
                            maxDmg += flatDamageBonus;
                            sources.damageMin.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}%` });
                            sources.damageMax.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}%` });
                            break;
                        case 'crit_chance':
                            critChance += enchantment.value;
                            sources.critChance.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}%` });
                            break;
                        case 'defense_percent':
                            // Defense is now handled separately above to apply percentage-based calculation
                            break;
                        case 'hp_flat':
                            // HP is handled separately via getMaxHp function, but we can add a note
                            sources.hp = sources.hp || [];
                            sources.hp.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value)}` });
                            break;
                        case 'str_percent':
                            // STR affects damage in many RPGs
                            const strDamageBonus = (minDmg + maxDmg) / 2 * enchantment.value;
                            minDmg += strDamageBonus;
                            maxDmg += strDamageBonus;
                            sources.damageMin.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}% STR` });
                            sources.damageMax.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}% STR` });
                            break;
                        case 'luk_percent':
                            // LUK typically affects crit chance
                            critChance += enchantment.value * 0.5; // LUK gives half the crit chance as direct crit
                            sources.critChance.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}% LUK` });
                            break;
                        case 'attack_speed':
                            attackSpeedBonus += enchantment.value;
                            sources.attackSpeed.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}% Speed` });
                            break;
                        case 'life_steal':
                            lifestealChance += enchantment.value;
                            sources.lifesteal.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value * 100)}%` });
                            break;
                        case 'fire_damage':
                            sources.fireDamage = sources.fireDamage || [];
                            sources.fireDamage.push({ source: sourceLabel, value: `+${Math.floor(enchantment.value)} DoT` });
                            break;
                        case 'ice_damage':
                            sources.iceDamage = sources.iceDamage || [];
                            sources.iceDamage.push({ source: sourceLabel, value: `${Math.floor(enchantment.value * 100)}% Slow` });
                            break;
                    }
                });
            }
        });
    
        return {
            damage: { 
                value: `${Math.round(minDmg)} - ${Math.round(maxDmg)}`, 
                sources: sources.damageMin.concat(sources.damageMax.filter(s => s.source !== weaponName)) // Combine min/max sources, avoid duplicating weapon name
            },
            critChance: { 
                value: `${(critChance * 100).toFixed(0)}%`, 
                sources: sources.critChance 
            },
            lifesteal: { 
                value: `${(lifestealChance * 100).toFixed(0)}%`, 
                sources: sources.lifesteal 
            },
            defense: { 
                value: `${(defense * 100).toFixed(0)}%`, 
                sources: sources.defense 
            },
            blockChance: { 
                value: `${(blockChance * 100).toFixed(0)}%`, 
                sources: sources.blockChance 
            },
            blockAmount: { 
                value: `${blockAmount.toFixed(0)}%`, 
                sources: sources.blockAmount 
            },
            attackSpeed: {
                value: `${((baseAttackSpeed * (1 - attackSpeedBonus)).toFixed(2))}s`,
                sources: sources.attackSpeed
            },
            // Global AOE stats from weapons and perks
            aoeChance: {
                value: `${((() => {
                    const effects = getSummedPyramidPerkEffects();
                    
                    // Get weapon AOE chance (combat weapons only, not pickaxes)
                    let weaponAoeChance = 0;
                    if (playerData.equipment?.weapon && playerData.equipment.weapon !== 'none' && SWORD_DATA[playerData.equipment.weapon]) {
                        weaponAoeChance = SWORD_DATA[playerData.equipment.weapon].aoe_chance || 0;
                    } else if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
                        weaponAoeChance = TOOL_DATA.axe[playerData.equipment.axe].aoe_chance || 0;
                    }
                    // Note: Pickaxe AOE is for mining, not combat
                    
                    const perkAoeChance = (effects.aoe_chance || 0) + (effects.aoe_chance_attack || 0);
                    return weaponAoeChance + perkAoeChance;
                })() * 100).toFixed(0)}%`,
                sources: (() => {
                    const effects = getSummedPyramidPerkEffects();
                    const aoeSources = [];
                    
                    // Add weapon source (combat weapons only, not pickaxes)
                    let weaponAoeChance = 0;
                    let weaponName = "None";
                    if (playerData.equipment?.weapon && playerData.equipment.weapon !== 'none' && SWORD_DATA[playerData.equipment.weapon]) {
                        weaponAoeChance = SWORD_DATA[playerData.equipment.weapon].aoe_chance || 0;
                        weaponName = titleCase(playerData.equipment.weapon);
                    } else if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
                        weaponAoeChance = TOOL_DATA.axe[playerData.equipment.axe].aoe_chance || 0;
                        weaponName = titleCase(playerData.equipment.axe + " Axe");
                    }
                    // Note: Pickaxe AOE is for mining, not combat
                    
                    if (weaponAoeChance > 0) {
                        aoeSources.push({ source: weaponName, value: `${(weaponAoeChance * 100).toFixed(0)}%` });
                    }
                    
                    // Add perk sources
                    const perkAoeChance = (effects.aoe_chance || 0) + (effects.aoe_chance_attack || 0);
                    if (perkAoeChance > 0) {
                        aoeSources.push({ source: 'Perks', value: `${(perkAoeChance * 100).toFixed(0)}%` });
                    }
                    
                    return aoeSources.length > 0 ? aoeSources : [{ source: 'Base', value: '0%' }];
                })()
            },
            aoeDamage: {
                value: `${((() => {
                    const effects = getSummedPyramidPerkEffects();
                    
                    // Get weapon AOE damage percentage
                    let weaponAoeDamage = 0;
                    if (playerData.equipment?.weapon && playerData.equipment.weapon !== 'none' && SWORD_DATA[playerData.equipment.weapon]) {
                        weaponAoeDamage = SWORD_DATA[playerData.equipment.weapon].aoe_damage_percentage || 0;
                    } else if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
                        weaponAoeDamage = TOOL_DATA.axe[playerData.equipment.axe].aoe_damage_percentage || 0;
                    } else if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
                        weaponAoeDamage = TOOL_DATA.pickaxe[playerData.equipment.pickaxe].aoe_damage_percentage || 0;
                    }
                    
                    // Get perk AOE damage (using correct key names from perks.js)
                    const perkAoeDamage = (effects.aoe_damage || 0) + (effects.aoe_damage_attack || 0);
                    return weaponAoeDamage + perkAoeDamage;
                })() * 100).toFixed(0)}%`,
                sources: (() => {
                    const effects = getSummedPyramidPerkEffects();
                    const aoeDamageSources = [];
                    
                    // Add weapon source
                    let weaponAoeDamage = 0;
                    let weaponName = "None";
                    if (playerData.equipment?.weapon && playerData.equipment.weapon !== 'none' && SWORD_DATA[playerData.equipment.weapon]) {
                        weaponAoeDamage = SWORD_DATA[playerData.equipment.weapon].aoe_damage_percentage || 0;
                        weaponName = titleCase(playerData.equipment.weapon);
                    } else if (playerData.equipment?.axe && playerData.equipment.axe !== 'none' && TOOL_DATA.axe[playerData.equipment.axe]) {
                        weaponAoeDamage = TOOL_DATA.axe[playerData.equipment.axe].aoe_damage_percentage || 0;
                        weaponName = titleCase(playerData.equipment.axe + " Axe");
                    } else if (playerData.equipment?.pickaxe && playerData.equipment.pickaxe !== 'none' && TOOL_DATA.pickaxe[playerData.equipment.pickaxe]) {
                        weaponAoeDamage = TOOL_DATA.pickaxe[playerData.equipment.pickaxe].aoe_damage_percentage || 0;
                        weaponName = titleCase(playerData.equipment.pickaxe + " Pickaxe");
                    }
                    
                    if (weaponAoeDamage > 0) {
                        aoeDamageSources.push({ source: weaponName, value: `${(weaponAoeDamage * 100).toFixed(0)}%` });
                    }
                    
                    // Add perk sources (using correct key names)
                    const perkAoeDamage = (effects.aoe_damage || 0) + (effects.aoe_damage_attack || 0);
                    if (perkAoeDamage > 0) {
                        aoeDamageSources.push({ source: 'Perks', value: `${(perkAoeDamage * 100).toFixed(0)}%` });
                    }
                    
                    return aoeDamageSources.length > 0 ? aoeDamageSources : [{ source: 'Base', value: '0%' }];
                })()
            },
            // Calculate total fire damage
            fireDamage: {
                value: `${(() => {
                    let totalFireDamage = 0;
                    enchantableSlots.forEach(slotKey => {
                        const enchantments = playerData.enchantedStats[slotKey];
                        if (enchantments && enchantments.length > 0) {
                            enchantments.forEach(enchantment => {
                                if (enchantment.stat === 'fire_damage') {
                                    totalFireDamage += enchantment.value;
                                }
                            });
                        }
                    });
                    return Math.floor(totalFireDamage);
                })()}`,
                sources: sources.fireDamage || [{ source: 'Base', value: '0' }]
            },
            // Calculate total ice slow chance
            iceDamage: {
                value: `${(() => {
                    let totalIceChance = 0;
                    enchantableSlots.forEach(slotKey => {
                        const enchantments = playerData.enchantedStats[slotKey];
                        if (enchantments && enchantments.length > 0) {
                            enchantments.forEach(enchantment => {
                                if (enchantment.stat === 'ice_damage') {
                                    totalIceChance += enchantment.value;
                                }
                            });
                        }
                    });
                    return (totalIceChance * 100).toFixed(0);
                })()}%`,
                sources: sources.iceDamage || [{ source: 'Base', value: '0%' }]
            }
        };
    } catch (error) {
        console.error("Error in getPlayerCombatStats:", error);
        // Return default combat stats in case of error
        return {
            damage: { value: "1 - 2", sources: [{ source: "Default (Error)", value: "1-2" }] },
            critChance: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] },
            lifesteal: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] },
            defense: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] },
            blockChance: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] },
            blockAmount: { value: "0", sources: [{ source: "Default (Error)", value: "0" }] },
            aoeChance: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] },
            aoeDamage: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] },
            fireDamage: { value: "0", sources: [{ source: "Default (Error)", value: "0" }] },
            iceDamage: { value: "0%", sources: [{ source: "Default (Error)", value: "0%" }] }
        };
    }
}

/**
 * Populate combat stats display
 */
export function populateCombatStatsDisplay() {
    const combatStatsGrid = document.getElementById('combat-stats-grid');
    if (!combatStatsGrid) return;
    combatStatsGrid.innerHTML = '';

    const combatStatsData = getPlayerCombatStats();

    const statsToDisplayConfig = [
        { key: 'damage', name: "Damage", emoji: "💥" },
        { key: 'critChance', name: "Crit Chance", emoji: "🎯" },
        { key: 'lifesteal', name: "Lifesteal", emoji: "🩸" },
        { key: 'defense', name: "Defense", emoji: "🛡️" },
        { key: 'blockChance', name: "Block Chance", emoji: "🛡️✋" },
        { key: 'blockAmount', name: "Block Amount", emoji: "🛡️💪" },
        { key: 'aoeChance', name: "AOE Chance", emoji: "🌪️" },
        { key: 'aoeDamage', name: "AOE Damage", emoji: "🔥" },
        { key: 'fireDamage', name: "Fire Damage", emoji: "🔥" },
        { key: 'iceDamage', name: "Ice Slow", emoji: "❄️" }
    ];

    // Descriptions for each stat (except critChance, which is dynamic)
    const statDescriptions = {
        damage: "Your base damage range per hit.",
        lifesteal: "Chance to heal a percentage of damage dealt on hit.",
        defense: "Reduces incoming damage by this percent.",
        blockChance: "Chance to fully block an incoming attack.",
        blockAmount: "Amount of damage absorbed when a block occurs.",
        aoeChance: "Chance to hit multiple targets in one action.",
        aoeDamage: "Damage percentage dealt to each additional target.",
        fireDamage: "Fire damage over time (3 ticks, 1 damage per second).",
        iceDamage: "Chance to slow monster attack speed by 30% for 5 seconds."
    };
    statsToDisplayConfig.forEach(statConfig => {
        const statDetail = combatStatsData[statConfig.key];
        const row = document.createElement('div');
        row.className = 'stat-row';
        
        // Build tooltip markup: description then sources
        let tooltipText = '<div class="tooltip-desc">';
        if (statConfig.key === 'critChance') {
            const effects = getSummedPyramidPerkEffects();
            const baseCritMult = 1.5; // Base crit multiplier
            const extraCritMult = effects.crit_multiplier || 0;
            const totalCritMult = baseCritMult + extraCritMult;
            tooltipText += `Chance to critically hit for ${totalCritMult.toFixed(2)}x damage.`;
        } else if (statDescriptions[statConfig.key]) {
            tooltipText += statDescriptions[statConfig.key];
        }
        tooltipText += '</div>';
        // Sources section
        tooltipText += '<div class="tooltip-sources"><strong>Sources:</strong><br>';
        statDetail.sources.forEach(s => {
            tooltipText += `${s.source}: ${s.value}<br>`;
        });
        tooltipText += '</div>';

        row.innerHTML = `<span class="stat-name">${statConfig.emoji} ${statConfig.name}:</span>
                         <span class="stat-value">${statDetail.value}</span>`;
        
        // Add custom tooltip
        const tooltipSpan = document.createElement('span');
        tooltipSpan.className = 'custom-tooltip-text';
        tooltipSpan.innerHTML = tooltipText.trim();
        row.appendChild(tooltipSpan);

        combatStatsGrid.appendChild(row);
    });
}

/**
 * Populate equipment display
 */
export function populateEquipmentDisplay() {
    const eqGrid = document.getElementById('equipment-display-target');
    if (!eqGrid) return;
    
    eqGrid.innerHTML = ''; // Clear previous

    // Ensure playerData.equipment exists
    if (!playerData.equipment) {
        console.warn("Player equipment was not initialized in populateEquipmentDisplay, setting defaults");
        playerData.equipment = {
            weapon: "none",
            axe: "none",
            pickaxe: "none",
            helmet: "none",
            armor: "none",
            left_ring: "none",
            right_ring: "none"
        };
        savePlayerData();
    }
    
    // Ensure ring slots exist in existing saves
    if (!playerData.equipment.left_ring) playerData.equipment.left_ring = "none";
    if (!playerData.equipment.right_ring) playerData.equipment.right_ring = "none";
    
    const slots = [
        // Row 1: Weapon, Axe, Pickaxe
        { key: 'weapon', name: 'Weapon', data: SWORD_DATA, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if(!itemData) return "N/A";
            let minDmg = itemData.min_dmg; 
            let maxDmg = itemData.max_dmg;
            
            // Weapon Master perk is now handled via pyramid perk system above
            
            if (playerData.built_structures && playerData.built_structures.stronghold) {
                const dmgPerk = STRUCTURE_DATA.stronghold.perks.find(p => p.type === "global_damage_boost");
                if(dmgPerk) { 
                    minDmg = Math.floor(minDmg * (1+dmgPerk.value)); 
                    maxDmg = Math.floor(maxDmg * (1+dmgPerk.value));
                }
            }
            
            let stats = `Dmg: ${minDmg}-${maxDmg}`;
            if(playerData.built_structures && playerData.built_structures.stronghold && 
               STRUCTURE_DATA.stronghold.perks.find(p => p.type === "global_damage_boost")) {
                stats += "*";
            }
            
            let lsChance = itemData.lifesteal_chance || 0;
            // Vampiric Edge perk is now handled via pyramid perk system
            if(lsChance > 0) stats += `<br>LS: ${(lsChance*100).toFixed(0)}%`;
            
            // Add enchanted stats
            stats += getEnchantedStatsHtml('weapon');
            
            return stats;
          }
        },
        { key: 'axe', name: 'Axe', data: TOOL_DATA.axe, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config.base}`;
            stats += getEnchantedStatsHtml('axe');
            return stats;
          }
        },
        { key: 'pickaxe', name: 'Pickaxe', data: TOOL_DATA.pickaxe, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config.base}`;
            stats += getEnchantedStatsHtml('pickaxe');
            return stats;
          }
        },
        // Row 2: Chestplate, Helmet
        { key: 'armor', name: 'Chestplate', data: ARMOR_DATA, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            stats += getEnchantedStatsHtml('armor');
            return stats;
          }
        },
        { key: 'helmet', name: 'Helmet', data: HELMET_DATA, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            stats += getEnchantedStatsHtml('helmet');
            return stats;
          }
        },
        // Row 3: Left Ring, Right Ring
        { key: 'left_ring', name: 'Left Ring', data: RING_DATA, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `+${itemData.hp_bonus} HP<br>+${(itemData.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemData.str_percentage * 100).toFixed(1)}% Str`;
            stats += getEnchantedStatsHtml('left_ring');
            return stats;
          }
        },
        { key: 'right_ring', name: 'Right Ring', data: RING_DATA, 
          colorClassGetter: (itemData) => itemData.color, 
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `+${itemData.hp_bonus} HP<br>+${(itemData.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemData.str_percentage * 100).toFixed(1)}% Str`;
            stats += getEnchantedStatsHtml('right_ring');
            return stats;
          }
        }
    ];

    try {
        slots.forEach(slotInfo => {
            if (!playerData.equipment || !slotInfo) {
                console.warn("Missing playerData.equipment or slotInfo in slots.forEach");
                return; // Skip this iteration
            }
            
            // Skip any placeholder slots (shouldn't exist anymore but just in case)
            if (slotInfo.isPlaceholder || slotInfo.isEmptyVisual) {
                return; // Skip this iteration
            }
            
            const equippedItemName = playerData.equipment[slotInfo.key];
            const itemData = (equippedItemName === "none" || !slotInfo.data) ? 
                            null : slotInfo.data[equippedItemName];
            
            const slotDiv = document.createElement('div');
            slotDiv.className = 'equipment-slot';
            // Add tier border class
            if (itemData && itemData.tier) { // itemData is defined a few lines above
                slotDiv.classList.add('item-card-tier', itemData.tier.toLowerCase());
            }

            // Determine if the equipped item is enchanted for name display
            let itemNameDisplay = "None";
            let isEnchantedItem = false;
            if (itemData) {
                itemNameDisplay = titleCase(equippedItemName);
                // Check if this slot has active enchantments
                if (['weapon', 'helmet', 'armor', 'axe', 'pickaxe'].includes(slotInfo.key)) {
                    const currentEnchantments = playerData.enchantedStats && playerData.enchantedStats[slotInfo.key];
                    if (currentEnchantments && currentEnchantments.length > 0) {
                        itemNameDisplay += " (Enchanted)";
                        isEnchantedItem = true;
                    }
                }
            }
            const itemColor = itemData ? slotInfo.colorClassGetter(itemData) : "fore-white";
            const itemEmoji = itemData ? (itemData.emoji || "❔") : "➖";
            const itemStatsDisplay = slotInfo.statGetter ? slotInfo.statGetter(itemData) : "N/A";
            
            // Check if currently equipped item has enchantments (for enchantable slots)
            let enchantmentInfo = '';
            if (itemData && ['weapon', 'helmet', 'armor', 'axe', 'pickaxe'].includes(slotInfo.key)) {
                const slotKey = slotInfo.key;
                // Check enchantedStats to see if what's actually equipped is enchanted
                const currentEnchantments = playerData.enchantedStats && playerData.enchantedStats[slotKey];
                if (currentEnchantments && currentEnchantments.length > 0) {
                    enchantmentInfo = `<div class="item-enchant-info fore-purple">Enchanted`;
                    // Get count from itemEnchantments if available
                    const itemKey = `${slotKey}:${equippedItemName}`;
                    if (playerData.itemEnchantments && playerData.itemEnchantments[itemKey] && playerData.itemEnchantments[itemKey].count) {
                        enchantmentInfo += ` (${playerData.itemEnchantments[itemKey].count}/${MAX_ENCHANTMENTS})`;
                    }
                    enchantmentInfo += `</div>`;
                }
            }
            
            // Render image icons for axes, pickaxes, swords, armor, and helmets
            let iconHtml;
            if (itemData) {
                if (slotInfo.key === 'axe') {
                    iconHtml = `<img src="assets/${equippedItemName}-axe.png" class="inventory-item-icon">`;
                } else if (slotInfo.key === 'pickaxe') {
                    iconHtml = `<img src="assets/${equippedItemName}-pickaxe.png" class="inventory-item-icon">`;
                } else if (slotInfo.key === 'weapon') {
                    const fileName = equippedItemName.replace(/ /g, '-').replace('-2h-sword','-2hsword');
                    iconHtml = `<img src="assets/${fileName}.png" class="inventory-item-icon">`;
                } else if (slotInfo.key === 'armor') {
                    // Extract material name and convert to proper case for filename
                    const materialName = equippedItemName.toLowerCase().replace(/\s+chestplate$/, '');
                    const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
                    iconHtml = `<img src="assets/${fileName}" class="inventory-item-icon">`;
                } else if (slotInfo.key === 'helmet') {
                    // Handle special case for "Full Dragon Helmet"
                    if (equippedItemName.toLowerCase().includes('dragon helmet')) {
                        iconHtml = `<img src="assets/Dragon-Full-Helmet.png" class="inventory-item-icon">`;
                    } else {
                        iconHtml = itemEmoji; // Fallback for other helmets
                    }
                } else {
                    iconHtml = itemEmoji;
                }
            } else {
                iconHtml = itemEmoji;
            }
            slotDiv.innerHTML = `
                <div class="slot-name">${slotInfo.name}</div>
                <div class="slot-item">
                    <div class="item-name ${itemColor}">${itemNameDisplay}</div>
                    <div class="item-icon item-border ${itemData ? itemData.tier : ''}">${iconHtml}</div>
                    <div class="item-stats">${itemStatsDisplay}</div>
                    ${enchantmentInfo}
                </div>`;
                
            const equipButton = document.createElement('button');
            equipButton.className = 'menu-button equip-btn';
            equipButton.innerHTML = `Equip ${slotInfo.name}`;
            equipButton.addEventListener('click', () => showEquipSelection(slotInfo.key));

            slotDiv.appendChild(equipButton);
            // Add equipment slot to grid
            eqGrid.appendChild(slotDiv);
        });
    } catch (error) {
        console.error("Error in populateEquipmentDisplay:", error);
    }
}

// Show equipment selection for a slot
export function showEquipSelection(slot) {
    const listDiv = document.getElementById('equip-item-list-target');
    if (listDiv) listDiv.innerHTML = '';
    const titleEl = document.getElementById('equip-item-type-title-target');
    // Fix display names for ring slots
    const displayName = slot === 'left_ring' ? 'Left Ring' : 
                       slot === 'right_ring' ? 'Right Ring' : 
                       titleCase(slot);
    if (titleEl) titleEl.textContent = `Equip ${displayName}`;
    let foundItems = false;
    
    // Map slot to the correct item data source and ensure consistent slot naming
    const dataSlot = slot === 'chestplate' ? 'armor' : slot;
    const relevantItemSource = dataSlot === 'weapon' ? SWORD_DATA :
                             dataSlot === 'axe' ? TOOL_DATA.axe :
                             dataSlot === 'pickaxe' ? TOOL_DATA.pickaxe :
                             dataSlot === 'armor' ? ARMOR_DATA :
                             dataSlot === 'helmet' ? HELMET_DATA :
                             dataSlot === 'left_ring' ? RING_DATA :
                             dataSlot === 'right_ring' ? RING_DATA : {};
    
    // First, show unenchanted items
    Object.entries(playerData.inventory).forEach(([itemName, qty]) => {
        if (qty > 0 && relevantItemSource[itemName]) {
            // For unenchanted items, we always show them if they're in inventory
            // The inventory already handles equipped items properly (removes them when equipped)
            const unenchantedQty = qty;
            
            // Show unenchanted versions if any
            if (unenchantedQty > 0) {
                foundItems = true;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item';
                itemDiv.style.cursor = 'pointer';
                itemDiv.addEventListener('click', () => equipItem(dataSlot, itemName));
                const itemDataForSlot = relevantItemSource[itemName];
                let statsDisplay = '';
                if (slot === 'weapon' && itemDataForSlot.min_dmg != null) {
                    statsDisplay = `Dmg: ${itemDataForSlot.min_dmg}-${itemDataForSlot.max_dmg}` +
                        (itemDataForSlot.lifesteal_chance ? `<br>Lifesteal: ${(itemDataForSlot.lifesteal_chance * 100).toFixed(0)}%` : '');
                } else if ((slot === 'armor' || slot === 'helmet') && itemDataForSlot.defense != null) {
                    statsDisplay = `Def: ${(itemDataForSlot.defense * 100).toFixed(0)}%` +
                        (itemDataForSlot.block_chance ? `<br>Block: ${(itemDataForSlot.block_chance * 100).toFixed(0)}% / ${itemDataForSlot.block_amount}` : '');
                } else if ((slot === 'axe' || slot === 'pickaxe') && itemDataForSlot.yield_config) {
                    statsDisplay = `Yield: ${itemDataForSlot.yield_config.base}`;
                    if (itemDataForSlot.speed_multiplier) {
                        const speedPercent = Math.round((1 - itemDataForSlot.speed_multiplier) * 100);
                        statsDisplay += `<br>Speed: +${speedPercent}%`;
                    }
                } else if ((slot === 'left_ring' || slot === 'right_ring') && itemDataForSlot.hp_bonus != null) {
                    statsDisplay = `+${itemDataForSlot.hp_bonus} HP<br>+${(itemDataForSlot.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemDataForSlot.str_percentage * 100).toFixed(1)}% Str`;
                }
                // Render image icons for axes, pickaxes, swords, armor, and helmets in equip selection
                let iconHtmlSel;
                if (slot === 'axe') {
                    iconHtmlSel = `<img src="assets/${itemName}-axe.png" class="inventory-item-icon">`;
                } else if (slot === 'pickaxe') {
                    iconHtmlSel = `<img src="assets/${itemName}-pickaxe.png" class="inventory-item-icon">`;
                } else if (slot === 'weapon') {
                    const fileNameSel = itemName.replace(/ /g, '-').replace('-2h-sword','-2hsword');
                    iconHtmlSel = `<img src="assets/${fileNameSel}.png" class="inventory-item-icon">`;
                } else if (slot === 'armor') {
                    // Extract material name and convert to proper case for filename
                    const materialName = itemName.toLowerCase().replace(/\s+chestplate$/, '');
                    const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
                    iconHtmlSel = `<img src="assets/${fileName}" class="inventory-item-icon">`;
                } else if (slot === 'helmet') {
                    // Handle special case for "Full Dragon Helmet"
                    if (itemName.toLowerCase().includes('dragon helmet')) {
                        iconHtmlSel = `<img src="assets/Dragon-Full-Helmet.png" class="inventory-item-icon">`;
                    } else {
                        iconHtmlSel = itemDataForSlot.emoji || '❔';
                    }
                } else if (slot === 'left_ring' || slot === 'right_ring') {
                    iconHtmlSel = itemDataForSlot.emoji || '💍';
                } else {
                    iconHtmlSel = itemDataForSlot.emoji || '❔';
                }
                itemDiv.innerHTML = `
                    <div class="item-icon">${iconHtmlSel}</div>
                    <div class="item-info">
                        <div class="item-name ${itemDataForSlot.color || 'fore-white'}">${titleCase(itemName)}</div>
                        <div class="item-quantity">x${unenchantedQty}</div>
                        <div class="item-details" style="font-size:0.8em;color:#aaa;">${statsDisplay}</div>
                    </div>`;
                listDiv.appendChild(itemDiv);
            }
        }
    });
    
    // Then, show enchanted items
    const enchantableSlots = ['weapon', 'armor', 'helmet', 'axe', 'pickaxe', 'left_ring', 'right_ring'];
    if (enchantableSlots.includes(dataSlot) && playerData.itemEnchantments) {
        Object.entries(playerData.itemEnchantments).forEach(([enchantKey, enchantData]) => {
            const keyParts = enchantKey.split(':');
            const slotKey = keyParts[0];
            const enchantedItemName = keyParts[1];
            
            // For rings, check if it's any ring slot since they share inventory
            const isRingSlot = dataSlot === 'left_ring' || dataSlot === 'right_ring';
            const isMatchingRingSlot = slotKey === 'left_ring' || slotKey === 'right_ring';
            const slotsMatch = isRingSlot ? isMatchingRingSlot : (slotKey === dataSlot);
            
            // Only show this enchanted item if:
            // 1. It matches the slot we're equipping for
            // 2. It has enchantments
            // 3. The base item type exists in the data
            // 4. Either: the item is in inventory, OR it's currently equipped in the slot we're selecting for
            const isCurrentlyEquippedInThisSlot = playerData.equipment[dataSlot] === enchantedItemName;
            const isAvailableInInventory = playerData.inventory[enchantedItemName] > 0;
            
            if (slotsMatch && enchantData.enchantments && enchantData.enchantments.length > 0 &&
                relevantItemSource[enchantedItemName] && (isAvailableInInventory || isCurrentlyEquippedInThisSlot)) {
                foundItems = true;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'inventory-item enchanted-item';
                itemDiv.style.cursor = 'pointer';
                itemDiv.addEventListener('click', () => equipItemEnchanted(dataSlot, enchantedItemName, enchantKey));
                
                const itemDataForSlot = relevantItemSource[enchantedItemName];
                let statsDisplay = '';
                if (slot === 'weapon' && itemDataForSlot.min_dmg != null) {
                    statsDisplay = `Dmg: ${itemDataForSlot.min_dmg}-${itemDataForSlot.max_dmg}` +
                        (itemDataForSlot.lifesteal_chance ? `<br>Lifesteal: ${(itemDataForSlot.lifesteal_chance * 100).toFixed(0)}%` : '');
                } else if ((slot === 'armor' || slot === 'helmet') && itemDataForSlot.defense != null) {
                    statsDisplay = `Def: ${(itemDataForSlot.defense * 100).toFixed(0)}%` +
                        (itemDataForSlot.block_chance ? `<br>Block: ${(itemDataForSlot.block_chance * 100).toFixed(0)}% / ${itemDataForSlot.block_amount}` : '');
                } else if ((slot === 'axe' || slot === 'pickaxe') && itemDataForSlot.yield_config) {
                    statsDisplay = `Yield: ${itemDataForSlot.yield_config.base}`;
                    if (itemDataForSlot.speed_multiplier) {
                        const speedPercent = Math.round((1 - itemDataForSlot.speed_multiplier) * 100);
                        statsDisplay += `<br>Speed: +${speedPercent}%`;
                    }
                }
                
                // Add enchantment info
                let enchantmentDisplay = '<div style="color: #9370DB; font-size: 0.8em;">';
                enchantData.enchantments.forEach(enchantment => {
                    const colorClass = ENCHANTMENT_STAT_TIER_COLORS[enchantment.tier] || '';
                    const statDisplay = formatEnchantmentStat(enchantment.stat, enchantment.value);
                    enchantmentDisplay += `<div class="${colorClass}">${statDisplay}</div>`;
                });
                enchantmentDisplay += `<div>Enchantments: ${enchantData.count}/${MAX_ENCHANTMENTS}</div></div>`;
                
                // Render image icons
                let iconHtmlSel;
                if (slot === 'axe') {
                    iconHtmlSel = `<img src="assets/${enchantedItemName}-axe.png" class="inventory-item-icon">`;
                } else if (slot === 'pickaxe') {
                    iconHtmlSel = `<img src="assets/${enchantedItemName}-pickaxe.png" class="inventory-item-icon">`;
                } else if (slot === 'weapon') {
                    const fileNameSel = enchantedItemName.replace(/ /g, '-').replace('-2h-sword','-2hsword');
                    iconHtmlSel = `<img src="assets/${fileNameSel}.png" class="inventory-item-icon">`;
                } else if (slot === 'armor') {
                    // Extract material name and convert to proper case for filename
                    const materialName = enchantedItemName.toLowerCase().replace(/\s+chestplate$/, '');
                    const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
                    iconHtmlSel = `<img src="assets/${fileName}" class="inventory-item-icon">`;
                } else if (slot === 'helmet') {
                    // Handle special case for "Full Dragon Helmet"
                    if (enchantedItemName.toLowerCase().includes('dragon helmet')) {
                        iconHtmlSel = `<img src="assets/Dragon-Full-Helmet.png" class="inventory-item-icon">`;
                    } else {
                        iconHtmlSel = itemDataForSlot.emoji || '❔';
                    }
                } else {
                    iconHtmlSel = itemDataForSlot.emoji || '❔';
                }
                
                const quantityDisplay = isCurrentlyEquippedInThisSlot ? "Equipped" : "x1";
                const namePrefix = isCurrentlyEquippedInThisSlot ? "✨ " : "";
                
                itemDiv.innerHTML = `
                    <div class="item-icon">${iconHtmlSel}</div>
                    <div class="item-info">
                        <div class="item-name ${itemDataForSlot.color || 'fore-white'}">${namePrefix}${titleCase(enchantedItemName)} (Enchanted)</div>
                        <div class="item-quantity">${quantityDisplay}</div>
                        <div class="item-details" style="font-size:0.8em;color:#aaa;">
                            ${statsDisplay}
                            ${enchantmentDisplay}
                        </div>
                    </div>`;
                listDiv.appendChild(itemDiv);
            }
        });
    }
    
    if (!foundItems && listDiv) listDiv.innerHTML = `<p style='text-align:center;'>No suitable ${slot}s in inventory.</p>`;
    const overlay = document.getElementById('equip-modal-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

// Hide equipment selection UI
export function hideEquipSelection() {
    const overlay = document.getElementById('equip-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// Equip an item in a specific slot
export function equipItem(slot, itemName) {
    if (!playerData.equipment) {
        playerData.equipment = { weapon:'none', axe:'none', pickaxe:'none', helmet:'none', armor:'none', left_ring:'none', right_ring:'none' };
    }
    // Handle slot name mapping
    const equipmentSlot = slot;
    
    const oldItem = playerData.equipment[equipmentSlot];
    
    // Check if we're equipping the same unenchanted item that's already equipped
    const hasEnchantments = playerData.enchantedStats && playerData.enchantedStats[equipmentSlot] && playerData.enchantedStats[equipmentSlot].length > 0;
    if (oldItem === itemName && !hasEnchantments) {
        // Same unenchanted item is already equipped - no change needed
        logMessage(`${titleCase(itemName)} is already equipped.`, 'fore-yellow', '⚠️');
        hideEquipSelection();
        return;
    }
    // If hasEnchantments is true, we allow the swap even with same item name
    // This allows switching from enchanted to unenchanted version
    
    // Return old item to inventory if it's not 'none'
    // Enchantment data is preserved in itemEnchantments regardless
    if (oldItem && oldItem !== 'none') {
        playerData.inventory[oldItem] = (playerData.inventory[oldItem] || 0) + 1;
    }
    
    // Equip the new item
    playerData.equipment[equipmentSlot] = itemName;
    
    // Remove new item from inventory if it's not 'none'
    if (itemName !== 'none' && typeof playerData.inventory[itemName] === 'number') {
        playerData.inventory[itemName]--;
    }
    
    // Clear enchantments since this is a normal (unenchanted) item
    // The equipItem function should only be used for unenchanted items
    // Enchanted items should use equipItemEnchanted function instead
    if (!playerData.enchantedStats) playerData.enchantedStats = {};
    playerData.enchantedStats[equipmentSlot] = [];
    
    // Debug logging removed
    
    // Play equipment sound (only if equipping an actual item, not unequipping)
    if (itemName !== 'none' && sounds && sounds.equip) {
        playSound('equip');
    }
    
    logMessage(`Equipped ${titleCase(itemName)} to ${slot}.`, 'fore-green', '🔧');
    
    // Track equipment achievement
    if (itemName !== 'none') {
        trackEquipmentEquipped(itemName);
    }
    
    savePlayerData();
    updateHud();
    
    // Force a complete re-render with a minimal delay to ensure state is updated
    setTimeout(() => {
        populateEquipmentDisplay();
        populateCombatStatsDisplay(); // Update combat stats when equipment changes
        // Update skill speed overview since attack speed depends on equipped weapon
        const skillSpeedContainer = document.querySelector('.character-skill-speed-overview');
        if (skillSpeedContainer) {
            populateSkillSpeedOverview(skillSpeedContainer);
        }
        if (typeof window.populateInventoryDisplay === 'function') window.populateInventoryDisplay();
        // Check if enchanting section is visible and update it
        const enchantingSection = document.getElementById('enchanting-section');
        if (enchantingSection && !enchantingSection.classList.contains('hidden')) {
            updateEnchantingDisplay();
        }
    }, 10);
    
    hideEquipSelection();
}

// Equip an enchanted item in a specific slot
export function equipItemEnchanted(slot, itemName, enchantKey) {
    if (!playerData.equipment) {
        playerData.equipment = { weapon:'none', axe:'none', pickaxe:'none', helmet:'none', armor:'none', left_ring:'none', right_ring:'none' };
    }
    // Handle slot name mapping
    const equipmentSlot = slot;
    
    const oldItem = playerData.equipment[equipmentSlot];
    
    // If equipping the same item that's already equipped with same enchantments, just return
    if (oldItem === itemName && 
        playerData.enchantedStats[equipmentSlot] && 
        playerData.itemEnchantments[enchantKey] &&
        JSON.stringify(playerData.enchantedStats[equipmentSlot]) === JSON.stringify(playerData.itemEnchantments[enchantKey].enchantments)) {
        logMessage(`${titleCase(itemName)} (Enchanted) is already equipped.`, 'fore-yellow', '⚠️');
        hideEquipSelection();
        return;
    }
    
    // Return old item to inventory if it's not 'none'
    if (oldItem && oldItem !== 'none') {
        playerData.inventory[oldItem] = (playerData.inventory[oldItem] || 0) + 1;
    }
    
    // Equip the new item
    playerData.equipment[equipmentSlot] = itemName;
    
    // Remove new item from inventory if it's not 'none'
    if (itemName !== 'none' && typeof playerData.inventory[itemName] === 'number') {
        playerData.inventory[itemName]--;
    }
    
    // Update enchantments for the new equipment using the specific enchantment key
    if (!playerData.enchantedStats) playerData.enchantedStats = {};
    if (playerData.itemEnchantments && playerData.itemEnchantments[enchantKey]) {
        playerData.enchantedStats[equipmentSlot] = playerData.itemEnchantments[enchantKey].enchantments;
    } else {
        playerData.enchantedStats[equipmentSlot] = [];
    }
    
    // Play equipment sound (only if equipping an actual item, not unequipping)
    if (itemName !== 'none' && sounds && sounds.equip) {
        playSound('equip');
    }
    
    logMessage(`Equipped ${titleCase(itemName)} (Enchanted) to ${slot}.`, 'fore-purple', '✨');
    
    // Track equipment achievement
    if (itemName !== 'none') {
        trackEquipmentEquipped(itemName);
    }
    
    savePlayerData();
    updateHud();
    
    // Force a complete re-render with a minimal delay to ensure state is updated
    setTimeout(() => {
        populateEquipmentDisplay();
        populateCombatStatsDisplay(); // Update combat stats when equipment changes
        // Update skill speed overview since attack speed depends on equipped weapon
        const skillSpeedContainer = document.querySelector('.character-skill-speed-overview');
        if (skillSpeedContainer) {
            populateSkillSpeedOverview(skillSpeedContainer);
        }
        if (typeof window.populateInventoryDisplay === 'function') window.populateInventoryDisplay();
        // Check if enchanting section is visible and update it
        const enchantingSection = document.getElementById('enchanting-section');
        if (enchantingSection && !enchantingSection.classList.contains('hidden')) {
            updateEnchantingDisplay();
        }
    }, 10);
    
    hideEquipSelection();
}

// Initialize close button for equipment selection
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-equip-modal-btn');
    if (closeBtn) closeBtn.addEventListener('click', hideEquipSelection);
    const cancelBtn = document.getElementById('cancel-equip-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideEquipSelection);
});

function updateCharacterInfo() {
    const characterInfoTarget = document.getElementById('character-info-target');
    if (!characterInfoTarget) return;
    
    // Get PP info
    const ppInfo = getPerkPointsInfo();
    
    // Build character info HTML
    let html = `
        <div class="character-info-section">
            <h2>Character Info</h2>
            <div class="character-stats">
                <div class="stat-row">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${playerData.level}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">XP:</span>
                    <span class="stat-value">${formatNumber(playerData.xp)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Total Skill XP:</span>
                    <span class="stat-value">${formatNumber(calculateTotalSkillXP())}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Perk Points:</span>
                    <span class="stat-value">${ppInfo.available} / ${ppInfo.total} (${ppInfo.spent} spent)</span>
                </div>
                ${ppInfo.nextGain.skill ? `
                <div class="stat-row">
                    <span class="stat-label">Next PP:</span>
                    <span class="stat-value">${formatNumber(ppInfo.nextGain.currentXP)} / ${formatNumber(ppInfo.nextGain.requiredXP)} ${ppInfo.nextGain.skill} XP (${Math.round(ppInfo.nextGain.progress * 100)}%)</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    characterInfoTarget.innerHTML = html;
}

/**
 * Populates the Live Activity & Timers display with current auto-actions and rates
 */
function populateLiveActivityDisplay() {
    const liveActivityList = document.getElementById('live-activity-list-target');
    if (!liveActivityList) return;

    liveActivityList.innerHTML = '';
    let hasActivity = false;

    // Check Combat Auto-Attack
    try {
        if (isAutoAttacking && currentMonsterTarget) {
            hasActivity = true;
            const combatRow = document.createElement('div');
            combatRow.className = 'stat-row';
            combatRow.innerHTML = `
                <span class="stat-name">⚔️ Auto-Combat:</span>
                <span class="stat-value fore-red">Fighting ${titleCase(currentMonsterTarget)}</span>
            `;
            liveActivityList.appendChild(combatRow);
        }
    } catch (e) {
        // Combat module might not be loaded yet
    }

    // Check Auto-Mining
    try {
        const miningActive = playerData?.skills?.mining?.is_active || false;
        if (miningActive) {
            hasActivity = true;
            const miningRow = document.createElement('div');
            miningRow.className = 'stat-row';
            miningRow.innerHTML = `
                <span class="stat-name">⛏️ Auto-Mining:</span>
                <span class="stat-value fore-lightblack_ex">Active</span>
            `;
            liveActivityList.appendChild(miningRow);
        }
    } catch (e) {
        // Mining module issues
    }

    // Check Auto-Woodcutting
    try {
        const woodcuttingActive = playerData?.skills?.woodcutting?.is_active || false;
        if (woodcuttingActive) {
            hasActivity = true;
            const wcRow = document.createElement('div');
            wcRow.className = 'stat-row';
            wcRow.innerHTML = `
                <span class="stat-name">🌲 Auto-Woodcutting:</span>
                <span class="stat-value fore-green">Active</span>
            `;
            liveActivityList.appendChild(wcRow);
        }
    } catch (e) {
        // Woodcutting module issues
    }

    // Check Auto-Harvesting (Farming)
    try {
        let hasAutoHarvesting = false;
        let harvestingPlots = 0;
        let totalHourlyRate = 0;

        if (playerData?.farm_data?.crop_plots) {
            // Check for crop managers (auto-harvesting)
            Object.keys(playerData.farm_data.crop_plots).forEach(plotKey => {
                const plot = playerData.farm_data.crop_plots[plotKey];
                if (plot?.workers?.manager) {
                    hasAutoHarvesting = true;
                    harvestingPlots++;

                    // Calculate hourly rate for this plot
                    if (plot.crop_type && SEED_DATA[plot.crop_type] && CROP_ITEMS[plot.crop_type]) {
                        const seedData = SEED_DATA[plot.crop_type];
                        const cropItem = CROP_ITEMS[plot.crop_type];
                        
                        // Calculate effective growth time with workers
                        let growthTime = seedData.growth_time_ms;
                        
                        // Apply worker reductions
                        if (plot.workers.farmhands) {
                            const workerReduction = Math.min(plot.workers.farmhands.length, 10) * (2 * 60 * 1000); // 2min per worker, max 10
                            growthTime -= workerReduction;
                        }
                        if (plot.workers.manager) {
                            growthTime -= (5 * 60 * 1000); // 5min for manager
                        }
                        
                        // Minimum 1 minute
                        growthTime = Math.max(growthTime, 60 * 1000);
                        
                        // Calculate harvests per hour
                        const harvestsPerHour = (60 * 60 * 1000) / growthTime;
                        
                        // Calculate value per harvest (yield * sell price)
                        const yield_ = cropItem.yield || 1;
                        const sellPrice = ITEM_SELL_PRICES[plot.crop_type] || 0;
                        const valuePerHarvest = yield_ * sellPrice;
                        
                        totalHourlyRate += harvestsPerHour * valuePerHarvest;
                    }
                }
            });
        }

        if (hasAutoHarvesting) {
            hasActivity = true;
            const farmingRow = document.createElement('div');
            farmingRow.className = 'stat-row';
            farmingRow.innerHTML = `
                <span class="stat-name">🏞️ Auto-Harvesting:</span>
                <span class="stat-value fore-green">${harvestingPlots} plot${harvestingPlots !== 1 ? 's' : ''}</span>
            `;
            liveActivityList.appendChild(farmingRow);

            // Add hourly rate if significant
            if (totalHourlyRate > 0) {
                const rateRow = document.createElement('div');
                rateRow.className = 'stat-row';
                rateRow.innerHTML = `
                    <span class="stat-name">💰 Hourly Rate:</span>
                    <span class="stat-value fore-yellow">${Math.floor(totalHourlyRate).toLocaleString()}g/hr</span>
                `;
                liveActivityList.appendChild(rateRow);
            }
        }
    } catch (e) {
        console.warn('Error calculating farming rates:', e);
    }

    // Check Auto-Cooking
    try {
        const cookingActive = playerData?.skills?.cooking?.is_active || false;
        if (cookingActive) {
            hasActivity = true;
            const cookingRow = document.createElement('div');
            cookingRow.className = 'stat-row';
            cookingRow.innerHTML = `
                <span class="stat-name">🍳 Auto-Cooking:</span>
                <span class="stat-value fore-yellow">Active</span>
            `;
            liveActivityList.appendChild(cookingRow);
        }
    } catch (e) {
        // Cooking module issues
    }

    // Check Auto-Blacksmithing
    try {
        const blacksmithingActive = playerData?.skills?.blacksmithing?.is_active || false;
        if (blacksmithingActive) {
            hasActivity = true;
            const bsRow = document.createElement('div');
            bsRow.className = 'stat-row';
            bsRow.innerHTML = `
                <span class="stat-name">🛠️ Auto-Smithing:</span>
                <span class="stat-value fore-orange">Active</span>
            `;
            liveActivityList.appendChild(bsRow);
        }
    } catch (e) {
        // Blacksmithing module issues
    }

    // Guild Workers (if any are assigned)
    try {
        if (playerData?.guild_data?.workers) {
            let activeWorkers = 0;
            Object.values(playerData.guild_data.workers).forEach(worker => {
                if (worker?.task?.type) {
                    activeWorkers++;
                }
            });

            if (activeWorkers > 0) {
                hasActivity = true;
                const guildRow = document.createElement('div');
                guildRow.className = 'stat-row';
                guildRow.innerHTML = `
                    <span class="stat-name">🏛️ Guild Workers:</span>
                    <span class="stat-value fore-blue">${activeWorkers} active</span>
                `;
                liveActivityList.appendChild(guildRow);
            }
        }
    } catch (e) {
        // Guild module issues
    }

    // If no activities are running
    if (!hasActivity) {
        liveActivityList.innerHTML = "<p style='padding:8px; text-align:center;'><i>No auto-actions currently running.</i></p>";
    }
} 
