var app = angular.module('MainApp', ['ngRoute', 'ng-context-menu']);

// God Data Service --- Service to fetch god data
app.factory('godDataService', ['$http', function($http){
	return $http.get('/gods')
		.success(function(data){
			return data;
		});
}]);

// SocketIO factory
app.factory('socketio', ['$rootScope', function($rootScope){
	var socket = io.connect('http://localhost:3000');
	return {
		on: function(eventName, callback){
			socket.on(eventName, function() {
				var args = arguments;
				$rootScope.$apply(function(){
					callback.apply(socket, args);
				});
			});
		},
		emit: function(eventName, data, callback){
			socket.emit(eventName, data, function() {
				var args = arguments;
				$rootScope.$apply(function(){
					if(callback){
						callback.apply(socket, args);
					}
				});
			});
		},
		close: function(){
			socket.close();
		}
	};
}]);

app.factory('pbSavesService', ['$http', function($http){
	var x = {
		saves: [],
		getSaves: function(){
			return $http.get('/pb/saves')
			.success(function (data){
				angular.copy(data, x.saves);

				console.log(x.saves);
			});
		},
		getSave: function(id){
			return $http.get('/pb/saves/'+id)
			.success(function (save){
				return save;
			});
		},
		postSave: function(newSave){
			return $http.post('/pb/saves', newSave)
			.success(function (data){
				x.saves.push(data);
				console.log(data);
			});
		},
		deleteSave: function(saveID){
			return $http.delete('/pb/saves/' + saveID)
			.success(function (data){
				var filteredSaves = x.saves.filter(function (obj){
					return obj._id !== data._id;
				});

				x.saves = filteredSaves;
			});
		},
		editSave: function(newSave, id){
			return $http.put('/pb/saves/'+ id, newSave)
			.success(function(data){
				console.log("Edit successful");
			});
		}

	};
	x.getSaves();
	return x;
}]);

// Angular Routes
app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider){

	$routeProvider
		.when('/', {
			templateUrl: 'views/home.html',
			controller: 'HomeController',
			activeTab: 'home'
		})
		.when('/pb', {
			templateUrl: 'views/pb.html',
			controller: 'PbController',
			activeTab: 'pb'
		})
		.when('/test', {
			templateUrl: 'views/test.html',
			controller: 'PbController',
			activeTab: 'test'
		})
		.otherwise({
			redirectTo: '/'
		});

	$locationProvider.html5Mode(true);
}]);

// Main Controller
app.controller('MainController', ['$scope', '$route', function ($scope, $route){
	$scope.title = 'TitanSmite';
	$scope.width = 1680;
	$scope.height = 850;
	$scope.$route = $route;
}]);

