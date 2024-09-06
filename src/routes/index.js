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
//Operations
const questiondRoutes = require("./operations/surveys/questions.routes");
const evaluationRoutes = require("./operations/surveys/evaluation.routes");
const ordersRoutes = require('./operations/orders/order.routes');
const transactionsRoutes = require('./operations/inventory/transactions.routes');
const productsRoutes = require('./operations/inventory/products.routes');

const routerApi = (app) => {

    app.use("/api/auth", authRoutes);
    app.use("/api/users", authJwt.verifyToken, authJwt.isAdmin, usersRoutes)
    app.use("/api/roles", authJwt.verifyToken, authJwt.isAdmin, rolesRoutes);
    app.use("/api/departaments", authJwt.verifyToken, departamentsRoutes);
    app.use("/api/positions", authJwt.verifyToken, positionsRoutes);
    app.use("/api/yachts", authJwt.verifyToken, yachtRoutes);
    app.use("/api/companies", authJwt.verifyToken, companyRoutes); 
    app.use("/api/staffs", authJwt.verifyToken, staffRoutes);
    app.use("/api/houseRules", authJwt.verifyToken, HouseRulesRoutes);
    //OPERATIONS
    app.use("/api/questions", authJwt.verifyToken, questiondRoutes);
    app.use("/api/forms", formsRoutes);
    app.use("/api/evaluations", authJwt.verifyToken, evaluationRoutes);
    app.use("/api/orders", authJwt.verifyToken, ordersRoutes);
    app.use("/api/transactions", authJwt.verifyToken, transactionsRoutes)
    app.use("/api/products", authJwt.verifyToken, productsRoutes)

  };
  
  module.exports = routerApi;