/**
 * enchanting.js - Enchanting system for RuneText
 * Handles all enchanting functionality including UI, enchantment rolling, and stat application.
 */

'use strict';

import { 
    ENCHANTING_TIER_DATA, 
    ENCHANTMENT_STAT_POOL_CONFIG, 
    ENCHANTMENT_STAT_TIER_COLORS,
    SWORD_DATA,
    ARMOR_DATA,
    HELMET_DATA,
    ITEM_DATA,
    TOOL_DATA
} from './data.js';
import { 
    playerData, 
    logMessage, 
    savePlayerData, 
    removeItemFromInventory,
    getLevelFromXp,
    handleLevelUp,
    formatNumber,
    titleCase,
    playSound,
    sounds,
    formatEnchantmentStat
} from './utils.js';
import { trackStatistic } from './achievements.js';
import { showSection } from './ui.js';
import { getEnchantedStatsHtml } from './characterinfo.js';

// Current enchanting state
let selectedEquipmentSlot = null;
let currentEnchantmentPreview = null;
let selectedEnchantmentTier = null;
const MAX_ENCHANTMENTS = 12;

/**
 * Shows the enchanting menu and initializes the UI
 */
export function showEnchantingMenu() {
    showSection('enchanting-section');
    updateEnchantingDisplay();
    setupGemConversionEvents(); // Setup gems button event
}

/**
 * Updates the entire enchanting display
 */
export function updateEnchantingDisplay() {
    updateEnchantingStatus();
    populateEquipmentSlots();
    
    // Reset to default state
    selectedEquipmentSlot = null;
    currentEnchantmentPreview = null;
    hideAllRightPanels();
    document.getElementById('enchanting-no-selection').style.display = 'block';
}

/**
 * Updates the enchanting status display (skill level, etc.)
 */
function updateEnchantingStatus() {
    const statusDisplay = document.getElementById('enchanting-status-display');
    if (!statusDisplay) return;

    const enchantingSkill = playerData.skills.enchanting;
    const level = getLevelFromXp(enchantingSkill.xp);
    
    statusDisplay.innerHTML = `
        <div class="permit-status-content" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;">
            <div>
                <span class="permit-status-label">Enchanting Level:</span>
                <span class="permit-status-value">${level}</span>
                <span class="permit-status-label">XP:</span>
                <span class="permit-status-value">${formatNumber(enchantingSkill.xp)}</span>
            </div>
            <button id="gems-conversion-btn" class="action-button">Gems</button>
        </div>
    `;
}

/**
 * Populates the equipment grid similar to character info screen
 */
function populateEquipmentSlots() {
    const gridContainer = document.getElementById('enchanting-equipment-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    
    // Equipment slots configuration (similar to character info)
    const slots = [
        { key: 'placeholder', name: 'Placeholder', data: {}, isPlaceholder: true },
        { key: 'weapon', name: 'Weapon', data: SWORD_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Dmg: ${itemData.min_dmg}-${itemData.max_dmg}`;
            stats += getEnchantedStatsHtml('weapon');
            return stats;
          }
        },
        { key: 'helmet', name: 'Helmet', data: HELMET_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            stats += getEnchantedStatsHtml('helmet');
            return stats;
          }
        },
        { key: 'axe', name: 'Axe', data: TOOL_DATA.axe, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config?.base || 0}`;
            stats += getEnchantedStatsHtml('axe');
            return stats;
          }
        },
        { key: 'armor', name: 'Chestplate', data: ARMOR_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            stats += getEnchantedStatsHtml('chestplate');
            return stats;
          }
        },
        { key: 'pickaxe', name: 'Pickaxe', data: TOOL_DATA.pickaxe, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config?.base || 0}`;
            stats += getEnchantedStatsHtml('pickaxe');
            return stats;
          }
        }
    ];

    slots.forEach(slotInfo => {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'enchanting-equipment-slot';
        
        // Handle placeholder and empty visual slots
        if (slotInfo.isPlaceholder) {
            slotDiv.style.display = 'none';
            gridContainer.appendChild(slotDiv);
            return;
        }
        
        if (slotInfo.isEmptyVisual) {
            slotDiv.innerHTML = `
                <div class="enchanting-slot-item" style="justify-content: center; align-items: center; background-color: #222; border: 1px dashed #444; min-height: 100px;">
                    <!-- Visually empty slot -->
                </div>`;
            slotDiv.classList.add('equipment-slot-empty');
            gridContainer.appendChild(slotDiv);
            return;
        }

        // Handle actual equipment slots
        const equippedItemName = playerData.equipment[slotInfo.key];
        const itemData = (equippedItemName === "none" || !slotInfo.data) ? 
                        null : slotInfo.data[equippedItemName];
        
        // Add tier border class if item exists
        if (itemData && itemData.tier) {
            slotDiv.classList.add('item-card-tier', itemData.tier.toLowerCase());
        }

        const itemNameDisplay = itemData ? titleCase(equippedItemName) : "None";
        const itemColor = itemData ? slotInfo.colorClassGetter(itemData) : "fore-white";
        const itemStatsDisplay = slotInfo.statGetter ? slotInfo.statGetter(itemData) : "N/A";
        // Get enchantments for the currently equipped item
        const itemKey = getItemEnchantmentKey(slotInfo.key, equippedItemName);
        const itemEnchantData = playerData.itemEnchantments[itemKey] || { enchantments: [], count: 0 };
        const enchantments = itemEnchantData.enchantments;
        const enchantmentCount = itemEnchantData.count;
        
        // Get icon (emoji or image)
        let iconHtml;
        if (itemData) {
            if (slotInfo.key === 'weapon') {
                const fileName = equippedItemName.replace(/ /g, '-').replace('-2h-sword','-2hsword');
                iconHtml = `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '⚔️'}';">`;
            } else if (slotInfo.key === 'armor') {
                // Extract material name and convert to proper case for filename
                const materialName = equippedItemName.toLowerCase().replace(/\s+chestplate$/, '');
                const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
                iconHtml = `<img src="assets/${fileName}" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '🛡️'}';">`;
            } else if (slotInfo.key === 'helmet') {
                // Handle special case for "Full Dragon Helmet"
                if (equippedItemName.toLowerCase().includes('dragon helmet')) {
                    iconHtml = `<img src="assets/Dragon-Full-Helmet.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '👑'}';">`;
                } else {
                    iconHtml = itemData.emoji || "❔";
                }
            } else if (slotInfo.key === 'axe') {
                const fileName = equippedItemName.replace(/ /g, '-');
                iconHtml = `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '🪓'}';">`;
            } else if (slotInfo.key === 'pickaxe') {
                const fileName = equippedItemName.replace(/ /g, '-');
                iconHtml = `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '⛏️'}';">`;
            } else {
                iconHtml = itemData.emoji || "❔";
            }
        } else {
            iconHtml = "➖";
        }
        
        // Only make clickable if item is equipped and enchantable
        const isEnchantable = itemData && ['weapon', 'armor', 'helmet', 'axe', 'pickaxe'].includes(slotInfo.key);
        if (isEnchantable) {
            slotDiv.addEventListener('click', () => selectEquipmentForEnchanting(slotInfo.key));
        } else {
            slotDiv.classList.add('equipment-slot-empty');
        }

        slotDiv.innerHTML = `
            <div class="enchanting-slot-name">${slotInfo.name}</div>
            <div class="enchanting-slot-item">
                <div class="enchanting-item-name ${itemColor}">${itemNameDisplay}</div>
                <div class="enchanting-item-icon item-border ${itemData ? itemData.tier : ''}">${iconHtml}</div>
                <div class="enchanting-item-stats">${itemStatsDisplay}</div>
                ${enchantmentCount > 0 ? `<div class="enchanting-item-enchanted">Enchanted (${enchantmentCount}/${MAX_ENCHANTMENTS})</div>` : ''}
            </div>`;
            
        gridContainer.appendChild(slotDiv);
    });
}

