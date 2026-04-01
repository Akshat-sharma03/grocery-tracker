import { getEmoji } from './emoji-map.js';
import { getItemSuggestions, getRecipeSuggestions, recipeMap } from './suggestions.js';
import { initNotifications } from './notifications.js';

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const useFirebase = firebaseConfig.apiKey !== "REPLACE_ME";
let db, auth;
let unsubscribeItems = null;

if (useFirebase) {
    const fbApp = initializeApp(firebaseConfig);
    db = getFirestore(fbApp);
    auth = getAuth(fbApp);

    enableIndexedDbPersistence(db).catch(() => {});
    signInAnonymously(auth).catch(() => {});
}

const DATA_KEY = "grocery_app_data";

export function loadData() {
  const defaultData = {
    users: [
      { id: "u1", name: "Alex", color: "#FF6B6B" },
      { id: "u2", name: "Sam",  color: "#4ECDC4" }
    ],
    items: [],
    history: {
      "u1": {}, // Map of Item Name -> Frequency Count
      "u2": {}
    },
    reminder: { time: "18:00", enabled: true, lastNotified: null }
  };
  
  const saved = localStorage.getItem(DATA_KEY);
  let data;
  if (!saved) {
      data = defaultData;
  } else {
      data = JSON.parse(saved);
  }

  if (!data.lists) {
      data.lists = [
          { id: "weekly",  name: "Weekly Shop",      icon: "📅", recurrence: "weekly" },
          { id: "monthly", name: "Monthly Shop",     icon: "🗓️", recurrence: "monthly" },
          { id: "leisure", name: "Leisure Shopping", icon: "🎉", recurrence: "none" }
      ];
  }
  if (!data.currentListId) {
      data.currentListId = "weekly";
  }

  if (!data.settings) {
      data.settings = { currency: "AED" };
  }

  if (!data.meta) {
      data.meta = {
          listCompletedAt: {
              weekly: null,
              monthly: null,
              leisure: null
          }
      };
  }

  // Backwards compatibility migration
  data.items.forEach(item => {
      if (!item.listId) item.listId = "weekly";
  });

  return data;
}

export function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

let appData = loadData();
let activeUserId = "u1";

function getPeriodKey(recurrence) {
    const now = new Date();
    if (recurrence === 'weekly') {
        const day = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - day + 1);
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    } else if (recurrence === 'monthly') {
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return 'none';
}

function checkRecurringItems() {
    const listMeta = appData.lists.find(l => l.id === appData.currentListId);
    if (!listMeta || listMeta.recurrence === 'none') return;

    const currentPeriodKey = getPeriodKey(listMeta.recurrence);
    if (currentPeriodKey === 'none') return;

    let changed = false;
    const templates = appData.items.filter(i => i.listId === appData.currentListId && i.isRecurring);

    templates.forEach(template => {
        if (template.lastGeneratedFor !== currentPeriodKey) {
            const activeItemExists = appData.items.some(i => 
                i.listId === appData.currentListId && 
                i.name.toLowerCase() === template.name.toLowerCase() && 
                !i.done && 
                !i.hidden
            );

            if (!activeItemExists) {
                template.isRecurring = false;
                const newItem = { ...template };
                newItem.id = 'item_' + Date.now() + Math.random().toString(36).substr(2, 5);
                newItem.done = false;
                newItem.hidden = false;
                newItem.isRecurring = true;
                newItem.lastGeneratedFor = currentPeriodKey;
                newItem.addedAt = Date.now();
                
                if (useFirebase) {
                    setDoc(doc(db, "lists", appData.currentListId, "items", template.id), template);
                    setDoc(doc(db, "lists", appData.currentListId, "items", newItem.id), newItem);
                } else {
                    appData.items.push(newItem);
                }
            } else {
                template.lastGeneratedFor = currentPeriodKey;
                if (useFirebase) {
                    setDoc(doc(db, "lists", appData.currentListId, "items", template.id), template);
                }
            }
            changed = true;
        }
    });

    if (changed && !useFirebase) saveData(appData);
}

function showCompletionMessage() {
    const msgEl = document.getElementById('completion-message');
    if (!msgEl) return;
    msgEl.classList.add('show');
    setTimeout(() => {
        msgEl.classList.remove('show');
    }, 3000);
}

