import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const empty = { nom: '', type: '', pays: '', niveau: '', description: '', logo_url: '' }

const types = ['Championnat', 'Coupe', 'Tournoi', 'Ligue', 'Super Coupe', 'Autre']
const niveaux = ['National', 'International', 'Continental', 'Régional', 'Mondial']

export default function Competitions() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [current, setCurrent] = useState(empty)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase.from('competitions').select('*').order('nom')
    setData(rows || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    const payload = { ...current }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = modal === 'create'
      ? await supabase.from('competitions').insert(payload)
      : await supabase.from('competitions').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur', 'error'); return }
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
        <button className="btn btn-primary" onClick={() => { setCurrent(empty); setModal('create') }}>
          + Nouvelle compétition
        </button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">◆</div><h3>Aucune compétition</h3></div>
        ) : (
          <div className="cards-grid">
            {data.map(c => (
              <div key={c.id} className="card">
                <div className="card-title">{c.nom}</div>
                <div className="card-meta" style={{ marginTop: '6px', gap: '6px' }}>
                  {c.type && <span className="badge badge-accent">{c.type}</span>}
                  {c.niveau && <span className="badge">{c.niveau}</span>}
                  {c.pays && <span>🌍 {c.pays}</span>}
                </div>
                {c.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.description}
                  </p>
                )}
                <div className="card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setCurrent(c); setModal('edit') }}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVELLE COMPÉTITION' : 'MODIFIER COMPÉTITION'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </>}>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={current.nom} onChange={e => setCurrent(c => ({ ...c, nom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={current.type} onChange={e => setCurrent(c => ({ ...c, type: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Niveau</label>
              <select className="form-select" value={current.niveau} onChange={e => setCurrent(c => ({ ...c, niveau: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Pays</label>
              <input className="form-input" value={current.pays} onChange={e => setCurrent(c => ({ ...c, pays: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} value={current.description}
                onChange={e => setCurrent(c => ({ ...c, description: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
