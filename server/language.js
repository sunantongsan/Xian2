import {LANGUAGES, defaultLanguage} from '../web/language.js';
export function accountLanguage(profile = {}, deviceLocale = 'en') {
  return {language: defaultLanguage(profile, deviceLocale), country: profile.country || null, locale: profile.locale || null};
}
export function identityLanguage(user = {}) {
  const metadata = user.user_metadata || {};
  const identity = user.identities?.find(i => i.provider === 'google')?.identity_data || {};
  const country = metadata.country_code || identity.country_code;
  const locale = metadata.locale || identity.locale;
  return {
    ...(typeof country === 'string' && /^[a-z]{2}$/i.test(country) ? {country: country.toUpperCase()} : {}),
    ...(typeof locale === 'string' && /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i.test(locale) ? {locale: locale.slice(0,35)} : {})
  };
}
export function languagePreference(value) {
  if (!LANGUAGES.includes(value)) throw Error('invalid_language');
  return value;
}
