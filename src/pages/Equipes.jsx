import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const emptyEquipe = {
  nom: '', acronyme: '', ville: '', pays: '',
  couleur_principale: '#e8ff3a', couleur_secondaire: '#0a0a0f',
  description_maillot: '', logo_url: '', palmarès: [], notes: ''
}
const emptySaison = { annee_debut: '', annee_fin: '', categorie: '' }

const CATEGORIES = [
  'Professionnelle', 'Semi-professionnelle', 'Amateur',
  'U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13',
  'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'U23',
  'Élite', 'Division 1', 'Division 2', 'Division 3',
  'Nationale', 'Régionale', 'Départementale', 'Autre'
]

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

  // Formulaire nouvelle saison
  const [showSaisonForm, setShowSaisonForm] = useState(false)
  const [newSaison, setNewSaison] = useState(emptySaison)

  // Formulaire ajout joueur par saison : { [saisonId]: { open, personnageId, numero } }
  const [joueurForms, setJoueurForms] = useState({})

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
    setShowSaisonForm(false)
    setJoueurForms({})
    setModal('detail')
  }

  // ── SAISON ──
  async function submitSaison() {
    if (!newSaison.annee_debut || !newSaison.annee_fin) {
      toast('Remplis les deux années', 'error'); return
    }
    const { error } = await supabase.from('saisons').insert({
      equipe_id: selectedEquipe.id,
      annee_debut: parseInt(newSaison.annee_debut),
      annee_fin: parseInt(newSaison.annee_fin),
      categorie: newSaison.categorie || null
    })
    if (error) { toast('Erreur', 'error'); return }
    toast('Saison ajoutée ✓')
    setNewSaison(emptySaison)
    setShowSaisonForm(false)
    loadSaisons(selectedEquipe.id)
  }

  async function removeSaison(id) {
    if (!confirm('Supprimer cette saison et tous ses joueurs ?')) return
    await supabase.from('saisons').delete().eq('id', id)
    toast('Saison supprimée')
    loadSaisons(selectedEquipe.id)
  }

  // ── JOUEUR ──
  function toggleJoueurForm(saisonId) {
    setJoueurForms(prev => ({
      ...prev,
      [saisonId]: prev[saisonId]?.open
        ? { open: false, personnageId: '', numero: '' }
        : { open: true, personnageId: '', numero: '' }
    }))
  }

  function getJoueurForm(saisonId) {
    return joueurForms[saisonId] || { open: false, personnageId: '', numero: '' }
  }

  function setJoueurField(saisonId, field, value) {
    setJoueurForms(prev => ({
      ...prev,
      [saisonId]: { ...getJoueurForm(saisonId), [field]: value }
    }))
  }

  async function submitJoueur(saisonId, saison) {
    const form = getJoueurForm(saisonId)
    if (!form.personnageId) { toast('Sélectionne un joueur', 'error'); return }
    const dejaDans = saison.saison_joueurs?.find(sj => sj.personnage_id === form.personnageId)
    if (dejaDans) { toast('Ce joueur est déjà dans cette saison', 'error'); return }
    const { error } = await supabase.from('saison_joueurs').insert({
      saison_id: saisonId,
      personnage_id: form.personnageId,
      numero_maillot: form.numero ? parseInt(form.numero) : null
    })
    if (error) { toast('Erreur', 'error'); return }
    toast('Joueur ajouté ✓')
    setJoueurForms(prev => ({ ...prev, [saisonId]: { open: false, personnageId: '', numero: '' } }))
    loadSaisons(selectedEquipe.id)
  }

  async function removeJoueur(id) {
    await supabase.from('saison_joueurs').delete().eq('id', id)
    toast('Joueur retiré')
    loadSaisons(selectedEquipe.id)
  }

  // ── PALMARES ──
  function addPalmaresEntry() {
    if (!palmaresEntry.annee || !palmaresEntry.titre) return
    setCurrent(c => ({ ...c, 'palmarès': [...(c['palmarès'] || []), { ...palmaresEntry }] }))
    setPalmaresEntry({ annee: '', titre: '' })
  }
  function removePalmaresEntry(idx) {
    setCurrent(c => ({ ...c, 'palmarès': c['palmarès'].filter((_, i) => i !== idx) }))
  }

  function joueursDispo(saison) {
    const deja = new Set(saison.saison_joueurs?.map(sj => sj.personnage_id) || [])
    return personnages.filter(p => !deja.has(p.id))
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
          <div className="empty-state"><div className="empty-icon">⬡</div><h3>Aucune équipe</h3></div>
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
                    <div className="color-swatch" style={{ background: e.couleur_principale }} />
                    <div className="color-swatch" style={{ background: e.couleur_secondaire }} />
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

      {/* ── MODALE CRÉER / MODIFIER ── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVELLE ÉQUIPE' : 'MODIFIER ÉQUIPE'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </>}>
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
                <input type="color" value={current.couleur_principale}
                  onChange={e => setCurrent(c => ({ ...c, couleur_principale: e.target.value }))}
                  style={{ width: '40px', height: '40px', padding: '2px', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }} />
                <input className="form-input" value={current.couleur_principale}
                  onChange={e => setCurrent(c => ({ ...c, couleur_principale: e.target.value }))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Couleur secondaire</label>
              <div className="color-input-group">
                <div className="color-preview" style={{ background: current.couleur_secondaire }} />
                <input type="color" value={current.couleur_secondaire}
                  onChange={e => setCurrent(c => ({ ...c, couleur_secondaire: e.target.value }))}
                  style={{ width: '40px', height: '40px', padding: '2px', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }} />
                <input className="form-input" value={current.couleur_secondaire}
                  onChange={e => setCurrent(c => ({ ...c, couleur_secondaire: e.target.value }))} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group full">
              <label className="form-label">Description du maillot</label>
              <textarea className="form-textarea" rows={3}
                placeholder="Décris le maillot en détail : coupe, motifs, numérotation, sponsor..."
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
                      <button onClick={() => removePalmaresEntry(i)}
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
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

      {/* ── MODALE DÉTAIL + SAISONS ── */}
      {modal === 'detail' && selectedEquipe && (
        <Modal title={selectedEquipe.nom} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Fermer</button>
            <button className="btn btn-primary" onClick={() => { setCurrent(selectedEquipe); setModal('edit') }}>Modifier l'équipe</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Couleurs */}
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

            {/* ── SAISONS ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="detail-section-title">Effectifs par saison</div>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setShowSaisonForm(v => !v); setNewSaison(emptySaison) }}>
                  {showSaisonForm ? 'Annuler' : '+ Nouvelle saison'}
                </button>
              </div>

              {/* Formulaire nouvelle saison */}
              {showSaisonForm && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--accent)',
                  borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">Année début</label>
                      <input className="form-input" type="number" placeholder="ex: 2024"
                        value={newSaison.annee_debut}
                        onChange={e => setNewSaison(s => ({ ...s, annee_debut: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">Année fin</label>
                      <input className="form-input" type="number" placeholder="ex: 2025"
                        value={newSaison.annee_fin}
                        onChange={e => setNewSaison(s => ({ ...s, annee_fin: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ flex: 2, minWidth: '160px' }}>
                      <label className="form-label">Catégorie</label>
                      <select className="form-select" value={newSaison.categorie}
                        onChange={e => setNewSaison(s => ({ ...s, categorie: e.target.value }))}>
                        <option value="">— Sélectionner —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <button className="btn btn-primary" style={{ marginBottom: '1px' }} onClick={submitSaison}>
                      Créer la saison
                    </button>
                  </div>
                </div>
              )}

              {saisons.length === 0 && !showSaisonForm && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                  Aucune saison — clique sur "+ Nouvelle saison" pour commencer.
                </p>
              )}

              {/* Liste des saisons */}
              {saisons.map(s => {
                const form = getJoueurForm(s.id)
                const dispo = joueursDispo(s)
                return (
                  <div key={s.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>

                    {/* Header saison */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--accent)' }}>
                        Saison {s.annee_debut}–{s.annee_fin}
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          {s.saison_joueurs?.length || 0} joueur{(s.saison_joueurs?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </span>
                      {s.categorie && (
                        <span className="badge badge-accent" style={{ marginLeft: '8px' }}>{s.categorie}</span>
                      )}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => toggleJoueurForm(s.id)}>
                          {form.open ? '✕ Annuler' : '+ Joueur'}
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeSaison(s.id)} title="Supprimer la saison">🗑</button>
                      </div>
                    </div>

                    {/* Formulaire ajout joueur */}
                    {form.open && (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
                        borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
                        {dispo.length === 0 ? (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Tous les personnages sont déjà dans cette saison.{' '}
                            <span style={{ color: 'var(--accent)' }}>
                              Crée d'abord un personnage dans la section "Personnages".
                            </span>
                          </p>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: 2, minWidth: '160px' }}>
                              <label className="form-label">Joueur</label>
                              <select className="form-select" value={form.personnageId}
                                onChange={e => setJoueurField(s.id, 'personnageId', e.target.value)}>
                                <option value="">— Sélectionner un joueur —</option>
                                {dispo.map(p => (
                                  <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group" style={{ width: '110px' }}>
                              <label className="form-label">N° maillot</label>
                              <input className="form-input" type="number" min="1" placeholder="ex: 10"
                                value={form.numero}
                                onChange={e => setJoueurField(s.id, 'numero', e.target.value)} />
                            </div>
                            <button className="btn btn-primary" style={{ marginBottom: '1px' }}
                              onClick={() => submitJoueur(s.id, s)}>
                              Ajouter
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Liste joueurs */}
                    {s.saison_joueurs?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[...s.saison_joueurs]
                          .sort((a, b) => (a.numero_maillot ?? 999) - (b.numero_maillot ?? 999))
                          .map(sj => (
                            <div key={sj.id} style={{ display: 'flex', alignItems: 'center', gap: '6px',
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              borderRadius: '20px', padding: '5px 12px', fontSize: '0.82rem',
                              transition: 'border-color 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                              {sj.numero_maillot != null && (
                                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)',
                                  fontSize: '1rem', minWidth: '22px', textAlign: 'center' }}>
                                  {sj.numero_maillot}
                                </span>
                              )}
                              <span>{sj.personnages?.prenom} {sj.personnages?.nom}</span>
                              <button onClick={() => removeJoueur(sj.id)} title="Retirer ce joueur"
                                style={{ color: 'var(--text-dim)', background: 'none', border: 'none',
                                  cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, padding: '0 2px' }}
                                onMouseEnter={e => e.target.style.color = 'var(--danger)'}
                                onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>
                                ✕
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Aucun joueur — clique sur "+ Joueur" pour en ajouter.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
