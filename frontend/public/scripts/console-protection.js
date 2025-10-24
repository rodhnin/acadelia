/**
 * Protección profesional de consola - Versión Estricta
 * Oculta todos los mensajes excepto la advertencia personalizada
 */
(function() {
  // Comprobación para evitar ejecución duplicada
  if (window.__acadelConsoleProtectionLoaded) return;
  window.__acadelConsoleProtectionLoaded = true;
  
  // CONFIGURACIÓN
  const config = {
    enabled: true,
    termsUrl: '/terminos_condiciones'
  };
  
  // Si está desactivado, no hacer nada
  if (config.enabled === false) return;
  
  // === 1. MENSAJE DE ADVERTENCIA PERSONALIZADO ===
  const titleStyles = [
    'color: #5D4037',
    'font-size: 22px', 
    'font-weight: bold', 
    'text-shadow: 1px 1px 2px #8D6E63', 
    'padding: 10px',
    'font-family: "Poppins", sans-serif'
  ].join(';');
  
  const normalStyles = 'color: inherit; font-size: inherit;';
  const linkStyles = 'color: #1976D2; text-decoration: underline;';
  
  // ASCII Art del Profesor Acadel (capibara) enojado
  const capibaraArt = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⣀⡀⣤⠤⣵⡿⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⡟⢿⣬⡴⣮⣞⣛⣿⢿⣽⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡿⢿⣏⣼⣿⣾⡻⣹⣿⣿⣿⣽⣿⣿⣿⣦⣄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣞⡎⢩⠿⣻⢏⢯⡟⣿⣿⣿⣿⣽⣿⢿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⡴⠟⡁⡂⠋⣬⡿⠧⠕⠏⢻⣽⣿⡟⣯⢾⣗⡾⣿⣻⣟⣿⣿⣿⣦⡀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣼⡏⠯⢾⠅⣜⢷⣻⣥⠲⢈⠐⡀⣦⢌⠁⠁⠚⠿⢅⣿⣿⣟⡿⣟⣿⣿⣆⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠜⣯⡍⣿⢢⡬⢮⡿⣿⡿⣽⢯⡳⣟⣿⠾⡫⡔⢣⡵⣾⣯⣿⣯⣟⣽⣿⣿⣿⠀⡀
⠀⠀⠀⠀⠀⠀⣰⡠⠈⠻⡷⣣⣼⣷⣽⣟⣻⣿⣿⡿⣞⣾⣟⣿⣡⢓⣴⣻⣻⢿⣿⣿⣿⣿⣿⡇⡀⡀
⠀⠀⠀⠀⣠⢾⣟⣧⠀⠑⢌⠻⣿⣦⣵⡻⣿⣾⣿⣿⣽⣷⣿⣿⣿⣿⢷⣧⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀
⠀⠀⢀⣼⢫⣾⣻⣟⣆⠀⠀⠁⡌⠻⢟⣷⢿⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⡿⠿⠛⠁⠑⠀⠀
⠀⠀⠢⣗⣻⣼⢟⡾⢯⣂⠀⠀⠈⠈⠄⡙⠯⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢡⢄⠀⠀⠀⠀⠀⠀⠀⠀
⠠⢁⠃⢽⣣⢿⣸⢻⡝⣧⢆⡀⠀⠀⠀⠀⠀⠈⠙⠿⢾⣿⣿⣿⣿⣿⣿⢏⠁⠲⢱⡦⡀⠀⠀⠀⠀⠀
⠆⡌⡘⢸⢣⢟⡞⡷⣹⢚⣆⢚⢦⡂⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⢿⣿⠋⢀⠀⠈⣇⢺⢖⡠⡀⠀⠀⠀
⠰⠠⠑⣂⠓⡮⣓⠧⡙⢎⠦⢡⢃⡙⢦⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡶⣦⣄⠀⠀⣿⡝⡮⢷⡭⠄⠀⠀
⠀⠡⡃⢦⡛⡴⢻⣲⡅⢊⠔⠢⡌⢡⣄⠙⠲⣄⠀⠀⠀⠀⠈⠔⣿⣿⣚⣿⠑⠦⡇⣿⣹⢯⣟⠅⠀⠀
⠀⠀⠀⠣⡝⡞⣧⢗⣞⣦⣍⠳⣈⠣⢌⢢⡀⠈⠙⠦⣄⢀⠏⠀⠈⢻⡵⣯⠇⠀⠀⢿⢻⣿⡯⠀⠀⠀
⠀⠀⠀⠀⠈⠻⠴⣫⢿⢽⡭⣖⡡⡙⣌⠢⡔⣀⠀⠀⠀⢃⠀⠀⠀⢸⡀⠯⡶⣂⠀⢸⣿⡿⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠉⠚⢷⡹⣜⣳⢳⣌⠚⡴⢢⡕⣄⠀⠀⠀⠀⠈⠈⡵⣆⣲⣿⣄⢸⡟⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠘⠋⠷⢎⣧⡙⣇⠞⡴⣅⢄⠀⠀⠀⠀⣿⣿⣏⣿⡿⠊⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠘⠙⠒⠭⠗⠵⠄⠀⠀⠿⠗⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀
  `;
  
  // Guardar los métodos originales
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    clear: console.clear
  };
  
  // Lista de mensajes que mostraremos (solo la advertencia)
  const warningMessages = [
    '¡ATENCIÓN ESTUDIANTE!',
    'El Profesor Acadel ha detectado actividad inusual en la consola de desarrollo',
    'Nunca copies y pegues código en esta consola',
    'Para conocer más sobre nuestras directrices de seguridad educativa'
  ];

  // Variable para almacenar si el mensaje de advertencia ya se mostró
  let warningShown = false;
  
  // Función para mostrar la advertencia
  function showWarning() {
    if (warningShown) return;
    warningShown = true;
    
    originalConsole.clear.apply(console);
    originalConsole.log('%c¡ATENCIÓN ESTUDIANTE!', titleStyles);
    originalConsole.log(capibaraArt);
    originalConsole.log('%cEl Profesor Acadel ha detectado actividad inusual en la consola de desarrollo. Este es un espacio reservado para tareas técnicas y no para estudiantes.', normalStyles);
    originalConsole.log('%cNunca copies y pegues código en esta consola si alguien te lo pide. El Profesor Acadel te advierte: hacerlo podría exponer tus datos a terceros malintencionados o incluso comprometer tu progreso académico. Los verdaderos beneficios educativos se encuentran en el aprendizaje, no en los atajos.', normalStyles);
    originalConsole.log('%cPara conocer más sobre nuestras directrices de seguridad educativa, visita:', normalStyles);
    originalConsole.log('%c' + config.termsUrl, linkStyles);
  }
  
  // Función para comprobar si un mensaje es parte de nuestra advertencia
  function isWarningMessage(args) {
    if (!args || args.length === 0) return false;
    
    // Convertir argumentos a texto
    const text = Array.from(args).join(' ');
    
    // Verificar si coincide con alguno de nuestros mensajes de advertencia
    return warningMessages.some(message => text.includes(message));
  }
  
  // Mostrar la advertencia al inicio
  showWarning();
  
  // Sobrescribir todos los métodos de consola para ocultar todos los mensajes
  // excepto nuestra advertencia personalizada
  
  console.log = function() {
    // Solo permitir mensajes de nuestra advertencia
    if (isWarningMessage(arguments)) {
      originalConsole.log.apply(console, arguments);
    }
  };
  
  console.error = function() {
    // Suprimir todos los errores
    return;
  };
  
  console.warn = function() {
    // Suprimir todas las advertencias
    return;
  };
  
  console.info = function() {
    // Suprimir todos los mensajes info
    return;
  };
  
  console.debug = function() {
    // Suprimir todos los mensajes debug
    return;
  };
  
  console.trace = function() {
    // Suprimir todas las trazas
    return;
  };
  
  // Sobrescribir console.clear para mostrar siempre la advertencia
  console.clear = function() {
    showWarning();
  };
  
  // Interceptar errores para evitar que se muestren en consola
  window.addEventListener('error', function(event) {
    // Prevenir que aparezca en consola
    event.preventDefault();
    return false;
  }, true);
  
  // Capturar promesas rechazadas no controladas
  window.addEventListener('unhandledrejection', function(event) {
    // Prevenir que aparezca en consola
    event.preventDefault();
    return false;
  });
})();