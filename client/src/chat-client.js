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

  this.addToConversation = function(who, msgType, content, targeting) {
    var message = {
      sender: {
        id: who,
        name: easyrtc.idToName(who)
      },
      type: msgType,
      content: content
    };
    this.rooms[targeting.targetRoom].messages.push(message);
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
    var rooms = this.config.dataStore.getRooms();
    for (var i in rooms) {
      room = rooms[i];
      this.joinRoom(room);
    }
    easyrtc.setUsername(this.config.dataStore.getUsername());
    easyrtc.connect("easyrtc.instantMessaging", function(id) {
      self.loginSuccess.call(self, id);
    }, loginFailure);
  }

  this.joinRoom = function(roomName) {
    easyrtc.joinRoom(roomName, {},
      function() {},
      function(errorCode, errorText, roomName) {
        console.log("Couldn't join room: " + errorCode + " " + errorText);
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
    }
    this.config.roomEntryListener(entered, roomName);
  }

  this.changeRoom = function(roomName) {
    this.room = this.rooms[roomName];
  }

  this.hangup = function() {
    easyrtc.hangupAll();
  }

  this.occupantListener = function(roomName, occupants, isPrimary) {
    this.room.occupants = {};
    for (var i in occupants) {
      var occupant = occupants[i];
      var id = occupant.easyrtcid;
      occupant.id = id;
      occupant.name = easyrtc.idToName(id);
      this.room.occupants[id] = occupant;
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