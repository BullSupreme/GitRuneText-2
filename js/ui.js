/**
 * ui.js - UI management module for RuneText
 * Handles UI navigation, section toggling, and HUD updates.
 */

'use strict';

import { playerData, getLevelFromXp, getXpForDisplay, playSound, sounds, getMaxHp, logMessage, savePlayerData, soundsMuted, soundVolume, setSoundVolume, toggleMute as utilToggleMute, exportSaveData, handleImportFile, confirmResetGame, resetGame, applyCheat, getXpForLevel, musicVolume, setMusicVolume, initializeMainThemeMusic, startMainThemeMusic } from './utils.js';
import { calculateAvailablePerkPoints } from './perks.js';
import { showCharacterSection } from './characterinfo.js';
import { showInventorySection } from './inventory.js';
import { showActionsMenu } from './actions.js';
import { showPerkTreeSection } from './perks.js';
import { showShopSection } from './shop.js';
import { showBuildStructuresMenu } from './builds.js';
import { showGuildMenu, isGuildHallUnlocked } from './guild.js';
import { showBlacksmithingMenu } from './blacksmithing.js';
import { showWoodcutting } from './woodcutting.js';
import { showMining } from './mining.js';
import { showCooking } from './cooking.js';
import { showCombat } from './combat.js';
import { showFarmingMenu } from './farming.js';
import { showEnchantingMenu } from './enchanting.js';
import { showAchievementsMenu } from './achievements.js';
import { trackStatistic } from './achievements.js';

// Track current visible section
export let currentSection = 'main-menu-section'; // Default to main menu
export let currentUIMode = 'mobile'; // 'mobile' or 'desktop'

// Gold tracking for achievements
let lastGold = playerData?.gold || 0;

/**
 * Hide all sections in the game UI
 */
export function hideAllSections() {
    const sections = document.querySelectorAll('.container > .section'); // Target sections within .container
    sections.forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
        
        // Remove inline display styles from tab contents so CSS classes can control visibility
        const tabContents = section.querySelectorAll('.tab-content');
        tabContents.forEach(tabContent => {
            tabContent.style.display = '';
        });
    });
    // console.log(`All sections hidden (${sections.length} sections total)`);
}

/**
 * Show a specific section and hide all others
 * @param {string} sectionId - The ID of the section to show
 */
export function showSection(sectionId) {
    // console.log(`Attempting to show section: ${sectionId}`);
    hideAllSections();
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        section.style.display = 'block'; // Or 'flex' if the section uses it
        currentSection = sectionId;
        // console.log(`Section '${sectionId}' is now visible`);
        
        if (currentUIMode === 'desktop') {
            updateLeftNavActiveState(sectionId);
            // Scroll the right panel to the top of the section
            const rightPanel = document.querySelector('.container'); // .container is the right panel
            if(rightPanel) rightPanel.scrollTop = 0;
        }

        if (sectionId === 'main-menu-section' && playerData && playerData.hp <= 0) {
            const attackLevel = getLevelFromXp(playerData.skills?.attack?.xp || 0);
            const maxHp = getMaxHp(attackLevel);
            const revivePercent = attackLevel < 10 ? 0.5 : 0.25;
            const reviveAmount = Math.ceil(maxHp * revivePercent);
            playerData.hp = reviveAmount;
            savePlayerData();
            logMessage(`You have been revived with ${reviveAmount} HP!`, "fore-green", "💖");
            updateHud();
        }
    } else {
        console.warn(`Section with ID '${sectionId}' not found`);
        if (sectionId !== 'main-menu-section') {
            showSection('main-menu-section'); // Fallback
            logMessage(`Error: Could not find section "${sectionId}". Returning to main menu.`, "fore-danger");
        }
    }
    updateHud();
}


/**
 * Updates locked/unlocked states for skills in the HUD
 */
