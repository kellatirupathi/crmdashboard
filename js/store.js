/* =========================================================
   CRMPro — Store
   Single source of truth. CRUD + auth + settings.
   Backed by localStorage. Pub/sub for live updates.
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'crmpro_v2';
  var SESSION_KEY = 'crmpro_session';

  /* ------------- Helpers ------------- */
  var uid = function (prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  };
  var now = Date.now;
  var DAY = 86400000;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------- Seed Data ------------- */
  function buildSeed() {
    var demoUserId = 'user_demo';
    var t = now();

    var users = [{
      id: demoUserId,
      email: 'demo@crmpro.io',
      password: 'demo123',
      firstName: 'Priya',
      lastName: 'Sharma',
      name: 'Priya Sharma',
      initials: 'PS',
      jobTitle: 'Sales Manager',
      timezone: '(GMT+05:30) India Standard Time',
      createdAt: t - 90 * DAY
    }];

    var contacts = [
      { name: 'Aisha Khan',          role: 'VP Marketing',       email: 'aisha.khan@brightline.io',    phone: '+91 98201 24587', company: 'Brightline Inc.',  status: 'Active'   },
      { name: 'Rohan Mehta',         role: 'Founder & CEO',      email: 'rohan@velocitylabs.co',       phone: '+91 99023 78451', company: 'Velocity Labs',    status: 'New'      },
      { name: 'Sanjana Kapoor',      role: 'Procurement Lead',   email: 'sanjana.k@northwind.com',     phone: '+91 98765 11244', company: 'Northwind Co.',    status: 'Follow-up'},
      { name: 'Devansh Verma',       role: 'Head of Engineering',email: 'devansh@orbitsystems.dev',    phone: '+91 90876 33422', company: 'Orbit Systems',    status: 'Active'   },
      { name: 'Maya Nair',           role: 'Operations Director',email: 'maya.nair@sunpath.co',        phone: '+91 78946 22330', company: 'Sunpath Solutions',status: 'New'      },
      { name: 'Karthik Subramanian', role: 'Product Manager',    email: 'karthik.s@helixtech.io',      phone: '+91 99887 56678', company: 'Helix Tech',       status: 'Active'   },
      { name: 'Pooja Anand',         role: 'Buyer',              email: 'pooja.anand@craftloop.shop',  phone: '+91 92345 87211', company: 'CraftLoop',        status: 'Follow-up'},
      { name: 'Vikram Sinha',        role: 'CTO',                email: 'vikram@nimbusedge.io',        phone: '+91 95623 12087', company: 'Nimbus Edge',      status: 'Churned'  },
      { name: 'Tanya Ramesh',        role: 'HR Director',        email: 'tanya.r@peakhrgroup.com',     phone: '+91 91234 56789', company: 'Peak HR Group',    status: 'Active'   },
      { name: 'Aarav Reddy',         role: 'Finance Lead',       email: 'aarav.r@quantumledger.io',    phone: '+91 90011 23456', company: 'Quantum Ledger',   status: 'New'      }
    ].map(function (c, i) {
      return Object.assign({}, c, {
        id: uid('cn'),
        initials: c.name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(),
        ownerId: demoUserId,
        createdAt: t - (i + 1) * 3 * DAY,
        updatedAt: t - i * DAY
      });
    });

    var contactsByCompany = {};
    contacts.forEach(function (c) { contactsByCompany[c.company] = c.id; });

    var leads = [
      { name: 'Aisha Khan',          company: 'Brightline Inc.',  source: 'Website',           interest: 'Enterprise Plan',     stage: 'New',       score: 92, owner: 'Priya Sharma' },
      { name: 'Rohan Mehta',         company: 'Velocity Labs',    source: 'LinkedIn Ad',       interest: 'Pro Plan + Onboarding',stage: 'Contacted', score: 88, owner: 'Karan Mehta'  },
      { name: 'Sanjana Kapoor',      company: 'Northwind Co.',    source: 'Referral',          interest: 'Team Plan',           stage: 'Qualified', score: 95, owner: 'Priya Sharma' },
      { name: 'Devansh Verma',       company: 'Orbit Systems',    source: 'Cold Outreach',     interest: 'API Integration',     stage: 'Proposal',  score: 76, owner: 'Ankita Roy'   },
      { name: 'Maya Nair',           company: 'Sunpath Solutions',source: 'Webinar',           interest: 'Starter Plan',        stage: 'New',       score: 68, owner: 'Karan Mehta'  },
      { name: 'Karthik Subramanian', company: 'Helix Tech',       source: 'Trade Show',        interest: 'Enterprise + SSO',    stage: 'Qualified', score: 91, owner: 'Priya Sharma' },
      { name: 'Pooja Anand',         company: 'CraftLoop',        source: 'Google Search',     interest: 'E-commerce Module',   stage: 'Contacted', score: 72, owner: 'Ankita Roy'   },
      { name: 'Vikram Sinha',        company: 'Nimbus Edge',      source: 'Inbound Demo',      interest: 'Custom Implementation',stage: 'Proposal', score: 84, owner: 'Priya Sharma' },
      { name: 'Tanya Ramesh',        company: 'Peak HR Group',    source: 'Partner Referral',  interest: 'HR Add-on Bundle',    stage: 'Qualified', score: 89, owner: 'Karan Mehta'  }
    ].map(function (l, i) {
      return Object.assign({}, l, {
        id: uid('ld'),
        initials: l.name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase(),
        contactId: contactsByCompany[l.company] || null,
        ownerId: demoUserId,
        createdAt: t - (i + 1) * 2 * DAY
      });
    });

    var deals = [
      { name: 'Marketing Cloud Renewal',  company: 'Brightline Inc.',   value: 18500,  stage: 'Prospect',    closeDate: t + 30 * DAY, temp: 'cold' },
      { name: 'Sales Module Pilot',       company: 'Sunpath Solutions', value: 24000,  stage: 'Prospect',    closeDate: t + 44 * DAY, temp: 'warm' },
      { name: 'CRM Onboarding',           company: 'CraftLoop',         value: 9400,   stage: 'Prospect',    closeDate: t + 50 * DAY, temp: 'cold' },
      { name: 'Annual Subscription',      company: 'Northwind Co.',     value: 32000,  stage: 'Qualified',   closeDate: t + 7  * DAY, temp: 'warm' },
      { name: 'HR Add-on Bundle',         company: 'Peak HR Group',     value: 28500,  stage: 'Qualified',   closeDate: t + 14 * DAY, temp: 'hot'  },
      { name: 'API + SSO Pack',           company: 'Helix Tech',        value: 35500,  stage: 'Qualified',   closeDate: t + 28 * DAY, temp: 'warm' },
      { name: 'Enterprise CRM Rollout',   company: 'Velocity Labs',     value: 64000,  stage: 'Proposal',    closeDate: t + 18 * DAY, temp: 'hot'  },
      { name: 'Custom Integration',       company: 'Orbit Systems',     value: 42800,  stage: 'Proposal',    closeDate: t + 36 * DAY, temp: 'warm' },
      { name: 'Migration Services',       company: 'Nimbus Edge',       value: 41200,  stage: 'Proposal',    closeDate: t + 50 * DAY, temp: 'warm' },
      { name: 'Finance Suite License',    company: 'Quantum Ledger',    value: 46500,  stage: 'Negotiation', closeDate: t + 5  * DAY, temp: 'hot'  },
      { name: 'Multi-region Plan',        company: 'Arclight Media',    value: 31500,  stage: 'Negotiation', closeDate: t + 10 * DAY, temp: 'hot'  },
      { name: 'Pro Plan — 24 seats',      company: 'Velocity Labs',     value: 24800,  stage: 'Won',         closeDate: t - 13 * DAY, temp: 'won'  },
      { name: 'Annual Subscription',      company: 'Brightline Inc.',   value: 15200,  stage: 'Won',         closeDate: t - 7  * DAY, temp: 'won'  },
      { name: 'Onboarding Package',       company: 'Sunpath Solutions', value: 12000,  stage: 'Won',         closeDate: t - 3  * DAY, temp: 'won'  }
    ].map(function (d, i) {
      return Object.assign({}, d, {
        id: uid('dl'),
        contactId: contactsByCompany[d.company] || null,
        ownerId: demoUserId,
        createdAt: t - (i + 1) * 4 * DAY
      });
    });

    var activities = [
      { type: 'call',     subject: 'Discussed onboarding plan with Aisha Khan',  contactName: 'Aisha Khan',  company: 'Brightline Inc.',  timestamp: t - 12 * 60 * 1000,    notes: 'Customer excited to move forward.', status: 'success' },
      { type: 'email',    subject: 'Sent proposal v2 to Brightline Inc.',        contactName: 'Aisha Khan',  company: 'Brightline Inc.',  timestamp: t - 60 * 60 * 1000,    notes: 'Opened 3 times so far.',             status: 'info' },
      { type: 'meeting',  subject: 'Demo scheduled with Rohan Mehta',            contactName: 'Rohan Mehta', company: 'Velocity Labs',    timestamp: t + 1 * DAY,           notes: '4 attendees confirmed.',             status: 'warn' },
      { type: 'proposal', subject: 'Proposal shared with Helix Tech',            contactName: 'Karthik Subramanian', company: 'Helix Tech', timestamp: t - 1 * DAY,        notes: 'Enterprise + SSO bundle, $35,500',    status: 'purple' },
      { type: 'note',     subject: 'Note added to Northwind Co.',                contactName: 'Sanjana Kapoor', company: 'Northwind Co.', timestamp: t - 1 * DAY - 7200000, notes: 'Procurement review next week.',       status: 'info' },
      { type: 'task',     subject: 'Follow-up pending · Devansh Verma',          contactName: 'Devansh Verma', company: 'Orbit Systems',  timestamp: t - 2 * DAY,           notes: 'Awaiting response on integration scope.', status: 'danger' },
      { type: 'won',      subject: 'Deal closed with Velocity Labs',             contactName: 'Rohan Mehta', company: 'Velocity Labs',    timestamp: t - 3 * DAY,           notes: 'Pro Plan — 24 seats signed.',         status: 'success' }
    ].map(function (a) { return Object.assign({}, a, { id: uid('ac'), userId: demoUserId }); });

    var tasks = [
      { title: 'Follow up with Aisha Khan',     due: 'Today · 4:00 PM',   priority: 'High',   completed: false, order: 0 },
      { title: 'Send proposal to Brightline',   due: 'Tomorrow',          priority: 'Medium', completed: false, order: 1 },
      { title: 'Demo call · Velocity Labs',     due: 'Wed · 11:00',       priority: 'Medium', completed: true,  order: 2 },
      { title: 'Quarterly pipeline review',     due: 'Fri · 2:30 PM',     priority: 'Team',   completed: false, order: 3 },
      { title: 'Reach out to Northwind Co.',    due: 'Next Mon',          priority: 'Low',    completed: false, order: 4 }
    ].map(function (t, i) { return Object.assign({}, t, { id: uid('tk'), userId: demoUserId, createdAt: now() - (5 - i) * 3600000 }); });

    return {
      version: 2,
      users: users,
      contacts: contacts,
      leads: leads,
      deals: deals,
      activities: activities,
      tasks: tasks,
      settings: {
        theme: 'light',
        notifications: {
          newLead: true,
          dealStage: true,
          overdueFollowUp: true,
          weeklyReports: false,
          newsletter: false
        },
        preferences: {
          compactDensity: false,
          showDealValue: true,
          autoAssignLeads: true,
          showClosedDeals: false,
          defaultLanding: 'Dashboard'
        },
        security: {
          twoFactor: true,
          loginAlerts: true,
          sso: false
        }
      }
    };
  }

  /* ------------- Persistence ------------- */
  var state = null;

  function load() {
    if (state) return state;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (state && state.version === 2) return state;
      }
    } catch (_) {}
    state = buildSeed();
    save();
    return state;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Store: failed to persist', e);
    }
  }

  /* ------------- Pub/Sub ------------- */
  var listeners = {};
  function on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (h) { return h !== fn; });
    };
  }
  function emit(event, payload) {
    (listeners[event] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.warn(e); }
    });
    (listeners['*'] || []).forEach(function (fn) {
      try { fn({ event: event, payload: payload }); } catch (e) {}
    });
  }

  /* ------------- Auth ------------- */
  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }
  function setSession(userId) {
    if (userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: userId, loginAt: now() }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }
  function getCurrentUser() {
    var s = load();
    var sess = getSession();
    if (!sess) return null;
    return s.users.find(function (u) { return u.id === sess.userId; }) || null;
  }
  function isLoggedIn() { return !!getCurrentUser(); }

  function register(email, password, firstName, lastName) {
    var s = load();
    email = (email || '').trim().toLowerCase();
    password = password || '';
    firstName = (firstName || '').trim();
    lastName = (lastName || '').trim();

    if (!email || !password) throw new Error('Email and password are required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!/.+@.+\..+/.test(email)) throw new Error('Please enter a valid email address.');
    if (s.users.some(function (u) { return u.email.toLowerCase() === email; })) {
      throw new Error('An account with that email already exists.');
    }

    var name = (firstName + ' ' + lastName).trim() || email.split('@')[0];
    var initials = name.split(/\s+/).map(function (p) { return p[0] || ''; }).slice(0, 2).join('').toUpperCase();

    var user = {
      id: uid('user'),
      email: email,
      password: password,
      firstName: firstName || name.split(' ')[0] || 'New',
      lastName: lastName || (name.split(' ')[1] || 'User'),
      name: name,
      initials: initials || 'U',
      jobTitle: 'Sales Manager',
      timezone: '(GMT+05:30) India Standard Time',
      createdAt: now()
    };
    s.users.push(user);
    save();
    setSession(user.id);
    emit('user:registered', user);
    emit('auth:change', user);
    return user;
  }

  function login(email, password) {
    var s = load();
    email = (email || '').trim().toLowerCase();
    var user = s.users.find(function (u) { return u.email.toLowerCase() === email && u.password === password; });
    if (!user) throw new Error('Invalid email or password.');
    setSession(user.id);
    emit('auth:change', user);
    return user;
  }

  function logout() {
    setSession(null);
    emit('auth:change', null);
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function updateCurrentUser(patch) {
    var s = load();
    var user = getCurrentUser();
    if (!user) return null;
    Object.assign(user, patch);
    if (patch.firstName || patch.lastName) {
      user.name = ((patch.firstName || user.firstName) + ' ' + (patch.lastName || user.lastName)).trim();
      user.initials = user.name.split(/\s+/).map(function (p) { return p[0] || ''; }).slice(0, 2).join('').toUpperCase();
    }
    save();
    emit('user:updated', user);
    return user;
  }

  /* ------------- Generic CRUD ------------- */
  var ENTITIES = ['contacts', 'leads', 'deals', 'activities', 'tasks'];

  function list(entity, filter) {
    var s = load();
    if (ENTITIES.indexOf(entity) === -1) return [];
    var items = s[entity] || [];
    if (filter && typeof filter === 'function') items = items.filter(filter);
    return items.slice();
  }

  function get(entity, id) {
    var s = load();
    if (ENTITIES.indexOf(entity) === -1) return null;
    return (s[entity] || []).find(function (r) { return r.id === id; }) || null;
  }

  function create(entity, data) {
    var s = load();
    if (ENTITIES.indexOf(entity) === -1) throw new Error('Unknown entity: ' + entity);
    var record = Object.assign({}, data, {
      id: uid(entity.slice(0, 2)),
      createdAt: now(),
      updatedAt: now()
    });
    if (entity === 'contacts' || entity === 'leads') {
      var name = record.name || 'New';
      record.initials = name.split(/\s+/).map(function (p) { return p[0] || ''; }).slice(0, 2).join('').toUpperCase() || 'N';
    }
    if (!record.ownerId) {
      var u = getCurrentUser();
      record.ownerId = u ? u.id : null;
    }
    s[entity] = s[entity] || [];
    s[entity].unshift(record);
    save();
    emit(entity + ':created', record);
    emit(entity + ':changed', null);
    return record;
  }

  function update(entity, id, patch) {
    var s = load();
    if (ENTITIES.indexOf(entity) === -1) return null;
    var arr = s[entity] || [];
    var idx = arr.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return null;
    Object.assign(arr[idx], patch, { updatedAt: now() });
    save();
    emit(entity + ':updated', arr[idx]);
    emit(entity + ':changed', null);
    return arr[idx];
  }

  function remove(entity, id) {
    var s = load();
    if (ENTITIES.indexOf(entity) === -1) return false;
    var arr = s[entity] || [];
    var idx = arr.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return false;
    var removed = arr.splice(idx, 1)[0];
    save();
    emit(entity + ':removed', removed);
    emit(entity + ':changed', null);
    return true;
  }

  /* ------------- Settings ------------- */
  function getSettings() {
    return clone(load().settings);
  }
  function saveSettings(patch) {
    var s = load();
    s.settings = Object.assign({}, s.settings, patch || {});
    if (patch && patch.notifications) {
      s.settings.notifications = Object.assign({}, s.settings.notifications, patch.notifications);
    }
    if (patch && patch.preferences) {
      s.settings.preferences = Object.assign({}, s.settings.preferences, patch.preferences);
    }
    if (patch && patch.security) {
      s.settings.security = Object.assign({}, s.settings.security, patch.security);
    }
    save();
    emit('settings:updated', s.settings);
    return s.settings;
  }
  function setTheme(theme) {
    saveSettings({ theme: theme });
    applyTheme(theme);
  }
  function getTheme() {
    return load().settings.theme || 'light';
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || getTheme());
  }

  /* ------------- Computed / Reports ------------- */
  function kpis() {
    var s = load();
    var totalContacts = s.contacts.length;
    var newLeads = s.leads.filter(function (l) { return ['New', 'Contacted'].indexOf(l.stage) !== -1; }).length;
    var openDeals = s.deals.filter(function (d) { return d.stage !== 'Won' && d.stage !== 'Lost'; }).length;
    var pipeline = s.deals
      .filter(function (d) { return d.stage !== 'Won' && d.stage !== 'Lost'; })
      .reduce(function (sum, d) { return sum + (Number(d.value) || 0); }, 0);
    return {
      totalContacts: totalContacts,
      newLeads: newLeads,
      openDeals: openDeals,
      pipelineValue: pipeline
    };
  }

  function pipelineByStage() {
    var s = load();
    var stages = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won'];
    return stages.map(function (stage) {
      var arr = s.deals.filter(function (d) { return d.stage === stage; });
      return {
        stage: stage,
        count: arr.length,
        value: arr.reduce(function (sum, d) { return sum + (Number(d.value) || 0); }, 0),
        deals: arr
      };
    });
  }

  function leadsByStage() {
    var s = load();
    var stages = ['New', 'Contacted', 'Qualified', 'Proposal'];
    return stages.map(function (stage) {
      var arr = s.leads.filter(function (l) { return l.stage === stage; });
      return { stage: stage, count: arr.length, leads: arr };
    });
  }

  function leadsBySource() {
    var s = load();
    var bySrc = {};
    s.leads.forEach(function (l) {
      bySrc[l.source] = (bySrc[l.source] || 0) + 1;
    });
    return Object.keys(bySrc).map(function (k) { return { source: k, count: bySrc[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function recentActivities(limit) {
    var s = load();
    return s.activities.slice()
      .sort(function (a, b) { return b.timestamp - a.timestamp; })
      .slice(0, limit || 10);
  }

  function activitySummary() {
    var s = load();
    var oneWeek = now() - 7 * DAY;
    var recent = s.activities.filter(function (a) { return a.timestamp >= oneWeek; });
    var typeCount = function (type) { return recent.filter(function (a) { return a.type === type; }).length; };
    return {
      total: recent.length,
      calls: typeCount('call'),
      emails: typeCount('email'),
      meetings: typeCount('meeting'),
      proposals: typeCount('proposal'),
      tasks: typeCount('task'),
      overdue: s.activities.filter(function (a) { return a.status === 'danger'; }).length
    };
  }

  /* ------------- Recently viewed ------------- */
  function markViewed(entity, id) {
    var s = load();
    s.recentlyViewed = (s.recentlyViewed || []).filter(function (r) { return !(r.entity === entity && r.id === id); });
    s.recentlyViewed.unshift({ entity: entity, id: id, at: now() });
    s.recentlyViewed = s.recentlyViewed.slice(0, 6);
    save();
    emit('recents:changed', s.recentlyViewed);
    return s.recentlyViewed;
  }

  function getRecentlyViewed(limit) {
    var s = load();
    var recents = (s.recentlyViewed || []).slice(0, limit || 6);
    // Resolve to records, drop dangling refs (deleted records)
    return recents
      .map(function (r) {
        var rec = (s[r.entity] || []).find(function (x) { return x.id === r.id; });
        if (!rec) return null;
        return { entity: r.entity, record: rec, at: r.at };
      })
      .filter(Boolean);
  }

  /* ------------- Global search (palette) ------------- */
  function globalSearch(query, limit) {
    query = (query || '').trim().toLowerCase();
    if (!query) return [];
    var s = load();
    limit = limit || 8;
    var hits = [];

    function tryEntity(entity, fields) {
      (s[entity] || []).forEach(function (r) {
        var text = fields.map(function (f) { return (r[f] || '').toString().toLowerCase(); }).join(' ');
        if (text.indexOf(query) !== -1) {
          hits.push({ entity: entity, record: r, score: text.indexOf(query) });
        }
      });
    }
    tryEntity('contacts', ['name', 'email', 'company', 'role']);
    tryEntity('leads',    ['name', 'company', 'source', 'interest']);
    tryEntity('deals',    ['name', 'company']);
    tryEntity('activities', ['subject', 'company', 'contactName', 'notes']);
    tryEntity('tasks',    ['title', 'priority', 'due']);

    hits.sort(function (a, b) { return a.score - b.score; });
    return hits.slice(0, limit);
  }

  /* ------------- Reset ------------- */
  function reset() {
    // Keep users, restore demo data otherwise
    var s = load();
    var preservedUsers = s.users.slice();
    state = buildSeed();
    // Merge preserved users (avoid duplicates by email)
    preservedUsers.forEach(function (u) {
      if (!state.users.find(function (x) { return x.email === u.email; })) {
        state.users.push(u);
      }
    });
    save();
    emit('store:reset', null);
    emit('contacts:changed', null);
    emit('leads:changed', null);
    emit('deals:changed', null);
    emit('activities:changed', null);
    emit('tasks:changed', null);
    emit('settings:updated', state.settings);
    return state;
  }

  function nuke() {
    state = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
    emit('store:nuked', null);
    emit('auth:change', null);
  }

  /* ------------- Init ------------- */
  load();
  // Apply theme as early as possible to avoid flash
  applyTheme();

  /* ------------- Public API ------------- */
  window.Store = {
    // Auth
    register: register,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    requireAuth: requireAuth,
    updateCurrentUser: updateCurrentUser,
    // CRUD
    list: list,
    get: get,
    create: create,
    update: update,
    remove: remove,
    // Settings
    getSettings: getSettings,
    saveSettings: saveSettings,
    setTheme: setTheme,
    getTheme: getTheme,
    applyTheme: applyTheme,
    // Computed
    kpis: kpis,
    pipelineByStage: pipelineByStage,
    leadsByStage: leadsByStage,
    leadsBySource: leadsBySource,
    recentActivities: recentActivities,
    activitySummary: activitySummary,
    // Recents & search
    markViewed: markViewed,
    getRecentlyViewed: getRecentlyViewed,
    globalSearch: globalSearch,
    // Reset
    reset: reset,
    nuke: nuke,
    // Events
    on: on,
    emit: emit
  };
})();
