import { Type } from 'typebox';
export declare const context_chunk_schema: Type.TObject<{
    id: Type.TString;
    source_id: Type.TString;
    ordinal: Type.TNumber;
    title: Type.TUnion<[Type.TString, Type.TNull]>;
    content: Type.TString;
    byte_count: Type.TNumber;
}>;
export declare const context_search_output_schema: Type.TObject<{
    results: Type.TArray<Type.TObject<{
        source_id: Type.TString;
        chunk_id: Type.TString;
        ordinal: Type.TNumber;
        title: Type.TUnion<[Type.TString, Type.TNull]>;
        content: Type.TString;
        tool_name: Type.TString;
        created_at: Type.TNumber;
        bytes: Type.TNumber;
        lines: Type.TNumber;
        rank: Type.TNumber;
        snippet: Type.TBoolean;
    }>>;
}>;
export declare const context_get_output_schema: Type.TObject<{
    chunks: Type.TArray<Type.TObject<{
        id: Type.TString;
        source_id: Type.TString;
        ordinal: Type.TNumber;
        title: Type.TUnion<[Type.TString, Type.TNull]>;
        content: Type.TString;
        byte_count: Type.TNumber;
    }>>;
    message: Type.TString;
}>;
export declare const context_export_output_schema: Type.TObject<{
    count: Type.TNumber;
    exported: Type.TBoolean;
    file_path: Type.TUnion<[Type.TString, Type.TNull]>;
    bytes: Type.TNumber;
    verified: Type.TUnion<[Type.TBoolean, Type.TNull]>;
    message: Type.TString;
}>;
export declare const context_list_output_schema: Type.TObject<{
    sources: Type.TArray<Type.TObject<{
        source_id: Type.TString;
        created_at: Type.TNumber;
        project_path: Type.TUnion<[Type.TString, Type.TNull]>;
        session_id: Type.TUnion<[Type.TString, Type.TNull]>;
        tool_name: Type.TString;
        input_summary: Type.TUnion<[Type.TString, Type.TNull]>;
        bytes: Type.TNumber;
        lines: Type.TNumber;
        chunk_count: Type.TNumber;
        first_chunk_title: Type.TUnion<[Type.TString, Type.TNull]>;
        preview: Type.TUnion<[Type.TString, Type.TNull]>;
    }>>;
}>;
export declare const context_stats_output_schema: Type.TObject<{
    sources: Type.TNumber;
    chunks: Type.TNumber;
    bytes_stored: Type.TNumber;
    bytes_returned: Type.TNumber;
    bytes_saved: Type.TNumber;
    reduction_pct: Type.TNumber;
    db_bytes: Type.TNumber;
    wal_bytes: Type.TNumber;
    total_bytes: Type.TNumber;
    oldest_created_at: Type.TUnion<[Type.TNumber, Type.TNull]>;
    newest_created_at: Type.TUnion<[Type.TNumber, Type.TNull]>;
    retention_days: Type.TUnion<[Type.TNumber, Type.TNull]>;
    purge_on_shutdown: Type.TBoolean;
    max_mb: Type.TUnion<[Type.TNumber, Type.TNull]>;
    scope_project_path: Type.TUnion<[Type.TString, Type.TNull]>;
    scope_session_id: Type.TUnion<[Type.TString, Type.TNull]>;
    global_sources: Type.TNumber;
    global_chunks: Type.TNumber;
    global_bytes_stored: Type.TNumber;
    global_oldest_created_at: Type.TUnion<[Type.TNumber, Type.TNull]>;
    global_newest_created_at: Type.TUnion<[Type.TNumber, Type.TNull]>;
}>;
export declare const context_purge_output_schema: Type.TObject<{
    deleted: Type.TNumber;
    source_id: Type.TOptional<Type.TString>;
    project_path: Type.TOptional<Type.TUnion<[Type.TString, Type.TNull]>>;
    session_id: Type.TOptional<Type.TUnion<[Type.TString, Type.TNull]>>;
    older_than_days: Type.TOptional<Type.TNumber>;
}>;
export declare const context_tool_namespace: {
    name: string;
    description: string;
    instructions: string;
};
