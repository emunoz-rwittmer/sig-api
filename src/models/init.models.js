const Users = require('./catalogs/user.models');
const Roles = require('./catalogs/roles.models');
const Positions = require('./catalogs/positions.models');
const Departaments = require('./catalogs/departament.models');
const Yacht = require('./catalogs/yacht.models');
const Company = require('./catalogs/company.models');
const Staff = require('./catalogs/staff.models');
const StaffYacht = require('./catalogs/staffYacht.models')
const Question = require('./operations/surveys/question.models');
const HouseRule = require('./catalogs/houseRule.models');
const Form = require('./operations/surveys/form.models');
const FormEstructure = require('./operations/surveys/formEstructure.models');
const EstructureQuestion = require('./operations/surveys/estructureQuestion.models');
const FormAnswer = require('./operations/surveys/formAnswer.models');
const HeaderAnswer = require('./operations/surveys/headerAnwer.models');
const StatusEvaluation = require('./operations/surveys/statusEvaluations.models');
const Order = require('./operations/orders/order.models');
const itemsOrder = require('./operations/orders/itemsOrder.models');

const initModels = () => {

    //catalogs
    Users.belongsTo(Roles, { as: "user_rol", foreignKey: "role_id" });
    Roles.hasMany(Users, { as: "rol_user", foreignKey: "role_id" }); Staff.belongsTo(Positions, { as: "staff_position", foreignKey: "position_id" });
    Positions.hasMany(Staff, { as: "position_staff", foreignKey: "position_id" });
    Staff.belongsTo(Departaments, { as: "staff_departament", foreignKey: "departament_id" });
    Departaments.hasMany(Staff, { as: "departament_staff", foreignKey: "departament_id" });
    StaffYacht.belongsTo(Staff, { as: "staff_yacht", foreignKey: "staff_id" });
    StaffYacht.belongsTo(Yacht, { as: "yacht_staff", foreignKey: "yacht_id" });
    Staff.hasMany(StaffYacht, { as: 'yachts', foreignKey: 'staff_id' });
    Form.belongsTo(Positions, { as: "position_form", foreignKey: "position_id" });
    Positions.hasMany(Form, { as: 'positions', foreignKey: 'position_id' });
    Yacht.belongsTo(Company, { as: 'company', foreignKey: 'company_id' });
    //operations
    FormEstructure.belongsTo(Form, { as: "form_questions", foreignKey: "form_id" });
    FormEstructure.belongsTo(EstructureQuestion, { as: "questions_estucture", foreignKey: "estructure_question_id" });
    Form.hasMany(FormEstructure, { as: 'form_estructure', foreignKey: 'form_id' });
    //Anwers
    HeaderAnswer.belongsTo(Form, { as: "header_form", foreignKey: "form_id" });
    Form.hasMany(HeaderAnswer, { as: 'form_header', foreignKey: 'form_id' });
    FormAnswer.belongsTo(HeaderAnswer, { as: 'header_aswer', foreignKey: 'header_answer_id' });
    HeaderAnswer.hasMany(FormAnswer, { as: 'answer_header', foreignKey: 'header_answer_id' });
    FormAnswer.belongsTo(EstructureQuestion, { as: 'aswer_question', foreignKey: 'estructure_question_id' });
    HeaderAnswer.belongsTo(Staff, { as: 'header_evalutor', foreignKey: 'evaluator_id' });
    Staff.hasMany(HeaderAnswer, { as: 'evaluator_header', foreignKey: 'evaluator_id' });
    HeaderAnswer.belongsTo(Staff, { as: 'header_evaluted', foreignKey: 'evaluated_id' });
    Staff.hasMany(HeaderAnswer, { as: 'evaluated_header', foreignKey: 'evaluated_id' });
    HeaderAnswer.belongsTo(Yacht, { as: 'header_yacht', foreignKey: 'yacht_id' });
    Yacht.hasMany(HeaderAnswer, { as: 'yacht_header', foreignKey: 'yacht_id' });
    //state
    HeaderAnswer.belongsTo(StatusEvaluation, { as: 'state', foreignKey: 'state_id' });
    StatusEvaluation.hasMany(HeaderAnswer, { as: "header_state", foreignKey: "state_id" });
    //Order
    Order.belongsTo(Company, { as: "order_company", foreignKey: "company_id" });
    Company.hasMany(Order, { as: "orders", foreignKey: "company_id" });
    
    itemsOrder.belongsTo(Order, {as: "items_order", foreignKey: "order_id"})
    Order.hasMany(itemsOrder, { as: "items", foreignKey: "order_id" });

    Order.belongsTo(Users, { as: "order_user", foreignKey: "user_id" });
    Users.hasMany(Order, { as: "user_orders", foreignKey: "user_id" });

    Question,
    HouseRule

}

module.exports = initModels;