function updateSkillLockStates() {
    const farmingHud = document.getElementById('hud-fm');
    if (farmingHud) {
        const farmingUnlocked = playerData.built_structures?.farmLand;
        const tooltip = farmingHud.querySelector('.tooltip');
        
        if (farmingUnlocked) {
            farmingHud.classList.remove('locked');
            if (tooltip) tooltip.textContent = 'Farming';
        } else {
            farmingHud.classList.add('locked');
            if (tooltip) tooltip.textContent = 'Build Farm Land to unlock Farming';
        }
    }
}

export function updateHud() {
    if (!playerData) return;

    // Economy: track gold earned
    const currentGold = playerData.gold || 0;
    const deltaGold = currentGold - lastGold;
    if (deltaGold > 0) {
        trackStatistic('economy', 'goldEarned', deltaGold);
    }
    lastGold = currentGold;

    // Update left navigation if in desktop mode
    if (currentUIMode === 'desktop') {
        updateLeftNavSkills();
    }

    try {
        if (!playerData.skills) {
            console.error('Player data missing skills object, initializing...');
            playerData.skills = {
                attack: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 },
                mining: { level: 1, xp: 0 }, blacksmithing: { level: 1, xp: 0 },
                cooking: { level: 1, xp: 0 }, farming: {level: 1, xp: 0}, enchanting: {level: 1, xp: 0}
            };
        }

        const requiredSkills = ['attack', 'woodcutting', 'mining', 'blacksmithing', 'cooking', 'farming', 'enchanting'];
        requiredSkills.forEach(skill => {
            if (!playerData.skills[skill]) {
                console.warn(`Initializing missing skill: ${skill}`);
                playerData.skills[skill] = { level: 1, xp: 0 };
            }
        });

        updateSkillHud('attack', playerData.skills.attack.xp, 'atk');
        updateSkillHud('woodcutting', playerData.skills.woodcutting.xp, 'wc');
        updateSkillHud('mining', playerData.skills.mining.xp, 'mn');
        updateSkillHud('blacksmithing', playerData.skills.blacksmithing.xp, 'bs');
        updateSkillHud('cooking', playerData.skills.cooking.xp, 'ck');
        updateSkillHud('farming', playerData.skills.farming.xp, 'fm');
        updateSkillHud('enchanting', playerData.skills.enchanting.xp, 'en');
        
        updateSkillLockStates();
        updateGuildButtonVisibility();
        
        const goldDisplay = document.getElementById('hud-gold-display');
        if (goldDisplay) {
            const goldValue = goldDisplay.querySelector('.stat-value');
            if (goldValue) goldValue.textContent = playerData.gold !== undefined ? playerData.gold.toLocaleString() : '0';
        }
        
        const perkPointsDisplay = document.getElementById('hud-perk-points-display');
        if (perkPointsDisplay) {
            const perkValue = perkPointsDisplay.querySelector('.stat-value');
            if (perkValue) {
                const availablePoints = calculateAvailablePerkPoints();
                perkValue.textContent = availablePoints || 0;
            }
        }
        updateHpDisplays();
    } catch (error) {
        console.error('Error in updateHud:', error);
    }
}


function updateSkillHud(skillName, xp, xpBarClass) {
    const container = document.getElementById(`hud-${xpBarClass}`);
    if (!container) return;
    
    const levelText = container.querySelector('.hud-skill-level-text');
    const xpBar = container.querySelector(`.skill-xp-bar.${xpBarClass}`);
    
    if (!levelText || !xpBar) return;
    
    const xpInfo = getXpForDisplay(xp);
    levelText.textContent = `Lvl ${xpInfo.level}`;
    xpBar.style.width = `${xpInfo.percentToNextLevel}%`;
}


