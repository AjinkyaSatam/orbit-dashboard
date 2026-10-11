import mongoose from 'mongoose';

const readingSchema = new mongoose.Schema({
  temp: { type: Number, required: true },
  hum: { type: Number, required: true },
  flame: { type: Number, required: true }, // 1 or 0
  rain: { type: Number, required: true },  // 1 or 0
  motion: { type: Number, required: true },// 1 or 0
  sound: { type: Number, required: true },
  ts: { type: Number, required: true, index: true },
});

// TTL index for 90 days (7776000 seconds)
readingSchema.index({ ts: 1 }, { expireAfterSeconds: 7776000 });
// Regular index for queries
readingSchema.index({ ts: -1 });

export default mongoose.model('Reading', readingSchema);
