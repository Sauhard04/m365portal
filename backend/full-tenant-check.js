const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
        console.log('--- TENANT DATA START ---');
        tenants.forEach(t => {
            console.log(`N: ${t.displayName}`);
            console.log(`  TID: ${t.tenantId}`);
            console.log(`  CID: ${t.clientId}`);
        });
        console.log('--- TENANT DATA END ---');
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
check();
