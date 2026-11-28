import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AlertCircle, ImagePlus, Mic, RefreshCw, Send, Sparkles, Square, Trash2, Volume2, X } from 'lucide-react'
import './Assistant.css'

type AssistantUser = { id: string; name: string; role: string }
type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  imageDataUrl?: string
  source?: 'openai'
}
type AssistantState = {
  messages: AssistantMessage[]
  memory: string
  retentionHours: number
  modelReady: boolean
  generalAiReady: boolean
  imageGenerationReady: boolean
  faqModeReady: boolean
}

type SelectedImage = { dataUrl: string; name: string }
type PendingExternalRequest =
  | { kind: 'answer'; message: string; imageDataUrl?: string }
  | { kind: 'image'; message: string }
  | { kind: 'transcription'; audioDataUrl: string }

const BUSINESS_FAQ_SUGGESTIONS = [
  'How do I build a practical business strategy and 90-day plan?',
  'How do I conduct market research and validate demand?',
  'How do I compare competitors without guessing?',
  'How do I set a product price using unit economics?',
  'How do I create a measurable marketing and promotion plan?',
]

const FAQ_SUGGESTIONS: Record<string, string[]> = {
  'Super Admin': [
    'How do I import Sales leads?',
    'Why can’t a Manager see an Executive?',
    'How do I add a supplier?',
    'How do I build a practical business strategy and 90-day plan?',
  ],
  'Production Supervisor': [
    'Why is production not increasing finished-goods stock?',
    'How should I update stock?',
    'Who can dispatch a booked Sales order?',
    'How do I set a product price using unit economics?',
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
    'How do I create a measurable marketing and promotion plan?',
  ],
  'Store Manager': [
    'Why can’t I see a page, task, or business record?',
    'Who can see Chat messages and attachments?',
    'How do I change or reset my password?',
  ],
}

async function postAssistant<T>(action: string, values: Record<string, unknown> = {}): Promise<T> {
  const timeoutMs = action === 'generateGeneralImage'
    ? 70_000
    : action === 'transcribeGeneralAudio'
      ? 40_000
      : action === 'askAssistant'
        ? 60_000
        : action === 'askGeneralAssistant'
          ? 35_000
          : 30_000
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ action, ...values }),
      signal: controller.signal,
    })
    let result: T & { error?: string; message?: string }
    try {
      result = await response.json() as T & { error?: string; message?: string }
    } catch (error) {
      if (controller.signal.aborted) throw error
      result = {} as T & { error?: string; message?: string }
    }
    if (!response.ok) throw new Error(result.error || result.message || 'Mahalaxmi Saathi is temporarily unavailable.')
    return result
  } catch (requestError) {
    if (controller.signal.aborted) {
      throw new Error(action === 'getAssistantState'
        ? 'Saathi history took too long to load. Check the connection, then use Refresh to retry.'
        : 'Mahalaxmi Saathi request timed out. Please retry.')
    }
    throw requestError
  } finally {
    window.clearTimeout(timeout)
  }
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

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read the selected file.'))
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(blob)
  })
}

