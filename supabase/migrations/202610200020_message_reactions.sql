begin;
create table private.reaction_emojis (emoji text primary key);
revoke all on private.reaction_emojis from public,anon,authenticated,service_role;
-- Allowed emoji values are inserted below from the shared local catalogue.
insert into private.reaction_emojis(emoji) values ('😀'),('😊'),('😂'),('🤣'),('🥹'),('😏'),('😉'),('😍'),('🥰'),('😘'),('😚'),('☺️'),('😌'),('😅'),('🙈'),('🤭'),('🤗'),('🤨'),('🙄'),('😒'),('😮'),('😳'),('😭'),('🥺'),('😔'),('😢'),('😤'),('😡'),('🤔'),('🤫'),('😴'),('🥱'),('😎'),('🥳'),('🫶'),('❤️'),('💕'),('💔'),('💋'),('🔥'),('✨'),('🌹'),('👋'),('👏'),('🙌'),('🙏'),('👍'),('👎'),('🤝'),('🤞'),('💃'),('🕺'),('🎉'),('🎶'),('🍿'),('☕'),('🍷'),('🍽️'),('🇳🇬'),('🌍'),('😃'),('😄'),('😁'),('😆'),('😇'),('🙂'),('🙃'),('😋'),('😛'),('😜'),('🤪'),('😝'),('🤑'),('🫢'),('🫣'),('🫡'),('🤮'),('🤢'),('🤧'),('🤒'),('🤕'),('😷'),('🤐'),('😐'),('😑'),('😶'),('🫥'),('😬'),('🤥'),('😞'),('😟'),('😕'),('🙁'),('😫'),('😩'),('😓'),('😥'),('😰'),('😨'),('😱'),('🤬'),('😈'),('👿'),('💀'),('👻'),('🤖'),('🤡'),('💩'),('👽'),('😸'),('😹'),('😻'),('😼'),('😽'),('🙀'),('😿'),('😾'),('🙉'),('🙊'),('💌'),('💘'),('💝'),('💖'),('💗'),('💓'),('💞'),('💟'),('❣️'),('❤️‍🔥'),('❤️‍🩹'),('🧡'),('💛'),('💚'),('💙'),('💜'),('🤎'),('🖤'),('🤍'),('🩷'),('🩵'),('🩶'),('💯'),('💢'),('💥'),('💫'),('💦'),('💨'),('💬'),('💭'),('👀'),('👁️'),('👂'),('🧠'),('💪'),('👌'),('🤌'),('🤏'),('✌️'),('🤟'),('🤘'),('🤙'),('🤚'),('✋'),('🖖'),('🫰'),('🫵'),('👈'),('👉'),('👆'),('👇'),('👊'),('🤛'),('🤜'),('👐'),('🤲'),('💅'),('🤳'),('👑'),('💎'),('💄'),('👜'),('👠'),('👗'),('🕶️'),('🎁'),('🎈'),('🎂'),('🍰'),('🍫'),('🍦'),('🍩'),('🍪'),('🍓'),('🍉'),('🍍'),('🍌'),('🍎'),('🍕'),('🍔'),('🍟'),('🍗'),('🍚'),('🍲'),('🍜'),('🍳'),('🥐'),('🫖'),('🍵'),('🥤'),('🍹'),('🥂'),('🍾'),('🍻'),('🍸'),('💧'),('🌸'),('🌺'),('🌻'),('🌷'),('🍀'),('🌱'),('🌴'),('🌵'),('🐾'),('🐶'),('🐱'),('🦋'),('🐝'),('🦄'),('🦁'),('🐻'),('🐼'),('🐺'),('🐢'),('🌊'),('🌈'),('☀️'),('🌙'),('⭐'),('🌟'),('⚡'),('🌧️'),('🏖️'),('✈️'),('🛫'),('🛬'),('🛥️'),('🚗'),('🚕'),('🏠'),('🏨'),('🏟️'),('⚽'),('🏀'),('🎾'),('🏋️'),('🏆'),('🥇'),('🎯'),('🎲'),('🎮'),('🎳'),('🎤'),('🎧'),('🎸'),('🥁'),('🎬'),('📸'),('📚'),('📱'),('💻'),('💰'),('🛍️'),('✅'),('❌'),('❓'),('❗'),('📍'),('💤'),('🔒'),('🔑'),('📅'),('📞'),('🌐'),('🇬🇭'),('🇰🇪'),('🇿🇦'),('🇺🇸'),('🇬🇧'),('🇨🇦'),('🇫🇷'),('🇦🇪'),('👋🏻'),('👋🏼'),('👋🏽'),('👋🏾'),('👋🏿'),('👍🏻'),('👍🏼'),('👍🏽'),('👍🏾'),('👍🏿'),('👎🏻'),('👎🏼'),('👎🏽'),('👎🏾'),('👎🏿'),('👏🏻'),('👏🏼'),('👏🏽'),('👏🏾'),('👏🏿'),('🙌🏻'),('🙌🏼'),('🙌🏽'),('🙌🏾'),('🙌🏿'),('🙏🏻'),('🙏🏼'),('🙏🏽'),('🙏🏾'),('🙏🏿'),('💪🏻'),('💪🏼'),('💪🏽'),('💪🏾'),('💪🏿'),('🫶🏻'),('🫶🏼'),('🫶🏽'),('🫶🏾'),('🫶🏿'),('🫰🏻'),('🫰🏼'),('🫰🏽'),('🫰🏾'),('🫰🏿'),('👌🏻'),('👌🏼'),('👌🏽'),('👌🏾'),('👌🏿'),('💅🏻'),('💅🏼'),('💅🏽'),('💅🏾'),('💅🏿'),('🤳🏻'),('🤳🏼'),('🤳🏽'),('🤳🏾'),('🤳🏿');
create table public.message_reactions (
 message_id uuid not null references public.messages(id) on delete cascade,
 actor text not null check(actor in ('user','character')),
 emoji text not null references private.reaction_emojis(emoji),
 primary key(message_id,actor)
);
alter table public.message_reactions enable row level security;
revoke all on public.message_reactions from public,anon,authenticated;
grant select on public.message_reactions to authenticated;
create policy own_message_reactions on public.message_reactions for select to authenticated using(exists(
 select 1 from public.messages m join public.conversations c on c.id=m.conversation_id
 where m.id=message_id and c.user_id=auth.uid() and c.deleted_at is null
));
create function public.set_message_reaction(p_conversation uuid,p_message uuid,p_emoji text default null) returns void
language plpgsql security definer set search_path='' as $$
declare c public.conversations;
begin
 if not public.has_adult_access() then raise exception 'forbidden';end if;
 select * into c from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'not_found';end if;
 if c.status<>'active' or private.compute_capabilities(c.character_id)->>'chat' is distinct from 'true' then raise exception 'chat_paused';end if;
 if not exists(select 1 from public.messages where id=p_message and conversation_id=c.id and role in ('user','character') and kind in ('text','photo')) then raise exception 'not_found';end if;
 if p_emoji is not null and not exists(select 1 from private.reaction_emojis where emoji=p_emoji) then raise exception 'invalid_reaction';end if;
 perform private.limit_conversation_mutation();
 if p_emoji is null then delete from public.message_reactions where message_id=p_message and actor='user';
 else insert into public.message_reactions(message_id,actor,emoji) values(p_message,'user',p_emoji)
 on conflict(message_id,actor) do update set emoji=excluded.emoji;end if;
