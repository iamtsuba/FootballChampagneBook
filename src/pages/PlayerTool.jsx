import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

const POSTES = [
  'GARDIEN',
  'DEF DROIT', 'DEF CENTRAL', 'DEF GAUCHE',
  'MIL DROIT', 'MIL DEF', 'MIL OFF', 'MIL GAUCHE',
  'AILIER DROIT', 'AILIER GAUCHE',
  'BUTEUR'
]
const CATEGORIES       = ['U13', 'U15', 'U18', 'SENIORS']
const POSTE_COLORS     = {
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

const NUMEROS_PAR_POSTE = {
  'GARDIEN':      [1, 16],
  'DEF CENTRAL':  [4, 5, 12],
  'DEF DROIT':    [2],
  'DEF GAUCHE':   [3],
  'MIL DEF':      [6, 8],
  'MIL OFF':      [10, 14],
  'MIL DROIT':    [7],
  'MIL GAUCHE':   [11],
  'AILIER DROIT': [7, 17],
  'AILIER GAUCHE':[11, 19],
  'BUTEUR':       [9, 18],
}

function assignerNumero(poste, utilises) {
  const preferred = NUMEROS_PAR_POSTE[poste] || []
  for (const n of preferred) {
    if (!utilises.has(n)) { utilises.add(n); return n }
  }
  for (let n = 18; n <= 99; n++) {
    if (!utilises.has(n)) { utilises.add(n); return n }
  }
  return null
}

function emptyJoueur(key) {
  return {
    _key: key,
    _open: true,
    prenom: '', nom: '', surnom: '', annee_naissance: '', nationalite: '', poste: '',
    taille_u15: '', taille_u18: '', taille_senior: '',
    couleur_cheveux: '', couleur_yeux: '', type_coiffure: '', style_coiffure: '',
    type_nez: '', lunettes: false, morphologie: '', peau: '',
    caracteristiques_design: '', style_personnalite: '', notes: '',
    numero_maillot: ''
  }
}

let _key = 0
const nextKey = () => ++_key

export default function PlayerTool() {
  const [equipes, setEquipes]       = useState([])
  const [equipeId, setEquipeId]     = useState('')
  const [categorie, setCategorie]   = useState('')
  const [anneeDebut, setAnneeDebut] = useState('')
  const [anneeFin, setAnneeFin]     = useState('')
  const [joueurs, setJoueurs]       = useState([emptyJoueur(nextKey())])
  const [saving, setSaving]         = useState(false)
  const toast = useToast()

  useEffect(() => {
    supabase.from('equipes').select('id, nom').order('nom')
      .then(({ data }) => setEquipes(data || []))
  }, [])

  function addJoueur() {
    setJoueurs(j => [...j, emptyJoueur(nextKey())])
  }

  function removeJoueur(key) {
    setJoueurs(j => j.filter(p => p._key !== key))
  }

  function toggleOpen(key) {
    setJoueurs(j => j.map(p => p._key === key ? { ...p, _open: !p._open } : p))
  }

  function update(key, field, value) {
    setJoueurs(j => j.map(p => p._key === key ? { ...p, [field]: value } : p))
  }

  const hasSaison = equipeId && categorie && anneeDebut && anneeFin

  async function creerTous() {
    if (!hasSaison) { toast('Sélectionne équipe, catégorie et saison', 'error'); return }
    const valid = joueurs.filter(j => j.prenom || j.nom)
    if (valid.length === 0) { toast('Ajoute au moins un joueur avec prénom ou nom', 'error'); return }

    setSaving(true)
    try {
      // 1. Trouver ou créer la saison
      let { data: ex } = await supabase.from('saisons').select('id')
        .eq('equipe_id', equipeId).eq('annee_debut', parseInt(anneeDebut))
        .eq('annee_fin', parseInt(anneeFin)).eq('categorie', categorie).maybeSingle()
      let saisonId = ex?.id
      if (!saisonId) {
        const { data: ns, error: eS } = await supabase.from('saisons')
          .insert({ equipe_id: equipeId, annee_debut: parseInt(anneeDebut), annee_fin: parseInt(anneeFin), categorie })
          .select('id').single()
        if (eS) { toast('Erreur création saison : ' + eS.message, 'error'); return }
        saisonId = ns.id
      }

      // 2. Charger les numéros déjà utilisés dans cette saison
      const { data: sjs } = await supabase.from('saison_joueurs')
        .select('numero_maillot').eq('saison_id', saisonId)
      const utilises = new Set((sjs || []).map(s => s.numero_maillot).filter(Boolean))

      // 3. Aussi réserver les numéros manuels saisis dans ce batch
      for (const j of valid) {
        if (j.numero_maillot !== '') utilises.add(parseInt(j.numero_maillot))
      }

      // 4. Créer chaque joueur
      let created = 0
      for (const j of valid) {
        const toInt = v => v !== '' && v !== null ? parseInt(v) : null
        const payload = {
          prenom: j.prenom, nom: j.nom, surnom: j.surnom || null,
          annee_naissance: toInt(j.annee_naissance), nationalite: j.nationalite || null,
          poste: j.poste || null,
          taille_u15: toInt(j.taille_u15), taille_u18: toInt(j.taille_u18), taille_senior: toInt(j.taille_senior),
          couleur_cheveux: j.couleur_cheveux || null, couleur_yeux: j.couleur_yeux || null,
          type_coiffure: j.type_coiffure || null, style_coiffure: j.style_coiffure || null,
          type_nez: j.type_nez || null, lunettes: j.lunettes,
          morphologie: j.morphologie || null, peau: j.peau || null,
          caracteristiques_design: j.caracteristiques_design || null,
          style_personnalite: j.style_personnalite || null,
          notes: j.notes || null,
        }
        const { data: p, error: eP } = await supabase.from('personnages').insert(payload).select('id').single()
        if (eP) { toast(`Erreur joueur ${j.prenom} ${j.nom} : ${eP.message}`, 'error'); continue }

        let numero = j.numero_maillot !== '' ? parseInt(j.numero_maillot) : assignerNumero(j.poste, utilises)
        await supabase.from('saison_joueurs').insert({ saison_id: saisonId, personnage_id: p.id, numero_maillot: numero })
        created++
      }

      toast(`${created} joueur${created > 1 ? 's' : ''} créé${created > 1 ? 's' : ''} ✓`)
      setJoueurs([emptyJoueur(nextKey())])
    } finally {
      setSaving(false)
    }
  }

  const pc = p => POSTE_COLORS[p] || 'var(--text-muted)'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">PLAYER TOOL</h1>
          <p className="page-subtitle">Crée plusieurs joueurs d'un coup pour une équipe et une saison</p>
        </div>
        <button className="btn btn-primary" onClick={creerTous} disabled={saving || !hasSaison}>
          {saving ? 'Création...' : `✚ Créer ${joueurs.filter(j => j.prenom || j.nom).length || ''} joueur${joueurs.filter(j => j.prenom || j.nom).length > 1 ? 's' : ''}`}
        </button>
      </div>

      {/* ── Équipe & Saison ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>
          Équipe &amp; Saison
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px', gap: '12px', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Équipe *</label>
            <select className="form-select" value={equipeId} onChange={e => setEquipeId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Catégorie *</label>
            <select className="form-select" value={categorie} onChange={e => setCategorie(e.target.value)}>
              <option value="">—</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Début *</label>
            <input className="form-input" type="number" placeholder="2024" value={anneeDebut} onChange={e => setAnneeDebut(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fin *</label>
            <input className="form-input" type="number" placeholder="2025" value={anneeFin} onChange={e => setAnneeFin(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Liste des joueurs ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {joueurs.map((j, idx) => {
          const color = j.poste ? pc(j.poste) : 'var(--text-muted)'
          return (
            <div key={j._key} style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`,
              borderLeft: `3px solid ${color}`, borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s' }}>

              {/* En-tête compact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => toggleOpen(j._key)}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-dim)', minWidth: '28px' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: (j.prenom || j.nom) ? 'var(--text)' : 'var(--text-dim)' }}>
                    {j.prenom || j.nom ? `${j.prenom} ${j.nom}`.trim() : 'Nouveau joueur'}
                  </span>
                  {j.poste && (
                    <span className="badge" style={{ color, borderColor: color+'44', background: color+'11', fontSize: '0.7rem' }}>
                      {j.poste}
                    </span>
                  )}
                  {j.annee_naissance && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>né {j.annee_naissance}</span>}
                  {j.numero_maillot && <span style={{ fontSize: '0.78rem', color: 'var(--accent2)' }}>#{j.numero_maillot}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{j._open ? '▲' : '▼'}</span>
                  <button onClick={e => { e.stopPropagation(); removeJoueur(j._key) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '1rem', lineHeight: 1, padding: '2px 6px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>✕</button>
                </div>
              </div>

              {/* Formulaire dépliable */}
              {j._open && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>

                  {/* Identité */}
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '14px 0 10px' }}>
                    Identité
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '4px' }}>
                    {[['Prénom', 'prenom'], ['Nom', 'nom'], ['Surnom', 'surnom'], ['Nationalité', 'nationalite']].map(([label, field]) => (
                      <div className="form-group" key={field} style={{ marginBottom: 0 }}>
                        <label className="form-label">{label}</label>
                        <input className="form-input" value={j[field]} onChange={e => update(j._key, field, e.target.value)} />
                      </div>
                    ))}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Année naissance</label>
                      <input className="form-input" type="number" placeholder="ex: 1995"
                        value={j.annee_naissance} onChange={e => update(j._key, 'annee_naissance', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Poste</label>
                      <select className="form-select" value={j.poste} onChange={e => update(j._key, 'poste', e.target.value)}>
                        <option value="">—</option>
                        {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">N° maillot</label>
                      <input className="form-input" type="number" placeholder="auto"
                        value={j.numero_maillot} onChange={e => update(j._key, 'numero_maillot', e.target.value)} />
                    </div>
                  </div>

                  {/* Tailles */}
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '14px 0 10px' }}>
                    Tailles (cm)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '400px', marginBottom: '4px' }}>
                    {[['U15', 'taille_u15'], ['U18', 'taille_u18'], ['Senior', 'taille_senior']].map(([label, field]) => (
                      <div className="form-group" key={field} style={{ marginBottom: 0 }}>
                        <label className="form-label">{label}</label>
                        <input className="form-input" type="number" placeholder="cm"
                          value={j[field]} onChange={e => update(j._key, field, e.target.value)} />
                      </div>
                    ))}
                  </div>

                  {/* Apparence */}
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '14px 0 10px' }}>
                    Apparence physique
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '4px' }}>
                    {[
                      ['Morphologie', 'morphologie', MORPHOLOGIES],
                      ['Peau', 'peau', PEAUX],
                      ['Couleur cheveux', 'couleur_cheveux', COULEURS_CHEVEUX],
                      ['Type coiffure', 'type_coiffure', TYPES_COIFFURE],
                      ['Couleur yeux', 'couleur_yeux', COULEURS_YEUX],
                      ['Type nez', 'type_nez', TYPES_NEZ],
                    ].map(([label, field, options]) => (
                      <div className="form-group" key={field} style={{ marginBottom: 0 }}>
                        <label className="form-label">{label}</label>
                        <select className="form-select" value={j[field]} onChange={e => update(j._key, field, e.target.value)}>
                          <option value="">—</option>
                          {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Style coiffure</label>
                      <input className="form-input" placeholder="Dreadlocks, afro..."
                        value={j.style_coiffure} onChange={e => update(j._key, 'style_coiffure', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Lunettes</label>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        {[{ val: false, label: 'Non' }, { val: true, label: 'Oui' }].map(opt => (
                          <label key={String(opt.val)} style={{ display: 'flex', alignItems: 'center', gap: '5px',
                            cursor: 'pointer', fontSize: '0.85rem',
                            color: j.lunettes === opt.val ? 'var(--accent)' : 'var(--text-muted)' }}>
                            <input type="radio" checked={j.lunettes === opt.val}
                              onChange={() => update(j._key, 'lunettes', opt.val)}
                              style={{ accentColor: 'var(--accent)' }} />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', margin: '14px 0 10px' }}>
                    Description & Notes
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Description physique complémentaire</label>
                      <textarea className="form-textarea" rows={2}
                        value={j.caracteristiques_design} onChange={e => update(j._key, 'caracteristiques_design', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Personnalité</label>
                      <textarea className="form-textarea" rows={2}
                        value={j.style_personnalite} onChange={e => update(j._key, 'style_personnalite', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                      <label className="form-label">Notes</label>
                      <textarea className="form-textarea" rows={2}
                        value={j.notes} onChange={e => update(j._key, 'notes', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bouton ajouter ── */}
      <button className="btn btn-secondary" onClick={addJoueur}
        style={{ width: '100%', justifyContent: 'center', border: '1px dashed var(--border)', marginBottom: '24px' }}>
        + Ajouter un joueur
      </button>

      {/* ── Bouton créer ── */}
      {joueurs.some(j => j.prenom || j.nom) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 32px' }}
            onClick={creerTous} disabled={saving || !hasSaison}>
            {saving ? 'Création en cours...' : `✚ Créer ${joueurs.filter(j => j.prenom || j.nom).length} joueur${joueurs.filter(j => j.prenom || j.nom).length > 1 ? 's' : ''} dans l'équipe`}
          </button>
        </div>
      )}

      {!hasSaison && (
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '12px' }}>
          ⚠️ Sélectionne une équipe, une catégorie et une saison pour pouvoir créer les joueurs.
        </p>
      )}
    </div>
  )
}
