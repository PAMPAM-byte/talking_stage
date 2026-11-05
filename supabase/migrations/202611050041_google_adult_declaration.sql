begin;

-- Founder request, 5 November 2026: Google sign-in. Email sign-up records the adult
-- declaration from sign-up metadata, which a Google account cannot carry. After Google
-- returns, the app calls this only once the person has ticked "I am 18 or older"
-- (checked by the signed age cookie or the age screen). It never clears or changes an
-- existing declaration.
create function public.accept_adult_declaration() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated';end if;
 update public.profiles set adult_declared_at=now(),adult_declaration_version='18-plus-v1'
 where id=auth.uid() and adult_declared_at is null and deletion_scheduled_for is null;
 return exists(select 1 from public.profiles where id=auth.uid() and adult_declared_at is not null);
end;$$;
revoke all on function public.accept_adult_declaration() from public,anon,service_role;
grant execute on function public.accept_adult_declaration() to authenticated;

commit;
