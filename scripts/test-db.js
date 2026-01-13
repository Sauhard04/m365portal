import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const testConnection = async () => {
    const uri = process.env.MONGODB_URI;
    console.log('Testing MongoDB Connection...');
    console.log('URI found:', uri ? 'Yes' : 'No');
    if (uri) {
        console.log('URI (masked):', uri.replace(/:([^@]+)@/, ':****@'));
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000 // Fail fast
        });
        console.log('✅ Connection Successful!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        if (error.name === 'MongoServerError' && error.code === 8000) {
            console.error('Authentication Error: Check username and password.');
        } else if (error.message.includes('getaddrinfo')) {
            console.error('DNS Error: Check hostname/cluster address.');
        }
        process.exit(1);
    }
};

testConnection();
