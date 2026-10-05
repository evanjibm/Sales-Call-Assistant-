#!/usr/bin/env node
// Validates data/coldcall-maas360.json and prints every DRAFT and TODO item.
//   node tools/check-coldcall.mjs          -> errors fail the run; review list printed
//   node tools/check-coldcall.mjs --quiet  -> errors only
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data/coldcall-maas360.json');
const raw = fs.readFileSync(FILE, 'utf8');
const D = JSON.parse(raw);
const quiet = process.argv.includes('--quiet');
const errors = [];
const err = (m) => errors.push(m);
const ids = (list) => new Set((list || []).map((x) => x.id));

// ---- rep-specific names must not come back ----
for (const word of ['Bernard', 'Austin']) if (raw.includes(word)) err(`"${word}" appears in the data file; use {you} / {city}`);

// ---- tokens used in strings must be known to the renderer ----
const TOKENS = new Set(['you', 'city', 'phone', 'name', 'company', 'type', 'peerco', 'trigger', 'product', 'full', 'topic', 'owns', 'ownerTeam',
  'focusA', 'focusB', 'costs', 'incumbent', 'incumbentList', 'role', 'plural', 'hypothesis', 'peer', 'value']);
(function walk(v, p) {
  if (p === 'meta') return;
  if (typeof v === 'string') {
    for (const m of v.matchAll(/\{(\w+)\}/g)) if (!TOKENS.has(m[1])) err(`${p}: unknown token {${m[1]}}`);
    if ((v.match(/\[\[/g) || []).length !== (v.match(/\]\]/g) || []).length) err(`${p}: unbalanced [[cue]]`);
    if ((v.match(/\*\*/g) || []).length % 2) err(`${p}: unbalanced **bold**`);
    if (/<[a-z][^>]*>|&[a-z]+;/i.test(v)) err(`${p}: raw HTML or entity left in text`);
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${x && x.id ? x.id : i}]`));
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, p ? `${p}.${k}` : k));
})(D, '');

// ---- required top-level fields ----
for (const k of ['meta', 'product', 'value', 'topic', 'owns', 'ownerTeam', 'focus', 'costs', 'incumbents', 'triggers', 'personas', 'industries',
  'openers', 'objections', 'noPlaybook', 'discover', 'explore', 'secure', 'voicemail', 'proof', 'coaching', 'prep', 'outcomes']) {
  if (D[k] === undefined) err(`missing top-level field: ${k}`);
}
if (!Array.isArray(D.focus) || D.focus.length !== 2) err('focus must have exactly 2 entries');

// ---- openers ----
const OPENER_IDS = ids(D.openers);
const visible = D.openers.filter((o) => o.visible);
const EXPECTED = ['Proof', 'Consultation', 'Consult Short', 'Permission', 'Direct', 'Casual', 'Discovery'];
if (visible.length !== 7) err(`expected 7 visible openers, found ${visible.length}`);
EXPECTED.forEach((t, i) => { if (!visible[i] || visible[i].tag.replace(/\s*★$/, '') !== t) err(`visible opener ${i + 1} should be "${t}"`); });
for (const o of D.openers) {
  for (const k of ['id', 'tag', 'role', 'line', 'spoken']) if (!o[k]) err(`openers[${o.id}].${k} missing`);
  if (!o.beats || o.beats.length !== 3) err(`openers[${o.id}] needs 3 beats`);
  (o.beats || []).forEach((b) => ['label', 'line', 'spoken'].forEach((k) => { if (!b[k]) err(`openers[${o.id}].beats[${b.key}].${k} missing`); }));
}

// ---- industries / sectors ----
if (D.industries.length !== 9) err(`expected 9 sectors, found ${D.industries.length}`);
for (const s of D.industries) {
  for (const set of ['proofdefault', 'proofconsult', 'proof']) {
    const sc = s.scripts && s.scripts[set];
    if (!sc) { err(`industries[${s.id}].scripts.${set} missing`); continue; }
    for (const k of ['line', 'disc', 'curi', 'ask', 'spoken', 'spDisc', 'spCuri', 'spAsk', 'stat']) if (!sc[k]) err(`industries[${s.id}].scripts.${set}.${k} missing`);
  }
  if (!s.email) err(`industries[${s.id}].email missing`);
  if (!s.fits || !(s.fits.todo || s.fits.approved)) err(`industries[${s.id}].fits must carry a TODO until the named accounts are cleared, then an approved note`);
}

// ---- personas ----
for (const p of D.personas) for (const k of ['id', 'role', 'plural', 'hypothesis', 'peer']) if (!p[k]) err(`personas[${p.id}].${k} missing`);

// ---- objections: reference format ----
for (const o of D.objections) {
  if (!o.q || !o.goes) err(`objections[${o.id}] needs q and goes`);
  if (o.exit) { if (!o.ack) err(`objections[${o.id}] exit card needs ack`); continue; }
  for (const k of ['ack', 'explore']) if (!o[k]) err(`objections[${o.id}].${k} missing`);
  if (!o.cont && !o.then) err(`objections[${o.id}] needs a continue line or a "then" step`);
  for (const op of o.openers || []) if (!OPENER_IDS.has(op)) err(`objections[${o.id}] references unknown opener ${op}`);
  for (const a of o.alts || []) if (!a.source || !a.line) err(`objections[${o.id}].alts need source + line`);
}

// ---- proof: every point has a source; brief-sourced points carry the TODO ----
const PROOF_IDS = ids(D.proof);
for (const p of D.proof) {
  if (!p.src) err(`proof[${p.id}] has no source`);
  if (/ADG|Vegas|Hacienda/i.test(p.src) && !/TODO: verify approved for external use/.test(p.todo || '') && !p.approved) err(`proof[${p.id}] is brief-sourced and must be marked TODO or approved`);
}
(function refs(v, p) {
  if (Array.isArray(v)) return v.forEach((x, i) => refs(x, `${p}[${x && x.id ? x.id : i}]`));
  if (!v || typeof v !== 'object') return;
  for (const k of ['proofRefs', 'emailProofRefs']) for (const r of v[k] || []) if (!PROOF_IDS.has(r)) err(`${p}.${k}: unknown proof id ${r}`);
  Object.entries(v).forEach(([k, x]) => refs(x, `${p}.${k}`));
})(D, '');
// any script quoting a brief stat must reference it
const BRIEF_STATS = [['setup-45-5', /45 min(ute)?s?\b[^.?"]{0,25}?5\b|45 min → 5|50 IT hours|~50 hrs/], ['tickets-60', /60%|70%/], ['cost-36k', /\$36K/]];
(function quoted(v, p, inherited) {
  if (Array.isArray(v)) return v.forEach((x, i) => quoted(x, `${p}[${x && x.id ? x.id : i}]`, inherited));
  if (!v || typeof v !== 'object') return;
  if (p === 'proof' || p.startsWith('proof[')) return;
  const own = new Set([...(inherited || []), ...(v.proofRefs || []), ...(v.emailProofRefs || [])]);
  for (const [k, x] of Object.entries(v)) {
    if (typeof x === 'string' && !(p === '' && k === 'proofNote')) for (const [id, re] of BRIEF_STATS) if (re.test(x) && !own.has(id)) err(`${p}.${k} quotes ${id} but has no proofRefs to it`);
    if (x && typeof x === 'object') quoted(x, p ? `${p}.${k}` : k, [...own]);
  }
})(D, '', []);

// ---- secure tiers point at real asks / closes / no types ----
const ASKS = ids(D.secure.asks), CLOSES = ids(D.secure.closes), NOS = ids(D.noPlaybook.types);
for (const t of D.secure.tiers) {
  t.asks.forEach((a) => { if (!ASKS.has(a)) err(`secure.tiers[${t.id}] unknown ask ${a}`); });
  t.closes.forEach((c) => { if (!CLOSES.has(c)) err(`secure.tiers[${t.id}] unknown close ${c}`); });
  if (t.noType && !NOS.has(t.noType)) err(`secure.tiers[${t.id}] unknown noType ${t.noType}`);
}
if (D.noPlaybook.types.length !== 3) err('When They Say No needs exactly 3 types');

// ---- review list ----
const drafts = [], todos = [];
(D.draft || []).forEach((f) => drafts.push(`${f}  (root field)`));
(function walk(v, p) {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${p}[${x && x.id ? x.id : i}]`));
  if (!v || typeof v !== 'object') return;
  if (v.status) drafts.push(`${p}  (whole item)`);
  if (v.draft && p) drafts.push(`${p}  (${v.draft.join(', ')})`);
  if (v.todo) todos.push(`${p}  — ${v.todo}`);
  for (const [k, x] of Object.entries(v)) if (k !== 'draft') walk(x, p ? `${p}.${k}` : k);
})(D, '');

if (!quiet) {
  console.log(`\nTODO (${todos.length})`); todos.forEach((t) => console.log('  - ' + t));
  console.log(`\nDRAFT: review (${drafts.length})`); drafts.forEach((t) => console.log('  - ' + t));
  console.log('');
}
if (D.meta.reviewed && (drafts.length || todos.length)) err('meta.reviewed is true but DRAFT/TODO markers remain');
if (errors.length) { console.error(`check: ${errors.length} error(s)`); errors.forEach((e) => console.error('  x ' + e)); process.exit(1); }
console.log(`check: OK · ${D.openers.length} openers (${visible.length} visible) · ${D.industries.length} sectors · ${D.personas.length} personas · ${D.objections.length} objections · ${D.proof.length} proof points · ${drafts.length} DRAFT · ${todos.length} TODO`);
