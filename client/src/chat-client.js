var RevsysChatClient = function(config) {

  this.config = config;
  this.id = "";
  this.name = "";
  this.rooms = {};
  this.room = {
    occupants: {},
    messages: []
  };

  var self = this;

  var connected = false;

  this.addToConversation = function(who, msgType, content, targeting) {
    var message = {
      sender: {
        id: who,
        name: easyrtc.idToName(who),
        isMe: who == this.id
      },
      type: msgType,
      content: content,
      time: new Date().getTime()
    };
    var room = this.rooms[targeting.targetRoom];
    room.messages.push(message);
    if (room.name != this.room.name) {
      room.hasUnseenMessages = true;
    }
    this.config.addToConversation(message)
  }


  this.connect = function() {
    easyrtc.setSocketUrl(this.config.url);
    easyrtc.setPeerListener(function(who, msgType, content, targeting) {
      self.addToConversation.call(self, who, msgType, content, targeting);
    });
    easyrtc.setRoomOccupantListener(function(roomName, occupants, isPrimary) {
      self.occupantListener.call(self, roomName, occupants, isPrimary);
    });
    easyrtc.setRoomEntryListener(function(entered, roomName) {
      self.roomEntryListener.call(self, entered, roomName);
    })
    easyrtc.setUsername(this.config.dataStore.getUsername());
    var rooms = this.config.dataStore.getRooms();
    for (var i in rooms) {
      room = rooms[i];
      this.joinRoom(room, false);
    }
    if (rooms.length > 0) {
      easyrtc.connect("easyrtc.instantMessaging", function(id) {
        self.loginSuccess.call(self, id);
      }, loginFailure);
      connected = true;
    }
  }

  this.joinRoom = function(roomName, connect) {
    connect = connect || true;
    easyrtc.joinRoom(roomName, {},
      function() {},
      function(errorCode, errorText, roomName) {
        console.log("Couldn't join room: " + errorCode + " " + errorText);
        easyrtc.showError(errorCode, errorText + ": room name was(" + roomName + ")");
      });
    if (connect == true && connected == false) {
      easyrtc.connect("easyrtc.instantMessaging", function(id) {
        self.loginSuccess.call(self, id);
      }, loginFailure);
      connected = true;
    }
  }

  this.leaveRoom = function() {
    easyrtc.leaveRoom(this.room.name, function() {

      },
      function(errorCode, errorText, roomName) {
        console.log("Couldn't leave room: " + errorCode + " " + errorText);
        easyrtc.showError(errorCode, errorText + ": room name was(" + roomName + ")");
      });
  }

  this.roomEntryListener = function(entered, roomName) {
    if (entered) {
      console.log("Entered room " + roomName);
      var room = {
        name: roomName,
        occupants: {},
        messages: []
      }
      this.rooms[roomName] = room;
      this.changeRoom(roomName);
    } else {
      console.log("Left room " + roomName);
      delete this.rooms[roomName];
      if (this.room.name == roomName) {
        var rooms = Object.keys(this.rooms);
        if (rooms.length > 0) {
          this.changeRoom(rooms[0]);
        } else {
          this.room = {};
        }
      }
    }
    this.config.roomEntryListener(entered, roomName);
  }

  this.changeRoom = function(roomName) {
    this.room = this.rooms[roomName];
    this.room.hasUnseenMessages = false;
  }

  this.hangup = function() {
    easyrtc.hangupAll();
  }

  this.occupantListener = function(roomName, occupants, isPrimary) {
    var room = this.rooms[roomName];
    room.occupants = {};
    for (var i in occupants) {
      var occupant = occupants[i];
      var id = occupant.easyrtcid;
      occupant.id = id;
      occupant.name = easyrtc.idToName(id);
      room.occupants[id] = occupant;
    }
    this.config.occupantListener(roomName, this.room.occupants, isPrimary);
  }


  this.sendMessage = function(message, callback) {
    easyrtc.sendDataWS({
      targetRoom: this.room.name
    }, "message", message);
    this.addToConversation(this.id, "message", message, {
      targetRoom: this.room.name
    });
    callback();
  }

  this.loginSuccess = function(id) {
    console.log("Login Success: id = " + id);
    this.id = id;
    this.name = easyrtc.idToName(id);
    this.config.loginSuccess();
  }

  function loginFailure(errorCode, message) {
    console.log("Login Failure: " + errorCode + " " + message);
    easyrtc.showError(errorCode, message);
  }
}