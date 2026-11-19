const authRoutes = require("./catalogs/auth.routes");
const usersRoutes = require("./catalogs/users.routes");
const authJwt = require("../middlewares/auth.middleware");
const { guard, requireAccess } = require("../middlewares/access.middleware");

// Cada submódulo de mantenimiento protege sus propias rutas.
const maintenanceGuard = (req, res, next) => {
  const module = req.path.startsWith('/rule') ? 'maintenance.rules'
    : req.path.startsWith('/records') ? 'maintenance.log' : 'maintenance.book';
  return guard([module])(req, res, next);
};
const indicatorsGuard = guard(['indicators']);
// El personal edita su propio perfil, foto, firma y documentos desde su portal.
const staffGuard = (req, res, next) => {
  const own = req.userKind !== 'user' && req.userId && req.path.split('/').includes(String(req.userId));
  return own || req.path === '/me/password' ? next() : guard(['catalogs.staff'])(req, res, next);
};
const rolesRoutes = require("./catalogs/roles.routes");
const accessRoutes = require("./catalogs/access.routes");
const departamentsRoutes = require("./catalogs/departaments.routes");
const positionsRoutes = require("./catalogs/positions.routes");
const documentationRoutes = require("./catalogs/documentation.routes");
const yachtRoutes = require("./catalogs/yachts.routes")
const companyRoutes = require("./catalogs/company.routes");
const staffRoutes = require("./catalogs/staff.routes");
const formsRoutes = require("./operations/surveys/forms.routes");
const HouseRulesRoutes = require("./catalogs/houseRules.routes");
const regulationsRoutes = require("./rrhh/regulations.routes");
const tradingRoutes = require("./rrhh/trading.routes");
const formatsRoutes = require("./rrhh/formats.routes");
const inductionsRoutes = require("./rrhh/inductions.routes");
const hrSurveysRoutes = require("./rrhh/hrSurveys.routes");
const displayOrdersController = require("../controllers/rrhh/displayOrders.controller");
const maintenanceRoutes = require("./catalogs/maintenance.routes");

//Operations
const questiondRoutes = require("./operations/surveys/questions.routes");
const evaluationRoutes = require("./operations/surveys/evaluation.routes");
const crewBoadingRoutes = require("./operations/surveys/crewBoarding.routes");
const weeklyEvaluationsRoutes = require("./operations/surveys/weeklyEvaluations.routes");
const ordersRoutes = require('./operations/orders/order.routes');
const transactionsRoutes = require('./operations/inventory/transactions.routes');
const productsRoutes = require('./operations/inventory/products.routes');
const warehouseRoutes = require('./operations/inventory/warehouse.routes');
const registerRoutes = require('./operations/inventory/registers.routes');
const yachtRequestRoutes = require('./operations/yachtRequest/yachtRequest.routes');
const indicatorsRoutes = require('./operations/indicators/indicator.routes');
const probabilityRoutes = require('./operations/indicators/probability.routes');
const impactRoutes = require('./operations/indicators/impact.routes');
const levelRoutes = require('./operations/indicators/levels.routes');
const processRoutes = require('./operations/indicators/proces.routes');
const startegryRoutes = require('./operations/indicators/strategy.routes');
const comentCardRoutes = require("./operations/comentCard/comentCard.routes");
const shippingGuideRoutes = require('./operations/shippingGuide/shippingGuide.routes');
const bar = require('./bar/bar.routes');
//Report
const reportRoutes = require("./reports/reports.routes");
const downloadsRoutes = require("./downloads/downloads.routes");


const routerApi = (app) => {

  app.use("/api/auth", authRoutes);
  app.use("/api/users", authJwt.verifyToken, guard(['users'], { reads: true, legacyRoles: ['admin'] }), usersRoutes)
  // El rol se elige al crear usuarios y personal.
  app.use("/api/roles", authJwt.verifyToken, requireAccess([['users', 'view'], ['catalogs.staff', 'view']], ['admin']), rolesRoutes);
  app.use("/api/access", authJwt.verifyToken, accessRoutes);
  app.use("/api/staffs", authJwt.verifyToken, staffGuard, staffRoutes);
  app.use("/api/departaments", authJwt.verifyToken, guard(['catalogs.departments']), departamentsRoutes);
  app.use("/api/positions", authJwt.verifyToken, guard(['catalogs.positions']), positionsRoutes);
  app.use("/api/documentation", authJwt.verifyToken, guard(['catalogs.documentation']), documentationRoutes);
  app.use("/api/yachts", authJwt.verifyToken, guard(['yachts']), yachtRoutes);
  app.use("/api/companies", authJwt.verifyToken, guard(['companies']), companyRoutes);
  app.use("/api/maintenance", authJwt.verifyToken, maintenanceGuard, maintenanceRoutes);
  //RRHH
  app.use("/api/regulations", authJwt.verifyToken, guard(['rrhh.regulations'], { selfService: [/^\/aceptar_reglamento\//] }), regulationsRoutes);
  app.use("/api/tradings", authJwt.verifyToken, guard(['rrhh.training'], { selfService: [/\/view$/] }), tradingRoutes);
  app.use("/api/formats", authJwt.verifyToken, formatsRoutes);
  app.use("/api/inductions", authJwt.verifyToken, inductionsRoutes);
  app.use("/api/hr-surveys", authJwt.verifyToken, hrSurveysRoutes);
  app.get("/api/display-orders/:module", authJwt.verifyToken, displayOrdersController.list);
  //OPERATIONS
  app.use("/api/questions", authJwt.verifyToken, guard(['evaluations']), questiondRoutes);
  app.use("/api/forms", formsRoutes);
  app.use("/api/coment_cards", comentCardRoutes);
  app.use("/api/evaluations", authJwt.verifyToken, guard(['evaluations'], { selfService: [/\/respondEvaluation$/, /\/draft$/] }), evaluationRoutes);
  app.use("/api/crew_boarding", authJwt.verifyToken, guard(['evaluations']), crewBoadingRoutes);
  app.use("/api/weekly-evaluations", authJwt.verifyToken, guard(['evaluations'], { reads: true }), weeklyEvaluationsRoutes);
  app.use("/api/orders", authJwt.verifyToken, ordersRoutes);
  app.use("/api/warehouse", authJwt.verifyToken, warehouseRoutes);
  app.use("/api/transactions", authJwt.verifyToken, transactionsRoutes);
  app.use("/api/requests", authJwt.verifyToken, yachtRequestRoutes);
  app.use("/api/products", authJwt.verifyToken, productsRoutes);
  app.use("/api/registers", authJwt.verifyToken, registerRoutes);
  app.use("/api/shipping_guides", authJwt.verifyToken, shippingGuideRoutes);
  //INDICATORS
  app.use("/api/indicators", authJwt.verifyToken, indicatorsGuard, indicatorsRoutes);
  app.use("/api/probabilities", authJwt.verifyToken, indicatorsGuard, probabilityRoutes);
  app.use("/api/impact", authJwt.verifyToken, indicatorsGuard, impactRoutes);
  app.use("/api/procedures", authJwt.verifyToken, indicatorsGuard, processRoutes);
  app.use("/api/levels", authJwt.verifyToken, indicatorsGuard, levelRoutes);
  app.use("/api/strategy", authJwt.verifyToken, indicatorsGuard, startegryRoutes);
  //REPORTS
  app.use("/api/reports", reportRoutes);
  app.use("/api/downloads", authJwt.verifyToken, downloadsRoutes);
  app.use("/api/bar", authJwt.verifyToken, guard(['bar']), bar)

};

module.exports = routerApi;