/**
 * main.js - Main entry point for RuneText
 * Handles initialization, UI setup, and binds menus and actions
 */

'use strict';

// Import necessary functions from other modules
import { updateHud, showSection, initGameUi } from './ui.js';
import { 
    playerData,
    loadPlayerData, 
    savePlayerData, 
    exportSaveData, 
    handleImportFile,
    confirmResetGame,
    resetGame,
    applyCheat,
    toggleMute,
    logMessage,
    cleanupCorruptedEnchantments
} from './utils.js';

// Import functions from other modules
import { showCharacterSection } from './characterinfo.js';
import { showInventorySection, setupInventoryEvents } from './inventory.js';
import { showActionsMenu } from './actions.js';
import { showPerkTreeSection } from './perks.js';
import { showShopSection } from './shop.js';
import { showBuildStructuresMenu, initRentCollection, initWaterCollection } from './builds.js';
import { showGuildMenu, initGuildIntervals, isGuildHallUnlocked } from './guild.js';
import { initializeAchievements, showAchievementsMenu } from './achievements.js';
import { showBlacksmithingMenu, showSmeltingMenu, showSmithingMenu } from './blacksmithing.js';
import { showWoodcutting } from './woodcutting.js';
import { showMining } from './mining.js';
import { showCooking } from './cooking.js';
import { showCombat } from './combat.js';
import { showFarmingMenu, initFarmingModule, processAnimalProduction, processCropGrowth, processFarmHourlyTasks } from './farming.js';
import { showEnchantingMenu } from './enchanting.js';

// Global constants
const ANIMAL_PRODUCTION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours for animal production cycle
const MINUTE_MS = 60 * 1000;
const CROP_GROWTH_CHECK_INTERVAL = 1 * 60 * 1000; // Check crop growth every minute

// Game variables
let gameInterval = null;
let animalProductionInterval = null;
let cropGrowthInterval = null;

/**
 * Initialize the game
 * Set up player data, event listeners, UI
 */
function initGame() {
    // Debug the main menu visibility
    const mainMenuSection = document.getElementById('main-menu-section');
    if (mainMenuSection) {
        // Force the section to be visible - remove any problematic classes
        mainMenuSection.classList.remove('hidden');
        mainMenuSection.style.display = 'block';
        console.log('Main menu section found and made visible');
    } else {
        console.error('Main menu section element not found in DOM!');
    }
    
    // Make sure main menu is displayed first before loading data (prevents UI errors)
    showSection('main-menu-section');
    
    // Load saved data
    loadPlayerData();
    
    // Clean up any corrupted enchantment data
    cleanupCorruptedEnchantments();
    
    // Set up UI elements and event listeners
    initGameUi();
    setupInventoryEvents(); // Setup inventory specific events
    
    // Initialize achievements system
    initializeAchievements();
    
    // Add this line to wire up blacksmithing buttons
    if (typeof setupBlacksmithingEvents === 'function') {
        setupBlacksmithingEvents();
    }
    
    // Update HUD with player data (after data is loaded)
    updateHud();
    
    // Make sure main menu is displayed (redundant but safe)
    showSection('main-menu-section');
    
    // Set up main menu events (back buttons, etc.)
    setupMainMenuEvents();
    setupDungeoneeringEvents();
    
    // Initialize farming module (tab events, overview render)
    initFarmingModule();
    
    // Initialize water collection from well
    initWaterCollection();
    
    // Initialize dungeoneering
    import('./dungeoneering.js').then(module => {
        module.initDungeoneering();
        module.checkDungeoneeringUnlock();
    });
    
    // Start intervals for recurring game mechanics
    startGameIntervals();
    
    // Display welcome message in game log
    logMessage("Welcome to RuneText-2! Kill chickens cook their meat sell for profit! --> Buy pickaxe --> mining --> smelt bars --> smith a weapon, TAKE YOUR REVENGE ON CHICKENS! <-- Revenge I say!", "fore-gold", "🎮");
}

/**
 * Start game intervals for various game mechanics
 */
function startGameIntervals() {
    // Clear any existing intervals
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    if (animalProductionInterval) {
        clearInterval(animalProductionInterval);
    }
    
    if (cropGrowthInterval) {
        clearInterval(cropGrowthInterval);
    }
    
    // Set up minute-based interval for general game updates
    gameInterval = setInterval(() => {
        // Game updates that happen every minute
        savePlayerData();
    }, MINUTE_MS);
    
    // Set up farm production interval - process every 10 minutes
    animalProductionInterval = setInterval(() => {
        processAnimalProduction();
        savePlayerData();
    }, 10 * MINUTE_MS); // every 10 minutes
    
    // Set up crop growth interval - check every minute
    cropGrowthInterval = setInterval(() => {
        processCropGrowth();
    }, CROP_GROWTH_CHECK_INTERVAL);
    
    // Set up hourly farm worker tasks
    const FARM_HOURLY_TASK_INTERVAL = 60 * 60 * 1000; // 1 hour
    const farmHourlyInterval = setInterval(() => {
        processFarmHourlyTasks();
        savePlayerData();
    }, FARM_HOURLY_TASK_INTERVAL);
    
    // Start guild member task ticking
    initGuildIntervals();
    
    console.log('Game intervals started');
}

