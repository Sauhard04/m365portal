import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    displayName: String,
    trialStartDate: {
        type: Date,
        default: Date.now
    },
    subscriptionStatus: {
        type: String,
        enum: ['trial', 'active', 'expired', 'canceled'],
        default: 'trial'
    },
    subscriptionId: {
        type: String,
        default: ''
    },
    customerEmail: String,
    lastUpdate: {
        type: Date,
        default: Date.now
    }
});

// Update the lastUpdate field on save
TenantSchema.pre('save', function (next) {
    this.lastUpdate = new Date();
    next();
});

const Tenant = mongoose.model('Tenant', TenantSchema);
export default Tenant;
