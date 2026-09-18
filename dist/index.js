import { register_context_commands } from './commands/context-command.js';
import { register_context_lifecycle } from './lifecycle.js';
import { register_context_tools } from './tools/index.js';
export default function context_sidecar(pi) {
    register_context_lifecycle(pi);
    register_context_tools(pi);
    register_context_commands(pi);
}
export { context_settings_from_preset, CONTEXT_SETTINGS_PRESETS, get_context_capture_limits, get_context_mcp_output_limits, get_context_settings_config_path, load_context_settings_config, save_context_settings_config, } from './config.js';
export { get_context_store, is_context_sidecar_enabled, maybe_store_context_output, parse_context_retention_policy, set_context_sidecar_enabled, should_index_text, } from './store.js';
//# sourceMappingURL=index.js.map