import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { attendanceCell } from "@/lib/attendance-report";
import type { RelatorioFrequencia } from "@/lib/types";

function printable(text: string): string {
  return text.replaceAll("—", "-").replace(/[^\x20-\x7e\xa0-\xff]/g, "?");
}

export async function attendancePdf(report: RelatorioFrequencia): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(`Frequência - ${report.escola}`);
  doc.setAuthor("SAG / Bloquin");
  const batches = report.datas.length ? Array.from({ length: Math.ceil(report.datas.length / 16) }, (_, i) => report.datas.slice(i * 16, (i + 1) * 16)) : [[]];
  const students = report.alunos.length ? Array.from({ length: Math.ceil(report.alunos.length / 20) }, (_, i) => report.alunos.slice(i * 20, (i + 1) * 20)) : [[]];
  const shorten = (text: string, width: number, size: number) => {
    let safe = printable(text);
    if (font.widthOfTextAtSize(safe, size) <= width) return safe;
    while (safe.length && font.widthOfTextAtSize(`${safe}...`, size) > width) safe = safe.slice(0, -1);
    return `${safe}...`;
  };
  for (const dates of batches) for (const rows of students) {
    const page = doc.addPage([842, 595]);
    const ink = rgb(0.12, 0.18, 0.23);
    const draw = (text: string, x: number, y: number, size = 9, strong = false) => page.drawText(printable(text), { x, y, size, font: strong ? bold : font, color: ink });
    draw("SAG / Bloquin - Relatório de frequência", 32, 563, 16, true);
    draw(shorten(report.escola, 760, 12), 32, 540, 12, true);
    draw(`Período: ${report.inicio ?? "-"} a ${report.fim ?? "-"} | ${report.alunos.length} alunos | ${report.chamadas} chamadas | ${report.aulasPendentes} aulas sem chamada`, 32, 521);
    page.drawRectangle({ x: 32, y: 475, width: 778, height: 32, color: rgb(0.91, 0.95, 0.97) });
    const columns = [32, 265, 304, 339, 380];
    for (const [i, label] of ["Aluno", "Pres.", "Faltas", "Reg.", "%"].entries()) draw(label, columns[i] + 4, 487, 9, true);
    for (const [i, date] of dates.entries()) {
      draw(date.slice(5).split("-").reverse().join("/"), 417 + i * 24, 491, 7, true);
      draw(date.slice(2, 4), 422 + i * 24, 479, 7);
    }
    for (const [i, student] of rows.entries()) {
      const y = 459 - i * 19;
      if (i % 2 === 1) page.drawRectangle({ x: 32, y: y - 5, width: 778, height: 19, color: rgb(0.97, 0.98, 0.99) });
      draw(shorten(student.nome, 224, 9), 36, y);
      draw(String(student.presencas), 269, y);
      draw(String(student.faltas), 308, y);
      draw(String(student.aulasRegistradas), 343, y);
      draw(student.frequencia == null ? "-" : `${student.frequencia}`, 384, y, 8);
      for (const [j, date] of dates.entries()) draw(shorten(attendanceCell(student.dias[date]), 22, 7), 417 + j * 24, y, 7);
    }
    if (!rows.length) draw("Nenhum aluno neste período.", 36, 459);
    draw("P = presente; F = falta; - = sem registro. Totais consolidados por aluno, sem agrupar por turma.", 32, 48, 8);
    draw("Frequência considera somente registros do aluno. Aulas sem chamada não são computadas como faltas.", 32, 35, 8);
    draw(`Página ${doc.getPageCount()}`, 757, 35, 8);
  }
  return doc.save();
}
