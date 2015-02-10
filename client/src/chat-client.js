var RevsysChatClient = function(config) {

  this.config = config;
  this.config.cmdPrefix = config.cmdPrefix || "/";
  this.id = "";
  this.rooms = {};
  this.room = {
    occupants: {},
    messages: []
  };
  this.users = {};

  var self = this;

  var notifications = [];

  if (config.notify == true) {
    document.addEventListener("visibilitychange", function() {
      if (document.hidden == false) {
        for (var i in notifications) {
          var notification = notifications[i];
          notification.close();
        }
      }
    }, false)
  }

  var serverEventListeners = {};

  this.addServerEventListener = function(event, listener) {
    serverEventListeners[event] = listener;
  }

  function handleServerEvent(event, args) {
    var listener = serverEventListeners[event];
    if (listener) {
      listener(args);
    }
    if (self.config.onServerEvent) {
      self.config.onServerEvent(event, args);
    }
  }

  var commandListeners = {}

  this.addCommandListener = function(cmd, listener){
    commandListeners[cmd] = listener;
  }

  function executeCommand(cmd, args){
    var listener = commandListeners[cmd];
    if(listener){
      listener(args);
    }
  }

  function getDataFromServer(msgType, msgData, callback, onError) {
    return easyrtc.sendServerMessage(msgType, msgData, function(type, data) {
      callback(data);
    }, function(err) {
      console.error("Unable to retrieve data from the server:" + err)
      if (onError) {
        onError(err);
      }
    });
  }

  this.getUserData = function(id) {
    return self.users[id];
  }

  function setUserData(userData) {
    self.users[self.id] = userData;
    easyrtc.sendServerMessage("setUserData", {
      id: self.id,
      data: userData
    }, function() {}, function(err) {
      console.error("Unable to set user data:" + err)
    });
    userData.isMe = true;
  }

  this.updateUserData = function(userData) {
    self.users[self.id] = userData;
    easyrtc.sendServerMessage("updateUserData", {
      id: self.id,
      data: userData
    }, function() {}, function(err) {
      console.error("Unable to update user data:" + err)
    });
    userData.isMe = true;
  }

  this.addServerEventListener("updateUserData", function(args) {
    args.data.isMe = args.id == self.id;
    self.users[args.id] = args.data;
  });

  this.addCommandListener("join", function(args){
    self.joinRoom(args[0]);
  });

  this.addCommandListener("switch", function(args){
    self.changeRoom(args[0]);
  });

  this.addCommandListener("leave", function(){
    self.leaveRoom();
  });

  this.addCommandListener("setName", function(args){
    var userData = self.users[self.id];
    delete userData.isMe;
    userData.name = args[0];
    self.updateUserData(userData);
  });

  this.addToConversation = function(who, msgType, content, targeting) {
    var message = {
      sender: self.getUserData(who),
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
    if (this.config.notify == true && message.sender.isMe == false && document.hidden == true) {
      if (Notification) {
        Notification.requestPermission(function(permission) {
          var notification = new Notification("New Message", {
            body: message.sender.name + ': ' + message.content,
            icon: 'icon.png',
            dir: 'auto'
          });
          notifications.push(notification);
        });
      }
    }
  }


  this.connect = function() {
    easyrtc.setSocketUrl(this.config.url);
    easyrtc.setPeerListener(function(who, msgType, content, targeting) {
      if (msgType == "message") {
        self.addToConversation.call(self, who, msgType, content, targeting);
      } else if (msgType == "event") {
        console.log("event");
        console.log(content);
        handleServerEvent(content.event, content.data);
      }
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
    easyrtc.connect("easyrtc.instantMessaging", function(id) {
      self.loginSuccess.call(self, id);
    }, loginFailure);
  }

  this.joinRoom = function(roomName) {
    easyrtc.joinRoom(roomName, {},
      function() {
        console.log("Joined room " + roomName);
      },
      function(errorCode, errorText, roomName) {
        console.log("Couldn't join room: " + errorCode + " " + errorText);
        easyrtc.showError(errorCode, errorText + ": room name was(" + roomName + ")");
      });
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
    async.each(Object.keys(occupants), function(id, callback) {
      var occupant = occupants[id];
      occupant.id = id;
      var userData = self.users[id];
      if (!userData) {
        userData = getDataFromServer("getUserData", {
          id: id
        }, function(data) {
          userData = data;
          userData.isMe = (id == self.id);
          self.users[id] = userData;
          callback();
        }, callback);
      } else {
        occupant.data = userData;
        callback();
      }
      room.occupants[id] = occupant;
    }, function(err) {
      self.config.occupantListener(roomName, room.occupants, isPrimary);
    });
  }

  this.sendMessage = function(message, callback) {
    if (message.indexOf(this.config.cmdPrefix) == 0) {
      var command = message.substring(this.config.cmdPrefix.length, (message + " ").indexOf(" "));
      var args = [];
      if(message.indexOf(" ") > -1){
        args = message.substring(message.indexOf(" ")+1).split(" ");
      }
      executeCommand(command, args);
    } else {
      easyrtc.sendDataWS({
        targetRoom: this.room.name
      }, "message", message);
      this.addToConversation(this.id, "message", message, {
        targetRoom: this.room.name
      });
    }
    callback();
  }

  this.loginSuccess = function(id) {
    console.log("Login Success: id = " + id);
    this.id = id;
    setUserData(this.config.dataStore.getUserData());
    this.config.loginSuccess();
  }

  function loginFailure(errorCode, message) {
    console.log("Login Failure: " + errorCode + " " + message);
    easyrtc.showError(errorCode, message);
  }

}