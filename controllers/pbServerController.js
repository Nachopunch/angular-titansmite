var mongoose = require('mongoose');	
var pbsaves = mongoose.model('PBSaves');

var pbServerModule = function (io){


	var serverState = {
		picks: [],
		pickHistory: [],
		phase: 0,
		title: 'untitled',
		album: 'default',
		notes: '',
		albumList: ['default']
	}

	console.log('created serverPicks: '+serverState.picks);

	pbsaves.find(function (err, res){
		res.forEach(function(save){
			if(serverState.albumList.indexOf(save.album) === -1){
				serverState.albumList.push(save.album);
			}
		});
		console.log(serverState.albumList);
	});

	// listenForSockets;
	io.on('connection', function (socket){
		console.log("Client connected, new socket issued: "+socket.id);
		console.log("");

		// socket.emit('updateAlbumList', serverState.albumList);

		//=== Listen for socket events ===
		socket.on('requestSync', function(){
			socket.emit('sync', serverState);
		});
		socket.on('requestInit', function(){
			console.log("sending Init socketio event");
			socket.emit('init', serverState);
		});
		socket.on('clientLock', recClientLock);
		socket.on('reset', recClientReset);
		socket.on('undo', recClientUndo);
		socket.on('redo', recClientRedo);
		socket.on('save', saveDraft)
		
		socket.on('notesChanged', function(newNotes){
			serverState.notes = newNotes;
			socket.broadcast.emit('updateNotes', serverState.notes);
		});
		socket.on('addAlbum', function(albumName){
			if(serverState.albumList.indexOf(albumName) === -1){
				serverState.albumList.push(albumName);
				console.log("Recieved new album: " + albumName);
				console.log("New album list: " + serverState.albumList);
				io.emit('updateAlbumList', serverState.albumList);
			}
		});
		socket.on('loadDraft', recClientLoad);

		function recClientLoad(saveID){
			console.log("Loading save: "+saveID)
			pbsaves.findOne( {"_id": saveID},  function (err, savedDraft){
				if(err){
					throw err;
					socket.emit('message', err);
				} if (savedDraft){
					console.log("Loaded draft:" + savedDraft._id + savedDraft.title);
					serverState.picks = savedDraft.picks;
					serverState.phase = savedDraft.picks.length;
					serverState.title = savedDraft.title;
					serverState.album = savedDraft.album;
					serverState.notes = savedDraft.notes;
					console.log(serverState);
					io.emit('loadDraft', serverState);
					io.emit('message', "Loaded draft: "+savedDraft.title);
				}
			});
		}

		//recieve client lock function
		function recClientLock (data){
			console.log("recieved clientLock: "+data);

			// check if new pick has already been picked
		    if (data && serverState.picks.indexOf(data) === -1 && serverState.phase < 16){

				//broadcast new pick to clients
				
				serverState.picks.push(data);
				serverState.pickHistory.pop();
				serverState.phase = serverState.picks.length;
				io.emit('sync', serverState);
				console.log('client '+socket.id+' has picked '+data);
				console.log('(server) Phase: ' + serverState.phase + '. Picks: '+serverState.picks);
				console.log('current phase(server): '+serverState.phase);
			}
		}

		//recieve client reset function
		function recClientReset (){
			serverState.picks = [];
			serverState.pickHistory = [];
			serverState.phase = serverState.picks.length;
			// serverState.notes = '';
			// serverState.title = 'untitled';
			console.log("The picks have been reset(server): "+serverState.picks);
			console.log('(server) Phase: ' + serverState.phase + '. Picks: '+serverState.picks);
	    	io.emit('sync', serverState);
			io.emit('message', "The board has been reset");
		}

		//recieve client undo function
		function recClientUndo (){
			if (serverState.phase > 0){
				serverState.pickHistory.push(serverState.picks[serverState.picks.length -1]);
				serverState.picks.pop();
				serverState.phase = serverState.picks.length;
				console.log('Last pick was undone');
				console.log('current picks(server): '+serverState.picks);
				io.emit('sync', serverState);
				io.emit('message', "Last pick has been undone");
			}
		}

		//recieve client redo function
		function recClientRedo (){
			if (serverState.pickHistory.length > 0){
				serverState.picks.push(serverState.pickHistory[serverState.pickHistory.length -1]);
				serverState.pickHistory.pop();
				serverState.phase = serverState.picks.length;
				console.log('Last pick was undone');
				console.log('current picks(server): '+serverState.picks);
				io.emit('sync', serverState);
				io.emit('message', "Last pick has been redone");
			}
		}

		function saveDraft(data){
			var whitespacePatt = /^\s*$/
			if(whitespacePatt.test(data.title) === true){
				socket.emit('alert', 'Invalid Draft name.');
			} else{
				pbsaves.find({title: data.title}, function (err, res){
					if (res.length > 0){
						socket.emit('alert', 'A save with this name already exists.');
					} else {
						io.emit('message', 'Draft was saved as: '+data.title)
						socket.emit('alert', 'Draft was saved as: '+data.title)
						pbsaves.create({
							title: data.title,
							picks: data.picks,
							notes: data.notes,
							album: data.album
						});
					}
				});
			}
		}
	});

	io.on('disconnect', function(socket){
		console.log("Client disconnected: "+socket.id);
	})
};



module.exports = pbServerModule;