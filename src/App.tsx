import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Calendar as CalendarIcon, Droplets, BookOpen, User, PlusCircle, ChevronLeft, ChevronRight, Info, Thermometer, BarChart3, ShieldCheck, ChevronDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DailyLog, FertilityStatus, UserProfile, MUCUS_VALUES, MethodHistoryEntry } from './types';
import { NAV_ITEMS, FERTILITY_COLORS, METHODS, BIBLE_VERSES, CHURCH_TEACHINGS } from './constants';
import { cn } from './lib/utils';
import { getFertilityStatus } from './lib/cycle-logic';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, Bar, ComposedChart, Cell, ReferenceLine } from 'recharts';

const STORAGE_KEY_LOGS = 'gracavida_logs';
const STORAGE_KEY_PROFILE = 'gracavida_profile';

const INITIAL_PROFILE: UserProfile = {
  name: 'Usuária',
  birthDate: '',
  height: 0,
  weight: 0,
  selectedMethod: 'gracavida',
  methodHistory: [{ methodId: 'gracavida', startDate: new Date().toISOString() }],
  cycleLength: 28,
  isRegular: true,
  remindersEnabled: false,
  reminderTime: '20:00',
  tutorialCompleted: false,
};

function generateICS(logs: DailyLog[]) {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GracaVida//FertilityTracker//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];
  logs.forEach(log => {
    const status = getFertilityStatus(logs, log.date);
    const dateStr = log.date.replace(/-/g, '');
    if (log.bleeding && log.bleeding !== 'none') {
      ics.push('BEGIN:VEVENT');
      ics.push(`DTSTART;VALUE=DATE:${dateStr}`);
      ics.push(`SUMMARY:Menstruação (${log.bleeding})`);
      ics.push('DESCRIPTION:Registro Graça & Vida');
      ics.push('END:VEVENT');
    }
    if (log.isPeak) {
      ics.push('BEGIN:VEVENT');
      ics.push(`DTSTART;VALUE=DATE:${dateStr}`);
      ics.push('SUMMARY:🌟 Ápice de Fertilidade');
      ics.push('DESCRIPTION:Confirmado no App Graça & Vida');
      ics.push('END:VEVENT');
    }
    if (status === 'high-fertility' || status === 'potentially-fertile') {
      ics.push('BEGIN:VEVENT');
      ics.push(`DTSTART;VALUE=DATE:${dateStr}`);
      ics.push('SUMMARY:Fertilidade Alta (Observar)');
      ics.push(`DESCRIPTION:Estado detectado: ${status}`);
      ics.push('END:VEVENT');
    }
  });
  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (savedLogs) try { setLogs(JSON.parse(savedLogs)); } catch (e) {}
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile({ ...INITIAL_PROFILE, ...parsed });
        if (!parsed.tutorialCompleted) setShowTutorial(true);
      } catch (e) {}
    } else {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile)); }, [profile]);

  const handleSaveLog = (newLog: DailyLog) => {
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== newLog.date);
      return [...filtered, newLog].sort((a, b) => a.date.localeCompare(b.date));
    });
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const newProfile = { ...prev, ...updates };
      if (updates.selectedMethod && updates.selectedMethod !== prev.selectedMethod) {
        newProfile.methodHistory = [
          ...(prev.methodHistory || []),
          { methodId: updates.selectedMethod, startDate: new Date().toISOString() }
        ];
      }
      return newProfile;
    });
  };

  const handleDeleteLog = (date: string) => {
    setLogs(prev => prev.filter(l => l.date !== date));
    setActiveTab('dashboard');
  };

  const currentMethod = METHODS.find(m => m.id === profile.selectedMethod) || METHODS[0];

  const renderSection = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard logs={logs} onAddLog={(d) => { if (d) setSelectedDate(d); setActiveTab('log'); }} profile={profile} />;
      case 'calendar': return <Calendar logs={logs} onDateSelect={(d) => { setSelectedDate(d); setActiveTab('log'); }} cycleLength={profile.cycleLength} />;
      case 'doctrine': return <Doctrine />;
      case 'reports': return <Reports logs={logs} profile={profile} />;
      case 'log': return (
        <LogForm
          initialDate={selectedDate}
          onSave={handleSaveLog}
          onDelete={handleDeleteLog}
          onCancel={() => setActiveTab('dashboard')}
          existingLog={logs.find(l => l.date === selectedDate)}
          selectedMethod={profile.selectedMethod}
        />
      );
      case 'education': return <Education />;
      case 'profile': return <Profile logs={logs} profile={profile} onUpdate={handleUpdateProfile} onClear={() => setLogs([])} />;
      default: return <Dashboard logs={logs} onAddLog={() => setActiveTab('log')} profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-page text-brand-text selection:bg-brand-olive/10">
      <AnimatePresence>
        {showTutorial && (
          <Tutorial onComplete={() => handleUpdateProfile({ tutorialCompleted: true })} onDismiss={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>

      <aside className="lg:w-72 lg:h-screen lg:bg-brand-cream lg:border-r lg:border-black/5 lg:p-10 p-6 flex lg:flex-col justify-between items-center lg:items-start lg:sticky lg:top-0 h-auto">
        <div className="w-full">
          <h1 className="text-2xl font-bold text-brand-olive tracking-tighter mb-8 italic lg:block hidden">Graça & Vida</h1>
          <h1 className="text-xl font-bold text-brand-olive italic lg:hidden">Graça & Vida</h1>
          <nav className="hidden lg:block space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-3 w-full text-left py-3 px-4 rounded-xl transition-all uppercase tracking-widest text-[11px] font-bold",
                  activeTab === item.id
                    ? "bg-white text-brand-olive shadow-soft border border-black/5"
                    : "text-brand-muted hover:bg-white/50"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="lg:block hidden pt-6 border-t border-black/5 w-full">
          <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-1">Método Ativo</p>
          <p className="text-xs font-bold text-brand-olive opacity-80 italic">{currentMethod.name}</p>
        </div>
      </aside>

      <main className="flex-1 lg:p-12 p-6 pb-20 lg:pb-12 h-screen overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* FIX 1 — Menu mobile: flex-1 garante espaço igual para todos os itens */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-brand-olive/10 flex items-stretch z-50 shadow-lg" style={{ height: '56px' }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 transition-all flex-1 py-1",
              activeTab === item.id ? "text-brand-olive" : "text-brand-muted"
            )}
          >
            <item.icon size={17} strokeWidth={activeTab === item.id ? 2.5 : 1.8} />
            <span className="text-[7.5px] font-bold uppercase tracking-tight leading-none">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// DASHBOARD
function Dashboard({ logs, onAddLog, profile }: { logs: DailyLog[], onAddLog: (date?: string) => void, profile: UserProfile }) {
  const today = new Date().toISOString().split('T')[0];
  const todayStatus = getFertilityStatus(logs, today);
  const todayLog = logs.find(l => l.date === today);
  const verseIndex = new Date().getDate() % BIBLE_VERSES.length;
  const verse = BIBLE_VERSES[verseIndex];

  const statusLabel: Record<string, string> = {
    'menstrual': 'Fase Menstrual',
    'infertile': 'Fase Infértil',
    'potentially-fertile': 'Fértil',
    'high-fertility': 'Alta Fertilidade',
    'post-ovulatory': 'Pós-Ovulatório'
  };

  const color = FERTILITY_COLORS[todayStatus];
  const recentLogs = logs.slice(-5).reverse();

  // Calcular dia atual do ciclo para exibição
  const cycleStarts = findCycleStartsLocal(logs);
  const avgCycle = calcAvgLocal(cycleStarts, profile.cycleLength || 28);
  const lastCycleStart = cycleStarts[cycleStarts.length - 1];
  const currentCycleDay = lastCycleStart
    ? differenceInDays(parseISO(today), parseISO(lastCycleStart)) + 1
    : null;
  const cycleRanges = getCycleRangesLocal(avgCycle);
  const fertileStartDay = cycleRanges.fertileStart + 1;
  const fertileEndDay   = cycleRanges.fertileEnd + 1;

  return (
    <div className="space-y-8">
      <div className="bg-white p-10 rounded-[32px] shadow-soft border border-brand-olive/5 relative overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: color }} />
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand-muted font-bold mb-4">Olá, {profile.name}</p>
        <h2 className="text-4xl font-serif text-brand-text mb-2 italic leading-tight">{statusLabel[todayStatus]}</h2>
        <p className="text-sm font-sans text-brand-muted mb-10">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        {currentCycleDay !== null && currentCycleDay > 0 && currentCycleDay <= avgCycle + 7 && (
          <div className="w-full max-w-xs mb-8 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Dia do Ciclo</span>
              <span className="text-[9px] font-bold text-brand-olive">{currentCycleDay} / {avgCycle}</span>
            </div>
            <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (currentCycleDay / avgCycle) * 100)}%`,
                  backgroundColor: color
                }}
              />
            </div>
            <p className="text-[9px] text-brand-muted italic text-center">
              Janela fértil est.: dias {fertileStartDay}–{fertileEndDay}
            </p>
          </div>
        )}
        <div className="relative group">
          <div className="w-40 h-40 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
            <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: color }}>
              <Heart className="text-white" fill="white" size={40} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => onAddLog(today)}
          className={cn(
            "flex items-center justify-between p-8 rounded-3xl hover:translate-y-[-2px] transition-all shadow-lg group overflow-hidden relative",
            todayLog ? "bg-white text-brand-olive border border-brand-olive/5" : "bg-brand-olive text-white shadow-brand-olive/10"
          )}
        >
          <div className="relative z-10 flex flex-col items-start gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{todayLog ? 'Entrada Completa' : 'Iniciar Entrada'}</span>
            <span className="text-lg font-bold">{todayLog ? 'Editar Hoje' : 'Registrar Hoje'}</span>
          </div>
          <PlusCircle size={28} className="relative z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="flex items-center justify-between p-8 bg-white rounded-3xl border border-brand-olive/5 shadow-soft">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Última Temperatura</span>
            <span className="text-2xl font-light text-brand-olive">
              {logs.length > 0 && logs[logs.length - 1].temperature ? logs[logs.length - 1].temperature : '36.00'}
              <span className="text-sm ml-1 opacity-60">°C</span>
            </span>
          </div>
          <Thermometer size={28} className="text-brand-olive opacity-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Registros Recentes</h3>
            <span className="text-[10px] text-brand-muted opacity-60 italic">Clique para editar</span>
          </div>
          <div className="space-y-3">
            {recentLogs.map(l => (
              <button
                key={l.date}
                onClick={() => onAddLog(l.date)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-black/[0.03] shadow-soft hover:border-brand-olive/20 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FERTILITY_COLORS[getFertilityStatus(logs, l.date)] }} />
                  <div>
                    <p className="text-xs font-bold text-brand-text">{format(parseISO(l.date), 'dd/MM')}</p>
                    <p className="text-[9px] text-brand-muted uppercase tracking-tighter">{l.bleeding !== 'none' ? 'Fluxo ' + l.bleeding : 'Sem fluxo'}</p>
                  </div>
                </div>
                {l.temperature && <span className="text-[10px] font-bold text-brand-olive opacity-60">{l.temperature}°C</span>}
              </button>
            ))}
            {recentLogs.length === 0 && <p className="text-center py-8 text-xs text-brand-muted italic">Nenhum registro ainda.</p>}
          </div>
        </div>

        <div className="bg-brand-cream border-l-4 border-brand-terracotta p-8 rounded-2xl space-y-3 flex flex-col justify-center">
          <h4 className="text-brand-terracotta font-serif text-lg italic flex items-center gap-2">
            <Info size={20} /> Orientação
          </h4>
          {(() => {
            const insight = buildFertilityInsight(logs, today, profile.cycleLength);
            return (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-brand-terracotta/80">{insight.alert}</p>
                <p className="text-[14px] leading-relaxed text-brand-text/80 font-serif italic">{insight.reason}</p>
                {insight.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {insight.sources.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-brand-terracotta/10 rounded-full text-[9px] font-bold uppercase tracking-wider text-brand-terracotta/70">{s}</span>
                    ))}
                  </div>
                )}
                {insight.safetyNote && (
                  <p className="text-[11px] italic text-brand-muted/80 font-serif border-t border-brand-terracotta/10 pt-2 mt-1">
                    ⚠️ {insight.safetyNote}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-soft border border-brand-olive/5 flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-brand-cream rounded-full mb-2">
          <Heart size={20} className="text-brand-terracotta" />
        </div>
        <q className="text-lg font-serif italic text-brand-text leading-relaxed">{verse.text}</q>
        <cite className="text-[10px] uppercase tracking-widest font-bold text-brand-muted not-italic">— {verse.ref}</cite>
      </div>

      <div className="text-center py-8">
        <p className="text-xs text-brand-muted font-sans font-medium uppercase tracking-widest opacity-60 italic">"O amor é o dom de si."</p>
      </div>
    </div>
  );
}

// ─── PREVISÃO INTELIGENTE DO CICLO ────────────────────────────────────────────
// Usa a lógica correta: ovulação = ciclo − 14; janela fértil = 6 dias antes;
// margem de segurança ±2 dias em cada transição de fase.
type PredictedPhase = 'pred-menstrual' | 'pred-proliferative' | 'pred-ovulatory' | 'pred-luteal';

const CYCLE_SAFETY_MARGIN = 2;

function getCycleRangesLocal(cycleLength: number) {
  const ovulationDay    = cycleLength - 14;
  const fertileStart    = Math.max(6, ovulationDay - 5 - CYCLE_SAFETY_MARGIN);
  const fertileEnd      = ovulationDay + CYCLE_SAFETY_MARGIN;
  return { menstrualEnd: 4, fertileStart, fertileEnd, ovulationDay };
}

function findCycleStartsLocal(logs: DailyLog[]): string[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const starts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];
    if (log.bleeding === 'heavy' || log.bleeding === 'medium') {
      const prev = sorted[i - 1];
      const gap  = prev ? differenceInDays(parseISO(log.date), parseISO(prev.date)) : 99;
      const prevBleeding = prev && prev.bleeding && prev.bleeding !== 'none';
      if (!prevBleeding || gap > 4) {
        const lastStart = starts[starts.length - 1];
        if (!lastStart || differenceInDays(parseISO(log.date), parseISO(lastStart)) >= 18) {
          starts.push(log.date);
        }
      }
    }
  }
  return starts;
}

function calcAvgLocal(starts: string[], fallback: number): number {
  if (starts.length < 2) return fallback;
  const durations: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const d = differenceInDays(parseISO(starts[i]), parseISO(starts[i - 1]));
    if (d >= 21 && d <= 45) durations.push(d);
  }
  return durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : fallback;
}

function buildCyclePredictions(
  logs: DailyLog[],
  cycleLength: number = 28
): Record<string, PredictedPhase> {
  const cycleStarts = findCycleStartsLocal(logs);
  if (cycleStarts.length === 0) return {};

  const avgCycle  = calcAvgLocal(cycleStarts, cycleLength);
  const lastStart = cycleStarts[cycleStarts.length - 1];
  const ranges    = getCycleRangesLocal(avgCycle);
  const predictions: Record<string, PredictedPhase> = {};

  // Gerar previsões para 3 ciclos a partir do último início
  for (let cycle = 0; cycle < 3; cycle++) {
    const cycleStart = addDays(parseISO(lastStart), cycle * avgCycle);
    for (let d = 0; d < avgCycle; d++) {
      const date = format(addDays(cycleStart, d), 'yyyy-MM-dd');
      if (logs.some(l => l.date === date)) continue; // não sobrescrever dados reais
      let phase: PredictedPhase;
      if (d <= ranges.menstrualEnd) {
        phase = 'pred-menstrual';
      } else if (d >= ranges.fertileStart && d <= ranges.fertileEnd) {
        phase = 'pred-ovulatory';   // toda a janela fértil (inclui ápice) em amarelo
      } else if (d > ranges.fertileEnd) {
        phase = 'pred-luteal';
      } else {
        phase = 'pred-proliferative';
      }
      predictions[date] = phase;
    }
  }

  return predictions;
}

// ─── IA EXPLICATIVA: explica por que o dia tem aquela fertilidade ──────────────
interface FertilityInsight {
  alert: string;           // ex: "Alta fertilidade provável"
  reason: string;          // ex: "Muco elástico e sensação escorregadia detectados"
  sources: string[];       // sinais usados no cálculo
  safetyNote?: string;     // nota de responsabilidade
}

function buildFertilityInsight(
  logs: DailyLog[],
  date: string,
  cycleLength: number = 28
): FertilityInsight {
  const log = logs.find(l => l.date === date);
  const sources: string[] = [];
  let alert = '';
  let reason = '';
  let safetyNote = '';

  // Detectar subida térmica confirmada (3 dias acima da média das 6 anteriores)
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const idx = sortedLogs.findIndex(l => l.date === date);
  let thermalRiseConfirmed = false;
  let thermalInconsistency = false;

  if (idx >= 3) {
    const prev6 = sortedLogs.slice(Math.max(0, idx - 6), idx).filter(l => l.temperature);
    const last3 = sortedLogs.slice(idx - 3, idx).filter(l => l.temperature);
    if (prev6.length >= 3 && last3.length === 3) {
      const avgPrev = prev6.reduce((s, l) => s + (l.temperature || 0), 0) / prev6.length;
      const allHigh = last3.every(l => (l.temperature || 0) > avgPrev + 0.15);
      thermalRiseConfirmed = allHigh;
    }
    // Inconsistência: temperatura alta isolada entre temperaturas baixas
    if (idx >= 1 && idx < sortedLogs.length - 1 && log?.temperature) {
      const prevT = sortedLogs[idx - 1]?.temperature;
      const nextT = sortedLogs[idx + 1]?.temperature;
      if (prevT && nextT && log.temperature > prevT + 0.3 && log.temperature > nextT + 0.3) {
        thermalInconsistency = true;
      }
    }
  }

  // 1. Sangramento
  if (log?.bleeding && log.bleeding !== 'none') {
    sources.push('sangramento registrado');
    alert = 'Período menstrual';
    reason = `Fluxo ${log.bleeding === 'heavy' ? 'intenso' : log.bleeding === 'medium' ? 'moderado' : 'leve'} registrado. Fertilidade relativa baixa durante este período.`;
    safetyNote = 'Ovulação precoce é possível em ciclos curtos. Continue os registros diários.';
    return { alert, reason, sources, safetyNote };
  }

  // 2. Sinais de altíssima fertilidade
  if (log?.mucus === 'eggwhite' && log?.sensation === 'slippery') {
    sources.push('muco elástico (clara de ovo)', 'sensação escorregadia');
    alert = 'Alta fertilidade identificada';
    reason = 'Dois sinais de máxima fertilidade presentes: muco elástico e sensação escorregadia. Provável janela de ovulação ativa.';
    safetyNote = 'Período de alta chance de concepção. Se deseja evitar gravidez, recomenda-se abstinência periódica.';
    return { alert, reason, sources, safetyNote };
  }

  if (log?.mucus === 'eggwhite') {
    sources.push('muco elástico (clara de ovo)');
    alert = 'Alta fertilidade provável';
    reason = 'Muco elástico (tipo clara de ovo) detectado. Sinal de ovulação iminente ou em curso.';
    safetyNote = 'Alta chance de fertilidade. Observe também a sensação vulvar.';
    return { alert, reason, sources, safetyNote };
  }

  if (log?.sensation === 'slippery') {
    sources.push('sensação escorregadia');
    alert = 'Fertilidade elevada';
    reason = 'Sensação escorregadia detectada. Sinal importante de abertura do período fértil.';
    safetyNote = 'Considere-se fértil. Observe o muco para confirmação.';
    return { alert, reason, sources, safetyNote };
  }

  // 3. Ápice confirmado → pós-ovulatório
  const recentPeak = [...logs].filter(l => {
    const diff = differenceInDays(parseISO(date), parseISO(l.date));
    return diff > 0 && diff <= 14 && l.isPeak;
  }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];

  if (recentPeak) {
    sources.push('ápice de fertilidade confirmado');
    if (thermalRiseConfirmed) sources.push('subida térmica confirmada (3 dias)');
    const daysAfterPeak = differenceInDays(parseISO(date), parseISO(recentPeak.date));
    alert = 'Pós-ovulatório provável';
    reason = `Ápice de fertilidade registrado há ${daysAfterPeak} dia(s)${thermalRiseConfirmed ? ', com subida térmica confirmada por 3 dias consecutivos' : ''}. Fase lútea estimada.`;
    safetyNote = 'Baixo risco relativo estimado. Mantenha os registros para maior precisão.';
    return { alert, reason, sources, safetyNote };
  }

  // 4. Muco crescente
  if (log?.mucus === 'watery') {
    sources.push('muco aquoso');
    alert = 'Fertilidade crescente';
    reason = 'Muco aquoso detectado. Fertilidade em progressão — ovulação pode estar próxima.';
    safetyNote = 'Período potencialmente fértil. Observe a evolução dos próximos dias.';
    return { alert, reason, sources, safetyNote };
  }

  if (log?.mucus === 'creamy') {
    sources.push('muco cremoso');
    alert = 'Início fértil possível';
    reason = 'Muco cremoso detectado. Fertilidade começando a crescer.';
    safetyNote = 'Baixo a médio risco relativo. Continue observando.';
    return { alert, reason, sources, safetyNote };
  }

  if (log?.mucus === 'sticky') {
    sources.push('muco pegajoso');
    alert = 'Possível início fértil';
    reason = 'Muco pegajoso detectado. Possível início do período fértil.';
    safetyNote = 'Continue as observações diárias. Período ainda incerto.';
    return { alert, reason, sources, safetyNote };
  }

  // 5. Inconsistência térmica
  if (thermalInconsistency) {
    sources.push('temperatura registrada');
    alert = 'Possível inconsistência térmica';
    reason = 'A temperatura de hoje está isoladamente alta em relação aos dias adjacentes. Pode indicar fator perturbador (febre, álcool, sono insuficiente).';
    safetyNote = 'Verifique se houve fator perturbador. Este dia pode ser desconsiderado no gráfico de temperatura.';
    return { alert, reason, sources, safetyNote };
  }

  // 6. Cálculo por calendário
  const cycleStarts = findCycleStartsLocal(logs);
  if (cycleStarts.length > 0) {
    const avgCycle = calcAvgLocal(cycleStarts, cycleLength);
    const lastStart = cycleStarts[cycleStarts.length - 1];
    const dayOfCycle = differenceInDays(parseISO(date), parseISO(lastStart)) + 1; // 1-indexed
    const ranges = getCycleRangesLocal(avgCycle);
    sources.push(`histórico de ${cycleStarts.length} ciclo(s)`);
    sources.push(`ciclo médio: ${avgCycle} dias`);

    if (dayOfCycle > 0 && dayOfCycle <= avgCycle + 7) {
      const fertileStartDay = ranges.fertileStart + 1;
      const fertileEndDay   = ranges.fertileEnd + 1;
      const ovDay           = ranges.ovulationDay + 1;

      if (dayOfCycle >= fertileStartDay && dayOfCycle <= fertileEndDay) {
        alert = dayOfCycle >= ovDay - 1 && dayOfCycle <= ovDay + 1
          ? 'Ovulação provável (calendário)'
          : 'Janela fértil estimada (calendário)';
        reason = `Dia ${dayOfCycle} de um ciclo estimado em ${avgCycle} dias. Janela fértil calculada: dias ${fertileStartDay}–${fertileEndDay} (ovulação esperada no dia ${ovDay}). Inclui margem de segurança de ±2 dias.`;
        safetyNote = 'Estimativa baseada em calendário. Sinais biológicos têm prioridade. Dados insuficientes para confirmação precisa.';
      } else if (dayOfCycle > ranges.fertileEnd + 1) {
        alert = 'Pós-ovulatório estimado (calendário)';
        reason = `Dia ${dayOfCycle} do ciclo. Janela fértil estimada já passou (dias ${fertileStartDay}–${fertileEndDay}). Fase lútea provável.`;
        safetyNote = 'Baixo risco relativo estimado por calendário. Confirme com sinais biológicos.';
      } else {
        alert = 'Baixa fertilidade relativa (calendário)';
        reason = `Dia ${dayOfCycle} do ciclo — fase pré-fértil estimada. Janela fértil começa por volta do dia ${fertileStartDay}.`;
        safetyNote = 'Risco relativo baixo estimado. Continue os registros diários para maior precisão.';
      }
      return { alert, reason, sources, safetyNote };
    }
  }

  // 7. Dados insuficientes
  sources.push('nenhum sinal registrado hoje');
  alert = 'Dados insuficientes';
  reason = 'Nenhum sinal biológico registrado para este dia. Registre muco, sensação e temperatura para uma análise mais precisa.';
  safetyNote = 'Na dúvida, considere-se fértil.';
  return { alert, reason, sources, safetyNote };
}
  'pred-menstrual':     '#E08C8C',
  'pred-proliferative': '#9BB694',
  'pred-ovulatory':     '#F4D06F',
  'pred-luteal':        '#81A4CD',
};

const PRED_LABELS: Record<PredictedPhase, string> = {
  'pred-menstrual':     'Menstruação (est.)',
  'pred-proliferative': 'Infértil Inicial (est.)',
  'pred-ovulatory':     'Janela Fértil (est.)',
  'pred-luteal':        'Pós-Ovulatório (est.)',
};

// FIX 2 — CALENDÁRIO: usa format(day,'yyyy-MM-dd') para evitar bug de fuso horário
// e adiciona células vazias para alinhar o primeiro dia da semana corretamente.
function Calendar({ logs, onDateSelect, cycleLength }: { logs: DailyLog[], onDateSelect: (d: string) => void, cycleLength?: number }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // getDay(): 0=Dom,1=Seg,...,6=Sáb — alinha ao cabeçalho Dom/Seg/.../Sáb
  const firstDayOfWeek = monthStart.getDay();

  // Previsões calculadas uma vez por render (memoização simples via useMemo seria ideal,
  // mas para não alterar imports usamos direto — o cálculo é leve)
  const predictions = buildCyclePredictions(logs, cycleLength || 28);

  // Resumo do ciclo atual para exibir abaixo do calendário
  const lastMenstrualStart = findCycleStartsLocal(logs).slice(-1)[0] || null;
  const avgCycle = calcAvgLocal(findCycleStartsLocal(logs), cycleLength || 28);
  const cycleRanges = getCycleRangesLocal(avgCycle);

  // Datas absolutas das fases (a partir do último início de ciclo)
  const ovulationDateStr = lastMenstrualStart
    ? format(addDays(parseISO(lastMenstrualStart), cycleRanges.ovulationDay), 'dd/MM')
    : null;
  const fertileStartStr = lastMenstrualStart
    ? format(addDays(parseISO(lastMenstrualStart), cycleRanges.fertileStart), 'dd/MM')
    : null;
  const fertileEndStr = lastMenstrualStart
    ? format(addDays(parseISO(lastMenstrualStart), cycleRanges.fertileEnd), 'dd/MM')
    : null;
  const nextMenstruationDate = lastMenstrualStart
    ? format(addDays(parseISO(lastMenstrualStart), avgCycle), 'dd/MM/yyyy')
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-brand-text capitalize mb-1">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <p className="text-xs text-brand-muted uppercase tracking-widest font-bold">Calendário de Observação</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-black/5 text-brand-olive"><ChevronLeft size={20} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-black/5 text-brand-olive"><ChevronRight size={20} /></button>
        </div>
      </header>

      <div className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
        <div className="grid grid-cols-7 gap-2 text-center mb-6">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <span key={d} className="text-[11px] font-bold text-brand-muted uppercase tracking-widest leading-loose">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-3">
          {/* Células vazias para alinhar o primeiro dia */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}

          {days.map(day => {
            // format() usa hora local, evitando o bug de UTC que causava dia errado
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasLog = logs.some(l => l.date === dateStr);
            const status = getFertilityStatus(logs, dateStr);
            const confirmedColor = hasLog ? FERTILITY_COLORS[status] : undefined;
            const predicted = !hasLog ? predictions[dateStr] : undefined;
            const predictedColor = predicted ? PRED_COLORS[predicted] : undefined;

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(dateStr)}
                className={cn(
                  "aspect-square rounded-2xl flex items-center justify-center text-[15px] transition-all relative group",
                  isToday(day) ? "ring-2 ring-brand-olive ring-offset-4 ring-offset-white z-10" : "",
                  hasLog
                    ? "text-white shadow-lg"
                    : predicted
                    ? "border border-black/[0.03]"
                    : "bg-brand-page text-brand-text/60 border border-black/[0.03] hover:border-brand-olive/20"
                )}
                style={
                  hasLog
                    ? { backgroundColor: confirmedColor, boxShadow: `0 8px 16px ${confirmedColor}30` }
                    : predicted
                    ? { backgroundColor: `${predictedColor}28`, borderColor: `${predictedColor}40` }
                    : {}
                }
              >
                <span className={cn(
                  "font-medium",
                  hasLog ? "font-bold text-white" : predicted ? "font-sans opacity-80 text-brand-text/70" : "font-sans opacity-70"
                )}>
                  {format(day, 'd')}
                </span>
                {/* Ponto de confirmação de ápice */}
                {hasLog && logs.find(l => l.date === dateStr)?.isPeak && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-white/80 rounded-full shadow-sm border border-black/10" />
                )}
                {/* Ponto de ovulação prevista */}
                {predicted === 'pred-ovulatory' && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${predictedColor}90` }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo inteligente do ciclo */}
      {lastMenstrualStart && (
        <div className="bg-white p-6 rounded-[28px] shadow-soft border border-brand-olive/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mb-4">Previsão do Ciclo · Ciclo de {avgCycle} dias</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">Duração Est.</p>
              <p className="text-xl font-serif text-brand-olive italic">{avgCycle}<span className="text-xs ml-0.5 opacity-60">d</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">Janela Fértil</p>
              <p className="text-base font-serif text-brand-olive italic leading-tight">{fertileStartStr} – {fertileEndStr}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">Ovulação Est.</p>
              <p className="text-xl font-serif text-brand-olive italic">{ovulationDateStr}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">Próx. Ciclo</p>
              <p className="text-base font-serif text-brand-olive italic leading-tight">{nextMenstruationDate}</p>
            </div>
          </div>
          <p className="text-[9px] italic text-brand-muted/50 mt-4 font-serif text-center">
            Janela fértil calculada com margem de segurança de ±{CYCLE_SAFETY_MARGIN} dias · Baseada nos seus registros reais
          </p>
        </div>
      )}

      {/* Legenda */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted px-1">Legenda</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Confirmados */}
          {Object.entries({ 'menstrual': 'Menstruação', 'infertile': 'Infértil', 'potentially-fertile': 'Fértil', 'post-ovulatory': 'Pós-Ovulatório' }).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2 bg-white py-2 px-3 rounded-xl shadow-sm border border-black/5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: FERTILITY_COLORS[status as keyof typeof FERTILITY_COLORS] }} />
              <span className="text-[9px] text-brand-muted font-bold uppercase tracking-wider leading-tight">{label}</span>
            </div>
          ))}
          {/* Previstos */}
          {(Object.entries(PRED_LABELS) as [PredictedPhase, string][]).map(([phase, label]) => (
            <div key={phase} className="flex items-center gap-2 bg-white py-2 px-3 rounded-xl border border-black/5">
              <div className="w-3 h-3 rounded-full flex-shrink-0 border-2" style={{ backgroundColor: `${PRED_COLORS[phase]}40`, borderColor: PRED_COLORS[phase] }} />
              <span className="text-[9px] text-brand-muted font-bold uppercase tracking-wider leading-tight">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] italic text-brand-muted/60 px-1 font-serif">Dias sólidos = confirmados por você · Dias translúcidos = estimativas automáticas</p>
      </div>
    </div>
  );
}

