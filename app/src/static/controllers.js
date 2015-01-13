var ngApp = angular.module('ngApp', []);
ngApp.controller('ChatCtrl', function($scope) {

  $scope.chat = new RevsysChatClient({
    url: "http://dev.echo-central.com:8071",
    loginSuccess: function() {
      $scope.$apply();
    },
    occupantListener: function() {
      $scope.$apply();
    },
    addToConversation: function() {
      var phase = $scope.$root.$$phase;
      if (phase != '$apply' && phase != '$digest') {
        $scope.$apply();
      }
      $("#chat-roll").scrollTop(300000);
    },
    roomEntryListener: function() {
      $scope.$apply();
    },
    dataStore: new function() {
      this.getUsername = function() {
        var name = prompt("Please enter your name", "");
        return name;
      }
      this.getRooms = function() {
        var hash = window.location.hash.substring(1);
        if(hash!=""){
          return hash.split("|");
        }else{
          return [];
        }
      }
    },
    notify: true
  });

  $scope.sendMessage = function() {
    $scope.chat.sendMessage($scope.message, function() {
      $scope.message = "";
    })
  }

  $scope.chat.connect();

});