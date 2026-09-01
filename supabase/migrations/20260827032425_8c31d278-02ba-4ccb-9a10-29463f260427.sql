-- Enums
CREATE TYPE public.intent_type AS ENUM ('GOAL','DESIRE','PROBLEM','DECISION','UNCERTAINTY','PROJECT','HABIT','LEARNING','CRISIS','QUESTION','OTHER');
CREATE TYPE public.case_status AS ENUM ('DRAFT','NEEDS_CLARIFICATION','READY_FOR_PLANNING','PLANNED','ARCHIVED','REJECTED');
CREATE TYPE public.node_type AS ENUM ('OBJECTIVE','OUTCOME','REQUIREMENT','RESOURCE','CONSTRAINT','GAP','STRATEGY','MILESTONE','ACTION','EXPERIMENT','ASSUMPTION','RISK','EVIDENCE','BLOCKER','METRIC');
CREATE TYPE public.edge_type AS ENUM ('REQUIRES','ENABLES','BLOCKED_BY','SUPPORTS','CONFLICTS_WITH','VALIDATES','MITIGATES','DERIVED_FROM','PART_OF','PRECEDES','ALTERNATIVE_TO');
CREATE TYPE public.node_status AS ENUM ('PENDING','READY','IN_PROGRESS','DONE','BLOCKED','SKIPPED','DEFERRED','CANCELLED');
CREATE TYPE public.version_state AS ENUM ('CANDIDATE','ACTIVE','SUPERSEDED','REJECTED');
CREATE TYPE public.scenario AS ENUM ('CONSERVATIVE','BALANCED','AGGRESSIVE');
CREATE TYPE public.band AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE public.fact_category AS ENUM ('RESOURCE','CONSTRAINT','PREFERENCE','FACT','MEASURE');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  timezone text,
  locale text,
  onboarding_state text NOT NULL DEFAULT 'NEW',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- intake_cases
