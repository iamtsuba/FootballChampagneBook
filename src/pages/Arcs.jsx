import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const TYPES_SC = ['HISTOIRE', 'MATCH', 'COMPETITION', 'CLASSEMENT', 'EQUIPE', 'PERSONNAGE']
const TYPE_COLORS = {
  'HISTOIRE': '#8b5cf6', 'MATCH': '#3b82f6', 'COMPETITION': '#f59e0b',
  'CLASSEMENT': '#e8ff3a', 'EQUIPE': '#10b981', 'PERSONNAGE': '#ef4444'
}
const TYPE_ICONS = {
  'HISTOIRE': '📖', 'MATCH': '⚽', 'COMPETITION': '◆',
  'CLASSEMENT': '🏆', 'EQUIPE': '⬡', 'PERSONNAGE': '◉'
}
const CATEGORIES = ['U13', 'U15', 'U18', 'SENIORS']
const statuts = ['planifié', 'en cours', 'terminé']
const statutColor = { 'planifié': 'var(--text-muted)', 'en cours': 'var(--accent)', 'terminé': 'var(--accent2)' }

const emptyArc = { titre: '', ordre: '', description: '', periode_debut: '', periode_fin: '', themes: [], statut: 'planifié' }
const emptyChapitre = { arc_id: '', numero: '', titre: '' }
const emptySC = {
  chapitre_id: '', numero: '', titre: '', type: 'HISTOIRE',
  description: '', match_id: '', competition_id: '', equipe_id: '', personnage_id: '',
  classement_categorie: '', classement_annee_debut: '', classement_annee_fin: ''
}

