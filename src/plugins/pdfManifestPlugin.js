import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import { connectToDatabase } from '../utils/database.js';
import { PDF } from '../models/PDF.js';

/**
 * Vite plugin to handle PDF operations with MongoDB
 */
export function pdfManifestPlugin() {
    return {
        name: 'pdf-manifest-plugin',
        configureServer(server) {
            // Connect to MongoDB initially
            connectToDatabase().catch(err => console.error('Failed to connect to MongoDB in plugin:', err));

            server.middlewares.use(async (req, res, next) => {
                // Ensure we are connected before handling any PDF API request
                if (req.url.startsWith('/api/pdfs')) {
                    try {
                        await connectToDatabase();
                    } catch (error) {
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Database connection failed', details: error.message }));
                        return;
                    }
                }

                // GET: List all PDFs
                if (req.url === '/api/pdfs' && req.method === 'GET') {
                    try {
                        console.log('Fetching PDFs from MongoDB...');
                        // Fetch PDFs from MongoDB (exclude fileData for performance)
                        const files = await PDF.find({}, 'fileName displayName size uploadedAt');
                        console.log(`Found ${files.length} PDFs in database`);

                        const formattedFiles = files.map(file => ({
                            id: file._id,
                            name: file.displayName,
                            fileName: file.fileName,
                            // Use ID for viewing the file content
                            path: `/api/pdfs/view/${file._id}`,
                            uploadedAt: file.uploadedAt
                        }));

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(formattedFiles));
                    } catch (error) {
                        console.error('Error fetching PDFs:', error);
                        console.error('Stack trace:', error.stack);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: error.message, stack: error.stack }));
                    }
                    return;
                }

                // POST: Upload a PDF file
                if (req.url === '/api/pdfs/upload' && req.method === 'POST') {
                    const form = new IncomingForm({
                        keepExtensions: true,
                        maxFileSize: 50 * 1024 * 1024, // 50MB max
                        filter: ({ mimetype }) => mimetype === 'application/pdf'
                    });

                    form.parse(req, async (err, fields, files) => {
                        if (err) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: false, error: err.message }));
                            return;
                        }

                        const uploadedFile = files.file;
                        if (!uploadedFile) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: false, error: 'No file uploaded' }));
                            return;
                        }

                        const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

                        try {
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
                            fs.unlinkSync(file.filepath);

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                fileName: originalName,
                                message: 'File uploaded successfully to MongoDB'
                            }));
                        } catch (error) {
                            console.error('Error saving to MongoDB:', error);
                            // Clean up temp file in case of error
                            if (fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath);

                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: false, error: error.message }));
                        }
                    });
                    return;
                }

                // GET: View PDF Content
                if (req.url.startsWith('/api/pdfs/view/') && req.method === 'GET') {
                    try {
                        const id = req.url.split('/').pop();

                        const pdf = await PDF.findById(id);

                        if (!pdf) {
                            res.statusCode = 404;
                            res.end('PDF not found');
                            return;
                        }

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/pdf');
                        res.setHeader('Content-Disposition', `inline; filename="${pdf.fileName}"`);
                        res.setHeader('Content-Length', pdf.fileData.length);
                        res.end(pdf.fileData);
                    } catch (error) {
                        console.error('Error serving PDF:', error);
                        res.statusCode = 500;
                        res.end('Error retrieving PDF');
                    }
                    return;
                }

                next();
            });
        }
    };
}
