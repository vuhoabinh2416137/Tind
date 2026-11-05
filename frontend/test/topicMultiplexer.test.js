import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Topic,
  TopicMultiplexer,
  TOPIC_STATE,
  MESSAGE_STATUS
} from '../src/protocol/topicMultiplexer.js';

test('TopicMultiplexer: create and fetch topic', () => {
  const mux = new TopicMultiplexer();
  const topic = mux.getOrCreateTopic('usr123');

  assert.ok(topic);
  assert.equal(topic.name, 'usr123');
  assert.equal(topic.type, 'p2p');
  assert.equal(topic.state, TOPIC_STATE.UNSUBSCRIBED);

  const sameTopic = mux.getTopic('usr123');
  assert.equal(sameTopic, topic);
});

test('TopicMultiplexer: message deduplication and sequence sorting', () => {
  const mux = new TopicMultiplexer();
  const topic = mux.getOrCreateTopic('grpGeneral');

  // Add message seq 2
  topic.addMessage({
    id: 'm2',
    topic: 'grpGeneral',
    from: 'usrA',
    seq: 2,
    ts: '2026-11-05T12:00:02Z',
    content: 'Second message'
  });

  // Add message seq 1 (out of order delivery)
  topic.addMessage({
    id: 'm1',
    topic: 'grpGeneral',
    from: 'usrB',
    seq: 1,
    ts: '2026-11-05T12:00:01Z',
    content: 'First message'
  });

  // Duplicate delivery of seq 1
  topic.addMessage({
    id: 'm1_dup',
    topic: 'grpGeneral',
    from: 'usrB',
    seq: 1,
    ts: '2026-11-05T12:00:01Z',
    content: 'First message duplicate'
  });

  // Should have exactly 2 messages, ordered seq 1 then seq 2
  assert.equal(topic.messages.length, 2);
  assert.equal(topic.messages[0].seq, 1);
  assert.equal(topic.messages[0].content, 'First message');
  assert.equal(topic.messages[1].seq, 2);
  assert.equal(topic.messages[1].content, 'Second message');
  assert.equal(topic.maxSeq, 2);
});

test('TopicMultiplexer: optimistic message lifecycle', () => {
  const mux = new TopicMultiplexer();
  const topic = mux.getOrCreateTopic('usrBob');

  // 1. Create optimistic message
  const optMsg = topic.createOptimisticMessage('client_msg_101', 'me', 'Hello Bob');
  assert.equal(optMsg.status, MESSAGE_STATUS.PENDING);
  assert.equal(optMsg.seq, 0);
  assert.equal(topic.pendingQueue.length, 1);

  // 2. Acknowledge with server seq
  topic.acknowledgeMessage('client_msg_101', 5, '2026-11-05T12:05:00Z');
  assert.equal(optMsg.status, MESSAGE_STATUS.SENT);
  assert.equal(optMsg.seq, 5);
  assert.equal(topic.maxSeq, 5);
  assert.equal(topic.pendingQueue.length, 0);
});

test('TopicMultiplexer: typing indicators and expiration', async () => {
  const mux = new TopicMultiplexer();
  const topic = mux.getOrCreateTopic('usrAlice');

  let expired = false;
  topic.setTyping('alice', () => {
    expired = true;
  });

  assert.deepEqual(topic.getTypingUsers(), ['alice']);

  // Clear typing explicitly
  topic.clearTyping('alice');
  assert.deepEqual(topic.getTypingUsers(), []);
});

test('TopicMultiplexer: event emission on message receipt', () => {
  const mux = new TopicMultiplexer();
  let receivedEvent = null;

  mux.on('message', data => {
    receivedEvent = data;
  });

  mux.handleData({
    topic: 'grpDev',
    from: 'usrJohn',
    seq: 10,
    content: 'Code review ready'
  });

  assert.ok(receivedEvent);
  assert.equal(receivedEvent.topic, 'grpDev');
  assert.equal(receivedEvent.message.seq, 10);
  assert.equal(receivedEvent.message.content, 'Code review ready');
});
