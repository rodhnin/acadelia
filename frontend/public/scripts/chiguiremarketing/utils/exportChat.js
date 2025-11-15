// exportChat.js - Sistema de exportación de conversaciones

export function setupChatExport() {
  const exportButton = document.getElementById('export-chat-btn');
  
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      exportCurrentChat();
      
      // Si estamos en móvil, cerrar el menú de opciones
      const accountOptions = document.querySelector('.account-options');
      if (accountOptions && window.innerWidth <= 768) {
        accountOptions.classList.remove('active');
      }
    });
  }
  
  // Exponer método globalmente para acceso desde otras partes
  window.exportChat = exportCurrentChat;
}

export async function exportCurrentChat() {
  try {
    if (window.showNotification) {
      window.showNotification('Preparando exportación...', 'info');
    }
    
    // Recopilar mensajes actuales del DOM
    const chatMessages = document.querySelectorAll('.message');
    
    if (chatMessages.length === 0) {
      if (window.showNotification) {
        window.showNotification('No hay mensajes para exportar', 'warning');
      }
      return;
    }
    
    let markdownContent = "# Conversación de Marketing IA de Acadelia\n";
    markdownContent += `## Fecha: ${new Date().toLocaleString()}\n\n`;
    
    chatMessages.forEach(message => {
      const isUser = message.classList.contains('message-user');
      const isAssistant = message.classList.contains('message-assistant');
      const isSystem = message.classList.contains('message-system');
      
      let role = '❓ Sistema';
      if (isUser) role = '👤 Usuario';
      if (isAssistant) role = '🤖 Asistente IA';
      
      let content = message.querySelector('.message-content').innerHTML;
      
      content = convertHtmlToMarkdown(content);
      
      markdownContent += `### ${role}\n\n${content}\n\n`;
    });
    
    downloadMarkdownFile(markdownContent, `chat-marketing-${formatDateForFilename(new Date())}.md`);
    
    if (window.showNotification) {
      window.showNotification('Chat exportado correctamente', 'success');
    }
  } catch (error) {
    console.error('Error exportando chat:', error);
    if (window.showNotification) {
      window.showNotification('Error al exportar el chat: ' + error.message, 'error');
    }
  }
}

function convertHtmlToMarkdown(html) {
  // Preservar bloques especiales para procesarlos después
  const specialBlocks = [];
  
  // Preservar bloques de código
  let processedHtml = html.replace(/<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g, 
    (match, language, code) => {
      const placeholder = `CODE_BLOCK_${specialBlocks.length}`;
      specialBlocks.push(`\`\`\`${language}\n${decodeHTML(code)}\n\`\`\``);
      return placeholder;
    }
  );
  
  // Preservar diagramas mermaid
  processedHtml = processedHtml.replace(/<div class="mermaid">([\s\S]*?)<\/div>/g,
    (match, code) => {
      const placeholder = `MERMAID_BLOCK_${specialBlocks.length}`;
      specialBlocks.push(`\`\`\`mermaid\n${decodeHTML(code)}\n\`\`\``);
      return placeholder;
    }
  );
  
  // Preservar tarjetas especiales
  // Profile card
  processedHtml = processedHtml.replace(/<div class="profile-card">([\s\S]*?)<\/div>/g,
    (match) => {
      const title = match.match(/<h3[^>]*>(.*?)<\/h3>/i)?.[1] || 'Perfil';
      // Simplificación para exportación
      const placeholder = `SPECIAL_BLOCK_${specialBlocks.length}`;
      specialBlocks.push(`> **${decodeHTML(title).replace(/<[^>]+>/g, '')}**\n> \n> _Se ha guardado un perfil de usuario_`);
      return placeholder;
    }
  );
  
  // Content card
  processedHtml = processedHtml.replace(/<div class="content-card">([\s\S]*?)<\/div>/g,
    (match) => {
      const title = match.match(/<h3[^>]*>(.*?)<\/h3>/i)?.[1] || 'Contenido';
      // Simplificación para exportación
      const placeholder = `SPECIAL_BLOCK_${specialBlocks.length}`;
      specialBlocks.push(`> **${decodeHTML(title).replace(/<[^>]+>/g, '')}**\n> \n> _Se ha guardado un contenido de marketing_`);
      return placeholder;
    }
  );
  
  // Trend card
  processedHtml = processedHtml.replace(/<div class="trend-card">([\s\S]*?)<\/div>/g,
    (match) => {
      const title = match.match(/<h3[^>]*>(.*?)<\/h3>/i)?.[1] || 'Tendencia';
      // Simplificación para exportación
      const placeholder = `SPECIAL_BLOCK_${specialBlocks.length}`;
      specialBlocks.push(`> **${decodeHTML(title).replace(/<[^>]+>/g, '')}**\n> \n> _Se ha guardado una tendencia de marketing_`);
      return placeholder;
    }
  );
  
  let markdown = processedHtml
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, '# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, '## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, '### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/g, '#### $1\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/g, '##### $1\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/g, '###### $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/g, '$1\n\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/g, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/g, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, '$1\n')
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, '$1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '- $1\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<hr\s*\/?>/g, '---\n');
  
  markdown = markdown.replace(/<div class="table-container">([\s\S]*?)<\/div>/g, (match, tableHTML) => {
    const rows = tableHTML.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
    
    if (rows.length === 0) return '';
    
    let markdownTable = '';
    
    rows.forEach((row, rowIndex) => {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || [];
      
      const cellContents = cells.map(cell => {
        const content = cell.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g, '$1').trim();
        return content || ' ';
      });
      
      markdownTable += `| ${cellContents.join(' | ')} |\n`;
      
      // Después de la primera fila (encabezado), añadir separador
      if (rowIndex === 0) {
        markdownTable += `| ${cellContents.map(() => '---').join(' | ')} |\n`;
      }
    });
    
    return markdownTable;
  });
  
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  specialBlocks.forEach((block, index) => {
    const placeholder = new RegExp(`(CODE|MERMAID|SPECIAL)_BLOCK_${index}`, 'g');
    markdown = markdown.replace(placeholder, block);
  });
  
  markdown = decodeHTML(markdown);
  
  return markdown;
}

function decodeHTML(html) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
}

// Descargar archivo Markdown
function downloadMarkdownFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Simular click para iniciar descarga
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDateForFilename(date) {
  return date.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');
}