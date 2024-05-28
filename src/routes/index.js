const authRoutes = require("./catalogs/auth.routes");
const usersRoutes = require("./catalogs/users.routes");
const authJwt = require("../middlewares/auth.middleware");
const rolesRoutes = require("./catalogs/roles.routes");
const yachtRoutes = require("./catalogs/yachts.routes")
const captainsRoutes = require("./catalogs/captains.routes"); 
const crewsRoutes = require("./catalogs/crews.routes");
const formsRoutes = require("./operations/surveys/forms.routes");
const HouseRulesRoutes = require("./catalogs/houseRules.routes");
const AdministrativeRoutes = require("./catalogs/administratives.routes");
//Operations
const questiondRoutes = require("./operations/surveys/questions.routes");
const evaluationRoutes = require("./operations/surveys/evaluation.routes");

const routerApi = (app) => {

    app.use("/api/auth", authRoutes);
    app.use("/api/users", authJwt.verifyToken, authJwt.isAdmin, usersRoutes)
    app.use("/api/roles", authJwt.verifyToken, authJwt.isAdmin, rolesRoutes);
    app.use("/api/yachts", authJwt.verifyToken, authJwt.isAdminOfSurveys, yachtRoutes); 
    app.use("/api/captains", authJwt.verifyToken, authJwt.isAdminOfSurveys, captainsRoutes);
    app.use("/api/crews", authJwt.verifyToken, authJwt.isAdminOfSurveys, crewsRoutes);
    app.use("/api/houseRules", authJwt.verifyToken, authJwt.isAdminOfSurveys, HouseRulesRoutes);
    app.use("/api/administratives", authJwt.verifyToken, authJwt.isAdminOfSurveys, AdministrativeRoutes);
    //OPERATIONS
    app.use("/api/questions", authJwt.verifyToken, authJwt.isAdminOfSurveys, questiondRoutes);
    app.use("/api/forms", authJwt.verifyToken, authJwt.isAdminOfSurveys, formsRoutes);
    app.use("/api/evaluations", authJwt.verifyToken, evaluationRoutes)
  };
  
  module.exports = routerApi;