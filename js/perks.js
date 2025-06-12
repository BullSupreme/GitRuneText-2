/**
 * perks.js - Handles the perk tree functionality
 * Manages perk display, activation and related UI
 */

'use strict';

// Import necessary data and functions
import { PERK_DATA, MAX_PERK_POINTS, PERK_POINT_XP_THRESHOLDS, TIERS } from './data.js';
import { playerData, savePlayerData, formatNumber, logMessage } from './utils.js';
import { updateHud, showSection } from './ui.js';
import { calculateTotalSkillXP } from './characterinfo.js';

// Store activation state for pyramid nodes (not persistent)
let pyramidNodeStates = {};

// Perk Points (PP) System
const PP_PER_TIER = {
    common: 1,      // Tier 1
    uncommon: 2,    // Tier 2
    rare: 3,        // Tier 3
    epic: 4,        // Tier 4
    legendary: 5,   // Tier 5
    mythic: 6       // Tier 6
};

// XP thresholds for PP gain
const PP_XP_THRESHOLDS = {
    attack: 1000,      // Gain 1 PP every 1000 XP
    woodcutting: 1000,
    mining: 1000,
    cooking: 1000,
    blacksmithing: 1000
};

/**
 * Shows the perk tree section
 */
export function showPerkTreeSection() {
    console.log('Showing perk tree section');
    // Show the perk tree section
    showSection('perk-tree-section');
    
    // Add back button functionality
    const backButton = document.getElementById('perk-tree-back-button');
    if (backButton) {
        // Remove any existing event listeners first to avoid duplicates
        const newBackButton = backButton.cloneNode(true);
        backButton.parentNode.replaceChild(newBackButton, backButton);
        
        newBackButton.addEventListener('click', () => {
            showSection('main-menu-section');
        });
    }
    
    // Render the new perk tree mockup
    renderPyramidTree(pyramidRows);
}

/**
 * Renders a centered pyramid-style perk tree with 1-8 rows, each row with the appropriate number of nodes.
 * Nodes are spaced automatically and centered per row.
 */
