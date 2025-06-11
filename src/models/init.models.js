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
// Invetory Models
const Order = require('./operations/orders/order.models');
const itemsOrder = require('./operations/orders/itemsOrder.models');
const Warehouse = require('./catalogs/wareHouse.models');
const Stock = require('./operations/inventory/stock.models');
const Product = require('./operations/orders/product.models');
const Transaction = require('./operations/inventory/transaction.models');
const productCalculations = require('./operations/orders/productCalculations.models');
const Request = require('./operations/yachtRequest/request.models');
const itemsRequest = require('./operations/yachtRequest/itemsRequest.models');
const PlacesYacht = require('./operations/yachtRequest/placesYacht');
const LaundryYacht = require('./operations/yachtRequest/laundryYacht');
// Manameng Indicators
const Indicator = require('./operations/indicators/indicator.models');
const Tabulation = require('./operations/indicators/tabulation.models');
const Formula = require('./operations/indicators/formula.models');
const Process = require('./operations/indicators/process.models');
const ProcessStaff = require('./operations/indicators/processStaffs.models');
const Impact = require('./operations/indicators/impact.models');
const Levels = require('./operations/indicators/levels.models');
const Strategy = require('./operations/indicators/strategy.models');
const Register = require('./operations/inventory/register.models');
const Consecutivo = require('./catalogs/consecutivo.model');
const ComentCard = require('./operations/comentCard/comentCard.models');
const ComentCardRespond = require('./operations/comentCard/comentCardRespond.models');
const ComentCardAnswers = require('./operations/comentCard/comentCardAnswers.models');
const ComentCardQuestions = require('./operations/comentCard/comentCardQuestions.models');
const ComentCardYacht = require('./operations/comentCard/cardYacht.models');
const ComentCardQR = require('./operations/comentCard/cardQR.models');
const StaffCompany = require('./catalogs/staffCompany.models');

