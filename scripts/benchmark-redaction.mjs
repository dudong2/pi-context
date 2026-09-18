import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { redact_text } from '../dist/redaction.js';

const payload = 'a'.repeat(256 * 1024);
redact_text('warmup');
const started = performance.now();
const result = redact_text(payload);
const elapsed = performance.now() - started;

process.stdout.write(
	`redaction 256 KiB: ${elapsed.toFixed(2)} ms, redactions=${result.count}, bytes=${Buffer.byteLength(result.redacted, 'utf8')}\n`,
);
if (elapsed >= 1_000) {
	process.stderr.write(
		'redaction benchmark exceeded the 1,000 ms local target\n',
	);
	process.exitCode = 1;
}
