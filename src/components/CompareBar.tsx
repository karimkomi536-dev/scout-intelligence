import { useNavigate } from 'react-router-dom'
import { Scale, X } from 'lucide-react'
import { useCompare } from '../contexts/CompareContext'

export default function CompareBar() {
  const navigate = useNavigate()
  const { ids, clear, compareUrl } = useCompare()

  if (ids.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: '240px',
      right: 0,
      background: '#1e293b',
      borderTop: '1px solid #334155',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 50,
    }}>
      <Scale size={16} color="#3b82f6" />
      <span style={{ color: '#94a3b8', fontSize: '14px', flex: 1 }}>
        <span style={{ color: 'white', fontWeight: 600 }}>{ids.length}</span>
        {' '}joueur{ids.length > 1 ? 's' : ''} sélectionné{ids.length > 1 ? 's' : ''}
        {ids.length === 1 && <span style={{ color: '#6b7280' }}> · Sélectionnez au moins 1 autre joueur</span>}
      </span>

      <button
        onClick={clear}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#6b7280', fontSize: '13px', padding: '7px 14px', cursor: 'pointer' }}
      >
        <X size={13} /> Annuler
      </button>

      {ids.length >= 2 && (
        <button
          onClick={() => navigate(compareUrl)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', border: 'none', borderRadius: '7px', color: 'white', fontSize: '13px', fontWeight: 600, padding: '7px 18px', cursor: 'pointer' }}
        >
          <Scale size={14} /> Comparer ({ids.length})
        </button>
      )}
    </div>
  )
}
