export declare const MAX_CHAT_BYTES: number;
export declare const MAX_CHAT_LINES = 2000;
export interface LimitedChatOutput {
    text: string;
    truncated: boolean;
    original_bytes: number;
    original_lines: number;
}
export declare function limit_chat_output(text: string): LimitedChatOutput;
export declare function fail_closed_receipt(tool_name: string): string;
