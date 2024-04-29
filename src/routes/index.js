const authRoutes = require("./catalogs/auth.routes");
const usersRoutes = require("./catalogs/users.routes");
const authJwt = require("../middlewares/auth.middleware");
const rolesRoutes = require("./catalogs/roles.routes");
const yachtRoutes = require("./catalogs/yachts.routes")
const captainsRoutes = require("./catalogs/captains.routes"); 
const crewsRoutes = require("./catalogs/crews.routes");
const formsRoutes = require("./operations/surveys/forms.routes");
const HouseRulesRoutes = require("./catalogs/houseRules.routes");
//Operations
const questiondRoutes = require("./operations/surveys/questions.routes");
const evaluationRoutes = require("./operations/evaluations/evaluation.routes");

const routerApi = (app) => {

    app.use("/api/auth", authRoutes);
    app.use("/api/users", authJwt.verifyToken, authJwt.isAdmin, usersRoutes)
    app.use("/api/roles", authJwt.verifyToken, rolesRoutes);
    app.use("/api/yachts", authJwt.verifyToken, yachtRoutes);
    app.use("/api/captains", authJwt.verifyToken, captainsRoutes);
    app.use("/api/crews", authJwt.verifyToken, crewsRoutes);
    app.use("/api/houseRules", authJwt.verifyToken, HouseRulesRoutes);
    //OPERATIONS
    app.use("/api/questions", authJwt.verifyToken, questiondRoutes);
    app.use("/api/forms", authJwt.verifyToken, formsRoutes);
    app.use("/api/evaluations", authJwt.verifyToken, evaluationRoutes)
  };
  
  module.exports = routerApi;