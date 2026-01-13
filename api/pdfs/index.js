import { connectToDatabase } from '../../src/utils/database.js';
import { PDF } from '../../src/models/PDF.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        console.log('Fetching PDFs from MongoDB (Serverless)...');
        // Fetch PDFs from MongoDB (exclude fileData for performance)
        const files = await PDF.find({}, 'fileName displayName size uploadedAt');

        const formattedFiles = files.map(file => ({
            id: file._id,
            name: file.displayName,
            fileName: file.fileName,
            // Use ID for viewing the file content
            path: `/api/pdfs/view/${file._id}`,
            uploadedAt: file.uploadedAt
        }));

        res.status(200).json(formattedFiles);
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
}