/**
 * Selects equipment for enchanting and shows enchantment options
 */
function selectEquipmentForEnchanting(slotKey) {
    selectedEquipmentSlot = slotKey;
    const equipmentName = playerData.equipment[slotKey];
    
    if (!equipmentName || equipmentName === 'none') {
        logMessage('No equipment equipped in that slot!', 'fore-red');
        return;
    }

    // Update visual selection state
    updateEquipmentSelection(slotKey);
    
    // Show the enchanting interface
    displayEnchantingInterface(slotKey, equipmentName);
}

/**
 * Updates the visual selection state of equipment slots
 */
function updateEquipmentSelection(selectedSlotKey) {
    // Remove selected class from all slots
    const allSlots = document.querySelectorAll('.enchanting-equipment-slot');
    allSlots.forEach(slot => slot.classList.remove('selected'));
    
    // Add selected class to the clicked slot
    const slots = document.querySelectorAll('.enchanting-equipment-slot');
    const slotKeys = ['placeholder', 'weapon', 'helmet', 'emptyVisual', 'armor', 'emptyVisual2'];
    const slotIndex = slotKeys.indexOf(selectedSlotKey);
    
    if (slotIndex !== -1 && slots[slotIndex]) {
        slots[slotIndex].classList.add('selected');
    }
}

/**
 * Hides all right panel sections
 */
function hideAllRightPanels() {
    document.getElementById('enchanting-no-selection').style.display = 'none';
    document.getElementById('enchanting-selected-info').style.display = 'none';
    document.getElementById('enchanting-current-stats').style.display = 'none';
    document.getElementById('enchanting-options').style.display = 'none';
    document.getElementById('enchanting-preview').style.display = 'none';
}


/**
 * Displays the main enchanting interface with tier selection
 */
function displayEnchantingInterface(slotKey, equipmentName) {
    hideAllRightPanels();
    document.getElementById('enchanting-options').style.display = 'block';
    displayEnchantmentOptions(slotKey);
}

/**
 * Displays available enchantment options as clickable tiles
 */
function displayEnchantmentOptions(slotKey) {
    const container = document.getElementById('enchanting-tier-options');
    if (!container) return;

    // Clear existing options to prevent duplicates
    container.innerHTML = '';

    const enchantingLevel = getLevelFromXp(playerData.skills.enchanting.xp);

    Object.entries(ENCHANTING_TIER_DATA).forEach(([tierId, tierData]) => {
        const canUse = enchantingLevel >= tierData.level_req;
        const hasResources = checkEnchantingResources(tierData.cost);
        
        const optionDiv = document.createElement('div');
        optionDiv.className = `enchanting-tier-option ${canUse ? '' : 'disabled'}`;
        
        if (canUse && hasResources) {
            optionDiv.addEventListener('click', () => selectEnchantmentTier(slotKey, tierId));
            optionDiv.style.cursor = 'pointer';
        }
        
        optionDiv.innerHTML = `
            <div class="tier-option-header">
                <div class="tier-option-name">${tierData.name}</div>
                <div class="tier-option-level">Level ${tierData.level_req}</div>
            </div>
            <div class="tier-option-description">${tierData.description}</div>
            <div class="tier-option-cost">
                Cost: ${formatEnchantingCost(tierData.cost)}
            </div>
            <div class="tier-option-potential">
                ${formatPotentialStats(slotKey, tierData)}
            </div>
            <div class="tier-option-status">
                ${canUse ? (hasResources ? 'Click to Select' : 'Insufficient Resources') : 'Level Too Low'}
            </div>
        `;
        
        container.appendChild(optionDiv);
    });
}

