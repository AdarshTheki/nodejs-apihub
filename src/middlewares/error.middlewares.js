import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
// import mongoose if you want to check for mongoose errors
// import mongoose from 'mongoose';

const errorHandler = (err, req, res, next) => {
    let error = err;

    // Check if the error is an instance of ApiError
    if (!(error instanceof ApiError)) {
        // Assign an appropriate status code
        // Uncomment the next line if you want to check for mongoose errors
        // const isMongooseError = error instanceof mongoose.Error;
        const statusCode =
            error.statusCode || error instanceof mongoose.Error ? 400 : 500;

        // Set a message from native Error instance or a custom one
        const message = error.message || 'Something went wrong';
        error = new ApiError(
            statusCode,
            message,
            error?.errors || [],
            err.stack
        );
    }

    // Build the response object
    const response = {
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors || [],
        ...(process.env.NODE_ENV === 'development'
            ? { stack: error.stack }
            : {}),
    };

    // Send error response
    return res.status(error.statusCode).json(response);
};

export { errorHandler };
