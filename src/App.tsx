import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Calendar as CalendarIcon, Droplets, BookOpen, User, PlusCircle, ChevronLeft, ChevronRight, Info, Thermometer, BarChart3, ShieldCheck } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO, addDays } from 'date-fns';
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

// --- UTILS ---
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
    
    // Period event
    if (log.bleeding && log.bleeding !== 'none') {
      ics.push('BEGIN:VEVENT');
      ics.push(`DTSTART;VALUE=DATE:${dateStr}`);
      ics.push(`SUMMARY:Menstruação (${log.bleeding})`);
      ics.push('DESCRIPTION:Registro Graça & Vida');
      ics.push('END:VEVENT');
    }

    // Peak day
    if (log.isPeak) {
      ics.push('BEGIN:VEVENT');
      ics.push(`DTSTART;VALUE=DATE:${dateStr}`);
      ics.push('SUMMARY:🌟 Ápice de Fertilidade');
      ics.push('DESCRIPTION:Confirmado no App Graça & Vida');
      ics.push('END:VEVENT');
    }

    // Potential fertile window (high fertility)
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
        setProfile({ ...INITIAL_PROFILE, ...parsed }); // Blend for safety
        if (!parsed.tutorialCompleted) setShowTutorial(true);
      } catch (e) {}
    } else {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  const handleSaveLog = (newLog: DailyLog) => {
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== newLog.date);
      return [...filtered, newLog].sort((a,b) => a.date.localeCompare(b.date));
    });
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const newProfile = { ...prev, ...updates };
      // Tracking method changes
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
      case 'dashboard': return <Dashboard logs={logs} onAddLog={(d) => { if(d) setSelectedDate(d); setActiveTab('log'); }} profile={profile} />;
      case 'calendar': return <Calendar logs={logs} onDateSelect={(d) => { setSelectedDate(d); setActiveTab('log'); }} />;
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
      
      {/* Sidebar (Desktop) / Header (Mobile) */}
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

      {/* Main Content Area */}
      <main className="flex-1 lg:p-12 p-6 pb-24 lg:pb-12 h-screen overflow-y-auto w-full">
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

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-brand-olive/10 h-16 flex items-center justify-around px-2 z-50 shadow-lg">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all px-3 py-1",
              activeTab === item.id ? "text-brand-olive" : "text-brand-muted"
            )}
          >
            <item.icon size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// DASHBOARD SECTION
function Dashboard({ logs, onAddLog, profile }: { logs: DailyLog[], onAddLog: (date?: string) => void, profile: UserProfile }) {
  const today = new Date().toISOString().split('T')[0];
  const todayStatus = getFertilityStatus(logs, today);
  const todayLog = logs.find(l => l.date === today);
  
  // Daily Bible Verse Logic
  const verseIndex = new Date().getDate() % BIBLE_VERSES.length;
  const verse = BIBLE_VERSES[verseIndex];

  const statusLabel = {
    'menstrual': 'Fase Menstrual',
    'infertile': 'Fase Infértil',
    'potentially-fertile': 'Fértil',
    'high-fertility': 'Alta Fertilidade',
    'post-ovulatory': 'Pós-Ovulatório'
  }[todayStatus];

  const color = FERTILITY_COLORS[todayStatus];

  // Chart data Preparation
  const chartData = logs.slice(-15).map(l => ({
    date: format(parseISO(l.date), 'dd/MM'),
    temp: l.temperature || null,
    status: getFertilityStatus(logs, l.date)
  }));

  const recentLogs = logs.slice(-5).reverse();

  return (
    <div className="space-y-8">
      <div className="bg-white p-10 rounded-[32px] shadow-soft border border-brand-olive/5 relative overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: color }} />
        
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand-muted font-bold mb-4">Olá, {profile.name}</p>
        <h2 className="text-4xl font-serif text-brand-text mb-2 italic leading-tight">{statusLabel}</h2>
        <p className="text-sm font-sans text-brand-muted mb-10">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        
        <div className="relative group">
          <div 
            className="w-40 h-40 rounded-full flex items-center justify-center transition-all duration-1000"
            style={{ 
              backgroundColor: `${color}10`,
            }}
          >
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundColor: color }}
            >
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
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">
              {todayLog ? 'Entrada Completa' : 'Iniciar Entrada'}
            </span>
            <span className="text-lg font-bold">{todayLog ? 'Editar Hoje' : 'Registrar Hoje'}</span>
          </div>
          <PlusCircle size={28} className="relative z-10 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 left-0 w-full h-full bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="flex items-center justify-between p-8 bg-white rounded-3xl border border-brand-olive/5 shadow-soft">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Última Temperatura</span>
            <span className="text-2xl font-light text-brand-olive">
              {logs.length > 0 && logs[logs.length-1].temperature ? logs[logs.length-1].temperature : '36.00'}
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
            {recentLogs.length === 0 && (
              <p className="text-center py-8 text-xs text-brand-muted italic">Nenhum registro ainda.</p>
            )}
          </div>
        </div>

        <div className="bg-brand-cream border-l-4 border-brand-terracotta p-8 rounded-2xl space-y-3 flex flex-col justify-center">
          <h4 className="text-brand-terracotta font-serif text-lg italic flex items-center gap-2">
            <Info size={20} /> Orientação
          </h4>
          <p className="text-[14px] leading-relaxed text-brand-text/80 font-serif italic">
            {todayStatus === 'high-fertility' && "Os sinais sugerem alta fertilidade. Se deseja evitar uma gravidez neste momento, recomenda-se a abstinência periódica."}
            {todayStatus === 'potentially-fertile' && "Início da fase fértil. Observe cuidadosamente as mudanças na sensação e no muco."}
            {todayStatus === 'infertile' && "Fase infértil detectada. Continue as observações diárias habituais conforme o seu aprendizado."}
            {todayStatus === 'menstrual' && "Período menstrual iniciado. Favor registrar o fluxo para precisão do gráfico."}
            {todayStatus === 'post-ovulatory' && "Ovulação confirmada. Fase de infertilidade absoluta garantida até o próximo ciclo."}
          </p>
        </div>
      </div>

      {/* Biblical Quote Card */}
      <div className="bg-white p-10 rounded-[40px] shadow-soft border border-brand-olive/5 flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-brand-cream rounded-full mb-2">
           <Heart size={20} className="text-brand-terracotta" />
        </div>
        <q className="text-lg font-serif italic text-brand-text leading-relaxed">
           {verse.text}
        </q>
        <cite className="text-[10px] uppercase tracking-widest font-bold text-brand-muted not-italic">
           — {verse.ref}
        </cite>
      </div>

      <div className="text-center py-8">
        <p className="text-xs text-brand-muted font-sans font-medium uppercase tracking-widest opacity-60 italic">
          "O amor é o dom de si."
        </p>
      </div>
    </div>
  );
}

