import { IncomingForm } from 'formidable';
import fs from 'fs';
import { connectToDatabase } from '../../src/utils/database.js';
import { PDF } from '../../src/models/PDF.js';

// Disable Vercel's default body parser to let formidable handle the upload stream
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectToDatabase();

        const form = new IncomingForm({
            keepExtensions: true,
            maxFileSize: 50 * 1024 * 1024, // 50MB max
            filter: ({ mimetype }) => mimetype === 'application/pdf'
        });

        // Promisify form parsing to strictly wait for it
        const parseForm = () => {
            return new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) return reject(err);
                    resolve({ fields, files });
                });
            });
        };

        const { files } = await parseForm();

        const uploadedFile = files.file;
        if (!uploadedFile) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

        // Read file buffer
        const fileBuffer = fs.readFileSync(file.filepath);
        const originalName = file.originalFilename || `document-${Date.now()}.pdf`;
        const displayName = originalName.replace('.pdf', '').replace(/-|_/g, ' ');

        // Save to MongoDB
        const newPDF = new PDF({
            fileName: originalName,
            displayName: displayName,
            fileData: fileBuffer,
            contentType: file.mimetype || 'application/pdf',
            size: file.size
        });

        await newPDF.save();

        // Clean up temp file
        if (file.filepath) {
            fs.unlinkSync(file.filepath);
        }

        res.status(200).json({
            success: true,
            fileName: originalName,
            message: 'File uploaded successfully to MongoDB'
        });

    } catch (error) {
        console.error('Error saving to MongoDB:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
