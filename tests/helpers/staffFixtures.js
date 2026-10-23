const Departaments = require('../../src/models/catalogs/departament.models');
const Positions = require('../../src/models/catalogs/positions.models');
const Company = require('../../src/models/catalogs/company.models');
const Yacht = require('../../src/models/catalogs/yacht.models');

async function createDepartment(name = 'Operaciones') {
    return Departaments.create({ name });
}

async function createPosition(name = 'Analista', departamentId = null) {
    return Positions.create({ name, departamentId });
}

async function createCompanyWithYacht(companyName = 'Test Company', yachtName = 'Test Yacht') {
    const uniqueSuffix = `${Math.floor(Math.random() * 1e9)}`;
    const company = await Company.create({
        name: companyName,
        ruc: `12345678${Date.now().toString().slice(-5)}`,
        logo: '/uploads/companies/test-logo.png',
        adress: 'Av. Test 123',
    });
    const yacht = await Yacht.create({
        companyId: company.id,
        name: yachtName,
        email: `yacht-${uniqueSuffix}@example.com`,
        code: `YT-${uniqueSuffix}`,
        color: '#FFFFFF',
    });
    return { company, yacht };
}

// Cargo dentro de un departamento homónimo (p. ej. para asignar encuestas por cargo).
async function createAssignablePosition(name = 'Operaciones') {
    const departament = await createDepartment(name);
    return createPosition(name, departament.id);
}

module.exports = { createDepartment, createPosition, createAssignablePosition, createCompanyWithYacht };
