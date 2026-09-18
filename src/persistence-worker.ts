import { parentPort, workerData } from 'node:worker_threads';
import { ContextStore } from './store.js';
import type { ContextStoreOptions, StoreContextInput } from './types.js';

interface PersistenceWorkerData {
	input: StoreContextInput;
	options: ContextStoreOptions;
}

const data = workerData as PersistenceWorkerData;
let store: ContextStore | undefined;
try {
	store = new ContextStore(data.options);
	const stored = store.store(data.input);
	parentPort?.postMessage({ ok: true, stored });
} catch (error) {
	parentPort?.postMessage({
		ok: false,
		error_name: error instanceof Error ? error.name : 'UnknownError',
	});
} finally {
	store?.close();
}
