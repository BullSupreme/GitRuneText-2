/**
 * guild.js - Handles guild functionality
 * Manages guild members, missions, tasks, upgrades, and stash
 */

'use strict';

// Import necessary data and functions
import { 
    GUILD_DATA, GUILD_MEMBER_DATA, GUILD_MISSION_DATA, GUILD_UPGRADE_DATA,
    MEMBER_LEVEL_PROGRESSION, 
    GUILD_MEMBER_LOOT_TABLES, 
    TREE_DATA, ORE_DATA, MONSTER_DATA, ITEM_DATA, ITEM_SELL_PRICES, 
    GUILD_LEVEL_PROGRESSION_XP,
    MEMBER_RECRUIT_TIER_SETTINGS, // NEW: For tiered recruitment
    TITLE_STAT_PROFILES,          // NEW: For title-based stat distribution
    GUILD_MISSION_TEMPLATES       // <-- Added for mission generation
} from './data.js';
import { playerData, savePlayerData, logMessage, formatNumber, getLevelFromXp, getXpForLevel, removeItemFromInventory, addItemToInventory, formatDurationHHMMSS } from './utils.js';
import { updateHud, showSection } from './ui.js';
import { trackStatistic } from './achievements.js';

/**
 * Checks if the Guild Hall is unlocked based on skill level requirements
 * Requirements: All skills at level 35 except Enchanting and Farming
 */
export function isGuildHallUnlocked() {
    if (!playerData || !playerData.skills) return false;
    
    const requiredLevel = 35;
    const excludedSkills = ['enchanting', 'farming'];
    
    for (const skillName in playerData.skills) {
        if (excludedSkills.includes(skillName)) continue;
        
        const skill = playerData.skills[skillName];
        const currentLevel = getLevelFromXp(skill.xp);
        
        if (currentLevel < requiredLevel) {
            return false;
        }
    }
    
    return true;
}

// Define constants
const GUILD_MEMBER_TASK_TICK_INTERVAL_MS = 30000; // 30 seconds
const GUILD_MISSION_CHECK_INTERVAL_MS = 3 * 60000; // 3 minutes in milliseconds

// Guild state tracking variables
let guildMemberTaskInterval = null;
let guildMissionCheckInterval = null;

/**
 * Shows the guild hall section
 */
export function showGuildMenu() {
    // Check if Guild Hall is unlocked
    if (!isGuildHallUnlocked()) {
        logMessage("Guild Hall requires all skills at level 35 (except Enchanting and Farming).", "fore-red");
        return;
    }
    
    console.log('Showing guild hall section');
    showSection('guild-hall-section');
    renderGuildContent();
    
    const headerBackButton = document.getElementById('guild-hall-back-button');
    if (headerBackButton) {
        const newBtn = headerBackButton.cloneNode(true);
        headerBackButton.parentNode.replaceChild(newBtn, headerBackButton);
        newBtn.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    const footerBackButton = document.getElementById('guild-hall-footer-back-btn');
    if (footerBackButton) {
        const newFooterBtn = footerBackButton.cloneNode(true);
        footerBackButton.parentNode.replaceChild(newFooterBtn, footerBackButton);
        newFooterBtn.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
}

/**
 * Renders the guild content, including tabs and initial view
 */
function renderGuildContent() {
    const guildSection = document.getElementById('guild-hall-section');
    if (!guildSection) return;
    
    if (guildSection.children.length === 0 || !document.getElementById('guild-members-tab')) { 
        guildSection.innerHTML = ''; 

        const guildHeader = document.createElement('div');
        guildHeader.className = 'section-title-header';
        guildHeader.innerHTML = `
            <div class="section-title-text" style="color:#ffcb7d;">Guild Hall</div>
            <button id="guild-hall-back-button" class="section-back-button">❮ Back</button>
        `;
        guildSection.appendChild(guildHeader);
        
        const guildTabs = document.createElement('div');
        guildTabs.className = 'tabs';
        guildTabs.innerHTML = `
            <div class="tab active" data-tab="members">Members</div>
            <div class="tab" data-tab="missions">Missions</div>
            <div class="tab" data-tab="upgrades">Upgrades</div>
            <div class="tab" data-tab="stash">Guild Stash</div>
        `;
        guildSection.appendChild(guildTabs);
        
        const guildTabContents = document.createElement('div');
        guildTabContents.className = 'tab-contents';
        
        const membersTabContent = document.createElement('div');
        membersTabContent.className = 'tab-content active'; 
        membersTabContent.id = 'guild-members-tab';
        membersTabContent.innerHTML = `
            <div id="guild-members-container" class="guild-members"></div>
            <button id="recruit-member-button" class="guild-action-button">Recruit New Member</button>
        `;
        guildTabContents.appendChild(membersTabContent);
        
        const missionsTabContent = document.createElement('div');
        missionsTabContent.className = 'tab-content';
        missionsTabContent.id = 'guild-missions-tab';
        guildTabContents.appendChild(missionsTabContent);
        
        const upgradesTabContent = document.createElement('div');
        upgradesTabContent.className = 'tab-content';
        upgradesTabContent.id = 'guild-upgrades-tab';
        guildTabContents.appendChild(upgradesTabContent);
        
        const stashTabContent = document.createElement('div');
        stashTabContent.className = 'tab-content';
        stashTabContent.id = 'guild-stash-tab';
        guildTabContents.appendChild(stashTabContent);
        
        guildSection.appendChild(guildTabContents);
        
        const footerDiv = document.createElement('div');
        footerDiv.className = 'section-footer-controls';
        footerDiv.innerHTML = `<button id="guild-hall-footer-back-btn" class="btn-back">❮ Back to Main Menu</button>`;
        guildSection.appendChild(footerDiv);

        const newHeaderBackButton = document.getElementById('guild-hall-back-button');
        if (newHeaderBackButton) {
            const clonedBtn = newHeaderBackButton.cloneNode(true);
            newHeaderBackButton.parentNode.replaceChild(clonedBtn, newHeaderBackButton);
            clonedBtn.addEventListener('click', () => showSection('main-menu-section'));
        }
        const newFooterBackButton = document.getElementById('guild-hall-footer-back-btn');
        if (newFooterBackButton) {
            const clonedBtn = newFooterBackButton.cloneNode(true);
            newFooterBackButton.parentNode.replaceChild(clonedBtn, newFooterBackButton);
            clonedBtn.addEventListener('click', () => showSection('main-menu-section'));
        }
        
        const tabs = guildTabs.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabContents = guildTabContents.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                const tabId = tab.dataset.tab;
                const activeContent = document.getElementById(`guild-${tabId}-tab`);
                if (activeContent) {
                    activeContent.classList.add('active');
                    switch (tabId) {
                        case 'members': renderGuildMembers(); break;
                        case 'missions': renderGuildMissions(); break;
                        case 'upgrades': renderGuildUpgrades(); break;
                        case 'stash': renderGuildStash(); break;
                    }
                }
            });
        });
        
        const recruitButton = membersTabContent.querySelector('#recruit-member-button');
        if (recruitButton) {
            const newRecruitButton = recruitButton.cloneNode(true);
            recruitButton.parentNode.replaceChild(newRecruitButton, recruitButton);
            newRecruitButton.addEventListener('click', recruitGuildMember);
        }
    }
    
    const activeTab = guildSection.querySelector('.tabs .tab.active');
    const activeTabId = activeTab ? activeTab.dataset.tab : 'members';
    
    switch (activeTabId) {
        case 'members': renderGuildMembers(); break;
        case 'missions': renderGuildMissions(); break;
        case 'upgrades': renderGuildUpgrades(); break;
        case 'stash': renderGuildStash(); break;
        default: renderGuildMembers(); break;
    }
}

/**
 * Renders guild members in the members tab
 */
function renderGuildMembers() {
    const membersContainer = document.getElementById('guild-members-container');
    if (!membersContainer) return;
    membersContainer.innerHTML = '';
    if (!playerData.guild) {
        playerData.guild = {
            name: "Adventurer's Guild", level: 1, xp: 0,
            members: {}, missions: {}, upgrades: {}, stash: {}
        };
        savePlayerData();
    }
    if (!playerData.guild.members || Object.keys(playerData.guild.members).length === 0) {
        membersContainer.innerHTML = `
            <p class="no-members-message">You have no guild members. Recruit some members to grow your guild!</p>
        `;
        return;
    }
    for (const [memberId, memberData] of Object.entries(playerData.guild.members)) {
        const memberCard = createMemberCard(memberId, memberData);
        membersContainer.appendChild(memberCard);
        // Add Change Professions button
        let changeCost = memberData.changeProfessionCost || 100;
        const changeBtn = document.createElement('button');
        changeBtn.className = 'change-profession-btn small-btn';
        changeBtn.textContent = `Change Professions (${formatNumber(changeCost)} gold)`;
        changeBtn.title = 'Randomly change this member\'s title and stats. Chance to increase tier.';
        changeBtn.disabled = playerData.gold < changeCost;
        changeBtn.addEventListener('click', () => {
            if (playerData.gold < changeCost) {
                logMessage(`Not enough gold! Need ${formatNumber(changeCost)} gold to change profession.`, 'fore-danger');
                return;
            }
            playerData.gold -= changeCost;
            memberData.changeProfessionCost = Math.min(changeCost * 2, 100000);
            // Randomly assign a new title from TITLE_STAT_PROFILES
            const titleKeys = Object.keys(TITLE_STAT_PROFILES);
            let newTitleKey;
            do {
                newTitleKey = titleKeys[Math.floor(Math.random() * titleKeys.length)];
            } while (memberData.title === newTitleKey && titleKeys.length > 1);
            const oldTitle = memberData.title;
            memberData.title = newTitleKey;
            // Update name: replace old title with new title
            if (typeof oldTitle === 'string') {
                memberData.name = memberData.name.replace(oldTitle, newTitleKey);
            }
            // Update stats to match new title profile and current tier
            const titleProfile = TITLE_STAT_PROFILES[newTitleKey] || { lumberjack: 1, miner: 1, fighter: 1 };
            const tier = memberData.recruitTier || 0;
            const totalBonusStats = MEMBER_RECRUIT_TIER_SETTINGS.getBonusStatsForTier(tier);
            const baseStats = { ...MEMBER_RECRUIT_TIER_SETTINGS.baseSecondaryStats };
            const sumOfRatios = titleProfile.lumberjack + titleProfile.miner + titleProfile.fighter;
            let distributedBonuses = { lumberjack: 0, miner: 0, fighter: 0 };
            if (sumOfRatios > 0) {
                distributedBonuses.lumberjack = Math.floor((titleProfile.lumberjack / sumOfRatios) * totalBonusStats);
                distributedBonuses.miner = Math.floor((titleProfile.miner / sumOfRatios) * totalBonusStats);
                distributedBonuses.fighter = Math.floor((titleProfile.fighter / sumOfRatios) * totalBonusStats);
                let currentDistributedSum = distributedBonuses.lumberjack + distributedBonuses.miner + distributedBonuses.fighter;
                let remainder = totalBonusStats - currentDistributedSum;
                const statOrderForRemainder = ['fighter', 'miner', 'lumberjack'];
                for (const stat of statOrderForRemainder) {
                    if (remainder <= 0) break;
                    distributedBonuses[stat]++;
                    remainder--;
                }
            }
            memberData.stats = {
                lumberjack: baseStats.lumberjack + distributedBonuses.lumberjack,
                miner: baseStats.miner + distributedBonuses.miner,
                fighter: baseStats.fighter + distributedBonuses.fighter
            };
            memberData.level = memberData.stats.lumberjack + memberData.stats.miner + memberData.stats.fighter;
            memberData.xp = getXpForLevel(memberData.level, MEMBER_LEVEL_PROGRESSION);
            memberData.xpToNext = getXpForLevel(memberData.level + 1, MEMBER_LEVEL_PROGRESSION);
            // Roll for tier increase
            let tierIncreaseChance = 0;
            if (tier === 0) tierIncreaseChance = 0.25;
            else if (tier <= 8) tierIncreaseChance = 0.10 - (0.015 * (tier - 1));
            else tierIncreaseChance = Math.max(0.01, 0.10 - Math.floor((tier - 8) / 10) * 0.01);
            if (tier > 8) tierIncreaseChance = 0.01;
            if (tier < 99 && Math.random() < tierIncreaseChance) {
                memberData.recruitTier = tier + 1;
                const newTotalBonusStats = MEMBER_RECRUIT_TIER_SETTINGS.getBonusStatsForTier(tier + 1);
                let newDistributedBonuses = { lumberjack: 0, miner: 0, fighter: 0 };
                if (sumOfRatios > 0) {
                    newDistributedBonuses.lumberjack = Math.floor((titleProfile.lumberjack / sumOfRatios) * newTotalBonusStats);
                    newDistributedBonuses.miner = Math.floor((titleProfile.miner / sumOfRatios) * newTotalBonusStats);
                    newDistributedBonuses.fighter = Math.floor((titleProfile.fighter / sumOfRatios) * newTotalBonusStats);
                    let currentDistributedSum = newDistributedBonuses.lumberjack + newDistributedBonuses.miner + newDistributedBonuses.fighter;
                    let remainder = newTotalBonusStats - currentDistributedSum;
                    const statOrderForRemainder = ['fighter', 'miner', 'lumberjack'];
                    for (const stat of statOrderForRemainder) {
                        if (remainder <= 0) break;
                        newDistributedBonuses[stat]++;
                        remainder--;
                    }
                }
                memberData.stats = {
                    lumberjack: baseStats.lumberjack + newDistributedBonuses.lumberjack,
                    miner: baseStats.miner + newDistributedBonuses.miner,
                    fighter: baseStats.fighter + newDistributedBonuses.fighter
                };
                memberData.level = memberData.stats.lumberjack + memberData.stats.miner + memberData.stats.fighter;
                memberData.xp = getXpForLevel(memberData.level, MEMBER_LEVEL_PROGRESSION);
                memberData.xpToNext = getXpForLevel(memberData.level + 1, MEMBER_LEVEL_PROGRESSION);
                logMessage(`${memberData.name} has advanced to Tier ${tier + 1}! Stats increased.`, 'fore-success', '✨');
            }
            logMessage(`${memberData.name} changed profession to ${newTitleKey}. Stats updated.`, 'fore-info', '🔄');
            savePlayerData();
            renderGuildMembers();
            updateHud();
        });
        // Insert the button right under the stats
        const statsSection = memberCard.querySelector('.member-main-content .member-stats');
        if (statsSection) {
            statsSection.appendChild(changeBtn);
        } else {
            memberCard.appendChild(changeBtn);
        }
    }
    
    const recruitButton = document.getElementById('recruit-member-button');
    if (recruitButton) {
        const barracksLevel = playerData.guild.upgrades?.guildBarracks?.level || 0;
        recruitButton.disabled = barracksLevel === 0;
        recruitButton.title = barracksLevel === 0 ? 'Purchase Guild Barracks Level 1 to recruit your first member.' : '';
    }
}

