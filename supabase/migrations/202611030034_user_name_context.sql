begin;

-- Founder report, 3 November 2026: a character asked for the user's name again after about 20
-- messages. Reply history holds the latest 20 messages, so a name given earlier scrolls out. The
-- preferred name from onboarding ("how characters address you") now reaches every reply.
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_user_name;
alter function public.claim_before_user_name(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_user_name(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;preferred text;
begin
 result:=private.claim_before_user_name(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select nullif(trim(display_name),'') into preferred from public.profiles where id=p_actor;
 return result||jsonb_build_object('user',jsonb_build_object('preferredName',left(preferred,60)));
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;

commit;
