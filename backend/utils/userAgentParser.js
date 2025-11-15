// utils/userAgentParser.js

/**
 * Parser de User-Agent para mostrar información amigable al usuario
 * Convierte User-Agents crudos en información legible con iconos
 */

// Patrones de detección de navegadores
const BROWSER_PATTERNS = {
    'Chrome': {
        pattern: /Chrome\/(\d+)/,
        exclude: ['Edge', 'OPR', 'YaBrowser'],
        icon: '🔴',
        color: '#4285F4'
    },
    'Firefox': {
        pattern: /Firefox\/(\d+)/,
        exclude: [],
        icon: '🦊',
        color: '#FF7139'
    },
    'Safari': {
        pattern: /Safari\/(\d+)/,
        exclude: ['Chrome', 'Edge'],
        icon: '🧭',
        color: '#007AFF'
    },
    'Edge': {
        pattern: /Edg\/(\d+)/,
        exclude: [],
        icon: '🔷',
        color: '#0078D4'
    },
    'Opera': {
        pattern: /OPR\/(\d+)/,
        exclude: [],
        icon: '🎭',
        color: '#FF1B2D'
    },
    'Internet Explorer': {
        pattern: /(?:MSIE |Trident.*rv:)(\d+)/,
        exclude: [],
        icon: '📘',
        color: '#1BA1E2'
    },
    'Brave': {
        pattern: /Chrome\/(\d+).*Brave/,
        exclude: [],
        icon: '🦁',
        color: '#FB542B'
    },
    'Vivaldi': {
        pattern: /Vivaldi\/(\d+)/,
        exclude: [],
        icon: '🎨',
        color: '#EF3939'
    }
};

// Patrones de detección de sistemas operativos
const OS_PATTERNS = {
    'Windows 11': {
        pattern: /Windows NT 10\.0.*Windows NT 10\.0/,
        icon: '🪟',
        color: '#0078D4'
    },
    'Windows 10': {
        pattern: /Windows NT 10\.0/,
        icon: '🪟',
        color: '#0078D4'
    },
    'Windows 8.1': {
        pattern: /Windows NT 6\.3/,
        icon: '🪟',
        color: '#0078D4'
    },
    'Windows 8': {
        pattern: /Windows NT 6\.2/,
        icon: '🪟',
        color: '#0078D4'
    },
    'Windows 7': {
        pattern: /Windows NT 6\.1/,
        icon: '🪟',
        color: '#0078D4'
    },
    'macOS': {
        pattern: /Mac OS X|macOS/,
        icon: '🍎',
        color: '#007AFF'
    },
    'iOS': {
        pattern: /iPhone|iPad|iPod/,
        icon: '📱',
        color: '#007AFF'
    },
    'Android': {
        pattern: /Android/,
        icon: '🤖',
        color: '#3DDC84'
    },
    'Linux': {
        pattern: /Linux/,
        exclude: ['Android'],
        icon: '🐧',
        color: '#FCC624'
    },
    'Ubuntu': {
        pattern: /Ubuntu/,
        icon: '🟠',
        color: '#E95420'
    },
    'ChromeOS': {
        pattern: /CrOS/,
        icon: '💻',
        color: '#4285F4'
    }
};

// Patrones de detección de dispositivos
const DEVICE_PATTERNS = {
    'Mobile': {
        pattern: /Mobile|iPhone|iPod|Android.*Mobile/,
        icon: '📱',
        type: 'mobile'
    },
    'Tablet': {
        pattern: /Tablet|iPad|Android(?!.*Mobile)/,
        icon: '📱',
        type: 'tablet'
    },
    'Desktop': {
        pattern: /Windows|Mac OS X|Linux|CrOS/,
        exclude: ['Mobile', 'Tablet'],
        icon: '💻',
        type: 'desktop'
    },
    'Smart TV': {
        pattern: /SmartTV|Tizen|WebOS/,
        icon: '📺',
        type: 'tv'
    },
    'Game Console': {
        pattern: /PlayStation|Xbox|Nintendo/,
        icon: '🎮',
        type: 'console'
    }
};

