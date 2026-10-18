-- Graph rows and activation commit together. No existing rows are deleted.
CREATE OR REPLACE FUNCTION public.persist_plan_graph(target_plan_id uuid, payload jsonb, activate boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  version_id uuid := gen_random_uuid();
  version_number integer;
  owner_id uuid := auth.uid();
  case_id uuid;
  row_data jsonb;
  defaults jsonb;
  table_name text;
BEGIN
  SELECT p.case_id INTO case_id FROM public.plans p
  WHERE p.id = target_plan_id AND p.user_id = owner_id FOR UPDATE;
  IF case_id IS NULL THEN RAISE EXCEPTION 'That plan could not be found.' USING ERRCODE = '42501'; END IF;
  SELECT coalesce(max(v.version_number), 0) + 1 INTO version_number
  FROM public.plan_versions v WHERE v.plan_id = target_plan_id;
  row_data := payload->'version' || jsonb_build_object(
    'id', version_id, 'user_id', owner_id, 'plan_id', target_plan_id,
    'version_number', version_number, 'state', 'CANDIDATE',
    'bottleneck_node_id', NULL, 'created_at', now(), 'updated_at', now());
  INSERT INTO public.plan_versions SELECT (jsonb_populate_record(NULL::public.plan_versions, row_data)).*;
  -- The table list is constant, not caller-controlled. Every row remains under RLS.
  FOREACH table_name IN ARRAY ARRAY['strategies','plan_nodes','plan_edges','actions','assumptions','risks'] LOOP
    defaults := CASE table_name
      WHEN 'strategies' THEN '{"summary":"","risk_level":"MEDIUM","selected":false,"rationale":"","tradeoffs":[]}'::jsonb
      WHEN 'plan_nodes' THEN '{"description":"","status":"PENDING","depth":0,"metadata":{}}'::jsonb
      WHEN 'plan_edges' THEN '{"hard_dependency":true}'::jsonb
      WHEN 'actions' THEN '{"completion_criteria":"","revision":1}'::jsonb
      WHEN 'assumptions' THEN '{"importance":"MEDIUM","status":"UNVALIDATED"}'::jsonb
      ELSE '{"probability_band":"MEDIUM","impact_band":"MEDIUM","mitigation":"","status":"OPEN"}'::jsonb END;
    FOR row_data IN SELECT value FROM jsonb_array_elements(coalesce(payload->table_name, '[]'::jsonb)) LOOP
      row_data := defaults || row_data || jsonb_build_object(
        'id', coalesce((row_data->>'id')::uuid, gen_random_uuid()),
        'user_id', owner_id, 'plan_version_id', version_id,
        'created_at', now(), 'updated_at', now());
      IF table_name = 'actions' AND NOT EXISTS (
        SELECT 1 FROM public.plan_nodes WHERE id = (row_data->>'plan_node_id')::uuid AND plan_version_id = version_id
      ) THEN RAISE EXCEPTION 'Action must belong to the new graph.'; END IF;
      EXECUTE format('INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I, $1)).*', table_name, table_name) USING row_data;
    END LOOP;
  END LOOP;
  UPDATE public.plan_versions SET bottleneck_node_id = (payload->>'bottleneckId')::uuid,
    bottleneck_reason = payload->>'bottleneckReason' WHERE id = version_id;
  IF activate THEN
    PERFORM public.activate_plan_version_for_user(target_plan_id, version_id);
    UPDATE public.intake_cases SET status = 'PLANNED' WHERE id = case_id AND user_id = owner_id;
  END IF;
  RETURN jsonb_build_object('versionId', version_id, 'versionNumber', version_number);
END;
$$;
REVOKE ALL ON FUNCTION public.persist_plan_graph(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.persist_plan_graph(uuid, jsonb, boolean) TO authenticated;

-- Activation needs only owner-scoped privileges, and concurrent activation locks the plan.
CREATE OR REPLACE FUNCTION public.activate_plan_version_for_user(target_plan_id uuid, target_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target_state public.version_state;
BEGIN
  PERFORM id FROM public.plans WHERE id = target_plan_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan version not found' USING ERRCODE = '42501'; END IF;
  SELECT state INTO target_state FROM public.plan_versions
  WHERE id = target_version_id AND plan_id = target_plan_id AND user_id = auth.uid() FOR UPDATE;
  IF target_state IS NULL THEN RAISE EXCEPTION 'plan version not found' USING ERRCODE = '42501'; END IF;
  IF target_state = 'REJECTED' THEN RAISE EXCEPTION 'rejected plan versions cannot be activated' USING ERRCODE = '23514'; END IF;
  UPDATE public.plan_versions SET state = 'SUPERSEDED' WHERE plan_id = target_plan_id AND user_id = auth.uid() AND state = 'ACTIVE' AND id <> target_version_id;
  UPDATE public.plan_versions SET state = 'ACTIVE' WHERE id = target_version_id AND user_id = auth.uid();
  UPDATE public.plans SET active_version_id = target_version_id WHERE id = target_plan_id AND user_id = auth.uid();
END;
$$;
