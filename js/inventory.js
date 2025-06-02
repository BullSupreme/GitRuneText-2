/**
 * inventory.js - Inventory management module for RuneText
 * Handles inventory display, sorting, and related UI
 */

'use strict';

import { playerData, savePlayerData, titleCase, generateItemTooltip, playSound, sounds, formatEnchantmentStat } from './utils.js';
import { showSection, updateHud } from './ui.js';
import { getModifiedPrice } from './shop.js';
import {
    SWORD_DATA,
    ARMOR_DATA,
    HELMET_DATA,
    TOOL_DATA,
    ITEM_SELL_PRICES,
    TIERS,
    ENCHANTMENT_STAT_TIER_COLORS,
    getItemDetails, // Import getItemDetails
    CHEST_LOOT_TABLES
} from './data.js';

// Inventory sorting state
let currentInventorySort = 'default';

/**
 * Calculate the correct sell price for an item (including enchanted item bonus)
 * @param {string} itemName - Name of the item
 * @param {boolean} isEnchanted - Whether the item is enchanted
 * @returns {number} - The correct sell price
 */
function getItemSellPrice(itemName, isEnchanted = false) {
    const basePrice = ITEM_SELL_PRICES[itemName] || 0;
    if (basePrice === 0) return 0;
    
    // Apply price modifiers (from structures/perks)
    let actualSellPrice = getModifiedPrice(basePrice, true);
    
    // Apply 20% markup for enchanted items (same as shop)
    if (isEnchanted) {
        actualSellPrice = Math.floor(actualSellPrice * 1.2);
    }
    
    return actualSellPrice;
}

/**
 * Show the inventory section
 */
export function showInventorySection() {
    showSection('inventory-section');
    
    // Initialize sort controls if not already created
    const sortControlsDiv = document.getElementById('inventory-sort-controls-target');
    if (sortControlsDiv && sortControlsDiv.childElementCount === 0) {
        // Create container with flexbox for proper alignment
        sortControlsDiv.style.display = 'flex';
        sortControlsDiv.style.justifyContent = 'space-between';
        sortControlsDiv.style.alignItems = 'center';
        sortControlsDiv.style.width = '100%';
        
        // Create left div for sort buttons
        const sortButtonsDiv = document.createElement('div');
        sortButtonsDiv.style.display = 'flex';
        sortButtonsDiv.style.gap = '5px';
        sortButtonsDiv.style.flexWrap = 'wrap';
        
        const sortTypes = [
            { type: 'default', label: 'Default' },
            { type: 'name', label: 'Name' },
            { type: 'quantity', label: 'Quantity' },
            { type: 'value_single', label: 'Value/Item' },
            { type: 'value_stack', label: 'Value/Stack' }
        ];
        
        sortTypes.forEach(st => {
            const btn = document.createElement('button');
            btn.id = `sort-inv-${st.type}`;
            btn.className = 'inventory-button';
            if (currentInventorySort === st.type) btn.classList.add('active-sort');
            btn.textContent = st.label;
            btn.addEventListener('click', () => setInventorySort(st.type));
            sortButtonsDiv.appendChild(btn);
        });
        
        // Add sort buttons div to the container
        sortControlsDiv.appendChild(sortButtonsDiv);
    }
    
    // Populate inventory display
    populateInventoryDisplay();
}

/**
 * Set inventory sort method
 * @param {string} sortType - Sort type to apply
 */
export function setInventorySort(sortType) {
    currentInventorySort = sortType;
    localStorage.setItem('textAdventureInventorySort', currentInventorySort);
    
    // Update active button styling
    document.querySelectorAll('#inventory-sort-controls-target button').forEach(btn => 
        btn.classList.remove('active-sort')
    );
    
    const activeButton = document.getElementById(`sort-inv-${sortType}`);
    if (activeButton) activeButton.classList.add('active-sort');
    
    // Re-populate with the new sort
    populateInventoryDisplay();
}

/**
 * Get the sort function for a specific sort type
 * @param {string} sortType - Type of sort to get function for
 * @returns {Function} Sort function
 */
