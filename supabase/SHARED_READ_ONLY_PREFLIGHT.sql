-- READ ONLY. Run in the shared project's SQL Editor only to inspect metadata.
-- No user records, credentials, writes, migrations or ledger repairs.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
  'projectRef', 'usvopldwiwzlvoqawvcu',
  'checkedAt', now(),
  'tables', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', c.relname, 'rls', c.relrowsecurity,
      'columns', (SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull) ORDER BY a.attnum)
        FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
      'constraints', (SELECT jsonb_agg(jsonb_build_object('type',k.contype,'definition',pg_get_constraintdef(k.oid)) ORDER BY k.contype,pg_get_constraintdef(k.oid))
        FROM pg_constraint k WHERE k.conrelid=c.oid),
      'indexes', (SELECT jsonb_agg(indexdef ORDER BY indexname) FROM pg_indexes i WHERE i.schemaname='public' AND i.tablename=c.relname),
      'triggers', (SELECT jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname)
        FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
      'policies', (SELECT jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check) ORDER BY policyname)
        FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)
    ) ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN (
      'profiles','intake_cases','case_context_facts','plans','plan_versions','plan_nodes','plan_edges',
      'strategies','assumptions','risks','actions','check_ins','plan_changes','ai_usage_events','audit_events','idempotency_keys')
  ),
  'authProfileTrigger', (SELECT jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname)
    FROM pg_trigger t WHERE t.tgrelid='auth.users'::regclass AND t.tgname='on_auth_user_created' AND NOT t.tgisinternal),
  'functions', (
    SELECT jsonb_agg(jsonb_build_object(
      'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
      'returns',pg_get_function_result(p.oid),'securityDefiner',p.prosecdef,
      'settings',p.proconfig,'bodyHash',md5(replace(p.prosrc,chr(13)||chr(10),chr(10))),
      'anonExecute',has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticatedExecute',has_function_privilege('authenticated',p.oid,'EXECUTE')
    ) ORDER BY p.proname,pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND (p.proname IN (
      'persist_plan_graph','select_plan_strategy','update_execution_node',
      'activate_plan_version_for_user','save_plan_check_in','require_same_owner','handle_new_user','touch_updated_at')
      OR p.proname LIKE 'guard_%_owner')
  ),
  'migrations', (SELECT jsonb_agg(jsonb_build_object('version',version,'name',name) ORDER BY version)
    FROM supabase_migrations.schema_migrations)
) AS catalog;
ROLLBACK;
