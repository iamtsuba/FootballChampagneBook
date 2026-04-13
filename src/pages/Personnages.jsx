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

const COULEURS_CHEVEUX = ['Chauve', 'Noir', 'Marron', 'Blond', 'Roux', 'Gris', 'Blanc', 'Coloré']
const COULEURS_YEUX    = ['Bleu', 'Vert', 'Marron', 'Noir', 'Gris', 'Noisette']
const TYPES_COIFFURE   = ['Chauve', 'Rasé', 'Court', 'Mi-long', 'Long']
const TYPES_NEZ        = ['Petit', 'Normal', 'Grand', 'Aquilin', 'Retroussé', 'Épaté']
const MORPHOLOGIES     = ['Costaud', 'Musclé', 'Athlétique', 'Fin', 'Mince', 'Enrobé', 'Grand et fin', 'Petit et trapu']
const PEAUX            = ['Noir', 'Blanc', 'Métisse', 'Méditerranéen', 'Asiatique']

const empty = {
  nom: '', prenom: '', surnom: '', annee_naissance: '', nationalite: '', poste: '',
  taille_u15: '', taille_u18: '', taille_senior: '',
  couleur_cheveux: '', couleur_yeux: '', type_coiffure: '', style_coiffure: '',
  type_nez: '', lunettes: false, morphologie: '', peau: '',
  caracteristiques_design: '', style_personnalite: '', notes: '', avatar_url: ''
}
const emptyAjout = { equipe_id: '', categorie: '', annee_debut: '', annee_fin: '', numero_maillot: '' }

