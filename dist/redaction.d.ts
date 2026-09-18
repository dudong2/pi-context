export interface RedactionResult {
    redacted: string;
    count: number;
}
export declare function redact_metadata(value: string): string;
export declare function redact_metadata(value: null): null;
export declare function redact_metadata(value: undefined): undefined;
export declare function redact_metadata(value: string | null | undefined): string | null | undefined;
export declare function redact_text(text: string): RedactionResult;
