const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
  user: String,
  userId: String,
  sessionId: String,
  refreshtoken: String
});

const tokenModel = mongoose.model('tokens', tokenSchema);

module.exports = tokenModel;