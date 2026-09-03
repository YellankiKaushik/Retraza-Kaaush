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
