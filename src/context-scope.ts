import type {
	ExtensionCommandContext,
	ToolResultEvent,
} from '@earendil-works/pi-coding-agent';
import type { ContextScopeOptions } from './store.js';
import { redact_text } from './redaction.js';

export function is_text_content(
	item: ToolResultEvent['content'][number],
): item is { type: 'text'; text: string } {
	return item.type === 'text';
}

export function summarize_tool_input(
	input: object | null | undefined,
): string | null {
	if (!input) return null;
	try {
		const json = JSON.stringify(input);
		if (!json) return null;
		const redacted = redact_text(json).redacted;
		return redacted.length > 500
			? `${redacted.slice(0, 497)}...`
			: redacted;
	} catch {
		return null;
	}
}

export function should_skip_tool(tool_name: string): boolean {
	// Coverage policy:
	// - context_* tools are retrieval/maintenance output; indexing them would
	//   recurse and make the sidecar harder to reason about.
	// - Team Mode lists are bounded at source, while unusually large full-detail
	//   results use this generic overflow path so they do not flood model context.
	// Structured, source-verified receipt details prevent duplicate capture;
	// ordinary payload text is never trusted as a receipt marker.
	return tool_name.startsWith('context_');
}

export function session_id_from_context(
	ctx?: Pick<ExtensionCommandContext, 'sessionManager'>,
): string | null {
	const manager = ctx?.sessionManager;
	return (
		manager?.getSessionFile?.() ?? manager?.getSessionId?.() ?? null
	);
}

export function scope_from_context(
	ctx?: Pick<ExtensionCommandContext, 'cwd' | 'sessionManager'>,
): ContextScopeOptions {
	return {
		project_path: ctx?.cwd ?? process.cwd(),
		session_id: session_id_from_context(ctx),
	};
}
