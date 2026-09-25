-- ============================================================================
--  MARIUÁ · REGISTRO DE ACESSOS
--  Rode UMA vez no Supabase: SQL Editor → New query → cole tudo → Run.
--  Cria a tabela que o mariua-auth.js preenche (quem abriu qual tela e quando)
--  e que o admin.html mostra na aba "Acessos".
-- ============================================================================

create table if not exists public.acessos (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,                 -- login de quem abriu
  nome        text,                          -- nome da conta no momento
  tela        text,                          -- id da tela no catálogo (turno, rdo, obra…)
  tela_nome   text,                          -- nome amigável (Turno, RDO, Cadastro de obra…)
  arquivo     text,                          -- arquivo aberto (turno.html…)
  bloqueado   boolean not null default false,-- tentou abrir tela sem permissão
  aparelho    text,                          -- computador / celular / tablet
  device_id   text,                          -- id do aparelho (identidade.js)
  em          timestamptz not null default now(),  -- quando abriu
  ultimo_em   timestamptz not null default now()   -- último sinal (tela aberta e visível)
);

create index if not exists acessos_em_idx    on public.acessos (em desc);
create index if not exists acessos_email_idx on public.acessos (email, em desc);

alter table public.acessos enable row level security;

-- Cada pessoa logada registra só os próprios acessos
drop policy if exists acessos_inserir on public.acessos;
create policy acessos_inserir on public.acessos
  for insert to authenticated
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- …e atualiza o "último sinal" só dos próprios acessos
drop policy if exists acessos_atualizar on public.acessos;
create policy acessos_atualizar on public.acessos
  for update to authenticated
  using      (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

-- Gestor vê tudo; os demais só enxergam as próprias linhas
-- (necessário para o "último sinal" conseguir atualizar a linha)
drop policy if exists acessos_ler on public.acessos;
create policy acessos_ler on public.acessos
  for select to authenticated
  using (public.is_gestor() or lower(email) = lower(auth.jwt() ->> 'email'));

-- Ninguém apaga pelo site
revoke delete on public.acessos from anon, authenticated;
