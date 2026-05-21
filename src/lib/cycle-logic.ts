import { DailyLog, FertilityStatus } from '../../types';
import { differenceInDays, parseISO } from 'date-fns';

// ─── LÓGICA CORRETA DO CICLO MENSTRUAL ─────────────────────────────────────────
//
// REGRA BASE (válida para qualquer duração de ciclo):
//   • A fase lútea (pós-ovulação) é SEMPRE ~14 dias
//   • Ovulação = ciclo - 14  (ex: ciclo 28 → dia 14; ciclo 30 → dia 16)
//   • Janela fértil pura = 6 dias: (ovulação - 5) até (ovulação)
//   • Margem de segurança: ±2 dias em cada transição de fase
//   • Total da janela com segurança = 9+ dias
//
// REGRA DO DIA 1:
//   • Somente sangramento intenso (heavy) ou médio (medium) = Dia 1
//   • Escape leve (light), borra marrom, manchas NÃO contam como Dia 1
//   • isCycleStart marcado pelo usuário tem prioridade máxima
//
// RECÁLCULO DINÂMICO:
//   • Se usuário confirma ápice (isPeak), ovulação é âncada naquela data
//   • Se menstruação real durou mais do que previsto, fases são deslocadas
//   • Sinais biológicos (muco + temperatura) têm prioridade sobre calendário
//
// FASES:
//   [1] Menstrual        → dias 1 a 5 (ou enquanto houver sangramento real)
//   [2] Infértil inicial → após menstruação até início da janela fértil com margem
//   [3] Fértil           → (ovulação-5-2) até (ovulação+2) ← com margem ±2d
//   [4] Pós-ovulatório   → (ovulação+3) até fim do ciclo   ← fase lútea/infértil
// ───────────────────────────────────────────────────────────────────────────────

const SAFETY_MARGIN = 2; // dias de margem em cada transição

/**
 * Calcula a posição de cada fase num ciclo de `cycleLength` dias.
 * Retorna os limites em número de dias a partir do Dia 1 (0-indexed).
 *
 * Exemplo ciclo 30 dias:
 *   ovulationDay  = 16
 *   fertileStart  = max(6, 16-5-2) = 9   ← inclui margem de segurança leading
 *   fertileEnd    = 16+2 = 18             ← inclui margem de segurança trailing
 *   Janela total  = dias 9–18 = 9 dias demarcados no calendário ✓
 */
export function getCyclePhaseRanges(cycleLength: number) {
  const ovulationDay = cycleLength - 14;                         // ex: 28→14, 30→16
  const pureFertileStart = ovulationDay - 5;                     // 5 dias antes da ov.
  const fertileStartSafe = Math.max(6, pureFertileStart - SAFETY_MARGIN); // com margem
  const fertileEndSafe   = ovulationDay + SAFETY_MARGIN;         // com margem trailing

  return {
    menstrualEnd:     4,              // dias 1-5 (índices 0-4)
    infertileEnd:     fertileStartSafe - 1,
    fertileStart:     fertileStartSafe,
    fertileEnd:       fertileEndSafe,
    ovulationDay,                     // pico esperado (0-indexed)
    lutealStart:      fertileEndSafe + 1,
    cycleEnd:         cycleLength - 1,
  };
}

/**
 * Encontra os inícios de ciclo nos logs.
 *
 * REGRAS:
 *   1. isCycleStart === true (marcado pelo usuário) tem PRIORIDADE MÁXIMA.
 *      Se há dois isCycleStart dentro de 40 dias, o mais recente substitui.
 *   2. Sangramento heavy/medium após pausa de ≥4 dias = novo ciclo automático.
 *   3. Escape leve (light), manchas ou borra NÃO contam como Dia 1.
 *   4. Dois inícios não podem estar a menos de 18 dias um do outro.
 */
export function findCycleStarts(logs: DailyLog[]): string[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const starts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];

    // Critério 1: marcação explícita pelo usuário (máxima prioridade)
    const isExplicit = (log as any).isCycleStart === true;

    // Critério 2: sangramento verdadeiro (heavy ou medium) — light NÃO conta
    const isTrueFlow = log.bleeding === 'heavy' || log.bleeding === 'medium';

    if (!isExplicit && !isTrueFlow) continue;

    // Verificar se é continuação do mesmo fluxo (não é evento novo)
    const prev = sorted[i - 1];
    const gapFromPrev = prev
      ? differenceInDays(parseISO(log.date), parseISO(prev.date))
      : 99;
    const prevWasTrueFlow = prev &&
      (prev.bleeding === 'heavy' || prev.bleeding === 'medium' ||
       (prev as any).isCycleStart === true);
    // Se a diferença for ≤4 dias e o dia anterior também tinha fluxo, é continuação
    const isContinuation = prevWasTrueFlow && gapFromPrev <= 4;

    if (isContinuation && !isExplicit) continue;

    const lastStart = starts.length > 0 ? starts[starts.length - 1] : null;
    const gapFromLastStart = lastStart
      ? differenceInDays(parseISO(log.date), parseISO(lastStart))
      : 999;

    if (!lastStart || gapFromLastStart >= 18) {
      // Suficientemente distante do ciclo anterior → novo ciclo
      starts.push(log.date);
    } else if (gapFromLastStart > 0) {
      // Dentro da janela do mesmo ciclo (<18 dias)
      if (isExplicit) {
        // Usuário está corrigindo o Dia 1 → substitui o anterior
        starts[starts.length - 1] = log.date;
      } else if (isTrueFlow) {
        // Novo sangramento intenso dentro do mesmo período:
        // verificar se o início anterior era apenas leve (escape)
        const prevStartLog = sorted.find(l => l.date === lastStart);
        const prevWasOnlyLight = prevStartLog &&
          prevStartLog.bleeding !== 'heavy' &&
          prevStartLog.bleeding !== 'medium';
        if (prevWasOnlyLight) {
          // Substitui início baseado em fluxo leve pelo fluxo real intenso
          starts[starts.length - 1] = log.date;
        }
      }
    }
  }

  return starts;
}

