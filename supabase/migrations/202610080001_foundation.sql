begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  genders text[] not null default '{}' check (genders <@ array['man','woman']::text[] and cardinality(genders) <= 2),
  language text not null default 'english' check (language in ('english','english_pidgin')),
  requests_enabled boolean not null default false,
  adult_declared_at timestamptz,
  adult_declaration_version text check (adult_declaration_version = '18-plus-v1'),
  ai_consent_at timestamptz,
  onboarding_complete boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((adult_declared_at is null) = (adult_declaration_version is null)),
  check (not onboarding_complete or (adult_declared_at is not null and ai_consent_at is not null and char_length(trim(display_name)) > 0 and cardinality(genders) > 0))
);
create table private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'admin'), granted_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.user_roles where user_id = (select auth.uid()) and role = 'admin');
$$;
create function public.has_adult_access() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and onboarding_complete and adult_declared_at is not null);
$$;

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, adult_declared_at, adult_declaration_version)
  values (new.id, case when new.raw_user_meta_data->>'adult_declaration' = '18-plus-v1' then now() end,
    case when new.raw_user_meta_data->>'adult_declaration' = '18-plus-v1' then '18-plus-v1' end);
  return new;
end;
$$;
create trigger create_profile after insert on auth.users for each row execute function private.create_profile();

create table public.characters (
  id uuid primary key default gen_random_uuid(), name text not null,
  age integer not null check (age >= 18), gender text not null check (gender in ('man','woman')),
  bio text not null default '', conversation_clue text not null default '',
  interests text[] not null default '{}', personality text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','paused','archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table private.character_direction (
  character_id uuid primary key references public.characters(id) on delete cascade,
  direction text not null, version integer not null default 1, updated_at timestamptz not null default now()
);
create table public.character_assets (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.characters(id),
  storage_path text not null unique, slot text not null check (slot in ('portrait','gallery','chat')),
  review_state text not null default 'pending' check (review_state in ('pending','approved','rejected')),
  published boolean not null default false, created_at timestamptz not null default now(),
  unique(id, character_id), check (not published or review_state = 'approved')
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  character_id uuid not null references public.characters(id),
  status text not null default 'active' check (status in ('active','archived')),
  relationship_stage text not null default 'introductory' check (relationship_stage in ('introductory','familiar')),
  last_message_preview text, last_message_at timestamptz, unread_count integer not null default 0 check (unread_count >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(id, user_id, character_id), unique(id, user_id)
);
create unique index one_active_conversation on public.conversations(user_id, character_id) where deleted_at is null and status = 'active';
create index conversations_owner on public.conversations(user_id, updated_at desc);
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, conversation_id uuid not null, character_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0), currency text not null default 'NGN' check (currency = 'NGN'),
  reference text not null unique, idempotency_key text not null, recipient_disclosure text not null,
  status text not null default 'awaiting_checkout' check (status in ('awaiting_checkout','pending','paid','failed','cancelled','expired','refunded','disputed')),
  created_at timestamptz not null default now(), expires_at timestamptz, verified_at timestamptz,
  foreign key (conversation_id,user_id,character_id) references public.conversations(id,user_id,character_id),
  unique(user_id,idempotency_key), unique(id,conversation_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id),
  sequence bigint not null check (sequence > 0), role text not null check (role in ('user','character','system')),
  kind text not null check (kind in ('text','photo','payment','status')), text text,
  asset_id uuid references public.character_assets(id), payment_intent_id uuid,
  client_message_id uuid, created_at timestamptz not null default now(),
  delivery_state text not null default 'saved' check (delivery_state in ('queued','sending','saved','failed')),
  foreign key (payment_intent_id,conversation_id) references public.payment_intents(id,conversation_id),
  unique(conversation_id,sequence), unique(conversation_id,client_message_id), unique(id,conversation_id),
  check ((kind = 'photo' and asset_id is not null and payment_intent_id is null) or
    (kind = 'payment' and payment_intent_id is not null and asset_id is null) or
    (kind in ('text','status') and text is not null and asset_id is null and payment_intent_id is null))
);
create function private.check_message_asset() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.asset_id is not null and not exists (
    select 1 from public.character_assets a join public.conversations c on c.character_id = a.character_id
    where a.id = new.asset_id and c.id = new.conversation_id and a.review_state = 'approved' and a.published
  ) then raise exception 'asset_not_eligible_for_character'; end if;
  return new;
