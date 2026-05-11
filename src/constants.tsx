import { MethodInfo, FertilityStatus } from './types';
import { Droplets, Thermometer, Calendar, BookOpen, User, Heart, ShieldCheck, BarChart3 } from 'lucide-react';

export const FERTILITY_COLORS: Record<FertilityStatus, string> = {
  'menstrual': '#E08C8C',
  'infertile': '#9BB694',
  'potentially-fertile': '#F4D06F',
  'high-fertility': '#F4D06F',
  'post-ovulatory': '#81A4CD',
};

export const METHODS: MethodInfo[] = [
  {
    id: 'gracavida',
    name: 'Método Graça & Vida',
    author: 'Comunidade Graça & Vida',
    basis: 'Sintotérmico + Biofeedback',
    description: 'Um método integrativo que une a precisão do sintotérmico com a escuta espiritual e emocional do casal.',
    history: 'Surgiu da necessidade de um acompanhamento que não fosse apenas biológico, mas que integrasse a vida de oração e a harmonia conjugal na regulação da fertilidade.',
    accuracy: '99% se usado conforme as regras.',
    steps: [
      'Oração: Inicie o registro com uma prece de gratidão pelo dom da vida.',
      'Temperatura: Meça a temperatura basal via oral ou vaginal logo ao acordar, após pelo menos 5h de sono, antes de falar ou levantar.',
      'Muco (Clara de Ovo): Identifique o muco elástico que estica entre os dedos, semelhante à clara de ovo crua.',
      'Sensação: Note se há sensação de lubrificação ao caminhar, como se estivesse "escorregadia".',
      'Reflexão: Anote como está a harmonia do casal e a abertura aos planos de Deus.'
    ],
    tips: [
      'Use um termômetro com duas casas decimais (ex: 36.45).',
      'A sensação vulvar é mais importante que the visão do muco.'
    ],
    limitations: [
      'Requer disciplina mútua.',
      'Viagens ou álcool podem alterar a temperatura.'
    ],
    regularCycleAdvice: 'Em ciclos regulares, espere a ovulação entre o 12º e 16º dia.',
    irregularCycleAdvice: 'Não tente prever. Siga os sinais do dia, especialmente a evolução do muco.',
    requiredFields: ['bleeding', 'mucus', 'sensation', 'temperature', 'notes', 'isPeak']
  },
  {
    id: 'billings',
    name: 'Método Billings (MOB)',
    author: 'Dr. John & Evelyn Billings',
    basis: 'Muco Cervical',
    description: 'Foca na sensação vulvar e aparência do muco para identificar o Ápice da fertilidade.',
    history: 'Criado na Austrália, é o método mais difundido mundialmente por sua simplicidade e base científica.',
    accuracy: '99% com uso perfeito.',
    steps: [
      'Sensação Seca: Quando não há muco e a vulva parece seca ao toque e durante o dia.',
      'Sensação Úmida: Quando o muco começa a surgir, geralmente pegajoso e opaco (como cola branca).',
      'Sensação Escorregadia: O sinal mais fértil. Parece que você está deslizando ao se limpar.',
      'Características do Muco: "Cremoso" (denso como hidratante), "Aquoso" (molha a calcinha), "Elástico" (estica mais de 2cm sem romper).',
      'Registro Noturno: Anote sempre o sinal mais fértil observado durante todo o dia.'
    ],
    tips: [
      'Ignore o muco de excitação sexual.',
      'Limpe-se sempre de frente para trás para observar o muco no papel.'
    ],
    limitations: [
      'Stress pode atrasar o Ápice.',
      'Infecções vaginais podem confundir a observação.'
    ],
    regularCycleAdvice: 'O Padrão Básico de Infertilidade (PBI) é estável em ciclos regulares.',
    irregularCycleAdvice: 'O MOB é o melhor para ciclos irregulares pois foca no PBI diário.',
    requiredFields: ['bleeding', 'mucus', 'sensation', 'isPeak']
  },
  {
    id: 'creighton',
    name: 'Modelo Creighton (CrMS)',
    author: 'Dr. Thomas Hilgers',
    basis: 'Muco Padronizado',
    description: 'Um sistema altamente padronizado para monitoramento da saúde reprodutiva e diagnóstico médico.',
    history: 'Evolução científica do Billings, focado na NaProTechnology (Tecnologia Reprodutiva Natural).',
    accuracy: '99.5% para evitar gravidez.',
    steps: [
      'Observação a cada ida ao banheiro: Verifique o muco antes e depois de urinar.',
      'Codificação: Use os códigos (ex: 10DL para muco escorregadio, 2 para seco).',
      'Cor: Transparente (fértil), Turvo (menos fértil) ou Amarelo.',
      'Consistência: Note se é "elástico" (stretch) ou "pegajoso" (tacky).',
      'Frequência: Quantas vezes o muco foi observado no dia?'
    ],
    tips: [
      'O Creighton exige papel higiênico branco e liso para melhor visão.',
      'Fundamental o acompanhamento por um instrutor certificado.'
    ],
    limitations: [
      'Curva de aprendizado mais longa.',
      'Necessidade de kits de selos específicos.'
    ],
    regularCycleAdvice: 'Identifica o "muco de pico" com precisão milimétrica.',
    irregularCycleAdvice: 'Usado para diagnosticar causas de infertilidade ou ciclos irregulares.',
    requiredFields: ['bleeding', 'mucus', 'sensation', 'isPeak']
  },
  {
    id: 'symptothermal',
    name: 'Sintotérmico (Sensiplan)',
    author: 'Dra. Anna Flynn',
    basis: 'Dupla Confirmação',
    description: 'O padrão-ouro em eficácia, cruzando temperatura e muco.',
    history: 'Consolidado na Alemanha como o método científico mais rigoroso disponível.',
    accuracy: '99.6% (equivalente à pílula).',
    steps: [
      'Temperatura Basal: Medir antes de qualquer atividade física ou fala após o sono.',
      'Muco: Avaliar evolução de seco -> cremoso -> clara de ovo.',
      'Confirmação Dupla: A fase infértil só começa após a 3ª temperatura alta + 4º dia após o Ápice de muco.',
      'Colo do Útero (opcional): Sentir se o colo está alto, macio e aberto (fértil).'
    ],
    tips: [
      'Sangramento Leve: Apenas manchas no papel (spotting).',
      'Sangramento Forte: Fluxo contínuo que exige troca frequente de absorvente.',
      'Use gráficos em papel ou este app para ver a "escada" da temperatura.'
    ],
    limitations: [
      'Pode ser confuso para quem tem sono picado (ex: mães lactantes).',
    ],
    regularCycleAdvice: 'Permite uma "regra dos primeiros 5 dias" (infertilidade no início do ciclo).',
    irregularCycleAdvice: 'Garante segurança total mesmo quando a ovulação atrasa semanas.',
    requiredFields: ['bleeding', 'mucus', 'sensation', 'temperature', 'isPeak']
  },
  {
    id: 'bbt',
    name: 'Temperatura Basal (BBT)',
    author: 'Diversos Especialistas',
    basis: 'Termometria',
    description: 'Foca na mudança térmica ocorridas após a liberação do óvulo devido à progesterona.',
    history: 'Conhecido desde o século XIX, foi um dos primeiros métodos científicos de estudo do ciclo.',
    accuracy: 'Eficaz para confirmar a ovulação, não para prevê-la.',
    steps: [
      'Meça a temperatura sempre no mesmo horário (tolerância de 30min).',
      'Posicione o termômetro sob a língua ou no canal vaginal.',
      'Compare as temperaturas: a ovulação é confirmada quando houver 3 temperaturas 0.1°C a 0.2°C acima das 6 anteriores.',
      'Mantenha o termômetro por pelo menos 3 a 5 minutos (se for analógico) ou até o sinal sonoro (digital basal).'
    ],
    tips: [
      'Sono de má qualidade, remédios ou febre invalidam o dado térmico.',
      'A temperatura só sobe DEPOIS que você ovula.'
    ],
    limitations: [
      'Não identifica o início da fase fértil sozinho.',
    ],
    regularCycleAdvice: 'Ideal para confirmar que o ciclo é ovulatório e saudável.',
    irregularCycleAdvice: 'Essencial para saber se houve ovulação em ciclos muito longos.',
    requiredFields: ['bleeding', 'temperature', 'isPeak']
  },
  {
    id: 'calendar',
    name: 'Método Tabelinha (Ritmo)',
    author: 'Ogino & Knaus',
    basis: 'Cálculo Matemático',
    description: 'Cálculo estatístico baseado na duração dos ciclos anteriores.',
    history: 'Desenvolvido na década de 1930; foi o primeiro método rítmico, mas hoje é considerado limitado por não observar sinais em tempo real.',
    accuracy: 'Baixa (~75-80%) se usado sozinho ou em ciclos irregulares.',
    steps: [
      'Registre a duração dos últimos 6 a 12 ciclos.',
      'Subtraia 18 dias do ciclo mais curto (início da fertilidade).',
      'Subtraia 11 dias do ciclo mais longo (fim da fertilidade).',
      'Exemplo: Se o ciclo curto é 26 e longo é 30, a fase fértil é do dia 8 ao 19.'
    ],
    tips: [
      'USE APENAS como complemento aos métodos biológicos.',
      'A tabelinha NÃO protege contra ovulações precoces por stress.'
    ],
    limitations: [
      'Falha totalmente se o estilo de vida mudar e o ciclo atrasar.',
      'Não recomendado para uso isolado na prevenção.'
    ],
    regularCycleAdvice: 'Funciona melhor em mulheres com variação de no máximo 2 dias entre ciclos.',
    irregularCycleAdvice: 'PERIGOSO: Não use este método se seus ciclos variarem mais de 7 dias.',
    requiredFields: ['bleeding']
  }
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Hoje', icon: Heart },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'reports', label: 'Gráficos', icon: BarChart3 },
  { id: 'log', label: 'Registro', icon: Droplets },
  { id: 'education', label: 'Aprender', icon: BookOpen },
  { id: 'profile', label: 'Perfil', icon: User },
];

