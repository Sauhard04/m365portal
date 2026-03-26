const fs = require('fs');
try {
    const raw = fs.readFileSync('tenants_dump.json', 'utf16le');
    const data = JSON.parse(raw);
    data.forEach(t => {
        console.log(`Name: ${t.displayName}`);
        console.log(`  Tenant: ${t.tenantId}`);
        console.log(`  Client: ${t.clientId}`);
        console.log('-------------------');
    });
} catch (e) {
    console.error('Failed to parse:', e.message);
}
