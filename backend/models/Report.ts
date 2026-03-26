import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['security', 'compliance', 'usage', 'activity', 'audit', 'other'],
        default: 'other'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for efficient tenant + date queries
ReportSchema.index({ tenantId: 1, createdAt: -1 });

const Report = mongoose.model('Report', ReportSchema);
export default Report;