function updateHpDisplays() {
    const attackLevel = getLevelFromXp(playerData.skills.attack.xp || 0);
    const maxHp = getMaxHp(attackLevel);
    const currentHp = playerData.hp !== undefined ? Math.ceil(playerData.hp) : 0;

    const mainMenuHpBar = document.getElementById('main-menu-hp-bar-fill');
    const mainMenuHpText = document.getElementById('main-menu-hp-bar-text');
    if (mainMenuHpBar && mainMenuHpText) {
        const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
        mainMenuHpBar.style.width = `${hpPercent}%`;
        mainMenuHpText.textContent = `${currentHp}/${maxHp}`;
        
        const hpBarContainer = mainMenuHpBar.parentElement;
        if (hpBarContainer) {
            if (hpPercent <= 30) {
                hpBarContainer.classList.add('hud-hp-low');
            } else {
                hpBarContainer.classList.remove('hud-hp-low');
            }
        }
    }
    
    const hudHpContainer = document.getElementById('hud-player-hp');
    if (hudHpContainer && !hudHpContainer.classList.contains('hidden')) {
        const hudHpBar = hudHpContainer.querySelector('.hp-bar');
        const hudHpText = hudHpContainer.querySelector('.hp-text');
        
        if (hudHpBar && hudHpText) {
            const hpPercent2 = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
            hudHpBar.style.width = `${hpPercent2}%`;
            hudHpText.textContent = `${currentHp}/${maxHp}`;
            
            if (hpPercent2 <= 30) {
                hudHpContainer.classList.add('hud-hp-low');
            } else {
                hudHpContainer.classList.remove('hud-hp-low');
            }
        }
    }
}

export function showFloatingCombatText(text, type, targetElement, scale = 1, offsetX = 0, offsetY = 0, direction = 'fade-center') {
    if (!targetElement || !text) return;
    const rect = targetElement.getBoundingClientRect();
    const floatingText = document.createElement('div');
    floatingText.className = `floating-text ${type} ${direction}`;
    floatingText.textContent = text;
    floatingText.style.fontSize = `${1.1 * scale}em`;
    floatingText.style.position = 'fixed';
    floatingText.style.left = `${rect.left + rect.width / 2}px`;
    floatingText.style.top = `${rect.top}px`;
    floatingText.style.transform = `translate(-50%, 0) translate(${offsetX}px, ${offsetY}px)`;
    document.body.appendChild(floatingText);
    setTimeout(() => {
        floatingText.remove();
    }, 1300);
}

function setupSettingsMenuEvents() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-modal-btn');
    const muteToggleSettingBtn = document.getElementById('mute-toggle-setting');
    const soundVolumeSlider = document.getElementById('sound-volume-slider');
    const soundVolumeDisplay = document.getElementById('sound-volume-display');
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeDisplay = document.getElementById('music-volume-display');
    const uiModeToggleBtn = document.getElementById('ui-mode-toggle');
    const saveGameSettingsBtn = document.getElementById('save-game-settings-btn');
    const loadGameSettingsBtn = document.getElementById('load-game-settings-btn');
    const importFileSettingsInput = document.getElementById('import-file-settings-input');
    const resetGameSettingsBtn = document.getElementById('reset-game-settings-btn');
    const cheatCodeInput = document.getElementById('cheat-code-input');
    const applyCheatBtn = document.getElementById('apply-cheat-btn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            settingsModal.style.display = 'flex'; // Ensure modal is flex for centering
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            settingsModal.style.display = 'none';
        });
    }
    
    if (muteToggleSettingBtn) {
        muteToggleSettingBtn.textContent = soundsMuted ? "🔇" : "🔊";
        muteToggleSettingBtn.addEventListener('click', () => {
            utilToggleMute(); // This now updates soundsMuted in utils.js
            muteToggleSettingBtn.textContent = soundsMuted ? "🔇" : "🔊"; // Update button icon
        });
    }
    
    // Sound volume slider
    if (soundVolumeSlider && soundVolumeDisplay) {
        // Initialize slider value and display
        soundVolumeSlider.value = soundVolume;
        soundVolumeDisplay.textContent = `${soundVolume}%`;
        
        soundVolumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value, 10);
            setSoundVolume(volume);
            soundVolumeDisplay.textContent = `${volume}%`;
        });
    }

    // Music volume slider
    if (musicVolumeSlider && musicVolumeDisplay) {
        // Initialize slider value and display
        musicVolumeSlider.value = musicVolume;
        musicVolumeDisplay.textContent = `${musicVolume}%`;
        
        musicVolumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value, 10);
            setMusicVolume(volume);
        });
    }

    if (uiModeToggleBtn) {
        uiModeToggleBtn.addEventListener('click', () => {
            const newMode = currentUIMode === 'mobile' ? 'desktop' : 'mobile';
            setUIMode(newMode);
        });
    }

    // Save game button
    if (saveGameSettingsBtn) {
        saveGameSettingsBtn.addEventListener('click', () => {
            exportSaveData();
            logMessage('Game saved successfully!', 'fore-green');
        });
    }

    // Load game button
    if (loadGameSettingsBtn && importFileSettingsInput) {
        loadGameSettingsBtn.addEventListener('click', () => {
            importFileSettingsInput.click();
        });
        
        importFileSettingsInput.addEventListener('change', (e) => {
            handleImportFile(e);
            importFileSettingsInput.value = ''; // Reset input
        });
    }

    // Reset game button
    if (resetGameSettingsBtn) {
        resetGameSettingsBtn.addEventListener('click', () => {
            confirmResetGame();
            settingsModal.classList.add('hidden');
            settingsModal.style.display = 'none';
        });
    }

    // Cheat code functionality
    if (cheatCodeInput && applyCheatBtn) {
        applyCheatBtn.addEventListener('click', () => {
            const code = cheatCodeInput.value.trim();
            if (code) {
                applyCheat(code);
                cheatCodeInput.value = ''; // Clear input after applying
            }
        });
        
        // Allow Enter key to apply cheat
        cheatCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyCheatBtn.click();
            }
        });
    }
}

