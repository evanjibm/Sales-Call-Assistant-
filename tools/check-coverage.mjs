#!/usr/bin/env node
// Proves nothing from the old MaaS360 cockpit was dropped: every sentence of old content
// (visible HTML + the script data objects) must appear verbatim in data/coldcall-maas360.json,
// after tokenizing ([Name] -> {name}, rep name -> {you}, city -> {city}) and ignoring
// whitespace, quote marks, and markup. UI chrome (section titles, button labels) is allow-listed below.
//
// Needs reference/maas360-old-cockpit.html (gitignored). Skips cleanly if it's missing.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { conv } from './lib-convert.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(ROOT, 'reference/maas360-old-cockpit.html');
if (!fs.existsSync(REF)) { console.log('coverage: skipped (reference/maas360-old-cockpit.html not present)'); process.exit(0); }

const norm = (s) => String(s)
  .replace(/\[\[|\]\]|\(\(|\)\)|\*\*/g, '')
  .replace(/then →/g, '')
  .replace(/^\d · /, '')
  .replace(/[()✓]/g, '')
  .replace(/["“”'‘’]/g, '')
  .replace(/\s+/g, '');

// Old-page chrome that intentionally isn't content: headings, jump links, badges, buttons, rail.
const CHROME = new Set([
  'MaaS360 Sales Guide', 'Hub', 'Prospecting', 'Cold Call', 'Resources', 'Onboarding', 'Rep Alignment', 'Territory Map',
  'Live Mode', 'Dark', 'Cold Call Cockpit',
  'Flow', 'What They Said', 'Meeting Ask', 'Consult Objections', 'Proof Stack', 'Proof Points', 'Objections', 'When They Say No',
  'Value', 'Starters', 'Interrupts', 'Openers', '4-Step Formula', 'Close', 'Voicemail', 'Gatekeeper', 'Email', 'Cadence',
  'Research', 'Tonality', 'Flags',
  'Recommended Call Flow', 'say this', 'Open · Recommended', 'Discover', 'Create curiosity', 'Ask for the meeting', 'then stop talking →',
  'Say It Out Loud', 'verbatim · Recommended', 'Open', 'Close — ask for the meeting',
  'Common objections — quick catches', 'any opener',
  'What Did They Say?', 'tap a card', 'Meeting Ask Library', 'pick one, then stop',
  'New Default Proof Stack', 'word for word', 'Consultation — Objections & Close', 'reference', 'Handle the Pushback',
  'Lock It & Voicemail', 'close the loop', 'grab one mid-call', 'Top Objections', 'tap to answer',
  'Say It Out Loud — The No', 'verbatim · stay warm', 'No to the 30 seconds', '"Not interested"', 'No to the meeting',
  'MaaS360 Value Snapshot', 'only if they ask', 'Conversation Starters', 'when the opener feels stiff',
  'Pattern Interrupts', 'when the call feels guarded', 'Opening Script', 'by persona', 'Default opener',
  'The 4-Step Meeting Formula', 'react · dig · curiosity · ask', 'Closing Playbook', 'pick a close', 'Pro Tips & Strategy',
  'Delivery Reminders & Mindset', 'Voicemail, Gatekeeper & Follow-Up Email', 'Follow-up email',
  'Cadence, Research & Tonality', 'Red Flags vs. Green Flags', 'Green flags', 'Red flags', 'Meeting locked checklist',
  'Best for:', '📞 LIVE CALL', '1 · Open', 'Recommended', '2 · Discover', '3 · Curiosity', '4 · Ask', 'STOP TALKING', '×', '▾', '↓',
  '🎙️', '🛑', '•', '↻', '✉', '👤', '1', '2', '3', '4', '✅', '📅', '❌', '📧',
  // The old Live hint named the old sections (Flow / What Did They Say / Ask / Objections); replaced by data.liveHint.
  'Live Mode on — showing only Flow, What Did They Say, Ask, and Objections.',
  'Best for:',
  // persona/sector pill labels are carried as industries[].label / openers[].tag
]);

function blocksFromBody(html) {
  let b = html.slice(html.indexOf('<body'), html.indexOf('<script>', html.indexOf('<body')))
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(style|aria-[a-z]+|role|tabindex)="[^"]*"/g, '');
  // keep inline cue spans / bold / em; everything else is a block boundary
  b = b.replace(/<span class="cue-inline">/g, '\u0001').replace(/<\/span>(?=[^<]*)/g, (m, off, str) => m);
  const parts = b.split(/<(?!\/?(?:b|strong|em|br)\b)(?!span class="cue-inline")[^>]+>/);
  return parts.map((p) => p.replace(/\u0001/g, '<span class="cue-inline">')).map((p) => conv(p.replace(/<\/span>/g, ''))).filter((s) => s.replace(/\s/g, ''));
}

function stringsFromScript(html) {
  const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const out = [];
  for (const name of ['openers', 'proofSectors', 'proofDefaultSectors', 'proofConsultSectors', 'emailTemplates', 'sectorExamples']) {
    const start = script.indexOf('var ' + name + '=');
    let i = script.indexOf('{', start), depth = 0, q = null;
    for (; i < script.length; i++) {
      const c = script[i];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '{') depth++;
      if (c === '}' && --depth === 0) break;
    }
    const obj = vm.runInNewContext('(' + script.slice(script.indexOf('{', start), i + 1) + ')');
    (function walk(v) { if (typeof v === 'string') out.push(conv(v)); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(obj);
  }
  return out;
}

const sentences = (s) => s.replace(/^\*\*(.+?)\*\*/, '$1\n').split(/\n+|(?<=[.?!…]["”]?)\s+(?=["“A-Z{*\[])/).map((x) => x.trim()).filter(Boolean);

const html = fs.readFileSync(REF, 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/coldcall-maas360.json'), 'utf8'));
const leaves = [];
(function walk(v) { if (typeof v === 'string') leaves.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(data);
const corpus = leaves.map(norm).join('|');

let checked = 0;
const missing = [];
for (const block of [...blocksFromBody(html), ...stringsFromScript(html)]) {
  if (CHROME.has(block.replace(/\*\*/g, '').trim())) continue;
  for (const s of sentences(block)) {
    const n = norm(s);
    if (!n || CHROME.has(s.replace(/\*\*/g, '').trim())) continue;
    checked++;
    if (!corpus.includes(n)) missing.push(s);
  }
}
const uniq = [...new Set(missing)];
if (uniq.length) {
  console.log(`coverage: ${uniq.length} old sentence(s) not found in the data file:`);
  uniq.forEach((m) => console.log('  - ' + m));
  process.exit(1);
}
console.log(`coverage: OK, all ${checked} old sentences are in data/coldcall-maas360.json`);
