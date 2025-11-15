/**
 * config.js teorico - Configuración COMPLETA para el chat teórico con datos del CSV
 * VERSIÓN ULTRA-ROBUSTA: Se basa en URL en lugar de estado global
 * ACTUALIZADO: Agregadas las 3 nuevas variantes médicas faltantes
 */

let _lastDetectedVariantKey = null;
let _lastDetectedUrlSegment = null;

/**
 * Definición COMPLETA de todas las variantes teóricas médicas basadas en el CSV de la base de datos
 */
export const VARIANTS = {
  CIENCIAS_BASICAS: {
    urlSegment: 'CienciasBasicas',
    displayName: 'Ciencias Básicas Fundamentales',
    config: {
      avaId: 1, // Del CSV: Ciencias Básicas Fundamentales
      assistantName: 'Dr. ACADEL - Ciencias Básicas',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Ciencias Básicas Fundamentales",
      message: "🧬 Soy Dr. ACADEL, tu capibara sabio e irreverente que integra anatomía, fisiología y embriología/histología para enseñar medicina desde sus fundamentos reales. No fragmento el conocimiento: lo conecto con humor, claridad y enfoque clínico desde la base.",
      textareaPlaceholder: "Escribe tu consulta de ciencias básicas aquí...",
      assistantLabel: "Dr. ACADEL - Ciencias Básicas",
      cssClass: "basic-sciences-welcome",
      headerIcon: "bx-dna",
      suggestions: [
        { text: "Integrar anatomía y fisiología del sistema cardiovascular", icon: "bx-heart" },
        { text: "Explicar embriología del desarrollo neural", icon: "bx-brain" },
        { text: "Correlacionar histología con función tisular", icon: "bx-syringe" },
        { text: "Crear mapa conceptual de sistemas integrados", icon: "bx-sitemap" }
      ]
    }
  },
  
  PATOLOGIA: {
    urlSegment: 'patologia',
    displayName: 'Patología y Fisiopatología',
    config: {
      avaId: 3, // Del CSV: Patología y Fisiopatología
      assistantName: 'Dr. ACADEL - Patología',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Patología y Fisiopatología",
      message: "🩺 Soy Dr. ACADEL, tu capibara clínico y sarcástico que domina la tríada médica clave: patología, fisiopatología y farmacología. Conecto lo que falla, cómo se descompensa y cómo se trata, todo con humor negro y lógica clínica.",
      textareaPlaceholder: "Escribe tu consulta de patología aquí...",
      assistantLabel: "Dr. ACADEL - Patología",
      cssClass: "pathology-welcome",
      headerIcon: "bx-plus-medical",
      suggestions: [
        { text: "Explicar fisiopatología del infarto agudo de miocardio", icon: "bx-heart" },
        { text: "Analizar mecanismos patológicos de la diabetes", icon: "bx-test-tube" },
        { text: "Correlacionar patología con tratamiento farmacológico", icon: "bx-capsule" },
        { text: "Crear esquema de progresión patológica", icon: "bx-trending-down" }
      ]
    }
  },
  
  SEMIOLOGIA: {
    urlSegment: 'Semiologia',
    displayName: 'Semiología y Diagnóstico',
    config: {
      avaId: 4, // Del CSV: Semiología y Diagnóstico
      assistantName: 'Dr. ACADEL - Semiología',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Semiología y Diagnóstico",
      message: "🩺 Soy Dr. ACADEL, tu capibara clínico y observador que domina la tríada del diagnóstico: semiología, métodos diagnósticos y medicina basada en evidencia. Te enseño a explorar, interpretar y decidir con método, ciencia y lógica clínica.",
      textareaPlaceholder: "Escribe tu consulta de semiología aquí...",
      assistantLabel: "Dr. ACADEL - Semiología",
      cssClass: "semiology-welcome",
      headerIcon: "bx-search-alt",
      suggestions: [
        { text: "Técnicas de exploración física cardiovascular", icon: "bx-pulse" },
        { text: "Interpretación de signos y síntomas respiratorios", icon: "bx-wind" },
        { text: "Algoritmo diagnóstico de dolor abdominal", icon: "bx-body" },
        { text: "Medicina basada en evidencia para diagnóstico", icon: "bx-check-shield" }
      ]
    }
  },
  
  MEDICINA_INTERNA: {
    urlSegment: 'medicinainterna',
    displayName: 'Medicina Interna',
    config: {
      avaId: 5, // Del CSV: Medicina Interna
      assistantName: 'Dr. ACADEL - Medicina Interna',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Medicina Interna",
      message: "🩺 Soy Dr. ACADEL, tu capibara clínico con corazón de internista y mente sistémica. Domino la medicina interna real integrando cardiología, neumología, gastroenterología y nefrología. Te enseño a pensar clínicamente, conectar órganos y resolver pacientes complejos.",
      textareaPlaceholder: "Escribe tu consulta de medicina interna aquí...",
      assistantLabel: "Dr. ACADEL - Medicina Interna",
      cssClass: "internal-medicine-welcome",
      headerIcon: "bx-clinic",
      suggestions: [
        { text: "Manejo integral del paciente hipertenso", icon: "bx-heart" },
        { text: "Diagnóstico diferencial de disnea", icon: "bx-wind" },
        { text: "Abordaje del paciente con insuficiencia renal", icon: "bx-filter" },
        { text: "Integración de sistemas en medicina interna", icon: "bx-network-chart" }
      ]
    }
  },


  ESPECIALIDADES_MED1: {
    urlSegment: 'EspecialidadesMed1',
    displayName: 'Especialidades Médicas I',
    config: {
      avaId: 16, // Del CSV: Especialidades Médicas I
      assistantName: 'Dr. ACADEL - Especialidades I',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Especialidades Médicas I",
      message: "🩺 Soy Dr. ACADEL, el capibara que enseña pediatría, gineco-obstetricia y endo-hematología como si fueran una sola historia clínica bien contada. Con casos reales, humor médico y conexiones clínicas, hago que entiendas por qué un sangrado, una hormona y un niño inquieto pueden estar relacionados.",
      textareaPlaceholder: "Escribe tu consulta de especialidades médicas aquí...",
      assistantLabel: "Dr. ACADEL - Especialidades I",
      cssClass: "specialties-med1-welcome",
      headerIcon: "bx-pulse",
      suggestions: [
        { text: "Manejo integral del paciente pediátrico", icon: "bx-band-aid" },
        { text: "Endocrinología: diabetes y trastornos hormonales", icon: "bx-dna" },
        { text: "Ginecología y obstetricia: embarazo y parto", icon: "bx-female" },
        { text: "Hematología: anemias y trastornos sanguíneos", icon: "bx-droplet" }
      ]
    }
  },

  ESPECIALIDADES_MED2: {
    urlSegment: 'EspecialidadesMedicasII',
    displayName: 'Especialidades Médicas II',
    config: {
      avaId: 17, // Del CSV: Especialidades Médicas II
      assistantName: 'Dr. ACADEL - Especialidades II',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Especialidades Médicas II",
      message: "🧠 Soy Dr. ACADEL, el capibara que enseña neuropsiquiatría, derma-reumato y infectología como si estuvieras viendo una serie médica de diagnóstico complejo. Con humor clínico, casos raros y conexiones brillantes, hago que entiendas por qué una fiebre, una mancha y una crisis convulsiva pueden formar parte del mismo caso.",
      textareaPlaceholder: "Escribe tu consulta de especialidades avanzadas aquí...",
      assistantLabel: "Dr. ACADEL - Especialidades II",
      cssClass: "specialties-med2-welcome",
      headerIcon: "bx-brain",
      suggestions: [
        { text: "Neurología: epilepsia y trastornos neurológicos", icon: "bx-brain" },
        { text: "Psiquiatría: depresión y trastornos mentales", icon: "bx-user-voice" },
        { text: "Dermatología: lesiones cutáneas y diagnóstico", icon: "bx-band-aid" },
        { text: "Infectología: manejo de infecciones complejas", icon: "bxs-virus" }
      ]
    }
  },

  CIRUGIA_URGENCIAS: {
    urlSegment: 'CirugiaYUrgencias',
    displayName: 'Cirugía y Urgencias',
    config: {
      avaId: 18, // Del CSV: Cirugía y Urgencias
      assistantName: 'Dr. ACADEL - Cirugía y Urgencias',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Cirugía y Urgencias",
      message: "🔪 Soy Dr. ACADEL, el capibara que te enseña cómo pensar, decidir y actuar cuando el tiempo corre, los huesos crujen y el quirófano espera. Con humor afilado, casos integrados y analogías memorables, te guío por el caos de urgencias, trauma y cirugía como un verdadero cirujano en formación.",
      textareaPlaceholder: "Escribe tu consulta de cirugía y urgencias aquí...",
      assistantLabel: "Dr. ACADEL - Cirugía y Urgencias",
      cssClass: "surgery-emergency-welcome",
      headerIcon: "bx-plus-circle",
      suggestions: [
        { text: "Manejo del trauma politraumatizado", icon: "bx-first-aid" },
        { text: "Técnicas quirúrgicas fundamentales", icon: "bx-cut" },
        { text: "Urgencias abdominales agudas", icon: "bx-alarm" },
        { text: "Decisiones rápidas en el servicio de urgencias", icon: "bx-time-five" }
      ]
    }
  },
  SECTOR_PUBLICO: {
    urlSegment: 'SectorPublico',
    displayName: 'Economía del Sector Público',
    config: {
      avaId: 28, // Del CSV
      assistantName: 'ACADEL - Sector Público',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Economía del Sector Público",
      message: "🏛️ Soy ACADEL, el capibara que entiende de políticas públicas, presupuestos y burocracia sin volverse loco. Con humor institucional y visión crítica, te explico cómo funciona (o no funciona) el Estado, desde teoría fiscal hasta evaluación de programas sociales.",
      textareaPlaceholder: "Escribe tu consulta de economía del sector público aquí...",
      assistantLabel: "ACADEL - Sector Público",
      cssClass: "sector-publico-welcome",
      headerIcon: "bx-buildings",
      suggestions: [
        { text: "Analizar teoría de la hacienda pública", icon: "bx-wallet" },
        { text: "Evaluar políticas fiscales y tributarias", icon: "bx-receipt" },
        { text: "Estudiar fallas de mercado y intervención estatal", icon: "bx-error-circle" },
        { text: "Diseñar programas de política pública", icon: "bx-edit-alt" }
      ]
    }
  },

  ECONOMIA_LABORAL: {
    urlSegment: 'EconomiaLaboral',
    displayName: 'Economía Laboral',
    config: {
      avaId: 29, // Del CSV
      assistantName: 'ACADEL - Economía Laboral',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Economía Laboral",
      message: "👷 Soy ACADEL, el capibara que analiza mercados laborales, salarios y capital humano con la perspectiva de quien entiende tanto la teoría como la realidad del trabajo. Con humor sindical y análisis riguroso, explico desde búsqueda de empleo hasta políticas laborales.",
      textareaPlaceholder: "Escribe tu consulta de economía laboral aquí...",
      assistantLabel: "ACADEL - Economía Laboral",
      cssClass: "economia-laboral-welcome",
      headerIcon: "bxs-buildings",
      suggestions: [
        { text: "Teoría de la búsqueda de empleo", icon: "bx-search-alt-2" },
        { text: "Análisis de determinantes salariales", icon: "bx-money-withdraw" },
        { text: "Capital humano y educación", icon: "bx-group" },
        { text: "Políticas de empleo y desempleo", icon: "bx-briefcase-alt" }
      ]
    }
  },

  HISTORIA_ECONOMICA: {
    urlSegment: 'HistoriaEconomica',
    displayName: 'Historia Económica',
    config: {
      avaId: 24, // Del CSV
      assistantName: 'ACADEL - Historia Económica',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Historia Económica",
      message: "📚 Soy ACADEL, el capibara historiador que conecta el pasado económico con el presente, desde las rutas de la seda hasta las crisis financieras modernas. Con narrativa envolvente y análisis histórico, te muestro cómo las ideas económicas han evolucionado y moldeado el mundo.",
      textareaPlaceholder: "Escribe tu consulta de historia económica aquí...",
      assistantLabel: "ACADEL - Historia Económica",
      cssClass: "historia-economica-welcome",
      headerIcon: "bx-book-open",
      suggestions: [
        { text: "Evolución del pensamiento económico", icon: "bx-brain" },
        { text: "Historia de las crisis financieras", icon: "bx-line-chart-down" },
        { text: "Desarrollo económico histórico mundial", icon: "bx-world" },
        { text: "Grandes economistas y sus contribuciones", icon: "bx-user-circle" }
      ]
    }
  },

  DESARROLLO_ECONOMICO: {
    urlSegment: 'DesarrolloEconomico',
    displayName: 'Desarrollo Económico',
    config: {
      avaId: 25, // Del CSV
      assistantName: 'Dr. ACADEL - Desarrollo Económico',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Desarrollo Económico",
      message: "🌍 Soy Dr. ACADEL, el capibara que estudia cómo las naciones crecen, prosperan o se estancan, analizando desde teorías de crecimiento hasta políticas de desarrollo. Con visión global y perspectiva crítica, explico las complejidades del desarrollo económico y la lucha contra la pobreza.",
      textareaPlaceholder: "Escribe tu consulta de desarrollo económico aquí...",
      assistantLabel: "Dr. ACADEL - Desarrollo Económico",
      cssClass: "desarrollo-economico-welcome",
      headerIcon: "bx-trending-up",
      suggestions: [
        { text: "Teorías del crecimiento económico", icon: "bx-stats" },
        { text: "Análisis de pobreza y desigualdad", icon: "bx-pie-chart" },
        { text: "Políticas de desarrollo sostenible", icon: "bx-leaf" },
        { text: "Instituciones y desarrollo económico", icon: "bx-buildings" }
      ]
    }
  },

  MACROECONOMIA: {
    urlSegment: 'Macroeconomia',
    displayName: 'Macroeconomía',
    config: {
      avaId: 22, // Del CSV
      assistantName: 'Dr. ACADEL - Macroeconomía',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Macroeconomía",
      message: "📈 Soy Dr. ACADEL, el capibara que ve la economía desde las alturas, analizando PIB, inflación, ciclos económicos y políticas macroeconómicas con la sabiduría de quien entiende cómo las piezas grandes se mueven. Con perspectiva macro y humor económico, te guío por las complejidades de las economías nacionales.",
      textareaPlaceholder: "Escribe tu consulta de macroeconomía aquí...",
      assistantLabel: "Dr. ACADEL - Macroeconomía",
      cssClass: "macroeconomia-welcome",
      headerIcon: "bx-line-chart",
      suggestions: [
        { text: "Modelos de crecimiento económico", icon: "bx-trending-up" },
        { text: "Análisis de ciclos económicos", icon: "bx-refresh" },
        { text: "Política fiscal y monetaria", icon: "bx-calculator" },
        { text: "Inflación y estabilidad de precios", icon: "bx-dollar" }
      ]
    }
  },

  DSM5: {
    urlSegment: 'DSM5',
    displayName: 'DSM-5 y Psicología Clínica',
    config: {
      avaId: 31, // Nuevo avaId
      assistantName: 'ACADEL - DSM-5',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a DSM-5 y Psicología Clínica",
      message: "🧠 Soy ACADEL, el capibara clínico que domina el DSM-5 como si fuera su manual de supervivencia. Con precisión diagnóstica y humor terapéutico, te guío por los criterios, especificadores y diagnósticos diferenciales que separan lo normal de lo patológico.",
      textareaPlaceholder: "Escribe tu consulta sobre DSM-5 y diagnóstico clínico aquí...",
      assistantLabel: "ACADEL - DSM-5",
      cssClass: "dsm5-welcome",
      headerIcon: "bx-book-bookmark",
      suggestions: [
        { text: "Criterios diagnósticos para trastornos del estado de ánimo", icon: "bx-brain" },
        { text: "Diagnóstico diferencial en trastornos de ansiedad", icon: "bx-pulse" },
        { text: "Especificadores y códigos del DSM-5", icon: "bx-list-ul" },
        { text: "Evaluación multidimensional y ejes diagnósticos", icon: "bx-analyse" }
      ]
    }
  },

  EPISTEMOLOGIA: {
    urlSegment: 'Epistemologia',
    displayName: 'Epistemología Genética',
    config: {
      avaId: 32, // Nuevo avaId
      assistantName: 'ACADEL - Epistemología',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Epistemología Genética",
      message: "🌱 Soy ACADEL, el capibara filósofo que explora cómo conocemos lo que conocemos desde una perspectiva psicológica. Con sabiduría piagetiana y humor constructivista, te guío por el desarrollo del conocimiento, desde esquemas mentales hasta equilibraciones cognitivas.",
      textareaPlaceholder: "Escribe tu consulta sobre epistemología genética aquí...",
      assistantLabel: "ACADEL - Epistemología",
      cssClass: "epistemologia-welcome",
      headerIcon: "bx-bulb",
      suggestions: [
        { text: "Teoría del desarrollo cognitivo de Piaget", icon: "bx-brain" },
        { text: "Procesos de asimilación y acomodación", icon: "bx-transfer" },
        { text: "Estadios del desarrollo intelectual", icon: "bx-trending-up" },
        { text: "Construcción del conocimiento y equilibración", icon: "bx-cog" }
      ]
    }
  },

  PSICOPATOLOGIA: {
    urlSegment: 'Psicopatologia',
    displayName: 'Psicopatología',
    config: {
      avaId: 39, // Nuevo avaId
      assistantName: 'ACADEL - Psicopatología',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Psicopatología",
      message: "🔍 Soy ACADEL, el capibara que navega por las aguas profundas de la psicopatología con brújula clínica y humor terapéutico. Desde síntomas hasta síndromes, te ayudo a entender los trastornos mentales con rigor científico y perspectiva humanista.",
      textareaPlaceholder: "Escribe tu consulta sobre psicopatología aquí...",
      assistantLabel: "ACADEL - Psicopatología",
      cssClass: "psicopatologia-welcome",
      headerIcon: "bx-search-alt-2",
      suggestions: [
        { text: "Clasificación y taxonomía de trastornos mentales", icon: "bx-category" },
        { text: "Semiología psiquiátrica y síntomas nucleares", icon: "bx-list-check" },
        { text: "Trastornos del estado de ánimo y ansiedad", icon: "bx-heart" },
        { text: "Modelos etiológicos en psicopatología", icon: "bx-network-chart" }
      ]
    }
  },

  PSIC_DIAGNOSTICO: {
    urlSegment: 'PsicDiagnostico',
    displayName: 'Exploración y Diagnóstico Psicológico',
    config: {
      avaId: 34, // Nuevo avaId
      assistantName: 'ACADEL - Diagnóstico Psicológico',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Exploración y Diagnóstico Psicológico",
      message: "🎯 Soy ACADEL, el capibara detective que descifra la mente humana a través de técnicas de evaluación y diagnóstico. Con instrumentos psicométricos y ojo clínico, te enseño a explorar, medir y comprender la psique con precisión científica.",
      textareaPlaceholder: "Escribe tu consulta sobre evaluación y diagnóstico psicológico aquí...",
      assistantLabel: "ACADEL - Diagnóstico Psicológico",
      cssClass: "psic-diagnostico-welcome",
      headerIcon: "bx-target-lock",
      suggestions: [
        { text: "Técnicas de entrevista psicológica estructurada", icon: "bx-conversation" },
        { text: "Tests psicométricos y proyectivos", icon: "bx-test-tube" },
        { text: "Elaboración de informes psicológicos", icon: "bx-file-blank" },
        { text: "Ética en la evaluación psicológica", icon: "bx-shield" }
      ]
    }
  },

  NEUROPSICOLOGIA: {
    urlSegment: 'Neuropsicologia',
    displayName: 'Neuropsicología',
    config: {
      avaId: 35, // Nuevo avaId
      assistantName: 'ACADEL - Neuropsicología',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Neuropsicología",
      message: "🧠 Soy ACADEL, el capibara neurocientífico que conecta cerebro y comportamiento con la precisión de un mapa sináptico. Con conocimiento neuroanatómico y perspectiva funcional, te guío por las bases biológicas de la cognición y la conducta.",
      textareaPlaceholder: "Escribe tu consulta sobre neuropsicología aquí...",
      assistantLabel: "ACADEL - Neuropsicología",
      cssClass: "neuropsicologia-welcome",
      headerIcon: "bx-brain",
      suggestions: [
        { text: "Bases neuroanatómicas de las funciones cognitivas", icon: "bx-dna" },
        { text: "Evaluación neuropsicológica y baterías de tests", icon: "bx-analyse" },
        { text: "Síndromes neuropsicológicos y lesiones cerebrales", icon: "bx-band-aid" },
        { text: "Rehabilitación cognitiva y plasticidad neural", icon: "bx-refresh" }
      ]
    }
  },

  PSICOANALISIS: {
    urlSegment: 'Psicoanalisis',
    displayName: 'Psicoanálisis',
    config: {
      avaId: 36, // Nuevo avaId
      assistantName: 'ACADEL - Psicoanálisis',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Psicoanálisis",
      message: "🔮 Soy ACADEL, el capibara analista que explora las profundidades del inconsciente con la sabiduría freudiana y la precisión lacaniana. Entre sueños, lapsus y transferencias, te guío por los misterios del aparato psíquico con rigor teórico y humor analítico.",
      textareaPlaceholder: "Escribe tu consulta sobre psicoanálisis aquí...",
      assistantLabel: "ACADEL - Psicoanálisis",
      cssClass: "psicoanalisis-welcome",
      headerIcon: "bx-compass",
      suggestions: [
        { text: "Teoría estructural: Ello, Yo y Superyó", icon: "bx-layer" },
        { text: "Interpretación de sueños y formaciones del inconsciente", icon: "bx-moon" },
        { text: "Mecanismos de defensa y resistencias", icon: "bx-shield" },
        { text: "Transferencia y contratransferencia en el análisis", icon: "bx-transfer-alt" }
      ]
    }
  },

  PSICOLOGIA_GENERAL: {
    urlSegment: 'PsicologiaGeneral',
    displayName: 'Psicología General',
    config: {
      avaId: 37, // Nuevo avaId
      assistantName: 'ACADEL - Psicología General',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Psicología General",
      message: "🎓 Soy ACADEL, el capibara fundacional que te guía por los pilares de la psicología científica. Desde procesos básicos hasta enfoques teóricos, construyo contigo los cimientos del conocimiento psicológico con rigor académico y claridad conceptual.",
      textareaPlaceholder: "Escribe tu consulta sobre psicología general aquí...",
      assistantLabel: "ACADEL - Psicología General",
      cssClass: "psicologia-general-welcome",
      headerIcon: "bx-book-reader",
      suggestions: [
        { text: "Historia y escuelas de la psicología", icon: "bx-time" },
        { text: "Procesos cognitivos: percepción, memoria, atención", icon: "bx-brain" },
        { text: "Bases biológicas del comportamiento", icon: "bx-dna" },
        { text: "Metodología de investigación en psicología", icon: "bx-line-chart" }
      ]
    }
  },

  PSICOLOGIA_SOCIAL: {
    urlSegment: 'PsicologiaSocial',
    displayName: 'Psicología Social',
    config: {
      avaId: 38, // Nuevo avaId
      assistantName: 'ACADEL - Psicología Social',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Psicología Social",
      message: "👥 Soy ACADEL, el capibara social que estudia cómo pensamos, sentimos y actuamos en el teatro de la vida social. Desde influencia hasta identidad grupal, te muestro cómo el contexto social moldea nuestra psique individual con experimentos clásicos y teorías actuales.",
      textareaPlaceholder: "Escribe tu consulta sobre psicología social aquí...",
      assistantLabel: "ACADEL - Psicología Social",
      cssClass: "psicologia-social-welcome",
      headerIcon: "bx-group",
      suggestions: [
        { text: "Influencia social: conformidad y obediencia", icon: "bx-network-chart" },
        { text: "Actitudes y cambio de actitudes", icon: "bx-trending-up" },
        { text: "Identidad social y procesos grupales", icon: "bx-user-circle" },
        { text: "Prejuicio, estereotipos y discriminación", icon: "bx-error-circle" }
      ]
    }
  },

  PSICOLOGIA_EVOLUTIVA: {
    urlSegment: 'PsicologiaEvolutiva',
    displayName: 'Psicología Evolutiva',
    config: {
      avaId: 40, // Nuevo avaId
      assistantName: 'ACADEL - Psicología Evolutiva',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Psicología Evolutiva",
      message: "🌱 Soy ACADEL, el capibara del desarrollo que te acompaña por el fascinante viaje de la psique humana desde la cuna hasta la vejez. Con teorías clásicas y evidencia contemporánea, exploramos cómo cambiamos, crecemos y nos desarrollamos a lo largo de la vida.",
      textareaPlaceholder: "Escribe tu consulta sobre psicología evolutiva aquí...",
      assistantLabel: "ACADEL - Psicología Evolutiva",
      cssClass: "psicologia-evolutiva-welcome",
      headerIcon: "bx-trending-up",
      suggestions: [
        { text: "Teorías del desarrollo: Piaget, Erikson, Vygotsky", icon: "bx-brain" },
        { text: "Desarrollo cognitivo y adquisición del lenguaje", icon: "bx-message-dots" },
        { text: "Desarrollo socioemocional y vínculos afectivos", icon: "bx-heart" },
        { text: "Ciclo vital y tareas evolutivas", icon: "bx-time-five" }
      ]
    }
  }
};

