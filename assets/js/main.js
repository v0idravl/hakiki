/* ── Copy buttons on all code blocks ── */
document.querySelectorAll('pre').forEach(function (pre) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', 'Copy code');
  btn.textContent = 'copy';
  pre.appendChild(btn);

  btn.addEventListener('click', function () {
    const code = pre.querySelector('code');
    const text = code ? code.innerText : pre.innerText;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }

    function done() {
      btn.textContent = 'copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = 'copy';
        btn.classList.remove('copied');
      }, 2000);
    }

    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  });
});

/* ── Sidebar toggle (mobile) ── */
var sidebar   = document.getElementById('sidebar');
var overlay   = document.getElementById('overlay');
var menuBtn   = document.getElementById('menu-toggle');
var closeBtn  = document.getElementById('sidebar-close');

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (menuBtn)  menuBtn.addEventListener('click', openSidebar);
if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
if (overlay)  overlay.addEventListener('click', closeSidebar);

/* Close sidebar on Escape */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSidebar();
});

/* ── Active nav link via URL matching ── */
var currentPath = window.location.pathname.replace(/\/$/, '');

document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
  var href = a.getAttribute('href').replace(/\/$/, '');
  if (href && currentPath === href) {
    a.classList.add('active');
    /* Expand parent if child is active */
    var parent = a.closest('.nav-item.has-children');
    if (parent) {
      var parentLink = parent.querySelector('.nav-link');
      if (parentLink) parentLink.classList.add('active');
    }
  }
});

/* ── Scroll active nav item into view ── */
var activeLink = document.querySelector('.sidebar-nav a.active');
if (activeLink) {
  activeLink.scrollIntoView({ block: 'nearest' });
}