// LOG FORM — FIX 3: opções de muco adaptadas quando há sangramento
type LogFormProps = {
  initialDate: string;
  onSave: (log: DailyLog) => void;
  onDelete: (date: string) => void;
  onCancel: () => void;
  existingLog?: DailyLog;
  selectedMethod: string;
};

function LogForm({ initialDate, onSave, onDelete, onCancel, existingLog, selectedMethod }: LogFormProps) {
  const methodInfo = METHODS.find(m => m.id === selectedMethod) || METHODS[0];
  const fields = methodInfo.requiredFields;

  const [log, setLog] = useState<DailyLog>(existingLog || {
    date: initialDate, mucus: 'none', sensation: 'not_observed', bleeding: 'none', notes: '',
  });
  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isBleeding = log.bleeding && log.bleeding !== 'none';

  // Opções de muco durante sangramento — coerentes com o período menstrual
  const mucusOptionsBleeding = [
    { id: 'none', label: 'Escasso/inexist.', desc: 'Pouco ou nenhum muco visível durante o fluxo.' },
    { id: 'dry', label: 'Seco', desc: 'Sensação de secura entre os sangramentos.' },
    { id: 'sticky', label: 'Pouco visível', desc: 'Pequena quantidade, difícil de avaliar no fluxo.' },
  ];

  // Opções de muco normais (sem sangramento)
  const mucusOptionsNormal = [
    { id: 'none', label: 'Nenhum', desc: 'Sente-se seca e não vê nada.' },
    { id: 'not_observed', label: 'Não Obs.', desc: 'Não foi possível verificar hoje.' },
    { id: 'dry', label: 'Seco', desc: 'Sensação de secura, sem umidade.' },
    { id: 'sticky', label: 'Pegajoso', desc: 'Como cola seca, quebra rápido ao esticar.' },
    { id: 'creamy', label: 'Cremoso', desc: 'Como hidratante corporal ou leite condensado.' },
    { id: 'watery', label: 'Aquoso', desc: 'Molhado, transparente, como água.' },
    { id: 'eggwhite', label: 'Elástico', desc: 'Como clara de ovo crua, estica vários cm.' },
  ];

  const mucusOptions = isBleeding ? mucusOptionsBleeding : mucusOptionsNormal;

  const sensationOptions = [
    { id: 'not_observed', label: 'Não obs.', desc: 'Sem percepção clara.' },
    { id: 'dry', label: 'Seca', desc: 'Sensação de papel ou algodão seco.' },
    { id: 'moist', label: 'Úmida', desc: 'Percepção de frescor ou umidade leve.' },
    { id: 'slippery', label: 'Escorr.', desc: 'Desliza ao caminhar ou ao passar o papel.' },
  ];

  const bleedingOptions = [
    { id: 'none', label: 'Sem fluxo', desc: 'Nada observado.' },
    { id: 'light', label: 'Leve', desc: 'Apenas manchas (spotting) ou gotas.' },
    { id: 'medium', label: 'Médio', desc: 'Fluxo moderado, exige troca normal.' },
    { id: 'heavy', label: 'Forte', desc: 'Fluxo intenso, troca frequente de absorvente.' },
  ];

  return (
    <div className="space-y-10 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-brand-olive/10 text-brand-olive rounded-lg"><CalendarIcon size={20} /></div>
            <h2 className="text-3xl font-serif text-brand-text">{format(parseISO(initialDate), "d 'de' MMMM", { locale: ptBR })}</h2>
          </div>
          <p className="text-xs text-brand-muted uppercase tracking-widest font-bold translate-x-[52px]">Registro Diário: {methodInfo.name}</p>
        </div>
        <button onClick={() => setActiveHelp(activeHelp ? null : 'general')} className="p-3 bg-brand-cream text-brand-olive rounded-full hover:bg-brand-olive hover:text-white transition-all shadow-sm">
          <Info size={20} />
        </button>
      </header>

      {activeHelp && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-brand-cream/50 p-6 rounded-3xl border border-brand-olive/10 text-xs text-brand-text/70 italic leading-relaxed space-y-3 font-serif">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold uppercase tracking-widest text-brand-olive">Guia de Observação</span>
            <button onClick={() => setActiveHelp(null)} className="text-brand-muted hover:text-brand-text">Fechar</button>
          </div>
          {fields.includes('temperature') && <p><strong>Dica de Temperatura:</strong> Meça logo ao abrir os olhos, sem sentar ou falar. O termômetro deve ficar na mesma posição todos os dias.</p>}
          {fields.includes('mucus') && <p><strong>Dica de Muco:</strong> Observe ao usar o banheiro. Passe o papel de frente para trás antes e depois de urinar. Sinta a textura entre os dedos.</p>}
          {fields.includes('sensation') && <p><strong>Dica de Sensação:</strong> É o que você sente na vulva "por fora" ao longo do dia, não por dentro.</p>}
        </motion.div>
      )}

      <div className="space-y-12">
        {fields.includes('bleeding') && (
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">1. Sangramento</label>
              <span className="text-[10px] italic text-brand-muted opacity-60">Escolha a intensidade</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {bleedingOptions.map(opt => (
                <button key={opt.id} onClick={() => setLog({ ...log, bleeding: opt.id as any })}
                  className={cn("px-5 py-3 rounded-full text-xs font-medium transition-all border flex flex-col items-center gap-0.5",
                    log.bleeding === opt.id ? "bg-brand-terracotta text-white border-transparent shadow-md" : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10")}>
                  <span>{opt.label}</span>
                  {log.bleeding === opt.id && <span className="text-[8px] opacity-80">{opt.desc}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {fields.includes('mucus') && (
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">2. Muco Cervical</label>
              <span className="text-[10px] italic text-brand-muted opacity-60">{isBleeding ? 'Durante o sangramento' : 'Aparência visual'}</span>
            </div>
            {isBleeding && (
              <p className="text-[10px] text-brand-terracotta/80 italic font-serif bg-brand-terracotta/5 px-4 py-2 rounded-xl border border-brand-terracotta/10">
                Durante o sangramento, observe se há muco visível além do fluxo.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mucusOptions.map(opt => (
                <button key={opt.id} onClick={() => setLog({ ...log, mucus: opt.id as any })}
                  className={cn("px-4 py-3 rounded-2xl text-xs font-medium transition-all border text-center flex flex-col gap-1 items-center justify-center min-h-[64px]",
                    log.mucus === opt.id ? "bg-brand-olive text-white border-transparent shadow-md" : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10 shadow-sm")}>
                  <span>{opt.label}</span>
                  {log.mucus === opt.id && <span className="text-[9px] leading-tight opacity-80">{opt.desc}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {fields.includes('sensation') && (
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">3. Sensação Vulvar</label>
              <span className="text-[10px] italic text-brand-muted opacity-60">Percepção ao longo do dia</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sensationOptions.map(opt => (
                <button key={opt.id} onClick={() => setLog({ ...log, sensation: opt.id as any })}
                  className={cn("px-3 py-4 rounded-2xl text-xs font-medium transition-all border text-center flex flex-col gap-1 items-center justify-center min-h-[64px]",
                    log.sensation === opt.id ? "bg-brand-olive text-white border-transparent shadow-md" : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10 shadow-sm")}>
                  <span>{opt.label}</span>
                  {log.sensation === opt.id && <span className="text-[9px] leading-tight opacity-80">{opt.desc}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {fields.includes('temperature') && (
            <section className="space-y-4">
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">4. Temperatura Basal</label>
              <div className="relative group">
                <input type="number" step="0.01" value={log.temperature || ''} onChange={(e) => setLog({ ...log, temperature: parseFloat(e.target.value) })} placeholder="00.00"
                  className="w-full bg-transparent text-4xl font-light py-2 border-b-2 border-dashed border-brand-muted/30 focus:border-brand-olive focus:outline-none transition-colors italic text-brand-olive" />
                <span className="absolute right-0 bottom-3 text-lg text-brand-muted opacity-50">°C</span>
              </div>
            </section>
          )}
          {fields.includes('isPeak') && (
            <section className="group space-y-4">
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">5. Ápice & Estado</label>
              <div onClick={() => setLog({ ...log, isPeak: !log.isPeak })}
                className={cn("flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer select-none",
                  log.isPeak ? "bg-brand-olive/5 border-brand-olive/20" : "bg-white border-black/[0.05] hover:border-black/10")}>
                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", log.isPeak ? "bg-brand-olive border-brand-olive" : "border-black/10")}>
                  {log.isPeak && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                </div>
                <span className={cn("text-xs font-medium tracking-wide", log.isPeak ? "text-brand-olive" : "text-brand-muted")}>Confirmar Ápice de Fertilidade</span>
              </div>
            </section>
          )}
        </div>

        {fields.includes('notes') && (
          <section className="space-y-4">
            <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">6. Notas & Reflexões (Espiritual/Emocional)</label>
            <textarea value={log.notes || ''} onChange={(e) => setLog({ ...log, notes: e.target.value })} placeholder="Como você se sente hoje? Houve oração em casal? Algum fator perturbador?"
              className="w-full h-32 p-6 bg-white rounded-3xl border border-black/5 focus:ring-2 ring-brand-olive/10 focus:outline-none text-sm text-brand-text italic font-serif leading-relaxed"></textarea>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-4 pt-8 border-t border-black/5">
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 text-brand-muted font-bold uppercase tracking-widest text-[11px] hover:text-brand-text transition-colors">Cancelar</button>
          <button onClick={() => onSave(log)} className="flex-[2] py-5 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-brand-olive/10 hover:translate-y-[-1px] transition-all">
            {existingLog ? 'Atualizar Entrada' : 'Salvar Entrada'}
          </button>
        </div>
        {existingLog && (
          <div className="pt-4 border-t border-dotted border-black/5">
            {!showConfirmDelete ? (
              <button onClick={() => setShowConfirmDelete(true)} className="w-full py-4 text-brand-terracotta font-bold uppercase tracking-[0.1em] text-[10px] hover:bg-brand-terracotta/5 rounded-xl transition-all">
                Excluir Registro Permanente
              </button>
            ) : (
              <div className="flex items-center justify-between p-4 bg-brand-terracotta/5 rounded-2xl">
                <span className="text-[10px] font-bold text-brand-terracotta uppercase">Tem certeza?</span>
                <div className="flex gap-4">
                  <button onClick={() => setShowConfirmDelete(false)} className="text-[10px] font-bold text-brand-muted uppercase">Infelizmente não</button>
                  <button onClick={() => onDelete(initialDate)} className="text-[10px] font-bold text-brand-terracotta uppercase underline underline-offset-4">Sim, excluir</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// REPORTS
function Reports({ logs, profile }: { logs: DailyLog[], profile: UserProfile }) {
  const chartData = logs.slice(-30).map(log => ({
    ...log,
    mucusValue: MUCUS_VALUES[log.mucus] || 0,
    temp: log.temperature || null,
    status: getFertilityStatus(logs, log.date)
  }));

  const downloadICS = () => {
    const blob = new Blob([generateICS(logs)], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'ciclo_gracavida.ics');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadCSV = () => {
    const headers = ['Data', 'Temperatura', 'Muco', 'Sensação', 'Sangramento', 'Ápice', 'Notas'];
    const rows = logs.map(l => [l.date, l.temperature || '', l.mucus, l.sensation, l.bleeding, l.isPeak ? 'Sim' : 'Não', (l.notes || '').replace(/,/g, ';')]);
    const blob = new Blob([[headers, ...rows].map(e => e.join(",")).join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'historico_gracavida.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-3xl font-serif text-brand-text mb-2">Relatórios & Evolução</h2>
        <p className="text-sm text-brand-muted italic font-serif opacity-80">Análise profunda do seu ciclo e métodos</p>
      </header>

      <section className="bg-white p-6 rounded-3xl shadow-soft border border-brand-olive/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-brand-olive">Gráfico de Evolução (30 dias)</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-olive" /><span className="text-[9px] font-bold uppercase tracking-tighter text-brand-muted">Temperatura</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-terracotta" /><span className="text-[9px] font-bold uppercase tracking-tighter text-brand-muted">Muco/Aparência</span></div>
          </div>
        </div>
        <div className="h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#7A7A75' }} tickFormatter={(str) => format(parseISO(str), 'dd/MM')} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 9, fill: '#7A7A75' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 5]} hide />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px' }} labelFormatter={(v) => format(parseISO(v), 'dd/MM/yyyy')} />
              <Bar yAxisId="right" dataKey="mucusValue" radius={[4, 4, 0, 0]} barSize={12}>
                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={FERTILITY_COLORS[entry.status] || '#eee'} />)}
              </Bar>
              <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#5A5A40" strokeWidth={3} dot={{ r: 4, fill: '#5A5A40', strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
              {chartData.map((d, i) => d.isPeak && <ReferenceLine key={`peak-${i}`} yAxisId="left" x={d.date} stroke="rgba(198, 123, 92, 0.4)" strokeDasharray="3 3" label={{ position: 'top', value: 'ÁPICE', fontSize: 8, fill: '#C67B5C', fontWeight: 'bold' }} />)}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-brand-olive/5 text-brand-olive rounded-xl"><BarChart3 size={18} /></div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text">Histórico de Métodos</h3>
          </div>
          <div className="space-y-6">
            {profile.methodHistory?.slice().reverse().map((h, i) => {
              const method = METHODS.find(m => m.id === h.methodId);
              return (
                <div key={i} className="flex items-start justify-between group">
                  <div className="flex gap-4">
                    <div className="w-1 h-10 bg-brand-olive/10 group-hover:bg-brand-olive transition-colors rounded-full mt-1" />
                    <div>
                      <p className="text-sm font-bold text-brand-text">{method?.name || h.methodId}</p>
                      <p className="text-[10px] text-brand-muted italic mt-0.5">Iniciado em {format(parseISO(h.startDate), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  {i === 0 && <span className="px-2 py-1 bg-brand-olive text-white rounded-md text-[8px] font-bold uppercase tracking-tighter">Atual</span>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-brand-olive p-10 rounded-[40px] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><BarChart3 size={120} /></div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-8">Exportação & Integração</h3>
          <div className="grid grid-cols-1 gap-4 relative z-10">
            <button onClick={downloadICS} className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/5">
              <div className="text-left"><p className="text-sm font-bold">Calendário Personalizado</p><p className="text-[10px] opacity-60 mt-1">Sincronizar com Smartphone/PC</p></div>
              <CalendarIcon size={20} />
            </button>
            <button onClick={downloadCSV} className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/5">
              <div className="text-left"><p className="text-sm font-bold">Base de Dados (CSV)</p><p className="text-[10px] opacity-60 mt-1">Exportar histórico completo</p></div>
              <Droplets size={20} />
            </button>
            <button onClick={() => window.print()} className="flex items-center justify-between p-5 bg-white text-brand-olive rounded-2xl hover:bg-brand-cream transition-all shadow-lg">
              <div className="text-left"><p className="text-sm font-bold">Relatório PDF</p><p className="text-[10px] opacity-60 mt-1">Preparar para profissional de saúde</p></div>
              <BookOpen size={20} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// =====================================================
// FIX 4-10: ABA APRENDER — Acordeão + Módulos Visuais
// =====================================================

function AccordionItem({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-2xl border transition-all overflow-hidden", open ? "border-brand-olive/20 bg-brand-olive/[0.03]" : "border-black/[0.05] bg-white")}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <span className="flex items-center gap-3 text-sm font-bold text-brand-text">
          <span className="text-lg">{icon}</span>{title}
        </span>
        <ChevronDown size={16} className={cn("text-brand-muted transition-transform duration-300", open ? "rotate-180 text-brand-olive" : "")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-6 pb-6 text-sm text-brand-text/70 font-serif italic leading-relaxed space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GracaVidaContent({ method }: { method: typeof METHODS[0] }) {
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [stepDay, setStepDay] = useState(0);

  const tutorialDays = [
    { title: "Dia 1 — Como Iniciar", desc: "O Dia 1 é o primeiro dia de sangramento verdadeiro (não apenas manchas). Registre no app o fluxo e comece a observar. Ore com seu esposo e peçam discernimento para essa nova jornada." },
    { title: "Dia 2 — Observando o Fluxo", desc: "Continue registrando o sangramento. Durante a menstruação, observe se há muco visível além do fluxo. As opções 'Escasso/inexistente', 'Seco' e 'Pouco visível' estão disponíveis no registro." },
    { title: "Dia 3 — Como Medir a Temperatura", desc: "Antes de levantar, antes de falar e após pelo menos 5h de sono, coloque o termômetro sob a língua. Aguarde o sinal sonoro. Anote a temperatura no app logo em seguida." },
    { title: "Dia 4 — Observando o Muco", desc: "Após o fluxo cessar, comece a observar o muco ao usar o banheiro. Passe papel higiênico branco de frente para trás. Note cor, textura e se estica entre os dedos." },
    { title: "Dia 5 — Sensação Vulvar", desc: "Ao longo do dia, perceba a sensação 'por fora' da vulva: seca, úmida ou escorregadia? Esta sensação é um dos sinais mais importantes e não depende de ver o muco." },
    { title: "Dia 6 em diante — Constância", desc: "Repita todos os dias: temperatura ao acordar, muco e sensação ao longo do dia. Registre sempre o sinal mais fértil observado. Com o tempo, você reconhecerá seu padrão." },
  ];

  if (showStepByStep) {
    return (
      <div className="space-y-6">
        <button onClick={() => setShowStepByStep(false)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline">
          <ChevronLeft size={14} /> Voltar
        </button>
        <div className="bg-white p-8 rounded-[32px] shadow-soft border border-brand-olive/5">
          <h3 className="text-xl font-serif text-brand-olive italic mb-1">📘 Aprenda Passo a Passo</h3>
          <p className="text-xs text-brand-muted uppercase tracking-widest font-bold mb-8">Tutorial Progressivo</p>
          <div className="flex gap-1 mb-8 flex-wrap">
            {tutorialDays.map((_, i) => (
              <button key={i} onClick={() => setStepDay(i)} className={cn("h-2 rounded-full transition-all", stepDay === i ? "w-8 bg-brand-olive" : "w-2 bg-brand-olive/20")} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={stepDay} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              <h4 className="text-lg font-serif text-brand-text italic">{tutorialDays[stepDay].title}</h4>
              <p className="text-[15px] text-brand-text/70 leading-relaxed font-serif italic">{tutorialDays[stepDay].desc}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-4 mt-10">
            <button disabled={stepDay === 0} onClick={() => setStepDay(s => s - 1)} className="flex-1 py-4 rounded-xl border border-black/10 text-xs font-bold uppercase tracking-widest text-brand-muted disabled:opacity-30">Anterior</button>
            <button disabled={stepDay === tutorialDays.length - 1} onClick={() => setStepDay(s => s + 1)} className="flex-[2] py-4 rounded-xl bg-brand-olive text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">Próximo</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center mb-2">
        <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">Fundamentado por</span>
        <h3 className="text-2xl font-serif text-brand-olive italic leading-tight">{method.name}</h3>
        <p className="text-xs text-brand-muted font-bold uppercase tracking-widest mt-1">{method.author}</p>
        <div className="mt-4 px-4 py-1.5 bg-brand-olive/5 rounded-full border border-brand-olive/10">
          <span className="text-[10px] font-bold text-brand-olive uppercase tracking-widest">Eficácia: {method.accuracy}</span>
        </div>
      </div>

      <div className="bg-brand-cream/50 border border-brand-olive/10 p-6 rounded-2xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mb-2">Nossa História</p>
        <p className="text-[15px] text-brand-text/70 leading-relaxed font-serif italic">{method.history}</p>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand-text mb-1 border-b border-black/5 pb-2 flex items-center gap-2">
          <span>🌿</span> Como Funciona o Método
        </h4>
        <p className="text-[13px] text-brand-text/60 italic font-serif leading-relaxed mt-3 mb-4">
          O Método Graça & Vida integra observação do ciclo feminino, acompanhamento dos sinais de fertilidade e discernimento do casal, promovendo uma vivência responsável e aberta à vida.
        </p>
      </div>

      <div className="space-y-3">
        <AccordionItem icon="🌡️" title="Temperatura Basal">
          <div className="space-y-3">
            <div><p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-1">O que é</p><p>Temperatura do corpo em repouso absoluto, medida ao acordar.</p></div>
            <div>
              <p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-1">Como medir</p>
              <ul className="space-y-1 list-none"><li>• Antes de levantar</li><li>• Antes de falar</li><li>• Após pelo menos 5h de sono</li><li>• Sempre no mesmo horário</li></ul>
            </div>
            <div>
              <p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-1">Evolução normal</p>
              <ul className="space-y-1 list-none"><li>• Antes da ovulação: mais baixa</li><li>• Após ovulação: sobe entre 0,2°C e 0,5°C</li><li>• Antes da menstruação: pode cair novamente</li></ul>
            </div>
            <div className="bg-brand-terracotta/5 border border-brand-terracotta/10 rounded-xl p-3 not-italic">
              <p className="font-bold text-brand-terracotta text-[10px] uppercase tracking-wider mb-1">Atenção</p>
              <p className="text-brand-text/70">Febre, álcool, insônia e estresse podem alterar os resultados.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem icon="💧" title="Muco Cervical">
          <div className="space-y-3">
            <div>
              <p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-1">O que observar</p>
              <ul className="space-y-1 list-none"><li>• Sensação vulvar</li><li>• Papel higiênico</li><li>• Secreção visível</li></ul>
            </div>
            <div>
              <p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-2">Tipos de muco</p>
              <div className="space-y-2">
                {[{ label: 'Seco', desc: 'Baixa fertilidade relativa.' }, { label: 'Pegajoso', desc: 'Possível início fértil.' }, { label: 'Cremoso', desc: 'Fertilidade aumentando.' }, { label: 'Aquoso', desc: 'Alta fertilidade.' }, { label: 'Clara de ovo', desc: 'Pico fértil provável.' }].map(t => (
                  <div key={t.label} className="flex justify-between items-center p-2 bg-white rounded-lg border border-black/5">
                    <span className="font-bold not-italic text-brand-text/80 text-xs">{t.label}</span>
                    <span className="text-[10px] text-brand-muted">{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem icon="👩" title="Sensação Vulvar">
          <div className="space-y-3">
            <div>
              <p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-1">Sensações comuns</p>
              <ul className="space-y-1 list-none"><li>• Seca → infertilidade relativa</li><li>• Úmida → fertilidade crescente</li><li>• Escorregadia → alta fertilidade</li></ul>
            </div>
            <div><p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mb-1">Como observar</p><p>Perceber a sensação ao caminhar e durante o dia.</p></div>
          </div>
        </AccordionItem>

        <AccordionItem icon="📅" title="Como Marcar o Ciclo">
          <div className="space-y-2">
            <p><strong className="not-italic text-brand-text/80">Dia 1:</strong> Primeiro dia de sangramento verdadeiro.</p>
            <p className="font-bold not-italic text-brand-text/80 text-[11px] uppercase tracking-wider mt-2 mb-1">Registrar diariamente:</p>
            <ul className="space-y-1 list-none"><li>• Temperatura</li><li>• Muco</li><li>• Sensação</li><li>• Sangramento</li><li>• Sintomas</li></ul>
          </div>
        </AccordionItem>

        <AccordionItem icon="❤️" title="Discernimento do Casal">
          <div className="space-y-2">
            <p>O Método Graça & Vida une ciência e espiritualidade. O casal é convidado a:</p>
            <ul className="space-y-1 list-none"><li>• Manter diálogo aberto e amoroso</li><li>• Agir com responsabilidade mútua</li><li>• Orar juntos no momento do registro</li><li>• Acolher com abertura os planos de Deus</li></ul>
          </div>
        </AccordionItem>
      </div>

      {/* Ciclos regulares / irregulares */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-black/[0.05] shadow-soft space-y-2">
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-olive">📈 Ciclos Regulares</h5>
          <p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">Ovulação costuma ocorrer entre 12º e 16º dia. Confirmar sempre pelos sinais biológicos.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/[0.05] shadow-soft space-y-2">
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-olive">🔄 Ciclos Irregulares</h5>
          <p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">Não prever apenas por calendário. Priorizar observação diária do muco e temperatura.</p>
        </div>
      </div>

      {/* Dicas práticas em cards visuais */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2">💡 Dicas Práticas Importantes</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🌡️', title: 'Temperatura', desc: 'Use termômetro com duas casas decimais.' },
            { icon: '⏰', title: 'Horário', desc: 'Meça sempre em horário parecido.' },
            { icon: '🛌', title: 'Sono', desc: 'Durma pelo menos 5h contínuas antes.' },
            { icon: '💧', title: 'Muco', desc: 'Observe várias vezes ao dia.' },
            { icon: '👩', title: 'Sensação', desc: 'A lubrificação é um sinal essencial.' },
            { icon: '⚠️', title: 'Atenção', desc: 'Estresse e febre alteram o ciclo.' },
            { icon: '📖', title: 'Constância', desc: 'Registre os sinais todos os dias.' },
            { icon: '❤️', title: 'Prudência', desc: 'Na dúvida, considere-se fértil.' },
          ].map(tip => (
            <div key={tip.title} className="bg-white p-4 rounded-2xl border border-black/[0.04] shadow-soft flex flex-col gap-1.5">
              <span className="text-xl">{tip.icon}</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-olive">{tip.title}</p>
              <p className="text-[10px] text-brand-muted font-sans italic leading-tight">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interpretando os sinais */}
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2">🎨 Interpretando os Sinais</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { color: '#9BB694', label: 'Baixa fertilidade relativa' },
            { color: '#F4D06F', label: 'Fertilidade possível' },
            { color: '#E08C8C', label: 'Alta fertilidade' },
            { color: '#81A4CD', label: 'Pós-ovulatório provável' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-black/[0.04] shadow-soft text-center">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: item.color }} />
              <p className="text-[10px] text-brand-text/70 font-sans leading-tight">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Botão passo a passo */}
      <button
        onClick={() => setShowStepByStep(true)}
        className="w-full py-5 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-brand-olive/10 hover:translate-y-[-1px] transition-all flex items-center justify-center gap-3"
      >
        <BookOpen size={18} />
        📘 Aprender Passo a Passo
      </button>
    </div>
  );
}

function Education() {
  const [selectedMethod, setSelectedMethod] = useState(METHODS[0]);
  const [showDoctrine, setShowDoctrine] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  if (showDoctrine) {
    return (
      <div className="space-y-6">
        <button onClick={() => setShowDoctrine(false)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline mb-4">
          <ChevronLeft size={16} /> Voltar para Métodos
        </button>
        <Doctrine />
      </div>
    );
  }
  if (showSimulator) {
    return (
      <div className="space-y-6">
        <button onClick={() => setShowSimulator(false)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline mb-4">
          <ChevronLeft size={16} /> Voltar para Aprender
        </button>
        <CycleSimulator />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-serif text-brand-text mb-2">Sabedoria e Ciência</h2>
          <p className="text-sm text-brand-muted italic font-serif opacity-80">Compreenda a linguagem do seu corpo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSimulator(true)} className="p-4 bg-brand-cream/50 border border-brand-olive/10 shadow-soft rounded-2xl flex flex-col items-center gap-1 group">
            <BarChart3 size={20} className="text-brand-terracotta group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Simulador</span>
          </button>
          <button onClick={() => setShowDoctrine(true)} className="p-4 bg-white border border-brand-olive/5 shadow-soft rounded-2xl flex flex-col items-center gap-1 group">
            <ShieldCheck size={20} className="text-brand-olive group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Doutrina</span>
          </button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-none scroll-smooth">
        {METHODS.map(m => (
          <button key={m.id} onClick={() => setSelectedMethod(m)}
            className={cn("px-5 py-2.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-[0.15em] border",
              selectedMethod.id === m.id ? "bg-brand-olive text-white border-transparent shadow-md" : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10")}>
            {m.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selectedMethod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white p-10 rounded-[40px] shadow-soft border border-brand-olive/5">
          {selectedMethod.id === 'gracavida' ? (
            <GracaVidaContent method={selectedMethod} />
          ) : (
            <div className="space-y-10 max-w-2xl mx-auto">
              <div className="mb-10 flex flex-col items-center text-center">
                <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">Fundamentado por</span>
                <h3 className="text-2xl font-serif text-brand-olive italic leading-tight">{selectedMethod.name}</h3>
                <p className="text-xs text-brand-muted font-bold uppercase tracking-widest mt-1">{selectedMethod.author}</p>
                <div className="mt-4 px-4 py-1.5 bg-brand-olive/5 rounded-full border border-brand-olive/10">
                  <span className="text-[10px] font-bold text-brand-olive uppercase tracking-widest">Eficácia: {selectedMethod.accuracy}</span>
                </div>
              </div>
              <section>
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2"><Info size={14} className="text-brand-terracotta" /> Nossa História</h4>
                <p className="text-[15px] text-brand-text/70 leading-relaxed font-serif italic">{selectedMethod.history}</p>
              </section>
              <section>
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2"><BookOpen size={14} className="text-brand-terracotta" /> Como fazer corretamente</h4>
                <p className="text-[15px] text-brand-text/70 leading-relaxed font-serif italic mb-6">{selectedMethod.description}</p>
                <ul className="space-y-6">
                  {selectedMethod.steps.map((s, i) => (
                    <li key={i} className="flex gap-4 text-sm text-brand-text/80 leading-relaxed italic">
                      <span className="text-brand-terracotta font-serif font-bold text-lg">{i + 1}.</span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-brand-page/30 p-8 rounded-3xl border border-black/5">
                <div><h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-olive mb-3">Ciclos Regulares</h5><p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">{selectedMethod.regularCycleAdvice}</p></div>
                <div><h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-olive mb-3">Ciclos Irregulares</h5><p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">{selectedMethod.irregularCycleAdvice}</p></div>
              </section>
              <section>
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2"><Heart size={14} className="text-brand-terracotta" /> Dicas Práticas</h4>
                <div className="grid grid-cols-1 gap-3">
                  {selectedMethod.tips.map((tip, i) => <div key={i} className="p-4 bg-brand-cream/40 rounded-2xl border border-brand-olive/5 text-xs text-brand-text/70 font-serif italic">{tip}</div>)}
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CycleSimulator() {
  const [scenario, setScenario] = useState<'regular' | 'irregular' | 'stress'>('regular');
  const [simulatedLogs, setSimulatedLogs] = useState<DailyLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const scenarios = {
    regular: {
      name: 'Ciclo Regular', desc: '28 dias com ovulação no dia 14. Padrão clássico de livro-texto.',
      generate: () => {
        const logs: DailyLog[] = [];
        const baseDate = new Date();
        for (let i = 0; i < 28; i++) {
          const date = addDays(baseDate, i).toISOString().split('T')[0];
          let mucus = 'none', sensation = 'dry', bleeding = 'none';
          let temp = 36.2 + (Math.random() * 0.1);
          if (i < 5) bleeding = i === 0 ? 'heavy' : (i < 3 ? 'medium' : 'light');
          else if (i >= 8 && i <= 13) { mucus = i < 11 ? 'sticky' : (i < 13 ? 'watery' : 'eggwhite'); sensation = i < 11 ? 'moist' : 'slippery'; }
          else if (i >= 14) temp += 0.4 + (Math.random() * 0.1);
          logs.push({ date, mucus: mucus as any, sensation: sensation as any, bleeding: bleeding as any, temperature: parseFloat(temp.toFixed(2)), isPeak: i === 13, notes: `Simulação dia ${i + 1}` });
        }
        return logs;
      }
    },
    irregular: {
      name: 'Ciclo Longo/Irregular', desc: '35 dias. Ovulação mais tarde (dia 21). Variação hormonal natural.',
      generate: () => {
        const logs: DailyLog[] = [];
        const baseDate = new Date();
        for (let i = 0; i < 35; i++) {
          const date = addDays(baseDate, i).toISOString().split('T')[0];
          let mucus = 'none', sensation = 'dry', bleeding = 'none';
          let temp = 36.1 + (Math.random() * 0.1);
          if (i < 5) bleeding = 'medium';
          else if (i >= 15 && i <= 20) { mucus = i < 18 ? 'sticky' : 'eggwhite'; sensation = 'slippery'; }
          else if (i >= 21) temp += 0.5;
          logs.push({ date, mucus: mucus as any, sensation: sensation as any, bleeding: bleeding as any, temperature: parseFloat(temp.toFixed(2)), isPeak: i === 20, notes: `Simulação dia ${i + 1}` });
        }
        return logs;
      }
    },
    stress: {
      name: 'Impacto de Estresse', desc: 'Ovulação atrasada pelo estresse. O corpo prioriza sobrevivência.',
      generate: () => {
        const logs: DailyLog[] = [];
        const baseDate = new Date();
        for (let i = 0; i < 32; i++) {
          const date = addDays(baseDate, i).toISOString().split('T')[0];
          let mucus = 'none', sensation = 'dry';
          let temp = 36.3;
          if (i >= 18 && i <= 22) { mucus = 'eggwhite'; sensation = 'slippery'; }
          else if (i >= 23) temp += 0.4;
          logs.push({ date, mucus: mucus as any, sensation: sensation as any, bleeding: 'none', temperature: parseFloat(temp.toFixed(2)), isPeak: i === 22, notes: `Estresse até o dia 15` });
        }
        return logs;
      }
    }
  };

  useEffect(() => { setSimulatedLogs(scenarios[scenario].generate()); setCurrentStep(0); }, [scenario]);
  const currentLog = simulatedLogs[currentStep];

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h2 className="text-3xl font-serif text-brand-text mb-2">Simulador de Ciclo</h2>
        <p className="text-sm text-brand-muted italic font-serif">Aprenda a interpretar sinais em diferentes cenários</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map(s => (
          <button key={s} onClick={() => setScenario(s)}
            className={cn("p-6 rounded-3xl border transition-all text-left space-y-2", scenario === s ? "bg-brand-olive text-white border-transparent shadow-lg" : "bg-white text-brand-muted border-black/5 hover:border-brand-olive/20 shadow-soft")}>
            <p className="text-xs font-bold uppercase tracking-widest">{scenarios[s].name}</p>
            <p className={cn("text-[10px] leading-relaxed", scenario === s ? "opacity-90" : "opacity-60")}>{scenarios[s].desc}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-soft border border-black/5 space-y-10">
          <div className="flex justify-between items-center bg-brand-page/50 p-6 rounded-2xl">
            <button disabled={currentStep === 0} onClick={() => setCurrentStep(p => p - 1)} className="p-3 bg-white rounded-full shadow-sm disabled:opacity-30"><ChevronLeft size={20} /></button>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Dia do Ciclo</p>
              <p className="text-4xl font-serif text-brand-olive italic">{currentStep + 1}</p>
              <p className="text-[9px] text-brand-muted">de {simulatedLogs.length}</p>
            </div>
            <button disabled={currentStep === simulatedLogs.length - 1} onClick={() => setCurrentStep(p => p + 1)} className="p-3 bg-white rounded-full shadow-sm disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[['Muco', currentLog?.mucus], ['Basal', `${currentLog?.temperature}°C`], ['Fluxo', currentLog?.bleeding]].map(([label, val]) => (
              <div key={label as string} className="p-5 bg-brand-cream/30 rounded-2xl border border-brand-olive/5 text-center">
                <span className="text-[9px] font-bold text-brand-muted uppercase block mb-2">{label as string}</span>
                <span className="text-xs font-serif italic text-brand-olive">{val as string}</span>
              </div>
            ))}
          </div>
          <div className="h-64 bg-brand-page/20 rounded-3xl p-6 border border-black/5">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={simulatedLogs}>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return <div className="bg-white p-3 rounded-xl shadow-xl border border-black/5 text-[10px]"><p className="font-bold">Dia {simulatedLogs.indexOf(d) + 1}</p><p className="italic text-brand-olive">{d.temperature}°C</p><p className="text-brand-muted uppercase tracking-tighter">{d.mucus}</p></div>;
                  }
                  return null;
                }} />
                <Bar dataKey={(d) => MUCUS_VALUES[d.mucus]} barSize={20} radius={[4, 4, 0, 0]}>
                  {simulatedLogs.map((entry, index) => <Cell key={index} fill={FERTILITY_COLORS[getFertilityStatus(simulatedLogs, entry.date)]} opacity={index === currentStep ? 1 : 0.3} />)}
                </Bar>
                <Line type="monotone" dataKey="temperature" stroke="#5A5A40" strokeWidth={2} dot={false} strokeDasharray="5 5" opacity={0.5} />
                <ReferenceLine x={simulatedLogs[currentStep]?.date} stroke="#C67B5C" strokeWidth={2} strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-brand-terracotta/5 p-8 rounded-[32px] border border-brand-terracotta/10 space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-terracotta"><ShieldCheck size={16} /> Análise do Dia</h4>
            <p className="text-[15px] font-serif italic leading-relaxed text-brand-text/80">
              {currentLog?.isPeak && "Momento do Ápice: O dia com os sinais mais férteis (muco elástico e sensação escorregadia)."}
              {currentLog?.bleeding !== 'none' && "Início do Ciclo: A menstruação marca o Dia 1. É um tempo de repouso e limpeza do endométrio."}
              {currentStep > 0 && currentLog?.temperature > simulatedLogs[currentStep - 1]?.temperature + 0.3 && "Salto Térmico: O aumento súbito da temperatura confirma que a ovulação já ocorreu."}
              {!currentLog?.isPeak && currentLog?.bleeding === 'none' && currentLog?.mucus !== 'none' && "Fase Fértil: O estrogênio produz muco para preparar o caminho dos espermatozoides."}
              {!currentLog?.isPeak && currentLog?.bleeding === 'none' && currentLog?.mucus === 'none' && (currentStep < 10 ? "Fase Infértil Inicial: Dias secos após a menstruação." : "Fase Lútea: Infertilidade absoluta após a subida confirmada da temperatura.")}
            </p>
          </div>
          <div className="bg-white p-8 rounded-[32px] shadow-soft border border-black/5 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Dica de Aprendizado</h4>
            <p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">Use os botões para ver como os gráficos mudam dia após dia. Observe a relação entre muco (barras coloridas) e temperatura (linha pontilhada).</p>
            <button onClick={() => setCurrentStep(Math.max(0, simulatedLogs.findIndex(l => l.isPeak)))} className="text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline">Ir para o Ápice</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Profile({ logs, profile, onUpdate, onClear }: { logs: DailyLog[], profile: UserProfile, onUpdate: (u: Partial<UserProfile>) => void, onClear: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col items-center">
        <div className="relative group cursor-pointer" onClick={() => setIsEditing(!isEditing)}>
          <div className="w-32 h-32 bg-brand-cream rounded-full flex items-center justify-center p-1 border border-black/5 shadow-soft overflow-hidden group-hover:scale-95 transition-transform duration-500">
            <div className="w-full h-full bg-brand-olive rounded-full flex items-center justify-center"><User size={48} className="text-white opacity-80" /></div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-black/5"><Heart size={18} className="text-brand-terracotta" fill="#C67B5C" /></div>
        </div>
        <div className="text-center mt-6">
          <h2 className="text-3xl font-serif text-brand-text mb-1 italic">{profile.name}</h2>
          <p className="text-xs text-brand-muted uppercase tracking-[0.2em] font-bold">{logs.length} dias de história e vida</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-8">
        <section className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
          <header className="flex items-center justify-between mb-8">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-text">Dados Pessoais & Biometria</h3>
            <button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline">{isEditing ? 'Salvar' : 'Editar'}</button>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Nome Completo', type: 'text', value: profile.name, onChange: (v: string) => onUpdate({ name: v }) },
              { label: 'Altura (cm)', type: 'number', value: profile.height || '', onChange: (v: string) => onUpdate({ height: parseInt(v) }) },
              { label: 'Peso (kg)', type: 'number', value: profile.weight || '', onChange: (v: string) => onUpdate({ weight: parseFloat(v) }) },
              { label: 'Duração do Ciclo (Méd.)', type: 'number', value: profile.cycleLength || '', onChange: (v: string) => onUpdate({ cycleLength: parseInt(v) }) },
            ].map(f => (
              <div key={f.label} className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">{f.label}</label>
                <input type={f.type} disabled={!isEditing} value={f.value as any} onChange={(e) => f.onChange(e.target.value)}
                  className="w-full p-3 bg-brand-page/50 rounded-xl border border-black/5 focus:outline-none text-sm font-serif italic" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-text mb-6">Método de Acompanhamento</h3>
          <div className="space-y-3">
            {METHODS.map(m => (
              <button key={m.id} onClick={() => onUpdate({ selectedMethod: m.id })}
                className={cn("w-full p-4 rounded-2xl border text-left flex items-center justify-between group transition-all",
                  profile.selectedMethod === m.id ? "bg-brand-olive/5 border-brand-olive/20" : "bg-white border-black/[0.05] hover:border-black/10")}>
                <div className="flex flex-col">
                  <span className={cn("text-xs font-bold uppercase tracking-widest", profile.selectedMethod === m.id ? "text-brand-olive" : "text-brand-text")}>{m.name}</span>
                  <span className="text-[10px] text-brand-muted italic font-serif">{m.basis}</span>
                </div>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", profile.selectedMethod === m.id ? "bg-brand-olive border-brand-olive" : "border-black/10")}>
                  {profile.selectedMethod === m.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5 space-y-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-text">Preferências & Sistema</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-brand-text uppercase tracking-widest">Lembretes Diários</span>
              <span className="text-[10px] text-brand-muted italic font-serif">Avisar para fazer o registro noturno</span>
            </div>
            <button onClick={() => onUpdate({ remindersEnabled: !profile.remindersEnabled })}
              className={cn("w-12 h-6 rounded-full relative transition-all", profile.remindersEnabled ? "bg-brand-olive" : "bg-black/10")}>
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", profile.remindersEnabled ? "left-7" : "left-1")} />
            </button>
          </div>
          <div className="h-px bg-black/[0.03]" />
          <button onClick={() => {
            const data = JSON.stringify({ profile, logs });
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `graca-e-vida-${profile.name}-${new Date().toISOString().split('T')[0]}.json`; a.click();
          }} className="w-full flex items-center justify-between p-4 bg-brand-page/50 hover:bg-brand-cream rounded-2xl transition-all group">
            <div className="flex items-center gap-4">
              <Info size={18} className="text-brand-olive" />
              <span className="text-xs font-bold uppercase tracking-widest text-brand-text">Backup do Perfil</span>
            </div>
            <ChevronRight size={18} className="text-brand-muted opacity-40 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>
      </div>

      <div className="max-w-lg mx-auto p-10 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-olive/20" />
        <p className="text-[13px] text-brand-text/50 leading-relaxed font-serif italic text-center max-w-sm mx-auto">
          "O corpo humano, com seu sexo, e sua masculinidade e feminilidade, [...] carrega consigo desde o início o atributo 'esponsal'."
        </p>
        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] font-bold text-brand-olive/40">São João Paulo II</p>
      </div>
    </div>
  );
}

function Doctrine() {
  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-3xl font-serif text-brand-text mb-2">Magistério da Igreja</h2>
        <p className="text-sm text-brand-muted italic font-serif">O que ensina a Igreja sobre a vida e a família</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CHURCH_TEACHINGS.map((teaching, i) => (
          <div key={i} className="bg-white p-8 rounded-[32px] shadow-soft border border-brand-olive/5 flex flex-col h-full">
            <h3 className="text-lg font-serif text-brand-olive italic mb-4">{teaching.title}</h3>
            <p className="text-sm text-brand-text/70 leading-relaxed font-serif italic flex-grow">"{teaching.content}"</p>
            <p className="mt-6 text-[10px] uppercase tracking-widest font-bold text-brand-muted border-t border-black/5 pt-4">{teaching.source}</p>
          </div>
        ))}
      </div>
      <div className="bg-brand-olive p-10 rounded-[40px] text-white space-y-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-serif italic mb-4">A Pastoral Familiar</h3>
          <p className="text-sm leading-relaxed opacity-90 font-light">A Igreja não apenas ensina a norma, mas caminha junto com os casais através da Pastoral Familiar, oferecendo suporte humano, espiritual e médico para a vivência da paternidade e maternidade responsáveis.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="px-4 py-2 border border-white/20 rounded-full text-[10px] uppercase tracking-widest font-bold">Moral Católica</div>
            <div className="px-4 py-2 border border-white/20 rounded-full text-[10px] uppercase tracking-widest font-bold">Fidelidade</div>
            <div className="px-4 py-2 border border-white/20 rounded-full text-[10px] uppercase tracking-widest font-bold">Dom de Deus</div>
          </div>
        </div>
        <Heart className="absolute -bottom-10 -right-10 text-white opacity-5 w-60 h-60" fill="currentColor" />
      </div>
    </div>
  );
}

function Tutorial({ onComplete, onDismiss }: { onComplete: () => void, onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Boas-vindas ao Graça & Vida", desc: "Um espaço sagrado para o autoconhecimento e a harmonia do casal.", icon: Heart },
    { title: "O Coração do Aplicativo", desc: "Aqui no 'Hoje', você vê seu estado biológico atual processado pela ciência e pela oração.", icon: User },
    { title: "Registros Sagrados", desc: "No fim do dia, ore com seu esposo e registre seus sinais (muco, sensação e temperatura).", icon: Droplets },
    { title: "Sabedoria Compartilhada", desc: "Na aba 'Aprender', você encontra a história e o passo a passo de cada método com total precisão.", icon: BookOpen },
  ];
  const current = steps[step];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-brand-olive/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white max-w-sm w-full rounded-[48px] p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        <div className="mb-8 w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center text-brand-olive"><current.icon size={32} /></div>
        <h3 className="text-2xl font-serif text-brand-text italic leading-tight mb-4">{current.title}</h3>
        <p className="text-[15px] text-brand-muted leading-relaxed font-serif italic mb-10">{current.desc}</p>
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => <div key={i} className={cn("h-1.5 rounded-full transition-all", step === i ? "w-8 bg-brand-olive" : "w-1.5 bg-brand-olive/10")} />)}
        </div>
        <button onClick={() => { if (step < steps.length - 1) setStep(step + 1); else { onComplete(); onDismiss(); } }}
          className="w-full py-5 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-brand-olive/10">
          {step < steps.length - 1 ? 'Continuar' : 'Começar Minha Jornada'}
        </button>
      </div>
    </motion.div>
  );
}
