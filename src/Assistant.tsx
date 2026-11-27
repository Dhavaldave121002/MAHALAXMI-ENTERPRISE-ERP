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
  faqModeReady: boolean
}

const FAQ_SUGGESTIONS: Record<string, string[]> = {
  'Super Admin': [
    'How do I import Sales leads?',
    'Why can’t a Manager see an Executive?',
    'How do I add a supplier?',
  ],
  'Production Supervisor': [
    'Why is production not increasing finished-goods stock?',
    'How should I update stock?',
    'Who can dispatch a booked Sales order?',
  ],
  'Machine Operator': [
    'Who records production and reviews quality?',
    'How are production targets assigned?',
    'Why is production not increasing finished-goods stock?',
  ],
  'Sales Executive': [
    'Why was my Sales order booking rejected?',
    'How do Sales order cancellations affect targets?',
    'Who can dispatch a booked Sales order?',
  ],
  'E-commerce Manager': [
    'How do I submit an E-commerce daily report?',
    'How are E-commerce targets counted?',
    'Why can’t I see an Executive?',
  ],
  'E-commerce Executive': [
    'How do I complete an E-commerce task or daily report?',
    'How do I get access to a marketplace platform?',
    'How are E-commerce targets counted?',
  ],
  'Graphic Designer': [
    'How do I plan Graphic Design work?',
    'How do I share my screen or camera?',
    'How do I complete a Daily Task?',
  ],
  'Store Manager': [
    'Why can’t I see a page, task, or business record?',
    'Who can see Chat messages and attachments?',
    'How do I change or reset my password?',
  ],
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
  const [faqModeReady, setFaqModeReady] = useState(false)
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
      setFaqModeReady(state.faqModeReady)
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
          setFaqModeReady(state.faqModeReady)
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
    if (!question || sending || (!modelReady && !faqModeReady)) return
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

  const canAsk = modelReady || faqModeReady
  const suggestions = FAQ_SUGGESTIONS[user.role] || FAQ_SUGGESTIONS['Store Manager']

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
          <span>Private AI is not connected. You can still ask documented FAQs; live ERP lookups and unmatched questions need the company model server.</span>
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
              <p>{modelReady ? 'Ask about ERP workflows or your assigned work.' : 'Ask a documented workflow FAQ. Live ERP details need the private AI server.'}</p>
              <div className="assistant-suggestions" aria-label="Suggested questions">
                {suggestions.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} disabled={sending}>
                    {suggestion}
                  </button>
                ))}
              </div>
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
            placeholder={modelReady ? 'Ask about ERP work or your assigned tasks…' : 'Ask a documented ERP workflow FAQ…'}
            maxLength={3000}
            rows={2}
            disabled={!canAsk || sending}
          />
          <button className="primary" type="submit" disabled={!canAsk || sending || !message.trim()}>
            <Send size={16} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
        <div className="assistant-composer-note">Answers can be wrong. Check important decisions in the ERP or with your supervisor.</div>
      </div>
    </section>
  )
}
