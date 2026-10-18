CREATE OR REPLACE FUNCTION public.select_plan_strategy(target_version_id uuid, target_strategy_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM id FROM public.plan_versions WHERE id = target_version_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.strategies WHERE id = target_strategy_id AND plan_version_id = target_version_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'That strategy does not belong to this plan version.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.strategies SET selected = (id = target_strategy_id)
  WHERE plan_version_id = target_version_id AND user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.select_plan_strategy(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_plan_strategy(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_plan_check_in(target_plan_id uuid, note text, progress_rating integer, changed_facts jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE case_id uuid; fact jsonb;
BEGIN
  SELECT p.case_id INTO case_id FROM public.plans p WHERE p.id = target_plan_id AND p.user_id = auth.uid() FOR UPDATE;
  IF case_id IS NULL THEN RAISE EXCEPTION 'That plan could not be found.' USING ERRCODE = '42501'; END IF;
  IF length(note) > 2000 OR progress_rating NOT BETWEEN 1 AND 5 OR jsonb_array_length(changed_facts) > 10 THEN
    RAISE EXCEPTION 'Invalid check-in.';
  END IF;
  INSERT INTO public.check_ins (user_id, plan_id, note, progress_rating, changed_facts)
  VALUES (auth.uid(), target_plan_id, nullif(note, ''), progress_rating, changed_facts);
  FOR fact IN SELECT value FROM jsonb_array_elements(changed_facts) LOOP
    IF length(fact->>'key') NOT BETWEEN 1 AND 80 OR length(fact->>'value') NOT BETWEEN 1 AND 600 THEN
      RAISE EXCEPTION 'Invalid changed fact.';
    END IF;
    INSERT INTO public.case_context_facts (user_id, case_id, category, key, value, source, confidence)
    VALUES (auth.uid(), case_id, (fact->>'category')::public.fact_category, fact->>'key', jsonb_build_object('answer', fact->>'value'), 'CHECK_IN', 1);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.save_plan_check_in(uuid, text, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_plan_check_in(uuid, text, integer, jsonb) TO authenticated;
