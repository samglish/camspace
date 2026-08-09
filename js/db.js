/* ==========================================================
   CAM STUDENT HUB — js/db.js
   Database Helper
   - Sur un vrai appareil (Cordova) : cordova-sqlite-storage
     -> crée réellement le fichier cam_student_hub.db sur le device.
   - Dans un navigateur (test bureau) : WebSQL a été retiré de
     Chrome/Edge, donc on bascule sur un mini-moteur localStorage
     qui expose exactement la même API publique. app.js n'a pas
     besoin de savoir lequel des deux est actif.
   ========================================================== */

'use strict';

var DB = (function () {

  var _db = null;          // handle SQLite (Cordova) si dispo
  var _backend = null;     // 'sqlite' | 'local'

  var DB_NAME = 'cam_student_hub.db';
  var LS_PREFIX = 'csh_';

  var TABLES = ['profile', 'sos', 'lieux', 'cours', 'agenda', 'contacts', 'trajet'];

  // ══════════════════════════════════════════════════════════
  //  OPEN DATABASE
  // ══════════════════════════════════════════════════════════
  function open(successCb, errorCb) {
    if (window.sqlitePlugin && window.sqlitePlugin.openDatabase) {
      try {
        _backend = 'sqlite';
        _db = window.sqlitePlugin.openDatabase(
          { name: DB_NAME, location: 'default' },
          function () {
            console.log('[DB] SQLite (Cordova) opened successfully');
            _createTables(successCb, errorCb);
          },
          function (err) {
            console.error('[DB] Failed to open SQLite database:', err);
            if (errorCb) errorCb(err);
          }
        );
        return;
      } catch (e) {
        console.warn('[DB] sqlitePlugin present but failed, falling back to local storage', e);
      }
    }

    // ── Navigateur : pas de cordova-sqlite-storage, pas de WebSQL ──
    console.warn('[DB] No sqlitePlugin found (running in a browser). Using localStorage engine.');
    _backend = 'local';
    _localInit();
    if (successCb) successCb();
  }

  // ══════════════════════════════════════════════════════════
  //  CREATE ALL TABLES (backend sqlite uniquement)
  // ══════════════════════════════════════════════════════════
  function _createTables(successCb, errorCb) {
    _db.transaction(function (tx) {
      tx.executeSql('CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT)', [], null, _sqlError('CREATE profile'));
      tx.executeSql('CREATE TABLE IF NOT EXISTS sos (id INTEGER PRIMARY KEY AUTOINCREMENT, latitude REAL, longitude REAL, date TEXT NOT NULL)', [], null, _sqlError('CREATE sos'));
      tx.executeSql('CREATE TABLE IF NOT EXISTS lieux (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, type TEXT, latitude REAL, longitude REAL)', [], null, _sqlError('CREATE lieux'));
      tx.executeSql('CREATE TABLE IF NOT EXISTS cours (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, file_path TEXT, category TEXT)', [], null, _sqlError('CREATE cours'));
      tx.executeSql('CREATE TABLE IF NOT EXISTS agenda (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, date TEXT, description TEXT)', [], null, _sqlError('CREATE agenda'));
      tx.executeSql('CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, role TEXT)', [], null, _sqlError('CREATE contacts'));
      tx.executeSql('CREATE TABLE IF NOT EXISTS trajet (id INTEGER PRIMARY KEY AUTOINCREMENT, departure TEXT NOT NULL, destination TEXT, note TEXT, date TEXT NOT NULL)', [], null, _sqlError('CREATE trajet'));
    },
    function (err) {
      console.error('[DB] Transaction error creating tables:', err);
      if (errorCb) errorCb(err);
    },
    function () {
      console.log('[DB] All tables created/verified successfully');
      _seedDefaultPlaces();
      if (successCb) successCb();
    });
  }

  function _seedDefaultPlaces() {
    if (_backend === 'local') return _localSeedDefaultPlaces();
    _db.transaction(function (tx) {
      tx.executeSql('SELECT COUNT(*) as cnt FROM lieux', [], function (tx, result) {
        if (result.rows.item(0).cnt === 0) {
          var defaults = [
            ['Modibbo Adama University', 'Main campus of MAU, Yola', 'education', 9.2035, 12.4954],
            ['American University of Nigeria', 'AUN campus, Yola', 'education', 9.2450, 12.4590],
            ['Jimeta Market', 'Busy market area — be careful with valuables at night', 'danger', 9.2882, 12.4600],
            ['Federal Medical Centre Yola', 'Main hospital in Yola', 'education', 9.2310, 12.4870],
            ['Yola Campus Hostel Area', 'Student housing near MAU', 'housing', 9.2040, 12.4970],
            ['Noodles Joint - Gate Area', 'Affordable food near campus gate', 'restaurant', 9.2028, 12.4941],
          ];
          defaults.forEach(function (p) {
            tx.executeSql('INSERT INTO lieux (name, description, type, latitude, longitude) VALUES (?,?,?,?,?)', p, null, _sqlError('seed place'));
          });
        }
      }, _sqlError('count lieux'));
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PROFILE
  // ══════════════════════════════════════════════════════════
  function saveProfile(name, phone, cb) {
    if (_backend === 'local') {
      _localSet('profile', [{ id: 1, name: name, phone: phone }]);
      return cb && cb(null);
    }
    _db.transaction(function (tx) {
      tx.executeSql('DELETE FROM profile', []);
      tx.executeSql('INSERT INTO profile (name, phone) VALUES (?, ?)', [name, phone],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function loadProfile(cb) {
    if (_backend === 'local') {
      var rows = _localGet('profile');
      return cb(null, rows.length ? rows[0] : null);
    }
    _db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM profile LIMIT 1', [],
        function (tx, result) { cb(null, result.rows.length > 0 ? result.rows.item(0) : null); },
        function (tx, err) { cb(err, null); }
      );
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SOS
  // ══════════════════════════════════════════════════════════
  function saveSOS(lat, lng, cb) {
    var date = new Date().toISOString();
    if (_backend === 'local') {
      return _localInsert('sos', { latitude: lat, longitude: lng, date: date }, cb);
    }
    _db.transaction(function (tx) {
      tx.executeSql('INSERT INTO sos (latitude, longitude, date) VALUES (?, ?, ?)', [lat, lng, date],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function listSOS(cb) {
    if (_backend === 'local') return cb(null, _localGet('sos').slice().reverse());
    _db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM sos ORDER BY id DESC', [],
        function (tx, result) { cb(null, _rowsToArray(result)); },
        function (tx, err) { cb(err, []); }
      );
    });
  }

  // ══════════════════════════════════════════════════════════
  //  PLACES (lieux)
  // ══════════════════════════════════════════════════════════
  function addPlace(name, desc, type, lat, lng, cb) {
    if (_backend === 'local') {
      return _localInsert('lieux', { name: name, description: desc, type: type, latitude: lat, longitude: lng }, cb);
    }
    _db.transaction(function (tx) {
      tx.executeSql('INSERT INTO lieux (name, description, type, latitude, longitude) VALUES (?,?,?,?,?)', [name, desc, type, lat, lng],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function listPlaces(filter, cb) {
    if (_backend === 'local') {
      var rows = _localGet('lieux').slice().reverse();
      if (filter && filter !== 'all') rows = rows.filter(function (r) { return r.type === filter; });
      return cb(null, rows);
    }
    _db.transaction(function (tx) {
      var sql, params;
      if (!filter || filter === 'all') { sql = 'SELECT * FROM lieux ORDER BY id DESC'; params = []; }
      else { sql = 'SELECT * FROM lieux WHERE type = ? ORDER BY id DESC'; params = [filter]; }
      tx.executeSql(sql, params,
        function (tx, result) { cb(null, _rowsToArray(result)); },
        function (tx, err) { cb(err, []); }
      );
    });
  }

  function deletePlace(id, cb) { _deleteById('lieux', id, cb); }

  // ══════════════════════════════════════════════════════════
  //  COURSES (cours)
  // ══════════════════════════════════════════════════════════
  function addCourse(title, filePath, category, cb) {
    if (_backend === 'local') return _localInsert('cours', { title: title, file_path: filePath, category: category }, cb);
    _db.transaction(function (tx) {
      tx.executeSql('INSERT INTO cours (title, file_path, category) VALUES (?,?,?)', [title, filePath, category],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function listCourses(cb) {
    if (_backend === 'local') return cb(null, _localGet('cours').slice().reverse());
    _db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM cours ORDER BY id DESC', [],
        function (tx, result) { cb(null, _rowsToArray(result)); },
        function (tx, err) { cb(err, []); }
      );
    });
  }

  function deleteCourse(id, cb) { _deleteById('cours', id, cb); }

  // ══════════════════════════════════════════════════════════
  //  AGENDA
  // ══════════════════════════════════════════════════════════
  function addTask(title, date, desc, cb) {
    if (_backend === 'local') return _localInsert('agenda', { title: title, date: date, description: desc }, cb);
    _db.transaction(function (tx) {
      tx.executeSql('INSERT INTO agenda (title, date, description) VALUES (?,?,?)', [title, date, desc],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function listTasks(cb) {
    if (_backend === 'local') {
      var rows = _localGet('agenda').slice().sort(function (a, b) {
        if (a.date === b.date) return b.id - a.id;
        return (a.date || '').localeCompare(b.date || '');
      });
      return cb(null, rows);
    }
    _db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM agenda ORDER BY date ASC, id DESC', [],
        function (tx, result) { cb(null, _rowsToArray(result)); },
        function (tx, err) { cb(err, []); }
      );
    });
  }

  function deleteTask(id, cb) { _deleteById('agenda', id, cb); }

  // ══════════════════════════════════════════════════════════
  //  CONTACTS
  // ══════════════════════════════════════════════════════════
  function addContact(name, phone, role, cb) {
    if (_backend === 'local') return _localInsert('contacts', { name: name, phone: phone, role: role }, cb);
    _db.transaction(function (tx) {
      tx.executeSql('INSERT INTO contacts (name, phone, role) VALUES (?,?,?)', [name, phone, role],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function listContacts(cb) {
    if (_backend === 'local') {
      var rows = _localGet('contacts').slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
      return cb(null, rows);
    }
    _db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM contacts ORDER BY name ASC', [],
        function (tx, result) { cb(null, _rowsToArray(result)); },
        function (tx, err) { cb(err, []); }
      );
    });
  }

  function deleteContact(id, cb) { _deleteById('contacts', id, cb); }

  // ══════════════════════════════════════════════════════════
  //  TRAVEL LOG (trajet)
  // ══════════════════════════════════════════════════════════
  function addTravel(departure, destination, note, cb) {
    var date = new Date().toISOString();
    if (_backend === 'local') return _localInsert('trajet', { departure: departure, destination: destination, note: note, date: date }, cb);
    _db.transaction(function (tx) {
      tx.executeSql('INSERT INTO trajet (departure, destination, note, date) VALUES (?,?,?,?)', [departure, destination, note, date],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function listTravel(cb) {
    if (_backend === 'local') return cb(null, _localGet('trajet').slice().reverse());
    _db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM trajet ORDER BY id DESC', [],
        function (tx, result) { cb(null, _rowsToArray(result)); },
        function (tx, err) { cb(err, []); }
      );
    });
  }

  function deleteTravel(id, cb) { _deleteById('trajet', id, cb); }

  // ══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS — SQLite backend
  // ══════════════════════════════════════════════════════════
  function _deleteById(table, id, cb) {
    if (_backend === 'local') return _localDelete(table, id, cb);
    _db.transaction(function (tx) {
      tx.executeSql('DELETE FROM ' + table + ' WHERE id = ?', [id],
        function () { if (cb) cb(null); },
        function (tx, err) { if (cb) cb(err); }
      );
    });
  }

  function _rowsToArray(result) {
    var arr = [];
    for (var i = 0; i < result.rows.length; i++) arr.push(result.rows.item(i));
    return arr;
  }

  function _sqlError(label) {
    return function (tx, err) {
      console.error('[DB] SQL error in ' + label + ':', err.message || err);
      return false;
    };
  }

  // ══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS — localStorage backend (mode navigateur)
  // ══════════════════════════════════════════════════════════
  function _localInit() {
    TABLES.forEach(function (t) {
      if (localStorage.getItem(LS_PREFIX + t) === null) {
        localStorage.setItem(LS_PREFIX + t, JSON.stringify([]));
      }
    });
    if (localStorage.getItem(LS_PREFIX + '_seq') === null) {
      localStorage.setItem(LS_PREFIX + '_seq', JSON.stringify({}));
    }
    _localSeedDefaultPlaces();
  }

  function _localSeedDefaultPlaces() {
    var rows = _localGet('lieux');
    if (rows.length > 0) return;
    var defaults = [
      ['Modibbo Adama University', 'Main campus of MAU, Yola', 'education', 9.2035, 12.4954],
      ['American University of Nigeria', 'AUN campus, Yola', 'education', 9.2450, 12.4590],
      ['Jimeta Market', 'Busy market area — be careful with valuables at night', 'danger', 9.2882, 12.4600],
      ['Federal Medical Centre Yola', 'Main hospital in Yola', 'education', 9.2310, 12.4870],
      ['Yola Campus Hostel Area', 'Student housing near MAU', 'housing', 9.2040, 12.4970],
      ['Noodles Joint - Gate Area', 'Affordable food near campus gate', 'restaurant', 9.2028, 12.4941],
    ];
    defaults.forEach(function (p) {
      _localInsert('lieux', { name: p[0], description: p[1], type: p[2], latitude: p[3], longitude: p[4] });
    });
  }

  function _localGet(table) {
    try { return JSON.parse(localStorage.getItem(LS_PREFIX + table)) || []; }
    catch (e) { return []; }
  }

  function _localSet(table, rows) {
    localStorage.setItem(LS_PREFIX + table, JSON.stringify(rows));
  }

  function _localNextId(table) {
    var seq = JSON.parse(localStorage.getItem(LS_PREFIX + '_seq')) || {};
    seq[table] = (seq[table] || 0) + 1;
    localStorage.setItem(LS_PREFIX + '_seq', JSON.stringify(seq));
    return seq[table];
  }

  function _localInsert(table, obj, cb) {
    var rows = _localGet(table);
    obj.id = _localNextId(table);
    rows.push(obj);
    _localSet(table, rows);
    if (cb) cb(null);
  }

  function _localDelete(table, id, cb) {
    var rows = _localGet(table).filter(function (r) { return r.id !== id; });
    _localSet(table, rows);
    if (cb) cb(null);
  }

  // ══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════
  return {
    open: open,
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    saveSOS: saveSOS,
    listSOS: listSOS,
    addPlace: addPlace,
    listPlaces: listPlaces,
    deletePlace: deletePlace,
    addCourse: addCourse,
    listCourses: listCourses,
    deleteCourse: deleteCourse,
    addTask: addTask,
    listTasks: listTasks,
    deleteTask: deleteTask,
    addContact: addContact,
    listContacts: listContacts,
    deleteContact: deleteContact,
    addTravel: addTravel,
    listTravel: listTravel,
    deleteTravel: deleteTravel,
  };

})();
