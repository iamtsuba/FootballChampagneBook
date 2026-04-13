import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']
const TYPES    = ['Championnat', 'Coupe', 'Tournoi', 'Ligue', 'Super Coupe', 'Autre']
const NIVEAUX  = ['National', 'International', 'Continental', 'Régional', 'Mondial']
const CAT_COLORS = { 'U13': '#3b82f6', 'U15': '#10b981', 'U18': '#f59e0b', 'SENIORS': '#e8ff3a' }

const emptyComp = { nom: '', type: '', pays: '', niveau: '', categorie: '', nb_equipes: '', description: '' }

export default function Competitions() {
  const [data, setData]       = useState([])
  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [current, setCurrent] = useState(emptyComp)
  const [equipesSelectionnees, setEquipesSelectionnees] = useState(new Set())
  const [saving, setSaving]   = useState(false)
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('competitions')
      .select('*, competition_equipes(equipe_id, equipes(id, nom, couleur_principale))')
      .order('nom')
    setData(rows || [])
    setLoading(false)
  }

  async function loadEquipes() {
    const { data: rows } = await supabase.from('equipes').select('id, nom, couleur_principale').order('nom')
    setEquipes(rows || [])
  }

  useEffect(() => { load(); loadEquipes() }, [])

  function openCreate() {
    setCurrent(emptyComp)
    setEquipesSelectionnees(new Set())
    setModal('create')
  }

  function openEdit(c) {
    setCurrent(c)
    const ids = (c.competition_equipes || []).map(ce => ce.equipe_id)
    setEquipesSelectionnees(new Set(ids))
    setModal('edit')
  }

  function toggleEquipe(id) {
    setEquipesSelectionnees(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    if (!current.nom) { toast('Le nom est requis', 'error'); return }
    setSaving(true)

    const payload = { ...current }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    delete payload.competition_equipes
    payload.nb_equipes = payload.nb_equipes ? parseInt(payload.nb_equipes) : null
    payload.categorie  = payload.categorie || null

    let compId = current.id
    if (modal === 'create') {
      const { data: created, error } = await supabase.from('competitions').insert(payload).select('id').single()
      if (error) { toast('Erreur : ' + error.message, 'error'); setSaving(false); return }
      compId = created.id
    } else {
      const { error } = await supabase.from('competitions').update(payload).eq('id', current.id)
      if (error) { toast('Erreur : ' + error.message, 'error'); setSaving(false); return }
      await supabase.from('competition_equipes').delete().eq('competition_id', current.id)
    }

    if (equipesSelectionnees.size > 0) {
      const links = [...equipesSelectionnees].map(equipe_id => ({ competition_id: compId, equipe_id }))
      await supabase.from('competition_equipes').insert(links)
    }

    setSaving(false)
    toast('Compétition sauvegardée ✓')
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cette compétition ?')) return
    await supabase.from('competitions').delete().eq('id', id)
    toast('Compétition supprimée')
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">COMPÉTITIONS</h1>
          <p className="page-subtitle">{data.length} compétition{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouvelle compétition</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">◆</div><h3>Aucune compétition</h3></div>
        ) : (
          <div className="cards-grid">
            {data.map(c => {
              const teams = (c.competition_equipes || []).map(ce => ce.equipes).filter(Boolean)
              const catColor = CAT_COLORS[c.categorie]
              return (
                <div key={c.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div className="card-title" style={{ flex: 1 }}>{c.nom}</div>
                    {c.categorie && (
                      <span className="badge" style={{ color: catColor, borderColor: catColor + '44', background: catColor + '15', whiteSpace: 'nowrap' }}>
                        {c.categorie}
                      </span>
                    )}
                  </div>
                  <div className="card-meta" style={{ marginTop: '6px', gap: '6px', flexWrap: 'wrap' }}>
                    {c.type    && <span className="badge badge-accent">{c.type}</span>}
                    {c.niveau  && <span className="badge">{c.niveau}</span>}
                    {c.pays    && <span>🌍 {c.pays}</span>}
                    {c.nb_equipes && <span style={{ color: 'var(--text-muted)' }}>{c.nb_equipes} équipes</span>}
                  </div>
                  {teams.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {teams.map(eq => (
                        <span key={eq.id} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px',
                          background: (eq.couleur_principale || '#444') + '22',
                          border: '1px solid ' + (eq.couleur_principale || '#444') + '55',
                          color: 'var(--text-muted)' }}>
                          {eq.nom}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.description}
                    </p>
                  )}
                  <div className="card-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Modifier</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Supprimer</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVELLE COMPÉTITION' : 'MODIFIER COMPÉTITION'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </>}>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={current.nom}
                onChange={e => setCurrent(c => ({ ...c, nom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={current.type || ''}
                onChange={e => setCurrent(c => ({ ...c, type: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={current.categorie || ''}
                onChange={e => setCurrent(c => ({ ...c, categorie: e.target.value }))}>
                <option value="">— Toutes catégories —</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Niveau</label>
              <select className="form-select" value={current.niveau || ''}
                onChange={e => setCurrent(c => ({ ...c, niveau: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre d'équipes</label>
              <input className="form-input" type="number" min="2" placeholder="ex: 8"
                value={current.nb_equipes || ''}
                onChange={e => setCurrent(c => ({ ...c, nb_equipes: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Pays</label>
              <input className="form-input" value={current.pays || ''}
                onChange={e => setCurrent(c => ({ ...c, pays: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={2} value={current.description || ''}
                onChange={e => setCurrent(c => ({ ...c, description: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">
                Équipes participantes
                {equipesSelectionnees.size > 0 && (
                  <span style={{ color: 'var(--accent)', marginLeft: '8px', fontWeight: 400 }}>
                    {equipesSelectionnees.size} sélectionnée{equipesSelectionnees.size > 1 ? 's' : ''}
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {equipes.map(eq => {
                  const sel = equipesSelectionnees.has(eq.id)
                  return (
                    <button key={eq.id} type="button" onClick={() => toggleEquipe(eq.id)}
                      style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: '12px', cursor: 'pointer',
                        border: `1px solid ${sel ? (eq.couleur_principale || 'var(--accent)') : 'var(--border)'}`,
                        background: sel ? (eq.couleur_principale || 'var(--accent)') + '22' : 'var(--bg)',
                        color: sel ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: sel ? 700 : 400, transition: 'all 0.12s' }}>
                      {eq.nom}
                    </button>
                  )
                })}
                {equipes.length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Aucune équipe créée
                  </span>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