end;
$$;
create trigger check_message_asset before insert or update on public.messages for each row execute function private.check_message_asset();
create table public.memories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  character_id uuid not null references public.characters(id), content text not null,
  category text not null default 'user_fact' check (category = 'user_fact'),
  source_message_id uuid, source_conversation_id uuid,
  consent text not null check (consent in ('explicit','ordinary_shared')),
  saved_at timestamptz not null default now(), deleted_at timestamptz,
  foreign key(source_conversation_id,user_id,character_id) references public.conversations(id,user_id,character_id),
  foreign key(source_message_id,source_conversation_id) references public.messages(id,conversation_id),
  check ((source_message_id is null) = (source_conversation_id is null))
);
create index memories_owner on public.memories(user_id, character_id) where deleted_at is null;
create table public.memory_preferences (
  user_id uuid not null references public.profiles(id), character_id uuid not null references public.characters(id),
  enabled boolean not null default true, updated_at timestamptz not null default now(), primary key(user_id,character_id)
);
create table private.payment_events (
  id uuid primary key default gen_random_uuid(), intent_id uuid not null references public.payment_intents(id),
  gateway_event_id text not null unique, event_type text not null,
  verification_result text not null default 'pending' check (verification_result in ('pending','verified','rejected')),
  received_at timestamptz not null default now(), processed_at timestamptz
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id),
  target_kind text not null check (target_kind in ('message','photo','character')), target_id uuid not null,
  reason text not null, details text, state text not null default 'open' check (state in ('open','in_review','resolved')),
  created_at timestamptz not null default now()
);
-- Internal notes and resolutions are never part of reporter-visible rows.
create table private.report_resolutions (
  report_id uuid primary key references public.reports(id), resolution text not null, updated_at timestamptz not null default now()
);
create table private.admin_audit (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id),
  action text not null, target_kind text not null, target_id uuid,
  outcome text not null check (outcome in ('succeeded','failed')), created_at timestamptz not null default now()
);

-- Enable RLS even on tables with no client grants. Later stages add narrow RPCs,
-- never broad user INSERT/UPDATE access to ledger, messages or administrator data.
do $$ declare t text; begin
  foreach t in array array['profiles','characters','character_assets','conversations','messages','memories','memory_preferences','payment_intents','reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
create policy profile_owner on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy public_cast on public.characters for select to authenticated using (public.has_adult_access() and status = 'published');
create policy public_assets on public.character_assets for select to authenticated using (public.has_adult_access() and published and review_state = 'approved' and exists(select 1 from public.characters c where c.id = character_id));
create policy own_conversations on public.conversations for select to authenticated using (public.has_adult_access() and user_id = (select auth.uid()) and deleted_at is null);
create policy own_messages on public.messages for select to authenticated using (exists(select 1 from public.conversations c where c.id = conversation_id));
create policy own_memories on public.memories for select to authenticated using (public.has_adult_access() and user_id = (select auth.uid()) and deleted_at is null);
create policy own_memory_preferences on public.memory_preferences for select to authenticated using (public.has_adult_access() and user_id = (select auth.uid()));
create policy own_payments on public.payment_intents for select to authenticated using (public.has_adult_access() and user_id = (select auth.uid()));
create policy own_reports on public.reports for select to authenticated using (public.has_adult_access() and reporter_id = (select auth.uid()));

create table private.request_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null, window_start timestamptz not null, attempts integer not null,
  primary key(user_id, action)
);
create function private.limit_account_mutation() returns void language plpgsql security definer set search_path = '' as $$
declare attempts integer;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  insert into private.request_limits as limits(user_id,action,window_start,attempts)
  values(auth.uid(),'preferences',now(),1)
  on conflict(user_id,action) do update set
    attempts = case when limits.window_start < now() - interval '1 minute' then 1 else limits.attempts + 1 end,
    window_start = case when limits.window_start < now() - interval '1 minute' then now() else limits.window_start end
  returning limits.attempts into attempts;
  if attempts > 30 then raise exception 'rate_limited'; end if;
end;
$$;
create function public.save_preferences(p_name text, p_genders text[], p_language text, p_requests boolean, p_version integer)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  perform private.limit_account_mutation();
  if char_length(trim(p_name)) not between 1 and 60 or cardinality(p_genders) not between 1 and 2
    or not (p_genders <@ array['man','woman']::text[]) or p_language not in ('english','english_pidgin')
    or p_name is null or p_genders is null or p_language is null or p_requests is null then raise exception 'invalid_preferences'; end if;
  update public.profiles set display_name = trim(p_name), genders = p_genders, language = p_language,
    requests_enabled = p_requests, version = version + 1, updated_at = now()
  where id = auth.uid() and adult_declared_at is not null and version = p_version returning * into result;
  if result.id is null then raise exception 'conflict_or_ineligible'; end if;
  return result;
end;
$$;
create function public.complete_onboarding(p_version integer, p_consent boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_consent is distinct from true then raise exception 'consent_required'; end if;
  perform private.limit_account_mutation();
  update public.profiles set ai_consent_at = coalesce(ai_consent_at, now()), onboarding_complete = true,
    version = version + 1, updated_at = now()
  where id = auth.uid() and adult_declared_at is not null and version = p_version
    and char_length(trim(display_name)) > 0 and cardinality(genders) > 0;
  if not found then raise exception 'conflict_or_ineligible'; end if;
end;
$$;
revoke all on function public.is_admin(), public.has_adult_access(), public.save_preferences(text,text[],text,boolean,integer), public.complete_onboarding(integer,boolean) from public, anon;
grant execute on function public.is_admin(), public.has_adult_access(), public.save_preferences(text,text[],text,boolean,integer), public.complete_onboarding(integer,boolean) to authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['user_roles','character_direction','payment_events','report_resolutions','admin_audit','request_limits'] loop
    execute format('alter table private.%I enable row level security', t);
  end loop;
end $$;
commit;
