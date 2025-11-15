// promptTemplates.js - Plantillas mejoradas con estructuras específicas
export const promptTemplates = {
  
video: `Crea un video viral protagonizado por el PROFESOR ACADEL (nuestro chigüire carismático) sobre {{theme}} para estudiantes de {{target.carrera}} que están HARTOS de profesores aburridos.

CONTEXTO ACADELIA: Somos la marca que traduce conocimiento al idioma emocional de Gen Z. El Profesor Acadel es torpe, brutalmente honesto, políticamente incorrecto pero entrañable. Los estudiantes lo aman porque los entiende mejor que sus profesores tradicionales.

PERSONALIDAD DE ACADEL EN EL VIDEO:
- Brutalmente honesto: "Sé que odias esta materia, pero te la voy a explicar"
- Humor absurdo: Referencias a memes, cultura pop, situaciones "cringe"
- Anti-héroe educativo: "Soy un chigüire que sabe más que tu profesor, deal with it"
- Entrañable: Genuinamente quiere que el estudiante entienda

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Concepto viral del video con Profesor Acadel siendo iconic",
  "video": {
    "target": { "carrera": "{{target.carrera}}" },
    "titulo": "Título que haga que estudiantes digan 'NECESITO este chigüire'",
    "duracion": "15-30 segundos (atención span Gen Z)",
    "hook": "Primer segundo que hace scroll stop",
    "hashtags": [
      "#ProfesorAcadel",
      "#AcadeliaVibes", 
      "#{{target.carrera}}Mood",
      "#ChigüireTeacher",
      "hashtags trending del momento"
    ],
    "guion": {
      "intro": {
        "texto": "Hook brutal de Acadel dirigido a {{target.carrera}} [0-3 seg]",
        "visual": "Acadel en pose iconic/meme",
        "energia": "alta, controversial, attention-grabbing"
      },
      "desarrollo": {
        "texto": "Acadel explaining {{theme}} de forma brutalmente simple [4-20 seg]",
        "visual": "Acadel usando props ridiculos/referencias Gen Z",
        "tecnica": "No lectura - pura personalidad y ejemplos absurdos"
      },
      "cierre": {
        "texto": "Punchline de Acadel que hace viral el video [21-30 seg]",
        "visual": "Acadel en momento signature/memorable",
        "cta": "Follow para más academic trauma healing"
      }
    },
    "elementos_virales": {
      "musica": "Track trending o sound bite memorable",
      "efectos": "Zoom dramáticos, text overlays memeados",
      "referencias": "Memes actuales, slang Gen Z, cultura universitaria"
    },
    "potential_viral": "Razón por la que estudiantes compartirían esto masivamente"
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "edad": "18-25", 
    "pain_points": ["profesores aburridos", "materias difíciles", "ansiedad académica"],
    "loves": ["memes", "humor absurdo", "figuras que los entienden"]
  }
}`,

meme: `Diseña un MEME ÉPICO protagonizado por el PROFESOR ACADEL sobre {{theme}} que haga que estudiantes de {{target.carrera}} digan "ESTE CHIGÜIRE ME ENTIENDE".

VIBE DEL MEME: 
- Humor absurdo que valida el dolor estudiantil
- Acadel siendo brutalmente real sobre {{theme}}
- Referencias que solo {{target.carrera}} entenderán  
- Formato que estudiantes compartirán sin vergüenza

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Concepto del meme que conecta humor + {{theme}} de forma inesperada",
  "meme": {
    "target": { "carrera": "{{target.carrera}}" },
    "titulo": "Caption que hace que {{target.carrera}} se sientan vistos",
    "formato": "Tipo de meme template (Como describirías la imagen del meme)",
    "texto_principal": "Text que aparece en el meme - brutalmente relatable",
    "punchline": "Remate de Acadel que hace el meme memorable",
    "acadel_role": "Cómo aparece Acadel en el meme y qué representa",
    "relatability_factor": "Por qué {{target.carrera}} se identifican profundamente",
    "hashtags": [
      "#ProfesorAcadel",
      "#{{target.carrera}}Problems", 
      "#StudyMemes",
      "#AcadelMoment",
      "hashtags de la situación específica"
    ],
    "visual_elements": {
      "acadel_expression": "Expresión facial/pose de Acadel",
      "background": "Setting que refuerza el mensaje",
      "text_style": "Font/colors que maximizan impacto",
      "props": "Elementos visuales que amplifican el joke"
    },
    "shareability": "Por qué estudiantes lo compartirían en sus stories"
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "momento": "Cuándo en su vida académica esto resonaría más",
    "emocion_objetivo": "Sentimiento que buscamos generar",
    "accion_deseada": "Qué queremos que hagan después de ver el meme"
  }
}`,

email: `Escribe un email donde el PROFESOR ACADEL le habla directamente a estudiantes de {{target.carrera}} sobre {{theme}} como el amigo brutalmente honesto que todos necesitan.

TONO DE ACADEL EN EMAIL:
- Como tu pana que sabe del tema pero no te juzga
- Humor self-deprecating mezclado con sabiduría real
- Anti-corporativo - se siente personal, no marketing
- Admite que estudiar es difícil pero te ayuda anyway

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Mensaje central que Acadel quiere transmitir a {{target.carrera}}",
  "email": {
    "target": { "carrera": "{{target.carrera}}" },
    "subject": "Subject line que hace que abran el email (curiosidad + benefit)",
    "preview": "Preview text que confirma que vale la pena leer",
    "contenido": {
      "opening": {
        "texto": "Saludo de Acadel que inmediatamente crea conexión",
        "vibe": "Hey, soy tu chigüire profesor favorito y necesitamos hablar"
      },
      "hook": {
        "texto": "Reconocimiento del dolor real de {{target.carrera}}",
        "validacion": "Acadel validando que sí, es difícil ser estudiante"
      },
      "value_delivery": {
        "texto": "Acadel compartiendo wisdom sobre {{theme}} de forma práctica",
        "approach": "Consejos reales sin bullshit corporativo",
        "examples": "Casos específicos que {{target.carrera}} reconocerán"
      },
      "motivation": {
        "texto": "Pep talk de Acadel que no suena falso",
        "style": "Tough love pero genuino - te dice verdades que necesitas"
      },
      "cta": {
        "texto": "Llamada a acción que no da flojera",
        "approach": "Invitación a seguir la conversación, no venta agresiva"
      },
      "signature": {
        "texto": "Despedida signature de Acadel",
        "personality": "Tu chigüire profesor que genuinamente quiere verte triunfar"
      }
    },
    "hashtags": [
      "#ProfesorAcadel",
      "#{{target.carrera}}Truth",
      "#StudyRealTalk", 
      "#AcadelWisdom"
    ],
    "engagement_strategy": {
      "reply_bait": "Pregunta que invita a responder el email",
      "community_building": "Cómo este email fortalece la relación Acadel-estudiante",
      "follow_up": "Qué contenido podría venir después de este email"
    }
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "mindset": "Estado mental del estudiante cuando lee esto",
    "desired_outcome": "Cómo se deben sentir después de leer",
    "relationship_goal": "Cómo esto profundiza su conexión con Acadel"
  }
}`,

campaign: `Diseña una CAMPAÑA ÉPICA donde el PROFESOR ACADEL lidera un movimiento cultural contra la educación aburrida, centrado en {{theme}} para {{target.carrera}}.

FILOSOFÍA DE LA CAMPAÑA:
- Acadel como líder rebelde contra el sistema educativo tradicional
- Comunidad real de estudiantes, no audiencia corporativa
- Presupuesto cero pero impacto viral masivo
- Hacer que estudiar sea cool por primera vez

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Movimiento cultural que Acadel está liderando",
  "campaign": {
    "target": { "carrera": "{{target.carrera}}" },
    "name": "Nombre de la campaña que se vuelve hashtag viral",
    "manifesto": "Declaración rebelde de Acadel contra educación aburrida",
    "batalla_cultural": "Acadel vs. qué problema específico del sistema educativo",
    "call_to_revolution": "Qué acción específica pide Acadel a {{target.carrera}}",
    
    "fases": [
      {
        "name": "DESPERTAR - Acadel expone el problema",
        "duration": "1 semana",
        "acadel_actions": [
          "Video viral donde Acadel 'calls out' profesores aburridos",
          "Series de memes brutalmente honestos sobre {{theme}}",
          "Challenge donde estudiantes comparten sus peores experiencias"
        ],
        "student_involvement": "Cómo {{target.carrera}} participan activamente",
        "viral_potential": "Elementos diseñados para máximo share orgánico"
      },
      {
        "name": "REBELIÓN - Acadel demuestra la alternativa", 
        "duration": "2 semanas",
        "acadel_actions": [
          "Content educativo que es genuinamente entretenido",
          "Colaboraciones con estudiantes reales de {{target.carrera}}",
          "Acadel 'invade' espacios tradicionales con humor"
        ],
        "community_building": "Cómo se forma la tribu de seguidores",
        "momentum_tactics": "Estrategias para mantener el buzz creciendo"
      },
      {
        "name": "TRANSFORMACIÓN - El nuevo paradigma de Acadel",
        "duration": "1 semana", 
        "acadel_actions": [
          "Celebración de cambios reales en estudiantes",
          "Acadel estableciendo nuevas 'reglas' de educación cool",
          "Launch de la próxima fase del movimiento"
        ],
        "legacy_creation": "Cómo esta campaña cambia la relación educación-diversión",
        "evolution": "Hacia dónde evoluciona el movimiento"
      }
    ],
    
    "hashtags": [
      "#AcadelRevolution",
      "#{{target.carrera}}Uprising", 
      "#EducaciónSinTortura",
      "#ChigüireTeacher",
      "hashtag específico de la campaña"
    ],
    
    "success_metrics": [
      "UGC generado por estudiantes genuinos",
      "Adopción orgánica del mensaje por comunidades universitarias", 
      "Conversaciones reales sobre cambiar educación",
      "Crecimiento de la comunidad Acadelia"
    ],
    
    "zero_budget_hacks": [
      "Aprovechamiento de trends existentes",
      "Colaboraciones con micro-influencers estudiantes",
      "User-generated content como motor principal",
      "Provocación orgánica de discusiones"
    ]
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "revolution_readiness": "Qué tan listos están para rebelarse contra status quo",
    "community_role": "Cómo cada estudiante contribuye al movimiento",
    "transformation_goal": "Cómo cambian después de la campaña"
  }
}`,

post: `Crea un POST ICONIC donde el PROFESOR ACADEL drops truth bombs sobre {{theme}} que hace que {{target.carrera}} digan "SAY IT LOUDER FOR THE PEOPLE IN THE BACK".

ENERGY DEL POST:
- Acadel siendo brutalmente real y relatable
- Mix perfecto de humor + wisdom
- Content que estudiantes QUIEREN compartir
- Timing perfecto para máximo engagement

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Truth bomb que Acadel está dropping",
  "post": {
    "target": { "carrera": "{{target.carrera}}" },
    "opening_hook": "Primera línea que detiene el scroll inmediatamente",
    "main_content": "Cuerpo del post donde Acadel elabora su punto",
    "punchline": "Remate que hace el post memorable y shareable",
    "acadel_personality": "Cómo se manifiesta la personalidad única de Acadel",
    "relatability_factor": "Por qué {{target.carrera}} se sienten profundamente entendidos",
    
    "engagement_elements": {
      "question": "Pregunta que genera comentarios genuinos",
      "controversy": "Opinión ligeramente controversial que inicia debates",
      "validation": "Cómo el post valida experiencias de estudiantes",
      "humor": "Elementos de humor que hacen compartir"
    },
    
    "hashtags": [
      "#ProfesorAcadel",
      "#{{target.carrera}}Truth",
      "#AcadelSpeaks",
      "#RealTalk",
      "hashtags trending relevantes"
    ],
    
    "visual_suggestion": {
      "acadel_pose": "Pose/expresión de Acadel que refuerza el mensaje",
      "background": "Setting que amplifica el impacto",
      "text_overlay": "Texto visual que complementa el copy",
      "mood": "Vibe visual general del post"
    },
    
    "viral_potential": {
      "share_trigger": "Qué hace que estudiantes lo compartan en stories",
      "comment_magnet": "Qué genera conversaciones en comentarios",
      "save_worthy": "Por qué estudiantes guardan este post",
      "trend_potential": "Cómo podría spawnar un trend/meme"
    }
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "emotional_state": "Estado emocional cuando ven el post",
    "desired_action": "Qué queremos que hagan después de verlo",
    "community_impact": "Cómo fortalece la comunidad Acadelia"
  }
}`,


story: `Crea una HISTORIA ÍNTIMA donde el PROFESOR ACADEL conecta 1-a-1 con estudiantes de {{target.carrera}} sobre {{theme}} como el mentor que todos necesitan pero nunca tuvieron.

VIBE DE LA HISTORIA:
- Behind-the-scenes de la mente de Acadel
- Vulnerable pero still brutalmente honesto
- Advice que solo un chigüire wise podría dar
- Estudiantes sintiéndose uniquely understood

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Momento íntimo que Acadel está compartiendo",
  "story": {
    "target": { "carrera": "{{target.carrera}}" },
    "concept": "Concepto general de la historia",
    "slides": [
      {
        "slide": 1,
        "timing": "3-5 segundos",
        "visual": "Opening visual de Acadel en modo íntimo",
        "text_overlay": "Hook text que crea curiosidad inmediata",
        "audio_cue": "Sound/música que establece el mood",
        "interaction": "Tap/swipe element si aplica"
      },
      {
        "slide": 2,
        "timing": "4-6 segundos", 
        "visual": "Acadel elaborando su punto principal",
        "text_overlay": "Main message dirigido a {{target.carrera}}",
        "audio_cue": "Continuación del audio narrative",
        "interaction": "Poll/question/slider para engagement"
      },
      {
        "slide": 3,
        "timing": "3-5 segundos",
        "visual": "Acadel delivering punchline/wisdom",
        "text_overlay": "Takeaway final que se queda en la mente",
        "audio_cue": "Audio que refuerza el mensaje",
        "interaction": "DM prompt o follow-up action"
      }
    ],
    
    "interactive_elements": {
      "polls": "Pregunta que revela algo sobre {{target.carrera}}",
      "questions": "Question sticker que invita a responder",
      "sliders": "Slider emoji que mide relación con el tema",
      "quiz": "Quiz rápido relacionado con {{theme}}"
    },
    
    "hashtags": [
      "#AcadelMoments",
      "#{{target.carrera}}Vibes",
      "#ChigüireWisdom",
      "#RealTalk"
    ],
    
    "follow_up_strategy": {
      "dm_responses": "Cómo Acadel respondería a DMs generados",
      "next_story": "Qué historia podría seguir a esta",
      "community_building": "Cómo esto profundiza relación con audiencia"
    }
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "intimate_moment": "Cuándo verían esta historia para máximo impacto",
    "emotional_journey": "Cómo se sienten al inicio vs. al final",
    "relationship_deepening": "Cómo esto cambia su percepción de Acadel"
  }
}`,

// Plantilla por defecto - Estructura genérica pero específica
default: `Crea contenido donde el PROFESOR ACADEL being absolutely iconic en formato {{type}} sobre {{theme}} para {{target.carrera}} que están hartos del sistema educativo tradicional.

ESENCIA DE ACADEL:
- Chigüire que entiende a estudiantes mejor que sus profesores
- Brutalmente honesto pero genuinamente caring
- Humor absurdo mezclado con sabiduría real
- Anti-héroe educativo que hace cool el aprendizaje

RESPONDE SOLO CON ESTE JSON:
{
  "theme": "Concepto central con Acadel como protagonista",
  "{{type}}": {
    "target": { "carrera": "{{target.carrera}}" },
    "main_message": "Mensaje principal de Acadel sobre {{theme}}",
    "personality_showcase": "Cómo se manifiesta la personalidad única de Acadel",
    "student_connection": "Por qué {{target.carrera}} se conectan profundamente",
    "humor_elements": "Elementos de humor específicos de Acadel",
    "wisdom_delivery": "Cómo Acadel entrega conocimiento real",
    "engagement_hook": "Qué hace que estudiantes interactúen",
    "viral_factor": "Potencial de ser compartido masivamente",
    "hashtags": [
      "#ProfesorAcadel",
      "#{{target.carrera}}Life",
      "#AcadeliaVibes",
      "#ChigüireTeacher"
    ]
  },
  "targetAudience": {
    "carrera": "{{target.carrera}}",
    "pain_points": "Problemas específicos que Acadel está addressing",
    "desired_feeling": "Cómo se deben sentir después del contenido",
    "community_impact": "Cómo esto fortalece la tribu Acadelia"
  }
}`
};

