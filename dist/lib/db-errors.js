function readCode(value) {
    if (typeof value !== 'object' || value === null)
        return null;
    if (!('code' in value))
        return null;
    return typeof value.code === 'string' ? value.code : null;
}
// Vrátí kód chyby PostgreSQL.
export function getPostgresErrorCode(error) {
    const direct = readCode(error);
    if (direct)
        return direct;
    if (typeof error === 'object' && error !== null && 'cause' in error) {
        return readCode(error.cause);
    }
    return null;
}
