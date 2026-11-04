import type { ExtensionAPI, ExtensionToolContext, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { create_context_store, temp_db } from '../test/support.js';
import { redact_text } from './redaction.js';
import { get_context_store, set_context_sidecar_enabled } from './store.js';
import { register_context_search_tool } from './tools/search.js';

const original_db = process.env.MY_PI_CONTEXT_DB;
const original_cap = process.env.MY_PI_CONTEXT_MAX_MB;
afterEach(() => {
	set_context_sidecar_enabled(false);
	if (original_db === undefined) delete process.env.MY_PI_CONTEXT_DB;
	else process.env.MY_PI_CONTEXT_DB = original_db;
	if (original_cap === undefined) delete process.env.MY_PI_CONTEXT_MAX_MB;
	else process.env.MY_PI_CONTEXT_MAX_MB = original_cap;
});

describe('minimal upstream patches', () => {
	it('preserves upstream quoted JSON secret coverage in content and metadata', () => {
		const secret = 'SyntheticJsonCanaryPassword123!';
		const json = JSON.stringify({ password: secret, api_key: secret });
		expect(redact_text(json).redacted).not.toContain(secret);
		const store = create_context_store({ max_bytes: 1 });
		const source = store.store({ text: json, input_summary: json, tool_name: `PASSWORD=${secret}`, force: true })!;
		const row = store.db.prepare('SELECT input_summary, tool_name FROM context_sources WHERE id=?').get(source.source_id);
		expect(JSON.stringify(row)).not.toContain(secret);
		expect(store.get(source.source_id).map(chunk => chunk.content).join('')).not.toContain(secret);
	});

	it('keeps source-id search scoped unless global access is explicit', () => {
		const store = create_context_store({ max_bytes: 1, project_path: '/a', session_id: 'a' });
		const source = store.store({ text: 'foreignneedle', tool_name: 'bash', force: true, project_path: '/b', session_id: 'b' })!;
		expect(store.search('foreignneedle', { source_id: source.source_id })).toEqual([]);
		expect(store.search('foreignneedle', { source_id: source.source_id, global: true })).toHaveLength(1);
	});

	it('enforces the configured storage quota immediately', () => {
		process.env.MY_PI_CONTEXT_MAX_MB = '0.001';
		const store = create_context_store({ max_bytes: 1 });
		store.store({ text: 'ordinary '.repeat(1000), tool_name: 'bash', force: true });
		expect(store.stats({ global: true }).bytes_stored).toBeLessThanOrEqual(1048);
	});

	it('closes registry handles on disable and path replacement', () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		set_context_sidecar_enabled(true);
		const first = get_context_store();
		process.env.MY_PI_CONTEXT_DB = temp_db();
		const second = get_context_store();
		expect(() => first.db.prepare('SELECT 1')).toThrow();
		set_context_sidecar_enabled(false);
		expect(() => second.db.prepare('SELECT 1')).toThrow();
	});

	it('keeps large structured results available for codemode filtering', async () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		set_context_sidecar_enabled(true, { project_path: '/repo', session_id: 's' });
		get_context_store().store({ text: 'filterneedle '.repeat(30000), tool_name: 'bash', force: true });
		let tool: ToolDefinition | undefined;
		register_context_search_tool({ registerTool(value: ToolDefinition) { tool = value; } } as unknown as ExtensionAPI);
		const ctx = { cwd: '/repo', sessionManager: { getSessionId: () => 's' } } as unknown as ExtensionToolContext;
		const result = await tool!.execute('parent/1', { query: 'filterneedle', full_content: true, limit: 25 }, undefined, undefined, ctx);
		const data = result.structuredContent as { results: Array<{ content: string }> };
		expect(data.results).toHaveLength(25);
		expect(Buffer.byteLength(JSON.stringify(data))).toBeGreaterThan(50 * 1024);
	});

	it('redacts a long token-like input within a bounded worker deadline', async () => {
		const module_url = pathToFileURL(resolve('dist/redaction.js')).href;
		const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(`
			import { parentPort } from 'node:worker_threads';
			import { redact_text } from ${JSON.stringify(module_url)};
			const input = 'a'.repeat(256 * 1024);
			const started = performance.now();
			const result = redact_text(input);
			parentPort.postMessage({ elapsed: performance.now() - started, unchanged: result.redacted === input });
		`)), { execArgv: [] });
		const result = await new Promise<{ elapsed: number; unchanged: boolean }>((resolve_result, reject) => {
			const timer = setTimeout(() => { void worker.terminate(); reject(new Error('redaction exceeded 2 seconds')); }, 2000);
			worker.once('message', value => { clearTimeout(timer); resolve_result(value); });
			worker.once('error', error => { clearTimeout(timer); reject(error); });
		});
		expect(result.unchanged).toBe(true);
		expect(result.elapsed).toBeLessThan(2000);
	});
});
