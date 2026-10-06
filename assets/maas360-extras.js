/* MaaS360 extras for the Select T cockpit page.
   The Select T renderer draws everything its product format covers. This adds the MaaS360
   content that format has no field for (opener styles with sector versions, What Did They
   Say, When They Say No, meeting asks, emails, voicemails, cadence, prep, coaching) into the
   same sections, using the page's own components. Data: window.MAAS360 (data/maas360-product.js).
   Markup in data strings: {token} · **bold** · [[cue]] · ((branch)) · [Literal] · \n */
(function () {
  'use strict';
  var D = window.MAAS360;
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byId(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }

  // data markup -> HTML; {tokens} become data-f spans the Select T renderer fills
  function md(s) {
    if (s == null || s === '') return '';
    return esc(String(s))
      .replace(/\[\[([\s\S]*?)\]\]/g, '<span class="cue">$1</span>')
      .replace(/\(\(([\s\S]*?)\)\)/g, '<span class="branch">$1</span>')
      .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]\n]{1,48})\]/g, '<span class="ph">[$1]</span>')
      .replace(/\{(\w+)\}/g, '<span data-f="$1"></span>')
      .replace(/\n/g, '<br>')
      .replace(/<br>(?=<span class="branch">)/g, '');
  }
  function quote(s) { return /["“]/.test(s) ? md(s) : md('"' + s + '"'); }
  function say(s) { return '<p class="say copyable">' + quote(s) + '</p>'; }
  function noThen(t) { return String(t || '').replace(/^then →\s*/, ''); }
  function sub(text, hint, cls) { return '<div class="sub-title' + (cls ? ' ' + cls : '') + '">' + text + (hint ? ' <span class="hint">' + hint + '</span>' : '') + '</div>'; }
  function card(title, body, cls) { return '<div class="card' + (cls ? ' ' + cls : '') + '"><h4>' + title + '</h4>' + body + '</div>'; }
  function notes(list) { return list && list.length ? '<ul class="ticks mx-notes">' + list.map(function (n) { return '<li class="copyable">' + md(n) + '</li>'; }).join('') + '</ul>' : ''; }
  function objCard(head, rows, goes, cls) {
    return '<div class="obj' + (cls ? ' ' + cls : '') + '" data-obj><button class="obj-head" type="button"><span class="q">' + head + '</span><span class="chev">▾</span></button>' +
      '<div class="obj-body">' + rows.join('') + (goes ? '<span class="goes">' + goes + '</span>' : '') + '</div></div>';
  }
  function row(label, html) { return '<div class="ob-row"><span class="ob-l">' + label + '</span>' + html + '</div>'; }
  function insertAfter(el, html) { if (el) el.insertAdjacentHTML('afterend', html); }
  function insertBefore(el, html) { if (el) el.insertAdjacentHTML('beforebegin', html); }

  var sel = { industry: null, persona: 0 };
  function sector() { return byId(D.industries, sel.industry) || byId(D.industries, 'general'); }
  function persona() { return D.personas[sel.persona] || D.personas[0]; }
  var openers = D.openers.filter(function (o) { return o.visible; });

  // ---------- Goal ----------
  (function () {
    var bar = $('#s-goal .outcome-bar');
    var tone = { book: 'book', callback: 'demo', referral: 'referral', follow: 'follow', closed: 'info' };
    if (bar) bar.innerHTML = D.outcomes.map(function (o) { return '<div class="outcome ' + (tone[o.id] || 'info') + '">' + esc(o.icon) + ' ' + esc(o.label) + '</div>'; }).join('');
    insertAfter(bar, '<div class="callout"><p class="callout-foot">' + md(D.goal.line) + '</p></div>' +
      '<div class="two-col">' + D.goal.tips.map(function (t) { return card(esc(t.title), '<p class="note">' + md(t.text) + '</p>'); }).join('') + '</div>');
  })();

  // ---------- Prep ----------
  (function () {
    var p = D.prep;
    insertBefore($('#s-prep .ai'),
      sub('MaaS360 research &amp; gatekeeper') +
      '<div class="two-col">' +
        card('Research before you dial', '<ul class="plain">' + p.research.map(function (r) { return '<li><b>' + esc(r.label) + '</b><span>' + md(r.text) + '</span></li>'; }).join('') + '</ul>') +
        card('MaaS360 gatekeeper script', say(p.gatekeeper.line) + '<p class="note">' + md(p.gatekeeper.note) + '</p>') +
      '</div>');
  })();

  // ---------- Engage: MaaS360 opener styles as extra tabs ----------
  window.MAAS360_DEFAULT_OPENER = 'm-' + openers[0].id;
  function openerPanel(op) {
    var ss = op.sectorSet ? (sector().scripts || {})[op.sectorSet] : null;
    var lines = [ss ? ss.spoken : op.spoken].concat(op.beats.map(function (b) { var k = { disc: 'spDisc', curi: 'spCuri', ask: 'spAsk' }[b.key]; return ss ? ss[k] : b.spoken; }));
    var labels = ['Open'].concat(op.beats.map(function (b) { return b.label; }));
    var shortL = [{ r: op.role, l: ss ? ss.line : op.line }].concat(op.beats.map(function (b) { return { r: b.role, l: ss ? ss[b.key] : b.line }; }));
    return (op.sectorSet ? '<div class="mx-sector"><b>' + esc(sector().label) + ' version</b> · change it with the Industry pills above. ' + md(ss.stat) + '</div>' : '') +
      lines.map(function (l, i) {
        return '<div class="beat"><span class="beat-n">' + 'abcd'[i] + '</span><div class="mx-beat"><div class="mx-lbl">' + md(labels[i]) + '</div><p class="say copyable">' + md(l) + '</p></div></div>';
      }).join('') +
      '<details class="mx-short"><summary>Short version</summary><ol>' + shortL.map(function (s) { return '<li class="copyable"><b>' + md(s.r) + '</b> ' + md(s.l) + '</li>'; }).join('') + '</ol></details>' +
      '<div class="script-foot">' + esc(op.tag) + ' · ' + esc(op.cue) + '</div>';
  }
  (function () {
    var tabs = $('#s-engage .tabs');
    if (!tabs) return;
    tabs.insertAdjacentHTML('afterbegin', openers.map(function (o) { return '<button class="tab" type="button" data-opener="m-' + o.id + '">' + esc(o.tag) + '</button>'; }).join(''));
    var lastPanel = $$('#s-engage [data-opener-panel]').pop();
    insertAfter(lastPanel, openers.map(function (o) { return '<div class="script" data-opener-panel="m-' + o.id + '" data-mx-opener="' + o.id + '" hidden>' + openerPanel(o) + '</div>'; }).join(''));
    insertBefore(tabs, '<p class="lead full-guide">' + md(D.openerGuide.intro) + '</p>');
    // opener library (full guide)
    var lib = openers.filter(function (o) { return o.card; }).map(function (o) { return card(esc(o.card.title) + ' <span class="hint">proof stack</span>', '<p class="say copyable">' + md(o.card.text) + '</p><p class="note">' + md(o.card.note) + '</p>'); })
      .concat([card('Default opener', '<p class="say copyable">' + md(D.openingScripts.defaultScript.line) + '</p><p class="note">' + md(D.openingScripts.defaultScript.note) + '</p>')])
      .concat(D.openingScripts.tabs.map(function (t) { return card('Opening script · ' + esc(t.label) + (t.tags ? ' <span class="hint">' + esc(t.tags.join(' · ')) + '</span>' : ''), say(t.line) + notes(t.notes), 'mx-open-' + t.id); }))
      .concat(D.starters.map(function (t) { return card('Conversation starter · ' + esc(t.label), say(t.line) + notes(t.notes)); }))
      .concat(D.interrupts.map(function (t) { return card('Pattern interrupt · ' + esc(t.label), say(t.line) + notes(t.notes)); }));
    insertAfter($('#s-engage .tip'),
      '<div class="chips static">' + D.engageTips.map(function (t) { return '<span class="chip-static">' + md(t) + '</span>'; }).join('') + '</div>' +
      sub('MaaS360 opener library', 'proof stack, opening scripts by persona, starters, pattern interrupts', 'full-guide') +
      '<div class="cheat full-guide" id="mxLibrary">' + lib.join('') + '</div>' +
      sub('Value snapshot', md(D.valueHint), 'full-guide') +
      '<div class="two-col full-guide">' + D.valueVariants.map(function (v) { return card(esc(v.label), '<p class="copyable">' + md(v.line) + '</p>'); }).join('') + '</div>');
  })();

  // ---------- Discover ----------
  (function () {
    var d = D.discover;
    insertAfter($('#s-discover .q-list'),
      '<div class="move-steps mx-formula">' + d.formula.map(function (f) { return '<div class="ms"><div class="ms-n">' + esc(f.step) + ' · ' + esc(f.title) + '</div><p>' + md(f.line) + '</p></div>'; }).join('') + '</div>' +
      sub('What did they say?', 'tap a card') +
      '<div class="obj-grid">' + d.responses.map(function (r) {
        return objCard(esc(r.label), [row('Say', say(r.line))].concat(r.then ? [row('Then', say(r.then))] : []), 'Listen for: ' + esc(r.goes), 'mx-resp');
      }).join('') + '</div>');
  })();

  // ---------- Explore: When They Say No in place of the general objections ----------
  (function () {
    var n = D.noPlaybook;
    var head = $('#s-explore [data-sub="objGrid"]');
    if (head) head.innerHTML = esc(n.title) + ' <span class="hint">' + md(n.hint) + '</span>';
    var grid = $('#objGrid');
    if (grid) {
      grid.innerHTML = n.types.map(function (t) {
        return objCard(t.n + ' · ' + md(t.q) + ' <span class="tgt">' + esc(t.kind) + '</span>',
          [row('Say', say(t.line)), row('Verbatim', '<p class="say copyable">' + md(t.spoken) + '</p>'), row('Then', '<p class="resp">→ ' + md(t.then) + '</p>')], '');
      }).join('');
      insertBefore(grid, '<p class="lead">' + md(n.intro) + '</p>');
      insertAfter(grid, '<div class="chips static">' + n.tips.map(function (t) { return '<span class="chip-static">' + md(t) + '</span>'; }).join('') + '</div>');
    }
    var prodHead = $('#s-explore [data-sub="prodObjGrid"]');
    insertAfter(prodHead, '<p class="note mx-consult-note">Cards tagged <b>Consult offer</b> come up when you offer the free review. ' + md(D.explore.consultIntro) + '</p>');
  })();

  // ---------- Secure: MaaS360 asks by signal tier ----------
  (function () {
    var s = D.secure;
    function tierCard(t) {
      var lines = t.asks.map(function (id) { var a = byId(s.asks, id); return a ? '<div class="mx-ask"><span class="mx-lbl">Ask · ' + esc(a.label) + '</span>' + say(a.line) + '</div>' : ''; })
        .concat(t.closes.map(function (id) { var c = byId(s.closes, id); return c ? '<div class="mx-ask full-guide"><span class="mx-lbl">Close · ' + esc(c.label) + '</span>' + say(c.line) + notes(c.notes) + '</div>' : ''; }));
      if (t.consultOffer) lines.push('<div class="mx-ask mx-offer"><span class="mx-lbl">' + esc(s.consultOffer.label) + '</span>' + say(s.consultOffer.line) + say(s.consultOffer.then) + '</div>');
      if (t.noType) { var nt = byId(D.noPlaybook.types, t.noType); lines.push('<div class="mx-ask"><span class="mx-lbl">If they say no to the meeting</span>' + say(nt.line) + '<p class="resp">→ ' + md(nt.then) + '</p></div>'); }
      return '<div class="ask ' + t.id + '"><div class="ask-h">' + esc(t.head) + ' · <b>' + esc(t.verb) + '</b></div>' + lines.join('') + '</div>';
    }
    insertAfter($('#s-secure .ask-grid'),
      sub('MaaS360 asks &amp; closes', '10-15 minutes, by how many signals you got') +
      '<div class="ask-grid">' + s.tiers.map(tierCard).join('') + '</div>' +
      '<div class="two-col">' +
        card(md(s.lockIt.title), '<p class="say copyable">' + md(s.lockIt.script) + '</p><p class="note">' + md(s.lockIt.note) + '</p><h4 class="mt">' + esc(s.lockIt.checklistTitle) + '</h4><ul class="ticks">' + s.lockIt.checklist.map(function (c) { return '<li>' + md(c) + '</li>'; }).join('') + '</ul>') +
        card('Green flags and red flags', '<ul class="ticks">' + s.flags.green.map(function (f) { return '<li><b>Green:</b> ' + md(f) + '</li>'; }).join('') + s.flags.red.map(function (f) { return '<li><b>Red:</b> ' + md(f) + '</li>'; }).join('') + '</ul>') +
      '</div>' +
      sub('Follow-up email', 'matches the Industry pill above', 'full-guide') +
      '<div class="two-col full-guide"><div class="card" id="mxEmail"></div>' +
        card(esc(s.consultEmail.title) + ' · consult offer', '<div class="mx-email copyable">' + md(s.consultEmail.text) + '</div><p class="note">' + md(s.consultEmail.note) + '</p>') + '</div>');
  })();

  // ---------- Voicemail ----------
  (function () {
    var v = D.voicemail;
    insertAfter($('#s-voicemail .value-box.vm'),
      v.scripts.map(function (x) { return '<div class="value-box vm"><div class="value-label">MaaS360 · ' + esc(x.label) + (x.badge ? ' · ' + esc(x.badge) : '') + '</div><p class="value-line copyable">' + quote(x.line) + '</p><span class="hint">' + md(x.note) + '</span></div>'; }).join('') +
      '<div class="chips static">' + v.cadence.map(function (c) { return '<span class="chip-static"><b>' + esc(c.label) + ':</b> ' + md(c.text) + '</span>'; }).join('') + '</div>');
  })();

  // ---------- Cheat sheet ----------
  (function () {
    var c = D.coaching, grid = $('#s-cheat .cheat');
    if (!grid) return;
    insertAfter($('#cheatProof'), '<p class="note">' + md(D.proofNote) + '</p>');
    grid.insertAdjacentHTML('beforeend',
      card(md(D.sectorRefLabel), '<ul class="plain">' + D.industries.map(function (s) { return '<li><b>' + esc(s.hookLabel) + '</b><span>' + md(s.hook) + ' · ' + md(s.nums) + '</span></li>'; }).join('') + '</ul>') +
      card('Delivery', '<ul class="ticks">' + c.doRules.map(function (r) { return '<li>' + md(r) + '</li>'; }).join('') + c.dontRules.map(function (r) { return '<li>' + md(r) + '</li>'; }).join('') + '</ul><div class="tags mt">' + c.mindset.map(function (m) { return '<span class="tag">' + md(m) + '</span>'; }).join('') + '</div>') +
      card('Tonality', '<ul class="plain">' + c.tonality.map(function (t) { return '<li><b>' + esc(t.label) + '</b><span>' + md(t.text) + '</span></li>'; }).join('') + '</ul>') +
      card('Call methods', '<ul class="plain">' + c.methods.map(function (m) { return '<li><b>' + esc(m.title) + ' · best for ' + md(m.bestFor) + '</b><span>' + md(m.text) + ' ' + quote(m.example) + '</span></li>'; }).join('') + '</ul>'));
  })();

  // ---------- refresh on Industry / persona change ----------
  function refresh(st) {
    sel.industry = st.industry || null;
    sel.persona = st.persona || 0;
    $$('[data-mx-opener]').forEach(function (pn) {
      var op = byId(openers, pn.getAttribute('data-mx-opener'));
      if (op && op.sectorSet) pn.innerHTML = openerPanel(op);
    });
    var em = $('#mxEmail');
    if (em) em.innerHTML = '<h4>' + esc(sector().label) + ' follow-up email</h4><div class="mx-email copyable">' + md(sector().email) + '</div><p class="note">' + md(D.secure.emailNote) + '</p>';
    // highlight the opening script for this persona
    var per = persona();
    $$('#mxLibrary .card').forEach(function (c) { c.classList.toggle('mx-match', !!per.id && c.classList.contains('mx-open-' + (D.personas.filter(function (p) { return p.id === per.id; })[0] || {}).openingTab)); });
    // the template numbers persona as step 3 when a product has industries; MaaS360 has no use-case step
    var ps = $('#personaStep'); if (ps && $('#ucRow') && $('#ucRow').hidden) ps.textContent = '2';
  }

  window.MAAS360_EXT = {
    quote: quote,
    thenRow: function (o) { return row('Then', '<p class="resp">→ ' + md(noThen(o.then)) + (o.contSource ? ' <span class="hint">continue line from: ' + esc(o.contSource) + '</span>' : '') + '</p>'); },
    altRows: function (o) {
      return row('Other ways to say it', '<div>' + o.alts.map(function (a) {
        return '<p class="note"><b>' + esc(a.source) + '</b></p><p class="say copyable mx-alt">' + md(a.line) + '</p>' + (a.then ? '<p class="resp">→ ' + md(noThen(a.then)) + '</p>' : '');
      }).join('') + '</div>');
    },
    refresh: refresh
  };
})();
