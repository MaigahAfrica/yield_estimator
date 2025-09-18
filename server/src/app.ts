import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import recordRoutes from './routes/records';
import { authenticate } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/whoami', authenticate(['dashboard_admin', 'field_officer']), (req, res) => {
  res.json({ user: (req as any).user });
});

app.use('/auth', authRoutes);
app.use('/records', recordRoutes);

export default app;
