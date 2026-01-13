import mongoose from 'mongoose';

const pdfSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    fileData: {
        type: Buffer,
        required: true
    },
    contentType: {
        type: String,
        default: 'application/pdf'
    },
    size: {
        type: Number,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

export const PDF = mongoose.models.PDF || mongoose.model('PDF', pdfSchema);
