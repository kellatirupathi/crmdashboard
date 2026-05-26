/* CRMPro — Application logic
   Integrates with Store (localStorage-backed data layer).
   Includes: auth gate, SPA navigation, page renderers, CRUD wiring,
   drag-and-drop persistence, real-time search & sort, dark mode. */

(function () {
  'use strict';

  /* Pages that share the .app/.main shell. */
  var APP_PAGES = ['dashboard.html','contacts.html','leads.html','deals.html','activities.html','reports.html','settings.html'];
  var PROTECTED_PAGES = APP_PAGES;
  var AUTH_PAGES = ['login.html'];

  /* Apply theme immediately. */
  if (window.Store) Store.applyTheme();

  document.addEventListener('DOMContentLoaded', function () {
    // Auth gate — protect app pages
    var file = currentFile();
    if (PROTECTED_PAGES.indexOf(file) !== -1 && (!window.Store || !Store.isLoggedIn())) {
      window.location.replace('login.html');
      return;
    }
    if (AUTH_PAGES.indexOf(file) !== -1 && window.Store && Store.isLoggedIn()) {
      window.location.replace('dashboard.html');
      return;
    }

    initAuthForms();
    initLogout();
    initSidebarToggle();
    initLandingScroll();
    initShortcutFocus();
    initSPA();
    initPrefetch();
    initThemeToggle();

    renderCurrentUserChrome();

    initMainScope();
  });

  function currentFile() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  /* Re-run on each navigation. */
  function initMainScope() {
    renderActivePage();
    highlightActiveNav();
    initNoOp();
    initFilterChips();
    initDragAndDrop();
    initTaskComplete();
    initTableSearch();
    initTableSort();
    initViewToggle();
    initModalSystem();
    initRowActions();
    animateBarsOnView();
  }

  /* =============================================================
     Render dispatcher — calls the appropriate page renderer.
     ============================================================= */
  function renderActivePage() {
    var pageEl = document.querySelector('.page[data-page]');
    if (!pageEl) return;
    var type = pageEl.getAttribute('data-page');
    var fn = PageRenderers[type];
    if (typeof fn === 'function') fn(pageEl);
  }

  var PageRenderers = {
    dashboard:  renderDashboard,
    contacts:   renderContacts,
    leads:      renderLeads,
    deals:      renderDeals,
    activities: renderActivities,
    reports:    renderReports,
    settings:   renderSettings
  };

  /* =============================================================
     Chrome — sidebar user + topbar chip reflect current user
     ============================================================= */
  function renderCurrentUserChrome() {
    if (!window.Store) return;
    var user = Store.getCurrentUser();
    if (!user) return;

    document.querySelectorAll('.sidebar-user .avatar').forEach(function (el) { el.textContent = user.initials; });
    document.querySelectorAll('.sidebar-user .meta strong').forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll('.sidebar-user .meta span').forEach(function (el) { el.textContent = user.jobTitle || 'Member'; });

    document.querySelectorAll('.user-chip .avatar').forEach(function (el) { el.textContent = user.initials; });
    document.querySelectorAll('.user-chip span').forEach(function (el) {
      if (el.tagName === 'SPAN' && !el.classList.contains('dot')) el.textContent = user.firstName + ' ' + (user.lastName ? user.lastName[0] + '.' : '');
    });
  }

  /* =============================================================
     Authentication — register & login (Store-backed)
     ============================================================= */
  function initAuthForms() {
    var loginForm = document.querySelector('[data-login-form]');
    var registerForm = document.querySelector('[data-register-form]');
    var tabButtons = document.querySelectorAll('.auth-tabs [data-auth-tab]');

    if (tabButtons.length) {
      tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-auth-tab');
          tabButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
          document.querySelectorAll('[data-auth-panel]').forEach(function (p) {
            p.style.display = p.getAttribute('data-auth-panel') === tab ? '' : 'none';
          });
        });
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (loginForm.querySelector('[name=email]') || {}).value || '';
        var password = (loginForm.querySelector('[name=password]') || {}).value || '';
        var errEl = loginForm.querySelector('.auth-error');
        if (errEl) errEl.textContent = '';

        var btn = loginForm.querySelector('button[type=submit]');
        var orig = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;"></span> Signing in…';
        }

        setTimeout(function () {
          try {
            Store.login(email, password);
            window.location.href = 'dashboard.html';
          } catch (err) {
            if (errEl) errEl.textContent = err.message;
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
          }
        }, 380);
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var first = (registerForm.querySelector('[name=firstName]') || {}).value || '';
        var last = (registerForm.querySelector('[name=lastName]') || {}).value || '';
        var email = (registerForm.querySelector('[name=email]') || {}).value || '';
        var password = (registerForm.querySelector('[name=password]') || {}).value || '';
        var errEl = registerForm.querySelector('.auth-error');
        if (errEl) errEl.textContent = '';

        var btn = registerForm.querySelector('button[type=submit]');
        var orig = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;"></span> Creating account…';
        }

        setTimeout(function () {
          try {
            Store.register(email, password, first, last);
            window.location.href = 'dashboard.html';
          } catch (err) {
            if (errEl) errEl.textContent = err.message;
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
          }
        }, 420);
      });
    }
  }

  function initLogout() {
    document.querySelectorAll('[data-logout]').forEach(function (el) {
      if (el.dataset.boundLogout) return;
      el.dataset.boundLogout = '1';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.Store) Store.logout();
        window.location.href = 'index.html';
      });
    });
  }

  /* =============================================================
     Sidebar
     ============================================================= */
  function initSidebarToggle() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var sidebar = document.querySelector('[data-sidebar]');
    if (!toggle || !sidebar) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    function open() { sidebar.classList.add('open'); backdrop.classList.add('show'); }
    function close() { sidebar.classList.remove('open'); backdrop.classList.remove('show'); }

    toggle.addEventListener('click', function () {
      sidebar.classList.contains('open') ? close() : open();
    });
    backdrop.addEventListener('click', close);

    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 860) close();
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) close();
    });
  }

  function highlightActiveNav() {
    var links = document.querySelectorAll('.sidebar-link');
    if (!links.length) return;
    var current = currentFile();
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      link.classList.toggle('active', href === current);
    });
  }

  /* =============================================================
     Landing helpers
     ============================================================= */
  function initLandingScroll() {
    document.querySelectorAll('[data-scroll]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var target = document.querySelector(el.getAttribute('data-scroll'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initNoOp() {
    document.querySelectorAll('[data-noop]').forEach(function (btn) {
      if (btn.dataset.boundNoop) return;
      btn.dataset.boundNoop = '1';
      btn.addEventListener('click', function (e) { e.preventDefault(); });
    });
  }

  /* =============================================================
     Filter chips — combined search+filter state
     ============================================================= */
  function initFilterChips() {
    document.querySelectorAll('.filter-chips').forEach(function (group) {
      group.querySelectorAll('.chip').forEach(function (chip) {
        if (chip.dataset.boundChip) return;
        chip.dataset.boundChip = '1';
        chip.addEventListener('click', function () {
          group.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
          chip.classList.add('is-on');
          applyRowFilters(group);
        });
      });
      applyRowFilters(group);
    });
  }

  function applyRowFilters(group) {
    var tableSel = group.getAttribute('data-filter-table');
    if (tableSel) {
      var table = document.querySelector(tableSel);
      if (!table) return;
      var active = group.querySelector('.chip.is-on');
      var label = active ? active.textContent.trim().toLowerCase() : 'all';
      var all = label === 'all' || label.startsWith('all ');
      table.querySelectorAll('tbody tr:not(.empty-state-row)').forEach(function (row) {
        if (all) {
          delete row.dataset.filterHidden;
        } else {
          var match = false;
          row.querySelectorAll('.badge, .chip').forEach(function (b) {
            if (b.textContent.trim().toLowerCase() === label) match = true;
          });
          if (match) delete row.dataset.filterHidden;
          else row.dataset.filterHidden = '1';
        }
      });
      reconcileRowVisibility(table);
    }
  }

  function reconcileRowVisibility(table) {
    var visible = 0;
    table.querySelectorAll('tbody tr:not(.empty-state-row)').forEach(function (row) {
      var hide = row.dataset.filterHidden === '1' || row.dataset.searchHidden === '1';
      row.style.display = hide ? 'none' : '';
      if (!hide) visible++;
    });
    var empty = table.querySelector('.empty-state-row');
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
  }

  function initShortcutFocus() {
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        var input = document.querySelector('.topbar .search .input');
        if (input) { e.preventDefault(); input.focus(); }
      }
    });
  }

  function animateBarsOnView() {
    var bars = document.querySelectorAll('.progress > span:not([data-animated])');
    if (!('IntersectionObserver' in window) || !bars.length) return;

    bars.forEach(function (b) {
      b.dataset.animated = '1';
      b.dataset.target = b.style.width || '';
      b.style.width = '0%';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var b = entry.target;
        var target = b.dataset.target;
        setTimeout(function () { b.style.width = target; }, 30);
        io.unobserve(b);
      });
    }, { threshold: 0.2 });

    bars.forEach(function (b) { io.observe(b); });
  }

  /* =============================================================
     Drag-and-Drop — with Store persistence
     ============================================================= */
  function initDragAndDrop() {
    document.querySelectorAll('[data-dnd="kanban"]').forEach(initKanbanDnd);
    document.querySelectorAll('[data-dnd="sortable"]').forEach(initSortableDnd);
  }

  // Per-kanban dragged state (avoids cross-board leaks)
  var kanbanDragged = new WeakMap();

  function initKanbanDnd(kanban) {
    function setupCard(card) {
      if (card.dataset.dnd === '1') return;
      card.dataset.dnd = '1';
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', function (e) {
        kanbanDragged.set(kanban, card);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.id || ''); } catch (_) {}
      });
      card.addEventListener('dragend', function () {
        var d = kanbanDragged.get(kanban);
        if (d) d.classList.remove('dragging');
        kanbanDragged.delete(kanban);
        kanban.querySelectorAll('.kanban-col').forEach(function (c) {
          c.classList.remove('drag-over');
        });
      });
    }

    function setupCol(col) {
      if (col.dataset.dnd === '1') return;
      col.dataset.dnd = '1';
      col.addEventListener('dragover', function (e) {
        var dragged = kanbanDragged.get(kanban);
        if (!dragged) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
        var afterCard = getCardAfterPoint(col, e.clientY);
        if (!afterCard) col.appendChild(dragged);
        else if (afterCard !== dragged) col.insertBefore(dragged, afterCard);
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('drag-over');
        var dragged = kanbanDragged.get(kanban);
        if (!dragged) return;
        var entity = kanban.getAttribute('data-entity');   // 'deals' | 'leads'
        var stage = col.getAttribute('data-stage');
        var id = dragged.dataset.id;
        if (window.Store && entity && stage && id) {
          Store.update(entity, id, { stage: stage });
        }
        updateKanbanCounts(kanban);
        var stageName = col.querySelector('h4') ? col.querySelector('h4').textContent.trim() : 'stage';
        var name = dragged.querySelector('.name') ? dragged.querySelector('.name').textContent.trim() : 'Item';
        showToast(name + ' moved to ' + stageName);
      });
    }

    kanban.querySelectorAll('.deal-card, [data-kanban-card]').forEach(setupCard);
    kanban.querySelectorAll('.kanban-col').forEach(setupCol);
  }

  function getCardAfterPoint(col, y) {
    var cards = Array.from(col.querySelectorAll('.deal-card:not(.dragging), [data-kanban-card]:not(.dragging)'));
    return cards.reduce(function (closest, card) {
      var box = card.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: card };
      return closest;
    }, { offset: -Infinity }).element || null;
  }

  function updateKanbanCounts(kanban) {
    var entity = kanban.getAttribute('data-entity');
    kanban.querySelectorAll('.kanban-col').forEach(function (col) {
      var cards = col.querySelectorAll('.deal-card, [data-kanban-card]');
      var n = cards.length;
      var countEl = col.querySelector('.count');
      var unit = entity === 'leads' ? ' lead' : ' deal';
      if (countEl) countEl.textContent = n + unit + (n === 1 ? '' : 's');
      // Recompute total value if applicable
      if (entity === 'deals') {
        var total = 0;
        cards.forEach(function (c) {
          var d = window.Store && Store.get('deals', c.dataset.id);
          if (d) total += Number(d.value) || 0;
        });
        var meta = col.querySelector('.col-meta');
        if (meta) {
          var avg = n ? Math.round(total / n) : 0;
          meta.innerHTML = '<strong style="color:var(--fg);">$' + Math.round(total / 1000) + 'K</strong> · avg $' + Math.round(avg / 1000) + 'K';
        }
      }
    });
  }

  var sortableDragged = new WeakMap();

  function initSortableDnd(container) {
    container.querySelectorAll('[data-sortable-item]').forEach(function (item) {
      if (item.dataset.dnd === '1') return;
      item.dataset.dnd = '1';
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', function (e) {
        sortableDragged.set(container, item);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', 'item'); } catch (_) {}
      });
      item.addEventListener('dragend', function () {
        var d = sortableDragged.get(container);
        if (d) d.classList.remove('dragging');
        sortableDragged.delete(container);
      });
    });

    if (container.dataset.dndContainer === '1') return;
    container.dataset.dndContainer = '1';

    container.addEventListener('dragover', function (e) {
      var dragged = sortableDragged.get(container);
      if (!dragged) return;
      e.preventDefault();
      var after = getItemAfterPoint(container, e.clientY);
      if (!after) container.appendChild(dragged);
      else if (after !== dragged) container.insertBefore(dragged, after);
    });

    container.addEventListener('drop', function (e) {
      e.preventDefault();
      var dragged = sortableDragged.get(container);
      if (!dragged) return;
      if (window.Store && container.getAttribute('data-entity') === 'tasks') {
        Array.from(container.querySelectorAll('[data-sortable-item]')).forEach(function (item, idx) {
          Store.update('tasks', item.dataset.id, { order: idx });
        });
      }
      showToast('Order updated');
    });
  }

  function getItemAfterPoint(container, y) {
    var items = Array.from(container.querySelectorAll('[data-sortable-item]:not(.dragging)'));
    return items.reduce(function (closest, item) {
      var box = item.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: item };
      return closest;
    }, { offset: -Infinity }).element || null;
  }

  /* =============================================================
     Tasks — checkbox completion (persists to Store)
     ============================================================= */
  function initTaskComplete() {
    document.querySelectorAll('.task input[type="checkbox"]').forEach(function (cb) {
      if (cb.dataset.boundTask) return;
      cb.dataset.boundTask = '1';
      apply(cb);
      cb.addEventListener('change', function () {
        apply(cb);
        var task = cb.closest('[data-sortable-item], .task');
        if (window.Store && task && task.dataset.id) {
          Store.update('tasks', task.dataset.id, { completed: cb.checked });
        }
      });
    });
    function apply(cb) {
      var title = cb.closest('.task').querySelector('.title');
      if (!title) return;
      if (cb.checked) {
        title.style.textDecoration = 'line-through';
        title.style.color = 'var(--muted)';
      } else {
        title.style.textDecoration = '';
        title.style.color = '';
      }
    }
  }

  /* =============================================================
     Table real-time search
     ============================================================= */
  function initTableSearch() {
    document.querySelectorAll('[data-search-target]').forEach(function (input) {
      if (input.dataset.boundSearch) return;
      input.dataset.boundSearch = '1';
      var sel = input.getAttribute('data-search-target');
      var table = document.querySelector(sel);
      if (!table) return;

      input.addEventListener('input', function () {
        var query = input.value.trim().toLowerCase();
        var rows = table.querySelectorAll('tbody tr:not(.empty-state-row)');
        rows.forEach(function (row) {
          var text = row.textContent.toLowerCase();
          var match = query === '' || text.indexOf(query) !== -1;
          if (match) delete row.dataset.searchHidden;
          else row.dataset.searchHidden = '1';
        });
        reconcileRowVisibility(table);
        ensureEmptyState(table, query);
      });
    });
  }

  function ensureEmptyState(table, query) {
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var visible = 0;
    table.querySelectorAll('tbody tr:not(.empty-state-row)').forEach(function (r) {
      if (r.style.display !== 'none') visible++;
    });
    var empty = table.querySelector('.empty-state-row');
    if (visible === 0) {
      if (!empty) {
        var colCount = table.querySelectorAll('thead th').length;
        empty = document.createElement('tr');
        empty.className = 'empty-state-row';
        empty.innerHTML = '<td colspan="' + colCount + '"><div style="font-size:22px;margin-bottom:6px;">📭</div>' +
          (query ? 'No results for "<strong style="color:var(--fg);">' + escapeHtml(query) + '</strong>"' : 'No records yet') +
          '</td>';
        tbody.appendChild(empty);
      } else {
        empty.querySelector('td').innerHTML = '<div style="font-size:22px;margin-bottom:6px;">📭</div>' +
          (query ? 'No results for "<strong style="color:var(--fg);">' + escapeHtml(query) + '</strong>"' : 'No records yet');
        empty.style.display = '';
      }
    } else if (empty) {
      empty.style.display = 'none';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* =============================================================
     Table sort
     ============================================================= */
  function initTableSort() {
    document.querySelectorAll('table.data').forEach(function (table) {
      if (table.dataset.sortInit) return;
      table.dataset.sortInit = '1';
      var heads = table.querySelectorAll('thead th');
      heads.forEach(function (th, idx) {
        var label = th.textContent.trim();
        if (!label || idx === 0) return;
        if (label.toLowerCase() === 'actions') return;
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.title = 'Click to sort';
        th.innerHTML = '<span style="display:inline-flex;align-items:center;gap:5px;">' +
          escapeHtml(label) +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.4;"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg></span>';
        var asc = true;
        th.addEventListener('click', function () {
          sortTableByColumn(table, idx, asc);
          asc = !asc;
        });
      });
    });
  }

  function sortTableByColumn(table, col, asc) {
    var tbody = table.querySelector('tbody');
    var rows = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));
    rows.sort(function (a, b) {
      var av = a.children[col] ? a.children[col].textContent.trim().toLowerCase() : '';
      var bv = b.children[col] ? b.children[col].textContent.trim().toLowerCase() : '';
      var an = parseFloat(av.replace(/[^\d.-]/g, ''));
      var bn = parseFloat(bv.replace(/[^\d.-]/g, ''));
      if (!isNaN(an) && !isNaN(bn)) return asc ? an - bn : bn - an;
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    rows.forEach(function (r) { tbody.appendChild(r); });
  }

  /* =============================================================
     View toggle (List / Pipeline)
     ============================================================= */
  function initViewToggle() {
    document.querySelectorAll('[data-view-toggle]').forEach(function (group) {
      if (group.dataset.boundViewToggle) return;
      group.dataset.boundViewToggle = '1';
      var byKey = {};
      document.querySelectorAll('[data-view-content]').forEach(function (el) {
        byKey[el.getAttribute('data-view-content')] = el;
      });
      group.querySelectorAll('[data-view]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var target = btn.getAttribute('data-view');
          group.querySelectorAll('[data-view]').forEach(function (b) {
            b.classList.toggle('active', b === btn);
          });
          Object.keys(byKey).forEach(function (k) {
            byKey[k].style.display = k === target ? '' : 'none';
          });
        });
      });
    });
  }

  /* =============================================================
     Row actions — view, edit, delete with Store
     ============================================================= */
  function initRowActions() {
    document.querySelectorAll('table.data tbody tr').forEach(function (tr) {
      if (tr.dataset.boundActions) return;
      tr.dataset.boundActions = '1';

      // Build action menu handler
      tr.querySelectorAll('.row-actions button').forEach(function (btn) {
        var i = btn.querySelector('i');
        var act = btn.getAttribute('data-row-action') ||
          (i && i.className.indexOf('fa-eye') !== -1 ? 'view'
            : i && i.className.indexOf('fa-pen') !== -1 ? 'edit'
            : 'menu');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          handleRowAction(tr, act);
        });
      });
    });
  }

  function handleRowAction(tr, action) {
    var entity = tr.getAttribute('data-entity');
    var id = tr.getAttribute('data-id');
    var name = tr.querySelector('strong') ? tr.querySelector('strong').textContent : 'record';
    if (action === 'view') {
      showToast('Viewing ' + name);
    } else if (action === 'edit') {
      showToast('Edit coming soon for ' + name);
    } else if (action === 'delete') {
      if (window.Store && entity && id) {
        var ok = window.confirm('Delete "' + name + '"? This cannot be undone.');
        if (!ok) return;
        Store.remove(entity, id);
        showToast(name + ' deleted');
        initMainScope();
      }
    } else {
      // menu — show small action dropdown
      showRowMenu(tr, action);
    }
  }

  function showRowMenu(tr, action) {
    var entity = tr.getAttribute('data-entity');
    var id = tr.getAttribute('data-id');
    var name = tr.querySelector('strong') ? tr.querySelector('strong').textContent : 'record';

    // Replace simple flow: just delete confirmation
    if (!window.Store || !entity || !id) return;
    var ok = window.confirm('Delete "' + name + '"? This cannot be undone.');
    if (!ok) return;
    Store.remove(entity, id);
    showToast(name + ' deleted');
    initMainScope();
  }

  /* =============================================================
     Modal System — now wires to Store.create()
     ============================================================= */
  var MODAL_CONFIGS = {
    'add-contact': {
      title: 'Add New Contact',
      subtitle: 'Add a new person to your CRM workspace.',
      saveLabel: 'Add Contact',
      successMessage: 'Contact added successfully',
      entity: 'contacts',
      fields: [
        { label: 'Full Name', key: 'name', required: true, placeholder: 'Jane Doe' },
        { label: 'Email Address', key: 'email', type: 'email', placeholder: 'jane@company.com' },
        { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
        { label: 'Company', key: 'company', placeholder: 'Acme Inc.' },
        { label: 'Role', key: 'role', placeholder: 'VP of Sales' },
        { label: 'Status', key: 'status', type: 'select', options: ['Active', 'New', 'Follow-up', 'Churned'] }
      ]
    },
    'add-lead': {
      title: 'Add New Lead',
      subtitle: 'Capture a new opportunity in your pipeline.',
      saveLabel: 'Add Lead',
      successMessage: 'Lead added to pipeline',
      entity: 'leads',
      fields: [
        { label: 'Lead Name', key: 'name', required: true, placeholder: 'Jane Doe' },
        { label: 'Company', key: 'company', placeholder: 'Acme Inc.' },
        { label: 'Source', key: 'source', type: 'select', options: ['Website', 'LinkedIn Ad', 'Referral', 'Webinar', 'Cold Outreach', 'Trade Show', 'Partner Referral'] },
        { label: 'Interest', key: 'interest', placeholder: 'Enterprise Plan' },
        { label: 'Stage', key: 'stage', type: 'select', options: ['New', 'Contacted', 'Qualified', 'Proposal'] },
        { label: 'Lead Score (0-100)', key: 'score', type: 'number', placeholder: '75' }
      ]
    },
    'add-deal': {
      title: 'Add New Deal',
      subtitle: 'Add a deal to your sales pipeline.',
      saveLabel: 'Add Deal',
      successMessage: 'Deal added to pipeline',
      entity: 'deals',
      fields: [
        { label: 'Deal Name', key: 'name', required: true, placeholder: 'Annual Subscription' },
        { label: 'Company', key: 'company', placeholder: 'Acme Inc.' },
        { label: 'Value ($)', key: 'value', type: 'number', placeholder: '25000' },
        { label: 'Expected Close Date', key: 'closeDate', type: 'date' },
        { label: 'Stage', key: 'stage', type: 'select', options: ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won'] },
        { label: 'Temperature', key: 'temp', type: 'select', options: ['cold', 'warm', 'hot'] }
      ]
    },
    'add-activity': {
      title: 'Log New Activity',
      subtitle: 'Record a customer touchpoint.',
      saveLabel: 'Log Activity',
      successMessage: 'Activity logged',
      entity: 'activities',
      fields: [
        { label: 'Type', key: 'type', type: 'select', options: ['call', 'email', 'meeting', 'note', 'task', 'proposal'] },
        { label: 'Subject', key: 'subject', required: true, placeholder: 'Discovery call with Acme Inc.' },
        { label: 'Related Contact', key: 'contactName', placeholder: 'Jane Doe' },
        { label: 'Company', key: 'company', placeholder: 'Acme Inc.' },
        { label: 'Notes', key: 'notes', type: 'textarea', placeholder: 'Add a note (optional)…' }
      ]
    },
    'add-task': {
      title: 'Add Task',
      subtitle: 'Create a follow-up task or reminder.',
      saveLabel: 'Add Task',
      successMessage: 'Task added',
      entity: 'tasks',
      fields: [
        { label: 'Task Title', key: 'title', required: true, placeholder: 'Follow up with…' },
        { label: 'Due', key: 'due', placeholder: 'Today · 4:00 PM' },
        { label: 'Priority', key: 'priority', type: 'select', options: ['High', 'Medium', 'Low', 'Team'] },
        { label: 'Notes', key: 'notes', type: 'textarea', placeholder: 'Optional notes…' }
      ]
    }
  };

  function initModalSystem() {
    document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
      if (btn.dataset.boundModal) return;
      btn.dataset.boundModal = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(btn.getAttribute('data-modal-open'));
      });
    });
  }

  function openModal(type) {
    var cfg = MODAL_CONFIGS[type];
    if (!cfg) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    var fieldsHtml = cfg.fields.map(function (f) {
      var ctrl;
      if (f.type === 'select') {
        ctrl = '<select class="select" data-key="' + escapeHtml(f.key) + '">' + f.options.map(function (o) {
          return '<option>' + escapeHtml(o) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        ctrl = '<textarea class="textarea" rows="3" data-key="' + escapeHtml(f.key) + '" placeholder="' + escapeHtml(f.placeholder || '') + '"></textarea>';
      } else {
        ctrl = '<input class="input" type="' + (f.type || 'text') + '" data-key="' + escapeHtml(f.key) + '" placeholder="' + escapeHtml(f.placeholder || '') + '"' + (f.required ? ' required' : '') + ' />';
      }
      return '<div class="field"><label>' + escapeHtml(f.label) + (f.required ? ' <span style="color:var(--danger);">*</span>' : '') + '</label>' + ctrl + '</div>';
    }).join('');

    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<div>' +
            '<h3>' + escapeHtml(cfg.title) + '</h3>' +
            '<p class="modal-subtitle">' + escapeHtml(cfg.subtitle) + '</p>' +
          '</div>' +
          '<button type="button" class="modal-close" aria-label="Close">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
        '<form class="modal-body" novalidate>' + fieldsHtml +
          '<div class="modal-error" style="color:var(--danger);font-size:12.5px;min-height:18px;"></div>' +
        '</form>' +
        '<div class="modal-foot">' +
          '<button type="button" class="btn btn-secondary modal-cancel">Cancel</button>' +
          '<button type="button" class="btn btn-primary modal-save">' + escapeHtml(cfg.saveLabel) + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { backdrop.classList.add('show'); });

    var keyHandler = function (e) { if (e.key === 'Escape') close(); };
    function close() {
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', keyHandler);
      setTimeout(function () { backdrop.remove(); }, 200);
    }
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.querySelector('.modal-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', keyHandler);

    backdrop.querySelector('.modal-save').addEventListener('click', function (e) {
      e.preventDefault();
      var errEl = backdrop.querySelector('.modal-error');
      errEl.textContent = '';

      var data = {};
      cfg.fields.forEach(function (f) {
        var ctrl = backdrop.querySelector('[data-key="' + f.key + '"]');
        if (!ctrl) return;
        var val = ctrl.value;
        if (f.type === 'number') val = val === '' ? 0 : Number(val);
        if (f.required && (val === '' || val == null)) {
          errEl.textContent = f.label + ' is required.';
          ctrl.focus();
          return data._invalid = true;
        }
        data[f.key] = val;
      });
      if (data._invalid) return;

      var saveBtn = backdrop.querySelector('.modal-save');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner" style="width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite;"></span> Saving…';

      setTimeout(function () {
        try {
          if (cfg.entity && window.Store) {
            if (cfg.entity === 'activities') {
              data.timestamp = now();
              data.status = 'info';
            }
            Store.create(cfg.entity, data);
          }
          close();
          showToast(cfg.successMessage);
          initMainScope(); // refresh + re-bind interactions on new elements
        } catch (err) {
          errEl.textContent = err.message;
          saveBtn.disabled = false;
          saveBtn.innerHTML = escapeHtml(cfg.saveLabel);
        }
      }, 400);
    });

    setTimeout(function () {
      var f = backdrop.querySelector('.input, .select, .textarea');
      if (f) f.focus();
    }, 120);
  }

  /* =============================================================
     Theme toggle
     ============================================================= */
  function initThemeToggle() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      if (btn.dataset.boundTheme) return;
      btn.dataset.boundTheme = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var current = (window.Store && Store.getTheme()) || 'light';
        var next = current === 'light' ? 'dark' : 'light';
        if (window.Store) Store.setTheme(next);
        updateThemeToggleIcons();
        showToast('Switched to ' + next + ' mode', 'info');
      });
    });
    updateThemeToggleIcons();
  }

  function updateThemeToggleIcons() {
    var theme = (window.Store && Store.getTheme()) || 'light';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var icon = btn.querySelector('i');
      if (icon) icon.className = theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    });
  }

  /* =============================================================
     Toast notifications
     ============================================================= */
  function showToast(message, type) {
    type = type || 'success';
    var container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    var iconMap = {
      success: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      info:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      warn:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      error:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
      '<div class="toast-icon">' + (iconMap[type] || iconMap.success) + '</div>' +
      '<div class="toast-body">' + escapeHtml(message) + '</div>' +
      '<button class="toast-close" aria-label="Close">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>';

    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });

    function close() {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 200);
    }
    toast.querySelector('.toast-close').addEventListener('click', close);
    var timer = setTimeout(close, 3500);
    toast.addEventListener('mouseenter', function () { clearTimeout(timer); });
    toast.addEventListener('mouseleave', function () { timer = setTimeout(close, 1500); });
  }

  /* =============================================================
     SPA Navigation
     ============================================================= */
  var navigating = false;
  function initSPA() {
    if (!document.querySelector('.app .main')) return;
    document.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== undefined && e.button !== 0) return;
      var link = e.target.closest && e.target.closest('a[href]');
      if (!link) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('data-noop')) return;
      if (link.hasAttribute('data-logout')) return;
      if (link.hasAttribute('data-scroll')) return;
      if (link.hasAttribute('download')) return;
      var raw = link.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;
      if (/^https?:\/\//i.test(raw)) return;
      var file = raw.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
      if (APP_PAGES.indexOf(file) === -1) return;
      e.preventDefault();
      // Instant visual feedback: swap active sidebar pill BEFORE the fetch
      // starts so there's no perceptible delay between click and highlight.
      var pageKey = file.replace('.html', '');
      document.body.setAttribute('data-page', pageKey);
      navigateTo(raw);
    });
    window.addEventListener('popstate', function () {
      var file = (window.location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
      if (APP_PAGES.indexOf(file) !== -1) navigateTo(file, true);
    });
  }

  function navigateTo(href, isPop) {
    if (navigating) return;
    navigating = true;
    var current = document.querySelector('.app .main');
    if (!current) { window.location.href = href; return; }
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.style.overflow = '';

    fetch(href, { credentials: 'same-origin' })
      .then(function (res) { if (!res.ok) throw new Error('navigation failed'); return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain = doc.querySelector('.app .main');
        var newTitle = doc.querySelector('title');
        if (!newMain) { window.location.href = href; return; }
        current.replaceWith(newMain);
        if (!isPop) history.pushState({ href: href }, '', href);
        if (newTitle) document.title = newTitle.textContent;
        // Sync body[data-page] from the fetched page so the CSS-driven active
        // pill matches the destination route.
        var newBody = doc.querySelector('body');
        if (newBody && newBody.getAttribute('data-page')) {
          document.body.setAttribute('data-page', newBody.getAttribute('data-page'));
        }
        initMainScope();
        window.scrollTo(0, 0);
      })
      .catch(function () { window.location.href = href; })
      .finally(function () { navigating = false; });
  }

  function initPrefetch() {
    if (!document.querySelector('.app .main')) return;
    var seen = Object.create(null);
    function maybePrefetch(link) {
      if (!link || !link.getAttribute) return;
      var href = link.getAttribute('href') || '';
      if (!href) return;
      var file = href.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
      if (APP_PAGES.indexOf(file) === -1) return;
      if (seen[href]) return;
      seen[href] = true;
      try { fetch(href, { credentials: 'same-origin' }); } catch (_) {}
    }
    document.addEventListener('mouseover', function (e) {
      var link = e.target.closest && e.target.closest('a[href]');
      if (link) maybePrefetch(link);
    }, { passive: true });
  }

  /* =============================================================
     PAGE RENDERERS
     ============================================================= */

  function renderDashboard() {
    if (!window.Store) return;
    var user = Store.getCurrentUser();
    var welcome = document.querySelector('[data-welcome-name]');
    if (welcome) welcome.textContent = (user && user.firstName) || 'there';

    var k = Store.kpis();
    set('[data-kpi="totalContacts"]', k.totalContacts.toLocaleString());
    set('[data-kpi="newLeads"]', k.newLeads.toLocaleString());
    set('[data-kpi="openDeals"]', k.openDeals.toLocaleString());
    set('[data-kpi="pipelineValue"]', '$' + Math.round(k.pipelineValue / 1000) + 'K');

    // Sales Performance chart — last 8 months simulated from won deals
    renderSalesChart();

    // Recent activities
    var actList = document.querySelector('[data-activities-list]');
    if (actList) {
      var activities = Store.recentActivities(5);
      actList.innerHTML = activities.length ? activities.map(activityItemHtml).join('') :
        '<p class="text-muted text-sm" style="padding:20px 0;text-align:center;">No activities yet</p>';
    }

    // Sales pipeline
    var pipelineWrap = document.querySelector('[data-pipeline-wrap]');
    if (pipelineWrap) {
      var stages = Store.pipelineByStage();
      pipelineWrap.innerHTML = stages.map(function (s, i) {
        var pct = Math.min(100, Math.round((s.value / 200000) * 100) || (i + 1) * 18);
        return '<div class="pipeline-row">' +
          '<div><div class="name">' + s.stage + '</div><div class="meta">' + s.count + ' deal' + (s.count === 1 ? '' : 's') + '</div></div>' +
          '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
          '<div class="val">$' + Math.round(s.value / 1000) + 'K</div>' +
          '</div>';
      }).join('');
    }

    // Lead sources (donut + legend)
    var sourceWrap = document.querySelector('[data-sources-wrap]');
    if (sourceWrap) {
      var sources = Store.leadsBySource().slice(0, 5);
      var total = sources.reduce(function (a, b) { return a + b.count; }, 0) || 1;
      var topPct = sources.length ? Math.round((sources[0].count / total) * 100) : 0;
      sourceWrap.innerHTML =
        '<div class="donut" style="--p:' + topPct + ';">' +
          '<div class="inner"><strong>' + total + '</strong><span>total leads</span></div>' +
        '</div>' +
        '<div class="donut-legend">' +
          sources.map(function (s, i) {
            var sw = ['#18181b', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8'][i] || '#a1a1aa';
            return '<div class="item"><span class="sw" style="background:' + sw + ';"></span>' + escapeHtml(s.source) + ' · ' + s.count + '</div>';
          }).join('') +
        '</div>';
    }

    // Tasks
    var taskList = document.querySelector('[data-tasks-list]');
    if (taskList) {
      var tasks = Store.list('tasks').sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      taskList.innerHTML = tasks.map(taskItemHtml).join('') ||
        '<p class="text-muted text-sm" style="padding:20px 0;text-align:center;">No tasks. <a href="#" data-modal-open="add-task" style="color:var(--fg);text-decoration:underline;">Add one →</a></p>';
    }
  }

  function activityItemHtml(a) {
    var iconByType = {
      call: '<i class="fa-solid fa-phone"></i>',
      email: '<i class="fa-regular fa-envelope"></i>',
      meeting: '<i class="fa-regular fa-calendar"></i>',
      proposal: '<i class="fa-solid fa-file-signature"></i>',
      note: '<i class="fa-regular fa-comments"></i>',
      task: '<i class="fa-solid fa-triangle-exclamation"></i>',
      won: '<i class="fa-solid fa-check"></i>'
    };
    return '<div class="activity-item">' +
      '<div class="ico">' + (iconByType[a.type] || '<i class="fa-regular fa-circle"></i>') + '</div>' +
      '<div class="body">' +
        '<p>' + escapeHtml(a.subject || 'Activity') + '</p>' +
        '<small>' + relTime(a.timestamp) + '</small>' +
      '</div>' +
    '</div>';
  }

  function taskItemHtml(t) {
    var prio = (t.priority || 'Low').toLowerCase();
    var prioCls = { high: 'warn', medium: 'info', low: 'neutral', team: 'purple' }[prio] || 'neutral';
    return '<div class="task" data-sortable-item data-id="' + t.id + '">' +
      '<span class="drag-handle" aria-hidden="true">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>' +
      '</span>' +
      '<input type="checkbox"' + (t.completed ? ' checked' : '') + ' />' +
      '<div class="body">' +
        '<div class="title">' + escapeHtml(t.title || '') + '</div>' +
        '<div class="meta">' +
          '<span><i class="fa-regular fa-clock"></i> ' + escapeHtml(t.due || '') + '</span>' +
          (t.priority ? '<span class="badge badge-' + prioCls + '">' + escapeHtml(t.priority) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function relTime(ts) {
    if (!ts) return '';
    var diff = ts - now();
    var abs = Math.abs(diff);
    var fut = diff > 0;
    var min = 60000, hr = 60 * min, day = 24 * hr;
    if (abs < min) return 'just now';
    if (abs < hr) return Math.round(abs / min) + ' min' + (fut ? ' from now' : ' ago');
    if (abs < day) return Math.round(abs / hr) + ' hour' + (fut ? 's from now' : 's ago');
    if (abs < 7 * day) return Math.round(abs / day) + (fut ? ' day' : ' day') + 's' + (fut ? ' from now' : ' ago');
    var d = new Date(ts);
    return d.toLocaleDateString();
  }

  function set(sel, val) {
    var el = document.querySelector(sel);
    if (el) el.textContent = val;
  }

  function renderSalesChart() {
    var path = document.querySelector('[data-sales-chart-line]');
    var area = document.querySelector('[data-sales-chart-area]');
    if (!path || !area) return;
    // generate 8 month points based on won deals + pipeline
    var months = 8;
    var points = [];
    var maxV = 130;
    for (var i = 0; i < months; i++) {
      // pseudo data anchored to KPIs for some realism
      var ratio = (i + 1) / months;
      var v = 30 + ratio * 90 + Math.sin(i) * 8;
      points.push(v);
    }
    var w = 520, h = 200;
    var step = w / (months - 1);
    var pts = points.map(function (v, i) {
      var x = i * step;
      var y = 20 + (1 - v / maxV) * (h - 30);
      return [x, y];
    });
    var lineD = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ',' + p[1]; }).join(' ');
    var areaD = lineD + ' L' + w + ',' + h + ' L0,' + h + ' Z';
    path.setAttribute('d', lineD);
    area.setAttribute('d', areaD);
    // Update dots
    var dotsG = document.querySelector('[data-sales-chart-dots]');
    if (dotsG) {
      dotsG.innerHTML = pts.map(function (p, i) {
        return '<circle class="dot" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === months - 1 ? 5 : 4) + '"' + (i === months - 1 ? ' fill="var(--fg)"' : '') + '/>';
      }).join('');
    }
  }

  /* ---------- Contacts ---------- */
  function renderContacts() {
    if (!window.Store) return;
    var tbody = document.querySelector('#contacts-table tbody');
    if (!tbody) return;
    var contacts = Store.list('contacts');
    tbody.innerHTML = contacts.length ? contacts.map(contactRowHtml).join('') : emptyRow('No contacts yet. Click "Add Contact" to add your first.');

    // KPIs
    var active = contacts.filter(function (c) { return c.status === 'Active'; }).length;
    var followup = contacts.filter(function (c) { return c.status === 'Follow-up'; }).length;
    var oneWeek = now() - 7 * 86400000;
    var newThisWeek = contacts.filter(function (c) { return c.createdAt >= oneWeek; }).length;
    set('[data-kpi="contactsTotal"]', contacts.length);
    set('[data-kpi="contactsActive"]', active);
    set('[data-kpi="contactsFollowup"]', followup);
    set('[data-kpi="contactsNew"]', newThisWeek);

    // Pagination text
    var info = document.querySelector('[data-pagination-info]');
    if (info) info.innerHTML = 'Showing <strong>1–' + Math.min(contacts.length, 10) + '</strong> of <strong>' + contacts.length + '</strong> contacts';
  }

  function contactRowHtml(c) {
    var statusCls = ({ Active: 'success', New: 'info', 'Follow-up': 'warn', Churned: 'danger' })[c.status] || 'neutral';
    return '<tr data-id="' + c.id + '" data-entity="contacts">' +
      '<td><input type="checkbox" /></td>' +
      '<td><div class="name-cell"><div class="avatar sm">' + escapeHtml(c.initials || 'NN') + '</div>' +
        '<div class="meta"><strong>' + escapeHtml(c.name) + '</strong><span>' + escapeHtml(c.role || '—') + '</span></div></div></td>' +
      '<td>' + escapeHtml(c.email || '—') + '</td>' +
      '<td>' + escapeHtml(c.phone || '—') + '</td>' +
      '<td>' + escapeHtml(c.company || '—') + '</td>' +
      '<td><span class="badge badge-' + statusCls + '">' + escapeHtml(c.status || 'Active') + '</span></td>' +
      '<td><div class="avatar sm">PS</div></td>' +
      '<td><div class="row-actions">' +
        '<button data-row-action="view"><i class="fa-regular fa-eye"></i></button>' +
        '<button data-row-action="edit"><i class="fa-regular fa-pen-to-square"></i></button>' +
        '<button data-row-action="delete"><i class="fa-regular fa-trash-can"></i></button>' +
      '</div></td>' +
    '</tr>';
  }

  /* ---------- Leads ---------- */
  function renderLeads() {
    if (!window.Store) return;
    var tbody = document.querySelector('#leads-table tbody');
    if (tbody) {
      var leads = Store.list('leads');
      tbody.innerHTML = leads.length ? leads.map(leadRowHtml).join('') : emptyRow('No leads yet. Click "Add Lead" to capture one.');
    }

    // KPIs
    var leadsAll = Store.list('leads');
    var qualified = leadsAll.filter(function (l) { return l.stage === 'Qualified'; }).length;
    var proposal = leadsAll.filter(function (l) { return l.stage === 'Proposal'; }).length;
    var conversion = leadsAll.length ? Math.round((qualified / leadsAll.length) * 100) : 0;
    set('[data-kpi="leadsTotal"]', leadsAll.length);
    set('[data-kpi="leadsQualified"]', qualified);
    set('[data-kpi="leadsProposal"]', proposal);
    set('[data-kpi="leadsConversion"]', conversion + '%');

    // Pagination
    var info = document.querySelector('[data-pagination-info]');
    if (info) info.innerHTML = 'Showing <strong>1–' + Math.min(leadsAll.length, 10) + '</strong> of <strong>' + leadsAll.length + '</strong> leads';

    // Pipeline view
    var kanban = document.querySelector('#leads-kanban');
    if (kanban) {
      kanban.setAttribute('data-entity', 'leads');
      var stages = Store.leadsByStage();
      var stageToCol = {
        New: 'col-prospect',
        Contacted: 'col-proposal',
        Qualified: 'col-qualified',
        Proposal: 'col-negotiation'
      };
      kanban.innerHTML = stages.map(function (s) {
        return '<div class="kanban-col ' + (stageToCol[s.stage] || '') + '" data-stage="' + s.stage + '">' +
          '<header>' +
            '<div class="h-left"><span class="dot"></span><h4>' + s.stage + '</h4></div>' +
            '<span class="count">' + s.count + ' lead' + (s.count === 1 ? '' : 's') + '</span>' +
          '</header>' +
          '<div class="col-meta">' + s.count + ' total · ' + (leadsAll.length ? Math.round((s.count / leadsAll.length) * 100) : 0) + '% of pipeline</div>' +
          s.leads.map(leadCardHtml).join('') +
        '</div>';
      }).join('');
    }
  }

  function leadRowHtml(l) {
    var stageCls = ({ New: 'info', Contacted: 'purple', Qualified: 'success', Proposal: 'warn' })[l.stage] || 'neutral';
    var scoreColor = l.score >= 85 ? 'var(--success)' : l.score >= 70 ? 'var(--warning)' : 'var(--danger)';
    return '<tr data-id="' + l.id + '" data-entity="leads">' +
      '<td><input type="checkbox" /></td>' +
      '<td><div class="name-cell"><div class="avatar sm">' + escapeHtml(l.initials || 'NN') + '</div>' +
        '<div class="meta"><strong>' + escapeHtml(l.name) + '</strong><span>' + escapeHtml(l.company || '—') + '</span></div></div></td>' +
      '<td><span class="chip" style="background:var(--bg-subtle);">' + escapeHtml(l.source || '—') + '</span></td>' +
      '<td>' + escapeHtml(l.interest || '—') + '</td>' +
      '<td><span class="badge badge-' + stageCls + '">' + escapeHtml(l.stage || '—') + '</span></td>' +
      '<td><strong style="color:' + scoreColor + '">' + (l.score || '—') + '</strong></td>' +
      '<td><div class="name-cell"><div class="avatar sm">PS</div><span>' + escapeHtml(l.owner || 'Priya Sharma') + '</span></div></td>' +
      '<td><div class="row-actions">' +
        '<button data-row-action="view"><i class="fa-regular fa-eye"></i></button>' +
        '<button data-row-action="edit"><i class="fa-regular fa-pen-to-square"></i></button>' +
        '<button data-row-action="delete"><i class="fa-regular fa-trash-can"></i></button>' +
      '</div></td>' +
    '</tr>';
  }

  function leadCardHtml(l) {
    return '<div class="deal-card" data-kanban-card data-id="' + l.id + '">' +
      '<div class="name">' + escapeHtml(l.name) + '</div>' +
      '<div class="company"><i class="fa-regular fa-building"></i> ' + escapeHtml(l.company || '—') + '</div>' +
      '<div class="row">' +
        '<div><div class="value" style="font-size:13px;font-weight:500;">' + escapeHtml(l.interest || '—') + '</div>' +
          '<div class="date">Score ' + (l.score || '—') + ' · ' + escapeHtml(l.source || '—') + '</div></div>' +
        '<div class="avatar sm">' + escapeHtml(l.initials || 'NN') + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- Deals ---------- */
  function renderDeals() {
    if (!window.Store) return;
    var kanban = document.querySelector('#deals-kanban, [data-entity="deals"]');
    if (!kanban) return;
    kanban.setAttribute('data-entity', 'deals');
    var stages = Store.pipelineByStage();
    var stageToCol = {
      Prospect: 'col-prospect',
      Qualified: 'col-qualified',
      Proposal: 'col-proposal',
      Negotiation: 'col-negotiation',
      Won: 'col-won'
    };
    kanban.innerHTML = stages.map(function (s) {
      var avg = s.count ? Math.round(s.value / s.count) : 0;
      return '<div class="kanban-col ' + (stageToCol[s.stage] || '') + '" data-stage="' + s.stage + '">' +
        '<header>' +
          '<div class="h-left"><span class="dot"></span><h4>' + s.stage + '</h4></div>' +
          '<span class="count">' + s.count + ' deal' + (s.count === 1 ? '' : 's') + '</span>' +
        '</header>' +
        '<div class="col-meta"><strong style="color:var(--fg);">$' + Math.round(s.value / 1000) + 'K</strong> · avg $' + Math.round(avg / 1000) + 'K</div>' +
        s.deals.map(dealCardHtml).join('') +
      '</div>';
    }).join('');

    // Page total
    var totalEl = document.querySelector('[data-deals-total]');
    if (totalEl) {
      var k = Store.kpis();
      totalEl.innerHTML = '<strong style="color:var(--fg);">$' + Math.round(k.pipelineValue / 1000) + 'K</strong> in active value across <strong style="color:var(--fg);">' + k.openDeals + '</strong> deals.';
    }
  }

  function dealCardHtml(d) {
    var won = d.stage === 'Won';
    var dateLabel = formatCloseDate(d.closeDate, won);
    return '<div class="deal-card" data-kanban-card data-id="' + d.id + '">' +
      (d.temp && d.temp !== 'won' ? '<span class="tag ' + escapeHtml(d.temp) + '">' + escapeHtml(d.temp) + '</span>' : '') +
      '<div class="name">' + escapeHtml(d.name) + '</div>' +
      '<div class="company"><i class="fa-regular fa-building"></i> ' + escapeHtml(d.company || '—') + '</div>' +
      '<div class="row">' +
        '<div><div class="value"' + (won ? ' style="color:var(--success);"' : '') + '>$' + (Number(d.value) || 0).toLocaleString() + '</div>' +
        '<div class="date">' + dateLabel + '</div></div>' +
        '<div class="avatar sm">' + initialsFromName(d.company || d.name) + '</div>' +
      '</div>' +
    '</div>';
  }

  function formatCloseDate(ts, won) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var s = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return won ? 'Closed ' + s : 'Closes ' + s;
  }

  function initialsFromName(name) {
    if (!name) return 'NA';
    var parts = name.split(/\s+/);
    return ((parts[0][0] || '') + (parts[1] ? parts[1][0] : (parts[0][1] || ''))).toUpperCase();
  }

  /* ---------- Activities ---------- */
  function renderActivities() {
    if (!window.Store) return;
    var tlEl = document.querySelector('[data-timeline]');
    if (tlEl) {
      var activities = Store.list('activities').sort(function (a, b) { return b.timestamp - a.timestamp; });
      tlEl.innerHTML = activities.length ? activities.map(timelineItemHtml).join('') :
        '<p class="text-muted text-sm" style="padding:30px 0;text-align:center;">No activities yet. <a href="#" data-modal-open="add-activity" style="color:var(--fg);text-decoration:underline;">Log your first →</a></p>';
    }
    // Summary
    var s = Store.activitySummary();
    set('[data-activity="calls"]', s.calls);
    set('[data-activity="emails"]', s.emails);
    set('[data-activity="meetings"]', s.meetings);
    set('[data-activity="proposals"]', s.proposals);
    set('[data-activity="overdue"]', s.overdue);
  }

  function timelineItemHtml(a) {
    var iconByType = {
      call: '<i class="fa-solid fa-phone"></i>',
      email: '<i class="fa-regular fa-envelope"></i>',
      meeting: '<i class="fa-regular fa-calendar"></i>',
      proposal: '<i class="fa-solid fa-file-signature"></i>',
      note: '<i class="fa-regular fa-comments"></i>',
      task: '<i class="fa-solid fa-triangle-exclamation"></i>',
      won: '<i class="fa-solid fa-check"></i>'
    };
    return '<div class="timeline-item ' + escapeHtml(a.status || '') + '">' +
      '<div class="dot">' + (iconByType[a.type] || '<i class="fa-regular fa-circle"></i>') + '</div>' +
      '<div class="timeline-card">' +
        '<div class="head"><h4>' + escapeHtml(a.subject || 'Activity') + '</h4><time>' + relTime(a.timestamp) + '</time></div>' +
        (a.notes ? '<p>' + escapeHtml(a.notes) + '</p>' : '') +
        '<div class="meta">' +
          (a.company ? '<span><i class="fa-regular fa-building"></i> ' + escapeHtml(a.company) + '</span>' : '') +
          (a.contactName ? '<span><i class="fa-regular fa-user"></i> ' + escapeHtml(a.contactName) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- Reports ---------- */
  function renderReports() {
    if (!window.Store) return;
    var leadsAll = Store.list('leads');
    var contacts = Store.list('contacts');
    var deals = Store.list('deals');
    var won = deals.filter(function (d) { return d.stage === 'Won'; });
    var qualified = leadsAll.filter(function (l) { return l.stage === 'Qualified'; });
    var conv = leadsAll.length ? Math.round((qualified.length / leadsAll.length) * 1000) / 10 : 0;
    var revenue = deals.reduce(function (s, d) { return s + (d.stage === 'Won' ? Number(d.value) || 0 : 0); }, 0);
    var pipeline = deals.reduce(function (s, d) { return s + (d.stage !== 'Won' && d.stage !== 'Lost' ? Number(d.value) || 0 : 0); }, 0);

    set('[data-report="monthlyLeads"]', leadsAll.length.toLocaleString());
    set('[data-report="conversionRate"]', conv + '%');
    set('[data-report="revenueForecast"]', '$' + Math.round(pipeline / 1000) + 'K');
    set('[data-report="teamPerf"]', won.length ? Math.min(100, Math.round((won.length / Math.max(1, deals.length)) * 100)) + '%' : '—');

    // Lead source breakdown
    var srcWrap = document.querySelector('[data-source-breakdown]');
    if (srcWrap) {
      var sources = Store.leadsBySource();
      var total = sources.reduce(function (a, b) { return a + b.count; }, 0) || 1;
      srcWrap.innerHTML = sources.map(function (s, i) {
        var pct = Math.round((s.count / total) * 100);
        return '<div class="progress-row">' +
          '<div class="label">' + escapeHtml(s.source) + '</div>' +
          '<div class="progress"><span style="width:' + pct + '%; opacity:' + (1 - i * 0.13).toFixed(2) + ';"></span></div>' +
          '<div class="value">' + s.count + '</div>' +
        '</div>';
      }).join('');
    }

    // Funnel
    var funnelWrap = document.querySelector('[data-funnel]');
    if (funnelWrap) {
      var visitors = contacts.length * 10;
      var levels = [
        { label: 'Visitors', n: visitors, pct: 100 },
        { label: 'Leads', n: leadsAll.length, pct: Math.round(leadsAll.length / visitors * 100) },
        { label: 'Qualified', n: qualified.length, pct: Math.round(qualified.length / visitors * 100) },
        { label: 'Proposal', n: leadsAll.filter(function (l) { return l.stage === 'Proposal'; }).length, pct: Math.round(leadsAll.filter(function (l) { return l.stage === 'Proposal'; }).length / visitors * 100) },
        { label: 'Closed Won', n: won.length, pct: Math.round(won.length / visitors * 100) }
      ];
      funnelWrap.innerHTML = levels.map(function (l, i) {
        return '<div class="progress-row">' +
          '<div class="label">' + l.label + '</div>' +
          '<div class="progress"><span style="width:' + Math.max(2, l.pct) + '%; opacity:' + (1 - i * 0.16).toFixed(2) + ';"></span></div>' +
          '<div class="value">' + (l.n >= 1000 ? (l.n / 1000).toFixed(1) + 'K' : l.n) + '</div>' +
        '</div>';
      }).join('');
    }
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    if (!window.Store) return;
    var user = Store.getCurrentUser();
    if (!user) return;
    var s = Store.getSettings();

    // Profile head
    setVal('[name=profileFirstName]', user.firstName || '');
    setVal('[name=profileLastName]', user.lastName || '');
    setVal('[name=profileEmail]', user.email || '');
    setVal('[name=profileJobTitle]', user.jobTitle || '');
    setVal('[name=profileTimezone]', user.timezone || '');
    var head = document.querySelector('[data-profile-name]');
    if (head) head.textContent = user.name;
    var subtitle = document.querySelector('[data-profile-subtitle]');
    if (subtitle) subtitle.textContent = (user.jobTitle || 'Member') + ' · CRMPro Workspace';
    var avatar = document.querySelector('[data-profile-avatar]');
    if (avatar) avatar.textContent = user.initials;

    // Toggle states
    setChecked('[name=notifNewLead]', s.notifications.newLead);
    setChecked('[name=notifDealStage]', s.notifications.dealStage);
    setChecked('[name=notifOverdueFollowUp]', s.notifications.overdueFollowUp);
    setChecked('[name=notifWeeklyReports]', s.notifications.weeklyReports);
    setChecked('[name=notifNewsletter]', s.notifications.newsletter);

    setChecked('[name=prefCompactDensity]', s.preferences.compactDensity);
    setChecked('[name=prefShowDealValue]', s.preferences.showDealValue);
    setChecked('[name=prefAutoAssignLeads]', s.preferences.autoAssignLeads);
    setChecked('[name=prefShowClosedDeals]', s.preferences.showClosedDeals);
    setVal('[name=prefDefaultLanding]', s.preferences.defaultLanding || 'Dashboard');

    setChecked('[name=secTwoFactor]', s.security.twoFactor);
    setChecked('[name=secLoginAlerts]', s.security.loginAlerts);
    setChecked('[name=secSSO]', s.security.sso);

    setChecked('[data-setting=theme]', s.theme === 'dark');
  }

  function setVal(sel, v) { var el = document.querySelector(sel); if (el) el.value = v; }
  function setChecked(sel, v) { var el = document.querySelector(sel); if (el) el.checked = !!v; }

  function emptyRow(message) {
    var colCount = (document.querySelectorAll('.table-scroll thead th')[0] ? document.querySelectorAll('.table-scroll thead th').length : 8);
    return '<tr class="empty-state-row"><td colspan="' + colCount + '"><div style="font-size:22px;margin-bottom:6px;">📭</div>' + message + '</td></tr>';
  }

  /* =============================================================
     Settings handlers — save profile, toggles, theme, reset
     ============================================================= */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'save-profile') {
      e.preventDefault();
      saveProfile();
    } else if (action === 'reset-demo') {
      e.preventDefault();
      if (!window.Store) return;
      var ok = confirm('Reset everything to the demo data? Your changes will be lost. Your account stays signed in.');
      if (!ok) return;
      Store.reset();
      showToast('Demo data restored', 'info');
      initMainScope();
    } else if (action === 'theme-toggle') {
      e.preventDefault();
      if (!window.Store) return;
      var cur = Store.getTheme();
      Store.setTheme(cur === 'light' ? 'dark' : 'light');
      updateThemeToggleIcons();
      showToast('Switched to ' + Store.getTheme() + ' mode', 'info');
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target;
    var name = input.getAttribute('name');
    if (!name || !window.Store) return;

    var settings = Store.getSettings();
    var patch = null;

    // Notifications
    if (name.startsWith('notif')) {
      patch = { notifications: {} };
      patch.notifications[notifKey(name)] = input.checked;
    } else if (name.startsWith('pref')) {
      patch = { preferences: {} };
      var pk = prefKey(name);
      patch.preferences[pk] = (input.type === 'checkbox') ? input.checked : input.value;
    } else if (name.startsWith('sec')) {
      patch = { security: {} };
      patch.security[secKey(name)] = input.checked;
    }

    if (patch) {
      Store.saveSettings(patch);
      showToast('Settings saved', 'info');
    }

    // Theme switch via data-setting="theme"
    if (input.getAttribute('data-setting') === 'theme') {
      Store.setTheme(input.checked ? 'dark' : 'light');
      updateThemeToggleIcons();
    }
  });

  function notifKey(name) {
    return { notifNewLead: 'newLead', notifDealStage: 'dealStage', notifOverdueFollowUp: 'overdueFollowUp', notifWeeklyReports: 'weeklyReports', notifNewsletter: 'newsletter' }[name];
  }
  function prefKey(name) {
    return { prefCompactDensity: 'compactDensity', prefShowDealValue: 'showDealValue', prefAutoAssignLeads: 'autoAssignLeads', prefShowClosedDeals: 'showClosedDeals', prefDefaultLanding: 'defaultLanding' }[name];
  }
  function secKey(name) {
    return { secTwoFactor: 'twoFactor', secLoginAlerts: 'loginAlerts', secSSO: 'sso' }[name];
  }

  function saveProfile() {
    if (!window.Store) return;
    var patch = {
      firstName: (document.querySelector('[name=profileFirstName]') || {}).value || '',
      lastName: (document.querySelector('[name=profileLastName]') || {}).value || '',
      email: (document.querySelector('[name=profileEmail]') || {}).value || '',
      jobTitle: (document.querySelector('[name=profileJobTitle]') || {}).value || '',
      timezone: (document.querySelector('[name=profileTimezone]') || {}).value || ''
    };
    Store.updateCurrentUser(patch);
    renderCurrentUserChrome();
    initMainScope();
    showToast('Profile saved');
  }

  function now() { return Date.now(); }

  /* =============================================================
     FEATURE PACK — Command palette, notifications, quick-add,
     bulk actions, CSV export, detail panel, recently viewed.
     ============================================================= */

  /* Inject + button into the topbar actions area. Idempotent. */
  function injectTopbarFeatures() {
    var actions = document.querySelector('.topbar .actions');
    if (!actions || actions.dataset.featurePack === '1') return;
    actions.dataset.featurePack = '1';

    var bell = actions.querySelector('.icon-btn[aria-label="Notifications"]');
    if (bell && !bell.dataset.boundBell) {
      bell.dataset.boundBell = '1';
      bell.addEventListener('click', function (e) {
        e.preventDefault();
        openNotificationPanel(bell);
      });
    }

    // Quick-add (+) button — inject between Help and Notifications icons
    if (!actions.querySelector('[data-quick-add]')) {
      var plusBtn = document.createElement('button');
      plusBtn.className = 'icon-btn';
      plusBtn.setAttribute('aria-label', 'Quick add');
      plusBtn.setAttribute('data-quick-add', '');
      plusBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
      // Insert after help icon (first icon-btn)
      var firstIcon = actions.querySelector('.icon-btn');
      if (firstIcon && firstIcon.nextSibling) {
        actions.insertBefore(plusBtn, firstIcon.nextSibling);
      } else {
        actions.insertBefore(plusBtn, actions.firstChild);
      }
      plusBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openQuickAddMenu(plusBtn);
      });
    }

    // Command-palette launcher inside the topbar search box
    var search = document.querySelector('.topbar .search .input');
    if (search && !search.dataset.boundPalette) {
      search.dataset.boundPalette = '1';
      search.addEventListener('focus', function () {
        openCommandPalette(search.value);
      });
    }
  }

  /* =============================================================
     Popover helper — generic positioned dropdown
     ============================================================= */
  function openPopover(anchor, contentHtml, onMount) {
    closePopovers();
    var pop = document.createElement('div');
    pop.className = 'popover';
    pop.innerHTML = contentHtml;
    document.body.appendChild(pop);

    var rect = anchor.getBoundingClientRect();
    pop.style.top = (rect.bottom + 8) + 'px';
    var width = pop.offsetWidth;
    var right = window.innerWidth - rect.right;
    pop.style.right = Math.max(8, right) + 'px';

    requestAnimationFrame(function () { pop.classList.add('show'); });

    function close() {
      pop.classList.remove('show');
      setTimeout(function () { pop.remove(); }, 160);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    }
    function onDocClick(e) {
      if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) close();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);

    if (typeof onMount === 'function') onMount(pop, close);
    return { el: pop, close: close };
  }

  function closePopovers() {
    document.querySelectorAll('.popover').forEach(function (p) { p.remove(); });
  }

  /* =============================================================
     Quick-add menu
     ============================================================= */
  function openQuickAddMenu(anchor) {
    var items = [
      { label: 'New Contact',  shortcut: 'C', modal: 'add-contact',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
      { label: 'New Lead',     shortcut: 'L', modal: 'add-lead',     icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
      { label: 'New Deal',     shortcut: 'D', modal: 'add-deal',     icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>' },
      { label: 'Log Activity', shortcut: 'A', modal: 'add-activity', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
      { label: 'Add Task',     shortcut: 'T', modal: 'add-task',     icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' }
    ];
    var html = '<div class="popover-head"><strong>Quick add</strong><span class="text-soft text-xs">Add anything from anywhere</span></div>' +
      '<div class="popover-list">' +
      items.map(function (it) {
        return '<button class="popover-item" data-quick-modal="' + it.modal + '">' +
          '<span class="popover-icon">' + it.icon + '</span>' +
          '<span class="popover-label">' + it.label + '</span>' +
          '<span class="kbd-mini">' + it.shortcut + '</span>' +
        '</button>';
      }).join('') +
      '</div>';
    openPopover(anchor, html, function (pop, close) {
      pop.querySelectorAll('[data-quick-modal]').forEach(function (b) {
        b.addEventListener('click', function () {
          var which = b.getAttribute('data-quick-modal');
          close();
          openModal(which);
        });
      });
    });
  }

  /* =============================================================
     Notification panel
     ============================================================= */
  function openNotificationPanel(anchor) {
    if (!window.Store) return;
    var recents = Store.recentActivities(8);
    var html = '<div class="popover-head"><strong>Notifications</strong>' +
      '<button class="popover-link" data-mark-all-read>Mark all as read</button></div>' +
      '<div class="popover-list scroll">' +
      (recents.length ? recents.map(function (a) {
        return '<div class="popover-notif">' +
          '<span class="popover-icon">' + notifIcon(a.type) + '</span>' +
          '<div class="popover-notif-body">' +
            '<div class="popover-notif-title">' + escapeHtml(a.subject || 'Activity') + '</div>' +
            '<div class="popover-notif-meta">' +
              (a.company ? escapeHtml(a.company) + ' · ' : '') +
              relTime(a.timestamp) +
            '</div>' +
          '</div>' +
          '<span class="popover-dot"></span>' +
        '</div>';
      }).join('') : '<div class="popover-empty">No notifications yet</div>') +
      '</div>' +
      '<div class="popover-foot"><a href="activities.html" class="popover-link">View all activities →</a></div>';
    openPopover(anchor, html, function (pop, close) {
      var markRead = pop.querySelector('[data-mark-all-read]');
      if (markRead) markRead.addEventListener('click', function () {
        pop.querySelectorAll('.popover-dot').forEach(function (d) { d.remove(); });
        showToast('All notifications marked as read', 'info');
      });
    });
  }

  function notifIcon(type) {
    var map = {
      call:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
      email:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      meeting:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      proposal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      note:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      task:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
      won:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    };
    return map[type] || '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
  }

  /* =============================================================
     Command Palette  (⌘K)
     ============================================================= */
  var paletteOpen = false;
  function openCommandPalette(initialQuery) {
    if (paletteOpen) return;
    paletteOpen = true;

    var backdrop = document.createElement('div');
    backdrop.className = 'palette-backdrop';
    backdrop.innerHTML =
      '<div class="palette" role="dialog" aria-modal="true">' +
        '<div class="palette-input-wrap">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input class="palette-input" type="text" placeholder="Search contacts, deals, actions…" />' +
          '<span class="kbd">esc</span>' +
        '</div>' +
        '<div class="palette-body" data-palette-results></div>' +
        '<div class="palette-foot">' +
          '<span><span class="kbd">↑</span> <span class="kbd">↓</span> Navigate</span>' +
          '<span><span class="kbd">⏎</span> Select</span>' +
          '<span><span class="kbd">esc</span> Close</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { backdrop.classList.add('show'); });

    var input = backdrop.querySelector('.palette-input');
    var resultsEl = backdrop.querySelector('[data-palette-results]');
    var cursor = 0;
    var results = [];

    function close() {
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
      paletteOpen = false;
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { backdrop.remove(); }, 160);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(results.length - 1, cursor + 1); renderHighlight(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); cursor = Math.max(0, cursor - 1); renderHighlight(); }
      if (e.key === 'Enter')     { e.preventDefault(); selectResult(cursor); }
    }
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

    function getActions() {
      return [
        { kind: 'action', label: 'Go to Dashboard',  hint: 'Page',   onSelect: function () { goto('dashboard.html'); }, icon: 'page' },
        { kind: 'action', label: 'Go to Contacts',   hint: 'Page',   onSelect: function () { goto('contacts.html'); }, icon: 'page' },
        { kind: 'action', label: 'Go to Leads',      hint: 'Page',   onSelect: function () { goto('leads.html'); }, icon: 'page' },
        { kind: 'action', label: 'Go to Deals',      hint: 'Page',   onSelect: function () { goto('deals.html'); }, icon: 'page' },
        { kind: 'action', label: 'Go to Activities', hint: 'Page',   onSelect: function () { goto('activities.html'); }, icon: 'page' },
        { kind: 'action', label: 'Go to Reports',    hint: 'Page',   onSelect: function () { goto('reports.html'); }, icon: 'page' },
        { kind: 'action', label: 'Go to Settings',   hint: 'Page',   onSelect: function () { goto('settings.html'); }, icon: 'page' },
        { kind: 'action', label: 'Add new Contact',  hint: 'Action', onSelect: function () { openModal('add-contact'); }, icon: 'plus' },
        { kind: 'action', label: 'Add new Lead',     hint: 'Action', onSelect: function () { openModal('add-lead'); }, icon: 'plus' },
        { kind: 'action', label: 'Add new Deal',     hint: 'Action', onSelect: function () { openModal('add-deal'); }, icon: 'plus' },
        { kind: 'action', label: 'Log Activity',     hint: 'Action', onSelect: function () { openModal('add-activity'); }, icon: 'plus' },
        { kind: 'action', label: 'Add Task',         hint: 'Action', onSelect: function () { openModal('add-task'); }, icon: 'plus' },
        { kind: 'action', label: 'Toggle dark mode', hint: 'Action', onSelect: function () { if (window.Store) Store.setTheme(Store.getTheme() === 'light' ? 'dark' : 'light'); showToast('Theme switched', 'info'); }, icon: 'theme' },
        { kind: 'action', label: 'Logout',           hint: 'Action', onSelect: function () { if (window.Store) Store.logout(); window.location.href = 'index.html'; }, icon: 'logout' }
      ];
    }

    function goto(href) {
      var file = href.toLowerCase();
      var pageKey = file.replace('.html', '');
      document.body.setAttribute('data-page', pageKey);
      if (typeof navigateTo === 'function' && document.querySelector('.app .main')) {
        navigateTo(href);
      } else {
        window.location.href = href;
      }
    }

    function paletteIcon(name) {
      var map = {
        page:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
        plus:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        theme:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
        logout:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
        contact: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
        lead:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/></svg>',
        deal:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/></svg>',
        activity:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        task:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/></svg>'
      };
      return map[name] || map.page;
    }

    function render(query) {
      results = [];
      if (!query) {
        // Default view: actions
        getActions().forEach(function (a) { results.push(a); });
      } else {
        // Filter actions
        var actions = getActions().filter(function (a) {
          return a.label.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        });
        actions.forEach(function (a) { results.push(a); });

        // Then global content search
        if (window.Store) {
          var hits = Store.globalSearch(query, 8);
          hits.forEach(function (h) {
            var name = h.record.name || h.record.subject || h.record.title || '—';
            var sub  = h.record.company || h.record.email || h.record.stage || '';
            var iconMap = { contacts: 'contact', leads: 'lead', deals: 'deal', activities: 'activity', tasks: 'task' };
            results.push({
              kind: 'record',
              entity: h.entity,
              record: h.record,
              label: name,
              hint: h.entity.charAt(0).toUpperCase() + h.entity.slice(1, -1),
              sub: sub,
              icon: iconMap[h.entity] || 'page',
              onSelect: function () {
                Store.markViewed(h.entity, h.record.id);
                openDetailPanel(h.entity, h.record.id);
              }
            });
          });
        }
      }

      cursor = 0;
      resultsEl.innerHTML = results.length ? results.map(function (r, i) {
        return '<div class="palette-row" data-i="' + i + '">' +
          '<span class="palette-icon">' + paletteIcon(r.icon) + '</span>' +
          '<span class="palette-label">' + escapeHtml(r.label) +
            (r.sub ? ' <span class="palette-sub">— ' + escapeHtml(r.sub) + '</span>' : '') +
          '</span>' +
          '<span class="palette-hint">' + escapeHtml(r.hint) + '</span>' +
        '</div>';
      }).join('') :
        '<div class="palette-empty"><div style="font-size:24px;margin-bottom:8px;">🔎</div>No results for "<strong style="color:var(--fg);">' + escapeHtml(query) + '</strong>"</div>';

      renderHighlight();

      resultsEl.querySelectorAll('.palette-row').forEach(function (row) {
        row.addEventListener('mouseenter', function () { cursor = Number(row.dataset.i); renderHighlight(); });
        row.addEventListener('click', function () { selectResult(Number(row.dataset.i)); });
      });
    }

    function renderHighlight() {
      resultsEl.querySelectorAll('.palette-row').forEach(function (r, i) {
        r.classList.toggle('active', i === cursor);
        if (i === cursor) r.scrollIntoView({ block: 'nearest' });
      });
    }

    function selectResult(i) {
      var r = results[i];
      if (!r) return;
      close();
      setTimeout(function () { r.onSelect(); }, 80);
    }

    input.addEventListener('input', function () { render(input.value); });
    input.value = initialQuery || '';
    render(input.value);
    setTimeout(function () { input.focus(); }, 80);
  }

  /* =============================================================
     Detail slide-over panel
     ============================================================= */
  function openDetailPanel(entity, id) {
    if (!window.Store) return;
    var record = Store.get(entity, id);
    if (!record) return;

    closeDetailPanel();
    Store.markViewed(entity, id);

    var html = buildDetailPanelHtml(entity, record);
    var wrap = document.createElement('div');
    wrap.className = 'detail-overlay';
    wrap.innerHTML = '<div class="detail-backdrop"></div>' + html;
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { wrap.classList.add('show'); });

    function close() {
      wrap.classList.remove('show');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { wrap.remove(); }, 200);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    wrap.querySelector('.detail-backdrop').addEventListener('click', close);
    wrap.querySelector('[data-detail-close]').addEventListener('click', close);

    wrap.querySelectorAll('[data-detail-delete]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ok = window.confirm('Delete this record? This cannot be undone.');
        if (!ok) return;
        Store.remove(entity, id);
        close();
        showToast('Deleted');
        initMainScope();
      });
    });

    closePopovers();
  }
  function closeDetailPanel() {
    document.querySelectorAll('.detail-overlay').forEach(function (o) { o.remove(); });
    document.body.style.overflow = '';
  }

  function buildDetailPanelHtml(entity, r) {
    var title = r.name || r.subject || r.title || 'Record';
    var subtitle = r.company || r.email || r.stage || r.priority || '';
    var fieldsHtml = '';

    if (entity === 'contacts') {
      fieldsHtml = detailField('Email', r.email) + detailField('Phone', r.phone) +
        detailField('Company', r.company) + detailField('Role', r.role) +
        detailField('Status', r.status);
    } else if (entity === 'leads') {
      fieldsHtml = detailField('Company', r.company) + detailField('Source', r.source) +
        detailField('Interest', r.interest) + detailField('Stage', r.stage) +
        detailField('Score', r.score) + detailField('Owner', r.owner);
    } else if (entity === 'deals') {
      fieldsHtml = detailField('Company', r.company) +
        detailField('Value', '$' + (Number(r.value) || 0).toLocaleString()) +
        detailField('Stage', r.stage) + detailField('Temperature', r.temp) +
        detailField('Close date', r.closeDate ? new Date(r.closeDate).toLocaleDateString() : '');
    } else if (entity === 'activities') {
      fieldsHtml = detailField('Type', r.type) + detailField('Company', r.company) +
        detailField('Contact', r.contactName) +
        detailField('When', r.timestamp ? new Date(r.timestamp).toLocaleString() : '') +
        detailField('Notes', r.notes);
    } else if (entity === 'tasks') {
      fieldsHtml = detailField('Due', r.due) + detailField('Priority', r.priority) +
        detailField('Notes', r.notes) +
        detailField('Status', r.completed ? 'Completed' : 'Open');
    }

    // Related activities for contacts / deals / leads
    var related = '';
    if (window.Store && (entity === 'contacts' || entity === 'leads' || entity === 'deals')) {
      var company = r.company || (r.name || '');
      var name = r.name || '';
      var matches = Store.list('activities').filter(function (a) {
        return (a.company && a.company === company) || (a.contactName && a.contactName === name);
      }).sort(function (a, b) { return b.timestamp - a.timestamp; }).slice(0, 4);
      if (matches.length) {
        related = '<div class="detail-section-title">Recent activity</div>' +
          '<div class="detail-activity">' +
          matches.map(function (a) {
            return '<div class="detail-activity-item"><span>' + notifIcon(a.type) + '</span>' +
              '<div><div style="font-size:13px;font-weight:500;">' + escapeHtml(a.subject || 'Activity') + '</div>' +
              '<div class="text-soft text-xs">' + relTime(a.timestamp) + '</div></div></div>';
          }).join('') +
          '</div>';
      }
    }

    return '<aside class="detail-panel" role="dialog" aria-modal="true">' +
      '<header class="detail-head">' +
        '<div class="detail-head-main">' +
          '<div class="avatar lg" aria-hidden="true">' + escapeHtml((title || 'NN').split(/\s+/).map(function(p){return p[0]||'';}).slice(0,2).join('').toUpperCase()) + '</div>' +
          '<div>' +
            '<h3>' + escapeHtml(title) + '</h3>' +
            (subtitle ? '<p class="text-muted text-sm">' + escapeHtml(subtitle) + '</p>' : '') +
          '</div>' +
        '</div>' +
        '<button class="modal-close" data-detail-close aria-label="Close">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</header>' +
      '<div class="detail-body">' +
        '<div class="detail-section-title">Details</div>' +
        '<div class="detail-fields">' + fieldsHtml + '</div>' +
        related +
      '</div>' +
      '<footer class="detail-foot">' +
        '<button class="btn btn-secondary btn-sm" data-detail-close>Close</button>' +
        '<button class="btn btn-danger btn-sm" data-detail-delete>Delete</button>' +
      '</footer>' +
    '</aside>';
  }

  function detailField(label, value) {
    if (value == null || value === '') return '';
    return '<div class="detail-field">' +
      '<div class="detail-field-label">' + escapeHtml(label) + '</div>' +
      '<div class="detail-field-value">' + escapeHtml(String(value)) + '</div>' +
    '</div>';
  }

  /* =============================================================
     Bulk actions (multi-select rows)
     ============================================================= */
  function initBulkActions() {
    document.querySelectorAll('table.data').forEach(function (table) {
      if (table.dataset.bulkInit === '1') return;
      table.dataset.bulkInit = '1';

      var headCb = table.querySelector('thead input[type="checkbox"]');
      var allCbs = function () { return table.querySelectorAll('tbody tr:not(.empty-state-row) input[type="checkbox"]'); };

      if (headCb) {
        headCb.addEventListener('change', function () {
          allCbs().forEach(function (cb) {
            // Only affect visible rows
            var row = cb.closest('tr');
            if (row && row.style.display === 'none') return;
            cb.checked = headCb.checked;
          });
          syncSelectionBar();
        });
      }

      table.addEventListener('change', function (e) {
        if (e.target && e.target.type === 'checkbox' && e.target.closest('tbody')) {
          syncSelectionBar();
        }
      });
    });
    syncSelectionBar();
  }

  function syncSelectionBar() {
    var table = document.querySelector('table.data');
    if (!table) { closeSelectionBar(); return; }
    var selected = Array.from(table.querySelectorAll('tbody tr:not(.empty-state-row) input[type="checkbox"]:checked'));
    if (!selected.length) { closeSelectionBar(); return; }

    var bar = document.querySelector('.selection-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'selection-bar';
      bar.innerHTML =
        '<span class="selection-count"></span>' +
        '<button class="btn btn-ghost btn-sm" data-bulk="clear">Clear</button>' +
        '<button class="btn btn-secondary btn-sm" data-bulk="export">Export CSV</button>' +
        '<button class="btn btn-danger btn-sm" data-bulk="delete">Delete</button>';
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add('show'); });

      bar.querySelector('[data-bulk="clear"]').addEventListener('click', function () {
        document.querySelectorAll('table.data tbody input[type="checkbox"]:checked').forEach(function (cb) { cb.checked = false; });
        var hd = document.querySelector('table.data thead input[type="checkbox"]');
        if (hd) hd.checked = false;
        closeSelectionBar();
      });
      bar.querySelector('[data-bulk="delete"]').addEventListener('click', function () {
        var checked = Array.from(document.querySelectorAll('table.data tbody input[type="checkbox"]:checked'));
        var rows = checked.map(function (cb) { return cb.closest('tr'); }).filter(Boolean);
        var ok = window.confirm('Delete ' + rows.length + ' record' + (rows.length === 1 ? '' : 's') + '? This cannot be undone.');
        if (!ok) return;
        rows.forEach(function (row) {
          var entity = row.getAttribute('data-entity');
          var id = row.getAttribute('data-id');
          if (window.Store && entity && id) Store.remove(entity, id);
        });
        closeSelectionBar();
        showToast(rows.length + ' record' + (rows.length === 1 ? '' : 's') + ' deleted');
        initMainScope();
      });
      bar.querySelector('[data-bulk="export"]').addEventListener('click', function () {
        var checked = Array.from(document.querySelectorAll('table.data tbody input[type="checkbox"]:checked'));
        var rows = checked.map(function (cb) { return cb.closest('tr'); }).filter(Boolean);
        if (!rows.length) return;
        var entity = rows[0].getAttribute('data-entity');
        if (window.Store && entity) {
          var ids = rows.map(function (r) { return r.getAttribute('data-id'); });
          var records = Store.list(entity).filter(function (r) { return ids.indexOf(r.id) !== -1; });
          exportCsv(entity, records);
        }
      });
    }
    var n = selected.length;
    bar.querySelector('.selection-count').innerHTML = '<strong>' + n + '</strong> selected';
  }

  function closeSelectionBar() {
    var bar = document.querySelector('.selection-bar');
    if (!bar) return;
    bar.classList.remove('show');
    setTimeout(function () { bar.remove(); }, 180);
  }

  /* =============================================================
     CSV Export
     ============================================================= */
  function initCSVExport() {
    document.querySelectorAll('[data-export-csv]').forEach(function (btn) {
      if (btn.dataset.boundExport === '1') return;
      btn.dataset.boundExport = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var entity = btn.getAttribute('data-export-csv');
        if (window.Store) exportCsv(entity, Store.list(entity));
      });
    });
    // Also wire generic "Export" buttons by sniffing text
    document.querySelectorAll('button').forEach(function (btn) {
      if (btn.dataset.boundExport === '1') return;
      var txt = (btn.textContent || '').trim().toLowerCase();
      if (txt.indexOf('export') !== 0 && txt !== 'export' && txt.indexOf('export csv') === -1 && txt.indexOf('export pdf') === -1) return;
      btn.dataset.boundExport = '1';
      btn.addEventListener('click', function (e) {
        // Don't intercept Reset / unrelated
        e.preventDefault();
        var pageEl = document.querySelector('.page[data-page]');
        var page = pageEl ? pageEl.getAttribute('data-page') : '';
        var mapping = { contacts: 'contacts', leads: 'leads', deals: 'deals', activities: 'activities', reports: 'deals' };
        var entity = mapping[page] || 'contacts';
        if (window.Store) exportCsv(entity, Store.list(entity));
      });
    });
  }

  function exportCsv(entity, records) {
    if (!records || !records.length) {
      showToast('Nothing to export', 'warn');
      return;
    }
    var fieldsByEntity = {
      contacts:   ['name', 'email', 'phone', 'company', 'role', 'status', 'createdAt'],
      leads:      ['name', 'company', 'source', 'interest', 'stage', 'score', 'owner', 'createdAt'],
      deals:      ['name', 'company', 'value', 'stage', 'closeDate', 'temp', 'createdAt'],
      activities: ['type', 'subject', 'company', 'contactName', 'timestamp', 'notes'],
      tasks:      ['title', 'due', 'priority', 'completed', 'createdAt']
    };
    var fields = fieldsByEntity[entity] || Object.keys(records[0]);
    var head = fields.join(',');
    var body = records.map(function (r) {
      return fields.map(function (f) {
        var v = r[f];
        if (f === 'timestamp' || f === 'createdAt' || f === 'closeDate') {
          if (typeof v === 'number') v = new Date(v).toISOString();
        }
        if (v == null) v = '';
        v = String(v);
        if (v.indexOf(',') !== -1 || v.indexOf('"') !== -1 || v.indexOf('\n') !== -1) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      }).join(',');
    }).join('\n');
    var csv = head + '\n' + body;
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'crmpro-' + entity + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    showToast('Exported ' + records.length + ' ' + entity);
  }

  /* =============================================================
     Recently viewed (sidebar section)
     ============================================================= */
  function injectRecentlyViewed() {
    var nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    var existing = nav.querySelector('[data-recent-section]');
    if (existing) {
      renderRecentlyViewed();
      return;
    }
    var promo = nav.querySelector('.sidebar-promo');
    var section = document.createElement('div');
    section.setAttribute('data-recent-section', '');
    section.innerHTML =
      '<div class="sidebar-section">Recent</div>' +
      '<div data-recent-list></div>';
    if (promo) nav.insertBefore(section, promo);
    else nav.appendChild(section);
    renderRecentlyViewed();
  }

  function renderRecentlyViewed() {
    if (!window.Store) return;
    var listEl = document.querySelector('[data-recent-list]');
    if (!listEl) return;
    var recents = Store.getRecentlyViewed(5);
    if (!recents.length) {
      listEl.innerHTML = '<div class="sidebar-empty">Nothing recent yet</div>';
      return;
    }
    listEl.innerHTML = recents.map(function (item) {
      var r = item.record;
      var name = r.name || r.subject || r.title || '—';
      var sub = r.company || r.stage || '';
      var initials = (name || 'NN').split(/\s+/).map(function (p) { return p[0] || ''; }).slice(0, 2).join('').toUpperCase();
      var iconColor = ({ contacts: '#6366f1', leads: '#8b5cf6', deals: '#0d9488', activities: '#d97706', tasks: '#3b82f6' })[item.entity] || '#71717a';
      return '<button class="sidebar-recent" data-recent-entity="' + item.entity + '" data-recent-id="' + r.id + '">' +
        '<span class="sidebar-recent-dot" style="background:' + iconColor + ';"></span>' +
        '<div class="sidebar-recent-body">' +
          '<div class="sidebar-recent-name">' + escapeHtml(name) + '</div>' +
          (sub ? '<div class="sidebar-recent-sub">' + escapeHtml(sub) + '</div>' : '') +
        '</div>' +
      '</button>';
    }).join('');

    listEl.querySelectorAll('[data-recent-entity]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var entity = btn.getAttribute('data-recent-entity');
        var id = btn.getAttribute('data-recent-id');
        openDetailPanel(entity, id);
      });
    });
  }

  /* Hook view actions on rows to mark as viewed + open detail panel. */
  function enhanceRowActions() {
    document.querySelectorAll('table.data tbody tr').forEach(function (tr) {
      if (tr.dataset.boundEnhance === '1') return;
      tr.dataset.boundEnhance = '1';
      var viewBtn = tr.querySelector('[data-row-action="view"]');
      if (!viewBtn) return;
      viewBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var entity = tr.getAttribute('data-entity');
        var id = tr.getAttribute('data-id');
        if (entity && id) {
          openDetailPanel(entity, id);
          setTimeout(renderRecentlyViewed, 50);
        }
      }, true);
    });

    // Kanban cards — click to view details
    document.querySelectorAll('.kanban .deal-card, .kanban [data-kanban-card]').forEach(function (card) {
      if (card.dataset.boundEnhance === '1') return;
      card.dataset.boundEnhance = '1';
      card.addEventListener('click', function (e) {
        // Avoid triggering during drag
        if (card.classList.contains('dragging')) return;
        var id = card.dataset.id;
        var kanban = card.closest('.kanban');
        var entity = kanban ? kanban.getAttribute('data-entity') : '';
        if (entity && id) {
          openDetailPanel(entity, id);
          setTimeout(renderRecentlyViewed, 50);
        }
      });
    });
  }

  /* =============================================================
     Wire Feature Pack into the main scope
     ============================================================= */
  var originalInitMainScope = initMainScope;
  initMainScope = function () {
    originalInitMainScope();
    injectTopbarFeatures();
    injectRecentlyViewed();
    initBulkActions();
    initCSVExport();
    enhanceRowActions();
  };

  /* ⌘K / Ctrl+K opens the command palette (overrides the earlier
     focus-search behavior). */
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === 'k') {
      // Don't trigger inside palette itself
      if (paletteOpen) return;
      e.preventDefault();
      openCommandPalette('');
    }
  });

  /* Expose */
  window.CRMPro = {
    showToast: showToast,
    openModal: openModal,
    navigateTo: navigateTo,
    openCommandPalette: openCommandPalette,
    openDetailPanel: openDetailPanel
  };
})();

/* Spinner keyframes */
(function () {
  var style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
})();
