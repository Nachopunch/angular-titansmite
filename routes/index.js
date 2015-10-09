var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var passport = require('passport');
var pbModule = require('../modules/pbServerModule.js');

//Load Models
var User = mongoose.model('Users');
var PBSave = mongoose.model('PBSaves');


router.get('/gods', function (req, res){
  res.sendfile('./public/godData.json');
});

router.get('/pb/saves', function (req, res){
  PBSave.find(function(err, saves){
    res.send(saves);
  });
});

router.get('/pb/serverState', function (req, res){
  res.send(pbModule.serverState);
});

router.post('/pb/saves', function (req, res, next){
	PBSave.findOne({title : req.body.title}).exec(function(err, data){

		if (data){
			console.log('save already exists!!');
		} else{
			console.log('new save!');
		}

		var newSave = new PBSave(req.body);
		newSave.save(function (err, newSave){
			if(err){ return next(err); }

			res.json(newSave);
		});
	});
});

router.delete('/pb/saves/:id', function (req, res){
	var saveID = req.params.id;
	PBSave.findOneAndRemove({"_id": saveID}, function (err, deletedSave){
		console.log(deletedSave);
		res.json(deletedSave);
	});
});


/* GET home page. */
router.get('*', function(req, res, next) {
  res.render('index', { title: 'TitanSmite' });
});

module.exports = router;
