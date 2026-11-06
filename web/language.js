// Language is a presentation preference, never an authorization or location claim.
export const LANGUAGES = ['th', 'en'];
export function defaultLanguage(profile = {}, deviceLocale = 'en') {
  if (LANGUAGES.includes(profile.language)) return profile.language;
  const country = typeof profile.country === 'string' ? profile.country.trim().toUpperCase() : '';
  if (/^[A-Z]{2}$/.test(country)) return country === 'TH' ? 'th' : 'en';
  const locale = typeof profile.locale === 'string' && profile.locale ? profile.locale : deviceLocale;
  return /^th(?:[-_]|$)/i.test(locale || '') ? 'th' : 'en';
}
export function createLanguage({storage, deviceLocale = 'en', onChange = () => {}} = {}) {
  let accountId = null, current = defaultLanguage({}, deviceLocale), profile = {};
  const key = () => 'cockro-language-v1:' + (accountId || 'guest');
  function read() { try { return storage?.getItem(key()); } catch { return null; } }
  function apply(value) { current = value; onChange(value); return value; }
  return {
    get current() { return current; },
    bind(id, metadata = {}) {
      accountId = id || null; profile = metadata;
      const saved = read();
      // Server preference wins on a different device. Cached preference is scoped to the account.
      return apply(defaultLanguage({...metadata, language: LANGUAGES.includes(metadata.language) ? metadata.language : saved}, deviceLocale));
    },
    choose(value) {
      if (!LANGUAGES.includes(value)) throw Error('invalid_language');
      try { storage?.setItem(key(), value); } catch {}
      return apply(value);
    },
    reset() { accountId = null; profile = {}; return this.bind(null); }
  };
}
