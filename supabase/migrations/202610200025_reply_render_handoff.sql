begin;
-- Expose only the owned public message ID, never job context or provider data.
create or replace function public.reply_status(p_conversation uuid,p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.has_adult_access() or not exists(select 1 from public.conversations where id=p_conversation and user_id=auth.uid() and deleted_at is null) then raise exception 'not_found';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('messageId',j.user_message_id,'state',case when j.state='generating' and j.lease_until<=now() then 'failed' else j.state end,'attempts',j.attempts,'outputMessageId',case when j.state='completed' then j.output_message_id else null end))
 from private.reply_jobs j join public.messages m on m.id=j.user_message_id where j.conversation_id=p_conversation
 and m.id in(select id from public.messages where conversation_id=p_conversation and (p_before is null or sequence<p_before) order by sequence desc limit 40)),'[]'::jsonb);
end;$$;
revoke all on function public.reply_status(uuid,bigint) from public,anon;
grant execute on function public.reply_status(uuid,bigint) to authenticated;
commit;
