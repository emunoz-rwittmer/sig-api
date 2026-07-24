function formatDateToLocal(date) {
    let formattedDate;

    // Handle string dates in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (typeof date === 'string') {
        const datePart = date.split('T')[0]; // Get just the YYYY-MM-DD part
        const [year, month, day] = datePart.split('-');
        formattedDate = new Date(year, month - 1, day);
    } else {
        formattedDate = new Date(date);
    }

    const day = formattedDate.getDate();
    const month = formattedDate.getMonth() + 1; // Los meses empiezan desde 0
    const year = formattedDate.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatMonthYear(dateValue) {
    if (!dateValue) return '';

    const value = String(dateValue);
    const datePart = value.split(' ')[0]?.split('T')[0];
    if (!datePart) return '';

    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '';

    const d = new Date(year, month - 1, day);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthStr = monthNames[d.getMonth()];
    const yearStr = d.getFullYear();

    return `${dayStr} de ${monthStr} del ${yearStr}`;
}

module.exports = { formatDateToLocal, formatMonthYear };