export default function Arcs() {
  const [arcs, setArcs]           = useState([])
  const [chapitres, setChapitres] = useState([])
  const [sousChaps, setSousChaps] = useState([])
  const [loading, setLoading]     = useState(true)

  const [expandedArcs, setExpandedArcs]   = useState(new Set())
  const [expandedChaps, setExpandedChaps] = useState(new Set())

  const [arcModal, setArcModal]     = useState(null)
  const [chapModal, setChapModal]   = useState(null)
  const [scModal, setScModal]       = useState(null)
  const [currentArc, setCurrentArc] = useState(emptyArc)
  const [currentChap, setCurrentChap] = useState(emptyChapitre)
  const [currentSC, setCurrentSC]   = useState(emptySC)
  const [saving, setSaving]         = useState(false)
  const [themeInput, setThemeInput] = useState('')

  const [writingChapId, setWritingChapId] = useState(null)
  const [promptMap, setPromptMap]         = useState({})
  const [textMap, setTextMap]             = useState({})
  const [generating, setGenerating]       = useState(false)
  const [savingText, setSavingText]       = useState(false)

  const [allMatchs, setAllMatchs]               = useState([])
  const [allCompetitions, setAllCompetitions]   = useState([])
  const [allEquipes, setAllEquipes]             = useState([])
  const [allPersonnages, setAllPersonnages]     = useState([])

  const toast = useToast()

  async function load() {
    setLoading(true)
    const [{ data: arcsD }, { data: chapsD }, { data: scD }] = await Promise.all([
      supabase.from('arcs').select('*').order('ordre', { nullsLast: true }).order('created_at'),
      supabase.from('chapitres').select('*').order('numero'),
      supabase.from('sous_chapitres')
        .select('*, matchs(equipe_dom:equipes!matchs_equipe_domicile_id_fkey(nom), equipe_ext:equipes!matchs_equipe_exterieur_id_fkey(nom), score_domicile, score_exterieur), competitions(nom), equipes(nom), personnages(prenom, nom)')
        .order('numero')
    ])
    setArcs(arcsD || [])
    setChapitres(chapsD || [])
    setSousChaps(scD || [])
    const pm = {}, tm = {}
    for (const c of (chapsD || [])) {
      if (c.prompt_aide) pm[c.id] = c.prompt_aide
      if (c.chapitre_text) tm[c.id] = c.chapitre_text
    }
    setPromptMap(pm); setTextMap(tm)
    setLoading(false)
  }

  async function loadRefs() {
    const [m, c, e, p] = await Promise.all([
      supabase.from('matchs').select('id, equipe_dom:equipes!matchs_equipe_domicile_id_fkey(nom), equipe_ext:equipes!matchs_equipe_exterieur_id_fkey(nom), score_domicile, score_exterieur').order('created_at', { ascending: false }),
      supabase.from('competitions').select('id, nom').order('nom'),
      supabase.from('equipes').select('id, nom').order('nom'),
      supabase.from('personnages').select('id, prenom, nom').order('nom')
    ])
    setAllMatchs(m.data || []); setAllCompetitions(c.data || [])
    setAllEquipes(e.data || []); setAllPersonnages(p.data || [])
  }

  useEffect(() => { load(); loadRefs() }, [])

  async function saveArc() {
    setSaving(true)
    const payload = { ...currentArc, ordre: currentArc.ordre ? parseInt(currentArc.ordre) : null }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = arcModal === 'create'
      ? await supabase.from('arcs').insert(payload)
      : await supabase.from('arcs').update(payload).eq('id', currentArc.id)
    setSaving(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast('Arc sauvegardé ✓'); setArcModal(null); load()
  }
  async function removeArc(id) {
    if (!confirm('Supprimer cet arc et tous ses chapitres ?')) return
    await supabase.from('arcs').delete().eq('id', id)
    toast('Arc supprimé'); load()
  }

  async function saveChapitre() {
    setSaving(true)
    const payload = { arc_id: currentChap.arc_id, numero: parseInt(currentChap.numero), titre: currentChap.titre }
    const { error } = chapModal === 'create'
      ? await supabase.from('chapitres').insert(payload)
      : await supabase.from('chapitres').update(payload).eq('id', currentChap.id)
    setSaving(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast('Chapitre sauvegardé ✓'); setChapModal(null); load()
  }
  async function removeChapitre(id) {
    if (!confirm('Supprimer ce chapitre ?')) return
    await supabase.from('chapitres').delete().eq('id', id)
    toast('Chapitre supprimé'); load()
  }

  async function saveSC() {
    setSaving(true)
    const toInt = v => v !== '' && v !== null ? parseInt(v) : null
    const payload = {
      chapitre_id: currentSC.chapitre_id, numero: toInt(currentSC.numero), titre: currentSC.titre, type: currentSC.type,
      description: currentSC.type === 'HISTOIRE' ? currentSC.description : null,
      match_id: currentSC.type === 'MATCH' ? (currentSC.match_id || null) : null,
      competition_id: currentSC.type === 'COMPETITION' ? (currentSC.competition_id || null) : null,
      equipe_id: currentSC.type === 'EQUIPE' ? (currentSC.equipe_id || null) : null,
      personnage_id: currentSC.type === 'PERSONNAGE' ? (currentSC.personnage_id || null) : null,
      classement_categorie: currentSC.type === 'CLASSEMENT' ? currentSC.classement_categorie : null,
      classement_annee_debut: currentSC.type === 'CLASSEMENT' ? toInt(currentSC.classement_annee_debut) : null,
      classement_annee_fin: currentSC.type === 'CLASSEMENT' ? toInt(currentSC.classement_annee_fin) : null,
    }
    const { error } = scModal === 'create'
      ? await supabase.from('sous_chapitres').insert(payload)
      : await supabase.from('sous_chapitres').update(payload).eq('id', currentSC.id)
    setSaving(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast('Sous-chapitre sauvegardé ✓'); setScModal(null); load()
  }
  async function removeSC(id) {
    await supabase.from('sous_chapitres').delete().eq('id', id)
    toast('Supprimé'); load()
  }

  function buildPrompt(chapId) {
    const chap = chapitres.find(c => c.id === chapId)
    if (!chap) return ''
    const arc = arcs.find(a => a.id === chap.arc_id)
    const scs = sousChaps.filter(sc => sc.chapitre_id === chapId).sort((a, b) => a.numero - b.numero)
    const scLines = scs.map(sc => {
      let l = `  ${sc.numero}. [${sc.type}] ${sc.titre}`
      if (sc.type === 'HISTOIRE' && sc.description) l += `\n     → ${sc.description}`
      if (sc.type === 'MATCH' && sc.matchs) l += `\n     → ${sc.matchs.equipe_dom?.nom} vs ${sc.matchs.equipe_ext?.nom}${sc.matchs.score_domicile != null ? ` (${sc.matchs.score_domicile}-${sc.matchs.score_exterieur})` : ''}`
      if (sc.type === 'COMPETITION' && sc.competitions) l += `\n     → Compétition: ${sc.competitions.nom}`
      if (sc.type === 'EQUIPE' && sc.equipes) l += `\n     → Équipe: ${sc.equipes.nom}`
      if (sc.type === 'PERSONNAGE' && sc.personnages) l += `\n     → Personnage: ${sc.personnages.prenom} ${sc.personnages.nom}`
      if (sc.type === 'CLASSEMENT') l += `\n     → Classement ${sc.classement_categorie} ${sc.classement_annee_debut}-${sc.classement_annee_fin}`
      return l
    }).join('\n')

    return `Tu es un auteur de roman de football en français. Écris le chapitre suivant de façon narrative, immersive et littéraire. Développe chaque section avec des descriptions riches, des émotions et de l'action. Commence directement le texte du chapitre sans préambule.

ARC: "${arc?.titre || ''}"${arc?.description ? `\nContexte de l'arc: ${arc.description}` : ''}${arc?.themes?.length ? `\nThèmes: ${arc.themes.join(', ')}` : ''}

CHAPITRE ${chap.numero}: "${chap.titre}"

Plan du chapitre:
${scLines || '(Pas de sous-chapitres — laisse libre cours à ta créativité dans le contexte de l\'arc)'}

Instructions spécifiques: ${promptMap[chapId] || 'Écris ce chapitre de façon narrative et immersive.'}`
  }

  async function genererTexte(chapId) {
    setGenerating(true)
    try {
      await supabase.from('chapitres').update({ prompt_aide: promptMap[chapId] || '' }).eq('id', chapId)
      const resp = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: buildPrompt(chapId) }] })
      })
      const result = await resp.json()
      if (result.error) { toast('Erreur IA : ' + result.error, 'error'); return }
      const text = result.content?.[0]?.text || ''
      setTextMap(prev => ({ ...prev, [chapId]: text }))
      toast('Texte généré ✓')
    } catch (err) { toast('Erreur : ' + err.message, 'error') }
    finally { setGenerating(false) }
  }

  async function saveTexte(chapId) {
    setSavingText(true)
    await supabase.from('chapitres').update({ chapitre_text: textMap[chapId] || '', prompt_aide: promptMap[chapId] || '' }).eq('id', chapId)
    setSavingText(false)
    toast('Texte sauvegardé ✓')
    setChapitres(prev => prev.map(c => c.id === chapId ? { ...c, chapitre_text: textMap[chapId], prompt_aide: promptMap[chapId] } : c))
  }

  function getSCLabel(sc) {
    if (sc.type === 'HISTOIRE') return sc.description ? sc.description.slice(0, 70) + (sc.description.length > 70 ? '…' : '') : '—'
    if (sc.type === 'MATCH' && sc.matchs) return `${sc.matchs.equipe_dom?.nom || '?'} vs ${sc.matchs.equipe_ext?.nom || '?'}${sc.matchs.score_domicile != null ? ` (${sc.matchs.score_domicile}-${sc.matchs.score_exterieur})` : ''}`
    if (sc.type === 'COMPETITION' && sc.competitions) return sc.competitions.nom
    if (sc.type === 'EQUIPE' && sc.equipes) return sc.equipes.nom
    if (sc.type === 'PERSONNAGE' && sc.personnages) return `${sc.personnages.prenom} ${sc.personnages.nom}`
    if (sc.type === 'CLASSEMENT') return `${sc.classement_categorie || ''} ${sc.classement_annee_debut || ''}–${sc.classement_annee_fin || ''}`
    return '—'
  }

  function toggleArc(id) { setExpandedArcs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleChap(id) { setExpandedChaps(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ARCS NARRATIFS</h1>
          <p className="page-subtitle">{arcs.length} arc{arcs.length !== 1 ? 's' : ''} · {chapitres.length} chapitre{chapitres.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrentArc(emptyArc); setArcModal('create') }}>+ Nouvel arc</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : arcs.length === 0
          ? <div className="empty-state"><div className="empty-icon">⌁</div><h3>Aucun arc narratif</h3></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {arcs.map((arc, idx) => {
                const arcChaps = chapitres.filter(c => c.arc_id === arc.id).sort((a, b) => a.numero - b.numero)
                const isExpanded = expandedArcs.has(arc.id)
                return (
                  <div key={arc.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggleArc(arc.id)}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--border-bright)', lineHeight: 1, minWidth: '44px' }}>{arc.ordre || (idx + 1)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', letterSpacing: '0.04em' }}>{arc.titre}</div>
                        {(arc.periode_debut || arc.periode_fin) && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{arc.periode_debut}{arc.periode_fin ? ` → ${arc.periode_fin}` : ''}</div>}
                        {arc.themes?.length > 0 && <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>{arc.themes.map(t => <span key={t} className="badge" style={{ fontSize: '0.65rem' }}>{t}</span>)}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <span className="badge" style={{ color: statutColor[arc.statut] }}>{arc.statut}</span>
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>{arcChaps.length} ch.</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', padding: '0 20px 14px' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentArc(arc); setArcModal('edit') }}>Modifier</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentChap({ ...emptyChapitre, arc_id: arc.id, numero: arcChaps.length + 1 }); setChapModal('create') }}>+ Chapitre</button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeArc(arc.id)}>Supprimer</button>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                        {arc.description && <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: '14px 0', fontStyle: 'italic' }}>{arc.description}</p>}
                        {arcChaps.length === 0
                          ? <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', fontStyle: 'italic', padding: '10px 0' }}>Aucun chapitre — clique sur "+ Chapitre" pour commencer.</p>
                          : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                              {arcChaps.map(chap => {
                                const chapSCs = sousChaps.filter(sc => sc.chapitre_id === chap.id).sort((a, b) => a.numero - b.numero)
                                const isChapExp = expandedChaps.has(chap.id)
                                const isWriting = writingChapId === chap.id
                                return (
                                  <div key={chap.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleChap(chap.id)}>
                                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--accent)', minWidth: '32px', lineHeight: 1 }}>{chap.numero}</div>
                                      <div style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}>{chap.titre}</div>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                        {chap.chapitre_text && <span style={{ fontSize: '0.6rem', color: 'var(--accent2)', background: 'var(--accent2)15', border: '1px solid var(--accent2)44', borderRadius: '4px', padding: '2px 6px' }}>✍️ Texte</span>}
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{chapSCs.length} sc.</span>
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{isChapExp ? '▲' : '▼'}</span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px' }} onClick={e => e.stopPropagation()}>
                                      <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentChap(chap); setChapModal('edit') }}>Modifier</button>
                                      <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentSC({ ...emptySC, chapitre_id: chap.id, numero: chapSCs.length + 1 }); setScModal('create') }}>+ Sous-chapitre</button>
                                      <button className="btn btn-secondary btn-sm" style={{ color: isWriting ? 'var(--accent)' : 'inherit' }} onClick={() => setWritingChapId(isWriting ? null : chap.id)}>✍️ Écrire</button>
                                      <button className="btn btn-danger btn-sm" onClick={() => removeChapitre(chap.id)}>✕</button>
                                    </div>

                                    {isChapExp && (
                                      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border)' }}>
                                        {chapSCs.length === 0
                                          ? <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontStyle: 'italic' }}>Aucun sous-chapitre</p>
                                          : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                              {chapSCs.map(sc => {
                                                const tc = TYPE_COLORS[sc.type] || 'var(--text-muted)'
                                                return (
                                                  <div key={sc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', borderLeft: `3px solid ${tc}` }}>
                                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-dim)', minWidth: '24px' }}>{sc.numero}</span>
                                                    <span style={{ fontSize: '0.68rem', background: tc + '22', color: tc, border: `1px solid ${tc}44`, borderRadius: '4px', padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap', marginTop: '1px' }}>{TYPE_ICONS[sc.type]} {sc.type}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{sc.titre}</div>
                                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getSCLabel(sc)}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                      <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                                        onClick={() => { setCurrentSC({ ...emptySC, ...sc, match_id: sc.match_id || '', competition_id: sc.competition_id || '', equipe_id: sc.equipe_id || '', personnage_id: sc.personnage_id || '', classement_categorie: sc.classement_categorie || '', classement_annee_debut: sc.classement_annee_debut || '', classement_annee_fin: sc.classement_annee_fin || '', description: sc.description || '' }); setScModal('edit') }}>✎</button>
                                                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '2px 4px' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                                                        onClick={() => removeSC(sc.id)}>✕</button>
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}

                                        {isWriting && (
                                          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--accent)33', borderRadius: '10px' }}>
                                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: '12px', textTransform: 'uppercase' }}>
                                              ✍️ Écriture IA — Chapitre {chap.numero}
                                            </div>
                                            <div className="form-group">
                                              <label className="form-label">Instructions / Prompt d'aide</label>
                                              <textarea className="form-textarea" rows={3}
                                                placeholder="Ex: Beaucoup de tension, focus sur le match décisif, style cinématographique, POV du gardien..."
                                                value={promptMap[chap.id] || ''}
                                                onChange={e => setPromptMap(prev => ({ ...prev, [chap.id]: e.target.value }))} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                                              <button className="btn btn-primary" onClick={() => genererTexte(chap.id)} disabled={generating}>
                                                {generating ? '⏳ Génération en cours...' : '⚡ Générer le chapitre'}
                                              </button>
                                              {textMap[chap.id] && (
                                                <button className="btn btn-secondary" onClick={() => saveTexte(chap.id)} disabled={savingText}>
                                                  {savingText ? 'Sauvegarde...' : '💾 Sauvegarder le texte'}
                                                </button>
                                              )}
                                            </div>
                                            {textMap[chap.id] && (
                                              <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">CHAPITRE TEXT <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(éditable — relancer avec un nouveau prompt pour améliorer ou recommencer)</span></label>
                                                <textarea className="form-textarea" rows={22}
                                                  style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', lineHeight: 1.85 }}
                                                  value={textMap[chap.id]}
                                                  onChange={e => setTextMap(prev => ({ ...prev, [chap.id]: e.target.value }))} />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

      {/* ── MODAL ARC ── */}
      {arcModal && (
        <Modal title={arcModal === 'create' ? 'NOUVEL ARC' : 'MODIFIER ARC'} onClose={() => setArcModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setArcModal(null)}>Annuler</button><button className="btn btn-primary" onClick={saveArc} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button></>}>
          <div className="form-grid">
            <div className="form-group full"><label className="form-label">Titre *</label><input className="form-input" value={currentArc.titre} onChange={e => setCurrentArc(c => ({ ...c, titre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Ordre</label><input className="form-input" type="number" value={currentArc.ordre} onChange={e => setCurrentArc(c => ({ ...c, ordre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Statut</label><select className="form-select" value={currentArc.statut} onChange={e => setCurrentArc(c => ({ ...c, statut: e.target.value }))}>{statuts.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Période début</label><input className="form-input" placeholder="ex: Saison 1" value={currentArc.periode_debut} onChange={e => setCurrentArc(c => ({ ...c, periode_debut: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Période fin</label><input className="form-input" placeholder="ex: Saison 3" value={currentArc.periode_fin} onChange={e => setCurrentArc(c => ({ ...c, periode_fin: e.target.value }))} /></div>
            <div className="form-group full"><label className="form-label">Description</label><textarea className="form-textarea" rows={4} value={currentArc.description} onChange={e => setCurrentArc(c => ({ ...c, description: e.target.value }))} /></div>
            <div className="form-group full">
              <label className="form-label">Thèmes</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input className="form-input" placeholder="Ajouter un thème..." value={themeInput} onChange={e => setThemeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && themeInput.trim()) { setCurrentArc(c => ({ ...c, themes: [...(c.themes || []), themeInput.trim()] })); setThemeInput('') } }} />
                <button className="btn btn-secondary btn-sm" onClick={() => { if (themeInput.trim()) { setCurrentArc(c => ({ ...c, themes: [...(c.themes || []), themeInput.trim()] })); setThemeInput('') } }}>+</button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(currentArc.themes || []).map(t => <span key={t} className="badge" style={{ cursor: 'pointer' }} onClick={() => setCurrentArc(c => ({ ...c, themes: c.themes.filter(x => x !== t) }))}>{t} ✕</span>)}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CHAPITRE ── */}
      {chapModal && (
        <Modal title={chapModal === 'create' ? 'NOUVEAU CHAPITRE' : 'MODIFIER CHAPITRE'} onClose={() => setChapModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setChapModal(null)}>Annuler</button><button className="btn btn-primary" onClick={saveChapitre} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Numéro *</label><input className="form-input" type="number" value={currentChap.numero} onChange={e => setCurrentChap(c => ({ ...c, numero: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" value={currentChap.titre} onChange={e => setCurrentChap(c => ({ ...c, titre: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {/* ── MODAL SOUS-CHAPITRE ── */}
      {scModal && (
        <Modal title={scModal === 'create' ? 'NOUVEAU SOUS-CHAPITRE' : 'MODIFIER SOUS-CHAPITRE'} onClose={() => setScModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setScModal(null)}>Annuler</button><button className="btn btn-primary" onClick={saveSC} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Numéro *</label><input className="form-input" type="number" value={currentSC.numero} onChange={e => setCurrentSC(c => ({ ...c, numero: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" value={currentSC.titre} onChange={e => setCurrentSC(c => ({ ...c, titre: e.target.value }))} /></div>
            <div className="form-group full">
              <label className="form-label">Type de section</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TYPES_SC.map(t => {
                  const tc = TYPE_COLORS[t]; const active = currentSC.type === t
                  return <button key={t} onClick={() => setCurrentSC(c => ({ ...c, type: t }))}
                    style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 400, border: `1px solid ${active ? tc : 'var(--border)'}`, background: active ? tc + '22' : 'var(--bg)', color: active ? tc : 'var(--text-muted)', transition: 'all 0.12s' }}>{TYPE_ICONS[t]} {t}</button>
                })}
              </div>
            </div>
            {currentSC.type === 'HISTOIRE' && <div className="form-group full"><label className="form-label">Description / Résumé</label><textarea className="form-textarea" rows={4} value={currentSC.description} onChange={e => setCurrentSC(c => ({ ...c, description: e.target.value }))} /></div>}
            {currentSC.type === 'MATCH' && <div className="form-group full"><label className="form-label">Match lié</label><select className="form-select" value={currentSC.match_id} onChange={e => setCurrentSC(c => ({ ...c, match_id: e.target.value }))}><option value="">— Sélectionner —</option>{allMatchs.map(m => <option key={m.id} value={m.id}>{m.equipe_dom?.nom} vs {m.equipe_ext?.nom}{m.score_domicile != null ? ` (${m.score_domicile}-${m.score_exterieur})` : ''}</option>)}</select></div>}
            {currentSC.type === 'COMPETITION' && <div className="form-group full"><label className="form-label">Compétition liée</label><select className="form-select" value={currentSC.competition_id} onChange={e => setCurrentSC(c => ({ ...c, competition_id: e.target.value }))}><option value="">— Sélectionner —</option>{allCompetitions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>}
            {currentSC.type === 'CLASSEMENT' && <>
              <div className="form-group"><label className="form-label">Catégorie</label><select className="form-select" value={currentSC.classement_categorie} onChange={e => setCurrentSC(c => ({ ...c, classement_categorie: e.target.value }))}><option value="">—</option>{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Saison début</label><input className="form-input" type="number" value={currentSC.classement_annee_debut} onChange={e => setCurrentSC(c => ({ ...c, classement_annee_debut: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Saison fin</label><input className="form-input" type="number" value={currentSC.classement_annee_fin} onChange={e => setCurrentSC(c => ({ ...c, classement_annee_fin: e.target.value }))} /></div>
            </>}
            {currentSC.type === 'EQUIPE' && <div className="form-group full"><label className="form-label">Équipe liée</label><select className="form-select" value={currentSC.equipe_id} onChange={e => setCurrentSC(c => ({ ...c, equipe_id: e.target.value }))}><option value="">— Sélectionner —</option>{allEquipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}</select></div>}
            {currentSC.type === 'PERSONNAGE' && <div className="form-group full"><label className="form-label">Personnage lié</label><select className="form-select" value={currentSC.personnage_id} onChange={e => setCurrentSC(c => ({ ...c, personnage_id: e.target.value }))}><option value="">— Sélectionner —</option>{allPersonnages.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>}
          </div>
        </Modal>
      )}
    </div>
  )
}