export function AssistantView({ user }: { user: AssistantUser }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [memory, setMemory] = useState('')
  const [modelReady, setModelReady] = useState(false)
  const [generalAiReady, setGeneralAiReady] = useState(false)
  const [imageGenerationReady, setImageGenerationReady] = useState(false)
  const [faqModeReady, setFaqModeReady] = useState(false)
  const [generalTask, setGeneralTask] = useState<'chat' | 'image'>('chat')
  const [generalMessages, setGeneralMessages] = useState<AssistantMessage[]>([])
  const [pendingExternal, setPendingExternal] = useState<PendingExternalRequest | null>(null)
  const [message, setMessage] = useState('')
  const [voiceTranscriptPending, setVoiceTranscriptPending] = useState(false)
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [recordingVoice, setRecordingVoice] = useState(false)
  const [transcribingVoice, setTranscribingVoice] = useState(false)
  const [clearingMemory, setClearingMemory] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)

  const reload = async () => {
    try {
      const state = await postAssistant<AssistantState>('getAssistantState')
      setMessages(state.messages)
      setMemory(state.memory)
      setModelReady(state.modelReady)
      setGeneralAiReady(state.generalAiReady)
      setImageGenerationReady(state.imageGenerationReady)
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
          setGeneralAiReady(state.generalAiReady)
          setImageGenerationReady(state.imageGenerationReady)
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

  useEffect(() => () => {
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop())
    if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, generalMessages, pendingExternal, sending, transcribingVoice])

  const appendOpenAiExchange = (
    question: string,
    answer: string,
    userImageDataUrl?: string,
    assistantImageDataUrl?: string,
  ) => {
    const createdAt = new Date().toISOString()
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      ...(userImageDataUrl ? { imageDataUrl: userImageDataUrl } : {}),
      source: 'openai',
      createdAt,
    }
    const assistantMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: answer,
      ...(assistantImageDataUrl ? { imageDataUrl: assistantImageDataUrl } : {}),
      source: 'openai',
      createdAt,
    }
    setGeneralMessages(previous => [...previous, userMessage, assistantMessage].slice(-8))
  }

  const confirmExternalRequest = async () => {
    if (!pendingExternal || sending) return
    const request = pendingExternal
    if (request.kind === 'image' ? !imageGenerationReady : !generalAiReady) {
      setError(request.kind === 'image'
        ? 'Image generation is not configured. Ask the administrator to check OPENAI_IMAGE_MODEL.'
        : 'General AI is not configured. Ask the administrator to check the OpenAI setup.')
      return
    }
    setSending(true)
    setError('')
    if (request.kind === 'transcription') setTranscribingVoice(true)
    try {
      if (request.kind === 'answer') {
        const result = await postAssistant<{ answer: string }>('askGeneralAssistant', {
          message: request.message,
          ...(request.imageDataUrl ? { imageDataUrl: request.imageDataUrl } : {}),
        })
        appendOpenAiExchange(request.message, result.answer, request.imageDataUrl)
        setSelectedImage(null)
        setMessage('')
      } else if (request.kind === 'image') {
        const result = await postAssistant<{ imageDataUrl: string }>('generateGeneralImage', { message: request.message })
        appendOpenAiExchange(
          request.message,
          'Generated image. Download it if you want to keep a copy.',
          undefined,
          result.imageDataUrl,
        )
        setMessage('')
        setGeneralTask('chat')
      } else {
        const result = await postAssistant<{ transcript: string }>('transcribeGeneralAudio', {
          audioDataUrl: request.audioDataUrl,
        })
        setMessage(previous => [previous.trim(), result.transcript].filter(Boolean).join(' '))
          setVoiceTranscriptPending(true)
      }
      setPendingExternal(null)
      if (request.kind !== 'transcription') setVoiceTranscriptPending(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'OpenAI could not complete this request.')
    } finally {
      setSending(false)
      setTranscribingVoice(false)
    }
  }

  const cancelExternalRequest = () => {
    setPendingExternal(null)
    setError('')
    if (generalTask === 'image') setGeneralTask('chat')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = message.trim()
    const prompt = question || (selectedImage ? 'Describe this image and summarize its visible contents.' : '')
    if (!prompt || sending || pendingExternal || recordingVoice || transcribingVoice) return

    if (selectedImage || voiceTranscriptPending) {
      setError('Saathi is in FAQ-only mode. Images and voice are not sent; no external request was made.')
      return
    }

    if (generalTask === 'image') {
      setError('Saathi is in FAQ-only mode. Image generation is paused; no external request was made.')
      return
    }

    if (!modelReady && !faqModeReady) {
      setError('The private ERP assistant is not ready. Check its setup, then retry.')
      return
    }
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
      setVoiceTranscriptPending(false)
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : 'Mahalaxmi Saathi could not answer.'
      if (generalAiReady && errorMessage.startsWith('No verified FAQ matches this question yet.')) {
        setPendingExternal({ kind: 'answer', message: question })
        setError('')
      } else {
        setError(errorMessage)
      }
      setMessage(question)
    } finally {
      setSending(false)
    }
  }

  const selectImage = async (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 1_500_000) {
      setError('Choose an image smaller than 1.5 MB.')
      return
    }
    try {
      const dataUrl = await readDataUrl(file)
      setSelectedImage({ dataUrl, name: file.name })
      setError('')
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not read the selected image.')
    }
  }

  const prepareVoiceTranscription = async (recording: Blob) => {
    if (!recording.size) {
      setError('No audio was captured. Check microphone permission and try again.')
      return
    }
    if (recording.size > 2 * 1024 * 1024) {
      setError('Keep the voice recording under 2 MB. Try a shorter recording.')
      return
    }
    setError('')
    try {
      const audioDataUrl = await readDataUrl(recording)
      setPendingExternal({ kind: 'transcription', audioDataUrl })
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Voice recording could not be prepared.')
    }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported by this browser. Try a current browser over HTTPS.')
      return
    }
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find(type => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined)
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      recordedChunksRef.current = []
      recorder.ondataavailable = event => {
        if (event.data.size) recordedChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const recording = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        mediaStreamRef.current?.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
        mediaRecorderRef.current = null
        void prepareVoiceTranscription(recording)
      }
      recorder.start()
      setRecordingVoice(true)
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
        setRecordingVoice(false)
        recordingTimerRef.current = null
      }, 30_000)
    } catch (recordingError) {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      setRecordingVoice(false)
      setError(recordingError instanceof Error
        ? `Microphone could not start: ${recordingError.message}`
        : 'Microphone could not start. Check browser permission and try again.')
    }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') recorder.stop()
    setRecordingVoice(false)
  }

  const readAloud = (text: string) => {
    if (typeof window.speechSynthesis === 'undefined') {
      setError('Text-to-speech is not available in this browser.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = /[\u0A80-\u0AFF]/.test(text)
      ? 'gu-IN'
      : /[\u0900-\u097F]/.test(text)
        ? 'hi-IN'
        : navigator.language
    window.speechSynthesis.speak(utterance)
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

  const canAsk = modelReady || faqModeReady || generalAiReady || imageGenerationReady
  const visibleMessages = [...messages, ...generalMessages]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
  const suggestions = FAQ_SUGGESTIONS[user.role] || FAQ_SUGGESTIONS['Store Manager']

  return (
    <section className="assistant-page">
      <div className="page-heading assistant-heading">
        <div className="assistant-heading-copy">
          <p>ERP & GENERAL HELP</p>
          <h1><Sparkles size={24} /> Mahalaxmi Saathi</h1>
          <span>Hi {user.name} — ask ERP, business, image, or voice questions in this one chat.</span>
        </div>
        <button className="secondary" type="button" onClick={() => { setLoading(true); void reload() }} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <p className="assistant-privacy-note assistant-external-notice">
        One chat: ERP questions stay on the private assistant. Before any general question, image, or voice recording is sent to OpenAI, Saathi asks you to confirm.
        Only the content you approve is sent—not ERP records, tasks, private chat history, or saved memory. OpenAI replies stay in this browser session.
        Voice transcripts can be reviewed before sending. Read aloud uses your browser/device voice. Market research is a framework, not live web research; video generation is unavailable.
        Avoid confidential information and credentials. OpenAI usage may incur separate charges.
      </p>

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
          {loading && <div className="assistant-empty">Loading your saved ERP assistant history…</div>}
          {visibleMessages.length === 0 && (
            <div className="assistant-welcome">
              <span className="assistant-welcome-icon"><Sparkles size={24} /></span>
              <strong>Namaste, {user.name}</strong>
              <p>Ask about documented ERP workflows or use the business-planning FAQs. This chat is currently FAQ-only.</p>
              <div className="assistant-suggestions" aria-label="Suggested Saathi questions">
                {[...suggestions.slice(0, 2), ...BUSINESS_FAQ_SUGGESTIONS].map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} disabled={sending || Boolean(pendingExternal)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {visibleMessages.map(item => (
            <article key={item.id} className={`assistant-message ${item.role === 'user' ? 'own' : ''}`}>
              <div className="assistant-message-meta">
                <strong>{item.role === 'user' ? user.name : 'Mahalaxmi Saathi'}</strong>
                <span className={`assistant-source-badge ${item.source === 'openai' ? 'external' : ''}`}>
                  {item.source === 'openai' ? 'OpenAI · confirmed' : 'Private ERP'}
                </span>
                <time dateTime={item.createdAt}>{assistantTime(item.createdAt)}</time>
              </div>
              <p>{item.content}</p>
              {item.imageDataUrl && (
                <div className="assistant-message-image">
                  <img src={item.imageDataUrl} alt={item.role === 'user' ? 'Image submitted for analysis' : 'AI-generated image'} />
                  {item.role === 'assistant' && (
                    <a href={item.imageDataUrl} download="saathi-generated-image.jpg">Download image</a>
                  )}
                </div>
              )}
              {item.role === 'assistant' && (
                <button className="assistant-speak-button" type="button" onClick={() => readAloud(item.content)}>
                  <Volume2 size={14} /> Read aloud
                </button>
              )}
            </article>
          ))}
          {(sending || transcribingVoice) && <div className="assistant-thinking" role="status"><span /> {transcribingVoice ? 'Transcribing your voice…' : generalTask === 'image' ? 'Creating your image…' : 'Saathi is thinking…'}</div>}
          {pendingExternal && (
            <section className="assistant-external-confirm" aria-label="Confirm OpenAI request">
              <strong>Confirm before sending to OpenAI</strong>
              <p>{pendingExternal.kind === 'transcription'
                ? 'Your voice recording will be sent to OpenAI for transcription. The transcript will return to this box for you to review; it will not be sent as a question until you submit it.'
                : pendingExternal.kind === 'image'
                  ? 'Only this image description will be sent to OpenAI to generate an image.'
                  : 'Only this question and the image attached below (if any) will be sent to OpenAI. ERP records, tasks, memory, and private chat history are not included.'}</p>
              {pendingExternal.kind !== 'transcription' && <blockquote>{pendingExternal.message}</blockquote>}
              <div className="assistant-external-confirm-actions">
                <button className="primary" type="button" onClick={() => void confirmExternalRequest()} disabled={sending}>
                  {pendingExternal.kind === 'transcription' ? 'Transcribe with OpenAI' : 'Send to OpenAI'}
                </button>
                <button className="secondary" type="button" onClick={cancelExternalRequest} disabled={sending}>
                  Cancel
                </button>
              </div>
            </section>
          )}
          <div ref={endRef} />
        </div>
        <form className="assistant-composer" onSubmit={submit}>
          {selectedImage && generalTask === 'chat' && (
            <div className="assistant-image-preview">
              <img src={selectedImage.dataUrl} alt="Selected image preview" />
              <span>{selectedImage.name}</span>
              <button type="button" aria-label="Remove selected image" onClick={() => setSelectedImage(null)} disabled={sending || Boolean(pendingExternal)}>
                <X size={15} />
              </button>
            </div>
          )}
          {generalTask === 'chat' && (
            <input
              ref={imageInputRef}
              className="assistant-sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose an image to analyze"
              onChange={event => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                void selectImage(file)
              }}
            />
          )}
          <div className="assistant-composer-row">
            <div className="assistant-media-controls">
              <button
                className="secondary assistant-icon-button"
                type="button"
                title="Attach an image for analysis"
                aria-label="Attach an image for analysis"
                onClick={() => imageInputRef.current?.click()}
                disabled={!generalAiReady || generalTask === 'image' || sending || recordingVoice || transcribingVoice || Boolean(pendingExternal)}
              >
                <ImagePlus size={17} />
              </button>
              <button
                className={`secondary assistant-icon-button ${recordingVoice ? 'recording' : ''}`}
                type="button"
                title={recordingVoice ? 'Stop recording' : 'Record a voice question'}
                aria-label={recordingVoice ? 'Stop recording' : 'Record a voice question'}
                onClick={() => recordingVoice ? stopRecording() : void startRecording()}
                disabled={!generalAiReady || sending || transcribingVoice || Boolean(pendingExternal)}
              >
                {recordingVoice ? <Square size={16} /> : <Mic size={17} />}
              </button>
              <button
                className={`secondary assistant-create-image ${generalTask === 'image' ? 'selected' : ''}`}
                type="button"
                onClick={() => {
                  setGeneralTask(previous => previous === 'image' ? 'chat' : 'image')
                  setSelectedImage(null)
                  setError('')
                }}
                disabled={!imageGenerationReady || sending || recordingVoice || transcribingVoice || Boolean(pendingExternal)}
                title={imageGenerationReady ? 'Describe an image to create' : 'Image generation is not configured'}
              >
                Create image
              </button>
            </div>
            <label className="assistant-sr-only" htmlFor="assistant-message">Ask Mahalaxmi Saathi</label>
            <textarea
              id="assistant-message"
              value={message}
              onChange={event => {
                setMessage(event.target.value)
                setVoiceTranscriptPending(false)
              }}
              onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }}
              placeholder={generalTask === 'image'
                ? 'Image generation is paused in FAQ-only mode…'
                : 'Ask Saathi about an ERP workflow or business-planning FAQ…'}
              maxLength={generalTask === 'image' ? 2000 : 3000}
              rows={2}
              disabled={!canAsk || sending || recordingVoice || transcribingVoice || Boolean(pendingExternal)}
            />
            <button
              className="primary"
              type="submit"
              disabled={!canAsk || sending || recordingVoice || transcribingVoice || Boolean(pendingExternal) ||
                (generalTask === 'image' ? !message.trim() : !message.trim() && !selectedImage)}
            >
              <Send size={16} />
              {sending ? 'Sending…' : generalTask === 'image' ? 'Create image' : 'Send'}
            </button>
          </div>
        </form>
        <div className="assistant-composer-note">
          Enter sends; Shift+Enter starts a new line. Saathi answers documented FAQs only; no ERP live lookup or external AI request is made.
          OpenAI messages are temporary in this browser. Review voice transcripts before sending; “Read aloud” uses your browser/device voice.
          {' '}Verify important decisions in the ERP or with your supervisor.
        </div>
      </div>
    </section>
  )
}