/**
 * Detecta el navegador desde el User-Agent
 * @param {string} userAgent - User-Agent string
 * @returns {Object} Información del navegador
 */
function detectBrowser(userAgent) {
    if (!userAgent) {
        return {
            name: 'Desconocido',
            version: null,
            icon: '❓',
            color: '#666666'
        };
    }

    for (const [browserName, config] of Object.entries(BROWSER_PATTERNS)) {
        const hasExclusion = config.exclude.some(exclusion => 
            userAgent.includes(exclusion)
        );
        
        if (hasExclusion) continue;

        const match = userAgent.match(config.pattern);
        if (match) {
            return {
                name: browserName,
                version: match[1] || null,
                icon: config.icon,
                color: config.color
            };
        }
    }

    return {
        name: 'Desconocido',
        version: null,
        icon: '❓',
        color: '#666666'
    };
}

/**
 * Detecta el sistema operativo desde el User-Agent
 * @param {string} userAgent - User-Agent string
 * @returns {Object} Información del sistema operativo
 */
function detectOS(userAgent) {
    if (!userAgent) {
        return {
            name: 'Desconocido',
            icon: '❓',
            color: '#666666'
        };
    }

    for (const [osName, config] of Object.entries(OS_PATTERNS)) {
        if (config.exclude) {
            const hasExclusion = config.exclude.some(exclusion => 
                userAgent.includes(exclusion)
            );
            if (hasExclusion) continue;
        }

        if (config.pattern.test(userAgent)) {
            return {
                name: osName,
                icon: config.icon,
                color: config.color
            };
        }
    }

    return {
        name: 'Desconocido',
        icon: '❓',
        color: '#666666'
    };
}

/**
 * Detecta el tipo de dispositivo desde el User-Agent
 * @param {string} userAgent - User-Agent string
 * @returns {Object} Información del dispositivo
 */
function detectDevice(userAgent) {
    if (!userAgent) {
        return {
            type: 'unknown',
            name: 'Dispositivo desconocido',
            icon: '❓'
        };
    }

    for (const [deviceName, config] of Object.entries(DEVICE_PATTERNS)) {
        if (config.exclude) {
            const hasExclusion = config.exclude.some(exclusion => 
                new RegExp(exclusion, 'i').test(userAgent)
            );
            if (hasExclusion) continue;
        }

        if (config.pattern.test(userAgent)) {
            return {
                type: config.type,
                name: deviceName,
                icon: config.icon
            };
        }
    }

    return {
        type: 'unknown',
        name: 'Dispositivo desconocido',
        icon: '❓'
    };
}

/**
 * Parsea completamente un User-Agent
 * @param {string} userAgent - User-Agent string
 * @returns {Object} Información completa parseada
 */
export function parseUserAgent(userAgent) {
    if (!userAgent || userAgent === 'Unknown') {
        return {
            browser: detectBrowser(''),
            os: detectOS(''),
            device: detectDevice(''),
            raw: userAgent || 'Unknown',
            isValid: false
        };
    }

    const browser = detectBrowser(userAgent);
    const os = detectOS(userAgent);
    const device = detectDevice(userAgent);

    return {
        browser,
        os,
        device,
        raw: userAgent,
        isValid: true
    };
}

/**
 * Formatea información del User-Agent para mostrar al usuario
 * @param {string} userAgent - User-Agent string
 * @param {Object} options - Opciones de formateo
 * @returns {string} String formateado para mostrar
 */
export function formatUserAgentForDisplay(userAgent, options = {}) {
    const {
        showIcons = true,
        showVersion = false,
        format = 'full' // 'full', 'compact', 'browser-only', 'os-only'
    } = options;

    const parsed = parseUserAgent(userAgent);
    
    if (!parsed.isValid) {
        return showIcons ? '❓ Dispositivo desconocido' : 'Dispositivo desconocido';
    }

    const browserIcon = showIcons ? parsed.browser.icon : '';
    const osIcon = showIcons ? parsed.os.icon : '';
    const deviceIcon = showIcons ? parsed.device.icon : '';

    const browserName = parsed.browser.name;
    const browserVersion = showVersion && parsed.browser.version ? 
        ` ${parsed.browser.version}` : '';
    const osName = parsed.os.name;
    const deviceName = parsed.device.name;

    switch (format) {
        case 'browser-only':
            return `${browserIcon} ${browserName}${browserVersion}`.trim();
            
        case 'os-only':
            return `${osIcon} ${osName}`.trim();
            
        case 'compact':
            return `${browserIcon} ${browserName} • ${osIcon} ${osName}`.trim();
            
        case 'full':
        default:
            if (parsed.device.type === 'mobile' || parsed.device.type === 'tablet') {
                return `${browserIcon} ${browserName} en ${osIcon} ${osName} ${deviceIcon}`.trim();
            } else {
                return `${browserIcon} ${browserName} en ${osName} ${deviceIcon}`.trim();
            }
    }
}

