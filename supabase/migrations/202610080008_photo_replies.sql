begin;
alter table private.reply_jobs add column photo_candidates uuid[] not null default '{}';
alter table private.reply_jobs add column photo_candidate_versions jsonb not null default '{}';
alter table private.reply_jobs add column photo_message_id uuid references public.messages(id) on delete set null;
-- Keep the tested lease/budget/context checks as private implementation functions.
alter function public.claim_reply(uuid,uuid,text) rename to claim_text_reply;
alter function public.claim_text_reply(uuid,uuid,text) set schema private;
revoke all on function private.claim_text_reply(uuid,uuid,text) from public,anon,authenticated,service_role;
alter function public.finish_reply(uuid,uuid,uuid,text,text) rename to finish_text_reply;
alter function public.finish_text_reply(uuid,uuid,uuid,text,text) set schema private;
revoke all on function private.finish_text_reply(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;c public.conversations;photos jsonb;
begin
 result:=private.claim_text_reply(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select c0.* into c from public.conversations c0 join public.messages m on m.conversation_id=c0.id where m.id=p_message;
 photos:='[]'::jsonb;
 if private.compute_capabilities(c.character_id)->>'photos'='true' then
  select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into photos from
  (select id,alt_text as description,version from public.character_assets where character_id=c.character_id and slot in ('gallery','chat')
   and published and review_state='approved' and review_attested and source_hash is not null order by slot,id limit 12) a;
 end if;
 update private.reply_jobs set photo_candidates=array(select (a->>'id')::uuid from jsonb_array_elements(photos) a),
 photo_candidate_versions=coalesce((select jsonb_object_agg(a->>'id',a->'version') from jsonb_array_elements(photos) a),'{}'::jsonb) where id=(result->>'job')::uuid;
 return result||jsonb_build_object('photos',photos);
end;$$;
create function public.finish_reply(p_job uuid,p_actor uuid,p_lease uuid,p_text text default null,p_failure text default null,p_asset uuid default null) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;result text;photo_id uuid;
begin
 select c0.* into c from public.conversations c0 join private.reply_jobs j0 on j0.conversation_id=c0.id where j0.id=p_job and c0.user_id=p_actor for update of c0;
 if not found then return 'discarded';end if;
 select * into j from private.reply_jobs where id=p_job for update;
 if j.state='completed' or p_asset is null or p_failure is not null then return private.finish_text_reply(p_job,p_actor,p_lease,p_text,p_failure);end if;
 -- Lock current operator permissions and approved image rows before validating.
 perform 1 from private.capability_controls where scope='global' or character_id=c.character_id for share;
 perform 1 from public.characters where id=c.character_id for share;
 perform 1 from public.character_assets where character_id=c.character_id for share;
 if not(p_asset=any(j.photo_candidates)) or private.compute_capabilities(c.character_id)->>'photos' is distinct from 'true'
 or not exists(select 1 from public.character_assets where id=p_asset and character_id=c.character_id and slot in ('gallery','chat')
 and published and review_state='approved' and review_attested and source_hash is not null and version=(j.photo_candidate_versions->>p_asset::text)::integer) then
  return private.finish_text_reply(p_job,p_actor,p_lease,null,'invalid_output');
 end if;
 result:=private.finish_text_reply(p_job,p_actor,p_lease,p_text,null);
 if result<>'completed' then return result;end if;
 insert into public.messages(conversation_id,sequence,role,kind,asset_id) values(c.id,c.next_sequence+1,'character','photo',p_asset) returning id into photo_id;
 update public.conversations set next_sequence=next_sequence+1 where id=c.id;
 update private.reply_jobs set photo_message_id=photo_id where id=j.id;
 return 'completed';
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text),public.finish_reply(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text),public.finish_reply(uuid,uuid,uuid,text,text,uuid) to service_role;
commit;
