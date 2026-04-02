const cron = require('node-cron');
const CronJobs = require('../controllers/cronJobs.controller');

// Domingo 00:00 crear comentcard de la semana venidera de cada yate
//cron.schedule('0 0 * * 0', async () => {
// cron.schedule('* * * * *', async () => {
//     CronJobs.generateWeeklyCruises();
// }, {
//     timezone: "America/Guayaquil"
// });
//Jueves 10:00 crear evaluaciones para capitanes
cron.schedule("0 14 * * 4", async () => {
    CronJobs.generateWeeklyEvaluationCrew();
}, {
    timezone: "America/Guayaquil"
});
