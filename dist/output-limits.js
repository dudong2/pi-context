import { redact_text } from './redaction.js';
export const MAX_CHAT_BYTES = 50 * 1024;
export const MAX_CHAT_LINES = 2_000;
function take_utf8_bytes(text, max_bytes) {
    if (Buffer.byteLength(text, 'utf8') <= max_bytes)
        return text;
    let bytes = 0;
    let end = 0;
    for (const char of text) {
        const size = Buffer.byteLength(char, 'utf8');
        if (bytes + size > max_bytes)
            break;
        bytes += size;
        end += char.length;
    }
    return text.slice(0, end);
}
export function limit_chat_output(text) {
    const original_bytes = Buffer.byteLength(text, 'utf8');
    const original_lines = text.length === 0 ? 0 : text.split('\n').length;
    if (original_bytes <= MAX_CHAT_BYTES && original_lines <= MAX_CHAT_LINES) {
        return { text, truncated: false, original_bytes, original_lines };
    }
    const notice = `\n\n[context-sidecar] Output truncated to ${MAX_CHAT_BYTES} bytes / ${MAX_CHAT_LINES} lines. Use context_export for broad retrieval.`;
    const content_line_limit = Math.max(0, MAX_CHAT_LINES - notice.split('\n').length);
    const by_lines = text.split('\n').slice(0, content_line_limit).join('\n');
    const byte_limit = MAX_CHAT_BYTES - Buffer.byteLength(notice, 'utf8');
    const bounded = take_utf8_bytes(by_lines, byte_limit);
    return {
        text: `${bounded}${notice}`,
        truncated: true,
        original_bytes,
        original_lines,
    };
}
export function fail_closed_receipt(tool_name) {
    return limit_chat_output([
        '[context-sidecar:error] Oversized tool output could not be persisted safely.',
        `Tool: ${redact_text(tool_name).redacted.slice(0, 120)}`,
        'Original output withheld from model context to prevent an unbounded or unredacted fallback.',
        'Retry the original tool after checking the context-sidecar database path and permissions.',
    ].join('\n')).text;
}
//# sourceMappingURL=output-limits.js.map