export const getPromptTemplate = (type = 'default', params = {}) => {
  const template = promptTemplates[type] || promptTemplates.default;
  
  let customizedPrompt = template;
  Object.entries(params).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    customizedPrompt = customizedPrompt.replace(new RegExp(placeholder, 'g'), replacement);
  });
  
  return customizedPrompt;
};

export const validateSpecificStructure = (response, type) => {
  const warnings = [];
  const errors = [];
  
  // Validaciones core de Acadelia
  if (!response.theme) {
    errors.push('Campo "theme" requerido - debe incluir la personalidad de Acadel');
  }
  
  if (!response.targetAudience) {
    errors.push('Campo "targetAudience" requerido - debe especificar carrera y connection points');
  }
  
  const responseText = JSON.stringify(response).toLowerCase();
  const acadelKeywords = ['acadel', 'chigüire', 'brutal', 'honesto', 'humor', 'estudiante'];
  const hasAcadelEssence = acadelKeywords.some(keyword => responseText.includes(keyword));
  
  if (!hasAcadelEssence) {
    warnings.push('Contenido podría no capturar suficientemente la personalidad del Profesor Acadel');
  }
  
  // Validaciones específicas por tipo
  switch (type) {
    case 'video':
      if (!response.video?.guion) {
        errors.push('Videos deben incluir guion detallado con personalidad de Acadel');
      }
      if (!response.video?.potential_viral) {
        warnings.push('Video debería explicar su potencial viral');
      }
      break;
      
    case 'meme':
      if (!response.meme?.relatability_factor) {
        errors.push('Memes deben explicar por qué la audiencia se conectaría');
      }
      if (!response.meme?.acadel_role) {
        errors.push('Debe especificar cómo aparece Acadel en el meme');
      }
      break;
      
    case 'campaign':
      if (!response.campaign?.manifesto) {
        errors.push('Campañas necesitan manifesto rebelde de Acadel');
      }
      if (!response.campaign?.zero_budget_hacks) {
        warnings.push('Campañas deberían incluir estrategias de presupuesto cero');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    acadeliaSpirit: hasAcadelEssence
  };
};

export const cleanAIResponseWithStructure = (response, type) => {
   if (!response || typeof response !== 'object') {
    return null;
  }
  
  // Asegurar que el contenido tenga elementos core de Acadelia
  const baseStructure = {
    theme: response.theme || `El Profesor Acadel domina ${type} con su personalidad única`,
    [type]: response[type] || {
      target: { carrera: "Estudiantes" },
      main_message: "Acadel conectando con estudiantes de forma brutalmente honesta",
      personality_showcase: "Chigüire sabio pero torpe que entiende el dolor estudiantil",
      hashtags: ["#ProfesorAcadel", "#AcadeliaVibes"]
    },
    targetAudience: response.targetAudience || {
      carrera: "Estudiantes universitarios",
      edad: "18-25",
      pain_points: ["educación aburrida", "profesores desconectados"],
      connection_factor: "Acadel los entiende genuinamente"
    }
  };
  
  return baseStructure;
};