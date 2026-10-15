const express = require('express');
const app = express();
const PORT = 4004;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ── In-memory Data (KWSB File Tracking) ──────────────────────────
let fileTrackingRecords = [
  { ID: '1', tracking_id: 'T-1001', cfo_diary_number: 'CFO-2026-01', receiving_number: 'REC-5001', subject: 'Budget Approval for IT Equipment', amount: 150000.00, budget_code: 'B-IT-26', status: 'Pending' },
  { ID: '2', tracking_id: 'T-1002', cfo_diary_number: 'CFO-2026-02', receiving_number: 'REC-5002', subject: 'Office Supplies Q3', amount: 25000.50, budget_code: 'B-OFF-26', status: 'Approved' },
  { ID: '3', tracking_id: 'T-1003', cfo_diary_number: 'CFO-2026-03', receiving_number: 'REC-5003', subject: 'Annual Maintenance Contract - Water Pumps', amount: 500000.00, budget_code: 'B-MNT-26', status: 'Rejected' },
];

let pendingFiles = [
  { ID: '1', tracking_code: 'P-001', category: 'General', subject: 'Water Supply Bill - Gulshan', status: 'pending' },
  { ID: '2', tracking_code: 'P-002', category: 'Finance', subject: 'Contractor Invoice - Block 5', status: 'pending' },
];

let fileTimelines = [
  { ID: '1', file_record_ID: '1', department: 'CFO Office', action: 'Received', comments: 'File received from admin', action_by: 'Ahmed Khan' },
  { ID: '2', file_record_ID: '1', department: 'Accounts', action: 'Forwarded', comments: 'Sent to accounts for verification', action_by: 'Sara Ali' },
];

// ── Root index ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    '@odata.context': '$metadata',
    value: [
      { name: 'FileTrackingRecords', url: 'FileTrackingRecords' },
      { name: 'PendingFiles',        url: 'PendingFiles' },
      { name: 'FileTimelines',       url: 'FileTimelines' },
    ]
  });
});

// ── FileTrackingRecords ───────────────────────────────────────────
app.get('/odata/v4/file-tracking/FileTrackingRecords', (req, res) => {
  res.json({ '@odata.context': '../$metadata#FileTrackingRecords', value: fileTrackingRecords });
});

app.get('/odata/v4/file-tracking/FileTrackingRecords/:id', (req, res) => {
  const record = fileTrackingRecords.find(r => r.ID === req.params.id);
  if (!record) return res.status(404).json({ error: { message: 'Record not found' } });
  res.json(record);
});

app.post('/odata/v4/file-tracking/FileTrackingRecords', (req, res) => {
  const newRecord = { ID: String(fileTrackingRecords.length + 1), ...req.body };
  fileTrackingRecords.push(newRecord);
  res.status(201).json(newRecord);
});

app.patch('/odata/v4/file-tracking/FileTrackingRecords/:id', (req, res) => {
  const idx = fileTrackingRecords.findIndex(r => r.ID === req.params.id);
  if (idx === -1) return res.status(404).json({ error: { message: 'Not found' } });
  fileTrackingRecords[idx] = { ...fileTrackingRecords[idx], ...req.body };
  res.json(fileTrackingRecords[idx]);
});

app.delete('/odata/v4/file-tracking/FileTrackingRecords/:id', (req, res) => {
  fileTrackingRecords = fileTrackingRecords.filter(r => r.ID !== req.params.id);
  res.status(204).end();
});

// ── PendingFiles ──────────────────────────────────────────────────
app.get('/odata/v4/file-tracking/PendingFiles', (req, res) => {
  res.json({ '@odata.context': '../$metadata#PendingFiles', value: pendingFiles });
});

app.post('/odata/v4/file-tracking/PendingFiles', (req, res) => {
  const newFile = { ID: String(pendingFiles.length + 1), status: 'pending', ...req.body };
  pendingFiles.push(newFile);
  res.status(201).json(newFile);
});

app.patch('/odata/v4/file-tracking/PendingFiles/:id', (req, res) => {
  const idx = pendingFiles.findIndex(r => r.ID === req.params.id);
  if (idx === -1) return res.status(404).json({ error: { message: 'Not found' } });
  pendingFiles[idx] = { ...pendingFiles[idx], ...req.body };
  res.json(pendingFiles[idx]);
});

// ── FileTimelines ─────────────────────────────────────────────────
app.get('/odata/v4/file-tracking/FileTimelines', (req, res) => {
  res.json({ '@odata.context': '../$metadata#FileTimelines', value: fileTimelines });
});

app.post('/odata/v4/file-tracking/FileTimelines', (req, res) => {
  const entry = { ID: String(fileTimelines.length + 1), ...req.body };
  fileTimelines.push(entry);
  res.status(201).json(entry);
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log('\n============================================');
  console.log(' KWSB File Tracking - SAP OData API Server ');
  console.log('============================================');
  console.log(` Running at: http://127.0.0.1:${PORT}`);
  console.log('\n Available Endpoints:');
  console.log(` GET  http://127.0.0.1:${PORT}/odata/v4/file-tracking/FileTrackingRecords`);
  console.log(` GET  http://127.0.0.1:${PORT}/odata/v4/file-tracking/PendingFiles`);
  console.log(` GET  http://127.0.0.1:${PORT}/odata/v4/file-tracking/FileTimelines`);
  console.log('============================================\n');
});

module.exports = app;
