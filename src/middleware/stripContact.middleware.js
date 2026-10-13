// For unauthenticated (public) routes: remove contact details from whatever
// the handler sends, so public listings never expose phone numbers or emails.
const PRIVATE_KEYS = new Set(['phone', 'email', 'fcmTokens', 'password']);

const strip = (value) => {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (!PRIVATE_KEYS.has(key)) out[key] = strip(inner);
    }
    return out;
  }
  return value;
};

export const stripContact = (req, res, next) => {
  const send = res.json.bind(res);
  // Round-trip through JSON first so Mongoose documents/ObjectIds become plain data.
  res.json = (body) => send(strip(JSON.parse(JSON.stringify(body))));
  next();
};

export default stripContact;
