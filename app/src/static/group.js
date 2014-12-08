var ngApp = angular.module('ngApp', []);
ngApp.controller('GroupChatCtrl', function($scope) {

  $scope.chat = new ChatClient({
    loginSuccess: function() {
      $scope.$apply();
    },
    occupantListener: function() {
      $scope.$apply(function() {
        $scope.chat.joinCall();
      });
    },
    dataStore: new function() {
      this.getUsername = function() {
        var name = prompt("Please enter your name", "");
        return name;
      }
      this.getRooms = function() {
        return [window.location.hash.substring(1)];
      }
    }
  });

  $scope.chat.connect();

});

var ChatClient = function(config) {

  this.config = config;
  this.id = "";
  this.name = "";
  this.rooms = {};
  this.room = {
    occupants: {},
    messages: []
  };

  var self = this;

  var joinedCall = false;


  this.connect = function() {
    easyrtc.setRoomOccupantListener(function(roomName, occupants, isPrimary) {
      self.occupantListener.call(self, roomName, occupants, isPrimary);
    });
    easyrtc.setRoomEntryListener(function(entered, roomName) {
      self.roomEntryListener.call(self, entered, roomName);
    })
    easyrtc.setStreamAcceptor(function(easyrtcid, stream) {
      var audio = document.getElementById(easyrtcid + "-video");
      easyrtc.setVideoObjectSrc(audio, stream);
    });
    easyrtc.setOnStreamClosed(function(easyrtcid) {
      //easyrtc.setVideoObjectSrc(document.getElementById( + "-video"), "");
    });
    easyrtc.setAcceptChecker(function(easyrtcid, callback) {
      callback(true);
    });
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

  this.joinCall = function() {
    if (!joinedCall) {
      joinedCall = true;
      if (window.location.hash.indexOf("-video") == -1) {
        easyrtc.enableVideo(false);
        easyrtc.enableVideoReceive(false);
      }
      easyrtc.initMediaSource(function() {
        easyrtc.hangupAll();
        for (var oid in self.room.occupants) {
          console.log("Calling " + oid);
          easyrtc.call(oid, function() {
            console.log("Successfully established call");
          }, function(errorCode, errorText) {
            console.log("Call could not be established: " + errorCode + " " + errorText);
          }, function(accepted, caller) {
            if (!accepted) {
              console.log("Call to " + easyrtc.idToName(caller) + " was rejected");
              easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(caller) + " was rejected");
            } else {
              console.log("Call accepted");
            }
          });
        }
      }, function(errorCode, errorText) {
        console.log("Unable to initialise media source: " + errorCode + " " + errorText);
      });
    }
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