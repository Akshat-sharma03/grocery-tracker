self.addEventListener("install", event => {
    self.skipWaiting();
    console.log('Service Worker installed');
});

self.addEventListener("push", event => {
  event.waitUntil(
    self.registration.showNotification("🛒 Grocery Reminder", {
      body: "Time to check your grocery list!",
      icon: "/icon-192.png",
      badge: "/icon-72.png"
    })
  );
});
