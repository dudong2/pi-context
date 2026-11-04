import type { ToolResultEvent } from '@earendil-works/pi-coding-agent';
/** Prefer native machine-readable output over an already truncated chat preview. */
export declare function select_context_output(event: ToolResultEvent, visible_text: string): string;
