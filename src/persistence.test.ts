import { afterEach, describe, expect, it } from 'vitest';
import { temp_db } from '../test/support.js';
import { persist_context_output } from './persistence.js';
import { set_context_sidecar_enabled } from './store.js';

function immediate(): Promise<void> {
	return new Promise((resolve) => setImmediate(resolve));
}

afterEach(() => set_context_sidecar_enabled(false));

describe('worker persistence', () => {
	it('keeps the event loop responsive while indexing', async () => {
		let ticked = false;
		const pending = persist_context_output(
			{
				text: 'responsive line\n'.repeat(20_000),
				tool_name: 'bash',
				force: true,
			},
			{ db_path: temp_db('pi-context-worker-responsive-') },
		);
		await immediate();
		ticked = true;
		const stored = await pending;

		expect(ticked).toBe(true);
		expect(stored?.source_id).toMatch(/^ctx_/);
	});

	it('honors an AbortSignal without falling back to the payload', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			persist_context_output(
				{
					text: 'cancelled-secret '.repeat(20_000),
					tool_name: 'bash',
					force: true,
				},
				{ db_path: temp_db('pi-context-worker-cancel-') },
				controller.signal,
			),
		).rejects.toMatchObject({ name: 'AbortError' });
	});
});