function renderPyramidTree(rows) {
    const perkListTarget = document.getElementById('perk-list-target');
    const availablePerkPointsDisplay = document.getElementById('available-perk-points-display');
    
    if (!perkListTarget || !availablePerkPointsDisplay) return;
    
    // Update available perk points display
    const availablePerkPoints = calculateAvailablePerkPoints();
    availablePerkPointsDisplay.textContent = availablePerkPoints;
    
    perkListTarget.innerHTML = '';

    const nodeWidth = 88;
    const nodeMargin = 12;
    const pyramidWidth = 900;
    const startY = 20;
    const rowHeight = 90;

    // Container
    const container = document.createElement('div');
    container.className = 'perk-tree-mockup';
    container.style.position = 'relative';
    container.style.width = pyramidWidth + 'px';
    container.style.height = (rows.length * rowHeight + 40) + 'px';
    container.style.margin = '0 auto';
    container.style.display = 'block';

    // Tooltip (restored)
    const tooltip = document.createElement('div');
    tooltip.className = 'perk-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = 1000;
    container.appendChild(tooltip);
    // Ensure no incorrect inline display style persists
    tooltip.style.display = '';

    // Initialize state if not present
    if (Object.keys(pyramidNodeStates).length === 0) {
        // Initialize pyramidNodes in playerData if it doesn't exist
        if (!playerData.pyramidNodes) {
            playerData.pyramidNodes = [];
        }
        
        // Initialize all nodes first
        rows.forEach((row, rowIdx) => {
            row.forEach((node, colIdx) => {
                // Check if this node is saved as active in playerData
                const savedNode = playerData.pyramidNodes.find(n => n.id === node.id);
                const isActivated = savedNode ? savedNode.active : false;
                
                pyramidNodeStates[node.id] = {
                    activated: isActivated,
                    unlocked: rowIdx === 0 && colIdx === 0 // only top node unlocked initially
                };
            });
        });
        
        // Now unlock nodes adjacent to activated nodes
        rows.forEach((row, rowIdx) => {
            row.forEach((node, colIdx) => {
                if (pyramidNodeStates[node.id].activated) {
                    // Unlock adjacent nodes
                    const adjIds = getAdjacentNodeIds(rowIdx, colIdx, rows);
                    adjIds.forEach(adjId => {
                        if (pyramidNodeStates[adjId] && !pyramidNodeStates[adjId].activated) {
                            pyramidNodeStates[adjId].unlocked = true;
                        }
                    });
                }
            });
        });
    }

    // Draw nodes
    rows.forEach((row, rowIdx) => {
        const rowNodeCount = row.length;
        const totalRowWidth = rowNodeCount * nodeWidth + (rowNodeCount - 1) * nodeMargin;
        const startX = (pyramidWidth - totalRowWidth) / 2;

        row.forEach((node, i) => {
            const state = pyramidNodeStates[node.id] || { activated: false, unlocked: false };
            const nodeDiv = document.createElement('div');
            nodeDiv.className = `perk-node-mockup ${node.shape}`;
            // Add tier class for border color based on floor tier
            if (node.tier) {
                nodeDiv.classList.add(node.tier);
            }
            if (state.activated) {
                nodeDiv.classList.add('activated');
            } else if (state.unlocked) {
                nodeDiv.classList.add('unlocked');
            } else {
                nodeDiv.classList.add('locked');
            }
            nodeDiv.style.left = (startX + i * (nodeWidth + nodeMargin)) + 'px';
            nodeDiv.style.top = (startY + rowIdx * rowHeight) + 'px';

            // Adjusted node content for better fit: cost at top, then icon, then name
            const ppCost = PP_PER_TIER[node.tier] || 1;
            nodeDiv.innerHTML = `
                <div class=\"perk-cost\" style=\"font-size:0.7em; color:#ffd700; margin-bottom:0px;\">${ppCost} P</div>
                <div class=\"perk-icon\" style=\"font-size:1.2em; margin-bottom:2px;\">${node.icon}</div>
                <div class=\"perk-title\" style=\"font-size:0.78em; line-height:1.1; text-align:center; word-break:break-word; max-width:70px; padding-top:0; margin-top:0; margin-bottom:1px;\">${node.name}</div>
            `;

            nodeDiv.style.position = 'absolute';
            nodeDiv.style.width = nodeWidth + 'px';
            nodeDiv.style.height = nodeWidth + 'px';
            nodeDiv.style.display = 'flex';
            nodeDiv.style.flexDirection = 'column';
            nodeDiv.style.alignItems = 'center';
            nodeDiv.style.justifyContent = 'center';
            nodeDiv.style.cursor = state.unlocked && !state.activated ? 'pointer' : 'default';
            nodeDiv.style.overflow = 'visible';

            // Tooltip on hover
            nodeDiv.addEventListener('mouseenter', (e) => {
                // Tooltip content: description and PP cost
                tooltip.innerHTML = `
                    <div style=\"font-size:1em; margin-bottom:4px;\">${node.desc}</div>
                    <div style=\"color:#ffd700; font-size:0.95em;\">Cost: ${ppCost} PP</div>
                `;
                // Position tooltip above the node, centered
                const tooltipWidth = 220;
                const tooltipHeight = 60; // Approximate tooltip height
                const nodeLeft = parseInt(nodeDiv.style.left);
                const nodeTop = parseInt(nodeDiv.style.top);
                
                // Calculate tooltip position
                let tooltipLeft = nodeLeft + nodeWidth/2 - tooltipWidth/2;
                let tooltipTop = nodeTop - tooltipHeight - 10; // 10px gap above node
                
                // If tooltip would go off the top of the container (for top row nodes)
                if (tooltipTop < 0) {
                    tooltipTop = nodeTop + nodeWidth + 10; // Position below the node instead
                }
                
                // Ensure tooltip doesn't go off the left or right edges
                if (tooltipLeft < 0) {
                    tooltipLeft = 5;
                } else if (tooltipLeft + tooltipWidth > pyramidWidth) {
                    tooltipLeft = pyramidWidth - tooltipWidth - 5;
                }
                
                tooltip.style.left = tooltipLeft + 'px';
                tooltip.style.top = tooltipTop + 'px';
                tooltip.style.width = tooltipWidth + 'px';
                tooltip.style.zIndex = '9999'; // Much higher z-index
                // Ensure element is displayed before animating opacity
                tooltip.style.display = 'block';
                // Use CSS class for visibility and opacity animation
                tooltip.classList.add('active');
            });
            nodeDiv.addEventListener('mouseleave', (e) => {
                 // Use CSS class for visibility
                tooltip.classList.remove('active');
            });

            // Activation logic
            if (state.unlocked && !state.activated) {
                nodeDiv.addEventListener('click', (e) => {
                    if (hasEnoughPerkPoints(node.id)) {
                        // Create activation ripple effect
                        const rect = nodeDiv.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const x = rect.left + rect.width/2 - containerRect.left;
                        const y = rect.top + rect.height/2 - containerRect.top;
                        const activationRipple = document.createElement('div');
                        activationRipple.classList.add('perk-ripple');
                        activationRipple.style.left = `${x}px`;
                        activationRipple.style.top = `${y}px`;
                        activationRipple.style.background = 'rgba(255, 215, 0, 0.7)'; // Golden ripple for activation
                        container.appendChild(activationRipple);
                        activationRipple.addEventListener('animationend', () => activationRipple.remove());
                        
                        // Activate this node
                        pyramidNodeStates[node.id].activated = true;
                        
                        // Update playerData to persist the activation
                        if (!playerData.pyramidNodes) {
                            playerData.pyramidNodes = [];
                        }
                        
                        // Find existing node in playerData or create new one
                        let existingNode = playerData.pyramidNodes.find(n => n.id === node.id);
                        if (existingNode) {
                            existingNode.active = true;
                        } else {
                            playerData.pyramidNodes.push({
                                id: node.id,
                                active: true
                            });
                        }
                        
                        // Save the data
                        savePlayerData();
                        
                        // Unlock adjacent nodes
                        const adjIds = getAdjacentNodeIds(rowIdx, i, rows);
                        adjIds.forEach(adjId => {
                            if (pyramidNodeStates[adjId] && !pyramidNodeStates[adjId].activated) {
                                pyramidNodeStates[adjId].unlocked = true;
                            }
                        });
                        
                        // Re-render and update HUD for immediate effect
                        renderPyramidTree(rows);
                        updateHud();
                        
                        // Update mining and woodcutting displays if Skilled Gatherer perk is activated
                        if (node.id === 'n1') {
                            // Check if mining or woodcutting sections are currently visible
                            const miningSection = document.getElementById('mining-section');
                            const woodcuttingSection = document.getElementById('woodcutting-section');
                            const characterSection = document.getElementById('character-section');
                            
                            if (miningSection && !miningSection.classList.contains('hidden')) {
                                // Import and call updateMiningDisplay if mining section is visible
                                import('./mining.js').then(module => {
                                    module.updateMiningDisplay();
                                });
                            }
                            
                            if (woodcuttingSection && !woodcuttingSection.classList.contains('hidden')) {
                                // Import and call updateWoodcuttingDisplay if woodcutting section is visible
                                import('./woodcutting.js').then(module => {
                                    module.updateWoodcuttingDisplay();
                                });
                            }
                            
                            if (characterSection && !characterSection.classList.contains('hidden')) {
                                // Import and call showCharacterInfo if character section is visible
                                import('./characterinfo.js').then(module => {
                                    module.showCharacterInfo();
                                });
                            }
                        }
                        
                        logMessage(`Activated perk: ${node.name}`, "fore-success");
                    } else {
                        logMessage(`Not enough Perk Points! Need ${PP_PER_TIER[node.tier] || 1} PP.`, "fore-danger");
                    }
                });
            }
            container.appendChild(nodeDiv);
        });
    });

    // Add ripple effect for perk tree background like a finger to a pond
    container.addEventListener('click', (e) => {
        // Only create ripple if clicking on empty space (not on a node)
        if (e.target === container) {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('div');
            ripple.classList.add('perk-ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            container.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        }
    });
    
    // Throttled ripple effect following the mouse cursor
    let mouseRippleTimeout = null;
    container.addEventListener('mousemove', (e) => {
        // Throttle the mousemove ripples to avoid performance issues
        if (mouseRippleTimeout) return;
        
        mouseRippleTimeout = setTimeout(() => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('div');
            ripple.classList.add('perk-ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            container.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
            mouseRippleTimeout = null;
        }, 100); // Only create a new ripple every 100ms
    });
    
    perkListTarget.appendChild(container);
}

/**
 * Renders the perk tree UI
 */
function renderPerkTree() {
    const perkListTarget = document.getElementById('perk-list-target');
    const availablePerkPointsDisplay = document.getElementById('available-perk-points-display');
    
    if (!perkListTarget || !availablePerkPointsDisplay) return;
    
    // Update available perk points display
    const availablePerkPoints = calculateAvailablePerkPoints();
    availablePerkPointsDisplay.textContent = availablePerkPoints;
    
    // Clear existing perk cards
    perkListTarget.innerHTML = '';
    
    // Create and append perk cards
    for (const [perkId, perkInfo] of Object.entries(PERK_DATA)) {
        const perkCard = createPerkCard(perkId, perkInfo, availablePerkPoints);
        perkListTarget.appendChild(perkCard);
    }
}

/**
 * Creates a perk card element
 * @param {string} perkId - The ID of the perk
 * @param {object} perkInfo - The perk information object
 * @param {number} availablePerkPoints - Number of available perk points
 * @returns {HTMLElement} - The perk card element
 */
function createPerkCard(perkId, perkInfo, availablePerkPoints) {
    const perkCard = document.createElement('div');
    perkCard.className = 'perk-item-card item-card-tier'; // Add base tier class
    if (perkInfo.tier) {
        perkCard.classList.add(perkInfo.tier); // Add specific tier class
    }
    perkCard.dataset.perkId = perkId;
    
    // Check if perk is active
    const isActive = isPerkActive(perkId);
    if (isActive) {
        perkCard.classList.add('activated-perk-card');
    }
    
    // Check if perk can be activated (requirements met)
    const canActivate = canActivatePerk(perkId, perkInfo);
    if (!canActivate && !isActive) {
        perkCard.classList.add('disabled-perk-card');
    }
    
    // Build perk card content
    perkCard.innerHTML = `
        <div class="perk-header">
            <div class="perk-name">${perkInfo.name}</div>
            <div class="perk-cost-display">${perkInfo.cost} Points</div>
        </div>
        <div class="perk-description">${perkInfo.perk_desc}</div>
        <div class="perk-status-action">
            ${isActive 
                ? '<span style="color:#4caf50;">ACTIVE</span>' 
                : (canActivate && availablePerkPoints >= perkInfo.cost 
                    ? `<button data-perk-id="${perkId}">Activate</button>` 
                    : '<span style="color:#e57373;">LOCKED</span>')}
        </div>
    `;
    
    // Add click event listener for activation button
    const activateButton = perkCard.querySelector('button');
    if (activateButton) {
        activateButton.addEventListener('click', (e) => {
            e.stopPropagation();
            activatePerk(perkId);
        });
    }
    
    return perkCard;
}

/**
 * Checks if a perk is currently active
 * @param {string} perkId - The ID of the perk to check
 * @returns {boolean} - True if the perk is active
 */
export function isPerkActive(perkId) {
    return !!(playerData && playerData.active_perks && playerData.active_perks[perkId]);
}

/**
 * Checks if a perk can be activated based on requirements
 * @param {string} perkId - The ID of the perk to check
 * @param {object} perkInfo - The perk information object
 * @returns {boolean} - True if the perk can be activated
 */
function canActivatePerk(perkId, perkInfo) {
    // Check if there are required perks
    if (perkInfo.requires) {
        // If it's a string, convert to array for consistent handling
        const requiredPerks = Array.isArray(perkInfo.requires)
            ? perkInfo.requires
            : [perkInfo.requires];
        
        // Check if all required perks are active
        for (const requiredPerk of requiredPerks) {
            if (!isPerkActive(requiredPerk)) {
                return false;
            }
        }
    }
    
    // Check if required structure is built (if applicable)
    if (perkInfo.requires_structure && 
        (!playerData.built_structures || !playerData.built_structures[perkInfo.requires_structure])) {
        return false;
    }
    
    return true;
}

/**
 * Activates a perk
 * @param {string} perkId - The ID of the perk to activate
 */
function activatePerk(perkId) {
    const perkInfo = PERK_DATA[perkId];
    if (!perkInfo) return;
    
    // Check if player has enough perk points
    const availablePerkPoints = playerData.perk_points_earned - playerData.perk_points_spent;
    if (availablePerkPoints < perkInfo.cost) {
        logMessage(`Not enough perk points! Need ${perkInfo.cost}, have ${availablePerkPoints}.`, "fore-danger");
        return;
    }
    
    // Check if perk can be activated
    if (!canActivatePerk(perkId, perkInfo)) {
        logMessage(`Cannot activate this perk yet. Requirements not met.`, "fore-warning");
        return;
    }
    
    // Activate the perk
    if (!playerData.active_perks) {
        playerData.active_perks = {};
    }
    
    playerData.active_perks[perkId] = true;
    playerData.perk_points_spent += perkInfo.cost;
    
    // Log the activation
    logMessage(`Activated perk: ${perkInfo.name}!`, "fore-magenta", "✨");
    
    // Save the game
    savePlayerData();
    
    // Update UI
    updateHud();
    renderPyramidTree(pyramidRows);
}

/**
 * Updates perk points based on total skill XP
 * Should be called whenever skill XP is gained
 */
export function updatePerkPoints() {
    if (!playerData) return;
    
    let new_points_earned = 0;
    const totalSkillXP = calculateTotalSkillXP();
    for (const threshold of PERK_POINT_XP_THRESHOLDS) {
        if (totalSkillXP >= threshold) {
            new_points_earned++;
        } else {
            break;
        }
    }
    
    if (new_points_earned > playerData.perk_points_earned) {
        const gained = new_points_earned - playerData.perk_points_earned;
        logMessage(`You earned ${gained} new Perk Point(s)! (${formatNumber(totalSkillXP)} total XP)`, "fore-magenta", "✨");
        playerData.perk_points_earned = new_points_earned;
        
        // Update UI
        updateHud();
    }
}

// Expose function globally for use in other modules to avoid circular imports
if (typeof window !== 'undefined') {
    window.updatePerkPoints = updatePerkPoints;
}

/**
 * Returns a perk effect value if the perk is active
 * @param {string} perkId - The ID of the perk to check
 * @param {string} effectType - The type of effect to get
 * @returns {any} - The effect value or null if perk not active
 */
export function getPerkEffect(perkId, effectType) {
    if (isPerkActive(perkId) && PERK_DATA[perkId]?.perk_effect?.type === effectType) {
        return PERK_DATA[perkId].perk_effect.value;
    }
    return null;
}

// Define and export the pyramid rows
export const pyramidRows = [
    // Row 1 (Top)
    [
        { 
            id: 'n1', 
            name: 'Skilled Gatherer', 
            desc: '+5% gather speed (Woodcutting & Mining), 3s faster actions', 
            tier: 'common', 
            shape: 'circle',
            icon: '🌲',
            effects: [
                { type: 'gather_speed', skill: 'woodcutting', value: 0.05 },
                { type: 'gather_speed', skill: 'mining', value: 0.05 }
            ]
        }
    ],
    // Row 2
    [
        { 
            id: 'n2', 
            name: 'Lucky Prospector', 
            desc: '5% chance for extra ore (mining)', 
            tier: 'common', 
            shape: 'circle',
            icon: '💎',
            effects: [
                { type: 'gather_extra_loot', skill: 'mining', value: 0.05 }
            ]
        },
        { 
            id: 'n3', 
            name: 'Forest Fortune', 
            desc: '5% chance for extra log (woodcutting)', 
            tier: 'common', 
            shape: 'circle',
            icon: '🌳',
            effects: [
                { type: 'gather_extra_loot', skill: 'woodcutting', value: 0.05 }
            ]
        }
    ],
    // Row 3
    [
        { 
            id: 'n4', 
            name: 'Hunter\'s Luck', 
            desc: '5% chance for extra loot (hunting)', 
            tier: 'uncommon', 
            shape: 'circle',
            icon: '🏹',
            effects: [
                { type: 'combat_extra_loot', value: 0.05 }
            ]
        },
        { 
            id: 'n5', 
            name: 'Warrior\'s Might', 
            desc: '+10% weapon damage', 
            tier: 'uncommon', 
            shape: 'circle',
            icon: '⚔️',
            effects: [
                { type: 'weapon_damage_multiplier', value: 0.10 }
            ]
        },
        { 
            id: 'n6', 
            name: 'Gem Finder', 
            desc: '2% chance for gem drop (mining)', 
            tier: 'uncommon', 
            shape: 'circle',
            icon: '💎',
            effects: [
                { type: 'gem_drop_chance', skill: 'mining', value: 0.02 }
            ]
        }
    ],
    // Row 4
    [
        { 
            id: 'n7', 
            name: 'Double Strike', 
            desc: '5% chance to double mining drops', 
            tier: 'rare', 
            shape: 'circle',
            icon: '⛏️',
            effects: [
                { type: 'double_drop', skill: 'mining', value: 0.05 }
            ]
        },
        { 
            id: 'n8', 
            name: 'Double Chop', 
            desc: '5% chance to double woodcutting drops', 
            tier: 'rare', 
            shape: 'circle',
            icon: '🪓',
            effects: [
                { type: 'double_drop', skill: 'woodcutting', value: 0.05 }
            ]
        },
        { 
            id: 'n9', 
            name: 'AOE Expert', 
            desc: '+10% AOE chance (attack)', 
            tier: 'rare', 
            shape: 'circle',
            icon: '🌪️',
            effects: [
                { type: 'aoe_chance', skill: 'attack', value: 0.10 }
            ]
        },
        { 
            id: 'n10', 
            name: 'Tough Hide', 
            desc: '+5% defense', 
            tier: 'rare', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'defense', value: 0.05 }
            ]
        }
    ],
    // Row 5
    [
        { 
            id: 'n11', 
            name: 'Iron Will', 
            desc: '+5% block chance', 
            tier: 'epic', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'block', value: 0.05 }
            ]
        },
        { 
            id: 'n12', 
            name: 'Critical Mind', 
            desc: '+5% crit chance', 
            tier: 'epic', 
            shape: 'circle',
            icon: '🎯',
            effects: [
                { type: 'crit', value: 0.05 }
            ]
        },
        { 
            id: 'n13', 
            name: 'Sturdy Constitution', 
            desc: '+50 Max HP', 
            tier: 'epic', 
            shape: 'circle',
            icon: '❤️',
            effects: [
                { type: 'max_hp', value: 50 }
            ]
        },
        { 
            id: 'n14', 
            name: 'Gem Hoarder', 
            desc: '+1% gem drop (mining)', 
            tier: 'epic', 
            shape: 'circle',
            icon: '💎',
            effects: [
                { type: 'gem_drop_chance', skill: 'mining', value: 0.01 }
            ]
        },
        { 
            id: 'n15', 
            name: 'AOE Master', 
            desc: '+5% AOE chance (attack), +20% AOE damage (attack)', 
            tier: 'epic', 
            shape: 'circle',
            icon: '🌪️',
            effects: [
                { type: 'aoe_chance', skill: 'attack', value: 0.05 },
                { type: 'aoe_damage', skill: 'attack', value: 0.20 }
            ]
        }
    ],
    // Row 6
    [
        { 
            id: 'n16', 
            name: 'Master Chef', 
            desc: '+20% cooking speed, -50% burn chance', 
            tier: 'legendary', 
            shape: 'circle',
            icon: '🍳',
            effects: [
                { type: 'cooking_speed', value: 0.20 },
                { type: 'cooking_success_bonus', value: 0.50 }
            ]
        },
        { 
            id: 'n17', 
            name: 'Treasure Hunter', 
            desc: '+5% extra loot from chests', 
            tier: 'legendary', 
            shape: 'circle',
            icon: '🎁',
            effects: [
                { type: 'chest_loot_bonus', value: 0.05 }
            ]
        },
        { 
            id: 'n18', 
            name: 'Battle Hardened', 
            desc: '+5% defense (combat)', 
            tier: 'legendary', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'defense', skill: 'combat', value: 0.05 }
            ]
        },
        { 
            id: 'n19', 
            name: 'Weapon Expert', 
            desc: '+15% weapon damage, +5% lifesteal', 
            tier: 'legendary', 
            shape: 'circle',
            icon: '⚔️',
            effects: [
                { type: 'weapon_damage_multiplier', value: 0.15 },
                { type: 'lifesteal', value: 0.05 }
            ]
        },
        { 
            id: 'n20', 
            name: 'Gem Magnet', 
            desc: '+2% gem drop (woodcutting)', 
            tier: 'legendary', 
            shape: 'circle',
            icon: '💎',
            effects: [
                { type: 'gem_drop_chance', skill: 'woodcutting', value: 0.02 }
            ]
        },
        { 
            id: 'n21', 
            name: 'AOE Crusher', 
            desc: '+5% AOE chance (mining)', 
            tier: 'legendary', 
            shape: 'circle',
            icon: '🌪️',
            effects: [
                { type: 'aoe_chance', skill: 'mining', value: 0.05 }
            ]
        }
    ],
    // Row 7
    [
        { 
            id: 'n22', 
            name: 'Enduring Spirit', 
            desc: '+100 Max HP', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '❤️',
            effects: [
                { type: 'max_hp', value: 100 }
            ]
        },
        { 
            id: 'n23', 
            name: 'Block Master', 
            desc: '+7% block chance', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'block', value: 0.07 }
            ]
        },
        { 
            id: 'n24', 
            name: 'Critical Edge', 
            desc: '+10% crit chance', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🎯',
            effects: [
                { type: 'crit', value: 0.10 }
            ]
        },
        { 
            id: 'n25', 
            name: 'AOE Overload', 
            desc: '+10% AOE chance (all skills)', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🌪️',
            effects: [
                { type: 'aoe_chance', value: 0.10 }
            ]
        },
        { 
            id: 'n26', 
            name: 'Gem Tycoon', 
            desc: '+3% gem drop (any gathering)', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '💎',
            effects: [
                { type: 'gem_drop_chance', value: 0.03 }
            ]
        },
        { 
            id: 'n27', 
            name: 'Double Trouble', 
            desc: '5% chance to double any loot drop', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '✨',
            effects: [
                { type: 'double_loot_all', value: 0.05 }
            ]
        },
        { 
            id: 'n28', 
            name: 'Iron Body', 
            desc: '+10% defense', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'defense', value: 0.10 }
            ]
        }
    ],
    // Row 8 (Bottom)
    [
        { 
            id: 'n29', 
            name: 'Speed Demon', 
            desc: '+25% attack speed (attack)', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '⚡',
            effects: [
                { type: 'attack_speed', skill: 'attack', value: 0.25 }
            ]
        },
        { 
            id: 'n30', 
            name: 'Block Wall', 
            desc: '+8% block chance, +40% block amount', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'block', value: 0.08 },
                { type: 'block_amount', value: 0.40 }
            ]
        },
        { 
            id: 'n31', 
            name: 'Critical Mass', 
            desc: '+5% crit chance, +50% crit damage', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🎯',
            effects: [
                { type: 'crit', value: 0.05 },
                { type: 'crit_multiplier', value: 0.50 }
            ]
        },
        { 
            id: 'n32', 
            name: 'AOE Cataclysm', 
            desc: '+5% AOE chance (all skills), +40% AOE damage', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🌪️',
            effects: [
                { type: 'aoe_chance', value: 0.05 },
                { type: 'aoe_damage', value: 0.40 }
            ]
        },
        { 
            id: 'n33', 
            name: 'Gem Emperor', 
            desc: '+5% gem drop (any source)', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '💎',
            effects: [
                { type: 'gem_drop_chance', value: 0.05 }
            ]
        },
        { 
            id: 'n34', 
            name: 'Double Legend', 
            desc: '10% chance to double any loot drop', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '✨',
            effects: [
                { type: 'double_loot_all', value: 0.10 }
            ]
        },
        { 
            id: 'n35', 
            name: 'Titan Body', 
            desc: '+15% defense', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '🛡️',
            effects: [
                { type: 'defense', value: 0.15 }
            ]
        },
        { 
            id: 'n36', 
            name: 'Immortal', 
            desc: '+500 Max HP', 
            tier: 'mythic', 
            shape: 'circle',
            icon: '❤️',
            effects: [
                { type: 'max_hp', value: 500 }
            ]
        }
    ]
];