/**
 * Creates a guild member card element
 * @param {string} memberId - The ID of the guild member
 * @param {object} memberData - The member data object
 * @returns {HTMLElement} - The member card element
 */
function createMemberCard(memberId, memberData) {
    if (!memberData.stats) { memberData.stats = { fighter: 1, miner: 1, lumberjack: 1 }; }
    const memberCard = document.createElement('div');
    memberCard.className = 'guild-member-card';
    memberCard.dataset.memberId = memberId;
    
    let statusText = 'Idle';
    let statusClass = 'idle';
    if (memberData.currentTask) {
        const task = memberData.currentTask;
        const taskDef = GUILD_MEMBER_DATA.taskTypes[task.type] || { name: task.type };
        const elapsedTime = Date.now() - task.startTime;
        const remainingTimeMs = Math.max(0, task.duration - elapsedTime);
        
        if (remainingTimeMs > 0) {
            statusText = `${taskDef.name}: ${formatDurationHHMMSS(remainingTimeMs)} left`;
            statusClass = 'busy';
        } else {
            statusText = `${taskDef.name}: Completing...`;
            statusClass = 'busy';
        }
    }
    
    const mainLevel = memberData.level || 1;
    const memberFullName = memberData.name; // Name now includes title from recruitment

    function getTrainTooltip(stat) {
        const currentStatLevel = memberData.stats[stat] || 0;
        // Main level here refers to the member's main level, not guild level
        const costGold = 50 * (currentStatLevel + 1) * (memberData.level || 1); 
        return `Next Training Cost: ${costGold} gold<br>Current Bonus: +${currentStatLevel}% on ${
            stat === 'lumberjack' ? 'Woodcutting' : stat === 'miner' ? 'Mining' : 'Hunting'
        } tasks`;
    }

    // --- Member Card Header: Show name, title, and emoji (not level number) ---
    let memberTitle = memberData.title || 'Adventurer';
    let memberName = memberData.name || 'Unknown';
    let titleEmoji = '';
    // If the title starts with 'the ', strip it for emoji lookup
    if (typeof memberTitle === 'string' && memberTitle.toLowerCase().startsWith('the ')) {
        memberTitle = memberTitle.slice(4);
    }
    if (typeof memberTitle === 'object' && memberTitle.emoji) {
        titleEmoji = memberTitle.emoji;
        memberTitle = memberTitle.title || memberTitle.toString();
    } else if (typeof memberTitle === 'string' && Array.isArray(GUILD_MEMBER_DATA.titles)) {
        const found = GUILD_MEMBER_DATA.titles.find(t => t.title === memberTitle);
        if (found) titleEmoji = found.emoji;
    }
    memberCard.innerHTML = `
        <div class="member-header">
            <div class="member-name">${memberName} <span class="member-title-emoji">${titleEmoji}</span></div>
            <div class="member-status ${statusClass}">${statusText}</div>
        </div>
        <div class="member-main-content">
            <div class="member-stats vertical-stats">
                <div class="member-stat-row"><span class="member-stat-badge">Level: ${mainLevel}</span></div>
                <div class="member-stat-row">
                    <span class="member-secondary-badge has-tooltip" data-id="${memberId}" data-stat="lumberjack" tabindex="0" role="button">
                        🪓 Lumberjack: ${memberData.stats.lumberjack}
                        <span class="member-tooltip">${getTrainTooltip('lumberjack')}</span>
                    </span>
                </div>
                <div class="member-stat-row">
                    <span class="member-secondary-badge has-tooltip" data-id="${memberId}" data-stat="miner" tabindex="0" role="button">
                        ⛏️ Miner: ${memberData.stats.miner}
                        <span class="member-tooltip">${getTrainTooltip('miner')}</span>
                    </span>
                </div>
                <div class="member-stat-row">
                    <span class="member-secondary-badge has-tooltip" data-id="${memberId}" data-stat="fighter" tabindex="0" role="button">
                        🗡️ Fighter: ${memberData.stats.fighter}
                        <span class="member-tooltip">${getTrainTooltip('fighter')}</span>
                    </span>
                </div>
            </div>
            <div class="member-controls-wrapper"></div>
        </div>
    `;
    if (memberData.currentTask) {
        const progressPercent = Math.floor((memberData.currentTask.progress || 0) * 100);
        const progressContainer = document.createElement('div');
        progressContainer.className = 'member-progress-bar-container';
        const progressFill = document.createElement('div');
        progressFill.className = 'member-progress-bar-fill';
        progressFill.style.width = `${progressPercent}%`;
        progressContainer.appendChild(progressFill);
        memberCard.insertBefore(progressContainer, memberCard.firstChild);
    }
    
    const mainContent = memberCard.querySelector('.member-main-content');
    const controlsWrapper = mainContent.querySelector('.member-controls-wrapper');
    const taskButtonsContainer = document.createElement('div');
    taskButtonsContainer.className = 'member-task-buttons';
    const availableTaskTypes = ['woodcutting', 'mining', 'hunting'];
    availableTaskTypes.forEach(taskType => {
        const taskDef = GUILD_MEMBER_DATA.taskTypes[taskType];
        if (taskDef) {
            const button = document.createElement('button');
            button.className = 'task-btn';
            button.dataset.id = memberId;
            button.dataset.taskType = taskType;
            button.innerHTML = `${taskDef.emoji || ''} ${taskDef.name}`;
            if (memberData.currentTask && memberData.currentTask.type === taskType) {
                button.classList.add('active-member-task');
            }
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                assignMemberTask(memberId, taskType);
            });
            taskButtonsContainer.appendChild(button);
        }
    });
    controlsWrapper.appendChild(taskButtonsContainer);
    // No direct appendChild to memberCard for mainContent, it's already part of innerHTML

    const finishEarlyContainer = document.createElement('div');
    finishEarlyContainer.className = 'member-finish-early-container';
    
    if (memberData.currentTask) {
        const finishEarlyButton = document.createElement('button');
        finishEarlyButton.className = 'finish-early-btn has-tooltip';
        finishEarlyButton.textContent = 'Finish Early';
        finishEarlyButton.dataset.memberId = memberId;
        finishEarlyButton.innerHTML += `<span class='member-tooltip'>Stat Bonus will <b>not</b> apply if finishing early!</span>`;
        finishEarlyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            finishMemberTaskEarly(memberId);
        });
        finishEarlyContainer.appendChild(finishEarlyButton);
    }
    // Append finishEarlyContainer to the mainContent's controlsWrapper or directly to memberCard
    // If it should be outside member-main-content:
    memberCard.appendChild(finishEarlyContainer);
    // If inside, then controlsWrapper.appendChild(finishEarlyContainer);
    
    memberCard.querySelectorAll('.member-secondary-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            trainMemberStat(badge.dataset.id, badge.dataset.stat);
        });
        badge.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trainMemberStat(badge.dataset.id, badge.dataset.stat);
            }
        });
    });

    return memberCard;
}

/**
 * Recruits a new guild member based on tier and title.
 */
