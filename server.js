require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Server } = require('socket.io');

const devicesRouter = require('./routes/devices');
const dataRouter = require('./routes/data');
const mediaRouter = require('./routes/media');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("Please set MONGO_URI in environment (.env).");
  process.exit(1);
}

// connect to mongo
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    const db = mongoose.connection.db;
    app.locals.db = db;
    app.locals.GridFSBucketClass = mongoose.mongo.GridFSBucket;
  })
  .catch(err => {
    console.error("MongoDB connect error:", err);
    process.exit(1);
  });

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// api routes
app.use('/api/devices', devicesRouter);
app.use('/api', dataRouter);
app.use('/api/media', mediaRouter);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// fallback -> index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start http + socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });

// allow clients to join device rooms and receive realtime location updates
io.on('connection', socket => {
  console.log('socket connected', socket.id);
  socket.on('joinDevice', deviceId => {
    if (!deviceId) return;
    const room = `device:${deviceId}`;
    socket.join(room);
    console.log('socket', socket.id, 'joined', room);
  });
  socket.on('leaveDevice', deviceId => {
    if (!deviceId) return;
    const room = `device:${deviceId}`;
    socket.leave(room);
  });
  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

server.on('listening', () => {
  // once DB ready, create GridFSBucket
  if (app.locals.db && app.locals.GridFSBucketClass) {
    app.locals.gfsBucket = new app.locals.GridFSBucketClass(app.locals.db, { bucketName: 'mediaFiles' });
    console.log('GridFSBucket ready');
  } else {
    console.warn('GridFSBucket not ready yet');
  }
  app.locals.io = io;
  console.log(`Server listening on port ${PORT}`);
});

server.listen(PORT);
