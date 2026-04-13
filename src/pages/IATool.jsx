import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']

const PAYS_PAR_REGION = [
  { region: 'Europe', pays: ['France', 'Espagne', 'Portugal', 'Italie', 'Allemagne', 'Angleterre', 'Pays-Bas', 'Belgique', 'Suisse', 'Croatie', 'Serbie', 'Pologne', 'Danemark', 'Suède', 'Autriche', 'Turquie', 'Grèce', 'Ukraine'] },
  { region: 'Afrique', pays: ['Sénégal', "Côte d'Ivoire", 'Maroc', 'Cameroun', 'Nigeria', 'Mali', 'Guinée', 'Ghana', 'Algérie', 'Tunisie', 'RD Congo', 'Gabon', 'Madagascar'] },
  { region: 'Amér. du Sud', pays: ['Brésil', 'Argentine', 'Colombie', 'Uruguay', 'Chili', 'Équateur', 'Venezuela', 'Paraguay', 'Pérou'] },
  { region: 'Amér. Nord/C.', pays: ['USA', 'Mexique', 'Canada', 'Costa Rica', 'Jamaïque'] },
  { region: 'Asie / Océanie', pays: ['Japon', 'Corée du Sud', 'Iran', 'Arabie Saoudite', 'Australie', 'Chine'] },
]

const ANNEES_PAR_DECENNIE = [
  { decennie: '2010–2015', annees: [2015, 2014, 2013, 2012, 2011, 2010] },
  { decennie: '2000–2009', annees: [2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000] },
  { decennie: '1990–1999', annees: [1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990] },
  { decennie: '1980–1989', annees: [1989, 1988, 1987, 1986, 1985, 1984, 1983, 1982, 1981, 1980] },
]

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
  'AILIER GAUCHE':[11, 15],
  'BUTEUR':       [9, 13],
}

function assignerNumero(poste, numerosUtilises) {
  for (const n of (NUMEROS_PAR_POSTE[poste] || [])) {
    if (!numerosUtilises.has(n)) { numerosUtilises.add(n); return n }
  }
  let n = 18
  while (numerosUtilises.has(n)) n++
  numerosUtilises.add(n)
  return n
}

const POSTES = [
  'GARDIEN', 'DEF DROIT', 'DEF CENTRAL', 'DEF GAUCHE',
  'MIL DROIT', 'MIL DEF', 'MIL OFF', 'MIL GAUCHE',
  'AILIER DROIT', 'AILIER GAUCHE', 'BUTEUR'
]

const POSTE_COLORS = {
  'GARDIEN': '#f59e0b',
  'DEF DROIT': '#3b82f6', 'DEF CENTRAL': '#3b82f6', 'DEF GAUCHE': '#3b82f6',
  'MIL DROIT': '#10b981', 'MIL DEF': '#10b981', 'MIL OFF': '#10b981', 'MIL GAUCHE': '#10b981',
  'AILIER DROIT': '#e8ff3a', 'AILIER GAUCHE': '#e8ff3a',
  'BUTEUR': '#ef4444'
}

const POSTE_GROUPS = [
  { label: 'Gardiens', postes: ['GARDIEN'] },
  { label: 'Défenseurs', postes: ['DEF DROIT', 'DEF CENTRAL', 'DEF GAUCHE'] },
  { label: 'Milieux', postes: ['MIL DROIT', 'MIL DEF', 'MIL OFF', 'MIL GAUCHE'] },
  { label: 'Attaquants', postes: ['AILIER DROIT', 'AILIER GAUCHE', 'BUTEUR'] },
]

