begin;
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_timeline;
alter function public.claim_before_timeline(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_timeline(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;history jsonb;
begin
 result:=private.claim_before_timeline(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select coalesce(jsonb_agg(h||jsonb_build_object('created_at',m.created_at) order by position),'[]'::jsonb) into history
 from jsonb_array_elements(result->'history') with ordinality items(h,position)
 join public.messages m on m.id=(h->>'id')::uuid;
 return result||jsonb_build_object('history',history);
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;
commit;
