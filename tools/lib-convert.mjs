// Shared helpers for turning old cockpit HTML into the data-file markup, and back to plain text.
//
// Data-file markup (rendered by assets/cold-call.js):
//   {token}      filled from the setup panel / data, e.g. {you} {name} {company} {phone} {city}
//   **bold**     bold
//   [[cue]]      delivery cue (green chip), stripped when a line is copied
//   ((aside))    a dimmed "if they say..." branch on its own line
//   [Literal]    any other bracketed placeholder, highlighted for the rep to fill in by hand
//   \n           line break

const ENTITIES = { '&mdash;': '—', '&rarr;': '→', '&hellip;': '…', '&amp;': '&', '&nbsp;': ' ', '&middot;': '·', '&quot;': '"', '&#39;': "'" };

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&[a-z]+;/g, (e) => (e in ENTITIES ? ENTITIES[e] : e));
}

// Rep-specific names and old placeholders -> data-file tokens.
export function tokenize(s) {
  return s
    .replace(/\[Your Name\]/g, '{you}')
    .replace(/\[Name\]/g, '{name}')
    .replace(/\[(Company|Firm)\]/g, '{company}')
    .replace(/\[(Your Number|Phone)\]/g, '{phone}')
    .replace(/\bBernard\b/g, '{you}')
    .replace(/\bAustin\b/g, '{city}');
}

// Old HTML fragment -> data-file markup.
export function conv(html) {
  let s = String(html)
    .replace(/<span style="[^"]*">([\s\S]*?)<\/span>/g, '\n(($1))')
    .replace(/<span class="cue-inline">([\s\S]*?)<\/span>/g, '[[$1]]')
    .replace(/<em>\[([^\]]*)\]<\/em>/g, '[[$1]]')
    .replace(/<\/?(b|strong)>/g, '**')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '');
  s = tokenize(decodeEntities(s));
  return s
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*\*\*/g, '')
    .trim();
}