export const APP_VARIANTS = Object.fromEntries(
  Object.entries(VARIANTS).map(([key, variant]) => [key, variant.urlSegment])
);

export const URL_TO_VARIANT = Object.fromEntries(
  Object.entries(VARIANTS).map(([key, variant]) => [variant.urlSegment, key])
);

export const VARIANT_CONFIG = Object.fromEntries(
  Object.entries(VARIANTS).map(([key, variant]) => [variant.urlSegment, variant.welcomeConfig])
);

/**
 * Función central: Detecta la variante actual desde la URL
 * @returns {Object} Información de la variante detectada
 */
function detectVariantFromUrl() {
  const path = window.location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  const firstSegment = pathSegments[0]; // Mantener case-sensitive para slugs como "CienciasBasicas"
  
  for (const [key, variant] of Object.entries(VARIANTS)) {
    if (variant.urlSegment === firstSegment) {
      _lastDetectedVariantKey = key;
      _lastDetectedUrlSegment = variant.urlSegment;
      return {
        variantKey: key,
        urlSegment: variant.urlSegment
      };
    }
  }
  
  const lowerFirstSegment = firstSegment?.toLowerCase();
  for (const [key, variant] of Object.entries(VARIANTS)) {
    if (variant.urlSegment.toLowerCase() === lowerFirstSegment) {
      _lastDetectedVariantKey = key;
      _lastDetectedUrlSegment = variant.urlSegment;
      return {
        variantKey: key,
        urlSegment: variant.urlSegment
      };
    }
  }
  
  return { variantKey: null, urlSegment: null };
}

