import Setting from '../models/Setting.js';

export const getSettings = async (req, res) => {
  const settings = await Setting.findOne({ singletonKey: 'CONFIG' });
  res.json(settings || { tempThreshold: 50, soundThreshold: 2000 });
};

export const updateSettings = async (req, res) => {
  const { tempThreshold, soundThreshold } = req.body;
  let settings = await Setting.findOne({ singletonKey: 'CONFIG' });
  
  if (settings) {
    settings.tempThreshold = tempThreshold;
    settings.soundThreshold = soundThreshold;
    await settings.save();
  } else {
    settings = await Setting.create({ tempThreshold, soundThreshold });
  }
  
  res.json(settings);
};
