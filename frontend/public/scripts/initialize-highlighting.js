document.addEventListener('DOMContentLoaded', function() {
  if (window.hljs) {
    console.log('Highlight.js detectado, inicializando...');
    window.hljs.configure({  // ✅ CORREGIDO
      languages: ['javascript', 'python', 'matlab', 'latex', 'typescript', 'css', 'html', 'bash', 'json'],
      ignoreUnescapedHTML: true
    });
   
    // Primera inicialización para elementos existentes
    initializeHighlighting();
   
    // Observador para detectar cambios en el DOM y aplicar highlighting a nuevos elementos
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          initializeHighlighting();
        }
      });
    });
   
    // Observar cambios en el contenedor de mensajes
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      observer.observe(chatMessages, { childList: true, subtree: true });
    }
  } else {
    console.error('Highlight.js no está disponible en window.hljs');
  }
});

function initializeHighlighting() {
  console.log('Aplicando highlighting a bloques de código...');
  document.querySelectorAll('pre code').forEach(block => {
    // Verifica si ya tiene la clase hljs para evitar duplicar el proceso
    if (!block.classList.contains('hljs')) {
      console.log('Aplicando highlight a:', block);
      window.hljs.highlightElement(block);  // ✅ CORREGIDO
    }
  });
}