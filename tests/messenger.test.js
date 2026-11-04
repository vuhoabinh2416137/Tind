import { io as Client } from 'socket.io-client';
import { app, server, io } from '../server/index.js';

let clientSocket1;
let clientSocket2;
const TEST_PORT = 3001;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🧪 Starting Messenger Online & Deployment Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check for cloud monitoring
    console.log('1. Testing Cloud Health & Infrastructure Endpoints:');
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
    const health = await healthRes.json();
    assert(health.status === 'ok' && health.uptime >= 0, 'GET /health returns 200 OK for uptime monitoring');

    // 2. Test User Auth: Registration & Login
    console.log('\n2. Testing Authentication & User Discovery:');
    const testUsername = `testuser_${Date.now()}`;
    const registerRes = await fetch(`http://localhost:${TEST_PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Người Dùng Test',
        username: testUsername,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      })
    });
    const newUser = await registerRes.json();
    assert(newUser && newUser.username === testUsername, 'POST /api/auth/register creates new online user');

    const loginRes = await fetch(`http://localhost:${TEST_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername })
    });
    const loggedUser = await loginRes.json();
    assert(loggedUser && loggedUser.id === newUser.id, 'POST /api/auth/login authenticates with @username');

    // User Search
    const searchRes = await fetch(`http://localhost:${TEST_PORT}/api/users/search?q=${testUsername}`);
    const searchResults = await searchRes.json();
    assert(Array.isArray(searchResults) && searchResults.some(u => u.username === testUsername), 'GET /api/users/search finds user across platform');

    // 3. Test REST API: Users & Conversations
    console.log('\n3. Testing REST Endpoints:');
    const usersRes = await fetch(`http://localhost:${TEST_PORT}/api/users`);
    const users = await usersRes.json();
    assert(Array.isArray(users) && users.length >= 4, 'GET /api/users returns all registered users');

    const convsRes = await fetch(`http://localhost:${TEST_PORT}/api/conversations?userId=u_ducanh`);
    const convs = await convsRes.json();
    assert(Array.isArray(convs) && convs.length >= 2, 'GET /api/conversations returns user conversations');

    const testConv = convs.find(c => c.participants.includes('u_baolong')) || convs[0];
    const messagesRes = await fetch(`http://localhost:${TEST_PORT}/api/messages/${testConv.id}`);
    const messages = await messagesRes.json();
    assert(Array.isArray(messages) && messages.length > 0, 'GET /api/messages/:id returns message history');

    // 4. Test Socket.IO Real-time Messaging
    console.log('\n4. Testing Real-time Socket.IO Connection & Messaging:');

    clientSocket1 = Client(`http://localhost:${TEST_PORT}`, { reconnection: false });
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`, { reconnection: false });

    await Promise.all([
      new Promise(res => clientSocket1.on('connect', res)),
      new Promise(res => clientSocket2.on('connect', res))
    ]);

    assert(clientSocket1.connected && clientSocket2.connected, 'Two client sockets connected successfully');

    clientSocket1.emit('user_online', 'u_ducanh');
    clientSocket2.emit('user_online', 'u_baolong');

    await Promise.all([
      new Promise(res => clientSocket1.emit('join_conversation', testConv.id, res)),
      new Promise(res => clientSocket2.emit('join_conversation', testConv.id, res))
    ]);

    await wait(100);

    // Send Message Test
    const testMsgText = `Online Deployment Test Message ${Date.now()}`;
    const receivedMsgPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for new_message')), 3000);
      clientSocket2.on('new_message', (msg) => {
        if (msg.text === testMsgText) {
          clearTimeout(timer);
          resolve(msg);
        }
      });
    });

    clientSocket1.emit('send_message', {
      conversationId: testConv.id,
      senderId: 'u_ducanh',
      text: testMsgText,
      type: 'text'
    });

    const receivedMsg = await receivedMsgPromise;
    assert(receivedMsg && receivedMsg.text === testMsgText, 'Socket client 2 received real-time message from client 1');

    // Reaction Test
    console.log('\n5. Testing Reaction & Unsend Engine:');
    const reactionPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for reaction_updated')), 3000);
      clientSocket1.on('reaction_updated', (data) => {
        if (data.messageId === receivedMsg.id) {
          clearTimeout(timer);
          resolve(data);
        }
      });
    });

    clientSocket2.emit('toggle_reaction', {
      messageId: receivedMsg.id,
      conversationId: testConv.id,
      userId: 'u_baolong',
      reaction: '❤️'
    });

    const reactionData = await reactionPromise;
    assert(reactionData.reactions && reactionData.reactions['❤️']?.includes('u_baolong'), 'Reaction ❤️ successfully synced in real-time');

    // Unsend Test
    const unsendPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for message_unsent')), 3000);
      clientSocket2.on('message_unsent', (data) => {
        if (data.messageId === receivedMsg.id) {
          clearTimeout(timer);
          resolve(data);
        }
      });
    });

    clientSocket1.emit('unsend_message', {
      messageId: receivedMsg.id,
      conversationId: testConv.id,
      userId: 'u_ducanh'
    });

    const unsendData = await unsendPromise;
    assert(unsendData.isUnsent && unsendData.text.includes('thu hồi'), 'Message unsend broadcast received and content masked');

    // Bot Auto-Response Test
    console.log('\n6. Testing Meta AI Bot Conversation:');
    const aiConv = convs.find(c => c.participants.includes('u_meta_ai'));
    if (aiConv) {
      await new Promise(res => clientSocket1.emit('join_conversation', aiConv.id, res));

      const botReplyPromise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Bot timeout')), 4000);
        clientSocket1.on('new_message', (msg) => {
          if (msg.senderId === 'u_meta_ai') {
            clearTimeout(timer);
            resolve(msg);
          }
        });
      });

      clientSocket1.emit('send_message', {
        conversationId: aiConv.id,
        senderId: 'u_ducanh',
        text: 'Chào Meta AI, tôi đang kiểm tra ứng dụng chat online để deploy!',
        type: 'text'
      });

      const botReply = await botReplyPromise;
      assert(botReply && botReply.senderId === 'u_meta_ai' && botReply.text.length > 0, 'Meta AI Bot received query and automatically replied');
    }

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    server.close();
  }

  console.log(`\n================================`);
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Start tests
setTimeout(runTests, 300);