function recruitGuildMember() {
    const existingCount = Object.keys(playerData.guild.members || {}).length;
    // Get Barracks level (default 0 if not purchased)
    const barracksLevel = playerData.guild.upgrades?.guildBarracks?.level || 0;
    let maxAllowedMembers = barracksLevel; // 1 member per Barracks level
    if (barracksLevel === 0) {
        logMessage('Purchase Guild Barracks Level 1 to recruit your first member.', 'fore-warning');
        return;
    }
    if (existingCount >= maxAllowedMembers) {
        logMessage(`Guild member capacity reached (${maxAllowedMembers}). Upgrade Guild Barracks to recruit more.`, 'fore-warning');
        return;
    }
    // The new member's tier is always the current number of members
    const recruitTier = existingCount;
    const recruitCost = GUILD_MEMBER_DATA.baseCost.gold + (recruitTier * 250);
    if (playerData.gold < recruitCost) {
        logMessage(`Not enough gold! Need ${formatNumber(recruitCost)} gold to recruit.`, "fore-danger");
        return;
    }
    
    const randomName = GUILD_MEMBER_DATA.names[Math.floor(Math.random() * GUILD_MEMBER_DATA.names.length)];
    const titleKeys = Object.keys(TITLE_STAT_PROFILES);
    const randomTitleKey = titleKeys[Math.floor(Math.random() * titleKeys.length)];
    const titleProfile = TITLE_STAT_PROFILES[randomTitleKey] || { lumberjack: 1, miner: 1, fighter: 1 }; // Fallback

    const totalBonusStats = MEMBER_RECRUIT_TIER_SETTINGS.getBonusStatsForTier(recruitTier);
    const baseStats = { ...MEMBER_RECRUIT_TIER_SETTINGS.baseSecondaryStats };
    
    let distributedBonuses = { lumberjack: 0, miner: 0, fighter: 0 };
    const sumOfRatios = titleProfile.lumberjack + titleProfile.miner + titleProfile.fighter;

    if (sumOfRatios > 0) {
        distributedBonuses.lumberjack = Math.floor((titleProfile.lumberjack / sumOfRatios) * totalBonusStats);
        distributedBonuses.miner = Math.floor((titleProfile.miner / sumOfRatios) * totalBonusStats);
        distributedBonuses.fighter = Math.floor((titleProfile.fighter / sumOfRatios) * totalBonusStats);

        let currentDistributedSum = distributedBonuses.lumberjack + distributedBonuses.miner + distributedBonuses.fighter;
        let remainder = totalBonusStats - currentDistributedSum;

        // Distribute remainder (prioritize fighter, then miner, then lumberjack)
        const statOrderForRemainder = ['fighter', 'miner', 'lumberjack'];
        for (const stat of statOrderForRemainder) {
            if (remainder <= 0) break;
            distributedBonuses[stat]++;
            remainder--;
        }
    }

    const finalStats = {
        lumberjack: baseStats.lumberjack + distributedBonuses.lumberjack,
        miner: baseStats.miner + distributedBonuses.miner,
        fighter: baseStats.fighter + distributedBonuses.fighter
    };

    const mainLevel = finalStats.lumberjack + finalStats.miner + finalStats.fighter;
    
    const newMemberId = `member_${Date.now()}`;
    const newMember = {
        name: `${randomName} ${randomTitleKey}`, // Full name with title
        title: randomTitleKey, // Store title separately if needed, though name now has it
        level: mainLevel,
        xp: getXpForLevel(mainLevel, MEMBER_LEVEL_PROGRESSION), // Total XP to be at this level
        xpToNext: getXpForLevel(mainLevel + 1, MEMBER_LEVEL_PROGRESSION), // Total XP for next level
        stats: finalStats,
        statMax: 10 + Math.floor(mainLevel / 2), // Initial secondary stat cap scales with starting main level
        joined: Date.now(),
        currentTask: null,
        recruitTier: recruitTier // Store the tier for reference
    };
    
    if (!playerData.guild.members) playerData.guild.members = {};
    playerData.guild.members[newMemberId] = newMember;
    playerData.gold -= recruitCost;
    
    // Apply Training Grounds / Stat Fortification if already purchased
    const fortifyBoost = getGuildUpgradeEffectValue('memberStatFortification', 'all_member_secondary_stat_boost_flat', 0);
    const trainingBoost = getGuildUpgradeEffectValue('trainingGrounds', 'all_member_stat_boost_flat', 0);
    const maxPassiveBoost = Math.max(fortifyBoost, trainingBoost);
    if (maxPassiveBoost > 0) {
        for (const stat of ['fighter', 'miner', 'lumberjack']) {
             newMember.stats[stat] = Math.max(newMember.stats[stat], maxPassiveBoost);
        }
        // Recalculate main level if stats changed due to passive boosts
        newMember.level = newMember.stats.lumberjack + newMember.stats.miner + newMember.stats.fighter;
        newMember.xp = getXpForLevel(newMember.level, MEMBER_LEVEL_PROGRESSION);
        newMember.xpToNext = getXpForLevel(newMember.level + 1, MEMBER_LEVEL_PROGRESSION);
    }
    
    savePlayerData();
    logMessage(`Recruited ${newMember.name} (Tier ${recruitTier}, Lvl ${newMember.level}) to your guild! Cost: ${formatNumber(recruitCost)} gold.`, "fore-success", "🏛️");
    updateHud();
    renderGuildMembers();
}


/**
 * Assigns a task to a guild member
 * @param {string} memberId - The ID of the guild member
 * @param {string} taskType - The type of task to assign ('woodcutting', 'mining', 'hunting', 'mission')
 */
function assignMemberTask(memberId, taskType) {
    const member = playerData.guild.members[memberId];
    if (!member) {
        logMessage(`Member not found!`, "fore-danger");
        return;
    }
    
    if (member.currentTask) {
        logMessage(`${member.name} is already busy!`, "fore-warning");
        return;
    }
    
    const taskData = GUILD_MEMBER_DATA.taskTypes[taskType];
    if (!taskData) {
        logMessage(`Unknown task type: ${taskType}`, "fore-danger");
        return;
    }

    let taskDuration = taskData.baseDurationMs;
     // Apply speed boost from "Task Boost" Guild Upgrade
    if (["woodcutting", "mining", "hunting"].includes(taskType)) {
        const speedBoost = getGuildUpgradeEffectValue("taskBoost", "member_task_speed_boost", 0);
        if (speedBoost > 0) taskDuration = Math.floor(taskDuration * (1 - speedBoost));
    }

    member.currentTask = {
        type: taskType,
        startTime: Date.now(),
        duration: taskDuration,
        progress: 0,
        loot: {}, 
        lootTableKey: taskType 
    };
    
    savePlayerData();
    logMessage(`Assigned ${taskData.name} task to ${member.name}.`, "fore-info", "🏛️");
    renderGuildMembers();
}


/**
 * Dismisses a guild member
 * @param {string} memberId - The ID of the guild member to dismiss
 */
function dismissGuildMember(memberId) {
    const member = playerData.guild.members[memberId];
    if (!member) {
        logMessage(`Member not found!`, "fore-danger");
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'confirm-dismiss-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h3>Dismiss Member</h3>
            <p>Are you sure you want to dismiss ${member.name} from your guild?</p>
            <div class="modal-actions">
                <button id="cancel-dismiss-btn">Cancel</button>
                <button id="confirm-dismiss-btn">Dismiss</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.remove();
        });
    }
    
    const cancelBtn = modal.querySelector('#cancel-dismiss-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.remove();
        });
    }
    
    const confirmBtn = modal.querySelector('#confirm-dismiss-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            delete playerData.guild.members[memberId];
            savePlayerData();
            logMessage(`Dismissed ${member.name} from your guild.`, "fore-warning");
            modal.style.display = 'none';
            modal.remove();
            renderGuildMembers();
        });
    }
}

/**
 * Renders guild missions in the missions tab
 */
function renderGuildMissions() {
    let missionsContainer = document.getElementById('guild-missions-tab').querySelector('#guild-missions-container') || document.getElementById('guild-missions-container');
    if (!missionsContainer) { 
        const missionsTab = document.getElementById('guild-missions-tab');
        if(missionsTab) {
            missionsTab.innerHTML = `<div id="guild-missions-container" class="guild-missions"></div>`;
            missionsContainer = missionsTab.querySelector('#guild-missions-container');
        } else {
            return;
        }
    }
    
    missionsContainer.innerHTML = '';
    
    if (!playerData.guild) {
        playerData.guild = {
            name: "Adventurer's Guild", level: 1, xp:0,
            members: {}, missions: {}, upgrades: {}, stash: {}
        };
        savePlayerData();
    }
    
    if (!playerData.guild.missions || Object.keys(playerData.guild.missions).length === 0) {
        generateAvailableMissions();
    }
    
    if (Object.keys(playerData.guild.missions).length === 0) {
        missionsContainer.innerHTML = `
            <p class="no-missions-message">No guild missions available. Check back later!</p>
        `;
    } else {
        missionsContainer.innerHTML = ''; 
        const activeMissions = [];
        const availableMissions = [];
        const completedMissions = [];
        
        for (const [missionId, mission] of Object.entries(playerData.guild.missions)) {
            if (mission.status === 'active') {
                activeMissions.push({ id: missionId, ...mission });
            } else if (mission.status === 'available') {
                availableMissions.push({ id: missionId, ...mission });
            } else if (mission.status === 'completed') {
                completedMissions.push({ id: missionId, ...mission });
            }
        }
        
        if (activeMissions.length > 0) {
            const activeMissionsSection = document.createElement('div');
            activeMissionsSection.className = 'missions-section';
            activeMissionsSection.innerHTML = `
                <h3 class="section-title">Active Missions</h3>
                <div class="missions-list active-missions"></div>
            `;
            const activeMissionsList = activeMissionsSection.querySelector('.missions-list');
            activeMissions.forEach(mission => {
                const missionCard = createMissionCard(mission.id, mission);
                activeMissionsList.appendChild(missionCard);
            });
            missionsContainer.appendChild(activeMissionsSection);
        }
        
        if (availableMissions.length > 0) {
            const availableMissionsSection = document.createElement('div');
            availableMissionsSection.className = 'missions-section';
            availableMissionsSection.innerHTML = `
                <h3 class="section-title">Available Missions</h3>
                <div class="missions-list available-missions"></div>
            `;
            const availableMissionsList = availableMissionsSection.querySelector('.missions-list');
            availableMissions.forEach(mission => {
                const missionCard = createMissionCard(mission.id, mission);
                availableMissionsList.appendChild(missionCard);
            });
            missionsContainer.appendChild(availableMissionsSection);
        }
        
        if (completedMissions.length > 0) {
            const recentCompletedMissions = completedMissions
                .sort((a, b) => b.completedAt - a.completedAt)
                .slice(0, 3);
            const completedMissionsSection = document.createElement('div');
            completedMissionsSection.className = 'missions-section';
            completedMissionsSection.innerHTML = `
                <h3 class="section-title">Recent Completed Missions</h3>
                <div class="missions-list completed-missions"></div>
            `;
            const completedMissionsList = completedMissionsSection.querySelector('.missions-list');
            recentCompletedMissions.forEach(mission => {
                const missionCard = createMissionCard(mission.id, mission);
                completedMissionsList.appendChild(missionCard);
            });
            missionsContainer.appendChild(completedMissionsSection);
        }
    }
        
    const refreshButton = document.createElement('button');
    refreshButton.className = 'guild-action-button';
    refreshButton.id = 'refresh-missions-btn';
    refreshButton.textContent = 'Refresh Missions';
    
    const oldRefreshButton = document.getElementById('refresh-missions-btn');
    if (oldRefreshButton) oldRefreshButton.remove();

    refreshButton.addEventListener('click', () => {
        generateAvailableMissions(true); 
        renderGuildMissions();
    });
    
    missionsContainer.appendChild(refreshButton);
}

/**
 * Creates a mission card element
 * @param {string} missionId - The ID of the mission
 * @param {object} mission - The mission object
 * @returns {HTMLElement} - The mission card element
 */
