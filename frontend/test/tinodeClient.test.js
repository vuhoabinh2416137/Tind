import test from 'node:test';
import assert from 'node:assert/strict';
import { TinodeClient, CONNECTION_STATE } from '../src/protocol/tinodeClient.js';
import { MESSAGE_STATUS, TOPIC_STATE } from '../src/protocol/topicMultiplexer.js';

// Simple EventEmitter / Mock WebSocket for testing without network
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.sentPackets = [];

    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data) {
    const packet = JSON.parse(data);
    this.sentPackets.push(packet);

    // Auto-respond to {hi}
    if (packet.hi) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              ctrl: { id: packet.hi.id, code: 200, text: 'hi ok', params: { ver: '0.22' } }
            })
          });
        }
      }, 5);
    }

    // Auto-respond to {login}
    if (packet.login) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              ctrl: {
                id: packet.login.id,
                code: 200,
                text: 'ok',
                params: { token: 'mock_jwt_token', user: 'usrCurrent' }
              }
            })
          });
        }
      }, 5);
    }

    // Auto-respond to {sub}
    if (packet.sub) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              ctrl: { id: packet.sub.id, topic: packet.sub.topic, code: 200, text: 'subscribed' }
            })
          });
        }
      }, 5);
    }

    // Auto-respond to {pub}
    if (packet.pub) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              ctrl: {
                id: packet.pub.id,
                topic: packet.pub.topic,
                code: 200,
                text: 'published',
                params: { seq: 42 },
                ts: new Date().toISOString()
              }
            })
          });
        }
      }, 5);
    }
  }

  close(code = 1000, reason = '') {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code, reason });
  }
}

test('TinodeClient: lifecycle connect, login and subscribe', async () => {
  const client = new TinodeClient({
    serverUrl: 'wss://tinode.example.com/v0/channels',
    WebSocketClass: MockWebSocket,
    autoReconnect: false
  });

  assert.equal(client.connectionState, CONNECTION_STATE.DISCONNECTED);

  // 1. Connect
  await client.connect();
  assert.equal(client.connectionState, CONNECTION_STATE.CONNECTED);

  // 2. Login
  const loginRes = await client.loginBasic('alice', 'secret123');
  assert.equal(loginRes.code, 200);
  assert.equal(client.connectionState, CONNECTION_STATE.AUTHENTICATED);
  assert.equal(client.currentUser.id, 'usrCurrent');
  assert.equal(client.authToken, 'mock_jwt_token');

  // 3. Subscribe
  const { topic, ctrl } = await client.subscribe('usrBob');
  assert.equal(ctrl.code, 200);
  assert.equal(topic.state, TOPIC_STATE.SUBSCRIBED);

  // 4. Publish message
  const optimisticMsg = await client.publish('usrBob', 'Hello **Bob**!');
  assert.ok(optimisticMsg);
  assert.equal(optimisticMsg.topic, 'usrBob');

  // Wait for mock ack
  await new Promise(r => setTimeout(r, 20));

  const acknowledgedMsg = topic.messages.find(m => m.id === optimisticMsg.id);
  assert.ok(acknowledgedMsg);
  assert.equal(acknowledgedMsg.status, MESSAGE_STATUS.SENT);
  assert.equal(acknowledgedMsg.seq, 42);

  client.disconnect();
  assert.equal(client.connectionState, CONNECTION_STATE.DISCONNECTED);
});

test('TinodeClient: offline message queueing and replay', async () => {
  const client = new TinodeClient({
    serverUrl: 'wss://tinode.example.com/v0/channels',
    WebSocketClass: MockWebSocket,
    autoReconnect: false
  });

  // Client is disconnected: publish message
  const queuedMsg = await client.publish('grpTeam', 'Offline notice');
  assert.equal(queuedMsg.status, MESSAGE_STATUS.PENDING);

  const topic = client.multiplexer.getTopic('grpTeam');
  assert.equal(topic.pendingQueue.length, 1);

  // Now connect and login -> should automatically flush offline queue
  await client.connect();
  await client.loginWithToken('valid_token');

  // Wait for queue flush and ack
  await new Promise(r => setTimeout(r, 40));

  assert.equal(topic.pendingQueue.length, 0);
  assert.equal(queuedMsg.status, MESSAGE_STATUS.SENT);

  client.disconnect();
});
