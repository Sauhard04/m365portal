const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/m365portal';

const TenantSchema = new mongoose.Schema({
    tenantId: { type: String, unique: true },
    clientId: String,
    displayName: String,
    domain: String,
    isActive: Boolean,
    createdAt: { type: Date, default: Date.now }
});

const Tenant = mongoose.model('Tenant', TenantSchema);

async function registerAkarsh() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully.');

        const akarshData = {
            tenantId: "cd11ff1b-3f29-41a1-a38a-ba4dd74fe2c0",
            clientId: "0fb1ce07-0af3-4192-a8bf-d8b3cce097fc",
            displayName: "Akarsh User",
            domain: "MPOC1.onmicrosoft.com",
            isActive: true
        };

        console.log('Upserting Akarsh tenant...');
        const result = await Tenant.findOneAndUpdate(
            { tenantId: akarshData.tenantId },
            akarshData,
            { upsert: true, new: true }
        );

        console.log('Registration Successful:');
        console.log(JSON.stringify(result, null, 2));

        await mongoose.disconnect();
        console.log('Disconnected from DB.');
    } catch (err) {
        console.error('Registration failed:', err);
        process.exit(1);
    }
}

registerAkarsh();