function createMissionCard(missionId, mission) {
    const missionCard = document.createElement('div');
    missionCard.className = `mission-card mission-${mission.status}`;
    missionCard.dataset.missionId = missionId;
    
    let progressDisplay = '';
    if (mission.status === 'active') {
        const progress = Math.min(1, (Date.now() - mission.startTime) / mission.duration);
        const progressPercent = Math.floor(progress * 100);
        progressDisplay = `
            <div class="mission-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-text">${progressPercent}% Complete</div>
            </div>
        `;
    }
    
    const rewardsDisplay = Object.entries(mission.rewards)
        .map(([type, value]) => {
            if (type === 'gold') return `<span class="reward gold-reward">${formatNumber(value)} Gold</span>`;
            if (type === 'exp') return `<span class="reward exp-reward">${formatNumber(value)} XP</span>`;
            if (type === 'item') return `<span class="reward item-reward">${value.amount}x ${value.name}</span>`;
            return '';
        }).join(', ');
    
    let actionButton = '';
    if (mission.status === 'available') {
        actionButton = `<button class="start-mission-btn" data-mission-id="${missionId}">Start Mission</button>`;
    } else if (mission.status === 'active' && (mission.progress || 0) >= 1 && mission.readyForCompletion) { 
        actionButton = `<button class="complete-mission-btn" data-mission-id="${missionId}">Complete Mission</button>`;
    }
    
    let requirementsDisplay = `${mission.requirements.members} Members`;
    if (mission.requirements.mainLevel) requirementsDisplay += `, Main Lvl: ${mission.requirements.mainLevel}`;
    if (mission.requirements.fighter) requirementsDisplay += `, Total Fighter: ${mission.requirements.fighter}`;
    if (mission.requirements.miner) requirementsDisplay += `, Total Miner: ${mission.requirements.miner}`;
    if (mission.requirements.lumberjack) requirementsDisplay += `, Total Lumberjack: ${mission.requirements.lumberjack}`;
    
    missionCard.innerHTML = `
        <div class="mission-header">
            <div class="mission-title">${mission.name}</div>
            <div class="mission-difficulty">${getMissionDifficultyLabel(mission.difficulty)}</div>
        </div>
        <div class="mission-description">${mission.description}</div>
        ${progressDisplay}
        <div class="mission-rewards">
            <div class="rewards-label">Rewards:</div>
            <div class="rewards-list">${rewardsDisplay || 'None specified'}</div>
        </div>
        <div class="mission-requirements">
            <div class="requirements-label">Requirements:</div>
            <div class="requirements-list">${requirementsDisplay}</div>
        </div>
        <div class="mission-actions">${actionButton}</div>
    `;
    
    const startMissionBtn = missionCard.querySelector('.start-mission-btn');
    if (startMissionBtn) {
        startMissionBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click if any
            showMissionMemberSelectionModal(missionId);
        });
    }
    
    const completeMissionBtn = missionCard.querySelector('.complete-mission-btn');
    if (completeMissionBtn) {
        completeMissionBtn.addEventListener('click', () => {
            completeMission(missionId);
        });
    }
    
    return missionCard;
}

/**
 * Gets a readable label for mission difficulty
 * @param {number} difficulty - The difficulty level (1-5)
 * @returns {string} - The difficulty label
 */
function getMissionDifficultyLabel(difficulty) {
    const labels = ['Easy', 'Standard', 'Challenging', 'Difficult', 'Extreme'];
    return labels[Math.min(Math.max(0, difficulty - 1), labels.length - 1)];
}

/**
 * Generates available missions for the guild
 * @param {boolean} forceRefresh - Whether to force refresh all available missions
 */
function generateAvailableMissions(forceRefresh = false) {
    if (!playerData.guild.missions) playerData.guild.missions = {};
    if (forceRefresh) {
        for (const missionId in playerData.guild.missions) {
            if (playerData.guild.missions[missionId].status === 'available') {
                delete playerData.guild.missions[missionId];
            }
        }
    }
    const availableMissionsCount = Object.values(playerData.guild.missions)
        .filter(mission => mission.status === 'available').length;
    const targetMissionCount = 3 + Math.floor(Math.random() * 3); 
    const missionsToGenerate = Math.max(0, targetMissionCount - availableMissionsCount);
    if (missionsToGenerate <= 0 && !forceRefresh) return;

    const missionTemplates = GUILD_MISSION_TEMPLATES; // Using imported templates

    const statBaseByDifficulty = { 1: 5, 2: 15, 3: 30, 4: 50, 5: 75 }; // Adjusted base for total stats
    const rewardBaseByDifficulty = { 1: 1000, 2: 2500, 3: 5000, 4: 10000, 5: 25000 }; // Using template gold which is already scaled

    for (let i = 0; i < missionsToGenerate; i++) {
        const template = missionTemplates[Math.floor(Math.random() * missionTemplates.length)];
        const missionId = `mission_${Date.now()}_${i}`;
        
        let requiredStatsObj = {};
        let mainLevelReq = 0;
        const difficulty = template.difficulty || 1;

        // Requirements from template
        const membersReq = template.requirements?.members || 1;
        
        // Simplified stat requirements based on difficulty and type for now
        if (template.type === "mining" || template.type.includes("miner")) {
            requiredStatsObj.miner = statBaseByDifficulty[difficulty] * membersReq;
        }
        if (template.type === "woodcutting" || template.type.includes("lumberjack")) {
            requiredStatsObj.lumberjack = statBaseByDifficulty[difficulty] * membersReq;
        }
        if (template.type === "combat" || template.type.includes("fighter")) {
            requiredStatsObj.fighter = statBaseByDifficulty[difficulty] * membersReq;
        }
        if (difficulty >= 3) mainLevelReq = 5 * difficulty;

        const requirements = {
            members: membersReq,
            mainLevel: mainLevelReq,
            ...requiredStatsObj
        };

        const durationMs = (template.durationHours || 1) * 60 * 60 * 1000;

        playerData.guild.missions[missionId] = {
            name: template.name,
            description: template.description,
            difficulty: difficulty,
            duration: durationMs,
            requirements: requirements,
            rewards: { // Use rewards directly from template, they are already scaled
                gold: template.rewards.baseGold,
                exp: template.rewards.baseXp, // This XP is for the guild
                item: template.rewards.item ? { ...template.rewards.item } : undefined,
                extraItems: template.rewards.extraItems ? [...template.rewards.extraItems] : undefined
            },
            status: 'available',
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // Expires in 24 hours
        };
    }
    savePlayerData();
}

/**
 * Starts a guild mission - now just shows the member selection modal.
 * @param {string} missionId - The ID of the mission to start
 */
function startGuildMission(missionId) {
    const mission = playerData.guild.missions[missionId];
    if (!mission || mission.status !== 'available') {
        logMessage(`Mission not available or not found.`, "fore-warning");
        return;
    }
    showMissionMemberSelectionModal(missionId);
}

/**
 * Checks the progress of all active guild missions
 */
function checkGuildMissions() {
    if (!playerData.guild || !playerData.guild.missions) return;
    let updatedMissions = false;

    for (const [missionId, mission] of Object.entries(playerData.guild.missions)) {
        if (mission.status === 'available' && mission.expiresAt && mission.expiresAt < Date.now()) {
            delete playerData.guild.missions[missionId];
            updatedMissions = true;
            continue;
        }
        if (mission.status !== 'active') continue;

        const elapsedTime = Date.now() - mission.startTime;
        const progress = Math.min(1, elapsedTime / mission.duration);
        mission.progress = progress;

        if (progress >= 1 && !mission.readyForCompletion) {
            mission.readyForCompletion = true; 
            logMessage(`Guild Mission "${mission.name}" is ready for completion!`, "fore-green", "🎉");
            updatedMissions = true;
        }
    }

    const availableMissionsCount = Object.values(playerData.guild.missions)
        .filter(m => m.status === 'available').length;
    if (availableMissionsCount < 3) { 
        generateAvailableMissions();
        updatedMissions = true;
    }

    if (updatedMissions) {
        savePlayerData();
        const guildSection = document.getElementById('guild-hall-section');
        if (guildSection && !guildSection.classList.contains('hidden') && document.getElementById('guild-missions-tab')?.classList.contains('active')) {
            renderGuildMissions();
        }
    }
}

/**
 * Completes a guild mission and distributes rewards
 * @param {string} missionId - The ID of the mission to complete
 */
function completeMission(missionId) {
    const mission = playerData.guild.missions[missionId];
    if (!mission || !mission.readyForCompletion) { 
        logMessage(`Mission not ready or not found.`, "fore-warning");
        return;
    }

    let rewardMessageParts = [`Mission "${mission.name}" complete!`];
    let finalRewards = { ...mission.rewards };

    const rewardBoost = getGuildUpgradeEffectValue("missionMastery", "guild_mission_reward_boost", 0) + 
                        getGuildUpgradeEffectValue("missionBoard", "mission_reward_boost", 0); // Stack boosts
    if (rewardBoost > 0) {
        if (finalRewards.gold) finalRewards.gold = Math.floor(finalRewards.gold * (1 + rewardBoost));
        if (finalRewards.exp) finalRewards.exp = Math.floor(finalRewards.exp * (1 + rewardBoost));
        if (finalRewards.item && finalRewards.item.amount) {
             finalRewards.item.amount = Math.floor(finalRewards.item.amount * (1 + rewardBoost));
        }
    }

    if (finalRewards.gold) {
        playerData.gold += finalRewards.gold;
        rewardMessageParts.push(`${formatNumber(finalRewards.gold)} gold`);
        updateHud();
    }
    if (finalRewards.exp) { 
        playerData.guild.xp = (playerData.guild.xp || 0) + finalRewards.exp;
        checkGuildLevelUp(); // Check for guild level up
        rewardMessageParts.push(`${finalRewards.exp} Guild XP`);
    }
    if (finalRewards.item && finalRewards.item.amount > 0) {
        addItemToInventory(finalRewards.item.name, finalRewards.item.amount); // Add to player inventory for now
        // Or, to guild stash: addToGuildStash(finalRewards.item.name, finalRewards.item.amount, true); // true to bypass player inv check
        rewardMessageParts.push(`${finalRewards.item.amount}x ${finalRewards.item.name}`);
    }
    
    // Handle extraItems (Ancient Tomes and other bonus rewards)
    if (finalRewards.extraItems && Array.isArray(finalRewards.extraItems)) {
        finalRewards.extraItems.forEach(extraItem => {
            if (Math.random() < extraItem.chance) {
                const amount = Array.isArray(extraItem.amount) 
                    ? Math.floor(Math.random() * (extraItem.amount[1] - extraItem.amount[0] + 1)) + extraItem.amount[0]
                    : extraItem.amount;
                addItemToInventory(extraItem.name, amount);
                rewardMessageParts.push(`${amount}x ${extraItem.name} (bonus)`);
                if (extraItem.name === 'ancient_tomes') {
                    logMessage(`📚 Ancient knowledge discovered! Found ${amount} Ancient Tomes!`, "fore-purple", "📚");
                }
            }
        });
    }
    
    if (mission.assignedMembers) {
        mission.assignedMembers.forEach(memberId => {
            const member = playerData.guild.members[memberId];
            if (member) {
                if (member.currentTask && member.currentTask.type === 'mission' && member.currentTask.missionId === missionId) {
                    member.currentTask = null; 
                }
                const memberXpGain = GUILD_MEMBER_DATA.taskTypes.mission.baseXpPerCompletion * (mission.difficulty || 1);
                member.xp = (member.xp || 0) + memberXpGain; // XP towards member's main level
                checkMemberLevelUp(member); 
            }
        });
    }

    mission.status = 'completed';
    mission.completedAt = Date.now();
    delete mission.readyForCompletion; 
    delete mission.assignedMembers;

    savePlayerData();
    logMessage(rewardMessageParts.join(' '), "fore-success", "🏛️");
    renderGuildMissions();
    renderGuildMembers(); 
}

