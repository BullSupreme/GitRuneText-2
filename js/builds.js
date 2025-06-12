/**
 * builds.js - Handles building structures functionality
 * Manages building, upgrading and rent collection for structures
 */

'use strict';

// Import necessary data and functions
import { STRUCTURE_DATA, TIERS, getItemDetails } from './data.js';
import { playerData, savePlayerData, logMessage, formatNumber } from './utils.js';
import { updateHud, showSection, updateFarmButtonVisibility } from './ui.js';
import { trackStatistic } from './achievements.js';

// Track the last time rent was collected
let lastRentCollectionTime = Date.now();
// Track the last time water was collected
let lastWaterCollectionTime = Date.now();

// Set interval for rent collection (5 minutes in milliseconds)
const RENT_COLLECTION_INTERVAL = 5 * 60 * 1000;
// Set interval for water collection (30 seconds in milliseconds)
const WATER_COLLECTION_INTERVAL = 30 * 1000;

/**
 * Shows the build structures section
 */
export function showBuildStructuresMenu() {
    console.log('Showing build structures section');
    // Show the build structures section
    showSection('build-structures-section');
    
    // Add back button functionality
    const backButton = document.getElementById('build-structures-back-button');
    if (backButton) {
        // Remove any existing event listeners first to avoid duplicates
        const newBackButton = backButton.cloneNode(true);
        backButton.parentNode.replaceChild(newBackButton, backButton);
        
        newBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    // Render available structures
    renderAvailableStructures();
}

/**
 * Renders the available structures to build
 */
function renderAvailableStructures() {
    const structuresListContainer = document.getElementById('available-structures-to-build-list');
    if (!structuresListContainer) return;
    
    // Clear existing structures
    structuresListContainer.innerHTML = '';
    
    // Create structures from STRUCTURE_DATA
    Object.entries(STRUCTURE_DATA).forEach(([structureId, structureInfo]) => {
        // Skip if already built
        if (playerData.built_structures && playerData.built_structures[structureId]) {
            // Create an already built structure card
            const structureCard = createStructureCard(structureId, structureInfo, true);
            structuresListContainer.appendChild(structureCard);
            return;
        }
        
        // Check if requirements are met to show this structure
        if (canBuildStructure(structureId, structureInfo)) {
            // Create a buildable structure card
            const structureCard = createStructureCard(structureId, structureInfo, false);
            structuresListContainer.appendChild(structureCard);
        }
    });
    
    // If no structures available
    if (structuresListContainer.children.length === 0) {
        structuresListContainer.innerHTML = '<p class="no-structures-message">No structures available to build.</p>';
    }
}

/**
 * Creates a structure card element
 * @param {string} structureId - The ID of the structure
 * @param {object} structureInfo - The structure information object
 * @param {boolean} isBuilt - Whether the structure is already built
 * @returns {HTMLElement} - The structure card element
 */
function createStructureCard(structureId, structureInfo, isBuilt) {
    const structureCard = document.createElement('div');
    structureCard.className = 'perk-item-card structure-card item-card-tier'; // Add base tier class
    if (structureInfo.tier) {
        structureCard.classList.add(structureInfo.tier); // Add specific tier class
    }
    structureCard.dataset.structureId = structureId;
    
    if (isBuilt) {
        structureCard.classList.add('activated-perk-card');
    }
    
    // Prepare benefits list
    let benefitsList = '';
    
    // Check for direct perk effect
    if (structureInfo.perk_effect) {
        benefitsList += `<li>${structureInfo.perk_desc || 'Provides a special benefit.'}</li>`;
    }
    
    // Check for perks array
    if (structureInfo.perks && structureInfo.perks.length > 0) {
        structureInfo.perks.forEach(perk => {
            benefitsList += `<li>${perk.description || 'Provides a special benefit.'}</li>`;
        });
    }
    
    // Check for rent value
    if (structureInfo.rent_value) {
        benefitsList += `<li>Generates ${structureInfo.rent_value} gold every 5 minutes.</li>`;
    }
    
    // If no benefits found, add a default message
    if (!benefitsList) {
        benefitsList = '<li>Basic shelter with no special benefits.</li>';
    }
    
    // Parse resource costs
    const costObj = structureInfo.cost || {};
    // Build cost display string with resource names and player have amounts
    const costParts = Object.entries(costObj).map(([res, amt]) => {
        const haveAmt = res === 'gold' ? playerData.gold : (playerData.inventory?.[res] || 0);
        const resName = res.charAt(0).toUpperCase() + res.slice(1);
        // Determine if affordable for this resource
        const enough = haveAmt >= amt;
        let emoji = '';
        if (res === 'gold') {
            emoji = '🪙';
        } else {
            const details = getItemDetails(res);
            emoji = details && details.emoji ? details.emoji : '';
        }
        return `${emoji} ${amt} ${resName} (<span class="perk-cost-have ${enough ? 'have-enough' : 'have-not-enough'}">${haveAmt}</span>)`;
    });
    const costDisplay = costParts.join('<br>');
    // Check affordability of all resources
    let affordable = true;
    for (const [res, amt] of Object.entries(costObj)) {
        const haveAmt = res === 'gold' ? playerData.gold : (playerData.inventory?.[res] || 0);
        if (haveAmt < amt) { affordable = false; break; }
    }
    
    // Build structure card content
    structureCard.innerHTML = `
        <div class="perk-header">
            <div class="perk-name">${structureInfo.emoji} ${structureInfo.name}</div>
            <div class="perk-cost-display">${isBuilt ? 'BUILT' : costDisplay}</div>
        </div>
        <div class="perk-description">
            <strong>Benefits:</strong>
            <ul>${benefitsList}</ul>
        </div>
        <div class="perk-status-action">
            ${isBuilt 
                ? '<span style="color:#4caf50;">BUILT</span>' 
                : (affordable 
                    ? `<button data-structure-id="${structureId}">Build</button>` 
                    : '<span style="color:#e57373;">NEED MORE RESOURCES</span>')}
        </div>
    `;
    
    // Add click event listener for build button
    if (!isBuilt) {
        const buildButton = structureCard.querySelector('button');
        if (buildButton) {
            buildButton.addEventListener('click', (e) => {
                e.stopPropagation();
                buildStructure(structureId);
            });
        }
    }
    
    return structureCard;
}

/**
 * Checks if a structure can be built based on requirements
 * @param {string} structureId - The ID of the structure to check
 * @param {object} structureInfo - The structure information object
 * @returns {boolean} - True if the structure can be built
 */
function canBuildStructure(structureId, structureInfo) {
    // Check if structure requires another structure
    if (structureInfo.requires_structure) {
        if (!playerData.built_structures || !playerData.built_structures[structureInfo.requires_structure]) {
            return false;
        }
    }
    
    return true;
}

/**
 * Collects water from the well if built
 */
function collectWater() {
    const currentTime = Date.now();
    
    // Check if enough time has passed since last collection
    if (currentTime - lastWaterCollectionTime < WATER_COLLECTION_INTERVAL) {
        return;
    }
    
    // Check if player has a well
    if (playerData.built_structures && playerData.built_structures.well) {
        // Initialize inventory if needed
        if (!playerData.inventory) {
            playerData.inventory = {};
        }
        
        // Add water to inventory
        playerData.inventory.water = (playerData.inventory.water || 0) + 1;
        
        // Update last collection time
        lastWaterCollectionTime = currentTime;
        
        // Save the game
        savePlayerData();
        
        // Update UI
        updateHud();
    }
}

/**
 * Initialize water collection interval
 */
export function initWaterCollection() {
    // Set up interval to collect water
    setInterval(collectWater, WATER_COLLECTION_INTERVAL);
}

/**
 * Builds a structure
 * @param {string} structureId - The ID of the structure to build
 */
function buildStructure(structureId) {
    const structureInfo = STRUCTURE_DATA[structureId];
    if (!structureInfo) return;
    
    // Check if player has enough resources
    const costObj = structureInfo.cost || {};
    for (const [res, amt] of Object.entries(costObj)) {
        const haveAmt = res === 'gold' ? playerData.gold : (playerData.inventory?.[res] || 0);
        if (haveAmt < amt) {
            logMessage(`Not enough ${res}! Need ${amt}, have ${haveAmt}.`, "fore-danger");
            return;
        }
    }
    
    // Check if structure can be built
    if (!canBuildStructure(structureId, structureInfo)) {
        logMessage(`Cannot build this structure yet. Requirements not met.`, "fore-warning");
        return;
    }
    
    // Deduct resources
    for (const [res, amt] of Object.entries(costObj)) {
        if (res === 'gold') {
            playerData.gold -= amt;
        } else {
            playerData.inventory[res] = (playerData.inventory[res] || 0) - amt;
        }
    }
    
    // Mark structure as built
    if (!playerData.built_structures) {
        playerData.built_structures = {};
    }
    
    playerData.built_structures[structureId] = true;
    trackStatistic('progression', 'structureBuilt');
    
    // Log the build
    logMessage(`Built ${structureInfo.name}!`, "fore-success", "🏗️");
    
    // Save the game
    savePlayerData();
    
    // Update UI
    updateHud();
    renderAvailableStructures();
    // Update farm button visibility in main UI
    updateFarmButtonVisibility();
}

/**
 * Collects rent from built structures
 */
export function collectRent() {
    const currentTime = Date.now();
    
    // Check if enough time has passed since last collection
    if (currentTime - lastRentCollectionTime < RENT_COLLECTION_INTERVAL) {
        return;
    }
    
    let totalRentCollected = 0;
    let structuresWithRent = [];
    
    // Check each built structure for rent
    if (playerData.built_structures) {
        for (const [structureId, isBuilt] of Object.entries(playerData.built_structures)) {
            if (isBuilt && STRUCTURE_DATA[structureId] && STRUCTURE_DATA[structureId].rent_value) {
                totalRentCollected += STRUCTURE_DATA[structureId].rent_value;
                structuresWithRent.push(STRUCTURE_DATA[structureId].name);
            }
        }
    }
    
    // Add rent to player's gold if any was collected
    if (totalRentCollected > 0) {
        playerData.gold += totalRentCollected;
        
        // Log the rent collection
        logMessage(`Collected ${totalRentCollected} gold from your structures (${structuresWithRent.join(', ')}).`, "fore-gold", "💰");
        
        // Save the game
        savePlayerData();
        
        // Update UI
        updateHud();
    }
    
    // Update last collection time
    lastRentCollectionTime = currentTime;
}

/**
 * Initialize rent collection interval
 */
export function initRentCollection() {
    // Set up interval to check for rent collection
    setInterval(collectRent, 60000); // Check every minute
    
    // Also collect immediately if enough time has passed
    collectRent();
}

/**
 * Returns the value of a structure's perk effect if built
 * @param {string} structureId - The ID of the structure to check
 * @param {string} effectType - The type of effect to get
 * @returns {any} - The effect value or null if structure not built
 */
export function getStructurePerkEffect(structureId, effectType) {
    if (playerData.built_structures && 
        playerData.built_structures[structureId] && 
        STRUCTURE_DATA[structureId]?.perk_effect?.type === effectType) {
        return STRUCTURE_DATA[structureId].perk_effect.value;
    }
    
    // Check for effect in perks array if it exists
    if (playerData.built_structures && 
        playerData.built_structures[structureId] && 
        STRUCTURE_DATA[structureId]?.perks) {
        const perk = STRUCTURE_DATA[structureId].perks.find(p => p.type === effectType);
        if (perk) {
            return perk.value;
        }
    }
    
    return null;
}
