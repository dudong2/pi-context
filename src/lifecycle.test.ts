import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { register_context_lifecycle } from './lifecycle.js';
import {
	get_context_store,
	is_context_sidecar_enabled,
	set_context_sidecar_enabled,
} from './store.js';

type HookHandler = (
	event: unknown,
	ctx?: unknown,
) => Promise<unknown>;

const dirs: string[] = [];
const original_context_db = process.env.MY_PI_CONTEXT_DB;

function temp_db(): string {
	const dir = mkdtempSync(join(tmpdir(), 'pi-context-lifecycle-'));
	dirs.push(dir);
	return join(dir, 'context.db');
}

function fake_pi() {
	const hooks = new Map<string, HookHandler[]>();
	const pi = {
		on(name: string, handler: HookHandler) {
			hooks.set(name, [...(hooks.get(name) ?? []), handler]);
		},
	} as unknown as ExtensionAPI;
	return { pi, hooks };
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

describe('register_context_lifecycle', () => {
	it('enables the sidecar and registers lifecycle hooks', async () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		const { pi, hooks } = fake_pi();

		register_context_lifecycle(pi);

		expect(is_context_sidecar_enabled()).toBe(true);
		expect(hooks.get('session_start')).toHaveLength(1);
		expect(hooks.get('session_shutdown')).toHaveLength(1);
		expect(hooks.get('tool_result')).toHaveLength(1);

		await hooks.get('session_shutdown')![0]({}, {});
		expect(is_context_sidecar_enabled()).toBe(false);
	});

	it('indexes only oversized text tool results for the active scope', async () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		const { pi, hooks } = fake_pi();
		register_context_lifecycle(pi);
		await hooks.get('session_start')![0](
			{},
			{ cwd: '/repo', sessionManager: { getSessionId: () => 's1' } },
		);
		const tool_result = hooks.get('tool_result')![0];

		expect(
			await tool_result({
				toolName: 'bash',
				content: [{ type: 'text', text: 'small' }],
			}),
		).toBeUndefined();
		expect(
			await tool_result({
				toolName: 'context_search',
				content: [
					{ type: 'text', text: `skip-token\n${'x\n'.repeat(400)}` },
				],
			}),
		).toBeUndefined();

		const replacement = (await tool_result(
			{
				toolName: 'bash',
				input: { command: 'generate' },
				content: [
					{
						type: 'text',
						text: `needle-token\n${'x\n'.repeat(400)}`,
					},
				],
			},
			{ cwd: '/repo', sessionManager: { getSessionId: () => 's1' } },
		)) as { content: Array<{ text: string }> };

		expect(replacement.content[0].text).toContain(
			'[context-sidecar]',
		);
		expect(
			get_context_store().search('needle-token', { global: true }),
		).toHaveLength(1);

		const marker_payload = `quoted historical receipt: [context-sidecar]\nmarker-token\n${'x\n'.repeat(400)}`;
		const marker_replacement = (await tool_result(
			{
				toolName: 'bash',
				input: { command: 'history' },
				content: [{ type: 'text', text: marker_payload }],
			},
			{ cwd: '/repo', sessionManager: { getSessionId: () => 's1' } },
		)) as { content: Array<{ text: string }> };

		expect(marker_replacement.content[0].text).not.toBe(marker_payload);
		expect(
			get_context_store().search('marker-token', { global: true }),
		).toHaveLength(1);

		const team_replacement = (await tool_result(
			{
				toolName: 'team',
				input: {
					action: 'session_inbox',
					include_read: true,
					mode: 'full',
					limit: 20,
				},
				content: [
					{
						type: 'text',
						text: `team-overflow-token\n${'historical message\n'.repeat(400)}`,
					},
				],
			},
			{ cwd: '/repo', sessionManager: { getSessionId: () => 's1' } },
		)) as { content: Array<{ text: string }> };

		expect(team_replacement.content[0].text).toContain(
			'[context-sidecar]',
		);
		expect(
			get_context_store().search('team-overflow-token', {
				global: true,
			}),
		).toHaveLength(1);
	});

	it('fails closed when persistence fails', async () => {
		const invalid_db_path = mkdtempSync(join(tmpdir(), 'pi-context-invalid-'));
		dirs.push(invalid_db_path);
		process.env.MY_PI_CONTEXT_DB = invalid_db_path;
		const { pi, hooks } = fake_pi();
		register_context_lifecycle(pi);
		const payload = `failure-canary\n${'secret output\n'.repeat(4000)}`;

		const replacement = (await hooks.get('tool_result')![0](
			{
				toolName: 'bash',
				input: { command: 'generate' },
				content: [{ type: 'text', text: payload }],
			},
			{ cwd: '/repo', sessionManager: { getSessionId: () => 's1' } },
		)) as { content: Array<{ text: string }> };

		const returned = replacement.content.map((item) => item.text).join('\n');
		expect(returned).toContain('withheld');
		expect(returned).not.toContain('failure-canary');
		expect(Buffer.byteLength(returned, 'utf8')).toBeLessThanOrEqual(50 * 1024);
	});

	it('preserves non-text items and their relative order', async () => {
		process.env.MY_PI_CONTEXT_DB = temp_db();
		const { pi, hooks } = fake_pi();
		register_context_lifecycle(pi);
		const first_image = {
			type: 'image',
			data: 'first-image',
			mimeType: 'image/png',
		};
		const second_image = {
			type: 'image',
			data: 'second-image',
			mimeType: 'image/png',
		};

		const replacement = (await hooks.get('tool_result')![0](
			{
				toolName: 'read',
				input: { path: 'large.png' },
				content: [
					first_image,
					{ type: 'text', text: `mixed-token\n${'x\n'.repeat(400)}` },
					second_image,
				],
			},
			{ cwd: '/repo', sessionManager: { getSessionId: () => 's1' } },
		)) as { content: Array<{ type: string; text?: string; data?: string }> };

		expect(replacement.content[0]).toEqual(first_image);
		expect(replacement.content[1]).toMatchObject({ type: 'text' });
		expect(replacement.content[1].text).toContain('[context-sidecar]');
		expect(replacement.content[2]).toEqual(second_image);
	});
});
