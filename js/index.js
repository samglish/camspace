/* ==========================================================
   CAM STUDENT HUB — js/index.js
   Bootstrap : démarrage, splash screen, navigation entre pages.
   ========================================================== */

'use strict';

(function () {

  function boot() {
    DB.open(function () {
      console.log('[App] Database ready');
      App.init();
      hideSplash();
    }, function (err) {
      console.error('[App] Database failed to open', err);
      hideSplash();
      App.toast('Erreur base de données — mode dégradé');
      App.init();
    });
  }

  function hideSplash() {
    var splash = document.getElementById('splash');
    var app = document.getElementById('app');
    if (splash) splash.classList.add('fade-out');
    if (app) app.classList.remove('hidden');
    setTimeout(function () { if (splash) splash.style.display = 'none'; }, 500);
  }

  // ── NAVIGATION ──────────────────────────────────────────
  function goToPage(page) {
    document.querySelectorAll('.page').forEach(function (el) { el.classList.remove('active'); });
    var target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(function (el) {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.bottom-nav-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.page === page);
    });

    var titles = {
      home: 'Home', profile: 'My Profile', sos: 'SOS Emergency',
      places: 'Places Guide', courses: 'Study Resources',
      agenda: 'Agenda / Tasks', contacts: 'Contacts', travel: 'Travel Safety Log'
    };
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'CAM Student Hub';

    closeDrawer();

    if (App.onPageShow) App.onPageShow(page);
  }

  function openDrawer() {
    document.getElementById('sideDrawer').classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');
  }
  function closeDrawer() {
    document.getElementById('sideDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').classList.remove('open');
  }

  function setupNavigation() {
    document.getElementById('menuToggle').addEventListener('click', openDrawer);
    document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

    document.querySelectorAll('[data-page]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        goToPage(el.dataset.page);
      });
    });
  }

  window.Navigation = { goToPage: goToPage };

  document.addEventListener('DOMContentLoaded', function () {
    setupNavigation();

    // Sur un vrai appareil Cordova, on attend 'deviceready'.
    // Dans un navigateur classique (cordova.js absent/muet), ce
    // signal n'arrive jamais : on démarre alors directement.
    var isCordova = !!(window.cordova);
    if (isCordova) {
      document.addEventListener('deviceready', boot, false);
    } else {
      console.warn('[App] Cordova not detected — running in plain browser mode');
      boot();
    }
  });

})();
