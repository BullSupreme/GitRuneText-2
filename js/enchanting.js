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
    RING_DATA,
    ITEM_DATA,
    TOOL_DATA,
    RING_GEM_DATA,
    RING_STAT_NAMES,
    MAX_ENCHANTMENTS
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
    formatEnchantmentStat,
    getMaxHp,
    getEnchantmentBonus
} from './utils.js';
import { trackStatistic } from './achievements.js';
import { showSection } from './ui.js';
import { getEnchantedStatsHtml, showEquipSelection, populateEquipmentDisplay } from './characterinfo.js';

// Current enchanting state
let selectedEquipmentSlot = null;
let currentEnchantmentPreview = null;
let selectedEnchantmentTier = null;
let currentEnchantingState = 'overview'; // 'overview' or 'detail'

/**
 * Shows the enchanting menu and initializes the UI
 */
export function showEnchantingMenu() {
    showSection('enchanting-section');
    updateEnchantingDisplay();
    setupGemConversionEvents(); // Setup gems button event
    setupEnchantingStateEvents(); // Setup new state transition events
}

/**
 * Updates the entire enchanting display
 */
export function updateEnchantingDisplay() {
    console.log('[Enchanting] Updating display, current equipment:', playerData.equipment);
    updateEnchantingStatus();
    populateEquipmentSlots();
    
    // Reset to overview state
    selectedEquipmentSlot = null;
    currentEnchantmentPreview = null;
    showOverviewState();
}

/**
 * Updates the enchanting status display (skill level, etc.)
 */
