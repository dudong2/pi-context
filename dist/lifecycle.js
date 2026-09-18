import { is_text_content, scope_from_context, should_skip_tool, summarize_tool_input, } from './context-scope.js';
import { fail_closed_receipt, limit_chat_output } from './output-limits.js';
import { cancel_context_persistence_workers, persist_context_output, } from './persistence.js';
import { get_context_store, set_context_sidecar_enabled, should_index_text, } from './store.js';
function receipt_source_id(details) {
    const marker = details?.contextSidecar;
    return marker?.version === 1 && marker.kind === 'receipt'
        ? (marker.sourceId ?? null)
        : null;
}
function is_verified_receipt(event, scope) {
    // SAFETY: receipt_source_id validates every optional marker field before use.
    const source_id = receipt_source_id(event.details);
    if (!source_id || event.content.length !== 1)
        return false;
    const item = event.content[0];
    if (!is_text_content(item) ||
        !item.text.startsWith('[context-sidecar]') ||
        !item.text.includes(`Source: ${source_id}`))
        return false;
    try {
        return get_context_store(scope).chunk_summary(source_id, scope) !== null;
    }
    catch {
        return false;
    }
}
function replace_text_items(content, primary, additional) {
    let replaced = false;
    return content.map((item) => {
        if (!is_text_content(item))
            return item;
        if (!replaced) {
            replaced = true;
            return { ...item, text: primary };
        }
        return { ...item, text: additional };
    });
}
export function register_context_lifecycle(pi) {
    set_context_sidecar_enabled(true, { project_path: process.cwd() });
    pi.on('session_start', async (_event, ctx) => {
        const scope = scope_from_context(ctx);
        set_context_sidecar_enabled(true, scope);
        get_context_store(scope).cleanup();
    });
    pi.on('session_shutdown', async () => {
        cancel_context_persistence_workers();
        const store = get_context_store();
        const stats = store.stats();
        if (stats.purge_on_shutdown)
            store.cleanup();
        set_context_sidecar_enabled(false);
    });
    pi.on('tool_result', async (event, ctx) => {
        const tool_name = String(event.toolName ?? 'tool');
        if (should_skip_tool(tool_name))
            return;
        if (!Array.isArray(event.content))
            return;
        const scope = scope_from_context(ctx);
        if (is_verified_receipt(event, scope))
            return;
        const text_items = event.content.filter(is_text_content);
        if (text_items.length === 0)
            return;
        const text = text_items.map((item) => item.text).join('\n');
        if (!should_index_text(text))
            return;
        try {
            const stored = await persist_context_output({
                text,
                tool_name,
                input_summary: summarize_tool_input(event.input),
                force: true,
                ...scope,
            }, scope, ctx?.signal);
            if (!stored)
                throw new Error('Forced persistence returned no source');
            const receipt = limit_chat_output(stored.receipt).text;
            const details = {
                contextSidecar: {
                    version: 1,
                    kind: stored.retained === false ? 'error' : 'receipt',
                    sourceId: stored.retained === false ? undefined : stored.source_id,
                },
            };
            return {
                content: replace_text_items(event.content, receipt, ''),
                details,
            };
        }
        catch (error) {
            const error_name = error instanceof Error ? error.name : 'UnknownError';
            console.error(`[pi-context] persistence failed (${error_name}); oversized output withheld`);
            const receipt = fail_closed_receipt(tool_name);
            const details = {
                contextSidecar: { version: 1, kind: 'error' },
            };
            return {
                content: replace_text_items(event.content, receipt, ''),
                details,
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=lifecycle.js.map