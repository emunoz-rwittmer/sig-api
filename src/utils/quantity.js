function normalizeQuantity(product, quantity) {
    if (product?.type === 'CONSUMABLE') {
        if (!product.presentationQuantity) {
            throw new Error(`Producto ${product.name} sin presentationQuantity`);
        }

        const qty = Number(quantity);
        const presentation = Number(product.presentationQuantity);

        const result = qty * presentation;
        return Math.round(result * 100) / 100;
    }

    // DISCRETE
    return Number(quantity);
}

function viewCorrectQuantity(product, quantity) {
    if (product?.type === 'CONSUMABLE') {
        if (!product?.presentationQuantity) {
            throw new Error(`Producto ${product?.name} sin presentationQuantity`);
        }

        return (quantity / product?.presentationQuantity).toFixed(2);
    }

    return quantity;
}

module.exports = { normalizeQuantity, viewCorrectQuantity };