// Helper: get adjacent node ids for a given node in the pyramid
function getAdjacentNodeIds(rowIdx, colIdx, rows) {
    const adj = [];
    // Only unlock children (row below)
    if (rowIdx < rows.length - 1) {
        adj.push(rows[rowIdx + 1][colIdx].id);
        if (colIdx + 1 < rows[rowIdx + 1].length) adj.push(rows[rowIdx + 1][colIdx + 1].id);
    }
    // Do NOT unlock parents (row above)
    return adj;
}

/**
 * Returns an array of all effect objects from activated pyramid nodes
 */
export function getActivePyramidPerkEffects() {
    const effects = [];
    pyramidRows.forEach((row, rowIdx) => {
        row.forEach((node) => {
            // Check persistent playerData instead of temporary pyramidNodeStates
            const savedNode = playerData.pyramidNodes?.find(n => n.id === node.id);
            const isActivated = savedNode ? savedNode.active : false;
            
            if (isActivated) { // Check activation from persistent data
                if (node.effects && Array.isArray(node.effects)) { // Check for 'effects' array
                    effects.push(...node.effects); // Spread the array of effects into the main effects list
                } else if (node.effect) { // Check for single 'effect' object
                    effects.push(node.effect); // Push the single effect object
                }
            }
        });
    });
    return effects;
}

