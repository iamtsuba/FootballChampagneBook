import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const empty = {
  nom: '', prenom: '', surnom: '', age: '', nationalite: '', poste: '',
  caracteristiques_design: '', style_personnalite: '', notes: '', avatar_url: ''
}

export default function Personnages() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit' | 'view'
  const [current, setCurrent] = useState(empty)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows, error } = await supabase.from('personnages').select('*').order('nom')
    if (error) toast('Erreur chargement', 'error')
    else setData(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    const payload = { ...current, age: current.age ? parseInt(current.age) : null }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = modal === 'create'
      ? await supabase.from('personnages').insert(payload)
      : await supabase.from('personnages').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur sauvegarde', 'error'); return }
    toast(modal === 'create' ? 'Personnage créé ✓' : 'Personnage mis à jour ✓')
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce personnage ?')) return
    const { error } = await supabase.from('personnages').delete().eq('id', id)
    if (error) toast('Erreur suppression', 'error')
    else { toast('Personnage supprimé'); load() }
  }

  const filtered = data.filter(p =>
    `${p.nom} ${p.prenom} ${p.surnom || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">PERSONNAGES</h1>
          <p className="page-subtitle">{data.length} personnage{data.length !== 1 ? 's' : ''} dans l'univers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrent(empty); setModal('create') }}>
          + Nouveau personnage
        </button>
      </div>

      <div className="search-bar">
        <span style={{ color: 'var(--text-muted)' }}>◎</span>
        <input placeholder="Rechercher un personnage..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◉</div>
          <h3>Aucun personnage</h3>
          <p>Commence par créer ton premier personnage</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map(p => (
            <div key={p.id} className="card" onClick={() => { setCurrent(p); setModal('view') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title">{p.prenom} {p.nom}</div>
                  {p.surnom && <div style={{ color: 'var(--accent)', fontSize: '0.8rem', marginBottom: '4px' }}>"{p.surnom}"</div>}
                </div>
                {p.poste && <span className="badge">{p.poste}</span>}
              </div>
              <div className="card-meta" style={{ marginTop: '8px' }}>
                {p.nationalite && <span>🌍 {p.nationalite}</span>}
                {p.age && <span>⊕ {p.age} ans</span>}
              </div>
              {p.caracteristiques_design && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.caracteristiques_design}
                </p>
              )}
              <div className="card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setCurrent(p); setModal('edit') }}>Modifier</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'NOUVEAU PERSONNAGE' : 'MODIFIER PERSONNAGE'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </>}
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="form-input" value={current.prenom} onChange={e => setCurrent(c => ({ ...c, prenom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={current.nom} onChange={e => setCurrent(c => ({ ...c, nom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Surnom</label>
              <input className="form-input" placeholder="Optionnel" value={current.surnom} onChange={e => setCurrent(c => ({ ...c, surnom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Poste / Rôle</label>
              <input className="form-input" placeholder="ex: Attaquant, Gardien..." value={current.poste} onChange={e => setCurrent(c => ({ ...c, poste: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Âge</label>
              <input className="form-input" type="number" value={current.age} onChange={e => setCurrent(c => ({ ...c, age: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Nationalité</label>
              <input className="form-input" value={current.nationalite} onChange={e => setCurrent(c => ({ ...c, nationalite: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Design physique *</label>
              <textarea className="form-textarea" rows={4}
                placeholder="Description physique détaillée : taille, morphologie, couleur de cheveux, yeux, traits distinctifs, tenue habituelle..."
                value={current.caracteristiques_design}
                onChange={e => setCurrent(c => ({ ...c, caracteristiques_design: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Style de personnalité <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea className="form-textarea" rows={3}
                placeholder="Traits de caractère, comportements, motivations, forces et faiblesses..."
                value={current.style_personnalite}
                onChange={e => setCurrent(c => ({ ...c, style_personnalite: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2}
                placeholder="Notes diverses, éléments d'arc, références..."
                value={current.notes}
                onChange={e => setCurrent(c => ({ ...c, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {modal === 'view' && current && (
        <Modal title={`${current.prenom} ${current.nom}`} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Fermer</button>
            <button className="btn btn-primary" onClick={() => setModal('edit')}>Modifier</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {current.surnom && <div style={{ color: 'var(--accent)', fontSize: '1rem' }}>"{current.surnom}"</div>}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {current.poste && <span className="badge badge-accent">{current.poste}</span>}
              {current.nationalite && <span className="badge">{current.nationalite}</span>}
              {current.age && <span className="badge">{current.age} ans</span>}
            </div>
            {current.caracteristiques_design && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>Design physique</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{current.caracteristiques_design}</p>
              </div>
            )}
            {current.style_personnalite && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>Personnalité</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{current.style_personnalite}</p>
              </div>
            )}
            {current.notes && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>Notes</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{current.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
