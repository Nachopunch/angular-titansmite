var express = require('express');

var mongoose = require('mongoose');
var passport = require('passport');


//Load Models
var User = mongoose.model('Users');
var PBSave = mongoose.model('PBSaves');

module.exports = function(io){

	var router = express.Router();

	router.get('/gods', function (req, res){
	  res.sendfile('./public/godData.json');
	});

	router.get('/pb/saves', function (req, res){
	  PBSave.find(function(err, saves){
	    res.send(saves);
	  });
	});

	router.get('/pb/saves/:id', function (req, res){
		var saveID = req.params.id;
		PBSave.findOne({_id: saveID}).exec(function(err, save){
			res.send(save);
		});
	});

	router.put('/pb/saves/:id', function (req, res){
		var newInfo = req.body;
		var id = req.params.id;
		var query = {_id: id};
		PBSave.findOne(query).exec(function (err, doc){
			doc.picks = newInfo.picks;
			doc.notes = newInfo.notes;
			doc.album = newInfo.album;
			doc.title = newInfo.title;
			doc.save(function(err){
				io.sockets.emit('updateSaves');
				res.json(doc);
			});
		});
	});

	router.post('/pb/saves', function (req, res, next){
		var newSave = new PBSave(req.body);

		//check if a save with that name already exists in that album
		PBSave.findOne({title : newSave.title, album: newSave.album}).exec(function(err, data){

			if (data){
				console.log("save already exists....")
			} else{
				console.log('new save!');
				newSave.save(function (err, newSave){
					if(err){ return next(err); }

					io.sockets.emit('updateSaves');
					res.json(newSave);
				});
			}
		});
	});

	router.delete('/pb/saves/:id', function (req, res){
		var saveID = req.params.id;
		PBSave.findOneAndRemove({"_id": saveID}, function (err, deletedSave){
			console.log(deletedSave);

			io.sockets.emit('updateSaves');
			res.json(deletedSave);
		});
	});


	/* GET home page. */
	router.get('*', function(req, res, next) {
	  res.render('index', { title: 'TitanSmite' });
	});

	return router;
};
