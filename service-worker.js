const CACHE = "ourown-hub-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./songs.html",
  "./audios.html",
  "./photos.html",
  "./community.html",
  "./chat.html",
  "./about.html",
  "./login.html",
  "./register.html",

  "./css/style.css",

  "./js/media.js",
  "./js/photos.js",
  "./js/community.js",
  "./js/chat.js",
  "./js/pwa.js",
  "./js/firebase-config.js",
  "./js/firebase-core.js",

  "./manifest.json",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/nrm-logo.png",
  "./assets/images/placeholder.svg"
];


/* ======================================
   INSTALL
====================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );

});


/* ======================================
   ACTIVATE
====================================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())

  );

});


/* ======================================
   FETCH
====================================== */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }


  const request = event.request;


  /* ====================================
     HTML PAGES
     NETWORK FIRST
  ==================================== */

  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)

        .then(networkResponse => {

          const copy =
            networkResponse.clone();

          caches
            .open(CACHE)
            .then(cache => {
              cache.put(
                request,
                copy
              );
            });

          return networkResponse;

        })

        .catch(() =>

          caches
            .match(request)
            .then(cachedPage => {

              if (cachedPage) {
                return cachedPage;
              }

              return caches.match(
                "./index.html"
              );

            })

        )

    );

    return;

  }


  /* ====================================
     CSS / JS / IMAGES / ICONS
     CACHE FIRST
  ==================================== */

  event.respondWith(

    caches
      .match(request)
      .then(cachedResponse => {

        if (cachedResponse) {

          /* Update cache in background */

          fetch(request)
            .then(networkResponse => {

              if (
                networkResponse &&
                networkResponse.status === 200
              ) {

                caches
                  .open(CACHE)
                  .then(cache => {

                    cache.put(
                      request,
                      networkResponse.clone()
                    );

                  });

              }

            })
            .catch(() => {});

          return cachedResponse;

        }


        return fetch(request)

          .then(networkResponse => {

            if (
              !networkResponse ||
              networkResponse.status !== 200
            ) {
              return networkResponse;
            }


            const copy =
              networkResponse.clone();


            caches
              .open(CACHE)
              .then(cache => {

                cache.put(
                  request,
                  copy
                );

              });


            return networkResponse;

          });

      })

  );

});