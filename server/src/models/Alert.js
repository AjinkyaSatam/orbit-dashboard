import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['flame', 'rain', 'sound', 'temp', 'motion', 'offline', 'online'],
  },
  message: {
    type: String,
    required: true,
  },
  ts: {
    type: Number,
    required: true,
    index: true,
  },
  acknowledged: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model('Alert', alertSchema);
