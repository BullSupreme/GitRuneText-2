/**
 * achievements.js - Achievement and Statistics System for RuneText
 * Tracks player actions and awards achievements for milestones
 */

'use strict';

import { 
    playerData, 
    savePlayerData, 
    logMessage, 
    titleCase,
    playSound,
    sounds
} from './utils.js';
import { showSection, showAchievementNotification } from './ui.js';

// Initialize statistics if not present
export function initializeStatistics() {
    if (!playerData.statistics) {
        playerData.statistics = {
            // Combat Statistics
            combat: {
                totalKills: 0,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                bossKills: 0,
                criticalHits: 0,
                monsterKills: {}, // { "chicken": 15, "wolf": 8, etc. }
                deathCount: 0
            },
            
            // Gathering Statistics  
            gathering: {
                totalItemsGathered: 0,
                totalNodesHarvested: 0,
                itemsGathered: {}, // { "logs": 1500, "iron ore": 200, etc. }
                rareItemsFound: 0,
                totalMiningXp: 0,
                totalWoodcuttingXp: 0,
                totalFarmingXp: 0
            },
            
            // Crafting & Enchanting
            crafting: {
                totalItemsCrafted: 0,
                totalEnchantments: 0,
                enchantmentsApplied: {}, // { "weapon": 15, "armor": 8, etc. }
                itemsCrafted: {}, // { "iron sword": 5, "steel armor": 2, etc. }
                gemsConverted: 0,
                legendaryEnchantments: 0
            },
            
            // Economic Statistics
            economy: {
                totalGoldEarned: 0,
                totalGoldSpent: 0,
                totalItemsSold: 0,
                totalItemsBought: 0,
                highestGoldAmount: 0,
                rentCollected: 0
            },
            
            // Guild & Social
            guild: {
                tasksCompleted: 0,
                membersRecruited: 0,
                totalRewardsEarned: 0,
                guildContributions: 0,
                questsCompleted: 0
            },
            
            // Building & Progression
            progression: {
                structuresBuilt: 0,
                totalLevelsGained: 0,
                skillsMaxed: 0,
                perksUnlocked: 0,
                chestsOpened: 0,
                totalPlayTime: 0, // in seconds
                sessionsPlayed: 0
            },
            
            // Farming Specific
            farming: {
                seedsPlanted: 0,
                cropsHarvested: 0,
                farmUpgrades: 0,
                totalFarmProfit: 0,
                cropTypes: {} // { "wheat": 50, "corn": 30, etc. }
            },
            
            // Collection Statistics
            collection: {
                weaponsFound: {}, // Track which weapons have been found
                armorFound: {}, // Track which armor pieces have been found
                helmetsFound: {}, // Track which helmets have been found
                toolsFound: {}, // Track which tools have been found
                itemsObtained: {}, // Track when items are first obtained for achievements
                allWeapons: 0, // Achievement flag: 1 if all weapons collected
                allArmor: 0, // Achievement flag: 1 if all armor collected
                allHelmets: 0, // Achievement flag: 1 if all helmets collected
                allTools: 0, // Achievement flag: 1 if all tools collected
                allEquipment: 0 // Achievement flag: 1 if everything collected
            },
            
            // Equipment Statistics - Track what has been equipped
            equipment: {
                equipped: {} // Track which items have been equipped { "steel 2h sword": 1, etc. }
            }
        };
        savePlayerData();
    }
}

// Track a statistic
export function trackStatistic(category, subcategory, value = 1, itemName = null) {
    if (!playerData.statistics) {
        initializeStatistics();
    }
    
    const stats = playerData.statistics;
    
    try {
        // Handle different statistic types
        if (category === 'combat') {
            if (subcategory === 'kill' && itemName) {
                stats.combat.totalKills += value;
                stats.combat.monsterKills[itemName] = (stats.combat.monsterKills[itemName] || 0) + value;
            } else if (subcategory === 'damageDealt') {
                stats.combat.totalDamageDealt += value;
            } else if (subcategory === 'damageTaken') {
                stats.combat.totalDamageTaken += value;
            } else if (subcategory === 'crit') {
                stats.combat.criticalHits += value;
            } else if (subcategory === 'death') {
                stats.combat.deathCount += value;
            }
        } else if (category === 'gathering') {
            if (subcategory === 'item' && itemName) {
                stats.gathering.totalItemsGathered += value;
                stats.gathering.itemsGathered[itemName] = (stats.gathering.itemsGathered[itemName] || 0) + value;
            } else if (subcategory === 'node') {
                stats.gathering.totalNodesHarvested += value;
            } else if (subcategory === 'rare') {
                stats.gathering.rareItemsFound += value;
            }
        } else if (category === 'crafting') {
            if (subcategory === 'enchant') {
                stats.crafting.totalEnchantments += value;
                if (itemName) {
                    stats.crafting.enchantmentsApplied[itemName] = (stats.crafting.enchantmentsApplied[itemName] || 0) + value;
                }
            } else if (subcategory === 'craft' && itemName) {
                stats.crafting.totalItemsCrafted += value;
                stats.crafting.itemsCrafted[itemName] = (stats.crafting.itemsCrafted[itemName] || 0) + value;
            } else if (subcategory === 'gemConvert') {
                stats.crafting.gemsConverted += value;
            }
        } else if (category === 'economy') {
            if (subcategory === 'goldEarned') {
                stats.economy.totalGoldEarned += value;
                stats.economy.highestGoldAmount = Math.max(stats.economy.highestGoldAmount, playerData.gold);
            } else if (subcategory === 'goldSpent') {
                stats.economy.totalGoldSpent += value;
            } else if (subcategory === 'itemSold') {
                stats.economy.totalItemsSold += value;
            } else if (subcategory === 'rent') {
                stats.economy.rentCollected += value;
            }
        } else if (category === 'guild') {
            if (subcategory === 'taskComplete') {
                stats.guild.tasksCompleted += value;
            } else if (subcategory === 'recruit') {
                stats.guild.membersRecruited += value;
            } else if (subcategory === 'reward') {
                stats.guild.totalRewardsEarned += value;
            }
        } else if (category === 'progression') {
            if (subcategory === 'structureBuilt') {
                stats.progression.structuresBuilt += value;
            } else if (subcategory === 'levelGained') {
                stats.progression.totalLevelsGained += value;
            } else if (subcategory === 'chestOpened') {
                stats.progression.chestsOpened += value;
            } else if (subcategory === 'playTime') {
                stats.progression.totalPlayTime += value;
            } else if (subcategory === 'session') {
                stats.progression.sessionsPlayed += value;
            }
        } else if (category === 'farming') {
            if (subcategory === 'plant' && itemName) {
                stats.farming.seedsPlanted += value;
                stats.farming.cropTypes[itemName] = (stats.farming.cropTypes[itemName] || 0) + value;
            } else if (subcategory === 'harvest') {
                stats.farming.cropsHarvested += value;
            } else if (subcategory === 'profit') {
                stats.farming.totalFarmProfit += value;
            }
        } else if (category === 'collection') {
            if (subcategory === 'allWeapons') {
                stats.collection.allWeapons = value;
            } else if (subcategory === 'allArmor') {
                stats.collection.allArmor = value;
            } else if (subcategory === 'allHelmets') {
                stats.collection.allHelmets = value;
            } else if (subcategory === 'allTools') {
                stats.collection.allTools = value;
            } else if (subcategory === 'allEquipment') {
                stats.collection.allEquipment = value;
            }
        }
        
        // Check for achievement unlocks after tracking
        checkAchievements();
        
    } catch (error) {
        console.error('Error tracking statistic:', error);
    }
}

// Track equipment collection
export function trackEquipmentCollection(itemName, category) {
    if (!playerData.statistics) {
        initializeStatistics();
    }
    
    try {
        const stats = playerData.statistics.collection;
        
        // Track the specific item found
        if (category === 'weapon') {
            stats.weaponsFound[itemName] = 1;
        } else if (category === 'armor') {
            stats.armorFound[itemName] = 1;
        } else if (category === 'helmet') {
            stats.helmetsFound[itemName] = 1;
        } else if (category === 'tool') {
            stats.toolsFound[itemName] = 1;
        }
        
        // Check if all items in each category have been collected
        checkCollectionCompleteness();
        
        // Also check for specific gear achievements
        checkAchievements();
        
    } catch (error) {
        console.error('Error tracking equipment collection:', error);
    }
}

// Track item discovery for achievements
export function trackItemObtained(itemName) {
    if (!playerData.statistics) {
        initializeStatistics();
    }
    
    try {
        // Ensure collection statistics exist
        if (!playerData.statistics.collection) {
            playerData.statistics.collection = {
                weaponsFound: {},
                armorFound: {},
                helmetsFound: {},
                toolsFound: {},
                itemsObtained: {},
                allWeapons: 0,
                allArmor: 0,
                allHelmets: 0,
                allTools: 0,
                allEquipment: 0
            };
        }
        
        // Ensure itemsObtained exists
        if (!playerData.statistics.collection.itemsObtained) {
            playerData.statistics.collection.itemsObtained = {};
        }
        
        const stats = playerData.statistics.collection;
        
        // Only track the first time an item is obtained
        if (!stats.itemsObtained[itemName]) {
            stats.itemsObtained[itemName] = 1;
            
            // Save and check achievements
            savePlayerData();
            checkAchievements();
        }
        
    } catch (error) {
        console.error('Error tracking item obtained:', error);
    }
}

// Track when equipment is equipped
export function trackEquipmentEquipped(itemName) {
    if (!playerData.statistics) {
        initializeStatistics();
    }
    
    try {
        // Initialize equipment tracking if not present
        if (!playerData.statistics.equipment) {
            playerData.statistics.equipment = { equipped: {} };
        }
        
        const normalizedName = itemName.toLowerCase();
        
        // Mark this item as equipped
        playerData.statistics.equipment.equipped[normalizedName] = 1;
        
        // Save and check achievements
        savePlayerData();
        checkAchievements();
        
    } catch (error) {
        console.error('Error tracking equipment equipped:', error);
    }
}

// Check if all equipment in each category has been collected
function checkCollectionCompleteness() {
    if (!playerData.statistics) return;
    
    const stats = playerData.statistics.collection;
    
    // Import data to check against (we'll need to get these from data.js)
    // For now, define the equipment lists here
    const allWeapons = [
        'bronze 2h sword', 'iron 2h sword', 'steel 2h sword', 'mithril 2h sword', 
        'adamant 2h sword', 'rune 2h sword', 'dragon 2h sword'
    ];
    
    const allArmor = [
        'bronze chestplate', 'iron chestplate', 'steel chestplate', 'mithril chestplate',
        'adamant chestplate', 'rune chestplate', 'dragon chestplate'
    ];
    
    const allHelmets = [
        'full dragon helmet'
    ];
    
    const allTools = [
        'bronze axe', 'iron axe', 'steel axe', 'mithril axe', 'adamant axe', 'rune axe', 'dragon axe',
        'bronze pickaxe', 'iron pickaxe', 'steel pickaxe', 'mithril pickaxe', 'adamant pickaxe', 'rune pickaxe', 'dragon pickaxe'
    ];
    
    // Check weapons
    let hasAllWeapons = allWeapons.every(weapon => stats.weaponsFound[weapon]);
    if (hasAllWeapons && stats.allWeapons === 0) {
        stats.allWeapons = 1;
        trackStatistic('collection', 'allWeapons', 1);
    }
    
    // Check armor
    let hasAllArmor = allArmor.every(armor => stats.armorFound[armor]);
    if (hasAllArmor && stats.allArmor === 0) {
        stats.allArmor = 1;
        trackStatistic('collection', 'allArmor', 1);
    }
    
    // Check helmets
    let hasAllHelmets = allHelmets.every(helmet => stats.helmetsFound[helmet]);
    if (hasAllHelmets && stats.allHelmets === 0) {
        stats.allHelmets = 1;
        trackStatistic('collection', 'allHelmets', 1);
    }
    
    // Check tools
    let hasAllTools = allTools.every(tool => stats.toolsFound[tool]);
    if (hasAllTools && stats.allTools === 0) {
        stats.allTools = 1;
        trackStatistic('collection', 'allTools', 1);
    }
    
    // Check if all equipment collected
    if (hasAllWeapons && hasAllArmor && hasAllHelmets && hasAllTools && stats.allEquipment === 0) {
        stats.allEquipment = 1;
        trackStatistic('collection', 'allEquipment', 1);
    }
}