function updateEnchantingStatus() {
    const enchantingSkill = playerData.skills.enchanting;
    const level = getLevelFromXp(enchantingSkill.xp);
    
    // Update the level and XP values in the nav header
    const levelElement = document.getElementById('enchanting-level-value');
    const xpElement = document.getElementById('enchanting-xp-value');
    
    if (levelElement) levelElement.textContent = level;
    if (xpElement) xpElement.textContent = formatNumber(enchantingSkill.xp);
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
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Dmg: ${itemData.min_dmg}-${itemData.max_dmg}`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['weapon'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'helmet', name: 'Helmet', data: HELMET_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['helmet'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'axe', name: 'Axe', data: TOOL_DATA.axe, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config?.base || 0}`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['axe'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'armor', name: 'Chestplate', data: ARMOR_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['armor'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'pickaxe', name: 'Pickaxe', data: TOOL_DATA.pickaxe, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config?.base || 0}`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['pickaxe'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'left_ring', name: 'Left Ring', data: RING_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `+${itemData.hp_bonus} HP<br>+${(itemData.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemData.str_percentage * 100).toFixed(1)}% Str`;
            const activeEnchantments = getActiveEnchantments('left_ring');
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          },
          isRing: true
        },
        { key: 'right_ring', name: 'Right Ring', data: RING_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `+${itemData.hp_bonus} HP<br>+${(itemData.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemData.str_percentage * 100).toFixed(1)}% Str`;
            const activeEnchantments = getActiveEnchantments('right_ring');
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          },
          isRing: true
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
        const equippedItemName = playerData.equipment ? playerData.equipment[slotInfo.key] : 'none';
        
        // Ensure equipment slot exists
        if (!playerData.equipment || playerData.equipment[slotInfo.key] === undefined) {
            console.warn(`Equipment slot ${slotInfo.key} not found, defaulting to 'none'`);
            if (!playerData.equipment) playerData.equipment = {};
            playerData.equipment[slotInfo.key] = 'none';
        }
        
        const itemData = (equippedItemName === "none" || !slotInfo.data) ? 
                        null : slotInfo.data[equippedItemName];
        
        // Add tier border class if item exists
        if (itemData && itemData.tier) {
            slotDiv.classList.add('item-card-tier', itemData.tier.toLowerCase());
        }

        const itemNameDisplay = itemData ? titleCase(equippedItemName) : "None";
        const itemColor = itemData ? slotInfo.colorClassGetter(itemData) : "fore-white";
        const itemStatsDisplay = slotInfo.statGetter ? slotInfo.statGetter(itemData, equippedItemName) : "N/A";
        // Check if enchantments are currently active on this slot
        const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats[slotInfo.key] || [];
        const isCurrentlyEnchanted = activeEnchantments.length > 0;
        
        // Only show enchantment count if enchantments are currently active
        let enchantmentCount = 0;
        if (isCurrentlyEnchanted) {
            const itemKey = findExistingEnchantmentKey(slotInfo.key, equippedItemName);
            if (itemKey && playerData.itemEnchantments[itemKey]) {
                const itemEnchantData = playerData.itemEnchantments[itemKey];
                enchantmentCount = itemEnchantData.count || 0;
            } else {
                // Fallback count if we can't find the itemEnchantments entry
                enchantmentCount = 1;
            }
        }
        
        // Note: enchantmentCount represents the number of enchantment SESSIONS, not the number of stats
        // The enchantments array can have multiple stats per session, so its length may be different from count
        
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
                const fileName = `${equippedItemName}-axe`;
                iconHtml = `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '🪓'}';">`;
            } else if (slotInfo.key === 'pickaxe') {
                const fileName = `${equippedItemName}-pickaxe`;
                iconHtml = `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '⛏️'}';">`;
            } else if (slotInfo.key === 'left_ring' || slotInfo.key === 'right_ring') {
                iconHtml = itemData.emoji || "💍";
            } else {
                iconHtml = itemData.emoji || "❔";
            }
        } else {
            iconHtml = "➖";
        }
        
        // Only make clickable if item is equipped and enchantable
        const isEnchantable = itemData && ['weapon', 'armor', 'helmet', 'axe', 'pickaxe', 'left_ring', 'right_ring'].includes(slotInfo.key);
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
                ${enchantmentCount > 0 ? `<div class="enchanting-item-enchanted">Enchanted (${enchantmentCount}/${slotInfo.isRing ? '1' : MAX_ENCHANTMENTS})</div>` : ''}
            </div>`;
        
        // Add equip button
        const equipButton = document.createElement('button');
        equipButton.className = 'menu-button equip-btn';
        equipButton.innerHTML = `Equip ${slotInfo.name}`;
        equipButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the enchanting menu
            showEquipSelection(slotInfo.key);
        });
        slotDiv.appendChild(equipButton);
            
        gridContainer.appendChild(slotDiv);
    });
}

/**
 * Selects equipment for enchanting and shows enchantment options
 */
function selectEquipmentForEnchanting(slotKey) {
    selectedEquipmentSlot = slotKey;
    selectedEnchantmentTier = null; // Clear any previously selected tier
    const equipmentName = playerData.equipment[slotKey];
    
    if (!equipmentName || equipmentName === 'none') {
        logMessage('No equipment equipped in that slot!', 'fore-red');
        return;
    }

    // Add selection animation to the clicked slot
    const allSlots = document.querySelectorAll('.enchanting-equipment-slot');
    allSlots.forEach(slot => slot.classList.remove('selecting'));
    
    const slots = document.querySelectorAll('.enchanting-equipment-slot');
    const slotKeys = ['placeholder', 'weapon', 'helmet', 'axe', 'armor', 'pickaxe', 'left_ring', 'right_ring'];
    const slotIndex = slotKeys.indexOf(slotKey);
    
    if (slotIndex !== -1 && slots[slotIndex]) {
        slots[slotIndex].classList.add('selecting');
        
        // Remove the animation class after animation completes
        setTimeout(() => {
            slots[slotIndex].classList.remove('selecting');
        }, 600);
    }

    // Transition to detail state after a brief delay for animation
    setTimeout(() => {
        showDetailState(slotKey);
        
        // Check if this is a ring - rings use gem enchanting
        if (slotKey === 'left_ring' || slotKey === 'right_ring') {
            displayRingEnchantingInterface(slotKey, equipmentName);
        } else {
            // Show the normal enchanting interface
            displayEnchantingInterface(slotKey, equipmentName);
        }
    }, 300);
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
    // Match the order from the slots array: placeholder, weapon, helmet, axe, armor, pickaxe, left_ring, right_ring
    const slotKeys = ['placeholder', 'weapon', 'helmet', 'axe', 'armor', 'pickaxe', 'left_ring', 'right_ring'];
    const slotIndex = slotKeys.indexOf(selectedSlotKey);
    
    if (slotIndex !== -1 && slots[slotIndex]) {
        slots[slotIndex].classList.add('selected');
    }
}

/**
 * Sets up event listeners for state transitions
 */
function setupEnchantingStateEvents() {
    const backToOverviewBtn = document.getElementById('enchanting-back-to-overview');
    if (backToOverviewBtn) {
        backToOverviewBtn.addEventListener('click', showOverviewState);
    }
}

/**
 * Shows the equipment overview state
 */
function showOverviewState() {
    currentEnchantingState = 'overview';
    
    const overviewState = document.getElementById('enchanting-overview-state');
    const detailState = document.getElementById('enchanting-detail-state');
    
    if (overviewState && detailState) {
        overviewState.classList.add('active');
        detailState.classList.remove('active');
    }
    
    // Clear the tier options container
    const tierOptionsContainer = document.getElementById('enchanting-tier-options');
    if (tierOptionsContainer) {
        tierOptionsContainer.innerHTML = '';
    }
    
    // Hide all right panels
    hideAllRightPanels();
    
    // Clear any selected item and preview
    selectedEquipmentSlot = null;
    selectedEnchantmentTier = null;
    currentEnchantmentPreview = null;
}

/**
 * Shows the item detail state with enchanting options
 */
function showDetailState(slotKey) {
    currentEnchantingState = 'detail';
    
    const overviewState = document.getElementById('enchanting-overview-state');
    const detailState = document.getElementById('enchanting-detail-state');
    
    if (overviewState && detailState) {
        overviewState.classList.remove('active');
        detailState.classList.add('active');
    }
    
    // Display the selected item in the left panel
    displaySelectedItem(slotKey);
}

/**
 * Displays the selected item in the detail panel
 */
function displaySelectedItem(slotKey) {
    const equipmentName = playerData.equipment[slotKey];
    const displayContainer = document.getElementById('enchanting-selected-item-display');
    
    if (!displayContainer || !equipmentName || equipmentName === 'none') return;
    
    // Find the slot info to get the display data
    const slots = getEquipmentSlotsConfig();
    const slotInfo = slots.find(slot => slot.key === slotKey);
    
    if (!slotInfo) return;
    
    const itemData = getItemDataForSlot(slotKey, equipmentName);
    
    // Check if enchantments are currently active on this slot
    const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats[slotKey] || [];
    const isCurrentlyEnchanted = activeEnchantments.length > 0;
    
    // Only show enchantment count if enchantments are currently active
    let enchantmentCount = 0;
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            const itemEnchantData = playerData.itemEnchantments[itemKey];
            enchantmentCount = itemEnchantData.count || 0;
        } else {
            // Fallback count if we can't find the itemEnchantments entry
            enchantmentCount = 1;
        }
    }
    
    const itemNameDisplay = itemData ? titleCase(equipmentName) : "None";
    const itemColor = itemData ? slotInfo.colorClassGetter(itemData) : "fore-white";
    const itemStatsDisplay = slotInfo.statGetter ? slotInfo.statGetter(itemData, equipmentName) : "N/A";
    
    // Get icon HTML
    let iconHtml = getItemIconHtml(slotInfo, itemData, equipmentName);
    
    displayContainer.innerHTML = `
        <div class="enchanting-equipment-slot ${itemData ? 'item-card-tier ' + itemData.tier : ''}" style="margin: 0; border: none; box-shadow: none;">
            <div class="enchanting-slot-name">${slotInfo.name}</div>
            <div class="enchanting-slot-item">
                <div class="enchanting-item-name ${itemColor}">${itemNameDisplay}</div>
                <div class="enchanting-item-icon item-border ${itemData ? itemData.tier : ''}">${iconHtml}</div>
                <div class="enchanting-item-stats">${itemStatsDisplay}</div>
                ${enchantmentCount > 0 ? `<div class="enchanting-item-enchanted">Enchanted (${enchantmentCount}/${slotInfo.isRing ? '1' : MAX_ENCHANTMENTS})</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Helper function to get equipment slots configuration
 */
function getEquipmentSlotsConfig() {
    return [
        { key: 'placeholder', name: 'Placeholder', data: {}, isPlaceholder: true },
        { key: 'weapon', name: 'Weapon', data: SWORD_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Dmg: ${itemData.min_dmg}-${itemData.max_dmg}`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['weapon'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'helmet', name: 'Helmet', data: HELMET_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['helmet'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'axe', name: 'Axe', data: TOOL_DATA.axe, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config?.base || 0}`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['axe'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'armor', name: 'Chestplate', data: ARMOR_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Def: ${(itemData.defense * 100).toFixed(0)}%`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['armor'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'pickaxe', name: 'Pickaxe', data: TOOL_DATA.pickaxe, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `Yield: ${itemData.yield_config?.base || 0}`;
            // Only show enchantments if they're currently active on the equipped item
            const activeEnchantments = playerData.enchantedStats && playerData.enchantedStats['pickaxe'] || [];
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          }
        },
        { key: 'left_ring', name: 'Left Ring', data: RING_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `+${itemData.hp_bonus} HP<br>+${(itemData.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemData.str_percentage * 100).toFixed(1)}% Str`;
            const activeEnchantments = getActiveEnchantments('left_ring');
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          },
          isRing: true
        },
        { key: 'right_ring', name: 'Right Ring', data: RING_DATA, 
          colorClassGetter: (itemData) => itemData ? itemData.color : 'fore-white',
          statGetter: (itemData, equippedItemName) => {
            if (!itemData) return "N/A";
            let stats = `+${itemData.hp_bonus} HP<br>+${(itemData.crit_chance * 100).toFixed(1)}% Crit<br>+${(itemData.str_percentage * 100).toFixed(1)}% Str`;
            const activeEnchantments = getActiveEnchantments('right_ring');
            if (activeEnchantments.length > 0) {
              const enchantedLines = activeEnchantments.map(ench => {
                const colorClass = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '';
                const statDisplay = formatEnchantmentStat(ench.stat, ench.value);
                return `<span class="${colorClass}">${statDisplay}</span>`;
              }).join('');
              stats += `<br><div class="enchant-stats-container">${enchantedLines}</div>`;
            }
            return stats;
          },
          isRing: true
        }
    ];
}

