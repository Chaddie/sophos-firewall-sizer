/** Chrome / Chromium Web Push service worker. */
self.addEventListener("push", (event) => {
  let data = { title: "Sophos Firewall Sizer", body: "", url: "/dashboard" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Sophos Firewall Sizer", {
      body: data.body || undefined,
      tag: data.tag || data.url || "sophos-sizing",
      data: { url: data.url || "/dashboard" },
      icon: "/sophos-logo.svg",
      badge: "/sophos-logo.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(target);
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
