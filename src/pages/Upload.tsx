import { useState, useRef } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Download, Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportResults {
  inserted: number
  updated:  number
  errors:   string[]
}

// ── Template ──────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = 'name,team,primary_position,age,competition,nationality,scout_score'
const TEMPLATE_EXAMPLE = 'Kylian Mbappé,Real Madrid,ST,26,La Liga,French,88'

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? '' })
    return row
  })
  return { headers, rows }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Upload() {
  const [csvFile,    setCsvFile]    = useState<File | null>(null)
  const [preview,    setPreview]    = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [importing,  setImporting]  = useState(false)
  const [results,    setResults]    = useState<ImportResults | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setCsvFile(file)
    setResults(null)
    const text = await file.text()
    const parsed = parseCSV(text)
    setPreview({ headers: parsed.headers, rows: parsed.rows.slice(0, 5) })
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const reset = () => {
    setCsvFile(null)
    setPreview(null)
    setResults(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!csvFile) return
    setImporting(true)
    setResults(null)

    const text = await csvFile.text()
    const { rows } = parseCSV(text)

    let inserted = 0
    let updated  = 0
    const errors: string[] = []

    for (const player of rows) {
      if (!player.name) continue
      try {
        const { data: ex } = await supabase
          .from('players')
          .select('id')
          .ilike('name', player.name)
          .limit(1)
          .maybeSingle()

        if (ex) {
          await supabase.from('players').update(player).eq('id', ex.id)
          updated++
        } else {
          await supabase.from('players').insert(player)
          inserted++
        }
      } catch (e) {
        errors.push(`${player.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    setResults({ inserted, updated, errors })
    setImporting(false)
  }

  // ── Template download ───────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const content = [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'vizion-players-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ color: 'var(--text-primary)', paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(77,127,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UploadIcon size={18} color="#4D7FFF" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Import CSV Joueurs</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Importez votre base de joueurs depuis un fichier CSV
            </p>
          </div>
        </div>

        <button
          onClick={downloadTemplate}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Download size={14} />
          Télécharger template CSV
        </button>
      </div>

      {/* Colonnes attendues */}
      <div style={{
        background: 'rgba(77,127,255,0.08)', border: '1px solid rgba(77,127,255,0.20)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 24,
        fontSize: 12, color: 'rgba(77,127,255,0.9)',
      }}>
        <strong>Colonnes supportées :</strong>{' '}
        <code style={{ fontFamily: 'var(--font-mono)' }}>
          name, team, primary_position, age, competition, nationality, scout_score, foot, xg, xa, goals, assists, minutes_played
        </code>
      </div>

      {/* Drop zone */}
      {!csvFile ? (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            border: '2px dashed rgba(255,255,255,0.12)',
            borderRadius: 14, padding: '64px 24px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            cursor: 'pointer',
            transition: 'border-color 200ms, background 200ms',
            marginBottom: 24,
          }}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon size={40} color="rgba(255,255,255,0.20)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
            Glissez votre fichier CSV ici
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>ou</p>
          <label style={{
            background: '#4D7FFF', color: 'white',
            padding: '9px 20px', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            Parcourir
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={onInputChange}
            />
          </label>
        </div>
      ) : (
        /* File selected */
        <div style={{
          background: 'rgba(0,200,150,0.08)',
          border: '1px solid rgba(0,200,150,0.25)',
          borderRadius: 12, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 24,
        }}>
          <FileText size={20} color="#00C896" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{csvFile.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {(csvFile.size / 1024).toFixed(1)} KB
              {preview && ` · ${preview.rows.length < 5
                ? preview.rows.length
                : '5+'} lignes (aperçu)`}
            </p>
          </div>
          <button
            onClick={reset}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Preview table */}
      {preview && preview.rows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
            Aperçu — 5 premières lignes
          </p>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {preview.headers.map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      color: 'var(--text-muted)', fontWeight: 600,
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < preview.rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    {preview.headers.map(h => (
                      <td key={h} style={{
                        padding: '8px 12px',
                        color: 'var(--text-primary)',
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row[h] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {csvFile && !results && (
        <button
          onClick={handleImport}
          disabled={importing}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: importing ? 'rgba(77,127,255,0.5)' : '#4D7FFF',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '14px 0', fontSize: 15, fontWeight: 700,
            cursor: importing ? 'not-allowed' : 'pointer',
            transition: 'background 200ms',
          }}
        >
          {importing
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Import en cours…</>
            : <><UploadIcon size={16} /> Importer les joueurs</>
          }
        </button>
      )}

      {/* Results */}
      {results && (
        <div style={{
          background: results.errors.length === 0
            ? 'rgba(0,200,150,0.08)'
            : 'rgba(245,166,35,0.08)',
          border: `1px solid ${results.errors.length === 0
            ? 'rgba(0,200,150,0.25)'
            : 'rgba(245,166,35,0.25)'}`,
          borderRadius: 12, padding: 24,
        }}>
          {/* Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: results.errors.length > 0 ? 16 : 0 }}>
            <CheckCircle size={20} color="#00C896" />
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
              Import terminé —{' '}
              <span style={{ color: '#00C896' }}>{results.inserted} insérés</span>
              {' · '}
              <span style={{ color: '#4D7FFF' }}>{results.updated} mis à jour</span>
              {results.errors.length > 0 && (
                <>{' · '}<span style={{ color: '#F5A623' }}>{results.errors.length} erreur{results.errors.length > 1 ? 's' : ''}</span></>
              )}
            </p>
          </div>

          {/* Errors */}
          {results.errors.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.errors.map((err, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.20)',
                  borderRadius: 8, padding: '8px 12px',
                  fontSize: 12,
                }}>
                  <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Import again */}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Importer un autre fichier
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
