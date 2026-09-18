import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { format_stats } from '../context-format.js';
import { scope_from_context } from '../context-scope.js';
import { limit_chat_output } from '../output-limits.js';
import { get_context_store } from '../store.js';

export function register_context_stats_tool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: 'context_stats',
		label: 'Context Stats',
		description:
			'Show byte accounting for the local SQLite context sidecar.',
		parameters: Type.Object({
			global: Type.Optional(
				Type.Boolean({
					description:
						'Show stats across all indexed sources instead of current project/session scope.',
				}),
			),
		}),
		async execute(...args) {
			const [, params, , , ctx] = args;
			const scope = scope_from_context(ctx);
			const stats = get_context_store(scope).stats(
				params.global === true ? { global: true } : scope,
			);
			const limited = limit_chat_output(format_stats(stats));
			return {
				content: [{ type: 'text' as const, text: limited.text }],
				details: stats,
			};
		},
	});
}
