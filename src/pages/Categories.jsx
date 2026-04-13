import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']

const POSTE_COLORS = {
  'GARDIEN': '#f59e0b',
  'DEF DROIT': '#3b82f6', 'DEF CENTRAL': '#3b82f6', 'DEF GAUCHE': '#3b82f6',
  'MIL DROIT': '#10b981', 'MIL DEF': '#10b981', 'MIL OFF': '#10b981', 'MIL GAUCHE': '#10b981',
  'AILIER DROIT': '#e8ff3a', 'AILIER GAUCHE': '#e8ff3a',
  'BUTEUR': '#ef4444'
}

export default function Categories() {
  const [selectedCat, setSelectedCat] = useState('SENIORS')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadCategorie(cat) {
    setSelectedCat(cat)
    setLoading(true)
    const { data: rows } = await supabase
      .from('saisons')
      .select('*, equipes(id, nom, couleur_principale, couleur_secondaire), saison_joueurs(*, personnages(id, prenom, nom, poste))')
      .eq('categorie', cat)
      .order('annee_debut')
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => { loadCategorie('SENIORS') }, [])

  // Groupe par saison (annee_debut-annee_fin)
  const parSaison = {}
  for (const s of data) {
    const key = `${s.annee_debut}-${s.annee_fin}`
    if (!parSaison[key]) parSaison[key] = { annee_debut: s.annee_debut, annee_fin: s.annee_fin, equipes: [] }
    parSaison[key].equipes.push(s)
  }
  const saisons = Object.values(parSaison).sort((a, b) => b.annee_debut - a.annee_debut)

  const catColors = { 'U13': '#3b82f6', 'U15': '#10b981', 'U18': '#f59e0b', 'SENIORS': '#e8ff3a' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CATÉGORIES</h1>
          <p className="page-subtitle">Joueurs et équipes par catégorie et par saison</p>
        </div>
      </div>

      {/* Onglets catégories */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => loadCategorie(cat)}
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.06em',
              padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer',
              color: selectedCat === cat ? catColors[cat] : 'var(--text-muted)',
              borderBottom: `3px solid ${selectedCat === cat ? catColors[cat] : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: '-1px' }}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '20px' }}>Chargement...</p>
      ) : saisons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏷</div>
          <h3>Aucun joueur en {selectedCat}</h3>
          <p>Assigne des joueurs à cette catégorie depuis la fiche d'un personnage.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {saisons.map(saison => {
            // Tous les joueurs de cette saison/catégorie (toutes équipes confondues)
            const tousJoueurs = saison.equipes.flatMap(e =>
              (e.saison_joueurs || []).map(sj => ({ ...sj, equipe: e.equipes }))
            )

            return (
              <div key={`${saison.annee_debut}-${saison.annee_fin}`}>
                {/* Header saison */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem',
                    color: catColors[selectedCat], lineHeight: 1 }}>
                    {saison.annee_debut}–{saison.annee_fin}
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {saison.equipes.length} équipe{saison.equipes.length > 1 ? 's' : ''} · {tousJoueurs.length} joueur{tousJoueurs.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Équipes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {saison.equipes.map(s => {
                    const eq = s.equipes
                    const joueurs = s.saison_joueurs || []
                    return (
                      <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: '10px', overflow: 'hidden' }}>
                        {/* Header équipe */}
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
                          background: `linear-gradient(135deg, ${eq?.couleur_principale || '#222'}22, transparent)`,
                          display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: eq?.couleur_principale || '#444', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: eq?.couleur_secondaire || '#888', border: '1px solid rgba(255,255,255,0.1)' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{eq?.nom || 'Équipe'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {joueurs.length} joueur{joueurs.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        {/* Joueurs */}
                        <div style={{ padding: '10px 14px' }}>
                          {joueurs.length === 0 ? (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Aucun joueur</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {[...joueurs]
                                .sort((a, b) => (a.numero_maillot ?? 999) - (b.numero_maillot ?? 999))
                                .map(sj => (
                                  <div key={sj.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem' }}>
                                    {sj.numero_maillot != null && (
                                      <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', minWidth: '24px', fontSize: '0.9rem' }}>
                                        {sj.numero_maillot}
                                      </span>
                                    )}
                                    <span style={{ flex: 1 }}>{sj.personnages?.prenom} {sj.personnages?.nom}</span>
                                    {sj.personnages?.poste && (
                                      <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.03em',
                                        color: POSTE_COLORS[sj.personnages.poste] || 'var(--text-dim)' }}>
                                        {sj.personnages.poste}
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
