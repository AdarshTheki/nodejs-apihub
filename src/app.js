import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: process.env.CORS || '*', credentials: true })); // multiple origins

app.use(express.json({ limit: '16kb' })); // body parse data

app.use(express.urlencoded({ extended: true, limit: '16kb' })); // form data handle

app.use(express.static('views')); // server static files

app.use(cookieParser()); // cookies hold on headers

app.use(
  session({
    secret: process.env.SECRET_TOKEN,
    resave: true,
    saveUninitialized: true,
  })
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './views'));

// Views
app.get('/api/v1/views/reset-password/:resetToken', (req, res) => {
  res.render('reset-password', { title: 'Reset Password' });
});

app.get('/api/v1/views/verify-email/:verificationToken', (req, res) => {
  res.render('verify-email', { title: 'Verify Email' });
});

app.use(passport.initialize());
app.use(passport.session());

import userRoute from './routes/user.route.js';
import authRoute from './routes/auth.route.js';

// used all the routes
app.use('/api/v1/users', userRoute);
app.use('/api/v1/auth', authRoute);

// health check route middleware
app.use('/api/v1', (req, res) => {
  res.status(200).json({
    message: 'Health check passed',
    data: 'OK',
    statusCode: 200,
  });
});

// Invalid Path middleware handler
app.use((req, res) => {
  res.status(505).json({
    message: 'Invalid URL path',
    path: req.url,
    method: req.method,
    success: false,
    statusCode: 505,
  });
});

// Global Error Handler middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    path: req.url,
    method: req.method,
    success: false,
    statusCode: err.status,
    message: err.message || 'Internal Server Error',
  });
});

export { app };
