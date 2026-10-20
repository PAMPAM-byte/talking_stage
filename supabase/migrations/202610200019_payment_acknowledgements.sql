begin;

-- Bind future payments to the chat generation in which the user started them.
-- Older attempts intentionally cannot reappear as character replies after reset.
alter table public.payment_intents add column conversation_generation integer check(conversation_generation>0);
create function private.bind_payment_generation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 select generation into new.conversation_generation from public.conversations where id=new.conversation_id and user_id=new.user_id;
 return new;
end;$$;
revoke all on function private.bind_payment_generation() from public,anon,authenticated,service_role;
create trigger bind_payment_generation before insert on public.payment_intents for each row execute function private.bind_payment_generation();

create table private.payment_acknowledgements (
 intent_id uuid primary key references public.payment_intents(id) on delete cascade,
 message_id uuid unique references public.messages(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table private.payment_acknowledgements enable row level security;
revoke all on private.payment_acknowledgements from public,anon,authenticated,service_role;

-- Keep the existing ledger verification and receipt logic unchanged and private.
alter function public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text) rename to apply_before_payment_acknowledgement;
alter function public.apply_before_payment_acknowledgement(uuid,text,text,text,timestamptz,text,text) set schema private;
revoke all on function private.apply_before_payment_acknowledgement(uuid,text,text,text,timestamptz,text,text) from public,anon,authenticated,service_role;

create function public.apply_gift_verification(p_intent uuid,p_checkout text,p_payment text,p_state text,p_verified_at timestamptz,p_event text default null,p_event_type text default 'reconciliation') returns text
language plpgsql security definer set search_path='' as $$
declare c public.conversations;before_status text;intent public.payment_intents;result text;ack_id uuid;reply text;traits text[];
begin
 -- Same conversation-then-intent lock order as the ledger and chat lifecycle.
 select c0.* into c from public.conversations c0 join public.payment_intents i on i.conversation_id=c0.id where i.id=p_intent for update of c0;
 if not found then raise exception 'not_found';end if;
 select status into before_status from public.payment_intents where id=p_intent for update;
 result:=private.apply_before_payment_acknowledgement(p_intent,p_checkout,p_payment,p_state,p_verified_at,p_event,p_event_type);
 select * into intent from public.payment_intents where id=p_intent;
 if before_status='paid' or result<>'paid' or p_state<>'paid' or intent.needs_review
 or intent.gateway_payment_id is null or intent.verified_at is null
 or intent.conversation_generation is distinct from c.generation
 or c.deleted_at is not null or c.status<>'active'
 or not exists(select 1 from public.profiles where id=c.user_id and onboarding_complete and adult_declared_at is not null and ai_consent_at is not null)
 or not exists(select 1 from public.characters where id=c.character_id and status='published') then return result;end if;

 -- One acknowledgement per intent, even across webhook retries and chat resets.
 insert into private.payment_acknowledgements(intent_id) values(intent.id) on conflict do nothing returning intent_id into ack_id;
 if ack_id is null then return result;end if;
 select personality into traits from public.characters where id=c.character_id;
 if intent.gateway_environment='sandbox' then
  reply:='Test payment confirmed. Thank you for testing this with me! No real money was transferred.';
 elsif 'playful'=any(traits) then
  reply:='Payment confirmed! That was such a sweet surprise. Thank you, you really made me smile.';
 elsif 'reserved'=any(traits) then
  reply:='Payment confirmed. Thank you, that was really thoughtful of you. I appreciate it more than you know.';
 elsif 'romantic'=any(traits) then
  reply:='Payment confirmed. That was so thoughtful of you. Thank you for the lovely gesture, I really appreciate it.';
 elsif 'witty'=any(traits) then
  reply:='Payment confirmed. Well, you have officially made me smile. Thank you, that was really kind of you.';
 elsif 'confident'=any(traits) then
  reply:='Payment confirmed. You are very thoughtful, thank you. I really appreciate you doing that.';
 else
  reply:='Payment confirmed. Thank you so much, that was very kind and thoughtful of you. I really appreciate it.';
 end if;
 -- The receipt advanced the sequence; append the character message after it.
 select * into c from public.conversations where id=c.id;
 insert into public.messages(conversation_id,sequence,role,kind,text)
 values(c.id,c.next_sequence,'character','text',reply) returning id into ack_id;
 update private.payment_acknowledgements set message_id=ack_id where intent_id=intent.id;
 update public.conversations set next_sequence=next_sequence+1,context_revision=context_revision+1,updated_at=now(),last_message_at=now(),last_message_preview=reply where id=c.id;
 return result;
end;$$;
revoke all on function public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.apply_gift_verification(uuid,text,text,text,timestamptz,text,text) to service_role;

commit;
