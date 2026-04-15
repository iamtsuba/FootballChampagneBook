import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const empty = {
  titre: '', numero_tome: '', sous_titre: '', synopsis: '',
  statut: 'brouillon', date_debut_ecriture: '', date_publication: '',
  nb_chapitres: '', notes: ''
}
const statuts = ['brouillon', 'en cours', 'terminé', 'publié']
const statutColors = { brouillon: 'var(--text-dim)', 'en cours': 'var(--accent)', terminé: 'var(--accent2)', publié: '#f472b6' }

export default function Livres() {
  const [data, setData]                   = useState([])
  const [allArcs, setAllArcs]             = useState([])
  const [allChapitres, setAllChapitres]   = useState([])
  const [loading, setLoading]             = useState(true)
  const [modal, setModal]                 = useState(null)
  const [current, setCurrent]             = useState(empty)
  const [currentDetail, setCurrentDetail] = useState(null)
  const [livreChaps, setLivreChaps]       = useState([])
  const [saving, setSaving]               = useState(false)
  const [showChapText, setShowChapText]   = useState(null) // chapitre_id being previewed
  const toast = useToast()

  async function load() {
    setLoading(true)
    const { data: rows } = await supabase.from('livres').select('*').order('numero_tome', { nullsLast: true })
    setData(rows || [])
    setLoading(false)
  }

  async function loadRefs() {
    const [{ data: arcsD }, { data: chapsD }] = await Promise.all([
      supabase.from('arcs').select('id, titre, ordre').order('ordre', { nullsLast: true }),
      supabase.from('chapitres').select('id, arc_id, numero, titre, chapitre_text').order('numero')
    ])
    setAllArcs(arcsD || [])
    setAllChapitres(chapsD || [])
  }

  async function loadLivreChaps(livreId) {
    const { data: rows } = await supabase
      .from('livre_chapitres')
      .select('*, chapitres(id, arc_id, numero, titre, chapitre_text)')
      .eq('livre_id', livreId)
      .order('ordre', { nullsLast: true })
    setLivreChaps(rows || [])
  }

  useEffect(() => { load(); loadRefs() }, [])

  async function save() {
    setSaving(true)
    const payload = {
      ...current,
      numero_tome: current.numero_tome ? parseInt(current.numero_tome) : null,
      nb_chapitres: current.nb_chapitres ? parseInt(current.nb_chapitres) : null,
      date_debut_ecriture: current.date_debut_ecriture || null,
      date_publication: current.date_publication || null,
    }
    delete payload.id; delete payload.created_at; delete payload.updated_at
    const { error } = modal === 'create'
      ? await supabase.from('livres').insert(payload)
      : await supabase.from('livres').update(payload).eq('id', current.id)
    setSaving(false)
    if (error) { toast('Erreur', 'error'); return }
    toast('Livre sauvegardé ✓'); setModal(null); load()
  }

  async function remove(id) {
    if (!confirm('Supprimer ce livre ?')) return
    await supabase.from('livres').delete().eq('id', id)
    toast('Livre supprimé'); load()
  }

  async function openDetail(livre) {
    setCurrentDetail(livre)
    await loadLivreChaps(livre.id)
    setShowChapText(null)
    setModal('detail')
  }

  async function addChapToLivre(chapId) {
    const ordre = livreChaps.length
    await supabase.from('livre_chapitres').upsert({ livre_id: currentDetail.id, chapitre_id: chapId, ordre })
    toast('Chapitre ajouté ✓')
    loadLivreChaps(currentDetail.id)
  }

  async function removeChapFromLivre(chapId) {
    await supabase.from('livre_chapitres').delete().eq('livre_id', currentDetail.id).eq('chapitre_id', chapId)
    toast('Retiré')
    loadLivreChaps(currentDetail.id)
  }

  // Chapitres disponibles groupés par arc
  const includedIds = new Set(livreChaps.map(lc => lc.chapitre_id))
  const availableByArc = allArcs.map(arc => ({
    ...arc,
    chapitres: allChapitres.filter(c => c.arc_id === arc.id && !includedIds.has(c.id) && c.chapitre_text)
  })).filter(a => a.chapitres.length > 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">LIVRES</h1>
          <p className="page-subtitle">{data.length} tome{data.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCurrent(empty); setModal('create') }}>+ Nouveau livre</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        : data.length === 0 ? <div className="empty-state"><div className="empty-icon">▣</div><h3>Aucun livre</h3></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {data.map(l => (
              <div key={l.id} className="card" style={{ cursor: 'pointer', borderTop: `3px solid ${statutColors[l.statut] || 'var(--border)'}` }}
                onClick={() => openDetail(l)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {l.numero_tome && <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TOME {l.numero_tome}</div>}
                    <div className="card-title" style={{ fontSize: '1.5rem', marginTop: '2px' }}>{l.titre}</div>
                    {l.sous_titre && <div style={{ color: 'var(--text-muted)', fontSize: '0.83rem', fontStyle: 'italic' }}>{l.sous_titre}</div>}
                  </div>
                  <span className="badge" style={{ color: statutColors[l.statut] }}>{l.statut}</span>
                </div>
                {l.synopsis && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>{l.synopsis}</p>}
                <div className="card-meta" style={{ marginTop: '12px' }}>
                  {l.nb_chapitres && <span>📖 {l.nb_chapitres} chapitres</span>}
                  {l.date_debut_ecriture && <span>✍️ {l.date_debut_ecriture}</span>}
                </div>
                <div className="card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setCurrent(l); setModal('edit') }}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(l.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* ── MODAL CREATE/EDIT ── */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'NOUVEAU LIVRE' : 'MODIFIER LIVRE'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Annuler</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Sauvegarder'}</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" value={current.titre} onChange={e => setCurrent(c => ({ ...c, titre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Numéro de tome</label><input className="form-input" type="number" value={current.numero_tome} onChange={e => setCurrent(c => ({ ...c, numero_tome: e.target.value }))} /></div>
            <div className="form-group full"><label className="form-label">Sous-titre</label><input className="form-input" value={current.sous_titre} onChange={e => setCurrent(c => ({ ...c, sous_titre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Statut</label><select className="form-select" value={current.statut} onChange={e => setCurrent(c => ({ ...c, statut: e.target.value }))}>{statuts.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Nombre de chapitres</label><input className="form-input" type="number" value={current.nb_chapitres} onChange={e => setCurrent(c => ({ ...c, nb_chapitres: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Début d'écriture</label><input className="form-input" type="date" value={current.date_debut_ecriture} onChange={e => setCurrent(c => ({ ...c, date_debut_ecriture: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Date de publication</label><input className="form-input" type="date" value={current.date_publication} onChange={e => setCurrent(c => ({ ...c, date_publication: e.target.value }))} /></div>
            <div className="form-group full"><label className="form-label">Synopsis</label><textarea className="form-textarea" rows={4} value={current.synopsis} onChange={e => setCurrent(c => ({ ...c, synopsis: e.target.value }))} /></div>
            <div className="form-group full"><label className="form-label">Notes internes</label><textarea className="form-textarea" rows={2} value={current.notes} onChange={e => setCurrent(c => ({ ...c, notes: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {/* ── MODAL DETAIL ── */}
      {modal === 'detail' && currentDetail && (
        <Modal title={currentDetail.titre} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Fermer</button><button className="btn btn-primary" onClick={() => { setCurrent(currentDetail); setModal('edit') }}>Modifier</button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge" style={{ color: statutColors[currentDetail.statut] }}>{currentDetail.statut}</span>
              {currentDetail.numero_tome && <span className="badge badge-accent">Tome {currentDetail.numero_tome}</span>}
              {currentDetail.nb_chapitres && <span className="badge">{currentDetail.nb_chapitres} chapitres</span>}
            </div>
            {currentDetail.sous_titre && <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{currentDetail.sous_titre}</p>}
            {currentDetail.synopsis && (
              <div>
                <div className="detail-section-title" style={{ marginBottom: '8px' }}>Synopsis</div>
                <p style={{ fontSize: '0.87rem', lineHeight: 1.7 }}>{currentDetail.synopsis}</p>
              </div>
            )}

            {/* ── Chapitres inclus ── */}
            <div>
              <div className="detail-section-title" style={{ marginBottom: '10px' }}>📖 Chapitres de texte inclus</div>
              {livreChaps.length === 0
                ? <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Aucun chapitre — ajoute un chapitre dont le texte a été généré via les Arcs.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {livreChaps.map(lc => {
                      const chap = lc.chapitres
                      const arc = allArcs.find(a => a.id === chap?.arc_id)
                      const isPreview = showChapText === lc.chapitre_id
                      return (
                        <div key={lc.chapitre_id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{arc?.titre || 'Arc'}</div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Ch. {chap?.numero} — {chap?.titre}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {chap?.chapitre_text && (
                                <button className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', color: isPreview ? 'var(--accent)' : undefined }}
                                  onClick={() => setShowChapText(isPreview ? null : lc.chapitre_id)}>
                                  {isPreview ? '▲ Replier' : '▼ Lire'}
                                </button>
                              )}
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.9rem', padding: '2px 6px' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                                onClick={() => removeChapFromLivre(lc.chapitre_id)}>✕</button>
                            </div>
                          </div>
                          {isPreview && chap?.chapitre_text && (
                            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                              <pre style={{ fontFamily: 'Georgia, serif', fontSize: '0.88rem', lineHeight: 1.85, whiteSpace: 'pre-wrap', margin: '12px 0 0', color: 'var(--text)' }}>
                                {chap.chapitre_text}
                              </pre>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

              {/* Ajouter un chapitre */}
              {availableByArc.length > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Ajouter un chapitre (avec texte généré)</div>
                  {availableByArc.map(arc => (
                    <div key={arc.id} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '5px', fontStyle: 'italic' }}>Arc : {arc.titre}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {arc.chapitres.map(ch => (
                          <button key={ch.id} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}
                            onClick={() => addChapToLivre(ch.id)}>
                            + Ch. {ch.numero} — {ch.titre}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
