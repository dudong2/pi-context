const SECRET_PATTERNS = [
    { name: 'AWS Access Key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
    {
        name: 'AWS Secret Key',
        pattern: /\b(?:AWS_SECRET_ACCESS_KEY|aws_secret_access_key|secret_access_key|SecretAccessKey)\b\s*[:=]\s*["']?[A-Za-z0-9/+=]{40,}["']?/g,
    },
    { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9._-]{20,}/g },
    { name: 'OpenAI/Anthropic API Key', pattern: /\bsk-[A-Za-z0-9._-]{20,}/g },
    { name: 'Stripe Key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/g },
    { name: 'Tavily API Key', pattern: /\btvly-[A-Za-z0-9_-]{20,}/g },
    { name: 'Brave API Key', pattern: /\bBSA[A-Z0-9]{20,}/g },
    { name: 'Firecrawl API Key', pattern: /\bfc-[a-f0-9]{32}\b/g },
    { name: 'GitHub Token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/g },
    { name: 'GitHub Fine-grained PAT', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/g },
    { name: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
    { name: 'Slack Token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}/g },
    { name: 'GitLab Token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}/g },
    { name: 'Google API Key', pattern: /\bAIza[A-Za-z0-9_-]{35}\b/g },
    { name: 'npm Token', pattern: /\bnpm_[A-Za-z0-9]{36,}/g },
    { name: 'SendGrid API Key', pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{32,}/g },
    {
        name: 'Connection Password',
        pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^:\s/?#]+:[^@\s/?#]+@/gi,
    },
    {
        name: 'Private Key',
        pattern: /-----BEGIN[ \t]+[\w -]*PRIVATE[ \t]+KEY-----[\s\S]*?(?:-----END[ \t]+[\w -]*PRIVATE[ \t]+KEY-----|$)/g,
    },
];
const SECRET_ASSIGNMENT = /(\b(?:[A-Za-z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY)|password|passwd|secret|token|api[-_]?key|access[-_]?token|client[-_]?secret|private[-_]?key)\b\s*[:=]\s*)("[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}\]]+)/gi;
const SECRET_PHRASE = /(\b(?:password|passwd|secret|token|api[-_]?key)\b\s+(?:is|was|seen|value|header)\s+)(["']?[A-Za-z0-9._:/+=@!-]{8,}["']?)/gi;
function masked(match, name) {
    const prefix = match.slice(0, Math.min(4, match.length));
    return `${prefix}${'*'.repeat(Math.min(Math.max(0, match.length - prefix.length), 20))}[REDACTED:${name}]`;
}
function redact_assignments(text) {
    let count = 0;
    let redacted = text.replace(SECRET_ASSIGNMENT, (match, assignment, value) => {
        if (value.includes('[REDACTED:'))
            return match;
        count += 1;
        return `${assignment}[REDACTED:Generic Secret Field]`;
    });
    redacted = redacted.replace(SECRET_PHRASE, (match, prefix, value) => {
        if (value.includes('[REDACTED:'))
            return match;
        count += 1;
        return `${prefix}[REDACTED:Generic Secret Phrase]`;
    });
    return { redacted, count };
}
function is_token_char(code) {
    return ((code >= 48 && code <= 57) ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122) ||
        code === 95 ||
        code === 45);
}
function token_end(text, start) {
    for (let index = start; index < text.length; index += 1) {
        if (!is_token_char(text.charCodeAt(index)))
            return index;
    }
    return text.length;
}
/** Redact two long token segments separated by a dot in one forward scan. */
function redact_dotted_tokens(text) {
    const pieces = [];
    let cursor = 0;
    let index = 0;
    let count = 0;
    for (; index < text.length;) {
        if (!is_token_char(text.charCodeAt(index))) {
            index += 1;
            continue;
        }
        const first_start = index;
        index = token_end(text, index);
        if (index - first_start < 40 || text.charCodeAt(index) !== 46)
            continue;
        const second_start = index + 1;
        const end = token_end(text, second_start);
        if (end - second_start < 40)
            continue;
        pieces.push(text.slice(cursor, first_start));
        pieces.push(masked(text.slice(first_start, end), 'Dotted API Token'));
        cursor = end;
        index = end;
        count += 1;
    }
    if (count === 0)
        return { redacted: text, count: 0 };
    pieces.push(text.slice(cursor));
    return { redacted: pieces.join(''), count };
}
export function redact_metadata(value) {
    if (value === null || value === undefined)
        return value;
    return redact_text(value).redacted;
}
export function redact_text(text) {
    let redacted = text;
    let count = 0;
    const assignments = redact_assignments(redacted);
    redacted = assignments.redacted;
    count += assignments.count;
    for (const secret of SECRET_PATTERNS) {
        secret.pattern.lastIndex = 0;
        redacted = redacted.replace(secret.pattern, (match) => {
            count += 1;
            return masked(match, secret.name);
        });
    }
    const dotted = redact_dotted_tokens(redacted);
    return { redacted: dotted.redacted, count: count + dotted.count };
}
//# sourceMappingURL=redaction.js.map