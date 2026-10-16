-- 배드민턴 매칭 팀 공유용 Supabase 설정.
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 을 누르면 된다. (여러 번 실행해도 괜찮음)
--
-- 팀 데이터는 팀마다 한 줄(state)로 저장한다.
-- 표(teams)는 앱에서 직접 읽거나 쓸 수 없게 막아두고, 아래 함수로만 접근한다.
-- 함수는 모두 팀 코드를 알아야 동작하므로, 팀 코드를 아는 사람만 그 팀 데이터를 볼 수 있다.
-- (카카오 로그인을 붙이면 팀 코드 대신 로그인한 팀원인지로 확인하도록 바꾼다)

create table if not exists public.teams (
  code text primary key,
  name text not null,
  state jsonb not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;
revoke all on table public.teams from anon, authenticated;

-- 새 팀 만들기. 같은 코드가 이미 있으면 실패한다.
create or replace function public.create_team(p_code text, p_name text, p_state jsonb)
returns bigint
language plpgsql security definer set search_path = public
as $$
begin
  if length(p_code) < 10 then
    raise exception 'team code too short';
  end if;
  insert into teams (code, name, state) values (p_code, p_name, p_state);
  return 1;
end;
$$;

-- 팀 데이터 전체 가져오기. 없는 코드면 빈 결과.
create or replace function public.get_team(p_code text)
returns table (name text, state jsonb, version bigint)
language sql stable security definer set search_path = public
as $$
  select t.name, t.state, t.version from teams t where t.code = p_code;
$$;

-- 바뀌었는지만 가볍게 확인할 때. 없는 코드면 null.
create or replace function public.get_team_version(p_code text)
returns bigint
language sql stable security definer set search_path = public
as $$
  select t.version from teams t where t.code = p_code;
$$;

-- 팀 데이터 저장. 그사이 다른 기기가 먼저 저장했으면(버전이 다르면) 저장하지 않고 null 을 돌려준다.
create or replace function public.save_team(p_code text, p_state jsonb, p_base_version bigint)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v bigint;
begin
  update teams
     set state = p_state, version = version + 1, updated_at = now()
   where code = p_code and version = p_base_version
  returning version into v;
  return v;
end;
$$;

revoke all on function public.create_team(text, text, jsonb) from public;
revoke all on function public.get_team(text) from public;
revoke all on function public.get_team_version(text) from public;
revoke all on function public.save_team(text, jsonb, bigint) from public;
grant execute on function public.create_team(text, text, jsonb) to anon, authenticated;
grant execute on function public.get_team(text) to anon, authenticated;
grant execute on function public.get_team_version(text) to anon, authenticated;
grant execute on function public.save_team(text, jsonb, bigint) to anon, authenticated;
