/**
 * Normalização canônica de e-mail para cadastro, login e busca.
 *
 * Motivo: `User.email` tem índice único e o login usa `findUnique({ where:
 * { email } })`, que é uma comparação EXATA. Sem normalizar, "Fulano@Gmail.com"
 * e "fulano@gmail.com" viram contas distintas — e um usuário que cadastrou em
 * um case e tenta logar em outro recebe 401 "Credenciais inválidas" mesmo com a
 * senha correta. Apara espaços e força minúsculas para eliminar essa classe de
 * lockout.
 *
 * Idempotente: normalizeEmail(normalizeEmail(x)) === normalizeEmail(x).
 */
export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
