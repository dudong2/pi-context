import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { get_context_store } from './store.js';
function context_persistence_error(error_name) {
    const error = new Error('Context output could not be persisted safely');
    error.name = 'ContextPersistenceError';
    return Object.assign(error, { error_name });
}
const active_workers = new Set();
function persistence_worker_url() {
    const current_path = fileURLToPath(import.meta.url);
    return current_path.endsWith('.ts')
        ? new URL('../dist/persistence-worker.js', import.meta.url)
        : new URL('./persistence-worker.js', import.meta.url);
}
export function cancel_context_persistence_workers() {
    for (const worker of active_workers)
        void worker.terminate();
    active_workers.clear();
}
export function persist_context_output(input, options = {}, signal) {
    const configured_store = get_context_store(options);
    const worker = new Worker(persistence_worker_url(), {
        workerData: {
            input,
            options: { ...options, db_path: configured_store.db_path },
        },
    });
    active_workers.add(worker);
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback) => {
            if (settled)
                return;
            settled = true;
            active_workers.delete(worker);
            signal?.removeEventListener('abort', on_abort);
            callback();
        };
        const on_abort = () => {
            void worker.terminate();
            finish(() => reject(new DOMException('Context persistence aborted', 'AbortError')));
        };
        if (signal?.aborted) {
            on_abort();
            return;
        }
        signal?.addEventListener('abort', on_abort, { once: true });
        worker.once('message', (response) => {
            finish(() => {
                if (response.ok)
                    resolve(response.stored);
                else
                    reject(context_persistence_error(response.error_name));
            });
        });
        worker.once('error', (error) => finish(() => reject(error)));
        worker.once('exit', (code) => {
            if (code !== 0)
                finish(() => reject(context_persistence_error('WorkerExitError')));
        });
    });
}
//# sourceMappingURL=persistence.js.map