/**
 * Returns a summary object with summed values for each effect type (and skill, if relevant)
 * Example: { gather_speed: 0.05, defense: 0.25, crit: 0.15, ... }
 */
export function getSummedPyramidPerkEffects() {
    const effects = getActivePyramidPerkEffects();
    const summary = {};
    for (const eff of effects) {
        // Key by type and skill if present
        const key = eff.skill ? `${eff.type}_${eff.skill}` : eff.type;
        if (typeof eff.value === 'number') {
            if (!summary[key]) summary[key] = 0;
            summary[key] += eff.value;
        }
    }
    return summary;
}

/**
 * Calculate available Perk Points based on XP
 * @returns {number} Total available perk points
 */
export function calculateAvailablePerkPoints() {
    // Calculate total skill XP across all skills
    let totalSkillXP = 0;
    if (playerData.skills) {
        for (const skill in playerData.skills) {
            totalSkillXP += playerData.skills[skill].xp || 0;
        }
    }
    
    // Use the correct thresholds from PERK_POINT_XP_THRESHOLDS
    const thresholds = PERK_POINT_XP_THRESHOLDS;
    let earnedPP = 0;
    for (const threshold of thresholds) {
        if (totalSkillXP >= threshold) {
            earnedPP++;
        } else {
            break;
        }
    }
    
    // Subtract spent PP
    const spentPP = calculateSpentPerkPoints();
    return Math.max(0, earnedPP - spentPP);
}

