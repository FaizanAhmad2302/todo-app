const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tokenHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Automatically delete when expired
  },
}, {
  timestamps: true,
});

const ResetToken = mongoose.model('ResetToken', resetTokenSchema);
module.exports = ResetToken;