// Achievement definitions
export const ACHIEVEMENTS = {
    // === COMBAT ACHIEVEMENTS ===
    
    // General Combat Milestones
    firstBlood: {
        id: 'firstBlood',
        name: 'First Blood',
        description: 'Kill your first monster',
        category: 'Combat',
        requirement: { type: 'combat.totalKills', value: 1 },
        reward: { gold: 100, xp: { attack: 50 } },
        icon: '⚔️',
        tier: 'common'
    },
    
    warrior: {
        id: 'warrior',
        name: 'Warrior',
        description: 'Kill 1,000 monsters',
        category: 'Combat',
        requirement: { type: 'combat.totalKills', value: 1000 },
        reward: { gold: 5000, xp: { attack: 1000 } },
        icon: '🗡️',
        tier: 'rare'
    },
    
    veteran: {
        id: 'veteran',
        name: 'Veteran',
        description: 'Kill 10,000 monsters',
        category: 'Combat',
        requirement: { type: 'combat.totalKills', value: 10000 },
        reward: { gold: 25000, xp: { attack: 5000 } },
        icon: '🛡️',
        tier: 'epic'
    },
    
    legend: {
        id: 'legend',
        name: 'Legend',
        description: 'Kill 100,000 monsters',
        category: 'Combat',
        requirement: { type: 'combat.totalKills', value: 100000 },
        reward: { gold: 100000, xp: { attack: 25000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // Chicken Achievements
    chickenHunter: {
        id: 'chickenHunter',
        name: 'Chicken Hunter',
        description: 'Kill 100 chickens',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.chicken', value: 100 },
        reward: { gold: 500, item: { name: 'health potion (s)', amount: 5 } },
        icon: '🐔',
        tier: 'common'
    },
    
    chickenSlayer: {
        id: 'chickenSlayer',
        name: 'Chicken Slayer',
        description: 'Kill 1,000 chickens',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.chicken', value: 1000 },
        reward: { gold: 2500, item: { name: 'health potion (m)', amount: 10 } },
        icon: '🐔',
        tier: 'uncommon'
    },
    
    chickenNightmare: {
        id: 'chickenNightmare',
        name: 'Chicken Nightmare',
        description: 'Kill 5,000 chickens',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.chicken', value: 5000 },
        reward: { gold: 10000, item: { name: 'health potion (l)', amount: 15 } },
        icon: '🐔',
        tier: 'rare'
    },
    
    chickenAnnihilator: {
        id: 'chickenAnnihilator',
        name: 'Chicken Annihilator',
        description: 'Kill 10,000 chickens',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.chicken', value: 10000 },
        reward: { gold: 25000, xp: { attack: 5000 } },
        icon: '🐔',
        tier: 'epic'
    },
    
    // Wolf Achievements
    wolfHunter: {
        id: 'wolfHunter',
        name: 'Wolf Hunter',
        description: 'Kill 100 wolves',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.wolf', value: 100 },
        reward: { gold: 1000, xp: { attack: 200 } },
        icon: '🐺',
        tier: 'common'
    },
    
    wolfSlayer: {
        id: 'wolfSlayer',
        name: 'Wolf Slayer', 
        description: 'Kill 1,000 wolves',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.wolf', value: 1000 },
        reward: { gold: 5000, xp: { attack: 1000 } },
        icon: '🐺',
        tier: 'uncommon'
    },
    
    wolfBane: {
        id: 'wolfBane',
        name: 'Wolf Bane',
        description: 'Kill 5,000 wolves',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.wolf', value: 5000 },
        reward: { gold: 15000, xp: { attack: 3000 } },
        icon: '🐺',
        tier: 'rare'
    },
    
    alphaSlayer: {
        id: 'alphaSlayer',
        name: 'Alpha Slayer',
        description: 'Kill 10,000 wolves',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.wolf', value: 10000 },
        reward: { gold: 35000, xp: { attack: 7000 } },
        icon: '🐺',
        tier: 'epic'
    },
    
    // Bear Achievements
    bearHunter: {
        id: 'bearHunter',
        name: 'Bear Hunter',
        description: 'Kill 100 bears',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.bear', value: 100 },
        reward: { gold: 2000, xp: { attack: 400 } },
        icon: '🐻',
        tier: 'uncommon'
    },
    
    bearSlayer: {
        id: 'bearSlayer',
        name: 'Bear Slayer',
        description: 'Kill 1,000 bears',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.bear', value: 1000 },
        reward: { gold: 8000, xp: { attack: 1500 } },
        icon: '🐻',
        tier: 'rare'
    },
    
    bearDestroyer: {
        id: 'bearDestroyer',
        name: 'Bear Destroyer',
        description: 'Kill 5,000 bears',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.bear', value: 5000 },
        reward: { gold: 25000, xp: { attack: 5000 } },
        icon: '🐻',
        tier: 'epic'
    },
    
    // Goblin Achievements
    goblinHunter: {
        id: 'goblinHunter',
        name: 'Goblin Hunter',
        description: 'Kill 100 goblins',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.goblin', value: 100 },
        reward: { gold: 1500, xp: { attack: 300 } },
        icon: '👹',
        tier: 'common'
    },
    
    goblinSlayer: {
        id: 'goblinSlayer',
        name: 'Goblin Slayer',
        description: 'Kill 1,000 goblins',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.goblin', value: 1000 },
        reward: { gold: 6000, xp: { attack: 1200 } },
        icon: '👹',
        tier: 'uncommon'
    },
    
    goblinBane: {
        id: 'goblinBane',
        name: 'Goblin Bane',
        description: 'Kill 5,000 goblins',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.goblin', value: 5000 },
        reward: { gold: 20000, xp: { attack: 4000 } },
        icon: '👹',
        tier: 'rare'
    },
    
    // Ogre Achievements
    ogreHunter: {
        id: 'ogreHunter',
        name: 'Ogre Hunter',
        description: 'Kill 100 ogres',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.ogre', value: 100 },
        reward: { gold: 3000, xp: { attack: 600 } },
        icon: '👿',
        tier: 'uncommon'
    },
    
    ogreSlayer: {
        id: 'ogreSlayer',
        name: 'Ogre Slayer',
        description: 'Kill 1,000 ogres',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.ogre', value: 1000 },
        reward: { gold: 12000, xp: { attack: 2500 } },
        icon: '👿',
        tier: 'rare'
    },
    
    ogreDestroyer: {
        id: 'ogreDestroyer',
        name: 'Ogre Destroyer',
        description: 'Kill 5,000 ogres',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.ogre', value: 5000 },
        reward: { gold: 40000, xp: { attack: 8000 } },
        icon: '👿',
        tier: 'epic'
    },
    
    // Dragon Achievements
    dragonHunter: {
        id: 'dragonHunter',
        name: 'Dragon Hunter',
        description: 'Kill 100 dragons',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.dark dragon', value: 100 },
        reward: { gold: 10000, xp: { attack: 2000 } },
        icon: '🐉',
        tier: 'rare'
    },
    
    dragonSlayer: {
        id: 'dragonSlayer',
        name: 'Dragon Slayer',
        description: 'Kill 1,000 dragons',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.dark dragon', value: 1000 },
        reward: { gold: 50000, xp: { attack: 10000 } },
        icon: '🐉',
        tier: 'epic'
    },
    
    dragonlord: {
        id: 'dragonlord',
        name: 'Dragonlord',
        description: 'Kill 5,000 dragons',
        category: 'Combat',
        requirement: { type: 'combat.monsterKills.dark dragon', value: 5000 },
        reward: { gold: 150000, xp: { attack: 30000 } },
        icon: '🐉',
        tier: 'legendary'
    },
    
    // Critical Hit Achievements
    criticalStriker: {
        id: 'criticalStriker',
        name: 'Critical Striker',
        description: 'Land 100 critical hits',
        category: 'Combat',
        requirement: { type: 'combat.criticalHits', value: 100 },
        reward: { gold: 1000, xp: { attack: 200 } },
        icon: '💥',
        tier: 'common'
    },
    
    criticalMaster: {
        id: 'criticalMaster',
        name: 'Critical Master',
        description: 'Land 1,000 critical hits',
        category: 'Combat',
        requirement: { type: 'combat.criticalHits', value: 1000 },
        reward: { gold: 5000, xp: { attack: 1000 } },
        icon: '💥',
        tier: 'uncommon'
    },
    
    criticalLegend: {
        id: 'criticalLegend',
        name: 'Critical Legend',
        description: 'Land 10,000 critical hits',
        category: 'Combat',
        requirement: { type: 'combat.criticalHits', value: 10000 },
        reward: { gold: 25000, xp: { attack: 5000 } },
        icon: '💥',
        tier: 'epic'
    },
    
    // === GATHERING ACHIEVEMENTS ===
    
    // General Gathering
    firstChop: {
        id: 'firstChop',
        name: 'First Chop',
        description: 'Chop your first tree',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.logs', value: 1 },
        reward: { gold: 50, xp: { woodcutting: 25 } },
        icon: '🪓',
        tier: 'common'
    },
    
    gatherer: {
        id: 'gatherer',
        name: 'Gatherer',
        description: 'Gather 1,000 items',
        category: 'Gathering',
        requirement: { type: 'gathering.totalItemsGathered', value: 1000 },
        reward: { gold: 2000, xp: { mining: 300, woodcutting: 300 } },
        icon: '📦',
        tier: 'uncommon'
    },
    
    collector: {
        id: 'collector',
        name: 'Collector',
        description: 'Gather 10,000 items',
        category: 'Gathering',
        requirement: { type: 'gathering.totalItemsGathered', value: 10000 },
        reward: { gold: 15000, xp: { mining: 2000, woodcutting: 2000 } },
        icon: '📦',
        tier: 'rare'
    },
    
    hoarder: {
        id: 'hoarder',
        name: 'Hoarder',
        description: 'Gather 100,000 items',
        category: 'Gathering',
        requirement: { type: 'gathering.totalItemsGathered', value: 100000 },
        reward: { gold: 75000, xp: { mining: 10000, woodcutting: 10000 } },
        icon: '📦',
        tier: 'legendary'
    },
    
    // Specific Log Achievements
    logCollector: {
        id: 'logCollector',
        name: 'Log Collector',
        description: 'Gather 1,000 logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.logs', value: 1000 },
        reward: { gold: 1500, item: { name: 'bronze axe', amount: 1 } },
        icon: '🪵',
        tier: 'common'
    },
    
    lumberjack: {
        id: 'lumberjack',
        name: 'Lumberjack',
        description: 'Gather 5,000 logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.logs', value: 5000 },
        reward: { gold: 5000, item: { name: 'steel axe', amount: 1 } },
        icon: '🪵',
        tier: 'uncommon'
    },
    
    masterLumberjack: {
        id: 'masterLumberjack',
        name: 'Master Lumberjack',
        description: 'Gather 25,000 logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.logs', value: 25000 },
        reward: { gold: 20000, item: { name: 'mithril axe', amount: 1 } },
        icon: '🪵',
        tier: 'epic'
    },
    
    // Oak Logs
    oakCollector: {
        id: 'oakCollector',
        name: 'Oak Collector',
        description: 'Gather 1,000 oak logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.oak logs', value: 1000 },
        reward: { gold: 2000, xp: { woodcutting: 500 } },
        icon: '🌳',
        tier: 'common'
    },
    
    oakMaster: {
        id: 'oakMaster',
        name: 'Oak Master',
        description: 'Gather 10,000 oak logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.oak logs', value: 10000 },
        reward: { gold: 15000, xp: { woodcutting: 3000 } },
        icon: '🌳',
        tier: 'rare'
    },
    
    // Maple Logs
    mapleCollector: {
        id: 'mapleCollector',
        name: 'Maple Collector',
        description: 'Gather 1,000 maple logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.maple logs', value: 1000 },
        reward: { gold: 3000, xp: { woodcutting: 750 } },
        icon: '🍁',
        tier: 'uncommon'
    },
    
    mapleMaster: {
        id: 'mapleMaster',
        name: 'Maple Master',
        description: 'Gather 10,000 maple logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.maple logs', value: 10000 },
        reward: { gold: 25000, xp: { woodcutting: 5000 } },
        icon: '🍁',
        tier: 'epic'
    },
    
    // Yew Logs
    yewCollector: {
        id: 'yewCollector',
        name: 'Yew Collector',
        description: 'Gather 1,000 yew logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.yew logs', value: 1000 },
        reward: { gold: 5000, xp: { woodcutting: 1500 } },
        icon: '🌲',
        tier: 'rare'
    },
    
    yewMaster: {
        id: 'yewMaster',
        name: 'Yew Master',
        description: 'Gather 10,000 yew logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.yew logs', value: 10000 },
        reward: { gold: 40000, xp: { woodcutting: 10000 } },
        icon: '🌲',
        tier: 'epic'
    },
    
    // Magic Logs
    magicCollector: {
        id: 'magicCollector',
        name: 'Magic Collector',
        description: 'Gather 1,000 magic logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.magic logs', value: 1000 },
        reward: { gold: 10000, xp: { woodcutting: 3000 } },
        icon: '✨',
        tier: 'epic'
    },
    
    magicMaster: {
        id: 'magicMaster',
        name: 'Magic Master',
        description: 'Gather 10,000 magic logs',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.magic logs', value: 10000 },
        reward: { gold: 75000, xp: { woodcutting: 20000 } },
        icon: '✨',
        tier: 'legendary'
    },
    
    // Mining Achievements
    firstMine: {
        id: 'firstMine',
        name: 'First Mine',
        description: 'Mine your first ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.tin ore', value: 1 },
        reward: { gold: 50, xp: { mining: 25 } },
        icon: '⛏️',
        tier: 'common'
    },
    
    // Copper Ore
    copperMiner: {
        id: 'copperMiner',
        name: 'Copper Miner',
        description: 'Mine 1,000 copper ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.copper ore', value: 1000 },
        reward: { gold: 1500, xp: { mining: 400 } },
        icon: '🟤',
        tier: 'common'
    },
    
    copperMaster: {
        id: 'copperMaster',
        name: 'Copper Master',
        description: 'Mine 10,000 copper ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.copper ore', value: 10000 },
        reward: { gold: 12000, xp: { mining: 3000 } },
        icon: '🟤',
        tier: 'rare'
    },
    
    // Iron Ore
    ironMiner: {
        id: 'ironMiner',
        name: 'Iron Miner',
        description: 'Mine 1,000 iron ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.iron ore', value: 1000 },
        reward: { gold: 3000, xp: { mining: 800 } },
        icon: '⚫',
        tier: 'uncommon'
    },
    
    ironMaster: {
        id: 'ironMaster',
        name: 'Iron Master',
        description: 'Mine 10,000 iron ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.iron ore', value: 10000 },
        reward: { gold: 25000, xp: { mining: 6000 } },
        icon: '⚫',
        tier: 'epic'
    },
    
    // Mithril Ore
    mithrilMiner: {
        id: 'mithrilMiner',
        name: 'Mithril Miner',
        description: 'Mine 1,000 mithril ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.mithril ore', value: 1000 },
        reward: { gold: 15000, xp: { mining: 4000 } },
        icon: '🔵',
        tier: 'epic'
    },
    
    mithrilMaster: {
        id: 'mithrilMaster',
        name: 'Mithril Master',
        description: 'Mine 10,000 mithril ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.mithril ore', value: 10000 },
        reward: { gold: 120000, xp: { mining: 30000 } },
        icon: '🔵',
        tier: 'legendary'
    },
    
    // Runite Ore
    runiteMiner: {
        id: 'runiteMiner',
        name: 'Runite Miner',
        description: 'Mine 1,000 runite ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.runite ore', value: 1000 },
        reward: { gold: 25000, xp: { mining: 8000 } },
        icon: '🟢',
        tier: 'epic'
    },
    
    runiteMaster: {
        id: 'runiteMaster',
        name: 'Runite Master',
        description: 'Mine 10,000 runite ore',
        category: 'Gathering',
        requirement: { type: 'gathering.itemsGathered.runite ore', value: 10000 },
        reward: { gold: 200000, xp: { mining: 50000 } },
        icon: '🟢',
        tier: 'legendary'
    },
    
    // Gem Achievements
    gemHunter: {
        id: 'gemHunter',
        name: 'Gem Hunter',
        description: 'Find 100 rare items',
        category: 'Gathering',
        requirement: { type: 'gathering.rareItemsFound', value: 100 },
        reward: { gold: 10000, item: { name: 'sapphire', amount: 5 } },
        icon: '💎',
        tier: 'rare'
    },
    
    gemCollector: {
        id: 'gemCollector',
        name: 'Gem Collector',
        description: 'Find 1,000 rare items',
        category: 'Gathering',
        requirement: { type: 'gathering.rareItemsFound', value: 1000 },
        reward: { gold: 50000, item: { name: 'emerald', amount: 10 } },
        icon: '💎',
        tier: 'epic'
    },
    
    // === CRAFTING ACHIEVEMENTS ===
    
    firstEnchant: {
        id: 'firstEnchant',
        name: 'First Enchant',
        description: 'Apply your first enchantment',
        category: 'Crafting',
        requirement: { type: 'crafting.totalEnchantments', value: 1 },
        reward: { gold: 200, xp: { enchanting: 100 } },
        icon: '✨',
        tier: 'common'
    },
    
    enchanter: {
        id: 'enchanter',
        name: 'Enchanter',
        description: 'Apply 50 enchantments',
        category: 'Crafting',
        requirement: { type: 'crafting.totalEnchantments', value: 50 },
        reward: { gold: 5000, item: { name: 'ancient_tomes', amount: 10 } },
        icon: '✨',
        tier: 'uncommon'
    },
    
    masterEnchanter: {
        id: 'masterEnchanter',
        name: 'Master Enchanter',
        description: 'Apply 500 enchantments',
        category: 'Crafting',
        requirement: { type: 'crafting.totalEnchantments', value: 500 },
        reward: { gold: 25000, item: { name: 'ancient_tomes', amount: 50 } },
        icon: '✨',
        tier: 'epic'
    },
    
    legendaryEnchanter: {
        id: 'legendaryEnchanter',
        name: 'Legendary Enchanter',
        description: 'Apply 10 legendary enchantments',
        category: 'Crafting',
        requirement: { type: 'crafting.legendaryEnchantments', value: 10 },
        reward: { gold: 100000, item: { name: 'diamond', amount: 5 } },
        icon: '🌟',
        tier: 'legendary'
    },
    
    gemMaster: {
        id: 'gemMaster',
        name: 'Gem Master',
        description: 'Convert 100 gems',
        category: 'Crafting',
        requirement: { type: 'crafting.gemsConverted', value: 100 },
        reward: { gold: 15000, item: { name: 'sapphire', amount: 5 } },
        icon: '💎',
        tier: 'rare'
    },
    
    gemGrandmaster: {
        id: 'gemGrandmaster',
        name: 'Gem Grandmaster',
        description: 'Convert 1,000 gems',
        category: 'Crafting',
        requirement: { type: 'crafting.gemsConverted', value: 1000 },
        reward: { gold: 75000, item: { name: 'ruby', amount: 10 } },
        icon: '💎',
        tier: 'epic'
    },
    
    // === ECONOMIC ACHIEVEMENTS ===
    
    firstGold: {
        id: 'firstGold',
        name: 'First Gold',
        description: 'Earn your first 1,000 gold',
        category: 'Economy',
        requirement: { type: 'economy.totalGoldEarned', value: 1000 },
        reward: { gold: 500 },
        icon: '💰',
        tier: 'common'
    },
    
    merchant: {
        id: 'merchant',
        name: 'Merchant',
        description: 'Earn 10,000 gold',
        category: 'Economy',
        requirement: { type: 'economy.totalGoldEarned', value: 10000 },
        reward: { gold: 2500 },
        icon: '💰',
        tier: 'uncommon'
    },
    
    goldDigger: {
        id: 'goldDigger',
        name: 'Gold Digger',
        description: 'Earn 100,000 gold',
        category: 'Economy',
        requirement: { type: 'economy.totalGoldEarned', value: 100000 },
        reward: { gold: 25000 },
        icon: '💰',
        tier: 'rare'
    },
    
    goldMagnate: {
        id: 'goldMagnate',
        name: 'Gold Magnate',
        description: 'Earn 1,000,000 gold',
        category: 'Economy',
        requirement: { type: 'economy.totalGoldEarned', value: 1000000 },
        reward: { gold: 250000 },
        icon: '💰',
        tier: 'epic'
    },
    
    goldTycoon: {
        id: 'goldTycoon',
        name: 'Gold Tycoon',
        description: 'Earn 10,000,000 gold',
        category: 'Economy',
        requirement: { type: 'economy.totalGoldEarned', value: 10000000 },
        reward: { gold: 2500000 },
        icon: '💰',
        tier: 'legendary'
    },
    
    // === GUILD ACHIEVEMENTS ===
    
    guildMember: {
        id: 'guildMember',
        name: 'Guild Member',
        description: 'Complete 10 guild tasks',
        category: 'Guild',
        requirement: { type: 'guild.tasksCompleted', value: 10 },
        reward: { gold: 2000, xp: { attack: 500 } },
        icon: '🏛️',
        tier: 'common'
    },
    
    guildOfficer: {
        id: 'guildOfficer',
        name: 'Guild Officer',
        description: 'Complete 50 guild tasks',
        category: 'Guild',
        requirement: { type: 'guild.tasksCompleted', value: 50 },
        reward: { gold: 8000, xp: { attack: 2000 } },
        icon: '🏛️',
        tier: 'uncommon'
    },
    
    guildMaster: {
        id: 'guildMaster',
        name: 'Guild Master',
        description: 'Complete 200 guild tasks',
        category: 'Guild',
        requirement: { type: 'guild.tasksCompleted', value: 200 },
        reward: { gold: 25000, xp: { attack: 5000 } },
        icon: '🏛️',
        tier: 'epic'
    },
    
    // === PROGRESSION ACHIEVEMENTS ===
    
    builder: {
        id: 'builder',
        name: 'Builder',
        description: 'Build 5 structures',
        category: 'Progression',
        requirement: { type: 'progression.structuresBuilt', value: 5 },
        reward: { gold: 5000, item: { name: 'oak logs', amount: 100 } },
        icon: '🏗️',
        tier: 'uncommon'
    },
    
    architect: {
        id: 'architect',
        name: 'Architect',
        description: 'Build 15 structures',
        category: 'Progression',
        requirement: { type: 'progression.structuresBuilt', value: 15 },
        reward: { gold: 20000, item: { name: 'maple logs', amount: 200 } },
        icon: '🏗️',
        tier: 'epic'
    },
    
    cityPlanner: {
        id: 'cityPlanner',
        name: 'City Planner',
        description: 'Build all available structures',
        category: 'Progression',
        requirement: { type: 'progression.structuresBuilt', value: 25 },
        reward: { gold: 100000, item: { name: 'magic logs', amount: 500 } },
        icon: '🏗️',
        tier: 'legendary'
    },
    
    // === FARMING ACHIEVEMENTS ===
    
    gardener: {
        id: 'gardener',
        name: 'Gardener',
        description: 'Plant 50 seeds',
        category: 'Farming',
        requirement: { type: 'farming.seedsPlanted', value: 50 },
        reward: { gold: 1000, item: { name: 'water', amount: 25 } },
        icon: '🌱',
        tier: 'common'
    },
    
    farmer: {
        id: 'farmer',
        name: 'Farmer',
        description: 'Plant 500 seeds',
        category: 'Farming',
        requirement: { type: 'farming.seedsPlanted', value: 500 },
        reward: { gold: 5000, item: { name: 'water', amount: 100 } },
        icon: '🌱',
        tier: 'uncommon'
    },
    
    agriculturist: {
        id: 'agriculturist',
        name: 'Agriculturist',
        description: 'Plant 2,500 seeds',
        category: 'Farming',
        requirement: { type: 'farming.seedsPlanted', value: 2500 },
        reward: { gold: 20000, item: { name: 'water', amount: 500 } },
        icon: '🌱',
        tier: 'epic'
    },
    
    harvester: {
        id: 'harvester',
        name: 'Harvester',
        description: 'Harvest 1,000 crops',
        category: 'Farming',
        requirement: { type: 'farming.cropsHarvested', value: 1000 },
        reward: { gold: 8000, xp: { farming: 2000 } },
        icon: '🌾',
        tier: 'rare'
    },
    
    masterFarmer: {
        id: 'masterFarmer',
        name: 'Master Farmer',
        description: 'Harvest 10,000 crops',
        category: 'Farming',
        requirement: { type: 'farming.cropsHarvested', value: 10000 },
        reward: { gold: 50000, xp: { farming: 15000 } },
        icon: '🌾',
        tier: 'epic'
    },
    
    // === LEVEL MILESTONE ACHIEVEMENTS ===
    
    // === ATTACK LEVEL MILESTONES ===
    attackLevel10: {
        id: 'attackLevel10',
        name: 'Warrior Novice',
        description: 'Reach level 10 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 10 },
        reward: { gold: 1000, xp: { attack: 500 } },
        icon: '⚔️',
        tier: 'common'
    },
    
    attackLevel20: {
        id: 'attackLevel20',
        name: 'Warrior Apprentice',
        description: 'Reach level 20 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 20 },
        reward: { gold: 2500, xp: { attack: 1000 } },
        icon: '⚔️',
        tier: 'common'
    },
    
    attackLevel30: {
        id: 'attackLevel30',
        name: 'Warrior Journeyman',
        description: 'Reach level 30 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 30 },
        reward: { gold: 5000, xp: { attack: 2000 } },
        icon: '⚔️',
        tier: 'uncommon'
    },
    
    attackLevel40: {
        id: 'attackLevel40',
        name: 'Warrior Adept',
        description: 'Reach level 40 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 40 },
        reward: { gold: 10000, xp: { attack: 4000 } },
        icon: '⚔️',
        tier: 'uncommon'
    },
    
    attackLevel50: {
        id: 'attackLevel50',
        name: 'Warrior Expert',
        description: 'Reach level 50 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 50 },
        reward: { gold: 20000, xp: { attack: 8000 } },
        icon: '⚔️',
        tier: 'rare'
    },
    
    attackLevel60: {
        id: 'attackLevel60',
        name: 'Warrior Elite',
        description: 'Reach level 60 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 60 },
        reward: { gold: 35000, xp: { attack: 15000 } },
        icon: '⚔️',
        tier: 'rare'
    },
    
    attackLevel70: {
        id: 'attackLevel70',
        name: 'Warrior Master',
        description: 'Reach level 70 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 70 },
        reward: { gold: 60000, xp: { attack: 25000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    
    attackLevel80: {
        id: 'attackLevel80',
        name: 'Warrior Grandmaster',
        description: 'Reach level 80 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 80 },
        reward: { gold: 100000, xp: { attack: 40000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    
    attackLevel90: {
        id: 'attackLevel90',
        name: 'Legendary Warrior',
        description: 'Reach level 90 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 90 },
        reward: { gold: 175000, xp: { attack: 70000 } },
        icon: '⚔️',
        tier: 'legendary'
    },
    
    attackLevel99: {
        id: 'attackLevel99',
        name: 'Combat Perfection',
        description: 'Reach level 99 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 99 },
        reward: { gold: 300000, xp: { attack: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === MINING LEVEL MILESTONES ===
    miningLevel10: {
        id: 'miningLevel10',
        name: 'Miner Novice',
        description: 'Reach level 10 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 10 },
        reward: { gold: 1000, xp: { mining: 500 } },
        icon: '⛏️',
        tier: 'common'
    },
    
    miningLevel20: {
        id: 'miningLevel20',
        name: 'Miner Apprentice',
        description: 'Reach level 20 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 20 },
        reward: { gold: 2500, xp: { mining: 1000 } },
        icon: '⛏️',
        tier: 'common'
    },
    
    miningLevel30: {
        id: 'miningLevel30',
        name: 'Miner Journeyman',
        description: 'Reach level 30 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 30 },
        reward: { gold: 5000, xp: { mining: 2000 } },
        icon: '⛏️',
        tier: 'uncommon'
    },
    
    miningLevel40: {
        id: 'miningLevel40',
        name: 'Miner Adept',
        description: 'Reach level 40 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 40 },
        reward: { gold: 10000, xp: { mining: 4000 } },
        icon: '⛏️',
        tier: 'uncommon'
    },
    
    miningLevel50: {
        id: 'miningLevel50',
        name: 'Miner Expert',
        description: 'Reach level 50 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 50 },
        reward: { gold: 20000, xp: { mining: 8000 } },
        icon: '⛏️',
        tier: 'rare'
    },
    
    miningLevel60: {
        id: 'miningLevel60',
        name: 'Miner Elite',
        description: 'Reach level 60 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 60 },
        reward: { gold: 35000, xp: { mining: 15000 } },
        icon: '⛏️',
        tier: 'rare'
    },
    
    miningLevel70: {
        id: 'miningLevel70',
        name: 'Miner Master',
        description: 'Reach level 70 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 70 },
        reward: { gold: 60000, xp: { mining: 25000 } },
        icon: '⛏️',
        tier: 'epic'
    },
    
    miningLevel80: {
        id: 'miningLevel80',
        name: 'Miner Grandmaster',
        description: 'Reach level 80 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 80 },
        reward: { gold: 100000, xp: { mining: 40000 } },
        icon: '⛏️',
        tier: 'epic'
    },
    
    miningLevel90: {
        id: 'miningLevel90',
        name: 'Legendary Miner',
        description: 'Reach level 90 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 90 },
        reward: { gold: 175000, xp: { mining: 70000 } },
        icon: '⛏️',
        tier: 'legendary'
    },
    
    miningLevel99: {
        id: 'miningLevel99',
        name: 'Mining Perfection',
        description: 'Reach level 99 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 99 },
        reward: { gold: 300000, xp: { mining: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === WOODCUTTING LEVEL MILESTONES ===
    woodcuttingLevel10: {
        id: 'woodcuttingLevel10',
        name: 'Lumberjack Novice',
        description: 'Reach level 10 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 10 },
        reward: { gold: 1000, xp: { woodcutting: 500 } },
        icon: '🪓',
        tier: 'common'
    },
    
    woodcuttingLevel20: {
        id: 'woodcuttingLevel20',
        name: 'Lumberjack Apprentice',
        description: 'Reach level 20 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 20 },
        reward: { gold: 2500, xp: { woodcutting: 1000 } },
        icon: '🪓',
        tier: 'common'
    },
    
    woodcuttingLevel30: {
        id: 'woodcuttingLevel30',
        name: 'Lumberjack Journeyman',
        description: 'Reach level 30 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 30 },
        reward: { gold: 5000, xp: { woodcutting: 2000 } },
        icon: '🪓',
        tier: 'uncommon'
    },
    
    woodcuttingLevel40: {
        id: 'woodcuttingLevel40',
        name: 'Lumberjack Adept',
        description: 'Reach level 40 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 40 },
        reward: { gold: 10000, xp: { woodcutting: 4000 } },
        icon: '🪓',
        tier: 'uncommon'
    },
    
    woodcuttingLevel50: {
        id: 'woodcuttingLevel50',
        name: 'Lumberjack Expert',
        description: 'Reach level 50 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 50 },
        reward: { gold: 20000, xp: { woodcutting: 8000 } },
        icon: '🪓',
        tier: 'rare'
    },
    
    woodcuttingLevel60: {
        id: 'woodcuttingLevel60',
        name: 'Lumberjack Elite',
        description: 'Reach level 60 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 60 },
        reward: { gold: 35000, xp: { woodcutting: 15000 } },
        icon: '🪓',
        tier: 'rare'
    },
    
    woodcuttingLevel70: {
        id: 'woodcuttingLevel70',
        name: 'Lumberjack Master',
        description: 'Reach level 70 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 70 },
        reward: { gold: 60000, xp: { woodcutting: 25000 } },
        icon: '🪓',
        tier: 'epic'
    },
    
    woodcuttingLevel80: {
        id: 'woodcuttingLevel80',
        name: 'Lumberjack Grandmaster',
        description: 'Reach level 80 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 80 },
        reward: { gold: 100000, xp: { woodcutting: 40000 } },
        icon: '🪓',
        tier: 'epic'
    },
    
    woodcuttingLevel90: {
        id: 'woodcuttingLevel90',
        name: 'Legendary Lumberjack',
        description: 'Reach level 90 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 90 },
        reward: { gold: 175000, xp: { woodcutting: 70000 } },
        icon: '🪓',
        tier: 'legendary'
    },
    
    woodcuttingLevel99: {
        id: 'woodcuttingLevel99',
        name: 'Woodcutting Perfection',
        description: 'Reach level 99 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 99 },
        reward: { gold: 300000, xp: { woodcutting: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === BLACKSMITHING LEVEL MILESTONES ===
    blacksmithingLevel10: {
        id: 'blacksmithingLevel10',
        name: 'Smith Novice',
        description: 'Reach level 10 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 10 },
        reward: { gold: 1000, xp: { blacksmithing: 500 } },
        icon: '🔨',
        tier: 'common'
    },
    
    blacksmithingLevel20: {
        id: 'blacksmithingLevel20',
        name: 'Smith Apprentice',
        description: 'Reach level 20 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 20 },
        reward: { gold: 2500, xp: { blacksmithing: 1000 } },
        icon: '🔨',
        tier: 'common'
    },
    
    blacksmithingLevel30: {
        id: 'blacksmithingLevel30',
        name: 'Smith Journeyman',
        description: 'Reach level 30 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 30 },
        reward: { gold: 5000, xp: { blacksmithing: 2000 } },
        icon: '🔨',
        tier: 'uncommon'
    },
    
    blacksmithingLevel40: {
        id: 'blacksmithingLevel40',
        name: 'Smith Adept',
        description: 'Reach level 40 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 40 },
        reward: { gold: 10000, xp: { blacksmithing: 4000 } },
        icon: '🔨',
        tier: 'uncommon'
    },
    
    blacksmithingLevel50: {
        id: 'blacksmithingLevel50',
        name: 'Smith Expert',
        description: 'Reach level 50 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 50 },
        reward: { gold: 20000, xp: { blacksmithing: 8000 } },
        icon: '🔨',
        tier: 'rare'
    },
    
    blacksmithingLevel60: {
        id: 'blacksmithingLevel60',
        name: 'Smith Elite',
        description: 'Reach level 60 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 60 },
        reward: { gold: 35000, xp: { blacksmithing: 15000 } },
        icon: '🔨',
        tier: 'rare'
    },
    
    blacksmithingLevel70: {
        id: 'blacksmithingLevel70',
        name: 'Smith Master',
        description: 'Reach level 70 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 70 },
        reward: { gold: 60000, xp: { blacksmithing: 25000 } },
        icon: '🔨',
        tier: 'epic'
    },
    
    blacksmithingLevel80: {
        id: 'blacksmithingLevel80',
        name: 'Smith Grandmaster',
        description: 'Reach level 80 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 80 },
        reward: { gold: 100000, xp: { blacksmithing: 40000 } },
        icon: '🔨',
        tier: 'epic'
    },
    
    blacksmithingLevel90: {
        id: 'blacksmithingLevel90',
        name: 'Legendary Smith',
        description: 'Reach level 90 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 90 },
        reward: { gold: 175000, xp: { blacksmithing: 70000 } },
        icon: '🔨',
        tier: 'legendary'
    },
    
    blacksmithingLevel99: {
        id: 'blacksmithingLevel99',
        name: 'Blacksmithing Perfection',
        description: 'Reach level 99 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 99 },
        reward: { gold: 300000, xp: { blacksmithing: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === COOKING LEVEL MILESTONES ===
    cookingLevel10: {
        id: 'cookingLevel10',
        name: 'Cook Novice',
        description: 'Reach level 10 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 10 },
        reward: { gold: 1000, xp: { cooking: 500 } },
        icon: '🍳',
        tier: 'common'
    },
    
    cookingLevel20: {
        id: 'cookingLevel20',
        name: 'Cook Apprentice',
        description: 'Reach level 20 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 20 },
        reward: { gold: 2500, xp: { cooking: 1000 } },
        icon: '🍳',
        tier: 'common'
    },
    
    cookingLevel30: {
        id: 'cookingLevel30',
        name: 'Cook Journeyman',
        description: 'Reach level 30 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 30 },
        reward: { gold: 5000, xp: { cooking: 2000 } },
        icon: '🍳',
        tier: 'uncommon'
    },
    
    cookingLevel40: {
        id: 'cookingLevel40',
        name: 'Cook Adept',
        description: 'Reach level 40 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 40 },
        reward: { gold: 10000, xp: { cooking: 4000 } },
        icon: '🍳',
        tier: 'uncommon'
    },
    
    cookingLevel50: {
        id: 'cookingLevel50',
        name: 'Cook Expert',
        description: 'Reach level 50 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 50 },
        reward: { gold: 20000, xp: { cooking: 8000 } },
        icon: '🍳',
        tier: 'rare'
    },
    
    cookingLevel60: {
        id: 'cookingLevel60',
        name: 'Cook Elite',
        description: 'Reach level 60 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 60 },
        reward: { gold: 35000, xp: { cooking: 15000 } },
        icon: '🍳',
        tier: 'rare'
    },
    
    cookingLevel70: {
        id: 'cookingLevel70',
        name: 'Cook Master',
        description: 'Reach level 70 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 70 },
        reward: { gold: 60000, xp: { cooking: 25000 } },
        icon: '🍳',
        tier: 'epic'
    },
    
    cookingLevel80: {
        id: 'cookingLevel80',
        name: 'Cook Grandmaster',
        description: 'Reach level 80 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 80 },
        reward: { gold: 100000, xp: { cooking: 40000 } },
        icon: '🍳',
        tier: 'epic'
    },
    
    cookingLevel90: {
        id: 'cookingLevel90',
        name: 'Legendary Cook',
        description: 'Reach level 90 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 90 },
        reward: { gold: 175000, xp: { cooking: 70000 } },
        icon: '🍳',
        tier: 'legendary'
    },
    
    cookingLevel99: {
        id: 'cookingLevel99',
        name: 'Cooking Perfection',
        description: 'Reach level 99 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 99 },
        reward: { gold: 300000, xp: { cooking: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === FARMING LEVEL MILESTONES ===
    farmingLevel10: {
        id: 'farmingLevel10',
        name: 'Farmer Novice',
        description: 'Reach level 10 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 10 },
        reward: { gold: 1000, xp: { farming: 500 } },
        icon: '🌾',
        tier: 'common'
    },
    
    farmingLevel20: {
        id: 'farmingLevel20',
        name: 'Farmer Apprentice',
        description: 'Reach level 20 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 20 },
        reward: { gold: 2500, xp: { farming: 1000 } },
        icon: '🌾',
        tier: 'common'
    },
    
    farmingLevel30: {
        id: 'farmingLevel30',
        name: 'Farmer Journeyman',
        description: 'Reach level 30 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 30 },
        reward: { gold: 5000, xp: { farming: 2000 } },
        icon: '🌾',
        tier: 'uncommon'
    },
    
    farmingLevel40: {
        id: 'farmingLevel40',
        name: 'Farmer Adept',
        description: 'Reach level 40 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 40 },
        reward: { gold: 10000, xp: { farming: 4000 } },
        icon: '🌾',
        tier: 'uncommon'
    },
    
    farmingLevel50: {
        id: 'farmingLevel50',
        name: 'Farmer Expert',
        description: 'Reach level 50 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 50 },
        reward: { gold: 20000, xp: { farming: 8000 } },
        icon: '🌾',
        tier: 'rare'
    },
    
    farmingLevel60: {
        id: 'farmingLevel60',
        name: 'Farmer Elite',
        description: 'Reach level 60 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 60 },
        reward: { gold: 35000, xp: { farming: 15000 } },
        icon: '🌾',
        tier: 'rare'
    },
    
    farmingLevel70: {
        id: 'farmingLevel70',
        name: 'Farmer Master',
        description: 'Reach level 70 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 70 },
        reward: { gold: 60000, xp: { farming: 25000 } },
        icon: '🌾',
        tier: 'epic'
    },
    
    farmingLevel80: {
        id: 'farmingLevel80',
        name: 'Farmer Grandmaster',
        description: 'Reach level 80 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 80 },
        reward: { gold: 100000, xp: { farming: 40000 } },
        icon: '🌾',
        tier: 'epic'
    },
    
    farmingLevel90: {
        id: 'farmingLevel90',
        name: 'Legendary Farmer',
        description: 'Reach level 90 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 90 },
        reward: { gold: 175000, xp: { farming: 70000 } },
        icon: '🌾',
        tier: 'legendary'
    },
    
    farmingLevel99: {
        id: 'farmingLevel99',
        name: 'Farming Perfection',
        description: 'Reach level 99 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 99 },
        reward: { gold: 300000, xp: { farming: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === ENCHANTING LEVEL MILESTONES ===
    enchantingLevel10: {
        id: 'enchantingLevel10',
        name: 'Enchanter Novice',
        description: 'Reach level 10 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 10 },
        reward: { gold: 1000, xp: { enchanting: 500 } },
        icon: '✨',
        tier: 'common'
    },
    
    enchantingLevel20: {
        id: 'enchantingLevel20',
        name: 'Enchanter Apprentice',
        description: 'Reach level 20 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 20 },
        reward: { gold: 2500, xp: { enchanting: 1000 } },
        icon: '✨',
        tier: 'common'
    },
    
    enchantingLevel30: {
        id: 'enchantingLevel30',
        name: 'Enchanter Journeyman',
        description: 'Reach level 30 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 30 },
        reward: { gold: 5000, xp: { enchanting: 2000 } },
        icon: '✨',
        tier: 'uncommon'
    },
    
    enchantingLevel40: {
        id: 'enchantingLevel40',
        name: 'Enchanter Adept',
        description: 'Reach level 40 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 40 },
        reward: { gold: 10000, xp: { enchanting: 4000 } },
        icon: '✨',
        tier: 'uncommon'
    },
    
    enchantingLevel50: {
        id: 'enchantingLevel50',
        name: 'Enchanter Expert',
        description: 'Reach level 50 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 50 },
        reward: { gold: 20000, xp: { enchanting: 8000 } },
        icon: '✨',
        tier: 'rare'
    },
    
    enchantingLevel60: {
        id: 'enchantingLevel60',
        name: 'Enchanter Elite',
        description: 'Reach level 60 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 60 },
        reward: { gold: 35000, xp: { enchanting: 15000 } },
        icon: '✨',
        tier: 'rare'
    },
    
    enchantingLevel70: {
        id: 'enchantingLevel70',
        name: 'Enchanter Master',
        description: 'Reach level 70 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 70 },
        reward: { gold: 60000, xp: { enchanting: 25000 } },
        icon: '✨',
        tier: 'epic'
    },
    
    enchantingLevel80: {
        id: 'enchantingLevel80',
        name: 'Enchanter Grandmaster',
        description: 'Reach level 80 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 80 },
        reward: { gold: 100000, xp: { enchanting: 40000 } },
        icon: '✨',
        tier: 'epic'
    },
    
    enchantingLevel90: {
        id: 'enchantingLevel90',
        name: 'Legendary Enchanter',
        description: 'Reach level 90 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 90 },
        reward: { gold: 175000, xp: { enchanting: 70000 } },
        icon: '✨',
        tier: 'legendary'
    },
    
    enchantingLevel99: {
        id: 'enchantingLevel99',
        name: 'Enchanting Perfection',
        description: 'Reach level 99 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 99 },
        reward: { gold: 300000, xp: { enchanting: 100000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    // === EQUIPMENT COLLECTION ACHIEVEMENTS ===
    
    // === STEEL EQUIPMENT ACHIEVEMENTS ===
    steelWarrior: {
        id: 'steelWarrior',
        name: 'Steel Warrior',
        description: 'Equip a Steel 2H Sword',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.steel 2h sword', value: 1 },
        reward: { gold: 2500, xp: { attack: 500 } },
        icon: '⚔️',
        tier: 'uncommon'
    },
    
    steelLumberjack: {
        id: 'steelLumberjack',
        name: 'Steel Lumberjack',
        description: 'Equip a Steel Axe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.steel axe', value: 1 },
        reward: { gold: 2000, xp: { woodcutting: 400 } },
        icon: '🪓',
        tier: 'uncommon'
    },
    
    steelMiner: {
        id: 'steelMiner',
        name: 'Steel Miner',
        description: 'Equip a Steel Pickaxe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.steel pickaxe', value: 1 },
        reward: { gold: 2000, xp: { mining: 400 } },
        icon: '⛏️',
        tier: 'uncommon'
    },
    
    steelProtector: {
        id: 'steelProtector',
        name: 'Steel Protector',
        description: 'Equip a Steel Chestplate',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.steel chestplate', value: 1 },
        reward: { gold: 3000, xp: { attack: 600 } },
        icon: '🛡️',
        tier: 'uncommon'
    },
    
    // === MITHRIL EQUIPMENT ACHIEVEMENTS ===
    mithrilWarrior: {
        id: 'mithrilWarrior',
        name: 'Mithril Warrior',
        description: 'Equip a Mithril 2H Sword',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.mithril 2h sword', value: 1 },
        reward: { gold: 5000, xp: { attack: 1000 } },
        icon: '⚔️',
        tier: 'rare'
    },
    
    mithrilLumberjack: {
        id: 'mithrilLumberjack',
        name: 'Mithril Lumberjack',
        description: 'Equip a Mithril Axe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.mithril axe', value: 1 },
        reward: { gold: 4000, xp: { woodcutting: 800 } },
        icon: '🪓',
        tier: 'rare'
    },
    
    mithrilMiner: {
        id: 'mithrilMiner',
        name: 'Mithril Miner',
        description: 'Equip a Mithril Pickaxe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.mithril pickaxe', value: 1 },
        reward: { gold: 4000, xp: { mining: 800 } },
        icon: '⛏️',
        tier: 'rare'
    },
    
    mithrilProtector: {
        id: 'mithrilProtector',
        name: 'Mithril Protector',
        description: 'Equip a Mithril Chestplate',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.mithril chestplate', value: 1 },
        reward: { gold: 6000, xp: { attack: 1200 } },
        icon: '🛡️',
        tier: 'rare'
    },
    
    // === ADAMANT EQUIPMENT ACHIEVEMENTS ===
    adamantWarrior: {
        id: 'adamantWarrior',
        name: 'Adamant Warrior',
        description: 'Equip an Adamant 2H Sword',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.adamant 2h sword', value: 1 },
        reward: { gold: 10000, xp: { attack: 2000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    
    adamantLumberjack: {
        id: 'adamantLumberjack',
        name: 'Adamant Lumberjack',
        description: 'Equip an Adamant Axe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.adamant axe', value: 1 },
        reward: { gold: 8000, xp: { woodcutting: 1600 } },
        icon: '🪓',
        tier: 'epic'
    },
    
    adamantMiner: {
        id: 'adamantMiner',
        name: 'Adamant Miner',
        description: 'Equip an Adamant Pickaxe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.adamant pickaxe', value: 1 },
        reward: { gold: 8000, xp: { mining: 1600 } },
        icon: '⛏️',
        tier: 'epic'
    },
    
    adamantProtector: {
        id: 'adamantProtector',
        name: 'Adamant Protector',
        description: 'Equip an Adamant Chestplate',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.adamant chestplate', value: 1 },
        reward: { gold: 12000, xp: { attack: 2400 } },
        icon: '🛡️',
        tier: 'epic'
    },
    
    // === RUNE EQUIPMENT ACHIEVEMENTS ===
    runeWarrior: {
        id: 'runeWarrior',
        name: 'Rune Warrior',
        description: 'Equip a Rune 2H Sword',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.rune 2h sword', value: 1 },
        reward: { gold: 20000, xp: { attack: 4000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    
    runeLumberjack: {
        id: 'runeLumberjack',
        name: 'Rune Lumberjack',
        description: 'Equip a Rune Axe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.rune axe', value: 1 },
        reward: { gold: 16000, xp: { woodcutting: 3200 } },
        icon: '🪓',
        tier: 'epic'
    },
    
    runeMiner: {
        id: 'runeMiner',
        name: 'Rune Miner',
        description: 'Equip a Rune Pickaxe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.rune pickaxe', value: 1 },
        reward: { gold: 16000, xp: { mining: 3200 } },
        icon: '⛏️',
        tier: 'epic'
    },
    
    runeProtector: {
        id: 'runeProtector',
        name: 'Rune Protector',
        description: 'Equip a Rune Chestplate',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.rune chestplate', value: 1 },
        reward: { gold: 24000, xp: { attack: 4800 } },
        icon: '🛡️',
        tier: 'epic'
    },
    
    // === DRAGON EQUIPMENT ACHIEVEMENTS ===
    dragonWarrior: {
        id: 'dragonWarrior',
        name: 'Dragon Warrior',
        description: 'Equip a Dragon 2H Sword',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.dragon 2h sword', value: 1 },
        reward: { gold: 50000, xp: { attack: 10000 } },
        icon: '🐉',
        tier: 'legendary'
    },
    
    dragonLumberjack: {
        id: 'dragonLumberjack',
        name: 'Dragon Lumberjack',
        description: 'Equip a Dragon Axe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.dragon axe', value: 1 },
        reward: { gold: 40000, xp: { woodcutting: 8000 } },
        icon: '🐉',
        tier: 'legendary'
    },
    
    dragonMiner: {
        id: 'dragonMiner',
        name: 'Dragon Miner',
        description: 'Equip a Dragon Pickaxe',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.dragon pickaxe', value: 1 },
        reward: { gold: 40000, xp: { mining: 8000 } },
        icon: '🐉',
        tier: 'legendary'
    },
    
    dragonProtector: {
        id: 'dragonProtector',
        name: 'Dragon Protector',
        description: 'Equip a Dragon Chestplate',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.dragon chestplate', value: 1 },
        reward: { gold: 60000, xp: { attack: 12000 } },
        icon: '🐉',
        tier: 'legendary'
    },
    
    dragonHelmBearer: {
        id: 'dragonHelmBearer',
        name: 'Dragon Helm Bearer',
        description: 'Equip a Full Dragon Helmet',
        category: 'Equipment',
        requirement: { type: 'equipment.equipped.full dragon helmet', value: 1 },
        reward: { gold: 100000, xp: { attack: 20000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    weaponCollector: {
        id: 'weaponCollector',
        name: 'Weapon Collector',
        description: 'Obtain at least one of every weapon type',
        category: 'Collection',
        requirement: { type: 'collection.allWeapons', value: 1 },
        reward: { gold: 25000, xp: { attack: 5000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    
    armorCollector: {
        id: 'armorCollector',
        name: 'Armor Collector',
        description: 'Obtain at least one of every armor type',
        category: 'Collection',
        requirement: { type: 'collection.allArmor', value: 1 },
        reward: { gold: 30000, xp: { attack: 6000 } },
        icon: '🛡️',
        tier: 'epic'
    },
    
    helmetCollector: {
        id: 'helmetCollector',
        name: 'Helmet Collector',
        description: 'Obtain the Full Dragon Helmet',
        category: 'Collection',
        requirement: { type: 'collection.allHelmets', value: 1 },
        reward: { gold: 20000, xp: { attack: 4000 } },
        icon: '⛑️',
        tier: 'rare'
    },
    
    toolCollector: {
        id: 'toolCollector',
        name: 'Tool Collector',
        description: 'Obtain at least one of every tool type',
        category: 'Collection',
        requirement: { type: 'collection.allTools', value: 1 },
        reward: { gold: 15000, xp: { mining: 3000, woodcutting: 3000 } },
        icon: '🔨',
        tier: 'rare'
    },
    
    // Individual Armor Discoveries
    bronzeChestplateDiscovery: {
        id: 'bronzeChestplateDiscovery',
        name: 'Bronze Defender',
        description: 'Discover a Bronze Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.bronze chestplate', value: 1 },
        reward: { gold: 100 },
        icon: '🛡️',
        tier: 'common'
    },
    
    ironChestplateDiscovery: {
        id: 'ironChestplateDiscovery',
        name: 'Iron Guardian',
        description: 'Discover an Iron Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.iron chestplate', value: 1 },
        reward: { gold: 250 },
        icon: '🛡️',
        tier: 'common'
    },
    
    steelChestplateDiscovery: {
        id: 'steelChestplateDiscovery',
        name: 'Steel Protector',
        description: 'Discover a Steel Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.steel chestplate', value: 1 },
        reward: { gold: 500 },
        icon: '🛡️',
        tier: 'uncommon'
    },
    
    mithrilChestplateDiscovery: {
        id: 'mithrilChestplateDiscovery',
        name: 'Mithril Knight',
        description: 'Discover a Mithril Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.mithril chestplate', value: 1 },
        reward: { gold: 1000 },
        icon: '🛡️',
        tier: 'rare'
    },
    
    adamantChestplateDiscovery: {
        id: 'adamantChestplateDiscovery',
        name: 'Adamant Warrior',
        description: 'Discover an Adamant Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.adamant chestplate', value: 1 },
        reward: { gold: 2500 },
        icon: '🛡️',
        tier: 'rare'
    },
    
    runeChestplateDiscovery: {
        id: 'runeChestplateDiscovery',
        name: 'Rune Champion',
        description: 'Discover a Rune Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.rune chestplate', value: 1 },
        reward: { gold: 5000 },
        icon: '🛡️',
        tier: 'epic'
    },
    
    dragonChestplateDiscovery: {
        id: 'dragonChestplateDiscovery',
        name: 'Dragon Lord',
        description: 'Discover a Dragon Chestplate',
        category: 'Discovery',
        requirement: { type: 'item.obtained.dragon chestplate', value: 1 },
        reward: { gold: 10000 },
        icon: '🛡️🔥',
        tier: 'legendary'
    },
    
    // Individual Helmet Discovery
    fullDragonHelmetDiscovery: {
        id: 'fullDragonHelmetDiscovery',
        name: 'Crown Bearer',
        description: 'Discover a Full Dragon Helmet',
        category: 'Discovery',
        requirement: { type: 'item.obtained.full dragon helmet', value: 1 },
        reward: { gold: 15000 },
        icon: '👑',
        tier: 'legendary'
    },
    
    // Ring Discovery Achievements
    silverRingDiscovery: {
        id: 'silverRingDiscovery',
        name: 'Silver Signet',
        description: 'Discover a Silver Ring',
        category: 'Discovery',
        requirement: { type: 'item.obtained.silver ring', value: 1 },
        reward: { gold: 500 },
        icon: '💍',
        tier: 'uncommon'
    },
    
    goldRingDiscovery: {
        id: 'goldRingDiscovery',
        name: 'Golden Circle',
        description: 'Discover a Gold Ring',
        category: 'Discovery',
        requirement: { type: 'item.obtained.gold ring', value: 1 },
        reward: { gold: 1500 },
        icon: '💍🌟',
        tier: 'rare'
    },
    
    gearMaster: {
        id: 'gearMaster',
        name: 'Gear Master',
        description: 'Obtain at least one of every equipment in the game',
        category: 'Collection',
        requirement: { type: 'collection.allEquipment', value: 1 },
        reward: { gold: 100000, xp: { attack: 15000, mining: 5000, woodcutting: 5000 } },
        icon: '👑',
        tier: 'legendary'
    },
    
    runeGearCollector: {
        id: 'runeGearCollector',
        name: 'Rune Gear Collector',
        description: 'Obtain Rune 2H Sword and Rune Chestplate',
        category: 'Collection',
        requirement: { type: 'custom.runeGear', value: 1 },
        reward: { gold: 50000, xp: { attack: 5000 } },
        icon: '⚔️🛡️',
        tier: 'epic'
    },
    dragonGearCollector: {
        id: 'dragonGearCollector',
        name: 'Dragon Gear Collector',
        description: 'Obtain Dragon 2H Sword and Dragon Chestplate',
        category: 'Collection',
        requirement: { type: 'custom.dragonGear', value: 1 },
        reward: { gold: 100000, xp: { attack: 10000 } },
        icon: '⚔️🛡️',
        tier: 'legendary'
    },
    
    // === LEVEL MILESTONE ACHIEVEMENTS ===
    
    // Attack Level Milestones
    attackLevel10: {
        id: 'attackLevel10',
        name: 'Warrior Novice',
        description: 'Reach level 10 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 10 },
        reward: { gold: 1000, xp: { attack: 200 } },
        icon: '⚔️',
        tier: 'common'
    },
    attackLevel20: {
        id: 'attackLevel20',
        name: 'Warrior Apprentice', 
        description: 'Reach level 20 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 20 },
        reward: { gold: 2500, xp: { attack: 500 } },
        icon: '⚔️',
        tier: 'common'
    },
    attackLevel30: {
        id: 'attackLevel30',
        name: 'Warrior Journeyman',
        description: 'Reach level 30 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 30 },
        reward: { gold: 5000, xp: { attack: 1000 } },
        icon: '⚔️',
        tier: 'uncommon'
    },
    attackLevel40: {
        id: 'attackLevel40',
        name: 'Warrior Adept',
        description: 'Reach level 40 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 40 },
        reward: { gold: 10000, xp: { attack: 2000 } },
        icon: '⚔️',
        tier: 'uncommon'
    },
    attackLevel50: {
        id: 'attackLevel50',
        name: 'Warrior Expert',
        description: 'Reach level 50 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 50 },
        reward: { gold: 20000, xp: { attack: 4000 } },
        icon: '⚔️',
        tier: 'rare'
    },
    attackLevel60: {
        id: 'attackLevel60',
        name: 'Warrior Elite',
        description: 'Reach level 60 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 60 },
        reward: { gold: 35000, xp: { attack: 7000 } },
        icon: '⚔️',
        tier: 'rare'
    },
    attackLevel70: {
        id: 'attackLevel70',
        name: 'Warrior Master',
        description: 'Reach level 70 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 70 },
        reward: { gold: 60000, xp: { attack: 12000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    attackLevel80: {
        id: 'attackLevel80',
        name: 'Warrior Grandmaster',
        description: 'Reach level 80 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 80 },
        reward: { gold: 100000, xp: { attack: 20000 } },
        icon: '⚔️',
        tier: 'epic'
    },
    attackLevel90: {
        id: 'attackLevel90',
        name: 'Warrior Legendary',
        description: 'Reach level 90 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 90 },
        reward: { gold: 175000, xp: { attack: 35000 } },
        icon: '⚔️',
        tier: 'legendary'
    },
    attackLevel99: {
        id: 'attackLevel99',
        name: 'Warrior Perfection',
        description: 'Reach level 99 Attack',
        category: 'Level Milestones',
        requirement: { type: 'skills.attack.level', value: 99 },
        reward: { gold: 300000, xp: { attack: 60000 } },
        icon: '👑',
        tier: 'legendary'
    },

    // Mining Level Milestones
    miningLevel10: {
        id: 'miningLevel10',
        name: 'Miner Novice',
        description: 'Reach level 10 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 10 },
        reward: { gold: 1000, xp: { mining: 200 } },
        icon: '⛏️',
        tier: 'common'
    },
    miningLevel20: {
        id: 'miningLevel20',
        name: 'Miner Apprentice',
        description: 'Reach level 20 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 20 },
        reward: { gold: 2500, xp: { mining: 500 } },
        icon: '⛏️',
        tier: 'common'
    },
    miningLevel30: {
        id: 'miningLevel30',
        name: 'Miner Journeyman',
        description: 'Reach level 30 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 30 },
        reward: { gold: 5000, xp: { mining: 1000 } },
        icon: '⛏️',
        tier: 'uncommon'
    },
    miningLevel40: {
        id: 'miningLevel40',
        name: 'Miner Adept',
        description: 'Reach level 40 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 40 },
        reward: { gold: 10000, xp: { mining: 2000 } },
        icon: '⛏️',
        tier: 'uncommon'
    },
    miningLevel50: {
        id: 'miningLevel50',
        name: 'Miner Expert',
        description: 'Reach level 50 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 50 },
        reward: { gold: 20000, xp: { mining: 4000 } },
        icon: '⛏️',
        tier: 'rare'
    },
    miningLevel60: {
        id: 'miningLevel60',
        name: 'Miner Elite',
        description: 'Reach level 60 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 60 },
        reward: { gold: 35000, xp: { mining: 7000 } },
        icon: '⛏️',
        tier: 'rare'
    },
    miningLevel70: {
        id: 'miningLevel70',
        name: 'Miner Master',
        description: 'Reach level 70 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 70 },
        reward: { gold: 60000, xp: { mining: 12000 } },
        icon: '⛏️',
        tier: 'epic'
    },
    miningLevel80: {
        id: 'miningLevel80',
        name: 'Miner Grandmaster',
        description: 'Reach level 80 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 80 },
        reward: { gold: 100000, xp: { mining: 20000 } },
        icon: '⛏️',
        tier: 'epic'
    },
    miningLevel90: {
        id: 'miningLevel90',
        name: 'Miner Legendary',
        description: 'Reach level 90 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 90 },
        reward: { gold: 175000, xp: { mining: 35000 } },
        icon: '⛏️',
        tier: 'legendary'
    },
    miningLevel99: {
        id: 'miningLevel99',
        name: 'Miner Perfection',
        description: 'Reach level 99 Mining',
        category: 'Level Milestones',
        requirement: { type: 'skills.mining.level', value: 99 },
        reward: { gold: 300000, xp: { mining: 60000 } },
        icon: '👑',
        tier: 'legendary'
    },

    // Woodcutting Level Milestones
    woodcuttingLevel10: {
        id: 'woodcuttingLevel10',
        name: 'Lumberjack Novice',
        description: 'Reach level 10 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 10 },
        reward: { gold: 1000, xp: { woodcutting: 200 } },
        icon: '🌲',
        tier: 'common'
    },
    woodcuttingLevel20: {
        id: 'woodcuttingLevel20',
        name: 'Lumberjack Apprentice',
        description: 'Reach level 20 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 20 },
        reward: { gold: 2500, xp: { woodcutting: 500 } },
        icon: '🌲',
        tier: 'common'
    },
    woodcuttingLevel30: {
        id: 'woodcuttingLevel30',
        name: 'Lumberjack Journeyman',
        description: 'Reach level 30 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 30 },
        reward: { gold: 5000, xp: { woodcutting: 1000 } },
        icon: '🌲',
        tier: 'uncommon'
    },
    woodcuttingLevel40: {
        id: 'woodcuttingLevel40',
        name: 'Lumberjack Adept',
        description: 'Reach level 40 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 40 },
        reward: { gold: 10000, xp: { woodcutting: 2000 } },
        icon: '🌲',
        tier: 'uncommon'
    },
    woodcuttingLevel50: {
        id: 'woodcuttingLevel50',
        name: 'Lumberjack Expert',
        description: 'Reach level 50 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 50 },
        reward: { gold: 20000, xp: { woodcutting: 4000 } },
        icon: '🌲',
        tier: 'rare'
    },
    woodcuttingLevel60: {
        id: 'woodcuttingLevel60',
        name: 'Lumberjack Elite',
        description: 'Reach level 60 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 60 },
        reward: { gold: 35000, xp: { woodcutting: 7000 } },
        icon: '🌲',
        tier: 'rare'
    },
    woodcuttingLevel70: {
        id: 'woodcuttingLevel70',
        name: 'Lumberjack Master',
        description: 'Reach level 70 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 70 },
        reward: { gold: 60000, xp: { woodcutting: 12000 } },
        icon: '🌲',
        tier: 'epic'
    },
    woodcuttingLevel80: {
        id: 'woodcuttingLevel80',
        name: 'Lumberjack Grandmaster',
        description: 'Reach level 80 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 80 },
        reward: { gold: 100000, xp: { woodcutting: 20000 } },
        icon: '🌲',
        tier: 'epic'
    },
    woodcuttingLevel90: {
        id: 'woodcuttingLevel90',
        name: 'Lumberjack Legendary',
        description: 'Reach level 90 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 90 },
        reward: { gold: 175000, xp: { woodcutting: 35000 } },
        icon: '🌲',
        tier: 'legendary'
    },
    woodcuttingLevel99: {
        id: 'woodcuttingLevel99',
        name: 'Lumberjack Perfection',
        description: 'Reach level 99 Woodcutting',
        category: 'Level Milestones',
        requirement: { type: 'skills.woodcutting.level', value: 99 },
        reward: { gold: 300000, xp: { woodcutting: 60000 } },
        icon: '👑',
        tier: 'legendary'
    },

    // Blacksmithing Level Milestones
    blacksmithingLevel10: {
        id: 'blacksmithingLevel10',
        name: 'Smith Novice',
        description: 'Reach level 10 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 10 },
        reward: { gold: 1000, xp: { blacksmithing: 200 } },
        icon: '🛠️',
        tier: 'common'
    },
    blacksmithingLevel20: {
        id: 'blacksmithingLevel20',
        name: 'Smith Apprentice',
        description: 'Reach level 20 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 20 },
        reward: { gold: 2500, xp: { blacksmithing: 500 } },
        icon: '🛠️',
        tier: 'common'
    },
    blacksmithingLevel30: {
        id: 'blacksmithingLevel30',
        name: 'Smith Journeyman',
        description: 'Reach level 30 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 30 },
        reward: { gold: 5000, xp: { blacksmithing: 1000 } },
        icon: '🛠️',
        tier: 'uncommon'
    },
    blacksmithingLevel40: {
        id: 'blacksmithingLevel40',
        name: 'Smith Adept',
        description: 'Reach level 40 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 40 },
        reward: { gold: 10000, xp: { blacksmithing: 2000 } },
        icon: '🛠️',
        tier: 'uncommon'
    },
    blacksmithingLevel50: {
        id: 'blacksmithingLevel50',
        name: 'Smith Expert',
        description: 'Reach level 50 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 50 },
        reward: { gold: 20000, xp: { blacksmithing: 4000 } },
        icon: '🛠️',
        tier: 'rare'
    },
    blacksmithingLevel60: {
        id: 'blacksmithingLevel60',
        name: 'Smith Elite',
        description: 'Reach level 60 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 60 },
        reward: { gold: 35000, xp: { blacksmithing: 7000 } },
        icon: '🛠️',
        tier: 'rare'
    },
    blacksmithingLevel70: {
        id: 'blacksmithingLevel70',
        name: 'Smith Master',
        description: 'Reach level 70 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 70 },
        reward: { gold: 60000, xp: { blacksmithing: 12000 } },
        icon: '🛠️',
        tier: 'epic'
    },
    blacksmithingLevel80: {
        id: 'blacksmithingLevel80',
        name: 'Smith Grandmaster',
        description: 'Reach level 80 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 80 },
        reward: { gold: 100000, xp: { blacksmithing: 20000 } },
        icon: '🛠️',
        tier: 'epic'
    },
    blacksmithingLevel90: {
        id: 'blacksmithingLevel90',
        name: 'Smith Legendary',
        description: 'Reach level 90 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 90 },
        reward: { gold: 175000, xp: { blacksmithing: 35000 } },
        icon: '🛠️',
        tier: 'legendary'
    },
    blacksmithingLevel99: {
        id: 'blacksmithingLevel99',
        name: 'Smith Perfection',
        description: 'Reach level 99 Blacksmithing',
        category: 'Level Milestones',
        requirement: { type: 'skills.blacksmithing.level', value: 99 },
        reward: { gold: 300000, xp: { blacksmithing: 60000 } },
        icon: '👑',
        tier: 'legendary'
    },

    // Cooking Level Milestones
    cookingLevel10: {
        id: 'cookingLevel10',
        name: 'Chef Novice',
        description: 'Reach level 10 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 10 },
        reward: { gold: 1000, xp: { cooking: 200 } },
        icon: '🍳',
        tier: 'common'
    },
    cookingLevel20: {
        id: 'cookingLevel20',
        name: 'Chef Apprentice',
        description: 'Reach level 20 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 20 },
        reward: { gold: 2500, xp: { cooking: 500 } },
        icon: '🍳',
        tier: 'common'
    },
    cookingLevel30: {
        id: 'cookingLevel30',
        name: 'Chef Journeyman',
        description: 'Reach level 30 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 30 },
        reward: { gold: 5000, xp: { cooking: 1000 } },
        icon: '🍳',
        tier: 'uncommon'
    },
    cookingLevel40: {
        id: 'cookingLevel40',
        name: 'Chef Adept',
        description: 'Reach level 40 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 40 },
        reward: { gold: 10000, xp: { cooking: 2000 } },
        icon: '🍳',
        tier: 'uncommon'
    },
    cookingLevel50: {
        id: 'cookingLevel50',
        name: 'Chef Expert',
        description: 'Reach level 50 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 50 },
        reward: { gold: 20000, xp: { cooking: 4000 } },
        icon: '🍳',
        tier: 'rare'
    },
    cookingLevel60: {
        id: 'cookingLevel60',
        name: 'Chef Elite',
        description: 'Reach level 60 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 60 },
        reward: { gold: 35000, xp: { cooking: 7000 } },
        icon: '🍳',
        tier: 'rare'
    },
    cookingLevel70: {
        id: 'cookingLevel70',
        name: 'Chef Master',
        description: 'Reach level 70 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 70 },
        reward: { gold: 60000, xp: { cooking: 12000 } },
        icon: '🍳',
        tier: 'epic'
    },
    cookingLevel80: {
        id: 'cookingLevel80',
        name: 'Chef Grandmaster',
        description: 'Reach level 80 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 80 },
        reward: { gold: 100000, xp: { cooking: 20000 } },
        icon: '🍳',
        tier: 'epic'
    },
    cookingLevel90: {
        id: 'cookingLevel90',
        name: 'Chef Legendary',
        description: 'Reach level 90 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 90 },
        reward: { gold: 175000, xp: { cooking: 35000 } },
        icon: '🍳',
        tier: 'legendary'
    },
    cookingLevel99: {
        id: 'cookingLevel99',
        name: 'Chef Perfection',
        description: 'Reach level 99 Cooking',
        category: 'Level Milestones',
        requirement: { type: 'skills.cooking.level', value: 99 },
        reward: { gold: 300000, xp: { cooking: 60000 } },
        icon: '👑',
        tier: 'legendary'
    },

    // Farming Level Milestones
    farmingLevel10: {
        id: 'farmingLevel10',
        name: 'Farmer Novice',
        description: 'Reach level 10 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 10 },
        reward: { gold: 1000, xp: { farming: 200 } },
        icon: '🌾',
        tier: 'common'
    },
    farmingLevel20: {
        id: 'farmingLevel20',
        name: 'Farmer Apprentice',
        description: 'Reach level 20 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 20 },
        reward: { gold: 2500, xp: { farming: 500 } },
        icon: '🌾',
        tier: 'common'
    },
    farmingLevel30: {
        id: 'farmingLevel30',
        name: 'Farmer Journeyman',
        description: 'Reach level 30 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 30 },
        reward: { gold: 5000, xp: { farming: 1000 } },
        icon: '🌾',
        tier: 'uncommon'
    },
    farmingLevel40: {
        id: 'farmingLevel40',
        name: 'Farmer Adept',
        description: 'Reach level 40 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 40 },
        reward: { gold: 10000, xp: { farming: 2000 } },
        icon: '🌾',
        tier: 'uncommon'
    },
    farmingLevel50: {
        id: 'farmingLevel50',
        name: 'Farmer Expert',
        description: 'Reach level 50 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 50 },
        reward: { gold: 20000, xp: { farming: 4000 } },
        icon: '🌾',
        tier: 'rare'
    },
    farmingLevel60: {
        id: 'farmingLevel60',
        name: 'Farmer Elite',
        description: 'Reach level 60 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 60 },
        reward: { gold: 35000, xp: { farming: 7000 } },
        icon: '🌾',
        tier: 'rare'
    },
    farmingLevel70: {
        id: 'farmingLevel70',
        name: 'Farmer Master',
        description: 'Reach level 70 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 70 },
        reward: { gold: 60000, xp: { farming: 12000 } },
        icon: '🌾',
        tier: 'epic'
    },
    farmingLevel80: {
        id: 'farmingLevel80',
        name: 'Farmer Grandmaster',
        description: 'Reach level 80 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 80 },
        reward: { gold: 100000, xp: { farming: 20000 } },
        icon: '🌾',
        tier: 'epic'
    },
    farmingLevel90: {
        id: 'farmingLevel90',
        name: 'Farmer Legendary',
        description: 'Reach level 90 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 90 },
        reward: { gold: 175000, xp: { farming: 35000 } },
        icon: '🌾',
        tier: 'legendary'
    },
    farmingLevel99: {
        id: 'farmingLevel99',
        name: 'Farmer Perfection',
        description: 'Reach level 99 Farming',
        category: 'Level Milestones',
        requirement: { type: 'skills.farming.level', value: 99 },
        reward: { gold: 300000, xp: { farming: 60000 } },
        icon: '👑',
        tier: 'legendary'
    },

    // Enchanting Level Milestones
    enchantingLevel10: {
        id: 'enchantingLevel10',
        name: 'Enchanter Novice',
        description: 'Reach level 10 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 10 },
        reward: { gold: 1000, xp: { enchanting: 200 } },
        icon: '✨',
        tier: 'common'
    },
    enchantingLevel20: {
        id: 'enchantingLevel20',
        name: 'Enchanter Apprentice',
        description: 'Reach level 20 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 20 },
        reward: { gold: 2500, xp: { enchanting: 500 } },
        icon: '✨',
        tier: 'common'
    },
    enchantingLevel30: {
        id: 'enchantingLevel30',
        name: 'Enchanter Journeyman',
        description: 'Reach level 30 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 30 },
        reward: { gold: 5000, xp: { enchanting: 1000 } },
        icon: '✨',
        tier: 'uncommon'
    },
    enchantingLevel40: {
        id: 'enchantingLevel40',
        name: 'Enchanter Adept',
        description: 'Reach level 40 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 40 },
        reward: { gold: 10000, xp: { enchanting: 2000 } },
        icon: '✨',
        tier: 'uncommon'
    },
    enchantingLevel50: {
        id: 'enchantingLevel50',
        name: 'Enchanter Expert',
        description: 'Reach level 50 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 50 },
        reward: { gold: 20000, xp: { enchanting: 4000 } },
        icon: '✨',
        tier: 'rare'
    },
    enchantingLevel60: {
        id: 'enchantingLevel60',
        name: 'Enchanter Elite',
        description: 'Reach level 60 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 60 },
        reward: { gold: 35000, xp: { enchanting: 7000 } },
        icon: '✨',
        tier: 'rare'
    },
    enchantingLevel70: {
        id: 'enchantingLevel70',
        name: 'Enchanter Master',
        description: 'Reach level 70 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 70 },
        reward: { gold: 60000, xp: { enchanting: 12000 } },
        icon: '✨',
        tier: 'epic'
    },
    enchantingLevel80: {
        id: 'enchantingLevel80',
        name: 'Enchanter Grandmaster',
        description: 'Reach level 80 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 80 },
        reward: { gold: 100000, xp: { enchanting: 20000 } },
        icon: '✨',
        tier: 'epic'
    },
    enchantingLevel90: {
        id: 'enchantingLevel90',
        name: 'Enchanter Legendary',
        description: 'Reach level 90 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 90 },
        reward: { gold: 175000, xp: { enchanting: 35000 } },
        icon: '✨',
        tier: 'legendary'
    },
    enchantingLevel99: {
        id: 'enchantingLevel99',
        name: 'Enchanter Perfection',
        description: 'Reach level 99 Enchanting',
        category: 'Level Milestones',
        requirement: { type: 'skills.enchanting.level', value: 99 },
        reward: { gold: 300000, xp: { enchanting: 60000 } },
        icon: '👑',
        tier: 'legendary'
    }
};

// Check for achievement completion
function checkAchievements() {
    if (!playerData.achievements) {
        playerData.achievements = {
            completed: [],
            notified: [],
            claimed: []
        };
    } else if (!playerData.achievements.claimed) {
        playerData.achievements.claimed = [];
    }
    
    const stats = playerData.statistics;
    
    Object.values(ACHIEVEMENTS).forEach(achievement => {
        // Skip if already completed
        if (playerData.achievements.completed.includes(achievement.id)) {
            return;
        }
        
        // Custom achievements for Rune & Dragon Gear separately
        if (achievement.requirement.type === 'custom.runeGear') {
            const coll = stats.collection;
            if (coll.weaponsFound['rune 2h sword'] && coll.armorFound['rune chestplate']) {
                unlockAchievement(achievement);
            }
            return;
        }
        if (achievement.requirement.type === 'custom.dragonGear') {
            const coll = stats.collection;
            if (coll.weaponsFound['dragon 2h sword'] && coll.armorFound['dragon chestplate']) {
                unlockAchievement(achievement);
            }
            return;
        }
        
        // Check requirement
        const reqType = achievement.requirement.type;
        const reqValue = achievement.requirement.value;
        
        let currentValue = 0;
        const pathParts = reqType.split('.');
        
        // For economy achievements, use highestGoldAmount instead of totalGoldEarned
        if (reqType === 'economy.totalGoldEarned') {
            currentValue = stats.economy.highestGoldAmount || 0;
        } else if (reqType.startsWith('equipment.equipped.')) {
            // Handle equipment achievements
            const itemName = reqType.substring('equipment.equipped.'.length);
            currentValue = (stats.equipment && stats.equipment.equipped && stats.equipment.equipped[itemName]) ? 1 : 0;
        } else if (reqType.startsWith('item.obtained.')) {
            // Handle item discovery achievements
            const itemName = reqType.substring('item.obtained.'.length);
            currentValue = (stats.collection && stats.collection.itemsObtained && stats.collection.itemsObtained[itemName]) ? 1 : 0;
        } else if (reqType.startsWith('skills.')) {
            // Handle skill level achievements
            try {
                // Navigate through the playerData.skills object path
                let current = playerData.skills;
                const skillPathParts = pathParts.slice(1); // Remove 'skills' prefix
                for (const part of skillPathParts) {
                    current = current[part];
                    if (current === undefined) {
                        return; // Path doesn't exist
                    }
                }
                currentValue = current || 0;
            } catch (error) {
                return; // Error accessing path
            }
        } else {
            try {
                // Navigate through the nested object path
                let current = stats;
                for (const part of pathParts) {
                    current = current[part];
                    if (current === undefined) {
                        return; // Path doesn't exist
                    }
                }
                currentValue = current || 0;
            } catch (error) {
                return; // Error accessing path
            }
        }
        
        // Check if requirement is met
        if (currentValue >= reqValue) {
            unlockAchievement(achievement);
        }
    });
}

// Check for retroactive skill level achievements
// This ensures players who already have high levels get all lower milestone achievements
export function checkRetroactiveSkillAchievements() {
    if (!playerData.achievements) {
        playerData.achievements = {
            completed: [],
            notified: [],
            claimed: []
        };
    }
    
    const skills = ['attack', 'mining', 'woodcutting', 'blacksmithing', 'cooking', 'farming', 'enchanting'];
    const milestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
    
    skills.forEach(skill => {
        if (!playerData.skills[skill]) return;
        
        const currentLevel = playerData.skills[skill].level || 1;
        
        // Check all milestone achievements up to the player's current level
        milestones.forEach(milestone => {
            if (currentLevel >= milestone) {
                const achievementId = `${skill}_level_${milestone}`;
                
                // Only unlock if not already completed
                if (!playerData.achievements.completed.includes(achievementId)) {
                    const achievement = ACHIEVEMENTS[achievementId];
                    if (achievement) {
                        unlockAchievement(achievement);
                    }
                }
            }
        });
    });
}

// Expose function globally for use in other modules to avoid circular imports
if (typeof window !== 'undefined') {
    window.checkRetroactiveSkillAchievements = checkRetroactiveSkillAchievements;
}

// Unlock an achievement
function unlockAchievement(achievement) {
    // Mark as completed and notify
    playerData.achievements.completed.push(achievement.id);
    showAchievementNotification(achievement);
    logMessage(`🏆 Achievement Unlocked: ${achievement.icon} ${achievement.name}!`, 'fore-gold', '🏆');
    if (sounds && sounds.achievement) {
        const achievementSound = typeof sounds.achievement === 'function' ? sounds.achievement() : sounds.achievement;
        playSound(achievementSound);
    }
    savePlayerData();
    
    // Update notification badges after unlocking an achievement
    updateAchievementNotifications();
}

// Get achievement progress
export function getAchievementProgress(achievementId) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement || !playerData.statistics) {
        return { current: 0, required: 0, percentage: 0 };
    }
    
    const reqType = achievement.requirement.type;
    const reqValue = achievement.requirement.value;
    
    let currentValue = 0;
    const pathParts = reqType.split('.');
    
    // For economy achievements, use highestGoldAmount instead of totalGoldEarned
    if (reqType === 'economy.totalGoldEarned') {
        currentValue = playerData.statistics.economy.highestGoldAmount || 0;
    } else if (reqType.startsWith('equipment.equipped.')) {
        // Handle equipment achievements
        const itemName = reqType.substring('equipment.equipped.'.length);
        const stats = playerData.statistics;
        currentValue = (stats.equipment && stats.equipment.equipped && stats.equipment.equipped[itemName]) ? 1 : 0;
    } else if (reqType.startsWith('skills.')) {
        // Handle skill level achievements
        try {
            // Navigate through the playerData.skills object path
            let current = playerData.skills;
            const skillPathParts = pathParts.slice(1); // Remove 'skills' prefix
            for (const part of skillPathParts) {
                current = current[part];
                if (current === undefined) {
                    break;
                }
            }
            currentValue = current || 0;
        } catch (error) {
            currentValue = 0;
        }
    } else {
        try {
            // Navigate through the nested object path
            let current = playerData.statistics;
            for (const part of pathParts) {
                current = current[part];
                if (current === undefined) {
                    break;
                }
            }
            currentValue = current || 0;
        } catch (error) {
            currentValue = 0;
        }
    }
    
    return {
        current: currentValue,
        required: reqValue,
        percentage: Math.min(100, (currentValue / reqValue) * 100)
    };
}

// Show achievements menu
export function showAchievementsMenu() {
    // Update achievement unlocks before displaying
    checkAchievements();
    showSection('achievements-section');
    setupAchievementsEvents();
    updateAchievementsDisplay();
}

// Setup achievements navigation events
function setupAchievementsEvents() {
    const backButton = document.getElementById('achievements-back-button');
    const footerBackButton = document.getElementById('achievements-footer-back-btn');
    [backButton, footerBackButton].forEach(btn => {
        if (btn) btn.addEventListener('click', () => showSection('main-menu-section'));
    });
}

// Update achievements summary
function updateAchievementsSummary() {
    const summaryContainer = document.getElementById('achievements-summary');
    if (!summaryContainer) return;
    const totalAchievements = Object.keys(ACHIEVEMENTS).length;
    const completedAchievements = playerData.achievements?.completed.length || 0;
    const completionPercentage = Math.floor((completedAchievements / totalAchievements) * 100);
    const stats = playerData.statistics || {};
    const totalKills = stats.combat?.totalKills || 0;
    const totalItemsGathered = stats.gathering?.totalItemsGathered || 0;
    const totalGoldEarned = stats.economy?.totalGoldEarned || 0;
    summaryContainer.innerHTML = `
        <div class="achievement-stat">
            <span class="achievement-stat-value">${completedAchievements}/${totalAchievements}</span>
            <span class="achievement-stat-label">Achievements Unlocked</span>
        </div>
        <div class="achievement-stat">
            <span class="achievement-stat-value">${completionPercentage}%</span>
            <span class="achievement-stat-label">Completion</span>
        </div>
        <div class="achievement-stat">
            <span class="achievement-stat-value">${totalKills.toLocaleString()}</span>
            <span class="achievement-stat-label">Monster Kills</span>
        </div>
        <div class="achievement-stat">
            <span class="achievement-stat-value">${totalItemsGathered.toLocaleString()}</span>
            <span class="achievement-stat-label">Items Gathered</span>
        </div>
        <div class="achievement-stat">
            <span class="achievement-stat-value">${totalGoldEarned.toLocaleString()}</span>
            <span class="achievement-stat-label">Gold Earned</span>
        </div>
    `;
}

// Update achievements display
function updateAchievementsDisplay() {
    updateAchievementsSummary();
    const container = document.getElementById('achievements-list');
    if (!container) return;
    container.innerHTML = '';
    const categories = {};
    Object.values(ACHIEVEMENTS).forEach(achievement => {
        if (!categories[achievement.category]) categories[achievement.category] = [];
        categories[achievement.category].push(achievement);
    });
    Object.entries(categories).forEach(([categoryName, achievements]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'achievement-category';
        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = categoryName;
        categoryHeader.className = 'achievement-category-title';
        categoryDiv.appendChild(categoryHeader);
        const achievementGrid = document.createElement('div');
        achievementGrid.className = 'achievement-grid';
        achievements.forEach(achievement => {
            const isCompleted = playerData.achievements?.completed.includes(achievement.id);
            const isClaimed = playerData.achievements?.claimed.includes(achievement.id);
            const isClaimable = isCompleted && !isClaimed;
            const progress = getAchievementProgress(achievement.id);
            const achievementCard = document.createElement('div');
            achievementCard.setAttribute('data-achievement-id', achievement.id);
            achievementCard.className = `achievement-card ${achievement.tier} ${isCompleted ? 'completed' : ''} ${isClaimable ? 'claimable' : ''}`;
            achievementCard.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <div class="progress-text">${progress.current} / ${progress.required}</div>
                    </div>
                    ${isClaimed ? '<div class="achievement-completed">✓ CLAIMED</div>' : ''}
                </div>`;
            const contentDiv = achievementCard.querySelector('.achievement-content');
            if (isClaimable) {
                const btn = document.createElement('button');
                btn.className = 'achievement-claim-btn';
                btn.textContent = '✨ Claim Reward ✨';
                btn.addEventListener('click', () => claimAchievement(achievement.id));
                contentDiv.appendChild(btn);
            }
            achievementGrid.appendChild(achievementCard);
        });
        categoryDiv.appendChild(achievementGrid);
        container.appendChild(categoryDiv);
    });
}

// Initialize on load
export function initializeAchievements() {
    initializeStatistics();
    playerData.statistics.economy.highestGoldAmount = Math.max(
        playerData.statistics.economy.highestGoldAmount || 0,
        playerData.gold || 0
    );
    trackStatistic('progression', 'session', 1);
    setInterval(() => {
        trackStatistic('progression', 'playTime', 60);
    }, 60000);
}

// Check if there are any achievements that can be claimed
export function hasClaimableAchievements() {
    if (!playerData.achievements) return false;
    
    const completed = playerData.achievements.completed || [];
    const claimed = playerData.achievements.claimed || [];
    
    // Return true if there are completed achievements that haven't been claimed yet
    return completed.some(achievementId => !claimed.includes(achievementId));
}

// Update achievement notification badges
export function updateAchievementNotifications() {
    const hasClaimable = hasClaimableAchievements();
    
    // Update main menu achievements button
    const mainMenuButton = document.getElementById('achievements-menu-button');
    if (mainMenuButton) {
        // Remove existing badge
        const existingBadge = mainMenuButton.querySelector('.achievement-notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add badge if there are claimable achievements
        if (hasClaimable) {
            const badge = document.createElement('span');
            badge.className = 'achievement-notification-badge';
            badge.textContent = '!';
            mainMenuButton.appendChild(badge);
        }
    }
    
    // Update left panel achievements navigation item
    const leftPanelAchievementsNav = document.querySelector('.left-panel-nav-item[data-target-section="achievements-section"]');
    if (leftPanelAchievementsNav) {
        // Remove existing badge
        const existingBadge = leftPanelAchievementsNav.querySelector('.achievement-notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Add badge if there are claimable achievements
        if (hasClaimable) {
            const badge = document.createElement('span');
            badge.className = 'achievement-notification-badge';
            badge.textContent = '!';
            
            // Add to the header container
            const header = leftPanelAchievementsNav.querySelector('.left-panel-nav-item-header');
            if (header) {
                header.appendChild(badge);
            }
        }
    }
}

// Check if a specific achievement is completed
export function isAchievementCompleted(achievementId) {
    if (!playerData.achievements || !playerData.achievements.completed) {
        return false;
    }
    return playerData.achievements.completed.includes(achievementId);
}

// Global functions
window.showAchievementsMenu = showAchievementsMenu;

/** Claim an unlocked achievement's reward. Grants Assorted Gems and Ancient Tomes. */
function claimAchievement(achievementId) {
    if (!playerData.achievements.completed.includes(achievementId) || playerData.achievements.claimed.includes(achievementId)) return;
    const ach = ACHIEVEMENTS[achievementId];
    let gems = 0, tomes = 0;
    switch (ach.tier) {
        case 'common': gems = 20; break;
        case 'uncommon': gems = 40; break;
        case 'rare': gems = 100; tomes = 10; break;
        case 'epic': gems = 200; tomes = 50; break;
        case 'legendary': gems = 400; tomes = 100; break;
        default: gems = 20;
    }
    if (gems > 0) {
        playerData.inventory['assorted_gems'] = (playerData.inventory['assorted_gems'] || 0) + gems;
        logMessage(`Received ${gems} Assorted Gems for achievement: ${ach.name}`, 'fore-success', ach.icon);
    }
    if (tomes > 0) {
        playerData.inventory['ancient_tomes'] = (playerData.inventory['ancient_tomes'] || 0) + tomes;
        logMessage(`Received ${tomes} Ancient Tomes for achievement: ${ach.name}`, 'fore-success', ach.icon);
    }
    playerData.achievements.claimed.push(achievementId);
    savePlayerData();
    updateAchievementsDisplay();
    
    // Update notification badges after claiming an achievement
    updateAchievementNotifications();
}
window.claimAchievement = claimAchievement;