/**
 * Calculate spent Perk Points based on active pyramid nodes
 * @returns {number} Total spent perk points
 */
export function calculateSpentPerkPoints() {
    let spentPP = 0;
    const activeNodes = getActivePyramidNodes();
    
    for (const nodeId of activeNodes) {
        const node = findNodeById(nodeId);
        if (node && node.tier) {
            spentPP += PP_PER_TIER[node.tier] || 1; // Default to 1 if tier not found
        }
    }
    
    return spentPP;
}

/**
 * Check if player has enough PP to activate a node
 * @param {string} nodeId - ID of the node to check
 * @returns {boolean} Whether player has enough PP
 */
export function hasEnoughPerkPoints(nodeId) {
    const node = findNodeById(nodeId);
    if (!node || !node.tier) return false;
    
    const requiredPP = PP_PER_TIER[node.tier] || 1;
    return calculateAvailablePerkPoints() >= requiredPP;
}

/**
 * Toggle a pyramid node's activation state
 * @param {string} nodeId - ID of the node to toggle
 * @returns {boolean} Whether the toggle was successful
 */
export function togglePyramidNode(nodeId) {
    const node = findNodeById(nodeId);
    if (!node) {
        console.error(`Node ${nodeId} not found`);
        return false;
    }

    const isCurrentlyActive = pyramidNodeStates[nodeId];
    
    // If trying to activate, check PP requirements
    if (!isCurrentlyActive) {
        if (!hasEnoughPerkPoints(nodeId)) {
            console.warn(`Not enough Perk Points to activate ${node.name}`);
            return false;
        }
    }

    // Toggle the node state
    pyramidNodeStates[nodeId] = !isCurrentlyActive;
    
    // Update player data
    if (!playerData.pyramid_nodes) {
        playerData.pyramid_nodes = {};
    }
    playerData.pyramid_nodes[nodeId] = pyramidNodeStates[nodeId];
    savePlayerData();
    
    return true;
}