function setUIMode(mode) {
    const body = document.body; // Target body for class
    const leftPanelNav = document.getElementById('left-panel-nav');
    const uiModeToggleBtn = document.getElementById('ui-mode-toggle');

    currentUIMode = mode;
    if (playerData && playerData.settings) { // Ensure settings object exists
        playerData.settings.uiMode = mode;
    } else if (playerData) {
        playerData.settings = { uiMode: mode };
    }


    if (mode === 'desktop') {
        body.classList.add('desktop-mode-active');
        leftPanelNav.classList.remove('hidden');
        leftPanelNav.style.display = 'flex'; // Ensure it's visible
        populateLeftNavPanel();
        uiModeToggleBtn.textContent = 'Switch to Mobile Mode';
        uiModeToggleBtn.dataset.mode = 'desktop';
        // If switching to desktop mode and currently on main menu or actions menu, show character section instead
        if (currentSection === 'main-menu-section' || currentSection === 'actions-menu-section') {
            showCharacterSection();
        }
    } else { // mobile mode
        body.classList.remove('desktop-mode-active');
        leftPanelNav.classList.add('hidden');
        leftPanelNav.style.display = 'none';
        uiModeToggleBtn.textContent = 'Switch to Desktop Mode';
        uiModeToggleBtn.dataset.mode = 'mobile';
    }
    savePlayerData();
    // Re-show current section to apply layout changes if any section specific logic depends on mode
    if (mode !== 'desktop') {
        showSection(currentSection || 'main-menu-section');
    }
}


function loadUIModePreference() {
    const savedMode = playerData.settings?.uiMode || 'mobile'; // Default to mobile
    setUIMode(savedMode);
}


