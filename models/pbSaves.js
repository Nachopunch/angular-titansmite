var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pbsaveSchema = new Schema({
	title: String,
	picks: [],
	notes: String,
	album: String,
	date: Date
});

module.exports = mongoose.model('PBSaves', pbsaveSchema);