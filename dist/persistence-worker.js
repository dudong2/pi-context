import { parentPort, workerData } from 'node:worker_threads';
import { ContextStore } from './store.js';
const data = workerData;
let store;
try {
    store = new ContextStore(data.options);
    const stored = store.store(data.input);
    parentPort?.postMessage({ ok: true, stored });
}
catch (error) {
    parentPort?.postMessage({
        ok: false,
        error_name: error instanceof Error ? error.name : 'UnknownError',
    });
}
finally {
    store?.close();
}
//# sourceMappingURL=persistence-worker.js.map