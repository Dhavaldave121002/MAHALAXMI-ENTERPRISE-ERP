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

const GENERAL_SUGGESTIONS = [
  'Create a practical business plan for my product and target customers.',
  'Design a market-research plan for my product in my target city.',
  'Build a SWOT analysis and recommend the top three actions.',
  'Help me set a price using costs, margin, and competitor research.',
  'Create a 90-day go-to-market strategy with measurable milestones.',
]

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
  const [mode, setMode] = useState<'erp' | 'general'>('erp')
  const [generalTask, setGeneralTask] = useState<'chat' | 'image'>('chat')
  const [generalMessages, setGeneralMessages] = useState<AssistantMessage[]>([])
  const [message, setMessage] = useState('')
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
  }, [messages, sending])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = message.trim()
    const canAsk = mode === 'general'
      ? generalTask === 'image' ? imageGenerationReady : generalAiReady
      : modelReady || faqModeReady
    const prompt = question || (selectedImage ? 'Describe this image and summarize its visible contents.' : '')
    if (!prompt || sending || !canAsk || recordingVoice || transcribingVoice) return
    setSending(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'general') {
        if (generalTask === 'image') {
          const result = await postAssistant<{ imageDataUrl: string }>('generateGeneralImage', { message: prompt })
          const createdAt = new Date().toISOString()
          const userMessage: AssistantMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: prompt,
            createdAt,
          }
          const assistantMessage: AssistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Generated image. Download it if you want to keep a copy.',
            imageDataUrl: result.imageDataUrl,
            createdAt,
          }
          setGeneralMessages(previous => [...previous, userMessage, assistantMessage].slice(-8))
        } else {
          const result = await postAssistant<{ answer: string }>('askGeneralAssistant', {
            message: prompt,
            ...(selectedImage ? { imageDataUrl: selectedImage.dataUrl } : {}),
          })
          const createdAt = new Date().toISOString()
          const userMessage: AssistantMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: prompt,
            ...(selectedImage ? { imageDataUrl: selectedImage.dataUrl } : {}),
            createdAt,
          }
          const assistantMessage: AssistantMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.answer,
            createdAt,
          }
          setGeneralMessages(previous => [...previous, userMessage, assistantMessage].slice(-8))
          setSelectedImage(null)
        }
      } else {
        const result = await postAssistant<{
          userMessage: AssistantMessage
          assistantMessage: AssistantMessage
          memory: string
        }>('askAssistant', { message: question })
        setMessages(previous => [...previous, result.userMessage, result.assistantMessage].slice(-40))
        setMemory(result.memory)
      }
    } catch (requestError) {
      setMessage(question)
      setError(requestError instanceof Error ? requestError.message : 'Mahalaxmi Saathi could not answer.')
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

  const transcribeRecording = async (recording: Blob) => {
    if (!recording.size) {
      setError('No audio was captured. Check microphone permission and try again.')
      return
    }
    if (recording.size > 2 * 1024 * 1024) {
      setError('Keep the voice recording under 2 MB. Try a shorter recording.')
      return
    }
    setTranscribingVoice(true)
    setError('')
    try {
      const audioDataUrl = await readDataUrl(recording)
      const result = await postAssistant<{ transcript: string }>('transcribeGeneralAudio', { audioDataUrl })
      setMessage(previous => [previous.trim(), result.transcript].filter(Boolean).join(' '))
    } catch (transcriptionError) {
      setError(transcriptionError instanceof Error ? transcriptionError.message : 'Voice transcription failed.')
    } finally {
      setTranscribingVoice(false)
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
        void transcribeRecording(recording)
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

  const canAsk = mode === 'general'
    ? generalTask === 'image' ? imageGenerationReady : generalAiReady
    : modelReady || faqModeReady
  const visibleMessages = mode === 'general' ? generalMessages : messages
  const suggestions = FAQ_SUGGESTIONS[user.role] || FAQ_SUGGESTIONS['Store Manager']

  return (
    <section className="assistant-page">
      <div className="page-heading assistant-heading">
        <div className="assistant-heading-copy">
          <p>ERP & GENERAL HELP</p>
          <h1><Sparkles size={24} /> Mahalaxmi Saathi</h1>
          <span>Hi {user.name} — get private ERP guidance or general business planning and creative help.</span>
        </div>
        <button className="secondary" type="button" onClick={() => { setLoading(true); void reload() }} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="assistant-mode-picker" role="group" aria-label="Choose assistant mode">
        <button
          className={mode === 'erp' ? 'selected' : ''}
          type="button"
          aria-pressed={mode === 'erp'}
          onClick={() => { setMode('erp'); setError(''); setSelectedImage(null) }}
          disabled={sending || recordingVoice || transcribingVoice}
        >
          Private ERP assistant
        </button>
        <button
          className={mode === 'general' ? 'selected' : ''}
          type="button"
          aria-pressed={mode === 'general'}
          onClick={() => { setMode('general'); setError(''); setSelectedImage(null) }}
          disabled={(!generalAiReady && !imageGenerationReady) || sending || recordingVoice || transcribingVoice}
          title={generalAiReady || imageGenerationReady ? 'Use opted-in OpenAI general and media features' : 'General AI is not configured'}
        >
          General AI (OpenAI)
        </button>
      </div>

      {mode === 'general' ? (
        <p className="assistant-privacy-note assistant-external-notice">
          Only the text, image, or voice recording you choose to submit is sent to OpenAI; ERP records, tasks, private chat history, and saved memory are not included or saved here.
          Voice is transcribed by OpenAI; review the transcript before sending. Spoken replies use your browser/device voice. This integration cannot browse live sources, so market research is a plan/framework—not verified current research.
          Video generation is not available here. Do not include confidential information, passwords, or API keys. OpenAI usage may incur separate charges.
        </p>
      ) : (
        <p className="assistant-privacy-note">
          Saathi uses your signed-in role and only retrieves matching ERP records or tasks you are allowed to see. It cannot change ERP records.
          Chat moves to private Drive Trash after 24 hours of inactivity and is permanently removed after 30 days.
          A separate memory summary stays until you clear it.
        </p>
      )}

      {mode === 'erp' && !modelReady && (
        <div className="assistant-setup-note" role="status">
          <AlertCircle size={18} />
          <span>Private AI is not connected. You can ask documented FAQs, but full multilingual answers and live ERP lookups need the company model server.</span>
        </div>
      )}
      {!generalAiReady && (
        <div className="assistant-setup-note" role="status">
          <AlertCircle size={18} />
          <span>General AI is not configured. An administrator can configure the server-only OpenAI API settings; never paste an API key into chat or frontend code.</span>
        </div>
      )}
      {mode === 'general' && !imageGenerationReady && (
        <div className="assistant-setup-note" role="status">
          <AlertCircle size={18} />
          <span>Image generation is not configured. An administrator must set the server-side OPENAI_IMAGE_MODEL. OpenAI video generation is not currently available in this integration.</span>
        </div>
      )}
      {error && <div className="assistant-error" role="alert"><AlertCircle size={17} />{error}</div>}

      {mode === 'erp' && <details className="assistant-memory">
        <summary>Saved AI memory <span>{memory ? 'Stored separately from chat history' : 'No saved memory yet'}</span></summary>
        <div className="assistant-memory-content">
          <p>{memory || 'Saathi may save a short summary of useful conversation context. It is instructed not to save passwords or API keys; do not send secrets in chat.'}</p>
          <button className="secondary" type="button" onClick={() => void clearMemory()} disabled={!memory || clearingMemory}>
            <Trash2 size={15} /> {clearingMemory ? 'Clearing…' : 'Clear my AI memory'}
          </button>
        </div>
      </details>}

      {mode === 'general' && (
        <div className="assistant-mode-picker assistant-task-picker" role="group" aria-label="Choose general AI task">
          <button
            className={generalTask === 'chat' ? 'selected' : ''}
            type="button"
            aria-pressed={generalTask === 'chat'}
            onClick={() => { setGeneralTask('chat'); setError('') }}
            disabled={sending || recordingVoice || transcribingVoice}
          >
            Business & general help
          </button>
          <button
            className={generalTask === 'image' ? 'selected' : ''}
            type="button"
            aria-pressed={generalTask === 'image'}
            onClick={() => { setGeneralTask('image'); setSelectedImage(null); setError('') }}
            disabled={!imageGenerationReady || sending || recordingVoice || transcribingVoice}
            title={imageGenerationReady ? 'Generate an image from a description' : 'Image generation is not configured'}
          >
            Generate image
          </button>
        </div>
      )}

      <div className="assistant-workspace">
        <div className="assistant-messages" aria-live="polite">
          {loading && mode === 'erp' && <div className="assistant-empty">Loading your private assistant history…</div>}
          {!loading && visibleMessages.length === 0 && (
            <div className="assistant-welcome">
              <span className="assistant-welcome-icon"><Sparkles size={24} /></span>
              <strong>Namaste, {user.name}</strong>
              <p>{mode === 'general'
                ? generalTask === 'image'
                  ? 'Describe the image you want. Generated images are temporary in this browser session; download anything you want to keep.'
                  : 'Ask about business planning, pricing, SWOT, or research strategy. This mode cannot access ERP records or live web search.'
                : modelReady
                  ? 'Ask about ERP workflows or your assigned work.'
                  : 'Ask a documented workflow FAQ. Live ERP details need the private AI server.'}</p>
              {mode === 'erp' && <div className="assistant-suggestions" aria-label="Suggested questions">
                {suggestions.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} disabled={sending}>
                    {suggestion}
                  </button>
                ))}
              </div>}
              {mode === 'general' && generalTask === 'chat' && (
                <div className="assistant-suggestions" aria-label="Business planning prompt ideas">
                  {GENERAL_SUGGESTIONS.map(suggestion => (
                    <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} disabled={sending}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {visibleMessages.map(item => (
            <article key={item.id} className={`assistant-message ${item.role === 'user' ? 'own' : ''}`}>
              <div className="assistant-message-meta">
                <strong>{item.role === 'user' ? user.name : 'Mahalaxmi Saathi'}</strong>
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
              {mode === 'general' && item.role === 'assistant' && (
                <button className="assistant-speak-button" type="button" onClick={() => readAloud(item.content)}>
                  <Volume2 size={14} /> Read aloud
                </button>
              )}
            </article>
          ))}
          {(sending || transcribingVoice) && (
            <div className="assistant-thinking" role="status"><span /> {transcribingVoice ? 'Transcribing your voice…' : generalTask === 'image' && mode === 'general' ? 'Creating your image…' : 'Saathi is thinking…'}</div>
          )}
          <div ref={endRef} />
        </div>
        <form className="assistant-composer" onSubmit={submit}>
          {selectedImage && mode === 'general' && generalTask === 'chat' && (
            <div className="assistant-image-preview">
              <img src={selectedImage.dataUrl} alt="Selected image preview" />
              <span>{selectedImage.name}</span>
              <button type="button" aria-label="Remove selected image" onClick={() => setSelectedImage(null)} disabled={sending}>
                <X size={15} />
              </button>
            </div>
          )}
          {mode === 'general' && generalTask === 'chat' && (
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
            {mode === 'general' && generalTask === 'chat' && (
              <div className="assistant-media-controls">
                <button
                  className="secondary assistant-icon-button"
                  type="button"
                  title="Attach an image for analysis"
                  aria-label="Attach an image for analysis"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!generalAiReady || sending || recordingVoice || transcribingVoice}
                >
                  <ImagePlus size={17} />
                </button>
                <button
                  className={`secondary assistant-icon-button ${recordingVoice ? 'recording' : ''}`}
                  type="button"
                  title={recordingVoice ? 'Stop recording' : 'Record a voice question'}
                  aria-label={recordingVoice ? 'Stop recording' : 'Record a voice question'}
                  onClick={() => recordingVoice ? stopRecording() : void startRecording()}
                  disabled={!generalAiReady || sending || transcribingVoice}
                >
                  {recordingVoice ? <Square size={16} /> : <Mic size={17} />}
                </button>
              </div>
            )}
            <label className="assistant-sr-only" htmlFor="assistant-message">Ask Mahalaxmi Saathi</label>
            <textarea
              id="assistant-message"
              value={message}
              onChange={event => setMessage(event.target.value)}
              onKeyDown={(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }}
              placeholder={mode === 'general'
                ? generalTask === 'image'
                  ? 'Describe the image you want to create…'
                  : 'Ask about business plans, market research, or attach an image…'
                : modelReady ? 'Ask about ERP work or your assigned tasks…' : 'Ask a documented ERP workflow FAQ…'}
              maxLength={mode === 'general' && generalTask === 'image' ? 2000 : 3000}
              rows={2}
              disabled={!canAsk || sending || recordingVoice || transcribingVoice}
            />
            <button
              className="primary"
              type="submit"
              disabled={!canAsk || sending || recordingVoice || transcribingVoice ||
                (mode === 'general' && generalTask === 'chat' ? !message.trim() && !selectedImage : !message.trim())}
            >
              <Send size={16} />
              {sending ? 'Sending…' : mode === 'general' ? generalTask === 'image' ? 'Generate image' : 'Ask OpenAI' : 'Send'}
            </button>
          </div>
        </form>
        <div className="assistant-composer-note">
          Enter sends; Shift+Enter starts a new line. {mode === 'general'
            ? generalTask === 'chat'
              ? 'Images and answers stay in this browser session only. Voice recordings are sent to OpenAI for transcription; review the text before sending. “Read aloud” uses your browser/device voice.'
              : 'Image requests are sent to OpenAI and results stay in this browser session; download to save. Video generation is not available here.'
            : modelReady ? 'Ask in any language.' : 'Full multilingual answers need the private AI server.'}
          {' '}Answers can be wrong; verify important decisions in the ERP or with your supervisor.
        </div>
      </div>
    </section>
  )
}
