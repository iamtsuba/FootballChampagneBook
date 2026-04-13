import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const emptyEquipe = {
  nom: '', acronyme: '', ville: '', pays: '',
  couleur_principale: '#e8ff3a', couleur_secondaire: '#0a0a0f',
  description_maillot: '', logo_url: '', palmarès: [], notes: ''
}

export default function Equipes() {
  const [data, setData] = useState([])
  const [personnages, setPersonnages] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [current, setCurrent] = useState(emptyEquipe)
  const [saving, setSaving] = useState(false)
  const [selectedEquipe, setSelectedEquipe] = useState(null)
  const [saisons, setSaisons] = useState([])
  const [palmaresEntry, setPalmaresEntry] = useState({ annee: '', titre: '' })
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase.from('equipes').select('*').order('nom')
    setData(rows || [])
    setLoading(false)
  }

  async function loadPersonnages() {
    const { data: rows } = await supabase.from('personnages').select('id, prenom, nom').order('nom')
    setPersonnages(rows || [])
  }

  async function loadSaisons(equipeId) {
    const { data: rows } = await supabase
      .from('saisons')
      .select('*, saison_joueurs(*, personnages(id, prenom, nom))')
      .eq('equipe_id', equipeId)
      .order('annee_debut')
    setSaisons(rows || [])
  }

  useEffect(() => { load(); loadPersonnages() }, [])

  async function save() {
    setSaving(true)
    const payload = { ...current }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = modal === 'create'
      ? await supabase.from('equipes').insert(payload)
      : await supabase.from('equipes').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur sauvegarde', 'error'); return }
    toast(modal === 'create' ? 'Équipe créée ✓' : 'Équipe mise à jour ✓')
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Supprimer cette équipe et toutes ses saisons ?')) return
    await supabase.from('equipes').delete().eq('id', id)
    toast('Équipe supprimée')
    load()
  }

  async function openDetail(equipe) {
    setSelectedEquipe(equipe)
    await loadSaisons(equipe.id)
    setModal('detail')
  }

  async function addSaison(equipeId) {
    const debut = prompt('Année de début de saison :')
    if (!debut) return
    const fin = prompt('Année de fin de saison :')
    if (!fin) return
    await supabase.from('saisons').insert({ equipe_id: equipeId, annee_debut: parseInt(debut), annee_fin: parseInt(fin) })
    toast('Saison ajoutée ✓')
    loadSaisons(equipeId)
  }

  async function addJoueurToSaison(saisonId) {
    const options = personnages.map(p => `${p.id} — ${p.prenom} ${p.nom}`)
    const choice = prompt(`Entrez l'ID du joueur (ou choisissez):\n${options.slice(0, 20).join('\n')}`)
    if (!choice) return
    const pid = choice.split(' — ')[0].trim()
    const num = prompt('Numéro de maillot (optionnel) :')
    await supabase.from('saison_joueurs').insert({
      saison_id: saisonId,
      personnage_id: pid,
      numero_maillot: num ? parseInt(num) : null
    })
    toast('Joueur ajouté ✓')
    loadSaisons(selectedEquipe.id)
  }

  async function removeJoueur(id) {
    await supabase.from('saison_joueurs').delete().eq('id', id)
    toast('Joueur retiré')
    loadSaisons(selectedEquipe.id)
  }

  async function removeSaison(id) {
    if (!confirm('Supprimer cette saison et tous ses joueurs ?')) return
    await supabase.from('saisons').delete().eq('id', id)
    toast('Saison supprimée')
    loadSaisons(selectedEquipe.id)
  }

  function addPalmaresEntry() {
    if (!palmaresEntry.annee || !palmaresEntry.titre) return
    setCurrent(c => ({ ...c, 'palmarès': [...(c['palmarès'] || []), { ...palmaresEntry }] }))
    setPalmaresEntry({ annee: '', titre: '' })
  }

  function removePalmaresEntry(idx) {
    setCurrent(c => ({ ...c, 'palmarès': c['palmarès'].filter((_, i) => i !== idx) }))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ÉQUIPES</h1>
          <p className="page-subtitle">{data.length} équipe{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrent(emptyEquipe); setModal('create') }}>
          + Nouvelle équipe
        </button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <h3>Aucune équipe</h3>
          </div>
        ) : (
          <div className="cards-grid">
            {data.map(e => (
              <div key={e.id} className="card" onClick={() => openDetail(e)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-title">{e.nom}</div>
                    {e.acronyme && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{e.acronyme}</div>}
                  </div>
                  <div className="color-swatches">
                    <div className="color-swatch" style={{ background: e.couleur_principale }} title={e.couleur_principale} />
                    <div className="color-swatch" style={{ background: e.couleur_secondaire }} title={e.couleur_secondaire} />
                  </div>
                </div>
                <div className="card-meta" style={{ marginTop: '8px' }}>
                  {e.ville && <span>📍 {e.ville}</span>}
                  {e.pays && <span>{e.pays}</span>}
                  {e.palmarès?.length > 0 && <span>🏆 {e.palmarès.length} titre{e.palmarès.length > 1 ? 's' : ''}</span>}
                </div>
                {e.description_maillot && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {e.description_maillot}
                  </p>
                )}
                <div className="card-actions" onClick={ev => ev.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setCurrent(e); setModal('edit') }}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* CREATE / EDIT MODAL */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'NOUVELLE ÉQUIPE' : 'MODIFIER ÉQUIPE'}
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
              <label className="form-label">Nom *</label>
              <input className="form-input" value={current.nom} onChange={e => setCurrent(c => ({ ...c, nom: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Acronyme</label>
              <input className="form-input" placeholder="ex: PSG, OM..." value={current.acronyme} onChange={e => setCurrent(c => ({ ...c, acronyme: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <input className="form-input" value={current.ville} onChange={e => setCurrent(c => ({ ...c, ville: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Pays</label>
              <input className="form-input" value={current.pays} onChange={e => setCurrent(c => ({ ...c, pays: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Couleur principale</label>
              <div className="color-input-group">
                <div className="color-preview" style={{ background: current.couleur_principale }} />
                <input className="form-input" type="color" value={current.couleur_principale}
                  onChange={e => setCurrent(c => ({ ...c, couleur_principale: e.target.value }))}
                  style={{ padding: '4px', height: '40px', cursor: 'pointer' }} />
                <input className="form-input" value={current.couleur_principale}
                  onChange={e => setCurrent(c => ({ ...c, couleur_principale: e.target.value }))}
                  style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Couleur secondaire</label>
              <div className="color-input-group">
                <div className="color-preview" style={{ background: current.couleur_secondaire }} />
                <input className="form-input" type="color" value={current.couleur_secondaire}
                  onChange={e => setCurrent(c => ({ ...c, couleur_secondaire: e.target.value }))}
                  style={{ padding: '4px', height: '40px', cursor: 'pointer' }} />
                <input className="form-input" value={current.couleur_secondaire}
                  onChange={e => setCurrent(c => ({ ...c, couleur_secondaire: e.target.value }))}
                  style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group full">
              <label className="form-label">Description du maillot</label>
              <textarea className="form-textarea" rows={3}
                placeholder="Décris le maillot en détail : coupe, motifs, numérotation, sponsor, matière..."
                value={current.description_maillot}
                onChange={e => setCurrent(c => ({ ...c, description_maillot: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Palmarès</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input className="form-input" placeholder="Année" style={{ width: '100px' }}
                  value={palmaresEntry.annee} onChange={e => setPalmaresEntry(p => ({ ...p, annee: e.target.value }))} />
                <input className="form-input" placeholder="Titre remporté"
                  value={palmaresEntry.titre} onChange={e => setPalmaresEntry(p => ({ ...p, titre: e.target.value }))} />
                <button className="btn btn-secondary btn-sm" onClick={addPalmaresEntry} style={{ whiteSpace: 'nowrap' }}>+ Ajouter</button>
              </div>
              {(current.palmarès || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {current.palmarès.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'var(--bg)', borderRadius: '4px', padding: '6px 10px', fontSize: '0.83rem' }}>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{p.annee}</span>
                      <span style={{ flex: 1 }}>{p.titre}</span>
                      <button onClick={() => removePalmaresEntry(i)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={current.notes}
                onChange={e => setCurrent(c => ({ ...c, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* DETAIL MODAL WITH SAISONS */}
      {modal === 'detail' && selectedEquipe && (
        <Modal title={selectedEquipe.nom} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Fermer</button>
            <button className="btn btn-primary" onClick={() => { setCurrent(selectedEquipe); setModal('edit') }}>Modifier</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Colors */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: selectedEquipe.couleur_principale, border: '3px solid var(--border-bright)' }} />
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: selectedEquipe.couleur_secondaire, border: '3px solid var(--border-bright)' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {selectedEquipe.couleur_principale} / {selectedEquipe.couleur_secondaire}
              </div>
            </div>

            {selectedEquipe.description_maillot && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '6px' }}>Maillot</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{selectedEquipe.description_maillot}</p>
              </div>
            )}

            {selectedEquipe.palmarès?.length > 0 && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>🏆 Palmarès</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedEquipe.palmarès.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', minWidth: '48px' }}>{p.annee}</span>
                      <span>{p.titre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAISONS */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="detail-section-title">Effectifs par saison</div>
                <button className="btn btn-secondary btn-sm" onClick={() => addSaison(selectedEquipe.id)}>+ Saison</button>
              </div>
              {saisons.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>Aucune saison — cliquez "+ Saison" pour commencer</p>
              ) : saisons.map(s => (
                <div key={s.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--accent)' }}>
                      {s.annee_debut}–{s.annee_fin}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => addJoueurToSaison(s.id)}>+ Joueur</button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeSaison(s.id)}>✕</button>
                    </div>
                  </div>
                  {s.saison_joueurs?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {s.saison_joueurs.map(sj => (
                        <div key={sj.id} style={{ display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'var(--bg-card)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.78rem' }}>
                          {sj.numero_maillot && <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>#{sj.numero_maillot}</span>}
                          <span>{sj.personnages?.prenom} {sj.personnages?.nom}</span>
                          <button onClick={() => removeJoueur(sj.id)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Aucun joueur dans cette saison</p>}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
