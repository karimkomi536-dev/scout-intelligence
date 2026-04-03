import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { ArrowRight, CheckCircle, Users, LayoutDashboard, Search, Bookmark, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import VizionLogo from '../components/VizionLogo'

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLES = ['Scout', 'Directeur sportif', 'Analyste', 'Agent']
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
          <div style={{
            height: '100%',
            background: i < step ? '#00C896' : 'transparent',
            borderRadius: 2,
            transition: 'all 0.4s ease',
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Step label ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Votre profil', 'Premier joueur', 'Prêt !']

// ── Main component ────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [role, setRole]           = useState('')
  const [club, setClub]           = useState('')

  // Step 2 fields
  const [playerName, setPlayerName]     = useState('')
  const [playerPos, setPlayerPos]       = useState('CM')
  const [playerScore, setPlayerScore]   = useState(70)
  const [skipPlayer, setSkipPlayer]     = useState(false)

  // Redirect if already onboarded
  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user?.id, navigate])

  // ── Step 1 : save profile ──────────────────────────────────────────────────

  async function saveProfile() {
    if (!firstName.trim()) { setError('Veuillez entrer votre prénom.'); return }
    if (!role) { setError('Veuillez choisir votre rôle.'); return }
    setError(null)
    setSaving(true)
    try {
      const { error: err } = await supabase
        .from('profiles')
        .upsert({
          user_id:   user!.id,
          full_name: firstName.trim(),
          role,
          club:      club.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      if (err) throw err
      setStep(2)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // ── Step 2 : add first player or skip ─────────────────────────────────────

  async function savePlayer() {
    if (!skipPlayer && !playerName.trim()) { setError('Entrez un nom ou cliquez sur "Passer".'); return }
    setError(null)
    setSaving(true)
    try {
      if (!skipPlayer && playerName.trim()) {
        await supabase.from('players').insert({
          name:             playerName.trim(),
          primary_position: playerPos,
          scout_score:      playerScore,
          age:              null,
          team:             club.trim() || null,
          competition:      null,
        })
        // Mark player step done in checklist
        await supabase.from('profiles').update({
          onboarding_checklist: { profile: true, player: true, shortlist: false, pdf: false },
        }).eq('user_id', user!.id)
      } else {
        await supabase.from('profiles').update({
          onboarding_checklist: { profile: true, player: false, shortlist: false, pdf: false },
        }).eq('user_id', user!.id)
      }
      setStep(3)
      // Celebrate!
      setTimeout(() => {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#00C896', '#4D7FFF', '#9B6DFF', '#F5A623'],
        })
      }, 200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // ── Step 3 : complete onboarding ──────────────────────────────────────────

  async function finish() {
    setSaving(true)
    try {
      await supabase.from('profiles').update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user!.id)

      // Fire welcome email (best-effort, don't block)
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user!.email, firstName }),
      }).catch(() => {})

      localStorage.setItem('vizion-onboarding-done', 'true')
      completeOnboarding()
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  // ── Shared input style ────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 9,
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 150ms',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
      backgroundSize: '40px 40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <VizionLogo size="lg" />
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: '32px 28px',
        }}>
          <ProgressBar step={step} total={3} />

          {/* Step label */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            color: '#00C896', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Étape {step} / 3 — {STEP_LABELS[step - 1]}
          </p>

          {/* ── STEP 1 ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Bienvenue sur VIZION
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Dites-nous qui vous êtes pour personnaliser votre expérience.
                </p>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Prénom *</label>
                <input
                  style={inputStyle}
                  placeholder="Votre prénom"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Rôle *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      style={{
                        padding: '10px 12px',
                        background: role === r ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${role === r ? 'rgba(0,200,150,0.40)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 8,
                        color: role === r ? '#00C896' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: role === r ? 600 : 400,
                        cursor: 'pointer', transition: 'all 150ms',
                        textAlign: 'left',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Club / Structure <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
                <input
                  style={inputStyle}
                  placeholder="Ex: Paris FC, Agence XYZ…"
                  value={club}
                  onChange={e => setClub(e.target.value)}
                />
              </div>

              {error && <p style={{ fontSize: 13, color: '#ff6b6b', margin: 0 }}>{error}</p>}

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #00C896, #00a880)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  padding: '13px 0', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 150ms',
                }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Continuer <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Ajoutez votre premier joueur
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Un joueur que vous suivez en ce moment.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="skip"
                  checked={skipPlayer}
                  onChange={e => setSkipPlayer(e.target.checked)}
                  style={{ accentColor: '#00C896', width: 16, height: 16 }}
                />
                <label htmlFor="skip" style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Passer cette étape
                </label>
              </div>

              {!skipPlayer && (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Nom du joueur</label>
                    <input
                      style={inputStyle}
                      placeholder="Ex: Kylian Mbappé"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Poste</label>
                      <select
                        value={playerPos}
                        onChange={e => setPlayerPos(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                        Scout Score : <strong style={{ color: '#4D7FFF' }}>{playerScore}</strong>
                      </label>
                      <input
                        type="range"
                        min={0} max={100}
                        value={playerScore}
                        onChange={e => setPlayerScore(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#4D7FFF' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {error && <p style={{ fontSize: 13, color: '#ff6b6b', margin: 0 }}>{error}</p>}

              <button
                onClick={savePlayer}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #4D7FFF, #22D4E8)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  padding: '13px 0', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 150ms',
                }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {skipPlayer ? 'Passer' : 'Ajouter le joueur'} <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'center' }}>
              <div>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.30)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 32px rgba(0,200,150,0.20)',
                }}>
                  <CheckCircle size={30} color="#00C896" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                  Vous êtes prêt, {firstName || 'Scout'} !
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  Votre espace VIZION est configuré. Explorez les fonctionnalités ci-dessous.
                </p>
              </div>

              {/* Quick links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'left' }}>
                {[
                  { icon: LayoutDashboard, label: 'Dashboard',  desc: 'Vue d\'ensemble',        color: '#4D7FFF' },
                  { icon: Search,          label: 'Joueurs',    desc: 'Base de données',        color: '#00C896' },
                  { icon: Bookmark,        label: 'Shortlist',  desc: 'Suivre vos prospects',   color: '#F5A623' },
                  { icon: Users,           label: 'Comparateur',desc: 'Comparer des profils',   color: '#9B6DFF' },
                ].map(({ icon: Icon, label, desc, color }) => (
                  <div key={label} style={{
                    background: `${color}10`,
                    border: `1px solid ${color}25`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 7,
                      background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={15} color={color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p style={{ fontSize: 13, color: '#ff6b6b', margin: 0 }}>{error}</p>}

              <button
                onClick={finish}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #00C896, #4D7FFF)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  padding: '14px 0', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 0 28px rgba(0,200,150,0.25)',
                }}
              >
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Accéder à VIZION <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.20)', marginTop: 20 }}>
          VIZION — Football Scouting Intelligence
        </p>
      </div>
    </div>
  )
}
