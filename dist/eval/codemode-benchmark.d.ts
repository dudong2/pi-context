type Variant = 'baseline' | 'codemode-first' | 'native-only';
type Scenario = 'bash-filter' | 'read-filter' | 'mcp-filter' | 'final-overflow' | 'small-output';
export interface CodemodeBenchmarkResult {
    variant: Variant;
    scenario: Scenario;
    correct: boolean;
    model_facing_bytes: number;
    top_level_calls: number;
    nested_calls: number;
    retrieval_calls: number;
    stored_sources: number;
    stored_bytes: number;
    tool_declaration_bytes: number;
    wall_ms: number;
}
export declare function run_codemode_benchmark(baseline_dir?: string, runs?: number): Promise<{
    version: number;
    runs: number;
    runtime: string;
    measurement: string;
    results: (CodemodeBenchmarkResult & {
        run: number;
    })[];
}>;
export {};
