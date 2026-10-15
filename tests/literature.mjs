// Shared contract for the two literary companion pages.
//
// Both are built from the same Active Reading Pamphlet course resource, so they share one
// twelve-section spine and must cite the same seven handout PDFs by exact filename.
// Prose can be rewritten; these section ids, field coverage and caveats are what the
// static and browser checks enforce.

export const analysisPages = ['out-of-my-mind.html', 'of-mice-and-men.html'];

export const spine = ['home', 'author', 'context', 'characters', 'plot', 'setting', 'pov', 'tone', 'vocab', 'theme', 'questions', 'citations'];

// Exact filenames of the seven supplied handouts, as they appear in the Works Cited entries.
export const handouts = [
  'Active Reading Pamphlet.pdf',
  'Attitude vs. Mood.pdf',
  'Character Traits.pdf',
  'Directions & Scoring.pdf',
  'Narration Traits.pdf',
  'Setting Details.pdf',
  'Theme & Big Ideas.pdf'
];

// Each Active Reading Pamphlet field, the section that answers it, and a tolerant label
// match for the Home section's map. The field must be named; wording around it may move.
export const pamphletFields = [
  { field: 'Name, Title, Author', section: 'home', label: /\bname\b/i },
  { field: 'Author Information', section: 'author', label: /author information/i },
  { field: 'Contextual Information', section: 'context', label: /contextual information/i },
  { field: 'Important Characters', section: 'characters', label: /important characters/i },
  { field: 'Unforgettable Moments', section: 'plot', label: /unforgettable moments/i },
  { field: 'Valuable Details: Setting', section: 'setting', label: /valuable details[\s\S]{0,60}?setting/i },
  { field: 'Valuable Details: Narrator', section: 'pov', label: /valuable details[\s\S]{0,60}?narrat/i },
  { field: 'Valuable Details: Attitude', section: 'tone', label: /valuable details[\s\S]{0,60}?attitude/i },
  { field: 'Close Reading Vocabulary', section: 'vocab', label: /close reading vocabulary/i },
  { field: 'Emotional Sparks', section: 'tone', label: /emotional sparks/i },
  { field: 'Questions', section: 'questions', label: /\bquestions\b/i },
  { field: 'Theme & Big Ideas', section: 'theme', label: /theme (?:&|and) big ideas|big ideas/i }
];

// The five plot stages the Unforgettable Moments field asks for.
export const plotStages = ['Exposition', 'Rising Action', 'Climax', 'Falling Action', 'Resolution'];

// The four character qualities every Character Traits entry uses.
export const qualities = ['Mental', 'Moral', 'Physical', 'Social'];

// A guide must say what its locators are worth: page numbers come from one printing and
// other editions paginate differently.
export const locatorCaveat = [
  /\b(?:printed|reference) (?:page|ed\.|printing)/i,
  /page numbers? (?:vary|differ|change|are not|come from)/i,
  /editions? (?:differ|vary)/i,
  /(?:whichever|whatever|your) (?:edition|copy|printing|classroom copy)/i,
  /different pagination/i
];

// A guide must also say that its answers are models, not a replacement for the reader's
// own evidence and interpretation.
export const interpretationCaveat = [
  /\bpersonal\b/i,
  /your own/i,
  /\binterpret/i,
  /not the only/i,
  /no single (?:right|correct)/i,
  /one defensible/i,
  /not a replacement/i,
  /\bsuggested\b/i,
  /\bmodels?\b/i
];

const entities = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '\u2013', mdash: '\u2014', bull: '\u2022', middot: '\u00b7',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
  hellip: '\u2026', deg: '\u00b0'
};

// Decoded, script-free, whitespace-collapsed visible text, for tolerant matching.
export function text(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

// The .page children of <main>, in document order, each sliced to its matching </div>.
export function sections(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const pages = [...main.matchAll(/<div\b([^>]*)>/g)]
    .filter(match => /\bclass="[^"]*\bpage\b/.test(match[1]) && /\bid="[^"]+"/.test(match[1]));
  return pages.map(match => ({
    id: /\bid="([^"]+)"/.exec(match[1])[1],
    html: sliceDiv(main, match.index)
  }));
}

function sliceDiv(body, start) {
  let depth = 0;
  const tags = /<(\/?)div\b[^>]*>/g;
  tags.lastIndex = start;
  for (let match = tags.exec(body); match; match = tags.exec(body)) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return body.slice(start, tags.lastIndex);
  }
  return body.slice(start);
}

// The section ids the inline progressive-enhancement script is allowed to activate.
export function scriptedPages(html) {
  const declared = html.match(/pageIds\s*=\s*new Set\(\[([^\]]*)\]/)?.[1] ?? '';
  return [...declared.matchAll(/'([^']+)'/g)].map(match => match[1]);
}

// The largest of the list/definition shapes a section uses, so vocabulary entries can be
// written as a description list, a table or a list without failing on markup.
export function entryCount(html) {
  return Math.max(
    (html.match(/<dt\b/gi) ?? []).length,
    (html.match(/<tr\b/gi) ?? []).length,
    (html.match(/<h3\b/gi) ?? []).length,
    (html.match(/<li\b/gi) ?? []).length
  );
}
