export const DEFAULT_SQLITE_BUSY_TIMEOUT_MS = 5_000;

export const SQLITE_PERSISTENT_PRAGMAS = 'PRAGMA journal_mode = WAL;';
export const SQLITE_CONNECTION_PRAGMAS = `
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = ${DEFAULT_SQLITE_BUSY_TIMEOUT_MS};
`;

interface SqliteError extends Error {
	code?: string;
	errcode?: number;
	errstr?: string;
}

export function is_sqlite_busy(error: Error): boolean {
	const candidate = error as SqliteError;
	return (
		candidate.code === 'ERR_SQLITE_ERROR' &&
		(candidate.errcode === 5 ||
			candidate.errstr === 'database is locked' ||
			candidate.message.includes('database is locked'))
	);
}

function sqlite_busy_error(operation: string, cause: Error | undefined): Error {
	const error = new Error(
		`${operation} could not acquire the database lock. Please retry shortly.`,
		{ cause },
	);
	error.name = 'SqliteBusyError';
	return error;
}

function sleep_sync(ms: number): void {
	if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function with_sqlite_busy_retry<T>(
	fn: () => T,
	options: { attempts?: number; delay_ms?: number; operation?: string } = {},
): T {
	const attempts = Math.max(1, options.attempts ?? 3);
	const delay_ms = Math.max(0, options.delay_ms ?? 25);
	let last_error: Error | undefined;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return fn();
		} catch (error) {
			if (!(error instanceof Error) || !is_sqlite_busy(error)) throw error;
			last_error = error;
			if (attempt < attempts) sleep_sync(delay_ms * attempt);
		}
	}
	throw sqlite_busy_error(
		options.operation ?? 'SQLite operation',
		last_error,
	);
}

export function with_sqlite_transaction<T>(
	db: { exec(sql: string): void },
	fn: () => T,
	options: { immediate?: boolean; operation?: string; retry?: boolean } = {},
): T {
	const run = (): T => {
		db.exec(options.immediate ? 'BEGIN IMMEDIATE' : 'BEGIN');
		try {
			const result = fn();
			db.exec('COMMIT');
			return result;
		} catch (error) {
			try {
				db.exec('ROLLBACK');
			} catch (rollback_error) {
				if (
					!(rollback_error instanceof Error) ||
					!is_sqlite_busy(rollback_error)
				)
					throw rollback_error;
			}
			throw error;
		}
	};
	return options.retry === false
		? run()
		: with_sqlite_busy_retry(run, { operation: options.operation });
}
