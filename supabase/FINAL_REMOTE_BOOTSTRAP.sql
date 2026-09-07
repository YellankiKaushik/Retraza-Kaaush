-- ReversePath final remote bootstrap SQL.
-- Generated from committed files under supabase/migrations/.
-- Intended for one controlled MVP bootstrap in Supabase SQL Editor.
-- This file does not truncate, reset, drop tables, or delete application data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Source: supabase/migrations/20260827032425_8c31d278-02ba-4ccb-9a10-29463f260427.sql
-- Enums
DO $$ BEGIN
  CREATE TYPE public.intent_type AS ENUM ('GOAL','DESIRE','PROBLEM','DECISION','UNCERTAINTY','PROJECT','HABIT','LEARNING','CRISIS','QUESTION','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.case_status AS ENUM ('DRAFT','NEEDS_CLARIFICATION','READY_FOR_PLANNING','PLANNED','ARCHIVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.node_type AS ENUM ('OBJECTIVE','OUTCOME','REQUIREMENT','RESOURCE','CONSTRAINT','GAP','STRATEGY','MILESTONE','ACTION','EXPERIMENT','ASSUMPTION','RISK','EVIDENCE','BLOCKER','METRIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.edge_type AS ENUM ('REQUIRES','ENABLES','BLOCKED_BY','SUPPORTS','CONFLICTS_WITH','VALIDATES','MITIGATES','DERIVED_FROM','PART_OF','PRECEDES','ALTERNATIVE_TO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.node_status AS ENUM ('PENDING','READY','IN_PROGRESS','DONE','BLOCKED','SKIPPED','DEFERRED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.version_state AS ENUM ('CANDIDATE','ACTIVE','SUPERSEDED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.scenario AS ENUM ('CONSERVATIVE','BALANCED','AGGRESSIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.band AS ENUM ('LOW','MEDIUM','HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.fact_category AS ENUM ('RESOURCE','CONSTRAINT','PREFERENCE','FACT','MEASURE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
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
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- intake_cases
CREATE TABLE IF NOT EXISTS public.intake_cases (
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
CREATE INDEX IF NOT EXISTS intake_cases_user_updated ON public.intake_cases (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_cases TO authenticated;
GRANT ALL ON public.intake_cases TO service_role;
ALTER TABLE public.intake_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own cases" ON public.intake_cases;
CREATE POLICY "own cases" ON public.intake_cases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS intake_cases_touch ON public.intake_cases;
CREATE TRIGGER intake_cases_touch BEFORE UPDATE ON public.intake_cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- case_context_facts
CREATE TABLE IF NOT EXISTS public.case_context_facts (
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
CREATE INDEX IF NOT EXISTS case_context_facts_case ON public.case_context_facts (case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_context_facts TO authenticated;
GRANT ALL ON public.case_context_facts TO service_role;
ALTER TABLE public.case_context_facts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own facts" ON public.case_context_facts;
CREATE POLICY "own facts" ON public.case_context_facts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS case_context_facts_touch ON public.case_context_facts;
CREATE TRIGGER case_context_facts_touch BEFORE UPDATE ON public.case_context_facts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.intake_cases ON DELETE CASCADE,
  active_version_id uuid,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plans_user_updated ON public.plans (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own plans" ON public.plans;
CREATE POLICY "own plans" ON public.plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS plans_touch ON public.plans;
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- plan_versions
CREATE TABLE IF NOT EXISTS public.plan_versions (
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
CREATE UNIQUE INDEX IF NOT EXISTS plan_versions_one_active ON public.plan_versions (plan_id) WHERE state = 'ACTIVE';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_versions TO authenticated;
GRANT ALL ON public.plan_versions TO service_role;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own versions" ON public.plan_versions;
CREATE POLICY "own versions" ON public.plan_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS plan_versions_touch ON public.plan_versions;
CREATE TRIGGER plan_versions_touch BEFORE UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- strategies
CREATE TABLE IF NOT EXISTS public.strategies (
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
CREATE INDEX IF NOT EXISTS strategies_version ON public.strategies (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own strategies" ON public.strategies;
CREATE POLICY "own strategies" ON public.strategies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plan_nodes
CREATE TABLE IF NOT EXISTS public.plan_nodes (
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
CREATE INDEX IF NOT EXISTS plan_nodes_version ON public.plan_nodes (plan_version_id, node_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_nodes TO authenticated;
GRANT ALL ON public.plan_nodes TO service_role;
ALTER TABLE public.plan_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own nodes" ON public.plan_nodes;
CREATE POLICY "own nodes" ON public.plan_nodes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS plan_nodes_touch ON public.plan_nodes;
CREATE TRIGGER plan_nodes_touch BEFORE UPDATE ON public.plan_nodes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- plan_edges
CREATE TABLE IF NOT EXISTS public.plan_edges (
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
CREATE INDEX IF NOT EXISTS plan_edges_version ON public.plan_edges (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_edges TO authenticated;
GRANT ALL ON public.plan_edges TO service_role;
ALTER TABLE public.plan_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own edges" ON public.plan_edges;
CREATE POLICY "own edges" ON public.plan_edges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- assumptions
CREATE TABLE IF NOT EXISTS public.assumptions (
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
CREATE INDEX IF NOT EXISTS assumptions_version ON public.assumptions (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assumptions TO authenticated;
GRANT ALL ON public.assumptions TO service_role;
ALTER TABLE public.assumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own assumptions" ON public.assumptions;
CREATE POLICY "own assumptions" ON public.assumptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS assumptions_touch ON public.assumptions;
CREATE TRIGGER assumptions_touch BEFORE UPDATE ON public.assumptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- risks
CREATE TABLE IF NOT EXISTS public.risks (
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
CREATE INDEX IF NOT EXISTS risks_version ON public.risks (plan_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own risks" ON public.risks;
CREATE POLICY "own risks" ON public.risks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS risks_touch ON public.risks;
CREATE TRIGGER risks_touch BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- actions
CREATE TABLE IF NOT EXISTS public.actions (
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
DROP POLICY IF EXISTS "own actions" ON public.actions;
CREATE POLICY "own actions" ON public.actions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS actions_touch ON public.actions;
CREATE TRIGGER actions_touch BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- check_ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans ON DELETE CASCADE,
  note text,
  progress_rating integer,
  changed_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS check_ins_plan ON public.check_ins (plan_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own checkins" ON public.check_ins;
CREATE POLICY "own checkins" ON public.check_ins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plan_changes
CREATE TABLE IF NOT EXISTS public.plan_changes (
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
CREATE INDEX IF NOT EXISTS plan_changes_to_version ON public.plan_changes (to_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_changes TO authenticated;
GRANT ALL ON public.plan_changes TO service_role;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own changes" ON public.plan_changes;
CREATE POLICY "own changes" ON public.plan_changes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_usage_events
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
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
CREATE INDEX IF NOT EXISTS ai_usage_user_created ON public.ai_usage_events (user_id, created_at DESC);
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own ai usage" ON public.ai_usage_events;
CREATE POLICY "read own ai usage" ON public.ai_usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- idempotency_keys
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
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
DROP POLICY IF EXISTS "read own idempotency" ON public.idempotency_keys;
CREATE POLICY "read own idempotency" ON public.idempotency_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- audit_events
CREATE TABLE IF NOT EXISTS public.audit_events (
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
CREATE INDEX IF NOT EXISTS audit_user_created ON public.audit_events (user_id, created_at DESC);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own audit" ON public.audit_events;
CREATE POLICY "read own audit" ON public.audit_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER TABLE public.plans ADD CONSTRAINT plans_active_version_fk FOREIGN KEY (active_version_id) REFERENCES public.plan_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.plan_versions ADD CONSTRAINT plan_versions_bottleneck_fk FOREIGN KEY (bottleneck_node_id) REFERENCES public.plan_nodes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Source: supabase/migrations/20260827032444_f68e6bbe-d20e-4f3f-a738-4d019d96358b.sql
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Source: supabase/migrations/20260901093000_enforce_reversepath_ownership_integrity.sql
CREATE OR REPLACE FUNCTION public.require_same_owner(actual_user_id uuid, expected_user_id uuid, relation_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF actual_user_id IS NULL OR actual_user_id <> expected_user_id THEN
    RAISE EXCEPTION 'ownership violation on %', relation_name
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_case_context_fact_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.intake_cases WHERE id = NEW.case_id;
  PERFORM public.require_same_owner(owner_id, NEW.user_id, 'case_context_facts.case_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_plan_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.intake_cases WHERE id = NEW.case_id;
  PERFORM public.require_same_owner(owner_id, NEW.user_id, 'plans.case_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_plan_version_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE plan_owner_id uuid;
DECLARE parent_plan_id uuid;
DECLARE parent_owner_id uuid;
BEGIN
  SELECT user_id INTO plan_owner_id FROM public.plans WHERE id = NEW.plan_id;
  PERFORM public.require_same_owner(plan_owner_id, NEW.user_id, 'plan_versions.plan_id');

  IF NEW.parent_version_id IS NOT NULL THEN
    SELECT user_id, plan_id INTO parent_owner_id, parent_plan_id
    FROM public.plan_versions
    WHERE id = NEW.parent_version_id;
    PERFORM public.require_same_owner(parent_owner_id, NEW.user_id, 'plan_versions.parent_version_id');
    IF parent_plan_id <> NEW.plan_id THEN
      RAISE EXCEPTION 'ownership violation on plan_versions.parent_version_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_strategy_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.plan_versions WHERE id = NEW.plan_version_id;
  PERFORM public.require_same_owner(owner_id, NEW.user_id, 'strategies.plan_version_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_plan_node_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE version_owner_id uuid;
DECLARE strategy_owner_id uuid;
DECLARE strategy_version_id uuid;
BEGIN
  SELECT user_id INTO version_owner_id FROM public.plan_versions WHERE id = NEW.plan_version_id;
  PERFORM public.require_same_owner(version_owner_id, NEW.user_id, 'plan_nodes.plan_version_id');

  IF NEW.strategy_id IS NOT NULL THEN
    SELECT user_id, plan_version_id INTO strategy_owner_id, strategy_version_id
    FROM public.strategies
    WHERE id = NEW.strategy_id;
    PERFORM public.require_same_owner(strategy_owner_id, NEW.user_id, 'plan_nodes.strategy_id');
    IF strategy_version_id <> NEW.plan_version_id THEN
      RAISE EXCEPTION 'ownership violation on plan_nodes.strategy_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_plan_edge_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE version_owner_id uuid;
DECLARE from_owner_id uuid;
DECLARE from_version_id uuid;
DECLARE to_owner_id uuid;
DECLARE to_version_id uuid;
BEGIN
  SELECT user_id INTO version_owner_id FROM public.plan_versions WHERE id = NEW.plan_version_id;
  PERFORM public.require_same_owner(version_owner_id, NEW.user_id, 'plan_edges.plan_version_id');

  SELECT user_id, plan_version_id INTO from_owner_id, from_version_id
  FROM public.plan_nodes
  WHERE id = NEW.from_node_id;
  PERFORM public.require_same_owner(from_owner_id, NEW.user_id, 'plan_edges.from_node_id');

  SELECT user_id, plan_version_id INTO to_owner_id, to_version_id
  FROM public.plan_nodes
  WHERE id = NEW.to_node_id;
  PERFORM public.require_same_owner(to_owner_id, NEW.user_id, 'plan_edges.to_node_id');

  IF from_version_id <> NEW.plan_version_id OR to_version_id <> NEW.plan_version_id THEN
    RAISE EXCEPTION 'ownership violation on plan_edges node versions'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_assumption_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE version_owner_id uuid;
DECLARE node_owner_id uuid;
DECLARE node_version_id uuid;
BEGIN
  SELECT user_id INTO version_owner_id FROM public.plan_versions WHERE id = NEW.plan_version_id;
  PERFORM public.require_same_owner(version_owner_id, NEW.user_id, 'assumptions.plan_version_id');

  IF NEW.validation_action_node_id IS NOT NULL THEN
    SELECT user_id, plan_version_id INTO node_owner_id, node_version_id
    FROM public.plan_nodes
    WHERE id = NEW.validation_action_node_id;
    PERFORM public.require_same_owner(node_owner_id, NEW.user_id, 'assumptions.validation_action_node_id');
    IF node_version_id <> NEW.plan_version_id THEN
      RAISE EXCEPTION 'ownership violation on assumptions.validation_action_node_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_risk_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.plan_versions WHERE id = NEW.plan_version_id;
  PERFORM public.require_same_owner(owner_id, NEW.user_id, 'risks.plan_version_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_action_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
DECLARE node_kind public.node_type;
BEGIN
  SELECT user_id, node_type INTO owner_id, node_kind
  FROM public.plan_nodes
  WHERE id = NEW.plan_node_id;
  PERFORM public.require_same_owner(owner_id, NEW.user_id, 'actions.plan_node_id');
  IF node_kind NOT IN ('ACTION', 'EXPERIMENT') THEN
    RAISE EXCEPTION 'actions must reference an ACTION or EXPERIMENT node'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_check_in_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.plans WHERE id = NEW.plan_id;
  PERFORM public.require_same_owner(owner_id, NEW.user_id, 'check_ins.plan_id');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_plan_change_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE plan_owner_id uuid;
DECLARE from_owner_id uuid;
DECLARE from_plan_id uuid;
DECLARE to_owner_id uuid;
DECLARE to_plan_id uuid;
BEGIN
  SELECT user_id INTO plan_owner_id FROM public.plans WHERE id = NEW.plan_id;
  PERFORM public.require_same_owner(plan_owner_id, NEW.user_id, 'plan_changes.plan_id');

  IF NEW.from_version_id IS NOT NULL THEN
    SELECT user_id, plan_id INTO from_owner_id, from_plan_id
    FROM public.plan_versions
    WHERE id = NEW.from_version_id;
    PERFORM public.require_same_owner(from_owner_id, NEW.user_id, 'plan_changes.from_version_id');
    IF from_plan_id <> NEW.plan_id THEN
      RAISE EXCEPTION 'ownership violation on plan_changes.from_version_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT user_id, plan_id INTO to_owner_id, to_plan_id
  FROM public.plan_versions
  WHERE id = NEW.to_version_id;
  PERFORM public.require_same_owner(to_owner_id, NEW.user_id, 'plan_changes.to_version_id');
  IF to_plan_id <> NEW.plan_id THEN
    RAISE EXCEPTION 'ownership violation on plan_changes.to_version_id'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_case_context_fact_owner ON public.case_context_facts;
CREATE TRIGGER guard_case_context_fact_owner
BEFORE INSERT OR UPDATE OF user_id, case_id ON public.case_context_facts
FOR EACH ROW EXECUTE FUNCTION public.guard_case_context_fact_owner();

DROP TRIGGER IF EXISTS guard_plan_owner ON public.plans;
CREATE TRIGGER guard_plan_owner
BEFORE INSERT OR UPDATE OF user_id, case_id ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_owner();

DROP TRIGGER IF EXISTS guard_plan_version_owner ON public.plan_versions;
CREATE TRIGGER guard_plan_version_owner
BEFORE INSERT OR UPDATE OF user_id, plan_id, parent_version_id ON public.plan_versions
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_version_owner();

DROP TRIGGER IF EXISTS guard_strategy_owner ON public.strategies;
CREATE TRIGGER guard_strategy_owner
BEFORE INSERT OR UPDATE OF user_id, plan_version_id ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.guard_strategy_owner();

DROP TRIGGER IF EXISTS guard_plan_node_owner ON public.plan_nodes;
CREATE TRIGGER guard_plan_node_owner
BEFORE INSERT OR UPDATE OF user_id, plan_version_id, strategy_id ON public.plan_nodes
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_node_owner();

DROP TRIGGER IF EXISTS guard_plan_edge_owner ON public.plan_edges;
CREATE TRIGGER guard_plan_edge_owner
BEFORE INSERT OR UPDATE OF user_id, plan_version_id, from_node_id, to_node_id ON public.plan_edges
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_edge_owner();

DROP TRIGGER IF EXISTS guard_assumption_owner ON public.assumptions;
CREATE TRIGGER guard_assumption_owner
BEFORE INSERT OR UPDATE OF user_id, plan_version_id, validation_action_node_id ON public.assumptions
FOR EACH ROW EXECUTE FUNCTION public.guard_assumption_owner();

DROP TRIGGER IF EXISTS guard_risk_owner ON public.risks;
CREATE TRIGGER guard_risk_owner
BEFORE INSERT OR UPDATE OF user_id, plan_version_id ON public.risks
FOR EACH ROW EXECUTE FUNCTION public.guard_risk_owner();

DROP TRIGGER IF EXISTS guard_action_owner ON public.actions;
CREATE TRIGGER guard_action_owner
BEFORE INSERT OR UPDATE OF user_id, plan_node_id ON public.actions
FOR EACH ROW EXECUTE FUNCTION public.guard_action_owner();

DROP TRIGGER IF EXISTS guard_check_in_owner ON public.check_ins;
CREATE TRIGGER guard_check_in_owner
BEFORE INSERT OR UPDATE OF user_id, plan_id ON public.check_ins
FOR EACH ROW EXECUTE FUNCTION public.guard_check_in_owner();

DROP TRIGGER IF EXISTS guard_plan_change_owner ON public.plan_changes;
CREATE TRIGGER guard_plan_change_owner
BEFORE INSERT OR UPDATE OF user_id, plan_id, from_version_id, to_version_id ON public.plan_changes
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_change_owner();

-- Source: supabase/migrations/20260903123000_atomic_plan_version_activation.sql
CREATE OR REPLACE FUNCTION public.activate_plan_version_for_user(
  target_plan_id uuid,
  target_version_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_owner_id uuid;
  target_plan_id_from_version uuid;
  target_state public.version_state;
BEGIN
  SELECT user_id, plan_id, state
    INTO target_owner_id, target_plan_id_from_version, target_state
  FROM public.plan_versions
  WHERE id = target_version_id;

  IF target_owner_id IS NULL
     OR target_owner_id <> auth.uid()
     OR target_plan_id_from_version <> target_plan_id THEN
    RAISE EXCEPTION 'plan version not found'
      USING ERRCODE = '42501';
  END IF;

  IF target_state = 'REJECTED' THEN
    RAISE EXCEPTION 'rejected plan versions cannot be activated'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.plan_versions
  SET state = 'SUPERSEDED'
  WHERE plan_id = target_plan_id
    AND user_id = target_owner_id
    AND state = 'ACTIVE'
    AND id <> target_version_id;

  UPDATE public.plan_versions
  SET state = 'ACTIVE'
  WHERE id = target_version_id
    AND user_id = target_owner_id;

  UPDATE public.plans
  SET active_version_id = target_version_id
  WHERE id = target_plan_id
    AND user_id = target_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_plan_version_for_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_plan_version_for_user(uuid, uuid) TO authenticated;

COMMIT;

-- Read-only verification queries. Expected results:
-- required_tables = 16, rls_enabled = 16, activation_rpc = 1,
-- one_active_version_index = 1, and primary_keys/foreign_keys/indexes > 0.
WITH required(table_name) AS (
  VALUES
    ('profiles'),
    ('intake_cases'),
    ('case_context_facts'),
    ('plans'),
    ('plan_versions'),
    ('plan_nodes'),
    ('plan_edges'),
    ('strategies'),
    ('assumptions'),
    ('risks'),
    ('actions'),
    ('check_ins'),
    ('plan_changes'),
    ('ai_usage_events'),
    ('audit_events'),
    ('idempotency_keys')
)
SELECT 'required_tables' AS check_name, count(t.table_name) AS found
FROM required r
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = r.table_name;

WITH required(table_name) AS (
  VALUES
    ('profiles'),
    ('intake_cases'),
    ('case_context_facts'),
    ('plans'),
    ('plan_versions'),
    ('plan_nodes'),
    ('plan_edges'),
    ('strategies'),
    ('assumptions'),
    ('risks'),
    ('actions'),
    ('check_ins'),
    ('plan_changes'),
    ('ai_usage_events'),
    ('audit_events'),
    ('idempotency_keys')
)
SELECT 'rls_enabled' AS check_name, count(c.relname) AS found
FROM required r
JOIN pg_class c ON c.relname = r.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relrowsecurity;

SELECT 'primary_keys' AS check_name, count(*) AS found
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'PRIMARY KEY';

SELECT 'foreign_keys' AS check_name, count(*) AS found
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY';

SELECT 'indexes' AS check_name, count(*) AS found
FROM pg_indexes
WHERE schemaname = 'public';

SELECT 'activation_rpc' AS check_name, count(*) AS found
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'activate_plan_version_for_user';

SELECT 'one_active_version_index' AS check_name, count(*) AS found
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'plan_versions_one_active'
  AND indexdef ILIKE '%WHERE (state = ''ACTIVE''::version_state)%';
