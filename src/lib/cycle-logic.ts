import { DailyLog, FertilityStatus } from '../../types';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';

// ─── LÓGICA CORRETA DO CICLO MENSTRUAL ─────────────────────────────────────────
//
// REGRA BASE (válida para qualquer duração de ciclo):
//   • A fase lútea (pós-ovulação) é SEMPRE ~14 dias
//   • Ovulação = ciclo - 14  (ex: ciclo 28 → dia 14; ciclo 30 → dia 16)
//   • Janela fértil = 6 dias: (ovulação - 5) até (ovulação)
//   • Margem de segurança: ±2 dias em cada transição de fase
//
// FASES:
//   [1] Menstrual        → dias 1 a 5 (ou enquanto houver sangramento)
//   [2] Infértil inicial → após menstruação até 2 dias antes da janela fértil
//   [3] Fértil           → (ovulação-5-2) até (ovulação+2) ← com margem
//   [4] Pós-ovulatório   → (ovulação+3) até fim do ciclo   ← infértil absoluto
//
// Para ciclos irregulares: os sinais biológicos (muco + temperatura) têm
// prioridade sobre o calendário.
// ───────────────────────────────────────────────────────────────────────────────

const SAFETY_MARGIN = 2; // dias de margem em cada transição

/**
 * Calcula a posição de cada fase num ciclo de `cycleLength` dias.
 * Retorna os limites em número de dias a partir do Dia 1 (0-indexed).
 */
export function getCyclePhaseRanges(cycleLength: number) {
  const ovulationDay = cycleLength - 14;          // ex: 28-14=14, 30-14=16
  const fertileStart = ovulationDay - 5;           // 5 dias antes da ovulação
  const fertileEnd   = ovulationDay;               // dia da ovulação

  // Com margem de segurança: expandir janela fértil ±2 dias
  const fertileStartSafe = Math.max(6, fertileStart - SAFETY_MARGIN);
  const fertileEndSafe   = fertileEnd + SAFETY_MARGIN;

  return {
    menstrualEnd:     4,                           // dias 1-5 (índices 0-4)
    infertileEnd:     fertileStartSafe - 1,
    fertileStart:     fertileStartSafe,
    fertileEnd:       fertileEndSafe,
    ovulationDay,                                  // pico esperado
    lutealStart:      fertileEndSafe + 1,
    cycleEnd:         cycleLength - 1,
  };
}

/**
 * Encontra os inícios de ciclo nos logs.
 * Dia 1 = primeiro dia de sangramento intenso (heavy/medium) após pausa.
 */
export function findCycleStarts(logs: DailyLog[]): string[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const starts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    if (log.bleeding === 'heavy' || log.bleeding === 'medium') {
      const prev = sorted[i - 1];
      const gapFromPrev = prev
        ? differenceInDays(parseISO(log.date), parseISO(prev.date))
        : 99;
      const prevWasBleeding = prev && prev.bleeding && prev.bleeding !== 'none';
      const isNewCycle = !prevWasBleeding || gapFromPrev > 4;
      if (isNewCycle) {
        const lastStart = starts[starts.length - 1];
        if (!lastStart || differenceInDays(parseISO(log.date), parseISO(lastStart)) >= 18) {
          starts.push(log.date);
        }
      }
    }
  }

  return starts;
}

/**
 * Calcula a duração média dos ciclos.
 */
export function calcAvgCycleLength(starts: string[], fallback: number = 28): number {
  if (starts.length < 2) return fallback;
  const durations: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const d = differenceInDays(parseISO(starts[i]), parseISO(starts[i - 1]));
    if (d >= 21 && d <= 45) durations.push(d);
  }
  if (durations.length === 0) return fallback;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

/**
 * getFertilityStatus — função principal usada em todo o app.
 *
 * Prioridade:
 *   1. Sangramento → menstrual
 *   2. Sinais biológicos confirmados → high-fertility / potentially-fertile
 *   3. Ápice marcado → pós-ovulatório nos 14 dias seguintes
 *   4. Cálculo calendário com margem de segurança
 */
export function getFertilityStatus(
  logs: DailyLog[],
  date: string,
  cycleLength: number = 28
): FertilityStatus {
  const log = logs.find(l => l.date === date);

  // 1. Sangramento verdadeiro
  if (log?.bleeding && log.bleeding !== 'none') {
    return 'menstrual';
  }

  // 2. Sinais biológicos de alta fertilidade
  if (log?.mucus === 'eggwhite' || log?.sensation === 'slippery') {
    return 'high-fertility';
  }

  // 3. Ápice confirmado → pós-ovulatório por 14 dias
  const recentPeak = [...logs]
    .filter(l => {
      const diff = differenceInDays(parseISO(date), parseISO(l.date));
      return diff > 0 && diff <= 14 && l.isPeak;
    })
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];

  if (recentPeak) {
    return 'post-ovulatory';
  }

  // 4. Muco crescente (potencialmente fértil)
  if (log?.mucus === 'sticky' || log?.mucus === 'creamy' || log?.mucus === 'watery') {
    return 'potentially-fertile';
  }

  // 5. Cálculo por calendário
  const cycleStarts = findCycleStarts(logs);
  if (cycleStarts.length === 0) return 'infertile';

  const avgCycle = calcAvgCycleLength(cycleStarts, cycleLength);
  const lastStart = cycleStarts[cycleStarts.length - 1];
  const dayOfCycle = differenceInDays(parseISO(date), parseISO(lastStart)); // 0-indexed

  if (dayOfCycle < 0 || dayOfCycle > avgCycle + 7) return 'infertile';

  const ranges = getCyclePhaseRanges(avgCycle);

  if (dayOfCycle <= ranges.menstrualEnd) return 'menstrual';
  if (dayOfCycle >= ranges.fertileStart && dayOfCycle <= ranges.fertileEnd) {
    if (dayOfCycle >= ranges.ovulationDay - 1 && dayOfCycle <= ranges.ovulationDay + 1) {
      return 'high-fertility';
    }
    return 'potentially-fertile';
  }
  if (dayOfCycle > ranges.fertileEnd) return 'post-ovulatory';

  return 'infertile';
}