CREATE TABLE public.intake_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  raw_text text NOT NULL,
  intent_type public.intent_type,
  intent_confidence numeric,
  normalized_title text,
  desired_outcome text,
  success_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_horizon jsonb,
  clarity_score integer,
  clarification_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  policy_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.case_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intake_cases_user_updated ON public.intake_cases (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_cases TO authenticated;
GRANT ALL ON public.intake_cases TO service_role;
ALTER TABLE public.intake_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cases" ON public.intake_cases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER intake_cases_touch BEFORE UPDATE ON public.intake_cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- case_context_facts
CREATE TABLE public.case_context_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.intake_cases ON DELETE CASCADE,
  category public.fact_category NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'USER',
  confidence numeric,
  sensitivity text NOT NULL DEFAULT 'PRIVATE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX case_context_facts_case ON public.case_context_facts (case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_context_facts TO authenticated;
GRANT ALL ON public.case_context_facts TO service_role;
ALTER TABLE public.case_context_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own facts" ON public.case_context_facts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER case_context_facts_touch BEFORE UPDATE ON public.case_context_facts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- plans
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.intake_cases ON DELETE CASCADE,
  active_version_id uuid,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plans_user_updated ON public.plans (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- plan_versions
CREATE TABLE public.plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans ON DELETE CASCADE,
  parent_version_id uuid REFERENCES public.plan_versions ON DELETE SET NULL,
  version_number integer NOT NULL,
  state public.version_state NOT NULL DEFAULT 'CANDIDATE',
  scenario public.scenario NOT NULL DEFAULT 'BALANCED',
  feasibility_score integer,
  confidence_score integer,
  confidence_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  bottleneck_node_id uuid,
  bottleneck_reason text,
  generated_by text NOT NULL DEFAULT 'AI',
  prompt_version text,
  model_alias text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version_number)
);
CREATE UNIQUE INDEX plan_versions_one_active ON public.plan_versions (plan_id) WHERE state = 'ACTIVE';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_versions TO authenticated;
GRANT ALL ON public.plan_versions TO service_role;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.plan_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER plan_versions_touch BEFORE UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- strategies
CREATE TABLE public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions ON DELETE CASCADE,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  risk_level public.band NOT NULL DEFAULT 'MEDIUM',
  effort_score integer,
  time_score integer,
  selected boolean NOT NULL DEFAULT false,
  rationale text NOT NULL DEFAULT '',
  tradeoffs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX strategies_version ON public.strategies (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own strategies" ON public.strategies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plan_nodes
CREATE TABLE public.plan_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions ON DELETE CASCADE,
  strategy_id uuid REFERENCES public.strategies ON DELETE SET NULL,
  node_type public.node_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.node_status NOT NULL DEFAULT 'PENDING',
  priority_score numeric,
  depth integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_nodes_version ON public.plan_nodes (plan_version_id, node_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_nodes TO authenticated;
GRANT ALL ON public.plan_nodes TO service_role;
ALTER TABLE public.plan_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nodes" ON public.plan_nodes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER plan_nodes_touch BEFORE UPDATE ON public.plan_nodes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- plan_edges
CREATE TABLE public.plan_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions ON DELETE CASCADE,
  from_node_id uuid NOT NULL REFERENCES public.plan_nodes ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES public.plan_nodes ON DELETE CASCADE,
  edge_type public.edge_type NOT NULL,
  hard_dependency boolean NOT NULL DEFAULT true,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_version_id, from_node_id, to_node_id, edge_type)
);
CREATE INDEX plan_edges_version ON public.plan_edges (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_edges TO authenticated;
GRANT ALL ON public.plan_edges TO service_role;
ALTER TABLE public.plan_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own edges" ON public.plan_edges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- assumptions
CREATE TABLE public.assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions ON DELETE CASCADE,
  statement text NOT NULL,
  importance public.band NOT NULL DEFAULT 'MEDIUM',
  status text NOT NULL DEFAULT 'UNVALIDATED',
  validation_action_node_id uuid REFERENCES public.plan_nodes ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assumptions_version ON public.assumptions (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assumptions TO authenticated;
GRANT ALL ON public.assumptions TO service_role;
ALTER TABLE public.assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assumptions" ON public.assumptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER assumptions_touch BEFORE UPDATE ON public.assumptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- risks
CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions ON DELETE CASCADE,
  statement text NOT NULL,
  probability_band public.band NOT NULL DEFAULT 'MEDIUM',
  impact_band public.band NOT NULL DEFAULT 'MEDIUM',
  mitigation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX risks_version ON public.risks (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own risks" ON public.risks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER risks_touch BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- actions
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_node_id uuid NOT NULL UNIQUE REFERENCES public.plan_nodes ON DELETE CASCADE,
  completion_criteria text NOT NULL DEFAULT '',
  expected_result text,
  estimated_minutes integer,
  estimated_cost numeric,
  currency text,
  due_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own actions" ON public.actions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER actions_touch BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- check_ins
CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans ON DELETE CASCADE,
  note text,
  progress_rating integer,
  changed_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX check_ins_plan ON public.check_ins (plan_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.check_ins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plan_changes
CREATE TABLE public.plan_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans ON DELETE CASCADE,
  from_version_id uuid REFERENCES public.plan_versions ON DELETE SET NULL,
  to_version_id uuid NOT NULL REFERENCES public.plan_versions ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text,
  change_type text NOT NULL,
  before_summary text,
  after_summary text,
  reason_code text NOT NULL DEFAULT 'REPLAN',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_changes_to_version ON public.plan_changes (to_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_changes TO authenticated;
GRANT ALL ON public.plan_changes TO service_role;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own changes" ON public.plan_changes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_usage_events
CREATE TABLE public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  operation text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable-ai',
  model_alias text,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  outcome text NOT NULL,
  schema_valid boolean,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_created ON public.ai_usage_events (user_id, created_at DESC);
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own ai usage" ON public.ai_usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- idempotency_keys
CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  operation text NOT NULL,
  key text NOT NULL,
  result_reference jsonb,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation, key)
);
GRANT SELECT ON public.idempotency_keys TO authenticated;
GRANT ALL ON public.idempotency_keys TO service_role;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own idempotency" ON public.idempotency_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- audit_events
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action text NOT NULL,
  resource text,
  resource_id text,
  result text NOT NULL DEFAULT 'OK',
  source text NOT NULL DEFAULT 'web',
  correlation_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_user_created ON public.audit_events (user_id, created_at DESC);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own audit" ON public.audit_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.plans ADD CONSTRAINT plans_active_version_fk FOREIGN KEY (active_version_id) REFERENCES public.plan_versions(id) ON DELETE SET NULL;
ALTER TABLE public.plan_versions ADD CONSTRAINT plan_versions_bottleneck_fk FOREIGN KEY (bottleneck_node_id) REFERENCES public.plan_nodes(id) ON DELETE SET NULL;