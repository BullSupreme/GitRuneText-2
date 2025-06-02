/**
 * farming.js - Farming module for RuneText
 * Handles all farming-related functionality including animal care and farm worker management
 */

'use strict';

import { playerData, savePlayerData, logMessage, removeItemFromInventory, addItemToInventory, formatNumber, titleCase, getLevelFromXp, handleLevelUp } from './utils.js';
import { trackStatistic } from './achievements.js';
import { showSection } from './ui.js';
import { showActionsMenu } from './actions.js';
import { 
    FARM_ANIMAL_HOUSING_DATA, 
    FARM_ANIMAL_DATA, 
    FARM_CROP_PLOT_DATA,
    FARM_WORKER_DATA,
    SEED_DATA,
    CROP_ITEMS,
    ITEM_SELL_PRICES,
    getItemDetails,
    TIERS 
} from './data.js';

// Module constants
const FARM_WORKER_PAYMENT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
// Yield timing adjustments
const WORKER_INTERVAL_REDUCTION = 2 * 60 * 1000;     // 2 minutes per farmhand
const MANAGER_INTERVAL_REDUCTION = 5 * 60 * 1000;    // 5 minutes for manager
const MAX_WORKERS_PER_HOUSING = 10;
const MIN_INTERVAL_MS = 1 * 60 * 1000;               // 1 minute minimum interval

// Module variables
let farmWorkerPaymentInterval = null;
// Crop plot timer interval
let cropTimerInterval = null;

// Assignment modal state and helpers
let currentAssignmentWorkerId = null;

// Helper: Populate the Hired Workers Overview section
function populateHiredWorkersOverview() {
    const hwoDiv = document.getElementById('hired-workers-overview');
    if (!hwoDiv) return;
    // Get the four sections: Managers, Idle, Animal, Crop
    const sections = Array.from(hwoDiv.querySelectorAll('.hwo-section'));
    // Clear existing icons, preserve header
    sections.forEach(sec => {
        const header = sec.querySelector('h4');
        sec.innerHTML = '';
        if (header) sec.appendChild(header);
    });
    // Add each worker emoji to the appropriate section
    Object.entries(playerData.farm_workers || {}).forEach(([id, w]) => {
        // Skip managers (they appear in headers instead)
        if (w.type === 'farm_manager') return;
        const info = FARM_WORKER_DATA[w.type];
        if (!info) return;
        const span = document.createElement('span');
        span.className = 'worker-emoji ' + (w.status || 'idle');
        span.textContent = info.emoji;
        // Determine section index: 0=Idle,1=Animal,2=Crop
        let idx;
        if (w.status === 'idle') {
            idx = 0;
        } else if (w.assignedTo && FARM_ANIMAL_HOUSING_DATA[w.assignedTo]) {
            idx = 1;
        } else if (w.assignedTo && playerData.farm_crop_plots[w.assignedTo]) {
            idx = 2;
        } else {
            idx = 0;
        }
        if (sections[idx]) sections[idx].appendChild(span);
    });
}

/**
 * Initialize the farming module
 */
export function initFarmingModule() {
    setupFarmWorkerPaymentInterval();
    setupFarmingTabEvents();
    createAssignmentModal();
    // Render overview and populate UI
    renderFarmOverview();
    populateHiredWorkersOverview();
    // Start updating crop timers in the Crop tab
    if (cropTimerInterval) clearInterval(cropTimerInterval);
    cropTimerInterval = setInterval(updateCropTimers, 1000);
}

/**
 * Show the farming menu section
 */
export function showFarmingMenu() {
    // Only allow access if Farm Land structure has been built
    if (!playerData.built_structures || !playerData.built_structures.farmLand) {
        logMessage("You need to build Farm Land first.", "error");
        return;
    }
    
    showSection('farming-section');
    updateFarmingDisplay();
}

/**
 * Set up the farm worker payment interval
 * This checks every minute if workers need to be paid
 */
function setupFarmWorkerPaymentInterval() {
    if (farmWorkerPaymentInterval) {
        clearInterval(farmWorkerPaymentInterval);
    }
    
    // Initialize last_farm_worker_payment if not set
    if (!playerData.last_farm_worker_payment) {
        playerData.last_farm_worker_payment = Date.now();
        savePlayerData();
    }
    
    farmWorkerPaymentInterval = setInterval(() => {
        processFarmWorkerPayments();
        updateFarmWorkerUi();
    }, 60 * 1000); // Check every minute
    
    console.log('Farm worker payment interval set up');
}

/**
 * Set up events for the farming tabs
 */
function setupFarmingTabEvents() {
    // Set up tab switching
    const overviewTab = document.getElementById('overview-tab');
    const animalTab = document.getElementById('animal-management-tab');
    const cropTab = document.getElementById('crop-management-tab');
    const workersTab = document.getElementById('farm-workers-tab');
    const storageTab = document.getElementById('storage-tab');
    if (overviewTab) overviewTab.addEventListener('click', () => switchFarmingTab('overview'));
    if (animalTab) animalTab.addEventListener('click', () => switchFarmingTab('animal-management'));
    if (cropTab) cropTab.addEventListener('click', () => switchFarmingTab('crop-management'));
    if (workersTab) workersTab.addEventListener('click', () => switchFarmingTab('farm-workers'));
    if (storageTab) storageTab.addEventListener('click', () => switchFarmingTab('storage'));
    // Overview navigation buttons (in overview-content)
    const overviewAnimalBtn = document.getElementById('overview-animals-button');
    if (overviewAnimalBtn) overviewAnimalBtn.addEventListener('click', () => switchFarmingTab('animal-management'));
    const overviewCropsBtn = document.getElementById('overview-crops-button');
    if (overviewCropsBtn) overviewCropsBtn.addEventListener('click', () => switchFarmingTab('crop-management'));
    const overviewWorkersBtn = document.getElementById('overview-workers-button');
    if (overviewWorkersBtn) overviewWorkersBtn.addEventListener('click', () => switchFarmingTab('farm-workers'));
}

/**
 * Switch between farming tabs
 * @param {string} tabId - The ID of the tab to switch to
 */
