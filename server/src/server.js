// Load required modules
var http = require("http"); // http server core module
var express = require("express"); // web framework external module
var io = require("socket.io"); // web socket external module
var easyrtc = require("easyrtc"); // EasyRTC external module
var async = require("async");

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(express.static(__dirname + "/client/"));

// Start Express http server on port 8080
var webServer = http.createServer(httpApp).listen(8071);

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {
	"log level": 1
});

// Start EasyRTC server
easyrtc.listen(httpApp, socketServer, {
	roomDefaultEnable: false
}, function(err, rtc) {

	// *** Extends easyrtc to allow easier integration *** //

	var msgListeners = {};
	rtc.events.onMsg = function(msgType, callback) {
		msgListeners[msgType] = callback;
	};
	rtc.events.on("easyrtcMsg", function(connectionObj, msg, socketCallback, next) {
		var callback = msgListeners[msg.msgType];
		if (callback) {
			callback(connectionObj, msg.msgData, socketCallback, next);
		} else {
			easyrtc.events.emitDefault("easyrtcMsg", connectionObj, msg, socketCallback, next);
		}
	});

	rtc.events.on("emitEvent", function(connectionObj, event, data, targetRoom, socketCallback, next) {
		var msg = {
			msgType: 'event',
			msgData: {
				event: event,
				data: data
			},
			targetRoom: targetRoom
		};
		easyrtc.events.emit("easyrtcMsg", connectionObj, msg, socketCallback, next);
	});

	rtc.events.on("broadcastEvent", function(connectionObj, event, data, socketCallback, next) {
		connectionObj.getRoomNames(function(err, roomNames) {
			console.log(roomNames);
			async.each(roomNames, function(roomName, callback) {
				easyrtc.events.emit("emitEvent", connectionObj, event, data, roomName, function(msg) {}, callback);
			}, function(err) {
				socketCallback({msgType: 'ack'});
				next(err);
			});
		});
	});

	// *** Custom events *** //

	var userDataMap = {};

	rtc.events.onMsg("getUserData", function(connectionObj, args, socketCallback, next) {
		console.log("getUserData: " + JSON.stringify(args));
		var userData = userDataMap[args.id];
		console.log(JSON.stringify(userData));
		socketCallback({
			msgType: 'response',
			msgData: userData
		});
		next(null);
	});

	rtc.events.onMsg("setUserData", function(connectionObj, args, socketCallback, next) {
		console.log("setUserData: " + JSON.stringify(args));
		userDataMap[args.id] = args.data;
		socketCallback({
			msgType: 'ack'
		})
		next(null);
	})

	rtc.events.onMsg("updateUserData", function(connectionObj, args, socketCallback, next) {
		console.log("updateUserData: " + JSON.stringify(args));
		userDataMap[args.id] = args.data;
		easyrtc.events.emit("broadcastEvent", connectionObj, "updateUserData", args, socketCallback, next);
	})
});