/**
 * Checks if player has required resources for enchanting
 */
function checkEnchantingResources(cost) {
    if (cost.gold && playerData.gold < cost.gold) return false;
    if (cost.mainResource && (!playerData.inventory[cost.mainResource] || playerData.inventory[cost.mainResource] < cost.mainResourceQty)) return false;
    if (cost.secondaryResource && (!playerData.inventory[cost.secondaryResource] || playerData.inventory[cost.secondaryResource] < cost.secondaryResourceQty)) return false;
    if (cost.tertiaryResource && (!playerData.inventory[cost.tertiaryResource] || playerData.inventory[cost.tertiaryResource] < cost.tertiaryResourceQty)) return false;
    return true;
}

/**
 * Formats the cost display for enchanting tiers
 */
function formatEnchantingCost(cost) {
    let costParts = [];
    if (cost.gold) costParts.push(`${cost.gold} gold`);
    if (cost.mainResource) costParts.push(`${cost.mainResourceQty} ${cost.mainResource}`);
    if (cost.secondaryResource) costParts.push(`${cost.secondaryResourceQty} ${cost.secondaryResource}`);
    if (cost.tertiaryResource) costParts.push(`${cost.tertiaryResourceQty} ${cost.tertiaryResource}`);
    return costParts.join(', ');
}

/**
 * Formats potential stats for enchanting preview
 */
function formatPotentialStats(slotKey, tierData) {
    console.log(`[Enchanting Preview] Generating stats for slot: ${slotKey}`);
    console.log(`[Enchanting Preview] Player structures:`, playerData.built_structures);
    
    const applicableStats = Object.entries(ENCHANTMENT_STAT_POOL_CONFIG)
        .filter(([statType, config]) => {
            // Check if stat applies to this slot type
            if (!config.appliesTo.includes(slotKey) && !config.appliesTo.includes('all_gear')) {
                console.log(`[Enchanting Preview] ${statType} doesn't apply to ${slotKey} (applies to: ${config.appliesTo.join(', ')})`);
                return false;
            }
            // Check if stat requires a specific structure
            if (config.requires_structure) {
                console.log(`[Enchanting Preview] ${statType} requires structure: ${config.requires_structure}`);
                if (!playerData.built_structures?.[config.requires_structure]) {
                    console.log(`[Enchanting Preview] Filtering out ${statType} - structure ${config.requires_structure} not built`);
                    return false;
                }
                console.log(`[Enchanting Preview] ${statType} - structure requirement met!`);
            }
            return true;
        });
    
    console.log(`[Enchanting Preview] Final available stats:`, applicableStats.map(([type]) => type));

    const possibleRanges = tierData.possibleStatTiers
        .map(tier => {
            const ranges = applicableStats.map(([statType, config]) => {
                if (config.tiers[tier]) {
                    const range = config.tiers[tier].valueRange;
                    const statDisplay = formatEnchantmentStat(statType, range[0]) + ' to ' + formatEnchantmentStat(statType, range[1]);
                    
                    // Apply wizard color for Wizard Tower enchantments
                    const isWizardEnchantment = ['life_steal', 'fire_damage', 'ice_damage'].includes(statType);
                    if (isWizardEnchantment) {
                        return `<span class="tier-wizard-stat">${statDisplay}</span>`;
                    }
                    return statDisplay;
                }
                return null;
            }).filter(Boolean);
            return ranges.length > 0 ? `${tier}: ${ranges.slice(0, 3).join(', ')}${ranges.length > 3 ? '...' : ''}` : null;
        })
        .filter(Boolean);

    return `Can roll: ${possibleRanges.join('; ')}`;
}

/**
 * Gets the enchantment key for a specific item
 */
function getItemEnchantmentKey(slotKey, itemName) {
    return `${slotKey}:${itemName}`;
}

/**
 * Selects an enchantment tier and shows the preview
 */
function selectEnchantmentTier(slotKey, enchantmentTierId) {
    selectedEnchantmentTier = enchantmentTierId;
    
    const equipmentName = playerData.equipment[slotKey];
    const itemKey = getItemEnchantmentKey(slotKey, equipmentName);
    
    // Check enchantment limit for this specific item
    const currentCount = (playerData.itemEnchantments[itemKey] && playerData.itemEnchantments[itemKey].count) || 0;
    if (currentCount >= MAX_ENCHANTMENTS) {
        logMessage('This item has reached the maximum number of enchantments (12). Get a new piece of gear to enchant more!', 'fore-red');
        return;
    }
    
    displayEnchantingPreview(slotKey, enchantmentTierId);
}

/**
 * Displays the enchanting preview with current stats and enchant button
 */
