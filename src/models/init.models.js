const Users = require('./catalogs/user.models');
const Roles = require('./catalogs/roles.models');
const Positions = require('./catalogs/positions.models');
const Departaments = require('./catalogs/departament.models');
const Yacht = require('./catalogs/yacht.models');
const Staff = require('./catalogs/staff.models');
const StaffYacht = require('./catalogs/staffYacht.models')
const Captain = require('./catalogs/captains.models');
const CaptainYacht = require('./catalogs/captainYacht.models');
const Crew = require('./catalogs/crews.models');
const CrewYacht = require('./catalogs/crewYacht.models');
const Question = require('./operations/surveys/question.models');
const HouseRule = require('./catalogs/houseRule.models');
const Administrative = require('./catalogs/administratives.models');
const Form = require('./operations/surveys/form.models');
const FormEstructure = require('./operations/surveys/formEstructure.models');
const EstructureQuestion = require('./operations/surveys/estructureQuestion.models');
const FormAnswer = require('./operations/surveys/formAnswer.models');
const HeaderAnswer = require('./operations/surveys/headerAnwer.models');
const StatusEvaluation = require('./operations/surveys/statusEvaluations.models');

const initModels = () => {

    //catalogs
    Users.belongsTo(Roles, { as: "user_rol", foreignKey: "role_id" });
    Roles.hasMany(Users, { as: "rol_user", foreignKey: "role_id" });

    Staff.belongsTo(Positions, { as: "staff_position", foreignKey: "position_id" });
    Positions.hasMany(Staff, { as: "position_staff", foreignKey: "position_id" });

    Staff.belongsTo(Departaments, { as: "staff_departament", foreignKey: "departament_id" });
    Departaments.hasMany(Staff, { as: "departament_staff", foreignKey: "departament_id" });

    StaffYacht.belongsTo(Staff, { as: "staff_yacht", foreignKey: "staff_id" });
    StaffYacht.belongsTo(Yacht, { as: "yacht_staff", foreignKey: "yacht_id" });
    Staff.hasMany(StaffYacht, { as: 'yachts', foreignKey: 'staff_id' });

    // CaptainYacht.belongsTo(Captain, { as: "captain_yacht", foreignKey: "captain_id" });
    // CaptainYacht.belongsTo(Yacht, { as: "yacht_captain", foreignKey: "yacht_id" });
    // Captain.hasMany(CaptainYacht, { as: 'yachts', foreignKey: 'captain_id' });
    
    // CrewYacht.belongsTo(Crew, { as: "crew_yacht", foreignKey: "crew_id" });
    // CrewYacht.belongsTo(Yacht, { as: "yacht_crew", foreignKey: "yacht_id" });
    // Crew.hasMany(CrewYacht, { as: 'yachts', foreignKey: 'crew_id' });
    //operations
    FormEstructure.belongsTo(Form, { as: "form_questions", foreignKey: "form_id" });
    FormEstructure.belongsTo(EstructureQuestion, { as: "questions_estucture", foreignKey: "estructure_question_id" });
    Form.hasMany(FormEstructure, { as: 'form_estructure', foreignKey: 'form_id' });
    //Anwers
    HeaderAnswer.belongsTo(Form, { as: "header_form", foreignKey: "form_id" });
    Form.hasMany(HeaderAnswer, { as: 'form_header', foreignKey: 'form_id' });
    HeaderAnswer.belongsTo(Yacht, { as: 'header_yacht', foreignKey: 'yacht_id' });
    Yacht.hasMany(HeaderAnswer, { as: 'yacht_header', foreignKey: 'yacht_id' });
    FormAnswer.belongsTo(HeaderAnswer, { as: 'header_aswer', foreignKey: 'header_answer_id' });
    HeaderAnswer.hasMany(FormAnswer, { as: 'answer_header', foreignKey: 'header_answer_id' });
    FormAnswer.belongsTo(EstructureQuestion, { as: 'aswer_question', foreignKey: 'estructure_question_id' });
    //state
    StatusEvaluation.belongsTo(HeaderAnswer, { as: "header_state", foreignKey: "state_id" });
    HeaderAnswer.hasMany(StatusEvaluation, { as: 'state', foreignKey: 'state_id' });

    Question,
    HouseRule,
    Administrative

}

module.exports = initModels;