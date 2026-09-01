export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.5";
    };
    public: {
        Tables: {
            actions: {
                Row: {
                    completed_at: string | null;
                    completion_criteria: string;
                    created_at: string;
                    currency: string | null;
                    due_at: string | null;
                    estimated_cost: number | null;
                    estimated_minutes: number | null;
                    expected_result: string | null;
                    id: string;
                    plan_node_id: string;
                    result: Json | null;
                    revision: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    completed_at?: string | null;
                    completion_criteria?: string;
                    created_at?: string;
                    currency?: string | null;
                    due_at?: string | null;
                    estimated_cost?: number | null;
                    estimated_minutes?: number | null;
                    expected_result?: string | null;
                    id?: string;
                    plan_node_id: string;
                    result?: Json | null;
                    revision?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    completed_at?: string | null;
                    completion_criteria?: string;
                    created_at?: string;
                    currency?: string | null;
                    due_at?: string | null;
                    estimated_cost?: number | null;
                    estimated_minutes?: number | null;
                    expected_result?: string | null;
                    id?: string;
                    plan_node_id?: string;
                    result?: Json | null;
                    revision?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "actions_plan_node_id_fkey";
                        columns: ["plan_node_id"];
                        isOneToOne: true;
                        referencedRelation: "plan_nodes";
                        referencedColumns: ["id"];
                    },
                ];
            };
            ai_usage_events: {
                Row: {
                    correlation_id: string | null;
                    created_at: string;
                    id: string;
                    input_tokens: number | null;
                    latency_ms: number | null;
                    model_alias: string | null;
                    operation: string;
                    outcome: string;
                    output_tokens: number | null;
                    prompt_version: string | null;
                    provider: string;
                    schema_valid: boolean | null;
                    user_id: string;
                };
                Insert: {
                    correlation_id?: string | null;
                    created_at?: string;
                    id?: string;
                    input_tokens?: number | null;
                    latency_ms?: number | null;
                    model_alias?: string | null;
                    operation: string;
                    outcome: string;
                    output_tokens?: number | null;
                    prompt_version?: string | null;
                    provider?: string;
                    schema_valid?: boolean | null;
                    user_id: string;
                };
                Update: {
                    correlation_id?: string | null;
                    created_at?: string;
                    id?: string;
                    input_tokens?: number | null;
                    latency_ms?: number | null;
                    model_alias?: string | null;
                    operation?: string;
                    outcome?: string;
                    output_tokens?: number | null;
                    prompt_version?: string | null;
                    provider?: string;
                    schema_valid?: boolean | null;
                    user_id?: string;
                };
                Relationships: [];
            };
            assumptions: {
                Row: {
                    created_at: string;
                    id: string;
                    importance: Database["public"]["Enums"]["band"];
                    plan_version_id: string;
                    statement: string;
                    status: string;
                    updated_at: string;
                    user_id: string;
                    validation_action_node_id: string | null;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    importance?: Database["public"]["Enums"]["band"];
                    plan_version_id: string;
                    statement: string;
                    status?: string;
                    updated_at?: string;
                    user_id: string;
                    validation_action_node_id?: string | null;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    importance?: Database["public"]["Enums"]["band"];
                    plan_version_id?: string;
                    statement?: string;
                    status?: string;
                    updated_at?: string;
                    user_id?: string;
                    validation_action_node_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "assumptions_plan_version_id_fkey";
                        columns: ["plan_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "assumptions_validation_action_node_id_fkey";
                        columns: ["validation_action_node_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_nodes";
                        referencedColumns: ["id"];
                    },
                ];
            };
            audit_events: {
                Row: {
                    action: string;
                    correlation_id: string | null;
                    created_at: string;
                    id: string;
                    metadata: Json;
                    resource: string | null;
                    resource_id: string | null;
                    result: string;
                    source: string;
                    user_id: string;
                };
                Insert: {
                    action: string;
                    correlation_id?: string | null;
                    created_at?: string;
                    id?: string;
                    metadata?: Json;
                    resource?: string | null;
                    resource_id?: string | null;
                    result?: string;
                    source?: string;
                    user_id: string;
                };
                Update: {
                    action?: string;
                    correlation_id?: string | null;
                    created_at?: string;
                    id?: string;
                    metadata?: Json;
                    resource?: string | null;
                    resource_id?: string | null;
                    result?: string;
                    source?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            case_context_facts: {
                Row: {
                    case_id: string;
                    category: Database["public"]["Enums"]["fact_category"];
                    confidence: number | null;
                    created_at: string;
                    id: string;
                    key: string;
                    sensitivity: string;
                    source: string;
                    updated_at: string;
                    user_id: string;
                    value: Json;
                };
                Insert: {
                    case_id: string;
                    category: Database["public"]["Enums"]["fact_category"];
                    confidence?: number | null;
                    created_at?: string;
                    id?: string;
                    key: string;
                    sensitivity?: string;
                    source?: string;
                    updated_at?: string;
                    user_id: string;
                    value?: Json;
                };
                Update: {
                    case_id?: string;
                    category?: Database["public"]["Enums"]["fact_category"];
                    confidence?: number | null;
                    created_at?: string;
                    id?: string;
                    key?: string;
                    sensitivity?: string;
                    source?: string;
                    updated_at?: string;
                    user_id?: string;
                    value?: Json;
                };
                Relationships: [
                    {
                        foreignKeyName: "case_context_facts_case_id_fkey";
                        columns: ["case_id"];
                        isOneToOne: false;
                        referencedRelation: "intake_cases";
                        referencedColumns: ["id"];
                    },
                ];
            };
            check_ins: {
                Row: {
                    changed_facts: Json;
                    created_at: string;
                    id: string;
                    note: string | null;
                    plan_id: string;
                    progress_rating: number | null;
                    user_id: string;
                };
                Insert: {
                    changed_facts?: Json;
                    created_at?: string;
                    id?: string;
                    note?: string | null;
                    plan_id: string;
                    progress_rating?: number | null;
                    user_id: string;
                };
                Update: {
                    changed_facts?: Json;
                    created_at?: string;
                    id?: string;
                    note?: string | null;
                    plan_id?: string;
                    progress_rating?: number | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "check_ins_plan_id_fkey";
                        columns: ["plan_id"];
                        isOneToOne: false;
                        referencedRelation: "plans";
                        referencedColumns: ["id"];
                    },
                ];
            };
            idempotency_keys: {
                Row: {
                    created_at: string;
                    expires_at: string;
                    id: string;
                    key: string;
                    operation: string;
                    result_reference: Json | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    expires_at?: string;
                    id?: string;
                    key: string;
                    operation: string;
                    result_reference?: Json | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    expires_at?: string;
                    id?: string;
                    key?: string;
                    operation?: string;
                    result_reference?: Json | null;
                    user_id?: string;
                };
                Relationships: [];
            };
            intake_cases: {
                Row: {
                    clarification_questions: Json;
                    clarity_score: number | null;
                    created_at: string;
                    desired_outcome: string | null;
                    id: string;
                    intent_confidence: number | null;
                    intent_type: Database["public"]["Enums"]["intent_type"] | null;
                    normalized_title: string | null;
                    policy_flags: Json;
                    raw_text: string;
                    status: Database["public"]["Enums"]["case_status"];
                    success_criteria: Json;
                    time_horizon: Json | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    clarification_questions?: Json;
                    clarity_score?: number | null;
                    created_at?: string;
                    desired_outcome?: string | null;
                    id?: string;
                    intent_confidence?: number | null;
                    intent_type?: Database["public"]["Enums"]["intent_type"] | null;
                    normalized_title?: string | null;
                    policy_flags?: Json;
                    raw_text: string;
                    status?: Database["public"]["Enums"]["case_status"];
                    success_criteria?: Json;
                    time_horizon?: Json | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    clarification_questions?: Json;
                    clarity_score?: number | null;
                    created_at?: string;
                    desired_outcome?: string | null;
                    id?: string;
                    intent_confidence?: number | null;
                    intent_type?: Database["public"]["Enums"]["intent_type"] | null;
                    normalized_title?: string | null;
                    policy_flags?: Json;
                    raw_text?: string;
                    status?: Database["public"]["Enums"]["case_status"];
                    success_criteria?: Json;
                    time_horizon?: Json | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            plan_changes: {
                Row: {
                    after_summary: string | null;
                    before_summary: string | null;
                    change_type: string;
                    created_at: string;
                    entity_id: string | null;
                    entity_type: string;
                    from_version_id: string | null;
                    id: string;
                    plan_id: string;
                    reason_code: string;
                    to_version_id: string;
                    user_id: string;
                };
                Insert: {
                    after_summary?: string | null;
                    before_summary?: string | null;
                    change_type: string;
                    created_at?: string;
                    entity_id?: string | null;
                    entity_type: string;
                    from_version_id?: string | null;
                    id?: string;
                    plan_id: string;
                    reason_code?: string;
                    to_version_id: string;
                    user_id: string;
                };
                Update: {
                    after_summary?: string | null;
                    before_summary?: string | null;
                    change_type?: string;
                    created_at?: string;
                    entity_id?: string | null;
                    entity_type?: string;
                    from_version_id?: string | null;
                    id?: string;
                    plan_id?: string;
                    reason_code?: string;
                    to_version_id?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "plan_changes_from_version_id_fkey";
                        columns: ["from_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_changes_plan_id_fkey";
                        columns: ["plan_id"];
                        isOneToOne: false;
                        referencedRelation: "plans";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_changes_to_version_id_fkey";
                        columns: ["to_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                ];
            };
            plan_edges: {
                Row: {
                    created_at: string;
                    edge_type: Database["public"]["Enums"]["edge_type"];
                    from_node_id: string;
                    hard_dependency: boolean;
                    id: string;
                    plan_version_id: string;
                    rationale: string | null;
                    to_node_id: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    edge_type: Database["public"]["Enums"]["edge_type"];
                    from_node_id: string;
                    hard_dependency?: boolean;
                    id?: string;
                    plan_version_id: string;
                    rationale?: string | null;
                    to_node_id: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    edge_type?: Database["public"]["Enums"]["edge_type"];
                    from_node_id?: string;
                    hard_dependency?: boolean;
                    id?: string;
                    plan_version_id?: string;
                    rationale?: string | null;
                    to_node_id?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "plan_edges_from_node_id_fkey";
                        columns: ["from_node_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_nodes";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_edges_plan_version_id_fkey";
                        columns: ["plan_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_edges_to_node_id_fkey";
                        columns: ["to_node_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_nodes";
                        referencedColumns: ["id"];
                    },
                ];
            };
            plan_nodes: {
                Row: {
                    created_at: string;
                    depth: number;
                    description: string;
                    id: string;
                    metadata: Json;
                    node_type: Database["public"]["Enums"]["node_type"];
                    plan_version_id: string;
                    priority_score: number | null;
                    status: Database["public"]["Enums"]["node_status"];
                    strategy_id: string | null;
                    title: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    depth?: number;
                    description?: string;
                    id?: string;
                    metadata?: Json;
                    node_type: Database["public"]["Enums"]["node_type"];
                    plan_version_id: string;
                    priority_score?: number | null;
                    status?: Database["public"]["Enums"]["node_status"];
                    strategy_id?: string | null;
                    title: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    depth?: number;
                    description?: string;
                    id?: string;
                    metadata?: Json;
                    node_type?: Database["public"]["Enums"]["node_type"];
                    plan_version_id?: string;
                    priority_score?: number | null;
                    status?: Database["public"]["Enums"]["node_status"];
                    strategy_id?: string | null;
                    title?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "plan_nodes_plan_version_id_fkey";
                        columns: ["plan_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_nodes_strategy_id_fkey";
                        columns: ["strategy_id"];
                        isOneToOne: false;
                        referencedRelation: "strategies";
                        referencedColumns: ["id"];
                    },
                ];
            };
            plan_versions: {
                Row: {
                    bottleneck_node_id: string | null;
                    bottleneck_reason: string | null;
                    confidence_reasons: Json;
                    confidence_score: number | null;
                    created_at: string;
                    feasibility_score: number | null;
                    generated_by: string;
                    id: string;
                    model_alias: string | null;
                    parent_version_id: string | null;
                    plan_id: string;
                    prompt_version: string | null;
                    scenario: Database["public"]["Enums"]["scenario"];
                    state: Database["public"]["Enums"]["version_state"];
                    summary: string | null;
                    updated_at: string;
                    user_id: string;
                    version_number: number;
                };
                Insert: {
                    bottleneck_node_id?: string | null;
                    bottleneck_reason?: string | null;
                    confidence_reasons?: Json;
                    confidence_score?: number | null;
                    created_at?: string;
                    feasibility_score?: number | null;
                    generated_by?: string;
                    id?: string;
                    model_alias?: string | null;
                    parent_version_id?: string | null;
                    plan_id: string;
                    prompt_version?: string | null;
                    scenario?: Database["public"]["Enums"]["scenario"];
                    state?: Database["public"]["Enums"]["version_state"];
                    summary?: string | null;
                    updated_at?: string;
                    user_id: string;
                    version_number: number;
                };
                Update: {
                    bottleneck_node_id?: string | null;
                    bottleneck_reason?: string | null;
                    confidence_reasons?: Json;
                    confidence_score?: number | null;
                    created_at?: string;
                    feasibility_score?: number | null;
                    generated_by?: string;
                    id?: string;
                    model_alias?: string | null;
                    parent_version_id?: string | null;
                    plan_id?: string;
                    prompt_version?: string | null;
                    scenario?: Database["public"]["Enums"]["scenario"];
                    state?: Database["public"]["Enums"]["version_state"];
                    summary?: string | null;
                    updated_at?: string;
                    user_id?: string;
                    version_number?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "plan_versions_bottleneck_fk";
                        columns: ["bottleneck_node_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_nodes";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_versions_parent_version_id_fkey";
                        columns: ["parent_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plan_versions_plan_id_fkey";
                        columns: ["plan_id"];
                        isOneToOne: false;
                        referencedRelation: "plans";
                        referencedColumns: ["id"];
                    },
                ];
            };
            plans: {
                Row: {
                    active_version_id: string | null;
                    case_id: string;
                    created_at: string;
                    id: string;
                    status: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    active_version_id?: string | null;
                    case_id: string;
                    created_at?: string;
                    id?: string;
                    status?: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    active_version_id?: string | null;
                    case_id?: string;
                    created_at?: string;
                    id?: string;
                    status?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "plans_active_version_fk";
                        columns: ["active_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "plans_case_id_fkey";
                        columns: ["case_id"];
                        isOneToOne: false;
                        referencedRelation: "intake_cases";
                        referencedColumns: ["id"];
                    },
                ];
            };
            profiles: {
                Row: {
                    created_at: string;
                    display_name: string | null;
                    locale: string | null;
                    onboarding_state: string;
                    timezone: string | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    display_name?: string | null;
                    locale?: string | null;
                    onboarding_state?: string;
                    timezone?: string | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    display_name?: string | null;
                    locale?: string | null;
                    onboarding_state?: string;
                    timezone?: string | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            risks: {
                Row: {
                    created_at: string;
                    id: string;
                    impact_band: Database["public"]["Enums"]["band"];
                    mitigation: string;
                    plan_version_id: string;
                    probability_band: Database["public"]["Enums"]["band"];
                    statement: string;
                    status: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    impact_band?: Database["public"]["Enums"]["band"];
                    mitigation?: string;
                    plan_version_id: string;
                    probability_band?: Database["public"]["Enums"]["band"];
                    statement: string;
                    status?: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    impact_band?: Database["public"]["Enums"]["band"];
                    mitigation?: string;
                    plan_version_id?: string;
                    probability_band?: Database["public"]["Enums"]["band"];
                    statement?: string;
                    status?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "risks_plan_version_id_fkey";
                        columns: ["plan_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                ];
            };
            strategies: {
                Row: {
                    created_at: string;
                    effort_score: number | null;
                    id: string;
                    name: string;
                    plan_version_id: string;
                    rationale: string;
                    risk_level: Database["public"]["Enums"]["band"];
                    selected: boolean;
                    summary: string;
                    time_score: number | null;
                    tradeoffs: Json;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    effort_score?: number | null;
                    id?: string;
                    name: string;
                    plan_version_id: string;
                    rationale?: string;
                    risk_level?: Database["public"]["Enums"]["band"];
                    selected?: boolean;
                    summary?: string;
                    time_score?: number | null;
                    tradeoffs?: Json;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    effort_score?: number | null;
                    id?: string;
                    name?: string;
                    plan_version_id?: string;
                    rationale?: string;
                    risk_level?: Database["public"]["Enums"]["band"];
                    selected?: boolean;
                    summary?: string;
                    time_score?: number | null;
                    tradeoffs?: Json;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "strategies_plan_version_id_fkey";
                        columns: ["plan_version_id"];
                        isOneToOne: false;
                        referencedRelation: "plan_versions";
                        referencedColumns: ["id"];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            band: "LOW" | "MEDIUM" | "HIGH";
            case_status:
            | "DRAFT"
            | "NEEDS_CLARIFICATION"
            | "READY_FOR_PLANNING"
            | "PLANNED"
            | "ARCHIVED"
            | "REJECTED";
            edge_type:
            | "REQUIRES"
            | "ENABLES"
            | "BLOCKED_BY"
            | "SUPPORTS"
            | "CONFLICTS_WITH"
            | "VALIDATES"
            | "MITIGATES"
            | "DERIVED_FROM"
            | "PART_OF"
            | "PRECEDES"
            | "ALTERNATIVE_TO";
            fact_category: "RESOURCE" | "CONSTRAINT" | "PREFERENCE" | "FACT" | "MEASURE";
            intent_type:
            | "GOAL"
            | "DESIRE"
            | "PROBLEM"
            | "DECISION"
            | "UNCERTAINTY"
            | "PROJECT"
            | "HABIT"
            | "LEARNING"
            | "CRISIS"
            | "QUESTION"
            | "OTHER";
            node_status:
            | "PENDING"
            | "READY"
            | "IN_PROGRESS"
            | "DONE"
            | "BLOCKED"
            | "SKIPPED"
            | "DEFERRED"
            | "CANCELLED";
            node_type:
            | "OBJECTIVE"
            | "OUTCOME"
            | "REQUIREMENT"
            | "RESOURCE"
            | "CONSTRAINT"
            | "GAP"
            | "STRATEGY"
            | "MILESTONE"
            | "ACTION"
            | "EXPERIMENT"
            | "ASSUMPTION"
            | "RISK"
            | "EVIDENCE"
            | "BLOCKER"
            | "METRIC";
            scenario: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
            version_state: "CANDIDATE" | "ACTIVE" | "SUPERSEDED" | "REJECTED";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
            DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R;
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
    }
    ? R
    : never
    : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I;
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
    }
    ? I
    : never
    : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U;
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
    }
    ? U
    : never
    : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
    public: {
        Enums: {
            band: ["LOW", "MEDIUM", "HIGH"],
            case_status: [
                "DRAFT",
                "NEEDS_CLARIFICATION",
                "READY_FOR_PLANNING",
                "PLANNED",
                "ARCHIVED",
                "REJECTED",
            ],
            edge_type: [
                "REQUIRES",
                "ENABLES",
                "BLOCKED_BY",
                "SUPPORTS",
                "CONFLICTS_WITH",
                "VALIDATES",
                "MITIGATES",
                "DERIVED_FROM",
                "PART_OF",
                "PRECEDES",
                "ALTERNATIVE_TO",
            ],
            fact_category: ["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"],
            intent_type: [
                "GOAL",
                "DESIRE",
                "PROBLEM",
                "DECISION",
                "UNCERTAINTY",
                "PROJECT",
                "HABIT",
                "LEARNING",
                "CRISIS",
                "QUESTION",
                "OTHER",
            ],
            node_status: [
                "PENDING",
                "READY",
                "IN_PROGRESS",
                "DONE",
                "BLOCKED",
                "SKIPPED",
                "DEFERRED",
                "CANCELLED",
            ],
            node_type: [
                "OBJECTIVE",
                "OUTCOME",
                "REQUIREMENT",
                "RESOURCE",
                "CONSTRAINT",
                "GAP",
                "STRATEGY",
                "MILESTONE",
                "ACTION",
                "EXPERIMENT",
                "ASSUMPTION",
                "RISK",
                "EVIDENCE",
                "BLOCKER",
                "METRIC",
            ],
            scenario: ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"],
            version_state: ["CANDIDATE", "ACTIVE", "SUPERSEDED", "REJECTED"],
        },
    },
} as const;
