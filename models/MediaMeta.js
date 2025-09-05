const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MediaMetaSchema = new Schema({
  deviceId: { type: String, index: true },
  filename: String,
  contentType: String,
  length: Number,
  gridFsId: Schema.Types.ObjectId,
  type: String, // photo, audio, video, screen
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MediaMeta', MediaMetaSchema);