function displayEnchantingPreview(slotKey, enchantmentTierId) {
    const container = document.getElementById('enchanting-preview-content');
    if (!container) return;

    const equipmentName = playerData.equipment[slotKey];
    const itemKey = getItemEnchantmentKey(slotKey, equipmentName);
    const itemData = getItemData(equipmentName, slotKey);
    
    // Get enchantments for this specific item
    const itemEnchantData = playerData.itemEnchantments[itemKey] || { enchantments: [], count: 0 };
    const enchantments = itemEnchantData.enchantments;
    const enchantmentCount = itemEnchantData.count;
    const tierData = ENCHANTING_TIER_DATA[enchantmentTierId];
    
    let statsHtml = '<div class="item-stats-display">';
    
    // Show enchantment count
    statsHtml += `<div class="enchantment-count-display">`;
    statsHtml += `Enchantments: ${enchantmentCount}/${MAX_ENCHANTMENTS}`;
    statsHtml += `</div>`;
    
    // Show base item stats
    if (itemData) {
        statsHtml += '<div class="base-stats-section">';
        statsHtml += '<div class="stats-section-title">Base Stats:</div>';
        statsHtml += formatItemStats(itemData);
        statsHtml += '</div>';
    }
    
    // Show current enchantments
    if (enchantments.length > 0) {
        statsHtml += '<div class="enchanted-stats-section">';
        statsHtml += '<div class="stats-section-title">Current Enchantments:</div>';
        enchantments.forEach((enchantment, index) => {
            // Use wizard tier color for Wizard Tower enchantments, otherwise use normal tier color
            const isWizardEnchantment = ['life_steal', 'fire_damage', 'ice_damage'].includes(enchantment.stat);
            const colorClass = isWizardEnchantment ? ENCHANTMENT_STAT_TIER_COLORS.wizard : (ENCHANTMENT_STAT_TIER_COLORS[enchantment.tier] || '');
            const statDisplay = formatEnchantmentStat(enchantment.stat, enchantment.value);
            const isLocked = enchantment.locked || false;
            const lockIcon = isLocked ? '🔒 ' : '';
            const lockCost = calculateLockCost(enchantment.tier);
            const lockedClass = isLocked ? 'locked' : '';
            const playerTomes = playerData.inventory['ancient_tomes'] || 0;
            const canAfford = !isLocked && playerTomes >= lockCost;
            const tooltipText = isLocked ? 
                'Click to unlock this enchantment' : 
                `Click to lock for ${lockCost} Ancient Tomes (have ${playerTomes})`;
            
            statsHtml += `<div class="enchantment-container clickable-enchantment ${colorClass} ${lockedClass}" 
                              data-enchantment-index="${index}" 
                              data-tier="${enchantment.tier}"
                              data-slot="${slotKey}"
                              title="${tooltipText}"
                              onclick="window.toggleEnchantmentLock('${slotKey}', ${index})"
                              style="${!isLocked && !canAfford ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                            ${lockIcon}${statDisplay}
                          </div>`;
        });
        statsHtml += '</div>';
    } else {
        statsHtml += '<div class="no-enchantments">No current enchantments</div>';
    }
    
    statsHtml += '</div>';
    container.innerHTML = statsHtml;
    
    // Update the enchant button with cost
    updateEnchantButton(tierData);
    
    // Show the preview panel
    hideAllRightPanels();
    document.getElementById('enchanting-preview').style.display = 'block';
}

/**
 * Updates the enchant button with cost information
 */
function updateEnchantButton(tierData) {
    const costDisplay = document.querySelector('.enchant-cost-display');
    if (costDisplay) {
        costDisplay.textContent = formatEnchantingCost(tierData.cost);
    }
}

/**
 * Performs the actual enchantment
 */
export function performEnchantment() {
    if (!selectedEquipmentSlot || !selectedEnchantmentTier) {
        logMessage('No enchantment selected!', 'fore-red');
        return;
    }
    
    const tierData = ENCHANTING_TIER_DATA[selectedEnchantmentTier];
    if (!tierData) {
        logMessage('Invalid enchantment tier!', 'fore-red');
        return;
    }

    const equipmentName = playerData.equipment[selectedEquipmentSlot];
    const itemKey = getItemEnchantmentKey(selectedEquipmentSlot, equipmentName);
    
    // Check enchantment limit again for this specific item
    const itemEnchantData = playerData.itemEnchantments[itemKey] || { enchantments: [], count: 0 };
    if (itemEnchantData.count >= MAX_ENCHANTMENTS) {
        logMessage('This item has reached the maximum number of enchantments!', 'fore-red');
        return;
    }

    // Check resources
    if (!checkEnchantingResources(tierData.cost)) {
        logMessage('Insufficient resources for enchanting!', 'fore-red');
        return;
    }

    // Deduct resources
    if (tierData.cost.gold) playerData.gold -= tierData.cost.gold;
    if (tierData.cost.mainResource) {
        removeItemFromInventory(tierData.cost.mainResource, tierData.cost.mainResourceQty);
    }
    if (tierData.cost.secondaryResource) {
        removeItemFromInventory(tierData.cost.secondaryResource, tierData.cost.secondaryResourceQty);
    }
    if (tierData.cost.tertiaryResource) {
        removeItemFromInventory(tierData.cost.tertiaryResource, tierData.cost.tertiaryResourceQty);
    }

    // Roll new enchantments and store them for this specific item (respecting locks)
    const newEnchantments = rollEnchantmentsWithLocks(selectedEquipmentSlot, tierData);
    
    // Initialize item enchantment data if it doesn't exist
    if (!playerData.itemEnchantments[itemKey]) {
        playerData.itemEnchantments[itemKey] = { enchantments: [], count: 0 };
    }
    
    // Update enchantments for this specific item
    playerData.itemEnchantments[itemKey].enchantments = newEnchantments;
    playerData.itemEnchantments[itemKey].count++;
    
    // Also update the slot-based enchantments for the currently equipped item
    playerData.enchantedStats[selectedEquipmentSlot] = newEnchantments;
    
    // Grant XP
    const oldLevel = getLevelFromXp(playerData.skills.enchanting.xp);
    playerData.skills.enchanting.xp += tierData.xp_gain;
    const newLevel = getLevelFromXp(playerData.skills.enchanting.xp);
    
    if (newLevel > oldLevel) {
        handleLevelUp('enchanting', oldLevel, newLevel);
    }

    // Track enchanting statistics
    trackStatistic('crafting', 'enchant', 1, selectedEquipmentSlot);
    
    // Check for legendary enchantments
    const hasLegendaryEnchantment = newEnchantments.some(e => e.tier === 'legendary');
    if (hasLegendaryEnchantment) {
        trackStatistic('crafting', 'legendary', 1);
    }
    
    // Play enchantment sound effect
    playSound(sounds.enchant);
    
    logMessage(`Enchantment complete! Gained ${tierData.xp_gain} Enchanting XP.`, 'fore-green');
    console.log('Applied enchantments:', newEnchantments);
    console.log('Available stats that were used:', Object.entries(ENCHANTMENT_STAT_POOL_CONFIG)
        .filter(([statType, config]) => {
            if (!config.appliesTo.includes(selectedEquipmentSlot) && !config.appliesTo.includes('all_gear')) {
                return false;
            }
            if (config.requires_structure && !playerData.built_structures?.[config.requires_structure]) {
                return false;
            }
            return true;
        }).map(([statType]) => statType));
    savePlayerData();
    updateEnchantingStatus();
    
    // Refresh the preview to show the new enchantments
    displayEnchantingPreview(selectedEquipmentSlot, selectedEnchantmentTier);
    
    // Update the equipment grid to show the new enchantment count
    populateEquipmentSlots();
    updateEquipmentSelection(selectedEquipmentSlot);
}

