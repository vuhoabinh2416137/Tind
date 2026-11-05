/**
 * Drafty: Tinode Rich Message Format Engine
 * 
 * Implements the Tinode Drafty specification for structured, rich-text
 * message formatting, parsing, serialization, and AST tree generation.
 * Prevents HTML/XSS injection by design.
 */

// Supported text decoration styles
export const STYLE_TYPES = {
  ST: 'ST', // Strong / Bold
  EM: 'EM', // Emphasis / Italic
  DL: 'DL', // Deleted / Strikethrough
  CO: 'CO', // Inline code
  HL: 'HL', // Highlight
  BR: 'BR', // Line break
  HD: 'HD', // Hidden
  RW: 'RW', // Row / Logical group
};

// Supported entity types
export const ENTITY_TYPES = {
  LN: 'LN', // Link (URL)
  MN: 'MN', // Mention (@username)
  HT: 'HT', // Hashtag (#tag)
  IM: 'IM', // Image
  AU: 'AU', // Audio
  VD: 'VD', // Video
  EX: 'EX', // File attachment
  BN: 'BN', // Interactive button
};

// Allowed URL protocols to prevent XSS (e.g. javascript:)
const SAFE_URL_PATTERN = /^(https?:\/\/|mailto:|tel:|\/)/i;

/**
 * Check if an object conforms to Drafty schema
 */
export function isDrafty(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return typeof obj.txt === 'string' &&
    (!obj.fmt || Array.isArray(obj.fmt)) &&
    (!obj.ent || Array.isArray(obj.ent));
}

/**
 * Initialize a blank or plain-text Drafty document
 */
export function init(text = '') {
  return {
    txt: String(text || ''),
    fmt: [],
    ent: []
  };
}

/**
 * Extract plain text from a Drafty document or string
 */
export function toPlainText(drafty) {
  if (!drafty) return '';
  if (typeof drafty === 'string') return drafty;
  return drafty.txt || '';
}

/**
 * Sanitize Drafty object against malformed ranges and malicious URLs
 */
export function sanitize(drafty) {
  if (!drafty || typeof drafty !== 'object') {
    return init('');
  }

  const txt = typeof drafty.txt === 'string' ? drafty.txt : '';
  const txtLen = Array.from(txt).length;
  const rawFmt = Array.isArray(drafty.fmt) ? drafty.fmt : [];
  const rawEnt = Array.isArray(drafty.ent) ? drafty.ent : [];

  // Sanitize entities
  const sanitizedEnt = rawEnt.map(entity => {
    if (!entity || typeof entity !== 'object') return { tp: 'EX', data: {} };
    const tp = String(entity.tp || 'EX').toUpperCase();
    const data = { ...(entity.data || {}) };

    if (tp === ENTITY_TYPES.LN && typeof data.url === 'string') {
      const trimmed = data.url.trim();
      data.url = SAFE_URL_PATTERN.test(trimmed) ? trimmed : 'about:blank';
    }

    return { tp, data };
  });

  // Sanitize formatting ranges
  const sanitizedFmt = [];
  for (const span of rawFmt) {
    if (!span || typeof span !== 'object') continue;
    const at = Math.max(0, parseInt(span.at, 10) || 0);
    const len = Math.max(0, parseInt(span.len, 10) || 0);

    // Skip out of bound spans
    if (at > txtLen) continue;
    const clampedLen = Math.min(len, txtLen - at);

    if (span.tp) {
      const tp = String(span.tp).toUpperCase();
      sanitizedFmt.push({ at, len: clampedLen, tp });
    } else if (typeof span.key === 'number' && span.key >= 0 && span.key < sanitizedEnt.length) {
      sanitizedFmt.push({ at, len: clampedLen, key: span.key });
    }
  }

  return {
    txt,
    fmt: sanitizedFmt,
    ent: sanitizedEnt
  };
}

/**
 * Add a basic style to Drafty object
 */
export function addStyle(drafty, tp, at, len) {
  const d = sanitize(drafty);
  d.fmt.push({
    at: Math.max(0, at),
    len: Math.max(0, len),
    tp: String(tp).toUpperCase()
  });
  return d;
}

/**
 * Attach an entity and associate with a range
 */
export function attachEntity(drafty, tp, data, at = 0, len = 0) {
  const d = sanitize(drafty);
  const key = d.ent.length;
  d.ent.push({
    tp: String(tp).toUpperCase(),
    data: data || {}
  });
  d.fmt.push({
    at: Math.max(0, at),
    len: Math.max(0, len),
    key
  });
  return d;
}

/**
 * Parse Markdown, mentions, hashtags, and links into a canonical Drafty document
 */
