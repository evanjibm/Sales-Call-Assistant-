/* MaaS360 Cold Call Cockpit renderer.
   Everything on the page comes from data/coldcall-maas360.json (field notes in data/README.md).
   Markup inside data strings: {token} · **bold** · [[cue]] · ((branch)) · [Literal] · \n */
(function () {
  'use strict';

  var DATA_URL = 'data/coldcall-maas360.json';
  var STORE = 'mcc-';
  var D = null;
  var state = {
    sector: load('sector', 'general'),
    persona: load('persona', 'it'),
    opener: load('opener', null),
    trigger: load('trigger', null),
    inputs: load('inputs', {}),
    tabs: {}
  };

  // ---------- small utils ----------
  function load(k, d) { try { var v = localStorage.getItem(STORE + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) {} }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ph(label) { return '<span class="ph">[' + esc(label) + ']</span>'; }
  function val(v, label) { return v ? '<b class="fill">' + esc(v) + '</b>' : ph(label); }
  function byId(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }

  // data-file markup -> HTML
  function md(s) {
    if (s == null || s === '') return '';
    var h = esc(String(s));
    h = h.replace(/\[\[([\s\S]*?)\]\]/g, '<span class="cue">$1</span>')
      .replace(/\(\(([\s\S]*?)\)\)/g, '<span class="branch">$1</span>')
      .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
      .replace(/\{(\w+)\}/g, '<span data-f="$1"></span>')
      .replace(/\[([^\]\n]{1,48})\]/g, '<span class="ph">[$1]</span>')
      .replace(/\n/g, '<br>')
      .replace(/<br>(?=<span class="branch">)/g, '');
    return h;
  }
  // spoken line: add quotes unless the line already carries its own
  function q(s) { return /["“]/.test(s) ? md(s) : md('"' + s + '"'); }
  function say(s, cls) { return '<p class="say copyable' + (cls ? ' ' + cls : '') + '">' + q(s) + '</p>'; }

  // ---------- review badges ----------
  function isDraft(obj, field) {
    if (!obj) return false;
    if (obj.status) return true;
    return !!(obj.draft && field && obj.draft.some(function (f) { return f === field || f.indexOf(field + '.') === 0 || f.indexOf(field + ' ') === 0; }));
  }
  function dB(obj, field) { return isDraft(obj, field) ? '<span class="dbadge" title="DRAFT: review">DRAFT</span>' : ''; }
  function rootDraft(field) { return D.draft && D.draft.indexOf(field) > -1 ? '<span class="dbadge" title="DRAFT: review">DRAFT</span>' : ''; }
  function proofTodo(refs) {
    var bad = (refs || []).map(function (id) { return byId(D.proof, id); }).filter(function (p) { return p && p.todo; });
    if (!bad.length) return '';
    return '<span class="tbadge" title="' + esc(bad[0].todo) + '">TODO: verify ' + esc(bad.map(function (p) { return p.stat.replace(/\*\*/g, ''); }).join(', ')) + '</span>';
  }
  function todoB(obj) { return obj && obj.todo ? '<span class="tbadge" title="' + esc(obj.todo) + '">TODO: verify</span>' : ''; }

  // ---------- current selections ----------
  function sector() { return byId(D.industries, state.sector) || byId(D.industries, 'general') || D.industries[0]; }
  function persona() { return byId(D.personas, state.persona) || D.personas[0]; }
  function opener() { return byId(visibleOpeners(), state.opener) || visibleOpeners()[0]; }
  function visibleOpeners() { return D.openers.filter(function (o) { return o.visible; }); }
  function consultActive() { return !!opener().consultOffer; }
  function forOpener(item) { return !item.openers || !item.openers.length || item.openers.indexOf(opener().id) > -1; }

  // ---------- token context ----------
  function context() {
    var i = state.inputs, per = persona(), sec = sector();
    return {
      you: val(i.you, 'Your Name'), city: val(i.city, 'Your City'), phone: val(i.phone, 'Your Number'),
      name: val(i.name, 'Name'), company: val(i.company, 'Company'),
      type: i.type ? val(i.type) : (sec.type ? '<b class="fill">' + esc(sec.type) + '</b>' : ph('type of company')),
      peerco: val(i.peerco, 'peer company'),
      trigger: state.trigger ? '<b class="fill">' + esc(state.trigger) + '</b>' : ph('reason to call'),
      product: esc(D.product.name), full: esc(D.product.full),
      topic: esc(D.topic), owns: esc(D.owns), ownerTeam: esc(D.ownerTeam),
      focusA: esc(D.focus[0]), focusB: esc(D.focus[1]), costs: esc(D.costs),
      incumbent: esc(D.incumbents[0] || 'your current tool'), incumbentList: esc(D.incumbents.join(', ')),
      role: esc(per.role), plural: esc(per.plural), hypothesis: esc(per.hypothesis), peer: esc(per.peer),
      value: esc(D.value)
    };
  }
  function fill() {
    var c = context();
    $$('[data-f]').forEach(function (el) { var k = el.getAttribute('data-f'); el.innerHTML = k in c ? c[k] : ph(k); });
  }

  // ---------- building blocks ----------
  function secTitle(text, badge, move) {
    return '<div class="sec-title">' + (move ? '<span class="move">' + move + '</span> ' : '') + text + (badge ? ' <span class="badge">' + badge + '</span>' : '') + '</div>';
  }
  function objective(key) {
    var o = D.objectives && D.objectives[key];
    return o ? '<p class="objective full-guide">Objective: ' + md(o) + dB(D.objectives) + '</p>' : '';
  }
  function aiBox(ai) {
    if (!ai) return '';
    return '<div class="ai full-guide"><div class="ai-h">AI Assist' + dB(ai) + '</div><p>' + md(ai.text) + '</p>' +
      '<div class="prompt"><span class="prompt-text">' + md(ai.prompt) + '</span><button class="copy" type="button">Copy</button></div></div>';
  }
  function tabset(key, items, render, activeId) {
    var active = activeId || state.tabs[key] || (items[0] && items[0].id);
    if (!byId(items, active)) active = items[0].id;
    return '<div class="tabset" data-tabset="' + key + '"><div class="tabs" role="tablist">' +
      items.map(function (t) { return '<button class="tab sm' + (t.id === active ? ' active' : '') + '" type="button" data-tab="' + esc(t.id) + '">' + esc(t.label) + '</button>'; }).join('') +
      '</div>' + items.map(function (t) { return '<div class="tab-panel" data-panel="' + esc(t.id) + '"' + (t.id === active ? '' : ' hidden') + '>' + render(t) + '</div>'; }).join('') + '</div>';
  }
  function scriptTab(t) {
    return (t.tags ? '<div class="micro-tags">' + t.tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div>' : '') +
      say(t.line) + (t.notes ? '<ul class="notes">' + t.notes.map(function (n) { return '<li class="copyable">' + md(n) + '</li>'; }).join('') + '</ul>' : '') +
      (t.tier ? '<span class="src-note">Secure tier: ' + t.tier + ' of 3 signals' + dB(t, 'tier') + '</span>' : '');
  }

  // ---------- header + setup ----------
  function renderHeader() {
    document.title = D.product.name + ' ' + D.product.title;
    $('#eyebrow').innerHTML = '<span class="tier-badge focus">' + esc(D.product.name) + '</span>' + esc(D.product.eyebrow);
    $('#versionTag').textContent = 'Version ' + D.meta.version + ' · ' + D.product.name;
    $('#title').innerHTML = esc(D.product.name) + ' <span class="h1-tail">' + esc(D.product.title) + '</span>';
    $('#headSub').innerHTML = md(D.goal.line);
    $('#liveHint').innerHTML = md(D.liveHint);
    var r = reviewItems();
    if (!D.meta.reviewed) {
      $('#draftFlag').hidden = false;
      $('#draftFlag').innerHTML = 'Not yet reviewed: <b>' + r.draft.length + '</b> DRAFT and <b>' + r.todo.length + '</b> TODO items are marked inline. <a href="#s-review">See the review list</a>.';
    }
  }
  function renderSetup() {
    $('#sectorPills').innerHTML = D.industries.map(function (s) {
      return '<button type="button" class="pill' + (s.id === sector().id ? ' active' : '') + '" data-sector="' + s.id + '" role="tab">' + esc(s.label) + '</button>';
    }).join('');
    $('#personaPills').innerHTML = D.personas.map(function (p) {
      return '<button type="button" class="pill' + (p.id === persona().id ? ' active' : '') + '" data-persona="' + p.id + '" role="tab">' + esc(p.role) + '</button>';
    }).join('');
  }

  // ---------- sections ----------
  function renderGoal() {
    $('#s-goal').innerHTML = secTitle('What a good cold call is for') +
      '<div class="callout"><p>' + md(D.goal.line) + '</p></div>' +
      '<div class="outcome-bar" aria-label="Call outcomes">' + D.outcomes.map(function (o) {
        return '<div class="outcome ' + esc(o.id) + '"><span class="ico">' + esc(o.icon) + '</span>' + esc(o.label) + '</div>';
      }).join('') + '</div>' +
      '<div class="two-col">' + D.goal.tips.map(function (t) { return '<div class="card"><h4>' + esc(t.title) + '</h4><p class="note">' + md(t.text) + '</p></div>'; }).join('') + '</div>';
  }

  function renderPrep() {
    var p = D.prep;
    var chips = D.triggers.map(function (t) {
      return '<button type="button" class="chip' + (t === state.trigger ? ' active' : '') + '" data-trigger="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('') + '<span class="custom-row"><span class="custom-lead">I noticed [Company]…</span><input type="text" id="customTrigger" placeholder="type your own reason, e.g. is opening three new clinics" value="' + esc(D.triggers.indexOf(state.trigger) < 0 && state.trigger ? state.trigger : '') + '"></span>';
    $('#s-prep').innerHTML = secTitle('Before You Dial: Prep', 'one real reason to call') + objective('prep') +
      '<div class="sub-title">Pick your reason to call' + rootDraft('triggers') + ' <span class="hint">finishes "I noticed [Company] …" in the automated-agent script</span></div>' +
      '<div class="chips" id="triggerChips">' + chips + '</div>' +
      '<div class="two-col">' +
        '<div class="card"><h4>Research</h4><ul class="plain">' + p.research.map(function (r) { return '<li><b>' + esc(r.label) + '</b><span>' + md(r.text) + '</span></li>'; }).join('') + '</ul></div>' +
        '<div class="card"><h4>If a gatekeeper answers</h4>' + say(p.gatekeeper.line) + '<p class="note">' + md(p.gatekeeper.note) + '</p>' +
          '<h4 class="mt">If an automated agent answers' + dB(p.automatedAgent) + '</h4>' + say(p.automatedAgent.line) + '<p class="note">' + md(p.automatedAgent.note) + '</p></div>' +
      '</div>' + aiBox(p.ai);
  }

  function sectorScriptFor(op) {
    if (!op.sectorSet) return null;
    var s = sector();
    return s.scripts && s.scripts[op.sectorSet] ? s.scripts[op.sectorSet] : null;
  }

  function renderEngage() {
    var op = opener(), ss = sectorScriptFor(op), per = persona(), sec = sector();
    var variant = (D.valueVariants || []).filter(function (v) { return v.label === per.valueVariant; })[0];
    var spoken = ss ? ss.spoken : op.spoken;
    var beatsSpoken = op.beats.map(function (b) { var k = { disc: 'spDisc', curi: 'spCuri', ask: 'spAsk' }[b.key]; return ss ? ss[k] : b.spoken; });
    var shortLines = [{ r: op.role, l: ss ? ss.line : op.line }].concat(op.beats.map(function (b) { return { r: b.role, l: ss ? ss[b.key] : b.line }; }));
    // proof quoted by the script actually on screen (the sector version replaces the generic one)
    var refs = (ss ? ss.proofRefs : op.proofRefs) || [];

    var html = secTitle('Engage: earn the next 30 seconds', 'say this', '1') + objective('engage') +
      '<div class="value-box"><div class="value-label">What we do · only if they ask</div>' +
        '<p class="value-line copyable">' + q(D.value) + '</p>' +
        (variant ? '<p class="note"><b>For ' + esc(per.role) + ' (' + esc(variant.label) + '):</b> ' + md(variant.line) + '</p>' : '') +
        '<span class="hint">' + md(D.valueHint) + '</span></div>' +
      tailoredPanel(op, sec, per) +
      '<div class="callout full-guide"><p>' + md(D.openerGuide.intro) + '</p><p class="hint">' + md(D.openerGuide.hint) + '</p></div>' +
      '<div class="tabs" role="tablist" aria-label="Opener style">' + visibleOpeners().map(function (o) {
        return '<button class="tab' + (o.id === op.id ? ' active' : '') + '" type="button" data-opener="' + o.id + '">' + esc(o.tag) + '</button>';
      }).join('') + '</div>' +
      '<div class="script">' +
        '<div class="opener-head"><span class="opener-role">' + esc(op.role) + '</span><span class="cue">' + esc(op.cue) + '</span>' + proofTodo(refs) + '</div>';

    if (op.sectorSet) {
      html += '<div class="sector-strip" style="margin:12px 20px">' +
        '<div class="sl">' + esc(D.sectorStripLabel) + '</div>' +
        '<div class="pills">' + D.industries.map(function (s) { return '<button type="button" class="pill sm' + (s.id === sec.id ? ' active' : '') + '" data-sector="' + s.id + '">' + esc(s.label) + '</button>'; }).join('') + '</div>' +
        '<div class="fits">' + md(sec.fits.text) + todoB(sec.fits) + '</div>' +
        (ss ? '<div class="stat">' + md(ss.stat) + '</div>' : '') + '</div>';
    }
    html += '<div class="beat"><span class="beat-n">1</span><div class="beat-body"><div class="beat-label">Open</div><p class="say copyable">' + md(spoken) + '</p></div></div>';
    op.beats.forEach(function (b, i) {
      html += '<div class="beat"><span class="beat-n">' + (i + 2) + '</span><div class="beat-body"><div class="beat-label">' + md(b.label) + '</div><p class="say copyable">' + md(beatsSpoken[i]) + '</p></div></div>';
    });
    html += '<details class="short-version"><summary>Short version (flow card)</summary><ol>' +
      shortLines.map(function (s) { return '<li class="copyable"><b class="r">' + md(s.r) + '</b>' + md(s.l) + '</li>'; }).join('') + '</ol></details>' +
      '<div class="script-foot">verbatim · ' + esc(op.tag) + (ss ? ' · ' + esc(ss.tag) : '') + '</div></div>';

    if (op.card) {
      html += '<div class="card stack-card full-guide"><h4>' + esc(op.card.title) + ' <span class="hint">from the Proof Stack</span>' + proofTodo(op.card.proofRefs) + '</h4>' +
        '<p class="say copyable">' + md(op.card.text) + '</p><p class="note">' + md(op.card.note) + '</p></div>';
    }
    html += '<div class="tip-row">' + D.engageTips.map(function (t) { return '<span class="tip-chip">' + md(t) + '</span>'; }).join('') + '</div>' +
      '<a class="jump-no" href="#s-no">' + md(D.noJump) + '<span>→</span></a>';

    html += '<div class="sub-title full-guide">Conversation starters <span class="hint">when the opener feels stiff</span></div>' +
      '<div class="full-guide">' + tabset('starters', D.starters, scriptTab) + '</div>' +
      '<div class="sub-title full-guide">Pattern interrupts <span class="hint">when the call feels guarded</span></div>' +
      '<div class="full-guide">' + tabset('interrupts', D.interrupts, scriptTab) + '</div>' +
      '<div class="sub-title full-guide">Opening script by persona <span class="hint">synced to step 2</span></div>' +
      '<div class="full-guide"><div class="card"><h4>Default opener</h4><p class="say copyable">' + md(D.openingScripts.defaultScript.line) + '</p><p class="note">' + md(D.openingScripts.defaultScript.note) + '</p></div>' +
        tabset('opening', D.openingScripts.tabs, scriptTab, per.openingTab) + '</div>' +
      '<div class="sub-title full-guide">Value snapshot <span class="hint">give one line, then go back to the ask</span></div>' +
      '<div class="two-col full-guide">' + D.valueVariants.map(function (v) { return '<div class="card"><h4>' + esc(v.label) + '</h4><p class="copyable">' + md(v.line) + '</p></div>'; }).join('') + '</div>';
    $('#s-engage').innerHTML = html;
    $('#railOpener').textContent = op.tag;
  }

  // what the sector + persona pills change, shown right under the value line for every opener
  function tailoredPanel(op, sec, per) {
    var tab = per.openingTab ? byId(D.openingScripts.tabs, per.openingTab) : null;
    var proofSet = byId(D.openers, 'proofdefault');
    return '<div class="tailored" data-tailored>' +
      '<div class="tailored-h">Tailored for this call · <b>' + esc(sec.label) + '</b> · <b>' + esc(per.role) + '</b></div>' +
      '<div class="tailored-grid">' +
        '<div><div class="lbl">' + esc(sec.hookLabel) + ' · researched angle</div><p class="say copyable">' + md(sec.hook) + '</p>' +
          '<span class="nums">' + md(sec.nums) + '</span>' + proofTodo(sec.proofRefs) + '</div>' +
        '<div><div class="lbl">' + esc(per.role) + ' · ' + (tab ? 'opening line' : 'pain to test') + '</div>' +
          (tab ? say(tab.line) + (tab.notes ? '<p class="note">' + md(tab.notes[0]) + '</p>' : '')
               : '<p class="say">' + md(per.hypothesis) + '</p>') + '</div>' +
      '</div>' +
      (op.sectorSet ? '' : '<p class="note">The <b>' + esc(op.tag) + '</b> opener reads the same in every sector. <button type="button" class="link-btn" data-opener="' + proofSet.id + '">Switch to ' + esc(proofSet.tag) + '</button> for the sector version of the script.</p>') +
    '</div>';
  }

  function renderDiscover() {
    var d = D.discover, per = persona();
    var html = secTitle('Discover: three questions', 'ask, react, dig once', '2') + objective('discover') +
      '<p class="lead full-guide">' + md(d.lead) + dB(d, 'lead') + '</p>' +
      '<div class="persona-hyp">Pain to test for <b>' + esc(per.role) + '</b>: ' + md(per.hypothesis) + dB(per, 'hypothesis') + '</div>' +
      '<div class="q-list">' + d.questions.map(function (x) {
        return '<div class="q"><div class="q-head"><span class="q-n">' + x.n + '</span><div><div class="q-t">' + esc(x.title) + '</div><div class="q-m">' + esc(x.meddpicc) + '</div></div></div>' +
          say(x.line) + '<span class="q-src full-guide">from: ' + esc(x.source) + '</span>' +
          '<p class="why full-guide">' + md(x.why) + dB(x, 'why') + '</p>' +
          '<div class="read"><div class="strong"><b>Strong:</b> ' + md(x.strong) + dB(x, 'strong') + '</div><div class="weak"><b>Weak:</b> ' + md(x.weak) + dB(x, 'weak') + '</div></div></div>';
      }).join('') + '</div>' +
      '<div class="formula">' + d.formula.map(function (f) { return '<div><div class="fs">' + esc(f.step) + '</div><h5>' + esc(f.title) + '</h5>' + md(f.line) + '</div>'; }).join('') + '</div>' +
      '<div class="sub-title">' + esc(d.responsesTitle) + ' <span class="hint">tap a card</span></div>' +
      '<div class="obj-grid">' + d.responses.map(function (r) {
        return '<div class="obj resp-card" data-obj><button class="obj-head" type="button"><span class="q">' + esc(r.label) + '</span><span class="chev">▾</span></button>' +
          '<div class="obj-body"><div class="ob-row"><span class="ob-l">Say</span>' + say(r.line) + '</div>' +
          (r.then ? '<div class="ob-row"><span class="ob-l">Then</span>' + say(r.then) + '</div>' : '') +
          '<span class="goes">Signals: ' + esc(r.goes) + '</span>' + dB(r, 'goes') + '</div></div>';
      }).join('') + '</div>';
    var m = d.meddpicc;
    function col(cls, head, items) { return '<div class="mcol ' + cls + '"><div class="mcol-h">' + head + '</div>' + items.map(function (i) { return '<div class="mitem"><b>' + esc(i.k) + '</b>' + md(i.t) + '</div>'; }).join('') + '</div>'; }
    html += '<div class="sub-title full-guide">How much MEDDPICC belongs on a cold call' + dB(m) + '</div>' +
      '<div class="meddpicc full-guide">' + col('ask', 'Ask · spend a question on it', m.ask) + col('cap', 'Capture · when they offer it', m.capture) + col('later', 'Later · the 15-minute meeting and beyond', m.later) + '</div>' +
      '<div class="sub-title full-guide">Don\'t ask on a cold call' + dB(d.dontAsk) + '</div>' +
      '<div class="table-wrap full-guide"><table class="tbl"><thead><tr><th>Don\'t</th><th>Why it costs you the call</th><th>Do this instead</th></tr></thead><tbody>' +
      d.dontAsk.rows.map(function (r) { return '<tr><td>' + md(r.dont) + '</td><td>' + md(r.why) + '</td><td class="copyable">' + md(r.instead) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      aiBox(d.ai);
    $('#s-discover').innerHTML = html;
  }

  function objectionCard(o, targeted) {
    var alts = (o.alts || []).slice().sort(function (a, b) { return (forConsult(b) ? 1 : 0) - (forConsult(a) ? 1 : 0); });
    function forConsult(a) { return a.openers && consultActive() && a.openers.indexOf(opener().id) > -1; }
    var body = '';
    if (o.exit) {
      body = '<div class="ob-row"><span class="ob-l">Say</span>' + say(o.ack) + '</div>';
    } else {
      body = '<div class="ob-row"><span class="ob-l">Acknowledge</span>' + say(o.ack) + '</div>' +
        '<div class="ob-row"><span class="ob-l">Explore</span>' + say(o.explore) + '</div>' +
        (o.cont ? '<div class="ob-row"><span class="ob-l">Continue</span><div>' + say(o.cont) + (o.contSource ? '<span class="src-note">from: ' + esc(o.contSource) + '</span>' : '') + '</div></div>' : '') +
        (o.press ? '<div class="ob-row press"><span class="ob-l">Only if they press</span><p class="resp copyable">' + md(o.press) + '</p></div>' : '');
    }
    if (o.then) body += '<span class="then">→ ' + md(o.then.replace(/^then →\s*/, '')) + '</span>';
    if (alts.length) {
      body += '<div class="ob-row"><span class="ob-l">Other ways to say it</span><div class="alt-lines">' + alts.map(function (a) {
        return '<div class="alt"><span class="src-note">' + esc(a.source) + (forConsult(a) ? ' <span class="tgt">this opener</span>' : '') + '</span><p class="say copyable" style="font-size:15px">' + md(a.line) + '</p>' + (a.then ? '<span class="then">' + md(a.then) + '</span>' : '') + '</div>';
      }).join('') + '</div></div>';
    }
    var refs = o.proofRefs || [];
    body += '<span class="goes">Goes after: ' + esc(o.goes) + '</span>' + dB(o, 'goes') +
      (refs.length ? '<div class="links"><span class="links-h">Back it up</span>' + refs.map(function (id) { var p = byId(D.proof, id); return '<span class="tag">' + md(p.stat) + ' · ' + esc(p.src) + '</span>' + todoB(p); }).join('') + '</div>' : '');
    return '<div class="obj prod' + (o.exit ? ' exit' : '') + '" data-obj data-id="' + esc(o.id) + '"><button class="obj-head" type="button"><span class="q">"' + esc(o.q) + '"' + (targeted ? '<span class="tgt">for this opener</span>' : '') + '</span><span class="chev">▾</span></button><div class="obj-body">' + body + '</div></div>';
  }

  function renderExplore() {
    var e = D.explore, ca = consultActive();
    var general = D.objections.filter(function (o) { return !o.openers.length; });
    var consult = D.objections.filter(function (o) { return o.openers.length; });
    var html = secTitle('Explore: navigate objections', 'tap an objection', '3') + objective('explore') +
      '<div class="move-steps">' + e.steps.map(function (s) { return '<div class="ms"><div class="ms-n">' + esc(s.n) + '</div><p>' + md(s.t) + '</p></div>'; }).join('') + '</div>' +
      (isDraft(e, 'steps') ? '<p class="hint full-guide">Step descriptions' + dB(e, 'steps') + '</p>' : '');
    if (ca) {
      html += '<div class="sub-title">Consult offer objections <span class="hint">' + consult.filter(forOpener).length + ' for ' + esc(opener().tag) + '</span></div>' +
        '<div class="consult-banner">' + md(e.consultIntro) + '</div>' +
        '<div class="obj-grid">' + consult.filter(forOpener).map(function (o) { return objectionCard(o, true); }).join('') + '</div>' +
        '<div class="sub-title">Common MaaS360 objections <span class="hint">' + general.length + ' cards · from the MaaS360 cockpit</span></div>';
    } else {
      html += '<div class="sub-title">Common MaaS360 objections <span class="hint">' + general.length + ' cards · from the MaaS360 cockpit</span></div>';
    }
    html += '<div class="obj-grid">' + general.map(function (o) { return objectionCard(o, false); }).join('') + '</div>';
    if (!ca) {
      html += '<div class="sub-title full-guide">Consult offer objections <span class="hint">shown up top when a Consult opener is picked</span></div>' +
        '<div class="full-guide"><p class="note">' + md(e.consultIntro) + '</p><div class="obj-grid">' + consult.map(function (o) { return objectionCard(o, false); }).join('') + '</div></div>';
    }
    html += aiBox(e.ai);
    $('#s-explore').innerHTML = html;

    var n = D.noPlaybook;
    $('#s-no').innerHTML = secTitle(esc(n.title), 'tap a card') +
      '<div class="callout"><p>' + md(n.intro) + '</p><p class="hint">' + md(n.hint) + '</p></div>' +
      '<div class="obj-grid no-grid">' + n.types.map(function (t) {
        return '<div class="obj" data-obj><button class="obj-head" type="button"><span class="q">' + t.n + ' · ' + md(t.q) + '<span class="kind">(' + esc(t.kind) + ')</span></span><span class="chev">▾</span></button>' +
          '<div class="obj-body"><div class="ob-row"><span class="ob-l">Say</span>' + say(t.line) + '</div>' +
          '<div class="ob-row"><span class="ob-l">Verbatim</span><p class="say copyable">' + md(t.spoken) + '</p></div>' +
          '<span class="then">→ ' + md(t.then) + '</span></div></div>';
      }).join('') + '</div>' +
      '<div class="tip-row">' + n.tips.map(function (t) { return '<span class="tip-chip">' + md(t) + '</span>'; }).join('') + '</div>';
  }

  function renderSecure() {
    var s = D.secure, sec = sector();
    var askBy = function (id) { return byId(s.asks, id); };
    var closeBy = function (id) { return byId(s.closes, id); };
    var noBy = function (id) { return byId(D.noPlaybook.types, id); };
    var html = secTitle('Secure the next step', 'two of three, and you ask', '4') + objective('secure') +
      '<div class="signals">' + s.signals.map(function (g, i) {
        return '<div class="signal"><div class="sig-n">Signal 0' + (i + 1) + ' · ' + esc(g.title) + dB(s, 'signals') + '</div><p>' + md(g.t) + '</p>' +
          '<ul>' + g.flags.map(function (f) { return '<li>' + md(f) + '</li>'; }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      '<div class="data threshold"><div class="data-h">The threshold' + dB(s.threshold) + '</div><div class="data-big">' + esc(s.threshold.title) + '</div><p>' + md(s.threshold.t) + '</p></div>' +
      '<div class="ask-grid">' + s.tiers.map(function (t) {
        var h = '<div class="ask ' + t.id + '"><div class="ask-h">' + esc(t.head) + ' · <b>' + esc(t.verb) + '</b>' + dB(s, 'tiers') + '</div><div class="lines">';
        h += t.asks.map(function (id) { var a = askBy(id); return a ? '<div><span class="lbl">Ask · ' + esc(a.label) + '</span>' + say(a.line) + '</div>' : ''; }).join('');
        h += t.closes.map(function (id) { var c = closeBy(id); return c ? '<div class="full-guide"><span class="lbl">Close · ' + esc(c.label) + '</span>' + say(c.line) + '</div>' : ''; }).join('');
        h += '</div>';
        if (t.consultOffer) h += '<div class="offer"><span class="lbl">' + esc(s.consultOffer.label) + '</span>' + say(s.consultOffer.line) + say(s.consultOffer.then) + '<span class="src-note">from: ' + esc(s.consultOffer.source) + '</span></div>';
        if (t.noType) { var n = noBy(t.noType); h += '<div class="offer"><span class="lbl">If they say no to the meeting</span>' + say(n.line) + '<span class="then">→ ' + md(n.then) + '</span></div>'; }
        if (t.email) h += '<p class="note">Then send the <a href="#emailBox">' + esc(sec.label) + ' follow-up email</a>.</p>';
        return h + '</div>';
      }).join('') + '</div>' +
      '<div class="two-col">' +
        '<div class="card"><h4>' + md(s.lockIt.title) + '</h4><p class="say copyable">' + md(s.lockIt.script) + '</p><p class="note">' + md(s.lockIt.note) + '</p>' +
          '<h4 class="mt">' + esc(s.lockIt.checklistTitle) + '</h4><ul class="checklist">' + s.lockIt.checklist.map(function (c) { return '<li>' + md(c) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="card"><h4>Red flags · exit clean, set a follow-up</h4><ul class="flag-list">' + s.flags.red.map(function (f) { return '<li>' + md(f) + '</li>'; }).join('') + '</ul>' +
          '<h4 class="mt">Green flags · your signals</h4><ul class="flag-list">' + s.flags.green.map(function (f) { return '<li>' + md(f) + '</li>'; }).join('') + '</ul></div>' +
      '</div>' +
      '<div class="sub-title full-guide">Closing playbook <span class="hint">pick a close</span></div>' +
      '<div class="full-guide">' + tabset('closes', s.closes, scriptTab) + '</div>' +
      '<div class="sub-title full-guide" id="emailBox">Follow-up email <span class="hint">synced to the sector in step 1</span></div>' +
      '<div class="full-guide">' + tabset('email', D.industries.map(function (i) { return { id: i.id, label: i.label, email: i.email, proofRefs: i.emailProofRefs }; }), function (t) {
        return '<div class="email-body copyable">' + md(t.email) + '</div>' + proofTodo(t.proofRefs);
      }, sec.id) + '<p class="note">' + md(s.emailNote) + '</p>' +
        '<div class="card mt"><h4>' + esc(s.consultEmail.title) + ' · consult offer</h4><div class="email-body copyable">' + md(s.consultEmail.text) + '</div><p class="note">' + md(s.consultEmail.note) + '</p></div></div>' +
      aiBox(s.ai);
    $('#s-secure').innerHTML = html;
  }

  function renderVoicemail() {
    var v = D.voicemail, ca = consultActive();
    var scripts = v.scripts.slice().sort(function (a, b) { return ((b.openers && ca) ? 1 : 0) - ((a.openers && ca) ? 1 : 0); });
    $('#s-voicemail').innerHTML = secTitle('If you get voicemail', 'under 20 seconds') +
      scripts.map(function (s) {
        var hide = s.openers && !ca;
        return '<div class="value-box vm' + (hide ? ' full-guide' : '') + '"><div class="value-label">' + esc(s.label) + (s.openers ? ' · consult openers' : '') + '</div>' +
          '<p class="value-line copyable">' + q(s.line) + '</p><span class="hint">' + md(s.note) + '</span></div>';
      }).join('') +
      '<div class="sub-title full-guide">Cadence</div><div class="two-col full-guide">' + v.cadence.map(function (c) { return '<div class="card"><h4>' + esc(c.label) + '</h4><p class="note">' + md(c.text) + '</p></div>'; }).join('') + '</div>';
  }

  function renderCheat() {
    var c = D.coaching;
    $('#s-cheat').innerHTML = secTitle('Cheat sheet · ' + esc(D.product.name)) +
      '<div class="cheat">' +
        '<div class="card"><h4>Who to call</h4><ul class="plain">' + D.personas.map(function (p) { return '<li><b>' + esc(p.role) + dB(p, 'role') + '</b><span>Test: ' + md(p.hypothesis) + dB(p, 'hypothesis') + '</span></li>'; }).join('') + '</ul></div>' +
        '<div class="card"><h4>What they likely use today</h4><div class="tags">' + D.incumbents.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</div><p class="note">Listen for these in Discover.</p></div>' +
        '<div class="card"><h4>Proof points <span class="hint">grab one mid-call</span></h4>' + D.proof.map(function (p) {
          return '<div class="proof"><div class="proof-label">' + esc(p.label) + '</div><div class="proof-stat">' + md(p.stat) + '</div><p class="copyable">' + md(p.line) + '</p><span class="src">' + esc(p.src) + '</span>' + todoB(p) + '</div>';
        }).join('') + '<p class="note">' + md(D.proofNote) + '</p></div>' +
        '<div class="card"><h4>Resources</h4>' + (D.resources.length ? '<div class="links">' + D.resources.map(function (r) { return '<a class="lnk" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.label) + '</a>'; }).join('') + '</div>' : '<p class="note">No resource links in the data file yet. Add them to <code>resources</code>.</p>') + '</div>' +
      '</div>' +
      '<div class="sub-title">' + md(D.sectorRefLabel) + '</div><div class="sect-grid">' + D.industries.map(function (s) {
        return '<div class="sect-card"><h5>' + esc(s.hookLabel) + '</h5><span class="copyable">' + md(s.hook) + '</span><span class="nums">' + md(s.nums) + '</span>' + proofTodo(s.proofRefs) + '</div>';
      }).join('') + '</div>' +
      '<div class="sub-title">Delivery &amp; mindset</div><div class="rules card"><ul class="yes">' + c.doRules.map(function (r) { return '<li>' + md(r) + '</li>'; }).join('') + '</ul><ul class="no">' + c.dontRules.map(function (r) { return '<li>' + md(r) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="mind">' + c.mindset.map(function (m) { return '<span>' + md(m) + '</span>'; }).join('') + '</div>' +
      '<div class="two-col">' + c.methods.map(function (m) { return '<div class="card"><h4>' + esc(m.title) + '</h4><p class="note"><b>Best for:</b> ' + md(m.bestFor) + '</p><p class="note">' + md(m.text) + '</p>' + say(m.example) + '</div>'; }).join('') + '</div>' +
      '<div class="sub-title">Tonality</div><div class="two-col">' + c.tonality.map(function (t) { return '<div class="card"><h4>' + esc(t.label) + '</h4><p class="note">' + md(t.text) + '</p></div>'; }).join('') + '</div>';
  }

  // walk the data for DRAFT / TODO markers
  function reviewItems() {
    var draft = [], todo = [];
    (D.draft || []).forEach(function (f) { draft.push({ path: f, what: 'root field' }); });
    (function walk(v, p) {
      if (Array.isArray(v)) { v.forEach(function (x, i) { walk(x, p + '[' + (x && x.id ? x.id : i) + ']'); }); return; }
      if (!v || typeof v !== 'object') return;
      if (v.status) draft.push({ path: p, what: 'whole item' });
      if (v.draft && p) draft.push({ path: p, what: v.draft.join(', ') });
      if (v.todo) todo.push({ path: p, what: v.todo });
      Object.keys(v).forEach(function (k) { if (k !== 'draft') walk(v[k], p ? p + '.' + k : k); });
    })(D, '');
    return { draft: draft, todo: todo };
  }
  function renderReview() {
    var r = reviewItems();
    function li(x) { return '<li><code>' + esc(x.path) + '</code> · ' + esc(x.what) + '</li>'; }
    if (D.meta.reviewed && !r.draft.length && !r.todo.length) {
      var rv = D.meta.review || {};
      $('#s-review').innerHTML = secTitle('Review status', 'approved') +
        '<p class="note">All content approved' + (rv.approvedBy ? ' by <b>' + esc(rv.approvedBy) + '</b>' : '') + (rv.date ? ' on ' + esc(rv.date) : '') + '. ' + (rv.note ? esc(rv.note) : '') + '</p>';
      return;
    }
    $('#s-review').innerHTML = secTitle('Review list', r.draft.length + ' DRAFT · ' + r.todo.length + ' TODO') +
      '<p class="note">Generated from <code>data/coldcall-maas360.json</code>. Clear an item by editing the data and removing its <code>status</code>, <code>draft</code>, or <code>todo</code> marker.</p>' +
      '<div class="sub-title">TODO: verify approved for external use</div><ul class="review-list">' + r.todo.map(li).join('') + '</ul>' +
      '<div class="sub-title">DRAFT: review</div><ul class="review-list">' + r.draft.map(li).join('') + '</ul>';
  }

  // ---------- render all ----------
  function renderAll() {
    var open = $$('[data-obj].open').map(function (o) { return o.getAttribute('data-id') || o.querySelector('.q').textContent; });
    renderSetup(); renderGoal(); renderPrep(); renderEngage(); renderDiscover(); renderExplore(); renderSecure(); renderVoicemail(); renderCheat(); renderReview();
    $$('[data-obj]').forEach(function (o) { var k = o.getAttribute('data-id') || o.querySelector('.q').textContent; if (open.indexOf(k) > -1) o.classList.add('open'); });
    initCollapse();
    fill();
  }

  // ---------- interactions ----------
  function flashTailored(msg) {
    toast(msg);
    $$('[data-tailored], #s-engage .script, .persona-hyp').forEach(function (el) {
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    });
  }
  function setLive(on) {
    document.body.classList.toggle('live', on);
    $('#liveBtn').setAttribute('aria-pressed', on);
    $('#liveLbl').textContent = on ? 'Exit Live' : 'Live Mode';
  }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1600); }
  function copyText(text) {
    text = text.replace(/\s+/g, ' ').trim();
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied'); } catch (e) {} ta.remove(); }

  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-sector],[data-persona],[data-opener],[data-trigger],[data-tab],.obj-head,.copy');
      if (!t) return;
      if (t.hasAttribute('data-sector')) { state.sector = t.getAttribute('data-sector'); save('sector', state.sector); renderAll(); flashTailored('Scripts updated for ' + sector().label); }
      else if (t.hasAttribute('data-persona')) { state.persona = t.getAttribute('data-persona'); save('persona', state.persona); renderAll(); flashTailored('Scripts updated for ' + persona().role); }
      else if (t.hasAttribute('data-opener')) { state.opener = t.getAttribute('data-opener'); save('opener', state.opener); renderAll(); }
      else if (t.hasAttribute('data-trigger')) { var v = t.getAttribute('data-trigger'); state.trigger = state.trigger === v ? null : v; save('trigger', state.trigger); renderAll(); }
      else if (t.hasAttribute('data-tab')) {
        var set = t.closest('[data-tabset]'), id = t.getAttribute('data-tab');
        state.tabs[set.getAttribute('data-tabset')] = id;
        $$('.tab', set).forEach(function (b) { b.classList.toggle('active', b === t); });
        $$('.tab-panel', set).forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== id; });
      }
      else if (t.classList.contains('obj-head')) { t.parentNode.classList.toggle('open'); }
      else if (t.classList.contains('copy')) { copyText(t.parentNode.querySelector('.prompt-text').textContent); }
    });
    document.addEventListener('input', function (e) {
      if (e.target.id === 'customTrigger') {
        var v = e.target.value.trim().replace(/^(i noticed\s+)?(\[company\]|they|the company)\s+/i, '').replace(/[.\s]+$/, '');
        state.trigger = v || null; save('trigger', state.trigger); fill();
        $$('#triggerChips .chip').forEach(function (c) { c.classList.remove('active'); });
      }
    });
    $$('[data-in]').forEach(function (inp) {
      var k = inp.getAttribute('data-in');
      inp.value = state.inputs[k] || '';
      inp.addEventListener('input', function () { state.inputs[k] = inp.value.trim(); save('inputs', state.inputs); fill(); });
    });
    if (Object.keys(state.inputs).some(function (k) { return state.inputs[k]; })) $('#personalize').open = true;
    $('#clearInputs').addEventListener('click', function () { state.inputs = {}; save('inputs', {}); $$('[data-in]').forEach(function (i) { i.value = ''; }); fill(); });
    document.addEventListener('dblclick', function (e) {
      var el = e.target.closest && e.target.closest('.copyable'); if (!el) return;
      var c = el.cloneNode(true); $$('.cue,.dbadge,.tbadge,.src-note', c).forEach(function (x) { x.remove(); });
      copyText(c.textContent);
    });
    $('#liveBtn').addEventListener('click', function () { setLive(!document.body.classList.contains('live')); });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'l' || e.key === 'L') setLive(!document.body.classList.contains('live'));
    });
    var ps = $('#pageSelect'); if (ps) ps.addEventListener('change', function () { location.href = ps.value; });
    $('#railClose').addEventListener('click', function () { $('#rail').hidden = true; save('rail-hidden', true); });
    if (load('rail-hidden', false)) $('#rail').hidden = true;
    $('#collapseAll').addEventListener('click', function () { setAllCollapsed(true); });
    $('#expandAll').addEventListener('click', function () { setAllCollapsed(false); });
  }

  // ---------- collapsible sections (remembered per browser) ----------
  var collapsed = load('collapsed', {});
  function initCollapse() {
    $$('section.sec').forEach(function (sec) {
      var head = sec.querySelector(':scope > .sec-title'); if (!head) return;
      var body = document.createElement('div'); body.className = 'sec-body';
      while (head.nextSibling) body.appendChild(head.nextSibling);
      sec.appendChild(body);
      head.classList.add('ct'); head.setAttribute('role', 'button'); head.setAttribute('tabindex', '0');
      var chev = document.createElement('span'); chev.className = 'ct-chev'; chev.setAttribute('aria-hidden', 'true'); chev.textContent = '▾'; head.appendChild(chev);
      apply(sec, !!collapsed[sec.id]);
      head.addEventListener('click', function () { var on = !sec.classList.contains('is-collapsed'); apply(sec, on); remember(sec.id, on); });
      head.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); head.click(); } });
    });
  }
  function apply(sec, on) { sec.classList.toggle('is-collapsed', on); var h = sec.querySelector(':scope > .sec-title'); if (h) h.setAttribute('aria-expanded', !on); }
  function remember(id, on) { if (on) collapsed[id] = 1; else delete collapsed[id]; save('collapsed', collapsed); }
  function setAllCollapsed(on) { $$('section.sec').forEach(function (s) { apply(s, on); remember(s.id, on); }); }
  $$('.jump a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s && s.classList.contains('is-collapsed')) { apply(s, false); remember(s.id, false); } });
  });

  // ---------- boot ----------
  function init(data) {
    D = data;
    if (!byId(D.industries, state.sector)) state.sector = 'general';
    if (!byId(D.personas, state.persona)) state.persona = D.personas[0].id;
    if (!byId(visibleOpeners(), state.opener)) state.opener = visibleOpeners()[0].id;
    renderHeader();
    renderAll();
    wire();
    $('#cockpit').removeAttribute('aria-busy');
    if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  }
  // a published single-file build sets window.COLDCALL_DATA; otherwise load the data file
  if (window.COLDCALL_DATA) { init(window.COLDCALL_DATA); return; }
  fetch(DATA_URL, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
    .then(init)
    .catch(function (err) {
      $('#cockpit').insertAdjacentHTML('afterbegin', '<div class="load-error"><b>Couldn\'t load ' + DATA_URL + '.</b> ' + esc(err.message) +
        '<br>If you opened this file directly (file://), serve the folder instead: <code>npm start</code> or <code>python3 -m http.server</code>, then open http://localhost:8000/cold-call.html</div>');
    });
})();
