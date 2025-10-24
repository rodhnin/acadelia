// formatting-marketing.js - Utilidades de formateo para marketing

// Formatear números con separadores de miles
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  
  // Si es un número muy grande, usar notación abreviada
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return new Intl.NumberFormat('es-ES').format(num);
}

// Formatear porcentajes
export function formatPercentage(num, decimals = 2) {
  if (num === null || num === undefined) return '0%';
  
  // Si el número ya está en formato de porcentaje (0-100)
  let percentage = num;
  if (num <= 1) {
    percentage = num * 100;
  }
  
  return percentage.toFixed(decimals) + '%';
}

// Formatear fechas
export function formatDate(date) {
  if (!date) return 'Fecha no disponible';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }
  
  return dateObj.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Formatear fechas relativas (hace X tiempo)
export function formatRelativeDate(date) {
  if (!date) return 'Fecha no disponible';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (minutes < 60) {
    return `hace ${minutes} min`;
  } else if (hours < 24) {
    return `hace ${hours}h`;
  } else if (days < 7) {
    return `hace ${days}d`;
  } else if (weeks < 4) {
    return `hace ${weeks}sem`;
  } else if (months < 12) {
    return `hace ${months}mes`;
  } else {
    return formatDate(dateObj);
  }
}

// Formatear métricas de marketing
export function formatMetric(value, type = 'number') {
  switch (type) {
    case 'percentage':
      return formatPercentage(value);
    case 'currency':
      return formatCurrency(value);
    case 'rate':
      return formatPercentage(value, 1);
    default:
      return formatNumber(value);
  }
}

// Formatear moneda
export function formatCurrency(amount, currency = 'EUR') {
  if (amount === null || amount === undefined) return '0 €';
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Formatear duración (en segundos a formato legible)
export function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Formatear tamaño de archivo
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Formatear texto para mostrar solo las primeras palabras
export function formatExcerpt(text, maxWords = 20) {
  if (!text) return '';
  
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  
  return words.slice(0, maxWords).join(' ') + '...';
}

// 🔧 FUNCIÓN ACTUALIZADA: Formatear nombres de canales para mostrar
export function formatChannelName(channel) {
  const channelMap = {
    'instagram': 'Instagram',
    'tiktok': 'TikTok', 
    'email': 'Email',
    'youtube': 'YouTube',
    'whatsapp': 'WhatsApp',
    'facebook': 'Facebook',
    'twitter': 'Twitter/X',
    'linkedin': 'LinkedIn',
    'discord': 'Discord',
    'telegram': 'Telegram'
  };
  
  return channelMap[channel?.toLowerCase()] || (channel || 'Desconocido');
}

// 🔧 FUNCIÓN ACTUALIZADA: Formatear tipo de contenido para el sistema de marketing
export function formatContentType(type) {
  const typeMap = {
    'meme': 'Memes',
    'video': 'Videos', 
    'campaign': 'Campañas',
    'email': 'Emails',
    'post': 'Posts',
    'story': 'Historias',
    'reel': 'Reels',
    'image': 'Imágenes',
    'carousel': 'Carruseles',
    'blog': 'Blogs',
    'infographic': 'Infografías'
  };
  
  return typeMap[type?.toLowerCase()] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Desconocido');
}

// Exportar todas las funciones para uso global
if (typeof window !== 'undefined') {
  window.formatNumber = formatNumber;
  window.formatPercentage = formatPercentage;
  window.formatDate = formatDate;
  window.formatRelativeDate = formatRelativeDate;
  window.formatMetric = formatMetric;
  window.formatCurrency = formatCurrency;
  window.formatDuration = formatDuration;
  window.formatFileSize = formatFileSize;
  window.formatExcerpt = formatExcerpt;
  window.formatChannelName = formatChannelName;
  window.formatContentType = formatContentType;
}