/**
 * Obtiene información específica para alertas de seguridad
 * @param {string} userAgent - User-Agent string
 * @returns {Object} Información formateada para alertas
 */
export function getSecurityAlertInfo(userAgent) {
    const parsed = parseUserAgent(userAgent);
    
    if (!parsed.isValid) {
        return {
            displayText: 'Dispositivo desconocido',
            riskLevel: 'high',
            details: {
                browser: 'Desconocido',
                os: 'Desconocido',
                device: 'Desconocido'
            }
        };
    }

    const displayText = formatUserAgentForDisplay(userAgent, { 
        showIcons: true, 
        format: 'full' 
    });

    let riskLevel = 'low';
    
    if (parsed.browser.name === 'Desconocido' || parsed.os.name === 'Desconocido') {
        riskLevel = 'high';
    } else if (parsed.browser.name === 'Internet Explorer') {
        riskLevel = 'medium';
    }

    return {
        displayText,
        riskLevel,
        details: {
            browser: `${parsed.browser.icon} ${parsed.browser.name}`,
            os: `${parsed.os.icon} ${parsed.os.name}`,
            device: `${parsed.device.icon} ${parsed.device.name}`
        },
        icons: {
            browser: parsed.browser.icon,
            os: parsed.os.icon,
            device: parsed.device.icon
        },
        colors: {
            browser: parsed.browser.color,
            os: parsed.os.color
        }
    };
}

/**
 * Valida si un User-Agent parece legítimo
 * @param {string} userAgent - User-Agent string
 * @returns {Object} Resultado de validación
 */
export function validateUserAgent(userAgent) {
    if (!userAgent || userAgent === 'Unknown') {
        return {
            isValid: false,
            risk: 'high',
            reason: 'User-Agent vacío o desconocido'
        };
    }

    const parsed = parseUserAgent(userAgent);
    
    // Verificaciones básicas
    const checks = {
        hasBasicStructure: userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari'),
        hasVersionNumbers: /\d+\.\d+/.test(userAgent),
        notTooShort: userAgent.length > 20,
        notTooLong: userAgent.length < 1000,
        hasKnownBrowser: parsed.browser.name !== 'Desconocido',
        hasKnownOS: parsed.os.name !== 'Desconocido'
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let risk = 'low';
    if (passedChecks < totalChecks * 0.5) {
        risk = 'high';
    } else if (passedChecks < totalChecks * 0.75) {
        risk = 'medium';
    }

    return {
        isValid: passedChecks >= totalChecks * 0.5,
        risk,
        score: (passedChecks / totalChecks) * 100,
        checks,
        details: parsed
    };
}

export function debugUserAgent(userAgent) {
    console.group('🔍 User-Agent Debug');
    console.log('Raw:', userAgent);
    
    const parsed = parseUserAgent(userAgent);
    console.log('Parsed:', parsed);
    
    const formatted = formatUserAgentForDisplay(userAgent);
    console.log('Formatted:', formatted);
    
    const validation = validateUserAgent(userAgent);
    console.log('Validation:', validation);
    
    const securityInfo = getSecurityAlertInfo(userAgent);
    console.log('Security Info:', securityInfo);
    
    console.groupEnd();
    
    return { parsed, formatted, validation, securityInfo };
}

export default {
    parseUserAgent,
    formatUserAgentForDisplay,
    getSecurityAlertInfo,
    validateUserAgent,
    debugUserAgent
};