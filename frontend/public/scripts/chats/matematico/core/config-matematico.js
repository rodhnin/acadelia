/**
 * config.js matematico - Configuración COMPLETA para todos los chats matemáticos con datos del CSV
 * VERSIÓN ULTRA-ROBUSTA: Se basa en URL en lugar de estado global
 */

// Variables para tracking interno (solo para depuración)
let _lastDetectedVariantKey = null;
let _lastDetectedUrlSegment = null;

/**
 * Definición COMPLETA de todas las variantes matemáticas basadas en el CSV de la base de datos
 */
export const VARIANTS = {
  FISICA: {
    urlSegment: 'fisica',
    displayName: 'Física y Fenómenos Naturales',
    config: {
      avaId: 6, // Del CSV: Física y Fenómenos Naturales
      assistantName: 'Ing. ACADEL - Física',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Física y Fenómenos Naturales",
      message: "🔬 Soy Ing. ACADEL, tu capibara que domina desde la cinemática hasta las ecuaciones de Maxwell. Te enseño física como un arte lógico y divertido con humor, analogías claras y rigor conceptual.",
      textareaPlaceholder: "Escribe tu consulta de física aquí...",
      assistantLabel: "Ing. ACADEL - Física",
      cssClass: "physics-welcome",
      headerIcon: "bx-atom",
      suggestions: [
        { text: "Explicar las leyes de Newton con ejemplos", icon: "bx-move" },
        { text: "Resolver problemas de cinemática", icon: "bx-time-five" },
        { text: "Analizar circuitos eléctricos", icon: "bx-plug" },
        { text: "Crear examen de termodinámica", icon: "bx-book-content" }
      ]
    }
  },
  
  ALGEBRA: {
    urlSegment: 'Algebra',
    displayName: 'Álgebra y Análisis',
    config: {
      avaId: 7, // Del CSV: Álgebra y Análisis
      assistantName: 'Ing. ACADEL - Álgebra',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Álgebra y Análisis Matemático",
      message: "📐 Soy Ing. ACADEL, el capibara genial que convierte ecuaciones en aventuras lógicas. Domino desde álgebra lineal hasta grafos discretos, explicando con humor y analogías que te hacen decir: '¡Ahora sí entendí!'",
      textareaPlaceholder: "Escribe tu consulta de álgebra aquí...",
      assistantLabel: "Ing. ACADEL - Álgebra",
      cssClass: "algebra-welcome",
      headerIcon: "bx-math",
      suggestions: [
        { text: "Resolver sistemas de ecuaciones lineales", icon: "bx-grid-alt" },
        { text: "Explicar espacios vectoriales", icon: "bx-vector" },
        { text: "Analizar matrices y determinantes", icon: "bx-table" },
        { text: "Generar ejercicios de álgebra lineal", icon: "bx-calculator" }
      ]
    }
  },
  
  CALCULO: {
    urlSegment: 'Calculo',
    displayName: 'Cálculo',
    config: {
      avaId: 8, // Del CSV: Cálculo
      assistantName: 'Ing. ACADEL - Cálculo',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Cálculo",
      message: "📊 Soy Ing. ACADEL, el capibara que hace que derivadas, integrales y ecuaciones diferenciales dejen de parecer pesadillas. Con analogías geniales y humor oscuro, convierto el cálculo en algo lógico y comprensible.",
      textareaPlaceholder: "Escribe tu consulta de cálculo aquí...",
      assistantLabel: "Ing. ACADEL - Cálculo",
      cssClass: "calculus-welcome",
      headerIcon: "bx-line-chart",
      suggestions: [
        { text: "Resolver límites complejos", icon: "bx-trending-up" },
        { text: "Calcular derivadas e integrales", icon: "bx-math" },
        { text: "Analizar series y sucesiones", icon: "bx-infinite" },
        { text: "Crear examen de ecuaciones diferenciales", icon: "bx-book-open" }
      ]
    }
  },
  
  QUIMICA: {
    urlSegment: 'Quimica',
    displayName: 'Química',
    config: {
      avaId: 9, // Del CSV: Química
      assistantName: 'Ing. ACADEL - Química',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Química y Procesos Químicos",
      message: "🧪 Soy Ing. ACADEL, el capibara que convierte la química en algo que finalmente tiene sentido. Ya sea reacciones orgánicas, equilibrio ácido-base o cinética industrial, te lo explico como si hablaras con un colega brillante y divertido.",
      textareaPlaceholder: "Escribe tu consulta de química aquí...",
      assistantLabel: "Ing. ACADEL - Química",
      cssClass: "chemistry-welcome",
      headerIcon: "bx-test-tube",
      suggestions: [
        { text: "Balancear ecuaciones químicas", icon: "bx-git-compare" },
        { text: "Explicar enlaces y estructuras moleculares", icon: "bx-link" },
        { text: "Resolver problemas de estequiometría", icon: "bx-calculator" },
        { text: "Analizar reacciones orgánicas", icon: "bx-dna" }
      ]
    }
  },
  
  ESTADISTICA: {
    urlSegment: 'Estadistica',
    displayName: 'Estadística y Probabilidad',
    config: {
      avaId: 10, // Del CSV: Estadística y Probabilidad
      assistantName: 'Ing. ACADEL - Estadística',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Estadística y Probabilidad",
      message: "📊 Soy Ing. ACADEL, el capibara que convierte la estadística en algo que finalmente entiendes y hasta disfrutas. Desde probabilidades hasta interpretar p-valores con humor y sin miedo, te llevo paso a paso con ejemplos reales.",
      textareaPlaceholder: "Escribe tu consulta de estadística aquí...",
      assistantLabel: "Ing. ACADEL - Estadística",
      cssClass: "statistics-welcome",
      headerIcon: "bx-bar-chart-alt-2",
      suggestions: [
        { text: "Calcular probabilidades y distribuciones", icon: "bx-pie-chart-alt" },
        { text: "Análisis de datos y gráficos estadísticos", icon: "bx-stats" },
        { text: "Pruebas de hipótesis e intervalos de confianza", icon: "bx-check-circle" },
        { text: "Crear ejercicios de regresión y correlación", icon: "bx-trending-up" }
      ]
    }
  },

  // ===== NUEVAS VARIANTES AGREGADAS =====

  RESISTENCIA_MATERIALES: {
    urlSegment: 'ResistenciaMateriales',
    displayName: 'Mecánica y Resistencia de Materiales',
    config: {
      avaId: 11, // Del CSV: Mecánica y Resistencia de Materiales
      assistantName: 'Ing. ACADEL - Mecánica',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Mecánica y Resistencia de Materiales",
      message: "🏗️ Soy Ing. ACADEL, el capibara que convierte la resistencia de materiales en algo que finalmente comprendes sin romperte la cabeza. Desde vigas que se doblan hasta columnas que pandean, te guío con humor y mucha paciencia estructural.",
      textareaPlaceholder: "Escribe tu consulta de mecánica aquí...",
      assistantLabel: "Ing. ACADEL - Mecánica",
      cssClass: "mechanics-welcome",
      headerIcon: "bx-building",
      suggestions: [
        { text: "Analizar diagramas de cuerpo libre", icon: "bx-vector" },
        { text: "Calcular esfuerzos y deformaciones", icon: "bx-trending-down" },
        { text: "Resolver problemas de flexión en vigas", icon: "bx-layer" },
        { text: "Diseñar elementos estructurales", icon: "bx-cube" }
      ]
    }
  },

  ELECTRICIDAD_ELECTRONICA: {
    urlSegment: 'ElectricidadElectronica',
    displayName: 'Electricidad, Electrónica y Sistemas de Control',
    config: {
      avaId: 12, // Del CSV: Electricidad, Electrónica y Sistemas de Control
      assistantName: 'Ing. ACADEL - Electrónica',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Electricidad, Electrónica y Control",
      message: "⚡ Soy Ing. ACADEL, el capibara que convierte circuitos, transistores y sistemas de control en algo que por fin entiendes sin cortocircuitarte la mente. Desde Ohm hasta PID, te guío con humor ácido y analogías brillantes.",
      textareaPlaceholder: "Escribe tu consulta de electrónica aquí...",
      assistantLabel: "Ing. ACADEL - Electrónica",
      cssClass: "electronics-welcome",
      headerIcon: "bx-chip",
      suggestions: [
        { text: "Analizar circuitos AC y DC", icon: "bx-radio-circle-marked" },
        { text: "Diseñar sistemas de control PID", icon: "bx-slider-alt" },
        { text: "Explicar funcionamiento de transistores", icon: "bx-microchip" },
        { text: "Resolver problemas de transformadores", icon: "bx-transfer" }
      ]
    }
  },

  MATEMATICA_AVANZADA: {
    urlSegment: 'MatematicaAvz',
    displayName: 'Matemáticas Avanzadas',
    config: {
      avaId: 13, // Del CSV: Matemáticas Avanzadas
      assistantName: 'Ing. ACADEL - Matemáticas Avanzadas',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Matemáticas Avanzadas",
      message: "📐 Soy Ing. ACADEL, el capibara que hace que hasta los espacios de Hilbert tengan sentido (más o menos). Con humor elegante y analogías brillantes, te guío por análisis complejo y cálculo tensorial sin pánico existencial.",
      textareaPlaceholder: "Escribe tu consulta de matemáticas avanzadas aquí...",
      assistantLabel: "Ing. ACADEL - Matemáticas Avanzadas",
      cssClass: "advanced-math-welcome",
      headerIcon: "bx-infinite",
      suggestions: [
        { text: "Resolver ecuaciones diferenciales parciales", icon: "bx-code-curly" },
        { text: "Analizar espacios funcionales", icon: "bx-sitemap" },
        { text: "Aplicar análisis complejo", icon: "bx-shape-circle" },
        { text: "Estudiar métodos numéricos", icon: "bx-calculator" }
      ]
    }
  },

  COMPUTACION_SISTEMAS: {
    urlSegment: 'ComputacionSistemas',
    displayName: 'Computación y Sistemas',
    config: {
      avaId: 14, // Del CSV: Computación y Sistemas
      assistantName: 'Ing. ACADEL - Computación',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Computación y Sistemas",
      message: "💻 Soy Ing. ACADEL, el capibara que debuggea tu cerebro antes que tu código. Con ironía elegante y analogías geniales, convierto punteros, hilos y arquitecturas en cosas que por fin tienen sentido.",
      textareaPlaceholder: "Escribe tu consulta de computación aquí...",
      assistantLabel: "Ing. ACADEL - Computación",
      cssClass: "computer-science-welcome",
      headerIcon: "bx-code-alt",
      suggestions: [
        { text: "Explicar estructuras de datos complejas", icon: "bx-data" },
        { text: "Analizar algoritmos de ordenamiento", icon: "bx-sort" },
        { text: "Optimizar bases de datos", icon: "bx-server" },
        { text: "Crear arquitecturas de software", icon: "bx-network-chart" }
      ]
    }
  },

  REDES_SEGURIDAD: {
    urlSegment: 'RedesSeguridad',
    displayName: 'Redes y Seguridad Informática',
    config: {
      avaId: 15, // Del CSV: Redes y Seguridad Informática
      assistantName: 'Dr. ACADEL - Redes y Seguridad',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Redes y Seguridad Informática",
      message: "🛡️ Soy Dr. ACADEL, el capibara que te enseña por qué tu red no es lenta, es vulnerable. Con humor hacker y ejemplos reales, hago que firewalls, protocolos y exploits por fin hablen humano.",
      textareaPlaceholder: "Escribe tu consulta de redes y seguridad aquí...",
      assistantLabel: "Dr. ACADEL - Redes y Seguridad",
      cssClass: "networks-security-welcome",
      headerIcon: "bx-shield-quarter",
      suggestions: [
        { text: "Configurar firewalls y VPNs", icon: "bx-shield" },
        { text: "Analizar protocolos de red", icon: "bx-network-chart" },
        { text: "Detectar vulnerabilidades", icon: "bx-bug" },
        { text: "Implementar criptografía", icon: "bx-lock" }
      ]
    }
  },

  EPIDEMIOLOGIA: {
    urlSegment: 'Epidemiologia',
    displayName: 'Salud Pública y Epidemiología',
    config: {
      avaId: 19, // Del CSV: Salud Pública y Epidemiología
      assistantName: 'Dr. ACADEL - Epidemiología',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Salud Pública y Epidemiología",
      message: "📊 Soy Dr. ACADEL, el capibara que te enseña cómo pensar en poblaciones, prevención y políticas sin perderte en fórmulas ni burocracias. Con humor estadístico y casos reales, convierto la epidemiología en ciencia aplicable.",
      textareaPlaceholder: "Escribe tu consulta de epidemiología aquí...",
      assistantLabel: "Dr. ACADEL - Epidemiología",
      cssClass: "epidemiology-welcome",
      headerIcon: "bx-health",
      suggestions: [
        { text: "Analizar brotes epidemiológicos", icon: "bx-line-chart" },
        { text: "Calcular tasas de incidencia", icon: "bx-calculator" },
        { text: "Diseñar estudios de cohorte", icon: "bx-group" },
        { text: "Evaluar programas de salud pública", icon: "bx-check-shield" }
      ]
    }
  },

  MATEMATICA_MEDICA: {
    urlSegment: 'MatematicaMedica',
    displayName: 'Matemáticas y Métodos Cuantitativos en Medicina',
    config: {
      avaId: 20, // Del CSV: Matemáticas y Métodos Cuantitativos en Medicina
      assistantName: 'Dr. ACADEL - Matemáticas Médicas',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Matemáticas y Métodos Cuantitativos",
      message: "📈 Soy Dr. ACADEL, el capibara que transforma la bioestadística y matemáticas clínicas en herramientas claras y aplicables. Con humor numérico y rigor médico, te enseño a dominar desde p-valores hasta diseño de estudios.",
      textareaPlaceholder: "Escribe tu consulta de matemáticas médicas aquí...",
      assistantLabel: "Dr. ACADEL - Matemáticas Médicas",
      cssClass: "medical-math-welcome",
      headerIcon: "bx-math",
      suggestions: [
        { text: "Interpretar intervalos de confianza", icon: "bx-error-circle" },
        { text: "Analizar curvas de supervivencia", icon: "bx-trending-up" },
        { text: "Diseñar estudios clínicos", icon: "bx-clipboard" },
        { text: "Validar pruebas diagnósticas", icon: "bx-check-double" }
      ]
    }
  },
  
  CIENCIAS_APLICADAS: {
    urlSegment: 'CienciasAplicadas',
    displayName: 'Ciencias Básicas Aplicadas',
    config: {
      avaId: 2, // Del CSV: Ciencias Básicas Aplicadas
      assistantName: 'Dr. ACADEL - Ciencias Aplicadas',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Ciencias Básicas Aplicadas",
      message: "🧪 Soy Dr. ACADEL, el capibara brillante que enseña medicina desde la raíz molecular, integrando bioquímica, genética y microbiología con humor, claridad y enfoque clínico. Transformo rutas metabólicas y ADN en conocimiento aplicado.",
      textareaPlaceholder: "Escribe tu consulta de ciencias aplicadas aquí...",
      assistantLabel: "Dr. ACADEL - Ciencias Aplicadas",
      cssClass: "applied-sciences-welcome",
      headerIcon: "bx-dna",
      suggestions: [
        { text: "Explicar rutas metabólicas y bioquímica", icon: "bx-network-chart" },
        { text: "Analizar genética molecular y ADN", icon: "bx-dna" },
        { text: "Estudiar microbiología y patógenos", icon: "bx-bug" },
        { text: "Crear mapa conceptual de bioquímica", icon: "bx-sitemap" }
      ]
    }
  },
  MICROECONOMIA: {
    urlSegment: 'Microeconomia',
    displayName: 'Microeconomía',
    config: {
      avaId: 21, // Del CSV
      assistantName: 'Prof. ACADEL - Microeconomía',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Microeconomía",
      message: "💰 Soy Prof. ACADEL, el capibara economista que convierte curvas de oferta y demanda en algo que finalmente entiendes. Con humor de mercado y ejemplos cotidianos, te enseño desde teoría del consumidor hasta equilibrios de Nash.",
      textareaPlaceholder: "Escribe tu consulta de microeconomía aquí...",
      assistantLabel: "Prof. ACADEL - Microeconomía",
      cssClass: "microeconomia-welcome",
      headerIcon: "bx-trending-up",
      suggestions: [
        { text: "Explicar teoría del consumidor y utilidad", icon: "bx-shopping-bag" },
        { text: "Analizar estructuras de mercado", icon: "bx-store-alt" },
        { text: "Resolver ejercicios de elasticidad", icon: "bx-line-chart" },
        { text: "Crear gráficos de oferta y demanda", icon: "bx-stats" }
      ]
    }
  },

  ECONOMETRIA: {
    urlSegment: 'Econometria',
    displayName: 'Econometría',
    config: {
      avaId: 23, // Del CSV
      assistantName: 'ACADEL - Econometría',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Econometría",
      message: "📊 Soy ACADEL, el capibara estadístico que hace que R², p-valores y regresiones por fin tengan sentido. Con humor cuantitativo y ejemplos prácticos, domino desde MCO hasta modelos de series temporales sin crisis existencial.",
      textareaPlaceholder: "Escribe tu consulta de econometría aquí...",
      assistantLabel: "ACADEL - Econometría",
      cssClass: "econometria-welcome",
      headerIcon: "bx-bar-chart-square",
      suggestions: [
        { text: "Interpretar resultados de regresión", icon: "bx-line-chart" },
        { text: "Analizar series temporales", icon: "bx-time-five" },
        { text: "Resolver problemas de autocorrelación", icon: "bx-shuffle" },
        { text: "Diseñar modelos econométricos", icon: "bx-math" }
      ]
    }
  },

  ECONOMIA_INTERNACIONAL: {
    urlSegment: 'EconomiaInternacional',
    displayName: 'Economía Internacional',
    config: {
      avaId: 26, // Del CSV
      assistantName: 'Prof. ACADEL - Economía Internacional',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Economía Internacional",
      message: "🌍 Soy Prof. ACADEL, el capibara globalizado que navega aranceles, tipos de cambio y balanzas comerciales como un verdadero diplomático económico. Con humor internacional y casos reales, explico desde ventajas comparativas hasta crisis financieras globales.",
      textareaPlaceholder: "Escribe tu consulta de economía internacional aquí...",
      assistantLabel: "Prof. ACADEL - Economía Internacional",
      cssClass: "economia-internacional-welcome",
      headerIcon: "bx-globe",
      suggestions: [
        { text: "Analizar teorías del comercio internacional", icon: "bx-transfer-alt" },
        { text: "Explicar tipos de cambio y paridades", icon: "bx-dollar-circle" },
        { text: "Evaluar políticas comerciales", icon: "bx-world" },
        { text: "Estudiar balanza de pagos", icon: "bx-calculator" }
      ]
    }
  },

  FINANZAS: {
    urlSegment: 'Finanzas',
    displayName: 'Finanzas y Economía Monetaria',
    config: {
      avaId: 27, // Del CSV
      assistantName: 'Prof. ACADEL - Finanzas',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Finanzas y Economía Monetaria",
      message: "💵 Soy Prof. ACADEL, el capibara financiero que convierte el mundo de bonos, acciones y política monetaria en algo comprensible y hasta divertido. Con humor de Wall Street y ejemplos prácticos, te guío desde valor presente hasta modelos de pricing sin pánico.",
      textareaPlaceholder: "Escribe tu consulta de finanzas aquí...",
      assistantLabel: "Prof. ACADEL - Finanzas",
      cssClass: "finanzas-welcome",
      headerIcon: "bx-money",
      suggestions: [
        { text: "Calcular valor presente y futuro", icon: "bx-calculator" },
        { text: "Analizar portafolios de inversión", icon: "bx-pie-chart-alt" },
        { text: "Explicar política monetaria", icon: "bxs-bank" },
        { text: "Evaluar instrumentos financieros", icon: "bx-credit-card" }
      ]
    }
  },

  CALCULO_ECONOMICO: {
    urlSegment: 'CalculoEconomico',
    displayName: 'Cálculo Económico',
    config: {
      avaId: 30, // Del CSV
      assistantName: 'Prof. ACADEL - Cálculo Económico',
      assistantImagePath: '/images/Perfil_claro.gif'
    },
    welcomeConfig: {
      title: "Bienvenido a Cálculo Económico",
      message: "📊 Soy Prof. ACADEL, el capibara matemático que une cálculo y economía sin que te dé dolor de cabeza. Con humor diferencial y ejemplos aplicados, transformo derivadas, integrales y optimización en herramientas poderosas para análisis económico.",
      textareaPlaceholder: "Escribe tu consulta de cálculo económico aquí...",
      assistantLabel: "Prof. ACADEL - Cálculo Económico",
      cssClass: "calculo-economico-welcome",
      headerIcon: "bx-math",
      suggestions: [
        { text: "Resolver problemas de optimización", icon: "bx-trending-up" },
        { text: "Calcular elasticidades con derivadas", icon: "bx-line-chart" },
        { text: "Analizar funciones de producción", icon: "bxs-factory" },
        { text: "Estudiar modelos de crecimiento", icon: "bx-stats" }
      ]
    }
  },

  PSICOESTADISTICA: {
  urlSegment: 'Psicoestadistica',
  displayName: 'Estadística en Psicología',
  config: {
    avaId: 33, // Del CSV: Estadística en Psicología
    assistantName: 'Dr. ACADEL - Psicoestadística',
    assistantImagePath: '/images/Perfil_claro.gif'
  },
  welcomeConfig: {
    title: "Bienvenido a Estadística en Psicología",
    message: "📊 Soy ACADEL, el capibara estadístico que convierte psicometría, SPSS y diseños de investigación en herramientas que realmente entiendes y aplicas. Con humor cuantitativo y rigor científico, te guío desde escalas de medición hasta análisis factoriales sin crisis estadística.",
    textareaPlaceholder: "Escribe tu consulta de psicoestadística aquí...",
    assistantLabel: "ACADEL - Psicoestadística",
    cssClass: "psicostats-welcome",
    headerIcon: "bx-bar-chart-alt-2",
    suggestions: [
      { text: "Analizar propiedades psicométricas de escalas", icon: "bx-check-double" },
      { text: "Interpretar resultados de SPSS y R", icon: "bx-data" },
      { text: "Diseñar investigaciones experimentales", icon: "bx-test-tube" },
      { text: "Realizar análisis factorial y de confiabilidad", icon: "bx-network-chart" }
    ]
  }
}
};

