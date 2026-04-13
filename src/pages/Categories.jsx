import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

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

  // Sélection pour duplication : Map<sj_id, {personnageId, equipeId, numeroMaillot}>
  const [selectedPlayers, setSelectedPlayers] = useState(new Map())

  // Modal duplication
  const [showModal, setShowModal] = useState(false)
  const [dupliAnneeDebut, setDupliAnneeDebut] = useState('')
  const [dupliAnneeFin, setDupliAnneeFin] = useState('')
  const [duplicating, setDuplicating] = useState(false)

  const toast = useToast()

  async function loadCategorie(cat) {
    setSelectedCat(cat)
    setLoading(true)
    setSelectedPlayers(new Map())
    const { data: rows } = await supabase
      .from('saisons')
      .select('*, equipes(id, nom, couleur_principale, couleur_secondaire), saison_joueurs(*, personnages(id, prenom, nom, poste, annee_naissance))')
      .eq('categorie', cat)
      .order('annee_debut')
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => { loadCategorie('SENIORS') }, [])

  function togglePlayer(sj, equipeId) {
    setSelectedPlayers(prev => {
      const next = new Map(prev)
      if (next.has(sj.id)) {
        next.delete(sj.id)
      } else {
        next.set(sj.id, {
          personnageId: sj.personnages?.id,
          equipeId,
          numeroMaillot: sj.numero_maillot ?? null
        })
      }
      return next
    })
  }

  async function dupliquer() {
    if (!dupliAnneeDebut || !dupliAnneeFin) {
      toast('Saisis une saison cible', 'error'); return
    }
    setDuplicating(true)

    // Grouper par equipe
    const byEquipe = new Map()
    for (const [, info] of selectedPlayers) {
      if (!byEquipe.has(info.equipeId)) byEquipe.set(info.equipeId, [])
      byEquipe.get(info.equipeId).push(info)
    }

    let nbOk = 0
    for (const [equipeId, players] of byEquipe) {
      // Trouver ou créer la saison cible
      let { data: saisonEx } = await supabase.from('saisons').select('id')
        .eq('equipe_id', equipeId).eq('annee_debut', parseInt(dupliAnneeDebut))
        .eq('annee_fin', parseInt(dupliAnneeFin)).eq('categorie', selectedCat).maybeSingle()

      let saisonId = saisonEx?.id
      if (!saisonId) {
        const { data: ns } = await supabase.from('saisons')
          .insert({ equipe_id: equipeId, annee_debut: parseInt(dupliAnneeDebut), annee_fin: parseInt(dupliAnneeFin), categorie: selectedCat })
          .select('id').single()
        saisonId = ns?.id
      }
      if (!saisonId) continue

      for (const p of players) {
        const { error } = await supabase.from('saison_joueurs').insert({
          saison_id: saisonId,
          personnage_id: p.personnageId,
          numero_maillot: p.numeroMaillot
        })
        if (!error) nbOk++
      }
    }

    setDuplicating(false)
    setShowModal(false)
    setSelectedPlayers(new Map())
    setDupliAnneeDebut('')
    setDupliAnneeFin('')
    toast(`${nbOk} joueur${nbOk > 1 ? 's' : ''} dupliqué${nbOk > 1 ? 's' : ''} ✓`)
    loadCategorie(selectedCat)
  }

  // Groupe par saison (annee_debut-annee_fin)
  const parSaison = {}
  for (const s of data) {
    const key = `${s.annee_debut}-${s.annee_fin}`
    if (!parSaison[key]) parSaison[key] = { annee_debut: s.annee_debut, annee_fin: s.annee_fin, equipes: [] }
    parSaison[key].equipes.push(s)
  }
  const saisons = Object.values(parSaison).sort((a, b) => b.annee_debut - a.annee_debut)

  const catColors = { 'U13': '#3b82f6', 'U15': '#10b981', 'U18': '#f59e0b', 'SENIORS': '#e8ff3a' }
  const nbSelectionnes = selectedPlayers.size

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

      {/* Barre d'action duplication */}
      {nbSelectionnes > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '10px',
          padding: '12px 16px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
            {nbSelectionnes} joueur{nbSelectionnes > 1 ? 's' : ''} sélectionné{nbSelectionnes > 1 ? 's' : ''}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSelectedPlayers(new Map())}
            style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Tout désélectionner
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ fontSize: '0.83rem', fontWeight: 700, padding: '8px 16px', borderRadius: '8px',
              background: 'var(--accent)', color: '#0a0a0f', border: 'none', cursor: 'pointer' }}>
            Dupliquer vers →
          </button>
        </div>
      )}

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
                    const nbSelectDansEquipe = joueurs.filter(sj => selectedPlayers.has(sj.id)).length
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
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{eq?.nom || 'Équipe'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {joueurs.length} joueur{joueurs.length !== 1 ? 's' : ''}
                              {nbSelectDansEquipe > 0 && (
                                <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>· {nbSelectDansEquipe} sél.</span>
                              )}
                            </div>
                          </div>
                          {/* Sélectionner toute l'équipe */}
                          {joueurs.length > 0 && (
                            <button
                              onClick={() => {
                                const allSelected = joueurs.every(sj => selectedPlayers.has(sj.id))
                                setSelectedPlayers(prev => {
                                  const next = new Map(prev)
                                  if (allSelected) {
                                    joueurs.forEach(sj => next.delete(sj.id))
                                  } else {
                                    joueurs.forEach(sj => next.set(sj.id, {
                                      personnageId: sj.personnages?.id,
                                      equipeId: eq?.id,
                                      numeroMaillot: sj.numero_maillot ?? null
                                    }))
                                  }
                                  return next
                                })
                              }}
                              style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer',
                                background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)',
                                whiteSpace: 'nowrap' }}>
                              {joueurs.every(sj => selectedPlayers.has(sj.id)) ? 'Tout désél.' : 'Tout sél.'}
                            </button>
                          )}
                        </div>
                        {/* Joueurs */}
                        <div style={{ padding: '10px 14px' }}>
                          {joueurs.length === 0 ? (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Aucun joueur</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              {[...joueurs]
                                .sort((a, b) => (a.numero_maillot ?? 999) - (b.numero_maillot ?? 999))
                                .map(sj => {
                                  const isSelected = selectedPlayers.has(sj.id)
                                  return (
                                    <div key={sj.id}
                                      onClick={() => togglePlayer(sj, eq?.id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem',
                                        cursor: 'pointer', padding: '3px 6px', borderRadius: '6px',
                                        background: isSelected ? 'var(--accent)10' : 'transparent',
                                        border: `1px solid ${isSelected ? 'var(--accent)44' : 'transparent'}`,
                                        transition: 'all 0.1s' }}>
                                      {/* Checkbox */}
                                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                        background: isSelected ? 'var(--accent)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isSelected && <span style={{ fontSize: '9px', color: '#0a0a0f', fontWeight: 900 }}>✓</span>}
                                      </div>
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
                                      {sj.personnages?.annee_naissance && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: '2px' }}>
                                          {saison.annee_fin - sj.personnages.annee_naissance} ans
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
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

      {/* Modal duplication */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px',
            padding: '28px', width: '360px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '6px' }}>
                Dupliquer {nbSelectionnes} joueur{nbSelectionnes > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Catégorie conservée : <strong style={{ color: catColors[selectedCat] }}>{selectedCat}</strong><br />
                Les numéros de maillot sont conservés.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Saison — début</label>
                <input className="form-input" type="number" placeholder="2025"
                  value={dupliAnneeDebut} onChange={e => setDupliAnneeDebut(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Saison — fin</label>
                <input className="form-input" type="number" placeholder="2026"
                  value={dupliAnneeFin} onChange={e => setDupliAnneeFin(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                Annuler
              </button>
              <button onClick={dupliquer} disabled={duplicating || !dupliAnneeDebut || !dupliAnneeFin}
                style={{ padding: '9px 18px', borderRadius: '8px', border: 'none',
                  background: 'var(--accent)', color: '#0a0a0f', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.85rem',
                  opacity: (!dupliAnneeDebut || !dupliAnneeFin || duplicating) ? 0.5 : 1 }}>
                {duplicating ? 'Duplication...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
