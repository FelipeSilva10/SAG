import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, buildCalendar, isDate, isTeachingDay, todayInSaoPaulo } from '../src/lib/course-calendar.ts';

function fixture(overrides = {}) {
  const turma = { id: 'class', nome: 'Programação', escolaId: 'school', escolaNome: 'Escola', professorId: 'teacher', professorNome: 'Professor', anoLetivo: '2026', dataInicio: '2026-10-05', dataFim: '2026-10-30', totalAulas: null, situacao: 'ATIVA', horarios: [] };
  const slot = { id: 'slot', turmaId: 'class', turmaNome: 'Programação', professorId: 'teacher', professorNome: 'Professor', diaSemana: 'SEGUNDA', horarioInicio: '09:00', horarioFim: '10:00', tipo: 'AULA', dataInicio: null, dataFim: null, criadoPor: 'ADMIN' };
  return { turmas: [turma], escolas: [{ id: 'school', nome: 'Escola', dataInicio: null, dataFim: null }], slots: [slot], excecoes: [], chamadas: [], inicio: '2026-10-01', fim: '2026-11-30', hoje: '2026-10-13', ...overrides };
}
const exception = (data, tipo, extra = {}) => ({ id: `exception-${data}`, turmaId: 'class', data, tipo, motivo: 'Ajuste', horarioInicio: tipo === 'FERIADO' ? null : '10:00', horarioFim: tipo === 'FERIADO' ? null : '11:00', dataOriginal: null, ...extra });

test('datas civis respeitam São Paulo, virada de mês e ano bissexto', () => {
  assert.equal(todayInSaoPaulo(new Date('2026-10-13T01:15:00Z')), '2026-10-12');
  assert.equal(isDate('2026-02-29'), false);
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
test('feriados não recebem número, não são faltas e reduzem o total de um período fixo', () => {
  const data = buildCalendar(fixture({ excecoes: [exception('2026-10-12', 'FERIADO')] }));
  assert.equal(data.aulas.find(a => a.data === '2026-10-12').numero, null);
  assert.equal(data.aulas.find(a => a.data === '2026-10-12').status, 'CANCELADA');
  assert.deepEqual(data.aulas.filter(isTeachingDay).map(a => a.numero), [1, 2, 3]);
  assert.equal(data.progresso[0].total, 3);
  assert.equal(data.progresso[0].pendentes, 1);
});
test('reposição cancela origem e conserva o total, inclusive depois da data final', () => {
  const data = buildCalendar(fixture({ excecoes: [exception('2026-11-03', 'REPOSICAO', { dataOriginal: '2026-10-12' })] }));
  assert.equal(data.aulas.find(a => a.data === '2026-10-12').status, 'CANCELADA');
  assert.equal(data.aulas.find(a => a.data === '2026-11-03').numero, 4);
  assert.equal(data.progresso[0].total, 4);
});
test('feriado e reposição da mesma origem funcionam em qualquer ordem', () => {
  const exceptions = [exception('2026-10-13', 'REPOSICAO', { dataOriginal: '2026-10-12' }), exception('2026-10-12', 'FERIADO')];
  for (const excecoes of [exceptions, [...exceptions].reverse()]) {
    const data = buildCalendar(fixture({ excecoes }));
    assert.equal(data.progresso[0].total, 4);
    assert.equal(data.aulas.find(a => a.data === '2026-10-12').status, 'CANCELADA');
  }
});
test('objetivo de 22 aulas calcula o fim sem prazo, pulando feriados', () => {
  const base = fixture(); base.turmas[0].dataFim = null; base.turmas[0].totalAulas = 22;
  const data = buildCalendar({ ...base, fim: '2027-12-31', excecoes: [exception('2026-10-12', 'FERIADO')] });
  assert.equal(data.progresso[0].total, 22);
  assert.equal(data.aulas.filter(isTeachingDay).at(-1).numero, 22);
  assert.equal(data.aulas.filter(isTeachingDay).at(-1).data, '2027-03-08');
});
test('reposição após a última aula de curso com objetivo não cria uma 23ª aula', () => {
  const base = fixture(); base.turmas[0].dataFim = null; base.turmas[0].totalAulas = 22;
  const data = buildCalendar({ ...base, fim: '2027-12-31', excecoes: [exception('2027-03-09', 'REPOSICAO', { dataOriginal: '2026-10-12' })] });
  assert.equal(data.progresso[0].total, 22);
  assert.equal(data.aulas.filter(isTeachingDay).at(-1).data, '2027-03-09');
});
test('aulas extras são adicionadas ao curso', () => {
  const data = buildCalendar(fixture({ excecoes: [exception('2026-10-06', 'EXTRA')] }));
  assert.equal(data.progresso[0].total, 5);
});
test('chamada preserva data e horário histórico após remoção do cronograma', () => {
  const data = buildCalendar(fixture({ slots: [], chamadas: [{ id: 'call', turmaId: 'class', professorId: 'teacher', dataAula: '2026-10-05', horarioInicio: '08:00', horarioFim: '09:30', cronogramaId: null }] }));
  assert.equal(data.progresso[0].realizadas, 1);
  assert.equal(data.aulas[0].horarioInicio, '08:00');
  assert.equal(data.aulas[0].status, 'REALIZADA');
});
test('curso contínuo não inventa um total final e reunião não entra na contagem', () => {
  const base = fixture(); base.turmas[0].dataFim = null; base.slots.push({ ...base.slots[0], id: 'meeting', diaSemana: 'TERÇA', tipo: 'REUNIÃO' });
  const data = buildCalendar(base);
  assert.equal(data.progresso[0].total, null);
  assert.equal(data.aulas.some(a => a.data === '2026-10-06'), false);
});
test('período da escola limita o calendário e curso encerrado preserva o histórico', () => {
  const base = fixture(); base.escolas[0].dataFim = '2026-10-15';
  assert.equal(buildCalendar(base).progresso[0].total, 2);
  base.turmas[0].situacao = 'ENCERRADA';
  assert.equal(buildCalendar(base).progresso[0].proxima, null);
});