/**
 * Gets all available upgrades based on GUILD_UPGRADE_DATA and current guild level
 * @returns {Array} - Array of available upgrades
 */
function getAvailableUpgrades() {
    const currentGuildLevel = playerData.guild.level || 1;
    return Object.values(GUILD_UPGRADE_DATA).filter(upgrade => {
        const firstLevelReq = upgrade.levels?.[0]?.guildLevelReq;
        return firstLevelReq <= currentGuildLevel;
    });
}

/**
 * Renders guild upgrades in the upgrades tab
 */
function renderGuildUpgrades() {
    window.purchaseGuildUpgrade = purchaseGuildUpgrade; // Ensure it's globally accessible

    let upgradesContainer = document.getElementById('guild-upgrades-tab').querySelector('#guild-upgrades-container');
    if (!upgradesContainer) {
        const upgradesTab = document.getElementById('guild-upgrades-tab');
        if(upgradesTab) {
            upgradesTab.innerHTML = `<div id="guild-upgrades-container"></div>`;
            upgradesContainer = document.getElementById('guild-upgrades-container');
        } else { return; }
    }
    
    const guildLevel = playerData.guild?.level || 1;
    const guildXp = playerData.guild?.xp || 0;
    const maxGuildLevel = GUILD_LEVEL_PROGRESSION_XP.length; // Max level is length of XP array
    const xpForNextGuildLevel = guildLevel < maxGuildLevel ? GUILD_LEVEL_PROGRESSION_XP[guildLevel] : Infinity;
    const currentGuildLevelXpBase = GUILD_LEVEL_PROGRESSION_XP[guildLevel -1] || 0;
    const xpProgressTowardsNext = Math.max(0, guildXp - currentGuildLevelXpBase);
    const xpNeededForNextOverall = Math.max(0, xpForNextGuildLevel - currentGuildLevelXpBase);
    const progressPercent = xpNeededForNextOverall > 0 ? (xpProgressTowardsNext / xpNeededForNextOverall) * 100 : 100;


    let html = `<div class="guild-level-info">
        <div class="guild-level-display">
            <span class="guild-level-label">Guild Level</span>
            <span class="guild-level-value">${guildLevel}</span>
            <span class="guild-level-max">/ ${maxGuildLevel}</span>
        </div>
        <div class="guild-xp-bar-container">
            <div class="guild-xp-bar-fill" style="width:${progressPercent.toFixed(2)}%;"></div>
        </div>
        <div class="guild-xp-text">${formatNumber(xpProgressTowardsNext)} / ${formatNumber(xpNeededForNextOverall)} XP to Lvl ${guildLevel + 1}</div>
    </div>`;

    html += '<div class="guild-upgrades-list">';
    for (const upgradeId in GUILD_UPGRADE_DATA) {
        const upgradeData = GUILD_UPGRADE_DATA[upgradeId];
        let currentLevel = Number(playerData.guild.upgrades?.[upgradeId]?.level) || 0;
        const maxUpgradeLevel = upgradeData.maxLevel || upgradeData.levels.length; // Use maxLevel if defined, else length of levels array
        const emoji = upgradeData.emoji || '❓';
        
        const nextLevelIdx = currentLevel; // Index for the level *to be purchased*
        const isMaxed = currentLevel >= maxUpgradeLevel;
        const nextLevelData = !isMaxed && upgradeData.levels && upgradeData.levels[nextLevelIdx] ? upgradeData.levels[nextLevelIdx] : null;

        html += `<div class="guild-upgrade-card">
            <div class="guild-upgrade-header">
                <span class="guild-upgrade-emoji">${emoji}</span>
                <span class="guild-upgrade-title">${upgradeData.name}</span>
                <span class="guild-upgrade-level">${currentLevel}/${maxUpgradeLevel}</span>
            </div>
            <div class="guild-upgrade-description">${upgradeData.description}</div>`;

        if (currentLevel > 0 && upgradeData.levels[currentLevel - 1]) {
            const effectDesc = upgradeData.levels[currentLevel - 1].effectDescription;
            html += `<div class="guild-upgrade-effect-current">Current: ${effectDesc}</div>`;
        }

        if (!isMaxed && nextLevelData) {
            const canAffordGold = !nextLevelData.cost.gold || playerData.gold >= nextLevelData.cost.gold;
            let canAffordStash = true;
            let costString = "";
            for (const [res, amt] of Object.entries(nextLevelData.cost)) {
                costString += `${formatNumber(amt)} ${res}, `;
                if (res !== 'gold' && (playerData.guild.stash?.[res] || 0) < amt) {
                    canAffordStash = false;
                }
            }
            costString = costString.slice(0, -2); // Remove trailing comma and space

            const meetsGuildLevelReq = guildLevel >= nextLevelData.guildLevelReq;
            const canPurchase = canAffordGold && canAffordStash && meetsGuildLevelReq;

            html += `<div class="guild-upgrade-next">
                <div class="guild-upgrade-next-level">Next: Level ${currentLevel + 1} (Req. Guild Lvl ${nextLevelData.guildLevelReq})</div>
                <div class="guild-upgrade-next-effect">${nextLevelData.effectDescription}</div>
                <div class="guild-upgrade-next-cost">Cost: ${costString}</div>
            </div>`;
            html += `<button class="guild-upgrade-purchase-btn" ${canPurchase ? '' : 'disabled'} onclick="purchaseGuildUpgrade('${upgradeId}')">Purchase</button>`;
        } else if (isMaxed) {
            html += `<div class="guild-upgrade-max-level">Max Level Reached</div>`;
            html += `<button class="guild-upgrade-purchase-btn" disabled>Maxed</button>`;
        } else {
             html += `<div class="guild-upgrade-req" style="color:#f44747;">Upgrade data error or no further levels.</div>`;
             html += `<button class="guild-upgrade-purchase-btn" disabled>Error</button>`;
        }
        html += '</div>';
    }
    html += '</div>';
    upgradesContainer.innerHTML = html;
}


/**
 * Renders guild stash in the stash tab
 */
function renderGuildStash() {
    let stashContainer = document.getElementById('guild-stash-tab').querySelector('#guild-stash-container') || document.getElementById('guild-stash-container');
    if (!stashContainer) {
        const stashTab = document.getElementById('guild-stash-tab');
        if(stashTab) {
            stashTab.innerHTML = `<div id="guild-stash-container" class="guild-stash"></div>`;
            stashContainer = stashTab.querySelector('#guild-stash-container');
        } else {
            return;
        }
    }
    
    stashContainer.innerHTML = ''; 

    if (!playerData.guild) {
        playerData.guild = { name: "Adventurer's Guild", level: 1, xp:0, members: {}, missions: {}, upgrades: {}, stash: {} };
    }
    if (!playerData.guild.stash) playerData.guild.stash = {};

    let baseMaxStashCapacity = 500 + ((playerData.guild.level || 1) * 100);
    const capacityBonusFlat = getGuildUpgradeEffectValue('guildStashOptimization', 'guild_stash_capacity_bonus_flat', 0) + 
                              getGuildUpgradeEffectValue('storageExpansion', 'stash_capacity_boost', 0); // Treat percentage as flat for now.
    // If 'storageExpansion' is percentage:
    // const capacityBonusPercent = getGuildUpgradeEffectValue('storageExpansion', 'stash_capacity_boost', 0);
    // baseMaxStashCapacity = Math.floor(baseMaxStashCapacity * (1 + capacityBonusPercent));
    const maxStashCapacity = baseMaxStashCapacity + capacityBonusFlat;
    
    let currentStashUsage = 0;
    Object.values(playerData.guild.stash || {}).forEach(amount => currentStashUsage += (typeof amount === 'number' ? amount : 0));

    let totalGoldValue = 0;
    for (const [itemName, amount] of Object.entries(playerData.guild.stash)) {
        if (itemName === 'gold') continue;
        let price = ITEM_SELL_PRICES[itemName] || ITEM_DATA[itemName]?.sell_price || 0;
        totalGoldValue += (price * amount);
    }

    const stashHeader = document.createElement('div');
    stashHeader.className = 'stash-header';
    stashHeader.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0;">Guild Stash</h3>
                <div class="stash-capacity">
                    <div class="capacity-text">Capacity: ${currentStashUsage} / ${maxStashCapacity}</div>
                    <div class="capacity-bar"><div class="capacity-fill" style="width: ${Math.min(100, (currentStashUsage / maxStashCapacity) * 100)}%"></div></div>
                </div>
                <div class="stash-gold-value" style="margin-top:8px;font-weight:bold;">Total Stash Value: <span style='color:gold;'>${formatNumber(totalGoldValue)} Gold</span></div>
            </div>
            <div class="resource-controls" style="display: flex; gap: 8px;">
                <button id="deposit-to-stash-btn" class="guild-action-button">Deposit</button>
                <button id="withdraw-from-stash-btn" class="guild-action-button">Withdraw</button>
            </div>
        </div>
    `;
    stashContainer.appendChild(stashHeader);

    const depositBtn = stashHeader.querySelector('#deposit-to-stash-btn');
    if (depositBtn) {
        const newDepositBtn = depositBtn.cloneNode(true);
        depositBtn.parentNode.replaceChild(newDepositBtn, depositBtn);
        newDepositBtn.addEventListener('click', showDepositResourcesDialog);
    }
    const withdrawBtn = stashHeader.querySelector('#withdraw-from-stash-btn');
    if(withdrawBtn) {
        const newWithdrawBtn = withdrawBtn.cloneNode(true);
        withdrawBtn.parentNode.replaceChild(newWithdrawBtn, withdrawBtn);
        newWithdrawBtn.addEventListener('click', showWithdrawResourcesDialog);
    }

    const stashContents = document.createElement('div');
    stashContents.className = 'stash-contents';
    const stashGrid = document.createElement('div');
    stashGrid.className = 'inventory-grid'; 

    const goldAmount = playerData.guild.stash.gold || 0;
    const goldDiv = document.createElement('div');
    goldDiv.className = 'inventory-item';
    goldDiv.innerHTML = `
        <div class="item-icon">💰</div>
        <div class="item-details">
            <div class="item-name">Gold</div>
            <div class="item-amount">${formatNumber(goldAmount)}</div>
        </div>
    `;
    stashGrid.appendChild(goldDiv);

    let hasOtherItems = false;
    for (const [itemName, amount] of Object.entries(playerData.guild.stash)) {
        if (itemName === 'gold' || amount <= 0) continue;
        hasOtherItems = true;
        let itemDetails = ITEM_DATA[itemName] || ORE_DATA[itemName] || TREE_DATA[itemName] || { name: itemName, emoji: '❓' };
        let emoji = itemDetails.emoji || '❓';
        let displayName = itemDetails.name || itemName;
        stashGrid.innerHTML += `
            <div class="inventory-item">
                <div class="item-icon">${emoji}</div>
                <div class="item-details">
                    <div class="item-name">${displayName}</div>
                    <div class="item-amount">${formatNumber(amount)}</div>
                </div>
            </div>
        `;
    }
    if (!hasOtherItems && goldAmount === 0) {
        stashGrid.innerHTML += `<p class="no-stash-message">Guild stash is empty.</p>`;
    }
    stashContents.appendChild(stashGrid);
    stashContainer.appendChild(stashContents);
}


/**
 * Shows dialog for depositing resources to the guild stash
 */
function showDepositResourcesDialog() {
    const depositableItems = Object.entries(playerData.inventory)
        .filter(([name, qty]) => typeof qty === 'number' && qty > 0 && name !== 'gold' && name !== 'perk_points');

    if (depositableItems.length === 0) {
        logMessage("You have no items to deposit.", "fore-warning");
        return;
    }

    let baseMaxStashCapacity = 500 + ((playerData.guild.level || 1) * 100);
    const capacityBonusFlat = getGuildUpgradeEffectValue('guildStashOptimization', 'guild_stash_capacity_bonus_flat', 0) + 
                              getGuildUpgradeEffectValue('storageExpansion', 'stash_capacity_boost', 0);
    const maxStashCapacity = baseMaxStashCapacity + capacityBonusFlat;
    
    let currentStashUsage = 0;
    Object.values(playerData.guild.stash || {}).forEach(amount => currentStashUsage += (typeof amount === 'number' ? amount : 0));
    const remainingCapacity = maxStashCapacity - currentStashUsage;


    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'deposit-resources-modal';
    
    let resourceOptionsHTML = depositableItems.map(([itemName, currentQty]) => {
        const itemDetails = ITEM_DATA[itemName] || { name: itemName, emoji: '❓' };
        return `
            <div class="resource-option">
                <span class="item-icon">${itemDetails.emoji}</span>
                <span class="resource-name">${itemDetails.name} (Have: ${currentQty})</span>
                <input type="number" id="deposit-${itemName.replace(/\s+/g, '-')}" value="1" min="1" max="${currentQty}" style="width: 60px;">
                <button class="deposit-resource-btn" data-item-name="${itemName}">Deposit</button>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h3>Deposit to Guild Stash</h3>
            <p>Stash Space: ${currentStashUsage} / ${maxStashCapacity} (Remaining: ${remainingCapacity})</p>
            <div class="resource-options-list" style="max-height: 300px; overflow-y: auto;">
                ${resourceOptionsHTML || "<p>No depositable items in your inventory.</p>"}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    const closeModal = () => { modal.style.display = 'none'; modal.remove(); renderGuildStash(); };
    modal.querySelector('.modal-close').addEventListener('click', closeModal);

    modal.querySelectorAll('.deposit-resource-btn').forEach(button => {
        button.addEventListener('click', () => {
            const itemName = button.dataset.itemName;
            const inputEl = document.getElementById(`deposit-${itemName.replace(/\s+/g, '-')}`);
            let amountToDeposit = parseInt(inputEl.value, 10);

            if (isNaN(amountToDeposit) || amountToDeposit <= 0) {
                logMessage("Invalid amount.", "fore-danger");
                return;
            }
            if (amountToDeposit > playerData.inventory[itemName]) {
                logMessage(`Not enough ${itemName} to deposit.`, "fore-danger");
                amountToDeposit = playerData.inventory[itemName]; 
            }
            if (currentStashUsage + amountToDeposit > maxStashCapacity) {
                 logMessage(`Not enough stash capacity. Max deposit: ${remainingCapacity}.`, "fore-danger");
                 amountToDeposit = remainingCapacity; 
                 if (amountToDeposit <= 0) {
                     logMessage("Stash is full.", "fore-danger");
                     return;
                 }
            }
            
            addToGuildStash(itemName, amountToDeposit); 
            closeModal(); 
        });
    });
}