export const BIBLE_VERSES = [
  { text: "Os filhos são herança do Senhor, o fruto do ventre o seu galardão.", ref: "Salmo 127:3" },
  { text: "Antes de formá-lo no ventre eu o escolhi; antes de você nascer, eu o separei.", ref: "Jeremias 1:5" },
  { text: "Vejam que grande amor o Pai nos concedeu: sermos chamados filhos de Deus!", ref: "1 João 3:1" },
  { text: "Deus os abençoou e lhes disse: Sejam férteis e multipliquem-se!", ref: "Gênesis 1:28" },
  { text: "Ensina a criança no caminho em que deve andar, e até quando for velho não se desviará dele.", ref: "Provérbios 22:6" },
  { text: "Tudo o que fizerem, façam de todo o coração, como para o Senhor.", ref: "Colossenses 3:23" },
  { text: "A graça do Senhor Jesus Cristo seja com todos. Amém.", ref: "Apocalipse 22:21" },
  { text: "O Senhor é o meu pastor; nada me faltará.", ref: "Salmo 23:1" },
  { text: "Aquele que habita no abrigo do Altíssimo descansará à sombra do Todo-poderoso.", ref: "Salmo 91:1" },
  { text: "Dêem graças ao Senhor, porque ele é bom; o seu amor dura para sempre.", ref: "Salmo 118:1" }
];

