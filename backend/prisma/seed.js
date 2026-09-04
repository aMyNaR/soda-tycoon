// ══════════════════════════════════════════════════════════════
//  SODA TYCOON — Seed Data
//  اجرا: npm run db:seed
// ══════════════════════════════════════════════════════════════
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────── Ingredients (۲۰ ماده اولیه) ───────────
const INGREDIENTS = [
  { key: 'water',    name: 'آب خالص',        emoji: '💧', kind: 'RAW',     basePrice: 5,   price: 5,   rarity: 'COMMON' },
  { key: 'sugar',    name: 'شکر',            emoji: '🍬', kind: 'RAW',     basePrice: 12,  price: 12,  rarity: 'COMMON' },
  { key: 'co2',      name: 'گاز CO₂',        emoji: '💨', kind: 'RAW',     basePrice: 8,   price: 8,   rarity: 'COMMON' },
  { key: 'bottle',   name: 'بطری خالی',      emoji: '🥤', kind: 'BOTTLE',  basePrice: 10,  price: 10,  rarity: 'COMMON' },
  { key: 'cap',      name: 'درب بطری',       emoji: '🧢', kind: 'BOTTLE',  basePrice: 3,   price: 3,   rarity: 'COMMON' },
  { key: 'cola_flavor',     name: 'طعم کولا',       emoji: '🧪', kind: 'FLAVOR',  basePrice: 25,  price: 25,  rarity: 'COMMON' },
  { key: 'lemon_flavor',    name: 'طعم لیمو',       emoji: '🍋', kind: 'FLAVOR',  basePrice: 28,  price: 28,  rarity: 'COMMON' },
  { key: 'orange_flavor',   name: 'طعم پرتقال',     emoji: '🍊', kind: 'FLAVOR',  basePrice: 30,  price: 30,  rarity: 'COMMON' },
  { key: 'grape_flavor',    name: 'طعم انگور',      emoji: '🍇', kind: 'FLAVOR',  basePrice: 35,  price: 35,  rarity: 'UNCOMMON' },
  { key: 'strawberry_flavor', name: 'طعم توت‌فرنگی', emoji: '🍓', kind: 'FLAVOR',  basePrice: 32,  price: 32,  rarity: 'UNCOMMON' },
  { key: 'mango_flavor',    name: 'طعم انبه',       emoji: '🥭', kind: 'FLAVOR',  basePrice: 40,  price: 40,  rarity: 'UNCOMMON' },
  { key: 'apple_flavor',    name: 'طعم سیب‌سبز',    emoji: '🍏', kind: 'FLAVOR',  basePrice: 40,  price: 40,  rarity: 'UNCOMMON' },
  { key: 'cherry_flavor',   name: 'طعم گیلاس',      emoji: '🍒', kind: 'FLAVOR',  basePrice: 45,  price: 45,  rarity: 'UNCOMMON' },
  { key: 'pineapple_flavor',name: 'طعم آناناس',     emoji: '🍍', kind: 'FLAVOR',  basePrice: 48,  price: 48,  rarity: 'RARE' },
  { key: 'blueberry_flavor',name: 'طعم بلوبری',     emoji: '🫐', kind: 'FLAVOR',  basePrice: 50,  price: 50,  rarity: 'RARE' },
  { key: 'energy_formula',  name: 'فرمول انرژی',    emoji: '⚡', kind: 'SPECIAL', basePrice: 80,  price: 80,  rarity: 'RARE' },
  { key: 'galaxy_dust',     name: 'غبار کهکشانی',   emoji: '🌌', kind: 'SPECIAL', basePrice: 120, price: 120, rarity: 'EPIC' },
  { key: 'rainbow_extract', name: 'عصاره رنگین‌کمان',emoji: '🌈', kind: 'SPECIAL', basePrice: 150, price: 150, rarity: 'EPIC' },
  { key: 'diamond_dust',    name: 'غبار الماس',     emoji: '💎', kind: 'SPECIAL', basePrice: 200, price: 200, rarity: 'LEGENDARY' },
  { key: 'royal_honey',     name: 'عسل سلطنتی',     emoji: '👑', kind: 'SPECIAL', basePrice: 180, price: 180, rarity: 'LEGENDARY' },
];

