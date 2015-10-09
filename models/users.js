var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var usersSchema = new Schema({
	rlname: String,
	email: String
});

usersSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Users', usersSchema);
