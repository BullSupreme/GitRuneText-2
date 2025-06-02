/**
 * data.js - Game data constants module for RuneText
 * Contains all game data constants exported for use in other modules.
 */

'use strict';

// Core game interval constants
export const BASE_GATHER_INTERVAL = 2200;
export const BASE_CRAFT_INTERVAL = 2200;
export const BASE_COMBAT_INTERVAL = 3000;

// Level/XP progression calculation
export const LEVEL_PROGRESSION = [0];
let _points = 0;
for (let _lvl_idx = 1; _lvl_idx < 99; _lvl_idx++) {
    _points += Math.floor(_lvl_idx * 1.5 + 300 * (2**(_lvl_idx / 6.5)));
    LEVEL_PROGRESSION.push(Math.floor(_points / 4));
}
// Scale XP requirements for higher levels
for (let lvl = 35; lvl < 50 && lvl < LEVEL_PROGRESSION.length; lvl++) {
    LEVEL_PROGRESSION[lvl] = Math.floor(LEVEL_PROGRESSION[lvl] * 1.25);
}
for (let lvl = 50; lvl < 65 && lvl < LEVEL_PROGRESSION.length; lvl++) {
    LEVEL_PROGRESSION[lvl] = Math.floor(LEVEL_PROGRESSION[lvl] * 1.30);
}
for (let lvl = 65; lvl < 80 && lvl < LEVEL_PROGRESSION.length; lvl++) {
    LEVEL_PROGRESSION[lvl] = Math.floor(LEVEL_PROGRESSION[lvl] * 1.40);
}
for (let lvl = 80; lvl < LEVEL_PROGRESSION.length; lvl++) {
    LEVEL_PROGRESSION[lvl] = Math.floor(LEVEL_PROGRESSION[lvl] * 1.50);
}

// Member Level Progression (2x player skill XP)
export const MEMBER_LEVEL_PROGRESSION = LEVEL_PROGRESSION.map(xp => xp * 2);


// Item Tiers and corresponding CSS classes
export const TIERS = {
    COMMON: 'tier-common',
    UNCOMMON: 'tier-uncommon',
    RARE: 'tier-rare',
    EPIC: 'tier-epic',
    LEGENDARY: 'tier-legendary'
};
// Perk Point Progression
export const MAX_PERK_POINTS = 20; // Example: Maximum 20 perk points earnable
export const PERK_POINT_XP_THRESHOLDS = [
    1000,    // 1st point
    2500,    // 2nd point
    5000,    // 3rd point
    10000,   // 4th point
    20000,   // 5th point
    35000,   // 6th point
    50000,   // 7th point
    75000,   // 8th point
    100000,  // 9th point
    150000,  // 10th point
    250000,  // 11th point
    400000,  // 12th point
    600000,  // 13th point
    850000,  // 14th point
    1200000, // 15th point
    1700000, // 16th point
    2500000, // 17th point
    3500000, // 18th point
    5000000, // 19th point
    7500000  // 20th point
];
// Tool data (axes, pickaxes)
export const TOOL_DATA = {
    "axe": {
        "fists":   {"emoji": "👊",    "price":0,     "level_req":1,  "min_dmg":1,  "max_dmg":1,  "skill_type":"attack",      "color":"fore-white", "attack_speed": 1.5,
            "yield_config": { "base": 0, "bonuses_by_tree": {"normal":[], "oak":[], "willow":[]} }
        },
        "bronze":  {"emoji": "🪓",    "price":15,    "level_req":1,  "min_dmg":1,  "max_dmg":2,  "skill_type":"woodcutting", "color":"fore-yellow", "tier": TIERS.COMMON, "attack_speed": 3.00,
            "yield_config": { "base": 1, "bonuses_by_tree": {
                "normal": [{ "chance": 0.20, "amount": 1 }],
                "oak":    [{ "chance": 0.05, "amount": 1 }]
            }}
        },
        "iron":    {"emoji": "🪓",    "price":50,    "level_req":15, "min_dmg":2,  "max_dmg":3,  "skill_type":"woodcutting", "color":"fore-lightblack_ex", "tier": TIERS.COMMON, "attack_speed": 3.00,
            "yield_config": { "base": 1, "bonuses_by_tree": {
                "normal": [{ "chance": 0.70, "amount": 1 }],
                "oak":    [{ "chance": 0.25, "amount": 1 }]
            }}
        },
        "steel":   {"emoji": "🪓",    "price":120,   "level_req":30, "min_dmg":3,  "max_dmg":5,  "skill_type":"woodcutting", "color":"fore-cyan", "tier": TIERS.UNCOMMON, "attack_speed": 3.00,
            "yield_config": { "base": 1, "bonuses_by_tree": {
                "normal": [{ "chance": 0.85, "amount": 1 }, { "chance": 0.35, "amount": 1 }],
                "oak":    [{ "chance": 0.80, "amount": 1 }, { "chance": 0.30, "amount": 1 }],
                "willow": [{ "chance": 0.75, "amount": 1 }, { "chance": 0.25, "amount": 1 }]
            }}
        },
        "mithril": {"emoji": "🪓",    "price":300,   "level_req":45, "min_dmg":5,  "max_dmg":8,  "skill_type":"woodcutting", "color":"fore-blue", "tier": TIERS.RARE, "attack_speed": 3.00,
            "yield_config": { "base": 2, "bonuses_by_tree": {
                "normal": [{ "chance": 0.80, "amount": 1 }],
                "oak":    [{ "chance": 0.70, "amount": 1 }],
                "willow": [{ "chance": 0.60, "amount": 1 }]
            }}, "aoe_chance": 0.05, "aoe_targets": 1, "aoe_damage_percentage": 0.20
        },
        "adamant": {"emoji": "🪓",    "price":750,   "level_req":60, "min_dmg":8,  "max_dmg":12, "skill_type":"woodcutting", "color":"fore-green", "tier": TIERS.RARE, "attack_speed": 3.00,
            "yield_config": { "base": 2, "bonuses_by_tree": {
                "normal": [{ "chance": 0.90, "amount": 1 }, { "chance": 0.50, "amount": 1 }],
                "oak":    [{ "chance": 0.85, "amount": 1 }, { "chance": 0.45, "amount": 1 }],
                "willow": [{ "chance": 0.80, "amount": 1 }, { "chance": 0.40, "amount": 1 }]
            }}, "aoe_chance": 0.10, "aoe_targets": 1, "aoe_damage_percentage": 0.25
        },
        "rune":    {"emoji": "🪓",    "price":2000,  "level_req":75, "min_dmg":12, "max_dmg":18, "skill_type":"woodcutting", "color":"fore-magenta", "tier": TIERS.EPIC, "attack_speed": 3.00,
            "yield_config": { "base": 2, "bonuses_by_tree": {
                "normal": [{ "chance": 0.95, "amount": 1 }, { "chance": 0.75, "amount": 1 }],
                "oak":    [{ "chance": 0.90, "amount": 1 }, { "chance": 0.70, "amount": 1 }],
                "willow": [{ "chance": 0.85, "amount": 1 }, { "chance": 0.65, "amount": 1 }]
            }}, "aoe_chance": 0.15, "aoe_targets": 2, "aoe_damage_percentage": 0.30
        },
        "dragon":  {"emoji": "🪓🔥",  "price":10000, "level_req":85, "min_dmg":18, "max_dmg":25, "skill_type":"woodcutting", "color":"fore-red", "tier": TIERS.LEGENDARY, "attack_speed": 3.00,
            "yield_config": { "base": 3, "bonuses_by_tree": {
                "normal": [{ "chance": 0.90, "amount": 1 }, { "chance": 0.60, "amount": 1 }],
                "oak":    [{ "chance": 0.85, "amount": 1 }, { "chance": 0.55, "amount": 1 }],
                "willow": [{ "chance": 0.80, "amount": 1 }, { "chance": 0.50, "amount": 1 }]
            }}, "aoe_chance": 0.20, "aoe_targets": 2, "aoe_damage_percentage": 0.35
        }
    },
    "pickaxe": {
        "bronze":  {"emoji": "⛏️",    "price":10,    "level_req":1,  "min_dmg":1,  "max_dmg":2,  "skill_type":"mining", "color":"fore-yellow", "tier": TIERS.COMMON, "attack_speed": 3.00, "yield_config": { "base": 1, "bonuses": [{ "chance": 0.15, "amount": 1 }] } },
        "iron":    {"emoji": "⛏️",    "price":40,    "level_req":15, "min_dmg":2,  "max_dmg":3,  "skill_type":"mining", "color":"fore-lightblack_ex", "tier": TIERS.COMMON, "attack_speed": 3.00, "yield_config": { "base": 1, "bonuses": [{ "chance": 0.60, "amount": 1 }] } },
        "steel":   {"emoji": "⛏️",    "price":100,   "level_req":30, "min_dmg":3,  "max_dmg":5,  "skill_type":"mining", "color":"fore-cyan", "tier": TIERS.UNCOMMON, "attack_speed": 3.00, "yield_config": { "base": 1, "bonuses": [{ "chance": 0.75, "amount": 1 }, { "chance": 0.25, "amount": 1 }] } },
        "mithril": {"emoji": "⛏️",    "price":280,   "level_req":45, "min_dmg":5,  "max_dmg":8,  "skill_type":"mining", "color":"fore-blue", "tier": TIERS.RARE, "attack_speed": 3.00, "yield_config": { "base": 2, "bonuses": [{ "chance": 0.50, "amount": 1 }] }, "aoe_chance": 0.05, "aoe_targets": 1, "aoe_damage_percentage": 0.20},
        "adamant": {"emoji": "⛏️",    "price":700,   "level_req":60, "min_dmg":8,  "max_dmg":12, "skill_type":"mining", "color":"fore-green", "tier": TIERS.RARE, "attack_speed": 3.00, "yield_config": { "base": 2, "bonuses": [{ "chance": 0.70, "amount": 1 }, { "chance": 0.35, "amount": 1 }] }, "aoe_chance": 0.10, "aoe_targets": 1, "aoe_damage_percentage": 0.25},
        "rune":    {"emoji": "⛏️",    "price":1900,  "level_req":75, "min_dmg":12, "max_dmg":18, "skill_type":"mining", "color":"fore-magenta", "tier": TIERS.EPIC, "attack_speed": 3.00, "yield_config": { "base": 2, "bonuses": [{ "chance": 0.85, "amount": 1 }, { "chance": 0.65, "amount": 1 }] }, "aoe_chance": 0.15, "aoe_targets": 2, "aoe_damage_percentage": 0.30},
        "dragon":  {"emoji": "⛏️🔥",  "price":9500,  "level_req":85, "min_dmg":18, "max_dmg":25, "skill_type":"mining", "color":"fore-red", "tier": TIERS.LEGENDARY, "attack_speed": 3.00, "yield_config": { "base": 3, "bonuses": [{ "chance": 0.75, "amount": 1 }, { "chance": 0.45, "amount": 1 }] }, "aoe_chance": 0.20, "aoe_targets": 2, "aoe_damage_percentage": 0.35}
    }
};

// Weapon data
export const SWORD_DATA = {
    "bronze 2h sword":   {"emoji": "🗡️",   "smith_level_req":1,  "wield_level_req":1,  "min_dmg":5,   "max_dmg":8,   "skill_type":"attack", "color":"fore-yellow",        "lifesteal_chance": 0.02, "lifesteal_amount": 1,     "recipe": {"bronze bar": 5}, "xp_gain": 15, "tier": TIERS.COMMON, "price": 25, "sell_price": 15, "attack_speed": 3.00},
    "iron 2h sword":     {"emoji": "🗡️",   "smith_level_req":15, "wield_level_req":15, "min_dmg":10,  "max_dmg":16,  "skill_type":"attack", "color":"fore-lightblack_ex", "lifesteal_chance": 0.03, "lifesteal_amount": [1,2], "recipe": {"iron bar": 5}, "xp_gain": 30, "tier": TIERS.COMMON, "price": 75, "sell_price": 45, "attack_speed": 3.00},
    "steel 2h sword":    {"emoji": "🗡️",   "smith_level_req":30, "wield_level_req":30, "min_dmg":18,  "max_dmg":28,  "skill_type":"attack", "color":"fore-cyan",          "lifesteal_chance": 0.04, "lifesteal_amount": [2,3], "recipe": {"steel bar": 5}, "xp_gain": 45, "aoe_chance": 0.10, "aoe_targets": 1, "aoe_damage_percentage": 0.30, "tier": TIERS.UNCOMMON, "price": 200, "sell_price": 120, "attack_speed": 3.00},
    "mithril 2h sword":  {"emoji": "🗡️",   "smith_level_req":45, "wield_level_req":45, "min_dmg":30,  "max_dmg":45,  "skill_type":"attack", "color":"fore-blue",          "lifesteal_chance": 0.05, "lifesteal_amount": [2,4], "recipe": {"mithril bar": 5}, "xp_gain": 60, "aoe_chance": 0.15, "aoe_targets": 2, "aoe_damage_percentage": 0.35, "tier": TIERS.RARE, "price": 500, "sell_price": 300, "attack_speed": 3.00},
    "adamant 2h sword":  {"emoji": "🗡️",   "smith_level_req":60, "wield_level_req":60, "min_dmg":48,  "max_dmg":70,  "skill_type":"attack", "color":"fore-green",         "lifesteal_chance": 0.06, "lifesteal_amount": [3,5], "recipe": {"adamantite bar": 5}, "xp_gain": 80, "aoe_chance": 0.20, "aoe_targets": 2, "aoe_damage_percentage": 0.40, "tier": TIERS.RARE, "price": 1200, "sell_price": 720, "attack_speed": 3.00},
    "rune 2h sword":     {"emoji": "🗡️",   "smith_level_req":75, "wield_level_req":75, "min_dmg":72,  "max_dmg":100, "skill_type":"attack", "color":"fore-magenta",       "lifesteal_chance": 0.07, "lifesteal_amount": [4,6], "recipe": {"runite bar": 5}, "xp_gain": 100, "aoe_chance": 0.25, "aoe_targets": 3, "aoe_damage_percentage": 0.45, "tier": TIERS.EPIC, crit_chance: 0.05, "price": 3000, "sell_price": 1800, "attack_speed": 3.00},
    "dragon 2h sword":   {"emoji": "🗡️🔥", "smith_level_req":85, "wield_level_req":85, "min_dmg":100, "max_dmg":140, "skill_type":"attack", "color":"fore-red",           "lifesteal_chance": 0.08, "lifesteal_amount": [5,8], "recipe": {"dragon bar": 5, "dragon scale": 2}, "xp_gain": 150, "aoe_chance": 0.30, "aoe_targets": 3, "aoe_damage_percentage": 0.50, "tier": TIERS.LEGENDARY, crit_chance: 0.10, "price": 15000, "sell_price": 9000, "attack_speed": 3.00},
};