// Para compatibilidad con código existente
export const APP_VARIANTS = Object.fromEntries(
  Object.entries(VARIANTS).map(([key, variant]) => [key, variant.urlSegment])
);

// Para compatibilidad con código existente
export const URL_TO_VARIANT = Object.fromEntries(
  Object.entries(VARIANTS).map(([key, variant]) => [variant.urlSegment, key])
);

// Para compatibilidad con código existente
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
  const firstSegment = pathSegments[0]; // Mantener case-sensitive para slugs como "CienciasAplicadas"
  
  // Buscar directamente en la estructura VARIANTS
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
  
  // Fallback con búsqueda insensible a mayúsculas/minúsculas
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
 * @param {string} urlSegment - Segmento de URL (ej: "CienciasAplicadas")
 * @returns {string} Clave de variante (ej: "CIENCIAS_APLICADAS")
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
  
  // Si no se encuentra la variante, intentar buscarla insensible a mayúsculas/minúsculas
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
 * @param {string} urlSegment - Segmento de URL (ej: "CienciasAplicadas")
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
 * @returns {string} Clave de la variante actual (ej: "CIENCIAS_APLICADAS")
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

// Configuración de MathJax (común para todas las variantes)
export const MATHJAX_CONFIG = {
  loader: {
    load: ['input/tex', 'output/chtml']
  },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true,
    packages: ['base', 'ams', 'autoload', 'html', 'physics'],
    tags: 'ams',
  },
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'no-math|nostem',
    processHtmlClass: 'mathjax-process'
  },
  startup: {
    typeset: false,
    pageReady: () => {
      return MathJax.startup.defaultPageReady();
    }
  }
};

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
    processingError: 'Error en el procesamiento',
    mathJaxError: 'Error al renderizar fórmulas matemáticas'
  },
  confirmations: {
    deleteChat: '¿Estás seguro de eliminar este chat?',
    emptyChatModal: 'Este chat está vacío.'
  }
};

