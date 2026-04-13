import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const empty = {
  titre: '', ordre: '', description: '', periode_debut: '', periode_fin: '',
  themes: [], statut: 'planifié'
}
const statuts = ['planifié', 'en cours', 'terminé']

export default function Arcs() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [current, setCurrent] = useState(empty)
  const [currentDetail, setCurrentDetail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [themeInput, setThemeInput] = useState('')

  // Relations
  const [allPersonnages, setAllPersonnages] = useState([])
  const [allEquipes, setAllEquipes] = useState([])
  const [allCompetitions, setAllCompetitions] = useState([])
  const [allMatchs, setAllMatchs] = useState([])
  const [arcRelations, setArcRelations] = useState({ personnages: [], equipes: [], competitions: [], matchs: [] })
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase.from('arcs').select('*').order('ordre', { nullsLast: true })
    setData(rows || [])
    setLoading(false)
  }

  async function loadRefs() {
    const [p, e, c, m] = await Promise.all([
      supabase.from('personnages').select('id, prenom, nom').order('nom'),
      supabase.from('equipes').select('id, nom').order('nom'),
      supabase.from('competitions').select('id, nom').order('nom'),
      supabase.from('matchs').select('id, equipe_dom:equipes!matchs_equipe_domicile_id_fkey(nom), equipe_ext:equipes!matchs_equipe_exterieur_id_fkey(nom), date_match, score_domicile, score_exterieur').order('date_match', { ascending: false })
    ])
    setAllPersonnages(p.data || [])
    setAllEquipes(e.data || [])
    setAllCompetitions(c.data || [])
    setAllMatchs(m.data || [])
  }

  async function loadArcRelations(arcId) {
    const [p, e, c, m] = await Promise.all([
      supabase.from('arc_personnages').select('*, personnages(id, prenom, nom)').eq('arc_id', arcId),
      supabase.from('arc_equipes').select('*, equipes(id, nom)').eq('arc_id', arcId),
      supabase.from('arc_competitions').select('*, competitions(id, nom)').eq('arc_id', arcId),
      supabase.from('arc_matchs').select('*, matchs(id, score_domicile, score_exterieur, equipe_dom:equipes!matchs_equipe_domicile_id_fkey(nom), equipe_ext:equipes!matchs_equipe_exterieur_id_fkey(nom))').eq('arc_id', arcId),
    ])
    setArcRelations({
      personnages: p.data || [],
      equipes: e.data || [],
      competitions: c.data || [],
      matchs: m.data || []
    })
  }

  useEffect(() => { load(); loadRefs() }, [])

  async function save() {
    setSaving(true)
    const payload = { ...current, ordre: current.ordre ? parseInt(current.ordre) : null }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = modal === 'create'
      ? await supabase.from('arcs').insert(payload)
      : await supabase.from('arcs').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur', 'error'); return }
    toast('Arc sauvegardé ✓')
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cet arc ?')) return
    await supabase.from('arcs').delete().eq('id', id)
    toast('Arc supprimé')
    load()
  }

  async function openDetail(arc) {
    setCurrentDetail(arc)
    await loadArcRelations(arc.id)
    setModal('detail')
  }

  async function addRelation(type, id) {
    const tables = { personnages: 'arc_personnages', equipes: 'arc_equipes', competitions: 'arc_competitions', matchs: 'arc_matchs' }
    const keys = { personnages: 'personnage_id', equipes: 'equipe_id', competitions: 'competition_id', matchs: 'match_id' }
    await supabase.from(tables[type]).upsert({ arc_id: currentDetail.id, [keys[type]]: id })
    toast('Ajouté ✓')
    loadArcRelations(currentDetail.id)
  }

  async function removeRelation(type, id) {
    const tables = { personnages: 'arc_personnages', equipes: 'arc_equipes', competitions: 'arc_competitions', matchs: 'arc_matchs' }
    const keys = { personnages: 'personnage_id', equipes: 'equipe_id', competitions: 'competition_id', matchs: 'match_id' }
    await supabase.from(tables[type]).delete().eq('arc_id', currentDetail.id).eq(keys[type], id)
    toast('Retiré')
    loadArcRelations(currentDetail.id)
  }

  function addTheme() {
    if (!themeInput.trim()) return
    setCurrent(c => ({ ...c, themes: [...(c.themes || []), themeInput.trim()] }))
    setThemeInput('')
  }

  const statutColor = { 'planifié': 'var(--text-muted)', 'en cours': 'var(--accent)', 'terminé': 'var(--accent2)' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ARCS NARRATIFS</h1>
          <p className="page-subtitle">{data.length} arc{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrent(empty); setModal('create') }}>
          + Nouvel arc
        </button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">⌁</div><h3>Aucun arc narratif</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.map((arc, idx) => (
              <div key={arc.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openDetail(arc)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--border-bright)', lineHeight: 1, minWidth: '40px' }}>
                      {arc.ordre || (idx + 1)}
                    </div>
                    <div>
                      <div className="card-title">{arc.titre}</div>
                      {(arc.periode_debut || arc.periode_fin) && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {arc.periode_debut}{arc.periode_fin ? ` → ${arc.periode_fin}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge" style={{ color: statutColor[arc.statut] }}>{arc.statut}</span>
                  </div>
                </div>
                {arc.description && (
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '10px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {arc.description}
                  </p>
                )}
                {arc.themes?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {arc.themes.map(t => <span key={t} className="badge">{t}</span>)}
                  </div>
                )}
                <div className="card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setCurrent(arc); setModal('edit') }}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(arc.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVEL ARC' : 'MODIFIER ARC'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button>
          </>}>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Titre *</label>
              <input className="form-input" value={current.titre} onChange={e => setCurrent(c => ({ ...c, titre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Ordre</label>
              <input className="form-input" type="number" value={current.ordre} onChange={e => setCurrent(c => ({ ...c, ordre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Statut</label>
              <select className="form-select" value={current.statut} onChange={e => setCurrent(c => ({ ...c, statut: e.target.value }))}>
                {statuts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Période début</label>
              <input className="form-input" placeholder="ex: Saison 1" value={current.periode_debut} onChange={e => setCurrent(c => ({ ...c, periode_debut: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Période fin</label>
              <input className="form-input" placeholder="ex: Saison 3" value={current.periode_fin} onChange={e => setCurrent(c => ({ ...c, periode_fin: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={4} value={current.description} onChange={e => setCurrent(c => ({ ...c, description: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Thèmes</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input className="form-input" placeholder="Ajouter un thème..." value={themeInput}
                  onChange={e => setThemeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTheme()} />
                <button className="btn btn-secondary btn-sm" onClick={addTheme}>+</button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(current.themes || []).map(t => (
                  <span key={t} className="badge" style={{ cursor: 'pointer' }}
                    onClick={() => setCurrent(c => ({ ...c, themes: c.themes.filter(x => x !== t) }))}>
                    {t} ✕
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'detail' && currentDetail && (
        <Modal title={currentDetail.titre} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Fermer</button>
            <button className="btn btn-primary" onClick={() => { setCurrent(currentDetail); setModal('edit') }}>Modifier</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentDetail.description && <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{currentDetail.description}</p>}

            {/* PERSONNAGES */}
            <RelationSection title="Personnages" items={arcRelations.personnages}
              allItems={allPersonnages.filter(p => !arcRelations.personnages.find(r => r.personnage_id === p.id))}
              getLabel={i => `${i.personnages?.prenom} ${i.personnages?.nom}`}
              getAllLabel={i => `${i.prenom} ${i.nom}`}
              onAdd={id => addRelation('personnages', id)}
              onRemove={r => removeRelation('personnages', r.personnage_id)} />

            {/* EQUIPES */}
            <RelationSection title="Équipes" items={arcRelations.equipes}
              allItems={allEquipes.filter(e => !arcRelations.equipes.find(r => r.equipe_id === e.id))}
              getLabel={i => i.equipes?.nom}
              getAllLabel={i => i.nom}
              onAdd={id => addRelation('equipes', id)}
              onRemove={r => removeRelation('equipes', r.equipe_id)} />

            {/* COMPETITIONS */}
            <RelationSection title="Compétitions" items={arcRelations.competitions}
              allItems={allCompetitions.filter(c => !arcRelations.competitions.find(r => r.competition_id === c.id))}
              getLabel={i => i.competitions?.nom}
              getAllLabel={i => i.nom}
              onAdd={id => addRelation('competitions', id)}
              onRemove={r => removeRelation('competitions', r.competition_id)} />

            {/* MATCHS */}
            <RelationSection title="Matchs" items={arcRelations.matchs}
              allItems={allMatchs.filter(m => !arcRelations.matchs.find(r => r.match_id === m.id))}
              getLabel={i => i.matchs ? `${i.matchs.equipe_dom?.nom || '?'} vs ${i.matchs.equipe_ext?.nom || '?'}` : '?'}
              getAllLabel={i => `${i.equipe_dom?.nom || '?'} vs ${i.equipe_ext?.nom || '?'} ${i.date_match || ''}`}
              onAdd={id => addRelation('matchs', id)}
              onRemove={r => removeRelation('matchs', r.match_id)} />
          </div>
        </Modal>
      )}
    </div>
  )
}

function RelationSection({ title, items, allItems, getLabel, getAllLabel, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="detail-section-title">{title}</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? 'Fermer' : `+ Ajouter`}
        </button>
      </div>
      {adding && allItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', padding: '10px', background: 'var(--bg)', borderRadius: '6px' }}>
          {allItems.map(i => (
            <button key={i.id} className="btn btn-secondary btn-sm" onClick={() => { onAdd(i.id); }}
              style={{ fontSize: '0.75rem' }}>{getAllLabel(i)}</button>
          ))}
        </div>
      )}
      {items.length === 0
        ? <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Aucun élément</p>
        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {items.map((r, i) => (
            <span key={i} className="badge badge-accent" style={{ cursor: 'pointer' }}
              onClick={() => onRemove(r)}>{getLabel(r)} ✕</span>
          ))}
        </div>
      }
    </div>
  )
}
