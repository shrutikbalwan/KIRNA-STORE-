import { memo } from 'react'

type Props = { label: string; value: string; detail: string; icon: React.ReactNode; tone?: 'green' | 'blue' | 'orange' | 'purple' | 'teal' }

export const StatCard = memo(function StatCard({ label, value, detail, icon, tone = 'green' }: Props) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`} aria-hidden="true">{icon}</div><div className="stat-content"><h4>{label}</h4><h3 className="stat-value">{value}</h3><span className="stat-detail">{detail}</span></div></article>
})
