export type Language = 'en' | 'hi' | 'mr';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.sales': 'Point of Sale',
    'nav.dashboard': 'Dashboard',
    'nav.inventory': 'Inventory',
    'nav.products': 'Products',
    'nav.reports': 'Reports',
    'nav.credit': 'Udhaar / Credit',
    'nav.history': 'Sales History',
    'nav.customers': 'Customers',
    'nav.settings': 'Settings',
    'app.logout': 'Sign out'
  },
  hi: {
    'nav.sales': 'पॉइंट ऑफ सेल',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.inventory': 'स्टॉक',
    'nav.products': 'उत्पाद',
    'nav.reports': 'रिपोर्ट्स',
    'nav.credit': 'उधार',
    'nav.history': 'बिक्री इतिहास',
    'nav.customers': 'ग्राहक',
    'nav.settings': 'सेटिंग्स',
    'app.logout': 'लॉग आउट'
  },
  mr: {
    'nav.sales': 'पॉईंट ऑफ सेल',
    'nav.dashboard': 'डॅशबोर्ड',
    'nav.inventory': 'स्टॉक',
    'nav.products': 'उत्पादने',
    'nav.reports': 'अहवाल',
    'nav.credit': 'उधार',
    'nav.history': 'विक्री इतिहास',
    'nav.customers': 'ग्राहक',
    'nav.settings': 'सेटिंग्ज',
    'app.logout': 'लॉग आउट'
  }
};

export function t(lang: Language, key: string): string {
  return translations[lang]?.[key] || translations['en'][key] || key;
}
