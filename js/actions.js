/**
 * actions.js - Actions menu module for RuneText
 * Handles the actions menu and navigation to skill activities
 */

'use strict';

import { playerData } from './utils.js';
import { showSection } from './ui.js';
import { showBlacksmithingMenu, stopAutoSmelting, stopAutoSmithing } from './blacksmithing.js';
import { showWoodcutting, stopAutoWoodcutting } from './woodcutting.js';
import { showMining, stopAutoMining } from './mining.js';
import { showCooking, stopAutoCooking } from './cooking.js';
import { showCombat, stopAutoAttack, stopCombatAndReturn } from './combat.js';
import { showFarmingMenu } from './farming.js';
import { showEnchantingMenu } from './enchanting.js';

/**
 * Show the actions menu section
 */
export function showActionsMenu() {
    // Stop any ongoing activities before showing the actions menu
    stopAllAutoActions();
    
    // Show the actions menu section
    showSection('actions-menu-section');
}

/**
 * Stop all automatic actions that might be in progress
 */
export function stopAllAutoActions() {
    stopAutoAttack();
    stopAutoWoodcutting();
    stopAutoMining();
    stopAutoCooking();
    stopAutoSmelting();
    stopAutoSmithing();
}

/**
 * Show the woodcutting section
 * @param {boolean} skipStop - Skip stopping auto actions
 */
export function showWoodcuttingSection(skipStop = false) {
    showWoodcutting(skipStop);
}

/**
 * Show the mining section
 * @param {boolean} skipStop - Skip stopping auto actions
 */
export function showMiningSection(skipStop = false) {
    showMining(skipStop);
}

/**
 * Show the cooking section
 * @param {boolean} skipStop - Skip stopping auto actions
 */
export function showCookingSection(skipStop = false) {
    showCooking(skipStop);
}

/**
 * Show the combat section
 * @param {boolean} skipStop - Skip stopping auto actions
 */
export function showCombatSection(skipStop = false) {
    showCombat(skipStop);
}

/**
 * Show the enchanting section
 */
export function showEnchantingSection() {
    showEnchantingMenu();
}

/**
 * Initialize actions module
 * Set up event listeners for action buttons
 */
function initActionsModule() {
    // Set up event listeners for action buttons
    const woodcuttingButton = document.getElementById('woodcutting-menu-button');
    if (woodcuttingButton) {
        woodcuttingButton.addEventListener('click', () => showWoodcuttingSection());
    }
    
    const miningButton = document.getElementById('mining-menu-button');
    if (miningButton) {
        miningButton.addEventListener('click', () => showMiningSection());
    }
    
    const cookingButton = document.getElementById('cooking-menu-button');
    if (cookingButton) {
        cookingButton.addEventListener('click', () => showCookingSection());
    }
    
    const combatButton = document.getElementById('combat-menu-button');
    if (combatButton) {
        combatButton.addEventListener('click', () => showCombatSection());
    }
    
    const blacksmithingButton = document.getElementById('blacksmithing-menu-button');
    if (blacksmithingButton) {
        blacksmithingButton.addEventListener('click', showBlacksmithingMenu);
    }
    
    const farmingButton = document.getElementById('farming-menu-action-button');
    if (farmingButton) {
        farmingButton.addEventListener('click', showFarmingMenu);
    }
    
    const dungeoneeringButton = document.getElementById('dungeoneering-menu-button');
    if (dungeoneeringButton) {
        dungeoneeringButton.addEventListener('click', () => {
            import('./dungeoneering.js').then(module => {
                module.showDungeoneeringMenu();
            });
        });
    }
    
    // Back buttons from various sections
    const actionsSectionBackButtons = document.querySelectorAll('.actions-back-button');
    actionsSectionBackButtons.forEach(btn => {
        btn.addEventListener('click', showActionsMenu);
    });
    
    console.log('Actions module initialized');
}

// Initialize module when DOM is loaded
document.addEventListener('DOMContentLoaded', initActionsModule); 