function populateLeftNavPanel() {
    const navPanel = document.getElementById('left-panel-nav');
    if (!navPanel) return;

    navPanel.innerHTML = ''; // Clear existing

    const navItems = [
        { id: 'character-section', label: 'Character', icon: '👤', handler: showCharacterSection },
        { id: 'inventory-section', label: 'Inventory', icon: '🎒', handler: showInventorySection },
        { id: 'perk-tree-section', label: 'Perks', icon: '🌟', handler: showPerkTreeSection },
        { id: 'achievements-section', label: 'Achievements', icon: '🏆', handler: showAchievementsMenu },
        { type: 'divider' },
        { id: 'shop-section', label: 'Shop', icon: '🛒', handler: showShopSection },
        { id: 'build-structures-section', label: 'Build', icon: '🏗️', handler: showBuildStructuresMenu },
        { id: 'farming-section', label: 'Farm', icon: '🏞️', handler: showFarmingMenu, condition: () => playerData.built_structures?.farmLand },
        { id: 'guild-hall-section', label: 'Guild Hall', icon: '🏛️', handler: showGuildMenu, condition: () => isGuildHallUnlocked() },
        { type: 'divider' },
        { id: 'combat-section', label: 'Combat', icon: '⚔️', handler: showCombat },
        { id: 'woodcutting-section', label: 'Woodcutting', icon: '🌲', handler: showWoodcutting },
        { id: 'mining-section', label: 'Mining', icon: '⛏️', handler: showMining },
        { id: 'blacksmithing-menu-section', label: 'Blacksmithing', icon: '🛠️', handler: showBlacksmithingMenu },
        { id: 'cooking-section', label: 'Cooking', icon: '🍳', handler: showCooking },
        { id: 'enchanting-section', label: 'Enchanting', icon: '✨', handler: showEnchantingMenu }
    ];

    navItems.forEach(item => {
        if (item.type === 'divider') {
            const divider = document.createElement('hr');
            divider.style.borderColor = '#333';
            navPanel.appendChild(divider);
            return;
        }

        if (item.condition && !item.condition()) {
            return; // Skip if condition not met (e.g., Farm not unlocked)
        }

        const navItem = document.createElement('div');
        navItem.className = 'left-panel-nav-item';
        navItem.dataset.targetSection = item.id;
        
        // Create header container
        const header = document.createElement('div');
        header.className = 'left-panel-nav-item-header';
        header.innerHTML = `<span class="nav-item-icon">${item.icon}</span> <span class="nav-item-label">${item.label}</span>`;
        
        // Add level for skill items
        const skillMap = {
            'combat-section': 'attack',
            'woodcutting-section': 'woodcutting',
            'mining-section': 'mining',
            'blacksmithing-menu-section': 'blacksmithing',
            'cooking-section': 'cooking',
            'enchanting-section': 'enchanting',
            'farming-section': 'farming'
        };
        
        const skillKey = skillMap[item.id];
        if (skillKey && playerData.skills?.[skillKey]) {
            const level = getLevelFromXp(playerData.skills[skillKey].xp || 0);
            const levelSpan = document.createElement('span');
            levelSpan.className = 'nav-item-level';
            levelSpan.textContent = `Lvl ${level}`;
            header.appendChild(levelSpan);
        }
        
        navItem.appendChild(header);
        
        // Add progress bar for skill items
        if (skillKey && playerData.skills?.[skillKey]) {
            const progressBar = document.createElement('div');
            progressBar.className = 'nav-item-progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'nav-item-progress-fill';
            
            const currentXp = playerData.skills[skillKey].xp || 0;
            const currentLevel = getLevelFromXp(currentXp);
            const currentLevelXp = getXpForLevel(currentLevel - 1);
            const nextLevelXp = getXpForLevel(currentLevel);
            const progressPercent = ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
            
            progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
            progressBar.appendChild(progressFill);
            navItem.appendChild(progressBar);
        }
        
        navItem.addEventListener('click', () => {
            item.handler();
        });
        navPanel.appendChild(navItem);
    });
    updateLeftNavActiveState(currentSection);
}

function updateLeftNavActiveState(activeSectionId) {
    if (currentUIMode !== 'desktop') return; // Only relevant for desktop mode

    const navItems = document.querySelectorAll('#left-panel-nav .left-panel-nav-item');
    navItems.forEach(item => {
        if (item.dataset.targetSection === activeSectionId) {
            item.classList.add('active-nav');
        } else {
            item.classList.remove('active-nav');
        }
    });
}

