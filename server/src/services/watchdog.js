import { evaluateAlerts } from './alertService.js';

let watchdogTimer = null;
let isDeviceOnline = false;

export const resetWatchdog = () => {
  isDeviceOnline = true;
  if (watchdogTimer) clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(async () => {
    if (isDeviceOnline) {
      isDeviceOnline = false;
      await evaluateAlerts(null, false);
    }
  }, 15000); // 15 seconds
};

export const getDeviceStatus = () => isDeviceOnline;
