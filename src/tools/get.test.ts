import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	get_context_store,
	set_context_sidecar_enabled,
} from '../store.js';
import { register_context_get_tool } from './get.js';

const dirs: string[] = [];
const original_context_db = process.env.MY_PI_CONTEXT_DB;

type RegisteredTool = {
	name: string;
	description: string;
	promptSnippet: string;
	parameters: { properties: Record<string, { description: string }> };
	execute: (...args: unknown[]) => Promise<{
		content: Array<{ text: string }>;
		details: { count?: number; [key: string]: unknown };
	}>;
};

function temp_db(): string {
	const dir = mkdtempSync(join(tmpdir(), 'pi-context-get-'));
	dirs.push(dir);
	return join(dir, 'context.db');
}

function register_tool(): RegisteredTool {
	let tool: RegisteredTool | undefined;
	register_context_get_tool({
		registerTool(value: RegisteredTool) {
			tool = value;
		},
	} as unknown as ExtensionAPI);
	return tool!;
}

afterEach(() => {
	set_context_sidecar_enabled(false);
	if (original_context_db === undefined)
		delete process.env.MY_PI_CONTEXT_DB;
	else process.env.MY_PI_CONTEXT_DB = original_context_db;
	for (const dir of dirs)
		rmSync(dir, { recursive: true, force: true });
	dirs.length = 0;
});

describe('context_get tool', () => {
	it('retrieves chunks and returns helpful empty summaries', async () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		set_context_sidecar_enabled(true, {
			db_path: process.env.MY_PI_CONTEXT_DB,
		});
		const stored = get_context_store().store({
			text: `get-token\n${'x '.repeat(400)}`,
			tool_name: 'bash',
			force: true,
		});
		const tool = register_tool();

		expect(tool.description).toContain('source_id plus chunk_id');
		expect(tool.description).toContain('requires chunk_id');
		expect(tool.promptSnippet).toContain('requires chunk_id');

		const before = get_context_store().stats({ global: true }).bytes_returned;
		const found = await tool.execute('call', {
			source_id: stored!.source_id,
			chunk_id: stored!.first_chunk_id,
			global: true,
		});
		expect(found.content[0].text).toContain('get-token');
		expect(found.details).toMatchObject({ count: 1 });
		expect(
			get_context_store().stats({ global: true }).bytes_returned,
		).toBeGreaterThan(before);

		const missing = await tool.execute('call', {
			source_id: stored!.source_id,
			chunk_id: 'missing',
			global: true,
		});
		expect(missing.content[0].text).toContain('No chunk found');
		expect(missing.details).toMatchObject({ count: 0 });
	});

	it('does not return a full 256 KiB source when chunk_id is omitted', async () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		set_context_sidecar_enabled(true, {
			db_path: process.env.MY_PI_CONTEXT_DB,
		});
		const stored = get_context_store().store({
			text: `${'bounded retrieval line\n'.repeat(12_000)}`,
			tool_name: 'bash',
			force: true,
		});
		const tool = register_tool();

		const result = await tool.execute('call', {
			source_id: stored!.source_id,
			global: true,
		});
		const text = result.content[0].text;

		expect(text).toContain('chunk_id');
		expect(Buffer.byteLength(text, 'utf8')).toBeLessThanOrEqual(50 * 1024);
		expect(text.split('\n').length).toBeLessThanOrEqual(2_000);
		expect(text).not.toContain('bounded retrieval line\nbounded retrieval line\n');
	});
});
