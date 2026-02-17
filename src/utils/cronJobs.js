const cron = require('node-cron');
const CronJobs = require('../controllers/cronJobs.controller');

// Domingo 00:00
cron.schedule('0 0 * * 0', CronJobs.generateWeeklyCruises);
