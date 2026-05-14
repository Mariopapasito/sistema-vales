import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';

const app = express();

app.use(cors());
app.use(express.json());

console.log('Starting test server...');

connectDB().then(() => {
  console.log('DB connected');
}).catch(err => {
  console.error('DB Error:', err);
});

app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok' });
});

app.listen(3001, () => {
  console.log('Server on port 3001');
});
