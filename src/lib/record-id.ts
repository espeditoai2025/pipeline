/**
 * Un identificatore che arriva dal client va confermato stringa PRIMA di finire dentro un
 * `where` di Prisma.
 *
 * I tipi generati accettano su ogni campo id anche un filtro (`{ not: "" }`, `{ contains: "" }`),
 * e le server action sono endpoint RPC: chi chiama sceglie la forma degli argomenti. Un oggetto
 * al posto della stringa trasforma quindi "cancella questo record" in "cancella tutti i record
 * dell'organizzazione", perche' il resto del `where` (organizationId) resta soddisfatto.
 */
export function isRecordId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}
