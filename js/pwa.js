let deferredPrompt = null;

const installBtn = document.getElementById("installBtn");


/* ======================================
   PWA INSTALL PROMPT
====================================== */

window.addEventListener("beforeinstallprompt", event => {

  event.preventDefault();

  deferredPrompt = event;

  if (installBtn) {
    installBtn.hidden = false;
  }

});


/* ======================================
   INSTALL BUTTON
====================================== */

if (installBtn) {

  installBtn.addEventListener("click", async () => {

    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    const choiceResult =
      await deferredPrompt.userChoice;

    console.log(
      "PWA install choice:",
      choiceResult.outcome
    );

    deferredPrompt = null;

    installBtn.hidden = true;

  });

}


/* ======================================
   APP INSTALLED
====================================== */

window.addEventListener("appinstalled", () => {

  console.log("OurOwn Hub installed successfully.");

  deferredPrompt = null;

  if (installBtn) {
    installBtn.hidden = true;
  }

});


/* ======================================
   SERVICE WORKER
====================================== */

if ("serviceWorker" in navigator) {

  window.addEventListener("load", async () => {

    try {

      const registration =
        await navigator.serviceWorker.register(
          "./service-worker.js"
        );

      console.log(
        "Service worker registered:",
        registration.scope
      );

    } catch (error) {

      console.error(
        "Service worker registration failed:",
        error
      );

    }

  });

}