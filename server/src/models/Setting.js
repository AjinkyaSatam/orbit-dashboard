import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'CONFIG', unique: true },
  tempThreshold: { type: Number, default: 50 },
  soundThreshold: { type: Number, default: 2000 },
});

export default mongoose.model('Setting', settingSchema);
