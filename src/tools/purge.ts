import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { format_purge_details } from '../context-format.js';
import { scope_from_context } from '../context-scope.js';
import { limit_chat_output } from '../output-limits.js';
import { get_context_store } from '../store.js';

export function register_context_purge_tool(pi: ExtensionAPI): void {
	pi.registerTool({
		name: 'context_purge',
		label: 'Context Purge',
		description:
			'Delete indexed context-sidecar output by age, source, project, session, or active retention policy.',
		parameters: Type.Object({
			expired: Type.Optional(
				Type.Boolean({
					description:
						'Run active retention cleanup now instead of manual age purge',
				}),
			),
			older_than_days: Type.Optional(
				Type.Integer({
					minimum: 0,
					description:
						'Delete sources older than this many days; defaults to active retention days or 14',
				}),
			),
			source_id: Type.Optional(
				Type.String({ description: 'Delete one source id' }),
			),
			project_path: Type.Optional(
				Type.String({
					description: 'Limit purge to one project path',
				}),
			),
			session_id: Type.Optional(
				Type.String({ description: 'Limit purge to one session id' }),
			),
			global: Type.Optional(
				Type.Boolean({
					description:
						'Purge all scopes instead of current project/session scope',
				}),
			),
		}),
		async execute(...args) {
			const [, params, , , ctx] = args;
			if (
				params.older_than_days !== undefined &&
				(!Number.isSafeInteger(params.older_than_days) ||
					params.older_than_days < 0)
			)
				throw new RangeError(
					'older_than_days must be a non-negative integer',
				);
			const scope = scope_from_context(ctx);
			const store = get_context_store(scope);
			const stats = store.stats();
			const has_explicit_scope =
				params.project_path !== undefined ||
				params.session_id !== undefined;
			let project_path: string | null | undefined = params.project_path;
			let session_id: string | null | undefined = params.session_id;
			if (!params.global && !has_explicit_scope) {
				project_path = scope.project_path;
				session_id = scope.session_id;
			}
			let details;
			if (params.expired) {
				details = { deleted: store.cleanup().deleted };
			} else {
				let older_than_days: number | undefined =
					params.older_than_days ?? stats.retention_days ?? 14;
				if (params.source_id) older_than_days = undefined;
				details = store.purge_with_details({
					project_path,
					session_id,
					older_than_days,
					source_id: params.source_id,
				});
			}
			const limited = limit_chat_output(format_purge_details(details));
			return {
				content: [{ type: 'text' as const, text: limited.text }],
				details,
			};
		},
	});
}