/**
 * Shows dialog for withdrawing resources from the guild stash
 */
function showWithdrawResourcesDialog() {
    const withdrawableItems = Object.entries(playerData.guild.stash || {})
        .filter(([name, qty]) => typeof qty === 'number' && qty > 0 && name !== 'gold');

    if (withdrawableItems.length === 0) {
        logMessage("Guild stash is empty (no items to withdraw).", "fore-warning");
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'withdraw-resources-modal';

    let resourceOptionsHTML = withdrawableItems.map(([itemName, currentQty]) => {
        const itemDetails = ITEM_DATA[itemName] || { name: itemName, emoji: '❓' };
        return `
            <div class="resource-option">
                <span class="item-icon">${itemDetails.emoji}</span>
                <span class="resource-name">${itemDetails.name} (Stashed: ${currentQty})</span>
                <input type="number" id="withdraw-${itemName.replace(/\s+/g, '-')}" value="1" min="1" max="${currentQty}" style="width: 60px;">
                <button class="withdraw-resource-btn" data-item-name="${itemName}">Withdraw</button>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h3>Withdraw from Guild Stash</h3>
            <div class="resource-options-list" style="max-height: 300px; overflow-y: auto;">
                ${resourceOptionsHTML}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    const closeModal = () => { modal.style.display = 'none'; modal.remove(); renderGuildStash(); };
    modal.querySelector('.modal-close').addEventListener('click', closeModal);

    modal.querySelectorAll('.withdraw-resource-btn').forEach(button => {
        button.addEventListener('click', () => {
            const itemName = button.dataset.itemName;
            const inputEl = document.getElementById(`withdraw-${itemName.replace(/\s+/g, '-')}`);
            let amountToWithdraw = parseInt(inputEl.value, 10);

            if (isNaN(amountToWithdraw) || amountToWithdraw <= 0) {
                logMessage("Invalid amount.", "fore-danger");
                return;
            }
            if (amountToWithdraw > playerData.guild.stash[itemName]) {
                logMessage(`Not enough ${itemName} in stash.`, "fore-danger");
                amountToWithdraw = playerData.guild.stash[itemName];
            }
            
            takeFromGuildStash(itemName, amountToWithdraw);
            closeModal();
        });
    });
}


/**
 * Adds an item to the guild stash
 * @param {string} itemId - The ID of the item to add
 * @param {number} quantity - The quantity to add
 * @param {boolean} bypassPlayerInvCheck - If true, doesn't check player inventory (e.g., for mission rewards)
 */
function addToGuildStash(itemId, quantity, bypassPlayerInvCheck = false) {
    if (!itemId || quantity <= 0) {
        logMessage(`Invalid item or quantity for stash deposit!`, "fore-danger");
        return;
    }
    if (!bypassPlayerInvCheck && (!playerData.inventory || (playerData.inventory[itemId] || 0) < quantity)) {
        logMessage(`You don't have enough ${itemId} to deposit!`, "fore-danger");
        return;
    }

    let baseMaxStashCapacity = 500 + ((playerData.guild.level || 1) * 100);
    const capacityBonusFlat = getGuildUpgradeEffectValue('guildStashOptimization', 'guild_stash_capacity_bonus_flat', 0) + 
                              getGuildUpgradeEffectValue('storageExpansion', 'stash_capacity_boost', 0);
    const maxStashCapacity = baseMaxStashCapacity + capacityBonusFlat;
    
    let currentStashUsage = 0;
    Object.values(playerData.guild.stash || {}).forEach(amount => currentStashUsage += (typeof amount === 'number' ? amount : 0));
    if (currentStashUsage + quantity > maxStashCapacity) {
        logMessage(`Not enough stash capacity. Can only store ${maxStashCapacity - currentStashUsage} more.`, "fore-danger");
        return;
    }

    playerData.guild.stash[itemId] = (playerData.guild.stash[itemId] || 0) + quantity;
    if (!bypassPlayerInvCheck) {
        playerData.inventory[itemId] -= quantity;
        if (playerData.inventory[itemId] <= 0) delete playerData.inventory[itemId];
    }
    
    savePlayerData();
    logMessage(`Deposited ${quantity}x ${itemId} to guild stash.`, "fore-success", "🏛️");
    updateHud(); 
}

/**
 * Takes an item from the guild stash
 * @param {string} itemId - The ID of the item to take
 * @param {number} quantity - The quantity to take
 */
function takeFromGuildStash(itemId, quantity) {
    if (!itemId || quantity <= 0) {
        logMessage(`Invalid item or quantity for stash withdrawal!`, "fore-danger");
        return;
    }
    if (!playerData.guild.stash || (playerData.guild.stash[itemId] || 0) < quantity) {
        logMessage(`Not enough ${itemId} in guild stash!`, "fore-danger");
        return;
    }

    if (!playerData.inventory) playerData.inventory = {};
    playerData.inventory[itemId] = (playerData.inventory[itemId] || 0) + quantity;
    playerData.guild.stash[itemId] -= quantity;
    if (playerData.guild.stash[itemId] <= 0) delete playerData.guild.stash[itemId];

    savePlayerData();
    logMessage(`Withdrew ${quantity}x ${itemId} from guild stash.`, "fore-info", "🏛️");
    updateHud(); 
}

/**
 * Initializes guild intervals for periodic checks
 */
export function initGuildIntervals() {
    if (guildMemberTaskInterval) clearInterval(guildMemberTaskInterval);
    if (guildMissionCheckInterval) clearInterval(guildMissionCheckInterval);
    
    guildMemberTaskInterval = setInterval(processGuildMemberTasks, GUILD_MEMBER_TASK_TICK_INTERVAL_MS);
    guildMissionCheckInterval = setInterval(checkGuildMissions, GUILD_MISSION_CHECK_INTERVAL_MS);
    
    console.log('Guild intervals initialized.');
}

/**
 * Processes tasks for all guild members - generates loot per tick.
 */
function processGuildMemberTasks() {
    if (!playerData.guild || !playerData.guild.members) return;
    let updatedAnyMember = false;
    let tickLootLog = [];

    for (const [memberId, member] of Object.entries(playerData.guild.members)) {
        if (!member.currentTask) continue;

        const task = member.currentTask;
        const elapsedTime = Date.now() - task.startTime;
        task.progress = Math.min(1, elapsedTime / task.duration);

        const lootBefore = { ...task.loot };

        const lootTable = GUILD_MEMBER_LOOT_TABLES[task.lootTableKey];
        if (lootTable) {
            lootTable.categories.forEach(category => {
                if (member.level >= (category.minMemberLevel || 0) && Math.random() < (category.categoryChance || 0.1)) {
                    category.items.forEach(itemEntry => {
                        let meetsRequirement = true;
                        if (task.type === 'woodcutting' && itemEntry.treeType) {
                            meetsRequirement = member.level >= (TREE_DATA[itemEntry.treeType]?.level || 0);
                        } else if (task.type === 'mining' && itemEntry.oreType) {
                            meetsRequirement = member.level >= (ORE_DATA[itemEntry.oreType]?.level_req || 0);
                        }
                        
                        const skillStatValue = member.stats[GUILD_MEMBER_DATA.taskTypes[task.type]?.skillStat] || 1;
                        const effectiveItemChance = (itemEntry.itemChance || 0.1) * (1 + (skillStatValue * (itemEntry.skillBonusFactor || 0)));
                        if (meetsRequirement && Math.random() < effectiveItemChance) {
                            let itemName = itemEntry.item; 
                            let itemData;
                            if (task.type === 'woodcutting' && itemEntry.treeType) {
                                itemData = TREE_DATA[itemEntry.treeType];
                                if (itemData) itemName = itemData.log;
                            } else if (task.type === 'mining' && itemEntry.oreType) {
                                itemData = ORE_DATA[itemEntry.oreType];
                                if (itemData) itemName = itemData.item_name;
                            }
                            if (itemName) {
                                const qty = (itemEntry.baseMinQty || 1) + Math.floor(Math.random() * ((itemEntry.baseMaxQty || 1) - (itemEntry.baseMinQty || 1) + 1));
                                task.loot[itemName] = (task.loot[itemName] || 0) + qty;
                                updatedAnyMember = true;
                            }
                        }
                    });
                }
            });

            if (task.type === 'hunting') {
                const fighterSkill = member.stats.fighter || 1;
                lootTable.categories.forEach(category => { 
                    if (member.level >= category.minMemberLevel && Math.random() < category.categoryChance) {
                        const eligibleMonsters = Object.entries(MONSTER_DATA)
                            .filter(([_, mData]) => mData.level_req <= member.level && 
                                ( (category.name === "Low-Level Prey" && mData.level_req < 15) ||
                                  (category.name === "Mid-Level Prey" && mData.level_req >= 15 && mData.level_req < 40) ||
                                  (category.name === "High-Level Prey" && mData.level_req >= 40) )
                            );
                        if (eligibleMonsters.length > 0) {
                            const [monsterName, monsterDetails] = eligibleMonsters[Math.floor(Math.random() * eligibleMonsters.length)];
                            if (monsterDetails && Array.isArray(monsterDetails.drops)) {
                                monsterDetails.drops.forEach(drop => {
                                    const dropChance = drop.base_chance * (1 + (fighterSkill * (category.fighterSkillFactor || 0.01)));
                                    if (drop.always_drop_one || Math.random() < dropChance) {
                                        const quantity = (drop.quantity && drop.quantity.length === 2)
                                            ? Math.floor(Math.random() * (drop.quantity[1] - drop.quantity[0] + 1)) + drop.quantity[0]
                                            : (drop.quantity || [1,1])[0];
                                        if (quantity > 0) {
                                            task.loot[drop.item_name] = (task.loot[drop.item_name] || 0) + quantity;
                                            updatedAnyMember = true;
                                        }
                                    }
                                });
                            }
                        }
                    }
                });
            }
        }

        let lootGainedThisTick = false;
        let currentTickDiff = [];
        if (task.loot) {
            for (const [item, qty] of Object.entries(task.loot)) {
                const before = lootBefore[item] || 0;
                if (qty > before) {
                    lootGainedThisTick = true;
                    currentTickDiff.push(`${qty - before}x ${item}`);
                }
            }
        }
        if (lootGainedThisTick) {
            tickLootLog.push(`${member.name} gained: ${currentTickDiff.join(', ')}`);
        }

        if (task.progress >= 1) {
            processTaskRewards(memberId, member, task);
            member.currentTask = null;
            updatedAnyMember = true;
        }
    }

    if (tickLootLog.length > 0) {
        logMessage(`[Tick] ${tickLootLog.join(' | ')}`, 'fore-info');
    }

    if (updatedAnyMember) {
        savePlayerData();
        if (document.getElementById('guild-hall-section') && !document.getElementById('guild-hall-section').classList.contains('hidden') && document.getElementById('guild-members-tab')?.classList.contains('active')) {
            renderGuildMembers();
        }
    }
}


/**
 * Process rewards for completed guild member tasks (full duration).
 * Transfers loot, awards XP, and attempts skill improvement.
 * @param {string} memberId - The ID of the guild member
 * @param {object} member - The member object
 * @param {object} task - The completed task
 */
function processTaskRewards(memberId, member, task) {
    let rewardMessageParts = [`${member.name} completed ${GUILD_MEMBER_DATA.taskTypes[task.type]?.name || task.type} task.`];

    const taskDef = GUILD_MEMBER_DATA.taskTypes[task.type];
    let relevantStat = taskDef?.skillStat; 
    let statValue = relevantStat ? (member.stats[relevantStat] || 0) : 0;
    
    let finalLoot = { ...task.loot }; // Start with accumulated loot

    // Apply resource yield boost from "Task Boost" Guild Upgrade
    let yieldBoost = 0;
    if (["woodcutting", "mining", "hunting"].includes(task.type)) {
        yieldBoost += getGuildUpgradeEffectValue("taskBoost", "member_task_resource_yield_boost", 0);
    }
    // Apply secondary stat loot bonus (only for full duration tasks)
    let secondaryStatBonusMultiplier = statValue * 0.1; // 10% per stat point
    yieldBoost += secondaryStatBonusMultiplier;

    let bonusLootLog = [];
    if (yieldBoost > 0 && finalLoot && Object.keys(finalLoot).length > 0) {
        for (const [itemName, quantity] of Object.entries(finalLoot)) {
            const bonusQty = Math.floor(quantity * yieldBoost);
            if (bonusQty > 0) {
                finalLoot[itemName] += bonusQty;
                bonusLootLog.push(`${bonusQty} bonus (${(yieldBoost * 100).toFixed(0)}%) to ${itemName}`);
            }
        }
    }

    if (finalLoot && Object.keys(finalLoot).length > 0) {
        let stashedItems = [];
        for (const [itemName, quantity] of Object.entries(finalLoot)) {
            if (quantity > 0) {
                playerData.guild.stash[itemName] = (playerData.guild.stash[itemName] || 0) + quantity;
                stashedItems.push(`${quantity} ${itemName}`);
            }
        }
        if (stashedItems.length > 0) {
            let lootMsg = `Stashed: ${stashedItems.join(', ')}.`;
            if (bonusLootLog.length > 0) {
                 lootMsg += ` (Total bonus yield: ${(yieldBoost * 100).toFixed(0)}%)`;
            }
            rewardMessageParts.push(lootMsg);
        }
    }

    // Check for Ancient Tome from Arcane Library upgrade
    if (["woodcutting", "mining", "hunting"].includes(task.type)) {
        const ancientTomeChance = getGuildUpgradeEffectValue("arcaneLibrary", "ancient_tome_chance", 0);
        if (ancientTomeChance > 0 && Math.random() < ancientTomeChance) {
            playerData.guild.stash["ancient tome"] = (playerData.guild.stash["ancient tome"] || 0) + 1;
            rewardMessageParts.push(`Found a rare Ancient Tome!`);
        }
    }

    let baseXpGain = taskDef?.baseXpPerCompletion || 50; 
    let lootValueXpBonus = 0;
    if (finalLoot) {
        for (const [itemName, quantity] of Object.entries(finalLoot)) {
            const itemDetails = ITEM_DATA[itemName] || ORE_DATA[itemName] || TREE_DATA[itemName]; 
            lootValueXpBonus += (ITEM_SELL_PRICES?.[itemName] || itemDetails?.xp || 1) * quantity * 0.1; 
        }
    }
    const totalXpGained = Math.floor(baseXpGain + lootValueXpBonus);
    member.xp = (member.xp || 0) + totalXpGained; // Add to total XP
    rewardMessageParts.push(`Gained ${totalXpGained} XP.`);
    checkMemberLevelUp(member);

    if (relevantStat && member.stats[relevantStat] < (member.statMax || 100)) {
        const skillImproveChance = 0.3 + (member.level * 0.01); 
        if (Math.random() < skillImproveChance) {
            member.stats[relevantStat]++;
            rewardMessageParts.push(`${relevantStat.charAt(0).toUpperCase() + relevantStat.slice(1)} skill improved to ${member.stats[relevantStat]}!`);
        }
    }

    let bonusGold = 10 + Math.floor(Math.random() * (member.level * 2)); 
    if (relevantStat) {
        bonusGold += Math.floor((member.stats[relevantStat] || 1) * 1.5); 
    }
    playerData.guild.stash.gold = (playerData.guild.stash.gold || 0) + bonusGold;
    rewardMessageParts.push(`Added ${bonusGold} bonus gold to stash.`);

    logMessage(rewardMessageParts.join(' '), "fore-cyan", "🏆");
}

/**
 * Checks and processes member level ups.
 * @param {object} member - The guild member object.
 */
function checkMemberLevelUp(member) {
    const oldLevel = member.level;
    const newLevel = getLevelFromXp(member.xp, MEMBER_LEVEL_PROGRESSION);
    
    if (newLevel > oldLevel) {
        member.level = newLevel;
        member.xpToNext = getXpForLevel(member.level + 1, MEMBER_LEVEL_PROGRESSION);
        member.statMax = (member.statMax || 10) + (5 * (member.level - oldLevel)); 
        logMessage(`${member.name} leveled up to Main Level ${member.level}! Secondary stat cap increased.`, "fore-green", "🌟");
    } else if (newLevel === oldLevel) {
        // Ensure xpToNext is correctly set even if no level up, in case it was wrong before
        member.xpToNext = getXpForLevel(member.level + 1, MEMBER_LEVEL_PROGRESSION);
    }
}


/**
 * Finishes a member's task early. Transfers accumulated loot to guild stash.
 * No XP or secondary stat improvements.
 * @param {string} memberId - The ID of the guild member
 */
function finishMemberTaskEarly(memberId) {
    const member = playerData.guild.members[memberId];
    if (!member || !member.currentTask) {
        logMessage("This member is not on a task or does not exist.", "fore-danger");
        return;
    }

    const task = member.currentTask;
    const taskDef = GUILD_MEMBER_DATA.taskTypes[task.type] || { name: task.type };
    let lootMessageParts = [`${member.name} finished ${taskDef.name} task early.`];

    if (task.loot && Object.keys(task.loot).length > 0) {
        let stashedItems = [];
        for (const [itemName, quantity] of Object.entries(task.loot)) {
            if (quantity > 0) {
                playerData.guild.stash[itemName] = (playerData.guild.stash[itemName] || 0) + quantity;
                stashedItems.push(`${quantity} ${itemName}`);
            }
        }
        if (stashedItems.length > 0) {
            lootMessageParts.push(`Stashed: ${stashedItems.join(', ')}.`);
        } else {
            lootMessageParts.push("No significant loot gathered.");
        }
    } else {
        lootMessageParts.push("No loot gathered.");
    }

    member.currentTask = null; 
    savePlayerData();

    logMessage(lootMessageParts.join(' '), "fore-cyan", "🏛️");

    renderGuildMembers();
    if (document.getElementById('guild-stash-tab')?.classList.contains('active')) {
        renderGuildStash(); 
    }
    if (typeof updateHud === 'function') updateHud(); 
}

/**
 * Trains a secondary stat for a guild member
 * @param {string} memberId - The ID of the guild member
 * @param {string} statToTrain - The secondary stat to train ('fighter', 'miner', 'lumberjack')
 */
function trainMemberStat(memberId, statToTrain) {
    const member = playerData.guild.members[memberId];
    if (!member) return;

    const currentStatLevel = member.stats[statToTrain] || 0;
    const statCap = member.statMax || ((member.level * 2) + 10); // Ensure statMax is defined or default

    if (currentStatLevel >= statCap) {
        logMessage(`${member.name}'s ${statToTrain} skill is already at its current cap of ${statCap}. Increase main level to raise cap.`, 'fore-warning');
        return;
    }

    const costGold = 50 * (currentStatLevel + 1) * member.level; 
    if (playerData.gold < costGold) {
        logMessage(`Need ${formatNumber(costGold)} gold to train ${statToTrain} for ${member.name}. You have ${formatNumber(playerData.gold)}.`, 'fore-danger');
        return;
    }
    
    playerData.gold -= costGold;
    member.stats[statToTrain]++;
    
    // Training a secondary stat also changes the main level
    member.level = member.stats.lumberjack + member.stats.miner + member.stats.fighter;
    
    const xpFromTraining = Math.floor(costGold * 0.1); 
    member.xp = (member.xp || 0) + xpFromTraining; // Add to total XP
    checkMemberLevelUp(member); // Check for main level up from XP and recalculate xpToNext

    savePlayerData();
    logMessage(`Trained ${member.name}'s ${statToTrain} to ${member.stats[statToTrain]} for ${formatNumber(costGold)} gold. Gained ${xpFromTraining} XP. Main Lvl now ${member.level}.`, 'fore-success', '💪');
    
    updateHud();
    renderGuildMembers();
}

const STAT_LABELS = {
    miner: 'Mining',
    lumberjack: 'Woodcutting',
    fighter: 'Fighting'
};

function showMissionMemberSelectionModal(missionId) {
    const modal = document.createElement('div');
    modal.className = 'modal'; 
    const mission = playerData.guild.missions[missionId];
    if (!mission) return;
    const requirements = mission.requirements || {};
    const requiredMembers = requirements.members || 1;
    const validStats = ['miner', 'lumberjack', 'fighter'];
    const requiredStats = Object.keys(requirements).filter(k => validStats.includes(k));
    const mainLevelReq = requirements.mainLevel || 0;
    const idleMembers = Object.entries(playerData.guild.members || {})
        .filter(([id, m]) => !m.currentTask)
        .map(([id, m]) => ({ id, ...m }));

    let reqDisplay = `${requiredMembers} Members`;
    if (mainLevelReq) reqDisplay += `, Main Lvl: ${mainLevelReq}`;
    requiredStats.forEach(stat => {
        reqDisplay += `, Total ${STAT_LABELS[stat] || stat}: ${requirements[stat]}`;
    });

    let memberListHTML = idleMembers.map(member => {
        let statDisplay = `Main: ${member.level}`;
        requiredStats.forEach(stat => {
            statDisplay += `, ${STAT_LABELS[stat] || stat}: ${member.stats[stat] || 0}`;
        });
        return `<div class="mission-member-option">
            <input type="checkbox" class="mission-member-checkbox" id="mission-member-${member.id}" data-member-id="${member.id}">
            <label for="mission-member-${member.id}">${member.name} (${statDisplay})</label>
        </div>`;
    }).join('');
    if (idleMembers.length === 0) {
        memberListHTML = '<p>No idle members available.</p>';
    }
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h3>Select Members for Mission</h3>
            <div class="mission-reqs">Requirements: ${reqDisplay}</div>
            <div class="mission-member-list">${memberListHTML}</div>
            <div class="mission-selection-status" style="margin:8px 0;color:#c00;"></div>
            <button id="assign-mission-btn" class="guild-action-button" disabled>Assign</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    const closeModal = () => { modal.style.display = 'none'; modal.remove(); };
    modal.querySelector('.modal-close').addEventListener('click', closeModal);

    const checkboxes = Array.from(modal.querySelectorAll('.mission-member-checkbox'));
    const statusDiv = modal.querySelector('.mission-selection-status');
    const assignBtn = modal.querySelector('#assign-mission-btn');
    function validateSelection() {
        const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.memberId);
        if (selected.length > requiredMembers) {
            statusDiv.textContent = `Select only ${requiredMembers} members.`;
            assignBtn.disabled = true;
            return;
        }
        
        let statTotals = {};
        let minMainLevel = Infinity;
        requiredStats.forEach(stat => statTotals[stat] = 0);
        selected.forEach(memberId => {
            const m = playerData.guild.members[memberId];
            if (!m) return;
            minMainLevel = Math.min(minMainLevel, m.level || 0);
            requiredStats.forEach(stat => {
                statTotals[stat] += m.stats[stat] || 0;
            });
        });
        
        let missing = [];
        if (selected.length !== requiredMembers) { // Strict check for exact number
            missing.push(`Select exactly ${requiredMembers} members.`);
        }
        if (mainLevelReq && (selected.length > 0 && minMainLevel < mainLevelReq)) {
            missing.push(`All selected members must be at least Main Lvl ${mainLevelReq}.`);
        }
        requiredStats.forEach(stat => {
            if (statTotals[stat] < requirements[stat]) {
                missing.push(`Total ${STAT_LABELS[stat] || stat}: ${statTotals[stat]} / ${requirements[stat]}`);
            }
        });
        if (missing.length === 0) {
            statusDiv.textContent = 'All requirements met.';
            assignBtn.disabled = false;
        } else {
            statusDiv.textContent = missing.join(' | ');
            assignBtn.disabled = true;
        }
    }
    checkboxes.forEach(cb => {
        cb.addEventListener('change', validateSelection);
    });
    validateSelection(); // Initial validation for 0 selected

    assignBtn.addEventListener('click', () => {
        const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.memberId);
        if (assignBtn.disabled || selected.length !== requiredMembers) return;
        startGuildMissionWithMembers(missionId, selected);
        closeModal();
    });
}