/**
 * Rolls new enchantments based on tier data
 */
function rollEnchantments(slotKey, tierData) {
    const numLines = Math.floor(Math.random() * tierData.maxLines) + 1;
    const enchantments = [];
    
    // Get applicable stats for this equipment type
    const applicableStats = Object.entries(ENCHANTMENT_STAT_POOL_CONFIG)
        .filter(([statType, config]) => {
            // Check if stat applies to this slot type
            if (!config.appliesTo.includes(slotKey) && !config.appliesTo.includes('all_gear')) {
                return false;
            }
            // Check if stat requires a specific structure
            if (config.requires_structure) {
                console.log(`[rollEnchantments] Checking structure requirement for ${statType}: requires ${config.requires_structure}, player has:`, playerData.built_structures);
                if (!playerData.built_structures?.[config.requires_structure]) {
                    console.log(`[rollEnchantments] Filtering out ${statType} - structure not built`);
                    return false;
                }
            }
            return true;
        });

    for (let i = 0; i < numLines; i++) {
        // Randomly select a stat type
        const [statType, statConfig] = applicableStats[Math.floor(Math.random() * applicableStats.length)];
        
        // Randomly select a stat tier based on weights
        const availableTiers = tierData.possibleStatTiers.filter(tier => statConfig.tiers[tier]);
        const selectedTier = selectWeightedTier(availableTiers, statConfig.tiers);
        
        // Roll value within range
        const tierInfo = statConfig.tiers[selectedTier];
        const value = Math.random() * (tierInfo.valueRange[1] - tierInfo.valueRange[0]) + tierInfo.valueRange[0];
        
        enchantments.push({
            stat: statType,
            value: parseFloat(value.toFixed(4)), // Round to avoid floating point issues
            tier: selectedTier
        });
    }
    
    return enchantments;
}

/**
 * Selects a tier based on probability weights
 */
function selectWeightedTier(availableTiers, tierConfigs) {
    const weights = availableTiers.map(tier => tierConfigs[tier].probabilityWeight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < availableTiers.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return availableTiers[i];
        }
    }
    
    return availableTiers[availableTiers.length - 1]; // Fallback
}



/**
 * Cancels the enchantment preview and returns to options
 */
export function cancelEnchantmentPreview() {
    logMessage('Enchantment cancelled.', 'fore-cyan');
    
    // Clear selection
    selectedEnchantmentTier = null;
    
    // Go back to the tier selection view
    if (selectedEquipmentSlot) {
        hideAllRightPanels();
        document.getElementById('enchanting-options').style.display = 'block';
    }
}

/**
 * Gets item data for a specific equipment piece
 */
function getItemData(itemName, slotKey) {
    switch (slotKey) {
        case 'weapon':
            return SWORD_DATA[itemName];
        case 'armor':
            return ARMOR_DATA[itemName];
        case 'helmet':
            return HELMET_DATA[itemName];
        default:
            return null;
    }
}

/**
 * Formats item stats for display
 */
function formatItemStats(itemData) {
    let stats = [];
    
    if (itemData.min_dmg !== undefined && itemData.max_dmg !== undefined) {
        stats.push(`Damage: ${itemData.min_dmg}-${itemData.max_dmg}`);
    }
    if (itemData.defense !== undefined) {
        stats.push(`Defense: ${Math.floor(itemData.defense * 100)}%`);
    }
    if (itemData.attack_speed !== undefined) {
        stats.push(`Speed: ${itemData.attack_speed.toFixed(1)}`);
    }
    if (itemData.crit_chance !== undefined) {
        stats.push(`Crit: ${Math.floor(itemData.crit_chance * 100)}%`);
    }
    
    return stats.map(stat => `<div class="base-stat-line">${stat}</div>`).join('');
}


/**
 * Calculates the Ancient Tome cost for locking an enchantment based on its tier
 * @param {string} tier - The enchantment tier (common, uncommon, rare, epic, legendary)
 * @returns {number} - The number of Ancient Tomes required
 */
function calculateLockCost(tier) {
    const costs = {
        'common': 1,
        'uncommon': 5,
        'rare': 20,
        'epic': 50,
        'legendary': 100
    };
    return costs[tier] || 1;
}

