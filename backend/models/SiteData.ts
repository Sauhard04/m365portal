import mongoose from 'mongoose';

const SiteDataSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lastUpdated: {
        type: Number,
        default: Date.now
    },
    sections: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

const SiteData = mongoose.model('SiteData', SiteDataSchema);
export default SiteData;
