/**
 * Tinode Wire Protocol Serializer & Packet Validator
 * 
 * Handles bidirectional packet encoding, schema validation,
 * sequence tracking, and status response parsing according to
 * Tinode 0.22+ Wire Protocol specifications.
 */

export const PROTOCOL_VERSION = '0.22';
export const CLIENT_VERSION = 'Tind/1.0.0';

// Server response status codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Topic name prefixes
export const TOPIC_TYPES = {
  ME: 'me',
  FND: 'fnd',
  SYS: 'sys',
  P2P: 'p2p',
  GROUP: 'grp',
};

// Monotonically increasing message ID generator
let msgCounter = 0;
export function generateMsgId() {
  msgCounter += 1;
  return `msg_${Date.now()}_${msgCounter}`;
}

/**
 * Determine topic type based on name
 */
export function getTopicType(topicName) {
  if (!topicName || typeof topicName !== 'string') return null;
  if (topicName === 'me') return TOPIC_TYPES.ME;
  if (topicName === 'fnd') return TOPIC_TYPES.FND;
  if (topicName === 'sys') return TOPIC_TYPES.SYS;
  if (topicName.startsWith('usr')) return TOPIC_TYPES.P2P;
  if (topicName.startsWith('grp')) return TOPIC_TYPES.GROUP;
  return 'custom';
}

/**
 * Create Handshake {hi} packet
 */
export function createHiPacket(customUa = CLIENT_VERSION, dev = null) {
  const packet = {
    hi: {
      id: generateMsgId(),
      ver: PROTOCOL_VERSION,
      ua: customUa,
      lang: 'en-US'
    }
  };
  if (dev) packet.hi.dev = dev;
  return packet;
}

/**
 * Create Login {login} packet
 * @param {'basic'|'token'|'secret'} scheme
 * @param {string} secret
 */
export function createLoginPacket(scheme, secret, cred = null) {
  const packet = {
    login: {
      id: generateMsgId(),
      scheme: scheme || 'token',
      secret: secret || ''
    }
  };
  if (cred) packet.login.cred = cred;
  return packet;
}

/**
 * Create Topic Subscribe {sub} packet
 */
export function createSubPacket(topic, get = { what: 'desc sub data' }, bkg = false) {
  return {
    sub: {
      id: generateMsgId(),
      topic,
      bkg: Boolean(bkg),
      get: get || { what: 'desc sub data' }
    }
  };
}

/**
 * Create Topic Leave/Detach {leave} packet
 */
export function createLeavePacket(topic, unsub = false) {
  return {
    leave: {
      id: generateMsgId(),
      topic,
      unsub: Boolean(unsub)
    }
  };
}

/**
 * Create Publish {pub} packet
 * @param {string} topic
 * @param {string|object} content (plain text or Drafty object)
 * @param {boolean} noecho
 */
export function createPubPacket(topic, content, noecho = false, head = null) {
  const packet = {
    pub: {
      id: generateMsgId(),
      topic,
      noecho: Boolean(noecho),
      content
    }
  };
  if (head && typeof head === 'object') {
    packet.pub.head = head;
  }
  return packet;
}

/**
 * Create Status / Typing Note {note} packet
 * @param {string} topic
 * @param {'kp'|'read'|'recv'} what
 * @param {number} seq
 */
export function createNotePacket(topic, what, seq = null) {
  const packet = {
    note: {
      topic,
      what
    }
  };
  if (typeof seq === 'number') {
    packet.note.seq = seq;
  }
  return packet;
}

/**
 * Create Query {get} packet
 */
export function createGetPacket(topic, what = 'desc sub data', params = {}) {
  return {
    get: {
      id: generateMsgId(),
      topic,
      what,
      ...params
    }
  };
}

/**
 * Create Metadata Update {set} packet
 */
export function createSetPacket(topic, desc = null, sub = null, tags = null) {
  const packet = {
    set: {
      id: generateMsgId(),
      topic
    }
  };
  if (desc) packet.set.desc = desc;
  if (sub) packet.set.sub = sub;
  if (tags) packet.set.tags = tags;
  return packet;
}

/**
 * Parse and classify a raw incoming server packet (string or object)
 * Returns { type: 'ctrl'|'data'|'meta'|'pres'|'info'|'unknown', payload: object }
 */
export function parseServerPacket(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return { type: 'error', error: 'Invalid JSON', raw };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { type: 'unknown', payload: parsed };
  }

  if (parsed.ctrl) return { type: 'ctrl', payload: parsed.ctrl };
  if (parsed.data) return { type: 'data', payload: parsed.data };
  if (parsed.meta) return { type: 'meta', payload: parsed.meta };
  if (parsed.pres) return { type: 'pres', payload: parsed.pres };
  if (parsed.info) return { type: 'info', payload: parsed.info };

  return { type: 'unknown', payload: parsed };
}