/**
 * Toggles the lock state of an enchantment
 * @param {string} slotKey - The equipment slot (weapon, armor, helmet) - Note: armor refers to chestplate enchantments
 * @param {number} enchantmentIndex - The index of the enchantment in the array
 */
export function toggleEnchantmentLock(slotKey, enchantmentIndex) {
    if (!slotKey || enchantmentIndex === undefined) {
        logMessage('Invalid enchantment selection!', 'fore-red');
        return;
    }

    const equipmentName = playerData.equipment[slotKey];
    const itemKey = getItemEnchantmentKey(slotKey, equipmentName);
    const itemEnchantData = playerData.itemEnchantments[itemKey];
    
    if (!itemEnchantData || !itemEnchantData.enchantments[enchantmentIndex]) {
        logMessage('Enchantment not found!', 'fore-red');
        return;
    }

    const enchantment = itemEnchantData.enchantments[enchantmentIndex];
    const isCurrentlyLocked = enchantment.locked || false;
    
    if (isCurrentlyLocked) {
        // Unlock the enchantment
        enchantment.locked = false;
        logMessage(`Enchantment unlocked: ${formatEnchantmentStat(enchantment.stat, enchantment.value)}`, 'fore-cyan');
    } else {
        // Lock the enchantment - check Ancient Tome cost
        const lockCost = calculateLockCost(enchantment.tier);
        const playerTomes = playerData.inventory['ancient_tomes'] || 0;
        
        if (playerTomes < lockCost) {
            logMessage(`Insufficient Ancient Tomes! Need ${lockCost}, have ${playerTomes}. Obtain Ancient Tomes from guild quests!`, 'fore-red');
            return;
        }
        
        // Consume Ancient Tomes
        playerData.inventory['ancient_tomes'] -= lockCost;
        if (playerData.inventory['ancient_tomes'] <= 0) {
            delete playerData.inventory['ancient_tomes'];
        }
        
        // Lock the enchantment
        enchantment.locked = true;
        logMessage(`Enchantment locked for ${lockCost} Ancient Tomes: ${formatEnchantmentStat(enchantment.stat, enchantment.value)}`, 'fore-green');
    }
    
    // Update the slot-based enchantments as well
    if (playerData.enchantedStats[slotKey]) {
        playerData.enchantedStats[slotKey][enchantmentIndex] = enchantment;
    }
    
    savePlayerData();
    
    // Refresh the display
    if (selectedEquipmentSlot === slotKey && selectedEnchantmentTier) {
        displayEnchantingPreview(slotKey, selectedEnchantmentTier);
    }
}

/**
 * Helper function to check if a stat type is a wizard enchantment
 */
function isWizardEnchantment(statType) {
    return ['life_steal', 'fire_damage', 'ice_damage'].includes(statType);
}

/**
 * Modified rollEnchantments to respect locked enchantments and wizard uniqueness
 */
function rollEnchantmentsWithLocks(slotKey, tierData) {
    const equipmentName = playerData.equipment[slotKey];
    const itemKey = getItemEnchantmentKey(slotKey, equipmentName);
    const itemEnchantData = playerData.itemEnchantments[itemKey] || { enchantments: [], count: 0 };
    const currentEnchantments = itemEnchantData.enchantments || [];
    
    // Separate locked and unlocked enchantments
    const lockedEnchantments = currentEnchantments.filter(e => e.locked);
    const unlockedCount = currentEnchantments.length - lockedEnchantments.length;
    
    // Get existing wizard enchantment types (from both locked and unlocked)
    const existingWizardTypes = currentEnchantments
        .filter(e => isWizardEnchantment(e.stat))
        .map(e => e.stat);
    
    // Roll new enchantments for unlocked slots
    const numNewLines = Math.floor(Math.random() * tierData.maxLines) + 1;
    const newEnchantments = [];
    
    // Get applicable stats for this equipment type
    const applicableStats = Object.entries(ENCHANTMENT_STAT_POOL_CONFIG)
        .filter(([statType, config]) => {
            // Check if stat applies to this slot type
            if (!config.appliesTo.includes(slotKey) && !config.appliesTo.includes('all_gear')) {
                return false;
            }
            // Check if stat requires a specific structure
            if (config.requires_structure) {
                console.log(`[rollEnchantmentsWithLocks] Checking structure requirement for ${statType}: requires ${config.requires_structure}, player has:`, playerData.built_structures);
                if (!playerData.built_structures?.[config.requires_structure]) {
                    console.log(`[rollEnchantmentsWithLocks] Filtering out ${statType} - structure not built`);
                    return false;
                }
            }
            // Check if this is a wizard enchantment that already exists on the item
            if (isWizardEnchantment(statType) && existingWizardTypes.includes(statType)) {
                console.log(`[rollEnchantmentsWithLocks] Filtering out ${statType} - wizard enchantment already exists`);
                return false;
            }
            return true;
        });

    for (let i = 0; i < numNewLines; i++) {
        // Check if we have any stats available
        if (applicableStats.length === 0) {
            console.log(`[rollEnchantmentsWithLocks] No applicable stats available for line ${i + 1}`);
            break;
        }
        
        // Randomly select a stat type
        const [statType, statConfig] = applicableStats[Math.floor(Math.random() * applicableStats.length)];
        
        // If this is a wizard enchantment, remove it from future rolls in this batch
        if (isWizardEnchantment(statType)) {
            const statIndex = applicableStats.findIndex(([type]) => type === statType);
            if (statIndex !== -1) {
                applicableStats.splice(statIndex, 1);
            }
        }
        
        // Randomly select a stat tier based on weights
        const availableTiers = tierData.possibleStatTiers.filter(tier => statConfig.tiers[tier]);
        const selectedTier = selectWeightedTier(availableTiers, statConfig.tiers);
        
        // Roll value within range
        const tierInfo = statConfig.tiers[selectedTier];
        const value = Math.random() * (tierInfo.valueRange[1] - tierInfo.valueRange[0]) + tierInfo.valueRange[0];
        
        newEnchantments.push({
            stat: statType,
            value: parseFloat(value.toFixed(4)),
            tier: selectedTier,
            locked: false // New enchantments start unlocked
        });
    }
    
    // Combine locked enchantments with new ones
    return [...lockedEnchantments, ...newEnchantments];
}

