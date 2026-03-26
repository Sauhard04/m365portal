import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    clientId: {
        type: String,
        required: true,
        trim: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
