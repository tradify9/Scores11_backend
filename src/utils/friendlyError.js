const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

const FIELD_LABELS = {
  email: 'Email',
  password: 'Password',
  phone: 'Phone number',
  name: 'Name',
  username: 'Username',
  matchId: 'Match',
  teamId: 'Team',
  playerId: 'Player',
  userId: 'User',
  batsmanId: 'Batsman',
  bowlerId: 'Bowler',
};

export const getErrorStatusCode = (error) => {
  if (!error) return 500;
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  if (error.name === 'CastError') return 404;
  if (error.code === 11000) return 409;
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return 401;
  if (error.type === 'entity.parse.failed') return 400;
  return 500;
};

export const toFriendlyError = (error, options = {}) => {
  const statusCode = getErrorStatusCode(error);
  const fallback = options.fallback || DEFAULT_MESSAGE;

  if (!error) return fallback;

  // Errors thrown on purpose with a user-facing message (e.g. "OTP service
  // not set up") keep it; everything else unexpected stays generic.
  if (statusCode >= 500 && !(error.expose === true && error.message)) {
    return 'Server is busy right now. Please try again shortly.';
  }

  if (error.name === 'CastError') {
    return 'This item is no longer available.';
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    const label = fieldLabel(field);
    return label ? `${label} already exists. Please use another one.` : 'This record already exists.';
  }

  if (error.name === 'ValidationError') {
    return 'Please check the details and try again.';
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return 'Session expired. Please login again.';
  }

  if (error.type === 'entity.parse.failed') {
    return 'Invalid request. Please try again.';
  }

  const raw = extractMessage(error);
  return sanitizeMessage(raw, statusCode, fallback);
};

export const sanitizeErrorDetails = (errors) => {
  const details = Array.isArray(errors) ? errors : errors?.details;
  if (!Array.isArray(details)) return undefined;

  return details
    .map((detail) => {
      const field = Array.isArray(detail.path)
        ? detail.path.join('.')
        : detail.field || detail.path || undefined;
      // Short machine codes (e.g. PROFILE_REQUIRED) drive app flows; keep them.
      const code = typeof detail.code === 'string' && /^[A-Z][A-Z0-9_]{1,40}$/.test(detail.code)
        ? detail.code
        : undefined;
      return {
        ...(field ? { field } : {}),
        ...(code ? { code } : {}),
        message: sanitizeMessage(detail.message, 400, 'Please check this field.'),
      };
    })
    .filter((detail) => detail.message);
};

export const friendlyValidationMessage = (details, prefix = 'Validation') => {
  if (!Array.isArray(details) || details.length === 0) {
    return 'Please check the details and try again.';
  }

  const first = details[0];
  const field = Array.isArray(first.path) ? first.path.join('.') : first.path;
  const label = fieldLabel(field) || 'This field';
  const type = first.type || '';

  if (type.includes('required') || /required/i.test(first.message || '')) {
    return `${label} is required.`;
  }
  if (type.includes('email')) return 'Please enter a valid email address.';
  if (type.includes('min')) return `${label} is too short.`;
  if (type.includes('max')) return `${label} is too long.`;
  if (type.includes('empty')) return `${label} cannot be empty.`;

  const cleaned = sanitizeMessage(first.message, 400, '');
  return cleaned || `${prefix} failed. Please check the details.`;
};

const extractMessage = (error) => {
  if (typeof error === 'string') return error;
  return error?.message || '';
};

const sanitizeMessage = (message, statusCode, fallback) => {
  let text = String(message || '').trim();
  if (!text) return fallback;

  text = text
    .replace(/^Validation Error:\s*/i, '')
    .replace(/^Query Validation Error:\s*/i, '')
    .replace(/^Params Validation Error:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^Exception:\s*/i, '')
    .replace(/"/g, '')
    .trim();

  const lower = text.toLowerCase();

  if (statusCode === 401 ||
      lower.includes('jwt') ||
      lower.includes('token expired') ||
      lower.includes('invalid token') ||
      lower.includes('no token') ||
      lower.includes('unauthorized')) {
    return 'Session expired. Please login again.';
  }

  if (statusCode === 403 || lower.includes('forbidden') || lower.includes('permission')) {
    return 'You do not have permission for this action.';
  }

  if (statusCode === 404 || lower.startsWith('not found -') || lower.includes('not found')) {
    return 'This item is no longer available.';
  }

  if (statusCode === 429 || lower.includes('too many')) {
    return 'Too many requests. Please try again after a moment.';
  }

  if (lower.includes('cast to objectid') ||
      lower.includes('objectid') ||
      lower.includes('mongoose') ||
      lower.includes('e11000') ||
      lower.includes('duplicate key') ||
      lower.includes('cannot read properties') ||
      lower.includes('undefined') ||
      lower.includes('stack trace') ||
      lower.includes('/api/') ||
      lower.includes('\\backend\\') ||
      text.length > 180) {
    return fallback;
  }

  return text || fallback;
};

const fieldLabel = (field) => {
  if (!field) return '';
  const key = String(field).split('.').pop();
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/Id$/i, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
};
