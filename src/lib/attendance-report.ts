import type { AlunoRelatorio, PresencaRelatorio, RelatorioFrequencia } from "./types";

export function consolidateAttendance(input: {
  escola: string;
  inicio: string | null;
  fim: string | null;
  alunos: { id: string; nome: string }[];
  presencas: PresencaRelatorio[];
  chamadas: { id: string; data: string }[];
  aulasPendentes: number;
}): RelatorioFrequencia {
  const students = new Map<string, AlunoRelatorio>();
  const add = (id: string, nome: string) => {
    if (!students.has(id)) students.set(id, { id, nome, presencas: 0, faltas: 0, aulasRegistradas: 0, frequencia: null, ultimaPresenca: null, dias: {} });
    return students.get(id)!;
  };
  for (const student of input.alunos) add(student.id, student.nome);
  const seen = new Set<string>();
  for (const entry of input.presencas) {
    const key = `${entry.chamadaId}:${entry.alunoId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const student = add(entry.alunoId, entry.alunoNome);
    const day = student.dias[entry.data] ?? { presentes: 0, faltas: 0 };
    if (entry.presente) {
      student.presencas++;
      day.presentes++;
      if (!student.ultimaPresenca || entry.data > student.ultimaPresenca) student.ultimaPresenca = entry.data;
    } else { student.faltas++; day.faltas++; }
    student.aulasRegistradas++;
    student.dias[entry.data] = day;
  }
  const alunos = [...students.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
  for (const student of alunos) student.frequencia = student.aulasRegistradas ? Math.round(1000 * student.presencas / student.aulasRegistradas) / 10 : null;
  return { escola: input.escola, inicio: input.inicio, fim: input.fim, alunos, datas: [...new Set(input.chamadas.map(c => c.data))].sort(), chamadas: new Set(input.chamadas.map(c => c.id)).size, aulasPendentes: input.aulasPendentes };
}

export function attendanceCell(day?: { presentes: number; faltas: number }): string {
  if (!day) return "—";
  if (day.presentes === 1 && day.faltas === 0) return "P";
  if (day.presentes === 0 && day.faltas === 1) return "F";
  return [day.presentes ? `${day.presentes}P` : "", day.faltas ? `${day.faltas}F` : ""].filter(Boolean).join(" / ");
}

export function csvCell(value: string | number): string {
  let text = String(value);
  // Arquivos destinados a planilhas não executam fórmulas vindas de nomes.
  if (/^\s*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function attendanceCsv(report: RelatorioFrequencia): string {
  const lines = [
    ["Escola", report.escola], ["Período", `${report.inicio ?? "—"} a ${report.fim ?? "—"}`],
    ["Chamadas registradas", report.chamadas], ["Aulas sem chamada", report.aulasPendentes],
    ["Legenda", "P = presente; F = falta; — = sem registro. Frequência calculada apenas sobre registros do aluno."],
    ["Aluno", "Presenças", "Faltas", "Registros", "Frequência (%)", "Última presença", ...report.datas],
    ...report.alunos.map(a => [a.nome, a.presencas, a.faltas, a.aulasRegistradas, a.frequencia ?? "", a.ultimaPresenca ?? "", ...report.datas.map(d => attendanceCell(a.dias[d]))]),
  ];
  return "\uFEFF" + lines.map(line => line.map(csvCell).join(";")).join("\r\n");
}
