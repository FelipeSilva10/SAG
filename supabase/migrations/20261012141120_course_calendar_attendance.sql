-- Mudança aditiva: preserva alunos, turmas, chamadas e vínculos existentes.
begin;

alter table public.escolas
  add column data_inicio date,
  add column data_fim date,
  add column coordenador text not null default '',
  add column contato text not null default '',
  add constraint escolas_periodo_check check (data_fim is null or data_inicio is null or data_fim >= data_inicio);

alter table public.turmas
  add column data_inicio date,
  add column data_fim date,
  add column total_aulas integer,
  add column situacao_curso text not null default 'ATIVA',
  add constraint turmas_periodo_check check (data_fim is null or data_inicio is null or data_fim >= data_inicio),
  add constraint turmas_total_aulas_check check (total_aulas between 1 and 1000),
  add constraint turmas_situacao_curso_check check (situacao_curso in ('ATIVA', 'ENCERRADA'));

alter table public.cronograma_aulas drop constraint cronograma_aulas_dia_semana_check;
alter table public.cronograma_aulas add constraint cronograma_aulas_dia_semana_check
  check (dia_semana in ('SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'));

create table public.calendario_excecoes (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('FERIADO', 'CANCELAMENTO', 'REPOSICAO', 'EXTRA', 'ALTERACAO')),
  motivo text not null check (length(btrim(motivo)) between 1 and 500),
  horario_inicio time,
  horario_fim time,
  data_original date,
  criado_por uuid not null references public.perfis(id),
  created_at timestamptz not null default now(),
  unique (turma_id, data),
  check ((tipo in ('FERIADO', 'CANCELAMENTO') and horario_inicio is null and horario_fim is null)
    or (tipo in ('REPOSICAO', 'EXTRA', 'ALTERACAO') and horario_inicio is not null and horario_fim is not null and horario_fim > horario_inicio)),
  check ((tipo = 'REPOSICAO' and data_original is not null and data_original <> data)
    or (tipo <> 'REPOSICAO' and data_original is null))
);

create unique index calendario_reposicao_origem_idx on public.calendario_excecoes(turma_id, data_original)
  where tipo = 'REPOSICAO';
create index chamadas_turma_data_idx on public.chamadas(turma_id, data_aula);
create index cronograma_turma_idx on public.cronograma_aulas(turma_id);

-- O SAG usa uma conexão server-side e sua própria sessão validada. O Data API
-- não recebe acesso a estas exceções.
alter table public.calendario_excecoes enable row level security;
revoke all on public.calendario_excecoes from public, anon, authenticated;
grant all on public.calendario_excecoes to service_role;

commit;
