const ROMAN_NUMERAL_REGEX = /^[IVXLCDM]+$/i;

const extractApellido = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return '';
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0];
    return words.slice(-2).join(' ');
};

const capitalizeYachtName = (name) => {
    if (!name || typeof name !== 'string') return name;
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => (
            ROMAN_NUMERAL_REGEX.test(word)
                ? word.toUpperCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ))
        .join(' ');
};

module.exports = { extractApellido, capitalizeYachtName };