function getSortFunction(sortType) {
    switch (sortType) {
        case 'name':
            return (a, b) => a.displayName.localeCompare(b.displayName);
        case 'quantity':
            return (a, b) => b.quantity - a.quantity;
        case 'value_single':
            return (a, b) => {
                const aValue = ITEM_SELL_PRICES[a.name] || 0;
                const bValue = ITEM_SELL_PRICES[b.name] || 0;
                return bValue - aValue;
            };
        case 'value_stack':
            return (a, b) => {
                const aValue = (ITEM_SELL_PRICES[a.name] || 0) * a.quantity;
                const bValue = (ITEM_SELL_PRICES[b.name] || 0) * b.quantity;
                return bValue - aValue;
            };
        default:
            return (a, b) => 0; // Default order (as they appear in the object)
    }
}

/**
 * Populate inventory display
 */
export function populateInventoryDisplay() {
    const gridDiv = document.getElementById('inventory-grid-target');
    if (!gridDiv) return;
    
    gridDiv.innerHTML = '';
    let hasItems = false;
    let itemsToDisplay = [];

    // Prepare items for display
    for (const itemName in playerData.inventory) {
        const quantity = playerData.inventory[itemName];
        if (typeof quantity === 'number' && quantity > 0) {
            hasItems = true;
            
            const itemDetails = getItemDetails(itemName); // Use getItemDetails

            if (!itemDetails) {
                console.warn(`No details found for inventory item: ${itemName}`);
                itemsToDisplay.push({
                    itemType: 'unknown',
                    name: itemName,
                    displayName: titleCase(itemName),
                    quantity: quantity,
                    emoji: "❓",
                    colorClass: "fore-white",
                    rarityClass: TIERS.COMMON, // Default tier
                    tier: TIERS.COMMON,
                    tooltipDesc: "Unknown item.",
                    tooltipStats: "",
                    value: ITEM_SELL_PRICES[itemName] || 0,
                    enchantments: null,
                    uniqueId: null
                });
                continue; // Skip to next item if details not found
            }
            
            // Check if this item type can be enchanted and if there are enchanted versions
            const enchantableSlots = ['sword', 'armor', 'helmet', 'axe', 'pickaxe'];
            let enchantedVersions = [];
            
            // Look for enchanted versions of this item
            if (itemDetails.itemType && enchantableSlots.includes(itemDetails.itemType)) {
                // Search through itemEnchantments for this item
                if (playerData.itemEnchantments) {
                    for (const [enchantKey, enchantData] of Object.entries(playerData.itemEnchantments)) {
                        const [slotKey, enchantedItemName] = enchantKey.split(':');
                        if (enchantedItemName === itemName && enchantData.enchantments && enchantData.enchantments.length > 0) {
                            enchantedVersions.push({
                                key: enchantKey,
                                enchantments: enchantData.enchantments,
                                count: enchantData.count
                            });
                        }
                    }
                }
            }
            
            // If there are enchanted versions, display each separately
            if (enchantedVersions.length > 0) {
                // Each enchanted version represents one unique enchanted item
                // The unenchanted count is total quantity minus number of unique enchanted items
                const unenchantedCount = quantity - enchantedVersions.length;
                
                if (unenchantedCount > 0) {
                    // Add unenchanted items
                    itemsToDisplay.push({
                        itemType: itemDetails.itemType,
                        name: itemName,
                        displayName: itemDetails.name ? titleCase(itemDetails.name) : titleCase(itemName),
                        quantity: unenchantedCount,
                        emoji: itemDetails.emoji || "📦",
                        colorClass: itemDetails.color || "fore-white",
                        tier: itemDetails.tier || TIERS.COMMON,
                        tooltipDesc: itemDetails.description || "A mysterious item.",
                        tooltipStats: itemDetails.statsDisplay || "",
                        value: getItemSellPrice(itemName, false),
                        enchantments: null,
                        uniqueId: null
                    });
                }
                
                // Add each enchanted version as a single item
                enchantedVersions.forEach(enchantedVersion => {
                    itemsToDisplay.push({
                        itemType: itemDetails.itemType,
                        name: itemName,
                        displayName: `${itemDetails.name ? titleCase(itemDetails.name) : titleCase(itemName)} (Enchanted)`,
                        quantity: 1,
                        emoji: itemDetails.emoji || "📦",
                        colorClass: itemDetails.color || "fore-white",
                        tier: itemDetails.tier || TIERS.COMMON,
                        tooltipDesc: itemDetails.description || "A mysterious item.",
                        tooltipStats: itemDetails.statsDisplay || "",
                        value: getItemSellPrice(itemName, true),
                        enchantments: enchantedVersion.enchantments,
                        uniqueId: enchantedVersion.key,
                        enchantmentCount: enchantedVersion.count
                    });
                });
            } else {
                // No enchanted versions, add as normal
                itemsToDisplay.push({
                    itemType: itemDetails.itemType,
                    name: itemName,
                    displayName: itemDetails.name ? titleCase(itemDetails.name) : titleCase(itemName),
                    quantity: quantity,
                    emoji: itemDetails.emoji || "📦",
                    colorClass: itemDetails.color || "fore-white",
                    tier: itemDetails.tier || TIERS.COMMON,
                    tooltipDesc: itemDetails.description || "A mysterious item.",
                    tooltipStats: itemDetails.statsDisplay || "",
                    value: getItemSellPrice(itemName, false),
                    enchantments: null,
                    uniqueId: null
                });
            }
        }
    }

    // Sort items if needed
    if (currentInventorySort !== 'default') {
        itemsToDisplay.sort(getSortFunction(currentInventorySort));
    }

    // Update inventory stats displays: Unique Items count and total value with coin icon
    const spaceDisplay = document.getElementById('inventory-space-display');
    if (spaceDisplay) spaceDisplay.textContent = `Unique Items: ${itemsToDisplay.length}`;
    const valueDisplay = document.getElementById('inventory-value-display');
    const totalInventoryValue = itemsToDisplay.reduce((sum, item) => sum + (item.value || 0) * item.quantity, 0);
    if (valueDisplay) valueDisplay.innerHTML = `💰 ${totalInventoryValue}g`;

    // Create display elements
    if (hasItems) {
        itemsToDisplay.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item item-card-tier'; // Add base tier class
            if (item.tier) {
                itemDiv.classList.add(item.tier); // Add specific tier class
            }
            
            // Calculate value display
            const valuePerItem = item.value;
            const totalValue = valuePerItem * item.quantity;
            const valueText = valuePerItem > 0 ? 
                `<span class="item-value fore-gold">🪙 ${valuePerItem} each</span>` : '';
            const totalValueText = valuePerItem > 0 ? 
                `<span class="item-total-value fore-gold">(${totalValue} total)</span>` : '';
            
            // Determine icon: use image for axes, pickaxes, swords, armor, helmets; fallback to emoji
            let iconHtml;
            if (['axe','pickaxe','sword','armor','helmet'].includes(item.itemType)) {
                if (item.itemType === 'sword') {
                    const baseName = item.name.toLowerCase().replace(/\s+/g,'-').replace('-2h-sword','-2hsword');
                    iconHtml = `<img src="assets/${baseName}.png" alt="${item.displayName}" class="inventory-item-icon">`;
                } else if (item.itemType === 'pickaxe') {
                    // Extract material name from the item name (e.g., "Bronze Pickaxe" -> "bronze")
                    const materialName = item.name.toLowerCase().replace(/\s+pickaxe$/, '');
                    const fileName = `${materialName}-pickaxe.png`;
                    iconHtml = `<img src="assets/${fileName}" alt="${item.displayName}" class="inventory-item-icon">`;
                } else if (item.itemType === 'axe') {
                    // Extract material name from the item name (e.g., "Bronze Axe" -> "bronze")
                    const materialName = item.name.toLowerCase().replace(/\s+axe$/, '');
                    const fileName = `${materialName}-axe.png`;
                    iconHtml = `<img src="assets/${fileName}" alt="${item.displayName}" class="inventory-item-icon">`;
                } else if (item.itemType === 'armor') {
                    // Extract material name from the item name (e.g., "Bronze Chestplate" -> "bronze")
                    const materialName = item.name.toLowerCase().replace(/\s+chestplate$/, '');
                    // Convert material name to proper case for filename (Bronze-ChestPlate.png)
                    const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
                    iconHtml = `<img src="assets/${fileName}" alt="${item.displayName}" class="inventory-item-icon">`;
                } else if (item.itemType === 'helmet') {
                    // Handle special case for "Full Dragon Helmet"
                    if (item.name.toLowerCase().includes('dragon helmet')) {
                        iconHtml = `<img src="assets/Dragon-Full-Helmet.png" alt="${item.displayName}" class="inventory-item-icon">`;
                    } else {
                        iconHtml = item.emoji; // Fallback for other helmets
                    }
                }
            } else {
                iconHtml = item.emoji;
            }
            
            // Generate tooltip HTML using the helper function
            const tooltipHtml = generateItemTooltip(item);

            // Add enchantment info to stats display
            let enchantmentHtml = '';
            if (item.enchantments && item.enchantments.length > 0) {
                enchantmentHtml = '<div class="item-enchantments">';
                item.enchantments.forEach(enchantment => {
                    // Use wizard tier color for Wizard Tower enchantments, otherwise use normal tier color
                    const isWizardEnchantment = ['life_steal', 'fire_damage', 'ice_damage'].includes(enchantment.stat);
                    const colorClass = isWizardEnchantment ? ENCHANTMENT_STAT_TIER_COLORS.wizard : (ENCHANTMENT_STAT_TIER_COLORS[enchantment.tier] || '');
                    const statDisplay = formatEnchantmentStat(enchantment.stat, enchantment.value);
                    enchantmentHtml += `<div class="${colorClass}">${statDisplay}</div>`;
                });
                // Show enchantment count if item has been enchanted
                if (item.enchantmentCount && item.enchantmentCount >= 1) {
                    enchantmentHtml += `<div class="enchantment-count">Total Enchants: ${item.enchantmentCount}/12</div>`;
                }
                enchantmentHtml += '</div>';
            }
            
            itemDiv.innerHTML = `
                <div class="item-icon item-border ${item.tier}">${iconHtml}</div>
                <div class="item-info">
                    <div class="item-name ${item.colorClass}">${item.displayName}</div>
                    <div class="item-quantity">x${item.quantity}</div>
                    <div class="item-details">
                        ${valueText}
                        ${item.tooltipStats ? `<span class="item-stats">${item.tooltipStats}</span>` : ''}
                        ${enchantmentHtml}
                        ${totalValueText}
                    </div>
                </div>
                <div class="item-tooltip">${tooltipHtml}</div> <!-- Tooltip container -->
                ${item.itemType === 'chest' ? '<div class="chest-click-indicator">!</div>' : ''}
                `;
            
            // Add click handler for chests
            if (item.itemType === 'chest') {
                itemDiv.style.cursor = 'pointer';
                itemDiv.addEventListener('click', () => openChest(item.name));
            }
            
            gridDiv.appendChild(itemDiv);
        });
        
        // Apply smart tooltip positioning after all items are added
        setTimeout(() => applySmartTooltipPositioning(), 0);
    } else {
        // Show empty inventory message
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-inventory-message';
        emptyMessage.textContent = 'Your inventory is empty.';
        gridDiv.appendChild(emptyMessage);
    }
}

