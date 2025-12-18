/**
 * Sistema de manejo de errores centralizado
 */

// Tipos de error
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  PARSING: 'PARSING',
  CLOUDFLARE: 'CLOUDFLARE',
  UNKNOWN: 'UNKNOWN'
};

// Mensajes de error amigables
const ErrorMessages = {
  [ErrorTypes.NETWORK]: {
    title: 'Error de conexión',
    message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
    canRetry: true
  },
  [ErrorTypes.TIMEOUT]: {
    title: 'Tiempo de espera agotado',
    message: 'El servidor tardó demasiado en responder. Intenta de nuevo.',
    canRetry: true
  },
  [ErrorTypes.NOT_FOUND]: {
    title: 'No encontrado',
    message: 'El contenido solicitado no existe o fue eliminado.',
    canRetry: false
  },
  [ErrorTypes.RATE_LIMIT]: {
    title: 'Demasiadas solicitudes',
    message: 'Has hecho muchas solicitudes. Espera un momento e intenta de nuevo.',
    canRetry: true,
    retryAfter: 5000
  },
  [ErrorTypes.PARSING]: {
    title: 'Error de datos',
    message: 'No se pudo procesar la respuesta del servidor.',
    canRetry: true
  },
  [ErrorTypes.CLOUDFLARE]: {
    title: 'Sitio protegido',
    message: 'Este sitio tiene protección contra bots. Intenta con otra fuente.',
    canRetry: false
  },
  [ErrorTypes.UNKNOWN]: {
    title: 'Error desconocido',
    message: 'Ocurrió un error inesperado. Intenta de nuevo.',
    canRetry: true
  }
};

/**
 * Clase de error personalizada
 */
export class AppError extends Error {
  constructor(type, originalError = null, context = {}) {
    const errorInfo = ErrorMessages[type] || ErrorMessages[ErrorTypes.UNKNOWN];
    super(errorInfo.message);

    this.name = 'AppError';
    this.type = type;
    this.title = errorInfo.title;
    this.canRetry = errorInfo.canRetry;
    this.retryAfter = errorInfo.retryAfter || 1000;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      type: this.type,
      title: this.title,
      message: this.message,
      canRetry: this.canRetry,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Detecta el tipo de error basado en la respuesta o excepción
 * @param {Error|Response} error - Error o respuesta HTTP
 * @returns {string} Tipo de error
 */
export function detectErrorType(error) {
  if (error instanceof Response) {
    const status = error.status;

    if (status === 404) return ErrorTypes.NOT_FOUND;
    if (status === 429) return ErrorTypes.RATE_LIMIT;
    if (status === 403) return ErrorTypes.CLOUDFLARE;
    if (status === 503) return ErrorTypes.RATE_LIMIT;
    if (status >= 500) return ErrorTypes.NETWORK;

    return ErrorTypes.UNKNOWN;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('aborted')) {
      return ErrorTypes.TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return ErrorTypes.NETWORK;
    }
    if (message.includes('json') || message.includes('parse') || message.includes('unexpected token')) {
      return ErrorTypes.PARSING;
    }
    if (message.includes('403') || message.includes('cloudflare')) {
      return ErrorTypes.CLOUDFLARE;
    }
  }

  return ErrorTypes.UNKNOWN;
}

/**
 * Crea un AppError desde cualquier error
 * @param {Error|Response} error - Error original
 * @param {Object} context - Contexto adicional
 * @returns {AppError} Error normalizado
 */
export function normalizeError(error, context = {}) {
  if (error instanceof AppError) {
    return error;
  }

  const type = detectErrorType(error);
  return new AppError(type, error, context);
}

/**
 * Wrapper para fetch con timeout y manejo de errores
 * @param {string} url - URL a consultar
 * @param {Object} options - Opciones de fetch
 * @param {number} timeout - Timeout en ms (default: 10000)
 * @returns {Promise<Response>} Respuesta
 */
export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw normalizeError(response, { url, status: response.status });
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new AppError(ErrorTypes.TIMEOUT, error, { url, timeout });
    }

    throw normalizeError(error, { url });
  }
}

/**
 * Wrapper para retry automático
 * @param {Function} fn - Función a ejecutar
 * @param {number} maxRetries - Número máximo de reintentos
 * @param {number} delay - Delay entre reintentos en ms
 * @returns {Promise<any>} Resultado de la función
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // No reintentar si el error no lo permite
      if (error instanceof AppError && !error.canRetry) {
        throw error;
      }

      // Esperar antes del siguiente intento
      if (attempt < maxRetries - 1) {
        const waitTime = error instanceof AppError ? error.retryAfter : delay;
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Log de errores (puede extenderse para enviar a un servicio)
 * @param {AppError} error - Error a registrar
 */
export function logError(error) {
  const errorData = error instanceof AppError ? error.toJSON() : {
    type: ErrorTypes.UNKNOWN,
    message: error.message,
    stack: error.stack
  };

  console.error('[Error]', errorData);

  // Aquí podrías enviar a un servicio de logging como Sentry
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error);
  // }
}

export default {
  ErrorTypes,
  AppError,
  detectErrorType,
  normalizeError,
  fetchWithTimeout,
  withRetry,
  logError
};
