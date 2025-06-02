/**
 * shop.js - Handles shop functionality
 * Manages buying and selling items in the game shop
 */

'use strict';

// Import necessary data and functions
import { ITEM_DATA, EQUIPMENT_DATA, STRUCTURE_DATA, TIERS, getItemDetails, TOOL_DATA, SWORD_DATA, ARMOR_DATA, HELMET_DATA, PERMIT_MASTER_LIST, PERK_DATA, FOOD_DATA, ENCHANTMENT_STAT_TIER_COLORS } from './data.js';
import { playerData, savePlayerData, logMessage, addItemToInventory, removeItemFromInventory, titleCase, generateItemTooltip, playSound, sounds } from './utils.js';
import { applySmartTooltipPositioning } from './inventory.js';
import { updateHud, showSection } from './ui.js';
import { isPerkActive } from './perks.js';
import { trackEquipmentCollection } from './achievements.js';

/**
 * Shows the shop section
 */
export function showShopSection() {
    console.log('Showing shop section');
    // Show the shop section
    showSection('shop-section');
    
    // Render the shop
    renderShop();
}

/**
 * Renders the shop UI
 */
function renderShop() {
    const shopSection = document.getElementById('shop-section');
    if (!shopSection) return;
    
    // If shop content hasn't been built yet, build it
    if (shopSection.children.length === 0) {
        // Create shop header
        const shopHeader = document.createElement('div');
        shopHeader.className = 'section-title-header';
        shopHeader.innerHTML = `
            <button id="shop-back-button" class="btn-back-header">⬅️</button>
            <div class="section-title-text" style="color:#ffd700;">Shop</div>
        `;
        shopSection.appendChild(shopHeader);
        
        // Add event listener to back button
        const shopBackButton = shopHeader.querySelector('#shop-back-button');
        if (shopBackButton) {
            shopBackButton.addEventListener('click', () => {
                showSection('main-menu-section');
            });
        }
        
        // Create tabs for different shop categories
        const shopTabs = document.createElement('div');
        shopTabs.className = 'tabs';
        shopTabs.innerHTML = `
            <div class="tab active" data-tab="buy">Buy Items</div>
            <div class="tab" data-tab="sell">Sell Items</div>
        `;
        shopSection.appendChild(shopTabs);
        
        // Create tab content containers
        const shopTabContents = document.createElement('div');
        shopTabContents.className = 'tab-contents';
        
        // Buy tab content
        const buyTabContent = document.createElement('div');
        buyTabContent.className = 'tab-content active';
        buyTabContent.id = 'shop-buy-tab';
        buyTabContent.innerHTML = `
            <div class="shop-categories">
                <button class="shop-category-button active" data-category="axes">Axes</button>
                <button class="shop-category-button" data-category="pickaxes">Pickaxes</button>
                <button class="shop-category-button" data-category="armor">Armor</button>
                <button class="shop-category-button" data-category="permits">Permits</button>
                <button class="shop-category-button" data-category="consumables">Consumables</button>
                <button class="shop-category-button" data-category="misc">Misc</button>
            </div>
            <div id="shop-items-container" class="shop-grid"></div>
        `;
        shopTabContents.appendChild(buyTabContent);
        
        // Sell tab content
        const sellTabContent = document.createElement('div');
        sellTabContent.className = 'tab-content';
        sellTabContent.id = 'shop-sell-tab';
        sellTabContent.innerHTML = `
            <div id="sell-items-container" class="sell-items">
                <p class="no-items-message">You have no items to sell.</p>
            </div>
        `;
        shopTabContents.appendChild(sellTabContent);
        
        shopSection.appendChild(shopTabContents);
        
        // Add event listeners for tabs
        const tabs = shopTabs.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabContents = shopTabContents.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                const tabId = tab.dataset.tab;
                const activeContent = document.getElementById(`shop-${tabId}-tab`);
                if (activeContent) {
                    activeContent.classList.add('active');
                    
                    // If switching to sell tab, render sell items
                    if (tabId === 'sell') {
                        renderSellItems();
                    } else {
                        // If switching to buy tab, render buy items for the active category
                        const activeCategory = buyTabContent.querySelector('.shop-category-button.active');
                        if (activeCategory) {
                            renderShopItems(activeCategory.dataset.category);
                        } else {
                            renderShopItems('axes'); // Default to axes category
                        }
                    }
                }
            });
        });
        
        // Add event listeners for shop categories
        const categoryButtons = buyTabContent.querySelectorAll('.shop-category-button');
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                categoryButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                renderShopItems(button.dataset.category);
            });
        });
    }
    
    // Initial render of shop items in the active category
    const activeCategory = shopSection.querySelector('.shop-category-button.active');
    if (activeCategory) {
        renderShopItems(activeCategory.dataset.category);
    } else {
        renderShopItems('axes'); // Default to axes category
    }
}

