export const emojiMap = {
    // Dairy & Eggs
    milk: "🥛", eggs: "🥚", bread: "🍞", butter: "🧈", cheese: "🧀", yogurt: "🫙", 
    cream: "🍦", icecream: "🍨", sourcream: "🍶",
    // Fruits
    apple: "🍎", banana: "🍌", orange: "🍊", tomato: "🍅", grape: "🍇",
    strawberry: "🍓", cherry: "🍒", peach: "🍑", mango: "🥭", pineapple: "🍍",
    kiwi: "🥝", lemon: "🍋", pear: "🍐", watermelon: "🍉", melon: "🍈", 
    coconut: "🥥", avocado: "🥑", blueberry: "🫐",
    // Vegetables
    spinach: "🥬", carrot: "🥕", onion: "🧅", garlic: "🧄", potato: "🥔",
    sweetpotato: "🍠", broccoli: "🥦", mushroom: "🍄", cucumber: "🥒", 
    pepper: "🫑", corn: "🌽", lettuce: "🥬", celery: "🌿", eggplant: "🍆",
    // Meat & Protein
    chicken: "🍗", beef: "🥩", fish: "🐟", shrimp: "🍤", pork: "🍖",
    bacon: "🥓", turkey: "🦃", sausage: "🌭", tofu: "🧊", bean: "🫘",
    // Carbs
    rice: "🍚", pasta: "🍝", noodle: "🍜", tortilla: "🌯", taco: "🌮",
    cereal: "🥣", oats: "🥣", bagel: "🥯", croissant: "🥐", baguette: "🥖",
    pretzel: "🥨", pancake: "🥞", waffle: "🧇",
    // Drinks
    coffee: "☕", tea: "🍵", juice: "🧃", water: "💧", soda: "🥤",
    beer: "🍺", wine: "🍷", cocktail: "🍸", champagne: "🍾", sake: "🍶",
    milkshake: "🥤", matcha: "🍵",
    // Snacks & Sweets
    cookie: "🍪", cake: "🍰", chocolate: "🍫", donut: "🍩", pie: "🥧",
    candy: "🍬", lollipop: "🍭", pudding: "🍮", popcorn: "🍿", honey: "🍯",
    peanut: "🥜", chestnut: "🌰", salt: "🧂", sugar: "🧂", chips: "🥔",
    // Condiments & Pantry
    oil: "🍾", vinegar: "🍾", spice: "🌶️", jam: "🍓", peanutbutter: "🥜",
    mayonnaise: "🥚", ketchup: "🍅", mustard: "🌭", sauce: "🍝", gravy: "🍲",
    flour: "🌾", soup: "🍲",
    // Prepared foods
    pizza: "🍕", burger: "🍔", fries: "🍟", burrito: "🌯", salad: "🥗", sandwich: "🥪",
    // Household & Hygiene
    soap: "🧴", shampoo: "🧴", "toilet paper": "🧻", toiletpaper: "🧻",
    "paper towel": "🧻", papertowel: "🧻", napkin: "🧻", tissue: "🧻",
    "trash bags": "🗑️", trashbag: "🗑️", toothpaste: "🪥", toothbrush: "🪥",
    deodorant: "🧴", lotion: "🧴", bleach: "🧽", detergent: "🧼",
    sponge: "🧽", foil: "🥈", wrap: "🌯", ziploc: "🛍️", cleaner: "🧼",
    broom: "🧹", mop: "🧹", battery: "🔋", lightbulb: "💡",
    matches: "🔥", candles: "🕯️",
    // Pets & Baby
    petfood: "🥫", catfood: "🐈", dogfood: "🐕", birdseed: "🐦", fishfood: "🐟",
    diapers: "👶", wipes: "🧻", formula: "🍼", pacifier: "🍼",
    // Health
    bandaids: "🩹", medicine: "💊", vitamins: "💊", pill: "💊"
};

export function getEmoji(itemName) {
  const normalized = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalized.split(/\s+/);
  
  // Exact full string match
  if (emojiMap[normalized]) return emojiMap[normalized];

  // Concatenated phrase match ("paper towel" -> "papertowel")
  const compressed = words.join('');
  if (emojiMap[compressed]) return emojiMap[compressed];

  // Individual word checks with basic plural handling
  for (const word of words) {
    if (emojiMap[word]) return emojiMap[word];
    if (word.endsWith('s') && emojiMap[word.slice(0, -1)]) return emojiMap[word.slice(0, -1)];
    if (word.endsWith('es') && emojiMap[word.slice(0, -2)]) return emojiMap[word.slice(0, -2)];
  }
  
  return "🛒"; // fallback
}
