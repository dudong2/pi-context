import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { create_context_store, temp_db } from '../test/support.js';

const original_max_mb = process.env.MY_PI_CONTEXT_MAX_MB;

afterEach(() => {
	if (original_max_mb === undefined) delete process.env.MY_PI_CONTEXT_MAX_MB;
	else process.env.MY_PI_CONTEXT_MAX_MB = original_max_mb;
});

function benchmark_store_in_worker(db_path: string): Promise<number> {
	const store_url = pathToFileURL(resolve('dist/store.js')).href;
	const source = `
		import { parentPort, workerData } from 'node:worker_threads';
		import { ContextStore } from ${JSON.stringify(store_url)};
		const store = new ContextStore({ db_path: workerData.dbPath, max_bytes: 1 });
		const started = performance.now();
		store.store({ text: 'a'.repeat(256 * 1024), tool_name: 'bash', force: true });
		const elapsed = performance.now() - started;
		store.close();
		parentPort.postMessage(elapsed);
	`;
	const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(source)}`), {
		workerData: { dbPath: db_path },
	});
	return new Promise((resolve_benchmark, reject) => {
		const timeout = setTimeout(() => {
			void worker.terminate();
			reject(new Error('256 KiB redaction did not finish within 2 seconds'));
		}, 2_000);
		worker.once('message', (elapsed: number) => {
			clearTimeout(timeout);
			resolve_benchmark(elapsed);
		});
		worker.once('error', (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}

describe('hardening regressions', () => {
	it('keeps source_id search inside the active scope', () => {
		const store = create_context_store({
			max_bytes: 1,
			project_path: '/repo-a',
			session_id: 'session-a',
		});
		const foreign = store.store({
			text: 'foreign-scope-token',
			tool_name: 'bash',
			project_path: '/repo-b',
			session_id: 'session-b',
			force: true,
		});

		expect(
			store.search('foreign-scope-token', {
				source_id: foreign!.source_id,
				project_path: '/repo-a',
				session_id: 'session-a',
			}),
		).toEqual([]);
		expect(
			store.search('foreign-scope-token', {
				source_id: foreign!.source_id,
				global: true,
			}),
		).toHaveLength(1);
	});

	it('redacts persisted input summaries and list output', () => {
		const store = create_context_store({ max_bytes: 1 });
		const secret = 'CanaryPassword-Redaction-001!';
		const project_path = `/repo/SERVICE_PASSWORD=${secret}`;
		const session_id = `/sessions/API_TOKEN=${secret}`;
		const stored = store.store({
			text: 'safe oversized output',
			tool_name: `CUSTOM_PASSWORD=${secret}`,
			input_summary: `SERVICE_PASSWORD=${secret}`,
			project_path,
			session_id,
			force: true,
		});
		const row = store.db
			.prepare(
				'SELECT input_summary, tool_name, project_path, session_id FROM context_sources WHERE id = ?',
			)
			.get(stored!.source_id) as {
				input_summary: string;
				tool_name: string;
				project_path: string;
				session_id: string;
			};
		const listed = store.list({
			project_path,
			session_id,
			source_id: stored!.source_id,
		});

		expect(Object.values(row).join('\n')).not.toContain(secret);
		expect(listed).toHaveLength(1);
		expect(JSON.stringify(listed)).not.toContain(secret);
		expect(row.input_summary).toContain('[REDACTED:');
	});

	it('enforces max_mb immediately after successful writes', () => {
		process.env.MY_PI_CONTEXT_MAX_MB = '0.001';
		const store = create_context_store({ max_bytes: 1 });
		store.store({ text: 'a'.repeat(32 * 1024), tool_name: 'bash', force: true });
		store.store({ text: 'b'.repeat(32 * 1024), tool_name: 'bash', force: true });

		expect(store.stats({ global: true }).bytes_stored).toBeLessThanOrEqual(
			Math.floor(0.001 * 1024 * 1024),
		);
	});

	it('redacts a 256 KiB alphanumeric payload within a CI-safe linear budget', async () => {
		const elapsed = await benchmark_store_in_worker(temp_db('pi-context-redaction-bench-'));
		expect(elapsed).toBeLessThan(2_000);
	});
});
