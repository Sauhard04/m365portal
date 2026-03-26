/**
 * Script to list all tenants in MongoDB for debugging switch issues
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }

    console.log('[Debug] Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('[Debug] Connected!');

    const db = mongoose.connection.db;
    const collection = db.collection('tenants');

    const tenants = await collection.find({}).toArray();
    console.log('\n=== CURRENT TENANTS ===');
    tenants.forEach(t => {
        console.log(`- DisplayName: ${t.displayName}`);
        console.log(`  TenantId   : ${t.tenantId}`);
        console.log(`  ClientId   : ${t.clientId}`);
        console.log(`  isActive   : ${t.isActive}`);
        console.log('----------------------------');
    });

    await mongoose.disconnect();
    console.log('\n[Debug] Done!');
}

main().catch(console.error);
