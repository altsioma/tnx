const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*"
  },
});

app.get('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('P3P', 'CP="CAO PSA OUR"');

  res.sendFile(__dirname + '/index.html');
});

const TankiApp = {
  io: null,
  clients: {},

  parseData: function(str){
    return JSON.parse(str);
  },

  prepareData: function(data){
    return JSON.stringify(data);
  },
  
  addClient: function(clientID, socket, clientData){
    clientData.position = {
      "x": 0,
      "y": 0
    };

    this.clients[clientID] = {
      "socket": socket,
      "clientData": clientData
    };

    this.clients[clientID].socket.emit('ready', TankiApp.prepareData({
      "clientID": clientID,
      "clientData": clientData
    }));

    this.clients[clientID].socket.broadcast.emit('new_user', TankiApp.prepareData({
      "clientID": clientID,
      "clientData": clientData
    }));
  },
  
  delClient: function(clientID){
    if (this.clients[clientID]){
      this.clients[clientID].socket.broadcast.emit('delete_user', TankiApp.prepareData({
        "clientID": clientID
      }));

      delete this.clients[clientID];
    }
  },
  
  clientNewPosition: function(clientID, position){
    if (this.clients[clientID]){
      this.clients[clientID].clientData.position = {
        "x": position.x,
        "y": position.y
      };

      this.clients[clientID].socket.broadcast.emit('user_position', TankiApp.prepareData({
        "clientID": clientID,
        "position": this.clients[clientID].clientData.position
      }));
    }
  }
};

TankiApp.io = io;

TankiApp.io.on('connection', (socket) => {
  console.log('a user connected');

  const clientID = socket.id;
  console.log('clientID: ' + clientID);

  socket.on('init', (result) => {
    console.log('init', clientID, result);

    TankiApp.addClient(clientID, socket, TankiApp.parseData(result));
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', clientID);

    TankiApp.delClient(clientID);
  });

  socket.on('position', (result) => {
    console.log('position', clientID, result);

    TankiApp.clientNewPosition(clientID, TankiApp.parseData(result));
  });

  socket.on('load_users', () => {
    for (var cid in TankiApp.clients){
      if (cid !== clientID){
        TankiApp.clients[cid].socket.broadcast.emit('new_user', TankiApp.prepareData({
          "clientID": cid,
          "clientData": TankiApp.clients[cid].clientData
        }));
      }
    }
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});