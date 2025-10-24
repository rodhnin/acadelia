import express from "express";
import { authenticateUser } from "../../middlewares/authMiddleware.js";

// ===== IMPORTAR MIDDLEWARES DE CONTROL DE ACCESO =====
import { 
  verifyToolAccess, 
  verifyAvaAccess, 
  checkTokenLimits,
  verifyToolAccessWithTokens,
  verifyAvaAccessWithTokens,
  verifySpecificToolAccess
} from "../../middlewares/accessControlMiddleware.js";

// ===== IMPORTACIONES DE CONTROLLERS =====
import { queryAgent, queryAgentMultimodal, queryAgentMultimodalWithoutSaving } from "../../controllers/chat/ias/herramientas/agentController.js";
import { queryPDF, queryPDFMultimodal, queryPDFMultimodalWithoutSaving } from "../../controllers/chat/ias/herramientas/pdfiaController.js";
import { queryFisica, queryFisicaMultimodal, queryFisicaMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/FisicaController.js";
import { queryRedesSeguridad, queryRedesSeguridadMultimodal, queryRedesSeguridadMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/NetworksSecurityController.js";
import { queryPatologia, queryPatologiaMultimodal, queryPatologiaMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/patologiaController.js";
import { queryAlgebra, queryAlgebraMultimodal, queryAlgebraMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/AlgebraController.js";
import { queryCienciasBasicas, queryCienciasBasicasMultimodal, queryCienciasBasicasMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/cienciasbasicasController.js";
import { queryMedicinaInterna, queryMedicinaInternaMultimodal, queryMedicinaInternaMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/medicinainternaController.js";
import { queryCienciasAplicadas, queryCienciasAplicadasMultimodal, queryCienciasAplicadasMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/cienciasaplicadasController.js";
import { querySemiologia, querySemiologiaMultimodal, querySemiologiaMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/semiologiaController.js";
import { queryEstadistica, queryEstadisticaMultimodal, queryEstadisticaMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/EstadisticaController.js";
import { queryCalculo, queryCalculoMultimodal, queryCalculoMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/calculoController.js";
import { queryChemistry, queryChemistryMultimodal, queryChemistryMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/chemistryController.js";
import { queryEspecialidadesMed1, queryEspecialidadesMed1Multimodal, queryEspecialidadesMed1MultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/especialidadesmed1Controller.js";
import { queryEspecialidadesMedicasII, queryEspecialidadesMedicasIIMultimodal, queryEspecialidadesMedicasIIMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/especialidadesmed2Controller.js";
import { queryCirugiaYUrgencias, queryCirugiaYUrgenciasMultimodal, queryCirugiaYUrgenciasMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/cirugiayurgenciasController.js";
import { queryEpidemiologia, queryEpidemiologiaMultimodal, queryEpidemiologiaMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/epidemiologiaController.js";
import { queryMatematicaMedica, queryMatematicaMedicaMultimodal, queryMatematicaMedicaMultimodalWithoutSaving } from "../../controllers/chat/ias/Medicina/matematicamedicaController.js";
import { queryElectricalEngineering, queryElectricalEngineeringMultimodal, queryElectricalEngineeringMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/ElectricalController.js";
import { queryMathematicsAdvanced, queryMathematicsAdvancedMultimodal, queryMathematicsAdvancedMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/MathematicsAdvancedController.js";
import { queryResistenciaMateriales, queryResistenciaMaterialesMultimodal, queryResistenciaMaterialesMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/ResistenciaMaterialesController.js";
import { queryComputacion, queryComputacionMultimodal, queryComputacionMultimodalWithoutSaving } from "../../controllers/chat/ias/Ingenieria/computacionController.js";
import { queryMicroeconomia, queryMicroeconomiaMultimodal, queryMicroeconomiaMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/MicroeconomiaController.js";
import { queryMacroeconomia, queryMacroeconomiaMultimodal, queryMacroeconomiaMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/macroeconomiaController.js";
import { queryEconometria, queryEconometriaMultimodal, queryEconometriaMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/EconometriaController.js";
import { queryHistoriaEconomica, queryHistoriaEconomicaMultimodal, queryHistoriaEconomicaMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/historiaeconomicaController.js";
import { queryDesarrolloEconomico, queryDesarrolloEconomicoMultimodal, queryDesarrolloEconomicoMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/desarrolloeconomicoController.js";
import { queryEconomiaInternacional, queryEconomiaInternacionalMultimodal, queryEconomiaInternacionalMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/EconomiaInternacionalController.js";
import { queryFinanzas, queryFinanzasMultimodal, queryFinanzasMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/FinanzasController.js";
import { queryPublicSector, queryPublicSectorMultimodal, queryPublicSectorMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/sectorpublicoController.js";
import { queryEconomiaLaboral, queryEconomiaLaboralMultimodal, queryEconomiaLaboralMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/economialaboralController.js";
import { queryCalculoEconomico, queryCalculoEconomicoMultimodal, queryCalculoEconomicoMultimodalWithoutSaving } from "../../controllers/chat/ias/economia/CalculoEconomicoController.js";
import { queryDSM5, queryDSM5Multimodal, queryDSM5MultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/dsm5Controller.js";
import { queryPsicoanalisis, queryPsicoanalisisMultimodal, queryPsicoanalisisMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/psicoanalisisController.js";
import { queryNeuropsicologia, queryNeuropsicologiaMultimodal, queryNeuropsicologiaMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/neuropsicologiaController.js";
import { queryPsicologiaEvolutiva, queryPsicologiaEvolutivaMultimodal, queryPsicologiaEvolutivaMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/psicologiaevolutivaController.js";
import { queryPsicologiaGeneral, queryPsicologiaGeneralMultimodal, queryPsicologiaGeneralMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/psicologiageneralController.js";
import { queryPsicologiaSocial, queryPsicologiaSocialMultimodal, queryPsicologiaSocialMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/psicologiasocialController.js";
import { queryEpistemologia, queryEpistemologiaMultimodal, queryEpistemologiaMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/epistemologiaController.js";
import { queryPsicopatologia, queryPsicopatologiaMultimodal, queryPsicopatologiaMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/psicopatologiaController.js";
import { queryPsicDiagnostico, queryPsicDiagnosticoMultimodal, queryPsicDiagnosticoMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/psicdiagnosticoController.js";
import { queryPsicoestadistica, queryPsicoestadisticaMultimodal, queryPsicoestadisticaMultimodalWithoutSaving } from "../../controllers/chat/ias/psicologia/PsicoestadisticaController.js";

const router = express.Router();

/**
 * =========================================================================
 * RUTAS DE HERRAMIENTAS (GRATUITAS CON LÍMITES)
 * =========================================================================
 * 
 * Middlewares aplicados:
 * 1. authenticateUser - Verificación de autenticación
 * 2. verifyToolAccessWithTokens - Verificación de límites de herramientas + tokens
 * 
 * Límites:
 * - Free: 10 mensajes/día, 3 mensajes/hora
 * - Premium: Ilimitado
 * - Tokens: 50,000 por chat para todos
 */

// ===== AGENTE GENERAL =====
/**
 * POST /api/openai/query-agent
 * Consultas de texto al agente general
 */
router.post("/query-agent", 
  authenticateUser,
  verifySpecificToolAccess('agente'), // Middleware específico para agente
  queryAgent
);

/**
 * POST /api/openai/multimodal-agent
 * Consultas multimodales (texto + imágenes) al agente general
 */
router.post("/multimodal-agent", 
  authenticateUser,
  verifySpecificToolAccess('agente'), // Middleware específico para agente
  queryAgentMultimodal
);

/**
 * POST /api/openai/multimodal-agent-without-saving
 * Consultas multimodales (texto + imágenes) al agente general SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-agent-without-saving", 
  authenticateUser,
  verifySpecificToolAccess('agente'), // Middleware específico para agente
  queryAgentMultimodalWithoutSaving
);

// ===== ANÁLISIS PDF =====
/**
 * POST /api/openai/query-pdf
 * Consultas de texto sobre documentos PDF
 */
router.post("/query-pdf", 
  authenticateUser,
  verifySpecificToolAccess('pdf'), // Middleware específico para PDF
  queryPDF
);

/**
 * POST /api/openai/multimodal-pdf
 * Consultas multimodales sobre documentos PDF
 */
router.post("/multimodal-pdf", 
  authenticateUser,
  verifySpecificToolAccess('pdf'), // Middleware específico para PDF
  queryPDFMultimodal
);

/**
 * POST /api/openai/multimodal-pdf-without-saving
 * Consultas multimodales sobre documentos PDF SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-pdf-without-saving", 
  authenticateUser,
  verifySpecificToolAccess('pdf'), // Middleware específico para PDF
  queryPDFMultimodalWithoutSaving
);

/**
 * =========================================================================
 * RUTAS DE AVAs (PREMIUM CON CARRERA ESPECÍFICA)
 * =========================================================================
 * 
 * Middlewares aplicados:
 * 1. authenticateUser - Verificación de autenticación
 * 2. verifyAvaAccessWithTokens - Verificación de acceso a carrera + tokens
 * 
 * Requisitos:
 * - Suscripción activa a la carrera específica
 * - Tokens: 50,000 por chat
 */

// ===== 🧠 PSICOLOGÍA GENERAL =====
/**
 * POST /api/openai/query-PsicologiaGeneral
 * Consultas de texto al AVA de Psicología General
 * Especialidades: Historia y Enfoques Psicológicos, Funciones Psicológicas, Bases Biológicas del Comportamiento
 */
router.post("/query-PsicologiaGeneral", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaGeneral
);

/**
 * POST /api/openai/multimodal-PsicologiaGeneral
 * Consultas multimodales al AVA de Psicología General
 * Análisis de: Experimentos psicológicos, diagramas teóricos, casos clínicos, imágenes de procesos cognitivos, esquemas neuropsicológicos
 */
router.post("/multimodal-PsicologiaGeneral", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaGeneralMultimodal
);

/**
 * POST /api/openai/multimodal-PsicologiaGeneral-without-saving
 * Consultas multimodales al AVA de Psicología General SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-PsicologiaGeneral-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaGeneralMultimodalWithoutSaving
);

// ===== 🧠 PSICOPATOLOGÍA =====
/**
 * POST /api/openai/query-Psicopatologia
 * Consultas de texto al AVA de Psicopatología
 * Especialidades: Diagnóstico Psicológico, Manuales Diagnósticos (DSM-5, CIE-11), Enfoques Teóricos (Psicodinámico, Cognitivo-Conductual, Fenomenológico)
 */
router.post("/query-Psicopatologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicopatologia
);

/**
 * POST /api/openai/multimodal-Psicopatologia
 * Consultas multimodales al AVA de Psicopatología
 * Análisis de: Casos clínicos, criterios diagnósticos DSM-5/CIE-11, esquemas teóricos, evaluaciones psicológicas, viñetas clínicas, algoritmos diagnósticos
 */
router.post("/multimodal-Psicopatologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicopatologiaMultimodal
);

/**
 * POST /api/openai/multimodal-Psicopatologia-without-saving
 * Consultas multimodales al AVA de Psicopatología SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Psicopatologia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicopatologiaMultimodalWithoutSaving
);

// ===== 📊 ESTADÍSTICA Y MÉTODOS CUANTITATIVOS EN PSICOLOGÍA =====
/**
 * POST /api/openai/query-Psicoestadistica
 * Consultas de texto al AVA de Estadística y Métodos Cuantitativos en Psicología
 * Especialidades: Psicometría, Estadística Descriptiva Psicológica, Estadística Inferencial en Investigación, Análisis de Datos Psicológicos
 */
router.post("/query-Psicoestadistica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicoestadistica
);

/**
 * POST /api/openai/multimodal-Psicoestadistica
 * Consultas multimodales al AVA de Estadística y Métodos Cuantitativos en Psicología
 * Análisis de: Análisis SPSS/R/JASP, escalas psicológicas, outputs estadísticos, gráficos de investigación, tablas de correlaciones, análisis factoriales
 */
router.post("/multimodal-Psicoestadistica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicoestadisticaMultimodal
);

/**
 * POST /api/openai/multimodal-Psicoestadistica-without-saving
 * Consultas multimodales al AVA de Estadística y Métodos Cuantitativos en Psicología SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Psicoestadistica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicoestadisticaMultimodalWithoutSaving
);

// ===== 🧠 TEORÍA Y TÉCNICA DE EXPLORACIÓN Y DIAGNÓSTICO PSICOLÓGICO =====
/**
 * POST /api/openai/query-PsicDiagnostico
 * Consultas de texto al AVA de Teoría y Técnica de Exploración y Diagnóstico
 * Especialidades: Evaluación Psicológica, Diagnóstico Clínico, Técnicas Proyectivas, Tests Psicométricos
 */
router.post("/query-PsicDiagnostico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicDiagnostico
);

/**
 * POST /api/openai/multimodal-PsicDiagnostico
 * Consultas multimodales al AVA de Teoría y Técnica de Exploración y Diagnóstico
 * Análisis de: Protocolos de tests, casos clínicos, hojas de respuesta, perfiles psicológicos, técnicas proyectivas, evaluaciones clínicas
 */
router.post("/multimodal-PsicDiagnostico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicDiagnosticoMultimodal
);

/**
 * POST /api/openai/multimodal-PsicDiagnostico-without-saving
 * Consultas multimodales al AVA de Teoría y Técnica de Exploración y Diagnóstico SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-PsicDiagnostico-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicDiagnosticoMultimodalWithoutSaving
);

// ===== 🧠 EPISTEMOLOGÍA GENÉTICA =====
/**
 * POST /api/openai/query-Epistemologia
 * Consultas de texto al AVA de Epistemología Genética
 * Especialidades: Psicología Social, Cognición Social, Teorías Psicológicas (Lewin, Tajfel, Festinger, Milgram, Zimbardo, Bandura)
 */
router.post("/query-Epistemologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEpistemologia
);

/**
 * POST /api/openai/multimodal-Epistemologia
 * Consultas multimodales al AVA de Epistemología Genética
 * Análisis de: Experimentos psicológicos, diagramas teóricos, casos de estudio, textos psicológicos, esquemas conceptuales
 */
router.post("/multimodal-Epistemologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEpistemologiaMultimodal
);

/**
 * POST /api/openai/multimodal-Epistemologia-without-saving
 * Consultas multimodales al AVA de Epistemología Genética SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Epistemologia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEpistemologiaMultimodalWithoutSaving
);

// ===== 🧠 PSICOLOGÍA SOCIAL =====
/**
 * POST /api/openai/query-PsicologiaSocial
 * Consultas de texto al AVA de Psicología Social
 * Especialidades: Conformidad, Actitudes, Roles Sociales, Normas, Prejuicio, Influencia Social, Identidad Social
 * Autores clave: Lewin, Tajfel, Festinger, Milgram, Zimbardo, Bandura, Asch, Sherif
 */
router.post("/query-PsicologiaSocial", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaSocial
);

/**
 * POST /api/openai/multimodal-PsicologiaSocial
 * Consultas multimodales al AVA de Psicología Social
 * Análisis de: Experimentos psicológicos, diagramas teóricos, casos de conformidad, estudios de influencia social, esquemas de cognición social
 */
router.post("/multimodal-PsicologiaSocial", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaSocialMultimodal
);

/**
 * POST /api/openai/multimodal-PsicologiaSocial-without-saving
 * Consultas multimodales al AVA de Psicología Social SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-PsicologiaSocial-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaSocialMultimodalWithoutSaving
);

// ===== 🧠 PSICOLOGÍA EVOLUTIVA =====
/**
 * POST /api/openai/query-PsicologiaEvolutiva
 * Consultas de texto al AVA de Psicología Evolutiva
 * Especialidades: Desarrollo Cognitivo, Desarrollo Emocional, Desarrollo Social, Teorías Evolutivas (Piaget, Erikson, Vygotsky, Freud, Bowlby, etc.)
 */
router.post("/query-PsicologiaEvolutiva", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaEvolutiva
);

/**
 * POST /api/openai/multimodal-PsicologiaEvolutiva
 * Consultas multimodales al AVA de Psicología Evolutiva
 * Análisis de: Casos del desarrollo, diagramas evolutivos, teorías psicológicas, evaluaciones del desarrollo, esquemas de etapas evolutivas
 */
router.post("/multimodal-PsicologiaEvolutiva", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaEvolutivaMultimodal
);

/**
 * POST /api/openai/multimodal-PsicologiaEvolutiva-without-saving
 * Consultas multimodales al AVA de Psicología Evolutiva SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-PsicologiaEvolutiva-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicologiaEvolutivaMultimodalWithoutSaving
);

// ===== 🧠 DSM-5 PSICOLOGÍA CLÍNICA =====
/**
 * POST /api/openai/query-DSM5
 * Consultas de texto al AVA de DSM-5 y Psicología Clínica
 * Especialidades: DSM-5, Diagnóstico Diferencial, Psicopatología, Psicología Clínica
 */
router.post("/query-DSM5", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryDSM5
);

/**
 * POST /api/openai/multimodal-DSM5
 * Consultas multimodales al AVA de DSM-5 y Psicología Clínica
 * Análisis de: Casos clínicos, criterios diagnósticos, diagramas DSM-5, evaluaciones psicológicas, algoritmos diagnósticos
 */
router.post("/multimodal-DSM5", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryDSM5Multimodal
);

/**
 * POST /api/openai/multimodal-DSM5-without-saving
 * Consultas multimodales al AVA de DSM-5 y Psicología Clínica SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-DSM5-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryDSM5MultimodalWithoutSaving
);

// ===== 🧠 NEUROPSICOLOGÍA =====
/**
 * POST /api/openai/query-Neuropsicologia
 * Consultas de texto al AVA de Neuropsicología
 * Especialidades: Neurobiología del Comportamiento, Funciones Cognitivas, Trastornos Neuropsicológicos, Evaluación Neuropsicológica
 */
router.post("/query-Neuropsicologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryNeuropsicologia
);

/**
 * POST /api/openai/multimodal-Neuropsicologia
 * Consultas multimodales al AVA de Neuropsicología
 * Análisis de: Neuroimágenes, tests neuropsicológicos, perfiles cognitivos, casos clínicos, diagramas cerebrales, evaluaciones
 */
router.post("/multimodal-Neuropsicologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryNeuropsicologiaMultimodal
);

/**
 * POST /api/openai/multimodal-Neuropsicologia-without-saving
 * Consultas multimodales al AVA de Neuropsicología SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Neuropsicologia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryNeuropsicologiaMultimodalWithoutSaving
);

// ===== 🧠 PSICOANÁLISIS =====
/**
 * POST /api/openai/query-Psicoanalisis
 * Consultas de texto al AVA de Psicoanálisis
 * Especialidades: Psicoanálisis Freudiano, Psicoanálisis Lacaniano, Teoría Psicoanalítica, Metapsicología
 */
router.post("/query-Psicoanalisis", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicoanalisis
);

/**
 * POST /api/openai/multimodal-Psicoanalisis
 * Consultas multimodales al AVA de Psicoanálisis
 * Análisis de: Textos psicoanalíticos, casos clínicos, esquemas teóricos, diagramas conceptuales, fragmentos de obras de Freud/Lacan
 */
router.post("/multimodal-Psicoanalisis", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicoanalisisMultimodal
);

/**
 * POST /api/openai/multimodal-Psicoanalisis-without-saving
 * Consultas multimodales al AVA de Psicoanálisis SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Psicoanalisis-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPsicoanalisisMultimodalWithoutSaving
);

// ===== FÍSICA =====
/**
 * POST /api/openai/query-Fisica
 * Consultas de texto al AVA de Física
 */
router.post("/query-Fisica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryFisica
);

/**
 * POST /api/openai/multimodal-Fisica
 * Consultas multimodales al AVA de Física
 */
router.post("/multimodal-Fisica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryFisicaMultimodal
);

/**
 * POST /api/openai/multimodal-Fisica-without-saving
 * Consultas multimodales al AVA de Física SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Fisica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryFisicaMultimodalWithoutSaving
);

// ===== 📊 CÁLCULO ECONÓMICO =====
/**
 * POST /api/openai/query-CalculoEconomico
 * Consultas de texto al AVA de Cálculo Económico
 * Especialidades: Matemáticas Aplicadas, Álgebra, Cálculo, Estadística Aplicada a la Administración
 */
router.post("/query-CalculoEconomico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCalculoEconomico
);

/**
 * POST /api/openai/multimodal-CalculoEconomico
 * Consultas multimodales al AVA de Cálculo Económico
 * Análisis de: Gráficos matemáticos, funciones económicas, optimizaciones, outputs de software, hojas de cálculo con análisis cuantitativos
 */
router.post("/multimodal-CalculoEconomico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCalculoEconomicoMultimodal
);

/**
 * POST /api/openai/multimodal-CalculoEconomico-without-saving
 * Consultas multimodales al AVA de Cálculo Económico SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-CalculoEconomico-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCalculoEconomicoMultimodalWithoutSaving
);

// ===== 🏛️ ECONOMÍA DEL SECTOR PÚBLICO =====
/**
 * POST /api/openai/query-SectorPublico
 * Consultas de texto al AVA de Economía del Sector Público
 * Especialidades: Hacienda Pública, Política Fiscal, Evaluación de Políticas Públicas
 */
router.post("/query-SectorPublico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPublicSector
);

/**
 * POST /api/openai/multimodal-SectorPublico
 * Consultas multimodales al AVA de Economía del Sector Público
 * Análisis de: Presupuestos públicos, gráficos fiscales, políticas públicas, evaluaciones de impacto, datos gubernamentales
 */
router.post("/multimodal-SectorPublico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPublicSectorMultimodal
);

/**
 * POST /api/openai/multimodal-SectorPublico-without-saving
 * Consultas multimodales al AVA de Economía del Sector Público SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-SectorPublico-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPublicSectorMultimodalWithoutSaving
);

// ===== 👷 ECONOMÍA LABORAL =====
/**
 * POST /api/openai/query-EconomiaLaboral
 * Consultas de texto al AVA de Economía Laboral
 * Especialidades: Mercados de Trabajo, Capital Humano, Economía de la Educación
 */
router.post("/query-EconomiaLaboral", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconomiaLaboral
);

/**
 * POST /api/openai/multimodal-EconomiaLaboral
 * Consultas multimodales al AVA de Economía Laboral
 * Análisis de: Gráficos de empleo, datos laborales, indicadores de capital humano, políticas educativas, mercados de trabajo
 */
router.post("/multimodal-EconomiaLaboral", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconomiaLaboralMultimodal
);

/**
 * POST /api/openai/multimodal-EconomiaLaboral-without-saving
 * Consultas multimodales al AVA de Economía Laboral SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-EconomiaLaboral-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconomiaLaboralMultimodalWithoutSaving
);

// ===== 🌍 ECONOMÍA INTERNACIONAL =====
/**
 * POST /api/openai/query-EconomiaInternacional
 * Consultas de texto al AVA de Economía Internacional
 * Especialidades: Comercio Internacional, Finanzas Internacionales
 */
router.post("/query-EconomiaInternacional", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconomiaInternacional
);

/**
 * POST /api/openai/multimodal-EconomiaInternacional
 * Consultas multimodales al AVA de Economía Internacional
 * Análisis de: Gráficos comerciales, balanzas de pagos, tipos de cambio, flujos comerciales, datos de organizaciones internacionales
 */
router.post("/multimodal-EconomiaInternacional", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconomiaInternacionalMultimodal
);

/**
 * POST /api/openai/multimodal-EconomiaInternacional-without-saving
 * Consultas multimodales al AVA de Economía Internacional SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-EconomiaInternacional-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconomiaInternacionalMultimodalWithoutSaving
);

// ===== 📈 MACROECONOMÍA =====
/**
 * POST /api/openai/query-Macroeconomia
 * Consultas de texto al AVA de Macroeconomía
 * Especialidades: Teorías del Crecimiento Económico, Políticas Macroeconómicas, Ciclos Económicos
 */
router.post("/query-Macroeconomia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMacroeconomia
);

/**
 * POST /api/openai/multimodal-Macroeconomia
 * Consultas multimodales al AVA de Macroeconomía
 * Análisis de: Gráficos macroeconómicos, modelos de crecimiento, indicadores económicos, datos de política, análisis de ciclos
 */
router.post("/multimodal-Macroeconomia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMacroeconomiaMultimodal
);

/**
 * POST /api/openai/multimodal-Macroeconomia-without-saving
 * Consultas multimodales al AVA de Macroeconomía SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Macroeconomia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMacroeconomiaMultimodalWithoutSaving
);

// ===== 🌍 DESARROLLO ECONÓMICO =====
/**
 * POST /api/openai/query-DesarrolloEconomico
 * Consultas de texto al AVA de Desarrollo Económico
 * Especialidades: Economía del Desarrollo, Pobreza y Desigualdad
 */
router.post("/query-DesarrolloEconomico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryDesarrolloEconomico
);

/**
 * POST /api/openai/multimodal-DesarrolloEconomico
 * Consultas multimodales al AVA de Desarrollo Económico
 * Análisis de: Gráficos de desarrollo, indicadores de pobreza, datos de desigualdad, políticas sociales, reportes de organismos internacionales
 */
router.post("/multimodal-DesarrolloEconomico", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryDesarrolloEconomicoMultimodal
);

/**
 * POST /api/openai/multimodal-DesarrolloEconomico-without-saving
 * Consultas multimodales al AVA de Desarrollo Económico SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-DesarrolloEconomico-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryDesarrolloEconomicoMultimodalWithoutSaving
);

// ===== 💰 MICROECONOMÍA =====
/**
 * POST /api/openai/query-Microeconomia
 * Consultas de texto al AVA de Microeconomía
 * Especialidades: Teoría del Consumidor, Teoría de la Producción, Conducta Económica y Mercados
 */
router.post("/query-Microeconomia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMicroeconomia
);

/**
 * POST /api/openai/multimodal-Microeconomia
 * Consultas multimodales al AVA de Microeconomía
 * Análisis de: Gráficos económicos, curvas de oferta/demanda, diagramas de mercado, funciones de utilidad, curvas de indiferencia
 */
router.post("/multimodal-Microeconomia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMicroeconomiaMultimodal
);

/**
 * POST /api/openai/multimodal-Microeconomia-without-saving
 * Consultas multimodales al AVA de Microeconomía SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Microeconomia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMicroeconomiaMultimodalWithoutSaving
);

// ===== 💰 FINANZAS Y ECONOMÍA MONETARIA =====
/**
 * POST /api/openai/query-Finanzas
 * Consultas de texto al AVA de Finanzas y Economía Monetaria
 * Especialidades: Mercados Financieros, Teoría Monetaria, Finanzas Corporativas
 */
router.post("/query-Finanzas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryFinanzas
);

/**
 * POST /api/openai/multimodal-Finanzas
 * Consultas multimodales al AVA de Finanzas y Economía Monetaria
 * Análisis de: Gráficos financieros, estados financieros, análisis de portafolios, valuaciones, datos de mercado
 */
router.post("/multimodal-Finanzas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryFinanzasMultimodal
);

/**
 * POST /api/openai/multimodal-Finanzas-without-saving
 * Consultas multimodales al AVA de Finanzas y Economía Monetaria SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Finanzas-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryFinanzasMultimodalWithoutSaving
);

// ===== 📊 ECONOMETRÍA =====
/**
 * POST /api/openai/query-Econometria
 * Consultas de texto al AVA de Econometría
 * Especialidades: Métodos Cuantitativos, Series Temporales, Análisis de Datos Económicos
 */
router.post("/query-Econometria", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconometria
);

/**
 * POST /api/openai/multimodal-Econometria
 * Consultas multimodales al AVA de Econometría
 * Análisis de: Gráficos econométricos, outputs de software estadístico, series temporales, regresiones, datos de panel
 */
router.post("/multimodal-Econometria", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconometriaMultimodal
);

/**
 * POST /api/openai/multimodal-Econometria-without-saving
 * Consultas multimodales al AVA de Econometría SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Econometria-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEconometriaMultimodalWithoutSaving
);

// ===== 📚 HISTORIA ECONÓMICA =====
/**
 * POST /api/openai/query-HistoriaEconomica
 * Consultas de texto al AVA de Historia Económica
 * Especialidades: Historia del Pensamiento Económico, Historia Económica Mundial
 */
router.post("/query-HistoriaEconomica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryHistoriaEconomica
);

/**
 * POST /api/openai/multimodal-HistoriaEconomica
 * Consultas multimodales al AVA de Historia Económica
 * Análisis de: Documentos históricos, líneas de tiempo, mapas económicos, retratos de economistas, textos históricos
 */
router.post("/multimodal-HistoriaEconomica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryHistoriaEconomicaMultimodal
);

/**
 * POST /api/openai/multimodal-HistoriaEconomica-without-saving
 * Consultas multimodales al AVA de Historia Económica SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-HistoriaEconomica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryHistoriaEconomicaMultimodalWithoutSaving
);

// ===== 🔒 REDES Y SEGURIDAD INFORMÁTICA =====
/**
 * POST /api/openai/query-RedesSeguridad
 * Consultas de texto al AVA de Redes y Seguridad Informática
 * Especialidades: Redes de Computadoras, Protocolos, Seguridad en Sistemas, Gestión de Vulnerabilidades, Desarrollo Seguro, Seguridad Avanzada, Criptografía y Autenticación
 */
router.post("/query-RedesSeguridad", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryRedesSeguridad
);

/**
 * POST /api/openai/multimodal-RedesSeguridad
 * Consultas multimodales al AVA de Redes y Seguridad Informática
 * Análisis de: Topologías de red, diagramas de seguridad, arquitecturas de red, configuraciones de firewall, análisis de vulnerabilidades
 */
router.post("/multimodal-RedesSeguridad", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryRedesSeguridadMultimodal
);

/**
 * POST /api/openai/multimodal-RedesSeguridad-without-saving
 * Consultas multimodales al AVA de Redes y Seguridad Informática SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-RedesSeguridad-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryRedesSeguridadMultimodalWithoutSaving
);

// ===== 💻 COMPUTACIÓN Y SISTEMAS (NUEVA ESPECIALIDAD) =====
/**
 * POST /api/openai/query-ComputacionSistemas
 * Consultas de texto al AVA de Computación y Sistemas
 * Especialidades: Programación, Algoritmos, Estructuras de Datos, SO, BD, IA, ML
 */
router.post("/query-ComputacionSistemas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryComputacion
);

/**
 * POST /api/openai/multimodal-ComputacionSistemas
 * Consultas multimodales al AVA de Computación y Sistemas
 * Análisis de: Código fuente, diagramas UML, arquitecturas, algoritmos, bases de datos
 */
router.post("/multimodal-ComputacionSistemas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryComputacionMultimodal
);

/**
 * POST /api/openai/multimodal-ComputacionSistemas-without-saving
 * Consultas multimodales al AVA de Computación y Sistemas SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-ComputacionSistemas-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryComputacionMultimodalWithoutSaving
);

// ===== ⚡ ELECTRICIDAD, ELECTRÓNICA Y SISTEMAS DE CONTROL =====
/**
 * POST /api/openai/query-ElectricidadElectronica
 * Consultas de texto al AVA de Electricidad, Electrónica y Sistemas de Control
 * Especialidades: Circuitos Eléctricos, Electrónica Analógica/Digital, Sistemas de Control, Sistemas de Potencia, Electrónica de Potencia
 */
router.post("/query-ElectricidadElectronica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryElectricalEngineering
);

/**
 * POST /api/openai/multimodal-ElectricidadElectronica
 * Consultas multimodales al AVA de Electricidad, Electrónica y Sistemas de Control
 * Análisis de: Esquemas de circuitos, diagramas de bloques, topologías de convertidores, gráficas de respuesta de sistemas
 */
router.post("/multimodal-ElectricidadElectronica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryElectricalEngineeringMultimodal
);

/**
 * POST /api/openai/multimodal-ElectricidadElectronica-without-saving
 * Consultas multimodales al AVA de Electricidad, Electrónica y Sistemas de Control SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-ElectricidadElectronica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryElectricalEngineeringMultimodalWithoutSaving
);

// ===== ÁLGEBRA Y ANÁLISIS MATEMÁTICO =====
/**
 * POST /api/openai/query-Algebra
 * Consultas de texto al AVA de Álgebra y Análisis Matemático
 */
router.post("/query-Algebra", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryAlgebra
);

/**
 * POST /api/openai/multimodal-Algebra
 * Consultas multimodales al AVA de Álgebra y Análisis Matemático
 */
router.post("/multimodal-Algebra", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryAlgebraMultimodal
);

/**
 * POST /api/openai/multimodal-Algebra-without-saving
 * Consultas multimodales al AVA de Álgebra y Análisis Matemático SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Algebra-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryAlgebraMultimodalWithoutSaving
);

// ===== CÁLCULO Y MATEMÁTICAS AVANZADAS =====
/**
 * POST /api/openai/query-Calculo
 * Consultas de texto al AVA de Cálculo y Matemáticas Avanzadas
 */
router.post("/query-Calculo", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCalculo
);

/**
 * POST /api/openai/multimodal-Calculo
 * Consultas multimodales al AVA de Cálculo y Matemáticas Avanzadas
 */
router.post("/multimodal-Calculo", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCalculoMultimodal
);

/**
 * POST /api/openai/multimodal-Calculo-without-saving
 * Consultas multimodales al AVA de Cálculo y Matemáticas Avanzadas SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Calculo-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCalculoMultimodalWithoutSaving
);

// ===== CIENCIAS BÁSICAS FUNDAMENTALES =====
/**
 * POST /api/openai/query-CienciasBasicas
 * Consultas de texto al AVA de Ciencias Básicas Fundamentales
 */
router.post("/query-CienciasBasicas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCienciasBasicas
);

/**
 * POST /api/openai/multimodal-CienciasBasicas
 * Consultas multimodales al AVA de Ciencias Básicas Fundamentales
 */
router.post("/multimodal-CienciasBasicas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCienciasBasicasMultimodal
);

/**
 * POST /api/openai/multimodal-CienciasBasicas-without-saving
 * Consultas multimodales al AVA de Ciencias Básicas Fundamentales SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-CienciasBasicas-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCienciasBasicasMultimodalWithoutSaving
);

// ===== CIENCIAS BÁSICAS APLICADAS =====
/**
 * POST /api/openai/query-CienciasAplicadas
 * Consultas de texto al AVA de Ciencias Básicas Aplicadas
 */
router.post("/query-CienciasAplicadas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCienciasAplicadas
);

/**
 * POST /api/openai/multimodal-CienciasAplicadas
 * Consultas multimodales al AVA de Ciencias Básicas Aplicadas
 */
router.post("/multimodal-CienciasAplicadas", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCienciasAplicadasMultimodal
);

/**
 * POST /api/openai/multimodal-CienciasAplicadas-without-saving
 * Consultas multimodales al AVA de Ciencias Básicas Aplicadas SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-CienciasAplicadas-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCienciasAplicadasMultimodalWithoutSaving
);

// ===== 📊 MATEMÁTICAS Y MÉTODOS CUANTITATIVOS EN MEDICINA =====
/**
 * POST /api/openai/query-MatematicaMedica
 * Consultas de texto al AVA de Matemáticas y Métodos Cuantitativos en Medicina
 * Especialidades: Bioestadística Médica, Epidemiología Cuantitativa, Matemáticas para Investigación Clínica
 */
router.post("/query-MatematicaMedica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMatematicaMedica
);

/**
 * POST /api/openai/multimodal-MatematicaMedica
 * Consultas multimodales al AVA de Matemáticas y Métodos Cuantitativos en Medicina
 * Análisis de: Gráficos estadísticos, tablas epidemiológicas, forest plots, curvas de supervivencia, diseños de estudio
 */
router.post("/multimodal-MatematicaMedica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMatematicaMedicaMultimodal
);

/**
 * POST /api/openai/multimodal-MatematicaMedica-without-saving
 * Consultas multimodales al AVA de Matemáticas y Métodos Cuantitativos en Medicina SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-MatematicaMedica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMatematicaMedicaMultimodalWithoutSaving
);

/**
 * POST /api/openai/query-ResistenciaMateriales
 * Consultas de texto al AVA de Mecánica y Resistencia de Materiales
 * Especialidades: Estática, Dinámica, Mecánica de Materiales, Análisis Estructural, Diseño de Elementos de Máquinas
 */
router.post("/query-ResistenciaMateriales", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryResistenciaMateriales
);

/**
 * POST /api/openai/multimodal-ResistenciaMateriales
 * Consultas multimodales al AVA de Mecánica y Resistencia de Materiales
 * Análisis de: Diagramas de cuerpo libre, diagramas de esfuerzos, deformaciones, planos de estructuras, esquemas mecánicos
 */
router.post("/multimodal-ResistenciaMateriales", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryResistenciaMaterialesMultimodal
);

/**
 * POST /api/openai/multimodal-ResistenciaMateriales-without-saving
 * Consultas multimodales al AVA de Mecánica y Resistencia de Materiales SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-ResistenciaMateriales-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryResistenciaMaterialesMultimodalWithoutSaving
);

// ===== 📊 EPIDEMIOLOGÍA Y SALUD PÚBLICA =====
/**
 * POST /api/openai/query-Epidemiologia
 * Consultas de texto al AVA de Epidemiología y Salud Pública
 * Especialidades: Medicina Preventiva, Epidemiología, Gestión en Salud Pública
 */
router.post("/query-Epidemiologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEpidemiologia
);

/**
 * POST /api/openai/multimodal-Epidemiologia
 * Consultas multimodales al AVA de Epidemiología y Salud Pública
 * Análisis de: Gráficos epidemiológicos, curvas epidémicas, mapas de brotes, políticas sanitarias
 */
router.post("/multimodal-Epidemiologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEpidemiologiaMultimodal
);

/**
 * POST /api/openai/multimodal-Epidemiologia-without-saving
 * Consultas multimodales al AVA de Epidemiología y Salud Pública SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Epidemiologia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEpidemiologiaMultimodalWithoutSaving
);

// ===== 🏥 ESPECIALIDADES MÉDICAS I =====
/**
 * POST /api/openai/query-EspecialidadesMed1
 * Consultas de texto al AVA de Especialidades Médicas I
 */
router.post("/query-EspecialidadesMed1", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEspecialidadesMed1
);

/**
 * POST /api/openai/multimodal-EspecialidadesMed1
 * Consultas multimodales al AVA de Especialidades Médicas I
 */
router.post("/multimodal-EspecialidadesMed1", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEspecialidadesMed1Multimodal
);

/**
 * POST /api/openai/multimodal-EspecialidadesMed1-without-saving
 * Consultas multimodales al AVA de Especialidades Médicas I SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-EspecialidadesMed1-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEspecialidadesMed1MultimodalWithoutSaving
);

// ===== 🧠 ESPECIALIDADES MÉDICAS II =====
/**
 * POST /api/openai/query-EspecialidadesMedicasII
 * Consultas de texto al AVA de Especialidades Médicas II (Neurología, Psiquiatría, Dermatología, Reumatología, Infectología)
 */
router.post("/query-EspecialidadesMedicasII", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEspecialidadesMedicasII
);

/**
 * POST /api/openai/multimodal-EspecialidadesMedicasII
 * Consultas multimodales al AVA de Especialidades Médicas II
 */
router.post("/multimodal-EspecialidadesMedicasII", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEspecialidadesMedicasIIMultimodal
);

/**
 * POST /api/openai/multimodal-EspecialidadesMedicasII-without-saving
 * Consultas multimodales al AVA de Especialidades Médicas II SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-EspecialidadesMedicasII-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEspecialidadesMedicasIIMultimodalWithoutSaving
);

// ===== SEMIOLOGÍA Y DIAGNÓSTICO =====
/**
 * POST /api/openai/query-Semiologia
 * Consultas de texto al AVA de Semiología y Diagnóstico
 */
router.post("/query-Semiologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  querySemiologia
);

/**
 * POST /api/openai/multimodal-Semiologia
 * Consultas multimodales al AVA de Semiología y Diagnóstico
 */
router.post("/multimodal-Semiologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  querySemiologiaMultimodal
);

/**
 * POST /api/openai/multimodal-Semiologia-without-saving
 * Consultas multimodales al AVA de Semiología y Diagnóstico SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Semiologia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  querySemiologiaMultimodalWithoutSaving
);

// ===== 🏥 CIRUGÍA Y URGENCIAS =====
/**
 * POST /api/openai/query-CirugiaYUrgencias
 * Consultas de texto al AVA de Cirugía y Urgencias
 */
router.post("/query-CirugiaYUrgencias", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCirugiaYUrgencias
);

/**
 * POST /api/openai/multimodal-CirugiaYUrgencias
 * Consultas multimodales al AVA de Cirugía y Urgencias
 */
router.post("/multimodal-CirugiaYUrgencias", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCirugiaYUrgenciasMultimodal
);

/**
 * POST /api/openai/multimodal-CirugiaYUrgencias-without-saving
 * Consultas multimodales al AVA de Cirugía y Urgencias SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-CirugiaYUrgencias-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryCirugiaYUrgenciasMultimodalWithoutSaving
);

// ===== PATOLOGÍA =====
/**
 * POST /api/openai/query-Patologia
 * Consultas de texto al AVA de Patología
 */
router.post("/query-Patologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPatologia
);

/**
 * POST /api/openai/multimodal-Patologia
 * Consultas multimodales al AVA de Patología
 */
router.post("/multimodal-Patologia", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPatologiaMultimodal
);

/**
 * POST /api/openai/multimodal-Patologia-without-saving
 * Consultas multimodales al AVA de Patología SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Patologia-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryPatologiaMultimodalWithoutSaving
);

// ===== MEDICINA INTERNA =====
/**
 * POST /api/openai/query-medicinainterna
 * Consultas de texto al AVA de Medicina Interna
 */
router.post("/query-medicinainterna", 
  authenticateUser,
  verifyAvaAccessWithTokens,
  queryMedicinaInterna
);

/**
 * POST /api/openai/multimodal-medicinainterna
 * Consultas multimodales al AVA de Medicina Interna
 */
router.post("/multimodal-medicinainterna", 
  authenticateUser,
  verifyAvaAccessWithTokens,
  queryMedicinaInternaMultimodal
);

/**
 * POST /api/openai/multimodal-medicinainterna-without-saving
 * Consultas multimodales al AVA de Medicina Interna SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-medicinainterna-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens,
  queryMedicinaInternaMultimodalWithoutSaving
);

// ===== 🧪 QUÍMICA COMPLETA =====
/**
 * POST /api/openai/query-Quimica
 * Consultas de texto al AVA de Química Completa
 */
router.post("/query-Quimica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryChemistry
);

/**
 * POST /api/openai/multimodal-Quimica
 * Consultas multimodales al AVA de Química Completa
 */
router.post("/multimodal-Quimica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryChemistryMultimodal
);

/**
 * POST /api/openai/multimodal-Quimica-without-saving
 * Consultas multimodales al AVA de Química Completa SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Quimica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryChemistryMultimodalWithoutSaving
);

// ===== ESTADÍSTICA Y PROBABILIDAD =====
/**
 * POST /api/openai/query-Estadistica
 * Consultas de texto al AVA de Estadística y Probabilidad
 */
router.post("/query-Estadistica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEstadistica
);

/**
 * POST /api/openai/multimodal-Estadistica
 * Consultas multimodales al AVA de Estadística y Probabilidad
 */
router.post("/multimodal-Estadistica", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEstadisticaMultimodal
);

/**
 * POST /api/openai/multimodal-Estadistica-without-saving
 * Consultas multimodales al AVA de Estadística y Probabilidad SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-Estadistica-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryEstadisticaMultimodalWithoutSaving
);

// ===== 📐 MATEMÁTICAS AVANZADAS =====
/**
 * POST /api/openai/query-MatematicaAvz
 * Consultas de texto al AVA de Matemáticas Avanzadas
 * Especialidades: Análisis Complejo, Análisis Funcional, EDP, Cálculo Tensorial, Métodos Numéricos
 */
router.post("/query-MatematicaAvz", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMathematicsAdvanced
);

/**
 * POST /api/openai/multimodal-MatematicaAvz
 * Consultas multimodales al AVA de Matemáticas Avanzadas
 * Análisis de: Ecuaciones complejas, diagramas matemáticos, demostraciones, espacios topológicos
 */
router.post("/multimodal-MatematicaAvz", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMathematicsAdvancedMultimodal
);

/**
 * POST /api/openai/multimodal-MatematicaAvz-without-saving
 * Consultas multimodales al AVA de Matemáticas Avanzadas SIN GUARDAR (para retry/edit)
 */
router.post("/multimodal-MatematicaAvz-without-saving", 
  authenticateUser,
  verifyAvaAccessWithTokens, // Middleware para AVAs + tokens
  queryMathematicsAdvancedMultimodalWithoutSaving
);

/**
 * =========================================================================
 * RUTAS LEGACY (COMPATIBILIDAD)
 * =========================================================================
 * 
 * Mantenemos rutas existentes para compatibilidad hacia atrás
 * Redirigen a las nuevas rutas con middlewares aplicados
 */

// Rutas legacy sin cambios en nombres pero con middlewares aplicados
router.post("/query-agent-legacy", 
  authenticateUser,
  verifyToolAccessWithTokens,
  queryAgent
);

router.post("/query-pdf-legacy", 
  authenticateUser,
  verifyToolAccessWithTokens,
  queryPDF
);

/**
 * =========================================================================
 * RUTAS DE DIAGNÓSTICO Y VERIFICACIÓN
 * =========================================================================
 * 
 * Endpoints para verificar acceso sin procesar consultas
 */

/**
 * POST /api/openai/check-tool-access
 * Verifica acceso a herramientas sin procesar consulta
 */
router.post("/check-tool-access",
  authenticateUser,
  verifyToolAccess,
  (req, res) => {
    // Si llegamos aquí, el acceso está permitido
    const accessInfo = req.accessInfo || {};
    
    res.json({
      success: true,
      hasAccess: true,
      toolAccess: accessInfo.toolAccess,
      isPremium: accessInfo.isPremium,
      message: "Acceso a herramientas verificado exitosamente",
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * POST /api/openai/check-ava-access
 * Verifica acceso a AVAs sin procesar consulta
 */
router.post("/check-ava-access",
  authenticateUser,
  verifyAvaAccess,
  (req, res) => {
    // Si llegamos aquí, el acceso está permitido
    const accessInfo = req.accessInfo || {};
    
    res.json({
      success: true,
      hasAccess: true,
      avaAccess: accessInfo.avaAccess,
      avaInfo: accessInfo.avaAccess?.avaInfo,
      careerInfo: accessInfo.avaAccess?.careerInfo,
      message: "Acceso a AVA verificado exitosamente",
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * POST /api/openai/check-token-limits
 * Verifica límites de tokens para un chat específico
 */
router.post("/check-token-limits",
  authenticateUser,
  checkTokenLimits,
  (req, res) => {
    // Si llegamos aquí, los límites están OK
    const tokenInfo = req.tokenInfo || {};
    const tokenWarning = req.tokenWarning || null;
    
    res.json({
      success: true,
      tokenLimitsOk: true,
      tokenInfo,
      warning: tokenWarning,
      message: "Límites de tokens verificados",
      timestamp: new Date().toISOString()
    });
  }
);

export default router;