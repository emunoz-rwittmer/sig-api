const Departaments = require('../../src/models/catalogs/departament.models');
const Positions = require('../../src/models/catalogs/positions.models');
const Company = require('../../src/models/catalogs/company.models');
const Yacht = require('../../src/models/catalogs/yacht.models');

async function createDepartment(name = 'Operaciones') {
    return Departaments.create({ name });
}

async function createPosition(name = 'Analista') {
    return Positions.create({ name });
}

async function createCompanyWithYacht(companyName = 'Test Company', yachtName = 'Test Yacht') {
    const company = await Company.create({
        name: companyName,
        ruc: '1234567890001',
        logo: '/uploads/companies/test-logo.png',
        adress: 'Av. Test 123',
    });
    const yacht = await Yacht.create({
        companyId: company.id,
        name: yachtName,
        email: `${yachtName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        code: 'YT-001',
        color: '#FFFFFF',
    });
    return { company, yacht };
}

module.exports = { createDepartment, createPosition, createCompanyWithYacht };