/**
 * Sets up the top control buttons event listeners (save, load, mute)
 */
function setupTopControlsEvents() {
    // Save/Load/Import buttons are now handled in the settings modal (ui.js)
    
    // Mute toggle button
    const muteToggleBtn = document.getElementById('mute-toggle-btn');
    if (muteToggleBtn) {
        muteToggleBtn.addEventListener('click', toggleMute);
    }
}

/**
 * Sets up the main game UI and initializes all event listeners
 */
export function setupMainMenuEvents() {
    console.log('Setting up main menu events');

    // Setup top controls first (save, load, mute)
    setupTopControlsEvents();
    
    // Main menu buttons
    const menuButtons = {
        'character-menu-button': showCharacterSection,
        'inventory-menu-button': showInventorySection, 
        'actions-menu-button': showActionsMenu,
        'perks-menu-button': showPerkTreeSection,
        'shop-menu-button': showShopSection,
        'build-structures-menu-button': showBuildStructuresMenu,
        'achievements-menu-button': showAchievementsMenu,
        'guild-hall-town-button': () => {
            if (isGuildHallUnlocked()) {
                showGuildMenu();
            } else {
                logMessage('Guild Hall is locked. Requires all skills at level 35 (except Enchanting and Farming).', 'fore-red', '🔒');
            }
        },
        'farm-menu-town-button': showFarmingMenu
    };
    
    // Add event listeners to main menu buttons
    for (const [buttonId, handler] of Object.entries(menuButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            // Remove any existing listeners by cloning the node
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the event listener to the new button
            newButton.addEventListener('click', handler);
            console.log(`Added event listener to ${buttonId}`);
        } else {
            console.warn(`Button with ID '${buttonId}' not found`);
        }
    }
    
    // Make guild hall button visible if it's hidden
    const guildButton = document.getElementById('guild-hall-town-button');
    if (guildButton && guildButton.classList.contains('hidden')) {
        guildButton.classList.remove('hidden');
    }
    
    // Add event listeners for game controls
    const exportSaveButton = document.getElementById('export-save-button');
    if (exportSaveButton) {
        exportSaveButton.addEventListener('click', exportSaveData);
    }
    
    const importSaveButton = document.getElementById('import-save-button');
    if (importSaveButton) {
        importSaveButton.addEventListener('click', () => {
            const fileInput = document.getElementById('import-save-file');
            if (fileInput) {
                fileInput.click();
            }
        });
    }
    
    const importSaveFile = document.getElementById('import-save-file');
    if (importSaveFile) {
        importSaveFile.addEventListener('change', handleImportFile);
    }
    
    // Reset game and confirmation modal
    const resetGameButton = document.getElementById('reset-game-button');
    if (resetGameButton) {
        resetGameButton.addEventListener('click', confirmResetGame);
    }
    
    // Reset confirmation modal buttons
    const resetConfirmYes = document.getElementById('reset-confirm-yes');
    if (resetConfirmYes) {
        resetConfirmYes.addEventListener('click', () => {
            resetGame();
        });
    }
    
    const resetConfirmNo = document.getElementById('reset-confirm-no');
    if (resetConfirmNo) {
        resetConfirmNo.addEventListener('click', () => {
            const modal = document.getElementById('reset-confirm-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    // Cheat code buttons
    const cheatButton = document.getElementById('cheat-button');
    if (cheatButton) {
        cheatButton.addEventListener('click', () => {
            const cheatCode = prompt('Enter cheat code:');
            if (cheatCode) {
                applyCheat(cheatCode);
            }
        });
    }
    
    const applyCheatButton = document.getElementById('button-apply-cheat');
    if (applyCheatButton) {
        applyCheatButton.addEventListener('click', () => {
            const cheatInput = document.getElementById('cheat-input');
            if (cheatInput && cheatInput.value) {
                applyCheat(cheatInput.value);
                cheatInput.value = '';
            }
        });
    }
    
    // Make sure main menu is visible
    showSection('main-menu-section');

    // Initialize section-specific event handlers
    setupCharacterEvents();
    setupPerkTreeEvents();
    setupShopEvents();
    setupBuildStructuresEvents();
    setupBlacksmithingEvents();
    setupActionsMenuEvents();
    setupFarmingEvents();
    setupEnchantingEvents();
}

/**
 * Sets up event listeners for the character section
 */
function setupCharacterEvents() {
    // Back button
    const characterBackButton = document.getElementById('character-back-button');
    if (characterBackButton) {
        characterBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Sets up event listeners for the perk tree section
 */
function setupPerkTreeEvents() {
    // Back button
    const perkTreeBackButton = document.getElementById('perk-tree-back-button');
    if (perkTreeBackButton) {
        perkTreeBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    // Ripple effect on click, like finger in pond
    const perkMockup = document.querySelector('.perk-tree-mockup');
    if (perkMockup) {
        perkMockup.addEventListener('click', (e) => {
            const rect = perkMockup.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('div');
            ripple.classList.add('perk-ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            perkMockup.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }
}

/**
 * Sets up event listeners for the shop section
 */
function setupShopEvents() {
    // The shop section doesn't have explicit elements in HTML yet
    // This would be filled in when the shop UI is fully implemented
    const shopBackButton = document.getElementById('shop-back-button');
    if (shopBackButton) {
        shopBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Sets up event listeners for the build structures section
 */
function setupBuildStructuresEvents() {
    // Back button
    const buildStructuresBackButton = document.getElementById('build-structures-back-button');
    if (buildStructuresBackButton) {
        buildStructuresBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Sets up event listeners for the blacksmithing section
 */
function setupBlacksmithingEvents() {
    const smeltingButton = document.getElementById('smelting-button');
    if (smeltingButton) {
        smeltingButton.addEventListener('click', showSmeltingMenu);
    }
    
    const smithingButton = document.getElementById('smithing-button');
    if (smithingButton) {
        smithingButton.addEventListener('click', showSmithingMenu);
    }
    
    const backButton = document.getElementById('blacksmithing-back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Sets up event listeners for buttons in the actions menu
 */
function setupActionsMenuEvents() {
    // Action menu back button
    const actionsBackButton = document.getElementById('actions-back-button');
    if (actionsBackButton) {
        actionsBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    // Action buttons
    const combatButton = document.getElementById('combat-menu-button');
    if (combatButton) {
        combatButton.addEventListener('click', () => showCombat());
    }
    
    const woodcuttingButton = document.getElementById('woodcutting-menu-button');
    if (woodcuttingButton) {
        woodcuttingButton.addEventListener('click', () => showWoodcutting());
    }
    
    const miningButton = document.getElementById('mining-menu-button');
    if (miningButton) {
        miningButton.addEventListener('click', () => showMining());
    }
    
    const cookingButton = document.getElementById('cooking-menu-button');
    if (cookingButton) {
        cookingButton.addEventListener('click', () => showCooking());
    }
    
    const blacksmithingMenuButton = document.getElementById('blacksmithing-menu-button');
    if (blacksmithingMenuButton) {
        blacksmithingMenuButton.addEventListener('click', () => showBlacksmithingMenu());
    }
    
    const enchantingButton = document.getElementById('enchanting-menu-button');
    if (enchantingButton) {
        enchantingButton.addEventListener('click', () => showEnchantingMenu());
    }
    
    // Farming action button
    const farmingMenuActionButton = document.getElementById('farming-menu-action-button');
    if (farmingMenuActionButton) {
        farmingMenuActionButton.addEventListener('click', () => showFarmingMenu());
    }
}

/**
 * Sets up event listeners for the dungeoneering section
 */
function setupDungeoneeringEvents() {
    // Dungeoneering menu back button
    const dungeoneeringBackButton = document.getElementById('dungeoneering-back-button');
    if (dungeoneeringBackButton) {
        dungeoneeringBackButton.addEventListener('click', () => {
            showCombat();
        });
    }
    
    // Dungeoneering footer back button
    const dungeoneeringFooterBackButton = document.getElementById('dungeoneering-footer-back-btn');
    if (dungeoneeringFooterBackButton) {
        dungeoneeringFooterBackButton.addEventListener('click', () => {
            showCombat();
        });
    }
}

/**
 * Sets up event listeners for the farming section
 */
function setupFarmingEvents() {
    // Header back button
    const farmingBackButton = document.getElementById('farming-back-button');
    if (farmingBackButton) {
        farmingBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    // Footer back button
    const farmingFooterBackButton = document.getElementById('farming-footer-back-btn');
    if (farmingFooterBackButton) {
        farmingFooterBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Sets up event listeners for the enchanting section
 */
function setupEnchantingEvents() {
    // Header back button
    const enchantingBackButton = document.getElementById('enchanting-back-button');
    if (enchantingBackButton) {
        enchantingBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    // Footer back button
    const enchantingFooterBackButton = document.getElementById('enchanting-footer-back-btn');
    if (enchantingFooterBackButton) {
        enchantingFooterBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    // Choice buttons for enchantment selection
    const cancelButton = document.getElementById('enchanting-cancel-btn');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (typeof window.cancelEnchantmentPreview === 'function') {
                window.cancelEnchantmentPreview();
            }
        });
    }
    
    const enchantButton = document.getElementById('enchanting-perform-btn');
    if (enchantButton) {
        enchantButton.addEventListener('click', () => {
            if (typeof window.performEnchantment === 'function') {
                window.performEnchantment();
            }
        });
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame); 