end;$$;
revoke all on function public.set_message_reaction(uuid,uuid,text) from public,anon;
grant execute on function public.set_message_reaction(uuid,uuid,text) to authenticated;

alter function public.conversation_thread(uuid,bigint) rename to thread_before_reactions;
alter function public.thread_before_reactions(uuid,bigint) set schema private;
revoke all on function private.thread_before_reactions(uuid,bigint) from public,anon,authenticated,service_role;
create function public.conversation_thread(p_id uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.thread_before_reactions(p_id,p_before);
 return result||jsonb_build_object('reactions',coalesce((select jsonb_agg(jsonb_build_object('messageId',r.message_id,'actor',r.actor,'emoji',r.emoji) order by r.message_id,r.actor)
 from public.message_reactions r where r.message_id in(select (m->>'id')::uuid from jsonb_array_elements(result->'messages') m)),'[]'::jsonb));
end;$$;
revoke all on function public.conversation_thread(uuid,bigint) from public,anon;
grant execute on function public.conversation_thread(uuid,bigint) to authenticated;

alter table private.reply_jobs add column reaction_candidates uuid[] not null default '{}';
alter function public.claim_reply(uuid,uuid,text) rename to claim_before_reactions;
alter function public.claim_before_reactions(uuid,uuid,text) set schema private;
revoke all on function private.claim_before_reactions(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.claim_reply(p_message uuid,p_actor uuid,p_model text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;targets jsonb;history jsonb;
begin
 result:=private.claim_before_reactions(p_message,p_actor,p_model);
 if result->>'state'<>'claimed' then return result;end if;
 select coalesce(jsonb_agg(jsonb_build_object('messageId',h->>'id')),'[]'::jsonb) into targets
 from (select h from jsonb_array_elements(result->'history') h where h->>'role'='user' order by (h->>'sequence')::bigint desc limit 6) recent;
 update private.reply_jobs set reaction_candidates=array(select (t->>'messageId')::uuid from jsonb_array_elements(targets) t) where id=(result->>'job')::uuid;
 select coalesce(jsonb_agg(h||jsonb_build_object('reactions',coalesce((select jsonb_agg(jsonb_build_object('actor',r.actor,'emoji',r.emoji) order by r.actor) from public.message_reactions r where r.message_id=(h->>'id')::uuid),'[]'::jsonb)) order by position),'[]'::jsonb)
 into history from jsonb_array_elements(result->'history') with ordinality as items(h,position);
 return result||jsonb_build_object('history',history,'reactionTargets',targets);
end;$$;
create function public.finish_reaction_reply(p_job uuid,p_actor uuid,p_lease uuid,p_text text,p_failure text,p_asset uuid,p_message uuid,p_emoji text) returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;j private.reply_jobs;result text;
begin
 select c0.* into c from public.conversations c0 join private.reply_jobs j0 on j0.conversation_id=c0.id where j0.id=p_job and c0.user_id=p_actor for update of c0;
 if not found then return 'discarded';end if;
 select * into j from private.reply_jobs where id=p_job for update;
 if j.state='completed' then return public.finish_reply(p_job,p_actor,p_lease,p_text,p_failure,p_asset);end if;
 if p_failure is not null then return public.finish_reply(p_job,p_actor,p_lease,null,p_failure,null);end if;
 if p_asset is not null or not coalesce(p_message=any(j.reaction_candidates),false)
 or not exists(select 1 from private.reaction_emojis where emoji=p_emoji)
 or not exists(select 1 from public.messages where id=p_message and conversation_id=c.id and role='user' and kind='text') then
 return public.finish_reply(p_job,p_actor,p_lease,null,'invalid_output',null);end if;
 result:=public.finish_reply(p_job,p_actor,p_lease,p_text,null,null);
 if result<>'completed' then return result;end if;
 insert into public.message_reactions(message_id,actor,emoji) values(p_message,'character',p_emoji)
 on conflict(message_id,actor) do update set emoji=excluded.emoji;
 return result;
end;$$;
revoke all on function public.claim_reply(uuid,uuid,text),public.finish_reaction_reply(uuid,uuid,uuid,text,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_reply(uuid,uuid,text),public.finish_reaction_reply(uuid,uuid,uuid,text,text,uuid,uuid,text) to service_role;
commit;
