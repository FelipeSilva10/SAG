import { CourseError, textField } from "@/lib/course-validation";

export function studentEmail(value: unknown): string {
  const login = textField(value, "Usuário ou e-mail", true, 254).toLowerCase();
  if (login.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) throw new CourseError("E-mail inválido.");
    return login;
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(login)) throw new CourseError("Use de 3 a 64 caracteres no usuário: letras sem acentos, números, ponto, hífen ou sublinhado.");
  const domain = process.env.NEXT_PUBLIC_BLOQUIN_EMAIL_DOMAIN ?? "bloquin.com";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new CourseError("Domínio de login do Bloquin não configurado.", 500);
  return `${login}@${domain}`;
}