export const CHURCH_TEACHINGS = [
  {
    title: "Paternidade Responsável",
    content: "A paternidade responsável implica que os cônjuges reconheçam os seus próprios deveres para com Deus, para consigo próprios, para com a família e para com a sociedade, numa justa hierarquia de valores.",
    source: "Humanae Vitae, 10"
  },
  {
    title: "Espaçamento das Gestações",
    content: "Se houver motivos graves para distanciar os nascimentos, derivados das condições físicas ou psicológicas dos cônjuges, ou de circunstâncias exteriores, a Igreja ensina que é lícito o recurso aos períodos inférteis.",
    source: "Humanae Vitae, 16"
  },
  {
    title: "Abertura à Vida",
    content: "Qualquer ato matrimonial deve permanecer aberto à transmissão da vida. Esta doutrina baseia-se na conexão indivisível que Deus quis entre os dois significados do ato matrimonial: o significado unitivo e o significado procriador.",
    source: "Humanae Vitae, 12"
  },
  {
    title: "Família Numerosa",
    content: "Dentre os cônjuges que cumprem a missão que Deus lhes confiou, devem ser mencionados especialmente os que, de comum acordo e bem ponderadamente, aceitam com grandeza de ânimo uma prole mais numerosa para educar dignamente.",
    source: "Gaudium et Spes, 50"
  },
  {
    title: "Igreja Doméstica",
    content: "A família cristã constitui uma revelação e uma realização específicas da comunhão eclesial; por isso, pode e deve ser chamada 'Igreja doméstica'.",
    source: "Familiaris Consortio, 21"
  },
  {
    title: "O Dom da Vida",
    content: "A vida humana é sagrada porque, desde o seu início, envolve a ação criadora de Deus e permanece para sempre numa relação especial com o Criador, seu único fim.",
    source: "Donum Vitae, Intro"
  }
];
