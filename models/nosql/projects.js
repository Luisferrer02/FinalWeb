const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
    {
        userId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        clientId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
        name:{ type: String, required: true, trim: true },
        description:{ type: String, default: "", trim: true },
        archived:{ type: Boolean, default: false }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('Project', ProjectSchema);