const initModels = () => {

    //catalogs
    Consecutivo,
        Question,
        HouseRule
    Users.belongsTo(Roles, { as: "user_rol", foreignKey: "role_id" });
    Roles.hasMany(Users, { as: "rol_user", foreignKey: "role_id" });
    Staff.belongsTo(Roles, { as: "rol", foreignKey: "role_id" });
    Roles.hasMany(Staff, { as: "staffs", foreignKey: "role_id" });
    Staff.belongsTo(Positions, { as: "staff_position", foreignKey: "position_id" });
    Positions.hasMany(Staff, { as: "position_staff", foreignKey: "position_id" });
    Staff.belongsTo(Departaments, { as: "staff_departament", foreignKey: "departament_id" });
    Departaments.hasMany(Staff, { as: "departament_staff", foreignKey: "departament_id" });

    StaffCompany.belongsTo(Staff, { as: "staff", foreignKey: "staff_id" });
    StaffCompany.belongsTo(Company, { as: "company", foreignKey: "company_id" });
    Staff.hasMany(StaffCompany, { as: 'companies', foreignKey: 'staff_id' });

    StaffYacht.belongsTo(Staff, { as: "staff_yacht", foreignKey: "staff_id" });
    StaffYacht.belongsTo(Yacht, { as: "yacht_staff", foreignKey: "yacht_id" });
    Staff.hasMany(StaffYacht, { as: 'yachts', foreignKey: 'staff_id' });

    Form.belongsTo(Positions, { as: "position_form", foreignKey: "position_id" });
    Positions.hasMany(Form, { as: 'positions', foreignKey: 'position_id' });
    //operations
    FormEstructure.belongsTo(Form, { as: "form_questions", foreignKey: "form_id" });
    FormEstructure.belongsTo(EstructureQuestion, { as: "questions_estucture", foreignKey: "estructure_question_id" });
    Form.hasMany(FormEstructure, { as: 'form_estructure', foreignKey: 'form_id' });
    //Anwers
    HeaderAnswer.belongsTo(Form, { as: "header_form", foreignKey: "form_id" });
    Form.hasMany(HeaderAnswer, { as: 'form_header', foreignKey: 'form_id' });

    HeaderAnswer.hasMany(FormAnswer, { as: 'answer_header', foreignKey: 'header_answer_id' });
    FormAnswer.belongsTo(HeaderAnswer, { as: 'header_aswer', foreignKey: 'header_answer_id' });

    FormAnswer.belongsTo(EstructureQuestion, { as: 'aswer_question', foreignKey: 'estructure_question_id' });
    HeaderAnswer.belongsTo(Staff, { as: 'header_evalutor', foreignKey: 'evaluator_id' });

    Staff.hasMany(HeaderAnswer, { as: 'evaluator_header', foreignKey: 'evaluator_id' });
    HeaderAnswer.belongsTo(Staff, { as: 'header_evaluted', foreignKey: 'evaluated_id' });

    Staff.hasMany(HeaderAnswer, { as: 'evaluated_header', foreignKey: 'evaluated_id' });
    HeaderAnswer.belongsTo(Yacht, { as: 'header_yacht', foreignKey: 'yacht_id' });

    Yacht.hasMany(HeaderAnswer, { as: 'yacht_header', foreignKey: 'yacht_id' });


    //coment cards

    ComentCardRespond.hasMany(ComentCardAnswers, { as: 'respuestas', foreignKey: "respuesta_coment_card_id", onDelete: "CASCADE" });
    ComentCardAnswers.belongsTo(ComentCardRespond, { as: 'respuesta_formulario', foreignKey: "respuesta_coment_card_id" });

    ComentCardQuestions.hasOne(ComentCardAnswers, { as: 'respuesta', foreignKey: "pregunta_id", onDelete: "CASCADE" });
    ComentCardAnswers.belongsTo(ComentCardQuestions, { as: 'pregunta', foreignKey: "pregunta_id" });

    ComentCard.hasMany(ComentCardQuestions, { as: 'preguntas', foreignKey: "coment_card_id", onDelete: "CASCADE" });
    ComentCardQuestions.belongsTo(ComentCard, { as: 'coment_card', foreignKey: "coment_card_id" });

    ComentCardYacht.belongsTo(ComentCard, { as: "coment_card", foreignKey: "coment_card_id" });
    ComentCardYacht.belongsTo(Yacht, { as: "yate", foreignKey: "yacht_id" });
    ComentCard.hasMany(ComentCardYacht, { as: 'yates', foreignKey: 'coment_card_id' });

    ComentCardYacht.hasMany(ComentCardQR, { as: 'links_acceso', foreignKey: "coment_card_yacht_id", onDelete: "CASCADE" });
    ComentCardQR.belongsTo(ComentCardYacht, { as: 'card_yacht', foreignKey: "coment_card_yacht_id" });

    ComentCardQR.hasMany(ComentCardRespond, { as: 'respuestas_coment_card', foreignKey: 'card_qr_id', onDelete: "CASCADE" });
    ComentCardRespond.belongsTo(ComentCardQR, { as: 'coment_card', foreignKey: 'card_qr_id' });

    //state
    HeaderAnswer.belongsTo(StatusEvaluation, { as: 'state', foreignKey: 'state_id' });
    StatusEvaluation.hasMany(HeaderAnswer, { as: "header_state", foreignKey: "state_id" });

    //INVENTORY RELATIONS
    Company.hasOne(Yacht, { foreignKey: 'company_id', as: 'yacht' });
    Yacht.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    Yacht.hasOne(Warehouse, { foreignKey: 'yacht_id', as: 'warehouse' });

    Warehouse.belongsTo(Yacht, { foreignKey: 'yacht_id', as: 'yacht' });
    Company.hasMany(Order, { foreignKey: 'company_id', as: 'orders' });

    Order.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    Order.hasMany(itemsOrder, { foreignKey: 'order_id', as: 'orderItems' });
    itemsOrder.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

    Order.belongsTo(Staff, { foreignKey: 'user_id', as: 'responsible' });
    Staff.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });

    Warehouse.hasMany(Stock, { foreignKey: 'warehouse_id', as: 'stocks' });
    Stock.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    Product.hasMany(Stock, { foreignKey: 'product_id', as: 'stocks' });
    Stock.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

    Company.hasMany(Stock, { foreignKey: 'company_id', as: 'stocks' });
    Stock.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

    Product.hasMany(Transaction, { foreignKey: 'product_id', as: 'transactions' });
    Transaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
    Transaction.belongsTo(Staff, { foreignKey: 'user_id', as: 'responsible' });

    Register.hasMany(Transaction, { foreignKey: 'register_id', as: 'transactiones' });
    Transaction.belongsTo(Register, { foreignKey: 'register_id', as: 'registro' });

    Company.hasMany(Register, { foreignKey: 'company_id', as: 'registros' });
    Register.belongsTo(Company, { foreignKey: 'company_id', as: 'empresa' });

    Staff.hasMany(Register, { foreignKey: 'user_id', as: 'registros' });
    Register.belongsTo(Staff, { foreignKey: 'user_id', as: 'responsable' });

    Staff.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
    Warehouse.hasMany(Transaction, { foreignKey: 'warehouse_from_id', as: 'outgoingTransactions' });// Bodega de origen
    Transaction.belongsTo(Warehouse, { foreignKey: 'warehouse_from_id', as: 'warehouseFrom' });
    Warehouse.hasMany(Transaction, { foreignKey: 'warehouse_to_id', as: 'incomingTransactions' }); // Bodega de destino
    Transaction.belongsTo(Warehouse, { foreignKey: 'warehouse_to_id', as: 'warehouseTo' });

    Product.hasMany(PlacesYacht, { as: 'configurations', foreignKey: 'product_id' });
    PlacesYacht.belongsTo(Product, { as: "product", foreignKey: "product_id" });
    PlacesYacht.belongsTo(productCalculations, { as: "configuration", foreignKey: "configuration_id" });

    LaundryYacht.belongsTo(Product, { as: "product", foreignKey: "product_id" });
    LaundryYacht.belongsTo(Warehouse, { as: "warehose", foreignKey: "warehouse_id" });
    Product.hasMany(LaundryYacht, { as: 'wineries', foreignKey: 'product_id' });

    Warehouse.hasMany(Request, { foreignKey: 'warehouse_id', as: 'requests' });

    Request.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
    Request.hasMany(itemsRequest, { foreignKey: 'request_id', as: 'requestItems' });
    itemsRequest.belongsTo(Request, { foreignKey: 'request_id', as: 'request' });

    Request.belongsTo(Staff, { foreignKey: 'user_id', as: 'responsible' });
    Staff.hasMany(Request, { foreignKey: 'user_id', as: 'request' });
    itemsRequest.belongsTo(PlacesYacht, { foreignKey: 'placeYachtId', as: 'placeYacht' });

    // INDICATOR
    Process.hasMany(Indicator, { as: "indicadores", foreignKey: "departament_id" });
    Indicator.belongsTo(Process, { as: "departament", foreignKey: "departament_id" });

    Formula.hasMany(Indicator, { as: "indicator", foreignKey: "formula_id" });
    Indicator.belongsTo(Formula, { as: "formula_indicator", foreignKey: "formula_id" });

    Indicator.hasMany(Tabulation, { as: "tabulations", foreignKey: "indicator_id" });
    Tabulation.belongsTo(Indicator, { as: "indicator", foreignKey: "indicator_id" });

    Process.hasMany(ProcessStaff, { as: "processStaff", foreignKey: "process_id" });
    ProcessStaff.belongsTo(Process, { as: "process", foreignKey: "process_id" });
    ProcessStaff.belongsTo(Staff, { as: "staffs", foreignKey: "staff_id" });

    Impact
    Levels,
        Strategy

}

module.exports = initModels;