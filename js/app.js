/* ==========================================================
   CAM STUDENT HUB — js/app.js
   Logique métier : relie le HTML à DB (js/db.js).
   ========================================================== */

'use strict';

var App = (function () {

  var currentPlaceFilter = 'all';

  // ══════════════════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════════════════
  function init() {
    setupCollapsibles();
    setupProfile();
    setupSOS();
    setupPlaces();
    setupCourses();
    setupAgenda();
    setupContacts();
    setupTravel();

    loadProfile();
    refreshHome();
  }

  function onPageShow(page) {
    switch (page) {
      case 'home': refreshHome(); break;
      case 'profile': loadProfile(); break;
      case 'sos': renderSOSHistory(); break;
      case 'places': renderPlaces(); break;
      case 'courses': renderCourses(); break;
      case 'agenda': renderTasks(); break;
      case 'contacts': renderContacts(); break;
      case 'travel': renderTravel(); break;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  TOAST
  // ══════════════════════════════════════════════════════════
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('globalToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ══════════════════════════════════════════════════════════
  //  COLLAPSIBLES (Add forms)
  // ══════════════════════════════════════════════════════════
  function setupCollapsibles() {
    var pairs = [
      ['toggleAddPlace', 'addPlaceBody'],
      ['toggleAddCourse', 'addCourseBody'],
      ['toggleAddTask', 'addTaskBody'],
      ['toggleAddContact', 'addContactBody'],
      ['toggleAddTravel', 'addTravelBody'],
    ];
    pairs.forEach(function (pair) {
      var header = document.getElementById(pair[0]);
      var body = document.getElementById(pair[1]);
      if (!header || !body) return;
      header.addEventListener('click', function () {
        var isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        var chevron = header.querySelector('.chevron');
        if (chevron) chevron.classList.toggle('open', !isOpen);
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  HOME
  // ══════════════════════════════════════════════════════════
  function refreshHome() {
    DB.loadProfile(function (err, profile) {
      var nameEl = document.getElementById('homeStudentName');
      var drawerName = document.getElementById('drawerName');
      var name = (profile && profile.name) ? profile.name : 'Student';
      if (nameEl) nameEl.textContent = 'Welcome, ' + name;
      if (drawerName) drawerName.textContent = name;
    });

    var greetingEl = document.getElementById('homeGreeting');
    if (greetingEl) {
      var h = new Date().getHours();
      var greet = h < 12 ? 'Good Morning!' : (h < 18 ? 'Good Afternoon!' : 'Good Evening!');
      greetingEl.textContent = greet;
    }

    document.getElementById('homeSosBtn').onclick = function () {
      Navigation.goToPage('sos');
      triggerSOS();
    };
  }

  // ══════════════════════════════════════════════════════════
  //  PROFILE
  // ══════════════════════════════════════════════════════════
  function setupProfile() {
    document.getElementById('saveProfileBtn').addEventListener('click', function () {
      var name = document.getElementById('profileName').value.trim();
      var phone = document.getElementById('profilePhone').value.trim();
      if (!name) { toast('Please enter your name'); return; }
      DB.saveProfile(name, phone, function (err) {
        if (err) { toast('Error saving profile'); return; }
        toast('Profile saved');
        loadProfile();
        refreshHome();
      });
    });
  }

  function loadProfile() {
    DB.loadProfile(function (err, profile) {
      var display = document.getElementById('profileDisplay');
      if (profile) {
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profilePhone').value = profile.phone || '';
        document.getElementById('displayName').textContent = profile.name || '—';
        document.getElementById('displayPhone').textContent = profile.phone || '—';
        if (display) display.style.display = 'block';
      } else {
        if (display) display.style.display = 'none';
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SOS  +  ALARME (sirène sonore + vibration)
  // ══════════════════════════════════════════════════════════
  var alarmCtx = null;
  var alarmOsc = null;
  var alarmGain = null;
  var alarmSweepInterval = null;
  var alarmVibrateInterval = null;

  /** Démarre la sirène (audio) + la vibration en boucle, jusqu'à stopAlarm() */
  function startAlarm() {
    if (alarmCtx) return; // déjà en cours

    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      alarmCtx = new AudioCtx();
      alarmOsc = alarmCtx.createOscillator();
      alarmGain = alarmCtx.createGain();
      alarmOsc.type = 'sine';
      alarmGain.gain.value = 0.001;
      alarmOsc.frequency.value = 650;
      alarmOsc.connect(alarmGain).connect(alarmCtx.destination);
      alarmOsc.start();
      // Montée en volume progressive pour éviter un "clic" audio
      alarmGain.gain.linearRampToValueAtTime(0.4, alarmCtx.currentTime + 0.3);

      var high = false;
      alarmSweepInterval = setInterval(function () {
        high = !high;
        var target = high ? 1050 : 650;
        alarmOsc.frequency.linearRampToValueAtTime(target, alarmCtx.currentTime + 0.4);
      }, 450);
    } catch (e) {
      console.warn('[Alarm] Web Audio unavailable', e);
    }

    if (navigator.vibrate) {
      var pattern = [400, 200, 400, 200, 400, 600];
      navigator.vibrate(pattern);
      alarmVibrateInterval = setInterval(function () { navigator.vibrate(pattern); }, 2100);
    }

    var stopBtn = document.getElementById('stopAlarmBtn');
    if (stopBtn) {
      stopBtn.innerHTML = Icon.svg('stop', 'icon-sm') + ' Stop Alarm';
      stopBtn.style.display = 'inline-flex';
      stopBtn.onclick = stopAlarm;
    }
  }

  /** Coupe la sirène et la vibration */
  function stopAlarm() {
    if (alarmSweepInterval) { clearInterval(alarmSweepInterval); alarmSweepInterval = null; }
    if (alarmVibrateInterval) { clearInterval(alarmVibrateInterval); alarmVibrateInterval = null; }
    if (navigator.vibrate) navigator.vibrate(0);
    if (alarmOsc) { try { alarmOsc.stop(); } catch (e) {} alarmOsc = null; }
    if (alarmCtx) { try { alarmCtx.close(); } catch (e) {} alarmCtx = null; }

    var stopBtn = document.getElementById('stopAlarmBtn');
    if (stopBtn) stopBtn.style.display = 'none';
  }

  function setupSOS() {
    document.getElementById('sosBtn').addEventListener('click', triggerSOS);
    renderSOSHistory();
  }

  function triggerSOS() {
    var statusCard = document.getElementById('sosStatus');
    var statusText = document.getElementById('sosStatusText');
    statusCard.style.display = 'block';
    statusText.innerHTML = Icon.svg('radio', 'icon-sm') + ' Getting your location...';

    // L'alarme démarre immédiatement, sans attendre le GPS.
    startAlarm();

    if (!navigator.geolocation) {
      statusText.innerHTML = Icon.svg('alert-triangle', 'icon-sm') + ' Geolocation not supported on this device.';
      return;
    }

    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;

      DB.saveSOS(lat, lng, function (err) {
        if (err) { toast('Error saving SOS'); return; }
        statusText.innerHTML = Icon.svg('check-circle', 'icon-sm') + ' Location captured: ' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '<br>Opening WhatsApp...';
        renderSOSHistory();

        var mapsLink = 'https://maps.google.com/?q=' + lat + ',' + lng;
        var message = 'EMERGENCY! I need help. My location: ' + mapsLink;
        var waUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
        window.open(waUrl, '_system');
      });
    }, function (err) {
      statusText.innerHTML = Icon.svg('alert-triangle', 'icon-sm') + ' Could not get location (' + err.message + '). Check location permissions.';
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  function renderSOSHistory() {
    DB.listSOS(function (err, rows) {
      var container = document.getElementById('sosList');
      if (!container) return;
      if (!rows || rows.length === 0) {
        container.innerHTML = emptyState('shield', 'No SOS alerts yet');
        return;
      }
      container.innerHTML = rows.map(function (r) {
        var d = new Date(r.date);
        return (
          '<div class="list-item">' +
            '<div class="list-item-icon">' + Icon.svg('alert-triangle') + '</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">SOS Alert</div>' +
              '<div class="list-item-sub">' + d.toLocaleString() + '<br>' +
                r.latitude.toFixed(5) + ', ' + r.longitude.toFixed(5) + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PLACES
  // ══════════════════════════════════════════════════════════
  function setupPlaces() {
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPlaceFilter = btn.dataset.filter;
        renderPlaces();
      });
    });

    document.getElementById('savePlaceBtn').addEventListener('click', function () {
      var name = document.getElementById('placeName').value.trim();
      var desc = document.getElementById('placeDesc').value.trim();
      var type = document.getElementById('placeType').value;
      var lat = parseFloat(document.getElementById('placeLat').value);
      var lng = parseFloat(document.getElementById('placeLng').value);

      if (!name) { toast('Please enter a place name'); return; }

      DB.addPlace(name, desc, type, isNaN(lat) ? null : lat, isNaN(lng) ? null : lng, function (err) {
        if (err) { toast('Error saving place'); return; }
        toast('Place added');
        ['placeName', 'placeDesc', 'placeLat', 'placeLng'].forEach(function (id) {
          document.getElementById(id).value = '';
        });
        renderPlaces();
      });
    });

    renderPlaces();
  }

  var TYPE_META = {
    restaurant: { icon: 'utensils', badge: 'badge-food', label: 'Food' },
    housing:    { icon: 'building', badge: 'badge-housing', label: 'Housing' },
    education:  { icon: 'book-open', badge: 'badge-education', label: 'Education' },
    danger:     { icon: 'alert-triangle', badge: 'badge-danger', label: 'Danger' },
    other:      { icon: 'bookmark', badge: 'badge-other', label: 'Other' },
  };

  function renderPlaces() {
    DB.listPlaces(currentPlaceFilter, function (err, rows) {
      var container = document.getElementById('placesList');
      if (!container) return;
      if (!rows || rows.length === 0) {
        container.innerHTML = emptyState('map-pin', 'No places found');
        return;
      }
      container.innerHTML = rows.map(function (r) {
        var meta = TYPE_META[r.type] || TYPE_META.other;
        return (
          '<div class="list-item">' +
            '<div class="list-item-icon">' + Icon.svg(meta.icon) + '</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">' + escapeHtml(r.name) + '</div>' +
              '<div class="list-item-sub">' + escapeHtml(r.description || '') + '</div>' +
              '<span class="badge ' + meta.badge + '">' + meta.label + '</span>' +
            '</div>' +
            '<div class="list-item-actions">' +
              '<button class="action-btn delete" data-action="delete-place" data-id="' + r.id + '">' + Icon.svg('trash') + '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      container.querySelectorAll('[data-action="delete-place"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.deletePlace(parseInt(btn.dataset.id, 10), function () { toast('Place deleted'); renderPlaces(); });
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  COURSES
  // ══════════════════════════════════════════════════════════
  function setupCourses() {
    document.getElementById('saveCourseBtn').addEventListener('click', function () {
      var title = document.getElementById('courseTitle').value.trim();
      var filePath = document.getElementById('courseFile').value.trim();
      var category = document.getElementById('courseCategory').value;
      if (!title) { toast('Please enter a title'); return; }

      DB.addCourse(title, filePath, category, function (err) {
        if (err) { toast('Error saving resource'); return; }
        toast('Resource added');
        document.getElementById('courseTitle').value = '';
        document.getElementById('courseFile').value = '';
        renderCourses();
      });
    });
    renderCourses();
  }

  var COURSE_CAT_ICON = {
    lecture: 'book', 'past-paper': 'file-text', textbook: 'book-open', assignment: 'edit', other: 'bookmark'
  };

  function renderCourses() {
    DB.listCourses(function (err, rows) {
      var container = document.getElementById('coursesList');
      if (!container) return;
      if (!rows || rows.length === 0) {
        container.innerHTML = emptyState('book-open', 'No study resources yet');
        return;
      }
      container.innerHTML = rows.map(function (r) {
        var icon = COURSE_CAT_ICON[r.category] || 'bookmark';
        return (
          '<div class="list-item">' +
            '<div class="list-item-icon">' + Icon.svg(icon) + '</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">' + escapeHtml(r.title) + '</div>' +
              '<div class="list-item-sub">' + escapeHtml(r.file_path || 'No file reference') + '</div>' +
            '</div>' +
            '<div class="list-item-actions">' +
              '<button class="action-btn delete" data-action="delete-course" data-id="' + r.id + '">' + Icon.svg('trash') + '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      container.querySelectorAll('[data-action="delete-course"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.deleteCourse(parseInt(btn.dataset.id, 10), function () { toast('Resource deleted'); renderCourses(); });
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  AGENDA
  // ══════════════════════════════════════════════════════════
  function setupAgenda() {
    document.getElementById('saveTaskBtn').addEventListener('click', function () {
      var title = document.getElementById('taskTitle').value.trim();
      var date = document.getElementById('taskDate').value;
      var desc = document.getElementById('taskDesc').value.trim();
      if (!title) { toast('Please enter a task title'); return; }

      DB.addTask(title, date, desc, function (err) {
        if (err) { toast('Error saving task'); return; }
        toast('Task added');
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDate').value = '';
        document.getElementById('taskDesc').value = '';
        renderTasks();
      });
    });
    renderTasks();
  }

  function renderTasks() {
    DB.listTasks(function (err, rows) {
      var container = document.getElementById('taskList');
      if (!container) return;
      if (!rows || rows.length === 0) {
        container.innerHTML = emptyState('calendar', 'No tasks scheduled');
        return;
      }
      container.innerHTML = rows.map(function (r) {
        return (
          '<div class="list-item">' +
            '<div class="list-item-icon">' + Icon.svg('calendar') + '</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">' + escapeHtml(r.title) + '</div>' +
              '<div class="list-item-sub">' + (r.date ? r.date : 'No date') +
                (r.description ? '<br>' + escapeHtml(r.description) : '') + '</div>' +
            '</div>' +
            '<div class="list-item-actions">' +
              '<button class="action-btn delete" data-action="delete-task" data-id="' + r.id + '">' + Icon.svg('trash') + '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      container.querySelectorAll('[data-action="delete-task"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.deleteTask(parseInt(btn.dataset.id, 10), function () { toast('Task deleted'); renderTasks(); });
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  CONTACTS
  // ══════════════════════════════════════════════════════════
  function setupContacts() {
    document.getElementById('saveContactBtn').addEventListener('click', function () {
      var name = document.getElementById('contactName').value.trim();
      var phone = document.getElementById('contactPhone').value.trim();
      var role = document.getElementById('contactRole').value;
      if (!name) { toast('Please enter a name'); return; }

      DB.addContact(name, phone, role, function (err) {
        if (err) { toast('Error saving contact'); return; }
        toast('Contact added');
        document.getElementById('contactName').value = '';
        document.getElementById('contactPhone').value = '';
        renderContacts();
      });
    });
    renderContacts();
  }

  var ROLE_ICON = {
    emergency: 'alert-triangle', lecturer: 'graduation-cap', friend: 'users', family: 'users', security: 'shield', other: 'bookmark'
  };

  function renderContacts() {
    DB.listContacts(function (err, rows) {
      var container = document.getElementById('contactsList');
      if (!container) return;
      if (!rows || rows.length === 0) {
        container.innerHTML = emptyState('phone', 'No contacts yet');
        return;
      }
      container.innerHTML = rows.map(function (r) {
        var icon = ROLE_ICON[r.role] || 'bookmark';
        return (
          '<div class="list-item">' +
            '<div class="list-item-icon">' + Icon.svg(icon) + '</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">' + escapeHtml(r.name) + '</div>' +
              '<div class="list-item-sub">' + escapeHtml(r.phone || 'No phone') + '</div>' +
            '</div>' +
            '<div class="list-item-actions">' +
              (r.phone ? '<a class="action-btn call" href="tel:' + escapeHtml(r.phone) + '">' + Icon.svg('phone-call') + '</a>' : '') +
              '<button class="action-btn delete" data-action="delete-contact" data-id="' + r.id + '">' + Icon.svg('trash') + '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      container.querySelectorAll('[data-action="delete-contact"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.deleteContact(parseInt(btn.dataset.id, 10), function () { toast('Contact deleted'); renderContacts(); });
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  TRAVEL LOG
  // ══════════════════════════════════════════════════════════
  function setupTravel() {
    document.getElementById('saveTravelBtn').addEventListener('click', function () {
      var from = document.getElementById('travelFrom').value.trim();
      var to = document.getElementById('travelTo').value.trim();
      var note = document.getElementById('travelNote').value.trim();
      if (!from) { toast('Please enter a departure point'); return; }

      DB.addTravel(from, to, note, function (err) {
        if (err) { toast('Error saving log'); return; }
        toast('Journey logged');
        document.getElementById('travelFrom').value = '';
        document.getElementById('travelTo').value = '';
        document.getElementById('travelNote').value = '';
        renderTravel();
      });
    });
    renderTravel();
  }

  function renderTravel() {
    DB.listTravel(function (err, rows) {
      var container = document.getElementById('travelList');
      if (!container) return;
      if (!rows || rows.length === 0) {
        container.innerHTML = emptyState('route', 'No journeys logged yet');
        return;
      }
      container.innerHTML = rows.map(function (r) {
        var d = new Date(r.date);
        return (
          '<div class="list-item">' +
            '<div class="list-item-icon">' + Icon.svg('route') + '</div>' +
            '<div class="list-item-content">' +
              '<div class="list-item-title">' + escapeHtml(r.departure) + ' → ' + escapeHtml(r.destination || '?') + '</div>' +
              '<div class="list-item-sub">' + d.toLocaleString() +
                (r.note ? '<br>' + escapeHtml(r.note) : '') + '</div>' +
            '</div>' +
            '<div class="list-item-actions">' +
              '<button class="action-btn delete" data-action="delete-travel" data-id="' + r.id + '">' + Icon.svg('trash') + '</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      container.querySelectorAll('[data-action="delete-travel"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          DB.deleteTravel(parseInt(btn.dataset.id, 10), function () { toast('Log deleted'); renderTravel(); });
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════
  function emptyState(iconName, text) {
    return '<div class="empty-state"><div class="empty-icon">' + Icon.svg(iconName, 'icon-xl') + '</div><p>' + text + '</p></div>';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    init: init,
    onPageShow: onPageShow,
    toast: toast
  };

})();