function startGuildMissionWithMembers(missionId, memberIds) {
    const mission = playerData.guild.missions[missionId];
    if (!mission || mission.status !== 'available') {
        logMessage(`Mission not available or not found.`, "fore-warning");
        return;
    }
    let duration = mission.duration;
    const speedBoost = getGuildUpgradeEffectValue("missionMastery", "guild_mission_speed_boost", 0);
    if (speedBoost > 0) duration = Math.floor(duration * (1 - speedBoost));

    mission.status = 'active';
    mission.startTime = Date.now();
    mission.progress = 0;
    mission.assignedMembers = memberIds;
    memberIds.forEach(memberId => {
        const member = playerData.guild.members[memberId];
        if (member) {
            member.currentTask = {
                type: 'mission',
                startTime: Date.now(),
                duration: duration, 
                progress: 0,
                missionId: missionId,
                loot: {}
            };
        }
    });
    savePlayerData();
    logMessage(`Started guild mission: ${mission.name}`, "fore-success", "🏛️");
    renderGuildMissions();
    renderGuildMembers();
}

function getGuildUpgradeEffectValue(upgradeId, effectType, defaultValue = 0) {
    const upgrade = playerData.guild.upgrades?.[upgradeId];
    if (!upgrade || !upgrade.level) return defaultValue;
    const upgradeData = GUILD_UPGRADE_DATA[upgradeId];
    if (!upgradeData || !upgradeData.levels) return defaultValue;
    const levelIdx = Math.max(0, Math.min(upgrade.level - 1, upgradeData.levels.length - 1));
    
    if (!upgradeData.levels[levelIdx] || !upgradeData.levels[levelIdx].effects) return defaultValue;
    const effectsArr = upgradeData.levels[levelIdx].effects;

    const found = effectsArr.find(e => e.type === effectType);
    return found ? found.value : defaultValue;
}

