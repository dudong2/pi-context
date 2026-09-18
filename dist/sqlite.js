export const DEFAULT_SQLITE_BUSY_TIMEOUT_MS = 5_000;
export const SQLITE_PERSISTENT_PRAGMAS = 'PRAGMA journal_mode = WAL;';
export const SQLITE_CONNECTION_PRAGMAS = `
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = ${DEFAULT_SQLITE_BUSY_TIMEOUT_MS};
`;
export function is_sqlite_busy(error) {
    const candidate = error;
    return (candidate.code === 'ERR_SQLITE_ERROR' &&
        (candidate.errcode === 5 ||
            candidate.errstr === 'database is locked' ||
            candidate.message.includes('database is locked')));
}
function sqlite_busy_error(operation, cause) {
    const error = new Error(`${operation} could not acquire the database lock. Please retry shortly.`, { cause });
    error.name = 'SqliteBusyError';
    return error;
}
function sleep_sync(ms) {
    if (ms > 0)
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
export function with_sqlite_busy_retry(fn, options = {}) {
    const attempts = Math.max(1, options.attempts ?? 3);
    const delay_ms = Math.max(0, options.delay_ms ?? 25);
    let last_error;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return fn();
        }
        catch (error) {
            if (!(error instanceof Error) || !is_sqlite_busy(error))
                throw error;
            last_error = error;
            if (attempt < attempts)
                sleep_sync(delay_ms * attempt);
        }
    }
    throw sqlite_busy_error(options.operation ?? 'SQLite operation', last_error);
}
export function with_sqlite_transaction(db, fn, options = {}) {
    const run = () => {
        db.exec(options.immediate ? 'BEGIN IMMEDIATE' : 'BEGIN');
        try {
            const result = fn();
            db.exec('COMMIT');
            return result;
        }
        catch (error) {
            try {
                db.exec('ROLLBACK');
            }
            catch (rollback_error) {
                if (!(rollback_error instanceof Error) ||
                    !is_sqlite_busy(rollback_error))
                    throw rollback_error;
            }
            throw error;
        }
    };
    return options.retry === false
        ? run()
        : with_sqlite_busy_retry(run, { operation: options.operation });
}
//# sourceMappingURL=sqlite.js.map