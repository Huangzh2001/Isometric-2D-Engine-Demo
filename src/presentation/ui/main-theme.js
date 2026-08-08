(function () {
  'use strict';

  var STORAGE_KEY = 'hzh.main.appearance';
  var choices = ['system', 'light', 'dark'];
  var root = document.documentElement;
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
  var media = null;
  try { media = window.matchMedia('(prefers-color-scheme: dark)'); } catch (_) {}

  function normalize(value) {
    return choices.indexOf(value) >= 0 ? value : 'system';
  }

  function readPreference() {
    try { return normalize(window.localStorage.getItem(STORAGE_KEY)); }
    catch (_) { return 'system'; }
  }

  function writePreference(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value); } catch (_) {}
  }

  function resolvedTheme(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return media && media.matches ? 'dark' : 'light';
  }

  function updateButtons(preference) {
    buttons.forEach(function (button) {
      var active = button.getAttribute('data-theme-choice') === preference;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function apply(preference, persist) {
    preference = normalize(preference);
    var resolved = resolvedTheme(preference);
    root.setAttribute('data-theme-preference', preference);
    root.setAttribute('data-theme', resolved);
    updateButtons(preference);
    if (persist) writePreference(preference);
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      apply(button.getAttribute('data-theme-choice'), true);
    });
  });

  function handleSystemThemeChange() {
    if (root.getAttribute('data-theme-preference') === 'system') apply('system', false);
  }

  if (media) {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', handleSystemThemeChange);
    else if (typeof media.addListener === 'function') media.addListener(handleSystemThemeChange);
  }

  apply(readPreference(), false);

  window.__HZH_MAIN_THEME_UI__ = {
    version: 'apple-ui-theme-v12',
    getPreference: function () { return root.getAttribute('data-theme-preference') || 'system'; },
    getResolvedTheme: function () { return root.getAttribute('data-theme') || resolvedTheme('system'); },
    setPreference: function (value) { apply(value, true); }
  };
})();