// Gem conversion configuration - Sequential tier progression
const GEM_CONVERSION_CHAIN = [
    { id: 'gems', name: 'Assorted Gems', emoji: '💠', tier: 'uncommon' },
    { id: 'sapphire', name: 'Sapphire', emoji: '🔷', tier: 'rare' },
    { id: 'emerald', name: 'Emerald', emoji: '💚', tier: 'rare' },
    { id: 'ruby', name: 'Ruby', emoji: '🔴', tier: 'rare' },
    { id: 'diamond', name: 'Diamond', emoji: '💎', tier: 'epic' },
    { id: 'dragon gem', name: 'Dragon Gem', emoji: '💎🔥', tier: 'legendary' }
];

// XP rewards for gem conversion (upgrading only) - Sequential progression
const GEM_CONVERSION_XP = {
    'gems_to_sapphire': 50,
    'sapphire_to_emerald': 100,
    'emerald_to_ruby': 150,
    'ruby_to_diamond': 200,
    'diamond_to_dragon_gem': 500
};

/**
 * Shows the gem conversion menu
 */
export function showGemConversionMenu() {
    showSection('gem-conversion-section');
    setupGemConversionEvents();
    updateGemConversionDisplay();
}

/**
 * Setup gem conversion event listeners
 */
function setupGemConversionEvents() {
    // Back buttons
    const backButton = document.getElementById('gem-conversion-back-button');
    const footerBackButton = document.getElementById('gem-conversion-footer-back-btn');
    
    [backButton, footerBackButton].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showEnchantingMenu();
            });
        }
    });
    
    // Gems button in enchanting status
    const gemsButton = document.getElementById('gems-conversion-btn');
    if (gemsButton) {
        gemsButton.addEventListener('click', showGemConversionMenu);
    }
}

/**
 * Updates the gem conversion display
 */
function updateGemConversionDisplay() {
    const gridContainer = document.getElementById('gem-conversion-grid');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '';
    
    GEM_CONVERSION_CHAIN.forEach((gem, index) => {
        const playerAmount = playerData.inventory[gem.id] || 0;
        
        const gemCard = document.createElement('div');
        gemCard.className = `gem-conversion-card ${gem.tier}`;
        
        // Upgrade options (not for highest tier)
        let upgradeHtml = '';
        if (index < GEM_CONVERSION_CHAIN.length - 1) {
            const canUpgrade = playerAmount >= 4;
            const upgradeTargets = getUpgradeTargets(gem.id);
            
            upgradeTargets.forEach(targetGem => {
                const xpKey = `${gem.id}_to_${targetGem.id}`.replace(/ /g, '_');
                const xpReward = GEM_CONVERSION_XP[xpKey] || 0;
                
                upgradeHtml += `
                    <button class="gem-conversion-btn upgrade ${canUpgrade ? '' : 'disabled'}" 
                            onclick="convertGems('${gem.id}', '${targetGem.id}', 'upgrade')"
                            ${canUpgrade ? '' : 'disabled'}>
                        ⬆️ 4 ${gem.emoji} → 1 ${targetGem.emoji}
                        <br><small>+${xpReward} XP</small>
                    </button>
                `;
            });
        }
        
        // Downgrade options (not for lowest tier)
        let downgradeHtml = '';
        if (index > 0) {
            const canDowngrade = playerAmount >= 1;
            const downgradeTargets = getDowngradeTargets(gem.id);
            
            downgradeTargets.forEach(targetGem => {
                downgradeHtml += `
                    <button class="gem-conversion-btn downgrade ${canDowngrade ? '' : 'disabled'}" 
                            onclick="convertGems('${gem.id}', '${targetGem.id}', 'downgrade')"
                            ${canDowngrade ? '' : 'disabled'}>
                        ⬇️ 1 ${gem.emoji} → 4 ${targetGem.emoji}
                    </button>
                `;
            });
        }
        
        gemCard.innerHTML = `
            <div class="gem-card-header">
                <div class="gem-name">${gem.emoji} ${gem.name}</div>
                <div class="gem-amount">Have: ${playerAmount}</div>
            </div>
            <div class="gem-conversion-actions">
                ${upgradeHtml}
                ${downgradeHtml}
            </div>
        `;
        
        gridContainer.appendChild(gemCard);
    });
}

/**
 * Gets valid upgrade targets for a gem (sequential progression)
 */
function getUpgradeTargets(gemId) {
    const currentIndex = GEM_CONVERSION_CHAIN.findIndex(g => g.id === gemId);
    if (currentIndex === -1 || currentIndex >= GEM_CONVERSION_CHAIN.length - 1) return [];
    
    // Sequential upgrade: can only upgrade to the next tier
    return [GEM_CONVERSION_CHAIN[currentIndex + 1]];
}

/**
 * Gets valid downgrade targets for a gem (sequential progression)
 */
