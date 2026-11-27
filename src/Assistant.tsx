import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
import './Assistant.css'

type AssistantUser = { id: string; name: string; role: string }
type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}
type AssistantState = {
  messages: AssistantMessage[]
  memory: string
  retentionHours: number
  modelReady: boolean
}

async function postAssistant<T>(action: string, values: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/erp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ action, ...values }),
  })
  const result = await response.json().catch(() => ({})) as T & { error?: string; message?: string }
  if (!response.ok) throw new Error(result.error || result.message || 'Mahalaxmi Saathi is temporarily unavailable.')
  return result
}

function assistantTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

export function AssistantView({ user }: { user: AssistantUser }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [memory, setMemory] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [clearingMemory, setClearingMemory] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const reload = async () => {
    try {
      const state = await postAssistant<AssistantState>('getAssistantState')
      setMessages(state.messages)
      setMemory(state.memory)
      setModelReady(state.modelReady)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load Mahalaxmi Saathi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const state = await postAssistant<AssistantState>('getAssistantState')
        if (active) {
          setMessages(state.messages)
          setMemory(state.memory)
          setModelReady(state.modelReady)
          setError('')
        }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load Mahalaxmi Saathi.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = message.trim()
    if (!question || sending || !modelReady) return
    setSending(true)
    setError('')
    setMessage('')
    try {
      const result = await postAssistant<{
        userMessage: AssistantMessage
        assistantMessage: AssistantMessage
        memory: string
      }>('askAssistant', { message: question })
      setMessages(previous => [...previous, result.userMessage, result.assistantMessage].slice(-40))
      setMemory(result.memory)
    } catch (requestError) {
      setMessage(question)
      setError(requestError instanceof Error ? requestError.message : 'Mahalaxmi Saathi could not answer.')
    } finally {
      setSending(false)
    }
  }

  const clearMemory = async () => {
    if (!window.confirm('Clear Mahalaxmi Saathi’s saved memory for your account? Current chat messages will remain until their 24-hour expiry.')) return
    setClearingMemory(true)
    setError('')
    try {
      await postAssistant<{ cleared: boolean }>('clearAssistantMemory')
      setMemory('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Saved memory could not be cleared.')
    } finally {
      setClearingMemory(false)
    }
  }

  return (
    <section className="assistant-page">
      <div className="page-heading assistant-heading">
        <div className="assistant-heading-copy">
          <p>PRIVATE ERP HELPER</p>
          <h1><Sparkles size={24} /> Mahalaxmi Saathi</h1>
          <span>Hi {user.name} — ask for ERP guidance or details about your assigned daily tasks.</span>
        </div>
        <button className="secondary" type="button" onClick={() => { setLoading(true); void reload() }} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <p className="assistant-privacy-note">
        Saathi uses your signed-in role and only retrieves matching ERP records or tasks you are allowed to see. It cannot change ERP records.
        Chat moves to private Drive Trash after 24 hours of inactivity and is permanently removed after 30 days.
        A separate memory summary stays until you clear it.
      </p>

      {!modelReady && (
        <div className="assistant-setup-note" role="status">
          <AlertCircle size={18} />
          <span>Private AI setup is incomplete. Ask the administrator to configure the company model server.</span>
        </div>
      )}
      {error && <div className="assistant-error" role="alert"><AlertCircle size={17} />{error}</div>}

      <details className="assistant-memory">
        <summary>Saved AI memory <span>{memory ? 'Stored separately from chat history' : 'No saved memory yet'}</span></summary>
        <div className="assistant-memory-content">
          <p>{memory || 'Saathi may save a short summary of useful conversation context. It is instructed not to save passwords or API keys; do not send secrets in chat.'}</p>
          <button className="secondary" type="button" onClick={() => void clearMemory()} disabled={!memory || clearingMemory}>
            <Trash2 size={15} /> {clearingMemory ? 'Clearing…' : 'Clear my AI memory'}
          </button>
        </div>
      </details>

      <div className="assistant-workspace">
        <div className="assistant-messages" aria-live="polite">
          {loading && <div className="assistant-empty">Loading your private assistant history…</div>}
          {!loading && messages.length === 0 && (
            <div className="assistant-welcome">
              <span className="assistant-welcome-icon"><Sparkles size={24} /></span>
              <strong>Namaste, {user.name}</strong>
              <p>Ask how an ERP page works, or ask about your assigned daily tasks.</p>
              <span>Example: “Show my pending tasks”</span>
            </div>
          )}
          {messages.map(item => (
            <article key={item.id} className={`assistant-message ${item.role === 'user' ? 'own' : ''}`}>
              <div className="assistant-message-meta">
                <strong>{item.role === 'user' ? user.name : 'Mahalaxmi Saathi'}</strong>
                <time dateTime={item.createdAt}>{assistantTime(item.createdAt)}</time>
              </div>
              <p>{item.content}</p>
            </article>
          ))}
          {sending && <div className="assistant-thinking" role="status"><span /> Saathi is thinking…</div>}
          <div ref={endRef} />
        </div>
        <form className="assistant-composer" onSubmit={submit}>
          <label className="assistant-sr-only" htmlFor="assistant-message">Ask Mahalaxmi Saathi</label>
          <textarea
            id="assistant-message"
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder={modelReady ? 'Ask about ERP work or your assigned tasks…' : 'Private AI server setup is required before you can chat.'}
            maxLength={3000}
            rows={2}
            disabled={!modelReady || sending}
          />
          <button className="primary" type="submit" disabled={!modelReady || sending || !message.trim()}>
            <Send size={16} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
        <div className="assistant-composer-note">Answers can be wrong. Check important decisions in the ERP or with your supervisor.</div>
      </div>
    </section>
  )
}