/**
 * Encuentra una variante por su segmento de URL
 * @param {string} segment - Segmento de URL
 * @returns {string|null} Clave de la variante o null si no se encuentra
 */
export function findVariantByUrlSegment(segment) {
  if (!segment) return null;
  
  // Primero buscar exacto (case-sensitive)
  for (const [key, variant] of Object.entries(VARIANTS)) {
    if (variant.urlSegment === segment) {
      return key;
    }
  }
  
  // Luego buscar insensible a mayúsculas/minúsculas
  const normalizedSegment = segment.toLowerCase();
  return Object.entries(VARIANTS).find(
    ([_, variant]) => variant.urlSegment.toLowerCase() === normalizedSegment
  )?.[0] || null;
}

/**
 * Obtener clave de variante a partir de segmento de URL
 * @param {string} urlSegment - Segmento de URL (ej: "CienciasBasicas")
 * @returns {string} Clave de variante (ej: "CIENCIAS_BASICAS")
 */
export function getVariantKeyFromUrl(urlSegment) {
  return findVariantByUrlSegment(urlSegment);
}

/**
 * Establece la variante actual de la aplicación
 * @param {string} variantKey - Clave de la variante en VARIANTS
 * @returns {boolean} true si se estableció correctamente
 */
export function setCurrentVariant(variantKey) {
  if (variantKey in VARIANTS) {
    _lastDetectedVariantKey = variantKey;
    _lastDetectedUrlSegment = VARIANTS[variantKey].urlSegment;
    console.log(`Variante registrada: ${variantKey} (${VARIANTS[variantKey].displayName})`);
    return true;
  }
  
  const upperKey = variantKey?.toUpperCase();
  if (upperKey && upperKey in VARIANTS) {
    _lastDetectedVariantKey = upperKey;
    _lastDetectedUrlSegment = VARIANTS[upperKey].urlSegment;
    console.log(`Variante registrada (normalizada): ${upperKey} (${VARIANTS[upperKey].displayName})`);
    return true;
  }
  
  console.error(`No se pudo registrar la variante: ${variantKey}`);
  return false;
}

