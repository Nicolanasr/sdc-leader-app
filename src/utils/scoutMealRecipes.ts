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
