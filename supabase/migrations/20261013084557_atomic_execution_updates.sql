-- Owner-scoped transactional action completion and editing. Existing data is preserved.
CREATE OR REPLACE FUNCTION public.update_execution_node(target_node_id uuid, patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  target public.plan_nodes%ROWTYPE;
  target_version_id uuid;
  next_status public.node_status;
BEGIN
  SELECT plan_version_id INTO target_version_id FROM public.plan_nodes
  WHERE id = target_node_id AND user_id = auth.uid();
  IF target_version_id IS NULL THEN
    RAISE EXCEPTION 'That action could not be found.' USING ERRCODE = '42501';
  END IF;
  -- Serialize mutations across this graph so prerequisite checks cannot race.
  PERFORM id FROM public.plan_versions WHERE id = target_version_id FOR UPDATE;
  SELECT * INTO target FROM public.plan_nodes
  WHERE id = target_node_id AND user_id = auth.uid() FOR UPDATE;
  IF target.node_type NOT IN ('ACTION', 'EXPERIMENT', 'MILESTONE') THEN
    RAISE EXCEPTION 'Only actions, experiments, and milestones can be updated.';
  END IF;
  IF patch ? 'status' THEN
    next_status := (patch->>'status')::public.node_status;
    IF next_status IS NULL OR next_status NOT IN ('PENDING','IN_PROGRESS','DONE','BLOCKED','SKIPPED','DEFERRED') THEN
      RAISE EXCEPTION 'Invalid action status.';
    END IF;
    IF next_status IN ('DONE', 'IN_PROGRESS') AND EXISTS (
      SELECT 1 FROM public.plan_edges e JOIN public.plan_nodes prerequisite
        ON prerequisite.id = CASE WHEN e.edge_type = 'BLOCKED_BY' THEN e.to_node_id ELSE e.from_node_id END
      WHERE e.plan_version_id = target.plan_version_id AND e.hard_dependency
        AND e.edge_type IN ('REQUIRES','PRECEDES','BLOCKED_BY')
        AND CASE WHEN e.edge_type = 'BLOCKED_BY' THEN e.from_node_id ELSE e.to_node_id END = target.id
        AND prerequisite.status <> 'DONE'
    ) THEN
      RAISE EXCEPTION 'Complete the prerequisites before starting or completing this action.';
    END IF;
  END IF;
  IF patch ? 'title' AND (target.node_type = 'MILESTONE' OR length(patch->>'title') NOT BETWEEN 2 AND 160) THEN
    RAISE EXCEPTION 'Invalid action edit.';
  END IF;
  IF length(coalesce(patch->>'note', '')) > 1200 OR length(coalesce(patch->>'description', '')) > 800
     OR length(coalesce(patch->>'completionCriteria', '')) > 400 THEN
    RAISE EXCEPTION 'Action text is too long.';
  END IF;
  IF patch ? 'estimatedMinutes' AND (patch->>'estimatedMinutes')::integer NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'Invalid effort estimate.';
  END IF;
  IF target.node_type <> 'MILESTONE' THEN
    UPDATE public.actions SET
      completed_at = CASE WHEN patch ? 'status' THEN
        CASE WHEN next_status = 'DONE' THEN coalesce(completed_at, now()) ELSE NULL END ELSE completed_at END,
      result = CASE WHEN patch ? 'note' THEN CASE WHEN coalesce(patch->>'note','') = '' THEN NULL ELSE jsonb_build_object('note', patch->>'note') END ELSE result END,
      due_at = CASE WHEN patch ? 'dueAt' THEN (patch->>'dueAt')::timestamptz ELSE due_at END,
      completion_criteria = CASE WHEN patch ? 'completionCriteria' THEN patch->>'completionCriteria' ELSE completion_criteria END,
      estimated_minutes = CASE WHEN patch ? 'estimatedMinutes' THEN (patch->>'estimatedMinutes')::integer ELSE estimated_minutes END,
      revision = revision + CASE WHEN patch ? 'title' THEN 1 ELSE 0 END
    WHERE plan_node_id = target.id AND user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Action details could not be found.'; END IF;
  END IF;
  UPDATE public.plan_nodes SET
    status = coalesce(next_status, status),
    title = CASE WHEN patch ? 'title' THEN patch->>'title' ELSE title END,
    description = CASE WHEN patch ? 'description' THEN patch->>'description' ELSE description END
  WHERE id = target.id AND user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.update_execution_node(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_execution_node(uuid, jsonb) TO authenticated;