// PB Controller
app.controller('PbController', ['$scope', '$window', '$document', 'godDataService', 'pbSavesService', 'socketio', function ($scope, $window, $document, godDataService, pbSavesService, socketio){
	godDataService.success(function(data){
		$scope.gods = data;
		console.log($scope.gods);
	});
	$window.$scope = $scope;
	$scope.saves = pbSavesService.saves;
	$scope.picks = [];
	$scope.pickHistory = [];
	$scope.phase = 0;
	$scope.selectedGod = '';
	$scope.currentAlbum = "default";
	$scope.bShowSavesWindow = false;
	$scope.albumList = ["default"];
	$scope.initCount = 0;
	$scope.isSynced = true;

	$scope.addAlbum = function(albumName){
		if($scope.albumList.indexOf(albumName) == -1){
			socketio.emit('addAlbum', albumName);
			console.log("Requesting new album: " + albumName);
		}
	};

	$scope.promptAddAlbum = function(){
		var newAlbum = prompt("New album name:");
		if(newAlbum){
			$scope.addAlbum(newAlbum);
		}
	};

	$scope.openSaves = function(){
		$scope.bShowSavesWindow = true;
	};

	$scope.closeSaves = function(){
		$scope.bShowSavesWindow = false;
	};

	$scope.saveDraft = function(newSave){
		var saveAlreadyExists = false;
		var existingSaveID = 0;
		$scope.saves.forEach(function(save){
			if (newSave.title === save.title && newSave.album === save.album){
				saveAlreadyExists = true;
				existingSaveID = save._id
				return false;
			}
		});
		if (saveAlreadyExists){
			if(confirm("Save already exists! Would you like to override the old draft?")){
				pbSavesService.editSave(newSave, existingSaveID).success(function(data){
					console.log($scope.saves);
				});
			}
		} else {
			pbSavesService.postSave(newSave).success(function (data){
				console.log($scope.saves);
			});
		}
	};

	$scope.setBoard = function(data){
		$scope.picks = data.picks;
		$scope.phase = data.picks.length;
		$scope.currentAlbum = data.album;
		$scope.notes = data.notes;
		if(data.pickHistory){
			$scope.pickHistory = data.pickHistory;
		}
		console.log("board set");
	};

	$scope.loadDraft = function(saveID){
		if($scope.isSynced){
			console.log("requesting server load for draft: "+ saveID);
			socketio.emit('loadDraft', saveID);
		}else{
			console.log("locally loading save: "+saveID)
			pbSavesService.getSave(saveID)
			.success(function (data){
				$scope.setBoard(data);
				$scope.draftName = data.title;
			});
		}
	};

	$scope.renameDraft = function(save){
		console.log(save);
		var draft = {
			picks: save.picks,
			notes: save.notes,
			album: save.album
		};
		var id = save._id;
		var newName = prompt("Enter a new name for "+ save.title);
		if (newName){
			draft.title = newName;
			console.log(draft);
			pbSavesService.editSave(draft, id).success(function(data){
				console.log("Name updated");
			});
		}
	};

	$scope.deleteDraft = function(save){
		if(confirm("Delete this save? : " + save.title)){
			pbSavesService.deleteSave(save._id).success(function(data){
				console.log(data);
				$scope.saves = pbSavesService.saves;
			});
		}
	};

	$scope.initBoard = function(){
		if($scope.isSynced){
			socketio.emit('requestInit');
		}
	};

	$scope.syncBoard = function(){
		socketio.emit('requestSync');
	};

	$scope.selectGod = function(godName){
		$scope.selectedGod = godName;
	};

	$scope.pickGod = function(god){
		if ($scope.isSynced){
			socketio.emit('clientLock', $scope.selectedGod);
		} else if ($scope.picks.indexOf(god) == -1 && $scope.phase < 16){
			$scope.picks[$scope.phase] = god;
			$scope.pickHistory.pop();
			$scope.phase +=1;
		}
	};

	$scope.resetBoard = function(){
		if ($scope.isSynced){
			socketio.emit('reset');
		}else {
			$scope.picks = [];
			$scope.pickHistory = [];
			$scope.phase = 0;
		}
	};

	$scope.undo = function(){
		if ($scope.isSynced){
			socketio.emit('undo');
		}else if ($scope.phase > 0){
			$scope.pickHistory.push($scope.picks[$scope.picks.length -1]);
			$scope.picks.pop();
			$scope.phase -= 1;
		}
	};

	$scope.redo = function(){
		if ($scope.isSynced){
			socketio.emit('redo');
		}else if ($scope.phase < 16 && $scope.pickHistory.length > 0){
			$scope.pickGod($scope.pickHistory[$scope.pickHistory.length -1]);
		}
	};

	$scope.notesChanged = function(){
		if ($scope.isSynced){
			socketio.emit('notesChanged', $scope.notes);
		}
	};

/*
	~~~~~~~~~~ Socket events ~~~~~~~~~~~~~~~~
*/
	socketio.on('connect', function(){
		socketio.emit('requestInit');
		console.log('hi');
	});

	socketio.on('init', function (serverState){
		console.log("recieved socket event from server: Init");
		if($scope.isSynced){
			$scope.setBoard(serverState);
			$scope.draftName = serverState.title;
		}
		$scope.albumList = serverState.albumList;
		$scope.currentAlbum = serverState.album;
		$scope.initCount += 1;
		console.log($scope.initCount);
	});

	socketio.on('sync', function (serverState){
		console.log("recieved socket event from server: Sync");
		if ($scope.isSynced){
			$scope.setBoard(serverState);
		}
		$scope.albumList = serverState.albumList;
		console.log("Board synced, server state: ");
		console.log(serverState);
	});

	socketio.on('loadDraft', function (serverState){
		if ($scope.isSynced){
			$scope.setBoard(serverState);
			$scope.draftName = serverState.title;
		}
	});

	socketio.on('message', function (message){
		console.log(message);
	});

	socketio.on('updateNotes', function (newNotes){
		$scope.notes = newNotes;
	});

	socketio.on('updateSaves', function (newSave){
		pbSavesService.getSaves();
	});

	// Key bindings
	$document.on('keydown', function(event){
		// console.log(event);

		if($(':input').is(":focus") !== true){
			event.preventDefault();
			/*
				"Space Bar" KEYPRESS HANDLER (pick currently selected God)
			*/
			if(event.keyCode == 32){
				$scope.pickGod($scope.selectedGod);
				$scope.$apply();
			}
			/*
				"a" KEYPRESS HANDLER (undo last pick and push to pick history)
			*/
			if(event.keyCode == 97){
				$scope.undo();
				$scope.$apply();
			}
			/*
				"d" KEYPRESS HANDLER (redo last pick in pickhistory)
			*/
			if(event.keyCode == 100){
				$scope.redo();
				$scope.$apply();
			}
			/*
				"Escape" KEYPRESS HANDLER (exit saves screen)
			*/
			if(event.keyCode == 27){
				$scope.closeSaves();
				$scope.$apply();
			}
		}
	});
}]);

// Home Controller
app.controller('HomeController', function ($scope){
	$scope.test = 'TS: Home';

	$scope.message  = 'Right click triggered';
	$scope.closeMessage = 'Context menu closed';

	$scope.panels = [
		{ name: 'Panel 1' },
		{ name: 'Panel 2' },
		{ name: 'Panel 3' }
	];

	$scope.addPanel = function() {
		$scope.panels.push({ name: 'Panel ' + ($scope.panels.length + 1) });
	};

	$scope.onRightClick = function(msg) {
		console.log(msg);
	};

	$scope.onClose = function (msg) {
		console.log(msg);
	};

	$scope.recreatePanels = function() {
		$scope.panels = angular.copy($scope.panels);
		console.log($scope.panels);
	}
});