// Food/healing items data
export const FOOD_DATA = {
    "cooked meat":       {"heal_amount": 5,  "sell_price": 2, "emoji": "🍖", "tier": TIERS.COMMON, "category": "food", "noShop": true }, 
    "bread":             {"heal_amount": 3,  "sell_price": 5, "emoji": "🍞", "tier": TIERS.COMMON, "category": "food", "damage_boost": {"min": 2, "max": 4, "duration_ms": 1800000}, "description": "Freshly baked bread. Grants +2-4 damage for 30 minutes.", "noShop": true },
    "health potion (s)": {"heal_amount": 15, "sell_price": 50, "emoji": "🧪", "tier": TIERS.COMMON, "category": "potion"},
    "health potion (m)": {"heal_amount": 30, "sell_price": 150, "emoji": "🧪", "tier": TIERS.UNCOMMON, "category": "potion"},
    "health potion (l)": {"heal_amount": 50, "sell_price": 300, "emoji": "🧪", "tier": TIERS.RARE, "category": "potion"},
    "health potion (xl)": {"heal_amount": 100, "sell_price": 600, "emoji": "🧪", "tier": TIERS.EPIC, "category": "potion"},
    "shrimp":     {"heal_amount": 2,  "sell_price": 5, "emoji": "🍤", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "fish":       {"heal_amount": 4,  "sell_price": 8, "emoji": "🐟", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "scrambled eggs": {"heal_amount": 6,  "sell_price": 10, "emoji": "🍳", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "trout":      {"heal_amount": 7,  "sell_price": 12, "emoji": "🐟", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "salmon":     {"heal_amount": 10, "sell_price": 18, "emoji": "🐟", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "lobster":    {"heal_amount": 12, "sell_price": 25, "emoji": "🦞", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "swordfish":  {"heal_amount": 14, "sell_price": 30, "emoji": "🐟", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "shark":      {"heal_amount": 20, "sell_price": 45, "emoji": "🦈", "tier": TIERS.RARE, "category": "food", "noShop": true },
    "apple":             {"heal_amount": 1,  "sell_price": 1, "emoji": "🍎", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "banana":            {"heal_amount": 2,  "sell_price": 1, "emoji": "🍌", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "cakeSlice":         {"heal_amount": 25, "sell_price": 20, "emoji": "🍰", "tier": TIERS.UNCOMMON, "category": "food", "noShop": true },
    "porkStew":          {"heal_amount": 30, "sell_price": 25, "emoji": "🍲", "tier": TIERS.UNCOMMON, "category": "food", "noShop": true },
    "applePieSlice":     {"heal_amount": 20, "sell_price": 15, "emoji": "🥧", "tier": TIERS.UNCOMMON, "category": "food", "noShop": true },
    "cheese":            {"heal_amount": 15, "sell_price": 8, "emoji": "🧀", "tier": TIERS.COMMON, "category": "food", "noShop": true },
    "grilled cheese":    {"heal_amount": 20, "sell_price": 15, "emoji": "🥪", "tier": TIERS.UNCOMMON, "category": "food", "damage_boost": {"min": 5, "max": 8, "duration_ms": 1800000}, "description": "A warm grilled cheese sandwich. Grants +5-8 damage for 30 minutes.", "noShop": true },
    "vegetable soup":    {"heal_amount": 10, "sell_price": 6, "emoji": "🍲", "tier": TIERS.COMMON, "category": "food", "noShop": true }
};

// Cookable items data
export const COOKABLE_ITEMS = {
    "raw meat": {"cooked_item":"cooked meat", "burnt_item":"burnt meat", "xp_gain":10, "level_req":1, "difficulty_level":1, "emoji": "🥩", "tier": TIERS.COMMON},
    "raw shrimp": {"cooked_item":"shrimp", "burnt_item":"burnt shrimp", "xp_gain":30, "level_req":1, "difficulty_level":1, "emoji": "🦐", "tier": TIERS.COMMON},
    "raw fish": {"cooked_item":"fish", "burnt_item":"burnt fish", "xp_gain":50, "level_req":5, "difficulty_level":1.2, "emoji": "🐟", "tier": TIERS.COMMON},
    "egg_herbs_for_scrambled": {
        "cooked_item": "scrambled eggs",
        "burnt_item": "burnt eggs",
        "xp_gain": 40,
        "level_req": 5,
        "difficulty_level": 1.0,
        "emoji": "🍳",
        "recipe": { "egg": 2, "herbs": 1 },
        "yield": 1,
        "tier": TIERS.COMMON
    },
    "raw trout": {"cooked_item":"trout", "burnt_item":"burnt trout", "xp_gain":70, "level_req":20, "difficulty_level":1.8, "emoji": "🐟", "tier": TIERS.COMMON},
    "raw salmon": {"cooked_item":"salmon", "burnt_item":"burnt salmon", "xp_gain":90, "level_req":30, "difficulty_level":2.2, "emoji": "🐟", "tier": TIERS.COMMON},
    "raw lobster": {"cooked_item":"lobster", "burnt_item":"burnt lobster", "xp_gain":120, "level_req":40, "difficulty_level":2.5, "emoji": "🦞", "tier": TIERS.COMMON},
    "raw swordfish": {"cooked_item":"swordfish", "burnt_item":"burnt swordfish", "xp_gain":140, "level_req":50, "difficulty_level":2.8, "emoji": "🐟", "tier": TIERS.RARE},
    "raw shark": {"cooked_item":"shark", "burnt_item":"burnt shark", "xp_gain":210, "level_req":65, "difficulty_level":3.2, "emoji": "🦈", "tier": TIERS.RARE},
    
    // New recipes using farm products
    "wheat": {
        "cooked_item": "flour",
        "burnt_item": "burnt flour",
        "xp_gain": 5,
        "level_req": 20,
        "difficulty_level": 0.5,
        "emoji": "🌾",
        "is_processing": true,
        "tier": TIERS.COMMON
    },
    "flour_egg_milk_for_cake": {
        "cooked_item": "cakeSlice",
        "burnt_item": "burnt cake",
        "xp_gain": 75,
        "level_req": 25,
        "difficulty_level": 2.0,
        "emoji": "🎂",
        "recipe": { "flour": 2, "egg": 3, "milk": 1 },
        "yield": 1,
        "tier": TIERS.UNCOMMON
    },
    "pork_carrots_for_stew": {
        "cooked_item": "porkStew",
        "burnt_item": "burnt stew",
        "xp_gain": 80,
        "level_req": 30,
        "difficulty_level": 2.2,
        "emoji": "🍲",
        "recipe": { "raw pork": 2, "carrots": 3, "water": 1 },
        "yield": 1,
        "tier": TIERS.UNCOMMON
    },
    "apple_flour_for_pie": {
        "cooked_item": "applePieSlice",
        "burnt_item": "burnt pie",
        "xp_gain": 60,
        "level_req": 20,
        "difficulty_level": 1.8,
        "emoji": "🥧",
        "recipe": { "apple": 3, "flour": 1, "egg": 1 },
        "yield": 1,
        "tier": TIERS.UNCOMMON
    },
    "goblin_beads_elixir": {
        "cooked_item": "elixir of luck",
        "burnt_item": "burnt elixir",
        "xp_gain": 40,
        "level_req": 10,
        "difficulty_level": 1.2,
        "emoji": "🍀",
        "recipe": { "goblin beads": 2, "herbs": 3, "water": 1 },
        "yield": 1,
        "tier": TIERS.UNCOMMON
    },
    "troll_hide_potion": {
        "cooked_item": "potion of fortitude",
        "burnt_item": "burnt potion",
        "xp_gain": 60,
        "level_req": 25,
        "difficulty_level": 2.0,
        "emoji": "🧪🦴",
        "recipe": { "troll hide": 1, "herbs": 5, "water": 2 },
        "yield": 1,
        "tier": TIERS.RARE
    },
    "ogre_club_fragment_brew": {
        "cooked_item": "brew of might",
        "burnt_item": "burnt brew",
        "xp_gain": 80,
        "level_req": 35,
        "difficulty_level": 2.5,
        "emoji": "🍺💪",
        "recipe": { "ogre club fragment": 1, "herbs": 8, "water": 2 },
        "yield": 1,
        "tier": TIERS.RARE
    },
    "flour_water_for_bread": {
        "cooked_item": "bread",
        "burnt_item": "burnt bread",
        "xp_gain": 20,
        "level_req": 10,
        "difficulty_level": 1.5,
        "emoji": "🍞",
        "recipe": { "flour": 1, "water": 1 },
        "yield": 1,
        "tier": TIERS.COMMON
    },
    "milk_for_cheese": {
        "cooked_item": "cheese",
        "burnt_item": "burnt cheese",
        "xp_gain": 30,
        "level_req": 15,
        "difficulty_level": 1.8,
        "emoji": "🧀",
        "recipe": { "milk": 3 },
        "yield": 1,
        "tier": TIERS.COMMON
    },
    "bread_cheese_for_grilled": {
        "cooked_item": "grilled cheese",
        "burnt_item": "burnt sandwich",
        "xp_gain": 50,
        "level_req": 25,
        "difficulty_level": 2.0,
        "emoji": "🥪",
        "recipe": { "bread": 1, "cheese": 1 },
        "yield": 1,
        "tier": TIERS.UNCOMMON
    },
    "water_carrots_for_soup": {
        "cooked_item": "vegetable soup",
        "burnt_item": "burnt soup",
        "xp_gain": 40,
        "level_req": 20,
        "difficulty_level": 1.8,
        "emoji": "🍲",
        "recipe": { "water": 1, "carrots": 2, "potato": 1 },
        "yield": 1,
        "tier": TIERS.COMMON
    }
};

// Armor data
export const ARMOR_DATA = {
    "bronze chestplate":  {"defense":0.03, "price":40,    "sell_price":24,  "level_req":5,  "color":"fore-yellow",        "emoji":"🛡️", "smith_level_req": 5, "recipe": {"bronze bar": 8}, "xp_gain": 20, "block_chance": 0.02, "block_amount": 1, "tier": TIERS.COMMON},
    "iron chestplate":    {"defense":0.06, "price":100,   "sell_price":60,  "level_req":15, "color":"fore-lightblack_ex", "emoji":"🛡️", "smith_level_req":20, "recipe": {"iron bar": 8}, "xp_gain": 40, "block_chance": 0.03, "block_amount": 2, "tier": TIERS.COMMON},
    "steel chestplate":   {"defense":0.09, "price":250,   "sell_price":150, "level_req":30, "color":"fore-cyan",          "emoji":"🛡️", "smith_level_req":35, "recipe": {"steel bar": 8}, "xp_gain": 60, "block_chance": 0.04, "block_amount": 3, "tier": TIERS.UNCOMMON},
    "mithril chestplate": {"defense":0.12, "price":600,   "sell_price":360, "level_req":45, "color":"fore-blue",          "emoji":"🛡️", "smith_level_req":50, "recipe": {"mithril bar": 8}, "xp_gain": 80, "block_chance": 0.05, "block_amount": 4, "tier": TIERS.RARE},
    "adamant chestplate": {"defense":0.15, "price":1500,  "sell_price":900, "level_req":60, "color":"fore-green",         "emoji":"🛡️", "smith_level_req":65, "recipe": {"adamantite bar": 8}, "xp_gain": 100, "block_chance": 0.06, "block_amount": 5, "tier": TIERS.RARE},
    "rune chestplate":    {"defense":0.18, "price":5000,  "sell_price":3000, "level_req":75, "color":"fore-magenta",       "emoji":"🛡️", "smith_level_req":80, "recipe": {"runite bar": 8}, "xp_gain": 125, "block_chance": 0.07, "block_amount": 6, "tier": TIERS.EPIC},
    "dragon chestplate":  {"defense":0.22, "price":20000, "sell_price":12000, "level_req":85, "color":"fore-red",           "emoji":"🛡️🔥","smith_level_req":85, "recipe": {"dragon bar": 8}, "xp_gain": 200, "block_chance": 0.08, "block_amount": 8, "tier": TIERS.LEGENDARY}
};

// Helmet data
export const HELMET_DATA = {
    "full dragon helmet": {"defense":0.10, "price": 50000, "sell_price": 30000, "level_req": 85, "color":"fore-red", "emoji":"👑", "slotType": "helmet", "smith_level_req":85, "recipe": {"dragon bar": 3, "dragon gem": 1}, "xp_gain": 500, "block_chance": 0.06, "block_amount": 6, "tier": TIERS.LEGENDARY}
};

// Bar data (crafting materials)
export const BAR_DATA = {
    "bronze bar":     {"emoji": "<span class='fore-yellow'>🟧</span>",   "level_req": 1,  "xp_gain": 10,  "color": "fore-yellow",        "recipe": {"copper ore": 1, "tin ore": 1}, "tier": TIERS.COMMON},
    "iron bar":       {"emoji": "<span class='fore-white'>🔳</span>",   "level_req": 15, "xp_gain": 20,  "color": "fore-lightblack_ex", "recipe": {"iron ore": 1}, "tier": TIERS.COMMON},
    "steel bar":      {"emoji": "<span class='fore-lightblack_ex'>⬜</span>",   "level_req": 30, "xp_gain": 30,  "color": "fore-cyan",          "recipe": {"iron ore": 1, "coal": 2}, "tier": TIERS.UNCOMMON},
    "mithril bar":    {"emoji": "<span class='fore-blue'>🟦</span>",   "level_req": 45, "xp_gain": 50,  "color": "fore-blue",          "recipe": {"mithril ore": 1, "coal": 4}, "tier": TIERS.RARE},
    "adamantite bar": {"emoji": "<span class='fore-green'>🟩</span>",   "level_req": 60, "xp_gain": 70,  "color": "fore-green",         "recipe": {"adamantite ore": 1, "coal": 6}, "tier": TIERS.RARE},
    "runite bar":     {"emoji": "<span class='fore-magenta'>🟪</span>",   "level_req": 75, "xp_gain": 100, "color": "fore-magenta",       "recipe": {"runite ore": 1, "coal": 8}, "tier": TIERS.EPIC},
    "dragon bar":     {"emoji": "<span class='fore-red'>🟥</span>🔥",   "level_req": 85, "xp_gain": 150, "color": "fore-red",           "recipe": {"special dragon ore": 1, "coal": 10}, "tier": TIERS.LEGENDARY}
};

// Ore data (mining resources)
export const ORE_DATA = {
    "copper":    {"level_req": 1,  "xp": 15,  "item_name": "copper ore",     "color": "fore-orange", "emoji": "<span class='fore-orange'>🟠</span>", "tier": TIERS.COMMON},
    "tin":       {"level_req": 1,  "xp": 15,  "item_name": "tin ore",        "color": "fore-lightblack_ex", "emoji": "<span class='fore-lightblack_ex'>🪨</span>", "tier": TIERS.COMMON},
    "iron":      {"level_req": 15, "xp": 35,  "item_name": "iron ore",       "color": "fore-white",  "emoji": "<span class='fore-white'>⚪</span>", "tier": TIERS.COMMON},
    "coal":      {"level_req": 30, "xp": 40,  "item_name": "coal",           "color": "fore-lightblack_ex", "emoji": "<span class='fore-lightblack_ex'>⚫</span>", "required_pickaxe_tier": "steel", "tier": TIERS.UNCOMMON},
    "mithril":   {"level_req": 45, "xp": 80,  "item_name": "mithril ore",    "color": "fore-blue",   "emoji": "<span class='fore-blue'>🔵</span>", "required_pickaxe_tier": "mithril", "tier": TIERS.RARE},
    "adamantite":{"level_req": 60, "xp": 120, "item_name": "adamantite ore", "color": "fore-green",  "emoji": "<span class='fore-green'>🟢</span>", "required_pickaxe_tier": "adamant", "tier": TIERS.RARE},
    "runite":    {"level_req": 75, "xp": 200, "item_name": "runite ore",     "color": "fore-magenta","emoji": "<span class='fore-magenta'>🟣</span>", "required_pickaxe_tier": "rune", "tier": TIERS.EPIC},
    "special dragon ore": {"level_req": 85, "xp":300,"item_name":"special dragon ore","color":"fore-red","emoji":"<span class='fore-red'>🔴</span>🔥", "required_pickaxe_tier": "dragon", "tier": TIERS.LEGENDARY},
    "gem_vein": {"level_req": 10, "xp": 25, "item_name": "gems", "color": "fore-cyan", "emoji": "💠", "tier": TIERS.UNCOMMON},
    "sapphire_deposit": {"level_req": 35, "xp": 60, "item_name": "sapphire", "color": "fore-blue", "emoji": "🔷", "required_pickaxe_tier": "steel", "tier": TIERS.RARE},
    "emerald_deposit": {"level_req": 50, "xp": 80, "item_name": "emerald", "color": "fore-green", "emoji": "💚", "required_pickaxe_tier": "mithril", "tier": TIERS.RARE},
    "ruby_deposit": {"level_req": 40, "xp": 70, "item_name": "ruby", "color": "fore-red", "emoji": "🔴", "required_pickaxe_tier": "steel", "tier": TIERS.RARE},
    "diamond_deposit": {"level_req": 70, "xp": 150, "item_name": "diamond", "color": "fore-white", "emoji": "💎", "required_pickaxe_tier": "adamant", "tier": TIERS.EPIC},
    "dragon_gem_vein": {"level_req": 90, "xp": 400, "item_name": "dragon gem", "color": "fore-red", "emoji": "💎🔥", "required_pickaxe_tier": "dragon", "tier": TIERS.LEGENDARY}
};

// Tree data (woodcutting resources)
export const TREE_DATA = {
    "normal": {"exp":10, "log":"normal logs", "level":1,  "emoji": "🌲", "min_tier": "bronze"},
    "oak":    {"exp":25, "log":"oak logs",    "level":15, "emoji": "🌳", "min_tier": "iron"},
    "willow": {"exp":60, "log":"willow logs", "level":30, "emoji": "🌴", "min_tier": "steel"},
    "maple":  {"exp":100, "log":"maple logs", "level":45, "emoji": "🌲", "min_tier": "mithril"},
    "yew":    {"exp":175, "log":"yew logs",   "level":60, "emoji": "🌲", "min_tier": "adamant"},
    "magic":  {"exp":250, "log":"magic logs", "level":75, "emoji": "✨🌲", "min_tier": "rune"},
    "divine": {"exp":400, "log":"divine logs", "level":85, "emoji": "🪄🌲", "min_tier": "dragon"}
};

// Tool tier order
export const PICKAXE_TIER_ORDER = ["bronze", "iron", "steel", "mithril", "adamant", "rune", "dragon"];
export const AXE_TIER_ORDER = ["fists", "bronze", "iron", "steel", "mithril", "adamant", "rune", "dragon"];

// Structure data (buildings)
export const STRUCTURE_DATA = { 
    "camp": {
        name: "Camp", emoji: "⛺️",
        cost: { "normal logs": 100 },
        perk_desc: "+5% chance for an extra base log/ore from Woodcutting/Mining.",
        perk_effect: { type: "base_gather_yield_bonus", value: 0.05 },
        requires_structure: null, 
        rent_value: 0,
        "tier": TIERS.COMMON 
    },
    "well": {
        name: "Well", emoji: "⛲",
        cost: { "normal logs": 200, "bronze bar": 50 },
        perk_desc: "Allows collecting water for cooking recipes. Provides 1 water every 30 seconds.",
        perk_effect: { type: "water_source", value: 1 },
        requires_structure: "camp",
        rent_value: 0,
        "tier": TIERS.COMMON
    },
    "shed": {
        name: "Shed", emoji: "🛖",
        cost: { "normal logs": 500, "oak logs": 100 },
        perk_desc: "All crafting actions (Cooking, Smelting, Smithing) are 10% faster.",
        perk_effect: { type: "crafting_speed_boost", value: 0.10 },
        requires_structure: "camp",
        rent_value: 1,
        "tier": TIERS.COMMON 
    },
    "cabin": {
        name: "Cabin", emoji: "🏡",
        cost: { "oak logs": 1000, "willow logs": 200, "bronze bar": 50 },
        perk_desc: "Increases Max HP by +10.",
        perk_effect: { type: "max_hp_bonus", value: 10 },
        requires_structure: "shed",
        rent_value: 5,
        "tier": TIERS.UNCOMMON 
    },
    "house": {
        name: "House", emoji: "🏠",
        cost: { "willow logs": 2500, "iron bar": 300, "bronze bar": 100 },
        perk_desc: "Increases all Skill XP gain by +2%. Also grants a 5% chance for non-chicken monsters to drop bonus gold equal to 10% of their base gold drop (stacks with Mansion).",
        perks: [ 
            { type: "global_xp_boost", value: 0.02 },
            { type: "scaled_bonus_mob_gold_drop_chance", value: 0.05, bonus_gold_percentage_of_base: 0.10 }
        ],
        requires_structure: "cabin",
        rent_value: 15,
        "tier": TIERS.UNCOMMON 
    },
    "farmLand": {
        name: "Farm Land", emoji: "🏞️",
        cost: { "gold": 25000, "willow logs": 500, "maple logs": 200, "iron bar": 100 },
        perk_desc: "Acquires a fertile plot of land. Unlocks access to farming activities and the Farm Menu.",
        perk_effect: { type: "unlock_feature", feature: "farming" },
        requires_structure: "house",
        rent_value: 0,
        tier: TIERS.RARE
    },
    "lumberMill": {
        name: "Lumber Mill",
        emoji: "🏭",
        cost: { "willow logs": 1000, "maple logs": 500, "steel bar": 100, "oak logs": 2000, "gold": 100000 },
        perk_desc: "Allows continuous woodcutting even when your Woodcutting skill levels up. Also enables the House to generate +5 gold every 5 minutes.",
        requires_structure: "house",
        rent_value: 5,
        "tier": TIERS.RARE 
    },
    "mansion": {
        name: "Mansion", emoji: "🏯",
        cost: { "willow logs": 3000, "maple logs": 1000, "yew logs": 500, "steel bar": 200, "coal": 100 },
        perk_desc: "Grants a 10% chance for monster kills to drop double their normal gold amount.",
        perks: [
            { type: "monster_gold_drop_multiplier_chance", value: 0.10, multiplier: 2 }
        ],
        requires_structure: "house",
        rent_value: 40,
        "tier": TIERS.RARE 
    },
    "castle": {
        name: "Castle", emoji: "🏰",
        cost: { "willow logs": 5000, "maple logs": 2000, "yew logs": 1000, "magic logs": 300, "mithril bar": 300, "adamantite bar": 100 },
        perk_desc: "Shop purchase prices -5%, item sell prices +5%.",
        perk_effect: { type: "shop_price_modifier", buy_mod: -0.05, sell_mod: 0.05 },
        requires_structure: "mansion",
        rent_value: 100,
        "tier": TIERS.EPIC 
    },
    "stronghold": {
        name: "The Stronghold", emoji: "🧱🏰🛡️",
        cost: {
            "willow logs": 10000, "maple logs": 5000, "yew logs": 3000, "magic logs": 1000, "divine logs": 200,
            "oak logs": 5000, "normal logs": 2500,
            "bronze bar": 500, "iron bar": 400, "steel bar": 300, "mithril bar": 250,
            "adamantite bar": 200, "runite bar": 150, "dragon bar": 100,
            "dragon gem": 5, "demon heart": 10 
        },
        perk_desc: "A bastion of ultimate power. Grants +10% to all damage dealt, +25 Max HP, heals 5% of Max HP on monster kill, and all skill actions are 10% faster.",
        perks: [
            { type: "global_damage_boost", value: 0.10 }, { type: "max_hp_bonus_flat", value: 25 }, 
            { type: "heal_on_kill_percent", value: 0.05 }, { type: "global_skill_speed_boost", value: 0.10 }
        ],
        requires_structure: "castle", rent_value: 250,
        "tier": TIERS.LEGENDARY
    },
    "wizardTower": {
        name: "Wizard Tower", emoji: "🧙‍♂️🏰",
        cost: { "maple logs": 2000, "magic logs": 1000, "mithril bar": 200, "emerald": 50, "gold": 50000 },
        perk_desc: "1% chance to find Ancient Tomes (5-20) on monster kills. Unlocks new enchantments: Life-steal, Fire (DoT), and Ice (30% attack slow).",
        perks: [
            { type: "ancient_tome_drop_chance", value: 0.01, min: 5, max: 20, description: "1% chance to find Ancient Tomes (5-20) on monster kills" },
            { type: "unlock_enchantments", enchantments: ["life-steal", "fire", "ice"], description: "Unlocks new enchantments: Life-steal, Fire (DoT), and Ice (30% attack slow)" }
        ],
        requires_structure: "mansion",
        rent_value: 80,
        "tier": TIERS.EPIC
    }
};

// Guild data (guild hall functionality)
export const GUILD_DATA = {
    "baseRequirements": {
        "gold": 5000,
        "minAttackLevel": 20
    },
    "maxLevel": 10, // This is for guild level, not member count tier
    "maxMembersByLevel": { // Max members allowed in guild by guild level
        1: 3,
        3: 5,
        5: 8,
        7: 10,
        9: 15 // Max 15 members means recruit tiers 0 through 14
    },
    "levelUpRequirements": {
        2: { "gold": 10000, "completedMissions": 3 },
        3: { "gold": 25000, "completedMissions": 8 },
        4: { "gold": 50000, "completedMissions": 15 },
        5: { "gold": 100000, "completedMissions": 25 },
        6: { "gold": 200000, "completedMissions": 40 },
        7: { "gold": 400000, "completedMissions": 60 },
        8: { "gold": 800000, "completedMissions": 85 },
        9: { "gold": 1500000, "completedMissions": 120 },
        10: { "gold": 3000000, "completedMissions": 200 }
    }
};


// --- NEW: Guild Member Recruitment Tier Settings ---
export const MEMBER_RECRUIT_TIER_SETTINGS = {
    maxRecruitTier: 14, // Allows for 15 members (Tier 0 to Tier 14)
    getBonusStatsForTier: (tier) => {
        return 5 + (tier * 5); // Tier 0: 5, Tier 1: 10, ..., Tier 8: 45, Tier 14: 75
    },
    baseSecondaryStats: { // Base stats before tier/title bonus
        lumberjack: 1,
        miner: 1,
        fighter: 1
    }
};

// --- NEW: Title Stat Profiles ---
// Each profile's ratios should sum to a consistent number (e.g., 5) for easier distribution.
// { lumberjack: ratio, miner: ratio, fighter: ratio }
export const TITLE_STAT_PROFILES = {
  "Defender 🛡️":   { lumberjack: 1, miner: 2, fighter: 2 },
  "Woodsman 🪓":   { lumberjack: 4, miner: 1, fighter: 0 },
  "Miner ⛏️":      { lumberjack: 1, miner: 4, fighter: 0 },
  "Hunter 🏹":     { lumberjack: 1, miner: 1, fighter: 3 },
  "Alchemist ⚗️":  { lumberjack: 1, miner: 2, fighter: 2 },
  "Scribe 📜":     { lumberjack: 2, miner: 2, fighter: 1 },
  "Scout 🦅":      { lumberjack: 2, miner: 1, fighter: 2 },
  "Cook 🍳":       { lumberjack: 3, miner: 2, fighter: 0 },
  "Smith 🔨":      { lumberjack: 1, miner: 3, fighter: 1 },
  "Mystic 🔮⭐":     { lumberjack: 3, miner: 3, fighter: 2 },
  "Healer 💊":     { lumberjack: 2, miner: 1, fighter: 2 },
  "Merchant 💰":   { lumberjack: 1, miner: 2, fighter: 2 },
  "Tamer 🐺":      { lumberjack: 2, miner: 1, fighter: 2 },
  "Sailor ⚓":     { lumberjack: 2, miner: 2, fighter: 1 },
  "Scholar 📚":    { lumberjack: 2, miner: 2, fighter: 1 },
  "Bard 🎵":       { lumberjack: 2, miner: 1, fighter: 2 },
  "Ranger 🌲":     { lumberjack: 2, miner: 1, fighter: 2 },
  "Artisan 🎨":    { lumberjack: 2, miner: 2, fighter: 1 },
  "Enchanter ✨":  { lumberjack: 1, miner: 2, fighter: 2 },
  "Guardian 🗡️⭐":   { lumberjack: 2, miner: 2, fighter: 5 },
  "Warrior 🗡️":    { lumberjack: 1, miner: 1, fighter: 3 }
};


// Guild member data
export const GUILD_MEMBER_DATA = {
    "names": [
        "Aeric", "Brom", "Cedric", "Dorn", "Elric", 
        "Fargo", "Gareth", "Hector", "Ivan", "Jorn",
        "Kale", "Leif", "Morn", "Niles", "Osgar",
        "Piper", "Quentin", "Rowan", "Sven", "Thorne",
        "Ulric", "Vance", "Wren", "Yorath", "Zane",
        "Aria", "Brynn", "Cora", "Deria", "Elysia",
        "Freya", "Gwen", "Hilda", "Ivy", "Jora",
        "Kira", "Lyra", "Mira", "Nora", "Olga",
        "Prim", "Quinn", "Rona", "Saga", "Tara"
    ],
    "baseCost": { // Cost to recruit the *first* member (Tier 0)
        "gold": 500
    },
    // Cost scaling for subsequent members: baseCost.gold + (recruitTier * 250)
    "baseDailyWage": 25, // This is not currently used in the provided guild.js
    "taskTypes": { // Defines base properties for tasks members can do
        "woodcutting": {
            "name": "Woodcutting",
            "emoji": "🪓",
            "description": "Send member to chop wood.",
            "baseDurationMs": 6 * 60 * 60 * 1000, // 6 hours
            "baseXpPerCompletion": 200, // XP for member's main level on full completion
            "skillStat": "lumberjack" // The secondary stat associated with this task
        },
        "mining": {
            "name": "Mining",
            "emoji": "⛏️",
            "description": "Send member to mine ores.",
            "baseDurationMs": 6 * 60 * 60 * 1000, // 6 hours
            "baseXpPerCompletion": 200,
            "skillStat": "miner"
        },
        "hunting": {
            "name": "Hunting",
            "emoji": "🏹",
            "description": "Send member on a hunting expedition.",
            "baseDurationMs": 4 * 60 * 60 * 1000, // 4 hours
            "baseXpPerCompletion": 300,
            "skillStat": "fighter"
        },
        "mission": { 
            "name": "Mission Support",
            "emoji": "🗺️",
            "description": "Assign to current guild mission. Duration set by mission.",
            "baseDurationMs": 1 * 60 * 60 * 1000, // Fallback, actual duration from mission
            "baseXpPerCompletion": 250, // XP for contributing to a mission
            "skillStat": null // No single stat, depends on mission
        }
    },
};

// Guild mission data
export const GUILD_MISSION_DATA = {
    "missionTypes": {
        "hunt": {
            "name": "Monster Hunt",
            "description": "Hunt down a specific type of monster",
            "durationMultiplier": 1.0,
            "rewardMultiplier": 1.0
        },
        "gather": {
            "name": "Resource Gathering",
            "description": "Collect a specific type of resource",
            "durationMultiplier": 0.8,
            "rewardMultiplier": 0.9
        },
        "escort": {
            "name": "Escort Mission",
            "description": "Escort an important person through dangerous territory",
            "durationMultiplier": 1.2,
            "rewardMultiplier": 1.3
        },
        "fetch": {
            "name": "Fetch Quest",
            "description": "Retrieve a specific item from a dangerous location",
            "durationMultiplier": 1.0,
            "rewardMultiplier": 1.1
        },
        "clear": {
            "name": "Area Clearing",
            "description": "Clear an area of all dangers",
            "durationMultiplier": 1.5,
            "rewardMultiplier": 1.5
        }
    },
    "difficultyLevels": {
        "easy": {
            "name": "Easy",
            "durationMultiplier": 0.7,
            "rewardMultiplier": 0.7,
            "memberLevelReq": 1,
            "memberCountReq": 1
        },
        "medium": {
            "name": "Medium",
            "durationMultiplier": 1.0,
            "rewardMultiplier": 1.0,
            "memberLevelReq": 3,
            "memberCountReq": 2
        },
        "hard": {
            "name": "Hard",
            "durationMultiplier": 1.5,
            "rewardMultiplier": 1.5,
            "memberLevelReq": 5,
            "memberCountReq": 3
        },
        "very_hard": {
            "name": "Very Hard",
            "durationMultiplier": 2.0,
            "rewardMultiplier": 2.2,
            "memberLevelReq": 8,
            "memberCountReq": 4
        }
    },
    "baseDuration": 15, // minutes
    "baseGoldReward": 500,
    "baseXpReward": 200,
    "targets": {
        "monsters": ["goblin", "skeleton", "zombie", "wolf", "spider", "bear", "troll", "dragon"],
        "resources": ["logs", "ores", "herbs", "gems", "food", "water", "cloth", "leather"],
        "locations": ["forest", "cave", "mountain", "swamp", "desert", "ruins", "castle", "temple"]
    }
};

// Guild upgrade data
export const GUILD_UPGRADE_DATA = {
  "guildBarracks": {
    "name": "Guild Barracks",
    "emoji": "🏰",
    "description": "Increases the maximum number of guild members.",
    "maxLevel": 15,
    "levels": [
      { guildLevelReq: 0,  cost: { gold: 1000 }, effectDescription: 'Level 1: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0,  cost: { gold: 2000 }, effectDescription: 'Level 2: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0,  cost: { gold: 4000 }, effectDescription: 'Level 3: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 8000 }, effectDescription: 'Level 4: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 16000 }, effectDescription: 'Level 5: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 32000 }, effectDescription: 'Level 6: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 64000 }, effectDescription: 'Level 7: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 128000 }, effectDescription: 'Level 8: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 256000 }, effectDescription: 'Level 9: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 512000 }, effectDescription: 'Level 10: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 1024000 }, effectDescription: 'Level 11: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 2048000 }, effectDescription: 'Level 12: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 4096000 }, effectDescription: 'Level 13: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 8192000 }, effectDescription: 'Level 14: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] },
      { guildLevelReq: 0, cost: { gold: 16384000 }, effectDescription: 'Level 15: +1 to Members.', effects: [{ type: 'max_guild_members_increase', value: 1 }] }
    ]
  },
  "trainingGrounds": {
    "name": "Training Grounds",
    "emoji": "🏋️‍♂️",
    "description": "Permanently increases all member stats.",
    "maxLevel": 5,
    "levels": [
      { guildLevelReq: 8,  cost: { gold: 1000 }, effectDescription: 'Level 1: +5 to all member stats.', effects: [{ type: 'all_member_stat_boost_flat', value: 5 }] },
      { guildLevelReq: 25, cost: { gold: 5000 }, effectDescription: 'Level 2: +7 to all member stats.', effects: [{ type: 'all_member_stat_boost_flat', value: 7 }] },
      { guildLevelReq: 50, cost: { gold: 20000 }, effectDescription: 'Level 3: +9 to all member stats.', effects: [{ type: 'all_member_stat_boost_flat', value: 9 }] },
      { guildLevelReq: 80, cost: { gold: 80000 }, effectDescription: 'Level 4: +11 to all member stats.', effects: [{ type: 'all_member_stat_boost_flat', value: 11 }] },
      { guildLevelReq: 99, cost: { gold: 250000 }, effectDescription: 'Level 5: +13 to all member stats.', effects: [{ type: 'all_member_stat_boost_flat', value: 13 }] }
    ]
  },
  "advancedWorkshop": {
    "name": "Advanced Workshop",
    "emoji": "🔧",
    "description": "5% chance of double crafting loot per level (Smelting, Smithing, Cooking)",
    "maxLevel": 5,
    "levels": [
      { guildLevelReq: 12, cost: { gold: 1000 }, effectDescription: 'Level 1: +5% double crafting loot.', effects: [{ type: 'double_crafting_chance', value: 0.05 }] },
      { guildLevelReq: 30, cost: { gold: 5000 }, effectDescription: 'Level 2: +10% double crafting loot.', effects: [{ type: 'double_crafting_chance', value: 0.10 }] },
      { guildLevelReq: 55, cost: { gold: 20000 }, effectDescription: 'Level 3: +15% double crafting loot.', effects: [{ type: 'double_crafting_chance', value: 0.15 }] },
      { guildLevelReq: 85, cost: { gold: 80000 }, effectDescription: 'Level 4: +20% double crafting loot.', effects: [{ type: 'double_crafting_chance', value: 0.20 }] },
      { guildLevelReq: 99, cost: { gold: 250000 }, effectDescription: 'Level 5: +25% double crafting loot.', effects: [{ type: 'double_crafting_chance', value: 0.25 }] }
    ]
  },
  "missionBoard": {
    "name": "Mission Board",
    "emoji": "📝",
    "description": "Increases mission rewards by 25%",
    "maxLevel": 5,
    "levels": [
      { guildLevelReq: 3, cost: { gold: 1000 }, effectDescription: 'Level 1: +5% mission rewards.', effects: [{ type: 'mission_reward_boost', value: 0.05 }] },
      { guildLevelReq: 18, cost: { gold: 5000 }, effectDescription: 'Level 2: +10% mission rewards.', effects: [{ type: 'mission_reward_boost', value: 0.10 }] },
      { guildLevelReq: 45, cost: { gold: 20000 }, effectDescription: 'Level 3: +15% mission rewards.', effects: [{ type: 'mission_reward_boost', value: 0.15 }] },
      { guildLevelReq: 75, cost: { gold: 80000 }, effectDescription: 'Level 4: +20% mission rewards.', effects: [{ type: 'mission_reward_boost', value: 0.20 }] },
      { guildLevelReq: 99, cost: { gold: 250000 }, effectDescription: 'Level 5: +25% mission rewards.', effects: [{ type: 'mission_reward_boost', value: 0.25 }] }
    ]
  },
  "reinforcedWalls": {
    "name": "Reinforced Walls",
    "emoji": "🧱🛡️",
    "description": "Reduces mission failure chance by 30%",
    "maxLevel": 5,
    "levels": [
      { guildLevelReq: 5, cost: { gold: 1000 }, effectDescription: 'Level 1: -6% mission failure chance.', effects: [{ type: 'mission_failure_reduction', value: 0.06 }] },
      { guildLevelReq: 20, cost: { gold: 5000 }, effectDescription: 'Level 2: -12% mission failure chance.', effects: [{ type: 'mission_failure_reduction', value: 0.12 }] },
      { guildLevelReq: 40, cost: { gold: 20000 }, effectDescription: 'Level 3: -18% mission failure chance.', effects: [{ type: 'mission_failure_reduction', value: 0.18 }] },
      { guildLevelReq: 70, cost: { gold: 80000 }, effectDescription: 'Level 4: -24% mission failure chance.', effects: [{ type: 'mission_failure_reduction', value: 0.24 }] },
      { guildLevelReq: 99, cost: { gold: 250000 }, effectDescription: 'Level 5: -30% mission failure chance.', effects: [{ type: 'mission_failure_reduction', value: 0.30 }] }
    ]
  },
  "arcaneLibrary": {
    "name": "Arcane Library",
    "emoji": "🏛️📚",
    "description": "1% chance per level for members to find Ancient Tomes while working",
    "maxLevel": 5,
    "levels": [
      { guildLevelReq: 12, cost: { gold: 1000 }, effectDescription: 'Level 1: +1% Ancient Tome chance.', effects: [{ type: 'ancient_tome_chance', value: 0.01 }] },
      { guildLevelReq: 30, cost: { gold: 5000 }, effectDescription: 'Level 2: +2% Ancient Tome chance.', effects: [{ type: 'ancient_tome_chance', value: 0.02 }] },
      { guildLevelReq: 55, cost: { gold: 20000 }, effectDescription: 'Level 3: +3% Ancient Tome chance.', effects: [{ type: 'ancient_tome_chance', value: 0.03 }] },
      { guildLevelReq: 85, cost: { gold: 80000 }, effectDescription: 'Level 4: +4% Ancient Tome chance.', effects: [{ type: 'ancient_tome_chance', value: 0.04 }] },
      { guildLevelReq: 99, cost: { gold: 250000 }, effectDescription: 'Level 5: +5% Ancient Tome chance.', effects: [{ type: 'ancient_tome_chance', value: 0.05 }] }
    ]
  },
  "grandHall": {
    "name": "Grand Hall",
    "emoji": "🏛️🎭",
    "description": "Boosts guild morale, increasing member loyalty and task efficiency by 10%",
    "maxLevel": 5,
    "levels": [
      { guildLevelReq: 3, cost: { gold: 1000 }, effectDescription: 'Level 1: +2% morale boost.', effects: [{ type: 'morale_boost', value: 0.02 }] },
      { guildLevelReq: 18, cost: { gold: 5000 }, effectDescription: 'Level 2: +4% morale boost.', effects: [{ type: 'morale_boost', value: 0.04 }] },
      { guildLevelReq: 45, cost: { gold: 20000 }, effectDescription: 'Level 3: +6% morale boost.', effects: [{ type: 'morale_boost', value: 0.06 }] },
      { guildLevelReq: 75, cost: { gold: 80000 }, effectDescription: 'Level 4: +8% morale boost.', effects: [{ type: 'morale_boost', value: 0.08 }] },
      { guildLevelReq: 99, cost: { gold: 250000 }, effectDescription: 'Level 5: +10% morale boost.', effects: [{ type: 'morale_boost', value: 0.10 }] }
    ]
  }
};

// Monster data
export const MONSTER_DATA = {
    "chicken":     {"name":"Chicken", "level_req":1, "min_dmg": 0, "max_dmg": 1, "hp":5,    "attack_xp":5,   "gold_drop": [0,1], "color":"fore-white", "emoji":"🐔", "drops":[{"item_name":"egg","base_chance":0.9, "quantity":[1,2], "always_drop_one":true},{"item_name":"raw meat","base_chance":0.7, "quantity":[1,1]},{"item_name":"feathers","base_chance":0.5, "quantity":[1,3]}]},
    "goblin":      {"name":"Goblin", "level_req":5, "min_dmg": 1, "max_dmg": 3, "hp":20,   "attack_xp":15,  "gold_drop": [1,5], "color":"fore-green", "emoji":"👺", "drops":[{"item_name":"goblin beads","base_chance":0.5, "quantity":[1,1]}, {"item_name":"bronze chestplate",  "base_chance":0.02, "quantity":[1,1]}]},
    "wolf":        {"name":"Wolf", "level_req":10, "min_dmg": 2, "max_dmg": 4, "hp":35,   "attack_xp":25,  "gold_drop": [3,8], "color":"fore-lightblack_ex", "emoji":"🐺", "drops":[{"item_name":"raw meat","base_chance":0.8, "quantity":[1,2]},{"item_name":"wolf fang","base_chance":0.3, "quantity":[1,1]}]},
    "bear":        {"name":"Bear", "level_req":20, "min_dmg": 4, "max_dmg": 8, "hp":70,   "attack_xp":50,  "gold_drop": [10,25],"color":"fore-yellow","emoji":"🐻", "drops":[{"item_name":"raw meat","base_chance":0.9, "quantity":[2,3]},{"item_name":"bear claw","base_chance":0.25, "quantity":[1,1]},{"item_name":"cooked meat","base_chance":0.1, "quantity":[1,1]}, {"item_name":"iron chestplate",    "base_chance":0.025, "quantity":[1,1]}]},
    "ogre":        {"name":"Ogre", "level_req":30, "min_dmg": 6, "max_dmg": 12, "hp":120,  "attack_xp":90,  "gold_drop": [20,50],"color":"fore-green", "emoji":"👹", "drops":[{"item_name":"ogre club fragment","base_chance":0.4, "quantity":[1,1]},{"item_name":"cooked meat","base_chance":0.3, "quantity":[1,2]}, {"item_name":"steel chestplate",   "base_chance":0.03, "quantity":[1,1]}]},
    "troll":       {"name":"Troll", "level_req":40, "min_dmg": 8, "max_dmg": 15, "hp":200,  "attack_xp":150, "gold_drop": [40,100],"color":"fore-cyan","emoji":"🧌", "drops":[{"item_name":"troll hide","base_chance":0.35, "quantity":[1,1]},{"item_name":"health potion (s)","base_chance":0.15, "quantity":[1,1]}, {"item_name":"mithril chestplate", "base_chance":0.02, "quantity":[1,1]}]},
    "giant":       {"name":"Giant", "level_req":55, "min_dmg": 10, "max_dmg": 20, "hp":350,  "attack_xp":280, "gold_drop": [75,150],"color":"fore-blue","emoji":"🗿", "drops":[{"item_name":"giant's toe","base_chance":0.2, "quantity":[1,1]},{"item_name":"cooked meat","base_chance":0.5, "quantity":[2,4]}, {"item_name":"adamant chestplate", "base_chance":0.025, "quantity":[1,1]}]},
    "demon":       {"name":"Demon", "level_req":70, "min_dmg": 15, "max_dmg": 25, "hp":500,  "attack_xp":500, "gold_drop": [150,300],"color":"fore-magenta","emoji":"😈", "drops":[{"item_name":"demon heart","base_chance":0.04, "quantity":[1,1]},{"item_name":"health potion (s)","base_chance":0.3, "quantity":[1,2]}, {"item_name":"rune chestplate",    "base_chance":0.015, "quantity":[1,1]}]},
    "dark_dragon": {"name":"Dark Dragon", "level_req":85, "min_dmg": 20, "max_dmg": 35, "hp":1200, "attack_xp":2500,"gold_drop": [500,2000],"color":"fore-red","emoji":"🐉", "drops":[{"item_name":"dragon gem","base_chance":0.02, "quantity":[1,1]},{"item_name":"health potion (s)","base_chance":0.5, "quantity":[2,3]}, {"item_name":"dragon chestplate",  "base_chance":0.01, "quantity":[1,1]}, {"item_name":"special dragon ore", "base_chance":0.1, "quantity":[1,2]}, {"item_name":"dragon scale", "base_chance":0.15, "quantity":[1,2]}, {"item_name":"ancient_tomes", "base_chance":0.05, "quantity":[15,30]}]}
};
export const ALL_MONSTER_NAMES = Object.keys(MONSTER_DATA);


// Default player state
export const DEFAULT_PLAYER = {
    "name": "Player",
    "skills": {
        "attack": {"level": 1, "xp": 0, "next_level_xp": LEVEL_PROGRESSION[1]},
        "woodcutting": {"level": 1, "xp": 0, "next_level_xp": LEVEL_PROGRESSION[1]},
        "mining": {"level": 1, "xp": 0, "next_level_xp": LEVEL_PROGRESSION[1]},
        "cooking": {"level": 1, "xp": 0, "next_level_xp": LEVEL_PROGRESSION[1]},
        "blacksmithing": {"level": 1, "xp": 0, "next_level_xp": LEVEL_PROGRESSION[1]}
    },
    "hp": 10,
    "max_hp": 10,
    "current_action": null,
    "action_progress": 0,
    "action_duration": 0,
    "inventory": {
        "gold": 0,
        "perk_points": 0
    },
    "equipment": {
        "weapon": "fists",
        "pickaxe": null,
        "axe": "fists",
        "armor": null,
        "helmet": null
    },
    "built_structures": {
        // "camp": true // Example
    },
    "unlocked_perks": [],
    "unlocked_permits": [],
    "guild": {
        "name": null,
        "level": 1, // Guild starts at level 1
        "xp": 0,    // Guild XP
        "members": {}, // Member objects keyed by ID
        "missions": {},
        "upgrades": {},
        "stash": {} // Guild item storage { "itemName": quantity }
    },
    "farm_storage": {}, // Storage for farm-produced resources
    "settings": {
        "autoSave": true,
        "darkMode": true,
        "soundEffects": true,
        "music": false,
        "notifications": true,
        "showTooltips": true,
        "actionTimerVisible": true,
        "autoEquipBestTool": true,
        "autoEquipBestWeapon": false,
        "autoEquipBestArmor": false,
        "autoEatThreshold": 0.3, // Eat when HP is below 30%
        "preferredFood": null, // Player can set a preferred food item
        "combatRetaliation": "auto", // "auto", "manual", "none"
        "farm_storage": {} // Storage for farm-produced resources
    },
    "stats": {
        "monsters_killed": 0,
        "total_damage_dealt": 0,
        "total_damage_taken": 0,
        "total_gold_earned": 0,
        "total_xp_gained": 0,
        "actions_completed": 0,
        "items_crafted": 0,
        "items_gathered": 0,
        "play_time_seconds": 0,
        "last_saved_timestamp": null
    }
};

// Item sell prices (if not defined in FOOD_DATA or other specific data objects)
export const ITEM_SELL_PRICES = {
    "normal logs": 1,
    "oak logs": 3,
    "willow logs": 5,
    "copper ore": 2,
    "tin ore": 2,
    "iron ore": 4,
    "coal": 6,
    "mithril ore": 10,
    "adamantite ore": 15,
    "runite ore": 25,
    "special dragon ore": 50,
    "bronze bar": 5,
    "iron bar": 10,
    "steel bar": 20,
    "mithril bar": 35,
    "adamantite bar": 50,
    "runite bar": 80,
    "dragon bar": 150,
    "burnt meat": 0,
    "burnt shrimp": 0,
    "burnt fish": 0,
    "burnt trout": 0,
    "burnt salmon": 0,
    "burnt lobster": 0,
    "burnt swordfish": 0,
    "burnt shark": 0,
    "raw meat": 0,
    "raw shrimp": 0,
    "raw fish": 0,
    "raw trout": 0,
    "raw salmon": 0,
    "raw lobster": 0,
    "raw swordfish": 0,
    "raw shark": 0,
    "egg": 0,
    "water": 0,
    "feathers": 1,
    "goblin beads": 2,
    "wolf fang": 5,
    "bear claw": 8,
    "ogre club fragment": 15,
    "troll hide": 20,
    "giant's toe": 30
};

// Permit master list
export const PERMIT_MASTER_LIST = {
    chef: {
        name: "Chef's Permit", 
        displayName: "Chef's Permit",
        description: "Allows continuous cooking through level ups.", 
        price: 10000, 
        emoji: "📜🍳",
        prerequisites: { "cooked trout": 100, "cooked salmon": 50 },
        "tier": TIERS.EPIC
    },
    hunter: { 
        name: "Hunter's Permit", 
        displayName: "Hunter's Permit",
        description: "Allows continuous hunting through level ups.", 
        price: 10000, 
        emoji: "📜🏹",
        prerequisites: { "wolf fang": 50, "bear claw": 25, "goblin bead": 100 },
        "tier": TIERS.EPIC
    },
    miner: {  
        name: "Miner's Permit", 
        displayName: "Miner's Permit",
        description: "Allows continuous mining through level ups.", 
        price: 10000, 
        emoji: "📜⛏️",
        prerequisites: { "iron ore": 300, "coal": 200 },
        "tier": TIERS.EPIC
    },
    blacksmith: { 
        name: "Master Blacksmith License", 
        displayName: "Master Blacksmith License",
        description: "Allows continuous smithing through level ups.", 
        price: 15000, 
        emoji: "📜🔨",
        prerequisites: { "steel bar": 50, "mithril bar": 25 },
        "tier": TIERS.EPIC
    },
};

// Helper function to get item details from any category
export function getItemDetails(itemName) {
    if (!itemName) return null;

    const sources = [
        TOOL_DATA.axe, TOOL_DATA.pickaxe,
        SWORD_DATA, ARMOR_DATA, HELMET_DATA,
        FOOD_DATA, COOKABLE_ITEMS, BAR_DATA, ORE_DATA,
        STRUCTURE_DATA, PERMIT_MASTER_LIST, PERK_DATA, // PERK_DATA added
        FARM_ANIMAL_DATA, // Farm animals
        ITEM_DATA // Generic items
    ];

    for (const source of sources) {
        if (source && source[itemName]) {
            let type = "unknown";
            if (source === TOOL_DATA.axe) type = "axe";
            else if (source === TOOL_DATA.pickaxe) type = "pickaxe";
            else if (source === SWORD_DATA) type = "sword";
            else if (source === ARMOR_DATA) type = "armor";
            else if (source === HELMET_DATA) type = "helmet";
            else if (source === FOOD_DATA) type = "food";
            else if (source === COOKABLE_ITEMS) type = "cookable";
            else if (source === BAR_DATA) type = "bar";
            // ORE_DATA is tricky, handle item_name below
            else if (source === STRUCTURE_DATA) type = "structure";
            else if (source === PERMIT_MASTER_LIST) type = "permit";
            else if (source === PERK_DATA) type = "perk";
            else if (source === FARM_ANIMAL_DATA) type = "farm_animal";
            else if (source === ITEM_DATA) {
                // For ITEM_DATA, use the category field if available
                type = source[itemName].category || "item";
            }
            
            // For tools, append the tool type to the name
            let displayName = itemName;
            if (type === "axe" && itemName !== "fists") {
                displayName = itemName + " axe";
            } else if (type === "pickaxe") {
                displayName = itemName + " pickaxe";
            }
            return { ...source[itemName], name: displayName, itemType: source[itemName].itemType || type, id: itemName };
        }
    }
    // Check ORE_DATA by item_name if not found directly
    for (const oreKey in ORE_DATA) {
        if (ORE_DATA[oreKey].item_name === itemName) {
            return { ...ORE_DATA[oreKey], name: itemName, itemType: "ore_material", id: itemName };
        }
    }
     // Check TREE_DATA by log name
    for (const treeKey in TREE_DATA) {
        if (TREE_DATA[treeKey].log === itemName) {
            return { ...TREE_DATA[treeKey], name: itemName, itemType: "log", id: itemName };
        }
    }
    // Check CROP_ITEMS
    if (CROP_ITEMS[itemName]) {
        return { ...CROP_ITEMS[itemName], name: itemName, itemType: "crop_yield", id: itemName };
    }
    // Check SEED_DATA
    if (SEED_DATA[itemName]) {
        return { ...SEED_DATA[itemName], name: itemName, itemType: "seed", id: itemName };
    }


    return null; // Item not found
}


// Perk data
export const PERK_DATA = {
    "efficientGatherer1": { 
        name: "Efficient Gatherer I", 
        description: "Increases base log and ore yield by +1 for Woodcutting and Mining.",
        cost: 1, 
        emoji: "🌳⛏️+",
        effects: [
            { skill: "woodcutting", type: "base_yield_increase", value: 1 },
            { skill: "mining", type: "base_yield_increase", value: 1 }
        ],
        prerequisites: { woodcuttingLevel: 5, miningLevel: 5 },
        "tier": TIERS.COMMON
    },
    "weaponMaster1": { 
        name: "Weapon Master I", 
        description: "Increases minimum and maximum damage of all weapons by +1.",
        cost: 2, 
        emoji: "⚔️+",
        effects: [{ type: "global_damage_boost_flat", value: 1 }],
        prerequisites: { attackLevel: 10 },
        "tier": TIERS.COMMON
    },
    "preciseStrikes1": { 
        name: "Precise Strikes I", 
        description: "Increases combat accuracy by +5%.",
        cost: 2, 
        emoji: "🎯+",
        effects: [{ type: "global_accuracy_boost_percentage", value: 0.05 }],
        prerequisites: { attackLevel: 15 },
        max_level: 3, 
        cost_scaling_factor: 1.5, 
        effect_scaling: { value: 0.02 }, 
        "tier": TIERS.UNCOMMON,
        crit_multiplier: 1.5
    },
    "advancedSmelting": { 
        name: "Advanced Smelting", 
        description: "Reduces coal cost for smelting Steel, Mithril, Adamantite, and Runite bars by 1 (minimum 1).",
        cost: 3, 
        emoji: "🔥⛏️",
        effects: [{ type: "smelting_coal_reduction", value: 1 }],
        prerequisites: { blacksmithingLevel: 35, miningLevel: 30 },
        "tier": TIERS.UNCOMMON
    },
    "masterSmith": { 
        name: "Master Smith", 
        description: "Increases XP gained from smithing items by 15%.",
        cost: 3, 
        emoji: "🔨✨",
        effects: [{ skill: "blacksmithing", type: "xp_boost_percentage", value: 0.15 }],
        prerequisites: { blacksmithingLevel: 50 },
        "tier": TIERS.RARE
    },
    "combatSustenance": { 
        name: "Combat Sustenance", 
        description: "Heals 2 HP after every successful monster kill.",
        cost: 4, 
        emoji: "❤️‍🩹⚔️",
        effects: [{ type: "heal_on_kill_flat", value: 2 }],
        prerequisites: { attackLevel: 25, "perk:weaponMaster1": true },
        "tier": TIERS.EPIC
    },
    "masterGuildCharter": { 
        name: "Master Guild Charter", 
        description: "Allows founding a Guild. Reduces Guild establishment cost by 20%.",
        cost: 5, 
        emoji: "🏰📜",
        effects: [{ type: "guild_founding_cost_reduction", value: 0.20 }],
        prerequisites: { attackLevel: 30, "structure:house": true }, 
        "tier": TIERS.LEGENDARY
    }
};

// Helper function to get the actual effect value if it's an array (random range)
export function getEffectValue(effectValue) {
    if (Array.isArray(effectValue)) {
        return Math.floor(Math.random() * (effectValue[1] - effectValue[0] + 1)) + effectValue[0];
    }
    return effectValue;
}

// Loot tables for guild members
export const GUILD_MEMBER_LOOT_TABLES = {
    woodcutting: {
        description: "Woodcutting related items",
        categories: [
            {
                name: "Common Logs",
                minMemberLevel: 1,
                categoryChance: 0.6, 
                items: [ 
                    { treeType: "normal", itemChance: 0.7, baseMinQty: 1, baseMaxQty: 2, skillBonusFactor: 0.1 }, 
                    { treeType: "oak", itemChance: 0.4, baseMinQty: 1, baseMaxQty: 1, skillBonusFactor: 0.05, minLumberjackSkill: 5 }
                ]
            },
            {
                name: "Uncommon Logs",
                minMemberLevel: 10, 
                categoryChance: 0.3,
                items: [
                    { treeType: "willow", itemChance: 0.5, baseMinQty: 1, baseMaxQty: 2, skillBonusFactor: 0.1, minLumberjackSkill: 15 },
                ]
            }
        ]
    },
    mining: {
        description: "Mining related items",
        categories: [
            {
                name: "Common Ores",
                minMemberLevel: 1,
                categoryChance: 0.65,
                items: [ 
                    { oreType: "copper", itemChance: 0.5, baseMinQty: 1, baseMaxQty: 3, skillBonusFactor: 0.1 },
                    { oreType: "tin", itemChance: 0.5, baseMinQty: 1, baseMaxQty: 3, skillBonusFactor: 0.1 },
                    { oreType: "iron", itemChance: 0.3, baseMinQty: 1, baseMaxQty: 2, skillBonusFactor: 0.05, minMinerSkill: 5 }
                ]
            },
            {
                name: "Uncommon Ores & Coal",
                minMemberLevel: 10,
                categoryChance: 0.4,
                items: [
                    { oreType: "coal", itemChance: 0.6, baseMinQty: 1, baseMaxQty: 2, skillBonusFactor: 0.1, minMinerSkill: 10 },
                    { oreType: "mithril", itemChance: 0.25, baseMinQty: 1, baseMaxQty: 1, skillBonusFactor: 0.05, minMinerSkill: 20 }
                ]
            }
        ]
    },
    hunting: { 
        description: "Monster hunting drops",
        categories: [ 
            {
                name: "Low-Level Prey", 
                minMemberLevel: 1, 
                categoryChance: 0.7, 
                fighterSkillFactor: 0.02 
            },
            {
                name: "Mid-Level Prey", 
                minMemberLevel: 10,
                categoryChance: 0.4,
                fighterSkillFactor: 0.03
            },
            {
                name: "High-Level Prey", 
                minMemberLevel: 25,
                categoryChance: 0.2,
                fighterSkillFactor: 0.04
            }
        ]
    }
};

export const EQUIPMENT_DATA = {};

export const ITEM_DATA = {
    "feathers": {"name": "Feathers", "description": "Light and fluffy feathers.", "sell_price": 1, "emoji": "🪶", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "bones": {"name": "Bones", "description": "A pile of old bones.", "sell_price": 2, "emoji": "🦴", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "goblin mail": {"name": "Goblin Mail Scrap", "description": "A piece of crude goblin armor.", "sell_price": 5, "emoji": "⛓️", "stackable": false, "category": "material", "tier": TIERS.UNCOMMON}, 
    "dragon scale": {"name": "Dragon Scale", "description": "A shimmering, incredibly hard scale.", "sell_price": 100, "emoji": "🐉鱗", "stackable": true, "category": "rare_material", "tier": TIERS.EPIC, "noShop": true},
    "sapphire": {"name": "Sapphire", "description": "A brilliant blue gemstone.", "sell_price": 75, "emoji": "🔷", "stackable": true, "category": "gem", "tier": TIERS.RARE, "noShop": true},
    "emerald": {"name": "Emerald", "description": "A vibrant green gemstone.", "sell_price": 100, "emoji": "💚", "stackable": true, "category": "gem", "tier": TIERS.RARE, "noShop": true},
    "ruby": {"name": "Ruby", "description": "A deep red gemstone.", "sell_price": 150, "emoji": "🔴", "stackable": true, "category": "gem", "tier": TIERS.RARE, "noShop": true},
    "diamond": {"name": "Diamond", "description": "A sparkling, flawless diamond.", "sell_price": 300, "emoji": "💎", "stackable": true, "category": "gem", "tier": TIERS.EPIC, "noShop": true},
    "ancient_tomes": {"name": "Ancient Tomes", "description": "Books filled with forgotten lore.", "sell_price": 0, "emoji": "📚", "stackable": true, "category": "quest_item", "tier": TIERS.UNCOMMON, "noShop": true},
    "mana_crystals": {"name": "Mana Crystals", "description": "Crystals humming with arcane energy.", "sell_price": 10, "emoji": "🔮", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "silk": {"name": "Silk", "description": "Fine, luxurious silk threads.", "sell_price": 20, "emoji": "🧵", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "stone": {"name": "Stone", "description": "A sturdy piece of rock.", "sell_price": 1, "emoji": "🪨", "stackable": true, "category": "material", "tier": TIERS.COMMON}, 
    "gems": {"name": "Assorted Gems", "description": "A collection of various gemstones.", "sell_price": 0, "emoji": "💠", "stackable": true, "category": "material", "tier": TIERS.UNCOMMON, "noShop": true}, 
    "assorted_gems": {"name": "Assorted Gems", "description": "A collection of various gemstones.", "sell_price": 0, "emoji": "💠", "stackable": true, "category": "material", "tier": TIERS.UNCOMMON, "noShop": true}, 
    "dragon gem": {"name": "Dragon Gem", "description": "A fiery gem, pulsating with power.", "sell_price": 1000, "emoji": "💎🔥", "stackable": true, "category": "rare_material", "tier": TIERS.EPIC, "noShop": true},
    "demon heart": {"name": "Demon Heart", "description": "The still-beating heart of a powerful demon.", "sell_price": 0, "emoji": "❤️‍🔥", "stackable": true, "category": "quest_item", "tier": TIERS.LEGENDARY, "noShop": true}, 
    "maple logs": {"name": "Maple Logs", "description": "Sturdy logs from a maple tree.", "sell_price": 8, "emoji": "🍁", "stackable": true, "category": "log", "tier": TIERS.COMMON, "noShop": true},
    "gold ore": {"name": "Gold Ore", "description": "Ore flecked with glittering gold.", "sell_price": 20, "emoji": "🌟", "stackable": true, "category": "ore", "tier": TIERS.UNCOMMON},
    "egg": { "name": "Egg", "description": "A fresh chicken egg.", "sell_price": 0, "emoji": "🥚", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw pork": { "name": "Raw Pork", "description": "Uncooked pork meat.", "sell_price": 0, "emoji": "🥓", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "sheep milk": { "name": "Sheep Milk", "description": "Fresh milk from a sheep.", "sell_price": 4, "emoji": "🥛", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON, "noShop": true },
    "wool": { "name": "Wool", "description": "Soft sheep wool.", "sell_price": 8, "emoji": "🧶", "stackable": true, "category": "material", "tier": TIERS.COMMON },
    "milk": { "name": "Milk", "description": "Fresh cow's milk.", "sell_price": 6, "emoji": "🥛", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "water": { "name": "Water", "description": "Clear, fresh water.", "sell_price": 0, "emoji": "💧", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "flour": { "name": "Flour", "description": "Finely ground wheat, essential for baking.", "sell_price": 3, "emoji": "🍚", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw meat": { "name": "Raw Meat", "description": "Uncooked meat that needs cooking.", "sell_price": 0, "emoji": "🥩", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw shrimp": { "name": "Raw Shrimp", "description": "Fresh uncooked shrimp.", "sell_price": 0, "emoji": "🦐", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw fish": { "name": "Raw Fish", "description": "Fresh fish that needs cooking.", "sell_price": 0, "emoji": "🐟", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw trout": { "name": "Raw Trout", "description": "Uncooked trout, perfect for cooking.", "sell_price": 0, "emoji": "🐟", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw salmon": { "name": "Raw Salmon", "description": "Fresh salmon ready for cooking.", "sell_price": 0, "emoji": "🐟", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw lobster": { "name": "Raw Lobster", "description": "Uncooked lobster that needs preparation.", "sell_price": 0, "emoji": "🦞", "stackable": true, "category": "food_ingredient", "tier": TIERS.COMMON },
    "raw swordfish": { "name": "Raw Swordfish", "description": "Large fish requiring skillful cooking.", "sell_price": 0, "emoji": "🐟", "stackable": true, "category": "food_ingredient", "tier": TIERS.RARE },
    "raw shark": { "name": "Raw Shark", "description": "Dangerous fish that requires expert cooking.", "sell_price": 0, "emoji": "🦈", "stackable": true, "category": "food_ingredient", "tier": TIERS.RARE },
    "burnt flour": { "name": "Burnt Flour", "description": "Over-processed wheat that's no longer usable.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "cakeSlice": { "name": "Cake Slice", "description": "A delicious slice of cake.", "heal_amount": 25, "sell_price": 20, "emoji": "🍰", "stackable": true, "category": "food", "tier": TIERS.UNCOMMON, "noShop": true },
    "burnt cake": { "name": "Burnt Cake", "description": "An overcooked cake that's inedible.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "porkStew": { "name": "Pork Stew", "description": "A hearty and warming stew.", "heal_amount": 30, "sell_price": 25, "emoji": "🍲", "stackable": true, "category": "food", "tier": TIERS.UNCOMMON, "noShop": true },
    "burnt stew": { "name": "Burnt Stew", "description": "A blackened, inedible stew.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "applePieSlice": { "name": "Apple Pie Slice", "description": "A sweet slice of apple pie.", "heal_amount": 20, "sell_price": 15, "emoji": "🥧", "stackable": true, "category": "food", "tier": TIERS.UNCOMMON, "noShop": true },
    "burnt pie": { "name": "Burnt Pie", "description": "An overcooked pie that's inedible.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "burnt bread": { "name": "Burnt Bread", "description": "Overcooked bread that's hard as a rock.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "burnt cheese": { "name": "Burnt Cheese", "description": "Overheated cheese that's no longer edible.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "burnt sandwich": { "name": "Burnt Sandwich", "description": "A charred grilled cheese sandwich.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "burnt soup": { "name": "Burnt Soup", "description": "Overcooked soup that's not fit for consumption.", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "burnt meat": { "name": "Burnt Meat", "description": "Oops, too much fire!", "sell_price": 0, "emoji": "⚫", "stackable": true, "category": "material", "tier": TIERS.COMMON, "noShop": true },
    "goblin beads": {"name": "Goblin Beads", "description": "Crude beads favored by goblins.", "sell_price": 1, "emoji": "📿", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "wolf fang": {"name": "Wolf Fang", "description": "A sharp fang from a wolf.", "sell_price": 3, "emoji": "🦷", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "bear claw": {"name": "Bear Claw", "description": "A formidable claw from a bear.", "sell_price": 5, "emoji": "🐾", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "troll hide": {"name": "Troll Hide", "description": "Thick, tough hide from a troll.", "sell_price": 20, "emoji": "🟫", "stackable": true, "category": "material", "tier": TIERS.UNCOMMON},
    "ogre club fragment": {"name": "Ogre Club Fragment", "description": "A piece of a mighty ogre's club.", "sell_price": 15, "emoji": "🪵", "stackable": true, "category": "material", "tier": TIERS.UNCOMMON, "noShop": true},
    "bird nest": {"name": "Bird Nest", "description": "A small, empty bird's nest.", "sell_price": 2, "emoji": "🪹", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "hardwood sap": {"name": "Hardwood Sap", "description": "Sticky sap from a hardwood tree.", "sell_price": 4, "emoji": "💧", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "silver ore": {"name": "Silver Ore", "description": "Ore containing veins of silver.", "sell_price": 10, "emoji": "🥈", "stackable": true, "category": "ore", "tier": TIERS.UNCOMMON},
    "herbs": {"name": "Herbs", "description": "A bundle of common herbs.", "sell_price": 1, "emoji": "🌿", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "rope": {"name": "Rope", "description": "A sturdy length of rope.", "sell_price": 5, "emoji": "🪢", "stackable": true, "category": "material", "tier": TIERS.COMMON},
    "elixir of power": {
        "name": "Elixir of Power",
        "description": "Increases drop rate by 5%, defense by 10%, and damage by 10% for 2 hours.",
        "effects": [
            { "type": "drop_rate_boost", "value": 0.05, "duration": 7200 },
            { "type": "defense_boost", "value": 0.10, "duration": 7200 },
            { "type": "damage_boost", "value": 0.10, "duration": 7200 }
        ],
        "sell_price": 1000,
        "emoji": "🧪✨",
        "stackable": true,
        "category": "elixir",
        "tier": TIERS.EPIC
    },
    // Treasure Chests
    "common chest": {"name": "Common Chest", "description": "A simple wooden chest with basic treasures.", "sell_price": 0, "emoji": "📦", "stackable": true, "category": "chest", "tier": TIERS.COMMON, "noShop": true},
    "uncommon chest": {"name": "Uncommon Chest", "description": "A reinforced iron chest with better loot.", "sell_price": 0, "emoji": "🗃️", "stackable": true, "category": "chest", "tier": TIERS.UNCOMMON, "noShop": true},
    "rare chest": {"name": "Rare Chest", "description": "An ornate silver chest containing valuable items.", "sell_price": 0, "emoji": "💼", "stackable": true, "category": "chest", "tier": TIERS.RARE, "noShop": true},
    "epic chest": {"name": "Epic Chest", "description": "A jeweled golden chest filled with epic treasures.", "sell_price": 0, "emoji": "🎁", "stackable": true, "category": "chest", "tier": TIERS.EPIC, "noShop": true},
    "legendary chest": {"name": "Legendary Chest", "description": "A mystical dragon chest containing legendary artifacts.", "sell_price": 0, "emoji": "🏆", "stackable": true, "category": "chest", "tier": TIERS.LEGENDARY, "noShop": true},
};

// Farm worker data
export const FARM_WORKER_DATA = {
    farmhand: {
        name: "Farmhand",
        emoji: "👨‍🌾",
        description: "A basic farm worker who can be assigned to one structure.",
        base_hire_cost: 1000,
        hire_cost_increment: 500,
        hourly_upkeep: 5,
        // Each farmhand reduces yield interval for assigned animals or crops by 2 minutes
        interval_reduction_ms_crop: 2 * 60 * 1000,
        max_assignments: 1,
        type: "farmhand"
    },
    farm_manager: {
        name: "Farm Manager",
        emoji: "🚜", // Changed to tractor icon for clear distinction
        description: "Manages farm operations with global benefits.",
        base_hire_cost: 5000,
        hire_cost_increment: 2500,
        hourly_upkeep: 50,
        // Manager reduces global yield interval by 5 minutes and boosts yields by 50%
        yield_boost_value: 0.50,
        interval_reduction_ms_global: 5 * 60 * 1000,
        max_managers: 2,
        type: "farm_manager"
    }
};

// Farm crop plot data
export const FARM_CROP_PLOT_DATA = {
    "smallCropPlot": {
        name: "Small Crop Plot",
        emoji: "🌱",
        cost: { "gold": 200, "normal logs": 25, "stone": 10 },
        description: "A small tilled plot of land ready for planting seeds.",
        tier: TIERS.COMMON,
        slotCount: 4,
        max_farmhands: 1
    },
    "mediumCropPlot": {
        name: "Medium Crop Plot",
        emoji: "🌾",
        cost: { "gold": 500, "oak logs": 35, "stone": 25 },
        description: "A medium-sized plot of soil for growing larger crops.",
        tier: TIERS.UNCOMMON,
        slotCount: 8,
        max_farmhands: 2
    },
    "largeCropPlot": {
        name: "Large Crop Plot",
        emoji: "🌳",
        cost: { "gold": 1200, "willow logs": 50, "stone": 40, "iron bar": 5 },
        description: "A large plot of fertile land for growing trees and specialty crops.",
        tier: TIERS.RARE,
        slotCount: 16,
        max_farmhands: 3
    }
};

// Seed data for plantable crops
export const SEED_DATA = {
    "carrotSeeds": {
        name: "Carrot Seeds",
        description: "Seeds to grow carrots. Plant in a Small Crop Plot.",
        sell_price: 2,
        emoji: "🥕🌱",
        stackable: true,
        category: "seed",
        tier: TIERS.COMMON,
        plantableOn: "smallCropPlot",
        crop: "carrots",
        growTimeMs: 3 * 60 * 1000, 
        yieldRange: [2, 4],
        xp_gain_on_harvest: 10
    },
    "wheatSeeds": {
        name: "Wheat Seeds",
        description: "Seeds to grow wheat. Plant in a Medium Crop Plot.",
        sell_price: 1,
        emoji: "🌾🌱", 
        stackable: true,
        category: "seed",
        tier: TIERS.COMMON,
        plantableOn: "mediumCropPlot",
        crop: "wheat",
        growTimeMs: 5 * 60 * 1000, 
        yieldRange: [3, 5],
        xp_gain_on_harvest: 15
    },
    "appleSapling": {
        name: "Apple Sapling",
        description: "A young apple tree sapling. Plant in a Large Crop Plot.",
        sell_price: 10, 
        emoji: "🌳🌱",
        stackable: true,
        category: "seed",
        tier: TIERS.UNCOMMON,
        plantableOn: "largeCropPlot",
        crop: "apple",
        growTimeMs: 10 * 60 * 1000, 
        yieldRange: [1, 3],
        xp_gain_on_harvest: 25
    },
    "potatoSeeds": {
        name: "Potato Seeds",
        description: "Seeds to grow potatoes. Plant in a Small Crop Plot.",
        sell_price: 3,
        emoji: "🥔🌱",
        stackable: true,
        category: "seed",
        tier: TIERS.COMMON,
        plantableOn: "smallCropPlot",
        crop: "potato",
        growTimeMs: 4 * 60 * 1000, 
        yieldRange: [2, 3],
        xp_gain_on_harvest: 12
    }
};

export const CROP_ITEMS = {
    "carrots": {
        name: "Carrots",
        description: "Crunchy orange carrots. Used as animal feed and in cooking.",
        sell_price: 3,
        emoji: "🥕",
        stackable: true,
        category: "food_ingredient",
        tier: TIERS.COMMON
    },
    "wheat": {
        name: "Wheat",
        description: "Grains of wheat. Used as animal feed and for baking.",
        sell_price: 2,
        emoji: "🌾",
        stackable: true,
        category: "food_ingredient",
        tier: TIERS.COMMON
    },
    "potato": {
        name: "Potato",
        description: "A starchy, nutritious tuber. Can be cooked into various dishes.",
        sell_price: 4,
        emoji: "🥔",
        stackable: true,
        category: "food_ingredient",
        tier: TIERS.COMMON
    },
    "apple": { // Added missing apple item from appleSapling crop
        name: "Apple",
        description: "A crisp, juicy apple.",
        sell_price: 1, // Matches FOOD_DATA
        heal_amount: 1, // Matches FOOD_DATA
        emoji: "🍎",
        stackable: true,
        category: "food",
        tier: TIERS.COMMON
    }
};

// Animal housing data
export const FARM_ANIMAL_HOUSING_DATA = {
    "chickenCoup": {
        name: "Chicken Coup", emoji: "🐔🏠",
        cost: { "gold": 500, "normal logs": 50, "stone": 20 },
        maxAnimals: 5,
        max_farmhands: 2,
        description: "A cozy coop for chickens. They'll surely lay some eggs here.",
        tier: TIERS.COMMON
    },
    "pigPen": {
        name: "Pig Pen", emoji: "🐷🚧",
        cost: { "gold": 1000, "oak logs": 75, "stone": 50 },
        maxAnimals: 5,
        max_farmhands: 2,
        description: "A sturdy pen for pigs. Promises of pork!",
        tier: TIERS.COMMON
    },
    "sheepPen": {
        name: "Sheep Pen", emoji: "🐑🚧",
        cost: { "gold": 1500, "willow logs": 100, "stone": 75, "iron bar": 10 },
        maxAnimals: 4,
        max_farmhands: 2,
        description: "A comfortable pen for sheep. Expect milk and wool.",
        tier: TIERS.UNCOMMON
    },
    "cowPasture": {
        name: "Cow Pasture", emoji: "🐄🏞️",
        cost: { "gold": 2500, "willow logs": 150, "iron bar": 25, "rope": 10 },
        maxAnimals: 5,
        max_farmhands: 2,
        description: "A spacious pasture for cows. Fresh milk daily!",
        tier: TIERS.UNCOMMON
    }
};

// Animal data
export const FARM_ANIMAL_DATA = {
    "chicken": {
        housingId: "chickenCoup", name: "Chicken", emoji: "🐔",
        produces: "egg",
        intervalMs: 30 * 60 * 1000, // 30 minutes for loot interval
        quantity: [1, 2],
        feed: null,
        cost: { "gold": 1 }
    },
    "pig": {
        housingId: "pigPen", name: "Pig", emoji: "🐷",
        produces: "raw pork",
        intervalMs: 30 * 60 * 1000,
        quantity: [1, 1],
        feed: { "item": "carrots", "amount": 2 },
        cost: { "gold": 200 }
    },
    "sheep": {
        housingId: "sheepPen", name: "Sheep", emoji: "🐑",
        produces: "wool",
        intervalMs: 30 * 60 * 1000,
        quantity: [1, 1],
        feed: { "item": "wheat", "amount": 3 },
        cost: { "gold": 300 }
    },
    "cow": {
        housingId: "cowPasture", name: "Cow", emoji: "🐄",
        produces: "milk",
        intervalMs: 30 * 60 * 1000,
        quantity: [1, 2],
        feed: { "item": "wheat", "amount": 5 },
        cost: { "gold": 500 }
    }
};

export const GUILD_MISSION_TEMPLATES = [
    {
        id: "oreMiningExpedition",
        name: "Ore Mining Expedition",
        description: "Mine for valuable ores in a local cave.",
        difficulty: 2,
        durationHours: 2,
        type: "mining",
        requirements: { members: 2 },
        rewards: { baseGold: 250, baseXp: 125, item: { name: "iron ore", amount: 10 } }
    },
    {
        id: "timberCollection",
        name: "Timber Collection",
        description: "Gather wood for guild upgrades.",
        difficulty: 1,
        durationHours: 1,
        type: "woodcutting",
        requirements: { members: 1 },
        rewards: { baseGold: 100, baseXp: 50, item: { name: "normal logs", amount: 20 } }
    },
    {
        id: "goblinPatrol",
        name: "Goblin Patrol",
        description: "Clear out a nearby goblin patrol.",
        difficulty: 1,
        durationHours: 1,
        type: "combat",
        requirements: { members: 1 },
        rewards: { baseGold: 100, baseXp: 50, item: { name: "goblin beads", amount: 2 } }
    },
    {
        id: "banditCampRaid",
        name: "Bandit Camp Raid",
        description: "Raid a bandit camp to recover stolen ore.",
        difficulty: 3,
        durationHours: 3,
        type: "mixed_fighter_miner",
        requirements: { members: 3 },
        rewards: { baseGold: 500, baseXp: 250, item: { name: "steel bar", amount: 3 } }
    },
    {
        id: "forestAmbush",
        name: "Forest Ambush",
        description: "Defend loggers from monsters in the forest.",
        difficulty: 2,
        durationHours: 2,
        type: "mixed_fighter_lumberjack",
        requirements: { members: 2 },
        rewards: { baseGold: 250, baseXp: 125, item: { name: "oak logs", amount: 15 } }
    },
    {
        id: "strongholdConstruction",
        name: "Stronghold Construction",
        description: "Gather resources and defend workers to build a stronghold.",
        difficulty: 4,
        durationHours: 4,
        type: "mixed_fighter_miner_lumberjack",
        requirements: { members: 4 },
        rewards: { baseGold: 1000, baseXp: 500, item: { name: "mithril bar", amount: 2 } }
    },
    {
        id: "scoutOldPath",
        name: "Scout the Old Path",
        description: "Reconnoiter the overgrown Old King's Path for safe passage.",
        difficulty: 1,
        durationHours: 1.5,
        type: "combat",
        requirements: { members: 1 },
        rewards: { baseGold: 120, baseXp: 60, item: { name: "raw meat", amount: 5 } }
    },
    {
        id: "clearSpiderNests",
        name: "Clear Spider Nests",
        description: "Eradicate spider infestations in the Whispering Caves.",
        difficulty: 1,
        durationHours: 2,
        type: "combat",
        requirements: { members: 2 },
        rewards: { baseGold: 150, baseXp: 75, item: { name: "silk", amount: 10 } }
    },
    {
        id: "gatherFirewoodWinter",
        name: "Gather Firewood for Winter",
        description: "Stockpile a large amount of firewood before the cold season hits.",
        difficulty: 1,
        durationHours: 2.5,
        type: "woodcutting",
        requirements: { members: 1 },
        rewards: { baseGold: 90, baseXp: 45, item: { name: "normal logs", amount: 50 } }
    },
    {
        id: "mineBasicStones",
        name: "Mine Basic Building Stones",
        description: "Quarry basic stones needed for local construction efforts.",
        difficulty: 1,
        durationHours: 2,
        type: "mining",
        requirements: { members: 1 },
        rewards: { baseGold: 80, baseXp: 40, item: { name: "stone", amount: 30 } }
    },
    {
        id: "escortMerchantCaravan",
        name: "Escort Merchant Caravan",
        description: "Protect a valuable merchant caravan through bandit territory.",
        difficulty: 2,
        durationHours: 3,
        type: "mixed_fighter_lumberjack",
        requirements: { members: 2 },
        rewards: { baseGold: 300, baseXp: 150, item: { name: "gold ore", amount: 3 } }
    },
    {
        id: "wolfPackCulling",
        name: "Wolf Pack Culling",
        description: "Reduce the dangerous wolf population threatening nearby farms.",
        difficulty: 2,
        durationHours: 2.5,
        type: "combat",
        requirements: { members: 2 },
        rewards: { baseGold: 280, baseXp: 140, item: { name: "wolf fang", amount: 5 } }
    },
    {
        id: "reinforceVillagePalisade",
        name: "Reinforce Village Palisade",
        description: "Cut and prepare sturdy oak logs to reinforce a vulnerable village's defenses.",
        difficulty: 2,
        durationHours: 3.5,
        type: "woodcutting",
        requirements: { members: 2 },
        rewards: { baseGold: 200, baseXp: 100, item: { name: "oak logs", amount: 40 } }
    },
    {
        id: "ironVeinSurvey",
        name: "Iron Vein Survey",
        description: "Prospect the foothills for new, rich iron veins.",
        difficulty: 2,
        durationHours: 3,
        type: "mining",
        requirements: { members: 2 },
        rewards: { baseGold: 220, baseXp: 110, item: { name: "iron ore", amount: 25 } }
    },
    {
        id: "rescueTrappedMiner",
        name: "Rescue Trapped Miner",
        description: "A miner is trapped in a collapsed section of the Deep Vein Mine. Clear monsters and debris.",
        difficulty: 3,
        durationHours: 4,
        type: "mixed_fighter_miner",
        requirements: { members: 3 },
        rewards: { baseGold: 600, baseXp: 300, item: { name: "health potion (m)", amount: 1 } }
    },
    {
        id: "hauntedCryptExploration",
        name: "Haunted Crypt Exploration",
        description: "Investigate the ancient crypt rumored to be filled with restless spirits and hidden treasures.",
        difficulty: 3,
        durationHours: 3.5,
        type: "combat",
        requirements: { members: 3 },
        rewards: { baseGold: 550, baseXp: 275, item: { name: "bones", amount: 15 } }
    },
    {
        id: "willowGroveHarvest",
        name: "Willow Grove Harvest",
        description: "Harvest flexible willow wood from the protected grove, essential for fine crafting.",
        difficulty: 3,
        durationHours: 4.5,
        type: "woodcutting",
        requirements: { members: 2 },
        rewards: { baseGold: 400, baseXp: 200, item: { name: "willow logs", amount: 30 } }
    },
    {
        id: "coalExpedition",
        name: "Coal Expedition",
        description: "Venture into the Blackscar Mountains to mine large quantities of coal.",
        difficulty: 3,
        durationHours: 5,
        type: "mining",
        requirements: { members: 3 },
        rewards: { baseGold: 450, baseXp: 225, item: { name: "coal", amount: 50 } }
    },
    {
        id: "artifactRecoveryDeepRuins",
        name: "Artifact Recovery: Deep Ruins",
        description: "Retrieve a lost artifact from a heavily guarded, ancient ruin.",
        difficulty: 4,
        durationHours: 6,
        type: "mixed_fighter_miner",
        requirements: { members: 4 },
        rewards: { baseGold: 1200, baseXp: 600, item: { name: "ruby", amount: 1 }, extraItems: [{ name: "ancient_tomes", amount: [15, 25], chance: 0.03 }] }
    },
    {
        id: "ogreChieftainBounty",
        name: "Ogre Chieftain Bounty",
        description: "Track down and defeat the Ogre Chieftain, a brute terrorizing the trade routes.",
        difficulty: 4,
        durationHours: 5,
        type: "combat",
        requirements: { members: 3 },
        rewards: { baseGold: 1100, baseXp: 550, item: { name: "ogre club fragment", amount: 3 } }
    },
    {
        id: "ancientTreeFelling",
        name: "Ancient Tree Felling",
        description: "A colossal, ancient tree needs to be felled. Its wood is legendary, but felling it is a monumental task.",
        difficulty: 4,
        durationHours: 7,
        type: "woodcutting",
        requirements: { members: 3 },
        rewards: { baseGold: 800, baseXp: 400, item: { name: "ancient_tomes", amount: [50, 75] } }
    },
    {
        id: "mithrilSeamExtraction",
        name: "Mithril Seam Extraction",
        description: "Excavate a newly discovered, rich seam of mithril ore deep within a treacherous mountain.",
        difficulty: 4,
        durationHours: 8,
        type: "mining",
        requirements: { members: 4 },
        rewards: { baseGold: 900, baseXp: 450, item: { name: "mithril ore", amount: 20 }, extraItems: [{ name: "ancient_tomes", amount: [10, 20], chance: 0.02 }] }
    },
    {
        id: "demonKingQuest",
        name: "The Demon King's Challenge",
        description: "Confront the Demon King in his fiery domain. This is a true test of strength and resolve.",
        difficulty: 5,
        durationHours: 12,
        type: "combat",
        requirements: { members: 5 },
        rewards: { baseGold: 50000, baseXp: 25000, item: { name: "full dragon helmet", amount: 1 }, extraItems: [{ name: "ancient_tomes", amount: [80, 100], chance: 0.04 }] }
    },
    {
        id: "dragonHoardPlunder",
        name: "Dragon's Hoard Plunder",
        description: "Sneak into a sleeping dragon's lair and make off with as much treasure as possible before it wakes!",
        difficulty: 5,
        durationHours: 8,
        type: "mixed_miner_fighter",
        requirements: { members: 4 },
        rewards: { baseGold: 20000, baseXp: 10000, item: { name: "diamond", amount: 3 }, extraItems: [{ name: "ancient_tomes", amount: [60, 90], chance: 0.04 }] }
    },
    {
        id: "defendCityGates",
        name: "Defend the City Gates",
        description: "A massive horde is approaching! Defend the main city gates until reinforcements arrive.",
        difficulty: 5,
        durationHours: 6,
        type: "combat",
        requirements: { members: 5 },
        rewards: { baseGold: 15000, baseXp: 7500, item: { name: "runite bar", amount: 5 } }
    },
    {
        id: "legendaryForgeQuest",
        name: "Legendary Forge Quest",
        description: "Gather unique, magically imbued materials from across the land and deliver them to a reclusive master smith to forge a legendary artifact for the guild.",
        difficulty: 5,
        durationHours: 24,
        type: "mixed_fighter_miner_lumberjack",
        requirements: { members: 5 },
        rewards: { baseGold: 10000, baseXp: 5000, item: { name: "dragon bar", amount: 1 }, extraItems: [{ name: "ancient_tomes", amount: [70, 100], chance: 0.04 }] }
    }
].map(mission => {
  if (mission.rewards) {
    mission.rewards = {
      ...mission.rewards,
      baseGold: (mission.rewards.baseGold || 0) * 10,
      baseXp: (mission.rewards.baseXp || 0) * 10,
      item: mission.rewards.item ? {
        ...mission.rewards.item,
        amount: (mission.rewards.item.amount || 0) * 10
      } : undefined
    };
  }
  return mission;
});

// Chest drop rates from monsters
export const CHEST_DROP_RATES = {
    "chicken":     { "common chest": 0.02 },                                                      // 2% common only
    "goblin":      { "common chest": 0.05, "uncommon chest": 0.01 },                             // 5% common, 1% uncommon
    "wolf":        { "common chest": 0.06, "uncommon chest": 0.02 },                             // 6% common, 2% uncommon
    "bear":        { "common chest": 0.08, "uncommon chest": 0.03, "rare chest": 0.01 },         // 8% common, 3% uncommon, 1% rare
    "ogre":        { "common chest": 0.10, "uncommon chest": 0.05, "rare chest": 0.02 },         // Higher rates
    "troll":       { "uncommon chest": 0.08, "rare chest": 0.04, "epic chest": 0.01 },           // No common drops
    "giant":       { "uncommon chest": 0.10, "rare chest": 0.06, "epic chest": 0.02 },           
    "demon":       { "rare chest": 0.10, "epic chest": 0.05, "legendary chest": 0.01 },          // High-tier only
    "dark_dragon": { "rare chest": 0.15, "epic chest": 0.10, "legendary chest": 0.03 }           // Best rates
};

// Chest loot tables
export const CHEST_LOOT_TABLES = {
    "common chest": {
        guaranteed: 1,  // Always get 1 item
        rolls: [1, 2],  // 1-2 additional rolls
        loot_pool: [
            // Gold (40% chance)
            { type: "gold", weight: 40, amount: [5, 25] },
            
            // Herbs (25% chance)
            { type: "item", weight: 25, item: "herbs", amount: [2, 5] },
            
            // Basic Materials (20% chance)
            { type: "choice", weight: 20, items: [
                { item: "feathers", amount: [5, 10] },
                { item: "bones", amount: [3, 7] },
                { item: "rope", amount: [1, 3] }
            ]},
            
            // Food (10% chance)
            { type: "choice", weight: 10, items: [
                { item: "cooked meat", amount: [1, 3] },
                { item: "shrimp", amount: [2, 4] }
            ]},
            
            // Logs/Ores (5% chance)
            { type: "choice", weight: 5, items: [
                { item: "normal logs", amount: [5, 10] },
                { item: "copper ore", amount: [3, 6] },
                { item: "tin ore", amount: [3, 6] }
            ]}
        ]
    },
    
    "uncommon chest": {
        guaranteed: 1,
        rolls: [1, 3],
        loot_pool: [
            // Gold (35% chance)
            { type: "gold", weight: 35, amount: [20, 75] },
            
            // Assorted Gems (20% chance)
            { type: "item", weight: 20, item: "gems", amount: [1, 3] },
            
            // Better Materials (20% chance)
            { type: "choice", weight: 20, items: [
                { item: "silk", amount: [2, 5] },
                { item: "wolf fang", amount: [1, 2] },
                { item: "bear claw", amount: [1, 2] }
            ]},
            
            // Herbs Bundle (15% chance)
            { type: "item", weight: 15, item: "herbs", amount: [5, 10] },
            
            // Better Food/Potions (10% chance)
            { type: "choice", weight: 10, items: [
                { item: "health potion (s)", amount: [1, 2] },
                { item: "fish", amount: [2, 4] }
            ]}
        ]
    },
    
    "rare chest": {
        guaranteed: 2,
        rolls: [2, 4],
        loot_pool: [
            // Gold (30% chance)
            { type: "gold", weight: 30, amount: [50, 200] },
            
            // Specific Gems (25% chance)
            { type: "choice", weight: 25, items: [
                { item: "sapphire", amount: 1 },
                { item: "emerald", amount: 1 },
                { item: "ruby", amount: 1 }
            ]},
            
            // Bars (20% chance)
            { type: "choice", weight: 20, items: [
                { item: "iron bar", amount: [2, 4] },
                { item: "steel bar", amount: [1, 2] }
            ]},
            
            // Health Potions (15% chance)
            { type: "choice", weight: 15, items: [
                { item: "health potion (m)", amount: 1 },
                { item: "health potion (s)", amount: [2, 3] }
            ]},
            
            // Rare Materials (8% chance)
            { type: "choice", weight: 8, items: [
                { item: "mana_crystals", amount: [3, 6] },
                { item: "hardwood sap", amount: [2, 4] }
            ]},
            
            // Equipment (2% chance) - RARE!
            { type: "choice", weight: 2, items: [
                { item: "iron axe", amount: 1 },
                { item: "iron pickaxe", amount: 1 },
                { item: "iron 2h sword", amount: 1 }
            ]}
        ]
    },
    
    "epic chest": {
        guaranteed: 2,
        rolls: [3, 5],
        loot_pool: [
            // Gold (25% chance)
            { type: "gold", weight: 25, amount: [150, 500] },
            
            // High-tier Gems (25% chance)
            { type: "choice", weight: 25, items: [
                { item: "ruby", amount: [1, 2] },
                { item: "diamond", amount: 1 }
            ]},
            
            // Better Bars (20% chance)
            { type: "choice", weight: 20, items: [
                { item: "mithril bar", amount: [1, 2] },
                { item: "adamantite bar", amount: 1 }
            ]},
            
            // Large Health Potions (15% chance)
            { type: "item", weight: 15, item: "health potion (l)", amount: 1 },
            
            // Ancient Tomes (10% chance)
            { type: "item", weight: 10, item: "ancient_tomes", amount: [5, 10] },
            
            // Equipment (3% chance) - VERY RARE!
            { type: "choice", weight: 3, items: [
                { item: "mithril chestplate", amount: 1 },
                { item: "mithril axe", amount: 1 },
                { item: "mithril pickaxe", amount: 1 }
            ]},
            
            // Elixir (2% chance) - EXTREMELY RARE!
            { type: "item", weight: 2, item: "elixir of power", amount: 1 }
        ]
    },
    
    "legendary chest": {
        guaranteed: 3,
        rolls: [4, 6],
        loot_pool: [
            // Gold (20% chance)
            { type: "gold", weight: 20, amount: [500, 2000] },
            
            // Dragon Materials (20% chance)
            { type: "choice", weight: 20, items: [
                { item: "dragon scale", amount: [1, 2] },
                { item: "dragon gem", amount: 1 }
            ]},
            
            // Diamond (20% chance)
            { type: "item", weight: 20, item: "diamond", amount: [1, 2] },
            
            // Top Bars (15% chance)
            { type: "choice", weight: 15, items: [
                { item: "runite bar", amount: [1, 2] },
                { item: "dragon bar", amount: 1 }
            ]},
            
            // XL Potions (10% chance)
            { type: "item", weight: 10, item: "health potion (xl)", amount: 1 },
            
            // Ancient Tomes Bundle (10% chance)
            { type: "item", weight: 10, item: "ancient_tomes", amount: [20, 40] },
            
            // Legendary Equipment (3% chance) - ULTRA RARE!
            { type: "choice", weight: 3, items: [
                { item: "rune chestplate", amount: 1 },
                { item: "rune axe", amount: 1 },
                { item: "rune pickaxe", amount: 1 }
            ]},
            
            // Dragon Equipment (1% chance) - MYTHIC RARE!
            { type: "choice", weight: 1, items: [
                { item: "dragon chestplate", amount: 1 },
                { item: "full dragon helmet", amount: 1 }
            ]},
            
            // Elixir (1% chance)
            { type: "item", weight: 1, item: "elixir of power", amount: 1 }
        ]
    }
};

// Guild Level Progression XP (Levels 1-99)
export const GUILD_LEVEL_PROGRESSION_XP = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000,
  21000, 23100, 25300, 27600, 30000, 32500, 35100, 37800, 40600, 43500, 46500, 49600, 52800, 56100, 59500, 63000, 66600, 70300, 74100, 78000,
  82000, 86100, 90300, 94600, 99000, 103500, 108100, 112800, 117600, 122500, 127500, 132600, 137800, 143100, 148500, 154000, 159600, 165300, 171100, 177000,
  183000, 189100, 195300, 201600, 208000, 214500, 221100, 227800, 234600, 241500, 248500, 255600, 262800, 270100, 277500, 285000, 292600, 300300, 308100, 316000,
  324000, 332100, 340300, 348600, 357000, 365500, 374100, 382800, 391600, 400500, 409500, 418600, 427800, 437100, 446500, 456000, 465600, 475300, 485100
];

if (typeof GUILD_UPGRADE_DATA === 'object') {
  const patterns = [
    [2, 15, 35, 60, 99], [5, 20, 40, 70, 99], [8, 25, 50, 80, 99],
    [12, 30, 55, 85, 99], [3, 18, 45, 75, 99]
  ];
  const upgradeOrder = [
    'memberQuarters', 'trainingGrounds', 'advancedWorkshop', 
    'missionBoard', 'reinforcedWalls', 'arcaneLibrary', 'grandHall'
  ];
  upgradeOrder.forEach((upg, i) => {
    if (GUILD_UPGRADE_DATA[upg] && Array.isArray(GUILD_UPGRADE_DATA[upg].levels)) {
      const pattern = patterns[i % patterns.length];
      GUILD_UPGRADE_DATA[upg].levels.forEach((lvl, idx) => {
        lvl.guildLevelReq = pattern[idx];
      });
    }
  });
}

// Enchanting System Data
export const ENCHANTING_TIER_DATA = {
    "common_enchant": {
        name: "Common Enchant",
        description: "A basic enchantment using common gems.",
        cost: { mainResource: "gems", mainResourceQty: 10, gold: 100 },
        level_req: 1,
        xp_gain: 20,
        possibleStatTiers: ["common"],
        maxLines: 2
    },
    "rare_enchant": {
        name: "Rare Enchant", 
        description: "A more potent enchantment using rarer materials.",
        cost: { mainResource: "gems", mainResourceQty: 25, secondaryResource: "sapphire", secondaryResourceQty: 1, gold: 1000 },
        level_req: 25,
        xp_gain: 100,
        possibleStatTiers: ["common", "uncommon", "rare"],
        maxLines: 3
    },
    "epic_enchant": {
        name: "Epic Enchant",
        description: "A powerful enchantment using precious materials.",
        cost: { mainResource: "gems", mainResourceQty: 50, secondaryResource: "ruby", secondaryResourceQty: 2, gold: 5000 },
        level_req: 50,
        xp_gain: 250,
        possibleStatTiers: ["uncommon", "rare", "epic"],
        maxLines: 4
    },
    "legendary_enchant": {
        name: "Legendary Enchant",
        description: "The ultimate enchantment using the rarest gems.",
        cost: { mainResource: "gems", mainResourceQty: 100, secondaryResource: "diamond", secondaryResourceQty: 3, tertiaryResource: "dragon gem", tertiaryResourceQty: 1, gold: 25000 },
        level_req: 75,
        xp_gain: 500,
        possibleStatTiers: ["rare", "epic", "legendary"],
        maxLines: 5
    }
};

export const ENCHANTMENT_STAT_POOL_CONFIG = {
    "damage_flat": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [1, 5],   probabilityWeight: 10 },
            "uncommon":  { valueRange: [6, 12],  probabilityWeight: 5 },
            "rare":      { valueRange: [13, 20], probabilityWeight: 3 },
            "epic":      { valueRange: [21, 30], probabilityWeight: 2 },
            "legendary": { valueRange: [31, 40], probabilityWeight: 1 }
        }
    },
    "damage_percent": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [0.02, 0.05], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.05, 0.10], probabilityWeight: 5 },
            "rare":      { valueRange: [0.10, 0.15], probabilityWeight: 3 },
            "epic":      { valueRange: [0.15, 0.20], probabilityWeight: 2 },
            "legendary": { valueRange: [0.20, 0.25], probabilityWeight: 1 }
        }
    },
    "crit_chance": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [0.01, 0.03], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.03, 0.06], probabilityWeight: 5 },
            "rare":      { valueRange: [0.06, 0.10], probabilityWeight: 3 },
            "epic":      { valueRange: [0.10, 0.15], probabilityWeight: 2 },
            "legendary": { valueRange: [0.15, 0.20], probabilityWeight: 1 }
        }
    },
    "str_percent": {
        appliesTo: ["weapon", "armor", "helmet"],
        tiers: {
            "common":    { valueRange: [0.01, 0.03], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.03, 0.06], probabilityWeight: 5 },
            "rare":      { valueRange: [0.06, 0.09], probabilityWeight: 3 },
            "epic":      { valueRange: [0.09, 0.12], probabilityWeight: 2 },
            "legendary": { valueRange: [0.12, 0.15], probabilityWeight: 1 }
        }
    },
    "luk_percent": {
        appliesTo: ["weapon", "armor", "helmet"],
        tiers: {
            "common":    { valueRange: [0.01, 0.03], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.03, 0.06], probabilityWeight: 5 },
            "rare":      { valueRange: [0.06, 0.09], probabilityWeight: 3 },
            "epic":      { valueRange: [0.09, 0.12], probabilityWeight: 2 },
            "legendary": { valueRange: [0.10, 0.12], probabilityWeight: 1 }
        }
    },
    "defense_percent": {
        appliesTo: ["armor", "helmet"],
        tiers: {
            "common":    { valueRange: [0.02, 0.05], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.05, 0.10], probabilityWeight: 5 },
            "rare":      { valueRange: [0.10, 0.15], probabilityWeight: 3 },
            "epic":      { valueRange: [0.15, 0.20], probabilityWeight: 2 },
            "legendary": { valueRange: [0.20, 0.25], probabilityWeight: 1 }
        }
    },
    "hp_flat": {
        appliesTo: ["armor", "helmet"],
        tiers: {
            "common":    { valueRange: [5, 15],   probabilityWeight: 10 },
            "uncommon":  { valueRange: [15, 30],  probabilityWeight: 5 },
            "rare":      { valueRange: [30, 50],  probabilityWeight: 3 },
            "epic":      { valueRange: [50, 75],  probabilityWeight: 2 },
            "legendary": { valueRange: [75, 100], probabilityWeight: 1 }
        }
    },
    "attack_speed": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [0.05, 0.10], probabilityWeight: 8 },
            "uncommon":  { valueRange: [0.10, 0.15], probabilityWeight: 5 },
            "rare":      { valueRange: [0.15, 0.20], probabilityWeight: 3 },
            "epic":      { valueRange: [0.20, 0.25], probabilityWeight: 2 },
            "legendary": { valueRange: [0.25, 0.30], probabilityWeight: 1 }
        }
    },
    // Gathering tool enchantments
    "gathering_speed": {
        appliesTo: ["axe", "pickaxe"],
        tiers: {
            "common":    { valueRange: [0.05, 0.10], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.10, 0.20], probabilityWeight: 5 },
            "rare":      { valueRange: [0.20, 0.30], probabilityWeight: 3 },
            "epic":      { valueRange: [0.30, 0.40], probabilityWeight: 2 },
            "legendary": { valueRange: [0.40, 0.50], probabilityWeight: 1 }
        }
    },
    "gathering_double_chance": {
        appliesTo: ["axe", "pickaxe"],
        tiers: {
            "common":    { valueRange: [0.05, 0.10], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.10, 0.15], probabilityWeight: 5 },
            "rare":      { valueRange: [0.15, 0.25], probabilityWeight: 3 },
            "epic":      { valueRange: [0.25, 0.35], probabilityWeight: 2 },
            "legendary": { valueRange: [0.35, 0.50], probabilityWeight: 1 }
        }
    },
    "gathering_triple_chance": {
        appliesTo: ["axe", "pickaxe"],
        tiers: {
            "common":    { valueRange: [0.01, 0.02], probabilityWeight: 8 },
            "uncommon":  { valueRange: [0.02, 0.05], probabilityWeight: 5 },
            "rare":      { valueRange: [0.05, 0.10], probabilityWeight: 3 },
            "epic":      { valueRange: [0.10, 0.15], probabilityWeight: 2 },
            "legendary": { valueRange: [0.15, 0.20], probabilityWeight: 1 }
        }
    },
    "gathering_quad_chance": {
        appliesTo: ["axe", "pickaxe"],
        tiers: {
            "common":    { valueRange: [0, 0], probabilityWeight: 0 },
            "uncommon":  { valueRange: [0.01, 0.02], probabilityWeight: 5 },
            "rare":      { valueRange: [0.02, 0.05], probabilityWeight: 3 },
            "epic":      { valueRange: [0.05, 0.08], probabilityWeight: 2 },
            "legendary": { valueRange: [0.08, 0.12], probabilityWeight: 1 }
        }
    },
    "aoe_mining_chance": {
        appliesTo: ["pickaxe"],
        tiers: {
            "common":    { valueRange: [0.05, 0.10], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.10, 0.15], probabilityWeight: 5 },
            "rare":      { valueRange: [0.15, 0.25], probabilityWeight: 3 },
            "epic":      { valueRange: [0.25, 0.35], probabilityWeight: 2 },
            "legendary": { valueRange: [0.35, 0.50], probabilityWeight: 1 }
        }
    },
    "aoe_woodcutting_chance": {
        appliesTo: ["axe"],
        tiers: {
            "common":    { valueRange: [0.05, 0.10], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.10, 0.15], probabilityWeight: 5 },
            "rare":      { valueRange: [0.15, 0.25], probabilityWeight: 3 },
            "epic":      { valueRange: [0.25, 0.35], probabilityWeight: 2 },
            "legendary": { valueRange: [0.35, 0.50], probabilityWeight: 1 }
        }
    },
    "gem_find_chance": {
        appliesTo: ["pickaxe"],
        tiers: {
            "common":    { valueRange: [0.02, 0.05], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.05, 0.10], probabilityWeight: 5 },
            "rare":      { valueRange: [0.10, 0.15], probabilityWeight: 3 },
            "epic":      { valueRange: [0.15, 0.25], probabilityWeight: 2 },
            "legendary": { valueRange: [0.25, 0.35], probabilityWeight: 1 }
        }
    },
    "rare_wood_chance": {
        appliesTo: ["axe"],
        tiers: {
            "common":    { valueRange: [0.02, 0.05], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.05, 0.10], probabilityWeight: 5 },
            "rare":      { valueRange: [0.10, 0.15], probabilityWeight: 3 },
            "epic":      { valueRange: [0.15, 0.25], probabilityWeight: 2 },
            "legendary": { valueRange: [0.25, 0.35], probabilityWeight: 1 }
        }
    },
    "ancient_tome_chance": {
        appliesTo: ["axe", "pickaxe"],
        tiers: {
            "common":    { valueRange: [0.001, 0.002], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.002, 0.005], probabilityWeight: 5 },
            "rare":      { valueRange: [0.005, 0.010], probabilityWeight: 3 },
            "epic":      { valueRange: [0.010, 0.015], probabilityWeight: 2 },
            "legendary": { valueRange: [0.015, 0.025], probabilityWeight: 1 }
        }
    },
    "bonus_hp": {
        appliesTo: ["axe", "pickaxe"],
        tiers: {
            "common":    { valueRange: [5, 10], probabilityWeight: 10 },
            "uncommon":  { valueRange: [10, 20], probabilityWeight: 5 },
            "rare":      { valueRange: [20, 35], probabilityWeight: 3 },
            "epic":      { valueRange: [35, 50], probabilityWeight: 2 },
            "legendary": { valueRange: [50, 75], probabilityWeight: 1 }
        }
    },
    // New Wizard Tower enchantments
    "life_steal": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [0.01, 0.02], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.02, 0.04], probabilityWeight: 5 },
            "rare":      { valueRange: [0.05, 0.06], probabilityWeight: 3 },
            "epic":      { valueRange: [0.07, 0.11], probabilityWeight: 2 },
            "legendary": { valueRange: [0.12, 0.16], probabilityWeight: 1 }
        },
        requires_structure: "wizardTower"
    },
    "fire_damage": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [2, 4], probabilityWeight: 10 },
            "uncommon":  { valueRange: [6, 9], probabilityWeight: 5 },
            "rare":      { valueRange: [10, 16], probabilityWeight: 3 },
            "epic":      { valueRange: [20, 26], probabilityWeight: 2 },
            "legendary": { valueRange: [30, 40], probabilityWeight: 1 }
        },
        requires_structure: "wizardTower"
    },
    "ice_damage": {
        appliesTo: ["weapon"],
        tiers: {
            "common":    { valueRange: [0.05, 0.10], probabilityWeight: 10 },
            "uncommon":  { valueRange: [0.10, 0.15], probabilityWeight: 5 },
            "rare":      { valueRange: [0.15, 0.20], probabilityWeight: 3 },
            "epic":      { valueRange: [0.20, 0.25], probabilityWeight: 2 },
            "legendary": { valueRange: [0.25, 0.30], probabilityWeight: 1 }
        },
        requires_structure: "wizardTower"
    }
};

export const ENCHANTMENT_STAT_TIER_COLORS = {
    common: "tier-common-stat",
    uncommon: "tier-uncommon-stat", 
    rare: "tier-rare-stat",
    epic: "tier-epic-stat",
    legendary: "tier-legendary-stat",
    wizard: "tier-wizard-stat" // Special pink tier for Wizard Tower enchantments
};
