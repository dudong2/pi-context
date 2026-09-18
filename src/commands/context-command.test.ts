import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { temp_config, temp_db } from '../../test/support.js';
import { load_context_settings_config } from '../config.js';
import {
	get_context_store,
	set_context_sidecar_enabled,
} from '../store.js';
import { register_context_commands } from './context-command.js';

type RegisteredCommand = {
	description: string;
	getArgumentCompletions?: (prefix: string) => Array<{ value: string }>;
	handler: (args: string, ctx: unknown) => Promise<void>;
};

function fake_pi() {
	const commands = new Map<string, RegisteredCommand>();
	register_context_commands({
		registerCommand(name: string, command: RegisteredCommand) {
			commands.set(name, command);
		},
	} as unknown as ExtensionAPI);
	return commands;
}

const original_config = process.env.MY_PI_CONTEXT_CONFIG;

afterEach(() => {
	set_context_sidecar_enabled(false);
	if (original_config === undefined) delete process.env.MY_PI_CONTEXT_CONFIG;
	else process.env.MY_PI_CONTEXT_CONFIG = original_config;
});

describe('register_context_commands', () => {
	it('registers lightweight commands and completions', () => {
		const commands = fake_pi();
		expect([...commands.keys()].sort()).toEqual(['context', 'context-stats']);
		expect(commands.get('context')?.getArgumentCompletions?.('s')).toEqual([
			{ value: 'stats', label: 'stats' },
			{ value: 'settings', label: 'settings' },
		]);
	});

	it('saves preset settings without UI package dependencies', async () => {
		process.env.MY_PI_CONTEXT_CONFIG = temp_config();
		const notify = vi.fn();
		await fake_pi().get('context')!.handler('settings light', {
			cwd: '/repo',
			ui: { notify },
		});
		expect(load_context_settings_config()).toMatchObject({
			preset: 'light',
			retention_days: 1,
			max_mb: 50,
		});
		expect(notify).toHaveBeenCalledWith('Context settings saved: light', 'info');
	});

	it('validates numeric list and purge arguments', async () => {
		set_context_sidecar_enabled(true, { db_path: temp_db() });
		get_context_store().store({
			text: 'keep command source',
			tool_name: 'bash',
			force: true,
		});
		const notify = vi.fn();
		const command = fake_pi().get('context')!;
		const ctx = { cwd: '/repo', ui: { notify } };

		await command.handler('list 1.5', ctx);
		await command.handler('purge -1', ctx);

		expect(notify).toHaveBeenCalledWith('Usage: /context list [limit]', 'warning');
		expect(notify).toHaveBeenCalledWith(
			'Usage: /context purge [older-than-days] | expired | source <source-id>',
			'warning',
		);
	});
});
