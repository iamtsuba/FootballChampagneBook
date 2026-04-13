import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const empty = {
  competition_id: '', equipe_domicile_id: '', equipe_exterieur_id: '',
  date_match: '', annee: '', stade: '', score_domicile: '', score_exterieur: '',
  phase: '', resume: '', notes: '', evenements: []
}

export default function Matchs() {
  const [data, setData] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [current, setCurrent] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [filterComp, setFilterComp] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('matchs')
      .select('*, competitions(nom), equipe_dom:equipes!matchs_equipe_domicile_id_fkey(nom, couleur_principale), equipe_ext:equipes!matchs_equipe_exterieur_id_fkey(nom, couleur_principale)')
      .order('date_match', { ascending: false })
    setData(rows || [])
    setLoading(false)
  }

  async function loadRefs() {
    const [c, e] = await Promise.all([
      supabase.from('competitions').select('id, nom').order('nom'),
      supabase.from('equipes').select('id, nom').order('nom')
    ])
    setCompetitions(c.data || [])
    setEquipes(e.data || [])
  }

  useEffect(() => { load(); loadRefs() }, [])

  async function save() {
    setSaving(true)
    const payload = {
      ...current,
      score_domicile: current.score_domicile !== '' ? parseInt(current.score_domicile) : null,
      score_exterieur: current.score_exterieur !== '' ? parseInt(current.score_exterieur) : null,
      annee: current.annee ? parseInt(current.annee) : null,
      competition_id: current.competition_id || null,
      equipe_domicile_id: current.equipe_domicile_id || null,
      equipe_exterieur_id: current.equipe_exterieur_id || null,
    }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    delete payload.competitions; delete payload.equipe_dom; delete payload.equipe_ext
    const { error } = modal === 'create'
      ? await supabase.from('matchs').insert(payload)
      : await supabase.from('matchs').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur: ' + error.message, 'error'); return }
    toast('Match sauvegardé ✓')
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce match ?')) return
    await supabase.from('matchs').delete().eq('id', id)
    toast('Match supprimé')
    load()
  }

  const annees = [...new Set(data.map(m => m.annee).filter(Boolean))].sort((a, b) => b - a)

  const filtered = data.filter(m => {
    if (filterComp && m.competition_id !== filterComp) return false
    if (filterAnnee && m.annee !== parseInt(filterAnnee)) return false
    return true
  })

  const getScore = m => (m.score_domicile !== null && m.score_exterieur !== null)
    ? `${m.score_domicile} – ${m.score_exterieur}`
    : 'vs'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">MATCHS</h1>
          <p className="page-subtitle">{data.length} match{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrent(empty); setModal('create') }}>
          + Nouveau match
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select className="form-select" style={{ maxWidth: '200px' }} value={filterComp} onChange={e => setFilterComp(e.target.value)}>
          <option value="">Toutes compétitions</option>
          {competitions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '140px' }} value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}>
          <option value="">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">▶</div><h3>Aucun match</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(m => (
              <div key={m.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '16px 20px', display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto', gap: '16px', alignItems: 'center',
                transition: 'border-color 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {m.equipe_dom?.couleur_principale && <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.equipe_dom.couleur_principale, display: 'inline-block' }} />}
                    {m.equipe_dom?.nom || <span style={{ color: 'var(--text-dim)' }}>Équipe dom.</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent)', lineHeight: 1 }}>
                    {getScore(m)}
                  </div>
                  {m.phase && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{m.phase}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    {m.equipe_ext?.nom || <span style={{ color: 'var(--text-dim)' }}>Équipe ext.</span>}
                    {m.equipe_ext?.couleur_principale && <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.equipe_ext.couleur_principale, display: 'inline-block' }} />}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', minWidth: '80px' }}>
                    {m.competitions?.nom && <div style={{ color: 'var(--text)' }}>{m.competitions.nom}</div>}
                    {m.date_match && <div>{m.date_match}</div>}
                    {m.stade && <div>{m.stade}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setCurrent({ ...m, competition_id: m.competition_id || '' }); setModal('edit') }}>✎</button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(m.id)}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVEAU MATCH' : 'MODIFIER MATCH'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button>
          </>}>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Compétition</label>
              <select className="form-select" value={current.competition_id} onChange={e => setCurrent(c => ({ ...c, competition_id: e.target.value }))}>
                <option value="">— Aucune —</option>
                {competitions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Équipe domicile</label>
              <select className="form-select" value={current.equipe_domicile_id} onChange={e => setCurrent(c => ({ ...c, equipe_domicile_id: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Équipe extérieur</label>
              <select className="form-select" value={current.equipe_exterieur_id} onChange={e => setCurrent(c => ({ ...c, equipe_exterieur_id: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
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
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={current.date_match}
                onChange={e => setCurrent(c => ({ ...c, date_match: e.target.value, annee: e.target.value ? new Date(e.target.value).getFullYear() : c.annee }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Année</label>
              <input className="form-input" type="number" value={current.annee}
                onChange={e => setCurrent(c => ({ ...c, annee: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Stade</label>
              <input className="form-input" value={current.stade}
                onChange={e => setCurrent(c => ({ ...c, stade: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phase</label>
              <input className="form-input" placeholder="Finale, Demi-finale, Poule A..." value={current.phase}
                onChange={e => setCurrent(c => ({ ...c, phase: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Résumé du match</label>
              <textarea className="form-textarea" rows={3} placeholder="Déroulé du match, moments clés..."
                value={current.resume} onChange={e => setCurrent(c => ({ ...c, resume: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={current.notes}
                onChange={e => setCurrent(c => ({ ...c, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
