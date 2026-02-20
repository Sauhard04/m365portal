/**
 * Script to directly fix tenant clientId in MongoDB
 * Run from: m365portal/backend directory
 * Usage: node fix-tenant-clientid.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }

    console.log('[Fix] Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('[Fix] Connected!');

    const db = mongoose.connection.db;
    const collection = db.collection('tenants');

    // Show all tenants before fix
    const before = await collection.find({}).toArray();
    console.log('\n=== BEFORE FIX ===');
    before.forEach(t => {
        console.log(`Name: ${t.displayName} | TenantId: ${t.tenantId} | ClientId: ${t.clientId}`);
    });

    // Fix: update Akarsh's tenant to use the correct clientId
    const result = await collection.updateOne(
        { tenantId: 'cd11ff1b-3f29-41a1-a38a-ba4dd74fe2c0' },
        { $set: { clientId: 'c8831dfb-b9fe-4db1-ae3a-ae333d74ab5d', displayName: 'Akarsh' } }
    );

    console.log('\n[Fix] Update result:', result.modifiedCount, 'document(s) modified');

    // Show all tenants after fix
    const after = await collection.find({}).toArray();
    console.log('\n=== AFTER FIX ===');
    after.forEach(t => {
        console.log(`Name: ${t.displayName} | TenantId: ${t.tenantId} | ClientId: ${t.clientId}`);
    });

    await mongoose.disconnect();
    console.log('\n[Fix] Done!');
}

main().catch(console.error);
