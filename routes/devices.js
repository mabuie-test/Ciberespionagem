const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// POST /api/devices  -> register or update
router.post('/', async (req, res) => {
  try {
    const { deviceId, label } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    let dev = await Device.findOne({ deviceId });
    if (!dev) {
      dev = new Device({ deviceId, label });
    } else {
      if (label) dev.label = label;
    }
    dev.lastSeen = new Date();
    dev.online = true;
    await dev.save();
    return res.json({ ok: true, device: dev });
  } catch (e) {
    console.error('devices POST err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// POST /api/devices/heartbeat  (body: deviceId, timestamp)
router.post('/heartbeat', async (req, res) => {
  try {
    const { deviceId, timestamp } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const dev = await Device.findOneAndUpdate(
      { deviceId },
      { $set: { lastSeen: timestamp ? new Date(timestamp) : new Date(), online: true } },
      { new: true }
    );
    if (!dev) {
      return res.status(404).json({ error: 'device not found' });
    }
    return res.json({ ok: true, device: dev });
  } catch (e) {
    console.error('heartbeat err', e);
    return res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