export default function Personnages() {
  const [data, setData]           = useState([])
  const [equipes, setEquipes]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterPoste, setFilterPoste] = useState('')
  const [modal, setModal]         = useState(null)
  const [current, setCurrent]     = useState(empty)
  const [saving, setSaving]       = useState(false)
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
  async function loadClubHistory(id) {
    const { data: rows } = await supabase
      .from('saison_joueurs')
      .select('*, saisons(annee_debut, annee_fin, categorie, equipes(id, nom, couleur_principale, couleur_secondaire))')
      .eq('personnage_id', id)
    setClubHistory(rows || [])
  }
  useEffect(() => { load(); loadEquipes() }, [])

  function set(field, val) { setCurrent(c => ({ ...c, [field]: val })) }

  async function save() {
    setSaving(true)
    const payload = {
      ...current,
      annee_naissance: current.annee_naissance ? parseInt(current.annee_naissance) : null,
      taille_u15: current.taille_u15 ? parseInt(current.taille_u15) : null,
      taille_u18: current.taille_u18 ? parseInt(current.taille_u18) : null,
      taille_senior: current.taille_senior ? parseInt(current.taille_senior) : null,
    }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = modal === 'create'
      ? await supabase.from('personnages').insert(payload)
      : await supabase.from('personnages').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast(modal === 'create' ? 'Personnage créé ✓' : 'Mis à jour ✓')
    setModal(null); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce personnage ?')) return
    await supabase.from('personnages').delete().eq('id', id)
    toast('Supprimé'); load()
  }

  async function openFiche(p) {
    setCurrent(p)
    await loadClubHistory(p.id)
    setShowAjoutForm(false); setAjoutForm(emptyAjout); setModal('fiche')
  }

  async function submitAjout() {
    if (!ajoutForm.equipe_id || !ajoutForm.categorie || !ajoutForm.annee_debut || !ajoutForm.annee_fin) {
      toast('Remplis tous les champs obligatoires', 'error'); return
    }
    setAjoutSaving(true)
    let { data: ex } = await supabase.from('saisons').select('id')
      .eq('equipe_id', ajoutForm.equipe_id)
      .eq('annee_debut', parseInt(ajoutForm.annee_debut))
      .eq('annee_fin', parseInt(ajoutForm.annee_fin))
      .eq('categorie', ajoutForm.categorie)
      .maybeSingle()
    let saisonId = ex?.id
    if (!saisonId) {
      const { data: ns, error: e } = await supabase.from('saisons')
        .insert({ equipe_id: ajoutForm.equipe_id, annee_debut: parseInt(ajoutForm.annee_debut), annee_fin: parseInt(ajoutForm.annee_fin), categorie: ajoutForm.categorie })
        .select('id').single()
      if (e) { toast('Erreur création saison', 'error'); setAjoutSaving(false); return }
      saisonId = ns.id
    }
    const { data: deja } = await supabase.from('saison_joueurs').select('id')
      .eq('saison_id', saisonId).eq('personnage_id', current.id).maybeSingle()
    if (deja) { toast('Déjà dans cette saison', 'error'); setAjoutSaving(false); return }
    const { error } = await supabase.from('saison_joueurs').insert({
      saison_id: saisonId, personnage_id: current.id,
      numero_maillot: ajoutForm.numero_maillot ? parseInt(ajoutForm.numero_maillot) : null
    })
    setAjoutSaving(false)
    if (error) { toast('Erreur', 'error'); return }
    toast('Joueur ajouté ✓')
    setShowAjoutForm(false); setAjoutForm(emptyAjout); loadClubHistory(current.id)
  }

  async function retirerDuClub(sjId) {
    if (!confirm('Retirer de cette équipe/saison ?')) return
    await supabase.from('saison_joueurs').delete().eq('id', sjId)
    toast('Retiré ✓'); loadClubHistory(current.id)
  }

  const filtered = data.filter(p => {
    const s = `${p.nom} ${p.prenom} ${p.surnom || ''}`.toLowerCase()
    return s.includes(search.toLowerCase()) && (!filterPoste || p.poste === filterPoste)
  })

  const pc = (poste) => POSTE_COLORS[poste] || 'var(--text-muted)'

  // ── SECTION helpers ──
  const SectionTitle = ({ children }) => (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em',
      color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px',
      paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  )

  const SelectField = ({ label, field, options, placeholder = '— Sélectionner —' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-select" value={current[field] || ''}
        onChange={e => set(field, e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

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
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ minWidth: '180px' }}
          value={filterPoste} onChange={e => setFilterPoste(e.target.value)}>
          <option value="">Tous les postes</option>
          {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {filterPoste && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFilterPoste('')}>✕ Effacer</button>
        )}
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Chargement...</p>
        : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">◉</div><h3>Aucun personnage</h3></div>
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
                    <span className="badge" style={{ color: pc(p.poste), borderColor: pc(p.poste)+'44', background: pc(p.poste)+'11' }}>
                      {p.poste}
                    </span>
                  )}
                </div>
                <div className="card-meta" style={{ marginTop: '8px' }}>
                  {p.nationalite && <span>🌍 {p.nationalite}</span>}
                  {p.annee_naissance && <span>né en {p.annee_naissance}</span>}
                  {p.morphologie && <span>{p.morphologie}</span>}
                </div>
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
          title={modal === 'create' ? 'NOUVEAU PERSONNAGE' : `MODIFIER — ${current.prenom} ${current.nom}`}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </>}
        >
          {/* ── Identité ── */}
          <SectionTitle>Identité</SectionTitle>
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="form-input" value={current.prenom} onChange={e => set('prenom', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="form-input" value={current.nom} onChange={e => set('nom', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Surnom</label>
              <input className="form-input" value={current.surnom} onChange={e => set('surnom', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Poste</label>
              <select className="form-select" value={current.poste} onChange={e => set('poste', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Année de naissance</label>
              <input className="form-input" type="number" placeholder="ex: 1991" value={current.annee_naissance || ''} onChange={e => set('annee_naissance', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nationalité</label>
              <input className="form-input" value={current.nationalite} onChange={e => set('nationalite', e.target.value)} />
            </div>
          </div>

          {/* ── Tailles ── */}
          <SectionTitle>Tailles (cm)</SectionTitle>
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Taille U15</label>
              <input className="form-input" type="number" placeholder="ex: 165" value={current.taille_u15 || ''} onChange={e => set('taille_u15', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Taille U18</label>
              <input className="form-input" type="number" placeholder="ex: 175" value={current.taille_u18 || ''} onChange={e => set('taille_u18', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Taille Senior</label>
              <input className="form-input" type="number" placeholder="ex: 180" value={current.taille_senior || ''} onChange={e => set('taille_senior', e.target.value)} />
            </div>
          </div>

          {/* ── Apparence ── */}
          <SectionTitle>Apparence physique</SectionTitle>
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <SelectField label="Morphologie" field="morphologie" options={MORPHOLOGIES} />
            <SelectField label="Couleur de peau" field="peau" options={PEAUX} />
            <SelectField label="Couleur cheveux" field="couleur_cheveux" options={COULEURS_CHEVEUX} />
            <SelectField label="Type de coiffure" field="type_coiffure" options={TYPES_COIFFURE} />
            <div className="form-group">
              <label className="form-label">Style de coiffure <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(libre)</span></label>
              <input className="form-input" placeholder="ex: Dreadlocks, tresse, afro..." value={current.style_coiffure || ''} onChange={e => set('style_coiffure', e.target.value)} />
            </div>
            <SelectField label="Couleur des yeux" field="couleur_yeux" options={COULEURS_YEUX} />
            <SelectField label="Type de nez" field="type_nez" options={TYPES_NEZ} />
            <div className="form-group">
              <label className="form-label">Lunettes</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                {[{ val: false, label: 'Non' }, { val: true, label: 'Oui' }].map(opt => (
                  <label key={String(opt.val)} style={{ display: 'flex', alignItems: 'center', gap: '6px',
                    cursor: 'pointer', fontSize: '0.87rem', color: current.lunettes === opt.val ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <input type="radio" name="lunettes" checked={current.lunettes === opt.val}
                      onChange={() => set('lunettes', opt.val)}
                      style={{ accentColor: 'var(--accent)' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Description & Personnalité ── */}
          <SectionTitle>Description & Personnalité</SectionTitle>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Description physique complémentaire</label>
              <textarea className="form-textarea" rows={3}
                placeholder="Détails supplémentaires : cicatrices, tatouages, traits distinctifs, style vestimentaire..."
                value={current.caracteristiques_design || ''} onChange={e => set('caracteristiques_design', e.target.value)} />
            </div>
            <div className="form-group full">
              <label className="form-label">Personnalité <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea className="form-textarea" rows={3}
                placeholder="Traits de caractère, motivations, forces et faiblesses..."
                value={current.style_personnalite || ''} onChange={e => set('style_personnalite', e.target.value)} />
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={current.notes || ''} onChange={e => set('notes', e.target.value)} />
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

            {/* Badges identité */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {current.poste && (
                <span className="badge" style={{ fontSize: '0.85rem', padding: '4px 14px',
                  color: pc(current.poste), borderColor: pc(current.poste)+'55', background: pc(current.poste)+'15' }}>
                  {current.poste}
                </span>
              )}
              {current.nationalite && <span className="badge">🌍 {current.nationalite}</span>}
              {current.annee_naissance && <span className="badge">né en {current.annee_naissance}</span>}
              {current.surnom && <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>"{current.surnom}"</span>}
            </div>

            {/* Tailles */}
            {(current.taille_u15 || current.taille_u18 || current.taille_senior) && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>📏 Tailles</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {current.taille_u15 && (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#3b82f6' }}>{current.taille_u15}<span style={{ fontSize: '0.7rem' }}>cm</span></div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>U15</div>
                    </div>
                  )}
                  {current.taille_u18 && (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#10b981' }}>{current.taille_u18}<span style={{ fontSize: '0.7rem' }}>cm</span></div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>U18</div>
                    </div>
                  )}
                  {current.taille_senior && (
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--accent)' }}>{current.taille_senior}<span style={{ fontSize: '0.7rem' }}>cm</span></div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SENIOR</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Apparence */}
            {(current.morphologie || current.couleur_cheveux || current.couleur_yeux || current.type_coiffure || current.type_nez) && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>👤 Apparence</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {current.morphologie    && <span className="badge badge-accent">{current.morphologie}</span>}
                  {current.peau           && <span className="badge badge-accent">Peau {current.peau}</span>}
                  {current.couleur_cheveux && <span className="badge">Cheveux {current.couleur_cheveux}</span>}
                  {current.type_coiffure  && <span className="badge">{current.type_coiffure}</span>}
                  {current.style_coiffure && <span className="badge">{current.style_coiffure}</span>}
                  {current.couleur_yeux   && <span className="badge">Yeux {current.couleur_yeux}</span>}
                  {current.type_nez       && <span className="badge">Nez {current.type_nez}</span>}
                  {current.lunettes       && <span className="badge badge-green">Lunettes ✓</span>}
                </div>
              </div>
            )}

            {current.caracteristiques_design && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '6px' }}>Description complémentaire</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{current.caracteristiques_design}</p>
              </div>
            )}

            {current.style_personnalite && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '6px' }}>Personnalité</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{current.style_personnalite}</p>
              </div>
            )}

            {/* ── CARRIÈRE ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="detail-section-title" style={{ marginBottom: 0 }}>⚽ Carrière — Clubs</div>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setShowAjoutForm(v => !v); setAjoutForm(emptyAjout) }}>
                  {showAjoutForm ? 'Annuler' : '+ Ajouter à une équipe'}
                </button>
              </div>

              {/* Formulaire ajout */}
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

              {/* Historique clubs */}
              {clubHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', fontStyle: 'italic' }}>
                  Aucun club — clique sur "+ Ajouter à une équipe" pour commencer.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Trie par année décroissante */}
                  {[...clubHistory]
                    .sort((a, b) => (b.saisons?.annee_debut || 0) - (a.saisons?.annee_debut || 0))
                    .map(sj => {
                      const s  = sj.saisons
                      const eq = s?.equipes
                      return (
                        <div key={sj.id} style={{ display: 'flex', alignItems: 'center', gap: '12px',
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '10px 14px',
                          borderLeft: `3px solid ${eq?.couleur_principale || 'var(--border)'}` }}>
                          {/* Couleurs */}
                          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: eq?.couleur_principale || '#444' }} />
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: eq?.couleur_secondaire || '#888' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{eq?.nom || 'Équipe inconnue'}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--accent)' }}>
                                {s?.annee_debut}–{s?.annee_fin}
                              </span>
                              {s?.categorie && (
                                <span className="badge" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{s.categorie}</span>
                              )}
                              {sj.numero_maillot != null && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--accent2)' }}>#{sj.numero_maillot}</span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => retirerDuClub(sj.id)} title="Retirer"
                            style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
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
