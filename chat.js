// chat.js
const WebSocket = require('ws'); 
const wss = new WebSocket.Server({ port: 3001 });

let clients = [];

wss.on('connection', function connection(ws) {
  clients.push(ws);

  ws.on('message', function incoming(message) {
    const text = message.toString(); // Ensure it's string
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error('Invalid JSON:', err);
      return;
    }

    if (data.type === 'join') {
      ws.username = data.username;
      broadcastOnlineUsers();
      return;
    }

    // Broadcast the message to all connected clients
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }
  });

  ws.on('close', function () {
    clients = clients.filter(client => client !== ws);
    broadcastOnlineUsers();
  });

  function broadcastOnlineUsers() {
    const payload = JSON.stringify({
      type: 'users',
      users: clients.map(c => c.username).filter(Boolean)
    });
    for (let client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
});

console.log('WebSocket server running on ws://localhost:3001');
