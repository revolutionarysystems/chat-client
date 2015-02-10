var NGRevsysChatClient = function($scope, config) {
	var ngconfig = {
		url: config.url,
		loginSuccess: function() {
			$scope.$apply();
		},
		occupantListener: function() {
			$scope.$apply();
		},
		addToConversation: function(message) {
			var phase = $scope.$root.$$phase;
			if (phase != '$apply' && phase != '$digest') {
				$scope.$apply();
			}
			config.addToConversation(message);
		},
		roomEntryListener: function(entered, roomName) {
			$scope.$apply();
			if(config.roomEntryListener){
				config.roomEntryListener(entered, roomName);
			}
		},
		onServerEvent: function(){
			$scope.$apply();
		},
		dataStore: config.dataStore,
		notify: true
	};

	var chatClient = new RevsysChatClient(ngconfig);
	chatClient.newMessage = "";
	chatClient.ngSendMessage = function() {
		chatClient.sendMessage(chatClient.newMessage, function() {
			chatClient.newMessage = "";
		})
	};
	return chatClient;
}