export function parseFromMarkdown(text) {
  if (!text) return init('');
  if (isDrafty(text)) return sanitize(text);

  const raw = String(text);
  const entities = [];
  const fmt = [];

  // Helper to add entity
  const addEntity = (tp, data, at, len) => {
    const key = entities.length;
    entities.push({ tp, data });
    fmt.push({ at, len, key });
  };

  // Helper to add style
  const addFmt = (tp, at, len) => {
    if (len > 0) {
      fmt.push({ at, len, tp });
    }
  };

  /**
   * Tokenizer to parse markdown delimiters sequentially while building final clean txt
   */
  let cleanTxt = '';
  let i = 0;
  const chars = Array.from(raw);
  const n = chars.length;

  while (i < n) {
    // 1. Line breaks
    if (chars[i] === '\n') {
      const at = Array.from(cleanTxt).length;
      cleanTxt += '\n';
      fmt.push({ at, len: 1, tp: STYLE_TYPES.BR });
      i++;
      continue;
    }

    // 2. Inline Code: `code`
    if (chars[i] === '`') {
      let close = -1;
      for (let j = i + 1; j < n; j++) {
        if (chars[j] === '`') {
          close = j;
          break;
        }
      }
      if (close !== -1 && close > i + 1) {
        const codeText = chars.slice(i + 1, close).join('');
        const at = Array.from(cleanTxt).length;
        cleanTxt += codeText;
        addFmt(STYLE_TYPES.CO, at, Array.from(codeText).length);
        i = close + 1;
        continue;
      }
    }

    // 3. Bold: **text**
    if (chars[i] === '*' && chars[i + 1] === '*') {
      let close = -1;
      for (let j = i + 2; j < n - 1; j++) {
        if (chars[j] === '*' && chars[j + 1] === '*') {
          close = j;
          break;
        }
      }
      if (close !== -1 && close > i + 2) {
        const boldText = chars.slice(i + 2, close).join('');
        const at = Array.from(cleanTxt).length;
        cleanTxt += boldText;
        addFmt(STYLE_TYPES.ST, at, Array.from(boldText).length);
        i = close + 2;
        continue;
      }
    }

    // 4. Strikethrough: ~~text~~
    if (chars[i] === '~' && chars[i + 1] === '~') {
      let close = -1;
      for (let j = i + 2; j < n - 1; j++) {
        if (chars[j] === '~' && chars[j + 1] === '~') {
          close = j;
          break;
        }
      }
      if (close !== -1 && close > i + 2) {
        const delText = chars.slice(i + 2, close).join('');
        const at = Array.from(cleanTxt).length;
        cleanTxt += delText;
        addFmt(STYLE_TYPES.DL, at, Array.from(delText).length);
        i = close + 2;
        continue;
      }
    }

    // 5. Highlight: ==text==
    if (chars[i] === '=' && chars[i + 1] === '=') {
      let close = -1;
      for (let j = i + 2; j < n - 1; j++) {
        if (chars[j] === '=' && chars[j + 1] === '=') {
          close = j;
          break;
        }
      }
      if (close !== -1 && close > i + 2) {
        const hlText = chars.slice(i + 2, close).join('');
        const at = Array.from(cleanTxt).length;
        cleanTxt += hlText;
        addFmt(STYLE_TYPES.HL, at, Array.from(hlText).length);
        i = close + 2;
        continue;
      }
    }

    // 6. Italic: *text* or _text_
    if ((chars[i] === '*' && chars[i + 1] !== '*') || chars[i] === '_') {
      const delim = chars[i];
      let close = -1;
      for (let j = i + 1; j < n; j++) {
        if (chars[j] === delim) {
          close = j;
          break;
        }
      }
      if (close !== -1 && close > i + 1) {
        const emText = chars.slice(i + 1, close).join('');
        const at = Array.from(cleanTxt).length;
        cleanTxt += emText;
        addFmt(STYLE_TYPES.EM, at, Array.from(emText).length);
        i = close + 1;
        continue;
      }
    }

    // 7. Markdown Link: [label](url)
    if (chars[i] === '[') {
      let mid = -1;
      let close = -1;
      for (let j = i + 1; j < n; j++) {
        if (chars[j] === ']' && chars[j + 1] === '(') {
          mid = j;
        } else if (mid !== -1 && chars[j] === ')') {
          close = j;
          break;
        }
      }
      if (mid !== -1 && close !== -1) {
        const label = chars.slice(i + 1, mid).join('');
        const url = chars.slice(mid + 2, close).join('');
        const at = Array.from(cleanTxt).length;
        cleanTxt += label;
        addEntity(ENTITY_TYPES.LN, { url }, at, Array.from(label).length);
        i = close + 1;
        continue;
      }
    }

    // Default: append char
    cleanTxt += chars[i];
    i++;
  }

  // Scan remaining cleanTxt for auto-links, mentions, and hashtags (if not already part of an entity)
  // Auto-links: http(s)://...
  const urlRegex = /(https?:\/\/[^\s<>"'()]+)/g;
  let match;
  while ((match = urlRegex.exec(cleanTxt)) !== null) {
    const at = match.index;
    const len = match[0].length;
    // Check if overlaps with existing entity
    const overlaps = fmt.some(f => typeof f.key === 'number' && !(at + len <= f.at || at >= f.at + f.len));
    if (!overlaps) {
      addEntity(ENTITY_TYPES.LN, { url: match[0] }, at, len);
    }
  }

  // Mentions: @username
  const mentionRegex = /(?:^|\s)(@([a-zA-Z0-9_\.]+))/g;
  while ((match = mentionRegex.exec(cleanTxt)) !== null) {
    const fullMatch = match[1];
    const username = match[2];
    const at = match.index + (match[0].length - fullMatch.length);
    const len = fullMatch.length;
    const overlaps = fmt.some(f => typeof f.key === 'number' && !(at + len <= f.at || at >= f.at + f.len));
    if (!overlaps) {
      addEntity(ENTITY_TYPES.MN, { val: username }, at, len);
    }
  }

  // Hashtags: #topic
  const hashtagRegex = /(?:^|\s)(#([a-zA-Z0-9_\p{L}]+))/gu;
  while ((match = hashtagRegex.exec(cleanTxt)) !== null) {
    const fullMatch = match[1];
    const tag = match[2];
    const at = match.index + (match[0].length - fullMatch.length);
    const len = fullMatch.length;
    const overlaps = fmt.some(f => typeof f.key === 'number' && !(at + len <= f.at || at >= f.at + f.len));
    if (!overlaps) {
      addEntity(ENTITY_TYPES.HT, { val: tag }, at, len);
    }
  }

  return sanitize({
    txt: cleanTxt,
    fmt,
    ent: entities
  });
}

/**
 * Convert Drafty document to a nested Abstract Syntax Tree (AST)
 * for safe, hierarchical rendering in React/VDOM.
 * 
 * Nodes:
 * - String: text fragment
 * - Object: { type: 'ST'|'EM'|..., data?: {...}, children: [...] }
 */
export function toTree(drafty) {
  const d = sanitize(drafty);
  const chars = Array.from(d.txt);
  const totalLen = chars.length;

  if (totalLen === 0) {
    return [];
  }

  // Collect boundary points
  const points = new Set([0, totalLen]);
  for (const f of d.fmt) {
    points.add(f.at);
    points.add(Math.min(totalLen, f.at + f.len));
  }

  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  const spans = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    if (start >= end) continue;

    const sliceText = chars.slice(start, end).join('');
    // Find all active formatting styles/entities for this span
    const activeFmt = d.fmt.filter(f => f.at <= start && (f.at + f.len) >= end);

    // Build nested structure for this slice
    let currentNode = sliceText;

    // Sort active formatting so entity wraps outer, then decorations
    activeFmt.sort((a, b) => {
      const aIsEnt = typeof a.key === 'number';
      const bIsEnt = typeof b.key === 'number';
      if (aIsEnt && !bIsEnt) return -1;
      if (!aIsEnt && bIsEnt) return 1;
      return (b.len - a.len); // wider range outermost
    });

    for (const f of activeFmt) {
      if (typeof f.key === 'number' && d.ent[f.key]) {
        const ent = d.ent[f.key];
        currentNode = {
          type: ent.tp,
          data: ent.data || {},
          children: [currentNode]
        };
      } else if (f.tp) {
        currentNode = {
          type: f.tp,
          data: {},
          children: [currentNode]
        };
      }
    }

    spans.push(currentNode);
  }

  // Merge adjacent compatible text nodes
  return mergeAdjacentNodes(spans);
}

/**
 * Merge adjacent text nodes or identical wrapper tags
 */
function mergeAdjacentNodes(nodes) {
  if (!Array.isArray(nodes) || nodes.length <= 1) return nodes;

  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const curr = nodes[i];
    const prev = result[result.length - 1];

    if (typeof curr === 'string' && typeof prev === 'string') {
      result[result.length - 1] = prev + curr;
    } else if (
      prev && typeof prev === 'object' &&
      curr && typeof curr === 'object' &&
      prev.type === curr.type &&
      JSON.stringify(prev.data) === JSON.stringify(curr.data)
    ) {
      prev.children = mergeAdjacentNodes([...prev.children, ...curr.children]);
    } else {
      if (typeof curr === 'object' && curr.children) {
        curr.children = mergeAdjacentNodes(curr.children);
      }
      result.push(curr);
    }
  }

  return result;
}