/**
 * Sets up event listeners for the inventory section back buttons
 */
export function setupInventoryEvents() {
    // Back buttons (there are two, one in header and one in footer)
    const inventoryBackBtn = document.getElementById('inventory-back-btn');
    if (inventoryBackBtn) {
        inventoryBackBtn.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    const inventoryFooterBackBtn = document.getElementById('inventory-footer-back-btn');
    if (inventoryFooterBackBtn) {
        inventoryFooterBackBtn.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Open a chest and display loot
 * @param {string} chestType - Type of chest to open
 */
export function openChest(chestType) {
    // Check if player has the chest
    if (!playerData.inventory[chestType] || playerData.inventory[chestType] <= 0) {
        console.error(`No ${chestType} to open`);
        return;
    }
    
    // Get loot table for this chest
    const lootTable = CHEST_LOOT_TABLES[chestType];
    if (!lootTable) {
        console.error(`No loot table found for ${chestType}`);
        return;
    }
    
    // Generate loot
    const loot = generateChestLoot(lootTable);
    
    // Remove chest from inventory
    playerData.inventory[chestType]--;
    if (playerData.inventory[chestType] <= 0) {
        delete playerData.inventory[chestType];
    }
    
    // Play appropriate sound effect based on chest tier
    const chestData = getItemDetails(chestType);
    if (chestData && chestData.tier) {
        if (chestData.tier === 'legendary') {
            playSound(sounds.legendary);
        } else if (chestData.tier === 'epic' || chestData.tier === 'rare') {
            playSound(sounds.rareDrop);
        } else {
            // Common or uncommon chests
            playSound(sounds.ding);
        }
    } else {
        // Fallback if no tier data found
        playSound(sounds.ding);
    }
    
    // Show chest opening modal
    showChestOpeningModal(chestType, loot);
    
    // Save game state
    savePlayerData();
}

/**
 * Generate loot from chest loot table
 * @param {Object} lootTable - Loot table configuration
 * @returns {Array} Array of loot items
 */
function generateChestLoot(lootTable) {
    const loot = [];
    
    // Add guaranteed items
    for (let i = 0; i < lootTable.guaranteed; i++) {
        const item = rollLootFromPool(lootTable.loot_pool);
        if (item) loot.push(item);
    }
    
    // Roll for additional items
    const extraRolls = Math.floor(Math.random() * (lootTable.rolls[1] - lootTable.rolls[0] + 1)) + lootTable.rolls[0];
    for (let i = 0; i < extraRolls; i++) {
        const item = rollLootFromPool(lootTable.loot_pool);
        if (item) loot.push(item);
    }
    
    return loot;
}

/**
 * Roll a single item from loot pool
 * @param {Array} lootPool - Array of possible loot items with weights
 * @returns {Object|null} Loot item or null
 */
function rollLootFromPool(lootPool) {
    // Calculate total weight
    const totalWeight = lootPool.reduce((sum, item) => sum + item.weight, 0);
    
    // Roll
    let roll = Math.random() * totalWeight;
    
    // Find which item was rolled
    for (const lootEntry of lootPool) {
        roll -= lootEntry.weight;
        if (roll <= 0) {
            return generateLootItem(lootEntry);
        }
    }
    
    return null;
}

/**
 * Generate actual loot item from loot entry
 * @param {Object} lootEntry - Loot entry from pool
 * @returns {Object} Generated loot item
 */
function generateLootItem(lootEntry) {
    if (lootEntry.type === 'gold') {
        const amount = Math.floor(Math.random() * (lootEntry.amount[1] - lootEntry.amount[0] + 1)) + lootEntry.amount[0];
        return { type: 'gold', amount };
    } else if (lootEntry.type === 'item') {
        const amount = Array.isArray(lootEntry.amount) 
            ? Math.floor(Math.random() * (lootEntry.amount[1] - lootEntry.amount[0] + 1)) + lootEntry.amount[0]
            : lootEntry.amount;
        return { type: 'item', item: lootEntry.item, amount };
    } else if (lootEntry.type === 'choice') {
        // Pick random item from choices
        const choice = lootEntry.items[Math.floor(Math.random() * lootEntry.items.length)];
        const amount = Array.isArray(choice.amount)
            ? Math.floor(Math.random() * (choice.amount[1] - choice.amount[0] + 1)) + choice.amount[0]
            : choice.amount;
        return { type: 'item', item: choice.item, amount };
    }
    
    return null;
}

/**
 * Show chest opening modal with loot
 * @param {string} chestType - Type of chest opened
 * @param {Array} loot - Array of loot items
 */
function showChestOpeningModal(chestType, loot) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('chest-opening-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chest-opening-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content chest-modal">
                <div class="chest-animation-container">
                    <div class="chest-icon"></div>
                    <div class="chest-particles"></div>
                </div>
                <h2 id="chest-title"></h2>
                <div id="chest-loot-list"></div>
                <div class="modal-buttons">
                    <button id="collect-loot-btn" class="success-button">Collect All</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listener for collect button
        document.getElementById('collect-loot-btn').addEventListener('click', () => {
            collectChestLoot(loot);
            modal.style.display = 'none';
        });
        
        // Close modal if clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                collectChestLoot(loot);
                modal.style.display = 'none';
            }
        });
    }
    
    // Get chest data
    const chestData = getItemDetails(chestType);
    const tierClass = chestData.tier || TIERS.COMMON;
    
    // Set modal content
    document.getElementById('chest-title').textContent = `${chestData.name} Opened!`;
    document.getElementById('chest-title').className = tierClass;
    
    // Set chest icon
    const chestIcon = modal.querySelector('.chest-icon');
    chestIcon.textContent = chestData.emoji;
    chestIcon.className = `chest-icon ${tierClass}`;
    
    // Display loot
    const lootList = document.getElementById('chest-loot-list');
    lootList.innerHTML = '';
    
    loot.forEach((lootItem, index) => {
        const lootDiv = document.createElement('div');
        lootDiv.className = 'chest-loot-item fade-in';
        lootDiv.style.animationDelay = `${index * 0.1}s`;
        
        if (lootItem.type === 'gold') {
            lootDiv.innerHTML = `<span class="fore-gold">💰 ${lootItem.amount} Gold</span>`;
        } else if (lootItem.type === 'item') {
            const itemData = getItemDetails(lootItem.item);
            if (itemData) {
                const itemTier = itemData.tier || TIERS.COMMON;
                const emoji = itemData.emoji || '📦';
                lootDiv.innerHTML = `<span class="${itemTier}">${emoji} ${titleCase(lootItem.item)} x${lootItem.amount}</span>`;
            } else {
                // Fallback for items not found in data
                console.warn(`Item not found in data: ${lootItem.item}`);
                lootDiv.innerHTML = `<span class="${TIERS.COMMON}">📦 ${titleCase(lootItem.item)} x${lootItem.amount}</span>`;
            }
        }
        
        lootList.appendChild(lootDiv);
    });
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Collect loot from opened chest
 * @param {Array} loot - Array of loot items to collect
 */
