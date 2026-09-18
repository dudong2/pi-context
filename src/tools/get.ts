import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { format_get_result } from '../context-format.js';
import { scope_from_context } from '../context-scope.js';
import { limit_chat_output } from '../output-limits.js';
import { get_context_store } from '../store.js';

export function register_context_get_tool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: 'context_get',
		label: 'Context Get',
		description:
			'Retrieve focused chunks from the local SQLite context sidecar by source_id plus chunk_id. Chat retrieval requires chunk_id; use context_export for a full source.',
		promptSnippet:
			'Retrieve focused stored output; context_get requires chunk_id and context_export handles broad/full retrieval',
		parameters: Type.Object({
			source_id: Type.String({ description: 'Indexed source id' }),
			chunk_id: Type.String({
				description:
					'Exact chunk id or ordinal. Required for bounded chat retrieval; use context_export for a full source.',
			}),
			before: Type.Optional(
				Type.Integer({
					minimum: 0,
					maximum: 3,
					description: 'Include up to 3 chunks before chunk_id.',
				}),
			),
			after: Type.Optional(
				Type.Integer({
					minimum: 0,
					maximum: 3,
					description: 'Include up to 3 chunks after chunk_id.',
				}),
			),
			global: Type.Optional(
				Type.Boolean({
					description:
						'Retrieve across all scopes instead of current project/session scope',
				}),
			),
		}),
		async execute(...args) {
			const [, params, , , ctx] = args;
			if (!params.chunk_id) {
				const text =
					'chunk_id is required for bounded chat retrieval. Use context_list or context_search to find a chunk id, or context_export for the full source.';
				return {
					content: [{ type: 'text' as const, text }],
					details: { count: 0, bounded: true },
				};
			}
			const scope = scope_from_context(ctx);
			const store = get_context_store(scope);
			const scope_options = {
				global: params.global,
				before: params.before,
				after: params.after,
			};
			if (!params.global) Object.assign(scope_options, scope);
			const chunks = store.get(
				params.source_id,
				params.chunk_id,
				scope_options,
			);
			const summary =
				chunks.length === 0
					? store.chunk_summary(params.source_id, scope_options)
					: null;
			const limited = limit_chat_output(
				format_get_result(
					params.source_id,
					params.chunk_id,
					chunks,
					summary,
				),
			);
			if (chunks.length > 0) {
				store.record_returned_bytes(
					[params.source_id],
					Buffer.byteLength(limited.text, 'utf8'),
				);
			}
			return {
				content: [{ type: 'text' as const, text: limited.text }],
				details: {
					count: chunks.length,
					truncated: limited.truncated,
				},
			};
		},
	});
}
