import Alert from '../models/Alert.js';

export const getAlerts = async (req, res) => {
  const alerts = await Alert.find().sort({ ts: -1 }).limit(100);
  res.json(alerts);
};

export const ackAlert = async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (alert) {
    alert.acknowledged = true;
    await alert.save();
    res.json(alert);
  } else {
    res.status(404).json({ message: 'Alert not found' });
  }
};
