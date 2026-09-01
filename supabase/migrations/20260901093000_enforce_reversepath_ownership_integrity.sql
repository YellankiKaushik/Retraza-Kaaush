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
