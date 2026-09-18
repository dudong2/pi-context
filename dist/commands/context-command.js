import { context_settings_from_preset, is_context_settings_preset, save_context_settings_config, } from '../config.js';
import { format_context_settings_status, format_list_results, format_purge_details, format_stats, } from '../context-format.js';
import { scope_from_context } from '../context-scope.js';
import { get_context_store } from '../store.js';
function show_context_list(ctx, limit = 10) {
    const scope = scope_from_context(ctx);
    const results = get_context_store(scope).list({ ...scope, limit });
    ctx.ui.notify(format_list_results(results, { audience: 'tui' }), 'info');
}
function show_context_stats(ctx, global = false) {
    const scope = scope_from_context(ctx);
    const stats = get_context_store(scope).stats(global ? { global: true } : scope);
    ctx.ui.notify(format_stats(stats, { audience: 'tui', title: false }), 'info');
}
function show_context_settings(ctx) {
    const scope = scope_from_context(ctx);
    const stats = get_context_store(scope).stats(scope);
    ctx.ui.notify(format_context_settings_status(stats, { audience: 'tui' }), 'info');
}
function purge_context(ctx, options) {
    const scope = scope_from_context(ctx);
    const store = get_context_store(scope);
    if (options.expired) {
        ctx.ui.notify(format_purge_details({ deleted: store.cleanup().deleted }), 'info');
        return;
    }
    const older_than_days = options.source_id
        ? undefined
        : (options.older_than_days ?? 14);
    const details = store.purge_with_details({
        ...scope,
        source_id: options.source_id,
        older_than_days,
    });
    ctx.ui.notify(format_purge_details(details), 'info');
}
export function register_context_commands(pi) {
    pi.registerCommand('context', {
        description: 'Inspect and manage the context sidecar',
        getArgumentCompletions: (prefix) => ['list', 'stats', 'settings', 'purge'].flatMap((item) => item.startsWith(prefix.trim())
            ? [{ value: item, label: item }]
            : []),
        handler: async (args, ctx) => {
            const [sub = '', ...rest] = args.trim().split(/\s+/).filter(Boolean);
            switch (sub || 'list') {
                case 'list': {
                    const limit = rest[0] === undefined ? 10 : Number(rest[0]);
                    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
                        ctx.ui.notify('Usage: /context list [limit]', 'warning');
                        return;
                    }
                    show_context_list(ctx, limit);
                    return;
                }
                case 'stats':
                    show_context_stats(ctx);
                    return;
                case 'settings': {
                    const preset = rest[0];
                    if (!preset) {
                        show_context_settings(ctx);
                        return;
                    }
                    if (!is_context_settings_preset(preset)) {
                        ctx.ui.notify('Usage: /context settings <default|light|balanced|research|archive>', 'warning');
                        return;
                    }
                    save_context_settings_config(context_settings_from_preset(preset));
                    ctx.ui.notify(`Context settings saved: ${preset}`, 'info');
                    return;
                }
                case 'purge': {
                    const [kind, value] = rest;
                    if (kind === 'expired') {
                        purge_context(ctx, { expired: true });
                        return;
                    }
                    if (kind === 'source' && value) {
                        purge_context(ctx, { source_id: value });
                        return;
                    }
                    const days = kind === undefined ? 14 : Number(kind);
                    if (!Number.isSafeInteger(days) || days < 0) {
                        ctx.ui.notify('Usage: /context purge [older-than-days] | expired | source <source-id>', 'warning');
                        return;
                    }
                    purge_context(ctx, { older_than_days: days });
                    return;
                }
                default:
                    ctx.ui.notify(`Unknown context command: ${sub}. Use list, stats, settings, or purge.`, 'warning');
            }
        },
    });
    pi.registerCommand('context-stats', {
        description: 'Show context sidecar byte accounting',
        handler: async (_args, ctx) => show_context_stats(ctx, true),
    });
}
//# sourceMappingURL=context-command.js.map