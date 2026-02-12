import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'pending',
    },
    details: {
        type: Object,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