/**
 * Establece la variante actual desde un segmento de URL
 * @param {string} urlSegment - Segmento de URL (ej: "CienciasBasicas")
 * @returns {boolean} true si se estableció correctamente
 */
export function setCurrentVariantFromUrl(urlSegment) {
  if (!urlSegment) {
    console.error("setCurrentVariantFromUrl: urlSegment es undefined o null");
    return false;
  }
  
  console.log(`Buscando variante para segmento URL: ${urlSegment}`);
  
  const variantKey = findVariantByUrlSegment(urlSegment);
  if (variantKey) {
    _lastDetectedVariantKey = variantKey;
    _lastDetectedUrlSegment = VARIANTS[variantKey].urlSegment;
    console.log(`Variante establecida: ${variantKey} (${VARIANTS[variantKey].displayName})`);
    return true;
  }
  
  console.error(`No se pudo establecer variante para: ${urlSegment}`);
  return false;
}

/**
 * Obtiene el segmento de URL de la variante actual
 * @returns {string} Segmento de URL de la variante actual
 */
export function getCurrentVariant() {
  const result = detectVariantFromUrl();
  return result.urlSegment;
}

/**
 * Obtiene la clave de la variante actual
 * @returns {string} Clave de la variante actual (ej: "CIENCIAS_BASICAS")
 */
