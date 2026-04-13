import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [counts, setCounts] = useState({
    personnages: 0, equipes: 0, competitions: 0, matchs: 0, arcs: 0, livres: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCounts() {
      const tables = ['personnages', 'equipes', 'competitions', 'matchs', 'arcs', 'livres']
      const results = await Promise.all(
        tables.map(t => supabase.from(t).select('id', { count: 'exact', head: true }))
      )
      const newCounts = {}
      tables.forEach((t, i) => { newCounts[t] = results[i].count || 0 })
      setCounts(newCounts)
      setLoading(false)
    }
    loadCounts()
  }, [])

  const stats = [
    { label: 'Personnages', count: counts.personnages, to: '/personnages', icon: '◉', color: '#e8ff3a' },
    { label: 'Équipes', count: counts.equipes, to: '/equipes', icon: '⬡', color: '#3affb8' },
    { label: 'Compétitions', count: counts.competitions, to: '/competitions', icon: '◆', color: '#ff8c42' },
    { label: 'Matchs', count: counts.matchs, to: '/matchs', icon: '▶', color: '#a78bfa' },
    { label: 'Arcs', count: counts.arcs, to: '/arcs', icon: '⌁', color: '#f472b6' },
    { label: 'Livres', count: counts.livres, to: '/livres', icon: '▣', color: '#60a5fa' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">TABLEAU DE BORD</h1>
          <p className="page-subtitle">Vue d'ensemble de ton univers</p>
        </div>
      </div>

      <div className="stats-band" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {stats.map(s => (
          <Link key={s.to} to={s.to} style={{ textDecoration: 'none' }}>
            <div className="stat-box" style={{ cursor: 'pointer', transition: 'border-color 0.18s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
              <div style={{ fontSize: '1.4rem', marginBottom: '8px', opacity: 0.7 }}>{s.icon}</div>
              <div className="stat-number" style={{ color: s.color }}>
                {loading ? '—' : s.count}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
        <div className="detail-section">
          <div className="detail-section-title">Navigation rapide</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.map(s => (
              <Link key={s.to} to={s.to}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  borderRadius: '6px', textDecoration: 'none', color: 'var(--text-muted)',
                  background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.87rem',
                  transition: 'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.color = s.color; e.currentTarget.style.borderColor = s.color }}
                onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = '' }}>
                <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                <span style={{ flex: 1 }}>Gérer les {s.label.toLowerCase()}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: s.color }}>
                  {loading ? '—' : s.count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-title">Comment ça marche</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1 }}>1</span>
              <div><strong style={{ color: 'var(--text)' }}>Crée tes personnages</strong><br />Nom, design physique, personnalité</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1 }}>2</span>
              <div><strong style={{ color: 'var(--text)' }}>Construis tes équipes</strong><br />Couleurs, maillots, palmares, effectifs par saison</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1 }}>3</span>
              <div><strong style={{ color: 'var(--text)' }}>Organise les compétitions & matchs</strong><br />Par année, phase, résultat</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1 }}>4</span>
              <div><strong style={{ color: 'var(--text)' }}>Regroupe en arcs & livres</strong><br />Structure narrative complète</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
