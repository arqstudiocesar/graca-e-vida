import { DailyLog, FertilityStatus } from '../../types';
import { differenceInDays, parseISO } from 'date-fns';

export function getFertilityStatus(logs: DailyLog[], date: string): FertilityStatus {
  const log = logs.find(l => l.date === date);

  if (log?.bleeding && log.bleeding !== 'none') {
    return 'menstrual';
  }

  if (log?.mucus === 'eggwhite' || log?.sensation === 'slippery') {
    return 'high-fertility';
  }

  if (log?.mucus === 'sticky' || log?.mucus === 'creamy' || log?.mucus === 'watery') {
    return 'potentially-fertile';
  }

  const peakIndex = [...logs]
    .filter(
      l =>
        differenceInDays(parseISO(date), parseISO(l.date)) <= 14 &&
        differenceInDays(parseISO(date), parseISO(l.date)) > 0
    )
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .findIndex(l => l.isPeak);

  if (peakIndex !== -1) {
    return 'post-ovulatory';
  }

  return 'infertile';
}
