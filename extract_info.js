const fs = require('fs');
const path = require('path');

const filePath = path.join('data', 'sitedata-cd11ff1b-3f29-41a1-a38a-ba4dd74fe2c0.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Attempt to find tenant info in the data
    // Usually it's in the 'overview' or first section
    console.log('--- EXTRACTED INFO ---');
    console.log('Filename Tenant ID: cd11ff1b-3f29-41a1-a38a-ba4dd74fe2c0');

    if (data.sections && data.sections.overview) {
        const overview = data.sections.overview.data;
        if (overview.tenantInfo) {
            console.log('Tenant Info:', JSON.stringify(overview.tenantInfo, null, 2));
        }
    }

    // Look for users to find the domain
    if (data.sections && data.sections.users) {
        const users = data.sections.users.data;
        if (users && users.length > 0) {
            const upn = users[0].userPrincipalName;
            console.log('Sample UPN:', upn);
            console.log('Domain:', upn.split('@')[1]);
        }
    }

    console.log('--- END ---');
} catch (err) {
    console.error(err);
}