/**
 * Get Perk Points information for display
 * @returns {Object} PP information including available, spent, and next gain
 */
export function getPerkPointsInfo() {
    const availablePP = calculateAvailablePerkPoints();
    const spentPP = calculateSpentPerkPoints();
    const totalPP = availablePP + spentPP;
    
    // Calculate next PP gain
    let nextPPGain = {
        skill: null,
        currentXP: 0,
        requiredXP: 0,
        progress: 0
    };
    
    for (const skill in playerData.skills) {
        if (PP_XP_THRESHOLDS[skill]) {
            const skillXP = playerData.skills[skill].xp;
            const currentPP = Math.floor(skillXP / PP_XP_THRESHOLDS[skill]);
            const nextPPThreshold = (currentPP + 1) * PP_XP_THRESHOLDS[skill];
            const progress = (skillXP % PP_XP_THRESHOLDS[skill]) / PP_XP_THRESHOLDS[skill];
            
            if (!nextPPGain.skill || progress < nextPPGain.progress) {
                nextPPGain = {
                    skill,
                    currentXP: skillXP,
                    requiredXP: nextPPThreshold,
                    progress
                };
            }
        }
    }
    
    return {
        available: availablePP,
        spent: spentPP,
        total: totalPP,
        nextGain: nextPPGain
    };
}

/**
 * Find a node by its ID
 * @param {string} nodeId - The ID of the node to find
 * @returns {Object|null} The node object or null if not found
 */
export function findNodeById(nodeId) {
    for (const row of pyramidRows) {
        const node = row.find(n => n.id === nodeId);
        if (node) return node;
    }
    return null;
}

/**
 * Gets all currently active pyramid nodes
 * @returns {Array} Array of active node IDs
 */
function getActivePyramidNodes() {
    // Initialize pyramidNodes if it doesn't exist
    if (!playerData.pyramidNodes) {
        playerData.pyramidNodes = [];
        // Initialize with the top node unlocked
        if (pyramidRows.length > 0 && pyramidRows[0].length > 0) {
            playerData.pyramidNodes.push({
                id: pyramidRows[0][0].id,
                active: false
            });
        }
        savePlayerData();
    }
    return playerData.pyramidNodes.filter(node => node.active).map(node => node.id);
} 
