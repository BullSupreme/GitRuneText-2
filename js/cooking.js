/**
 * cooking.js - Cooking module for RuneText
 * Handles cooking actions, food selection, and auto-cooking
 */

'use strict';

// Import necessary functions and data
import { playerData, savePlayerData, getLevelFromXp, getMaxHp, capCurrentHp, logMessage, playSound, sounds, titleCase, checkAndResetLowHealthWarning, handleLevelUp, getEnchantmentBonus } from './utils.js';
import { showSection, updateHud, setActiveSkill, clearActiveSkill, showFloatingCombatText } from './ui.js';
import { stopAllAutoActions } from './actions.js';
import { FOOD_DATA, COOKABLE_ITEMS, TIERS, getItemDetails } from './data.js';
import { getSummedPyramidPerkEffects } from './perks.js';
import { getStructurePerkEffect } from './builds.js';
import { getGuildDoubleCraftingChance } from './guild.js';

// Cooking state variables
let isAutoCooking = false;
let autoCookingInterval = null;
let currentCookingTarget = null;

/**
 * Calculates the current cooking action time
 */
export function calculateCookingActionTime() {
    const baseTime = 3000;
    let interval = baseTime;
    
    // Apply crafting speed bonus from ring enchantments (reduce time in milliseconds)
    const craftingSpeedBonus = getEnchantmentBonus('crafting_speed');
    if (craftingSpeedBonus > 0) {
        interval -= (craftingSpeedBonus * 1000); // Convert seconds to milliseconds
    }
    
    // Apply cooking speed bonus from pyramid perks and structures
    const perkEffects = getSummedPyramidPerkEffects();
    let totalSpeedBoost = perkEffects.cooking_speed || 0;
    
    // Add global skill speed boost from perks and structures
    totalSpeedBoost += perkEffects.global_skill_speed_boost || 0;
    const structureSpeedBoost = getStructurePerkEffect('stronghold', 'global_skill_speed_boost') || 0;
    totalSpeedBoost += structureSpeedBoost;
    
    if (totalSpeedBoost > 0) {
        interval *= (1 - totalSpeedBoost);
    }
    
    // Minimum interval should be 500ms
    interval = Math.max(500, interval);
    
    return interval;
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
 * Calculate maximum number of items that can be cooked based on inventory
 * @param {string} recipeKey - The key of the recipe in COOKABLE_ITEMS
 * @returns {number} Maximum cookable count
 */
function calculateMaxCookable(recipeKey) {
    const recipe = COOKABLE_ITEMS[recipeKey];
    if (!recipe) return 0;
    let maxCookable = Infinity;
    if (recipe.recipe) {
        for (const [ingredient, amountNeeded] of Object.entries(recipe.recipe)) {
            const amountPlayerHas = playerData.inventory?.[ingredient] || 0;
            const possible = Math.floor(amountPlayerHas / amountNeeded);
            maxCookable = Math.min(maxCookable, possible);
        }
    } else {
        const amountPlayerHas = playerData.inventory?.[recipeKey] || 0;
        maxCookable = amountPlayerHas;
    }
    return isFinite(maxCookable) ? maxCookable : 0;
}

/**
 * Shows the cooking section and initializes the display
 * @param {boolean} skipStop - Whether to skip stopping other auto actions
 */
export function showCooking(skipStop = false) {
    // Stop other auto actions if requested
    if (!skipStop) stopAllAutoActions();
    
    // Get active status
    const isActive = playerData && playerData.skills && playerData.skills.cooking 
        ? playerData.skills.cooking.is_active 
        : false;
    
    // Show the cooking section
    showSection('cooking-section', isActive);
    
    // Update the cooking display
    updateCookingDisplay();
    
    // Setup event listeners for cooking section and modal
    setupCookingEvents();
    setupEatFoodModalEvents();
}

/**
 * Updates the cooking display with available food items
 */
function updateCookingDisplay() {
    // Check for permit status display
    const ckPermitStatusDiv = document.getElementById('cooking-permit-status-display');
    if (ckPermitStatusDiv) {
        if (playerData.permits && playerData.permits.chef) {
            ckPermitStatusDiv.textContent = "📜 Chef's Permit Active: Continuous cooking through level ups!";
            ckPermitStatusDiv.classList.remove('inactive');
        } else {
            ckPermitStatusDiv.textContent = "📜 Chef's Permit Needed: Purchase to continue cooking after level-ups!";
            ckPermitStatusDiv.classList.add('inactive');
        }
    }
    
    // Get the container for available food
    const availableFoodContainer = document.getElementById('available-food-list');
    if (!availableFoodContainer) return;
    
    // Clear container
    availableFoodContainer.innerHTML = '';
    
    // Prepare sorted recipes, skipping fish/shrimp until implemented
    const skipFishRecipes = ['raw shrimp','raw fish','raw trout','raw salmon','raw lobster','raw swordfish','raw shark'];
    const sortedRecipes = Object.entries(COOKABLE_ITEMS)
        .filter(([key]) => !skipFishRecipes.includes(key))
        .sort(([, a], [, b]) => a.level_req - b.level_req);

    // Create sorted food items for each cookable item
    for (const [recipeKey, recipe] of sortedRecipes) {
        const sanitizedKey = recipeKey.replace(/\s+/g, '-');
        
        // Calculate if we can cook based on level requirement and materials
        const ckLevel = getLevelFromXp(playerData.skills?.cooking?.xp || 0);
        let canCook = ckLevel >= recipe.level_req;
        let materialsAvailable = true;
        let ingredientLines = [];
        
        if (recipe.recipe) { // Multi-ingredient recipe
            const entries = Object.entries(recipe.recipe);
            entries.forEach(([ingredient, amountNeeded], idx) => {
                const detailsIng = getItemDetails(ingredient);
                const emojiIng = detailsIng?.emoji || '';
                const amountPlayerHas = playerData.inventory?.[ingredient] || 0;
                const haveClass = amountPlayerHas >= amountNeeded ? 'have-enough' : 'have-not-enough';
                const haveSpan = `<span class="${haveClass}">${amountPlayerHas}</span>`;
                const comma = idx < entries.length - 1 ? ',' : '';
                ingredientLines.push(
                    `<div class="action-item-ingredients">${amountNeeded} ${emojiIng} ${titleCase(ingredient)} (${haveSpan})${comma}</div>`
                );
                if (amountPlayerHas < amountNeeded) {
                    materialsAvailable = false;
                }
            });
        } else {
            const rawItemName = recipeKey;
            const detailsIng = getItemDetails(rawItemName);
            const emojiIng = detailsIng?.emoji || '';
            const amountPlayerHas = playerData.inventory?.[rawItemName] || 0;
            const haveClass = amountPlayerHas >= 1 ? 'have-enough' : 'have-not-enough';
            const haveSpan = `<span class="${haveClass}">${amountPlayerHas}</span>`;
            ingredientLines.push(
                `<div class="action-item-ingredients">1 ${emojiIng} ${titleCase(rawItemName)} (${haveSpan})</div>`
            );
            if (amountPlayerHas < 1) {
                materialsAvailable = false;
            }
        }
        
        const meetsLevel = ckLevel >= recipe.level_req;
        canCook = meetsLevel && materialsAvailable;
        
        const foodDiv = document.createElement('div');
        foodDiv.className = 'action-list-item';
        
        if (!meetsLevel) {
            foodDiv.classList.add('greyed-out');
            foodDiv.title = `Requires Cooking Lvl ${recipe.level_req}`;
        } else if (!materialsAvailable) {
            foodDiv.classList.add('action-list-item-disabled');
            foodDiv.title = `Missing ingredients`;
        }
        
        foodDiv.style.cursor = canCook ? 'pointer' : 'not-allowed';
        
        // Determine icon to display
        const displayEmoji = recipe.emoji || "🍳";
        // Compute live max cookable and cooked inventory count
        const maxCookable = calculateMaxCookable(recipeKey);
        const cookedCount = playerData.inventory?.[recipe.cooked_item] || 0;
        
        // Format display name (remove 'Cooked', remove 'Slice', split camelCase)
        let cookedName = recipe.cooked_item;
        // Remove 'cooked ' from the beginning if it exists
        if (cookedName.toLowerCase().startsWith('cooked ')) {
            cookedName = cookedName.slice(7); // Remove 'cooked ' (7 characters)
        }
        if (cookedName.toLowerCase().endsWith('slice')) {
            cookedName = cookedName.slice(0, -5);
        }
        cookedName = cookedName.replace(/([a-z])([A-Z])/g, '$1 $2');
        const displayName = titleCase(cookedName);
        foodDiv.innerHTML = `
            <div class="action-item-left">
                <span class="action-item-emoji">${displayEmoji}</span>
                <span class="action-item-name">${displayName}</span>
                <span class="action-item-level">(Lvl ${recipe.level_req})</span>
                <span class="action-item-xp">+${recipe.xp_gain} XP</span>
                <div class="resource-max-craft">Max: ${maxCookable}</div>
            </div>
            <div class="action-item-right">
                <div class="recipe-requirements">
                    ${ingredientLines.join('')}
                </div>
                <div class="resource-inventory-count">${cookedCount}</div>
            </div>
            <span class="resource-loot-notification" id="loot-notification-ck-${sanitizedKey}"></span>
        `;
        
        foodDiv.onclick = () => canCook ? selectFoodForCooking(recipeKey) : null;
        
        // Add active class if this is currently selected food
        if (isAutoCooking && currentCookingTarget === recipeKey) {
            foodDiv.classList.add('active-action-item');
        }
        
        availableFoodContainer.appendChild(foodDiv);
    }
    
    // Update the food inventory section
    populateEatFoodModal();
}

/**
 * Update the food inventory display
 */
export function populateEatFoodModal() {
    const foodListContainer = document.getElementById('eat-food-list');
    if (!foodListContainer) return;
    foodListContainer.innerHTML = ''; // Clear previous items
    
    const foodItems = Object.entries(playerData.inventory).filter(([item, quantity]) => {
        const details = getItemDetails(item);
        return details && (details.category === 'food' || details.category === 'potion' || details.category === 'elixir') && details.heal_amount && quantity > 0;
    });
    
    if (foodItems.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-food-message';
        emptyMsg.textContent = 'No consumable items in inventory.';
        foodListContainer.appendChild(emptyMsg);
    } else {
        foodItems.forEach(([item, quantity]) => {
            const details = getItemDetails(item);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'food-item-card';
            const tierClass = details.tier || TIERS.COMMON;
            itemDiv.classList.add(tierClass);
            
            itemDiv.innerHTML = `
                <div class="food-item-icon">${details.emoji || '❓'}</div>
                <div class="food-item-info">
                    <div class="food-item-name">${titleCase(item)}</div>
                    <div class="food-item-quantity">x${quantity}</div>
                    <div class="food-item-heal">+${details.heal_amount} HP</div>
                </div>
                <button class="food-eat-btn" data-item="${item}">Eat</button>
            `;
            
            // Add click event for eat button - keep modal open and update HP
            itemDiv.querySelector('.food-eat-btn').addEventListener('click', (e) => {
                eatFood(e.target.dataset.item);
                populateEatFoodModal(); // Re-populate to update quantities
                updateFoodModalHPBar(); // Update HP bar after eating
            });
            
            foodListContainer.appendChild(itemDiv);
        });
    }
}

function showEatFoodModal() {
    const modal = document.getElementById('eat-food-modal');
    if (modal) {
        populateEatFoodModal(); // Populate before showing
        updateFoodModalHPBar(); // Update HP bar
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Ensure it's displayed
    }
}

function hideEatFoodModal() {
    const modal = document.getElementById('eat-food-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function updateFoodModalHPBar() {
    const hpText = document.getElementById('food-modal-hp-text');
    const hpFill = document.getElementById('food-modal-hp-fill');
    
    if (hpText && hpFill) {
        // Cap current HP at max HP before displaying
        capCurrentHp();
        
        const currentHP = Math.floor(playerData.hp || 0);
        const attackLevel = getLevelFromXp(playerData.skills.attack.xp || 0);
        const maxHP = Math.floor(getMaxHp(attackLevel));
        const hpPercentage = (currentHP / maxHP) * 100;
        
        hpText.textContent = `${currentHP}/${maxHP}`;
        
        // Update color based on HP percentage
        if (hpPercentage <= 25) {
            hpFill.style.backgroundColor = '#f44336'; // Red
        } else if (hpPercentage <= 50) {
            hpFill.style.backgroundColor = '#ff9800'; // Orange
        } else if (hpPercentage <= 75) {
            hpFill.style.backgroundColor = '#ffeb3b'; // Yellow
        } else {
            hpFill.style.backgroundColor = '#4caf50'; // Green
        }
        
        // Set the width
        hpFill.style.width = `${hpPercentage}%`;
    }
}

/**
 * Eat a food item to restore HP
 * @param {string} foodName - The name of the food to eat
 */
export function eatFood(foodName) {
    // Get item details (works for both food and potions)
    const itemDetails = getItemDetails(foodName);
    
    // Check if item exists and has healing
    if (!itemDetails || !itemDetails.heal_amount) {
        logMessage(`Unknown consumable item: ${foodName}`, 'fore-red');
        return;
    }
    
    // Check if player has this item
    if (!playerData.inventory || !playerData.inventory[foodName] || playerData.inventory[foodName] <= 0) {
        logMessage(`You don't have any ${foodName} to consume.`, 'fore-red');
        return;
    }
    
    // Calculate actual max HP
    const attackLevel = getLevelFromXp(playerData.skills.attack.xp || 0);
    const maxHP = getMaxHp(attackLevel);
    
    // Check if player already has max HP
    if (playerData.hp >= maxHP) {
        logMessage(`You already have full health!`, 'fore-yellow');
        return;
    }
    
    // Consume the item
    playerData.inventory[foodName]--;
    
    // Calculate healing amount
    const healAmount = itemDetails.heal_amount;
    const oldHP = playerData.hp;
    playerData.hp = Math.min(maxHP, playerData.hp + healAmount);
    const actualHeal = playerData.hp - oldHP;
    
    // Reset low health warning if HP gets back above 50%
    checkAndResetLowHealthWarning();
    
    // Play sound
    if (sounds && sounds.eat) {
        playSound('eat');
    }
    
    // Determine action verb based on category
    const actionVerb = itemDetails.category === 'potion' ? 'Drank' : 'Ate';
    
    // Log the action
    logMessage(`${actionVerb} ${itemDetails.emoji} ${foodName} and restored ${actualHeal} HP.`, 'fore-green');
    
    // Save player data
    savePlayerData();
    
    // Update displays
    updateCookingDisplay();
    updateHud();
}

/**
 * Selects a food for cooking
 * @param {string} recipeKey - The key of the recipe from COOKABLE_ITEMS
 */
function selectFoodForCooking(recipeKey) {
    // If the same recipe is selected, stop auto cooking
    if (isAutoCooking && currentCookingTarget === recipeKey) {
        stopAutoCooking();
    } else {
        // Otherwise, stop any current auto cooking and start on the new recipe
        if (isAutoCooking) stopAutoCooking();
        startAutoCooking(recipeKey);
    }
}

/**
 * Starts auto cooking on selected recipe
 * @param {string} recipeKey - The key of the recipe from COOKABLE_ITEMS
 */
function startAutoCooking(recipeKey) {
    const recipe = COOKABLE_ITEMS[recipeKey];
    
    if (!recipe) {
        logMessage(`Unknown recipe: ${recipeKey}`, 'fore-red');
        return false;
    }
    
    // Check if player has the required level
    const cookingLevel = getLevelFromXp(playerData.skills?.cooking?.xp || 0);
    
    if (cookingLevel < recipe.level_req) {
        logMessage(`You need level ${recipe.level_req} Cooking to cook ${recipe.cooked_item}`, 'fore-red');
        return false;
    }
    
    // Check if player has the ingredients
    let hasIngredients = true;
    
    if (recipe.recipe) { // Multi-ingredient recipe
        for (const [ingredient, amountNeeded] of Object.entries(recipe.recipe)) {
            const amountPlayerHas = playerData.inventory?.[ingredient] || 0;
            if (amountPlayerHas < amountNeeded) {
                hasIngredients = false;
                logMessage(`You don't have enough ${ingredient}. Need ${amountNeeded}, have ${amountPlayerHas}.`, 'fore-red');
                break;
            }
        }
    } else { // Single-ingredient recipe
        const rawIngredient = recipeKey; // The key itself is the raw ingredient
        const amountPlayerHas = playerData.inventory?.[rawIngredient] || 0;
        if (amountPlayerHas < 1) {
            hasIngredients = false;
            logMessage(`You don't have any ${rawIngredient} to cook.`, 'fore-red');
        }
    }
    
    if (!hasIngredients) {
        return false;
    }
    
    // Set target and start auto cooking
    currentCookingTarget = recipeKey;
    isAutoCooking = true;
    
    // Use centralized cooking action time calculation
    const interval = calculateCookingActionTime();
    
    // Start the auto-cooking interval
    logMessage(`Started cooking ${recipe.cooked_item}.`, 'fore-orange', '✨');
    autoCookingInterval = setInterval(singleCookAction, interval);
    
    // Update UI
    updateCookingDisplay();
    updateHud();
    setActiveSkill('ck');
    
    return true;
}

/**
 * Stops auto cooking
 */
export function stopAutoCooking() {
    if (autoCookingInterval) {
        clearInterval(autoCookingInterval);
        autoCookingInterval = null;
    }
    
    if (isAutoCooking) {
        logMessage(`Stopped cooking.`, 'fore-warning', '🛑');
        isAutoCooking = false;
        currentCookingTarget = null;
        
        // Update UI
        updateCookingDisplay();
        updateHud();
        clearActiveSkill();
    }
}

/**
 * Performs a single cooking action
 */
function singleCookAction() {
    if (!isAutoCooking || !currentCookingTarget) {
        stopAutoCooking();
        return;
    }
    
    const recipe = COOKABLE_ITEMS[currentCookingTarget];
    
    if (!recipe) {
        logMessage(`Recipe not found: ${currentCookingTarget}`, 'fore-red');
        stopAutoCooking();
        return;
    }
    
    // Check if player has ingredients
    let hasIngredients = true;
    
    if (recipe.recipe) { // Multi-ingredient recipe
        for (const [ingredient, amountNeeded] of Object.entries(recipe.recipe)) {
            const amountPlayerHas = playerData.inventory?.[ingredient] || 0;
            if (amountPlayerHas < amountNeeded) {
                hasIngredients = false;
                logMessage(`No more ${ingredient} to cook ${recipe.cooked_item}.`, 'fore-warning');
                break;
            }
        }
    } else { // Single-ingredient recipe
        const rawIngredient = currentCookingTarget;
        const amountPlayerHas = playerData.inventory?.[rawIngredient] || 0;
        if (amountPlayerHas < 1) {
            hasIngredients = false;
            logMessage(`No more ${rawIngredient} to cook.`, 'fore-warning');
        }
    }
    
    if (!hasIngredients) {
        stopAutoCooking();
        return;
    }
    
    // Play sound if available
    if (sounds && sounds.cooking) {
        const cookingSound = typeof sounds.cooking === 'function' ? sounds.cooking() : sounds.cooking;
        playSound(cookingSound);
    }
    
    // Calculate and add XP
    const oldLevel = getLevelFromXp(playerData.skills?.cooking?.xp || 0);
    
    // Initialize cooking skill if it doesn't exist
    if (!playerData.skills) playerData.skills = {};
    if (!playerData.skills.cooking) playerData.skills.cooking = { xp: 0, is_active: true };
    
    playerData.skills.cooking.xp += recipe.xp_gain;
    const newLevel = getLevelFromXp(playerData.skills.cooking.xp);
    
    // Log XP gain
    logMessage(`+${recipe.xp_gain} Cooking XP`, 'fore-orange', '✨');
    
    // Consume ingredients
    if (recipe.recipe) { // Multi-ingredient recipe
        for (const [ingredient, amountNeeded] of Object.entries(recipe.recipe)) {
            playerData.inventory[ingredient] -= amountNeeded;
            if (playerData.inventory[ingredient] <= 0) {
                delete playerData.inventory[ingredient]; // Remove if zero or negative
            }
        }
    } else { // Single-ingredient recipe
        const rawIngredient = currentCookingTarget;
        playerData.inventory[rawIngredient]--;
        if (playerData.inventory[rawIngredient] <= 0) {
            delete playerData.inventory[rawIngredient]; // Remove if zero or negative
        }
    }
    
    // Update Max value and ingredient counts immediately after consuming ingredients
    const maxCookable = calculateMaxCookable(currentCookingTarget);
    const sanitizedKey = currentCookingTarget.replace(/\s+/g, '-');
    const recipeElement = document.querySelector(`#loot-notification-ck-${sanitizedKey}`)?.closest('.action-list-item');
    
    if (recipeElement) {
        // Update Max value
        const maxElement = recipeElement.querySelector('.resource-max-craft');
        if (maxElement) {
            maxElement.textContent = `Max: ${maxCookable}`;
        }
        
        // Update ingredient counts
        if (recipe.recipe) {
            // Multi-ingredient recipe
            Object.entries(recipe.recipe).forEach(([ingredient, amountNeeded]) => {
                const amountPlayerHas = playerData.inventory?.[ingredient] || 0;
                const ingredientElements = recipeElement.querySelectorAll('.action-item-ingredients');
                ingredientElements.forEach(el => {
                    if (el.textContent.includes(titleCase(ingredient))) {
                        const haveClass = amountPlayerHas >= amountNeeded ? 'have-enough' : 'have-not-enough';
                        const regex = new RegExp(`\\(<span class="[^"]*">[0-9]+</span>\\)`);
                        el.innerHTML = el.innerHTML.replace(regex, `(<span class="${haveClass}">${amountPlayerHas}</span>)`);
                    }
                });
            });
        } else {
            // Single ingredient recipe
            const rawIngredient = currentCookingTarget;
            const amountPlayerHas = playerData.inventory?.[rawIngredient] || 0;
            const ingredientElement = recipeElement.querySelector('.action-item-ingredients span');
            if (ingredientElement) {
                ingredientElement.className = amountPlayerHas >= 1 ? 'have-enough' : 'have-not-enough';
                ingredientElement.textContent = amountPlayerHas.toString();
            }
        }
    }
    
    // Calculate if food burns (higher chance at lower levels)
    const cookingLevel = getLevelFromXp(playerData.skills.cooking.xp);
    const burnChance = Math.max(0, Math.min(0.8, (recipe.difficulty_level * 30 - cookingLevel) / (recipe.difficulty_level * 30)));
    
    // Apply cooking success bonus from pyramid perks
    const perkEffects = getSummedPyramidPerkEffects();
    const cookingSuccessBonus = perkEffects.cooking_success_bonus || 0;
    let adjustedBurnChance = burnChance;
    if (cookingSuccessBonus > 0) {
        adjustedBurnChance *= (1 - cookingSuccessBonus);
    }
    
    // Calculate yield amount (default to 1 if not specified)
    const yieldAmount = recipe.yield || 1;
    
    // Initialize gainTextShown flag
    let gainTextShown = false;
    
    // Determine if food burns
    if (Math.random() < adjustedBurnChance) {
        // Food burns, add burnt food to inventory
        if (recipe.burnt_item) {
            playerData.inventory[recipe.burnt_item] = (playerData.inventory[recipe.burnt_item] || 0) + 1;
            logMessage(`You burned ${recipe.recipe ? 'the ingredients' : `the ${currentCookingTarget}`}.`, 'fore-red', '🔥');
            
            // Show static gain text for burnt food
            const availableFoodContainer = document.getElementById('available-food-list');
            if (availableFoodContainer) {
                const notifKey = currentCookingTarget.replace(/\s+/g, '-');
                const foodDiv = availableFoodContainer.querySelector(`.action-list-item #loot-notification-ck-${notifKey}`);
                const foodContainer = foodDiv ? foodDiv.closest('.action-list-item') : null;
                if (foodContainer) {
                    showStaticGainText(foodContainer, `+1 🔥 (+${recipe.xp_gain} XP)`, true, true);
                    gainTextShown = true;
                }
            }
        } else {
            logMessage(`You burned ${recipe.recipe ? 'the ingredients' : `the ${currentCookingTarget}`}.`, 'fore-red', '🔥');
            
            // Show static gain text for burnt (no specific item)
            const availableFoodContainer = document.getElementById('available-food-list');
            if (availableFoodContainer) {
                const notifKey = currentCookingTarget.replace(/\s+/g, '-');
                const foodDiv = availableFoodContainer.querySelector(`.action-list-item #loot-notification-ck-${notifKey}`);
                const foodContainer = foodDiv ? foodDiv.closest('.action-list-item') : null;
                if (foodContainer) {
                    showStaticGainText(foodContainer, `Burned 🔥 (+${recipe.xp_gain} XP)`, true, true);
                    gainTextShown = true;
                }
            }
        }
    } else {
        // Food cooks successfully, add cooked food to inventory
        let finalYieldAmount = yieldAmount;
        
        // Check for double crafting chance from guild upgrade
        const doubleCraftChance = getGuildDoubleCraftingChance();
        if (doubleCraftChance > 0 && Math.random() < doubleCraftChance) {
            finalYieldAmount *= 2;
            logMessage(`Guild bonus: Double yield! Got ${finalYieldAmount} ${recipe.cooked_item}!`, 'fore-cyan', '✨');
        }
        
        playerData.inventory[recipe.cooked_item] = (playerData.inventory[recipe.cooked_item] || 0) + finalYieldAmount;
        logMessage(`Successfully cooked ${recipe.cooked_item}.`, 'fore-green', '✅');
        
        // Update cooked item count immediately
        if (recipeElement) {
            const cookedCountElement = recipeElement.querySelector('.resource-inventory-count');
            if (cookedCountElement) {
                cookedCountElement.textContent = playerData.inventory[recipe.cooked_item] || 0;
            }
        }
        
        // Show static gain text on the cooking container
        const availableFoodContainer = document.getElementById('available-food-list');
        if (availableFoodContainer) {
            const notifKey = currentCookingTarget.replace(/\s+/g, '-');
            const foodDiv = availableFoodContainer.querySelector(`.action-list-item #loot-notification-ck-${notifKey}`);
            const foodContainer = foodDiv ? foodDiv.closest('.action-list-item') : null;
            if (foodContainer) {
                const displayEmoji = recipe.emoji || "🍳";
                showStaticGainText(foodContainer, `+${finalYieldAmount} ${displayEmoji} (+${recipe.xp_gain} XP)`, true, true);
                gainTextShown = true;
            }
        }
        
    }
    
    // Check if leveled up
    if (newLevel > oldLevel) {
        handleLevelUp('cooking', oldLevel, newLevel);
        
        // Stop auto cooking on level up if no chef's permit
        if (!(playerData.permits && playerData.permits.chef)) {
            logMessage(`Cooking automatically stopped due to level up. Purchase a Chef's Permit to continue.`, 'fore-warning');
            stopAutoCooking();
        }
    }
    
    // Save player data
    savePlayerData();
    
    // Delay UI update if gain text was shown
    if (gainTextShown) {
        setTimeout(() => {
            updateCookingDisplay();
            updateHud();
        }, 1200);
    } else {
        updateCookingDisplay();
        updateHud();
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for cooking-related elements
    const cookingBackBtn = document.getElementById('cooking-back-btn');
    if (cookingBackBtn) {
        cookingBackBtn.addEventListener('click', () => {
            stopAutoCooking();
            showSection('actions-menu-section');
        });
    }
    
    // Add footer back button listener - goes to main menu
    const cookingFooterBackBtn = document.getElementById('cooking-footer-back-btn');
    if (cookingFooterBackBtn) {
        cookingFooterBackBtn.addEventListener('click', () => {
            stopAutoCooking();
            showSection('main-menu-section');
        });
    }
});

export function setupCookingEvents() {
    // Back button event listener
    const cookingBackBtn = document.getElementById('cooking-back-btn');
    if (cookingBackBtn) {
        cookingBackBtn.addEventListener('click', () => {
            stopAutoCooking(); // Stop auto-cooking if active
            showSection('actions-menu-section'); // Go back to Actions menu
        });
    }
    // Eat Food button event listener
    const eatFoodCookingBtn = document.getElementById('eat-food-cooking-btn');
    if (eatFoodCookingBtn) {
        eatFoodCookingBtn.addEventListener('click', showEatFoodModal);
    }
}

function setupEatFoodModalEvents() {
    const closeModalBtn = document.getElementById('close-eat-food-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideEatFoodModal);
    }
    
    const closeFoodBtn = document.getElementById('close-food-modal-btn');
    if (closeFoodBtn) {
        closeFoodBtn.addEventListener('click', hideEatFoodModal);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('eat-food-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideEatFoodModal();
            }
        });
    }
}

// Export functions needed by other modules
export { updateCookingDisplay, selectFoodForCooking, startAutoCooking, showEatFoodModal, setupEatFoodModalEvents }; 
