// ─── SCOUT CAMP MEAL RECIPES LIBRARY & PORTION DEFAULTS ────────────────────────

export interface RecipeIngredientTemplate {
  name: string
  portion_per_person: number // portion in specified unit per 1 person
  unit: 'g' | 'kg' | 'pieces' | 'cans' | 'loaves' | 'packs' | 'ml' | 'liters'
  category: 'bakery' | 'butchery' | 'produce' | 'supermarket' | 'pantry' | 'supplies'
}

export interface MealRecipeTemplate {
  id: string
  name: string
  nameAr: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  ingredients: RecipeIngredientTemplate[]
}

export const SCOUT_RECIPES_LIBRARY: MealRecipeTemplate[] = [
  // ── BREAKFAST ──────────────────────────────────────────────────────────────
  {
    id: 'breakfast_labneh_zaatar',
    name: 'Labneh & Zaatar Spread',
    nameAr: 'ترويقة لبنة وزعتر وخضرة',
    meal_type: 'breakfast',
    description: 'Fresh labneh, wild thyme zaatar, extra virgin olive oil, cucumber, tomatoes & pita bread.',
    ingredients: [
      { name: 'Labneh (Fresh/Baladi)', portion_per_person: 50, unit: 'g', category: 'supermarket' },
      { name: 'Zaatar Blend', portion_per_person: 15, unit: 'g', category: 'pantry' },
      { name: 'Olive Oil', portion_per_person: 20, unit: 'ml', category: 'pantry' },
      { name: 'Pita Bread (Khobz Arabi)', portion_per_person: 1.5, unit: 'loaves', category: 'bakery' },
      { name: 'Cucumbers (Khiyar)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
      { name: 'Tomatoes (Banadoura)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
      { name: 'Black Olives', portion_per_person: 20, unit: 'g', category: 'pantry' },
    ],
  },
  {
    id: 'breakfast_boiled_eggs_halloumi',
    name: 'Boiled Eggs & Grilled Halloumi',
    nameAr: 'بيض مسلوق وجبنة حلوم',
    meal_type: 'breakfast',
    description: 'Farm boiled eggs, sliced halloumi cheese, fresh tomatoes & pita bread.',
    ingredients: [
      { name: 'Eggs (Bayd)', portion_per_person: 2, unit: 'pieces', category: 'supermarket' },
      { name: 'Halloumi Cheese', portion_per_person: 60, unit: 'g', category: 'supermarket' },
      { name: 'Pita Bread (Khobz Arabi)', portion_per_person: 1.5, unit: 'loaves', category: 'bakery' },
      { name: 'Tomatoes (Banadoura)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
      { name: 'Black Olives', portion_per_person: 20, unit: 'g', category: 'pantry' },
    ],
  },
  {
    id: 'breakfast_foul_mdammas',
    name: 'Foul Mdammas with Tahini & Lemon',
    nameAr: 'فول مدمس مع طحينة وحامض',
    meal_type: 'breakfast',
    description: 'Warm seasoned fava beans with garlic, tahini, lemon juice, olive oil & cumin.',
    ingredients: [
      { name: 'Canned Fava Beans (Foul)', portion_per_person: 0.25, unit: 'cans', category: 'pantry' },
      { name: 'Canned Chickpeas (Hommos)', portion_per_person: 0.15, unit: 'cans', category: 'pantry' },
      { name: 'Tahini', portion_per_person: 20, unit: 'g', category: 'pantry' },
      { name: 'Lemon (Hamod)', portion_per_person: 0.25, unit: 'pieces', category: 'produce' },
      { name: 'Garlic (Toom)', portion_per_person: 5, unit: 'g', category: 'produce' },
      { name: 'Olive Oil', portion_per_person: 20, unit: 'ml', category: 'pantry' },
      { name: 'Pita Bread (Khobz Arabi)', portion_per_person: 1.5, unit: 'loaves', category: 'bakery' },
    ],
  },
  {
    id: 'breakfast_french_toast_jam',
    name: 'Toast, Butter & Jam / Halawa',
    nameAr: 'توست مع زبدة ومربى وحلاوة',
    meal_type: 'breakfast',
    description: 'Sliced toast with butter, apricot jam, and chocolate / halawa spread.',
    ingredients: [
      { name: 'Toast Slices (Pain de Mie)', portion_per_person: 3, unit: 'pieces', category: 'bakery' },
      { name: 'Butter Portions', portion_per_person: 20, unit: 'g', category: 'supermarket' },
      { name: 'Fruit Jam (Apricot/Strawberry)', portion_per_person: 30, unit: 'g', category: 'pantry' },
      { name: 'Halawa / Choco Spread', portion_per_person: 30, unit: 'g', category: 'pantry' },
    ],
  },

  // ── LUNCH ──────────────────────────────────────────────────────────────────
  {
    id: 'lunch_spaghetti_bolognese',
    name: 'Spaghetti Bolognese',
    nameAr: 'معكرونة سباغيتي باللحمة وصلصة البندورة',
    meal_type: 'lunch',
    description: 'Camp classic spaghetti with minced beef bolognese sauce, onions, and parmesan.',
    ingredients: [
      { name: 'Spaghetti Pasta', portion_per_person: 100, unit: 'g', category: 'pantry' },
      { name: 'Minced Beef (Lahmeh Mafroumeh)', portion_per_person: 100, unit: 'g', category: 'butchery' },
      { name: 'Tomato Paste (Rab El Banadoura)', portion_per_person: 40, unit: 'g', category: 'pantry' },
      { name: 'Diced Canned Tomatoes', portion_per_person: 60, unit: 'g', category: 'pantry' },
      { name: 'Onions (Basal)', portion_per_person: 30, unit: 'g', category: 'produce' },
      { name: 'Garlic (Toom)', portion_per_person: 5, unit: 'g', category: 'produce' },
      { name: 'Cooking Oil', portion_per_person: 15, unit: 'ml', category: 'pantry' },
      { name: 'Parmesan / Grated Cheese', portion_per_person: 15, unit: 'g', category: 'supermarket' },
    ],
  },
  {
    id: 'lunch_chicken_kabsah_rice',
    name: 'Camp Rice & Chicken Stew (Kabsah)',
    nameAr: 'كبسة دجاج ورز المخيم',
    meal_type: 'lunch',
    description: 'Spiced aromatic basmati rice with seasoned chicken pieces and toasted almonds.',
    ingredients: [
      { name: 'Basmati Rice (Ruzz)', portion_per_person: 120, unit: 'g', category: 'pantry' },
      { name: 'Chicken Pieces (Djeij)', portion_per_person: 200, unit: 'g', category: 'butchery' },
      { name: 'Onions (Basal)', portion_per_person: 30, unit: 'g', category: 'produce' },
      { name: 'Tomato Paste', portion_per_person: 25, unit: 'g', category: 'pantry' },
      { name: 'Kabsah Spices Blend', portion_per_person: 10, unit: 'g', category: 'pantry' },
      { name: 'Cooking Oil', portion_per_person: 20, unit: 'ml', category: 'pantry' },
      { name: 'Almonds / Pine Nuts', portion_per_person: 10, unit: 'g', category: 'pantry' },
    ],
  },
  {
    id: 'lunch_lentil_soup_croutons',
    name: 'Lentil Soup with Croutons & Lemon',
    nameAr: 'شوربة عدس مجروشة مع خبز مقلي وحامض',
    meal_type: 'lunch',
    description: 'Hearty yellow lentil soup with cumin, crispy croutons and fresh lemon wedges.',
    ingredients: [
      { name: 'Red Split Lentils (Adas Majroush)', portion_per_person: 80, unit: 'g', category: 'pantry' },
      { name: 'Onions (Basal)', portion_per_person: 30, unit: 'g', category: 'produce' },
      { name: 'Cumin & Salt Spices', portion_per_person: 5, unit: 'g', category: 'pantry' },
      { name: 'Cooking Oil', portion_per_person: 15, unit: 'ml', category: 'pantry' },
      { name: 'Toast Bread for Croutons', portion_per_person: 1, unit: 'loaves', category: 'bakery' },
      { name: 'Lemon (Hamod)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
    ],
  },
  {
    id: 'lunch_tuna_pasta_salad',
    name: 'Tuna & Sweet Corn Pasta Salad',
    nameAr: 'سلطة معكرونة وتونا مع ذرة ومايونيز',
    meal_type: 'lunch',
    description: 'Chilled fusilli pasta salad with canned tuna, sweet corn, pickles, mayo and lemon.',
    ingredients: [
      { name: 'Fusilli / Penne Pasta', portion_per_person: 90, unit: 'g', category: 'pantry' },
      { name: 'Canned Tuna', portion_per_person: 0.5, unit: 'cans', category: 'pantry' },
      { name: 'Canned Sweet Corn (Doura)', portion_per_person: 40, unit: 'g', category: 'pantry' },
      { name: 'Mayonnaise', portion_per_person: 25, unit: 'g', category: 'pantry' },
      { name: 'Pickled Cucumbers (Khisar)', portion_per_person: 20, unit: 'g', category: 'pantry' },
      { name: 'Lemon (Hamod)', portion_per_person: 0.25, unit: 'pieces', category: 'produce' },
    ],
  },
  {
    id: 'lunch_shish_taouk_fries',
    name: 'Shish Taouk Skewers & Fries',
    nameAr: 'شيش طاووق مشوي مع بطاطا وتوم',
    meal_type: 'lunch',
    description: 'Marinated grilled chicken breast cubes with garlic paste, pickles and pita.',
    ingredients: [
      { name: 'Chicken Breast Marinated (Taouk)', portion_per_person: 200, unit: 'g', category: 'butchery' },
      { name: 'Garlic Paste (Toum)', portion_per_person: 30, unit: 'g', category: 'supermarket' },
      { name: 'Pickles (Kabees)', portion_per_person: 30, unit: 'g', category: 'pantry' },
      { name: 'Potatoes (Batata for fries)', portion_per_person: 150, unit: 'g', category: 'produce' },
      { name: 'Frying Oil', portion_per_person: 40, unit: 'ml', category: 'pantry' },
      { name: 'Pita Bread (Khobz Arabi)', portion_per_person: 1.5, unit: 'loaves', category: 'bakery' },
    ],
  },

  // ── DINNER ─────────────────────────────────────────────────────────────────
  {
    id: 'dinner_campfire_burgers',
    name: 'Campfire Beef Burgers & Fries',
    nameAr: 'برغر لحمة على الحطب وبطاطا',
    meal_type: 'dinner',
    description: 'Grilled beef patties on brioche/sesame buns with cheddar, lettuce, tomato and sauces.',
    ingredients: [
      { name: 'Burger Beef Patties (100g each)', portion_per_person: 1.5, unit: 'pieces', category: 'butchery' },
      { name: 'Burger Buns (Pain Burger)', portion_per_person: 1.5, unit: 'pieces', category: 'bakery' },
      { name: 'Cheddar Cheese Slices', portion_per_person: 1.5, unit: 'pieces', category: 'supermarket' },
      { name: 'Lettuce (Khas)', portion_per_person: 20, unit: 'g', category: 'produce' },
      { name: 'Tomatoes (Banadoura)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
      { name: 'Ketchup & Mustard', portion_per_person: 25, unit: 'g', category: 'pantry' },
      { name: 'Potatoes (Batata)', portion_per_person: 120, unit: 'g', category: 'produce' },
      { name: 'Frying Oil', portion_per_person: 30, unit: 'ml', category: 'pantry' },
    ],
  },
  {
    id: 'dinner_hot_dogs_corn',
    name: 'Grilled Hot Dogs & Sweet Corn on Cob',
    nameAr: 'هوت دوغ مشوي مع ذرة مسلوقة',
    meal_type: 'dinner',
    description: 'Grilled sausage in hot dog rolls with boiled salted sweet corn cobs.',
    ingredients: [
      { name: 'Beef Hot Dog Sausages', portion_per_person: 2, unit: 'pieces', category: 'butchery' },
      { name: 'Hot Dog Buns (Pain Hot Dog)', portion_per_person: 2, unit: 'pieces', category: 'bakery' },
      { name: 'Fresh Sweet Corn Cobs (Arnous Doura)', portion_per_person: 1, unit: 'pieces', category: 'produce' },
      { name: 'Butter', portion_per_person: 15, unit: 'g', category: 'supermarket' },
      { name: 'Ketchup & Mustard', portion_per_person: 20, unit: 'g', category: 'pantry' },
    ],
  },
  {
    id: 'dinner_halloumi_saj',
    name: 'Grilled Halloumi & Markook Saj',
    nameAr: 'صاج حلوم وخضرة على الحطب',
    meal_type: 'dinner',
    description: 'Traditional camp saj flatbread rolled with melted halloumi, fresh mint & tomatoes.',
    ingredients: [
      { name: 'Halloumi Cheese', portion_per_person: 80, unit: 'g', category: 'supermarket' },
      { name: 'Markook / Saj Bread', portion_per_person: 1, unit: 'loaves', category: 'bakery' },
      { name: 'Tomatoes (Banadoura)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
      { name: 'Fresh Mint (Na3na3)', portion_per_person: 10, unit: 'g', category: 'produce' },
      { name: 'Black Olives', portion_per_person: 20, unit: 'g', category: 'pantry' },
    ],
  },
  {
    id: 'dinner_soujouk_sandwiches',
    name: 'Soujouk & Makanek Sandwiches',
    nameAr: 'سندويشات سجق ومقانق مع مخلل وبندورة',
    meal_type: 'dinner',
    description: 'Spiced beef soujouk & makanek with garlic, pickles and lemon juice in baguettes.',
    ingredients: [
      { name: 'Soujouk / Makanek Sausages', portion_per_person: 150, unit: 'g', category: 'butchery' },
      { name: 'French Baguette / Samoon Bread', portion_per_person: 1, unit: 'loaves', category: 'bakery' },
      { name: 'Pickled Cucumbers (Kabees)', portion_per_person: 30, unit: 'g', category: 'pantry' },
      { name: 'Tomatoes (Banadoura)', portion_per_person: 0.5, unit: 'pieces', category: 'produce' },
      { name: 'Lemon Juice', portion_per_person: 15, unit: 'ml', category: 'produce' },
    ],
  },

  // ── SNACKS & SAHRA ─────────────────────────────────────────────────────────
  {
    id: 'snack_smores_marshmallows',
    name: 'Campfire S\'mores & Marshmallows',
    nameAr: 'سهرة المارشميلو والسمورز على النار',
    meal_type: 'snack',
    description: 'Roasted marshmallows sandwiched with chocolate squares and digestive biscuits.',
    ingredients: [
      { name: 'Marshmallows (Large)', portion_per_person: 3, unit: 'pieces', category: 'supermarket' },
      { name: 'Digestive / Marie Biscuits', portion_per_person: 3, unit: 'pieces', category: 'supermarket' },
      { name: 'Milk Chocolate Squares', portion_per_person: 20, unit: 'g', category: 'supermarket' },
    ],
  },
  {
    id: 'snack_tea_biscuits',
    name: 'Hot Mint Tea & Biscuits (*Chai w Biscuit*)',
    nameAr: 'شاي سخن مع نعنع وبسكوت',
    meal_type: 'snack',
    description: 'Camp boiled black tea with fresh mint leaves and crunchy tea biscuits.',
    ingredients: [
      { name: 'Black Tea Bags / Loose Leaves', portion_per_person: 1, unit: 'packs', category: 'pantry' },
      { name: 'Sugar (Soukkar)', portion_per_person: 20, unit: 'g', category: 'pantry' },
      { name: 'Fresh Mint (Na3na3)', portion_per_person: 10, unit: 'g', category: 'produce' },
      { name: 'Tea Biscuits (Biscuits au Thé)', portion_per_person: 4, unit: 'pieces', category: 'pantry' },
    ],
  },
  {
    id: 'snack_popcorn_cocoa',
    name: 'Campfire Popcorn & Hot Cocoa',
    nameAr: 'بوشار سخن وكاكاو',
    meal_type: 'snack',
    description: 'Freshly popped pot corn with warm hot cocoa drink.',
    ingredients: [
      { name: 'Popcorn Kernels (Fouchar)', portion_per_person: 35, unit: 'g', category: 'pantry' },
      { name: 'Cooking Oil for Popcorn', portion_per_person: 10, unit: 'ml', category: 'pantry' },
      { name: 'Hot Cocoa / Chocolate Powder', portion_per_person: 25, unit: 'g', category: 'pantry' },
      { name: 'Powdered Milk (Nido)', portion_per_person: 30, unit: 'g', category: 'pantry' },
    ],
  },
]

// ─── STANDARD MASTER INGREDIENT CATALOG ─────────────────────────────────────────

export interface MasterCatalogIngredient {
  name: string
  nameAr?: string
  category: 'pantry' | 'supermarket' | 'bakery' | 'butchery' | 'produce' | 'supplies'
  defaultUnit: 'g' | 'kg' | 'pieces' | 'cans' | 'loaves' | 'packs' | 'ml' | 'liters'
  defaultPortion: number
  commonPantry?: boolean
}

export const STANDARD_INGREDIENTS_CATALOG: MasterCatalogIngredient[] = [
  // ── Grains & Pantry Staples
  { name: 'Basmati Rice (رز بسمتي)', nameAr: 'رز بسمتي', category: 'pantry', defaultUnit: 'g', defaultPortion: 100, commonPantry: true },
  { name: 'Egyptian Rice (رز مصري)', nameAr: 'رز مصري', category: 'pantry', defaultUnit: 'g', defaultPortion: 100, commonPantry: true },
  { name: 'Spaghetti Pasta (معكرونة سباغيتي)', nameAr: 'معكرونة سباغيتي', category: 'pantry', defaultUnit: 'g', defaultPortion: 100, commonPantry: true },
  { name: 'Penne / Fusilli Pasta (معكرونة بيني)', nameAr: 'معكرونة بيني', category: 'pantry', defaultUnit: 'g', defaultPortion: 100, commonPantry: true },
  { name: 'Red Split Lentils (عدس أحمر مجروش)', nameAr: 'عدس مجروش', category: 'pantry', defaultUnit: 'g', defaultPortion: 80, commonPantry: true },
  { name: 'Brown Whole Lentils (عدس بني عريض)', nameAr: 'عدس بني', category: 'pantry', defaultUnit: 'g', defaultPortion: 80, commonPantry: true },
  { name: 'Burghul Fine / Coarse (برغل ناعم/خشن)', nameAr: 'برغل', category: 'pantry', defaultUnit: 'g', defaultPortion: 80, commonPantry: true },
  { name: 'Canned Tuna (تونا معلبة)', nameAr: 'تونا معلبة', category: 'pantry', defaultUnit: 'cans', defaultPortion: 0.5, commonPantry: true },
  { name: 'Canned Sweet Corn (ذرة معلبة)', nameAr: 'ذرة معلبة', category: 'pantry', defaultUnit: 'g', defaultPortion: 40, commonPantry: true },
  { name: 'Canned Fava Beans (فول مدمس معلب)', nameAr: 'فول مدمس', category: 'pantry', defaultUnit: 'cans', defaultPortion: 0.25, commonPantry: true },
  { name: 'Canned Chickpeas (حمص معلب)', nameAr: 'حمص حب معلب', category: 'pantry', defaultUnit: 'cans', defaultPortion: 0.25, commonPantry: true },
  { name: 'Canned Sardines (سردين معلب)', nameAr: 'سردين', category: 'pantry', defaultUnit: 'cans', defaultPortion: 0.5, commonPantry: true },
  { name: 'Tomato Paste (رب البندورة)', nameAr: 'رب البندورة', category: 'pantry', defaultUnit: 'g', defaultPortion: 30, commonPantry: true },
  { name: 'Canned Diced Tomatoes (بندورة مقشرة معلبة)', nameAr: 'بندورة مقشرة', category: 'pantry', defaultUnit: 'g', defaultPortion: 60, commonPantry: true },
  { name: 'Olive Oil (زيت زيتون)', nameAr: 'زيت زيتون', category: 'pantry', defaultUnit: 'ml', defaultPortion: 20, commonPantry: true },
  { name: 'Sunflower / Frying Oil (زيت قلي)', nameAr: 'زيت قلي', category: 'pantry', defaultUnit: 'ml', defaultPortion: 30, commonPantry: true },
  { name: 'Table Salt (ملح طعام)', nameAr: 'ملح', category: 'pantry', defaultUnit: 'g', defaultPortion: 5, commonPantry: true },
  { name: 'Black Pepper (بهار أسود)', nameAr: 'بهار أسود', category: 'pantry', defaultUnit: 'g', defaultPortion: 2, commonPantry: true },
  { name: 'Cumin (كمون ناعم)', nameAr: 'كمون', category: 'pantry', defaultUnit: 'g', defaultPortion: 3, commonPantry: true },
  { name: 'Wild Thyme Zaatar (زعتر بلدي)', nameAr: 'زعتر بلدي', category: 'pantry', defaultUnit: 'g', defaultPortion: 15, commonPantry: true },
  { name: 'Seven Spices (سبع بهارات)', nameAr: 'سبع بهارات', category: 'pantry', defaultUnit: 'g', defaultPortion: 3, commonPantry: true },
  { name: 'Kabsah Spices Blend (بهارات كبسة)', nameAr: 'بهارات كبسة', category: 'pantry', defaultUnit: 'g', defaultPortion: 5, commonPantry: true },
  { name: 'Granulated Sugar (سكر أبيض)', nameAr: 'سكر', category: 'pantry', defaultUnit: 'g', defaultPortion: 20, commonPantry: true },
  { name: 'Black Tea Bags (شاي أكياس)', nameAr: 'شاي', category: 'pantry', defaultUnit: 'packs', defaultPortion: 1, commonPantry: true },
  { name: 'Instant Coffee / Nescafé (قهوة سريعة التحضير)', nameAr: 'نسكافيه', category: 'pantry', defaultUnit: 'g', defaultPortion: 5, commonPantry: true },
  { name: 'Hot Cocoa Powder (بودرة كاكاو)', nameAr: 'كاكاو', category: 'pantry', defaultUnit: 'g', defaultPortion: 25, commonPantry: true },
  { name: 'Powdered Milk Nido (حليب بودرة)', nameAr: 'حليب بودرة', category: 'pantry', defaultUnit: 'g', defaultPortion: 30, commonPantry: true },
  { name: 'Apricot / Strawberry Jam (مربى مشمش/فريز)', nameAr: 'مربى', category: 'pantry', defaultUnit: 'g', defaultPortion: 30, commonPantry: true },
  { name: 'Halawa Spread (حلاوة طحينية)', nameAr: 'حلاوة', category: 'pantry', defaultUnit: 'g', defaultPortion: 30, commonPantry: true },
  { name: 'Chocolate Hazelnut Spread (شوكولا دهن)', nameAr: 'شوكولا دهن', category: 'pantry', defaultUnit: 'g', defaultPortion: 30, commonPantry: true },
  { name: 'Tahini Sesame Paste (طحينة)', nameAr: 'طحينة', category: 'pantry', defaultUnit: 'g', defaultPortion: 20, commonPantry: true },
  { name: 'Black Olives (زيتون أسود)', nameAr: 'زيتون أسود', category: 'pantry', defaultUnit: 'g', defaultPortion: 20, commonPantry: true },
  { name: 'Green Olives (زيتون أخضر)', nameAr: 'زيتون أخضر', category: 'pantry', defaultUnit: 'g', defaultPortion: 20, commonPantry: true },
  { name: 'Pickled Cucumbers / Kabees (مخلل خيار)', nameAr: 'مخلل خيار', category: 'pantry', defaultUnit: 'g', defaultPortion: 25, commonPantry: true },
  { name: 'Pickled Turnips (مخلل لفت)', nameAr: 'مخلل لفت', category: 'pantry', defaultUnit: 'g', defaultPortion: 25, commonPantry: true },
  { name: 'White Vinegar (خل أبيض)', nameAr: 'خل أبيض', category: 'pantry', defaultUnit: 'ml', defaultPortion: 10, commonPantry: true },
  { name: 'Ketchup (كاتشاب)', nameAr: 'كاتشاب', category: 'pantry', defaultUnit: 'g', defaultPortion: 20, commonPantry: true },
  { name: 'Mustard (خردل)', nameAr: 'خردل', category: 'pantry', defaultUnit: 'g', defaultPortion: 10, commonPantry: true },
  { name: 'Mayonnaise (مايونيز)', nameAr: 'مايونيز', category: 'pantry', defaultUnit: 'g', defaultPortion: 20, commonPantry: true },
  { name: 'Popcorn Kernels (فوشار حب)', nameAr: 'فوشار', category: 'pantry', defaultUnit: 'g', defaultPortion: 35, commonPantry: true },
  { name: 'Tea Biscuits (بسكوت شاي)', nameAr: 'بسكوت شاي', category: 'pantry', defaultUnit: 'pieces', defaultPortion: 4, commonPantry: true },
  { name: 'Digestive Biscuits (بسكوت دايجستف)', nameAr: 'بسكوت دايجستف', category: 'supermarket', defaultUnit: 'pieces', defaultPortion: 3 },
  { name: 'Campfire Marshmallows (مارشميلو نار)', nameAr: 'مارشميلو', category: 'supermarket', defaultUnit: 'pieces', defaultPortion: 3 },
  { name: 'Milk Chocolate Bars (شوكولا ألواح)', nameAr: 'شوكولا', category: 'supermarket', defaultUnit: 'g', defaultPortion: 20 },

  // ── Fresh Produce & Vegetables
  { name: 'Tomatoes Banadoura (بندورة طازجة)', nameAr: 'بندورة', category: 'produce', defaultUnit: 'pieces', defaultPortion: 0.5 },
  { name: 'Cucumbers Khiyar (خيار طازج)', nameAr: 'خيار', category: 'produce', defaultUnit: 'pieces', defaultPortion: 0.5 },
  { name: 'Onions Basal (بصل يابس)', nameAr: 'بصل', category: 'produce', defaultUnit: 'g', defaultPortion: 30 },
  { name: 'Garlic Toom (ثوم)', nameAr: 'ثوم', category: 'produce', defaultUnit: 'g', defaultPortion: 5 },
  { name: 'Potatoes Batata (بطاطا)', nameAr: 'بطاطا', category: 'produce', defaultUnit: 'g', defaultPortion: 150 },
  { name: 'Lemons Hamod (حامض/ليمون)', nameAr: 'حامض', category: 'produce', defaultUnit: 'pieces', defaultPortion: 0.25 },
  { name: 'Fresh Mint Na3na3 (نعنع أخضر)', nameAr: 'نعنع', category: 'produce', defaultUnit: 'g', defaultPortion: 10 },
  { name: 'Fresh Parsley Baqdounis (بقدونس)', nameAr: 'بقدونس', category: 'produce', defaultUnit: 'g', defaultPortion: 15 },
  { name: 'Lettuce Khas (خس)', nameAr: 'خس', category: 'produce', defaultUnit: 'g', defaultPortion: 25 },
  { name: 'Green Bell Peppers (فليفلة خضراء)', nameAr: 'فليفلة خضراء', category: 'produce', defaultUnit: 'pieces', defaultPortion: 0.25 },
  { name: 'Fresh Sweet Corn Cobs (عرانيس ذرة)', nameAr: 'عرانيس ذرة', category: 'produce', defaultUnit: 'pieces', defaultPortion: 1 },
  { name: 'Watermelon Batteekh (بطيخ أحمر)', nameAr: 'بطيخ', category: 'produce', defaultUnit: 'kg', defaultPortion: 0.3 },
  { name: 'Apples / Bananas (تفاح / موز)', nameAr: 'فواكه', category: 'produce', defaultUnit: 'pieces', defaultPortion: 1 },

  // ── Fresh Bakery & Breads
  { name: 'Pita Bread Khobz Arabi (خبز عربي كبير/وسط)', nameAr: 'خبز عربي', category: 'bakery', defaultUnit: 'loaves', defaultPortion: 1.5 },
  { name: 'Markook / Saj Bread (خبز مرقوق صاج)', nameAr: 'خبز مرقوق', category: 'bakery', defaultUnit: 'loaves', defaultPortion: 1 },
  { name: 'Toast Bread Pain de Mie (توست أبيض)', nameAr: 'توست', category: 'bakery', defaultUnit: 'pieces', defaultPortion: 3 },
  { name: 'Burger Buns (خبز برغر سمسم)', nameAr: 'خبز برغر', category: 'bakery', defaultUnit: 'pieces', defaultPortion: 1.5 },
  { name: 'Hot Dog Buns (خبز هوت دوغ)', nameAr: 'خبز هوت دوغ', category: 'bakery', defaultUnit: 'pieces', defaultPortion: 2 },
  { name: 'French Baguette / Samoon (خبز صمون فرنسي)', nameAr: 'خبز صمون', category: 'bakery', defaultUnit: 'loaves', defaultPortion: 1 },

  // ── Butchery & Meats
  { name: 'Minced Beef Lahmeh Mafroumeh (لحمة مفرومة بقر)', nameAr: 'لحمة مفرومة', category: 'butchery', defaultUnit: 'g', defaultPortion: 100 },
  { name: 'Burger Beef Patties (أقراص برغر لحمة)', nameAr: 'أقراص برغر', category: 'butchery', defaultUnit: 'pieces', defaultPortion: 1.5 },
  { name: 'Chicken Breast Taouk Cubes (شيش طاووق متبل)', nameAr: 'شيش طاووق', category: 'butchery', defaultUnit: 'g', defaultPortion: 200 },
  { name: 'Whole Chicken Cut Pieces (قطع دجاج)', nameAr: 'قطع دجاج', category: 'butchery', defaultUnit: 'g', defaultPortion: 200 },
  { name: 'Beef Hot Dog Sausages (سجق هوت دوغ بقري)', nameAr: 'هوت دوغ', category: 'butchery', defaultUnit: 'pieces', defaultPortion: 2 },
  { name: 'Soujouk / Makanek Sausages (سجق ومقانق)', nameAr: 'سجق ومقانق', category: 'butchery', defaultUnit: 'g', defaultPortion: 150 },

  // ── Dairy & Supermarket Cold
  { name: 'Fresh Farm Eggs (بيض طازج)', nameAr: 'بيض', category: 'supermarket', defaultUnit: 'pieces', defaultPortion: 2 },
  { name: 'Baladi Fresh Labneh (لبنة بلدية)', nameAr: 'لبنة', category: 'supermarket', defaultUnit: 'g', defaultPortion: 50 },
  { name: 'Halloumi Cheese (جبنة حلوم)', nameAr: 'جبنة حلوم', category: 'supermarket', defaultUnit: 'g', defaultPortion: 60 },
  { name: 'Akkawi / Kashkaval Cheese (جبنة عكاوي/قشقوان)', nameAr: 'جبنة قشقوان', category: 'supermarket', defaultUnit: 'g', defaultPortion: 50 },
  { name: 'Cheddar Cheese Slices (جبنة شيدر شرائح)', nameAr: 'جبنة شيدر', category: 'supermarket', defaultUnit: 'pieces', defaultPortion: 1.5 },
  { name: 'Butter Portions (زبدة)', nameAr: 'زبدة', category: 'supermarket', defaultUnit: 'g', defaultPortion: 20 },
  { name: 'Garlic Toum Paste (توم مطحون جاهز)', nameAr: 'توم جاهز', category: 'supermarket', defaultUnit: 'g', defaultPortion: 30 },

  // ── Camp Hygiene & Kitchen Supplies
  { name: 'Dish Soap Fairy (سائل جلي)', nameAr: 'سائل جلي', category: 'supplies', defaultUnit: 'liters', defaultPortion: 0.05, commonPantry: true },
  { name: 'Heavy Duty Kitchen Sponges (إسفنج جلي وسيفة)', nameAr: 'إسفنج جلي', category: 'supplies', defaultUnit: 'pieces', defaultPortion: 0.1, commonPantry: true },
  { name: 'Heavy Duty Garbage Bags (أكياس نفايات كبيرة)', nameAr: 'أكياس نفايات', category: 'supplies', defaultUnit: 'packs', defaultPortion: 0.2, commonPantry: true },
  { name: 'Aluminum Foil Roll (قصدير ألمنيوم)', nameAr: 'قصدير', category: 'supplies', defaultUnit: 'packs', defaultPortion: 0.05, commonPantry: true },
  { name: 'Cling Film Roll (نايلون تغليف أطعمة)', nameAr: 'نايلون تغليف', category: 'supplies', defaultUnit: 'packs', defaultPortion: 0.05, commonPantry: true },
  { name: 'Paper Table Napkins (محارم سفرة)', nameAr: 'محارم', category: 'supplies', defaultUnit: 'packs', defaultPortion: 0.2, commonPantry: true },
]