/**
 * Helper functions for item data and icons
 */
function getItemDataForSlot(slotKey, equipmentName) {
    switch (slotKey) {
        case 'weapon': return SWORD_DATA[equipmentName];
        case 'armor': return ARMOR_DATA[equipmentName];
        case 'helmet': return HELMET_DATA[equipmentName];
        case 'axe': return TOOL_DATA.axe[equipmentName];
        case 'pickaxe': return TOOL_DATA.pickaxe[equipmentName];
        case 'left_ring':
        case 'right_ring': return RING_DATA[equipmentName];
        default: return null;
    }
}

function getItemIconHtml(slotInfo, itemData, equippedItemName) {
    if (!itemData) return "➖";
    
    if (slotInfo.key === 'weapon') {
        const fileName = equippedItemName.replace(/ /g, '-').replace('-2h-sword','-2hsword');
        return `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '⚔️'}';">`;
    } else if (slotInfo.key === 'armor') {
        const materialName = equippedItemName.toLowerCase().replace(/\s+chestplate$/, '');
        const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
        return `<img src="assets/${fileName}" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '🛡️'}';">`;
    } else if (slotInfo.key === 'helmet') {
        if (equippedItemName.toLowerCase().includes('dragon helmet')) {
            return `<img src="assets/Dragon-Full-Helmet.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '👑'}';">`;
        } else {
            return itemData.emoji || "❔";
        }
    } else if (slotInfo.key === 'axe') {
        const fileName = `${equippedItemName}-axe`;
        return `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '🪓'}';">`;
    } else if (slotInfo.key === 'pickaxe') {
        const fileName = `${equippedItemName}-pickaxe`;
        return `<img src="assets/${fileName}.png" class="inventory-item-icon" alt="${equippedItemName}" onerror="this.outerHTML='${itemData.emoji || '⛏️'}';">`;
    } else if (slotInfo.key === 'left_ring' || slotInfo.key === 'right_ring') {
        return itemData.emoji || "💍";
    } else {
        return itemData.emoji || "❔";
    }
}

/**
 * Hides all right panel sections (legacy function for compatibility)
 */
function hideAllRightPanels() {
    // This function is kept for compatibility with existing code
    const panels = document.querySelectorAll('.enchanting-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
    });
}


/**
 * Displays the main enchanting interface with tier selection
 */
function displayEnchantingInterface(slotKey, equipmentName) {
    // Make sure we're in detail state
    if (currentEnchantingState !== 'detail') {
        showDetailState(slotKey);
    }
    
    hideAllRightPanels();
    document.getElementById('enchanting-options').classList.add('active');
    displayEnchantmentOptions(slotKey);
}

/**
 * Displays initial preview showing current enchantments when item is selected
 */
function displayInitialEnchantmentPreview(slotKey) {
    const container = document.getElementById('enchanting-preview-content');
    if (!container) return;
    
    const equipmentName = playerData.equipment[slotKey];
    const itemData = getItemData(equipmentName, slotKey);
    
    // Check if the item is currently enchanted by looking at enchantedStats
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    // Get enchantments for this specific item
    let enchantments = [];
    let enchantmentCount = 0;
    let itemKey = null;
    
    if (isCurrentlyEnchanted) {
        // Find the existing unique key for this enchanted item
        itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            const itemEnchantData = playerData.itemEnchantments[itemKey];
            enchantments = itemEnchantData.enchantments || [];
            enchantmentCount = itemEnchantData.count || 0;
        } else {
            // Fallback to enchantedStats if we can't find the itemEnchantments entry
            enchantments = playerData.enchantedStats[slotKey] || [];
            enchantmentCount = 1; // Default count if not found
        }
    }
    
    let statsHtml = '<div class="item-stats-display">';
    
    // Show enchantment session count
    const sessionsUsed = itemKey && playerData.itemEnchantments[itemKey] ? (playerData.itemEnchantments[itemKey].count || 0) : 0;
    statsHtml += `<div class="enchantment-count-display">`;
    statsHtml += `Enchantments: ${sessionsUsed}/${MAX_ENCHANTMENTS}`;
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
        
        enchantments.forEach((enchantment) => {
            const isWizardEnchantment = ['life_steal', 'fire_damage', 'ice_damage'].includes(enchantment.stat);
            const colorClass = isWizardEnchantment ? ENCHANTMENT_STAT_TIER_COLORS.wizard : (ENCHANTMENT_STAT_TIER_COLORS[enchantment.tier] || '');
            const statDisplay = formatEnchantmentStat(enchantment.stat, enchantment.value);
            const isLocked = enchantment.locked || false;
            const lockIcon = isLocked ? '🔒 ' : '';
            const lockedClass = isLocked ? 'locked' : '';
            
            statsHtml += `<div class="enchantment-container ${colorClass} ${lockedClass}">
                            <span>${lockIcon}${statDisplay}</span>
                          </div>`;
        });
        statsHtml += '</div>';
    } else {
        statsHtml += '<div class="no-enchantments">No current enchantments</div>';
    }
    
    // Add instruction text
    statsHtml += '<div class="enchanting-instructions">';
    statsHtml += '<p>Select an enchantment tier from the left to preview and apply new enchantments.</p>';
    statsHtml += '</div>';
    
    statsHtml += '</div>';
    container.innerHTML = statsHtml;
    
    // Clear the enchant button cost display since no tier is selected
    const costDisplay = document.querySelector('.enchant-cost-display');
    if (costDisplay) {
        costDisplay.innerHTML = 'Select a tier first';
    }
    
    // Show the preview panel
    hideAllRightPanels();
    document.getElementById('enchanting-preview').classList.add('active');
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
 * Formats the cost display for enchanting tiers with emojis and color coding
 */
