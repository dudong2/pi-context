import type { ContextStoreOptions, StoreContextInput, StoredContextOutput } from './types.js';
export declare function cancel_context_persistence_workers(): void;
export declare function persist_context_output(input: StoreContextInput, options?: ContextStoreOptions, signal?: AbortSignal): Promise<StoredContextOutput | null>;
