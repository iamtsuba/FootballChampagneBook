import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const POSTE_COLORS = {
  'GARDIEN': '#f59e0b',
  'DEF DROIT': '#3b82f6', 'DEF CENTRAL': '#3b82f6', 'DEF GAUCHE': '#3b82f6',
  'MIL DROIT': '#10b981', 'MIL DEF': '#10b981', 'MIL OFF': '#10b981', 'MIL GAUCHE': '#10b981',
  'AILIER DROIT': '#e8ff3a', 'AILIER GAUCHE': '#e8ff3a',
  'BUTEUR': '#ef4444'
}

const PHASES = ['Seizième', 'Huitième', 'Quart', 'Demi', 'Finale']

const emptyMatch = {
  competition_id: '', equipe_domicile_id: '', equipe_exterieur_id: '',
  saison_annee_debut: '', saison_annee_fin: '',
  stade: '', score_domicile: '', score_exterieur: '',
  phase: '', notes: '',
  buts: [],       // [{ _key, minute, joueur_id, joueur_label, equipe }]
  evenements: []  // [{ _key, minute, joueurs_ids, detail, score_dom, score_ext }]
}

function newBut()       { return { _key: Date.now() + Math.random(), minute: '', joueur_id: '', joueur_label: '', equipe: '' } }
function newEvenement() { return { _key: Date.now() + Math.random(), minute: '', joueurs_ids: [], detail: '', score_dom: '', score_ext: '' } }