/**
 * Renders the list of items available for purchase in the shop.
 * @param {string} category - The category of items to display (e.g., 'all', 'axes', 'armor').
 */
function renderShopItems(category) {
    const shopItemsContainer = document.getElementById('shop-items-container');
    if (!shopItemsContainer) return;
    
    // Normalize category to singular forms for consistent filtering
    let cat = category;
    if (cat === 'axes') cat = 'axe';
    else if (cat === 'pickaxes') cat = 'pickaxe';
    else if (cat === 'weapons') cat = 'sword';
    else if (cat === 'misc') cat = 'other';
    else if (cat === 'permits') cat = 'permit';

    // Added: check for god mode cheat and chestplate unlock for armor
    const godMode = !!playerData.godModeActive;
    if (cat === 'armor' && !godMode) {
        const armorCollection = playerData.collection && playerData.collection.armorFound;
        const hasFoundAnyArmor = armorCollection && Object.keys(armorCollection).length > 0;
        if (!hasFoundAnyArmor) {
            shopItemsContainer.innerHTML = '<p class="no-items-message">Find a chestplate first to unlock armor</p>';
            return;
        }
    }

    // Clear previous items
    shopItemsContainer.innerHTML = '';
    
    // Determine which items to display based on category
    let itemsToDisplay = [];

    // Helper to add items from a data source if they exist and match category
    const addItemsFromSource = (source, itemType) => {
        for (const itemId in source) {
            // Skip fists tool in shop
            if (source === TOOL_DATA.axe && itemId === 'fists') continue;
            const item = source[itemId];
            
            // For tools, we need to manually construct the proper item details
            // because getItemDetails can't distinguish between "bronze" axe vs "bronze" pickaxe
            let itemDetails;
            if (itemType === 'axe' || itemType === 'pickaxe') {
                const displayName = itemId + ' ' + itemType;
                itemDetails = { ...item, name: displayName, itemType: itemType, id: itemId };
            } else {
                itemDetails = getItemDetails(itemId);
            }
            
            // Modified filter condition to allow noShop items in god mode
            if (itemDetails && (!itemDetails.noShop || godMode) && (cat === 'all' || itemType === cat)) {
                itemsToDisplay.push(itemDetails);
            }
        }
    };

    if (cat === 'all' || cat === 'axe') addItemsFromSource(TOOL_DATA.axe, 'axe');
    if (cat === 'all' || cat === 'pickaxe') addItemsFromSource(TOOL_DATA.pickaxe, 'pickaxe');
    if (cat === 'all' || cat === 'sword') addItemsFromSource(SWORD_DATA, 'sword');
    if (cat === 'all' || cat === 'food') addItemsFromSource(FOOD_DATA, 'food');
    if (cat === 'all' || cat === 'armor') addItemsFromSource(ARMOR_DATA, 'armor');
    if (cat === 'all' || cat === 'helmet') addItemsFromSource(HELMET_DATA, 'helmet');

    // Add generic items (ores, bars, etc.) from ITEM_DATA
    if (cat === 'all' || cat === 'other') {
        for (const itemId in ITEM_DATA) {
            const itemDetails = getItemDetails(itemId); // Use getItemDetails
            if (itemDetails && !itemDetails.noShop && itemDetails.itemType !== 'permit' && itemDetails.itemType !== 'seed' && 
                itemDetails.itemType !== 'crop' && itemDetails.itemType !== 'animal' && itemDetails.itemType !== 'animal_product' && 
                itemDetails.itemType !== 'farm_resource' && itemDetails.itemType !== 'crafting_material' && itemDetails.itemType !== 'currency') { // Exclude specific item types that shouldn't be in 'other' or handled separately
                if (cat === 'all' || cat === 'other') { // Double-check category for 'other'
                    itemsToDisplay.push(itemDetails);
                }
            }
        }
    }
    // Add Permits
    if (cat === 'all' || cat === 'permit') {
        for (const permitId in PERMIT_MASTER_LIST) {
            const permitDetails = getItemDetails(permitId);
            if (permitDetails && !permitDetails.noShop) {
                // Only show permits the player doesn't already have
                if (!playerData.permits || !playerData.permits[permitId]) {
                    itemsToDisplay.push(permitDetails);
                }
            }
        }
    }
    // Add Perks (if they are sellable/buyable - though usually they are unlocked via XP)
    if (cat === 'all' || cat === 'perk') {
        for (const perkId in PERK_DATA) {
            const perkDetails = getItemDetails(perkId);
            // Assuming perks that can be bought have a price and aren't marked noShop
            if (perkDetails && !perkDetails.noShop && perkDetails.price !== undefined) {
                // Check if perk is not yet unlocked by the player
                if (!playerData.perks || !playerData.perks[perkId] || !playerData.perks[perkId].unlocked) {
                    itemsToDisplay.push(perkDetails);
                }
            }
        }
    }

    // In the renderShopItems function, add this after the other category checks:
    if (cat === 'all' || cat === 'consumables') {
        for (const itemId in ITEM_DATA) {
            const item = ITEM_DATA[itemId];
            if (item && !item.noShop && (item.category === 'potion' || item.category === 'elixir' || item.category === 'brew')) {
                const itemDetails = getItemDetails(itemId);
                if (itemDetails) {
                    itemsToDisplay.push(itemDetails);
                }
            }
        }
    }

    // Sort items (optional - could add sort controls later)
    // itemsToDisplay.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Add items to the container
    itemsToDisplay.forEach(item => {
        // Skip items that shouldn't be in the shop (double-check in case getItemDetails missed it)
        if (item.noShop) return;
        
        // Adjust base price by material tier multipliers
        let basePrice = item.price !== undefined ? item.price
                       : item.sell_price !== undefined ? item.sell_price
                       : 100;
        const nameLower = (item.name || item.id || '').toLowerCase();
        if (nameLower.includes('iron') || nameLower.includes('steel')) {
            basePrice *= 3;
        } else if (nameLower.includes('mithril') || nameLower.includes('adamant') || nameLower.includes('rune')) {
            basePrice *= 10;
        } else if (nameLower.includes('dragon')) {
            basePrice *= 8;
        }
        // Calculate price with modifiers
        let actualPrice = getModifiedPrice(basePrice, false); // Use helper function

         // Determine icon: specific images for tools and equipment, then fallback to icon or emoji
        let iconHtml;
        if (item.itemType === 'axe') {
            // Extract material name from the item name (e.g., "Bronze Axe" -> "bronze")
            const materialName = item.name.toLowerCase().replace(/\s+axe$/, '');
            const fileName = `${materialName}-axe.png`;
            iconHtml = `<img src="assets/${fileName}" alt="${item.name}" class="shop-item-icon">`;
        } else if (item.itemType === 'pickaxe') {
            // Extract material name from the item name (e.g., "Bronze Pickaxe" -> "bronze")
            const materialName = item.name.toLowerCase().replace(/\s+pickaxe$/, '');
            const fileName = `${materialName}-pickaxe.png`;
            iconHtml = `<img src="assets/${fileName}" alt="${item.name}" class="shop-item-icon">`;
        } else if (item.itemType === 'sword') {
            const baseName = item.name.toLowerCase().replace(/\s+/g,'-').replace('-2h-sword','-2hsword');
            const fileName = `${baseName}.png`;
            iconHtml = baseName
                ? `<img src="assets/${fileName}" alt="${item.name}" class="shop-item-icon">`
                : (item.emoji || '❓');
        } else if (item.itemType === 'armor') {
            // Extract material name and convert to proper case for filename
            const materialName = item.name.toLowerCase().replace(/\s+chestplate$/, '');
            const fileName = `${materialName.charAt(0).toUpperCase() + materialName.slice(1)}-ChestPlate.png`;
            iconHtml = `<img src="assets/${fileName}" alt="${item.name}" class="shop-item-icon">`;
        } else if (item.itemType === 'helmet') {
            // Handle special case for "Full Dragon Helmet"
            if (item.name.toLowerCase().includes('dragon helmet')) {
                iconHtml = `<img src="assets/Dragon-Full-Helmet.png" alt="${item.name}" class="shop-item-icon">`;
            } else {
                iconHtml = item.emoji || '❓'; // Fallback for other helmets
            }
        } else if (item.icon) {
            if (item.icon.match(/\.(png|jpe?g|gif|svg)$/i)) {
                iconHtml = `<img src="assets/${item.icon}" alt="${item.name || titleCase(item.id)}" class="shop-item-icon">`;
            } else {
                iconHtml = `<span class="shop-item-emoji">${item.icon}</span>`;
            }
        } else if (item.emoji) {
            iconHtml = `<span class="shop-item-emoji">${item.emoji}</span>`;
        } else {
            iconHtml = '❓';
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item item-card-tier';
        if (item.tier) {
            itemDiv.classList.add(item.tier);
        }
         itemDiv.dataset.itemId = item.id; // Add data-item-id to the card itself

        // Generate tooltip HTML
        const tooltipHtml = generateItemTooltip(item);

        // Add effect display for consumables
        let effectDisplay = '';
        if (Array.isArray(item.effects)) {
            effectDisplay = '<div class="item-effect"><span class="effect-label">Effects:</span><ul style="margin:4px 0 0 16px;">';
            for (const eff of item.effects) {
                const duration = Math.floor(eff.duration / 60);
                effectDisplay += `<li><span class="effect-value">${eff.value * 100}% ${eff.type.replace('_', ' ')}</span> <span class="effect-duration">(${duration} min)</span></li>`;
            }
            effectDisplay += '</ul></div>';
        } else if (item.effect) {
            const duration = Math.floor(item.effect.duration / 60); // Convert seconds to minutes
            effectDisplay = `
                <div class="item-effect">
                    <span class="effect-label">Effect:</span>
                    <span class="effect-value">${item.effect.value * 100}% ${item.effect.type.replace('_', ' ')}</span>
                    <span class="effect-duration">(${duration} min)</span>
                </div>
            `;
        } else if (item.heal_amount) {
            effectDisplay = `
                <div class="item-effect">
                    <span class="effect-label">Effect:</span>
                    <span class="effect-value">Heals ${item.heal_amount} HP</span>
                </div>
            `;
        }

        itemDiv.innerHTML = `
            <div class="item-icon-wrapper">
                 <div class="item-icon item-border ${item.tier}">${iconHtml}</div>
            </div>
            <div class="item-info">
                <div class="item-name ${item.color || ''}">${item.name || titleCase(item.id)}</div>
                <div class="item-description">${item.description || ''}</div>
                ${effectDisplay}
                ${item.statsDisplay ? `<div class="item-details"><span class="item-stats">${item.statsDisplay}</span></div>` : ''}
            </div>
            <div class="item-buy-section">
                <div class="item-price">🪙 ${actualPrice}g</div>
                <button class="buy-button" data-item-id="${item.id}" data-price="${actualPrice}">Buy</button>
            </div>
            <div class="item-tooltip">${tooltipHtml}</div>
        `;

        // Add buy button event listener
        const buyButton = itemDiv.querySelector('.buy-button');
        if (buyButton) {
            buyButton.addEventListener('click', () => {
                buyItem(item.id, category, actualPrice);
            });
        }
        
        shopItemsContainer.appendChild(itemDiv);
    });
    
    // Apply smart tooltip positioning after all items are added
    setTimeout(() => applySmartTooltipPositioning(), 0);
}

/**
 * Renders the sell items list in the shop
 */
function renderSellItems() {
    const sellItemsContainer = document.getElementById('sell-items-container');
    if (!sellItemsContainer) return;

    // Clear existing items
    sellItemsContainer.innerHTML = '';
    
    let hasSellableItems = false;

    // Track enchanted items to adjust regular item counts
    const enchantedItemCounts = {};
    if (playerData.itemEnchantments) {
        for (const [enchantKey, enchantData] of Object.entries(playerData.itemEnchantments)) {
            if (enchantData.enchantments && enchantData.enchantments.length > 0) {
                const [slotKey, itemId] = enchantKey.split(':');
                enchantedItemCounts[itemId] = (enchantedItemCounts[itemId] || 0) + 1;
            }
        }
    }

    // First, handle regular items
    for (const itemId in playerData.inventory) {
        const quantity = playerData.inventory[itemId];
        const itemDetails = getItemDetails(itemId); // Get item details

        // Check if item exists and has a sell price
        // Also ensure quantity is greater than 0
        if (itemDetails && quantity > 0 &&
            (ITEM_DATA[itemId]?.sell_price !== undefined ||
             FOOD_DATA[itemId]?.sell_price !== undefined ||
             TOOL_DATA.axe[itemId]?.sell_price !== undefined ||
             TOOL_DATA.pickaxe[itemId]?.sell_price !== undefined ||
             SWORD_DATA[itemId]?.sell_price !== undefined ||
             ARMOR_DATA[itemId]?.sell_price !== undefined ||
             HELMET_DATA[itemId]?.sell_price !== undefined ||
             PERMIT_MASTER_LIST[itemId]?.sell_price !== undefined ||
             PERK_DATA[itemId]?.sell_price !== undefined)) {

            hasSellableItems = true;
            
            // Get the actual sell price (apply modifiers if any)
            const baseSellPrice = itemDetails.sell_price !== undefined ? itemDetails.sell_price : 
                                  (ITEM_DATA[itemId]?.sell_price || 
                                   FOOD_DATA[itemId]?.sell_price ||
                                   TOOL_DATA.axe[itemId]?.sell_price ||
                                   TOOL_DATA.pickaxe[itemId]?.sell_price ||
                                   SWORD_DATA[itemId]?.sell_price ||
                                   ARMOR_DATA[itemId]?.sell_price ||
                                   HELMET_DATA[itemId]?.sell_price ||
                                   PERMIT_MASTER_LIST[itemId]?.sell_price ||
                                   PERK_DATA[itemId]?.sell_price || 0); // Default to 0 if no price found
            
            let actualSellPrice = getModifiedPrice(baseSellPrice, true); // Use the helper function

            const itemDiv = document.createElement('div');
            itemDiv.className = 'sell-item item-card-tier'; // Add base tier class
            if (itemDetails.tier) {
                itemDiv.classList.add(itemDetails.tier); // Add specific tier class
            }

             // Determine icon: use image for tools/weapons; fallback to emoji
        let iconHtml;
            // Prefer itemDetails.icon if available, otherwise use itemType logic
            if (itemDetails.icon) {
                iconHtml = `<img src="assets/${itemDetails.icon}" alt="${itemDetails.name}" class="sell-item-icon">`;
            } else if (itemDetails.itemType === 'axe') {
                // Use the item ID directly as it's the material name (e.g., "bronze")
                const fileName = `${itemDetails.id.toLowerCase()}-axe.png`;
                iconHtml = `<img src="assets/${fileName}" alt="${itemDetails.name}" class="sell-item-icon">`;
            } else if (itemDetails.itemType === 'pickaxe') {
                 // Use the item ID directly as it's the material name (e.g., "bronze")
                 const fileName = `${itemDetails.id.toLowerCase()}-pickaxe.png`;
                 iconHtml = `<img src="assets/${fileName}" alt="${itemDetails.name}" class="sell-item-icon">`;
             } else if (itemDetails.itemType === 'sword') {
                 const baseName = itemDetails.name?.toLowerCase()?.replace(/\s+/g,'-').replace('-2h-sword','-2hsword') || '';
                 const fileName = `${baseName}.png`;
                  iconHtml = baseName ? `<img src="assets/${fileName}" alt="${itemDetails.name}" class="sell-item-icon">` : (itemDetails.emoji || '❓');
             } else if (itemDetails.itemType === 'armor' || itemDetails.itemType === 'helmet') {
                 const baseName = itemDetails.name?.toLowerCase()?.replace(/\s+/g,'-') || '';
                 // Special case for Full Dragon Helmet filename
                 const fileName = itemDetails.name === 'full dragon helmet' ? 'dragon-full-helmet.png' : `${baseName}.png`;
                 iconHtml = baseName ? `<img src="assets/${fileName}" alt="${itemDetails.name}" class="sell-item-icon">` : (itemDetails.emoji || '❓');
            } else {
              // For other items, use emoji or a generic icon if available in itemDetails.icon
                 iconHtml = itemDetails.emoji || itemDetails.icon || '❓'; 
             }

            // Calculate actual sellable quantity (total minus enchanted)
            const enchantedCount = enchantedItemCounts[itemId] || 0;
            const sellableQuantity = quantity - enchantedCount;
            
            // Only show if there are unenchanted items to sell
            if (sellableQuantity > 0) {
                itemDiv.innerHTML = `
                    <div class="item-icon item-border ${itemDetails.tier}">${iconHtml}</div>
                <div class="item-info">
                        <div class="item-name ${itemDetails.color || ''}">${itemDetails.name || titleCase(itemId)}</div>
                    <div class="item-quantity">x${sellableQuantity}</div>
                        <div class="item-price">🪙 ${actualSellPrice}g each</div>
                        ${itemDetails.statsDisplay ? `<div class="item-details"><span class="item-stats">${itemDetails.statsDisplay}</span></div>` : ''}
                    </div>
                    <button class="sell-button" data-item-id="${itemId}" data-price="${actualSellPrice}">Sell 1</button>
                    <button class="sell-all-button" data-item-id="${itemId}" data-price="${actualSellPrice}">Sell All</button>
                `;

                // Add sell button event listeners
                const sellOneButton = itemDiv.querySelector('.sell-button');
                if (sellOneButton) {
                    sellOneButton.addEventListener('click', () => {
                        sellItem(itemId, actualSellPrice, 1);
                    });
                }
                
                const sellAllButton = itemDiv.querySelector('.sell-all-button');
                if (sellAllButton) {
                    sellAllButton.addEventListener('click', () => {
                        // Sell only the unenchanted items
                        if (sellableQuantity > 0) {
                             sellItem(itemId, actualSellPrice, sellableQuantity);
                        }
                    });
                }

                sellItemsContainer.appendChild(itemDiv);
            }
        }
    }

    // Now handle enchanted items
    if (playerData.itemEnchantments) {
        const enchantableSlots = ['weapon', 'armor', 'helmet'];
        
        for (const [enchantKey, enchantData] of Object.entries(playerData.itemEnchantments)) {
            if (!enchantData.enchantments || enchantData.enchantments.length === 0) continue;
            
            const [slotKey, itemId] = enchantKey.split(':');
            
            // Check if player has this item in inventory and it's enchantable
            if (playerData.inventory[itemId] && playerData.inventory[itemId] > 0 && 
                enchantableSlots.includes(slotKey)) {
                
                const itemDetails = getItemDetails(itemId);
                if (!itemDetails) continue;
                
                // Check if item has a sell price
                const baseSellPrice = itemDetails.sell_price !== undefined ? itemDetails.sell_price : 
                                      (ITEM_DATA[itemId]?.sell_price || 
                                       FOOD_DATA[itemId]?.sell_price ||
                                       SWORD_DATA[itemId]?.sell_price ||
                                       ARMOR_DATA[itemId]?.sell_price ||
                                       HELMET_DATA[itemId]?.sell_price || 0);
                
                if (baseSellPrice > 0) {
                    hasSellableItems = true;
                    
                    // Apply price modifiers and add 20% for enchanted items
                    let actualSellPrice = getModifiedPrice(baseSellPrice, true);
                    actualSellPrice = Math.floor(actualSellPrice * 1.2); // 20% more for enchanted
                    
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'sell-item item-card-tier';
                    if (itemDetails.tier) {
                        itemDiv.classList.add(itemDetails.tier);
                    }
                    
                    // Determine icon
                    let iconHtml;
                    if (itemDetails.itemType === 'sword' || itemDetails.itemType === 'weapon') {
                        const baseName = itemId.toLowerCase().replace(/\s+/g,'-').replace('-2h-sword','-2hsword');
                        const fileName = `${baseName}.png`;
                        iconHtml = `<img src="assets/${fileName}" alt="${itemDetails.name}" class="sell-item-icon">`;
                    } else if (itemDetails.itemType === 'armor' || itemDetails.itemType === 'helmet') {
                        const baseName = itemId.toLowerCase().replace(/\s+/g,'-');
                        const fileName = itemId === 'full dragon helmet' ? 'dragon-full-helmet.png' : `${baseName}.png`;
                        iconHtml = `<img src="assets/${fileName}" alt="${itemDetails.name}" class="sell-item-icon">`;
                    } else {
                        iconHtml = itemDetails.emoji || '❓';
                    }
                    
                    // Build enchantment display
                    let enchantmentDisplay = '<div class="item-enchants" style="font-size: 0.85em; margin-top: 4px;">';
                    enchantData.enchantments.forEach(ench => {
                        const statName = ench.stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const color = ENCHANTMENT_STAT_TIER_COLORS[ench.tier] || '#ffffff';
                        // Format as percentage for percentage stats, otherwise show raw value
                        const formattedValue = ench.stat.includes('percent') || ench.stat.includes('chance') || ench.stat.includes('speed')
                            ? `${(ench.value * 100).toFixed(2)}%`
                            : ench.value;
                        enchantmentDisplay += `<div style="color: ${color};">+${formattedValue} ${statName}</div>`;
                    });
                    enchantmentDisplay += '</div>';
                    
                    itemDiv.innerHTML = `
                        <div class="item-icon item-border ${itemDetails.tier}">${iconHtml}</div>
                        <div class="item-info">
                            <div class="item-name ${itemDetails.color || ''}">${itemDetails.name || titleCase(itemId)} <span class="fore-purple">(Enchanted)</span></div>
                            <div class="item-quantity">x1</div>
                            <div class="item-price">🪙 ${actualSellPrice}g</div>
                            ${enchantmentDisplay}
                        </div>
                        <button class="sell-enchanted-button" data-enchant-key="${enchantKey}" data-item-id="${itemId}" data-price="${actualSellPrice}">Sell</button>
                    `;
                    
                    // Add sell button event listener
                    const sellButton = itemDiv.querySelector('.sell-enchanted-button');
                    if (sellButton) {
                        sellButton.addEventListener('click', () => {
                            sellEnchantedItem(enchantKey, itemId, actualSellPrice);
                        });
                    }
                    
                    sellItemsContainer.appendChild(itemDiv);
                }
            }
        }
    }

    if (!hasSellableItems) {
        sellItemsContainer.innerHTML = '<p class="no-items-message">You have no items to sell.</p>';
    }
    
    // Apply smart tooltip positioning after all items are added
    setTimeout(() => applySmartTooltipPositioning(), 0);
}

/**
 * Buys an item from the shop
 * @param {string} itemId - The ID of the item to buy
 * @param {string} category - The category the item belongs to
 * @param {number} price - The price of the item
 */
function buyItem(itemId, category, price) {
    // Check if player has enough gold
    if (playerData.gold < price) {
        logMessage(`Not enough gold! Need ${price}, have ${playerData.gold}.`, "fore-danger");
        return;
    }
    
    // Get item data using getItemDetails
    const itemData = getItemDetails(itemId);
    
    if (!itemData) {
        logMessage(`Error: Item ${itemId} not found!`, "fore-danger");
        return;
    }
    
    // Deduct gold
    playerData.gold -= price;
    
    if (itemData.itemType === 'permit') {
        if (!playerData.permits) {
            playerData.permits = {};
        }
        // Extract permit type from itemId (e.g., "woodcutter permit" -> "woodcutter")
        const permitType = itemId.replace(' permit', '');
        if (!playerData.permits[permitType]) {
            playerData.permits[permitType] = true;
            logMessage(`Unlocked Permit: ${itemData.name}!`, "fore-success", "📜");
        } else {
            // If permit already unlocked, perhaps refund or just log it. For now, still "buy" it.
            logMessage(`Bought ${itemData.name} (already unlocked) for ${price} gold.`, "fore-gold");
        }
    } else {
        // Add item to inventory
        addItemToInventory(itemId);
        logMessage(`Bought ${itemData.name} for ${price} gold.`, "fore-gold");
        
        // Track equipment collection for achievements
        if (itemData.itemType === 'weapon') {
            trackEquipmentCollection(itemId, 'weapon');
        } else if (itemData.itemType === 'armor') {
            trackEquipmentCollection(itemId, 'armor');
        } else if (itemData.itemType === 'helmet') {
            trackEquipmentCollection(itemId, 'helmet');
        } else if (itemData.itemType === 'tool') {
            trackEquipmentCollection(itemId, 'tool');
        }
    }
    
    // Play buy sound effect
    playSound(sounds.buy);
    
    // Save the game
    savePlayerData();
    
    // Update UI
    updateHud();
    
    // Refresh shop display if permit was purchased to remove it from list
    if (itemData.itemType === 'permit') {
        renderShopItems(category);
    }
}

/**
 * Sells an enchanted item
 * @param {string} enchantKey - The enchantment key (e.g., "weapon:bronze 2h sword")
 * @param {string} itemId - The ID of the item to sell
 * @param {number} price - The price of the enchanted item
 */
function sellEnchantedItem(enchantKey, itemId, price) {
    // Check if player has the item
    if (!playerData.inventory[itemId] || playerData.inventory[itemId] < 1) {
        logMessage(`You don't have this enchanted item to sell!`, "fore-danger");
        return;
    }
    
    // Check if enchantment data exists
    if (!playerData.itemEnchantments || !playerData.itemEnchantments[enchantKey]) {
        logMessage(`Enchantment data not found for this item!`, "fore-danger");
        return;
    }
    
    // Get item data
    const itemData = getItemDetails(itemId);
    if (!itemData) {
        logMessage(`Error: Item ${itemId} not found for selling.`, "fore-danger");
        return;
    }
    
    // Remove one item from inventory
    removeItemFromInventory(itemId, 1);
    
    // Remove the enchantment data
    delete playerData.itemEnchantments[enchantKey];
    
    // Add gold
    playerData.gold += price;
    
    // Log the sale
    logMessage(`Sold Enchanted ${itemData.name} for ${price} gold.`, "fore-purple", "✨");
    
    // Play sell sound effect
    playSound(sounds.sell);
    
    // Save the game
    savePlayerData();
    
    // Update UI
    updateHud();
    renderSellItems(); // Refresh the sell items display
}

/**
 * Sells items from the player's inventory
 * @param {string} itemId - The ID of the item to sell
 * @param {number} price - The price per item
 * @param {number} quantity - The quantity to sell
 */
function sellItem(itemId, price, quantity) {
    // Check if player has the item
    if (!playerData.inventory[itemId] || playerData.inventory[itemId] < quantity) {
        logMessage(`You don't have ${quantity} of this item to sell!`, "fore-danger");
        return;
    }
    
    // Get item data for selling via helper
    const itemData = getItemDetails(itemId);
    if (!itemData) {
        logMessage(`Error: Item ${itemId} not found for selling.`, "fore-danger");
        return;
    }
    
    // Calculate total price
    const totalPrice = price * quantity;
    
    // Remove items from inventory
    removeItemFromInventory(itemId, quantity);
    
    // Add gold
    playerData.gold += totalPrice;
    
    // Log the sale
    logMessage(`Sold ${quantity}x ${itemData.name} for ${totalPrice} gold.`, "fore-gold");
    
    // Play sell sound effect
    playSound(sounds.sell);
    
    // Save the game
    savePlayerData();
    
    // Update UI
    updateHud();
    renderSellItems(); // Refresh the sell items display
}

/**
 * Gets the modified price for buying or selling
 * @param {number} basePrice - The original price
 * @param {boolean} isSelling - Whether this is a sell price
 * @returns {number} The modified price
 */
export function getModifiedPrice(basePrice, isSelling = false) {
    let modifiedPrice = basePrice;
    
    // Apply structure modifiers
    if (playerData.built_structures?.castle && 
        STRUCTURE_DATA.castle.perk_effect?.type === "shop_price_modifier") {
        const modifier = isSelling 
            ? STRUCTURE_DATA.castle.perk_effect.sell_mod 
            : STRUCTURE_DATA.castle.perk_effect.buy_mod;
        modifiedPrice = Math.max(1, Math.floor(modifiedPrice * (1 + modifier)));
    }
    
    // Apply perk modifiers
    if (isPerkActive('shopBargain') && PERK_DATA.shopBargain?.effects) {
        const perkEffect = PERK_DATA.shopBargain.effects.find(e => e.type === "shop_price_modifier");
        if (perkEffect) {
            const modifier = isSelling
                ? (perkEffect.sell_mod !== undefined ? perkEffect.sell_mod : 0)
                : (perkEffect.buy_mod !== undefined ? perkEffect.buy_mod : 0);
            modifiedPrice = Math.max(1, Math.floor(modifiedPrice * (1 + modifier)));
        }
    }
    
    return modifiedPrice;
} 