function checkListCompletion() {
    const currentItems = appData.items.filter(item => item.listId === appData.currentListId && !item.hidden);
    const total = currentItems.length;
    if (total === 0) return;
    
    const doneCount = currentItems.filter(i => i.done).length;
    const todayStr = new Date().toDateString();

    if (doneCount === total && appData.meta.listCompletedAt[appData.currentListId] !== todayStr) {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
        showCompletionMessage();

        appData.meta.listCompletedAt[appData.currentListId] = todayStr;
        saveData(appData);
    }
}

function updateSpendingFooter() {
    const footer = document.getElementById('spending-footer');
    if (!footer) return;

    const currentItems = appData.items.filter(item => item.listId === appData.currentListId && !item.hidden);
    if (currentItems.length === 0) {
        footer.classList.add('hidden');
        return;
    }

    let total = 0;
    let completed = 0;
    currentItems.forEach(item => {
        const p = parseFloat(item.price) || 0;
        total += p;
        if (item.done) completed += p;
    });

    footer.classList.remove('hidden');

    if (total === 0) {
        footer.innerHTML = `Add prices to estimate your spend.`;
        return;
    }

    const remaining = total - completed;
    const currency = appData.settings?.currency || 'AED';

    footer.innerHTML = `Estimated: ${currency} ${total.toFixed(2)} &bull; Remaining: ${currency} ${remaining.toFixed(2)} &bull; Completed: ${currency} ${completed.toFixed(2)}`;
}

function setupFirestoreSync() {
    if (!useFirebase) return;
    if (unsubscribeItems) unsubscribeItems();

    const itemsRef = collection(db, "lists", appData.currentListId, "items");
    unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
        const firestoreItems = [];
        snapshot.forEach(d => firestoreItems.push(d.data()));
        
        // Merge into appData.items (replace current list's items)
        appData.items = appData.items.filter(i => i.listId !== appData.currentListId).concat(firestoreItems);
        saveData(appData); // Local backup
        
        checkRecurringItems();
        renderList();
    }, (err) => {
        console.error("Firestore sync error:", err);
    });
}

function initApp() {
  initUsers();
  initTabs();
  setupInputs();
  initNotifications();
  if (useFirebase) {
      setupFirestoreSync();
  } else {
      checkRecurringItems();
      renderList();
  }
}

function initTabs() {
  const tabs = document.querySelectorAll('.list-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      appData.currentListId = tab.dataset.listid;
      saveData(appData);
      renderTabs();
      if (useFirebase) {
          setupFirestoreSync();
      } else {
          checkRecurringItems();
          renderList();
      }
    });
  });
}

