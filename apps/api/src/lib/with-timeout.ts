/** Rechaza si la promesa no se resuelve en `ms` milisegundos. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "operación"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: timeout tras ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
