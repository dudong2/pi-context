import type { TUI, Terminal } from '@earendil-works/pi-tui';
import type { Mock } from 'vitest';

export function make_terminal(
	overrides?: Partial<Terminal>,
): Terminal & { rows: number; columns: number };
export function make_tui(terminal?: Terminal): {
	tui: TUI;
	request_render: Mock<TUI['requestRender']>;
};
