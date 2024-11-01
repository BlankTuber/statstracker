const mongoose = require('mongoose');

const CodeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 }
});

module.exports = mongoose.model('Code', CodeSchema);