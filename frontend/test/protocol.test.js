import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOCOL_VERSION,
  CLIENT_VERSION,
  STATUS_CODES,
  generateMsgId,
  getTopicType,
  createHiPacket,
  createLoginPacket,
  createSubPacket,
  createLeavePacket,
  createPubPacket,
  createNotePacket,
  createGetPacket,
  createSetPacket,
  parseServerPacket
} from '../src/protocol/tinodeProtocol.js';

test('Protocol: generateMsgId monotonic uniqueness', () => {
  const id1 = generateMsgId();
  const id2 = generateMsgId();
  const id3 = generateMsgId();

  assert.notEqual(id1, id2);
  assert.notEqual(id2, id3);
  assert.match(id1, /^msg_\d+_\d+$/);
});

test('Protocol: getTopicType classification', () => {
  assert.equal(getTopicType('me'), 'me');
  assert.equal(getTopicType('fnd'), 'fnd');
  assert.equal(getTopicType('sys'), 'sys');
  assert.equal(getTopicType('usr2il9suCbuko'), 'p2p');
  assert.equal(getTopicType('grpYiqEXb4QY6s'), 'grp');
  assert.equal(getTopicType('other'), 'custom');
  assert.equal(getTopicType(null), null);
});

test('Protocol: createHiPacket format', () => {
  const packet = createHiPacket('CustomApp/1.0', 'web-client');
  assert.ok(packet.hi);
  assert.equal(packet.hi.ver, PROTOCOL_VERSION);
  assert.equal(packet.hi.ua, 'CustomApp/1.0');
  assert.equal(packet.hi.dev, 'web-client');
  assert.ok(packet.hi.id);
});

test('Protocol: createLoginPacket format', () => {
  const packet = createLoginPacket('token', 'secret_jwt_token_123');
  assert.ok(packet.login);
  assert.equal(packet.login.scheme, 'token');
  assert.equal(packet.login.secret, 'secret_jwt_token_123');
  assert.ok(packet.login.id);
});

test('Protocol: createSubPacket format', () => {
  const packet = createSubPacket('usr12345', { what: 'desc sub data' });
  assert.ok(packet.sub);
  assert.equal(packet.sub.topic, 'usr12345');
  assert.equal(packet.sub.get.what, 'desc sub data');
  assert.equal(packet.sub.bkg, false);
});

test('Protocol: createPubPacket format', () => {
  const packet = createPubPacket('usr12345', 'Hello World', false, { mime: 'text/plain' });
  assert.ok(packet.pub);
  assert.equal(packet.pub.topic, 'usr12345');
  assert.equal(packet.pub.content, 'Hello World');
  assert.equal(packet.pub.noecho, false);
  assert.equal(packet.pub.head.mime, 'text/plain');
});

test('Protocol: createNotePacket format', () => {
  const typingNote = createNotePacket('usr12345', 'kp');
  assert.ok(typingNote.note);
  assert.equal(typingNote.note.topic, 'usr12345');
  assert.equal(typingNote.note.what, 'kp');
  assert.equal(typingNote.note.seq, undefined);

  const readNote = createNotePacket('usr12345', 'read', 42);
  assert.equal(readNote.note.what, 'read');
  assert.equal(readNote.note.seq, 42);
});

test('Protocol: parseServerPacket classification', () => {
  // Parse {ctrl}
  const ctrlPacket = parseServerPacket(JSON.stringify({
    ctrl: { id: 'msg_1', topic: 'me', code: 200, text: 'ok' }
  }));
  assert.equal(ctrlPacket.type, 'ctrl');
  assert.equal(ctrlPacket.payload.code, 200);

  // Parse {data}
  const dataPacket = parseServerPacket(JSON.stringify({
    data: { topic: 'usr123', from: 'usr456', seq: 10, content: 'Hi' }
  }));
  assert.equal(dataPacket.type, 'data');
  assert.equal(dataPacket.payload.seq, 10);
  assert.equal(dataPacket.payload.content, 'Hi');

  // Parse {meta}
  const metaPacket = parseServerPacket({
    meta: { topic: 'grpABC', desc: { public: { fn: 'General Chat' } } }
  });
  assert.equal(metaPacket.type, 'meta');
  assert.equal(metaPacket.payload.desc.public.fn, 'General Chat');

  // Parse {pres}
  const presPacket = parseServerPacket({
    pres: { topic: 'me', src: 'usr123', what: 'on' }
  });
  assert.equal(presPacket.type, 'pres');
  assert.equal(presPacket.payload.what, 'on');

  // Parse {info}
  const infoPacket = parseServerPacket({
    info: { topic: 'usr123', from: 'usr456', what: 'kp' }
  });
  assert.equal(infoPacket.type, 'info');
  assert.equal(infoPacket.payload.what, 'kp');

  // Invalid JSON
  const invalid = parseServerPacket('{ malformed: ');
  assert.equal(invalid.type, 'error');
});
