import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import alertRoutes from './routes/alerts';
import iotRoutes from './routes/iot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in dev to allow demo panel scripts
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // 1 Year HSTS
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined'));
app.use('/demo', express.static(path.join(__dirname, '../public')));
app.use('/', express.static(path.join(__dirname, '../public')));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/auth', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/iot', iotRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message
  });
});

app.listen(PORT, () => {
  console.log(`MMCA Backend listening on port ${PORT}`);
});
