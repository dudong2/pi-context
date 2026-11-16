import type { ExtensionCommandContext, ToolResultEvent } from '@earendil-works/pi-coding-agent';
import type { ContextScopeOptions } from './store.js';
export declare function redact_input_summary(text: string): string;
export declare function summarize_tool_input(event: Pick<ToolResultEvent, 'input'>): string | null;
export declare function should_skip_tool(tool_name: string): boolean;
export declare function session_id_from_context(ctx?: Pick<ExtensionCommandContext, 'sessionManager'>): string | null;
export declare function scope_from_context(ctx?: Pick<ExtensionCommandContext, 'cwd' | 'sessionManager'>): ContextScopeOptions;
