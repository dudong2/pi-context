import { describe, expect, it } from 'vitest';
import { redact_text } from './redaction.js';

describe('redact_text', () => {
	it('redacts assignments, known prefixes, and long dotted tokens', () => {
		const password = 'CanaryPassword-Redaction-001!';
		const dotted = `${'a'.repeat(40)}.${'b'.repeat(40)}`;
		const github = `ghp_${'c'.repeat(40)}`;
		const input = [
			`SERVICE_PASSWORD=${password}`,
			`standalone ${dotted}`,
			github,
		].join('\n');

		const result = redact_text(input);

		expect(result.redacted).not.toContain(password);
		expect(result.redacted).not.toContain(dotted);
		expect(result.redacted).not.toContain(github);
		expect(result.redacted).toContain('[REDACTED:');
		expect(result.count).toBeGreaterThanOrEqual(3);
	});

	it('leaves ordinary long alphanumeric text unchanged in one pass', () => {
		const input = 'a'.repeat(256 * 1024);
		const result = redact_text(input);
		expect(result).toEqual({ redacted: input, count: 0 });
	});
});
