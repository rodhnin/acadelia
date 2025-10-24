/**
 * 🧹 SIMPLE LANGCHAIN CLEANER - SOLO ESCAPA LLAVES PROBLEMÁTICAS
 * 
 * Una función súper simple que solo escapa las llaves {} para evitar errores de LangChain
 * SIN tocar el sistema de documentos, SIN cambiar cómo se guardan, SIN complicaciones.
 */

/**
 * Escapa llaves para LangChain - SÚPER SIMPLE
 * @param {string} content - Contenido que puede tener llaves problemáticas
 * @returns {string} - Contenido con llaves escapadas para LangChain
 */
export const escapeBracesForLangChain = (content) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Simple: todas las llaves { se convierten en {{
  // Simple: todas las llaves } se convierten en }}
  return content
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
};

/**
 * Limpia contexto de documentos para prompts - SÚPER SIMPLE
 * @param {string} documentContext - Contexto de documentos ya formateado
 * @returns {string} - Contexto escapado para LangChain
 */
export const cleanDocumentContextForPrompt = (documentContext) => {
  if (!documentContext) {
    return '';
  }

  // Solo escapar llaves y listo
  return escapeBracesForLangChain(documentContext);
};

/**
 * Escapa cualquier string antes de usarlo en prompts LangChain
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
export const safeForLangChain = (text) => {
  return escapeBracesForLangChain(text);
};