export default function IATool() {
  const [equipes, setEquipes]         = useState([])
  const [equipeId, setEquipeId]       = useState('')
  const [categorie, setCategorie]     = useState('')
  const [anneeDebut, setAnneeDebut]   = useState('')
  const [anneeFin, setAnneeFin]       = useState('')
  const [effectifActuel, setEffectifActuel] = useState([])
  const [loadingEffectif, setLoadingEffectif] = useState(false)

  // Sélection des postes à générer : { poste: count }
  const [selection, setSelection]     = useState({})

  const [paysSelectionnes, setPaysSelectionnes] = useState([])
  const [anneesNaissanceSelectionnees, setAnneesNaissanceSelectionnees] = useState([])

  const [generating, setGenerating]   = useState(false)
  const [progress, setProgress]       = useState([])   // messages de progression
  const [generated, setGenerated]     = useState([])   // joueurs générés (preview)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  const toast = useToast()

  useEffect(() => {
    supabase.from('equipes').select('id, nom, couleur_principale').order('nom')
      .then(({ data }) => setEquipes(data || []))
  }, [])

  async function loadEffectif() {
    if (!equipeId || !categorie || !anneeDebut || !anneeFin) return
    setLoadingEffectif(true)
    const { data: saison } = await supabase.from('saisons').select('id')
      .eq('equipe_id', equipeId).eq('annee_debut', parseInt(anneeDebut))
      .eq('annee_fin', parseInt(anneeFin)).eq('categorie', categorie).maybeSingle()
    if (saison) {
      const { data: joueurs } = await supabase.from('saison_joueurs')
        .select('*, personnages(prenom, nom, poste)')
        .eq('saison_id', saison.id)
      setEffectifActuel(joueurs || [])
    } else {
      setEffectifActuel([])
    }
    setLoadingEffectif(false)
  }

  useEffect(() => { loadEffectif() }, [equipeId, categorie, anneeDebut, anneeFin])

  function togglePays(pays) {
    setPaysSelectionnes(prev =>
      prev.includes(pays) ? prev.filter(p => p !== pays) : [...prev, pays]
    )
  }

  function toggleAnnee(annee) {
    setAnneesNaissanceSelectionnees(prev =>
      prev.includes(annee) ? prev.filter(a => a !== annee) : [...prev, annee]
    )
  }

  function setCount(poste, delta) {
    setSelection(prev => {
      const cur = prev[poste] || 0
      const next = Math.max(0, cur + delta)
      if (next === 0) { const { [poste]: _, ...rest } = prev; return rest }
      return { ...prev, [poste]: next }
    })
  }

  const totalAGenerer = Object.values(selection).reduce((a, b) => a + b, 0)

  const equipeSelectionnee = equipes.find(e => e.id === equipeId)

  // ── GENERATION IA ──
  async function generer() {
    if (!equipeId || !categorie || !anneeDebut || !anneeFin) {
      toast('Sélectionne une équipe, une catégorie et une saison', 'error'); return
    }
    if (totalAGenerer === 0) {
      toast('Sélectionne au moins un poste à générer', 'error'); return
    }

    setGenerating(true)
    setProgress([])
    setGenerated([])
    setSaved(false)

    const postesListe = Object.entries(selection)
      .flatMap(([poste, count]) => Array(count).fill(poste))

    const equipeNom = equipeSelectionnee?.nom || 'équipe inconnue'

    const addProgress = (msg, type = 'info') => {
      setProgress(prev => [...prev, { msg, type, id: Date.now() + Math.random() }])
    }

    addProgress(`Connexion à l'IA...`)
    addProgress(`Génération de ${totalAGenerer} joueur(s) pour ${equipeNom} — ${categorie} ${anneeDebut}/${anneeFin}`)

    try {
      const prompt = `Tu es un générateur de personnages pour un roman de football fictif.
Génère exactement ${totalAGenerer} joueurs de football avec les postes suivants : ${postesListe.join(', ')}.

Contexte : équipe "${equipeNom}", catégorie "${categorie}", saison ${anneeDebut}-${anneeFin}.

Pour chaque joueur, génère des données RÉALISTES et VARIÉES (physiques différents).
${paysSelectionnes.length > 0
  ? `Nationalités : utilise UNIQUEMENT des joueurs originaires de ces pays (répartis de façon variée) : ${paysSelectionnes.join(', ')}.`
  : 'Nationalités mélangées et variées (pas que des français).'}
${anneesNaissanceSelectionnees.length > 0
  ? `Années de naissance : chaque joueur doit avoir annee_naissance parmi ces valeurs (répartis de façon variée) : ${[...anneesNaissanceSelectionnees].sort().join(', ')}.`
  : ''}
Adapte les tailles à la catégorie : ${categorie === 'U13' ? '13 ans (~148-162cm)' : categorie === 'U15' ? '15 ans (~158-175cm)' : categorie === 'U18' ? '18 ans (~168-185cm)' : 'seniors (~170-195cm)'}.

Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte avant ou après, sans balises markdown.
Format exact pour chaque joueur :
{
  "prenom": "string",
  "nom": "string",
  "surnom": "string ou null",
  "poste": "exactement l'un de : GARDIEN, DEF DROIT, DEF CENTRAL, DEF GAUCHE, MIL DROIT, MIL DEF, MIL OFF, MIL GAUCHE, AILIER DROIT, AILIER GAUCHE, BUTEUR",
  "nationalite": "string",
  "annee_naissance": number (année de naissance, ex: 1991),
  "peau": "exactement l'un de : Noir, Blanc, Métisse, Méditerranéen, Asiatique",
  "morphologie": "exactement l'un de : Costaud, Musclé, Athlétique, Fin, Mince, Enrobé, Grand et fin, Petit et trapu",
  "couleur_cheveux": "exactement l'un de : Chauve, Noir, Marron, Blond, Roux, Gris, Blanc, Coloré",
  "type_coiffure": "exactement l'un de : Chauve, Rasé, Court, Mi-long, Long",
  "style_coiffure": "string libre ou null",
  "couleur_yeux": "exactement l'un de : Bleu, Vert, Marron, Noir, Gris, Noisette",
  "type_nez": "exactement l'un de : Petit, Normal, Grand, Aquilin, Retroussé, Épaté",
  "lunettes": false,
  "taille_u15": ${categorie === 'U15' ? 'number (cm)' : 'null'},
  "taille_u18": ${categorie === 'U18' ? 'number (cm)' : 'null'},
  "taille_senior": ${categorie === 'SENIORS' ? 'number (cm)' : 'null'},
  "caracteristiques_design": "2-3 phrases décrivant les traits distinctifs du visage et du style",
  "style_personnalite": "2-3 phrases sur le caractère et le style de jeu",
  "notes": null
}

Les postes dans le JSON doivent correspondre EXACTEMENT à cette liste dans cet ordre : ${postesListe.join(', ')}.
Génère exactement ${totalAGenerer} objets dans le tableau.`

      addProgress('Génération en cours...')

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json()

      if (data.error) {
        addProgress('Erreur API : ' + data.error.message, 'error')
        setGenerating(false); return
      }

      const text = data.content?.find(b => b.type === 'text')?.text || ''

      // Parse JSON
      let joueurs = []
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        joueurs = JSON.parse(clean)
        if (!Array.isArray(joueurs)) throw new Error('Pas un tableau')
      } catch (e) {
        addProgress('Erreur de parsing JSON — réessaie', 'error')
        setGenerating(false); return
      }

      addProgress(`✓ ${joueurs.length} joueur(s) générés avec succès !`, 'success')
      joueurs.forEach(j => addProgress(`→ ${j.prenom} ${j.nom} — ${j.poste}`, 'player'))
      setGenerated(joueurs)

    } catch (err) {
      addProgress('Erreur réseau : ' + err.message, 'error')
    }

    setGenerating(false)
  }

  // ── SAUVEGARDE EN BASE ──
  async function sauvegarder() {
    if (generated.length === 0) return
    setSaving(true)

    // 1. Trouve ou crée la saison
    let { data: saisonEx } = await supabase.from('saisons').select('id')
      .eq('equipe_id', equipeId).eq('annee_debut', parseInt(anneeDebut))
      .eq('annee_fin', parseInt(anneeFin)).eq('categorie', categorie).maybeSingle()

    let saisonId = saisonEx?.id
    if (!saisonId) {
      const { data: ns } = await supabase.from('saisons')
        .insert({ equipe_id: equipeId, annee_debut: parseInt(anneeDebut), annee_fin: parseInt(anneeFin), categorie })
        .select('id').single()
      saisonId = ns?.id
    }

    if (!saisonId) { toast('Erreur création saison', 'error'); setSaving(false); return }

    // Charger les numéros déjà utilisés dans cette saison
    const { data: sjExistants } = await supabase.from('saison_joueurs')
      .select('numero_maillot').eq('saison_id', saisonId)
    const numerosUtilises = new Set(sjExistants?.map(sj => sj.numero_maillot).filter(n => n != null) || [])

    let nbOk = 0
    for (const j of generated) {
      // Insert personnage
      const { data: perso, error: ep } = await supabase.from('personnages').insert({
        prenom: j.prenom, nom: j.nom, surnom: j.surnom || null,
        poste: j.poste, nationalite: j.nationalite, annee_naissance: j.annee_naissance || null,
        peau: j.peau, morphologie: j.morphologie,
        couleur_cheveux: j.couleur_cheveux, type_coiffure: j.type_coiffure,
        style_coiffure: j.style_coiffure || null, couleur_yeux: j.couleur_yeux,
        type_nez: j.type_nez, lunettes: j.lunettes || false,
        taille_u15: j.taille_u15 || null, taille_u18: j.taille_u18 || null,
        taille_senior: j.taille_senior || null,
        caracteristiques_design: j.caracteristiques_design || null,
        style_personnalite: j.style_personnalite || null,
        notes: j.notes || null
      }).select('id').single()

      if (ep || !perso) continue

      // Lier à la saison avec numéro de maillot
      const numero = assignerNumero(j.poste, numerosUtilises)
      await supabase.from('saison_joueurs').insert({
        saison_id: saisonId, personnage_id: perso.id, numero_maillot: numero
      })
      nbOk++
    }

    setSaving(false)
    setSaved(true)
    toast(`${nbOk} joueur(s) sauvegardés ✓`)
    loadEffectif()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">IA TOOL</h1>
          <p className="page-subtitle">Générer un effectif complet avec l'intelligence artificielle</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* ── Colonne gauche : configuration ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Équipe + Saison + Catégorie */}
          <div className="detail-section">
            <div className="detail-section-title">1. Sélectionner l'équipe et la saison</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Équipe</label>
                <select className="form-select" value={equipeId} onChange={e => { setEquipeId(e.target.value); setGenerated([]); setSaved(false) }}>
                  <option value="">— Sélectionner une équipe —</option>
                  {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-select" value={categorie} onChange={e => { setCategorie(e.target.value); setGenerated([]); setSaved(false) }}>
                  <option value="">— Sélectionner —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Année début</label>
                  <input className="form-input" type="number" placeholder="2024"
                    value={anneeDebut} onChange={e => { setAnneeDebut(e.target.value); setGenerated([]); setSaved(false) }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Année fin</label>
                  <input className="form-input" type="number" placeholder="2025"
                    value={anneeFin} onChange={e => { setAnneeFin(e.target.value); setGenerated([]); setSaved(false) }} />
                </div>
              </div>
            </div>

            {/* Effectif actuel */}
            {equipeId && categorie && anneeDebut && anneeFin && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--text-dim)', marginBottom: '8px' }}>
                  Effectif actuel ({effectifActuel.length} joueur{effectifActuel.length !== 1 ? 's' : ''})
                </div>
                {loadingEffectif ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chargement...</p>
                  : effectifActuel.length === 0
                    ? <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Aucun joueur pour l'instant</p>
                    : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {effectifActuel.map(sj => (
                          <span key={sj.id} style={{ fontSize: '0.75rem', background: 'var(--bg)',
                            border: '1px solid var(--border)', borderRadius: '12px', padding: '3px 10px',
                            color: POSTE_COLORS[sj.personnages?.poste] || 'var(--text-muted)' }}>
                            {sj.personnages?.prenom} {sj.personnages?.nom}
                            {sj.personnages?.poste && <span style={{ color: 'var(--text-dim)', marginLeft: '4px', fontSize: '0.65rem' }}>({sj.personnages.poste})</span>}
                          </span>
                        ))}
                      </div>
                    )}
              </div>
            )}
          </div>

          {/* Sélection des pays */}
          <div className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="detail-section-title" style={{ marginBottom: 0 }}>2. Nationalités <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '0.72rem' }}>(optionnel)</span></div>
              {paysSelectionnes.length > 0 && (
                <button onClick={() => setPaysSelectionnes([])}
                  style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Tout effacer
                </button>
              )}
            </div>
            {paysSelectionnes.length === 0
              ? <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '10px' }}>
                  Aucun filtre — nationalités variées générées automatiquement.
                </p>
              : <div style={{ marginBottom: '10px', fontSize: '0.78rem', color: 'var(--accent)' }}>
                  {paysSelectionnes.length} pays sélectionné{paysSelectionnes.length > 1 ? 's' : ''}
                </div>
            }
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PAYS_PAR_REGION.map(({ region, pays }) => (
                <div key={region}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: 'var(--text-dim)', marginBottom: '5px' }}>{region}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {pays.map(p => {
                      const selected = paysSelectionnes.includes(p)
                      return (
                        <button key={p} onClick={() => togglePays(p)}
                          style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: '12px', cursor: 'pointer',
                            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            background: selected ? 'var(--accent)' : 'var(--bg)',
                            color: selected ? '#0a0a0f' : 'var(--text-muted)',
                            fontWeight: selected ? 700 : 400, transition: 'all 0.12s' }}>
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Années de naissance */}
          <div className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="detail-section-title" style={{ marginBottom: 0 }}>3. Années de naissance <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '0.72rem' }}>(optionnel)</span></div>
              {anneesNaissanceSelectionnees.length > 0 && (
                <button onClick={() => setAnneesNaissanceSelectionnees([])}
                  style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Tout effacer
                </button>
              )}
            </div>
            {anneesNaissanceSelectionnees.length === 0
              ? <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '10px' }}>
                  Aucun filtre — âges générés automatiquement.
                </p>
              : <div style={{ marginBottom: '10px', fontSize: '0.78rem', color: 'var(--accent)' }}>
                  {anneesNaissanceSelectionnees.length} année{anneesNaissanceSelectionnees.length > 1 ? 's' : ''} sélectionnée{anneesNaissanceSelectionnees.length > 1 ? 's' : ''}
                </div>
            }
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ANNEES_PAR_DECENNIE.map(({ decennie, annees }) => (
                <div key={decennie}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: 'var(--text-dim)', marginBottom: '5px' }}>{decennie}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {annees.map(a => {
                      const selected = anneesNaissanceSelectionnees.includes(a)
                      return (
                        <button key={a} onClick={() => toggleAnnee(a)}
                          style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: '12px', cursor: 'pointer',
                            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                            background: selected ? 'var(--accent)' : 'var(--bg)',
                            color: selected ? '#0a0a0f' : 'var(--text-muted)',
                            fontWeight: selected ? 700 : 400, transition: 'all 0.12s' }}>
                          {a}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sélection des postes */}
          <div className="detail-section">
            <div className="detail-section-title">4. Postes à générer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {POSTE_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: 'var(--text-dim)', marginBottom: '6px' }}>{group.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.postes.map(poste => {
                      const count = selection[poste] || 0
                      const color = POSTE_COLORS[poste]
                      return (
                        <div key={poste} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: count > 0 ? color + '0f' : 'var(--bg)',
                          border: `1px solid ${count > 0 ? color + '44' : 'var(--border)'}`,
                          borderRadius: '6px', padding: '7px 12px', transition: 'all 0.15s' }}>
                          <span style={{ fontSize: '0.83rem', fontWeight: 600,
                            color: count > 0 ? color : 'var(--text-muted)' }}>{poste}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => setCount(poste, -1)}
                              style={{ width: '26px', height: '26px', borderRadius: '50%',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem',
                              color: count > 0 ? color : 'var(--text-dim)', minWidth: '20px', textAlign: 'center' }}>
                              {count}
                            </span>
                            <button onClick={() => setCount(poste, 1)}
                              style={{ width: '26px', height: '26px', borderRadius: '50%',
                                background: count > 0 ? color + '22' : 'var(--bg-card)',
                                border: `1px solid ${count > 0 ? color : 'var(--border)'}`,
                                color: count > 0 ? color : 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Résumé + bouton */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              {totalAGenerer > 0 && (
                <div style={{ marginBottom: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {Object.entries(selection).map(([p, n]) => (
                    <span key={p} style={{ marginRight: '8px' }}>
                      <span style={{ color: POSTE_COLORS[p], fontWeight: 600 }}>{n}×</span> {p}
                    </span>
                  ))}
                </div>
              )}
              <button className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem',
                  padding: '12px', opacity: (!equipeId || !categorie || !anneeDebut || !anneeFin || totalAGenerer === 0 || generating) ? 0.5 : 1 }}
                onClick={generer}
                disabled={!equipeId || !categorie || !anneeDebut || !anneeFin || totalAGenerer === 0 || generating}>
                {generating
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #0a0a0f',
                        borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Génération en cours...
                    </span>
                  : `⚡ GÉNÉRER ${totalAGenerer > 0 ? totalAGenerer + ' joueur' + (totalAGenerer > 1 ? 's' : '') : ''}`
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Colonne droite : résultats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Log de progression */}
          {progress.length > 0 && (
            <div style={{ background: '#0a0a0f', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '14px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
              <div style={{ color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.65rem',
                textTransform: 'uppercase', letterSpacing: '0.1em' }}>Log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                {progress.map(p => (
                  <div key={p.id} style={{
                    color: p.type === 'error' ? '#ef4444'
                      : p.type === 'success' ? '#3affb8'
                      : p.type === 'player' ? '#e8ff3a'
                      : 'var(--text-muted)'
                  }}>
                    {p.type === 'player' ? '' : p.type === 'success' ? '' : p.type === 'error' ? '✕ ' : '› '}{p.msg}
                  </div>
                ))}
                {generating && (
                  <div style={{ color: 'var(--accent)', animation: 'pulse 1s infinite' }}>▋</div>
                )}
              </div>
            </div>
          )}

          {/* Preview des joueurs générés */}
          {generated.length > 0 && (
            <div className="detail-section" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="detail-section-title" style={{ marginBottom: 0 }}>
                  {generated.length} joueur{generated.length > 1 ? 's' : ''} générés
                </div>
                {!saved && (
                  <button className="btn btn-primary" onClick={sauvegarder} disabled={saving}
                    style={{ background: '#3affb8', color: '#0a0a0f' }}>
                    {saving ? 'Sauvegarde...' : '💾 Sauvegarder tout'}
                  </button>
                )}
                {saved && (
                  <span style={{ color: '#3affb8', fontSize: '0.85rem', fontWeight: 600 }}>✓ Sauvegardé !</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
                {generated.map((j, i) => {
                  const color = POSTE_COLORS[j.poste] || 'var(--text-muted)'
                  return (
                    <div key={i} style={{ background: 'var(--bg)', border: `1px solid ${color}33`,
                      borderLeft: `3px solid ${color}`, borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{j.prenom} {j.nom}</span>
                          {j.surnom && <span style={{ color: 'var(--accent)', fontSize: '0.78rem', marginLeft: '8px' }}>"{j.surnom}"</span>}
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color, letterSpacing: '0.05em' }}>{j.poste}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {j.nationalite && <Tag>{j.nationalite}</Tag>}
                        {j.annee_naissance && <Tag>né en {j.annee_naissance}</Tag>}
                        {j.peau && <Tag>{j.peau}</Tag>}
                        {j.morphologie && <Tag>{j.morphologie}</Tag>}
                        {j.couleur_cheveux && <Tag>Chev. {j.couleur_cheveux}</Tag>}
                        {j.couleur_yeux && <Tag>Yeux {j.couleur_yeux}</Tag>}
                        {(j.taille_u15 || j.taille_u18 || j.taille_senior) && (
                          <Tag color={color}>{j.taille_u15 || j.taille_u18 || j.taille_senior} cm</Tag>
                        )}
                      </div>
                      {j.caracteristiques_design && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {j.caracteristiques_design}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* État vide */}
          {generated.length === 0 && progress.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '12px',
              minHeight: '300px', flexDirection: 'column', gap: '12px', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '3rem', opacity: 0.3 }}>⚡</div>
              <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>
                Configure la saison et les postes<br/>puis clique sur Générer
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}

function Tag({ children, color }) {
  return (
    <span style={{ fontSize: '0.68rem', background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '2px 8px', color: color || 'var(--text-muted)' }}>
      {children}
    </span>
  )
}
