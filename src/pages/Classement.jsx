import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']
const CAT_COLORS = { 'U13': '#3b82f6', 'U15': '#10b981', 'U18': '#f59e0b', 'SENIORS': '#e8ff3a' }

function emptyLignes() {
  return Array.from({ length: 8 }, (_, i) => ({
    position: i + 1, equipe_id: '', equipe_nom: '', equipe_couleur: '',
    points: '', v: '', n: '', d: '', bp: '', bc: ''
  }))
}

export default function Classement() {
  const [selectedCat, setSelectedCat] = useState('SENIORS')
  const [anneeDebut, setAnneeDebut]   = useState('')
  const [anneeFin, setAnneeFin]       = useState('')
  const [lignes, setLignes]           = useState(emptyLignes())
  const [equipes, setEquipes]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [classementId, setClassementId] = useState(null)
  const toast = useToast()

  useEffect(() => {
    supabase.from('equipes').select('id, nom, couleur_principale').order('nom')
      .then(({ data }) => setEquipes(data || []))
  }, [])

  async function load() {
    if (!anneeDebut || !anneeFin) { setLignes(emptyLignes()); setClassementId(null); return }
    setLoading(true)
    const { data } = await supabase.from('classements').select('*')
      .eq('categorie', selectedCat)
      .eq('annee_debut', parseInt(anneeDebut))
      .eq('annee_fin', parseInt(anneeFin))
      .maybeSingle()
    if (data) {
      setClassementId(data.id)
      const saved = data.lignes || []
      setLignes(Array.from({ length: 8 }, (_, i) => {
        const f = saved.find(l => l.position === i + 1)
        return f || { position: i + 1, equipe_id: '', equipe_nom: '', equipe_couleur: '', points: '', v: '', n: '', d: '', bp: '', bc: '' }
      }))
    } else {
      setClassementId(null)
      setLignes(emptyLignes())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedCat, anneeDebut, anneeFin])

  function updateLigne(position, field, value) {
    setLignes(prev => prev.map(l => {
      if (l.position !== position) return l
      if (field === 'equipe_id') {
        const eq = equipes.find(e => e.id === value)
        return { ...l, equipe_id: value, equipe_nom: eq?.nom || '', equipe_couleur: eq?.couleur_principale || '' }
      }
      return { ...l, [field]: value }
    }))
  }

  async function save() {
    if (!anneeDebut || !anneeFin) { toast('Saisis une saison', 'error'); return }
    setSaving(true)
    const toInt = v => v !== '' && v !== null ? parseInt(v) : null
    const lignesFiltered = lignes.map(l => ({
      position: l.position,
      equipe_id: l.equipe_id || null,
      equipe_nom: l.equipe_nom || '',
      equipe_couleur: l.equipe_couleur || '',
      points: toInt(l.points), v: toInt(l.v), n: toInt(l.n), d: toInt(l.d),
      bp: toInt(l.bp), bc: toInt(l.bc)
    }))
    const payload = {
      categorie: selectedCat, annee_debut: parseInt(anneeDebut), annee_fin: parseInt(anneeFin),
      lignes: lignesFiltered
    }
    const { error } = classementId
      ? await supabase.from('classements').update(payload).eq('id', classementId)
      : await supabase.from('classements').insert(payload)
    setSaving(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast('Classement sauvegardé ✓')
    load()
  }

  const getDiff = l => {
    if (l.bp === '' || l.bc === '' || l.bp === null || l.bc === null) return null
    return parseInt(l.bp) - parseInt(l.bc)
  }

  const catColor = CAT_COLORS[selectedCat]
  const hasSaison = anneeDebut && anneeFin

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CLASSEMENTS</h1>
          <p className="page-subtitle">Championnats par catégorie et saison — Top 8</p>
        </div>
        {hasSaison && (
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        )}
      </div>

      {/* Onglets catégories */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat)}
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.06em',
              padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer',
              color: selectedCat === cat ? CAT_COLORS[cat] : 'var(--text-muted)',
              borderBottom: `3px solid ${selectedCat === cat ? CAT_COLORS[cat] : 'transparent'}`,
              transition: 'all 0.15s', marginBottom: '-1px' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Saison */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Saison</span>
        <input className="form-input" type="number" placeholder="2024" style={{ width: '100px' }}
          value={anneeDebut} onChange={e => setAnneeDebut(e.target.value)} />
        <span style={{ color: 'var(--text-dim)' }}>–</span>
        <input className="form-input" type="number" placeholder="2025" style={{ width: '100px' }}
          value={anneeFin} onChange={e => setAnneeFin(e.target.value)} />
      </div>

      {!hasSaison ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <h3>Sélectionne une saison</h3>
          <p>Saisis les années de début et de fin pour afficher ou créer un classement.</p>
        </div>
      ) : loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '20px' }}>Chargement...</p>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>

          {/* En-tête tableau */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 60px 44px 44px 44px 60px 60px 60px',
            gap: '0', padding: '10px 16px', background: 'var(--bg)',
            borderBottom: '2px solid var(--border)', fontSize: '0.65rem',
            textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
            <span style={{ textAlign: 'center' }}>#</span>
            <span>Équipe</span>
            <span style={{ textAlign: 'center' }}>Pts</span>
            <span style={{ textAlign: 'center' }}>V</span>
            <span style={{ textAlign: 'center' }}>N</span>
            <span style={{ textAlign: 'center' }}>D</span>
            <span style={{ textAlign: 'center' }}>BP</span>
            <span style={{ textAlign: 'center' }}>BC</span>
            <span style={{ textAlign: 'center' }}>Diff</span>
          </div>

          {/* Lignes */}
          {lignes.map((l, idx) => {
            const diff = getDiff(l)
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
            const isZone = idx <= 1  // top 2 : podium zone
            const couleur = l.equipe_couleur || catColor
            return (
              <div key={l.position} style={{
                display: 'grid', gridTemplateColumns: '44px 1fr 60px 44px 44px 44px 60px 60px 60px',
                gap: '0', padding: '8px 16px', alignItems: 'center',
                borderBottom: idx < 7 ? '1px solid var(--border)' : 'none',
                background: l.equipe_id
                  ? (isZone ? couleur + '0a' : 'transparent')
                  : 'transparent',
                borderLeft: l.equipe_id ? `3px solid ${couleur}` : '3px solid transparent',
                transition: 'all 0.15s'
              }}>
                {/* Position */}
                <div style={{ textAlign: 'center' }}>
                  {medal
                    ? <span style={{ fontSize: '1.1rem' }}>{medal}</span>
                    : <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem',
                        color: l.equipe_id ? catColor : 'var(--text-dim)' }}>{l.position}</span>
                  }
                </div>

                {/* Équipe selector */}
                <div style={{ paddingRight: '12px' }}>
                  <select style={{ width: '100%', background: 'transparent', border: 'none',
                    color: l.equipe_id ? 'var(--text)' : 'var(--text-dim)', fontSize: '0.88rem',
                    fontWeight: l.equipe_id ? 700 : 400, cursor: 'pointer', outline: 'none',
                    padding: '4px 0' }}
                    value={l.equipe_id}
                    onChange={e => updateLigne(l.position, 'equipe_id', e.target.value)}>
                    <option value="">— Équipe —</option>
                    {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
                  </select>
                </div>

                {/* Stats */}
                {['points', 'v', 'n', 'd', 'bp', 'bc'].map(field => (
                  <div key={field} style={{ textAlign: 'center' }}>
                    <input type="number" min="0"
                      style={{ width: '100%', background: 'transparent', border: 'none',
                        color: field === 'points' ? catColor : 'var(--text-muted)',
                        fontFamily: field === 'points' ? 'var(--font-display)' : 'inherit',
                        fontSize: field === 'points' ? '1rem' : '0.85rem',
                        fontWeight: field === 'points' ? 700 : 400,
                        textAlign: 'center', outline: 'none', padding: '4px 0',
                        cursor: 'text' }}
                      value={l[field]}
                      onChange={e => updateLigne(l.position, field, e.target.value)} />
                  </div>
                ))}

                {/* Diff (calculée) */}
                <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                  color: diff === null ? 'var(--text-dim)' : diff > 0 ? '#3affb8' : diff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                  {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
