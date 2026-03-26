import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for tenant + severity, and tenant + timestamp queries
AlertSchema.index({ tenantId: 1, severity: 1 });
AlertSchema.index({ tenantId: 1, timestamp: -1 });

const Alert = mongoose.model('Alert', AlertSchema);
export default Alert;