function formatEnchantingCost(cost) {
    // Resource emoji mappings
    const resourceEmojis = {
        'gold': '💰',
        'gems': '💠',
        'sapphire': '🔷',
        'emerald': '💚',
        'ruby': '🔴',
        'diamond': '💎',
        'dragon gem': '💎🔥'
    };
    
    // Helper function to format a cost item with emoji and color coding
    function formatCostItem(amount, resourceName) {
        const emoji = resourceEmojis[resourceName] || '⚡';
        let playerAmount;
        
        // Get player's current amount of this resource
        if (resourceName === 'gold') {
            playerAmount = playerData.gold || 0;
        } else {
            playerAmount = playerData.inventory?.[resourceName] || 0;
        }
        
        // Determine color based on whether player has enough
        const hasEnough = playerAmount >= amount;
        const colorClass = hasEnough ? 'fore-green' : 'fore-red';
        
        // Use proper display name for gems
        const displayName = resourceName === 'gems' ? 'Assorted Gems' : resourceName;
        return `${emoji} <span class="${colorClass}">${amount}</span> ${displayName}`;
    }
    
    let costParts = [];
    if (cost.gold) costParts.push(formatCostItem(cost.gold, 'gold'));
    if (cost.mainResource) costParts.push(formatCostItem(cost.mainResourceQty, cost.mainResource));
    if (cost.secondaryResource) costParts.push(formatCostItem(cost.secondaryResourceQty, cost.secondaryResource));
    if (cost.tertiaryResource) costParts.push(formatCostItem(cost.tertiaryResourceQty, cost.tertiaryResource));
    
    return costParts.join('<br>');
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
 * Creates a unique enchantment key for a newly enchanted item
 */
function createUniqueEnchantmentKey(slotKey, itemName) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${slotKey}:${itemName}:${timestamp}:${random}`;
}

/**
 * Find the existing unique enchantment key for a currently equipped enchanted item
 */
function findExistingEnchantmentKey(slotKey, itemName) {
    if (!playerData.itemEnchantments || !playerData.enchantedStats[slotKey]) {
        return null;
    }
    
    const currentEnchantments = playerData.enchantedStats[slotKey];
    
    // Look through all enchantment keys for this item type
    for (const [enchantKey, enchantData] of Object.entries(playerData.itemEnchantments)) {
        const keyParts = enchantKey.split(':');
        const keySlot = keyParts[0];
        const keyItemName = keyParts[1];
        
        // Check if this key matches our slot and item name
        if (keySlot === slotKey && keyItemName === itemName && enchantData.enchantments) {
            // Check if the enchantments match what's currently equipped
            if (JSON.stringify(enchantData.enchantments) === JSON.stringify(currentEnchantments)) {
                return enchantKey;
            }
        }
    }
    
    return null;
}

/**
 * Check if an item should display enchantments based on active equipment state
 */
function shouldShowEnchantments(slotKey) {
    return playerData.enchantedStats && 
           playerData.enchantedStats[slotKey] && 
           playerData.enchantedStats[slotKey].length > 0;
}

/**
 * Get active enchantments for display from enchantedStats (not itemEnchantments)
 */
function getActiveEnchantments(slotKey) {
    if (!shouldShowEnchantments(slotKey)) return [];
    return playerData.enchantedStats[slotKey] || [];
}

/**
 * Selects an enchantment tier and shows the preview
 */
function selectEnchantmentTier(slotKey, enchantmentTierId) {
    selectedEnchantmentTier = enchantmentTierId;
    
    const equipmentName = playerData.equipment[slotKey];
    
    // Check if the currently equipped item is enchanted by looking at enchantedStats
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    // Only check enchantment count if this item is currently enchanted
    let currentCount = 0;
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            currentCount = playerData.itemEnchantments[itemKey].count || 0;
        }
    }
    
    // Check if player has reached maximum locked enchantments (unlimited enchanting, limited locking)
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            const itemData = playerData.itemEnchantments[itemKey];
            const lockedCount = (itemData.enchantments || []).filter(e => e.locked).length;
            // Note: No limit on total enchantments, only on locked enchantments
        }
    }
    
    displayEnchantingPreview(slotKey, enchantmentTierId);
}

/**
 * Displays the enchanting preview with current stats and enchant button
 */
function displayEnchantingPreview(slotKey, enchantmentTierId) {
    // Switch to the preview panel
    hideAllRightPanels();
    document.getElementById('enchanting-preview').classList.add('active');
    
    const container = document.getElementById('enchanting-preview-content');
    if (!container) return;

    const equipmentName = playerData.equipment[slotKey];
    const itemData = getItemData(equipmentName, slotKey);
    
    // Check if the currently equipped item is enchanted by looking at enchantedStats
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    // Get enchantments for this specific item only if it's currently enchanted
    let enchantments = [];
    let enchantmentCount = 0;
    let itemKey = null;
    
    if (isCurrentlyEnchanted) {
        itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            const itemEnchantData = playerData.itemEnchantments[itemKey];
            enchantments = itemEnchantData.enchantments || [];
            enchantmentCount = itemEnchantData.count || 0;
        } else {
            // Fallback to enchantedStats if we can't find the itemEnchantments entry
            enchantments = playerData.enchantedStats[slotKey] || [];
            enchantmentCount = 1; // Default count if not found
        }
    }
    const tierData = ENCHANTING_TIER_DATA[enchantmentTierId];
    
    let statsHtml = '<div class="item-stats-display">';
    
    // Show enchantment session count
    const sessionsUsed = itemKey && playerData.itemEnchantments[itemKey] ? (playerData.itemEnchantments[itemKey].count || 0) : 0;
    statsHtml += `<div class="enchantment-count-display">`;
    statsHtml += `Enchantments: ${sessionsUsed}/${MAX_ENCHANTMENTS}`;
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
        // Check if item is at maximum LOCKED enchantments
        const lockedEnchantmentCount = enchantments.filter(e => e.locked).length;
        const isAtMaxLockedEnchantments = lockedEnchantmentCount >= MAX_ENCHANTMENTS;
        
        // No session limit check - unlimited enchanting allowed
        
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
            
            // Update tooltip and functionality based on max enchantments
            let tooltipText, clickAction, lockCostDisplay;
            
            if (isLocked) {
                tooltipText = 'Click to unlock this enchantment';
                clickAction = `window.toggleEnchantmentLock('${slotKey}', ${index})`;
                lockCostDisplay = '';
            } else if (isAtMaxLockedEnchantments) {
                tooltipText = `Cannot lock - item is at maximum locked enchantments (${lockedEnchantmentCount}/${MAX_ENCHANTMENTS})`;
                clickAction = '';
                lockCostDisplay = '<span class="lock-cost-badge" style="margin-left: auto; font-size: 0.9em; opacity: 0.4; color: #666;">MAX LOCKED</span>';
            } else {
                tooltipText = `Click to lock for ${lockCost} Ancient Tomes (have ${playerTomes})`;
                clickAction = `window.toggleEnchantmentLock('${slotKey}', ${index})`;
                lockCostDisplay = `<span class="lock-cost-badge" style="margin-left: auto; font-size: 0.9em; opacity: 0.7;">📚 ${lockCost}</span>`;
            }
            
            // Determine styles and cursor
            let containerStyle = "display: flex; justify-content: space-between; align-items: center;";
            if (isAtMaxLockedEnchantments && !isLocked) {
                containerStyle += " opacity: 0.5; cursor: not-allowed;";
            } else if (!isLocked && !canAfford) {
                containerStyle += " opacity: 0.6; cursor: not-allowed;";
            }
            
            statsHtml += `<div class="enchantment-container ${isLocked || isAtMaxLockedEnchantments ? '' : 'clickable-enchantment'} ${colorClass} ${lockedClass}" 
                              data-enchantment-index="${index}" 
                              data-tier="${enchantment.tier}"
                              data-slot="${slotKey}"
                              title="${tooltipText}"
                              ${clickAction ? `onclick="${clickAction}"` : ''}
                              style="${containerStyle}">
                            <span>${lockIcon}${statDisplay}</span>
                            ${lockCostDisplay}
                          </div>`;
        });
        statsHtml += '</div>';
    } else {
        statsHtml += '<div class="no-enchantments">No current enchantments</div>';
    }
    
    statsHtml += '</div>';
    container.innerHTML = statsHtml;
    
    // Update the enchant button with cost and session check
    updateEnchantButton(tierData, slotKey);
    
    // Show the preview panel
    hideAllRightPanels();
    document.getElementById('enchanting-preview').classList.add('active');
}

/**
 * Updates the enchant button with cost information and enables/disables based on session count
 */
function updateEnchantButton(tierData, slotKey = null) {
    const costDisplay = document.querySelector('.enchant-cost-display');
    const enchantButton = document.getElementById('enchanting-perform-btn');
    
    if (costDisplay) {
        costDisplay.innerHTML = formatEnchantingCost(tierData.cost);
    }
    
    if (enchantButton && slotKey) {
        // Check if item has reached maximum enchant sessions (12/12)
        const equipmentName = playerData.equipment[slotKey];
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        const sessionsUsed = itemKey && playerData.itemEnchantments[itemKey] ? (playerData.itemEnchantments[itemKey].count || 0) : 0;
        
        if (sessionsUsed >= MAX_ENCHANTMENTS) {
            enchantButton.classList.add('disabled');
            enchantButton.style.pointerEvents = 'none';
        } else {
            enchantButton.classList.remove('disabled');
            enchantButton.style.pointerEvents = 'auto';
        }
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
    
    // Check if this is a ring enchantment
    if (selectedEquipmentSlot === 'left_ring' || selectedEquipmentSlot === 'right_ring') {
        performRingEnchantment();
        return;
    }
    
    const tierData = ENCHANTING_TIER_DATA[selectedEnchantmentTier];
    if (!tierData) {
        logMessage('Invalid enchantment tier!', 'fore-red');
        return;
    }

    const equipmentName = playerData.equipment[selectedEquipmentSlot];
    
    // Check if item has reached maximum enchant sessions (12/12)
    const existingItemKey = findExistingEnchantmentKey(selectedEquipmentSlot, equipmentName);
    const sessionsUsed = existingItemKey && playerData.itemEnchantments[existingItemKey] ? (playerData.itemEnchantments[existingItemKey].count || 0) : 0;
    
    if (sessionsUsed >= MAX_ENCHANTMENTS) {
        logMessage(`This item has reached the maximum number of enchant sessions (${MAX_ENCHANTMENTS}/${MAX_ENCHANTMENTS}). Cannot enchant further!`, 'fore-red');
        return;
    }
    
    // Check if the currently equipped item is enchanted by looking at enchantedStats
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[selectedEquipmentSlot] && 
                                playerData.enchantedStats[selectedEquipmentSlot].length > 0;
    
    // For unenchanted items, create a unique key to avoid overwriting other enchanted versions
    let itemKey;
    if (isCurrentlyEnchanted) {
        // Find existing key for already enchanted items by matching the current enchantments
        itemKey = findExistingEnchantmentKey(selectedEquipmentSlot, equipmentName);
        if (!itemKey) {
            // Fallback: create new unique key if we can't find the existing one
            console.warn('Could not find existing enchantment key, creating new one');
            itemKey = createUniqueEnchantmentKey(selectedEquipmentSlot, equipmentName);
        }
    } else {
        // Create unique key for newly enchanted items
        itemKey = createUniqueEnchantmentKey(selectedEquipmentSlot, equipmentName);
        
        // For newly enchanted items, we need to manage inventory properly
        // The item being enchanted should be converted from unenchanted to enchanted
        // Remove one instance of the base equipment item from inventory
        removeItemFromInventory(equipmentName, 1);
    }
    
    // Note: Removed enchantment count limit - players can enchant unlimited times
    // Only locked enchantments are limited to MAX_ENCHANTMENTS

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
    
    // Initialize item enchantment data
    if (!playerData.itemEnchantments[itemKey]) {
        playerData.itemEnchantments[itemKey] = { enchantments: [], count: 0 };
    }
    
    // Update enchantments for this specific item
    playerData.itemEnchantments[itemKey].enchantments = newEnchantments;
    
    // Set count based on whether the item was previously enchanted
    if (isCurrentlyEnchanted) {
        // Item was already enchanted, increment session count
        playerData.itemEnchantments[itemKey].count++;
    } else {
        // Item was unenchanted, this is the first enchantment session
        playerData.itemEnchantments[itemKey].count = 1;
    }
    
    // Debug logging
    console.log(`[performEnchant] Enchanting ${itemKey}:`, {
        newEnchantments,
        totalEnchantments: newEnchantments.length,
        itemEnchantments: playerData.itemEnchantments[itemKey]
    });
    
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
    
    // Update the selected item display in detail state
    displaySelectedItem(selectedEquipmentSlot);
    
    // Update character display if it's visible
    const characterSection = document.getElementById('character-section');
    if (characterSection && !characterSection.classList.contains('hidden')) {
        populateEquipmentDisplay();
    }
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
        document.getElementById('enchanting-options').classList.add('active');
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
    
    // Find the correct key for the enchanted item
    const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
    if (!itemKey) {
        logMessage('Enchanted item not found!', 'fore-red');
        return;
    }
    
    const itemEnchantData = playerData.itemEnchantments[itemKey];
    
    if (!itemEnchantData || !itemEnchantData.enchantments[enchantmentIndex]) {
        logMessage('Enchantment not found!', 'fore-red');
        return;
    }

    const enchantment = itemEnchantData.enchantments[enchantmentIndex];
    const isCurrentlyLocked = enchantment.locked || false;
    
    // If trying to lock (not unlock), check restrictions
    if (!isCurrentlyLocked) {
        // Check if we're at maximum LOCKED enchantments
        const lockedEnchantments = (itemEnchantData && itemEnchantData.enchantments) 
            ? itemEnchantData.enchantments.filter(e => e.locked).length 
            : 0;
        if (lockedEnchantments >= MAX_ENCHANTMENTS) {
            logMessage(`This item has reached the maximum number of locked enchantments (${MAX_ENCHANTMENTS}/${MAX_ENCHANTMENTS}). Cannot lock more!`, 'fore-red');
            return;
        }
    }
    
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
    
    // Check if the currently equipped item is actually enchanted
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    // Only use existing enchantment data if the item is currently enchanted
    let currentEnchantments = [];
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            currentEnchantments = playerData.itemEnchantments[itemKey].enchantments || [];
        } else {
            // Fallback to enchantedStats if we can't find the itemEnchantments entry
            currentEnchantments = playerData.enchantedStats[slotKey] || [];
        }
    }
    
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

/**
 * Displays the ring enchanting interface with gem selection
 */
function displayRingEnchantingInterface(slotKey, equipmentName) {
    // Make sure we're in detail state
    if (currentEnchantingState !== 'detail') {
        showDetailState(slotKey);
    }
    
    hideAllRightPanels();
    document.getElementById('enchanting-options').classList.add('active');
    displayRingGemOptions(slotKey);
}

/**
 * Displays available gem options for ring enchanting
 */
function displayRingGemOptions(slotKey) {
    const container = document.getElementById('enchanting-tier-options');
    if (!container) return;

    // Clear existing options
    container.innerHTML = '';

    const enchantingLevel = getLevelFromXp(playerData.skills.enchanting.xp);
    const equipmentName = playerData.equipment[slotKey];
    
    // Check if the ring is enchanted and get the correct key
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    let itemEnchantData = { enchantments: [], count: 0 };
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            itemEnchantData = playerData.itemEnchantments[itemKey];
        }
    }
    
    // Check if ring is already enchanted (rings can only be enchanted once with 1 gem)
    const isAlreadyEnchanted = itemEnchantData.count > 0;

    if (isAlreadyEnchanted) {
        container.innerHTML = `
            <div class="ring-already-enchanted">
                <div class="enchantment-limit-message">
                    <h3>🔮 Ring Already Enchanted</h3>
                    <p>This ring has already been enchanted with a gem (1/1).</p>
                    <p>Each ring can only be enchanted once with one gemstone.</p>
                    <p>Get a new ring to enchant it with a different gem.</p>
                </div>
            </div>
        `;
        return;
    }

    // Add title for ring enchanting
    const titleDiv = document.createElement('div');
    titleDiv.className = 'ring-enchanting-title';
    titleDiv.innerHTML = `
        <h3>🔮 Ring Enchanting</h3>
        <p>Select a gemstone to permanently enhance your ring (1/1 uses):</p>
    `;
    container.appendChild(titleDiv);

    Object.entries(RING_GEM_DATA).forEach(([gemId, gemData]) => {
        const playerGems = playerData.inventory[gemId] || 0;
        const hasGem = playerGems > 0;
        
        const optionDiv = document.createElement('div');
        optionDiv.className = `enchanting-tier-option ring-gem-option ${hasGem ? '' : 'disabled'}`;
        
        if (hasGem) {
            optionDiv.addEventListener('click', () => selectRingGem(slotKey, gemId));
            optionDiv.style.cursor = 'pointer';
        }
        
        // Generate stat preview
        const statPreview = generateRingStatPreview(gemData);
        
        optionDiv.innerHTML = `
            <div class="tier-option-header">
                <div class="tier-option-name">${gemData.emoji} ${gemData.name}</div>
                <div class="tier-option-level">Have: ${playerGems}</div>
            </div>
            <div class="tier-option-description">Enchant your ring with this ${gemData.name.toLowerCase()}</div>
            <div class="tier-option-cost">
                Cost: ${gemData.emoji} 1 ${gemData.name}
            </div>
            <div class="tier-option-potential">
                ${statPreview}
            </div>
            <div class="tier-option-status">
                ${hasGem ? 'Click to Select' : 'Need Assorted Gems'}
            </div>
        `;
        
        container.appendChild(optionDiv);
    });
}

/**
 * Generates a preview of possible stats for a ring gem
 */
function generateRingStatPreview(gemData) {
    const minStats = gemData.minStats;
    const maxStats = gemData.maxStats;
    const statNames = Object.keys(gemData.statRanges);
    
    let preview = `Will roll ${minStats}-${maxStats} random stats from:<br>`;
    preview += statNames.map(statKey => {
        const [min, max] = gemData.statRanges[statKey];
        const statName = RING_STAT_NAMES[statKey] || statKey;
        let minDisplay, maxDisplay;
        
        if (statKey === 'hp_flat') {
            minDisplay = `+${Math.floor(min)}`;
            maxDisplay = `+${Math.floor(max)}`;
        } else if (statKey === 'crafting_speed') {
            minDisplay = `${min.toFixed(1)}s`;
            maxDisplay = `${max.toFixed(1)}s`;
        } else {
            minDisplay = `${(min * 100).toFixed(1)}%`;
            maxDisplay = `${(max * 100).toFixed(1)}%`;
        }
        
        return `${statName}: ${minDisplay} to ${maxDisplay}`;
    }).slice(0, 4).join('<br>');
    
    if (statNames.length > 4) {
        preview += '<br>...and more';
    }
    
    return preview;
}

/**
 * Selects a gem for ring enchanting and shows preview
 */
function selectRingGem(slotKey, gemId) {
    selectedEnchantmentTier = gemId; // Reuse this variable for gem selection
    
    const equipmentName = playerData.equipment[slotKey];
    
    // Check if the ring is enchanted and get the correct key
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    // Check if already enchanted
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            const itemEnchantData = playerData.itemEnchantments[itemKey];
            if (itemEnchantData.count > 0) {
                logMessage('This ring is already enchanted!', 'fore-red');
                return;
            }
        }
    }
    
    displayRingEnchantingPreview(slotKey, gemId);
}

/**
 * Displays the ring enchanting preview
 */
function displayRingEnchantingPreview(slotKey, gemId) {
    const container = document.getElementById('enchanting-preview-content');
    if (!container) return;

    const equipmentName = playerData.equipment[slotKey];
    const itemData = RING_DATA[equipmentName];
    const gemData = RING_GEM_DATA[gemId];
    
    // Check if the ring is enchanted and get the correct key
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[slotKey] && 
                                playerData.enchantedStats[slotKey].length > 0;
    
    // Get enchantments for this specific item
    let itemEnchantData = { enchantments: [], count: 0 };
    let enchantmentCount = 0;
    
    if (isCurrentlyEnchanted) {
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        if (itemKey && playerData.itemEnchantments[itemKey]) {
            itemEnchantData = playerData.itemEnchantments[itemKey];
            enchantmentCount = itemEnchantData.count || 0;
        }
    }
    
    let statsHtml = '<div class="item-stats-display">';
    
    // Show enchantment count
    statsHtml += `<div class="enchantment-count-display">`;
    statsHtml += `Ring Enchantments: ${enchantmentCount}/1`;
    statsHtml += `</div>`;
    
    // Show base item stats
    if (itemData) {
        statsHtml += '<div class="base-stats-section">';
        statsHtml += '<div class="stats-section-title">Base Ring Stats:</div>';
        statsHtml += `<div class="base-stat-line">+${itemData.hp_bonus} HP</div>`;
        statsHtml += `<div class="base-stat-line">+${(itemData.crit_chance * 100).toFixed(1)}% Crit</div>`;
        statsHtml += `<div class="base-stat-line">+${(itemData.str_percentage * 100).toFixed(1)}% Str</div>`;
        statsHtml += '</div>';
    }
    
    // Show selected gem info
    statsHtml += '<div class="enchanted-stats-section">';
    statsHtml += '<div class="stats-section-title">Selected Gem:</div>';
    statsHtml += `<div class="gem-selection-display">${gemData.emoji} ${gemData.name}</div>`;
    statsHtml += `<div class="gem-stats-info">Will add ${gemData.minStats}-${gemData.maxStats} random enchantments</div>`;
    statsHtml += '</div>';
    
    statsHtml += '</div>';
    container.innerHTML = statsHtml;
    
    // Update the enchant button for ring enchanting
    updateRingEnchantButton(gemData, slotKey);
    
    // Show the preview panel
    hideAllRightPanels();
    document.getElementById('enchanting-preview').classList.add('active');
}

/**
 * Updates the enchant button for ring enchanting
 */
function updateRingEnchantButton(gemData, slotKey = null) {
    const costDisplay = document.querySelector('.enchant-cost-display');
    const enchantButton = document.getElementById('enchanting-perform-btn');
    
    if (costDisplay) {
        costDisplay.innerHTML = `${gemData.emoji} <span class="fore-green">1</span> ${gemData.name}`;
    }
    
    if (enchantButton && slotKey) {
        // Check if ring has reached maximum enchant sessions (12/12)
        const equipmentName = playerData.equipment[slotKey];
        const itemKey = findExistingEnchantmentKey(slotKey, equipmentName);
        const sessionsUsed = itemKey && playerData.itemEnchantments[itemKey] ? (playerData.itemEnchantments[itemKey].count || 0) : 0;
        
        if (sessionsUsed >= MAX_ENCHANTMENTS) {
            enchantButton.classList.add('disabled');
            enchantButton.style.pointerEvents = 'none';
        } else {
            enchantButton.classList.remove('disabled');
            enchantButton.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Performs ring enchantment with selected gem
 */
function performRingEnchantment() {
    if (!selectedEquipmentSlot || !selectedEnchantmentTier) {
        logMessage('No gem selected!', 'fore-red');
        return;
    }
    
    const gemId = selectedEnchantmentTier;
    const gemData = RING_GEM_DATA[gemId];
    if (!gemData) {
        logMessage('Invalid gem selected!', 'fore-red');
        return;
    }

    const equipmentName = playerData.equipment[selectedEquipmentSlot];
    
    // Check if ring has reached maximum enchant sessions (12/12)
    const existingItemKey = findExistingEnchantmentKey(selectedEquipmentSlot, equipmentName);
    const sessionsUsed = existingItemKey && playerData.itemEnchantments[existingItemKey] ? (playerData.itemEnchantments[existingItemKey].count || 0) : 0;
    
    if (sessionsUsed >= MAX_ENCHANTMENTS) {
        logMessage(`This ring has reached the maximum number of enchant sessions (${MAX_ENCHANTMENTS}/${MAX_ENCHANTMENTS}). Cannot enchant further!`, 'fore-red');
        return;
    }
    
    // Check if the ring is already enchanted
    const isCurrentlyEnchanted = playerData.enchantedStats && 
                                playerData.enchantedStats[selectedEquipmentSlot] && 
                                playerData.enchantedStats[selectedEquipmentSlot].length > 0;
    
    // Get or create unique key for ring
    let itemKey;
    if (isCurrentlyEnchanted) {
        // Find existing key for already enchanted rings
        itemKey = findExistingEnchantmentKey(selectedEquipmentSlot, equipmentName);
        if (!itemKey) {
            // Fallback: create new unique key if we can't find the existing one
            console.warn('Could not find existing ring enchantment key, creating new one');
            itemKey = createUniqueEnchantmentKey(selectedEquipmentSlot, equipmentName);
        }
    } else {
        // Create unique key for newly enchanted rings
        itemKey = createUniqueEnchantmentKey(selectedEquipmentSlot, equipmentName);
        
        // Remove one instance of the base ring item from inventory
        removeItemFromInventory(equipmentName, 1);
    }

    // Check if player has the gem
    const playerGems = playerData.inventory[gemId] || 0;
    if (playerGems < 1) {
        logMessage('You need Assorted Gems!', 'fore-red');
        return;
    }

    // Consume the gem
    playerData.inventory[gemId]--;
    if (playerData.inventory[gemId] <= 0) {
        delete playerData.inventory[gemId];
    }

    // Roll ring enchantments
    const newEnchantments = rollRingEnchantments(gemData);
    
    // Initialize item enchantment data if it doesn't exist
    if (!playerData.itemEnchantments[itemKey]) {
        playerData.itemEnchantments[itemKey] = { enchantments: [], count: 0 };
    }
    
    // Update enchantments for this specific item
    playerData.itemEnchantments[itemKey].enchantments = newEnchantments;
    playerData.itemEnchantments[itemKey].count = 1; // Rings can only be enchanted once
    
    // Also update the slot-based enchantments for the currently equipped item
    playerData.enchantedStats[selectedEquipmentSlot] = newEnchantments;
    
    // Grant XP (based on gem tier)
    const xpGains = { "sapphire": 25, "emerald": 50, "ruby": 100, "diamond": 200, "dragon gem": 400 };
    const xpGain = xpGains[gemId] || 25;
    
    const oldLevel = getLevelFromXp(playerData.skills.enchanting.xp);
    playerData.skills.enchanting.xp += xpGain;
    const newLevel = getLevelFromXp(playerData.skills.enchanting.xp);
    
    if (newLevel > oldLevel) {
        handleLevelUp('enchanting', oldLevel, newLevel);
    }

    // Track enchanting statistics
    trackStatistic('crafting', 'enchant', 1, selectedEquipmentSlot);
    
    // Play enchantment sound effect
    playSound(sounds.enchant);
    
    logMessage(`Ring enchanted with ${gemData.emoji} ${gemData.name}! Gained ${xpGain} Enchanting XP.`, 'fore-green');
    console.log('Applied ring enchantments:', newEnchantments);
    
    savePlayerData();
    updateEnchantingStatus();
    
    // Refresh the display completely
    console.log('Refreshing ring enchanting display after enchantment');
    
    // Update the equipment grid in overview state
    populateEquipmentSlots();
    
    // Update the selected item display in detail state
    displaySelectedItem(selectedEquipmentSlot);
    
    // Show the ring interface again to display the "already enchanted" message
    displayRingEnchantingInterface(selectedEquipmentSlot, equipmentName);
    
    // Update character display if it's visible
    const characterSection = document.getElementById('character-section');
    if (characterSection && !characterSection.classList.contains('hidden')) {
        populateEquipmentDisplay();
    }
}

/**
 * Rolls enchantments for a ring based on gem data
 */
function rollRingEnchantments(gemData) {
    const numStats = Math.floor(Math.random() * (gemData.maxStats - gemData.minStats + 1)) + gemData.minStats;
    const enchantments = [];
    const availableStats = Object.keys(gemData.statRanges);
    
    // Shuffle available stats and take the first numStats
    const shuffledStats = availableStats.sort(() => Math.random() - 0.5);
    const selectedStats = shuffledStats.slice(0, numStats);
    
    selectedStats.forEach(statKey => {
        const [min, max] = gemData.statRanges[statKey];
        const value = Math.random() * (max - min) + min;
        
        enchantments.push({
            stat: statKey,
            value: parseFloat(value.toFixed(4)),
            tier: gemData.tier,
            isRingEnchantment: true // Flag to identify ring enchantments
        });
    });
    
    return enchantments;
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

// DEBUG: Add gems for testing ring enchanting
window.debugAddRingGems = function() {
    if (!playerData.inventory) playerData.inventory = {};
    
    playerData.inventory['sapphire'] = (playerData.inventory['sapphire'] || 0) + 5;
    playerData.inventory['emerald'] = (playerData.inventory['emerald'] || 0) + 3;
    playerData.inventory['ruby'] = (playerData.inventory['ruby'] || 0) + 2;
    playerData.inventory['diamond'] = (playerData.inventory['diamond'] || 0) + 1;
    playerData.inventory['dragon gem'] = (playerData.inventory['dragon gem'] || 0) + 1;
    
    logMessage('DEBUG: Added gems for ring enchanting testing!', 'fore-green');
    console.log('Added gems:', {
        sapphire: 5,
        emerald: 3, 
        ruby: 2,
        diamond: 1,
        'dragon gem': 1
    });
    
    savePlayerData();
};

// DEBUG: Check if ring stats are being applied correctly
window.debugCheckRingStats = function() {
    console.log('=== Ring Enchantment Stats Debug ===');
    
    const attackLevel = getLevelFromXp(playerData.skills.attack.xp || 0);
    console.log('Attack Level:', attackLevel);
    
    // Check HP calculations
    const maxHp = getMaxHp(attackLevel);
    const hpFlat = getEnchantmentBonus('hp_flat');
    const hpPercent = getEnchantmentBonus('hp_percent');
    console.log('Max HP:', maxHp, '(flat bonus:', hpFlat, ', percent bonus:', (hpPercent * 100).toFixed(1) + '%)');
    
    // Check combat stats  
    const strPercent = getEnchantmentBonus('str_percent');
    const critChance = getEnchantmentBonus('crit_chance');
    const critDamage = getEnchantmentBonus('crit_damage');
    const aoeChance = getEnchantmentBonus('aoe_chance');
    const aoeDamage = getEnchantmentBonus('aoe_damage');
    
    console.log('STR Bonus:', (strPercent * 100).toFixed(1) + '%');
    console.log('Crit Chance Bonus:', (critChance * 100).toFixed(1) + '%');
    console.log('Crit Damage Bonus:', (critDamage * 100).toFixed(1) + '%');
    console.log('AOE Chance Bonus:', (aoeChance * 100).toFixed(1) + '%');
    console.log('AOE Damage Bonus:', (aoeDamage * 100).toFixed(1) + '%');
    
    // Check crafting speed
    const craftingSpeed = getEnchantmentBonus('crafting_speed');
    console.log('Crafting Speed Reduction:', craftingSpeed.toFixed(1) + 's');
    
    // Check equipped rings
    const leftRing = playerData.equipment?.left_ring;
    const rightRing = playerData.equipment?.right_ring;
    console.log('Left Ring:', leftRing);
    console.log('Right Ring:', rightRing);
    
    if (leftRing && leftRing !== 'none') {
        const leftKey = `left_ring:${leftRing}`;
        const leftEnchants = playerData.itemEnchantments[leftKey];
        console.log('Left Ring Enchantments:', leftEnchants);
    }
    
    if (rightRing && rightRing !== 'none') {
        const rightKey = `right_ring:${rightRing}`;
        const rightEnchants = playerData.itemEnchantments[rightKey];
        console.log('Right Ring Enchantments:', rightEnchants);
    }
    
    logMessage('Ring stats check complete - see console for details', 'fore-cyan');
};

// DEBUG: Force refresh the enchanting display
window.debugRefreshEnchanting = function() {
    console.log('Force refreshing enchanting display...');
    updateEnchantingDisplay();
    logMessage('Enchanting display refreshed!', 'fore-green');
};

// DEBUG: Check ring enchanting display state
window.debugRingDisplay = function() {
    console.log('=== Ring Display Debug ===');
    
    const leftRing = playerData.equipment?.left_ring;
    const rightRing = playerData.equipment?.right_ring;
    
    console.log('Equipment state:', {
        left_ring: leftRing,
        right_ring: rightRing
    });
    
    if (leftRing && leftRing !== 'none') {
        const leftKey = `left_ring:${leftRing}`;
        const leftEnchants = playerData.itemEnchantments[leftKey];
        console.log('Left ring enchantments:', leftEnchants);
        console.log('Left ring key:', leftKey);
    }
    
    if (rightRing && rightRing !== 'none') {
        const rightKey = `right_ring:${rightRing}`;
        const rightEnchants = playerData.itemEnchantments[rightKey];
        console.log('Right ring enchantments:', rightEnchants);
        console.log('Right ring key:', rightKey);
    }
    
    // Check if enchanting section is visible
    const enchantingSection = document.getElementById('enchanting-section');
    console.log('Enchanting section display:', enchantingSection?.style.display);
    
    // Check equipment grid
    const equipmentGrid = document.getElementById('enchanting-equipment-grid');
    console.log('Equipment grid children count:', equipmentGrid?.children.length);
    
    logMessage('Ring display debug complete - see console', 'fore-cyan');
};