// CALENDAR SECTION
function Calendar({ logs, onDateSelect }: { logs: DailyLog[], onDateSelect: (d: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

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
          <button onClick={prevMonth} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-black/5 text-brand-olive"><ChevronLeft size={20} /></button>
          <button onClick={nextMonth} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm hover:shadow-md transition-all border border-black/5 text-brand-olive"><ChevronRight size={20} /></button>
        </div>
      </header>

      <div className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
        <div className="grid grid-cols-7 gap-2 text-center mb-6">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <span key={d} className="text-[11px] font-bold text-brand-muted uppercase tracking-widest leading-loose">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const hasLog = logs.some(l => l.date === dateStr);
            const status = getFertilityStatus(logs, dateStr);
            const color = hasLog ? FERTILITY_COLORS[status] : undefined;

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(dateStr)}
                className={cn(
                  "aspect-square rounded-2xl flex items-center justify-center text-[15px] transition-all relative group",
                  isToday(day) ? "ring-2 ring-brand-olive ring-offset-4 ring-offset-white z-10" : "",
                  hasLog ? "text-white shadow-lg" : "bg-brand-page text-brand-text/60 border border-black/[0.03] hover:border-brand-olive/20"
                )}
                style={hasLog ? { backgroundColor: color, boxShadow: `0 8px 16px ${color}30` } : {}}
              >
                <span className={cn("font-medium", hasLog ? "font-bold" : "font-sans opacity-70")}>
                  {format(day, 'd')}
                </span>
                {hasLog && logs.find(l => l.date === dateStr)?.isPeak && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-white/80 rounded-full shadow-sm border border-black/10" />
                )}
                <div className="absolute inset-x-0 bottom-[-4px] h-0.5 bg-brand-olive scale-x-0 group-hover:scale-x-50 transition-transform hidden lg:block" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 py-8 px-4 justify-center">
        {Object.entries({
          'menstrual': 'Menstruação',
          'infertile': 'Infértil',
          'potentially-fertile': 'Fértil',
          'post-ovulatory': 'Pós-Ovulatório'
        }).map(([status, label]) => (
          <div key={status} className="flex items-center gap-3 bg-white py-2 px-4 rounded-full shadow-sm border border-black/5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FERTILITY_COLORS[status as keyof typeof FERTILITY_COLORS] }} />
            <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// LOG FORM SECTION
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
    date: initialDate,
    mucus: 'none',
    sensation: 'not_observed',
    bleeding: 'none',
    notes: '',
  });

  const [activeHelp, setActiveHelp] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const mucusOptions = [
    { id: 'none', label: 'Nenhum', desc: 'Sente-se seca e não vê nada.' },
    { id: 'not_observed', label: 'Não Obs.', desc: 'Não foi possível verificar hoje.' },
    { id: 'dry', label: 'Seco', desc: 'Sensação de secura, sem umidade.' },
    { id: 'sticky', label: 'Pegajoso', desc: 'Como cola seca, quebra rápido ao esticar.' },
    { id: 'creamy', label: 'Cremoso', desc: 'Como hidratante corporal ou leite condensado.' },
    { id: 'watery', label: 'Aquoso', desc: 'Molhado, transparente, como água.' },
    { id: 'eggwhite', label: 'Elástico', desc: 'Como clara de ovo crua, estica vários cm.' },
  ];

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
            <div className="p-2 bg-brand-olive/10 text-brand-olive rounded-lg">
              <CalendarIcon size={20} />
            </div>
            <h2 className="text-3xl font-serif text-brand-text">
              {format(parseISO(initialDate), "d 'de' MMMM", { locale: ptBR })}
            </h2>
          </div>
          <p className="text-xs text-brand-muted uppercase tracking-widest font-bold translate-x-[52px]">Registro Diário: {methodInfo.name}</p>
        </div>
        <button 
          onClick={() => setActiveHelp(activeHelp ? null : 'general')}
          className="p-3 bg-brand-cream text-brand-olive rounded-full hover:bg-brand-olive hover:text-white transition-all shadow-sm"
        >
          <Info size={20} />
        </button>
      </header>

      {activeHelp && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-brand-cream/50 p-6 rounded-3xl border border-brand-olive/10 text-xs text-brand-text/70 italic leading-relaxed space-y-3 font-serif"
        >
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
                <button
                  key={opt.id}
                  onClick={() => setLog({ ...log, bleeding: opt.id as any })}
                  className={cn(
                    "px-5 py-3 rounded-full text-xs font-medium transition-all border flex flex-col items-center gap-0.5",
                    log.bleeding === opt.id 
                      ? "bg-brand-terracotta text-white border-transparent shadow-md" 
                      : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10"
                  )}
                >
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
              <span className="text-[10px] italic text-brand-muted opacity-60">Aparência visual</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mucusOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setLog({ ...log, mucus: opt.id as any })}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-xs font-medium transition-all border text-center flex flex-col gap-1 items-center justify-center min-h-[64px]",
                    log.mucus === opt.id 
                      ? "bg-brand-olive text-white border-transparent shadow-md" 
                      : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10 shadow-sm"
                  )}
                >
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
                <button
                  key={opt.id}
                  onClick={() => setLog({ ...log, sensation: opt.id as any })}
                  className={cn(
                    "px-3 py-4 rounded-2xl text-xs font-medium transition-all border text-center flex flex-col gap-1 items-center justify-center min-h-[64px]",
                    log.sensation === opt.id 
                      ? "bg-brand-olive text-white border-transparent shadow-md" 
                      : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10 shadow-sm"
                  )}
                >
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
                <input 
                  type="number" 
                  step="0.01"
                  value={log.temperature || ''}
                  onChange={(e) => setLog({...log, temperature: parseFloat(e.target.value)})}
                  placeholder="00.00"
                  className="w-full bg-transparent text-4xl font-light py-2 border-b-2 border-dashed border-brand-muted/30 focus:border-brand-olive focus:outline-none transition-colors italic text-brand-olive"
                />
                <span className="absolute right-0 bottom-3 text-lg text-brand-muted opacity-50">°C</span>
              </div>
            </section>
          )}

          {fields.includes('isPeak') && (
            <section className="group space-y-4">
              <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">5. Ápice & Estado</label>
              <div 
                onClick={() => setLog({...log, isPeak: !log.isPeak})}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer select-none",
                  log.isPeak 
                    ? "bg-brand-olive/5 border-brand-olive/20" 
                    : "bg-white border-black/[0.05] hover:border-black/10"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  log.isPeak ? "bg-brand-olive border-brand-olive" : "border-black/10"
                )}>
                  {log.isPeak && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                </div>
                <span className={cn("text-xs font-medium tracking-wide", log.isPeak ? "text-brand-olive" : "text-brand-muted")}>
                  Confirmar Ápice de Fertilidade
                </span>
              </div>
            </section>
          )}
        </div>

        {fields.includes('notes') && (
          <section className="space-y-4">
            <label className="text-[11px] font-bold text-brand-muted uppercase tracking-[0.1em]">6. Notas & Reflexões (Espiritual/Emocional)</label>
            <textarea
              value={log.notes || ''}
              onChange={(e) => setLog({...log, notes: e.target.value})}
              placeholder="Como você se sente hoje? Houve oração em casal? Algum fator perturbador?"
              className="w-full h-32 p-6 bg-white rounded-3xl border border-black/5 focus:ring-2 ring-brand-olive/10 focus:outline-none text-sm text-brand-text italic font-serif leading-relaxed"
            ></textarea>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-4 pt-8 border-t border-black/5">
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 text-brand-muted font-bold uppercase tracking-widest text-[11px] hover:text-brand-text transition-colors">Cancelar</button>
          <button 
            onClick={() => onSave(log)}
            className="flex-[2] py-5 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-brand-olive/10 hover:translate-y-[-1px] transition-all"
          >
            {existingLog ? 'Atualizar Entrada' : 'Salvar Entrada'}
          </button>
        </div>
        
        {existingLog && (
          <div className="pt-4 border-t border-dotted border-black/5">
            {!showConfirmDelete ? (
              <button 
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-4 text-brand-terracotta font-bold uppercase tracking-[0.1em] text-[10px] hover:bg-brand-terracotta/5 rounded-xl transition-all"
              >
                Excluir Registro Permanente
              </button>
            ) : (
              <div className="flex items-center justify-between p-4 bg-brand-terracotta/5 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
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

// REPORTS SECTION
function Reports({ logs, profile }: { logs: DailyLog[], profile: UserProfile }) {
  const chartData = logs.slice(-30).map(log => ({
    ...log,
    mucusValue: MUCUS_VALUES[log.mucus] || 0,
    temp: log.temperature || null,
    status: getFertilityStatus(logs, log.date)
  }));

  const downloadICS = () => {
    const icsContent = generateICS(logs);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'ciclo_gracavida.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCSV = () => {
    const headers = ['Data', 'Temperatura', 'Muco', 'Sensação', 'Sangramento', 'Ápice', 'Notas'];
    const rows = logs.map(l => [
      l.date,
      l.temperature || '',
      l.mucus,
      l.sensation,
      l.bleeding,
      l.isPeak ? 'Sim' : 'Não',
      (l.notes || '').replace(/,/g, ';')
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'historico_gracavida.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-3xl font-serif text-brand-text mb-2 animate-in fade-in slide-in-from-left-4 duration-700">Relatórios & Evolução</h2>
        <p className="text-sm text-brand-muted italic font-serif opacity-80">Análise profunda do seu ciclo e métodos</p>
      </header>

      <section className="bg-white p-6 rounded-3xl shadow-soft border border-brand-olive/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-brand-olive">Gráfico de Evolução (30 dias)</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-olive" />
              <span className="text-[9px] font-bold uppercase tracking-tighter text-brand-muted">Temperatura</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-terracotta" />
              <span className="text-[9px] font-bold uppercase tracking-tighter text-brand-muted">Muco/Aparência</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 9, fill: '#7A7A75'}} 
                tickFormatter={(str) => format(parseISO(str), 'dd/MM')}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                domain={['dataMin - 0.5', 'dataMax + 0.5']} 
                tick={{fontSize: 9, fill: '#7A7A75'}}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[0, 5]} 
                hide
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px' }}
                labelFormatter={(v) => format(parseISO(v), 'dd/MM/yyyy')}
              />
              <Bar 
                yAxisId="right" 
                dataKey="mucusValue" 
                radius={[4, 4, 0, 0]}
                barSize={12}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={FERTILITY_COLORS[entry.status] || '#eee'} />
                ))}
              </Bar>
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="temp" 
                stroke="#5A5A40" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#5A5A40', strokeWidth: 0 }} 
                activeDot={{ r: 6 }}
                connectNulls
              />
              {chartData.map((d, i) => d.isPeak && (
                <ReferenceLine 
                  key={`peak-${i}`}
                  yAxisId="left"
                  x={d.date} 
                  stroke="rgba(198, 123, 92, 0.4)" 
                  strokeDasharray="3 3"
                  label={{ position: 'top', value: 'ÁPICE', fontSize: 8, fill: '#C67B5C', fontWeight: 'bold' }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-brand-olive/5 text-brand-olive rounded-xl">
              <BarChart3 size={18} />
            </div>
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
                  {i === 0 && (
                    <span className="px-2 py-1 bg-brand-olive text-white rounded-md text-[8px] font-bold uppercase tracking-tighter">Atual</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-brand-olive p-10 rounded-[40px] shadow-xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <BarChart3 size={120} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-8">Exportação & Integração</h3>
          
          <div className="grid grid-cols-1 gap-4 relative z-10">
            <button 
              onClick={downloadICS}
              className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/5"
            >
              <div className="text-left">
                <p className="text-sm font-bold">Calendário Personalizado</p>
                <p className="text-[10px] opacity-60 mt-1">Sincronizar com Smartphone/PC</p>
              </div>
              <CalendarIcon size={20} />
            </button>

            <button 
              onClick={downloadCSV}
              className="flex items-center justify-between p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/5"
            >
              <div className="text-left">
                <p className="text-sm font-bold">Base de Dados (CSV)</p>
                <p className="text-[10px] opacity-60 mt-1">Exportar histórico completo</p>
              </div>
              <Droplets size={20} />
            </button>

            <button 
              onClick={() => window.print()}
              className="flex items-center justify-between p-5 bg-white text-brand-olive rounded-2xl hover:bg-brand-cream transition-all shadow-lg"
            >
              <div className="text-left">
                <p className="text-sm font-bold">Relatório PDF</p>
                <p className="text-[10px] opacity-60 mt-1">Preparar para profissional de saúde</p>
              </div>
              <BookOpen size={20} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// EDUCATION SECTION
function Education() {
  const [selectedMethod, setSelectedMethod] = useState(METHODS[0]);
  const [showDoctrine, setShowDoctrine] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  if (showDoctrine) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setShowDoctrine(false)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline mb-4"
        >
          <ChevronLeft size={16} /> Voltar para Métodos
        </button>
        <Doctrine />
      </div>
    );
  }

  if (showSimulator) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setShowSimulator(false)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline mb-4"
        >
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
          <h2 className="text-3xl font-serif text-brand-text mb-2 animate-in fade-in slide-in-from-left-4 duration-700">Sabedoria e Ciência</h2>
          <p className="text-sm text-brand-muted italic font-serif opacity-80">Compreenda a linguagem do seu corpo</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSimulator(true)}
            className="p-4 bg-brand-cream/50 border border-brand-olive/10 shadow-soft rounded-2xl flex flex-col items-center gap-1 group"
          >
            <BarChart3 size={20} className="text-brand-terracotta group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Simulador</span>
          </button>
          <button 
            onClick={() => setShowDoctrine(true)}
            className="p-4 bg-white border border-brand-olive/5 shadow-soft rounded-2xl flex flex-col items-center gap-1 group"
          >
            <ShieldCheck size={20} className="text-brand-olive group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Doutrina</span>
          </button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-none scroll-smooth">
        {METHODS.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMethod(m)}
            className={cn(
              "px-5 py-2.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-[0.15em] border",
              selectedMethod.id === m.id 
                ? "bg-brand-olive text-white border-transparent shadow-md" 
                : "bg-white text-brand-muted border-black/[0.05] hover:border-black/10"
            )}
          >
            {m.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMethod.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white p-10 rounded-[40px] shadow-soft border border-brand-olive/5"
        >
          <div className="mb-10 flex flex-col items-center text-center">
            <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">Fundamentado por</span>
            <h3 className="text-2xl font-serif text-brand-olive italic leading-tight">{selectedMethod.name}</h3>
            <p className="text-xs text-brand-muted font-bold uppercase tracking-widest mt-1">{selectedMethod.author}</p>
            <div className="mt-4 px-4 py-1.5 bg-brand-olive/5 rounded-full border border-brand-olive/10">
               <span className="text-[10px] font-bold text-brand-olive uppercase tracking-widest">Eficácia: {selectedMethod.accuracy}</span>
            </div>
          </div>

          <div className="space-y-10 max-w-2xl mx-auto">
            <section>
              <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2">
                <Info size={14} className="text-brand-terracotta" /> Nossa História
              </h4>
              <p className="text-[15px] text-brand-text/70 leading-relaxed font-serif italic">{selectedMethod.history}</p>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2">
                <BookOpen size={14} className="text-brand-terracotta" /> Como fazer corretamente
              </h4>
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
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-olive mb-3">Ciclos Regulares</h5>
                <p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">{selectedMethod.regularCycleAdvice}</p>
              </div>
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-olive mb-3">Ciclos Irregulares</h5>
                <p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">{selectedMethod.irregularCycleAdvice}</p>
              </div>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-text mb-4 border-b border-black/5 pb-2">
                <Heart size={14} className="text-brand-terracotta" /> Dicas Práticas
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedMethod.tips.map((tip, i) => (
                  <div key={i} className="p-4 bg-brand-cream/40 rounded-2xl border border-brand-olive/5 text-xs text-brand-text/70 font-serif italic">
                    {tip}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// CYCLE SIMULATOR SECTION
function CycleSimulator() {
  const [scenario, setScenario] = useState<'regular' | 'irregular' | 'stress'>('regular');
  const [simulatedLogs, setSimulatedLogs] = useState<DailyLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const scenarios = {
    regular: {
      name: 'Ciclo Regular',
      desc: '28 dias com ovulação no dia 14. Padrão clássico de livro-texto.',
      generate: () => {
        const logs: DailyLog[] = [];
        const baseDate = new Date();
        for (let i = 0; i < 28; i++) {
          const date = addDays(baseDate, i).toISOString().split('T')[0];
          let mucus: string = 'none';
          let sensation: string = 'dry';
          let bleeding: string = 'none';
          let temp = 36.2 + (Math.random() * 0.1);

          if (i < 5) bleeding = i === 0 ? 'heavy' : (i < 3 ? 'medium' : 'light');
          else if (i >= 8 && i <= 13) {
            mucus = i < 11 ? 'sticky' : (i < 13 ? 'watery' : 'eggwhite');
            sensation = i < 11 ? 'moist' : 'slippery';
          } else if (i >= 14) {
             temp += 0.4 + (Math.random() * 0.1);
          }

          logs.push({
            date, mucus: mucus as any, sensation: sensation as any, bleeding: bleeding as any,
            temperature: parseFloat(temp.toFixed(2)), isPeak: i === 13, notes: `Simulação dia ${i+1}`
          });
        }
        return logs;
      }
    },
    irregular: {
      name: 'Ciclo Longo/Irregular',
      desc: '35 dias. A ovulação ocorre mais tarde (dia 21). Comum em situações de variação hormonal natural.',
      generate: () => {
        const logs: DailyLog[] = [];
        const baseDate = new Date();
        for (let i = 0; i < 35; i++) {
          const date = addDays(baseDate, i).toISOString().split('T')[0];
          let mucus: string = 'none';
          let sensation: string = 'dry';
          let bleeding: string = 'none';
          let temp = 36.1 + (Math.random() * 0.1);

          if (i < 5) bleeding = 'medium';
          else if (i >= 15 && i <= 20) {
            mucus = i < 18 ? 'sticky' : 'eggwhite';
            sensation = 'slippery';
          } else if (i >= 21) {
            temp += 0.5;
          }

          logs.push({
            date, mucus: mucus as any, sensation: sensation as any, bleeding: bleeding as any,
            temperature: parseFloat(temp.toFixed(2)), isPeak: i === 20, notes: `Simulação dia ${i+1}`
          });
        }
        return logs;
      }
    },
    stress: {
      name: 'Impacto de Estresse',
      desc: 'Ovulação atrasada devido ao estresse. Mostra como o corpo prioriza a sobrevivência sobre a reprodução.',
      generate: () => {
        const logs: DailyLog[] = [];
        const baseDate = new Date();
        for (let i = 0; i < 32; i++) {
          const date = addDays(baseDate, i).toISOString().split('T')[0];
          let mucus: string = 'none';
          let sensation: string = 'dry';
          let temp = 36.3;

          if (i < 15) {
             // Long flat phase due to stress
             mucus = 'none';
          } else if (i >= 18 && i <= 22) {
             mucus = 'eggwhite';
             sensation = 'slippery';
          } else if (i >= 23) {
             temp += 0.4;
          }

          logs.push({
            date, mucus: mucus as any, sensation: sensation as any, bleeding: 'none',
            temperature: parseFloat(temp.toFixed(2)), isPeak: i === 22, notes: `Estresse até o dia 15`
          });
        }
        return logs;
      }
    }
  };

  useEffect(() => {
    setSimulatedLogs(scenarios[scenario].generate());
    setCurrentStep(0);
  }, [scenario]);

  const currentLog = simulatedLogs[currentStep];

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h2 className="text-3xl font-serif text-brand-text mb-2 animate-in fade-in slide-in-from-left-4 duration-700">Simulador de Ciclo</h2>
        <p className="text-sm text-brand-muted italic font-serif">Aprenda a interpretar sinais em diferentes cenários</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map(s => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={cn(
              "p-6 rounded-3xl border transition-all text-left space-y-2",
              scenario === s 
                ? "bg-brand-olive text-white border-transparent shadow-lg" 
                : "bg-white text-brand-muted border-black/5 hover:border-brand-olive/20 shadow-soft"
            )}
          >
            <p className="text-xs font-bold uppercase tracking-widest">{scenarios[s].name}</p>
            <p className={cn("text-[10px] leading-relaxed", scenario === s ? "opacity-90" : "opacity-60")}>{scenarios[s].desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-soft border border-black/5 space-y-10">
          <div className="flex justify-between items-center bg-brand-page/50 p-6 rounded-2xl">
            <button 
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="p-3 bg-white rounded-full shadow-sm disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted">Dia do Ciclo</span>
              <p className="text-3xl font-serif text-brand-olive italic">{currentStep + 1}</p>
            </div>
            <button 
              disabled={currentStep === simulatedLogs.length - 1}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="p-3 bg-white rounded-full shadow-sm disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-5 bg-brand-cream/30 rounded-2xl border border-brand-olive/5 text-center">
                <span className="text-[9px] font-bold text-brand-muted uppercase block mb-2">Muco</span>
                <span className="text-xs font-serif italic text-brand-olive">{currentLog?.mucus}</span>
             </div>
             <div className="p-5 bg-brand-cream/30 rounded-2xl border border-brand-olive/5 text-center">
                <span className="text-[9px] font-bold text-brand-muted uppercase block mb-2">Sensação</span>
                <span className="text-xs font-serif italic text-brand-olive">{currentLog?.sensation}</span>
             </div>
             <div className="p-5 bg-brand-cream/30 rounded-2xl border border-brand-olive/5 text-center">
                <span className="text-[9px] font-bold text-brand-muted uppercase block mb-2">Basal</span>
                <span className="text-xs font-serif italic text-brand-olive">{currentLog?.temperature}°C</span>
             </div>
             <div className="p-5 bg-brand-cream/30 rounded-2xl border border-brand-olive/5 text-center">
                <span className="text-[9px] font-bold text-brand-muted uppercase block mb-2">Fluxo</span>
                <span className="text-xs font-serif italic text-brand-olive">{currentLog?.bleeding}</span>
             </div>
          </div>

          <div className="h-64 bg-brand-page/20 rounded-3xl p-6 border border-black/5">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simulatedLogs}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-xl border border-black/5 text-[10px]">
                            <p className="font-bold">Dia {simulatedLogs.indexOf(data) + 1}</p>
                            <p className="italic text-brand-olive">{data.temperature}°C</p>
                            <p className="text-brand-muted uppercase tracking-tighter">{data.mucus}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey={(d) => MUCUS_VALUES[d.mucus]} barSize={20} radius={[4, 4, 0, 0]}>
                    {simulatedLogs.map((entry, index) => (
                      <Cell key={index} fill={FERTILITY_COLORS[getFertilityStatus(simulatedLogs, entry.date)]} opacity={index === currentStep ? 1 : 0.3} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="temperature" stroke="#5A5A40" strokeWidth={2} dot={false} strokeDasharray="5 5" opacity={0.5} />
                  <ReferenceLine x={simulatedLogs[currentStep]?.date} stroke="#C67B5C" strokeWidth={2} strokeDasharray="3 3" />
                </ComposedChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-brand-terracotta/5 p-8 rounded-[32px] border border-brand-terracotta/10 space-y-4">
              <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-terracotta">
                <ShieldCheck size={16} /> Análise do Dia
              </h4>
              <p className="text-[15px] font-serif italic leading-relaxed text-brand-text/80">
                {currentLog?.isPeak && "Momento do Ápice: O dia com os sinais mais férteis (muco elástico e sensação escorregadia). Este é o gatilho biológico da ovulação."}
                {currentLog?.bleeding !== 'none' && "Início do Ciclo: A menstruação marca o Dia 1. É um tempo de repouso e limpeza do endométrio."}
                {currentStep > 0 && currentLog?.temperature > simulatedLogs[currentStep-1]?.temperature + 0.3 && "Salto Térmico: O aumento súbito da temperatura confirma que a ovulação já ocorreu."}
                {!currentLog?.isPeak && currentLog?.bleeding === 'none' && currentLog?.mucus !== 'none' && "Fase Fértil: O aumento do estrogênio produz muco para preparar o caminho dos espermatozoides."}
                {!currentLog?.isPeak && currentLog?.bleeding === 'none' && currentLog?.mucus === 'none' && (currentStep < 10 ? "Fase Infértil Inicial: Dias secos após a menstruação." : "Fase Lútea: Estágio de infertilidade absoluta após a subida confirmada da temperatura.")}
              </p>
           </div>

           <div className="bg-white p-8 rounded-[32px] shadow-soft border border-black/5 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Dica de Aprendizado</h4>
              <p className="text-xs text-brand-text/60 italic leading-relaxed font-serif">
                Use os botões de navegação para ver como os gráficos mudam dia após dia. Observe a relação entre o muco (barras coloridas) e a temperatura (linha pontilhada).
              </p>
              <button 
                onClick={() => setCurrentStep(Math.max(0, simulatedLogs.findIndex(l => l.isPeak)))}
                className="text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline"
              >
                Ir para o Ápice
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

// PROFILE/SETTINGS SECTION
function Profile({ logs, profile, onUpdate, onClear }: { logs: DailyLog[], profile: UserProfile, onUpdate: (u: Partial<UserProfile>) => void, onClear: () => void }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col items-center">
        <div className="relative group cursor-pointer" onClick={() => setIsEditing(!isEditing)}>
          <div className="w-32 h-32 bg-brand-cream rounded-full flex items-center justify-center p-1 border border-black/5 shadow-soft overflow-hidden group-hover:scale-95 transition-transform duration-500">
             <div className="w-full h-full bg-brand-olive rounded-full flex items-center justify-center">
                <User size={48} className="text-white opacity-80" />
             </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-md border border-black/5">
             <Heart size={18} className="text-brand-terracotta" fill="#C67B5C" />
          </div>
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
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-[10px] font-bold uppercase tracking-widest text-brand-olive hover:underline"
              >
               {isEditing ? 'Salvar' : 'Editar'}
             </button>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={profile.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className="w-full p-3 bg-brand-page/50 rounded-xl border border-black/5 focus:outline-none text-sm font-serif italic"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Altura (cm)</label>
                <input 
                  type="number" 
                  disabled={!isEditing}
                  value={profile.height || ''}
                  onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
                  className="w-full p-3 bg-brand-page/50 rounded-xl border border-black/5 focus:outline-none text-sm font-serif italic"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Peso (kg)</label>
                <input 
                  type="number" 
                  disabled={!isEditing}
                  value={profile.weight || ''}
                  onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) })}
                  className="w-full p-3 bg-brand-page/50 rounded-xl border border-black/5 focus:outline-none text-sm font-serif italic"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Duração do Ciclo (Méd.)</label>
                <input 
                  type="number" 
                  disabled={!isEditing}
                  value={profile.cycleLength || ''}
                  onChange={(e) => onUpdate({ cycleLength: parseInt(e.target.value) })}
                  className="w-full p-3 bg-brand-page/50 rounded-xl border border-black/5 focus:outline-none text-sm font-serif italic"
                />
             </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[40px] shadow-soft border border-brand-olive/5">
           <h3 className="text-[11px] font-bold uppercase tracking-widest text-brand-text mb-6">Método de Acompanhamento</h3>
           <div className="space-y-3">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => onUpdate({ selectedMethod: m.id })}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left flex items-center justify-between group transition-all",
                    profile.selectedMethod === m.id 
                      ? "bg-brand-olive/5 border-brand-olive/20" 
                      : "bg-white border-black/[0.05] hover:border-black/10"
                  )}
                >
                  <div className="flex flex-col">
                    <span className={cn("text-xs font-bold uppercase tracking-widest", profile.selectedMethod === m.id ? "text-brand-olive" : "text-brand-text")}>{m.name}</span>
                    <span className="text-[10px] text-brand-muted italic font-serif">{m.basis}</span>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    profile.selectedMethod === m.id ? "bg-brand-olive border-brand-olive" : "border-black/10"
                  )}>
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
              <button 
                onClick={() => onUpdate({ remindersEnabled: !profile.remindersEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-all",
                  profile.remindersEnabled ? "bg-brand-olive" : "bg-black/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  profile.remindersEnabled ? "left-7" : "left-1"
                )} />
              </button>
           </div>
           
           <div className="h-px bg-black/[0.03]" />

           <button 
              onClick={() => {
                const data = JSON.stringify({ profile, logs });
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `graca-e-vida-${profile.name}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
              className="w-full flex items-center justify-between p-4 bg-brand-page/50 hover:bg-brand-cream rounded-2xl transition-all group"
            >
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

// DOCTRINE SECTION
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
            <p className="mt-6 text-[10px] uppercase tracking-widest font-bold text-brand-muted border-t border-black/5 pt-4">
              {teaching.source}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-brand-olive p-10 rounded-[40px] text-white space-y-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-serif italic mb-4">A Pastoral Familiar</h3>
          <p className="text-sm leading-relaxed opacity-90 font-light">
            A Igreja não apenas ensina a norma, mas caminha junto com os casais através da Pastoral Familiar, oferecendo suporte humano, espiritual e médico para a vivência da paternidade e maternidade responsáveis.
          </p>
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
    {
      title: "Boas-vindas ao Graça & Vida",
      desc: "Um espaço sagrado para o autoconhecimento e a harmonia do casal.",
      icon: Heart,
    },
    {
      title: "O Coração do Aplicativo",
      desc: "Aqui no 'Hoje', você vê seu estado biológico atual processado pela ciência e pela oração.",
      icon: User,
    },
    {
      title: "Registros Sagrados",
      desc: "No fim do dia, ore com seu esposo e registre seus sinais (muco, sensação e temperatura).",
      icon: Droplets,
    },
    {
      title: "Sabedoria Compartilhada",
      desc: "Na aba 'Aprender', você encontra a história e o passo a passo de cada método com total precisão.",
      icon: BookOpen,
    }
  ];

  const current = steps[step];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-brand-olive/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-white max-w-sm w-full rounded-[48px] p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        <div className="mb-8 w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center text-brand-olive">
           <current.icon size={32} />
        </div>
        
        <h3 className="text-2xl font-serif text-brand-text italic leading-tight mb-4">{current.title}</h3>
        <p className="text-[15px] text-brand-muted leading-relaxed font-serif italic mb-10">{current.desc}</p>
        
        <div className="flex gap-2 mb-8">
           {steps.map((_, i) => (
             <div key={i} className={cn("h-1.5 rounded-full transition-all", step === i ? "w-8 bg-brand-olive" : "w-1.5 bg-brand-olive/10")} />
           ))}
        </div>

        <button 
          onClick={() => {
            if (step < steps.length - 1) setStep(step + 1);
            else {
              onComplete();
              onDismiss();
            }
          }}
          className="w-full py-5 bg-brand-olive text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-brand-olive/10"
        >
          {step < steps.length - 1 ? 'Continuar' : 'Começar Minha Jornada'}
        </button>
      </div>
    </motion.div>
  );
}