function updateLeftNavSkills() {
    if (currentUIMode !== 'desktop' || !playerData?.skills) return;

    const skillMap = {
        'combat-section': 'attack',
        'woodcutting-section': 'woodcutting',
        'mining-section': 'mining',
        'blacksmithing-menu-section': 'blacksmithing',
        'cooking-section': 'cooking',
        'enchanting-section': 'enchanting',
        'farming-section': 'farming'
    };

    Object.entries(skillMap).forEach(([sectionId, skillKey]) => {
        const navItem = document.querySelector(`.left-panel-nav-item[data-target-section="${sectionId}"]`);
        if (!navItem || !playerData.skills[skillKey]) return;

        // Update level
        const levelSpan = navItem.querySelector('.nav-item-level');
        if (levelSpan) {
            const level = getLevelFromXp(playerData.skills[skillKey].xp || 0);
            levelSpan.textContent = `Lvl ${level}`;
        }

        // Update progress bar
        const progressFill = navItem.querySelector('.nav-item-progress-fill');
        if (progressFill) {
            const currentXp = playerData.skills[skillKey].xp || 0;
            const currentLevel = getLevelFromXp(currentXp);
            const currentLevelXp = getXpForLevel(currentLevel - 1);
            const nextLevelXp = getXpForLevel(currentLevel);
            const progressPercent = ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
            progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
        }
    });
}

export function initGameUi() {
    setupSettingsMenuEvents(); // Sets up the cogwheel button and modal logic
    loadUIModePreference();    // Applies the saved UI mode or defaults
    initHudSkillButtons();
    // Show character section by default in desktop mode, main menu in mobile
    if (currentUIMode === 'desktop') {
        showCharacterSection();
    } else {
        showSection('main-menu-section'); // Ensure main menu is default for mobile
    }
    updateFarmButtonVisibility();
    updateGuildButtonVisibility();

     // Update mute button icon based on loaded state
    const muteSettingBtn = document.getElementById('mute-toggle-setting');
    if (muteSettingBtn) {
        muteSettingBtn.textContent = soundsMuted ? "🔇" : "🔊";
    }

    // Initialize theme music
    initializeMainThemeMusic();
    if (musicVolume > 0) {
        startMainThemeMusic();
    }
}


function initHudSkillButtons() {
    const skillButtonActions = {
        'hud-atk': () => showCombat(),
        'hud-wc': () => showWoodcutting(),
        'hud-mn': () => showMining(),
        'hud-bs': () => showBlacksmithingMenu(),
        'hud-ck': () => showCooking(),
        'hud-fm': () => showFarmingMenu(),
        'hud-en': () => showEnchantingMenu()
    };
    Object.keys(skillButtonActions).forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            // Remove existing listeners by cloning, if this function could be called multiple times
            // const newContainer = container.cloneNode(true);
            // container.parentNode.replaceChild(newContainer, container);
            // newContainer.addEventListener('click', skillButtonActions[id]);
            container.addEventListener('click', skillButtonActions[id]); // Assuming it's called once
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const gameLogContainer = document.getElementById('game-log-container');
    const toggleLogBtn = document.getElementById('toggle-log-btn');
    const clearLogBtn = document.getElementById('clear-log-btn');
    const gameLog = document.getElementById('game-log');
    let isLogExpanded = true;

    if (toggleLogBtn) {
        toggleLogBtn.addEventListener('click', () => {
            isLogExpanded = !isLogExpanded;
            gameLogContainer.classList.toggle('game-log-collapsed', !isLogExpanded);
            toggleLogBtn.textContent = isLogExpanded ? '▼' : '▲';
        });
    }
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            if (gameLog) gameLog.innerHTML = '';
            logMessage('Game log cleared.', 'fore-lightblack_ex', '🧹');
        });
    }

    if (gameLogContainer) {
        const headerEl = gameLogContainer.querySelector('.game-log-header');
        if (headerEl) {
            headerEl.style.cursor = 'grab';
            let isDragging = false;
            let dragStartX = 0;
            let containerStartLeft = 0;

            headerEl.addEventListener('mousedown', (e) => {
                isDragging = true;
                headerEl.style.cursor = 'grabbing';
                dragStartX = e.clientX;
                containerStartLeft = gameLogContainer.offsetLeft;
                gameLogContainer.style.right = 'auto'; // Allow left positioning
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
            function onMouseMove(e) {
                if (!isDragging) return;
                const dx = e.clientX - dragStartX;
                let newLeft = containerStartLeft + dx;
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - gameLogContainer.offsetWidth));
                gameLogContainer.style.left = `${newLeft}px`;
            }
            function onMouseUp() {
                if (!isDragging) return;
                isDragging = false;
                headerEl.style.cursor = 'grab';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        }
    }
}); 