export default function Matchs() {
  const [data, setData]               = useState([])
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  const [current, setCurrent]         = useState(emptyMatch)
  const [saving, setSaving]           = useState(false)
  const [filterComp, setFilterComp]   = useState('')
  const [filterSaison, setFilterSaison] = useState('')

  const [compEquipes, setCompEquipes]     = useState([])
  const [compCategorie, setCompCategorie] = useState('')
  const [joueursDom, setJoueursDom]       = useState([])
  const [joueursExt, setJoueursExt]       = useState([])

  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('matchs')
      .select('*, competitions(nom, categorie), equipe_dom:equipes!matchs_equipe_domicile_id_fkey(nom, couleur_principale), equipe_ext:equipes!matchs_equipe_exterieur_id_fkey(nom, couleur_principale)')
      .order('saison_annee_debut', { ascending: false })
    setData(rows || [])
    setLoading(false)
  }

  async function loadCompetitions() {
    const { data: rows } = await supabase.from('competitions').select('id, nom, categorie').order('nom')
    setCompetitions(rows || [])
  }

  useEffect(() => { load(); loadCompetitions() }, [])

  async function loadCompEquipes(compId) {
    if (!compId) { setCompEquipes([]); setCompCategorie(''); return }
    const { data: rows } = await supabase
      .from('competition_equipes')
      .select('equipe_id, equipes(id, nom, couleur_principale)')
      .eq('competition_id', compId)
    setCompEquipes((rows || []).map(r => r.equipes).filter(Boolean))
    const comp = competitions.find(c => c.id === compId)
    setCompCategorie(comp?.categorie || '')
  }

  const loadJoueurs = useCallback(async (equipeId, side, saisonDebut, saisonFin, categorie) => {
    const setter = side === 'dom' ? setJoueursDom : setJoueursExt
    if (!equipeId || !saisonDebut || !saisonFin) { setter([]); return }
    let q = supabase.from('saisons').select('id')
      .eq('equipe_id', equipeId).eq('annee_debut', parseInt(saisonDebut)).eq('annee_fin', parseInt(saisonFin))
    if (categorie) q = q.eq('categorie', categorie)
    const { data: saison } = await q.maybeSingle()
    if (!saison) { setter([]); return }
    const { data: sjs } = await supabase.from('saison_joueurs')
      .select('numero_maillot, personnages(id, prenom, nom, poste)')
      .eq('saison_id', saison.id).order('numero_maillot')
    setter((sjs || []).map(sj => ({
      id: sj.personnages?.id, prenom: sj.personnages?.prenom,
      nom: sj.personnages?.nom, poste: sj.personnages?.poste, numero: sj.numero_maillot
    })).filter(j => j.id))
  }, [])

  function openCreate() {
    setCurrent(emptyMatch)
    setCompEquipes([]); setCompCategorie('')
    setJoueursDom([]); setJoueursExt([])
    setModal('create')
  }

  async function openEdit(m) {
    const rawEvs  = m.evenements || []
    const buts    = rawEvs.filter(e => e.type === 'but').map((e, i) => ({ _key: i + '_b', ...e }))
    const events  = rawEvs.filter(e => e.type !== 'but').map((e, i) => ({ _key: i + '_e', ...e }))
    setCurrent({
      ...m,
      competition_id: m.competition_id || '',
      equipe_domicile_id: m.equipe_domicile_id || '',
      equipe_exterieur_id: m.equipe_exterieur_id || '',
      saison_annee_debut: m.saison_annee_debut || '',
      saison_annee_fin: m.saison_annee_fin || '',
      score_domicile: m.score_domicile ?? '',
      score_exterieur: m.score_exterieur ?? '',
      buts, evenements: events
    })
    if (m.competition_id) {
      const { data: rows } = await supabase
        .from('competition_equipes').select('equipe_id, equipes(id, nom, couleur_principale)')
        .eq('competition_id', m.competition_id)
      setCompEquipes((rows || []).map(r => r.equipes).filter(Boolean))
      setCompCategorie(m.competitions?.categorie || '')
    } else { setCompEquipes([]); setCompCategorie('') }
    const cat = m.competitions?.categorie || ''
    const sd = m.saison_annee_debut || '', sf = m.saison_annee_fin || ''
    await Promise.all([
      loadJoueurs(m.equipe_domicile_id, 'dom', sd, sf, cat),
      loadJoueurs(m.equipe_exterieur_id, 'ext', sd, sf, cat)
    ])
    setModal('edit')
  }

  async function save() {
    setSaving(true)
    const butsToSave   = current.buts.map(({ _key, ...rest }) => ({ type: 'but', ...rest }))
    const eventsToSave = current.evenements.map(({ _key, ...rest }) => rest)
    const payload = {
      competition_id: current.competition_id || null,
      equipe_domicile_id: current.equipe_domicile_id || null,
      equipe_exterieur_id: current.equipe_exterieur_id || null,
      saison_annee_debut: current.saison_annee_debut ? parseInt(current.saison_annee_debut) : null,
      saison_annee_fin: current.saison_annee_fin ? parseInt(current.saison_annee_fin) : null,
      stade: current.stade || null,
      score_domicile: current.score_domicile !== '' ? parseInt(current.score_domicile) : null,
      score_exterieur: current.score_exterieur !== '' ? parseInt(current.score_exterieur) : null,
      phase: current.phase || null,
      notes: current.notes || null,
      evenements: [...butsToSave, ...eventsToSave]
    }
    const { error } = modal === 'create'
      ? await supabase.from('matchs').insert(payload)
      : await supabase.from('matchs').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast('Match sauvegardé ✓')
    setModal(null); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce match ?')) return
    await supabase.from('matchs').delete().eq('id', id)
    toast('Match supprimé'); load()
  }

  // ── Buts ──
  function addBut() { setCurrent(c => ({ ...c, buts: [...c.buts, newBut()] })) }
  function removeBut(key) { setCurrent(c => ({ ...c, buts: c.buts.filter(b => b._key !== key) })) }
  function updateBut(key, field, value) {
    setCurrent(c => ({ ...c, buts: c.buts.map(b => b._key === key ? { ...b, [field]: value } : b) }))
  }
  function selectButeur(key, joueurId) {
    const dom = joueursDom.find(j => j.id === joueurId)
    const ext = joueursExt.find(j => j.id === joueurId)
    const j = dom || ext
    setCurrent(c => ({
      ...c,
      buts: c.buts.map(b => b._key === key ? {
        ...b,
        joueur_id: joueurId,
        joueur_label: j ? `${j.prenom} ${j.nom}` : '',
        equipe: dom ? 'dom' : 'ext'
      } : b)
    }))
  }

  // ── Événements ──
  function addEvenement() { setCurrent(c => ({ ...c, evenements: [...c.evenements, newEvenement()] })) }
  function removeEvenement(key) { setCurrent(c => ({ ...c, evenements: c.evenements.filter(e => e._key !== key) })) }
  function updateEvenement(key, field, value) {
    setCurrent(c => ({ ...c, evenements: c.evenements.map(e => e._key === key ? { ...e, [field]: value } : e) }))
  }
  function toggleJoueurInEvent(key, joueurId) {
    setCurrent(c => ({
      ...c,
      evenements: c.evenements.map(e => {
        if (e._key !== key) return e
        const ids = e.joueurs_ids || []
        return { ...e, joueurs_ids: ids.includes(joueurId) ? ids.filter(id => id !== joueurId) : [...ids, joueurId] }
      })
    }))
  }

  // ── Filtres ──
  const saisons = [...new Set(data.map(m => m.saison_annee_debut && m.saison_annee_fin ? `${m.saison_annee_debut}-${m.saison_annee_fin}` : null).filter(Boolean))].sort().reverse()
  const filtered = data.filter(m => {
    if (filterComp && m.competition_id !== filterComp) return false
    if (filterSaison) {
      const [sd, sf] = filterSaison.split('-')
      if (m.saison_annee_debut !== parseInt(sd) || m.saison_annee_fin !== parseInt(sf)) return false
    }
    return true
  })

  const getScore = m => (m.score_domicile !== null && m.score_exterieur !== null)
    ? `${m.score_domicile} – ${m.score_exterieur}` : 'vs'

  const tousJoueurs = [
    ...joueursDom.map(j => ({ ...j, side: 'dom' })),
    ...joueursExt.map(j => ({ ...j, side: 'ext' }))
  ]
  const equipesDispo = compEquipes.length > 0 ? compEquipes : []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">MATCHS</h1>
          <p className="page-subtitle">{data.length} match{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau match</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select className="form-select" style={{ maxWidth: '220px' }} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="">Toutes compétitions</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '160px' }} value={filterSaison} onChange={e => setFilterSaison(e.target.value)}>
          <option value="">Toutes saisons</option>
          {saisons.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">▶</div><h3>Aucun match</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(m => {
              const buts = (m.evenements || []).filter(e => e.type === 'but')
              const domEqColor = m.equipe_dom?.couleur_principale
              const extEqColor = m.equipe_ext?.couleur_principale
              return (
                <div key={m.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px 20px', transition: 'border-color 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = ''}>

                  {/* Ligne principale */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {domEqColor && <span style={{ width: 10, height: 10, borderRadius: '50%', background: domEqColor, display: 'inline-block', flexShrink: 0 }} />}
                      {m.equipe_dom?.nom || <span style={{ color: 'var(--text-dim)' }}>DOM</span>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent)', lineHeight: 1 }}>
                        {getScore(m)}
                      </div>
                      {m.phase && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{m.phase}</div>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {m.equipe_ext?.nom || <span style={{ color: 'var(--text-dim)' }}>EXT</span>}
                      {extEqColor && <span style={{ width: 10, height: 10, borderRadius: '50%', background: extEqColor, display: 'inline-block', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', minWidth: '80px' }}>
                        {m.competitions?.nom && <div style={{ color: 'var(--text)' }}>{m.competitions.nom}</div>}
                        {m.saison_annee_debut && m.saison_annee_fin && <div>{m.saison_annee_debut}–{m.saison_annee_fin}</div>}
                        {m.stade && <div>{m.stade}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(m)}>✎</button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(m.id)}>✕</button>
                      </div>
                    </div>
                  </div>

                  {/* Buteurs */}
                  {buts.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)',
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                      {/* Buts DOM */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {buts.filter(b => b.equipe === 'dom').map((b, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: domEqColor || 'var(--accent)', fontSize: '0.8rem' }}>⚽</span>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.joueur_label}</span>
                            {b.minute && <span style={{ color: 'var(--text-dim)' }}>{b.minute}'</span>}
                          </div>
                        ))}
                      </div>
                      {/* Buts EXT */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                        {buts.filter(b => b.equipe === 'ext').map((b, i) => (
                          <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {b.minute && <span style={{ color: 'var(--text-dim)' }}>{b.minute}'</span>}
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.joueur_label}</span>
                            <span style={{ color: extEqColor || 'var(--accent)', fontSize: '0.8rem' }}>⚽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      {/* ── MODAL ── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVEAU MATCH' : 'MODIFIER MATCH'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button>
          </>}>

          {/* ── 1. Saison ── */}
          <FieldSection label="Saison de référence">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Année début</label>
                <input className="form-input" type="number" placeholder="2024" value={current.saison_annee_debut}
                  onChange={async e => {
                    const v = e.target.value
                    setCurrent(c => ({ ...c, saison_annee_debut: v }))
                    await loadJoueurs(current.equipe_domicile_id, 'dom', v, current.saison_annee_fin, compCategorie)
                    await loadJoueurs(current.equipe_exterieur_id, 'ext', v, current.saison_annee_fin, compCategorie)
                  }} />
              </div>
              <div className="form-group">
                <label className="form-label">Année fin</label>
                <input className="form-input" type="number" placeholder="2025" value={current.saison_annee_fin}
                  onChange={async e => {
                    const v = e.target.value
                    setCurrent(c => ({ ...c, saison_annee_fin: v }))
                    await loadJoueurs(current.equipe_domicile_id, 'dom', current.saison_annee_debut, v, compCategorie)
                    await loadJoueurs(current.equipe_exterieur_id, 'ext', current.saison_annee_debut, v, compCategorie)
                  }} />
              </div>
            </div>
          </FieldSection>

          {/* ── 2. Compétition ── */}
          <FieldSection label="Compétition">
            <div className="form-group">
              <select className="form-select" value={current.competition_id}
                onChange={async e => {
                  const id = e.target.value
                  setCurrent(c => ({ ...c, competition_id: id, equipe_domicile_id: '', equipe_exterieur_id: '' }))
                  setJoueursDom([]); setJoueursExt([])
                  await loadCompEquipes(id)
                }}>
                <option value="">— Aucune —</option>
                {competitions.map(c => <option key={c.id} value={c.id}>{c.nom}{c.categorie ? ` (${c.categorie})` : ''}</option>)}
              </select>
            </div>
            {compCategorie && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Catégorie : <strong style={{ color: { 'U13': '#3b82f6', 'U15': '#10b981', 'U18': '#f59e0b', 'SENIORS': '#e8ff3a' }[compCategorie] }}>{compCategorie}</strong>
              </div>
            )}
          </FieldSection>

          {/* ── 3. Équipes ── */}
          <FieldSection label="Équipes">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Domicile</label>
                <select className="form-select" value={current.equipe_domicile_id}
                  onChange={async e => {
                    const id = e.target.value
                    setCurrent(c => ({ ...c, equipe_domicile_id: id }))
                    await loadJoueurs(id, 'dom', current.saison_annee_debut, current.saison_annee_fin, compCategorie)
                  }}>
                  <option value="">— Sélectionner —</option>
                  {equipesDispo.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Extérieur</label>
                <select className="form-select" value={current.equipe_exterieur_id}
                  onChange={async e => {
                    const id = e.target.value
                    setCurrent(c => ({ ...c, equipe_exterieur_id: id }))
                    await loadJoueurs(id, 'ext', current.saison_annee_debut, current.saison_annee_fin, compCategorie)
                  }}>
                  <option value="">— Sélectionner —</option>
                  {equipesDispo.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
            </div>
            {compEquipes.length === 0 && current.competition_id && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '6px' }}>
                Aucune équipe liée à cette compétition.
              </div>
            )}
            {(joueursDom.length > 0 || joueursExt.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                <JoueursList label={equipesDispo.find(e => e.id === current.equipe_domicile_id)?.nom || 'Domicile'}
                  joueurs={joueursDom} couleur={equipesDispo.find(e => e.id === current.equipe_domicile_id)?.couleur_principale} />
                <JoueursList label={equipesDispo.find(e => e.id === current.equipe_exterieur_id)?.nom || 'Extérieur'}
                  joueurs={joueursExt} couleur={equipesDispo.find(e => e.id === current.equipe_exterieur_id)?.couleur_principale} />
              </div>
            )}
          </FieldSection>

          {/* ── 4. Infos match ── */}
          <FieldSection label="Informations du match">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Score DOM</label>
                <input className="form-input" type="number" min="0" value={current.score_domicile}
                  onChange={e => setCurrent(c => ({ ...c, score_domicile: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Score EXT</label>
                <input className="form-input" type="number" min="0" value={current.score_exterieur}
                  onChange={e => setCurrent(c => ({ ...c, score_exterieur: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phase</label>
                <select className="form-select" value={current.phase || ''}
                  onChange={e => setCurrent(c => ({ ...c, phase: e.target.value }))}>
                  <option value="">— Phase —</option>
                  {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stade</label>
                <input className="form-input" value={current.stade || ''}
                  onChange={e => setCurrent(c => ({ ...c, stade: e.target.value }))} />
              </div>
            </div>
          </FieldSection>

          {/* ── 5. Buteurs ── */}
          <FieldSection label="Buteurs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {current.buts.length === 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Aucun but enregistré.</p>
              )}
              {current.buts.map(b => {
                const domEq = equipesDispo.find(e => e.id === current.equipe_domicile_id)
                const extEq = equipesDispo.find(e => e.id === current.equipe_exterieur_id)
                const couleur = b.equipe === 'dom'
                  ? (domEq?.couleur_principale || '#3b82f6')
                  : b.equipe === 'ext' ? (extEq?.couleur_principale || '#ef4444') : 'var(--border)'
                return (
                  <div key={b._key} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 24px', gap: '6px', alignItems: 'center',
                    background: 'var(--bg)', border: `1px solid ${b.equipe ? couleur + '44' : 'var(--border)'}`,
                    borderRadius: '8px', padding: '8px 10px' }}>
                    <input className="form-input" placeholder="45'" style={{ fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'center', padding: '4px 6px' }}
                      value={b.minute} onChange={e => updateBut(b._key, 'minute', e.target.value)} />
                    <select className="form-select" value={b.joueur_id}
                      onChange={e => selectButeur(b._key, e.target.value)}>
                      <option value="">— Sélectionner le buteur —</option>
                      {joueursDom.length > 0 && (
                        <optgroup label={domEq?.nom || 'Domicile'}>
                          {joueursDom.map(j => <option key={j.id} value={j.id}>{j.numero != null ? `#${j.numero} ` : ''}{j.prenom} {j.nom}</option>)}
                        </optgroup>
                      )}
                      {joueursExt.length > 0 && (
                        <optgroup label={extEq?.nom || 'Extérieur'}>
                          {joueursExt.map(j => <option key={j.id} value={j.id}>{j.numero != null ? `#${j.numero} ` : ''}{j.prenom} {j.nom}</option>)}
                        </optgroup>
                      )}
                      {tousJoueurs.length === 0 && <option disabled>Sélectionne d'abord les équipes et la saison</option>}
                    </select>
                    <button onClick={() => removeBut(b._key)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem' }}
                      onMouseEnter={e => e.target.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>✕</button>
                  </div>
                )
              })}
              <button onClick={addBut}
                style={{ fontSize: '0.82rem', padding: '7px', borderRadius: '8px', border: '1px dashed var(--border)',
                  background: 'none', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)' }}>
                ⚽ Ajouter un but
              </button>
            </div>
          </FieldSection>

          {/* ── 6. Timeline ── */}
          <FieldSection label="Déroulé du match">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {current.evenements.length === 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Aucun événement.</p>
              )}
              {current.evenements.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 24px', gap: '6px',
                  padding: '0 10px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
                  <span>Minute</span><span>Action</span><span style={{ textAlign: 'center' }}>Score</span><span />
                </div>
              )}
              {current.evenements.map(ev => (
                <div key={ev._key} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 24px', gap: '6px', alignItems: 'center' }}>
                    <input className="form-input" placeholder="00:00"
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'center', padding: '4px 6px' }}
                      value={ev.minute} onChange={e => updateEvenement(ev._key, 'minute', e.target.value)} />
                    <input className="form-input" placeholder="Description de l'action..."
                      style={{ fontSize: '0.85rem' }}
                      value={ev.detail} onChange={e => updateEvenement(ev._key, 'detail', e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <input className="form-input" type="number" min="0"
                        style={{ width: '36px', padding: '4px 6px', textAlign: 'center', fontSize: '0.85rem' }}
                        value={ev.score_dom} onChange={e => updateEvenement(ev._key, 'score_dom', e.target.value)} />
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>–</span>
                      <input className="form-input" type="number" min="0"
                        style={{ width: '36px', padding: '4px 6px', textAlign: 'center', fontSize: '0.85rem' }}
                        value={ev.score_ext} onChange={e => updateEvenement(ev._key, 'score_ext', e.target.value)} />
                    </div>
                    <button onClick={() => removeEvenement(ev._key)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem' }}
                      onMouseEnter={e => e.target.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>✕</button>
                  </div>
                  {tousJoueurs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                      {tousJoueurs.map(j => {
                        const sel = (ev.joueurs_ids || []).includes(j.id)
                        const domEq = equipesDispo.find(e => e.id === current.equipe_domicile_id)
                        const extEq = equipesDispo.find(e => e.id === current.equipe_exterieur_id)
                        const couleur = j.side === 'dom' ? (domEq?.couleur_principale || '#3b82f6') : (extEq?.couleur_principale || '#ef4444')
                        return (
                          <button key={j.id} type="button" onClick={() => toggleJoueurInEvent(ev._key, j.id)}
                            style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', cursor: 'pointer',
                              border: `1px solid ${sel ? couleur : 'var(--border)'}`,
                              background: sel ? couleur + '33' : 'var(--bg-card)',
                              color: sel ? 'var(--text)' : 'var(--text-dim)',
                              fontWeight: sel ? 700 : 400, transition: 'all 0.1s',
                              display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleur, display: 'inline-block', flexShrink: 0 }} />
                            {j.numero != null ? `#${j.numero} ` : ''}{j.prenom} {j.nom}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addEvenement}
                style={{ fontSize: '0.82rem', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)',
                  background: 'none', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)' }}>
                + Ajouter une action
              </button>
            </div>
          </FieldSection>

          {/* ── 7. Notes ── */}
          <FieldSection label="Notes">
            <textarea className="form-textarea" rows={2} value={current.notes || ''}
              onChange={e => setCurrent(c => ({ ...c, notes: e.target.value }))} />
          </FieldSection>
        </Modal>
      )}
    </div>
  )
}

function FieldSection({ label, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--text-dim)', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function JoueursList({ label, joueurs, couleur }) {
  if (!joueurs || joueurs.length === 0) return null
  return (
    <div style={{ background: 'var(--bg)', border: `1px solid ${couleur || 'var(--border)'}33`,
      borderTop: `3px solid ${couleur || 'var(--border)'}`, borderRadius: '6px', padding: '10px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: couleur || 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {joueurs.map(j => (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
            {j.numero != null && <span style={{ fontFamily: 'var(--font-display)', color: couleur || 'var(--accent)', minWidth: '22px', fontSize: '0.85rem' }}>{j.numero}</span>}
            <span style={{ flex: 1 }}>{j.prenom} {j.nom}</span>
            {j.poste && <span style={{ fontSize: '0.6rem', fontWeight: 600, color: POSTE_COLORS[j.poste] || 'var(--text-dim)' }}>{j.poste}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