function getDowngradeTargets(gemId) {
    const currentIndex = GEM_CONVERSION_CHAIN.findIndex(g => g.id === gemId);
    if (currentIndex === -1 || currentIndex <= 0) return [];
    
    // Sequential downgrade: can only downgrade to the previous tier
    return [GEM_CONVERSION_CHAIN[currentIndex - 1]];
}

/**
 * Performs gem conversion
 */
function convertGems(fromGemId, toGemId, conversionType) {
    const fromAmount = playerData.inventory[fromGemId] || 0;
    
    if (conversionType === 'upgrade') {
        // Check if player has enough gems (need 4)
        if (fromAmount < 4) {
            logMessage(`Not enough ${fromGemId}! Need 4, have ${fromAmount}.`, 'fore-red');
            return;
        }
        
        // Remove 4 source gems
        playerData.inventory[fromGemId] -= 4;
        if (playerData.inventory[fromGemId] <= 0) {
            delete playerData.inventory[fromGemId];
        }
        
        // Add 1 target gem
        playerData.inventory[toGemId] = (playerData.inventory[toGemId] || 0) + 1;
        
        // Grant XP
        const xpKey = `${fromGemId}_to_${toGemId}`.replace(/ /g, '_');
        const xpReward = GEM_CONVERSION_XP[xpKey] || 0;
        if (xpReward > 0) {
            const oldLevel = getLevelFromXp(playerData.skills.enchanting.xp);
            playerData.skills.enchanting.xp += xpReward;
            const newLevel = getLevelFromXp(playerData.skills.enchanting.xp);
            
            if (newLevel > oldLevel) {
                handleLevelUp('enchanting', oldLevel, newLevel);
            }
        }
        
        const fromGem = GEM_CONVERSION_CHAIN.find(g => g.id === fromGemId);
        const toGem = GEM_CONVERSION_CHAIN.find(g => g.id === toGemId);
        
        // Track gem conversion
        trackStatistic('crafting', 'gemConvert', 1);
        
        logMessage(`Converted 4 ${fromGem.emoji} ${fromGem.name} to 1 ${toGem.emoji} ${toGem.name}! +${xpReward} Enchanting XP`, 'fore-green', '💎');
        
    } else if (conversionType === 'downgrade') {
        // Check if player has at least 1 gem
        if (fromAmount < 1) {
            logMessage(`Not enough ${fromGemId}! Need 1, have ${fromAmount}.`, 'fore-red');
            return;
        }
        
        // Remove 1 source gem
        playerData.inventory[fromGemId] -= 1;
        if (playerData.inventory[fromGemId] <= 0) {
            delete playerData.inventory[fromGemId];
        }
        
        // Add 4 target gems
        playerData.inventory[toGemId] = (playerData.inventory[toGemId] || 0) + 4;
        
        const fromGem = GEM_CONVERSION_CHAIN.find(g => g.id === fromGemId);
        const toGem = GEM_CONVERSION_CHAIN.find(g => g.id === toGemId);
        
        // Track gem conversion (downgrade)
        trackStatistic('crafting', 'gemConvert', 1);
        
        logMessage(`Converted 1 ${fromGem.emoji} ${fromGem.name} to 4 ${toGem.emoji} ${toGem.name}`, 'fore-cyan', '💔');
    }
    
    // Save and update displays
    savePlayerData();
    updateGemConversionDisplay();
    updateEnchantingStatus();
}

// Global functions for HTML onclick handlers
window.performEnchantment = performEnchantment;
window.cancelEnchantmentPreview = cancelEnchantmentPreview;
window.toggleEnchantmentLock = toggleEnchantmentLock;
window.convertGems = convertGems;

// Debug function to check wizard tower status
window.checkWizardTowerStatus = function() {
    console.log('=== Wizard Tower Status ===');
    console.log('Built structures:', playerData.built_structures);
    console.log('Wizard Tower built?', playerData.built_structures?.wizardTower || false);
    console.log('Life Steal config:', ENCHANTMENT_STAT_POOL_CONFIG.life_steal);
    console.log('Fire Damage config:', ENCHANTMENT_STAT_POOL_CONFIG.fire_damage);
    console.log('Ice Damage config:', ENCHANTMENT_STAT_POOL_CONFIG.ice_damage);
    
    // Test filter for weapon slot
    const weaponStats = Object.entries(ENCHANTMENT_STAT_POOL_CONFIG)
        .filter(([statType, config]) => {
            if (!config.appliesTo.includes('weapon')) return false;
            if (config.requires_structure && !playerData.built_structures?.[config.requires_structure]) return false;
            return true;
        })
        .map(([type]) => type);
    
    console.log('Available weapon enchantments:', weaponStats);
    console.log('Wizard enchantments included?', {
        life_steal: weaponStats.includes('life_steal'),
        fire_damage: weaponStats.includes('fire_damage'),
        ice_damage: weaponStats.includes('ice_damage')
    });
};

// DEBUG: Temporary function to test wizard tower enchantments
window.debugToggleWizardTower = function() {
    if (!playerData.built_structures) {
        playerData.built_structures = {};
    }
    
    if (playerData.built_structures.wizardTower) {
        delete playerData.built_structures.wizardTower;
        console.log('Wizard Tower disabled for testing');
        logMessage('DEBUG: Wizard Tower disabled', 'fore-yellow');
    } else {
        playerData.built_structures.wizardTower = true;
        console.log('Wizard Tower enabled for testing');
        logMessage('DEBUG: Wizard Tower enabled', 'fore-green');
    }
    
    savePlayerData();
    
    // Refresh the enchanting display if we're in the enchanting section
    if (document.getElementById('enchanting-section').style.display !== 'none') {
        updateEnchantingDisplay();
    }
};