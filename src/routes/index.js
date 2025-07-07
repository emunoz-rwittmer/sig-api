const authRoutes = require("./catalogs/auth.routes");
const usersRoutes = require("./catalogs/users.routes");
const authJwt = require("../middlewares/auth.middleware");
const rolesRoutes = require("./catalogs/roles.routes");
const departamentsRoutes = require("./catalogs/departaments.routes");
const positionsRoutes = require("./catalogs/positions.routes");
const yachtRoutes = require("./catalogs/yachts.routes")
const companyRoutes = require("./catalogs/company.routes");
const staffRoutes = require("./catalogs/staff.routes");
const formsRoutes = require("./operations/surveys/forms.routes");
const HouseRulesRoutes = require("./catalogs/houseRules.routes");
const regulationsRoutes = require("./rrhh/regulations.routes");
const tradingRoutes = require("./rrhh/trading.routes");
//Operations
const questiondRoutes = require("./operations/surveys/questions.routes");
const evaluationRoutes = require("./operations/surveys/evaluation.routes");
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

//Report
const reportRoutes = require("./reports/reports.routes");
const downloadsRoutes = require("./donwloads/donwloads.routes");


const routerApi = (app) => {

  app.use("/api/auth", authRoutes);
  app.use("/api/users", authJwt.verifyToken, authJwt.isAdmin, usersRoutes)
  app.use("/api/roles", authJwt.verifyToken, authJwt.isAdmin, rolesRoutes);
  app.use("/api/departaments", authJwt.verifyToken, departamentsRoutes);
  app.use("/api/positions", authJwt.verifyToken, positionsRoutes);
  app.use("/api/yachts", authJwt.verifyToken, yachtRoutes);
  app.use("/api/companies", authJwt.verifyToken, companyRoutes);
  app.use("/api/staffs", authJwt.verifyToken, staffRoutes);
  //RRHH
  app.use("/api/regulations", authJwt.verifyToken, regulationsRoutes);
  app.use("/api/tradings", authJwt.verifyToken, tradingRoutes);
  //OPERATIONS
  app.use("/api/questions", authJwt.verifyToken, questiondRoutes);
  app.use("/api/forms", formsRoutes);
  app.use("/api/coment_cards", comentCardRoutes);
  app.use("/api/evaluations", authJwt.verifyToken, evaluationRoutes);
  app.use("/api/orders", authJwt.verifyToken, ordersRoutes);
  app.use("/api/warehouse", authJwt.verifyToken, warehouseRoutes);
  app.use("/api/transactions", authJwt.verifyToken, transactionsRoutes);
  app.use("/api/requests", authJwt.verifyToken, yachtRequestRoutes);
  app.use("/api/products", authJwt.verifyToken, productsRoutes);
  app.use("/api/registers", authJwt.verifyToken, registerRoutes);
  //INDICATORS
  app.use("/api/indicators", authJwt.verifyToken, indicatorsRoutes);
  app.use("/api/probabilities", authJwt.verifyToken, probabilityRoutes);
  app.use("/api/impact", authJwt.verifyToken, impactRoutes);
  app.use("/api/procedures", authJwt.verifyToken, processRoutes);
  app.use("/api/levels", authJwt.verifyToken, levelRoutes);
  app.use("/api/strategy", authJwt.verifyToken, startegryRoutes);
  //REPORTS
  app.use("/api/reports", authJwt.verifyToken, reportRoutes);
  app.use("/api/downloads", authJwt.verifyToken, downloadsRoutes);

};

module.exports = routerApi;