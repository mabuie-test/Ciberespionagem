const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CallSchema = new Schema({
  deviceId: { type: String, index: true },
  number: String,
  type: String,
  state: String,
  timestamp: Date,
  duration: Number,
  mediaFileId: Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Call', CallSchema);
