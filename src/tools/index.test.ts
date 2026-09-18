import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { describe, expect, it } from 'vitest';
import { register_context_tools } from './index.js';

describe('register_context_tools', () => {
	it('registers all context tools in a stable order', () => {
		const tools: Array<{
			name: string;
			constrainedSampling?: unknown;
			parameters: {
				properties: Record<string, { type?: string; minimum?: number; maximum?: number }>;
				required?: string[];
			};
		}> = [];
		register_context_tools({
			registerTool(tool: {
				name: string;
				constrainedSampling?: unknown;
				parameters: {
					properties: Record<string, { type?: string; minimum?: number; maximum?: number }>;
					required?: string[];
				};
			}) {
				tools.push(tool);
			},
		} as unknown as ExtensionAPI);

		expect(tools.map((tool) => tool.name)).toEqual([
			'context_search',
			'context_get',
			'context_export',
			'context_list',
			'context_stats',
			'context_purge',
		]);
		expect(
			tools.every((tool) => tool.constrainedSampling === undefined),
		).toBe(true);

		const numeric_schemas = tools.flatMap((tool) =>
			Object.entries(tool.parameters.properties)
				.filter(([, schema]) => schema.type === 'number' || schema.type === 'integer')
				.map(([name, schema]) => ({ tool: tool.name, name, schema })),
		);
		expect(numeric_schemas.length).toBeGreaterThan(0);
		for (const { tool, name, schema } of numeric_schemas) {
			expect(schema.type, `${tool}.${name}`).toBe('integer');
			expect(schema.minimum, `${tool}.${name}`).toBeGreaterThanOrEqual(0);
		}
		const get_parameters = tools.find(
			(tool) => tool.name === 'context_get',
		)?.parameters;
		expect(get_parameters?.properties.before).toMatchObject({
			type: 'integer',
			minimum: 0,
			maximum: 3,
		});
		expect(get_parameters?.required).toContain('chunk_id');
	});
});
