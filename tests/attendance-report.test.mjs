import assert from 'node:assert/strict';
import test from 'node:test';
import { attendanceCell, attendanceCsv, consolidateAttendance } from '../src/lib/attendance-report.ts';

function report(extra = {}) {
  return consolidateAttendance({ escola: 'Escola A', inicio: '2026-10-01', fim: '2026-10-31', alunos: [{ id: 'ana', nome: 'Ana' }, { id: 'joao', nome: 'João' }], presencas: [], chamadas: [], aulasPendentes: 2, ...extra });
}
test('aluno transferido aparece uma única vez com o histórico de diferentes turmas', () => {
  const data = report({ presencas: [
    { chamadaId: 'call1', alunoId: 'transferido', alunoNome: 'Carlos', data: '2026-10-05', presente: true },
    { chamadaId: 'call2', alunoId: 'transferido', alunoNome: 'Carlos', data: '2026-10-07', presente: false },
  ], chamadas: [{ id: 'call1', data: '2026-10-05' }, { id: 'call2', data: '2026-10-07' }] });
  const student = data.alunos.find(a => a.id === 'transferido');
  assert.equal(data.alunos.filter(a => a.id === 'transferido').length, 1);
  assert.equal(student.presencas, 1); assert.equal(student.faltas, 1); assert.equal(student.frequencia, 50);
  assert.equal(student.ultimaPresenca, '2026-10-05');
});
test('aluno sem registros não recebe falta nem frequência artificial', () => {
  const data = report();
  assert.equal(data.alunos[0].faltas, 0); assert.equal(data.alunos[0].frequencia, null);
  assert.equal(attendanceCell(data.alunos[0].dias['2026-10-05']), '—');
  assert.equal(data.aulasPendentes, 2);
});
test('identidades distintas com o mesmo nome são preservadas', () => {
  const data = report({ alunos: [{ id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Ana' }] });
  assert.equal(data.alunos.length, 2);
});
test('duplicação de resultado de join não duplica presenças', () => {
  const entry = { chamadaId: 'call', alunoId: 'ana', alunoNome: 'Ana', data: '2026-10-05', presente: true };
  assert.equal(report({ presencas: [entry, entry] }).alunos[0].presencas, 1);
});
test('mais de um registro na mesma data mantém os totais na matriz', () => {
  const data = report({ presencas: [
    { chamadaId: 'a', alunoId: 'ana', alunoNome: 'Ana', data: '2026-10-05', presente: true },
    { chamadaId: 'b', alunoId: 'ana', alunoNome: 'Ana', data: '2026-10-05', presente: false },
  ] });
  assert.equal(attendanceCell(data.alunos[0].dias['2026-10-05']), '1P / 1F');
});
test('CSV preserva acentos e protege nomes que parecem fórmulas de planilha', () => {
  const csv = attendanceCsv(report({ alunos: [{ id: 'a', nome: '=HYPERLINK("x")' }, { id: 'b', nome: 'João; "Silva"' }] }));
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes('"João; ""Silva"""'));
});
