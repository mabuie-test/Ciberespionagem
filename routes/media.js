const express = require('express');
const router = express.Router();
const multer = require('multer');
const stream = require('stream');
const mongoose = require('mongoose');

const MediaMeta = require('../models/MediaMeta');
const Device = require('../models/Device');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// POST /api/media/upload
// fields: deviceId, type, metadata, media file form-field name = "media"
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const GridFSBucketClass = req.app.locals.GridFSBucketClass;
    if (!db || !GridFSBucketClass) return res.status(500).json({ error: 'storage not ready' });

    const file = req.file;
    const { deviceId, type, metadata } = req.body;
    if (!file) return res.status(400).json({ error: 'no file' });
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    // ensure device exists
    const dev = await Device.findOneAndUpdate({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: true, new: true });

    // upload buffer to GridFS
    const bucket = new GridFSBucketClass(db, { bucketName: 'mediaFiles' });
    const readStream = new stream.PassThrough();
    readStream.end(file.buffer);

    const uploadStream = bucket.openUploadStream(file.originalname, { contentType: file.mimetype, metadata: { deviceId, type } });
    readStream.pipe(uploadStream)
      .on('error', err => {
        console.error('gridfs upload err', err);
        return res.status(500).json({ error: 'upload error' });
      })
      .on('finish', async () => {
        const meta = new MediaMeta({
          deviceId,
          filename: file.originalname,
          contentType: file.mimetype,
          length: uploadStream.id ? uploadStream.length : file.size,
          gridFsId: uploadStream.id,
          type: type || 'media',
          metadata: metadata ? JSON.parse(metadata) : null
        });
        await meta.save();
        return res.json({ ok: true, fileId: uploadStream.id, meta });
      });
  } catch (e) {
    console.error('media upload err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// GET /api/media -> list metadata ?deviceId=
router.get('/', async (req, res) => {
  try {
    const q = {};
    if (req.query.deviceId) q.deviceId = req.query.deviceId;
    const items = await MediaMeta.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (e) {
    console.error('media list err', e);
    res.status(500).json({ error: 'internal' });
  }
});

// GET /api/media/:id -> stream file from GridFS
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).send('id required');
    const db = req.app.locals.db;
    const GridFSBucketClass = req.app.locals.GridFSBucketClass;
    if (!db || !GridFSBucketClass) return res.status(500).send('storage not ready');
    const bucket = new GridFSBucketClass(db, { bucketName: 'mediaFiles' });
    const objectId = mongoose.Types.ObjectId(id);

    // find metadata
    const meta = await MediaMeta.findOne({ gridFsId: objectId });
    if (meta && meta.contentType) res.setHeader('Content-Type', meta.contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="' + (meta ? meta.filename : id) + '"');

    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.on('error', error => {
      console.error('gridfs download err', error);
      res.status(404).end();
    });
    downloadStream.pipe(res);
  } catch (e) {
    console.error('media get err', e);
    res.status(500).end();
  }
});

module.exports = router;