// Regex para detectar expresiones LaTeX (común para todas las variantes)
export const LATEX_PATTERNS = {
  delimiters: /\$(.*?)\$|\\\((.*?)\\\)|\$\$(.*?)\$\$/,
  commands: /(?:\\(?:,|iint|iiint|lceil|rceil|lfloor|rfloor|binom|leq|geq|frac|int|,?d|partial|lim|sin|cos|tan|cot|sec|csc|theta|pi|infty|sqrt|sum|prod|begin|end|vec|mathcal|ln|log|exp|degree|alpha|beta|gamma|delta|Delta|nabla|pm|mp|otimes|oplus|forall|exists|in|subset|supset|cup|cap|varnothing|neg|wedge|vee|approx|equiv|propto|Gamma|zeta|varphi|text|bar|hat|sigma|mu|angle|triangle|parallel|perp|cong|sim|max|min|gcd|lcm|det|argmax|argmin|to|Rightarrow|times))|(?:\^(?:\{[^}]*\}|[^\s\{\}]))/
};

// Selectores para elementos DOM (comunes para todas las variantes)
export const DOM_SELECTORS = {
  textarea: '.input-box textarea',
  container: '.input-box',
  chatList: '#chatList',
  newChatBtn: '.new-chat-btn',
  sendButton: '.input-box button:nth-child(2)',
  mathButton: '#math-button',
  attachButton: '.attach-btn',
  filePreviewContainer: '.file-preview-container',
  chatMessages: '.chat-messages',
  themeToggle: '#themeToggle',
  body: 'body',
  sidebar: '.sidebar',
  sidebarToggle: '.sidebar-toggle',
  accountItem: '#accountItem',
  imageUpload: '#image-upload',
  documentUpload: '#document-upload',
  previewContainer: '.preview-container',
  mathPanel: '#mathPanel',
  mathEditorContainer: '#math-editor-container',
  latexInput: '#latex-input',
  interactivePreview: '#interactive-preview',
  modals: {
    confirmationModal: '#confirmationModal',
    modalMessage: '#modalMessage',
    modalConfirm: '#modalConfirm',
    modalCancel: '#modalCancel',
    emptyChatModal: '#emptyChatModal',
    emptyModalClose: '#emptyModalClose'
  }
};

// Para mantener compatibilidad con código existente - ahora se calculan bajo demanda
export const URL_CONFIG = getUrlConfig();
export const APP_CONFIG = getAppConfig();
export const API_ROUTES = getApiRoutes();

// Exportar todo para mantener compatibilidad
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
  MATHJAX_CONFIG,
  MESSAGES,
  LATEX_PATTERNS,
  DOM_SELECTORS
};