function renderTabs() {
  const tabs = document.querySelectorAll('.list-tab');
  tabs.forEach(tab => {
    if (tab.dataset.listid === appData.currentListId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

function initUsers() {
  const userCards = document.querySelectorAll('.user-card');
  userCards.forEach(card => {
    card.addEventListener('click', () => {
      userCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeUserId = card.dataset.userid;
    });
  });
}

function renderList() {
  renderTabs();
  const listEl = document.getElementById('grocery-list');
  listEl.innerHTML = '';
  
  const currentItems = appData.items.filter(item => item.listId === appData.currentListId && !item.hidden);

  if (currentItems.length === 0) {
      listEl.innerHTML = `
        <li style="text-align:center; padding: 2rem; border: none; box-shadow: none; background: transparent; transform: none;">
         <span style="font-size: 5rem; display: block; margin-bottom: 1rem;">🧺</span>
         <span style="font-family: var(--font-heading); font-size: 2rem; color: #888;">Nothing here yet!</span>
        </li>`;
      return;
  }

  const sorted = [...currentItems].sort((a, b) => {
      if (a.done === b.done) return a.addedAt - b.addedAt;
      return a.done ? 1 : -1;
  });

  sorted.forEach(item => {
    const li = document.createElement('li');
    li.className = `grocery-item ${item.done ? 'done' : ''}`;
    
    const user = appData.users.find(u => u.id === item.addedBy);
    const userTagStyle = user ? `background-color: ${user.color};` : 'background-color: #999;';
    const userName = user ? user.name : 'Unknown';

    li.innerHTML = `
      <input type="checkbox" class="item-checkbox" ${item.done ? 'checked' : ''}>
      <span class="item-emoji">${item.emoji}</span>
      <span class="item-name">
        ${item.name}
        ${item.alertTime ? `<span style="font-size: 0.8rem; color: #888; display: block; margin-top: -0.2rem;">⏰ ${item.alertTime}</span>` : ''}
      </span>
      <span class="item-user-tag" style="${userTagStyle}">${userName}</span>
      <input type="number" step="0.01" min="0" class="price-input" value="${item.price || ''}" placeholder="0.00">
      <div class="item-actions">
        <button class="icon-action-btn item-recurring-btn ${item.isRecurring ? 'active-recurring' : ''}" title="Repeat this item" style="font-size: 1.2rem;">↻</button>
        <button class="icon-action-btn item-alarm-btn">⏰</button>
        <button class="icon-action-btn delete-btn">✕</button>
      </div>
    `;
    
    const priceInput = li.querySelector('.price-input');
    priceInput.addEventListener('change', (e) => {
        item.price = parseFloat(e.target.value) || 0;
        if (useFirebase) {
            setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
        } else {
            saveData(appData);
            updateSpendingFooter();
        }
    });

    li.querySelector('.item-recurring-btn').addEventListener('click', () => {
        item.isRecurring = !item.isRecurring;
        if (item.isRecurring) {
            const listMeta = appData.lists.find(l => l.id === appData.currentListId);
            item.recurrence = 'inherit';
            item.lastGeneratedFor = listMeta ? getPeriodKey(listMeta.recurrence) : 'none';
        }
        
        if (useFirebase) {
            setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
        } else {
            saveData(appData);
            renderList();
        }
    });

    li.querySelector('.item-alarm-btn').addEventListener('click', () => {
        openItemReminderModal(item.id);
    });

    li.querySelector('.item-checkbox').addEventListener('change', (e) => {
      item.done = e.target.checked;
      
      if (useFirebase) {
          setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
      } else {
          saveData(appData);
          renderList();
      }
    });

    li.querySelector('.delete-btn').addEventListener('click', () => {
      if (item.isRecurring) {
          item.done = true;
          item.hidden = true; // Tombstone template
          if (useFirebase) {
              setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
          }
      } else {
          if (useFirebase) {
              deleteDoc(doc(db, "lists", appData.currentListId, "items", item.id));
          } else {
              appData.items = appData.items.filter(i => i.id !== item.id);
          }
      }
      
      if (!useFirebase) {
          saveData(appData);
          renderList();
      }
    });

    listEl.appendChild(li);
  });

  checkListCompletion();
  updateSpendingFooter();
}

function addItem(name) {
  name = name.trim();
  if (!name) return;

  const item = {
    id: 'item_' + Date.now(),
    listId: appData.currentListId,
    name: name,
    emoji: getEmoji(name),
    addedBy: activeUserId,
    done: false,
    addedAt: Date.now(),
    isRecurring: false,
    recurrence: 'inherit',
    lastGeneratedFor: null,
    hidden: false,
    price: 0
  };

  appData.items.push(item);

  // Update history using counts tracking for the suggestion engine
  if (!appData.history[activeUserId]) appData.history[activeUserId] = {};
  appData.history[activeUserId][name] = (appData.history[activeUserId][name] || 0) + 1;

  if (useFirebase) {
      setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
      saveData(appData); // persist local history keys
  } else {
      appData.items.push(item);
      saveData(appData);
      renderList();
  }
  
  document.getElementById('item-input').value = '';
  document.getElementById('suggestions-dropdown').classList.add('hidden');
}

let currentEditingItemId = null;

function openItemReminderModal(itemId) {
    currentEditingItemId = itemId;
    const item = appData.items.find(i => i.id === itemId);
    document.getElementById('reminder-item-name').textContent = item.emoji + " " + item.name;
    document.getElementById('item-reminder-time').value = item.alertTime || "";
    document.getElementById('item-reminder-modal').classList.remove('hidden');
}

function setupInputs() {
    // Setup Item Reminder Modal bindings
    document.getElementById('close-item-reminder').addEventListener('click', () => {
        document.getElementById('item-reminder-modal').classList.add('hidden');
    });

    document.getElementById('save-item-reminder').addEventListener('click', () => {
        const time = document.getElementById('item-reminder-time').value;
        const item = appData.items.find(i => i.id === currentEditingItemId);
        if(item) {
            item.alertTime = time || null;
            item.alertNotified = null; // reset fired state
            if (useFirebase) {
                setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
            } else {
                saveData(appData);
                renderList();
            }
        }
        document.getElementById('item-reminder-modal').classList.add('hidden');
        if (time && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    });

    document.getElementById('clear-item-reminder').addEventListener('click', () => {
        const item = appData.items.find(i => i.id === currentEditingItemId);
        if(item) {
            item.alertTime = null;
            if (useFirebase) {
                setDoc(doc(db, "lists", appData.currentListId, "items", item.id), item);
            } else {
                saveData(appData);
                renderList();
            }
        }
        document.getElementById('item-reminder-modal').classList.add('hidden');
    });
  const inputEl = document.getElementById('item-input');
  const addBtn = document.getElementById('add-btn');
  const dropdownEl = document.getElementById('suggestions-dropdown');

  // Recipe UI bounds
  const recipeInputEl = document.getElementById('recipe-input');
  const recipeAddBtn = document.getElementById('add-recipe-btn');
  const recipeDropdownEl = document.getElementById('recipe-dropdown');

  // --- ITEM LOGIC ---
  function handleItemSubmission() {
      const val = inputEl.value.trim();
      if (!val) return;
      addItem(val);
      inputEl.value = '';
      dropdownEl.classList.add('hidden');
  }

  addBtn.addEventListener('click', handleItemSubmission);
  inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleItemSubmission();
  });

  inputEl.addEventListener('input', () => {
    const val = inputEl.value;
    const suggestions = getItemSuggestions(val, activeUserId, appData.history);
    
    dropdownEl.innerHTML = '';
    if (suggestions.length > 0) {
      dropdownEl.classList.remove('hidden');
      suggestions.forEach(sug => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = sug.name;
        div.addEventListener('click', () => {
            addItem(sug.name);
            inputEl.value = '';
            dropdownEl.classList.add('hidden');
        });
        dropdownEl.appendChild(div);
      });
    } else {
      dropdownEl.classList.add('hidden');
    }
  });

  // --- RECIPE LOGIC ---
  function handleRecipeSubmission() {
      const val = recipeInputEl.value.trim();
      if (!val) return;
      
      const recipes = getRecipeSuggestions(val);
      const exactRecipe = recipes.find(s => s.name.toLowerCase() === val.toLowerCase());
      
      if (exactRecipe) {
          exactRecipe.ingredients.forEach(ing => addItem(ing));
      } else if (recipes.length > 0) {
          recipes[0].ingredients.forEach(ing => addItem(ing)); // fallback to first match
      }
      
      recipeInputEl.value = '';
      recipeDropdownEl.classList.add('hidden');
  }

  recipeAddBtn.addEventListener('click', handleRecipeSubmission);
  recipeInputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleRecipeSubmission();
  });

  recipeInputEl.addEventListener('input', () => {
    const val = recipeInputEl.value;
    const suggestions = getRecipeSuggestions(val);
    
    recipeDropdownEl.innerHTML = '';
    if (suggestions.length > 0) {
      recipeDropdownEl.classList.remove('hidden');
      suggestions.forEach(sug => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<div>👨‍🍳 <strong>Recipe: ${sug.name}</strong></div><div style="font-size: 0.9rem; color: #888; line-height: 1.2;">+ ${sug.ingredients.join(', ')}</div>`;
        div.addEventListener('click', () => {
            sug.ingredients.forEach(ing => addItem(ing));
            recipeInputEl.value = '';
            recipeDropdownEl.classList.add('hidden');
        });
        recipeDropdownEl.appendChild(div);
      });
    } else {
      recipeDropdownEl.classList.add('hidden');
    }
  });

  // Global click outside to hide dropdowns
  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) dropdownEl.classList.add('hidden');
    if (!recipeInputEl.contains(e.target) && !recipeDropdownEl.contains(e.target)) recipeDropdownEl.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', initApp);
