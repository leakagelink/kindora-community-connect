ALTER TABLE public.ai_usage_limits ADD COLUMN global_daily_limit integer NOT NULL DEFAULT 100, ADD COLUMN daily_budget_usd numeric NOT NULL DEFAULT 5, ADD COLUMN estimated_cost_per_run_usd numeric NOT NULL DEFAULT 0.05;
ALTER TABLE public.ai_generations ADD COLUMN estimated_cost_usd numeric NOT NULL DEFAULT 0, ADD COLUMN input_tokens integer, ADD COLUMN output_tokens integer;
CREATE FUNCTION public.reserve_ai_generation(p_tool text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.ai_usage_limits; u uuid:=auth.uid(); used int; global_used int; spent numeric; rid uuid;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND deleted_at IS NULL AND NOT is_restricted AND (suspended_until IS NULL OR suspended_until<=now())) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF p_tool IS NULL OR p_tool NOT IN ('logo_maker','resume_builder','website_starter') OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR length(p_input::text)>12000 THEN RAISE EXCEPTION 'Invalid AI request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('goodivo:ai:global',0));
 SELECT * INTO l FROM public.ai_usage_limits WHERE tool=p_tool;
 IF NOT FOUND OR NOT l.is_enabled OR NOT EXISTS(SELECT 1 FROM public.feature_flags WHERE key='ai_'||p_tool AND is_enabled) THEN RAISE EXCEPTION 'AI tool unavailable'; END IF;
 SELECT count(*) INTO used FROM public.ai_generations WHERE user_id=u AND tool=p_tool AND created_at>now()-interval '24 hours';
 IF used>=l.daily_limit THEN RAISE EXCEPTION 'Daily free limit reached'; END IF;
 IF (SELECT count(*) FROM public.ai_generations WHERE user_id=u AND created_at>now()-interval '1 minute')>=3 THEN RAISE EXCEPTION 'Please wait before generating again'; END IF;
 IF (SELECT count(*) FROM public.ai_generations WHERE created_at>now()-interval '1 minute')>=20 THEN RAISE EXCEPTION 'AI service is busy'; END IF;
 SELECT count(*),coalesce(sum(estimated_cost_usd),0) INTO global_used,spent FROM public.ai_generations WHERE tool=p_tool AND created_at>now()-interval '24 hours';
 IF l.global_daily_limit<0 OR l.daily_budget_usd<0 OR l.estimated_cost_per_run_usd<=0 OR global_used>=l.global_daily_limit OR spent+l.estimated_cost_per_run_usd>l.daily_budget_usd THEN RAISE EXCEPTION 'Daily capacity reached'; END IF;
 INSERT INTO public.ai_generations(user_id,tool,input,model,status,estimated_cost_usd) VALUES(u,p_tool,p_input,'openai/gpt-6-astra','pending',l.estimated_cost_per_run_usd) RETURNING id INTO rid;
 RETURN jsonb_build_object('id',rid,'dailyLimit',l.daily_limit,'remaining',l.daily_limit-used-1);
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_generation(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserve_ai_generation(text,jsonb) TO authenticated;
CREATE FUNCTION public.finish_ai_generation(p_id uuid,p_user uuid,p_output jsonb,p_error text,p_input_tokens integer,p_output_tokens integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reservation public.ai_generations;
BEGIN
 SELECT * INTO reservation FROM public.ai_generations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR reservation.status<>'pending' OR p_user IS DISTINCT FROM reservation.user_id THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
 IF (p_error IS NOT NULL AND length(p_error)>2000) OR (p_input_tokens IS NOT NULL AND p_input_tokens<0) OR (p_output_tokens IS NOT NULL AND p_output_tokens<0) OR (p_error IS NULL AND jsonb_typeof(p_output) IS DISTINCT FROM 'object') OR length(coalesce(p_output::text,''))>500000 THEN RAISE EXCEPTION 'Invalid result'; END IF;
 UPDATE public.ai_generations SET output=p_output,status=CASE WHEN p_error IS NULL THEN 'succeeded' ELSE 'failed' END,error_message=p_error,input_tokens=p_input_tokens,output_tokens=p_output_tokens WHERE id=p_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(reservation.user_id,'ai:finalized','ai_generation',p_id);
END $$;
REVOKE ALL ON FUNCTION public.finish_ai_generation(uuid,uuid,jsonb,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_ai_generation(uuid,uuid,jsonb,text,integer,integer) TO service_role;
CREATE FUNCTION public.save_ai_budget(p_tool text,p_global_limit integer,p_budget numeric,p_estimate numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF p_global_limit IS NULL OR p_budget IS NULL OR p_estimate IS NULL OR p_global_limit NOT BETWEEN 0 AND 100000 OR p_budget NOT BETWEEN 0 AND 10000 OR p_estimate<=0 OR p_estimate>100 THEN RAISE EXCEPTION 'Invalid budget'; END IF;
 UPDATE public.ai_usage_limits SET global_daily_limit=p_global_limit,daily_budget_usd=p_budget,estimated_cost_per_run_usd=p_estimate WHERE tool=p_tool;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown tool'; END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,metadata) VALUES(auth.uid(),'ai:budget_updated','ai_usage_limits',jsonb_build_object('tool',p_tool));
END $$;
REVOKE ALL ON FUNCTION public.save_ai_budget(text,integer,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_ai_budget(text,integer,numeric,numeric) TO authenticated;
GRANT ALL ON public.ai_generations,public.ai_usage_limits TO service_role;
GRANT SELECT ON public.ai_generations TO authenticated;
GRANT UPDATE ON public.ai_usage_limits TO authenticated;
CREATE FUNCTION public.guard_unconfigured_flags() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF new.key IN ('rewarded_ads','sponsor_surveys','donations') AND new.is_enabled THEN RAISE EXCEPTION 'Verified provider and policy approval required'; END IF; RETURN new; END $$;
CREATE TRIGGER guard_unconfigured_flags BEFORE INSERT OR UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.guard_unconfigured_flags();
REVOKE ALL ON FUNCTION public.guard_unconfigured_flags() FROM PUBLIC,anon,authenticated;