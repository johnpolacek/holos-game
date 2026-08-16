// The service worker, and it exists for exactly one reason: to receive a push
// while the tab is closed.
//
// NO FETCH HANDLER AND NO CACHING, on purpose. Offline play, asset caching and
// an install prompt are all deferred (a5-push-note.md §13); a worker that
// intercepted navigation could serve a stale asset and would quietly change
// what "deploy" means, and this one cannot, because it never sees a request.
//
// THE LINE IS FIXED AND LIVES HERE. The push carries NO PAYLOAD: the body of
// the POST is empty, so the push service that relays it learns only that this
// endpoint received something. The notification therefore names no star, no
// kind, no year and no civilization. "The report has the rest" is the whole
// no-leak posture in five words: the content is read in the game, through the
// cone, as always.

const TITLE = "A watch tripped";
const BODY = "The observatory caught something it watches for. The report has the rest.";

// UNCONDITIONAL, and there is deliberately no branch here that could skip it.
// Chrome and Safari both retire a subscription that receives pushes without
// showing a notification, so a "silent" path would not be a quieter feature,
// it would be the feature deleting itself. Do not add one.
self.addEventListener("push", (event) => {
  event.waitUntil(self.registration.showNotification(TITLE, { body: BODY }));
});

// Focus the game if it is already open anywhere, else open it. A tap is a
// request to go and look, and the board is what has the answer.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of open) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })(),
  );
});

// Best effort only: `pushsubscriptionchange` is unevenly implemented, and the
// reliable healer is the page's own boot re-sync (client/src/push.ts), which
// re-sends the endpoint on every load where permission is already granted.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const key = event.oldSubscription && event.oldSubscription.options
        ? event.oldSubscription.options.applicationServerKey
        : null;
      if (!key) return;
      try {
        await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      } catch {
        // The next load re-subscribes and tells the server.
      }
    })(),
  );
});
