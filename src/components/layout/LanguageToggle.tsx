import type { Language } from '../../lib/i18n';
import { Globe } from 'lucide-react';

type Props = {
  language: Language;
  onLanguageChange: (lang: Language) => void;
};

export function LanguageToggle({ language, onLanguageChange }: Props) {
  return (
    <div className="language-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      <Globe size={16} color="var(--text-secondary)" />
      <select 
        value={language} 
        onChange={e => onLanguageChange(e.target.value as Language)}
        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', color: 'var(--text)' }}
      >
        <option value="en">English (EN)</option>
        <option value="hi">हिंदी (HI)</option>
        <option value="mr">मराठी (MR)</option>
      </select>
    </div>
  );
}
