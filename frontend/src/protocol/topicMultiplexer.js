/**
 * Topic Multiplexer & Offline Queue Manager
 * 
 * Manages topic lifecycle, message history ordering, sequence tracking (seq),
 * presence, typing indicators, optimistic UI updates, and offline message queueing.
 */

import { getTopicType, TOPIC_TYPES } from './tinodeProtocol.js';

export const TOPIC_STATE = {
  UNSUBSCRIBED: 'unsubscribed',
  SUBSCRIBING: 'subscribing',
  SUBSCRIBED: 'subscribed',
  SUSPENDED: 'suspended',
};

export const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  RECEIVED: 'received',
};

export class Topic {
  constructor(name, options = {}) {
    this.name = name;
    this.type = getTopicType(name);
    this.state = TOPIC_STATE.UNSUBSCRIBED;
    this.options = options;

    // Sequence tracking
    this.maxSeq = 0;
    this.readSeq = 0;
    this.recvSeq = 0;

    // Metadata & members
    this.meta = {
      desc: {},
      sub: []
    };

    // Message store: array of messages sorted by seq
    this.messages = [];
    this.messageIdMap = new Map(); // id -> message

    // Typing status: userId -> timer
    this.typingTimers = new Map();

    // Offline / Pending outgoing queue
    this.pendingQueue = [];
  }

  /**
   * Set topic subscription state
   */
  setState(newState) {
    this.state = newState;
  }

  /**
   * Set metadata
   */
  setMeta(desc, sub) {
    if (desc) this.meta.desc = { ...this.meta.desc, ...desc };
    if (sub) this.meta.sub = sub;
  }

  /**
   * Add a delivered message {data} from server
   */
  addMessage(dataPacket) {
    const seq = dataPacket.seq || 0;
    const msgId = dataPacket.id || `srv_${seq}`;

    // Update sequence
    if (seq > this.maxSeq) {
      this.maxSeq = seq;
    }

    // Check if this fulfills an optimistic pending message
    if (dataPacket.id && this.messageIdMap.has(dataPacket.id)) {
      const pendingMsg = this.messageIdMap.get(dataPacket.id);
      pendingMsg.seq = seq;
      pendingMsg.ts = dataPacket.ts || pendingMsg.ts;
      pendingMsg.status = MESSAGE_STATUS.SENT;
      pendingMsg.content = dataPacket.content || pendingMsg.content;
      return pendingMsg;
    }

    // Check for deduplication by seq
    if (seq > 0) {
      const existing = this.messages.find(m => m.seq === seq);
      if (existing) {
        return existing;
      }
    }

    const newMsg = {
      id: msgId,
      topic: this.name,
      from: dataPacket.from,
      seq,
      ts: dataPacket.ts || new Date().toISOString(),
      content: dataPacket.content,
      head: dataPacket.head || {},
      status: MESSAGE_STATUS.RECEIVED,
    };

    this.messages.push(newMsg);
    this.messageIdMap.set(msgId, newMsg);

    // Keep sorted by seq
    this.messages.sort((a, b) => {
      if (a.seq && b.seq) return a.seq - b.seq;
      return new Date(a.ts).getTime() - new Date(b.ts).getTime();
    });

    return newMsg;
  }

  /**
   * Create an optimistic message in pending state
   */
  createOptimisticMessage(msgId, from, content) {
    const optimisticMsg = {
      id: msgId,
      topic: this.name,
      from,
      seq: 0,
      ts: new Date().toISOString(),
      content,
      status: MESSAGE_STATUS.PENDING,
      isOptimistic: true
    };

    this.messages.push(optimisticMsg);
    this.messageIdMap.set(msgId, optimisticMsg);
    this.pendingQueue.push(optimisticMsg);

    return optimisticMsg;
  }

  /**
   * Acknowledge a pending message with server seq
   */
  acknowledgeMessage(msgId, seq, ts) {
    const msg = this.messageIdMap.get(msgId);
    if (msg) {
      msg.seq = seq;
      if (ts) msg.ts = ts;
      msg.status = MESSAGE_STATUS.SENT;
      msg.isOptimistic = false;
      if (seq > this.maxSeq) {
        this.maxSeq = seq;
      }
    }

    // Remove from pending queue
    this.pendingQueue = this.pendingQueue.filter(m => m.id !== msgId);
    return msg;
  }

