const Users = require('./catalogs/user.models');
const Roles = require('./catalogs/roles.models');
const Positions = require('./catalogs/positions.models');
const Departaments = require('./catalogs/departament.models');
const Yacht = require('./catalogs/yacht.models');
const Company = require('./catalogs/company.models');
const Staff = require('./catalogs/staff.models');
const StaffCompany = require('./catalogs/staffCompany.models');
const Question = require('./operations/surveys/question.models');
const HouseRule = require('./catalogs/houseRule.models');
const Form = require('./operations/surveys/form.models');
// commentcards
const ComentCard = require('./operations/comentCard/comentCard.models');
const ComentCardRespond = require('./operations/comentCard/comentCardRespond.models');
const ComentCardAnswers = require('./operations/comentCard/comentCardAnswers.models');
const ComentCardQuestions = require('./operations/comentCard/comentCardQuestions.models');
const ComentCardYacht = require('./operations/comentCard/cardYacht.models');
const ComentCardQR = require('./operations/comentCard/cardQR.models');
// Invetory Models
const Order = require('./operations/orders/order.models');
const orderItems = require('./operations/orders/orderItems.models');
const Warehouse = require('./catalogs/wareHouse.models');
const Stock = require('./operations/inventory/stock.models');
const Product = require('./operations/orders/product.models');
const Transaction = require('./operations/inventory/transaction.models');
const Request = require('./operations/yachtRequest/request.models');
const LaundryYacht = require('./operations/yachtRequest/laundryYacht');
const ShippingGuide = require('./operations/shippingGuide/shippingGuide.models');
const shippingGuideItems = require('./operations/shippingGuide/shippingGuideItems.models');
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

const Regulation = require('./rrhh/regulation.models');
const StaffReadRegulation = require('./rrhh/readRegulation.models');
const Trading = require('./rrhh/trading.models');
const Format = require('./rrhh/format.models');
const DoctorFormat = require('./rrhh/doctorFormat.models');
const ShippingGuideCount = require('./operations/shippingGuide/shippingGuideCount.model');
const ShipmentDates = require('./operations/surveys/shipmentDates.models');
const FormRespond = require('./operations/surveys/formRespond.models');
const FormAnswers = require('./operations/surveys/formAnswers.models');
const FormQuestion = require('./operations/surveys/formQuestion.models');
const ProductConfiguration = require('./operations/inventory/productConfiguration');
const RequestItems = require('./operations/yachtRequest/requestItems.models');
const StaffDocumentation = require('./catalogs/staffDocumentation.models');
const Documentation = require('./catalogs/documentation.models');

