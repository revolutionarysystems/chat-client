var ngApp = angular.module('ngApp', []);
ngApp.controller('ChatCtrl', function($scope) {

  $scope.chat = new NGRevsysChatClient($scope, {
    url: "http://dev.echo-central.com:8071",
    addToConversation: function() {
      $("#chat-roll").scrollTop(300000);
    },
    roomEntryListener: function(entered, roomName) {
      var rooms = JSON.parse(localStorage.rooms);
      if (entered) {
        if (rooms.indexOf(roomName) == -1) {
          rooms.push(roomName);
        }
      } else {
        var index = rooms.indexOf(roomName);
        if (index > -1) {
          rooms.splice(index, index+1);
        }
      }
      localStorage.rooms = JSON.stringify(rooms);
    },
    dataStore: new function() {
      this.getUserData = function() {
        var name = localStorage.name;
        if (!name) {
          name = prompt("Please enter your name", "");
          localStorage.name = name;
        }
        return {
          name: name
        };
      }
      this.getRooms = function() {
        var rooms = localStorage.rooms;
        if (!rooms) {
          rooms = [];
          localStorage.rooms = "[]";
        } else {
          rooms = JSON.parse(rooms);
        }
        return rooms;
      }
    }
  });

  $scope.chat.connect();

});