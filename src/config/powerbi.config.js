function getReportsMap() {
    const raw = process.env.POWERBI_REPORTS_MAP;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch {
        return {};
    }
}

function getReportConfig(reportKey) {
    const map = getReportsMap();
    return map[reportKey] || null;
}

module.exports = { getReportConfig };