// ─────────── Recipes (۲۰+ فرمول) ───────────
const R = (key, name, emoji, flavor, rarity, requiredLevel, basePrice, productionMin, batchSize, xpReward, demand, qualityBonus, ing) =>
  ({ key, name, emoji, flavor, rarity, requiredLevel, basePrice, productionMs: productionMin * 60000, batchSize, xpReward, demand, qualityBonus, ing });

const RECIPES = [
  R('classic_cola',    'Classic Cola',      '🥤', 'COLA',       'COMMON', 1,  35,  2,  10, 10, 1.0, 0,   [['water',2],['sugar',2],['cola_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('lemon_soda',      'Lemon Soda',        '🍋', 'LEMON',      'COMMON', 1,  38,  2,  10, 11, 1.0, 0,   [['water',2],['sugar',2],['lemon_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('orange_soda',     'Orange Soda',       '🍊', 'ORANGE',     'COMMON', 2,  42,  3,  10, 13, 1.1, 0,   [['water',2],['sugar',3],['orange_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('grape_soda',      'Grape Soda',        '🍇', 'GRAPE',      'COMMON', 3,  48,  3,  10, 15, 1.1, 2,   [['water',2],['sugar',3],['grape_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('strawberry_soda', 'Strawberry Soda',   '🍓', 'STRAWBERRY', 'COMMON', 4,  52,  4,  10, 17, 1.2, 2,   [['water',2],['sugar',3],['strawberry_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('mango_soda',      'Mango Soda',        '🥭', 'MANGO',      'UNCOMMON',6,  65,  5,  12, 22, 1.2, 3,   [['water',2],['sugar',3],['mango_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('green_apple_soda','Green Apple Soda',  '🍏', 'APPLE',      'UNCOMMON',8,  68,  5,  12, 24, 1.2, 3,   [['water',2],['sugar',3],['apple_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('cherry_soda',     'Cherry Soda',       '🍒', 'CHERRY',     'UNCOMMON',10, 72,  6,  12, 26, 1.3, 4,   [['water',2],['sugar',4],['cherry_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('pineapple_soda',  'Pineapple Soda',    '🍍', 'PINEAPPLE',  'RARE',   13, 85,  7,  14, 30, 1.3, 4,   [['water',3],['sugar',4],['pineapple_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('blueberry_soda',  'Blueberry Soda',    '🫐', 'BLUEBERRY',  'RARE',   16, 90,  8,  14, 33, 1.4, 5,   [['water',3],['sugar',4],['blueberry_flavor',1],['co2',1],['bottle',1],['cap',1]]),
  R('energy_soda',     'Energy Soda',       '⚡', 'ENERGY',     'RARE',   19, 120, 9,  15, 40, 1.4, 6,   [['water',3],['sugar',5],['energy_formula',1],['co2',2],['bottle',1],['cap',1]]),
  R('fire_soda',       'Fire Soda',         '🔥', 'FIRE',       'RARE',   22, 135, 10, 15, 45, 1.4, 6,   [['water',3],['sugar',5],['cherry_flavor',2],['energy_formula',1],['co2',2],['bottle',1],['cap',1]]),
  R('ice_soda',        'Ice Soda',          '❄️', 'ICE',        'RARE',   25, 140, 10, 15, 48, 1.4, 7,   [['water',3],['sugar',5],['lemon_flavor',2],['co2',2],['bottle',1],['cap',1]]),
  R('rainbow_soda',    'Rainbow Soda',      '🌈', 'RAINBOW',    'EPIC',   30, 200, 14, 18, 60, 1.5, 8,   [['water',4],['sugar',6],['rainbow_extract',1],['co2',2],['bottle',1],['cap',1]]),
  R('galaxy_soda',     'Galaxy Soda',       '🌌', 'GALAXY',     'EPIC',   35, 220, 16, 18, 65, 1.5, 9,   [['water',4],['sugar',6],['galaxy_dust',1],['co2',2],['bottle',1],['cap',1]]),
  R('diamond_fizz',    'Diamond Fizz',      '💎', 'DIAMOND',    'EPIC',   40, 260, 18, 20, 72, 1.5, 10,  [['water',4],['sugar',6],['diamond_dust',1],['co2',2],['bottle',1],['cap',1]]),
  R('royal_soda',      'Royal Soda',        '👑', 'ROYAL',      'EPIC',   45, 280, 20, 20, 78, 1.5, 10,  [['water',4],['sugar',6],['royal_honey',1],['co2',2],['bottle',1],['cap',1]]),
  R('cosmic_cola',     'Cosmic Cola',       '🌠', 'COSMIC',     'EPIC',   50, 310, 22, 22, 85, 1.6, 11,  [['water',4],['sugar',7],['cola_flavor',2],['galaxy_dust',1],['co2',3],['bottle',1],['cap',1]]),
  R('galaxy_elixir',   'Galaxy Elixir',     '🌌', 'GALAXY',     'LEGENDARY',60,380, 26, 24, 95, 1.7, 12,  [['water',5],['sugar',8],['galaxy_dust',2],['diamond_dust',1],['co2',3],['bottle',1],['cap',1]]),
  R('emperor_fizz',    'Emperor Fizz',      '👑', 'ROYAL',      'LEGENDARY',70,420, 30, 26, 110,1.7, 13,  [['water',5],['sugar',8],['royal_honey',2],['rainbow_extract',1],['co2',3],['bottle',1],['cap',1]]),
  R('infinite_soda',   'Infinite Soda',     '💎', 'DIAMOND',    'LEGENDARY',80,480, 35, 30, 125,1.8, 15,  [['water',5],['sugar',10],['diamond_dust',2],['rainbow_extract',1],['co2',4],['bottle',1],['cap',1]]),
  R('strawberry_lemon_energy', 'Strawberry Lemon Energy', '⚡⚡', 'CUSTOM', 'RARE', 12, 110, 8, 14, 38, 1.4, 6, [['water',3],['sugar',4],['strawberry_flavor',1],['lemon_flavor',1],['energy_formula',1],['co2',2],['bottle',1],['cap',1]]),
];

// ─────────── Bottles (۱۰ بطری کلکسیونی) ───────────
const BOTTLES = [
  { key: 'classic_bottle',   name: 'Classic Bottle',   emoji: '🥤', rarity: 'COMMON',    value: 50 },
  { key: 'lemon_bottle',     name: 'Lemon Bottle',     emoji: '🍋', rarity: 'COMMON',    value: 60 },
  { key: 'orange_bottle',    name: 'Orange Bottle',    emoji: '🍊', rarity: 'UNCOMMON',  value: 120 },
  { key: 'grape_bottle',     name: 'Grape Bottle',     emoji: '🍇', rarity: 'UNCOMMON',  value: 140 },
  { key: 'energy_bottle',    name: 'Energy Bottle',    emoji: '⚡', rarity: 'RARE',      value: 300 },
  { key: 'galaxy_bottle',    name: 'Galaxy Bottle',    emoji: '🌌', rarity: 'RARE',      value: 350 },
  { key: 'rainbow_bottle',   name: 'Rainbow Bottle',   emoji: '🌈', rarity: 'EPIC',      value: 700 },
  { key: 'diamond_bottle',   name: 'Diamond Bottle',   emoji: '💎', rarity: 'EPIC',      value: 900 },
  { key: 'golden_bottle',    name: 'Golden Bottle',    emoji: '👑', rarity: 'LEGENDARY', value: 1500, bonus: { type: 'SALE_PRICE', percent: 5 } },
  { key: 'mythic_bottle',    name: 'Mythic Fizz Bottle', emoji: '🔥', rarity: 'MYTHIC', value: 3000, bonus: { type: 'PRODUCTION', percent: 10 } },
];

// ─────────── Cities (۸ شهر) ───────────
const CITIES = [
  { key: 'tehran',  name: 'تهران',    emoji: '🏙️', requiredLevel: 1,  priceMultiplier: 1.0,  deliveryMin: 30,  deliveryCost: 50,   popularFlavor: 'COLA' },
  { key: 'dubai',   name: 'دبی',      emoji: '🌆', requiredLevel: 5,  priceMultiplier: 1.2,  deliveryMin: 60,  deliveryCost: 120,  popularFlavor: 'MANGO' },
  { key: 'istanbul',name: 'استانبول', emoji: '🕌', requiredLevel: 8,  priceMultiplier: 1.3,  deliveryMin: 90,  deliveryCost: 180,  popularFlavor: 'LEMON' },
  { key: 'paris',   name: 'پاریس',    emoji: '🗼', requiredLevel: 12, priceMultiplier: 1.5,  deliveryMin: 120, deliveryCost: 260,  popularFlavor: 'ORANGE' },
  { key: 'tokyo',   name: 'توکیو',    emoji: '🌃', requiredLevel: 18, priceMultiplier: 1.7,  deliveryMin: 150, deliveryCost: 340,  popularFlavor: 'GRAPE' },
  { key: 'newyork', name: 'نیویورک',  emoji: '🗽', requiredLevel: 25, priceMultiplier: 1.9,  deliveryMin: 180, deliveryCost: 420,  popularFlavor: 'COLA' },
  { key: 'london',  name: 'لندن',     emoji: '🌉', requiredLevel: 33, priceMultiplier: 2.1,  deliveryMin: 210, deliveryCost: 500,  popularFlavor: 'STRAWBERRY' },
  { key: 'seoul',   name: 'سئول',     emoji: '🏙️', requiredLevel: 42, priceMultiplier: 2.4,  deliveryMin: 240, deliveryCost: 600,  popularFlavor: 'BLUEBERRY' },
];

// ─────────── Achievements (۱۰+) ───────────
const ACHIEVEMENTS = [
  { key: 'first_soda',     name: 'اولین نوشابه',        emoji: '🥤', description: 'اولین نوشابه خود را تولید کن',          condition: { type: 'TOTAL_PRODUCED', target: 1 },    rewardCoins: 200,  rewardXp: 20 },
  { key: 'first_factory',  name: 'ساخت اولین کارخانه',  emoji: '🏭', description: 'اولین ارتقای کارخانه را انجام بده',     condition: { type: 'FACTORY_TIER',   target: 2 },    rewardCoins: 500,  rewardXp: 30 },
  { key: 'rich_100k',      name: 'ثروتمند',             emoji: '💰', description: 'به ۱۰۰٬۰۰۰ کوین برس',                   condition: { type: 'COINS_EARNED',   target: 100000 }, rewardGems: 5, rewardXp: 50 },
  { key: 'first_market',   name: 'بازار جهانی',         emoji: '🌎', description: 'اولین بازار خارجی را باز کن',           condition: { type: 'CITIES_UNLOCKED',target: 2 },    rewardCoins: 800,  rewardXp: 40 },
  { key: 'level_30',       name: 'Soda Tycoon',         emoji: '👑', description: 'به Level 30 برس',                        condition: { type: 'LEVEL',          target: 30 },   rewardGems: 20, title: '👑 Soda Tycoon' },
  { key: 'mythic_bottle',  name: 'شکار Mythic',         emoji: '💎', description: 'یک بطری Mythic پیدا کن',                condition: { type: 'MYTHIC_BOTTLE',  target: 1 },    rewardGems: 25 },
  { key: 'delivery_100',   name: 'کاروان‌سالار',        emoji: '🚚', description: '۱۰۰ ارسال کامل کن',                     condition: { type: 'TOTAL_DELIVERIES',target: 100 }, rewardGems: 10, rewardXp: 100 },
  { key: 'produced_1k',    name: 'کارخانه‌دار واقعی',   emoji: '🏭', description: '۱٬۰۰۰ نوشابه تولید کن',                 condition: { type: 'TOTAL_PRODUCED', target: 1000 }, rewardCoins: 5000, rewardGems: 5 },
  { key: 'sold_500',       name: 'تاجر نوشابه',         emoji: '📈', description: '۵۰۰ بطری بفروش',                        condition: { type: 'TOTAL_SOLD',     target: 500 },  rewardCoins: 3000 },
  { key: 'lab_creator',    name: 'شیمی‌دان',            emoji: '🧪', description: 'اولین فرمول اختصاصی را در آزمایشگاه بساز', condition: { type: 'CUSTOM_RECIPE', target: 1 }, rewardGems: 8 },
  { key: 'collector_50',   name: 'کلکسیونر',            emoji: '🧴', description: '۵ بطری متمایز جمع کن',                  condition: { type: 'BOTTLES_OWNED',  target: 5 },    rewardGems: 6 },
  { key: 'friend_3',       name: 'م Social',            emoji: '👥', description: '۳ دوست اضافه کن',                       condition: { type: 'FRIENDS_COUNT',  target: 3 },    rewardCoins: 1000 },
];

// ─────────── Missions (روزانه + هفتگی) ───────────
const MISSIONS = [
  { key: 'daily_produce_100', kind: 'DAILY',  name: 'تولید انبوه',        emoji: '🥤', description: '۱۰۰ نوشابه تولید کن',    condition: { type: 'PRODUCE', target: 100 },  rewardCoins: 800,  rewardXp: 40 },
  { key: 'daily_sell_50',     kind: 'DAILY',  name: 'فروش روزانه',        emoji: '💰', description: '۵۰ بطری بفروش',           condition: { type: 'SELL',    target: 50 },   rewardCoins: 600,  rewardXp: 30 },
  { key: 'daily_upgrade_1',   kind: 'DAILY',  name: 'بهسازی',             emoji: '🔧', description: 'یک ارتقا انجام بده',      condition: { type: 'UPGRADE', target: 1 },    rewardCoins: 400,  rewardXp: 25 },
  { key: 'daily_ship_3',      kind: 'DAILY',  name: 'لجستیک',             emoji: '🚚', description: '۳ ارسال انجام بده',       condition: { type: 'DELIVERY',target: 3 },    rewardCoins: 700,  rewardXp: 35 },
  { key: 'daily_minigame_2',  kind: 'DAILY',  name: 'استراحت کارگری',     emoji: '🎮', description: '۲ بازی مینی‌گیم انجام بده', condition: { type: 'MINIGAME', target: 2 },  rewardCoins: 500,  rewardXp: 30 },
  { key: 'weekly_produce_1k', kind: 'WEEKLY', name: 'تولید هفتگی',        emoji: '🏭', description: '۱٬۰۰۰ نوشابه در هفته تولید کن', condition: { type: 'PRODUCE', target: 1000 }, rewardGems: 3, rewardXp: 150 },
  { key: 'weekly_coins',      kind: 'WEEKLY', name: 'گردش مالی هفته',     emoji: '💰', description: '۲۰٬۰۰۰ کوین درآمد کسب کن', condition: { type: 'EARN',   target: 20000 }, rewardGems: 4, rewardXp: 180 },
  { key: 'weekly_city',       kind: 'WEEKLY', name: 'گسترش امپراتوری',    emoji: '🌎', description: 'یک شهر جدید باز کن',      condition: { type: 'UNLOCK_CITY', target: 1 }, rewardGems: 5, rewardXp: 200 },
  { key: 'weekly_upgrade',    kind: 'WEEKLY', name: 'نوسازی کارخانه',     emoji: '🏗️', description: '۵ ارتقا در هفته انجام بده', condition: { type: 'UPGRADE', target: 5 }, rewardGems: 3, rewardXp: 120 },
  { key: 'event_any',         kind: 'EVENT',  name: 'مأموریت رویداد',    emoji: '🎉', description: 'در رویداد فعال شرکت کن',  condition: { type: 'EVENT_PARTICIPATE', target: 1 }, rewardGems: 2 },
];

// ─────────── Daily Rewards (۷ روز) ───────────
const DAILY_REWARDS = [
  { day: 1, kind: 'COIN',  quantity: 500,  label: '۵۰۰ کوین',        emoji: '🪙' },
  { day: 2, kind: 'COIN',  quantity: 1000, label: '۱٬۰۰۰ کوین',      emoji: '🪙' },
  { day: 3, kind: 'ITEM',  key: 'sugar', quantity: 50, label: '۵۰ شکر رایگان', emoji: '🍬' },
  { day: 4, kind: 'BOOST', key: 'prod_x2', quantity: 30, label: '۳۰ دقیقه تولید ×۲', emoji: '⚡' },
  { day: 5, kind: 'ITEM',  key: 'pineapple_flavor', quantity: 10, label: '۱۰ طعم آناناس Rare', emoji: '🍍' },
  { day: 6, kind: 'GEM',   quantity: 10,   label: '۱۰ Fizz Gem',     emoji: '💎' },
  { day: 7, kind: 'BOX',   key: 'premium_box', quantity: 1, label: 'Mystery Box پریمیوم', emoji: '🎁' },
];

// ─────────── Boxes ───────────
const BOXES = [
  { key: 'soda_box',     name: 'Soda Box',     emoji: '📦', rarity: 'COMMON',    coinCost: 500,   gemCost: 0, items: [
    { kind: 'COIN', quantity: 300,  weight: 35, label: '۳۰۰ کوین', emoji: '🪙' },
    { kind: 'INGREDIENT', key: 'sugar', quantity: 30, weight: 25, label: '۳۰ شکر', emoji: '🍬' },
    { kind: 'INGREDIENT', key: 'cola_flavor', quantity: 10, weight: 20, label: '۱۰ طعم کولا', emoji: '🧪' },
    { kind: 'COIN', quantity: 1200, weight: 15, label: '۱٬۲۰۰ کوین', emoji: '🪙' },
    { kind: 'BOTTLE', key: 'lemon_bottle', quantity: 1, weight: 5, label: 'Lemon Bottle', emoji: '🍋' },
  ]},
  { key: 'premium_box',  name: 'Premium Box',  emoji: '🎁', rarity: 'RARE',      coinCost: 2500,  gemCost: 5, items: [
    { kind: 'COIN', quantity: 2000, weight: 30, label: '۲٬۰۰۰ کوین', emoji: '🪙' },
    { kind: 'INGREDIENT', key: 'energy_formula', quantity: 5, weight: 22, label: '۵ فرمول انرژی', emoji: '⚡' },
    { kind: 'BOOST', key: 'sale_x2', quantity: 30, weight: 18, label: '۳۰ دقیقه فروش ×۲', emoji: '💰' },
    { kind: 'GEM', quantity: 8, weight: 15, label: '۸ گم', emoji: '💎' },
    { kind: 'BOTTLE', key: 'energy_bottle', quantity: 1, weight: 10, label: 'Energy Bottle', emoji: '⚡' },
    { kind: 'BOTTLE', key: 'galaxy_bottle', quantity: 1, weight: 5, label: 'Galaxy Bottle', emoji: '🌌' },
  ]},
  { key: 'rare_box',     name: 'Rare Box',     emoji: '💎', rarity: 'EPIC',      coinCost: 8000,  gemCost: 20, items: [
    { kind: 'GEM', quantity: 25, weight: 28, label: '۲۵ گم', emoji: '💎' },
    { kind: 'INGREDIENT', key: 'galaxy_dust', quantity: 3, weight: 24, label: '۳ غبار کهکشانی', emoji: '🌌' },
    { kind: 'BOOST', key: 'prod_x2', quantity: 60, weight: 18, label: '۶۰ دقیقه تولید ×۲', emoji: '⚡' },
    { kind: 'BOTTLE', key: 'rainbow_bottle', quantity: 1, weight: 15, label: 'Rainbow Bottle', emoji: '🌈' },
    { kind: 'COIN', quantity: 8000, weight: 10, label: '۸٬۰۰۰ کوین', emoji: '🪙' },
    { kind: 'BOTTLE', key: 'diamond_bottle', quantity: 1, weight: 5, label: 'Diamond Bottle', emoji: '💎' },
  ]},
  { key: 'legendary_box',name: 'Legendary Box',emoji: '👑', rarity: 'LEGENDARY', coinCost: 25000, gemCost: 60, items: [
    { kind: 'GEM', quantity: 80, weight: 25, label: '۸۰ گم', emoji: '💎' },
    { kind: 'BOTTLE', key: 'golden_bottle', quantity: 1, weight: 22, label: 'Golden Bottle 👑', emoji: '👑' },
    { kind: 'INGREDIENT', key: 'diamond_dust', quantity: 5, weight: 20, label: '۵ غبار الماس', emoji: '💎' },
    { kind: 'BOTTLE', key: 'mythic_bottle', quantity: 1, weight: 8, label: 'Mythic Fizz Bottle 🔥', emoji: '🔥' },
    { kind: 'BOOST', key: 'quality', quantity: 60, weight: 15, label: '۶۰ دقیقه کیفیت+', emoji: '✨' },
    { kind: 'COIN', quantity: 20000, weight: 10, label: '۲۰٬۰۰۰ کوین', emoji: '🪙' },
  ]},
];

// ─────────── Boosts ───────────
const BOOSTS = [
  { key: 'prod_x2',   name: 'تولید ×۲',       emoji: '⚡', type: 'PRODUCTION_X2',   percent: 100, durationMin: 30, gemCost: 3 },
  { key: 'prod_fast', name: 'تولید سریع',      emoji: '🏭', type: 'PRODUCTION_SPEED',percent: 50,  durationMin: 60, gemCost: 4 },
  { key: 'sale_x2',   name: 'فروش ×۲',         emoji: '💰', type: 'SALE_PRICE',      percent: 100, durationMin: 30, gemCost: 4 },
  { key: 'ship_fast', name: 'ارسال فوری',      emoji: '🚀', type: 'SHIP_SPEED',      percent: 100, durationMin: 60, gemCost: 3 },
  { key: 'storage',   name: 'انبار بزرگ',      emoji: '📦', type: 'STORAGE',         percent: 100, durationMin: 120, gemCost: 2 },
  { key: 'quality',   name: 'کیفیت+',          emoji: '✨', type: 'QUALITY',         percent: 25,  durationMin: 60, gemCost: 5 },
];

// ─────────── Vehicles ─────────── (تنظیمات — در کد هم استفاده می‌شود)
const VEHICLES = {
  TRUCK: { name: '🚚 کامیون', capacity: 100, speedMult: 1.0, costMult: 1.0, requiredLevel: 1 },
  SHIP:  { name: '🚢 کشتی',   capacity: 400, speedMult: 0.8, costMult: 0.7, requiredLevel: 10 },
  PLANE: { name: '✈️ هواپیما',capacity: 200, speedMult: 2.0, costMult: 1.5, requiredLevel: 20 },
};

// ─────────── Factory Tiers ───────────
const FACTORY_TIERS = [
  { tier: 1, name: 'کارگاه کوچک',       emoji: '🛖', cost: 0,     requiredLevel: 1 },
  { tier: 2, name: 'کارخانه کوچک',      emoji: '🏚️', cost: 5000,  requiredLevel: 5 },
  { tier: 3, name: 'کارخانه مدرن',      emoji: '🏭', cost: 25000, requiredLevel: 12 },
  { tier: 4, name: 'کارخانه صنعتی',     emoji: '🏢', cost: 100000, requiredLevel: 22 },
  { tier: 5, name: 'مگا کارخانه',       emoji: '🏛️', cost: 400000, requiredLevel: 35 },
  { tier: 6, name: 'امپراتوری نوشابه',  emoji: '🌎', cost: 1500000, requiredLevel: 50 },
  { tier: 7, name: 'SODA TYCOON HQ',    emoji: '👑', cost: 6000000, requiredLevel: 70 },
];

// ─────────── Game Settings ───────────
const SETTINGS = {
  xp_multiplier: '1.0',
  coin_multiplier: '1.0',
  gem_reward_multiplier: '1.0',
  production_speed_mult: '1.0',
  market_volatility: '0.15',
  referral_join_coins: '500',
  referral_join_gems: '2',
  referral_level5_coins: '1500',
  referral_level10_coins: '3000',
  referral_level10_gems: '10',
  gift_daily_limit: '5',
  minigame_daily_reward_limit: '10',
  minigame_max_score: JSON.stringify({ BOTTLE_RUSH: 100, CAP_TOSS: 100, FIZZ_REACTION: 100, FACTORY_RUSH: 100 }),
  lab_experiment_cost: '200',
  lab_success_rate: '60',
  welcome_message: '🥤 به SODA TYCOON خوش آمدی! امپراتوری نوشابه خودت را بساز.',
  broadcast_enabled: 'true',
};

// ─────────── Promo Codes (نمونه) ───────────
const PROMO_CODES = [
  { code: 'SODA2026',   kind: 'COIN', quantity: 1000, maxUses: 0, perUserLimit: 1 },
  { code: 'FIZZ2026',   kind: 'GEM',  quantity: 5,    maxUses: 0, perUserLimit: 1 },
  { code: 'LAUNCHDAY',  kind: 'ITEM', key: 'sugar', quantity: 100, maxUses: 1000, perUserLimit: 1 },
  { code: 'COLA1000',   kind: 'COIN', quantity: 1000, maxUses: 500, perUserLimit: 1 },
];

// ─────────── Events (نمونه) ───────────
const now = Date.now();
const EVENTS = [
  { key: 'summer_festival', name: '☀️ Summer Soda Festival', emoji: '☀️', description: 'فستیوال تابستانی نوشابه! قیمت فروش +۲۰٪ و XP ×۱.۵',
    config: { priceMultiplier: 1.2, xpMultiplier: 1.5, limitedRecipeKeys: ['mango_soda'] },
    startsAt: new Date(now - 86400000), endsAt: new Date(now + 7 * 86400000), active: true },
  { key: 'energy_week', name: '⚡ Energy Week', emoji: '⚡', description: 'هفته انرژی! تولید ۲۰٪ سریع‌تر',
    config: { prodSpeedMultiplier: 1.2 },
    startsAt: new Date(now + 14 * 86400000), endsAt: new Date(now + 21 * 86400000), active: true },
  { key: 'cosmic_event', name: '🌌 Cosmic Soda Event', emoji: '🌌', description: 'رویداد کهکشانی — Galaxy Soda تقاضای دوبرابر',
    config: { demandBoost: { GALAXY: 2.0 }, xpMultiplier: 1.3 },
    startsAt: new Date(now + 30 * 86400000), endsAt: new Date(now + 37 * 86400000), active: true },
];

// سازگار با هر دو نوع ستون Json و String: آبجکت‌ها همیشه serialize می‌شوند
// (asJSON در سمت کد هر دو حالت را می‌فهمد)
const SJ = (v) => (v != null && typeof v === 'object' ? JSON.stringify(v) : v);

// ═══════════════════════════ SEED RUNNER ═══════════════════════════
async function main() {
  console.log('🌱 Seeding SODA TYCOON ...');

  for (const i of INGREDIENTS) {
    await prisma.ingredient.upsert({ where: { key: i.key }, update: { price: i.price }, create: i });
  }
  for (const b of BOTTLES) {
    await prisma.bottle.upsert({ where: { key: b.key }, update: {}, create: { ...b, bonus: SJ(b.bonus) } });
  }
  for (const r of RECIPES) {
    const { ing, ...data } = r;
    await prisma.recipe.upsert({
      where: { key: r.key }, update: {},
      create: {
        ...data,
        ingredients: { create: ing.map(([ikey, q]) => ({ quantity: q, ingredient: { connect: { key: ikey } } })) },
      },
    });
  }
  for (const c of CITIES) {
    const { deliveryMin, ...data } = c;
    await prisma.city.upsert({ where: { key: c.key }, update: {}, create: { ...data, deliveryMs: c.deliveryMin * 60000 } });
  }
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: {}, create: { ...a, condition: SJ(a.condition) } });
  }
  for (const m of MISSIONS) {
    await prisma.mission.upsert({ where: { key: m.key }, update: {}, create: { ...m, condition: SJ(m.condition) } });
  }
  for (const d of DAILY_REWARDS) {
    await prisma.dailyReward.upsert({ where: { day: d.day }, update: {}, create: d });
  }
  for (const b of BOXES) {
    await prisma.box.upsert({
      where: { key: b.key }, update: {},
      create: { key: b.key, name: b.name, emoji: b.emoji, rarity: b.rarity, coinCost: b.coinCost, gemCost: b.gemCost, items: { create: b.items } },
    });
  }
  for (const b of BOOSTS) {
    await prisma.boost.upsert({ where: { key: b.key }, update: {}, create: b });
  }
  for (const p of PROMO_CODES) {
    await prisma.promoCode.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  for (const e of EVENTS) {
    await prisma.gameEvent.upsert({ where: { key: e.key }, update: {}, create: { ...e, config: SJ(e.config) } });
  }
  for (const [k, v] of Object.entries(SETTINGS)) {
    await prisma.gameSetting.upsert({ where: { key: k }, update: {}, create: { key: k, value: String(v) } });
  }
  // VEHICLES هم در game_settings ذخیره می‌شود تا از پنل قابل تغییر باشد
  await prisma.gameSetting.upsert({ where: { key: 'vehicles' }, update: {}, create: { key: 'vehicles', value: JSON.stringify(VEHICLES) } });
  await prisma.gameSetting.upsert({ where: { key: 'factory_tiers' }, update: {}, create: { key: 'factory_tiers', value: JSON.stringify(FACTORY_TIERS) } });

  console.log('✅ Seed completed!');
  console.log(`   ${INGREDIENTS.length} ingredients, ${RECIPES.length} recipes, ${BOTTLES.length} bottles, ${CITIES.length} cities`);
  console.log(`   ${ACHIEVEMENTS.length} achievements, ${MISSIONS.length} missions, ${BOXES.length} boxes, ${BOOSTS.length} boosts`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
