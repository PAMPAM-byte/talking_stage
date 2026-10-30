begin;
-- A texted burst is one message shown as several bubbles. The user can react to
-- each bubble separately; whole-message reactions stay in message_reactions.
create table public.message_part_reactions (
 message_id uuid not null references public.messages(id) on delete cascade,
 part smallint not null check (part between 0 and 3),
 emoji text not null references private.reaction_emojis(emoji),
 updated_at timestamptz not null default now(),
 primary key(message_id,part)
);
alter table public.message_part_reactions enable row level security;
revoke all on public.message_part_reactions from public,anon,authenticated;
grant select on public.message_part_reactions to authenticated;
create policy own_message_part_reactions on public.message_part_reactions for select to authenticated using(exists(
 select 1 from public.messages m join public.conversations c on c.id=m.conversation_id
 where m.id=message_id and c.user_id=auth.uid() and c.deleted_at is null
));
create trigger touch_message_part_reaction before update on public.message_part_reactions for each row execute function private.touch_message_reaction();

-- The same ownership, capability, emoji and rate checks as set_message_reaction,
-- limited to a bubble that exists in a character's multi-bubble text message.
create function public.set_message_part_reaction(p_conversation uuid,p_message uuid,p_part smallint,p_emoji text default null) returns void
language plpgsql security definer set search_path='' as $$
declare c public.conversations;bubbles integer;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select * into c from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'not_found';end if;
 if c.status<>'active' or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then raise exception 'chat_paused';end if;
 select cardinality(private.message_parts(m.text)) into bubbles from public.messages m where m.id=p_message and m.conversation_id=c.id and m.role='character' and m.kind='text';
 if not found then raise exception 'not_found';end if;
 if p_part is null or p_part<0 or bubbles<2 or p_part>=bubbles then raise exception 'invalid_part';end if;
 if p_emoji is not null and not exists(select 1 from private.reaction_emojis where emoji=p_emoji) then raise exception 'invalid_reaction';end if;
 perform private.limit_conversation_mutation();
 if p_emoji is null then delete from public.message_part_reactions where message_id=p_message and part=p_part;
 else insert into public.message_part_reactions(message_id,part,emoji) values(p_message,p_part,p_emoji)
 on conflict(message_id,part) do update set emoji=excluded.emoji;end if;
end;$$;
revoke all on function public.set_message_part_reaction(uuid,uuid,smallint,text) from public,anon;
grant execute on function public.set_message_part_reaction(uuid,uuid,smallint,text) to authenticated;

alter function public.conversation_thread(uuid,bigint) rename to thread_before_part_reactions;
alter function public.thread_before_part_reactions(uuid,bigint) set schema private;
revoke all on function private.thread_before_part_reactions(uuid,bigint) from public,anon,authenticated,service_role;
create function public.conversation_thread(p_id uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.thread_before_part_reactions(p_id,p_before);
 return result||jsonb_build_object('partReactions',coalesce((select jsonb_agg(jsonb_build_object('messageId',r.message_id,'part',r.part,'emoji',r.emoji) order by r.message_id,r.part)
 from public.message_part_reactions r join public.messages m on m.id=r.message_id and m.conversation_id=p_id
 where r.message_id in(select (h->>'id')::uuid from jsonb_array_elements(result->'messages') h)),'[]'::jsonb));
end;$$;
revoke all on function public.conversation_thread(uuid,bigint) from public,anon;
grant execute on function public.conversation_thread(uuid,bigint) to authenticated;

-- The character sees which bubble was reacted to, beside the message's other reactions.
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_part_reactions;
alter function public.claim_before_part_reactions(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_part_reactions(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;history jsonb;
begin
 result:=private.claim_before_part_reactions(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select coalesce(jsonb_agg(case when parts.items is null then h else h||jsonb_build_object('reactions',coalesce(h->'reactions','[]'::jsonb)||parts.items) end order by position),'[]'::jsonb) into history
 from jsonb_array_elements(result->'history') with ordinality items(h,position)
 left join lateral(
  select jsonb_agg(jsonb_build_object('actor','user','emoji',r.emoji,'bubble',r.part+1,'bubbleText',left(x.parts[r.part+1],120)) order by r.part) as items
  from public.message_part_reactions r join public.messages m on m.id=r.message_id cross join lateral private.message_parts(m.text) x(parts)
  where r.message_id=(h->>'id')::uuid
 ) parts on true;
 return result||jsonb_build_object('history',history);
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text) to service_role;
commit;
