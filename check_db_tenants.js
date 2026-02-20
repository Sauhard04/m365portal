const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/m365portal';

const TenantSchema = new mongoose.Schema({
    tenantId: String,
    clientId: String,
    displayName: String,
    domain: String,
    isActive: Boolean
});

const Tenant = mongoose.model('Tenant', TenantSchema);

async function checkTenants() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');
        const tenants = await Tenant.find({});
        console.log('--- TENANTS IN DB ---');
        console.log(JSON.stringify(tenants, null, 2));
        console.log('--- END ---');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTenants();
