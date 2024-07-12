import { WebSocketServer } from 'ws';
import QRCode from 'qrcode'
import User from './User.mjs'

const args = process.argv.slice(2)
const HOST_URL = args[0].split('=')[1]

const users = new Map();
const server = new WebSocketServer({ port: 8080 });
let usersJoined = 0;

function createNewUser(ws) {
  const userID = `user_${usersJoined}`;
  usersJoined++;

  // Create user
  const newUser = new User()
  newUser.userID = userID
  newUser.socket = ws
  users.set(userID, newUser);
  console.log('User connected:', userID);

  return newUser;
}

function getUsers() {
  const list = []
  users.forEach((user) => list.push(user.info()))
  return list
}

server.on('connection', (ws) => {
  const newUser = createNewUser(ws);
  const currentUsers = getUsers()

  // Send user information
  ws.send(JSON.stringify({
    event: 'init',
    user: newUser.info(),
    users: currentUsers,
  }))

  // Send QR Code to join
  const url = `${HOST_URL}/#user=${newUser.userID}`
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
    console.log(`User Left: ${newUser.userID}, Total Remaining: ${users.size}`)
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
