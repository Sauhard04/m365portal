const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
    console.log(JSON.stringify(tenants, null, 2));
    await mongoose.disconnect();
}
check();
