import { devAuthAvailable } from "./dev-mode";
import { procedureGenerationReport } from "./procedure-generation-diagnostics";
const key = (id: string) => `practiceready-procedure-diagnostic:${id}`;
export function captureProcedureDiagnostics(
  id: string,
  ...args: Parameters<typeof procedureGenerationReport>
) {
  if (!devAuthAvailable()) return;
  try {
    sessionStorage.setItem(key(id), JSON.stringify(procedureGenerationReport(...args)));
  } catch {
    /* Diagnostics must never block saving training. */
  }
}
export function readProcedureDiagnostics(id: string): string | null {
  if (!devAuthAvailable()) return null;
  try {
    return sessionStorage.getItem(key(id));
  } catch {
    return null;
  }
}
