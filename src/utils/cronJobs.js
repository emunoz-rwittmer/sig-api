const cron = require('node-cron');
const CronJobs = require('../controllers/cronJobs.controller');

// Viernes 00:00 crear comentcard de la semana venidera de cada yate
cron.schedule('0 0 * * 5', async () => {
    CronJobs.generateWeeklyCommentCard();
}, {
    timezone: "America/Guayaquil"
});
// Viernes 00:00 crear cruseros e info de pasajeros de la semana venidera de cada yate
cron.schedule('0 0 * * 5', async () => {
    CronJobs.generateWeeklyCruisesAndPassengerInfo();
}, {
    timezone: "America/Guayaquil"
});
// //Jueves 10:00 crear evaluaciones para capitanes
// cron.schedule("0 14 * * 4", async () => {
//     CronJobs.generateWeeklyEvaluationCrew();
// }, {
//     timezone: "America/Guayaquil"
// });