/**
 * Calcula a duração média dos ciclos a partir das datas de início.
 * Considera apenas ciclos de 21–45 dias (fisiologicamente plausíveis).
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
 * Ordem de prioridade (do mais para o menos específico):
 *   1. Sangramento real → menstrual
 *   2. Muco elástico (eggwhite) ou sensação escorregadia → high-fertility
 *   3. Ápice confirmado (isPeak) → pós-ovulatório nos dias seguintes
 *   4. Muco aquoso/cremoso → potentially-fertile
 *   5. Cálculo por calendário com recálculo dinâmico:
 *      a. Usa ápice confirmado como âncora de ovulação (se disponível)
 *      b. Ajusta janela fértil conforme duração real da menstruação
 *      c. Aplica margem de segurança ±2 dias
 */
export function getFertilityStatus(
  logs: DailyLog[],
  date: string,
  cycleLength: number = 28
): FertilityStatus {
  const log = logs.find(l => l.date === date);

  // ── 1. Sangramento real ───────────────────────────────────────────────────
  if (log?.bleeding && log.bleeding !== 'none') {
    return 'menstrual';
  }

  // ── 2. Sinais biológicos de máxima fertilidade ───────────────────────────
  if (log?.mucus === 'eggwhite' || log?.sensation === 'slippery') {
    return 'high-fertility';
  }

  // ── 3. Ápice confirmado pelo usuário → pós-ovulatório por até 16 dias ────
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const recentPeak = sortedLogs
    .filter(l => {
      if (!l.isPeak) return false;
      const diff = differenceInDays(parseISO(date), parseISO(l.date));
      return diff > 0 && diff <= 16;
    })
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];

  if (recentPeak) {
    return 'post-ovulatory';
  }

  // ── 4. Muco crescente (fertilidade potencial) ────────────────────────────
  if (log?.mucus === 'watery') return 'potentially-fertile';
  if (log?.mucus === 'creamy' || log?.mucus === 'sticky') return 'potentially-fertile';

  // ── 5. Cálculo por calendário com recálculo dinâmico ─────────────────────
  const cycleStarts = findCycleStarts(logs);
  if (cycleStarts.length === 0) return 'infertile';

  const avgCycle  = calcAvgCycleLength(cycleStarts, cycleLength);
  const lastStart = cycleStarts[cycleStarts.length - 1];
  const dayOfCycle = differenceInDays(parseISO(date), parseISO(lastStart)); // 0-indexed

  if (dayOfCycle < 0 || dayOfCycle > avgCycle + 7) return 'infertile';

  // Calcular ranges base
  let ranges = getCyclePhaseRanges(avgCycle);

  // Ajuste dinâmico A: se menstruação real durou mais do que o previsto,
  // deslocar todas as fases seguintes proporcionalmente
  const bleedingDaysInCycle = sortedLogs.filter(l => {
    const diff = differenceInDays(parseISO(l.date), parseISO(lastStart));
    return diff >= 0 && diff < 20 &&
      (l.bleeding === 'heavy' || l.bleeding === 'medium' || l.bleeding === 'light');
  });
  const lastBleedingOffset = bleedingDaysInCycle.length > 0
    ? differenceInDays(
        parseISO(bleedingDaysInCycle[bleedingDaysInCycle.length - 1].date),
        parseISO(lastStart)
      )
    : null;

  if (lastBleedingOffset !== null && lastBleedingOffset > ranges.menstrualEnd) {
    const shift = lastBleedingOffset - ranges.menstrualEnd;
    ranges = {
      ...ranges,
      menstrualEnd:  lastBleedingOffset,
      fertileStart:  ranges.fertileStart + shift,
      fertileEnd:    ranges.fertileEnd + shift,
      ovulationDay:  ranges.ovulationDay + shift,
      lutealStart:   ranges.lutealStart + shift,
    };
  }

  // Ajuste dinâmico B: se ápice foi confirmado, ancorá-lo como ovulação real
  const peakInCycle = sortedLogs.find(l => {
    if (!l.isPeak) return false;
    const diff = differenceInDays(parseISO(l.date), parseISO(lastStart));
    return diff >= 0 && diff < avgCycle + 7;
  });

  if (peakInCycle) {
    const peakDay = differenceInDays(parseISO(peakInCycle.date), parseISO(lastStart));
    ranges = {
      ...ranges,
      ovulationDay: peakDay,
      fertileStart: Math.max(ranges.menstrualEnd + 1, peakDay - 5 - SAFETY_MARGIN),
      fertileEnd:   peakDay + SAFETY_MARGIN,
      lutealStart:  peakDay + SAFETY_MARGIN + 1,
    };
  }

  // Classificar o dia conforme os ranges recalculados
  if (dayOfCycle <= ranges.menstrualEnd) return 'menstrual';

  if (dayOfCycle >= ranges.fertileStart && dayOfCycle <= ranges.fertileEnd) {
    // Dias próximos ao ápice = fertilidade máxima
    if (
      dayOfCycle >= ranges.ovulationDay - 1 &&
      dayOfCycle <= ranges.ovulationDay + 1
    ) {
      return 'high-fertility';
    }
    return 'potentially-fertile';
  }

  if (dayOfCycle > ranges.fertileEnd) return 'post-ovulatory';

  // Fase pré-fértil (entre menstruação e janela fértil)
  return 'infertile';
}
