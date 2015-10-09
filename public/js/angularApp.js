var app = angular.module('MainApp', ['ngRoute']);

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
		.otherwise({
			redirectTo: '/'
		});

	$locationProvider.html5Mode(true);
}]);

// Main Controller
app.controller('MainController', function ($scope, $route){
	$scope.title = 'TitanSmite';
	$scope.width = 1680;
	$scope.height = 850;
	$scope.$route = $route;
});

// PB Controller
app.controller('PbController', ['$scope', '$document', 'godDataService', 'pbSavesService', 'socketio', function ($scope, $document, godDataService, pbSavesService, socketio){
	godDataService.success(function(data){
		$scope.gods = data;
		console.log($scope.gods);
	});
	$scope.saves = pbSavesService.saves;

	$scope.picks = [];
	$scope.pickHistory = [];
	$scope.phase = 0;
	$scope.selectedGod = '';
	$scope.album = "default";
	$scope.albumList = ["default"];
	$scope.isSynced = true;
	$scope.bShowSavesWindow = false;
	

	$scope.openSaves = function(){
		$scope.bShowSavesWindow = true;
	};

	$scope.closeSaves = function(){
		$scope.bShowSavesWindow = false;
	};

	$scope.saveDraft = function(newSave){
		pbSavesService.postSave(newSave).success(function (data){
			console.log($scope.saves);
		});
	};

	$scope.deleteDraft = function(id){
		pbSavesService.deleteSave(id).success(function(data){
			console.log(data);
			$scope.saves = pbSavesService.saves;
		});
	};

	socketio.on('sync', function(serverState){
		$scope.albumList = serverState.albumList;
		if ($scope.isSynced){
			$scope.picks = serverState.picks;
			$scope.pickHistory = serverState.pickHistory;
			$scope.phase = serverState.phase;
			$scope.album = serverState.album;
			$scope.notes = serverState.notes;
		}
	});


	// Key bindings
	$document.on('keydown', function(event){
		console.log(event);
		if($(':input').is(":focus") !== true){
			event.preventDefault();
			if(event.keyCode == 32){
				$scope.pickGod($scope.selectedGod);
				$scope.$apply();
			}
			if(event.keyCode == 97){
				$scope.undo();
				$scope.$apply();
			}
			if(event.keyCode == 100){
				$scope.redo();
				$scope.$apply();
			}
			// "Escape" keypress handler
			if(event.keyCode == 27){
				$scope.closeSaves();
				$scope.$apply();
			}
		}
	});

	$scope.syncBoard = function(){
		socketio.emit('clientSync');
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
	$scope.loadDraft = function(save){
		$scope.picks = save.picks;
		$scope.phase = save.phase;
		$scope.notes = save.notes;
		$scope.draftName = save.name;
	};

}]);

// Home Controller
app.controller('HomeController', function ($scope){
	$scope.test = 'TS: Home';
});