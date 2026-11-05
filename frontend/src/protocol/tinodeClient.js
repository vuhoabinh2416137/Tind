/**
 * Tinode Real-Time Client Engine
 * 
 * Provides an enterprise-grade client connection manager:
 * - Exponential backoff auto-reconnect with jitter
 * - Heartbeat ping/pong connection health watchdog
 * - Full Tinode handshake & auth lifecycle
 * - Offline message queueing & automatic replay upon reconnect
 * - Topic pub/sub state machine and event dispatching
 */

import {
  createHiPacket,
  createLoginPacket,
  createSubPacket,
  createLeavePacket,
  createPubPacket,
  createNotePacket,
  parseServerPacket,
  STATUS_CODES,
  generateMsgId
} from './tinodeProtocol.js';
import { TopicMultiplexer, MESSAGE_STATUS, TOPIC_STATE } from './topicMultiplexer.js';
import * as Drafty from './drafty.js';

export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  RECONNECTING: 'reconnecting',
};

export class TinodeClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || '';
    this.apiKey = options.apiKey || 'AQEAAAABAAD_rAp4DJh05a1HAAB0E2sk';
    this.customUa = options.customUa || 'Tind/1.0.0 Web';
    this.WebSocketClass = options.WebSocketClass || (typeof WebSocket !== 'undefined' ? WebSocket : null);

    this.connectionState = CONNECTION_STATE.DISCONNECTED;
    this.socket = null;
    this.authToken = null;
    this.currentUser = null;

    this.multiplexer = new TopicMultiplexer();

    // Reconnection parameters
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.baseReconnectDelay = options.baseReconnectDelay || 1000;
    this.reconnectTimer = null;
    this.autoReconnect = options.autoReconnect !== false;

    // Heartbeat ping timer
    this.pingIntervalMs = options.pingIntervalMs || 25000;
    this.pingTimer = null;

    // Pending RPC promises: id -> { resolve, reject, timer }
    this.pendingRequests = new Map();

    // Event listeners
    this.listeners = new Map();

    // Forward multiplexer events
    this.multiplexer.on('message', data => this.emit('message', data));
    this.multiplexer.on('typing', data => this.emit('typing', data));
    this.multiplexer.on('readReceipt', data => this.emit('readReceipt', data));
    this.multiplexer.on('meta', data => this.emit('meta', data));
  }

  /**
   * Set connection state and notify
   */
  setConnectionState(state, details = {}) {
    this.connectionState = state;
    this.emit('connectionChange', { state, ...details });
  }

  /**
   * Connect to Tinode server
   */
  connect(url = this.serverUrl) {
    if (url) this.serverUrl = url;
    if (!this.serverUrl) {
      return Promise.reject(new Error('Server URL is required to connect'));
    }

    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      return Promise.resolve();
    }

    if (!this.WebSocketClass) {
      return Promise.reject(new Error('WebSocket implementation not available in this environment'));
    }

    this.setConnectionState(CONNECTION_STATE.CONNECTING);

    return new Promise((resolve, reject) => {
      let isResolved = false;

      try {
        this.socket = new this.WebSocketClass(this.serverUrl);
      } catch (err) {
        this.setConnectionState(CONNECTION_STATE.DISCONNECTED, { error: err.message });
        return reject(err);
      }

      this.socket.onopen = async () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Perform {hi} handshake
        try {
          const hiPacket = createHiPacket(this.customUa);
          const hiRes = await this.sendPacket(hiPacket);
          this.setConnectionState(CONNECTION_STATE.CONNECTED, { info: hiRes });

          // If we had an auth token, re-login
          if (this.authToken) {
            await this.loginWithToken(this.authToken);
          }

          if (!isResolved) {
            isResolved = true;
            resolve(hiRes);
          }
        } catch (err) {
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        }
      };

      this.socket.onmessage = (event) => {
        this.handleRawMessage(event.data);
      };

      this.socket.onerror = (err) => {
        this.emit('error', err);
        if (!isResolved) {
          isResolved = true;
          reject(err);
        }
      };

      this.socket.onclose = (event) => {
        this.stopHeartbeat();
        const wasAuth = this.connectionState === CONNECTION_STATE.AUTHENTICATED;
        this.setConnectionState(CONNECTION_STATE.DISCONNECTED, { code: event.code, reason: event.reason });

        if (this.autoReconnect && event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    });
  }

  /**
   * Handle raw incoming message from WebSocket
   */
  handleRawMessage(raw) {
    const packet = parseServerPacket(raw);

    switch (packet.type) {
      case 'ctrl':
        this.handleCtrlPacket(packet.payload);
        break;
      case 'data':
        this.multiplexer.handleData(packet.payload);
        break;
      case 'info':
        this.multiplexer.handleInfo(packet.payload);
        break;
      case 'meta':
        this.multiplexer.handleMeta(packet.payload);
        break;
      case 'pres':
        this.handlePresPacket(packet.payload);
        break;
      default:
        this.emit('rawPacket', packet);
        break;
    }
  }

  /**
   * Handle server {ctrl} responses for RPC matching
   */
  handleCtrlPacket(ctrl) {
    const reqId = ctrl.id;
    if (reqId && this.pendingRequests.has(reqId)) {
      const { resolve, reject, timer, packet } = this.pendingRequests.get(reqId);
      clearTimeout(timer);
      this.pendingRequests.delete(reqId);

      // Status 200..299 is success
      if (ctrl.code >= 200 && ctrl.code < 300) {
        // If this was a {pub} packet, acknowledge in topic
        if (packet && packet.pub && ctrl.params && ctrl.params.seq) {
          const topic = this.multiplexer.getTopic(packet.pub.topic);
          if (topic) {
            topic.acknowledgeMessage(packet.pub.id, ctrl.params.seq, ctrl.ts);
          }
        }
        resolve(ctrl);
      } else {
        if (packet && packet.pub) {
          const topic = this.multiplexer.getTopic(packet.pub.topic);
          if (topic) {
            topic.markMessageFailed(packet.pub.id, ctrl.text || 'Send failed');
          }
        }
        reject(new Error(`Server error [${ctrl.code}]: ${ctrl.text || 'Unknown'}`));
      }
    }
  }

  /**
   * Handle presence notification {pres}
   */
  handlePresPacket(pres) {
    this.emit('presence', pres);
  }

  /**
   * Send a packet over the socket and return a Promise resolved by {ctrl}
   */
  sendPacket(packet, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== 1) {
        return reject(new Error('WebSocket is not connected'));
      }

      // Extract packet request ID
      const innerKey = Object.keys(packet)[0];
      const reqId = packet[innerKey]?.id;

      if (reqId) {
        const timer = setTimeout(() => {
          if (this.pendingRequests.has(reqId)) {
            this.pendingRequests.delete(reqId);
            reject(new Error(`Request ${reqId} timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);

        this.pendingRequests.set(reqId, { resolve, reject, timer, packet });
      }

      const jsonStr = JSON.stringify(packet);
      this.socket.send(jsonStr);

      if (!reqId) {
        resolve({ sent: true });
      }
    });
  }

  /**
   * Authenticate with basic credentials (username, password)
   */
  async loginBasic(username, password) {
    const secret = `${username}:${password}`;
    const packet = createLoginPacket('basic', secret);
    const ctrl = await this.sendPacket(packet);

    if (ctrl.params && ctrl.params.token) {
      this.authToken = ctrl.params.token;
      this.currentUser = {
        id: ctrl.params.user,
        username
      };
      this.setConnectionState(CONNECTION_STATE.AUTHENTICATED, { user: this.currentUser });
      this.flushOfflineQueue();
    }
    return ctrl;
  }

  /**
   * Authenticate with existing auth token
   */
  async loginWithToken(token) {
    this.authToken = token;
    const packet = createLoginPacket('token', token);
    const ctrl = await this.sendPacket(packet);

    if (ctrl.params) {
      this.currentUser = {
        id: ctrl.params.user,
        token
      };
      this.setConnectionState(CONNECTION_STATE.AUTHENTICATED, { user: this.currentUser });
      this.flushOfflineQueue();
    }
    return ctrl;
  }

  /**
   * Subscribe to a topic (e.g. 'me', 'usr...', 'grp...')
   */
  async subscribe(topicName, get = { what: 'desc sub data' }) {
    const topic = this.multiplexer.getOrCreateTopic(topicName);
    topic.setState(TOPIC_STATE.SUBSCRIBING);

    const packet = createSubPacket(topicName, get);
    try {
      const ctrl = await this.sendPacket(packet);
      topic.setState(TOPIC_STATE.SUBSCRIBED);
      return { topic, ctrl };
    } catch (err) {
      topic.setState(TOPIC_STATE.UNSUBSCRIBED);
      throw err;
    }
  }

  /**
   * Leave or detach from a topic
   */
  async leave(topicName, unsub = false) {
    const packet = createLeavePacket(topicName, unsub);
    const ctrl = await this.sendPacket(packet);
    const topic = this.multiplexer.getTopic(topicName);
    if (topic) {
      topic.setState(TOPIC_STATE.UNSUBSCRIBED);
      if (unsub) {
        this.multiplexer.removeTopic(topicName);
      }
    }
    return ctrl;
  }

  /**
   * Publish a message to a topic (supports plain text or Drafty)
   */
  async publish(topicName, content, options = {}) {
    const topic = this.multiplexer.getOrCreateTopic(topicName);
    const msgId = generateMsgId();

    // Parse content into Drafty if string with markdown
    const draftyContent = typeof content === 'string'
      ? Drafty.parseFromMarkdown(content)
      : content;

    // Optimistically add to local store
    const optimisticMsg = topic.createOptimisticMessage(
      msgId,
      this.currentUser?.id || 'me',
      draftyContent
    );
    this.emit('message', { topic: topicName, message: optimisticMsg });

    // If offline, message stays in topic.pendingQueue until reconnection
    if (this.connectionState !== CONNECTION_STATE.AUTHENTICATED && this.connectionState !== CONNECTION_STATE.CONNECTED) {
      return optimisticMsg;
    }

    const packet = createPubPacket(topicName, draftyContent, options.noecho, options.head);
    packet.pub.id = msgId;

    try {
      await this.sendPacket(packet);
      return optimisticMsg;
    } catch (err) {
      topic.markMessageFailed(msgId, err.message);
      this.emit('message', { topic: topicName, message: optimisticMsg });
      throw err;
    }
  }

  /**
   * Send typing notification note
   */
  sendTyping(topicName) {
    if (this.connectionState !== CONNECTION_STATE.AUTHENTICATED && this.connectionState !== CONNECTION_STATE.CONNECTED) {
      return;
    }
    const packet = createNotePacket(topicName, 'kp');
    this.socket.send(JSON.stringify(packet));
  }

  /**
   * Send read receipt note
   */
  sendReadReceipt(topicName, seq) {
    if (this.connectionState !== CONNECTION_STATE.AUTHENTICATED && this.connectionState !== CONNECTION_STATE.CONNECTED) {
      return;
    }
    const packet = createNotePacket(topicName, 'read', seq);
    this.socket.send(JSON.stringify(packet));
  }

  /**
   * Flush all offline queued messages upon reconnection
   */
  async flushOfflineQueue() {
    const pending = this.multiplexer.getAllPendingMessages();
    if (pending.length === 0) return;

    for (const msg of pending) {
      try {
        const packet = createPubPacket(msg.topic, msg.content);
        packet.pub.id = msg.id;
        await this.sendPacket(packet);
      } catch (err) {
        console.error(`Failed to flush message ${msg.id}:`, err);
      }
    }
  }

  /**
   * Exponential backoff reconnect
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectAttempts += 1;
    this.setConnectionState(CONNECTION_STATE.RECONNECTING, { attempt: this.reconnectAttempts });

    // Calculate delay with exponential backoff and jitter
    const delay = Math.min(
      this.maxReconnectDelay,
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    ) + Math.floor(Math.random() * 500);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(err => {
        console.warn('Reconnection attempt failed:', err.message);
      });
    }, delay);
  }

  /**
   * Start periodic heartbeat watchdog
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === 1) {
        const note = createNotePacket('sys', 'kp');
        this.socket.send(JSON.stringify(note));
      }
    }, this.pingIntervalMs);
  }

  /**
   * Stop heartbeat watchdog
   */
  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Disconnect client and clean up
   */
  disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    // Reject pending requests
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timer);
      req.reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();

    if (this.socket) {
      this.socket.close(1000, 'Client closed');
      this.socket = null;
    }
    this.setConnectionState(CONNECTION_STATE.DISCONNECTED);
  }

  /**
   * Event emitter registration
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
          console.error(`Error in TinodeClient listener ${event}:`, err);
        }
      }
    }
  }
}
