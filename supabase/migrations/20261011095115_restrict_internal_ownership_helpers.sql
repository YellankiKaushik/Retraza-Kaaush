-- Internal trigger helpers are not application RPC endpoints.
-- Existing triggers continue to execute under their established privileges.
ALTER FUNCTION public.require_same_owner(uuid, uuid, text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.require_same_owner(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_case_context_fact_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_plan_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_plan_version_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_strategy_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_plan_node_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_plan_edge_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_assumption_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_risk_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_action_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_check_in_owner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_plan_change_owner() FROM PUBLIC, anon, authenticated;
