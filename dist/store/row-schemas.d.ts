import * as v from 'valibot';
export declare const context_chunk_schema: v.ObjectSchema<{
    readonly id: v.StringSchema<undefined>;
    readonly source_id: v.StringSchema<undefined>;
    readonly ordinal: v.NumberSchema<undefined>;
    readonly title: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly content: v.StringSchema<undefined>;
    readonly byte_count: v.NumberSchema<undefined>;
}, undefined>;
export declare const list_row_schema: v.ObjectSchema<{
    readonly source_id: v.StringSchema<undefined>;
    readonly created_at: v.NumberSchema<undefined>;
    readonly project_path: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly session_id: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly tool_name: v.StringSchema<undefined>;
    readonly input_summary: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly byte_count: v.NumberSchema<undefined>;
    readonly line_count: v.NumberSchema<undefined>;
    readonly chunk_count: v.NumberSchema<undefined>;
    readonly first_chunk_title: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly preview: v.NullableSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
export declare const search_row_schema: v.ObjectSchema<{
    readonly id: v.StringSchema<undefined>;
    readonly tool_name: v.StringSchema<undefined>;
    readonly created_at: v.NumberSchema<undefined>;
    readonly byte_count: v.NumberSchema<undefined>;
    readonly line_count: v.NumberSchema<undefined>;
    readonly chunk_id: v.StringSchema<undefined>;
    readonly ordinal: v.NumberSchema<undefined>;
    readonly title: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly content: v.StringSchema<undefined>;
    readonly rank: v.NumberSchema<undefined>;
}, undefined>;
export declare const chunk_summary_row_schema: v.ObjectSchema<{
    readonly source_id: v.StringSchema<undefined>;
    readonly chunk_count: v.NumberSchema<undefined>;
    readonly first_chunk_id: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly last_chunk_id: v.NullableSchema<v.StringSchema<undefined>, undefined>;
    readonly first_ordinal: v.NullableSchema<v.NumberSchema<undefined>, undefined>;
    readonly last_ordinal: v.NullableSchema<v.NumberSchema<undefined>, undefined>;
}, undefined>;
export declare const chunk_ordinal_row_schema: v.ObjectSchema<{
    readonly ordinal: v.NumberSchema<undefined>;
}, undefined>;
export declare const duplicate_source_row_schema: v.ObjectSchema<{
    readonly id: v.StringSchema<undefined>;
    readonly chunk_count: v.NumberSchema<undefined>;
    readonly first_chunk_id: v.NullableSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
export declare const content_hash_row_schema: v.ObjectSchema<{
    readonly content_hash: v.StringSchema<undefined>;
}, undefined>;
export declare const user_version_row_schema: v.ObjectSchema<{
    readonly user_version: v.NumberSchema<undefined>;
}, undefined>;
export declare const source_stats_row_schema: v.ObjectSchema<{
    readonly sources: v.NumberSchema<undefined>;
    readonly bytes_stored: v.NumberSchema<undefined>;
    readonly bytes_returned: v.NumberSchema<undefined>;
    readonly oldest_created_at: v.NullableSchema<v.NumberSchema<undefined>, undefined>;
    readonly newest_created_at: v.NullableSchema<v.NumberSchema<undefined>, undefined>;
}, undefined>;
export declare const chunk_count_row_schema: v.ObjectSchema<{
    readonly chunks: v.NumberSchema<undefined>;
}, undefined>;
export declare const stored_bytes_row_schema: v.ObjectSchema<{
    readonly bytes: v.NumberSchema<undefined>;
}, undefined>;
export declare const source_size_row_schema: v.ObjectSchema<{
    readonly id: v.StringSchema<undefined>;
    readonly byte_count: v.NumberSchema<undefined>;
}, undefined>;
