import mongoose from 'mongoose';
import dotenv from 'dotenv';

import path from 'path';

// Force reload env vars to handle changes without restart
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

let isConnected = false;
let connectionPromise = null;

export const connectToDatabase = async () => {
    if (isConnected) {
        return;
    }

    // If a connection is already in progress, return that promise
    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            const mongoUri = process.env.MONGODB_URI;

            console.log('Attempting to connect to MongoDB...');
            if (!mongoUri) {
                console.error('MONGODB_URI is missing!');
                throw new Error('MONGODB_URI is not defined in environment variables');
            } else {
                // Log masked URI for safety
                console.log('Using URI:', mongoUri.replace(/:([^@]+)@/, ':****@'));
            }

            await mongoose.connect(mongoUri, {
                // useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+ 
                // but keeping them doesn't hurt if using older versions
            });

            isConnected = true;
            console.log('Connected to MongoDB successfully');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            connectionPromise = null; // Reset promise on failure
            throw error;
        }
    })();

    return connectionPromise;
};

export const disconnectFromDatabase = async () => {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
};