function collectChestLoot(loot) {
    let totalGold = 0;
    const itemsCollected = [];
    
    loot.forEach(lootItem => {
        if (lootItem.type === 'gold') {
            totalGold += lootItem.amount;
            playerData.gold += lootItem.amount;
        } else if (lootItem.type === 'item') {
            playerData.inventory[lootItem.item] = (playerData.inventory[lootItem.item] || 0) + lootItem.amount;
            itemsCollected.push(`${titleCase(lootItem.item)} x${lootItem.amount}`);
        }
    });
    
    // Update displays
    updateHud();
    populateInventoryDisplay();
    
    // Save game
    savePlayerData();
    
    // Log collection message
    if (totalGold > 0) {
        console.log(`Collected ${totalGold} gold from chest!`);
    }
    if (itemsCollected.length > 0) {
        console.log(`Collected items: ${itemsCollected.join(', ')}`);
    }
}

/**
 * Apply smart tooltip positioning based on item location in grid
 */
function applySmartTooltipPositioning() {
    const containers = [
        { selector: '#inventory-display-grid .inventory-item', containerSelector: '#inventory-display-grid' },
        { selector: '.shop-item', containerSelector: '.shop-items-grid' }
    ];
    
    containers.forEach(({ selector, containerSelector }) => {
        const items = document.querySelectorAll(selector);
        const container = document.querySelector(containerSelector);
        
        if (!container || items.length === 0) return;
        
        const containerRect = container.getBoundingClientRect();
        const containerStyles = window.getComputedStyle(container);
        const gridCols = parseInt(containerStyles.gridTemplateColumns?.split(' ').length) || 5;
        
        items.forEach((item, index) => {
            // Clear existing tooltip classes
            item.classList.remove('tooltip-below', 'tooltip-right', 'tooltip-left', 'tooltip-below-right', 'tooltip-below-left');
            
            const itemRect = item.getBoundingClientRect();
            const row = Math.floor(index / gridCols);
            const col = index % gridCols;
            
            // Check if item is in viewport bounds
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Determine vertical positioning
            const isTopRow = row === 0;
            const spaceAbove = itemRect.top - containerRect.top;
            const spaceBelow = containerRect.bottom - itemRect.bottom;
            const tooltipHeight = 150; // Approximate tooltip height
            
            // Determine horizontal positioning
            const isLeftEdge = col === 0;
            const isRightEdge = col === gridCols - 1;
            const spaceLeft = itemRect.left;
            const spaceRight = viewportWidth - itemRect.right;
            const tooltipWidth = 200; // Tooltip width from CSS
            
            // Apply positioning logic
            if (isTopRow || spaceAbove < tooltipHeight) {
                // Not enough space above, position below
                if (isLeftEdge && spaceLeft < tooltipWidth / 2) {
                    item.classList.add('tooltip-below-right');
                } else if (isRightEdge && spaceRight < tooltipWidth / 2) {
                    item.classList.add('tooltip-below-left');
                } else {
                    item.classList.add('tooltip-below');
                }
            } else {
                // Enough space above, use side positioning for edges
                if (isLeftEdge && spaceLeft < tooltipWidth / 2) {
                    item.classList.add('tooltip-right');
                } else if (isRightEdge && spaceRight < tooltipWidth / 2) {
                    item.classList.add('tooltip-left');
                }
                // Default positioning (above, centered) - no class needed
            }
        });
    });
}

/**
 * Export the function for use by shop module
 */
export { applySmartTooltipPositioning };

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    // Load saved sort preference
    const savedSort = localStorage.getItem('textAdventureInventorySort');
    if (savedSort) {
        currentInventorySort = savedSort;
    }
    
    // Make populateInventoryDisplay accessible to other modules
    window.populateInventoryDisplay = populateInventoryDisplay;
    
    // Reposition tooltips when window is resized
    window.addEventListener('resize', () => {
        setTimeout(() => applySmartTooltipPositioning(), 100);
    });
    
    console.log("Inventory module initialized");
}); 