document.addEventListener('DOMContentLoaded', () => {
    const actionsBackBtn = document.getElementById('actions-back-btn');
    if (actionsBackBtn) {
        const newBtn = actionsBackBtn.cloneNode(true);
        actionsBackBtn.parentNode.replaceChild(newBtn, actionsBackBtn);
        newBtn.addEventListener('click', () => showSection('main-menu-section'));
    }
    const actionsFooterBackBtn = document.getElementById('actions-footer-back-btn');
    if (actionsFooterBackBtn) {
        const newBtn = actionsFooterBackBtn.cloneNode(true);
        actionsFooterBackBtn.parentNode.replaceChild(newBtn, actionsFooterBackBtn);
        newBtn.addEventListener('click', () => showSection('main-menu-section'));
    }

    const combatBackBtn = document.getElementById('combat-back-button');
    if (combatBackBtn) {
        const newBtn = combatBackBtn.cloneNode(true);
        combatBackBtn.parentNode.replaceChild(newBtn, combatBackBtn);
        newBtn.addEventListener('click', () => {
            import('./combat.js').then(combatModule => {
                if (combatModule.isAutoAttacking) combatModule.stopAutoAttack();
                showActionsMenu(); // Always go to actions menu from here
            }).catch(() => showActionsMenu());
        });
    }
    const combatFooterBackBtn = document.getElementById('combat-footer-back-btn');
    if (combatFooterBackBtn) {
        const newBtn = combatFooterBackBtn.cloneNode(true);
        combatFooterBackBtn.parentNode.replaceChild(newBtn, combatFooterBackBtn);
        newBtn.addEventListener('click', () => {
            import('./combat.js').then(combatModule => combatModule.stopAutoAttack())
                                 .finally(() => showSection('main-menu-section'));
        });
    }
}); 

export function setActiveSkill(skillCode) {
    document.querySelectorAll('.skill-stat-container').forEach(el => el.classList.remove('active-hud-item'));
    const el = document.getElementById(`hud-${skillCode}`);
    if (el) el.classList.add('active-hud-item');
}

export function clearActiveSkill() {
    document.querySelectorAll('.skill-stat-container').forEach(el => el.classList.remove('active-hud-item'));
}

export function updateFarmButtonVisibility() {
    const farmTownBtn = document.getElementById('farm-menu-town-button');
    const farmActionBtn = document.getElementById('farming-menu-action-button');
    const built = playerData && playerData.built_structures && playerData.built_structures.farmLand; // Check playerData exists
    if (farmTownBtn) farmTownBtn.classList.toggle('hidden', !built);
    if (farmActionBtn) farmActionBtn.classList.toggle('hidden', !built);
}

export function updateGuildButtonVisibility() {
    const guildTownBtn = document.getElementById('guild-hall-town-button');
    const unlocked = isGuildHallUnlocked();
    
    if (guildTownBtn) {
        if (unlocked) {
            guildTownBtn.classList.remove('locked', 'hidden');
            guildTownBtn.title = 'Guild Hall';
        } else {
            guildTownBtn.classList.add('locked');
            guildTownBtn.classList.remove('hidden');
            guildTownBtn.title = 'Requires all skills at level 35 (except Enchanting and Farming)';
        }
    }
}

/**
 * Display a floating achievement notification at top center.
 * @param {{id:string,name:string,icon:string}} achievement
 */
export function showAchievementNotification(achievement) {
    let notif = document.getElementById('achievement-notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'achievement-notification';
        document.body.appendChild(notif);
    }
    notif.innerHTML = `<span class="notif-icon">${achievement.icon}</span> Achievement Unlocked: ${achievement.name}!`;
    notif.classList.add('show');
    notif.onclick = () => {
        showAchievementsMenu();
        setTimeout(() => {
            const card = document.querySelector(`.achievement-card[data-achievement-id="${achievement.id}"]`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
    };
    setTimeout(() => {
        notif.classList.remove('show');
    }, 4000);
}