export function getCurrentVariantKey() {
  const result = detectVariantFromUrl();
  return result.variantKey;
}

/**
 * Obtiene el nombre para mostrar de la variante actual
 * @returns {string} Nombre para mostrar de la variante actual
 */
export function getCurrentVariantDisplayName() {
  const { variantKey } = detectVariantFromUrl();
  return VARIANTS[variantKey]?.displayName;
}

/**
 * Obtiene la configuración completa de la variante actual
 * @returns {Object} Configuración completa de la variante actual
 */
export function getCurrentVariantFullConfig() {
  const { variantKey } = detectVariantFromUrl();
  return VARIANTS[variantKey];
}

// Configuración de UI (común para todas las variantes)
export const UI_CONFIG = {
  initialContainerHeight: 129,
  maxTextareaHeight: 200,
  maxContainerHeight: 280,
  minContainerHeight: 45,
  errorToastDuration: 3000,
  errorToastFadeTime: 500,
  previewTimeout: 4000
};

/**
 * Obtiene la configuración de URLs basada en la variante actual
 * @returns {Object} Configuración de URLs
 */
export function getUrlConfig() {
  const urlSegment = getCurrentVariant();
  return {
    basePath: `/${urlSegment}`,
    chatPath: (chatId) => `/${urlSegment}/${chatId}`
  };
}

