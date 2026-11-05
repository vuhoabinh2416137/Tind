import test from 'node:test';
import assert from 'node:assert/strict';
import * as Drafty from '../src/protocol/drafty.js';

test('Drafty: isDrafty validation', () => {
  assert.equal(Drafty.isDrafty(null), false);
  assert.equal(Drafty.isDrafty('hello'), false);
  assert.equal(Drafty.isDrafty({ txt: 'hello' }), true);
  assert.equal(Drafty.isDrafty({ txt: 'hello', fmt: [], ent: [] }), true);
  assert.equal(Drafty.isDrafty({ txt: 123 }), false);
});

test('Drafty: init & toPlainText', () => {
  const d = Drafty.init('Xin chao');
  assert.equal(d.txt, 'Xin chao');
  assert.deepEqual(d.fmt, []);
  assert.deepEqual(d.ent, []);
  assert.equal(Drafty.toPlainText(d), 'Xin chao');
  assert.equal(Drafty.toPlainText('plain'), 'plain');
  assert.equal(Drafty.toPlainText(null), '');
});

test('Drafty: parseFromMarkdown basic text styles', () => {
  // Bold
  const boldDoc = Drafty.parseFromMarkdown('Hello **World**!');
  assert.equal(boldDoc.txt, 'Hello World!');
  assert.equal(boldDoc.fmt.length, 1);
  assert.equal(boldDoc.fmt[0].tp, Drafty.STYLE_TYPES.ST);
  assert.equal(boldDoc.fmt[0].at, 6);
  assert.equal(boldDoc.fmt[0].len, 5);

  // Italic
  const italicDoc = Drafty.parseFromMarkdown('This is *italic* text');
  assert.equal(italicDoc.txt, 'This is italic text');
  assert.equal(italicDoc.fmt[0].tp, Drafty.STYLE_TYPES.EM);
  assert.equal(italicDoc.fmt[0].at, 8);
  assert.equal(italicDoc.fmt[0].len, 6);

  // Strikethrough
  const strikeDoc = Drafty.parseFromMarkdown('~~deprecated~~ feature');
  assert.equal(strikeDoc.txt, 'deprecated feature');
  assert.equal(strikeDoc.fmt[0].tp, Drafty.STYLE_TYPES.DL);
  assert.equal(strikeDoc.fmt[0].at, 0);
  assert.equal(strikeDoc.fmt[0].len, 10);

  // Inline Code
  const codeDoc = Drafty.parseFromMarkdown('Run `npm test` now');
  assert.equal(codeDoc.txt, 'Run npm test now');
  assert.equal(codeDoc.fmt[0].tp, Drafty.STYLE_TYPES.CO);
  assert.equal(codeDoc.fmt[0].at, 4);
  assert.equal(codeDoc.fmt[0].len, 8);

  // Highlight
  const hlDoc = Drafty.parseFromMarkdown('Note: ==urgent== task');
  assert.equal(hlDoc.txt, 'Note: urgent task');
  assert.equal(hlDoc.fmt[0].tp, Drafty.STYLE_TYPES.HL);
  assert.equal(hlDoc.fmt[0].at, 6);
  assert.equal(hlDoc.fmt[0].len, 6);
});

test('Drafty: parseFromMarkdown links, mentions and hashtags', () => {
  const md = 'Hello @alice check [Tinode](https://tinode.co) and #release today!';
  const doc = Drafty.parseFromMarkdown(md);

  assert.equal(doc.txt, 'Hello @alice check Tinode and #release today!');
  assert.equal(doc.ent.length, 3);

  // Check mention
  const mentionEnt = doc.ent.find(e => e.tp === Drafty.ENTITY_TYPES.MN);
  assert.ok(mentionEnt);
  assert.equal(mentionEnt.data.val, 'alice');

  // Check link
  const linkEnt = doc.ent.find(e => e.tp === Drafty.ENTITY_TYPES.LN);
  assert.ok(linkEnt);
  assert.equal(linkEnt.data.url, 'https://tinode.co');

  // Check hashtag
  const hashEnt = doc.ent.find(e => e.tp === Drafty.ENTITY_TYPES.HT);
  assert.ok(hashEnt);
  assert.equal(hashEnt.data.val, 'release');
});

test('Drafty: auto-links recognition', () => {
  const doc = Drafty.parseFromMarkdown('Visit https://github.com/tinode/chat for details');
  assert.equal(doc.txt, 'Visit https://github.com/tinode/chat for details');
  const linkEnt = doc.ent.find(e => e.tp === Drafty.ENTITY_TYPES.LN);
  assert.ok(linkEnt);
  assert.equal(linkEnt.data.url, 'https://github.com/tinode/chat');
});

test('Drafty: XSS sanitization against javascript: URLs', () => {
  const malicious = {
    txt: 'Click here',
    fmt: [{ at: 0, len: 10, key: 0 }],
    ent: [{ tp: 'LN', data: { url: 'javascript:alert(document.cookie)' } }]
  };

  const safe = Drafty.sanitize(malicious);
  assert.equal(safe.ent[0].data.url, 'about:blank');
});

test('Drafty: toTree AST conversion', () => {
  const doc = Drafty.parseFromMarkdown('**Hello** and *world*!');
  const tree = Drafty.toTree(doc);

  assert.ok(Array.isArray(tree));
  assert.ok(tree.length > 0);

  // First node should be bold 'Hello'
  assert.equal(tree[0].type, Drafty.STYLE_TYPES.ST);
  assert.equal(tree[0].children[0], 'Hello');

  // Second node should be text ' and '
  assert.equal(tree[1], ' and ');

  // Third node should be italic 'world'
  assert.equal(tree[2].type, Drafty.STYLE_TYPES.EM);
  assert.equal(tree[2].children[0], 'world');
});

test('Drafty: bounds checking on malformed offsets', () => {
  const malformed = {
    txt: 'short',
    fmt: [
      { at: 100, len: 10, tp: 'ST' }, // way beyond txt length
      { at: -5, len: 5, tp: 'EM' }    // negative offset
    ],
    ent: []
  };

  const clean = Drafty.sanitize(malformed);
  assert.equal(clean.fmt.length, 1);
  assert.equal(clean.fmt[0].at, 0); // clamped from -5 to 0
});