function switchFarmingTab(tabId) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.farming-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const activeTab = document.getElementById(`${tabId}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update content visibility
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.style.display = 'none');
    
    const activeContent = document.getElementById(`${tabId}-content`);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
    // Refresh farming displays for the active tab
    updateFarmingDisplay();
}

/**
 * Update all farming displays
 */
function updateFarmingDisplay() {
    // Refresh overview, animals, crops, and workers data
    renderFarmOverview();
    updateAnimalDisplay();
    renderFarmContent();
    renderFarmWorkers();
    renderFarmStorage();
}

/**
 * Display and manage farm animal housing and animal purchases
 */
function updateAnimalDisplay() {
    const animalContainer = document.getElementById('animal-status-container');
    if (!animalContainer) return;
    animalContainer.innerHTML = '';
    // For each animal housing type, show build or management UI
    for (const housingId in FARM_ANIMAL_HOUSING_DATA) {
        const housingInfo = FARM_ANIMAL_HOUSING_DATA[housingId];
        const housingState = playerData.farm_animal_housing?.[housingId];
        const housingCard = document.createElement('div');
        housingCard.className = `perk-item-card item-card-tier ${housingInfo.tier}`;
        if (housingState?.built) {
            // Built: show count and buy button
            const count = housingState.animals || 0;
            const animalType = Object.keys(FARM_ANIMAL_DATA).find(a => FARM_ANIMAL_DATA[a].housingId === housingId);
            const animalInfo = FARM_ANIMAL_DATA[animalType];
            housingCard.innerHTML = `
                <div class="perk-header">
                    <div class="perk-name">${housingInfo.emoji} ${housingInfo.name}</div>
                    <div class="perk-status">Animals: ${count}/${housingInfo.maxAnimals}</div>
                </div>
                <div class="perk-description">${housingInfo.description}</div>
            `;
            if (count < housingInfo.maxAnimals) {
                const buyBtn = document.createElement('button');
                buyBtn.className = 'action-button';
                buyBtn.textContent = `Buy ${animalInfo.name} (${animalInfo.cost.gold} gold)`;
                buyBtn.disabled = playerData.gold < animalInfo.cost.gold;
                buyBtn.onclick = () => buyFarmAnimal(animalType);
                housingCard.appendChild(buyBtn);
            }
            // Show passive production rate per hour
            const prodRates = [];
            const cycleMs = animalInfo.intervalMs;
            if (Array.isArray(animalInfo.produces)) {
                animalInfo.produces.forEach((produce, idx) => {
                    const interval = Array.isArray(cycleMs) ? cycleMs[idx] : cycleMs;
                    const qtyRange = Array.isArray(animalInfo.quantity[idx]) ? animalInfo.quantity[idx] : animalInfo.quantity[idx];
                    const avgQty = (qtyRange[0] + qtyRange[1]) / 2;
                    const perHour = avgQty * (3600000 / interval) * count;
                    prodRates.push(`${formatNumber(perHour)} ${produce}/hr`);
                });
            } else {
                const interval = cycleMs;
                const qtyRange = animalInfo.quantity;
                const avgQty = (qtyRange[0] + qtyRange[1]) / 2;
                const perHour = avgQty * (3600000 / interval) * count;
                prodRates.push(`${formatNumber(perHour)} ${animalInfo.produces}/hr`);
            }
            const prodDiv = document.createElement('div');
            prodDiv.className = 'perk-production';
            prodDiv.innerHTML = `<strong>Production:</strong> ${prodRates.join(', ')}`;
            housingCard.appendChild(prodDiv);
        } else {
            // Not built: show build housing UI
            housingCard.innerHTML = `
                <div class="perk-header">
                    <div class="perk-name">${housingInfo.emoji} ${housingInfo.name}</div>
                </div>
                <div class="perk-description">${housingInfo.description}</div>
                <div class="perk-cost">Cost:
                    <ul class="resource-list">
                        ${Object.entries(housingInfo.cost).map(([res, amt]) => {
                            const have = res === 'gold' ? playerData.gold : (playerData.inventory[res] || 0);
                            const status = have >= amt ? 'enough' : 'missing';
                            return `<li>${amt} ${res} (<span class=\"have ${status}\">Have: ${have}</span>)</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
            const buildBtn = document.createElement('button');
            buildBtn.className = 'action-button';
            buildBtn.textContent = `Build ${housingInfo.name}`;
            let canAfford = true;
            for (const [res, amt] of Object.entries(housingInfo.cost)) {
                if (res === 'gold' ? playerData.gold < amt : (playerData.inventory[res]||0) < amt) {
                    canAfford = false;
                    break;
                }
            }
            buildBtn.disabled = !canAfford;
            buildBtn.onclick = () => buildFarmAnimalHousing(housingId);
            housingCard.appendChild(buildBtn);
        }
        animalContainer.appendChild(housingCard);
    }
}

/**
 * Render all content in the farming section
 */
export function renderFarmContent() {
    const farmUnlockStatusDiv = document.getElementById('farm-unlock-status');
    const farmPlotsContainer = document.getElementById('farm-plots-container');
    const farmActivitiesContainer = document.getElementById('farm-activities-container');

    if (!playerData.built_structures?.farmLand) {
        if (farmUnlockStatusDiv) {
            farmUnlockStatusDiv.textContent = "Build 'Farm Land' from the 'Build Structures' menu to unlock farming activities.";
            farmUnlockStatusDiv.classList.add("inactive");
        }
        if (farmPlotsContainer) farmPlotsContainer.innerHTML = "";
        if (farmActivitiesContainer) farmActivitiesContainer.innerHTML = "";
        return;
    }
    
    if (farmUnlockStatusDiv) {
        // Show only if no plots or housing built
        const hasHousing = Object.values(playerData.farm_animal_housing || {}).some(h => h.built);
        const hasPlots = Object.values(playerData.farm_crop_plots || {}).some(p => p.built);
        if (hasHousing || hasPlots) {
            farmUnlockStatusDiv.style.display = 'none';
        } else {
            farmUnlockStatusDiv.style.display = 'block';
            farmUnlockStatusDiv.textContent = "Your farm is ready! Construct animal pens and crop plots to begin.";
            farmUnlockStatusDiv.classList.remove("inactive");
        }
    }

    renderFarmPlots();
    renderFarmWorkers();
}

/**
 * Render the farm plots section showing animal housing
 */
export function renderFarmPlots() {
    const farmPlotsContainer = document.getElementById('farm-plots-container');
    if (!farmPlotsContainer) return;
    
    // Only render crop plots under Crops tab
    farmPlotsContainer.innerHTML = '';
    // Add Crop Plots section
    renderCropPlots();
}

/**
 * Render the crop plots section
 */
function renderCropPlots() {
    const farmPlotsContainer = document.getElementById('farm-plots-container');
    if (!farmPlotsContainer) return;
    
    // Clear previous content and add header
    farmPlotsContainer.innerHTML = '';
    const cropHeader = document.createElement('h3');
    cropHeader.textContent = 'Crop Plots';
    cropHeader.style.marginTop = '20px';
    farmPlotsContainer.appendChild(cropHeader);
    
    // Show build button only if no instance exists for each type
    for (const plotType in FARM_CROP_PLOT_DATA) {
        const info = FARM_CROP_PLOT_DATA[plotType];
        const count = Object.values(playerData.farm_crop_plots || {})
            .filter(p => p && p.built && p.plotType === plotType).length;
        if (count === 0) {
            const card = document.createElement('div');
            card.className = `perk-item-card item-card-tier ${info.tier}`;
            card.innerHTML = `
            <div class="perk-card-header">
                    <span class="perk-name">${info.name} ${info.emoji}</span>
            </div>
                <div class="perk-description">${info.description}</div>
                <div class="perk-cost">Cost:
                    <ul class="resource-list">
                        ${Object.entries(info.cost).map(([res, amt]) => {
                            const have = res === 'gold' ? playerData.gold : (playerData.inventory[res] || 0);
                            const status = have >= amt ? 'enough' : 'missing';
                            return `<li>${amt} ${res} (<span class='have ${status}'>Have: ${have}</span>)</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
            const btn = document.createElement('button');
            btn.className = 'action-button';
            btn.textContent = `Build ${info.name}`;
            btn.disabled = !Object.entries(info.cost).every(([res,amt]) =>
                res==='gold' ? playerData.gold>=amt : (playerData.inventory[res]||0)>=amt
            );
            btn.onclick = () => buildCropPlot(plotType);
            card.appendChild(btn);
            farmPlotsContainer.appendChild(card);
        }
    }

    // Render seed slots for all built plots
    renderCropPlotSlots();
}

/**
 * Render individual crop plot slots that have been built
 */
function renderCropPlotSlots() {
    const farmPlotsContainer = document.getElementById('farm-plots-container');
    if (!farmPlotsContainer) return;
    if (!playerData.farm_crop_plots || Object.keys(playerData.farm_crop_plots).length === 0) return;
    const container = document.createElement('div');
    container.className = 'active-plots-container';
    Object.entries(playerData.farm_crop_plots).forEach(([plotId, plot]) => {
        if (!plot.built) return;
        const info = FARM_CROP_PLOT_DATA[plot.plotType];
        const slotCount = info.slotCount || 0;
        const plotSlot = document.createElement('div');
        // Tag for timer lookup
        plotSlot.setAttribute('data-plot-id', plotId);
        plotSlot.className = `crop-plot-slot item-card-tier ${info.tier}`;
        plotSlot.style.minWidth = '200px';
        plotSlot.style.padding = '10px';
        plotSlot.style.border = '1px solid #ccc';
        plotSlot.style.borderRadius = '5px';
        // Header
        plotSlot.innerHTML = `<div class="plot-header"><span class="plot-name">${info.name} ${info.emoji}</span></div>`;
        // Timer display for this plot
        const timerEl = document.createElement('div');
        timerEl.className = 'plot-timer';
        // Append timer into the header for top-right placement
        const headerEl = plotSlot.querySelector('.plot-header');
        if (headerEl) headerEl.appendChild(timerEl);
        // Seed slots display
        plot.slots = plot.slots || [];
        const slots = plot.slots;
        const slotContainer = document.createElement('div');
        slotContainer.className = 'plot-slots';
        if (slots.length === 0) {
            // No seeds: offer buy seeds
            const status = document.createElement('div');
            status.className = 'plot-status';
            status.textContent = `Seeds: 0/${slotCount}`;
            plotSlot.appendChild(status);
            const buyBtn = document.createElement('button');
            buyBtn.className = 'action-button';
            buyBtn.textContent = `Buy Seeds`;
            buyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                buyPlotSeeds(plotId);
            });
            plotSlot.appendChild(buyBtn);
        } else {
            // Show each slot emoji
            slots.forEach((slot, idx) => {
                const sd = SEED_DATA[slot.seedType];
                // Extract pure seed emoji (sd.emoji contains produce+seed)
                const seedIcon = Array.from(sd.emoji).pop() || sd.emoji;
                // Show produce emoji when ready, otherwise show seed only
                const icon = slot.isReady
                    ? (CROP_ITEMS[sd.crop]?.emoji || seedIcon)
                    : seedIcon;
                const span = document.createElement('span');
                span.className = 'crop-slot-icon';
                span.textContent = icon;
                // Only attach harvest click when ready
                if (slot.isReady) {
                    span.style.cursor = 'pointer';
                    span.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Harvest this slot via harvestPlot
                        harvestPlot(plotId);
                    });
                }
                // Randomly select a movement pattern for added variety
                const patterns = ['moveAround','moveZigzag','moveBounce','moveDrift'];
                span.style.animationName = patterns[Math.floor(Math.random() * patterns.length)];
                slotContainer.appendChild(span);
            });
            // Placeholders
            for (let i = slots.length; i < slotCount; i++) {
                const ph = document.createElement('span');
                ph.className = 'crop-slot-placeholder';
                ph.textContent = '▫️';
                slotContainer.appendChild(ph);
            }
        }
        plotSlot.appendChild(slotContainer);
        // Only enable harvest click when at least one slot is ready
        if ((plot.slots || []).some(slot => slot.isReady)) {
            plotSlot.style.cursor = 'pointer';
            plotSlot.addEventListener('click', () => harvestPlot(plotId));
        }
        container.appendChild(plotSlot);
    });
    farmPlotsContainer.appendChild(container);
}

/**
 * Build a crop plot
 * @param {string} plotType - Type of crop plot to build (e.g., "smallCropPlot")
 */
export function buildCropPlot(plotType) {
    const plotInfo = FARM_CROP_PLOT_DATA[plotType];
    if (!plotInfo) {
        logMessage(`Error: Unknown crop plot type '${plotType}'`, "fore-red");
        return;
    }
    
    // Check resources
    let canAfford = true;
    const missingResources = [];
    
    for (const [resource, amount] of Object.entries(plotInfo.cost)) {
        if (resource === "gold") {
            if (playerData.gold < amount) {
                canAfford = false;
                missingResources.push(`${amount - playerData.gold} more gold`);
            }
        } else if ((playerData.inventory[resource] || 0) < amount) {
            canAfford = false;
            missingResources.push(`${amount - (playerData.inventory[resource] || 0)} more ${resource}`);
        }
    }
    
    if (!canAfford) {
        logMessage(`Cannot build ${plotInfo.name}. You need ${missingResources.join(', ')}.`, "fore-red");
        return;
    }
    
    // Count how many plots of this type are built
    const existingPlots = Object.values(playerData.farm_crop_plots).filter(
        plot => plot && plot.built && plot.plotType === plotType
    ).length;
    
    if (existingPlots >= 3) {
        logMessage(`You cannot build more than 3 ${plotInfo.name}s.`, "fore-red");
        return;
    }
    
    // Deduct resources
    for (const [resource, amount] of Object.entries(plotInfo.cost)) {
        if (resource === "gold") {
            playerData.gold -= amount;
        } else {
            removeItemFromInventory(resource, amount);
        }
    }
    
    // Create new plot ID
    const plotId = `${plotType}_${existingPlots}`;
    
    // Initialize the plot
    playerData.farm_crop_plots[plotId] = {
        built: true,
        plotType: plotType,
        // Initialize empty seed slots
        slots: []
    };
    
    trackStatistic('progression', 'structureBuilt');
    logMessage(`${plotInfo.name} built! You can now plant crops here.`, "fore-green", plotInfo.emoji);
    
    // Grant farming XP for building crop plots (5000 XP - major one-time purchase)
    const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
    // Initialize farming skill if it doesn't exist
    if (!playerData.skills) playerData.skills = {};
    if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
    
    const xpGain = 5000;
    playerData.skills.farming.xp += xpGain;
    logMessage(`+${xpGain} Farming XP for building ${plotInfo.name}`, "fore-green", "🏗️");
    
    // Check for level up
    const newLevel = getLevelFromXp(playerData.skills.farming.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('farming', oldLevel, newLevel);
    }
    
    // Save and update
    savePlayerData();
    updateFarmingDisplay();
}

/**
 * Buy seeds for a plot
 * @param {string} plotId - ID of the plot to buy seeds for
 */
export function buyPlotSeeds(plotId) {
    const plot = playerData.farm_crop_plots[plotId];
    if (!plot || !plot.built) {
        logMessage("Invalid plot selected.", "fore-red");
        return;
    }
    const info = FARM_CROP_PLOT_DATA[plot.plotType];
    const slotCount = info.slotCount || 0;
    plot.slots = plot.slots || [];
    const toBuy = slotCount - plot.slots.length;
    if (toBuy <= 0) {
        logMessage(`${info.name} seed slots already filled.`, "fore-yellow");
        return;
    }
    // Determine random seeds and cost
    let totalCost = 0;
    const newSlots = [];
    for (let i = 0; i < toBuy; i++) {
        const rand = Math.random();
        let seedKey;
        if (rand < 0.5) seedKey = 'wheatSeeds';
        else if (rand < 0.7) seedKey = 'carrotSeeds';
        else if (rand < 0.85) seedKey = 'potatoSeeds';
        else seedKey = 'appleSapling';
        const seedData = SEED_DATA[seedKey];
        totalCost += seedData.sell_price;
        newSlots.push({ seedType: seedKey, plantTime: Date.now(), isReady: false });
    }
    if (playerData.gold < totalCost) {
        logMessage(`Not enough gold to buy seeds: need ${totalCost}g.`, "fore-red");
        return;
    }
    playerData.gold -= totalCost;
    // Store purchased seeds in farm storage for inventory tracking
    playerData.farm_storage = playerData.farm_storage || {};
    newSlots.forEach(slot => {
        const key = slot.seedType;
        playerData.farm_storage[key] = (playerData.farm_storage[key] || 0) + 1;
    });
    plot.slots = plot.slots.concat(newSlots);
    logMessage(`Bought ${toBuy} seeds for ${info.name} (${totalCost}g).`, "fore-green");
    savePlayerData();
    updateFarmingDisplay();
}

/**
 * Process crop growth for slot-based workflow
 * Checks each seed slot and marks it ready when growth time has elapsed.
 */
export function processCropGrowth() {
    let updated = false;
    // Determine crop managers and assigned workers
    const cropManagerAssigned = Boolean(playerData.farm_managers_roles?.crop);
    Object.entries(playerData.farm_crop_plots || {}).forEach(([plotId, plot]) => {
        if (!plot.built || !Array.isArray(plot.slots)) return;
        const info = FARM_CROP_PLOT_DATA[plot.plotType];
        // Count farmhands assigned to this plot
        const assignedWorkersCrop = Object.entries(playerData.farm_workers || {})
            .filter(([, w]) => w.assignedTo === plotId && w.type === 'farmhand').length;
        const cappedWorkersCrop = Math.min(assignedWorkersCrop, MAX_WORKERS_PER_HOUSING);
        plot.slots.forEach(slot => {
            if (!slot.isReady) {
                const sd = SEED_DATA[slot.seedType];
                if (sd) {
                    // Base grow time: at least 30 minutes or seed-defined
                    const baseGrow = Math.max(sd.growTimeMs, 30 * 60 * 1000);
                    // Effective wait time
                    const reducedGrow = baseGrow
                        - cappedWorkersCrop * WORKER_INTERVAL_REDUCTION
                        - (cropManagerAssigned ? MANAGER_INTERVAL_REDUCTION : 0);
                    const waitTime = Math.max(reducedGrow, MIN_INTERVAL_MS);
                    if (Date.now() - slot.plantTime >= waitTime) {
                        if (cropManagerAssigned) {
                            // Auto-harvest for manager
                            harvestPlot(plotId);
                        } else {
                            slot.isReady = true;
                            logMessage(`Your ${sd.name} in ${info.name} is ready to harvest!`, "fore-green", sd.emoji);
                        }
                        updated = true;
                    }
                }
            }
        });
    });
    if (updated) {
        savePlayerData();
        const farmingSection = document.getElementById('farming-section');
        if (farmingSection && farmingSection.style.display !== 'none') {
            updateFarmingDisplay();
        }
    }
}

/**
 * Harvest a crop plot, adding yields to storage and resetting slots.
 * @param {string} plotId - The ID of the crop plot.
 */
function harvestPlot(plotId) {
    const plot = playerData.farm_crop_plots[plotId];
    if (!plot?.built || !Array.isArray(plot.slots)) return;
    // Only harvest if at least one slot is ready
    if (!plot.slots.some(slot => slot.isReady)) return;
    // Determine yield range based on plot size
    let min = 1, max = 10;
    if (plot.plotType === 'mediumCropPlot') [min, max] = [2, 20];
    else if (plot.plotType === 'largeCropPlot') [min, max] = [3, 30];
    const harvestTotals = {};
    plot.slots.forEach(slot => {
        if (slot.isReady) {
            const cropKey = SEED_DATA[slot.seedType].crop;
            const count = Math.floor(Math.random() * (max - min + 1)) + min;
            harvestTotals[cropKey] = (harvestTotals[cropKey] || 0) + count;
        }
    });
    // Clear slots after harvesting
    plot.slots = [];
    // Ensure farm storage exists
    playerData.farm_storage = playerData.farm_storage || {};
    // Add yields to storage and notify
    let totalHarvested = 0;
    Object.entries(harvestTotals).forEach(([crop, qty]) => {
        playerData.farm_storage[crop] = (playerData.farm_storage[crop] || 0) + qty;
        totalHarvested += qty;
        const emoji = CROP_ITEMS[crop]?.emoji || '';
        logMessage(`Harvested ${qty} ${emoji} ${crop}!`, "fore-green", emoji);
    });
    
    // Grant farming XP based on crops harvested (2 XP per crop harvested)
    if (totalHarvested > 0) {
        const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
        // Initialize farming skill if it doesn't exist
        if (!playerData.skills) playerData.skills = {};
        if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
        
        const xpGain = totalHarvested * 2;
        playerData.skills.farming.xp += xpGain;
        logMessage(`+${xpGain} Farming XP`, "fore-green", "🌱");
        
        // Check for level up
        const newLevel = getLevelFromXp(playerData.skills.farming.xp);
        if (newLevel > oldLevel) {
            handleLevelUp('farming', oldLevel, newLevel);
        }
    }
    
    savePlayerData();
    updateFarmingDisplay();
}

/**
 * Build a farm animal housing structure
 * @param {string} housingId - The ID of the housing to build
 */
export function buildFarmAnimalHousing(housingId) {
    const housingInfo = FARM_ANIMAL_HOUSING_DATA[housingId];
    if (!housingInfo) {
        logMessage(`Error: Unknown housing type '${housingId}'`, "fore-red");
        return;
    }
    
    // Check if already built
    if (playerData.farm_animal_housing?.[housingId]?.built) {
        logMessage(`You've already built a ${housingInfo.name}!`, "fore-yellow");
        return;
    }
    
    // Check resources
    let canAfford = true;
    const missingResources = [];
    
    for (const [resource, amount] of Object.entries(housingInfo.cost)) {
        if (resource === "gold") {
            if (playerData.gold < amount) {
                canAfford = false;
                missingResources.push(`${amount - playerData.gold} more gold`);
            }
        } else if ((playerData.inventory[resource] || 0) < amount) {
            canAfford = false;
            missingResources.push(`${amount - (playerData.inventory[resource] || 0)} more ${resource}`);
        }
    }
    
    if (!canAfford) {
        logMessage(`Cannot build ${housingInfo.name}. You need ${missingResources.join(', ')}.`, "fore-red");
        return;
    }
    
    // Deduct resources
    for (const [resource, amount] of Object.entries(housingInfo.cost)) {
        if (resource === "gold") {
            playerData.gold -= amount;
        } else {
            removeItemFromInventory(resource, amount);
        }
    }
    
    // Initialize housing data if not already
    if (!playerData.farm_animal_housing) {
        playerData.farm_animal_housing = {};
    }
    
    // Mark as built
    playerData.farm_animal_housing[housingId] = { 
        built: true, 
        animals: 0, 
        lastProductionTime: 0
    };
    
    trackStatistic('progression', 'structureBuilt');
    logMessage(`${housingInfo.name} built! You can now raise animals here.`, "fore-green", housingInfo.emoji);
    
    // Grant farming XP for building housing (8000 XP - major one-time purchase)
    const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
    // Initialize farming skill if it doesn't exist
    if (!playerData.skills) playerData.skills = {};
    if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
    
    const xpGain = 8000;
    playerData.skills.farming.xp += xpGain;
    logMessage(`+${xpGain} Farming XP for building ${housingInfo.name}`, "fore-green", "🏗️");
    
    // Check for level up
    const newLevel = getLevelFromXp(playerData.skills.farming.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('farming', oldLevel, newLevel);
    }
    
    // Save and update
    savePlayerData();
    updateFarmingDisplay();
    // Immediately refresh animal management view if active
    try { updateAnimalDisplay(); } catch (e) {}
}

/**
 * Buy a farm animal
 * @param {string} animalType - The type of animal to buy
 */
export function buyFarmAnimal(animalType) {
    const animalInfo = FARM_ANIMAL_DATA[animalType];
    if (!animalInfo) {
        logMessage(`Error: Unknown animal type '${animalType}'`, "fore-red");
        return;
    }
    
    const housingId = animalInfo.housingId;
    const housing = playerData.farm_animal_housing?.[housingId];
    
    // Check if housing exists and is built
    if (!housing?.built) {
        logMessage(`You need to build a ${FARM_ANIMAL_HOUSING_DATA[housingId]?.name || housingId} first!`, "fore-red");
        return;
    }
    
    // Check if housing is full
    const maxAnimals = FARM_ANIMAL_HOUSING_DATA[housingId].maxAnimals;
    if (housing.animals >= maxAnimals) {
        logMessage(`Your ${FARM_ANIMAL_HOUSING_DATA[housingId].name} is already at maximum capacity (${maxAnimals} animals).`, "fore-yellow");
        return;
    }
    
    // Check gold
    if (playerData.gold < animalInfo.cost.gold) {
        logMessage(`You need ${animalInfo.cost.gold} gold to buy a ${animalInfo.name}.`, "fore-red");
        return;
    }
    
    // Deduct gold
    playerData.gold -= animalInfo.cost.gold;
    
    // Add animal
    housing.animals++;
    
    // Initialize production time if first animal
    if (housing.animals === 1) {
        if (Array.isArray(animalInfo.produces)) {
            housing.lastProductionTime = {};
            animalInfo.produces.forEach((product, index) => {
                housing.lastProductionTime[product] = Date.now();
            });
        } else {
            housing.lastProductionTime = Date.now();
        }
    }
    
    logMessage(`You bought a ${animalInfo.name}! It has been added to your ${FARM_ANIMAL_HOUSING_DATA[housingId].name}.`, "fore-green", animalInfo.emoji);
    
    // Grant farming XP for buying animals (2000 XP - limited purchases per housing)
    const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
    // Initialize farming skill if it doesn't exist
    if (!playerData.skills) playerData.skills = {};
    if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
    
    const xpGain = 2000;
    playerData.skills.farming.xp += xpGain;
    logMessage(`+${xpGain} Farming XP for buying ${animalInfo.name}`, "fore-green", "🐾");
    
    // Check for level up
    const newLevel = getLevelFromXp(playerData.skills.farming.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('farming', oldLevel, newLevel);
    }
    
    // Save and update
    savePlayerData();
    updateFarmingDisplay();
    // Immediately refresh animal management view if active
    try { updateAnimalDisplay(); } catch (e) {}
}

/**
 * Process animal production to generate resources
 */
export function processAnimalProduction() {
    if (!playerData.farm_animal_housing) return;
    // Manager yield boost multiplier
    const animalManagerAssigned = Boolean(playerData.farm_managers_roles?.animal);
    const yieldMultiplier = animalManagerAssigned ? (1 + (FARM_WORKER_DATA.farm_manager.yield_boost_value || 0)) : 1;
    const totalProduced = {};
    // Iterate each housing with animals
    Object.entries(playerData.farm_animal_housing).forEach(([housingId, state]) => {
        if (state.built && state.animals > 0) {
            const animalType = Object.keys(FARM_ANIMAL_DATA)
                .find(key => FARM_ANIMAL_DATA[key].housingId === housingId);
            const info = FARM_ANIMAL_DATA[animalType];
            const count = state.animals;
            // Determine assigned farmhands
            const assignedWorkers = Object.entries(playerData.farm_workers || {})
                .filter(([, w]) => w.assignedTo === housingId && w.type === 'farmhand').length;
            const cappedWorkers = Math.min(assignedWorkers, MAX_WORKERS_PER_HOUSING);
            // Normalize to arrays
            const products = Array.isArray(info.produces) ? info.produces : [info.produces];
            const intervals = Array.isArray(info.intervalMs) ? info.intervalMs : [info.intervalMs];
            const quantities = Array.isArray(info.quantity[0]) ? info.quantity : [info.quantity];
            products.forEach((prod, idx) => {
                // Compute effective interval based on workers and manager
                const baseInterval = intervals[idx] || intervals[0];
                const reduced = baseInterval
                    - cappedWorkers * WORKER_INTERVAL_REDUCTION
                    - (animalManagerAssigned ? MANAGER_INTERVAL_REDUCTION : 0);
                const effectiveInterval = Math.max(reduced, MIN_INTERVAL_MS);
                const qtyRange = quantities[idx] || quantities[0];
                const avgQty = Array.isArray(qtyRange)
                    ? (qtyRange[0] + qtyRange[1]) / 2
                    : qtyRange;
                // Compute per-hour then per-10min tick using effective interval and yield multiplier
                const perHour = avgQty * (3600000 / effectiveInterval) * count * yieldMultiplier;
                const perTick = Math.floor(perHour / 6);
                playerData.farm_storage = playerData.farm_storage || {};
                playerData.farm_storage[prod] = (playerData.farm_storage[prod] || 0) + perTick;
                totalProduced[prod] = (totalProduced[prod] || 0) + perTick;
            });
        }
    });
    // Log each 10min tick and grant XP
    if (Object.keys(totalProduced).length > 0) {
        const parts = Object.entries(totalProduced)
            .map(([p, amt]) => `${formatNumber(amt)} ${p}`);
        logMessage(`Farm production tick: ${parts.join(', ')}`, "success");
        
        // Grant farming XP based on items produced (1 XP per 2 items produced, minimum 1 XP)
        const totalItems = Object.values(totalProduced).reduce((sum, amt) => sum + amt, 0);
        if (totalItems > 0) {
            const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
            // Initialize farming skill if it doesn't exist
            if (!playerData.skills) playerData.skills = {};
            if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
            
            const xpGain = Math.max(1, Math.floor(totalItems / 2));
            playerData.skills.farming.xp += xpGain;
            logMessage(`+${xpGain} Farming XP from animal production`, "fore-green", "🐄");
            
            // Check for level up
            const newLevel = getLevelFromXp(playerData.skills.farming.xp);
            if (newLevel > oldLevel) {
                handleLevelUp('farming', oldLevel, newLevel);
            }
        }
        
        savePlayerData();
        renderFarmStorage();
    }
}

/**
 * Render the farm workers section
 */
export function renderFarmWorkers() {
    const farmActivitiesContainer = document.getElementById('farm-activities-container');
    if (!farmActivitiesContainer) return;
    // Inject containers
    farmActivitiesContainer.innerHTML = `
        <h3>Farm Workers</h3>
        <div id="farm-workers-container"></div>
        <div id="hire-workers-container"></div>
        <div id="worker-assignment-container"></div>
        <div id="no-workers-notice"></div>
        <div class="farm-worker-info">
            Upkeep: <span id="total-upkeep-cost"></span>g &nbsp;|
            Next: <span id="next-payment-time"></span>
        </div>
    `;
    // Scope selectors
    const workersContainer = farmActivitiesContainer.querySelector('#farm-workers-container');
    const hireContainer = farmActivitiesContainer.querySelector('#hire-workers-container');
    const assignmentContainer = farmActivitiesContainer.querySelector('#worker-assignment-container');
    const noWorkersNotice = farmActivitiesContainer.querySelector('#no-workers-notice');
    const upkeepCostEl = farmActivitiesContainer.querySelector('#total-upkeep-cost');
    const nextPaymentEl = farmActivitiesContainer.querySelector('#next-payment-time');

    // Clear old content
    workersContainer.innerHTML = '';
    hireContainer.innerHTML = '';
    assignmentContainer.innerHTML = '';
    
    const hasWorkers = playerData.farm_workers && Object.keys(playerData.farm_workers).length > 0;
    if (noWorkersNotice) noWorkersNotice.style.display = hasWorkers ? 'none' : 'block';
    
    if (hasWorkers) {
        // Calculate total hourly upkeep
        let totalUpkeep = 0;
        Object.entries(playerData.farm_workers).forEach(([id, w]) => {
            const info = FARM_WORKER_DATA[w.type]; if (!info) return;
            if (w.status === 'active') totalUpkeep += info.hourly_upkeep;
            // Build worker card
            const statusClass = w.status === 'active' ? 'status-active' : w.status === 'unpaid' ? 'status-unpaid' : 'status-idle';
            const assignedName = w.assignedTo && FARM_ANIMAL_HOUSING_DATA[w.assignedTo]
                ? FARM_ANIMAL_HOUSING_DATA[w.assignedTo].name
                : w.assignedTo && playerData.farm_crop_plots[w.assignedTo]
                    ? FARM_CROP_PLOT_DATA[playerData.farm_crop_plots[w.assignedTo].plotType].name
                    : 'Idle';
            const workerEl = document.createElement('div');
            workerEl.className = `worker-card ${statusClass}`;
            workerEl.innerHTML = `
                <div class="worker-header">
                    <span class="worker-emoji">${info.emoji}</span>
                    <span class="worker-name">${info.name}</span>
                    <span class="status-text ${statusClass}">${w.status.toUpperCase()}</span>
                </div>
                <div class="worker-assignment">Assigned: ${assignedName}</div>
                <div class="worker-dates">Hired: ${new Date(w.hiredTime).toLocaleString()}</div>
                <div class="worker-actions">
                    ${w.status === 'idle' && w.type === 'farmhand' ? '<button class="assign-btn">Assign</button>' : ''}
                    ${w.status === 'idle' && w.type === 'farm_manager' ? '<button class="assign-animal-btn">Animal Overseer</button><button class="assign-crop-btn">Crop Overseer</button>' : ''}
                    <button class="fire-btn">Fire</button>
                </div>`;
            workersContainer.appendChild(workerEl);
            // Attach event handlers
            if (w.status === 'idle' && w.type === 'farmhand') {
                workerEl.querySelector('.assign-btn').addEventListener('click', () => showAssignmentModal(id));
            }
            if (w.status === 'idle' && w.type === 'farm_manager') {
                workerEl.querySelector('.assign-animal-btn').addEventListener('click', () => assignManager(id, 'animal_manager'));
                workerEl.querySelector('.assign-crop-btn').addEventListener('click', () => assignManager(id, 'crop_manager'));
            }
            workerEl.querySelector('.fire-btn').addEventListener('click', () => fireWorker(id));
        });
        if (upkeepCostEl) upkeepCostEl.textContent = formatNumber(totalUpkeep);
        // Next hourly payment countdown
        if (nextPaymentEl && playerData.last_farm_worker_payment) {
            const nextPayment = playerData.last_farm_worker_payment + ONE_HOUR_MS;
            const timeLeft = nextPayment - Date.now();
            if (timeLeft > 0) {
                const hrs = Math.floor(timeLeft / ONE_HOUR_MS);
                const mins = Math.floor((timeLeft % ONE_HOUR_MS) / (60*1000));
                nextPaymentEl.textContent = `${hrs}h:${mins.toString().padStart(2,'0')}m`;
            } else nextPaymentEl.textContent = 'Due';
        }
        // Show assignment info for animals
        if (playerData.farm_animals && Object.keys(playerData.farm_animals).length > 0) {
            const assignmentHeader = document.createElement('p');
            assignmentHeader.textContent = 'Workers are automatically assigned to animals based on their skills.';
            assignmentContainer.appendChild(assignmentHeader);
            Object.entries(playerData.farm_animals).forEach(([animalType, count]) => {
                if (count > 0 && FARM_ANIMAL_DATA[animalType]) {
                    const animal = FARM_ANIMAL_DATA[animalType];
                    const assignedWorkers = calculateAssignedWorkers(animalType);
                    const assignmentEl = document.createElement('div');
                    assignmentEl.className = 'assignment-option';
                    assignmentEl.innerHTML = `
                        <div>${animal.emoji} ${animal.name} (${count})</div>
                        <div>Workers Assigned: ${assignedWorkers}</div>`;
                    assignmentContainer.appendChild(assignmentEl);
                }
            });
        } else {
            assignmentContainer.innerHTML = '<p>You need to have animals before assigning workers.</p>';
        }
    }
    // Available worker types to hire
    Object.entries(FARM_WORKER_DATA).forEach(([type, info]) => {
        const card = document.createElement('div');
        card.className = 'worker-card';
        // Add type-specific class for styling (farmhand or farm_manager)
        card.classList.add(type);
        const numHired = Object.values(playerData.farm_workers || {}).filter(w=>w.type===type).length;
        const cost = info.base_hire_cost + numHired * info.hire_cost_increment;
        card.innerHTML = `
            <div class="worker-header">
                <span class="worker-emoji">${info.emoji}</span>
                <h4>${info.name}</h4>
                </div>
            <div class="worker-description">${info.description}</div>
            <div class="hire-cost">Hire Cost: ${formatNumber(cost)} gold</div>
            <div class="upkeep-cost">Hourly Upkeep: ${formatNumber(info.hourly_upkeep)} gold</div>
            <button class="hire-worker-btn">Hire (${formatNumber(cost)}g)</button>`;
        const btn = card.querySelector('.hire-worker-btn');
        if (playerData.gold < cost) btn.disabled = true;
        // Disable hire button if at cap
        if ((type === 'farmhand' && numHired >= 15) || (type === 'farm_manager' && numHired >= info.max_managers)) {
            btn.disabled = true;
            btn.textContent = type === 'farmhand' ? 'Max Farmhands' : 'Max Managers';
        }
        btn.addEventListener('click', () => hireWorker(type));
        hireContainer.appendChild(card);
    });
    // No need for setupWorkerActionListeners now
}

/**
 * Hire a new farm worker
 * @param {string} workerType - The type of worker to hire
 */
function hireWorker(workerType) {
    const info = FARM_WORKER_DATA[workerType]; if (!info) return logMessage("Invalid worker type.","error");
    const now = Date.now();
    const count = Object.values(playerData.farm_workers || {}).filter(w=>w.type===workerType).length;
    // Enforce maximum hires
    if (workerType === 'farmhand' && count >= 15) {
        return logMessage("You cannot hire more than 15 farmhands.", "error");
    }
    if (workerType === 'farm_manager' && count >= info.max_managers) {
        return logMessage(`You cannot hire more than ${info.max_managers} farm managers.`, "error");
    }
    const cost = info.base_hire_cost + count * info.hire_cost_increment;
    if (playerData.gold < cost) return logMessage(`Not enough gold (${cost} needed).`,"error");
    if (!playerData.farm_workers) playerData.farm_workers = {};
    const id = `${workerType}_${now}`;
    playerData.farm_workers[id] = {
        id, type: workerType, status: 'idle', hiredTime: now, lastPaidTime: now, assignedTo: null, role: null
    };
    playerData.gold -= cost;
    logMessage(`Hired a ${info.name}.`,"success");
    
    // Grant farming XP for hiring workers (3000 XP for farmhand, 5000 XP for manager)
    const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
    // Initialize farming skill if it doesn't exist
    if (!playerData.skills) playerData.skills = {};
    if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
    
    const xpGain = workerType === 'farm_manager' ? 5000 : 3000;
    playerData.skills.farming.xp += xpGain;
    logMessage(`+${xpGain} Farming XP for hiring ${info.name}`, "fore-green", "👷");
    
    // Check for level up
    const newLevel = getLevelFromXp(playerData.skills.farming.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('farming', oldLevel, newLevel);
    }
    
    savePlayerData();
    updateFarmWorkerUi();
}

/**
 * Fire a farm worker
 * @param {string} workerId - The type of worker to fire
 */
function fireWorker(workerId) {
    if (!playerData.farm_workers || !playerData.farm_workers[workerId]) {
        return logMessage("Worker not found.", "error");
    }
    // Preserve worker data for role cleanup
    const w = playerData.farm_workers[workerId];
    const info = FARM_WORKER_DATA[w.type];
    // Remove the worker
    delete playerData.farm_workers[workerId];
    // Clear manager role if needed
    if (info && info.type === 'farm_manager' && w.role) {
        const key = w.role === 'animal_manager' ? 'animal' : 'crop';
        playerData.farm_managers_roles[key] = null;
    }
    logMessage(`Fired ${info.name}.`, "success");
    savePlayerData();
    updateFarmWorkerUi();
}

// Assign a farm manager to a global role
function assignManager(workerId, roleType) {
    const w = playerData.farm_workers[workerId];
    if (!w) return logMessage("Worker not found.", "error");
    const roleKey = roleType === 'animal_manager' ? 'animal' : 'crop';
    playerData.farm_managers_roles = playerData.farm_managers_roles || { animal: null, crop: null };
    if (playerData.farm_managers_roles[roleKey]) {
        return logMessage(`There is already a ${roleKey} manager.`, "error");
    }
    w.role = roleType;
    w.status = 'active';
    playerData.farm_managers_roles[roleKey] = workerId;
    
    // Grant farming XP for assigning manager to role (1000 XP)
    const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
    // Initialize farming skill if it doesn't exist
    if (!playerData.skills) playerData.skills = {};
    if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
    
    const xpGain = 1000;
    playerData.skills.farming.xp += xpGain;
    logMessage(`+${xpGain} Farming XP for assigning manager to ${roleKey} role`, "fore-green", "📋");
    
    // Check for level up
    const newLevel = getLevelFromXp(playerData.skills.farming.xp);
    if (newLevel > oldLevel) {
        handleLevelUp('farming', oldLevel, newLevel);
    }
    
    savePlayerData();
    updateFarmWorkerUi();
}

/**
 * Process farm worker payments
 * This is called periodically to check if workers need to be paid
 */
function processFarmWorkerPayments() {
    if (!playerData.farm_workers || Object.keys(playerData.farm_workers).length === 0) {
        return; // No workers to pay
    }
    
    // Check if it's time to pay workers
    const now = Date.now();
    const lastPayment = playerData.last_farm_worker_payment || now;
    const timeSinceLastPayment = now - lastPayment;
    
    if (timeSinceLastPayment >= FARM_WORKER_PAYMENT_INTERVAL) {
        // Calculate the total upkeep cost
        let totalUpkeep = 0;
        
        Object.entries(playerData.farm_workers).forEach(([workerType, count]) => {
            if (count > 0 && FARM_WORKER_DATA[workerType]) {
                totalUpkeep += FARM_WORKER_DATA[workerType].upkeep_cost.gold * count;
            }
        });
        
        // Check if player has enough gold
        if (playerData.gold < totalUpkeep) {
            // Can't pay workers - they leave
            logMessage("You couldn't pay your farm workers, so they left!", "error");
            playerData.farm_workers = {}; // All workers leave
        } else {
            // Pay workers
            playerData.gold -= totalUpkeep;
            logMessage(`You paid your farm workers ${formatNumber(totalUpkeep)} gold.`, "success");
        }
        
        // Update the last payment time
        playerData.last_farm_worker_payment = now;
        savePlayerData();
    }
}

/**
 * Calculate the total production bonus from all farm workers
 * @returns {number} - The production bonus multiplier (1.0 = no bonus)
 */
function calculateFarmWorkerProductionBonus() {
    if (!playerData.farm_workers || Object.keys(playerData.farm_workers).length === 0) {
        return 1.0; // No bonus if no workers
    }
    
    let totalBonus = 0;
    
    Object.entries(playerData.farm_workers).forEach(([workerType, count]) => {
        if (count > 0 && FARM_WORKER_DATA[workerType]) {
            totalBonus += FARM_WORKER_DATA[workerType].production_bonus * count;
        }
    });
    
    // Return the bonus as a multiplier (e.g., 0.5 bonus becomes 1.5 multiplier)
    return 1.0 + totalBonus;
}

/**
 * Update the farm worker UI
 */
function updateFarmWorkerUi() {
    // Re-render the Farm Workers section to reflect any changes
    renderFarmWorkers();
}

/**
 * Calculate how many workers are assigned to a specific animal type
 * @param {string} animalType - The type of animal
 * @returns {number} - The number of workers assigned
 */
function calculateAssignedWorkers(animalType) {
    if (!playerData.farm_workers || Object.keys(playerData.farm_workers).length === 0) {
        return 0;
    }
    
    // This is a simplified version. In a real implementation, you might have a more complex assignment algorithm
    let totalAssigned = 0;
    const animalCount = playerData.farm_animals[animalType] || 0;
    
    Object.entries(playerData.farm_workers).forEach(([workerType, count]) => {
        if (count > 0 && FARM_WORKER_DATA[workerType]) {
            const worker = FARM_WORKER_DATA[workerType];
            // Only count workers with animal care skills
            if (worker.skills.animal_care > 0) {
                // Calculate how many of this type of worker are assigned to this animal type
                const maxAnimals = worker.max_animals_per_worker;
                // Simple proportion-based assignment
                const portion = animalCount / getTotalAnimalCount();
                const workersNeeded = Math.ceil(animalCount / maxAnimals);
                const workersAvailable = Math.min(count, workersNeeded);
                
                totalAssigned += Math.floor(workersAvailable * portion);
            }
        }
    });
    
    return totalAssigned;
}

/**
 * Get the total count of all animals
 * @returns {number} - Total number of animals
 */
function getTotalAnimalCount() {
    if (!playerData.farm_animals) return 0;
    
    return Object.values(playerData.farm_animals).reduce((total, count) => total + count, 0);
}

/**
 * Set up event listeners for worker action buttons
 */
function setupWorkerActionListeners() {
    // Fire worker buttons are set up in updateFarmWorkerUi function
}

/**
 * Get farm efficiency status
 * @returns {boolean} - Whether workers are sufficient for the number of animals
 */
function canWorkersManageAnimals() {
    // Count total animals
    let totalAnimals = getTotalAnimalCount();
    
    // Count total animal capacity workers can handle
    let totalCapacity = 0;
    for (const workerId in playerData.farm_workers) {
        if (playerData.farm_workers[workerId] > 0) {
            totalCapacity += playerData.farm_workers[workerId] * FARM_WORKER_DATA[workerId].max_animals_per_worker;
        }
    }
    
    // Workers can manage animals if they have enough capacity
    return totalCapacity >= totalAnimals;
}

/**
 * Render the farming overview with summary stats and navigation
 */
export function renderFarmOverview() {
    const overview = document.getElementById('overview-content');
    if (!overview) return;
    // Clear old content
    overview.innerHTML = '';
    // Hired Workers Overview
    const hwoDiv = document.createElement('div'); hwoDiv.id = 'hired-workers-overview';
    ['Idle Workers','Animal Workers','Crop Workers'].forEach(sec=>{
        const d=document.createElement('div'); d.className='hwo-section';
        const h=document.createElement('h4'); h.textContent=sec; d.appendChild(h);
        hwoDiv.appendChild(d);
    });
    overview.appendChild(hwoDiv);
    populateHiredWorkersOverview();
    // Add Farm Manager icons into section headers
    const managers = playerData.farm_managers_roles || {};
    // Animal Manager in section 2
    if (managers.animal) {
        const animalHeader = hwoDiv.querySelector('.hwo-section:nth-child(2) h4');
        const worker = playerData.farm_workers[managers.animal];
        if (animalHeader && worker) {
            const info = FARM_WORKER_DATA[worker.type];
            const span = document.createElement('span');
            span.className = 'worker-emoji manager-emoji';
            span.textContent = info.emoji;
            span.title = 'Animal Manager';
            animalHeader.appendChild(span);
        }
    }
    // Crop Manager in section 3
    if (managers.crop) {
        const cropHeader = hwoDiv.querySelector('.hwo-section:nth-child(3) h4');
        const worker = playerData.farm_workers[managers.crop];
        if (cropHeader && worker) {
            const info = FARM_WORKER_DATA[worker.type];
            const span = document.createElement('span');
            span.className = 'worker-emoji manager-emoji';
            span.textContent = info.emoji;
            span.title = 'Crop Manager';
            cropHeader.appendChild(span);
        }
    }
    // Create farm overview map
    const mapDiv = document.createElement('div');
    mapDiv.id = 'farm-map';
    mapDiv.className = 'farm-overview-map';
    // Render animal pens
    const animalHousing = playerData.farm_animal_housing || {};
    Object.entries(FARM_ANIMAL_HOUSING_DATA).forEach(([id, info]) => {
        const state = animalHousing[id];
        const tile = document.createElement('div');
        tile.className = 'farm-tile pen-tile';
        if (state?.built) tile.classList.add('built');
        // Add chicken coup specific class for targeted styling
        if (id === 'chickenCoup') tile.classList.add('chicken-coup');
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = info.name;
        tile.appendChild(label);
        const content = document.createElement('div');
        content.className = 'tile-content';
        if (state?.built) {
            const animalType = Object.keys(FARM_ANIMAL_DATA).find(a => FARM_ANIMAL_DATA[a].housingId === id);
            const emoji = FARM_ANIMAL_DATA[animalType]?.emoji || '';
            for (let i = 0; i < (state.animals || 0); i++) {
                const span = document.createElement('span');
                span.className = 'tile-animal';
                span.textContent = emoji;
                // Randomize each animal's animation timing and movement offsets
                const duration = (4 + Math.random() * 4).toFixed(2) + 's';
                const delay = (Math.random() * 2).toFixed(2) + 's';
                // Larger random offsets within tile (±50px) and rotation (±20deg)
                const dx = (Math.random() * 100 - 50).toFixed(2) + 'px';
                const dy = (Math.random() * 100 - 50).toFixed(2) + 'px';
                const angle = (Math.random() * 40 - 20).toFixed(2) + 'deg';
                span.style.setProperty('--duration', duration);
                span.style.setProperty('--delay', delay);
                span.style.setProperty('--dx', dx);
                span.style.setProperty('--dy', dy);
                span.style.setProperty('--angle', angle);
                // Randomly select a movement pattern for added variety
                const patterns = ['moveAround','moveZigzag','moveBounce','moveDrift'];
                span.style.animationName = patterns[Math.floor(Math.random() * patterns.length)];
                content.appendChild(span);
            }
        }
        tile.appendChild(content);
        if (state?.built) {
            // Only show farmhands assigned to this pen
            const assignedWorkers = Object.entries(playerData.farm_workers || {}).filter(([_, w]) => w.status === 'active' && w.type === 'farmhand' && w.assignedTo === id);
            if (assignedWorkers.length) {
                const indicatorDiv = document.createElement('div');
                indicatorDiv.className = 'worker-indicator';
                assignedWorkers.forEach(([_, w]) => {
                    const span = document.createElement('span');
                    span.textContent = FARM_WORKER_DATA[w.type].emoji;
                    indicatorDiv.appendChild(span);
                });
                tile.appendChild(indicatorDiv);
            }
        }
        // Dynamic tooltip with interval and yield info
        if (state?.built) {
            // Determine animal and its production info
            const animalType = Object.keys(FARM_ANIMAL_DATA).find(key => FARM_ANIMAL_DATA[key].housingId === id);
            const animalInfo = FARM_ANIMAL_DATA[animalType];
            // Count farmhands assigned
            const assignedWorkers = Object.entries(playerData.farm_workers || {})
                .filter(([_, w]) => w.status === 'active' && w.type === 'farmhand' && w.assignedTo === id).length;
            const animalManagerAssigned = Boolean(playerData.farm_managers_roles?.animal);
            // Compute effective interval
            const baseInterval = animalInfo.intervalMs;
            const effectiveInterval = Math.max(
                baseInterval
                - Math.min(assignedWorkers, MAX_WORKERS_PER_HOUSING) * WORKER_INTERVAL_REDUCTION
                - (animalManagerAssigned ? MANAGER_INTERVAL_REDUCTION : 0),
                MIN_INTERVAL_MS
            );
            // Compute yields
            const qtyRange = animalInfo.quantity;
            const avgQty = (qtyRange[0] + qtyRange[1]) / 2;
            const yieldPerCycle = avgQty * (animalManagerAssigned ? (1 + (FARM_WORKER_DATA.farm_manager.yield_boost_value || 0)) : 1);
            const perHour = yieldPerCycle * (3600000 / effectiveInterval) * state.animals;
            // Custom formatted tooltip for animal pens
            tile.addEventListener('click', () => harvestPlot(id));
            const tooltipText = `<div class="tooltip-desc">${animalInfo.name} (${state.animals}/${FARM_ANIMAL_HOUSING_DATA[id].maxAnimals})</div>
<div class="tooltip-sources"><strong>Details:</strong><br>
Workers: ${assignedWorkers}<br>
Manager: ${animalManagerAssigned ? 'Yes' : 'No'}<br>
Interval: ${(effectiveInterval/60000).toFixed(1)} min<br>
Yield/cycle: ${avgQty} ${animalInfo.produces}<br>
Yield/hr: ${perHour.toFixed(1)} ${animalInfo.produces}
</div>`;
            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'custom-tooltip-text';
            tooltipSpan.innerHTML = tooltipText;
            tile.appendChild(tooltipSpan);
        } else {
            tile.title = 'Not built. Click to build.';
        }
        mapDiv.appendChild(tile);
    });
    // Render crop plots
    const cropPlots = playerData.farm_crop_plots || {};
    Object.entries(FARM_CROP_PLOT_DATA).forEach(([plotType, info]) => {
        const stateEntry = Object.entries(cropPlots).find(([_, p]) => p.plotType === plotType);
        const built = !!stateEntry;
        const state = stateEntry ? stateEntry[1] : null;
        const tile = document.createElement('div');
        // Force crop plots onto the second row of the grid
        tile.style.gridRowStart = '2';
        tile.className = 'farm-tile plot-tile';
        // Enlarge tile by plot type for visibility
        if (plotType === 'mediumCropPlot') {
            tile.style.minWidth = '200px';
        } else if (plotType === 'largeCropPlot') {
            tile.style.minWidth = '300px';
        }
        if (built) tile.classList.add('built');
        const label = document.createElement('div');
        label.className = 'tile-label';
        // Show seed slot counts for built plots
        if (built && state && typeof info.slotCount === 'number') {
            const seedCount = (state.slots || []).length;
            label.textContent = `${info.name} (${seedCount}/${info.slotCount} seeds)`;
        } else {
            label.textContent = info.name;
        }
        // Append the label so the title is visible
        tile.appendChild(label);
        const content = document.createElement('div');
        content.className = 'tile-content';
        // Append content now so tooltip overlays it
        tile.appendChild(content);
        // Show seed and crop emojis for each slot, with placeholders for empty slots
        if (built && state && Array.isArray(state.slots)) {
            const slots = state.slots;
            slots.forEach((slot, idx) => {
                const sd = SEED_DATA[slot.seedType];
                // Extract pure seed emoji (sd.emoji contains produce+seed)
                const seedIcon = Array.from(sd.emoji).pop() || sd.emoji;
                // Show produce emoji when ready, otherwise show seed only
                const icon = slot.isReady
                    ? (CROP_ITEMS[sd.crop]?.emoji || seedIcon)
                    : seedIcon;
                const span = document.createElement('span');
                span.textContent = icon;
                // Only attach harvest click when ready
                if (slot.isReady) {
                    span.style.cursor = 'pointer';
                    span.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Harvest this slot via harvestPlot
                        harvestPlot(plotId);
                    });
                }
                // Randomly select a movement pattern for added variety
                const patterns = ['moveAround','moveZigzag','moveBounce','moveDrift'];
                span.style.animationName = patterns[Math.floor(Math.random() * patterns.length)];
                content.appendChild(span);
                // Break rows of 4 icons
                if ((idx + 1) % 4 === 0) content.appendChild(document.createElement('br'));
            });
            const slotCount = info.slotCount || 0;
            for (let i = slots.length; i < slotCount; i++) {
                const placeholder = document.createElement('span');
                placeholder.textContent = '▫️';
                content.appendChild(placeholder);
                if (((i + 1) % 4) === 0) content.appendChild(document.createElement('br'));
            }
        }
        if (built) {
            // Variables for custom formatted tooltip for crop plots
            const plotId = stateEntry[0];
            const assignedWorkersCrop = Object.entries(playerData.farm_workers || {})
                .filter(([_, w]) => w.status === 'active' && w.type === 'farmhand' && w.assignedTo === plotId);
            const cropManagerAssigned = Boolean(playerData.farm_managers_roles?.crop);
            // Collect yield ranges for each crop type present in slots
            const cropYields = {};
            (state.slots || []).forEach(slot => {
                const data = SEED_DATA[slot.seedType] || {};
                if (data.crop) cropYields[data.crop] = data.yieldRange || [0, 0];
            });
            const yieldStrings = Object.entries(cropYields)
                .map(([crop, range]) => `${range[0]}-${range[1]} ${crop}`)
                .join(', ');
            // Compute grow time with worker and manager effects (based on first slot)
            const firstData = SEED_DATA[state.slots?.[0]?.seedType] || {};
            const baseGrow = Math.max(firstData.growTimeMs || 0, 30 * 60 * 1000);
            const effectiveGrow = Math.max(
                baseGrow
                - Math.min(assignedWorkersCrop.length, MAX_WORKERS_PER_HOUSING) * WORKER_INTERVAL_REDUCTION
                - (cropManagerAssigned ? MANAGER_INTERVAL_REDUCTION : 0),
                MIN_INTERVAL_MS
            );
            // Only allow overview harvest click when at least one crop is ready
            if ((state.slots || []).some(slot => slot.isReady)) {
                tile.style.cursor = 'pointer';
                tile.addEventListener('click', () => harvestPlot(plotId));
            }
            const tooltipText = `<div class="tooltip-desc">${info.name}</div>
<div class="tooltip-sources"><strong>Details:</strong><br>
Slots: ${info.slotCount}<br>
Workers: ${assignedWorkersCrop.length}<br>
Manager: ${cropManagerAssigned ? 'Yes' : 'No'}<br>
Grow time: ${(effectiveGrow/60000).toFixed(1)} min<br>
Yield/harvest: ${yieldStrings}
</div>`;            
            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'custom-tooltip-text';
            tooltipSpan.innerHTML = tooltipText;
            tile.appendChild(tooltipSpan);
            // Show farmhands assigned to this crop plot
            if (assignedWorkersCrop.length) {
                const indicatorDiv = document.createElement('div');
                indicatorDiv.className = 'worker-indicator';
                assignedWorkersCrop.forEach(([_, w]) => {
                    const span = document.createElement('span');
                    span.textContent = FARM_WORKER_DATA[w.type].emoji;
                    indicatorDiv.appendChild(span);
                });
                tile.appendChild(indicatorDiv);
            }
        } else {
            tile.title = 'Not built. Click to build.';
        }
        mapDiv.appendChild(tile);
    });
    // Add map to overview
    overview.appendChild(mapDiv);
}

/**
 * Render the farm storage contents
 */
function renderFarmStorage() {
    const storageContainer = document.getElementById('storage-content');
    if (!storageContainer) return;
    const storage = playerData.farm_storage || {};
    // Calculate total value of farm storage
    let totalValue = 0;
    Object.entries(storage).forEach(([item, qty]) => {
        const sellPrice = ITEM_SELL_PRICES[item] || (getItemDetails(item)?.sell_price || 0);
        totalValue += sellPrice * qty;
    });
    // Build header and grid container
    storageContainer.innerHTML = `
        <div class="inventory-header">
            <div class="inventory-stats">
                <span class="inventory-value fore-gold">Total Value: ${formatNumber(totalValue)}g</span>
            </div>
        </div>
        <div id="farm-storage-grid" class="inventory-grid"></div>
    `;
    // Populate items in grid
    const grid = document.getElementById('farm-storage-grid');
    if (!grid) return;
    if (Object.keys(storage).length === 0) {
        grid.innerHTML = '<p>No resources in farm storage.</p>';
    } else {
        Object.entries(storage).forEach(([item, qty]) => {
            const details = getItemDetails(item) || {};
            const sellPrice = ITEM_SELL_PRICES[item] || details.sell_price || 0;
            const totalItemValue = sellPrice * qty;
            // Create item card similar to inventory
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item item-card-tier';
            const tierClass = details.tier || TIERS.COMMON;
            itemDiv.classList.add(tierClass);
            const emoji = details.emoji || '📦';
            const name = details.name ? titleCase(details.name) : titleCase(item);
            itemDiv.innerHTML = `
                <div class="item-icon">${emoji}</div>
                <div class="item-info">
                    <div class="item-name">${name}</div>
                    <div class="item-quantity">x${qty}</div>
                    <div class="item-details">
                        <span class="item-value fore-gold">🪙 ${sellPrice} each</span>
                        <span class="item-total-value fore-gold">(${formatNumber(totalItemValue)} total)</span>
                    </div>
                </div>
            `;
            grid.appendChild(itemDiv);
        });
    }
}

// Add hourly farm worker processing
const ONE_HOUR_MS = 60 * 60 * 1000;
export function processFarmHourlyTasks() {
    const now = Date.now();
    let updated = false;
    Object.entries(playerData.farm_workers || {}).forEach(([workerId, worker]) => {
        if (worker.status !== 'active') return;
        if (!worker.lastPaidTime) worker.lastPaidTime = now;
        if (now - worker.lastPaidTime >= ONE_HOUR_MS) {
            const upkeep = (worker.type === 'farmhand'
                ? FARM_WORKER_DATA.farmhand.hourly_upkeep
                : FARM_WORKER_DATA.farm_manager.hourly_upkeep);
            if (playerData.gold >= upkeep) {
                playerData.gold -= upkeep;
                worker.lastPaidTime = now;
            } else {
                worker.status = 'unpaid';
                worker.assignedTo = null;
                if (worker.type === 'farm_manager' && worker.role) {
                    playerData.farm_managers_roles[worker.role === 'animal_manager' ? 'animal' : 'crop'] = null;
                    worker.role = null;
                }
                logMessage(`Worker ${workerId} unpaid and is now unavailable.`, 'fore-red');
            }
            updated = true;
        }
    });
    if (updated) {
        savePlayerData();
    }
}

function createAssignmentModal() {
    if (document.getElementById('assignment-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'assignment-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-button">&times;</span>
        <h3>Assign Farmhand</h3>
        <div id="assignment-list"></div>
      </div>`;
    document.body.appendChild(modal);
    // Click outside or on close to hide
    modal.addEventListener('click', e => { if (e.target === modal) hideAssignmentModal(); });
    modal.querySelector('.close-button').addEventListener('click', hideAssignmentModal);
}

function showAssignmentModal(workerId) {
    createAssignmentModal();
    currentAssignmentWorkerId = workerId;
    const modal = document.getElementById('assignment-modal');
    const list = document.getElementById('assignment-list');
    list.innerHTML = '';
    // Populate animal housings
    Object.entries(playerData.farm_animal_housing || {}).forEach(([id, state]) => {
        if (state.built) {
            const info = FARM_ANIMAL_HOUSING_DATA[id];
            const card = document.createElement('div');
            card.className = 'structure-card';
            card.textContent = `${info.emoji} ${info.name}`;
            card.onclick = () => {
                const w = playerData.farm_workers[currentAssignmentWorkerId];
                w.assignedTo = id;
                w.status = 'active';
                
                // Grant farming XP for assigning farmhand to animal housing (500 XP)
                const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
                // Initialize farming skill if it doesn't exist
                if (!playerData.skills) playerData.skills = {};
                if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
                
                const xpGain = 500;
                playerData.skills.farming.xp += xpGain;
                logMessage(`+${xpGain} Farming XP for assigning farmhand to ${info.name}`, "fore-green", "🐾");
                
                // Check for level up
                const newLevel = getLevelFromXp(playerData.skills.farming.xp);
                if (newLevel > oldLevel) {
                    handleLevelUp('farming', oldLevel, newLevel);
                }
                
                savePlayerData();
                // Update overview and workers tab
                populateHiredWorkersOverview();
                updateFarmWorkerUi();
                hideAssignmentModal();
            };
            list.appendChild(card);
        }
    });
    // Populate crop plots
    Object.entries(playerData.farm_crop_plots || {}).forEach(([plotId, plot]) => {
        if (plot.built) {
            const info = FARM_CROP_PLOT_DATA[plot.plotType];
            const card = document.createElement('div');
            card.className = 'structure-card';
            card.textContent = `${info.emoji} ${info.name}`;
            card.onclick = () => {
                const w = playerData.farm_workers[currentAssignmentWorkerId];
                w.assignedTo = plotId;
                w.status = 'active';
                
                // Grant farming XP for assigning farmhand to crop plot (500 XP)
                const oldLevel = getLevelFromXp(playerData.skills?.farming?.xp || 0);
                // Initialize farming skill if it doesn't exist
                if (!playerData.skills) playerData.skills = {};
                if (!playerData.skills.farming) playerData.skills.farming = { xp: 0, is_active: true };
                
                const xpGain = 500;
                playerData.skills.farming.xp += xpGain;
                logMessage(`+${xpGain} Farming XP for assigning farmhand to ${info.name}`, "fore-green", "🌱");
                
                // Check for level up
                const newLevel = getLevelFromXp(playerData.skills.farming.xp);
                if (newLevel > oldLevel) {
                    handleLevelUp('farming', oldLevel, newLevel);
                }
                
                savePlayerData();
                // Update overview and workers tab
                populateHiredWorkersOverview();
                updateFarmWorkerUi();
                hideAssignmentModal();
            };
            list.appendChild(card);
        }
    });
    modal.style.display = 'flex';
}

function hideAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    if (modal) modal.style.display = 'none';
    currentAssignmentWorkerId = null;
}

// Helper: format milliseconds to MM:SS
function formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Update countdown timers for crop plots
function updateCropTimers() {
    // Auto-harvest or mark ready when slots complete
    const cropManagerAssigned = Boolean(playerData.farm_managers_roles?.crop);
    const plotsChanged = new Set();
    Object.entries(playerData.farm_crop_plots || {}).forEach(([plotId, plot]) => {
        if (!plot.built || !Array.isArray(plot.slots)) return;
        plot.slots.forEach(slot => {
            if (!slot.isReady) {
                const sd = SEED_DATA[slot.seedType];
                if (!sd) return;
                // Compute effective grow time with workers and manager
                const baseGrow = Math.max(sd.growTimeMs, 30 * 60 * 1000);
                const workerCount = Object.entries(playerData.farm_workers || {}).filter(([, w]) =>
                    w.status === 'active' && w.type === 'farmhand' && w.assignedTo === plotId
                ).length;
                const reducedGrow = baseGrow
                    - Math.min(workerCount, MAX_WORKERS_PER_HOUSING) * WORKER_INTERVAL_REDUCTION
                    - (cropManagerAssigned ? MANAGER_INTERVAL_REDUCTION : 0);
                const wait = Math.max(reducedGrow, MIN_INTERVAL_MS);
                if (Date.now() - slot.plantTime >= wait) {
                    if (cropManagerAssigned) {
                        // Manager auto-harvest
                        harvestPlot(plotId);
                        // Auto-buy seeds after a brief delay, ONLY if the plot is not already full
                        const currentPlot = playerData.farm_crop_plots[plotId];
                        const info = FARM_CROP_PLOT_DATA[currentPlot.plotType];
                        const slotCount = info.slotCount || 0;
                        if ((currentPlot.slots || []).length < slotCount) {
                            setTimeout(() => buyPlotSeeds(plotId), 3000);
                        }
                    } else {
                        slot.isReady = true;
                    }
                    plotsChanged.add(plotId);
                }
            }
        });
    });
    if (plotsChanged.size > 0) {
        savePlayerData();
        updateFarmingDisplay();
    }
    // Update timer text for all plots
    Object.entries(playerData.farm_crop_plots || {}).forEach(([plotId, plot]) => {
        const el = document.querySelector(`.crop-plot-slot[data-plot-id="${plotId}"] .plot-timer`);
        if (!el) return;
        if (!plot.slots || plot.slots.length === 0) {
            el.textContent = '';
        } else {
            let minTimeLeft = Infinity;
            plot.slots.forEach(slot => {
                if (!slot.isReady) {
                    const sd = SEED_DATA[slot.seedType]; if (!sd) return;
                    const baseGrow = Math.max(sd.growTimeMs, 30 * 60 * 1000);
                    const workerCount = Object.entries(playerData.farm_workers || {}).filter(([, w]) =>
                        w.status === 'active' && w.type === 'farmhand' && w.assignedTo === plotId
                    ).length;
                    const reducedGrow = baseGrow
                        - Math.min(workerCount, MAX_WORKERS_PER_HOUSING) * WORKER_INTERVAL_REDUCTION
                        - (cropManagerAssigned ? MANAGER_INTERVAL_REDUCTION : 0);
                    const wait = Math.max(reducedGrow, MIN_INTERVAL_MS);
                    const elapsed = Date.now() - slot.plantTime;
                    const left = wait - elapsed;
                    if (left > 0 && left < minTimeLeft) minTimeLeft = left;
                }
            });
            el.textContent = minTimeLeft === Infinity ? 'Ready!' : formatTime(minTimeLeft);
        }
    });
} 