/**
 * Gets the double crafting chance from the Advanced Workshop upgrade
 * @returns {number} The double crafting chance (0 to 0.25)
 */
export function getGuildDoubleCraftingChance() {
    return getGuildUpgradeEffectValue('advancedWorkshop', 'double_crafting_chance', 0);
}

function checkGuildLevelUp() {
    if (!playerData.guild) return;
    let currentLevel = playerData.guild.level || 1;
    let currentXp = playerData.guild.xp || 0;
    let leveledUp = false;
    let maxLevel = GUILD_LEVEL_PROGRESSION_XP.length; 
    while (
        currentLevel < maxLevel &&
        currentXp >= GUILD_LEVEL_PROGRESSION_XP[currentLevel] 
    ) {
        currentXp -= GUILD_LEVEL_PROGRESSION_XP[currentLevel]; // Consume XP for level up
        currentLevel++;
        leveledUp = true;
    }
    if (leveledUp) {
        playerData.guild.level = currentLevel;
        playerData.guild.xp = currentXp; // Store remaining XP
        logMessage(`Guild leveled up to <b>Level ${currentLevel}</b>!`, 'fore-green', '🌟');
        savePlayerData();
        if (document.getElementById('guild-upgrades-tab')?.classList.contains('active')) {
            renderGuildUpgrades();
        }
    }
}


function purchaseGuildUpgrade(upgradeId) {
    const upgradeData = GUILD_UPGRADE_DATA[upgradeId];
    if (!upgradeData) {
        logMessage(`Upgrade not found!`, "fore-danger"); return;
    }
    if (!playerData.guild.upgrades) playerData.guild.upgrades = {};
    
    const currentPurchasedLevel = playerData.guild.upgrades[upgradeId]?.level || 0;
    const maxUpgradeLevel = upgradeData.maxLevel || upgradeData.levels.length;

    if (currentPurchasedLevel >= maxUpgradeLevel) {
        logMessage(`Already at max level for ${upgradeData.name}.`, "fore-warning"); return;
    }
    
    const levelToPurchaseData = upgradeData.levels[currentPurchasedLevel]; // Index for the next level data
    if (!levelToPurchaseData) {
         logMessage(`No data for next level of ${upgradeData.name}.`, "fore-danger"); return;
    }

    if ((playerData.guild.level || 1) < levelToPurchaseData.guildLevelReq) {
        logMessage(`Guild level too low for ${upgradeData.name} Lvl ${currentPurchasedLevel + 1}. Need Guild Lvl ${levelToPurchaseData.guildLevelReq}.`, "fore-danger"); return;
    }
    if (levelToPurchaseData.cost.gold && playerData.gold < levelToPurchaseData.cost.gold) {
        logMessage(`Not enough gold for ${upgradeData.name}. Need ${levelToPurchaseData.cost.gold}.`, "fore-danger"); return;
    }
    for (const [res, amt] of Object.entries(levelToPurchaseData.cost)) {
        if (res !== 'gold' && ((playerData.guild.stash?.[res] || 0) < amt)) {
            logMessage(`Not enough ${res.replace(/_/g, ' ')} in guild stash for ${upgradeData.name}. Need ${amt}.`, "fore-danger"); return;
        }
    }
    
    if (levelToPurchaseData.cost.gold) playerData.gold -= levelToPurchaseData.cost.gold;
    for (const [res, amt] of Object.entries(levelToPurchaseData.cost)) {
        if (res !== 'gold') playerData.guild.stash[res] -= amt;
    }
    
    playerData.guild.upgrades[upgradeId] = {
        level: currentPurchasedLevel + 1,
        effects: levelToPurchaseData.effects // Store effects for this level
    };
    
    if (upgradeId === 'memberStatFortification' || upgradeId === 'trainingGrounds') {
        const fortifyBoost = getGuildUpgradeEffectValue('memberStatFortification', 'all_member_secondary_stat_boost_flat', 0);
        const trainingBoost = getGuildUpgradeEffectValue('trainingGrounds', 'all_member_stat_boost_flat', 0);
        const maxBoost = Math.max(fortifyBoost, trainingBoost);

        for (const member of Object.values(playerData.guild.members || {})) {
            let statsChanged = false;
            for (const stat of ['fighter', 'miner', 'lumberjack']) {
                if (member.stats[stat] < maxBoost) {
                    member.stats[stat] = maxBoost;
                    statsChanged = true;
                }
            }
            if (statsChanged) { // Recalculate level and XP if stats changed
                member.level = member.stats.lumberjack + member.stats.miner + member.stats.fighter;
                member.xp = getXpForLevel(member.level, MEMBER_LEVEL_PROGRESSION);
                member.xpToNext = getXpForLevel(member.level + 1, MEMBER_LEVEL_PROGRESSION);
            }
        }
         if (maxBoost > 0) logMessage(`All members' base secondary stats are now at least ${maxBoost} due to guild upgrades!`, "fore-info");
    }
    
    logMessage(`Purchased ${upgradeData.name} Level ${currentPurchasedLevel + 1}!`, "fore-success", "🏛️");
    savePlayerData();
    updateHud();
    renderGuildUpgrades();
    if (upgradeId === 'memberStatFortification' || upgradeId === 'trainingGrounds') {
        renderGuildMembers(); // Re-render members if their stats potentially changed
    }
    if (upgradeId === 'storageExpansion' || upgradeId === 'guildStashOptimization') {
        renderGuildStash(); // Re-render stash if capacity changed
    }
    trackStatistic('progression', 'structureBuilt');
}
