import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            console.error('❌ MongoDB connection URI not found in environment variables (MONGODB_URI)');
            return; // Don't crash immediately, let health check report it
        }

        console.log('[Database] Connecting to MongoDB...');
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        // In production, we might want the process to stay alive so logs can be inspected
        // or we might want it to crash so Azure restarts it. 
        // We'll keep the exit to ensure a clean state upon restart.
        process.exit(1);
    }
};

export default connectDB;
