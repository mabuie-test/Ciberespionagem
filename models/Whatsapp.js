const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WhatsappSchema = new Schema({
  deviceId: { type: String, index: true },
  packageName: String,
  title: String,
  message: String,
  timestamp: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Whatsapp', WhatsappSchema);
