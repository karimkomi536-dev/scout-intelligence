import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowRight, CheckCircle, Loader } from 'lucide-react'

const C = {
  bg:       '#08091A',
  bgCard:   '#0d1127',
  border:   '#1a2040',
  green:    '#10F090',
  greenDim: 'rgba(16,240,144,0.12)',
  greenGlow:'rgba(16,240,144,0.25)',
  text:     '#ffffff',
  muted:    '#8892a4',
  error:    '#fca5a5',
  errorBg:  '#1f1215',
  errorBorder: '#7f1d1d',
}

interface Props {
  source?: string   // pour tracker d'où vient la soumission
}

type State = 'idle' | 'loading' | 'success' | 'error'

export default function WaitlistForm({ source = 'landing' }: Props) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [state,   setState]   = useState<State>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setState('loading')
    setMessage('')

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim(), name: name.trim() || null, source })

    if (error) {
      if (error.code === '23505') {
        // Unique violation — email déjà inscrit
        setState('success')
        setMessage('Vous êtes déjà sur la liste !')
      } else {
        setState('error')
        setMessage('Une erreur est survenue. Réessayez dans un instant.')
      }
      return
    }

    setState('success')
    setMessage('')
  }

  // ─── Success state ───────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        padding: '28px 32px',
        background: C.greenDim,
        border: `1px solid ${C.green}`,
        borderRadius: '14px',
        maxWidth: '480px', width: '100%',
        textAlign: 'center',
      }}>
        <CheckCircle size={32} color={C.green} />
        <p style={{ fontSize: '18px', fontWeight: '700', color: C.text }}>
          {message || 'Vous êtes sur la liste !'}
        </p>
        <p style={{ fontSize: '14px', color: C.muted }}>
          On vous prévient en premier dès que de nouvelles fonctionnalités arrivent.
        </p>
      </div>
    )
  }

  // ─── Form ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        maxWidth: '480px', width: '100%',
      }}
    >
      <input
        type="text"
        placeholder="Votre prénom (optionnel)"
        value={name}
        onChange={e => setName(e.target.value)}
        autoComplete="given-name"
        style={{
          padding: '12px 16px',
          background: '#0a0c1f',
          border: `1px solid ${C.border}`,
          borderRadius: '10px',
          color: C.text, fontSize: '14px', outline: 'none',
          width: '100%', boxSizing: 'border-box',
        }}
        onFocus={e  => (e.currentTarget.style.borderColor = C.green)}
        onBlur={e   => (e.currentTarget.style.borderColor = C.border)}
      />

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="email"
          required
          placeholder="scout@votreclub.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          style={{
            flex: 1, padding: '12px 16px',
            background: '#0a0c1f',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            color: C.text, fontSize: '14px', outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = C.green)}
          onBlur={e  => (e.currentTarget.style.borderColor = C.border)}
        />

        <button
          type="submit"
          disabled={state === 'loading'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 22px',
            background: state === 'loading' ? C.greenDim : C.green,
            border: `1px solid ${C.green}`,
            borderRadius: '10px',
            color: state === 'loading' ? C.green : '#08091A',
            fontSize: '14px', fontWeight: '700',
            cursor: state === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { if (state !== 'loading') e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          {state === 'loading'
            ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Envoi…</>
            : <>Rejoindre <ArrowRight size={14} /></>}
        </button>
      </div>

      {state === 'error' && (
        <p style={{
          fontSize: '13px', color: C.error,
          background: C.errorBg,
          border: `1px solid ${C.errorBorder}`,
          borderRadius: '8px', padding: '10px 14px',
          margin: 0,
        }}>
          {message}
        </p>
      )}

      <p style={{ fontSize: '12px', color: C.muted, margin: 0 }}>
        Aucun spam. Désabonnement en un clic.
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </form>
  )
}