/**
 * Obtiene la configuración del asistente basada en la variante actual
 * @returns {Object} Configuración del asistente
 */
export function getAppConfig() {
  const { variantKey } = detectVariantFromUrl();
  return VARIANTS[variantKey]?.config;
}

/**
 * Obtiene la configuración de bienvenida basada en la variante actual
 * @returns {Object} Configuración de bienvenida
 */
export function getWelcomeConfig() {
  const { variantKey } = detectVariantFromUrl();
  return VARIANTS[variantKey]?.welcomeConfig;
}

/**
 * Obtiene la configuración de rutas de API basada en la variante actual
 * @returns {Object} Configuración de rutas de API
 */
export function getApiRoutes() {
  const urlSegment = getCurrentVariant();
  
  if (!urlSegment) {
    console.error("ERROR: getCurrentVariant() devolvió undefined en getApiRoutes()");
    
    // Intento de recuperación - leer directamente de la URL
    const path = window.location.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    
    console.log(`Recuperación de emergencia - usando segmento URL: ${firstSegment}`);
    
    return {
      authentication: '/api/usuarios/authenticate',
      userProfile: (userId) => `/api/perfil/${userId}`,
      chatHistory: (userId, avaId) => `/api/chats/chats/${userId}/${avaId}`,
      chatMessages: (chatId) => `/api/chats/chats/${chatId}/messages`,
      chatInteraction: (chatId) => `/api/chats/${chatId}/interaction`,
      chatTitle: (chatId) => `/api/chats/chats/${chatId}/title`,
      deleteChat: (chatId) => `/api/chats/chats/${chatId}`,
      createChat: '/api/chats/chats',
      checkTokenLimits: '/api/openai/check-token-limits',
      query: `/api/openai/query-${firstSegment}`,
      multimodal: `/api/openai/multimodal-${firstSegment}`,
      multimodalWithoutSaving: `/api/openai/multimodal-${firstSegment}-without-saving`
    };
  }
  
  return {
    authentication: '/api/usuarios/authenticate',
    userProfile: (userId) => `/api/perfil/${userId}`,
    chatHistory: (userId, avaId) => `/api/chats/chats/${userId}/${avaId}`,
    chatMessages: (chatId) => `/api/chats/chats/${chatId}/messages`,
    chatInteraction: (chatId) => `/api/chats/${chatId}/interaction`,
    chatTitle: (chatId) => `/api/chats/chats/${chatId}/title`,
    deleteChat: (chatId) => `/api/chats/chats/${chatId}`,
    createChat: '/api/chats/chats',
    checkTokenLimits: '/api/openai/check-token-limits',
    query: `/api/openai/query-${urlSegment}`,
    multimodal: `/api/openai/multimodal-${urlSegment}`,
    multimodalWithoutSaving: `/api/openai/multimodal-${urlSegment}-without-saving`
  };
}

