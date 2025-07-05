import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({ origin: '*', credentials: true }));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static('public/dist'));

app.use(cookieParser());

import userRouter from './routes/auth/user.route.js';
import healthCheckRouter from './routes/healthcheck.route.js';

app.use('/api/v1/users', userRouter);
app.use('/api/v1', healthCheckRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        success: false,
        statusCode: err.status,
        message: err.message || 'Internal Server Error',
    });
});

export default app;
