import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            console.error('❌ MongoDB connection URI not found in environment variables (MONGODB_URI)');
            return;
        }

        // Mask URI for safe logging
        const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
        console.log(`[Database] Attempting to connect to MongoDB: ${maskedUri}`);

        console.log('[Database] Connecting to MongoDB...');
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('ECONNREFUSED')) {
            console.error('👉 Possible cause: Firewall blocking the connection or database is down.');
        } else if (error.message.includes('Authentication failed')) {
            console.error('👉 Possible cause: Incorrect username or password in MONGODB_URI.');
        }
        process.exit(1);
    }
};

export default connectDB;
