import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    aircrafts: [],
    notifications: [],
    alertRequests: [],
    baseChanges: [],
    operatorChanges: [],
    referenceData: []
  }, null, 2));
}

app.use(cors());
app.use(bodyParser.json());

// Helper to read data
const readData = () => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!data.referenceData) data.referenceData = [];
    return data;
  } catch (e) {
    return { aircrafts: [], notifications: [], alertRequests: [], baseChanges: [], operatorChanges: [], referenceData: [] };
  }
};

// Helper to write data
const writeData = (data: any) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// API Routes
app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.post('/api/aircrafts', (req, res) => {
  const data = readData();
  const newAircraft = { ...req.body, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
  data.aircrafts.unshift(newAircraft);
  writeData(data);
  res.json(newAircraft);
});

app.patch('/api/aircrafts/:id', (req, res) => {
  const data = readData();
  const index = data.aircrafts.findIndex((a: any) => a.id === req.params.id);
  if (index !== -1) {
    data.aircrafts[index] = { ...data.aircrafts[index], ...req.body };
    writeData(data);
    res.json(data.aircrafts[index]);
  } else {
    res.status(404).send('Aircraft not found');
  }
});

app.delete('/api/aircrafts/:id', (req, res) => {
  const data = readData();
  data.aircrafts = data.aircrafts.filter((a: any) => a.id !== req.params.id);
  writeData(data);
  res.status(24).send();
});

app.post('/api/alert-requests', (req, res) => {
  const data = readData();
  const newRequest = { ...req.body, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
  data.alertRequests.unshift(newRequest);
  writeData(data);
  res.json(newRequest);
});

app.patch('/api/alert-requests/:id', (req, res) => {
  const data = readData();
  const index = data.alertRequests.findIndex((r: any) => r.id === req.params.id);
  if (index !== -1) {
    data.alertRequests[index] = { ...data.alertRequests[index], ...req.body };
    writeData(data);
    res.json(data.alertRequests[index]);
  } else {
    res.status(404).send('Request not found');
  }
});

app.post('/api/notifications', (req, res) => {
  const data = readData();
  const newNotif = { ...req.body, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString(), read_by: [] };
  data.notifications.unshift(newNotif);
  writeData(data);
  res.json(newNotif);
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const data = readData();
  const { userEmail } = req.body;
  const index = data.notifications.findIndex((n: any) => n.id === req.params.id);
  if (index !== -1) {
    if (!data.notifications[index].read_by.includes(userEmail)) {
      data.notifications[index].read_by.push(userEmail);
      writeData(data);
    }
    res.json(data.notifications[index]);
  } else {
    res.status(404).send('Notification not found');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
