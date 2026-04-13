import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const POSTES = [
  'GARDIEN',
  'DEF DROIT', 'DEF CENTRAL', 'DEF GAUCHE',
  'MIL DROIT', 'MIL DEF', 'MIL OFF', 'MIL GAUCHE',
  'AILIER DROIT', 'AILIER GAUCHE',
  'BUTEUR'
]

const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']

const POSTE_COLORS = {
  'GARDIEN': '#f59e0b',
  'DEF DROIT': '#3b82f6', 'DEF CENTRAL': '#3b82f6', 'DEF GAUCHE': '#3b82f6',
  'MIL DROIT': '#10b981', 'MIL DEF': '#10b981', 'MIL OFF': '#10b981', 'MIL GAUCHE': '#10b981',
  'AILIER DROIT': '#e8ff3a', 'AILIER GAUCHE': '#e8ff3a',
  'BUTEUR': '#ef4444'
}

const empty = {
  nom: '', prenom: '', surnom: '', age: '', nationalite: '', poste: '',
  caracteristiques_design: '', style_personnalite: '', notes: '', avatar_url: ''
}

const emptyAjout = { equipe_id: '', categorie: '', annee_debut: '', annee_fin: '', numero_maillot: '' }

export default function Personnages() {
  const [data, setData] = useState([])
  const [equipes, setEquipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPoste, setFilterPoste] = useState('')
  const [modal, setModal] = useState(null)
  const [current, setCurrent] = useState(empty)
  const [saving, setSaving] = useState(false)

  // Fiche joueur
  const [clubHistory, setClubHistory] = useState([])
  const [ajoutForm, setAjoutForm] = useState(emptyAjout)
  const [showAjoutForm, setShowAjoutForm] = useState(false)
  const [ajoutSaving, setAjoutSaving] = useState(false)

  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase.from('personnages').select('*').order('nom')
    setData(rows || [])
    setLoading(false)
  }

  async function loadEquipes() {
    const { data: rows } = await supabase.from('equipes').select('id, nom').order('nom')
    setEquipes(rows || [])
  }

  async function loadClubHistory(personnageId) {
    const { data: rows } = await supabase
      .from('saison_joueurs')
      .select('*, saisons(annee_debut, annee_fin, categorie, equipes(id, nom, couleur_principale, couleur_secondaire))')
      .eq('personnage_id', personnageId)
      .order('created_at')
    setClubHistory(rows || [])
  }

  useEffect(() => { load(); loadEquipes() }, [])

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
    await supabase.from('personnages').delete().eq('id', id)
    toast('Personnage supprimé')
    load()
  }

  async function openFiche(p) {
    setCurrent(p)
    await loadClubHistory(p.id)
    setShowAjoutForm(false)
    setAjoutForm(emptyAjout)
    setModal('fiche')
  }

  async function submitAjout() {
    if (!ajoutForm.equipe_id || !ajoutForm.categorie || !ajoutForm.annee_debut || !ajoutForm.annee_fin) {
      toast('Remplis tous les champs obligatoires', 'error'); return
    }
    setAjoutSaving(true)

    // 1. Trouve ou crée la saison correspondante
    let { data: saisonExist } = await supabase
      .from('saisons')
      .select('id')
      .eq('equipe_id', ajoutForm.equipe_id)
      .eq('annee_debut', parseInt(ajoutForm.annee_debut))
      .eq('annee_fin', parseInt(ajoutForm.annee_fin))
      .eq('categorie', ajoutForm.categorie)
      .maybeSingle()

    let saisonId = saisonExist?.id

    if (!saisonId) {
      const { data: newSaison, error: errSaison } = await supabase
        .from('saisons')
        .insert({
          equipe_id: ajoutForm.equipe_id,
          annee_debut: parseInt(ajoutForm.annee_debut),
          annee_fin: parseInt(ajoutForm.annee_fin),
          categorie: ajoutForm.categorie
        })
        .select('id')
        .single()
      if (errSaison) { toast('Erreur création saison', 'error'); setAjoutSaving(false); return }
      saisonId = newSaison.id
    }

    // 2. Vérifie doublon
    const { data: deja } = await supabase
      .from('saison_joueurs')
      .select('id')
      .eq('saison_id', saisonId)
      .eq('personnage_id', current.id)
      .maybeSingle()

    if (deja) { toast('Joueur déjà dans cette saison/équipe', 'error'); setAjoutSaving(false); return }

    // 3. Ajoute le joueur
    const { error } = await supabase.from('saison_joueurs').insert({
      saison_id: saisonId,
      personnage_id: current.id,
      numero_maillot: ajoutForm.numero_maillot ? parseInt(ajoutForm.numero_maillot) : null
    })

    setAjoutSaving(false)
    if (error) { toast('Erreur', 'error'); return }
    toast('Joueur ajouté à l\'équipe ✓')
    setShowAjoutForm(false)
    setAjoutForm(emptyAjout)
    loadClubHistory(current.id)
  }

  async function retirerDuClub(saisonJoueurId) {
    if (!confirm('Retirer ce joueur de cette équipe/saison ?')) return
    await supabase.from('saison_joueurs').delete().eq('id', saisonJoueurId)
    toast('Retiré ✓')
    loadClubHistory(current.id)
  }

  const filtered = data.filter(p => {
    const matchSearch = `${p.nom} ${p.prenom} ${p.surnom || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchPoste = !filterPoste || p.poste === filterPoste
    return matchSearch && matchPoste
  })

  const posteColor = (poste) => POSTE_COLORS[poste] || 'var(--text-muted)'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">PERSONNAGES</h1>
          <p className="page-subtitle">{data.length} personnage{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrent(empty); setModal('create') }}>
          + Nouveau personnage
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
          <span style={{ color: 'var(--text-muted)' }}>◎</span>
          <input placeholder="Rechercher un personnage..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ minWidth: '180px' }}
          value={filterPoste} onChange={e => setFilterPoste(e.target.value)}>
          <option value="">Tous les postes</option>
          {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {filterPoste && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFilterPoste('')}>✕ Effacer filtre</button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◉</div>
          <h3>{filterPoste ? `Aucun joueur au poste ${filterPoste}` : 'Aucun personnage'}</h3>
        </div>
      ) : (
        <div className="cards-grid">
          {filtered.map(p => (
            <div key={p.id} className="card" onClick={() => openFiche(p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title">{p.prenom} {p.nom}</div>
                  {p.surnom && <div style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>"{p.surnom}"</div>}
                </div>
                {p.poste && (
                  <span className="badge" style={{ color: posteColor(p.poste), borderColor: posteColor(p.poste) + '44', background: posteColor(p.poste) + '11' }}>
                    {p.poste}
                  </span>
                )}
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

      {/* ── MODALE CRÉER / MODIFIER ── */}
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
              <label className="form-label">Poste</label>
              <select className="form-select" value={current.poste} onChange={e => setCurrent(c => ({ ...c, poste: e.target.value }))}>
                <option value="">— Sélectionner —</option>
                {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
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
                placeholder="Description physique détaillée : taille, morphologie, cheveux, yeux, traits distinctifs..."
                value={current.caracteristiques_design}
                onChange={e => setCurrent(c => ({ ...c, caracteristiques_design: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Personnalité <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea className="form-textarea" rows={3}
                placeholder="Traits de caractère, motivations, forces et faiblesses..."
                value={current.style_personnalite}
                onChange={e => setCurrent(c => ({ ...c, style_personnalite: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={current.notes}
                onChange={e => setCurrent(c => ({ ...c, notes: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── FICHE JOUEUR ── */}
      {modal === 'fiche' && current && (
        <Modal title={`${current.prenom} ${current.nom}`} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Fermer</button>
            <button className="btn btn-primary" onClick={() => setModal('edit')}>Modifier</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Infos principales */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {current.poste && (
                <span className="badge" style={{ fontSize: '0.85rem', padding: '4px 14px',
                  color: posteColor(current.poste), borderColor: posteColor(current.poste) + '55',
                  background: posteColor(current.poste) + '15' }}>
                  {current.poste}
                </span>
              )}
              {current.nationalite && <span className="badge">🌍 {current.nationalite}</span>}
              {current.age && <span className="badge">{current.age} ans</span>}
              {current.surnom && <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>"{current.surnom}"</span>}
            </div>

            {current.caracteristiques_design && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '6px' }}>Design physique</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{current.caracteristiques_design}</p>
              </div>
            )}

            {current.style_personnalite && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '6px' }}>Personnalité</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{current.style_personnalite}</p>
              </div>
            )}

            {/* ── CARRIÈRE / CLUBS ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="detail-section-title">Carrière — Clubs</div>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setShowAjoutForm(v => !v); setAjoutForm(emptyAjout) }}>
                  {showAjoutForm ? 'Annuler' : '+ Ajouter à une équipe'}
                </button>
              </div>

              {/* Formulaire ajout équipe */}
              {showAjoutForm && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--accent)',
                  borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Équipe *</label>
                      <select className="form-select" value={ajoutForm.equipe_id}
                        onChange={e => setAjoutForm(f => ({ ...f, equipe_id: e.target.value }))}>
                        <option value="">— Sélectionner —</option>
                        {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Catégorie *</label>
                      <select className="form-select" value={ajoutForm.categorie}
                        onChange={e => setAjoutForm(f => ({ ...f, categorie: e.target.value }))}>
                        <option value="">— Sélectionner —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Année début *</label>
                      <input className="form-input" type="number" placeholder="ex: 2024"
                        value={ajoutForm.annee_debut}
                        onChange={e => setAjoutForm(f => ({ ...f, annee_debut: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Année fin *</label>
                      <input className="form-input" type="number" placeholder="ex: 2025"
                        value={ajoutForm.annee_fin}
                        onChange={e => setAjoutForm(f => ({ ...f, annee_fin: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">N° maillot</label>
                      <input className="form-input" type="number" placeholder="ex: 10"
                        value={ajoutForm.numero_maillot}
                        onChange={e => setAjoutForm(f => ({ ...f, numero_maillot: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={submitAjout} disabled={ajoutSaving}>
                    {ajoutSaving ? 'Ajout...' : 'Confirmer l\'ajout'}
                  </button>
                </div>
              )}

              {/* Historique des clubs */}
              {clubHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', fontStyle: 'italic' }}>
                  Ce joueur n'a encore été assigné à aucune équipe.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {clubHistory.map(sj => {
                    const s = sj.saisons
                    const eq = s?.equipes
                    return (
                      <div key={sj.id} style={{ display: 'flex', alignItems: 'center', gap: '12px',
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '10px 14px' }}>
                        {/* Couleurs équipe */}
                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: eq?.couleur_principale || '#444' }} />
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: eq?.couleur_secondaire || '#888' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{eq?.nom || 'Équipe inconnue'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                              {s?.annee_debut}–{s?.annee_fin}
                            </span>
                            {s?.categorie && (
                              <span className="badge" style={{ fontSize: '0.65rem', padding: '1px 7px' }}>{s.categorie}</span>
                            )}
                            {sj.numero_maillot != null && (
                              <span style={{ color: 'var(--accent2)' }}>#{sj.numero_maillot}</span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => retirerDuClub(sj.id)} title="Retirer de cette équipe"
                          style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                          onMouseEnter={e => e.target.style.color = 'var(--danger)'}
                          onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {current.notes && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '6px' }}>Notes</div>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{current.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
