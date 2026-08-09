/* ==========================================================
   CAM STUDENT HUB — js/icons.js
   Petite bibliothèque d'icônes SVG "outline" (remplace les emoji).
   Usage : Icon.svg('home', 'icon-lg')  -> retourne une chaîne SVG
   ========================================================== */

'use strict';

var Icon = (function () {

  var PATHS = {
    'graduation-cap': '<path d="M12 3l10 5-10 5L2 8z"/><path d="M6 11v5c0 1.6 2.7 3 6 3s6-1.4 6-3v-5"/>',
    'user': '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3-6.3 7-6.3s7 2.3 7 6.3"/>',
    'users': '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.6 3-5.7 7-5.7s7 2.1 7 5.7"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.2 14.7c2.7.5 4.3 2.4 4.3 5.3"/>',
    'alert-triangle': '<path d="M12 4.2l9 15.6H3z"/><line x1="12" y1="10" x2="12" y2="14.2"/><circle cx="12" cy="16.9" r="0.15" fill="currentColor" stroke="currentColor" stroke-width="1.6"/>',
    'map-pin': '<path d="M12 21.5s7-7.4 7-12.3a7 7 0 10-14 0c0 4.9 7 12.3 7 12.3z"/><circle cx="12" cy="9.2" r="2.4"/>',
    'book-open': '<path d="M12 6.2c-2-1.3-5-1.5-8-.7v12.7c3-.8 6-.6 8 .7 2-1.3 5-1.5 8-.7V5.5c-3-.8-6-.6-8 .7z"/><line x1="12" y1="6.2" x2="12" y2="18.9"/>',
    'book': '<path d="M6 4h11a2 2 0 012 2v13a2 2 0 00-2-2H6z"/><path d="M6 4a2 2 0 00-2 2v13a2 2 0 012-2h11"/>',
    'calendar': '<rect x="3.2" y="5" width="17.6" height="15.8" rx="2"/><line x1="3.2" y1="9.8" x2="20.8" y2="9.8"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
    'phone': '<path d="M6.6 3h3l1.8 4.6-2.3 1.6a12.4 12.4 0 006.7 6.7l1.6-2.3L22 15.4v3c0 1.1-.9 2-2 2C11.6 20.4 3.6 12.4 3.6 4.9c0-1.1.9-2 2-2z"/>',
    'phone-call': '<path d="M6.6 3h3l1.8 4.6-2.3 1.6a12.4 12.4 0 006.7 6.7l1.6-2.3L22 15.4v3c0 1.1-.9 2-2 2C11.6 20.4 3.6 12.4 3.6 4.9c0-1.1.9-2 2-2z"/><path d="M16 2c1.8.3 3.7 2.2 4 4"/>',
    'route': '<circle cx="4.5" cy="19.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="19.5" cy="4.5" r="1.6" fill="currentColor" stroke="none"/><path d="M4.5 19.5c0-6 3-9 7.5-9s7.5-3 7.5-6"/>',
    'home': '<path d="M4 11.2L12 4l8 7.2M6 10v9.5h5V14h2v5.5h5V10"/>',
    'save': '<path d="M5 4.2h11l3 3v12.6H5z"/><rect x="8" y="4.2" width="7" height="4.6"/><rect x="8" y="13.6" width="8" height="6"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'chevron-down': '<polyline points="6 9 12 15.4 18 9"/>',
    'utensils': '<path d="M6.5 3v6.5a1.6 1.6 0 003.2 0V3M8 9.5V21M16.5 3c-1.6 0-2.7 2-2.7 4.4 0 1.6.8 2.7 1.9 3V21"/>',
    'building': '<rect x="4" y="3" width="9.5" height="18"/><rect x="15.2" y="9" width="4.8" height="12"/><line x1="7" y1="6.5" x2="7" y2="6.5"/><line x1="10.5" y1="6.5" x2="10.5" y2="6.5"/><line x1="7" y1="10" x2="7" y2="10"/><line x1="10.5" y1="10" x2="10.5" y2="10"/><line x1="7" y1="13.5" x2="7" y2="13.5"/><line x1="10.5" y1="13.5" x2="10.5" y2="13.5"/>',
    'file-text': '<path d="M7 3h6.5L18 7.5V21H7z"/><line x1="10" y1="12.2" x2="15" y2="12.2"/><line x1="10" y1="16" x2="15" y2="16"/>',
    'edit': '<path d="M4 20l.9-4L15.6 5.3l3.1 3.1L8 19.1z"/><line x1="13.6" y1="7.3" x2="16.7" y2="10.4"/>',
    'bookmark': '<path d="M6.5 3h11v18l-5.5-4-5.5 4z"/>',
    'trash': '<path d="M4.5 7h15M9.5 7V4.3h5V7M6.5 7l1 13.7h9l1-13.7"/>',
    'lightbulb': '<path d="M9.2 18.4h5.6M10.1 21.3h3.8M12 3.2a6 6 0 00-3 11.2c.6.6 1 1.4 1 2.3h4c0-.9.4-1.7 1-2.3a6 6 0 00-3-11.2z"/>',
    'radio': '<circle cx="12" cy="12" r="2"/><path d="M8.3 12a3.7 3.7 0 017.4 0M5.3 12a6.7 6.7 0 0113.4 0"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><polyline points="7.8 12.3 10.6 15 16.3 8.6"/>',
    'shield': '<path d="M12 3l7.5 3v6.2c0 5-3.7 8.3-7.5 9.3-3.8-1-7.5-4.3-7.5-9.3V6z"/>',
    'menu': '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    'stop': '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>',
    'x': '<line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>',
    'siren': '<path d="M12 3a5 5 0 015 5v6H7V8a5 5 0 015-5z"/><line x1="4" y1="14" x2="20" y2="14"/><rect x="5.5" y="17" width="13" height="3" rx="1"/><line x1="12" y1="1" x2="12" y2="3"/>',
    'satellite': '<circle cx="12" cy="12" r="2"/><path d="M8.3 12a3.7 3.7 0 017.4 0M5.3 12a6.7 6.7 0 0113.4 0M3 6l3 3M21 6l-3 3"/>',
  };

  function svg(name, cls) {
    var d = PATHS[name] || PATHS['bookmark'];
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  return { svg: svg };

})();
