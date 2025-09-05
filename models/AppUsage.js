const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppUsageSchema = new Schema({
  deviceId: { type: String, index: true },
  packageName: String,
  totalTime: Number,
  lastTimeUsed: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AppUsage', AppUsageSchema);
