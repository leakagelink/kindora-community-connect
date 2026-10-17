CREATE TABLE public.community_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,purpose text NOT NULL,kind text NOT NULL CHECK(kind IN ('profile','request_details','eligibility','onboarding','feedback')),actions text NOT NULL,eligibility text NOT NULL,privacy text NOT NULL,reward text NOT NULL DEFAULT 'None. No product or service is guaranteed.',is_active boolean NOT NULL DEFAULT true,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.community_tasks TO authenticated; GRANT ALL ON public.community_tasks TO service_role;
ALTER TABLE public.community_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active tasks or admin" ON public.community_tasks FOR SELECT TO authenticated USING(is_active OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.task_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES public.community_tasks(id),user_id uuid NOT NULL,task_version integer NOT NULL,entity_key text NOT NULL DEFAULT '',evidence jsonb NOT NULL DEFAULT '{}',status text NOT NULL CHECK(status IN ('pending_review','completed','rejected')),review_note text,reviewed_by uuid,created_at timestamptz NOT NULL DEFAULT now(),reviewed_at timestamptz,UNIQUE(task_id,user_id,task_version,entity_key));
GRANT SELECT ON public.task_submissions TO authenticated; GRANT ALL ON public.task_submissions TO service_role;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks or admin" ON public.task_submissions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX task_submission_owner ON public.task_submissions(user_id,created_at DESC);
CREATE TABLE public.restriction_appeals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,reason text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),response text,reviewed_by uuid,reviewed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.restriction_appeals TO authenticated; GRANT ALL ON public.restriction_appeals TO service_role;
ALTER TABLE public.restriction_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own appeals or admin" ON public.restriction_appeals FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX one_pending_appeal ON public.restriction_appeals(user_id) WHERE status='pending';
CREATE TABLE public.reward_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,provider text NOT NULL,provider_event_id text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),credits integer NOT NULL DEFAULT 0 CHECK(credits BETWEEN 0 AND 1),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(provider,provider_event_id));
GRANT SELECT ON public.reward_events TO authenticated; GRANT ALL ON public.reward_events TO service_role;
ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reward events or admin" ON public.reward_events FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.submit_community_task(p_task_id uuid,p_evidence jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.community_tasks; p public.profiles; r public.help_requests; s text:='completed'; k text:=''; result public.task_submissions; u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=u;
 IF NOT FOUND OR p.deleted_at IS NOT NULL OR p.is_restricted OR p.suspended_until>now() THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' OR length(p_evidence::text)>8000 THEN RAISE EXCEPTION 'Invalid evidence'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('tasks:'||u::text,0));
 IF (SELECT count(*) FROM public.task_submissions WHERE user_id=u AND created_at>now()-interval '1 minute')>=5 THEN RAISE EXCEPTION 'Please wait before another submission'; END IF;
 SELECT * INTO t FROM public.community_tasks WHERE id=p_task_id AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task unavailable'; END IF;
 IF t.kind='profile' THEN
  IF length(btrim(p.display_name))<2 OR length(btrim(coalesce(p.bio,'')))<20 OR cardinality(p.skills)=0 OR cardinality(p.languages)=0 THEN RAISE EXCEPTION 'Save profile details first'; END IF;
  p_evidence:=jsonb_build_object('verified_fields','display name, bio, skills, languages');
 ELSIF t.kind='request_details' THEN
  IF coalesce(p_evidence->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid request reference'; END IF;
  SELECT * INTO r FROM public.help_requests WHERE id=(p_evidence->>'request_id')::uuid AND owner_id=u AND deleted_at IS NULL;
  IF NOT FOUND OR length(btrim(r.title))<8 OR length(btrim(r.description))<40 OR r.category_id IS NULL OR r.needed_by IS NULL OR (NOT r.is_remote AND length(btrim(coalesce(r.location,'')))<2) THEN RAISE EXCEPTION 'Save request details first'; END IF;
  k:=r.id::text; p_evidence:=jsonb_build_object('request_id',k);
 ELSIF t.kind='onboarding' THEN
  IF p_evidence->>'payment' IS DISTINCT FROM 'never_required' OR p_evidence->>'fulfilment' IS DISTINCT FROM 'volunteer_availability' OR p_evidence->>'privacy' IS DISTINCT FROM 'keep_private' THEN RAISE EXCEPTION 'Review the community rules'; END IF;
 ELSIF t.kind='eligibility' THEN
  IF jsonb_typeof(p_evidence->'details') IS DISTINCT FROM 'string' OR length(btrim(p_evidence->>'details')) NOT BETWEEN 40 AND 2000 OR p_evidence->>'accuracy' IS DISTINCT FROM 'yes' THEN RAISE EXCEPTION 'Accurate eligibility details required'; END IF;
  p_evidence:=jsonb_build_object('details',btrim(p_evidence->>'details'),'accuracy','yes'); s:='pending_review';
 ELSIF t.kind='feedback' THEN
  IF jsonb_typeof(p_evidence->'feedback') IS DISTINCT FROM 'string' OR length(btrim(p_evidence->>'feedback')) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'Feedback needs 20 to 2000 characters'; END IF;
  p_evidence:=jsonb_build_object('feedback',btrim(p_evidence->>'feedback')); s:='pending_review';
 END IF;
 INSERT INTO public.task_submissions(task_id,user_id,task_version,entity_key,evidence,status) VALUES(t.id,u,t.version,k,p_evidence,s) RETURNING * INTO result;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(u,'task:submitted','task_submission',result.id);
 RETURN jsonb_build_object('status',s,'id',result.id);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Task already submitted'; END $$;
REVOKE ALL ON FUNCTION public.submit_community_task(uuid,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.submit_community_task(uuid,jsonb) TO authenticated;
CREATE FUNCTION public.save_community_task(p_definition jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text:=p_definition->>'kind'; tid uuid; field text; low int; high int;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF jsonb_typeof(p_definition) IS DISTINCT FROM 'object' OR jsonb_typeof(p_definition->'is_active') IS DISTINCT FROM 'boolean' OR k IS NULL OR k NOT IN ('profile','request_details','eligibility','onboarding','feedback') THEN RAISE EXCEPTION 'Invalid definition'; END IF;
 FOR field,low,high IN SELECT * FROM (VALUES ('title',5,120),('purpose',20,1000),('actions',20,1000),('eligibility',10,1000),('privacy',10,1000)) AS bounds(f,a,b) LOOP
  IF jsonb_typeof(p_definition->field) IS DISTINCT FROM 'string' OR length(btrim(p_definition->>field)) NOT BETWEEN low AND high THEN RAISE EXCEPTION 'Complete task disclosures'; END IF;
 END LOOP;
 IF p_definition->>'id' IS NOT NULL THEN
  IF p_definition->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid task reference'; END IF;
  UPDATE public.community_tasks SET title=btrim(p_definition->>'title'),purpose=btrim(p_definition->>'purpose'),kind=k,actions=btrim(p_definition->>'actions'),eligibility=btrim(p_definition->>'eligibility'),privacy=btrim(p_definition->>'privacy'),is_active=(p_definition->>'is_active')::boolean,version=version+1,updated_at=now() WHERE id=(p_definition->>'id')::uuid RETURNING id INTO tid;
  IF tid IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
 ELSE
  INSERT INTO public.community_tasks(title,purpose,kind,actions,eligibility,privacy,is_active) VALUES(btrim(p_definition->>'title'),btrim(p_definition->>'purpose'),k,btrim(p_definition->>'actions'),btrim(p_definition->>'eligibility'),btrim(p_definition->>'privacy'),(p_definition->>'is_active')::boolean) RETURNING id INTO tid;
 END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'task:definition_saved','community_task',tid);
END $$;
REVOKE ALL ON FUNCTION public.save_community_task(jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_community_task(jsonb) TO authenticated;
CREATE FUNCTION public.submit_restriction_appeal(p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 40 AND 2000 THEN RAISE EXCEPTION 'Explain your appeal in 40 to 2000 characters'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND deleted_at IS NULL AND (is_restricted OR suspended_until>now())) THEN RAISE EXCEPTION 'Account is not restricted'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('appeal:'||auth.uid()::text,0));
 IF (SELECT count(*) FROM public.restriction_appeals WHERE user_id=auth.uid() AND created_at>now()-interval '24 hours')>=3 THEN RAISE EXCEPTION 'Daily appeal limit reached'; END IF;
 INSERT INTO public.restriction_appeals(user_id,reason) VALUES(auth.uid(),btrim(p_reason));
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'An appeal is already pending'; END $$;
REVOKE ALL ON FUNCTION public.submit_restriction_appeal(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.submit_restriction_appeal(text) TO authenticated;
CREATE FUNCTION public.review_platform_submission(p_id uuid,p_type text,p_approved boolean,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF p_note IS NULL OR p_approved IS NULL OR length(btrim(p_note)) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'Review explanation required'; END IF;
 IF p_type='task' THEN UPDATE public.task_submissions SET status=CASE WHEN p_approved THEN 'completed' ELSE 'rejected' END,review_note=btrim(p_note),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p_id AND status='pending_review' RETURNING user_id INTO target;
 ELSIF p_type='appeal' THEN
  UPDATE public.restriction_appeals SET status=CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,response=btrim(p_note),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p_id AND status='pending' RETURNING user_id INTO target;
  IF p_approved AND target IS NOT NULL THEN UPDATE public.profiles SET is_restricted=false,suspended_until=NULL WHERE id=target; END IF;
 ELSE RAISE EXCEPTION 'Unknown review type'; END IF;
 IF target IS NULL THEN RAISE EXCEPTION 'Submission already reviewed or unavailable'; END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'submission:reviewed',p_type,p_id,jsonb_build_object('approved',p_approved));
END $$;
REVOKE ALL ON FUNCTION public.review_platform_submission(uuid,text,boolean,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.review_platform_submission(uuid,text,boolean,text) TO authenticated;
CREATE FUNCTION public.platform_operational_metrics() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 RETURN jsonb_build_object('completed_help',(SELECT count(*) FROM public.help_requests WHERE status='completed'),'fulfilled_products',(SELECT count(*) FROM public.product_listings WHERE status='given_away'),'pending_task_reviews',(SELECT count(*) FROM public.task_submissions WHERE status='pending_review'),'pending_appeals',(SELECT count(*) FROM public.restriction_appeals WHERE status='pending'),'ai_runs_24h',(SELECT count(*) FROM public.ai_generations WHERE created_at>now()-interval '24 hours'),'estimated_ai_cost_usd_24h',(SELECT coalesce(sum(estimated_cost_usd),0) FROM public.ai_generations WHERE created_at>now()-interval '24 hours'));
END $$;
REVOKE ALL ON FUNCTION public.platform_operational_metrics() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.platform_operational_metrics() TO authenticated;