export const recipeMap = {
  "Pasta Carbonara": ["Pasta", "Eggs", "Pancetta", "Pecorino Cheese", "Black Pepper"],
  "Spaghetti Bolognese": ["Spaghetti", "Ground Beef", "Tomato Sauce", "Onion", "Garlic", "Parmesan"],
  "Taco Night": ["Taco Shells", "Ground Beef", "Taco Seasoning", "Lettuce", "Tomato", "Cheese", "Sour Cream", "Salsa"],
  "Avocado Toast": ["Bread", "Avocado", "Eggs", "Chili Flakes", "Lemon"],
  "Cheeseburger": ["Burger Buns", "Ground Beef", "Cheddar Cheese", "Lettuce", "Tomato", "Pickles", "Ketchup", "Mustard"],
  "Chicken Stir Fry": ["Chicken Breast", "Broccoli", "Bell Pepper", "Soy Sauce", "Ginger", "Garlic", "Rice"],
  "Pancakes": ["Flour", "Eggs", "Milk", "Butter", "Maple Syrup", "Baking Powder"],
  "Greek Salad": ["Cucumber", "Tomato", "Red Onion", "Feta Cheese", "Kalamata Olives", "Olive Oil"],
  "Chili Con Carne": ["Ground Beef", "Kidney Beans", "Tomato Sauce", "Onion", "Chili Powder", "Cumin", "Garlic", "Corn"],
  "Pizza": ["Pizza Dough", "Pizza Sauce", "Mozzarella", "Pepperoni", "Olive Oil", "Basil"]
};

export function getItemSuggestions(query, userId, history) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();

  const userHistory = history[userId] || {};
  return Object.entries(userHistory)
    .filter(([item]) => item.toLowerCase().startsWith(q))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item]) => ({ type: 'item', name: item }));
}

export function getRecipeSuggestions(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  
  const results = [];
  for (const [recipeName, ingredients] of Object.entries(recipeMap)) {
      if (recipeName.toLowerCase().includes(q)) {
          results.push({ type: 'recipe', name: recipeName, ingredients });
      }
  }
  return results.slice(0, 5);
}
