export declare const DEFAULT_SQLITE_BUSY_TIMEOUT_MS = 5000;
export declare const SQLITE_PERSISTENT_PRAGMAS = "PRAGMA journal_mode = WAL;";
export declare const SQLITE_CONNECTION_PRAGMAS = "\nPRAGMA foreign_keys = ON;\nPRAGMA busy_timeout = 5000;\n";
export declare function is_sqlite_busy(error: Error): boolean;
export declare function with_sqlite_busy_retry<T>(fn: () => T, options?: {
    attempts?: number;
    delay_ms?: number;
    operation?: string;
}): T;
export declare function with_sqlite_transaction<T>(db: {
    exec(sql: string): void;
}, fn: () => T, options?: {
    immediate?: boolean;
    operation?: string;
    retry?: boolean;
}): T;
