import { connectToDatabase } from '../../../src/utils/database.js';
import { PDF } from '../../../src/models/PDF.js';

export default async function handler(req, res) {
    // Check method
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    // Get ID from query (Vercel automatic param parsing)
    const { id } = req.query;

    if (!id) {
        return res.status(400).send('Missing ID parameter');
    }

    try {
        await connectToDatabase();

        const pdf = await PDF.findById(id);

        if (!pdf) {
            return res.status(404).send('PDF not found in database');
        }

        // Set headers for inline viewing
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${pdf.fileName}"`);
        res.setHeader('Content-Length', pdf.fileData.length);

        // Cache control (optional but good for performance)
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Send binary data
        res.send(pdf.fileData);

    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).send('Error retrieving PDF');
    }
}