// Mensajes para el usuario (comunes para todas las variantes)
export const MESSAGES = {
  errors: {
    authFailed: 'Autenticación fallida',
    loadChatsFailed: 'Error cargando chats',
    loadMessagesFailed: 'Error cargando mensajes',
    createChatFailed: 'Error creando nuevo chat',
    updateChatFailed: 'Error actualizando chat',
    deleteChatFailed: 'Error eliminando chat',
    invalidChat: 'Chat no válido',
    invalidResponse: 'Formato de respuesta inválido del servidor',
    invalidExam: 'Estructura de examen inválida',
    serverError: (status) => `Error del servidor (${status})`,
    processingError: 'Error en el procesamiento'
  },
  confirmations: {
    deleteChat: '¿Estás seguro de eliminar este chat?',
    emptyChatModal: 'Este chat está vacío.'
  }
};

// Selectores para elementos DOM (comunes para todas las variantes)
export const DOM_SELECTORS = {
  textarea: '.input-box textarea',
  container: '.input-box',
  chatList: '#chatList',
  newChatBtn: '.new-chat-btn',
  sendButton: '.input-box button:nth-child(2)',
  chatMessages: '.chat-messages',
  attachButton: '.attach-btn', 
  filePreviewContainer: '.file-preview-container',
  imageUpload: '#image-upload',
  documentUpload: '#document-upload',
  themeToggle: '#themeToggle',
  body: 'body',
  sidebar: '.sidebar',
  sidebarToggle: '.sidebar-toggle',
  accountItem: '#accountItem',
  modals: {
    confirmationModal: '#confirmationModal',
    modalMessage: '#modalMessage',
    modalConfirm: '#modalConfirm',
    modalCancel: '#modalCancel',
    emptyChatModal: '#emptyChatModal',
    emptyModalClose: '#emptyModalClose'
  }
};

export const URL_CONFIG = getUrlConfig();
export const APP_CONFIG = getAppConfig();
export const API_ROUTES = getApiRoutes();

export default {
  VARIANTS,
  APP_VARIANTS,
  URL_TO_VARIANT,
  VARIANT_CONFIG,
  
  findVariantByUrlSegment,
  getVariantKeyFromUrl,
  setCurrentVariant,
  setCurrentVariantFromUrl,
  getCurrentVariant,
  getCurrentVariantKey,
  getCurrentVariantDisplayName,
  getCurrentVariantFullConfig,
  
  UI_CONFIG,
  getApiRoutes,
  getUrlConfig,
  getAppConfig,
  getWelcomeConfig,
  
  API_ROUTES,
  URL_CONFIG,
  APP_CONFIG,
  MESSAGES,
  DOM_SELECTORS
};