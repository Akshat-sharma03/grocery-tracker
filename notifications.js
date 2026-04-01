import { loadData, saveData } from './app.js';

export function initNotifications() {
    const reminderBtn = document.getElementById('reminder-btn');
    const reminderModal = document.getElementById('reminder-modal');
    const closeReminder = document.getElementById('close-reminder');
    const saveReminder = document.getElementById('save-reminder');
    const reminderTimeInput = document.getElementById('reminder-time');
    const reminderToggle = document.getElementById('reminder-toggle');
    
    // Step 1: Request permission on first load as specified
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Modal UI logic
    reminderBtn.addEventListener('click', () => {
        const data = loadData();
        reminderTimeInput.value = data.reminder.time;
        reminderToggle.checked = data.reminder.enabled;
        reminderModal.classList.remove('hidden');
    });

    closeReminder.addEventListener('click', () => {
        reminderModal.classList.add('hidden');
    });

    const testReminderBtn = document.getElementById('test-global-reminder');
    if (testReminderBtn) {
        testReminderBtn.addEventListener('click', () => {
            if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") triggerNotification("🛒 Test", "Notifications are working!");
                });
            } else if (Notification.permission === "granted") {
                triggerNotification("🛒 Test", "Notifications are working!");
            } else {
                alert("Your browser has blocked notifications for this site. Click the lock icon in the URL bar to allow them.");
            }
        });
    }

    saveReminder.addEventListener('click', () => {
        const data = loadData();
        data.reminder.time = reminderTimeInput.value;
        data.reminder.enabled = reminderToggle.checked;
        saveData(data);
        reminderModal.classList.add('hidden');
        
        // Ensure permission is granted when manually enabling from settings
        if (data.reminder.enabled && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    });

    // Start background polling
    startNotificationPolling();
}

function startNotificationPolling() {
    setInterval(() => {
        const data = loadData();
        const now = new Date();
        const today = now.toDateString();
        
        // 1. Process Global List Reminder
        if (data.reminder.enabled && data.reminder.time) {
            const [hh, mm] = data.reminder.time.split(":").map(Number);
            const isTime = now.getHours() === hh && now.getMinutes() === mm;
            
            if (isTime && data.reminder.lastNotified !== today) {
                triggerNotification("🛒 Grocery Reminder", "Time to check your grocery list!");
                data.reminder.lastNotified = today;
                saveData(data);
            }
        }

        // 2. Process Individual Item Reminders
        let itemsChanged = false;
        data.items.forEach(item => {
            if (item.alertTime && !item.done) {
                const [hh, mm] = item.alertTime.split(":").map(Number);
                const isTime = now.getHours() === hh && now.getMinutes() === mm;
                if (isTime && item.alertNotified !== today) {
                    triggerNotification("⏰ Item Reminder", `Don't forget to buy: ${item.emoji} ${item.name}!`);
                    item.alertNotified = today;
                    itemsChanged = true;
                }
            }
        });

        if (itemsChanged) {
            saveData(data);
        }

    }, 60_000); // Poll once per minute
}

function triggerNotification(title = "🛒 Grocery Reminder", body = "Time to check your grocery list!") {
    if (!("Notification" in window)) {
        console.warn("Notifications not supported in this browser fallback needed.");
        return;
    }

    if (Notification.permission === "granted") {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, {
                    body: body,
                    icon: "/icon-192.png",
                    badge: "/icon-192.png"
                }).catch(() => {
                    // Fallback to normal Web Notification (Safari fallback)
                    new Notification(title, { body: body });
                });
            });
        } else {
            // No service worker
            new Notification(title, { body: body });
        }
    }
}
