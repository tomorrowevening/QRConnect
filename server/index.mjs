import { WebSocketServer } from 'ws';
import QRCode from 'qrcode'

// const USER_IP = 'localhost'
const USER_IP = '192.168.1.166'
const users = new Map();
const server = new WebSocketServer({ port: 8080 });
let totalUsers = 0;

function createNewUser(ws) {
  const userID = `user_${totalUsers}`;
  totalUsers++;

  // Create user
  const newUser = {
    userID: userID,
    socket: ws,
  };
  users.set(userID, newUser);
  console.log('User connected:', userID);

  return newUser;
}

server.on('connection', (ws) => {
  const newUser = createNewUser(ws);

  // Send user information
  ws.send(JSON.stringify({
    event: 'init',
    userID: newUser.userID,
  }))

  // Send QR Code to join
  const url = `http://${USER_IP}:5173/#user=${newUser.userID}`
  QRCode.toDataURL(url).then((value) => {
    ws.send(JSON.stringify({
      event: 'qrCode',
      data: value,
      userID: newUser.userID,
    }))
  })

  // Relay messages to other users
  ws.on('message', (message) => {
    const content = JSON.parse(message);
    const data = JSON.stringify(content);
    users.forEach((user) => {
      if (user.userID !== newUser.userID) {
        user.socket.send(data);
      }
    });
  });

  // User left
  ws.on('close', () => {
    users.delete(newUser.userID);
    console.log('User disconnected:', newUser.userID, 'Total users:', users.size);
    users.forEach((user) => {
      if (user.userID !== newUser.userID) {
        user.socket.send(JSON.stringify({
          event: 'userLeft',
          userID: newUser.userID,
        }));
      }
    });
  });
});
