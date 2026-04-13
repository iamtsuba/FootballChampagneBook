import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']

export default function Saisons() {
  const [saisons, setSaisons] = useState([]) // années uniques
  const [selectedAnnee, setSelectedAnnee] = useState(null)
  const [detail, setDetail] = useState([]) // saisons de l'année sélectionnée
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function loadAnnees() {
    setLoading(true)
    const { data } = await supabase
      .from('saisons')
      .select('annee_debut, annee_fin')
      .order('annee_debut')
    // Déduplique les paires annee_debut/annee_fin
    const unique = []
    const seen = new Set()
    for (const row of (data || [])) {
      const key = `${row.annee_debut}-${row.annee_fin}`
      if (!seen.has(key)) { seen.add(key); unique.push(row) }
    }
    setSaisons(unique)
    setLoading(false)
    if (unique.length > 0 && !selectedAnnee) {
      selectAnnee(unique[unique.length - 1])
    }
  }

  async function selectAnnee(annee) {
    setSelectedAnnee(annee)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('saisons')
      .select('*, equipes(id, nom, couleur_principale, couleur_secondaire), saison_joueurs(*, personnages(id, prenom, nom, poste))')
      .eq('annee_debut', annee.annee_debut)
      .eq('annee_fin', annee.annee_fin)
      .order('categorie')
    setDetail(data || [])
    setLoadingDetail(false)
  }

  useEffect(() => { loadAnnees() }, [])

  // Groupe par catégorie
  const parCategorie = CATEGORIES.map(cat => ({
    categorie: cat,
    equipes: detail.filter(s => s.categorie === cat)
  })).filter(g => g.equipes.length > 0)

  // Catégories sans catégorie définie
  const sansCat = detail.filter(s => !s.categorie || !CATEGORIES.includes(s.categorie))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">SAISONS</h1>
          <p className="page-subtitle">Vue par saison · catégories · équipes · joueurs</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
      ) : saisons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Aucune saison</h3>
          <p>Crée des équipes et assigne des saisons depuis la section Équipes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px' }}>

          {/* Colonne gauche : liste des saisons */}
          <div style={{ width: '180px', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--text-dim)', marginBottom: '10px' }}>Saisons</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {saisons.map(s => {
                const isActive = selectedAnnee?.annee_debut === s.annee_debut && selectedAnnee?.annee_fin === s.annee_fin
                return (
                  <button key={`${s.annee_debut}-${s.annee_fin}`}
                    onClick={() => selectAnnee(s)}
                    style={{ background: isActive ? 'rgba(232,255,58,0.08)' : 'var(--bg-card)',
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '6px', padding: '10px 14px', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      textAlign: 'left', transition: 'all 0.15s' }}>
                    {s.annee_debut}–{s.annee_fin}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Colonne droite : détail */}
          <div style={{ flex: 1 }}>
            {loadingDetail ? (
              <p style={{ color: 'var(--text-muted)', padding: '20px' }}>Chargement...</p>
            ) : !selectedAnnee ? null : (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--accent)', marginBottom: '20px' }}>
                  Saison {selectedAnnee.annee_debut}–{selectedAnnee.annee_fin}
                </h2>

                {parCategorie.length === 0 && sansCat.length === 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>Aucune donnée pour cette saison.</p>
                )}

                {/* Par catégorie */}
                {parCategorie.map(groupe => (
                  <div key={groupe.categorie} style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--accent2)' }}>
                        {groupe.categorie}
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {groupe.equipes.length} équipe{groupe.equipes.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                      {groupe.equipes.map(s => (
                        <EquipeCard key={s.id} saison={s} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Sans catégorie */}
                {sansCat.length > 0 && (
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-muted)' }}>
                        Sans catégorie
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                      {sansCat.map(s => <EquipeCard key={s.id} saison={s} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EquipeCard({ saison }) {
  const eq = saison.equipes
  const joueurs = saison.saison_joueurs || []

  const POSTE_COLORS = {
    'GARDIEN': '#f59e0b',
    'DEF DROIT': '#3b82f6', 'DEF CENTRAL': '#3b82f6', 'DEF GAUCHE': '#3b82f6',
    'MIL DROIT': '#10b981', 'MIL DEF': '#10b981', 'MIL OFF': '#10b981', 'MIL GAUCHE': '#10b981',
    'AILIER DROIT': '#e8ff3a', 'AILIER GAUCHE': '#e8ff3a',
    'BUTEUR': '#ef4444'
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header équipe */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
        borderBottom: '1px solid var(--border)',
        background: `linear-gradient(135deg, ${eq?.couleur_principale || '#222'}22, transparent)` }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: eq?.couleur_principale || '#444', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: eq?.couleur_secondaire || '#888', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{eq?.nom || 'Équipe'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {joueurs.length} joueur{joueurs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Liste joueurs */}
      <div style={{ padding: '10px 14px' }}>
        {joueurs.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Aucun joueur</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[...joueurs]
              .sort((a, b) => (a.numero_maillot ?? 999) - (b.numero_maillot ?? 999))
              .map(sj => (
                <div key={sj.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', padding: '3px 0' }}>
                  {sj.numero_maillot != null && (
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', minWidth: '24px', fontSize: '0.9rem' }}>
                      {sj.numero_maillot}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{sj.personnages?.prenom} {sj.personnages?.nom}</span>
                  {sj.personnages?.poste && (
                    <span style={{ fontSize: '0.65rem', color: POSTE_COLORS[sj.personnages.poste] || 'var(--text-dim)',
                      fontWeight: 600, letterSpacing: '0.04em' }}>
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
}
