import { NavLink, useLocation } from 'react-router-dom'

const nav = [
  {
    section: 'Vue d\'ensemble',
    links: [
      { to: '/', label: 'Tableau de bord', icon: '◈' },
    ]
  },
  {
    section: 'Univers',
    links: [
      { to: '/personnages', label: 'Personnages', icon: '◉' },
      { to: '/equipes', label: 'Équipes', icon: '⬡' },
      { to: '/competitions', label: 'Compétitions', icon: '◆' },
      { to: '/matchs', label: 'Matchs', icon: '▶' },
    ]
  },
  {
    section: 'Structure narrative',
    links: [
      { to: '/arcs', label: 'Arcs narratifs', icon: '⌁' },
      { to: '/livres', label: 'Livres', icon: '▣' },
    ]
  },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>STORY MGR</h1>
        <p>Gestionnaire d'univers</p>
      </div>
      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                end={link.to === '/'}
              >
                <span className="icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