const initModels = () => {

    //catalogs
    Consecutivo,
        ShippingGuideCount,
        Question,
        HouseRule,
        Trading,
        Format,
        DoctorFormat

    Users.belongsTo(Roles, { as: "user_rol", foreignKey: "role_id" });
    Roles.hasMany(Users, { as: "rol_user", foreignKey: "role_id" });

    Staff.belongsTo(Roles, { as: "rol", foreignKey: "role_id" });
    Roles.hasMany(Staff, { as: "staffs", foreignKey: "role_id" });

    Staff.belongsTo(Positions, { as: "staff_position", foreignKey: "position_id" });
    Positions.hasMany(Staff, { as: "position_staff", foreignKey: "position_id" });

    Staff.belongsTo(Departaments, { as: "staff_departament", foreignKey: "departament_id" });
    Departaments.hasMany(Staff, { as: "departament_staff", foreignKey: "departament_id" });

    StaffDocumentation.belongsTo(Staff, { as: "staff", foreignKey: "staff_id" });
    StaffDocumentation.belongsTo(Documentation, { as: "document", foreignKey: "document_id" });
    Staff.hasMany(StaffDocumentation, { as: "documentation", foreignKey: "staff_id", onDelete: 'CASCADE', hooks: true });

    StaffCompany.belongsTo(Staff, { as: "staff", foreignKey: "staff_id" });
    StaffCompany.belongsTo(Company, { as: "company", foreignKey: "company_id" });
    ShipmentDates.belongsTo(StaffCompany, { as: "empresa", foreignKey: "staff_company_id" });
    StaffCompany.hasMany(ShipmentDates, { as: "embarques", foreignKey: "staff_company_id", onDelete: 'CASCADE', hooks: true });
    Staff.hasMany(StaffCompany, { as: 'companies', foreignKey: 'staff_id', onDelete: 'CASCADE', hooks: true });
    Company.hasMany(StaffCompany, { as: 'personal', foreignKey: 'company_id', onDelete: 'CASCADE', hooks: true });


    //rrhh
    Company.hasMany(Regulation, { as: "regulations", foreignKey: "company_id" });
    Regulation.belongsTo(Company, { as: "company", foreignKey: "company_id" });

    Staff.hasMany(StaffReadRegulation, { as: "regulation_reads", foreignKey: "staff_id" });
    StaffReadRegulation.belongsTo(Staff, { as: "staff", foreignKey: "staff_id" });

    Regulation.hasMany(StaffReadRegulation, { as: "reads", foreignKey: "regulation_id" });
    StaffReadRegulation.belongsTo(Regulation, { as: "regulation", foreignKey: "regulation_id" });

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

    //Evaluations

    Form.hasMany(FormRespond, { as: 'respuestas', foreignKey: 'form_id', onDelete: "CASCADE" });
    FormRespond.belongsTo(Form, { as: 'formulario', foreignKey: 'form_id' });

    FormRespond.hasMany(FormAnswers, { as: 'respuestas', foreignKey: "respuesta_form_id", onDelete: "CASCADE" });
    FormAnswers.belongsTo(FormRespond, { as: 'respuesta_formulario', foreignKey: "respuesta_form_id" });

    FormQuestion.hasOne(FormAnswers, { as: 'respuesta', foreignKey: "pregunta_id", onDelete: "CASCADE" });
    FormAnswers.belongsTo(FormQuestion, { as: 'pregunta', foreignKey: "pregunta_id" });

    Form.hasMany(FormQuestion, { as: 'preguntas', foreignKey: "form_id", onDelete: "CASCADE" });
    FormQuestion.belongsTo(Form, { as: 'formulario', foreignKey: "form_id" });

    Company.hasMany(FormRespond, { as: 'respuestas', foreignKey: 'company_id', onDelete: "CASCADE" });
    FormRespond.belongsTo(Company, { as: 'empresa', foreignKey: 'company_id' });

    //INVENTORY RELATIONS
    Company.hasOne(Yacht, { foreignKey: 'company_id', as: 'yacht' });
    Yacht.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    Yacht.hasOne(Warehouse, { foreignKey: 'yacht_id', as: 'warehouse' });

    Order.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
    Order.hasMany(orderItems, { foreignKey: 'order_id', as: 'orderItems' });
    orderItems.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

    ShippingGuide.hasMany(shippingGuideItems, { foreignKey: 'guide_id', as: 'details' });
    shippingGuideItems.belongsTo(ShippingGuide, { foreignKey: 'guide_id', as: 'guide' });

    Order.belongsTo(Staff, { foreignKey: 'user_id', as: 'responsible' });
    Staff.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });

    //WAREHOUSE
    Warehouse.belongsTo(Yacht, { foreignKey: 'yacht_id', as: 'yacht' });
    Company.hasMany(Order, { foreignKey: 'company_id', as: 'orders' });

    Warehouse.hasMany(Stock, { foreignKey: 'warehouse_id', as: 'stocks' });
    Stock.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    Staff.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
    Warehouse.hasMany(Transaction, { foreignKey: 'warehouse_from_id', as: 'outgoingTransactions' });// Bodega de origen
    Transaction.belongsTo(Warehouse, { foreignKey: 'warehouse_from_id', as: 'warehouseFrom' });

    Warehouse.hasMany(Transaction, { foreignKey: 'warehouse_to_id', as: 'incomingTransactions' }); // Bodega de destino
    Transaction.belongsTo(Warehouse, { foreignKey: 'warehouse_to_id', as: 'warehouseTo' });

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

    Product.hasMany(ProductConfiguration, { as: 'configurations', foreignKey: 'product_id', onDelete: "CASCADE" });
    ProductConfiguration.belongsTo(Product, { as: "product", foreignKey: "product_id" });

    LaundryYacht.belongsTo(Product, { as: "product", foreignKey: "product_id" });
    LaundryYacht.belongsTo(Warehouse, { as: "warehose", foreignKey: "warehouse_id" });
    Product.hasMany(LaundryYacht, { as: 'wineries', foreignKey: 'product_id' });

    Warehouse.hasMany(Request, { foreignKey: 'warehouse_id', as: 'requests' });
    Request.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

    Request.hasMany(RequestItems, { foreignKey: 'request_id', as: 'requestItems' });
    RequestItems.belongsTo(Request, { foreignKey: 'request_id', as: 'request' });

    Request.belongsTo(Staff, { foreignKey: 'user_id', as: 'responsible' });
    Staff.hasMany(Request, { foreignKey: 'user_id', as: 'request' });
    RequestItems.belongsTo(ProductConfiguration, { foreignKey: 'configuration_id', as: 'configuracion' });

    // INDICATOR
    Process.hasMany(Indicator, { as: "indicadores", foreignKey: "departament_id" });
    Indicator.belongsTo(Process, { as: "departament", foreignKey: "departament_id" });

    Formula.hasMany(Indicator, { as: "indicator", foreignKey: "formula_id" });
    Indicator.belongsTo(Formula, { as: "formula_indicator", foreignKey: "formula_id" });

    Indicator.hasMany(Tabulation, { as: "tabulations", foreignKey: "indicator_id" });
    Tabulation.belongsTo(Indicator, { as: "indicator", foreignKey: "indicator_id" });

    Departaments.hasOne(Process, { foreignKey: 'departament_id', as: 'proceso' });
    Process.belongsTo(Departaments, { foreignKey: 'departament_id', as: 'departamento' });

    Process.hasMany(ProcessStaff, { as: "processStaff", foreignKey: "process_id" });
    ProcessStaff.belongsTo(Process, { as: "process", foreignKey: "process_id" });
    ProcessStaff.belongsTo(Staff, { as: "staffs", foreignKey: "staff_id" });

    Impact
    Levels,
        Strategy

}

module.exports = initModels;