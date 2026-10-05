/* STAND-IN for the MaaS360 Sales Guide's shared carbon-theme.js.
   Same contract the old Cold Call page relied on: load it in <head>, and it applies the
   saved theme before paint and binds every .theme-toggle button. Replace with the real file. */
(function () {
  var KEY = 'carbon-theme';
  var root = document.documentElement;
  function current() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function label() {
    var next = current() === 'dark' ? 'Light' : 'Dark';
    document.querySelectorAll('.theme-toggle .tt-label').forEach(function (el) { el.textContent = next; });
  }
  try { var saved = localStorage.getItem(KEY); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    label();
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        label();
      });
    });
  });
})();