  /**
   * Mark message as failed
   */
  markMessageFailed(msgId, error) {
    const msg = this.messageIdMap.get(msgId);
    if (msg) {
      msg.status = MESSAGE_STATUS.FAILED;
      msg.error = error;
    }
    return msg;
  }

  /**
   * Handle user typing note
   */
  setTyping(userId, onExpire) {
    if (this.typingTimers.has(userId)) {
      clearTimeout(this.typingTimers.get(userId));
    }

    const timer = setTimeout(() => {
      this.typingTimers.delete(userId);
      if (typeof onExpire === 'function') {
        onExpire(this.name, userId);
      }
    }, 3500);

    this.typingTimers.set(userId, timer);
  }

  /**
   * Clear typing state for user
   */
  clearTyping(userId) {
    if (this.typingTimers.has(userId)) {
      clearTimeout(this.typingTimers.get(userId));
      this.typingTimers.delete(userId);
    }
  }

  /**
   * Get list of currently typing user IDs
   */
  getTypingUsers() {
    return Array.from(this.typingTimers.keys());
  }

  /**
   * Clear all resources on topic destruction
   */
  destroy() {
    for (const timer of this.typingTimers.values()) {
      clearTimeout(timer);
    }
    this.typingTimers.clear();
    this.pendingQueue = [];
  }
}

/**
 * TopicMultiplexer manages multiple active topics for a client
 */
export class TopicMultiplexer {
  constructor() {
    this.topics = new Map(); // topicName -> Topic
    this.listeners = new Map(); // event -> Set of callbacks
  }

  /**
   * Get or create topic instance
   */
  getOrCreateTopic(topicName) {
    if (!this.topics.has(topicName)) {
      this.topics.set(topicName, new Topic(topicName));
    }
    return this.topics.get(topicName);
  }

  /**
   * Get existing topic
   */
  getTopic(topicName) {
    return this.topics.get(topicName) || null;
  }

  /**
   * Remove topic
   */
  removeTopic(topicName) {
    const topic = this.topics.get(topicName);
    if (topic) {
      topic.destroy();
      this.topics.delete(topicName);
      this.emit('topicRemoved', { topic: topicName });
    }
  }

  /**
   * Handle incoming server {data} packet
   */
  handleData(dataPacket) {
    if (!dataPacket || !dataPacket.topic) return null;
    const topic = this.getOrCreateTopic(dataPacket.topic);
    const msg = topic.addMessage(dataPacket);
    this.emit('message', { topic: topic.name, message: msg });
    return msg;
  }

  /**
   * Handle incoming server {info} packet (typing or read receipt)
   */
  handleInfo(infoPacket) {
    if (!infoPacket || !infoPacket.topic) return;
    const topic = this.getOrCreateTopic(infoPacket.topic);

    if (infoPacket.what === 'kp') {
      topic.setTyping(infoPacket.from, (topicName, userId) => {
        this.emit('typing', { topic: topicName, user: userId, isTyping: false });
      });
      this.emit('typing', { topic: topic.name, user: infoPacket.from, isTyping: true });
    } else if (infoPacket.what === 'read') {
      if (typeof infoPacket.seq === 'number' && infoPacket.seq > topic.readSeq) {
        topic.readSeq = infoPacket.seq;
        this.emit('readReceipt', { topic: topic.name, user: infoPacket.from, seq: infoPacket.seq });
      }
    }
  }

  /**
   * Handle incoming server {meta} packet
   */
  handleMeta(metaPacket) {
    if (!metaPacket || !metaPacket.topic) return;
    const topic = this.getOrCreateTopic(metaPacket.topic);
    topic.setMeta(metaPacket.desc, metaPacket.sub);
    this.emit('meta', { topic: topic.name, desc: metaPacket.desc, sub: metaPacket.sub });
  }

  /**
   * Event listener registration
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener ${event}:`, err);
        }
      }
    }
  }

  /**
   * Get all pending messages across all topics
   */
  getAllPendingMessages() {
    const pending = [];
    for (const topic of this.topics.values()) {
      pending.push(...topic.pendingQueue);
    }
    return pending;
  }

  /**
   * Clear all topics and listeners
   */
  reset() {
    for (const topic of this.topics.values()) {
      topic.destroy();
    }
    this.topics.clear();
    this.listeners.clear();
  }
}
