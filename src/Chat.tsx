import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, FileText, Image, MessageCircle, Paperclip, RefreshCw, Send, X } from 'lucide-react'
import './Chat.css'

type ChatUser = { id: string; name: string; role: string }
type ChatContact = { id: string; name: string; role: string }
type ChatThread = {
  conversationId: string
  participant1Id: string
  participant1Name: string
  participant2Id: string
  participant2Name: string
  lastMessage: string
  sentAt: string
  lastSenderId: string
}
type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: string
  sentAt: string
  text: string
  attachment: { name: string; mimeType: string; size: number } | null
}
type ChatData = { contacts: ChatContact[]; threads: ChatThread[]; retentionHours: number }
type AttachmentPreview = { url: string; name: string; mimeType: string }

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

async function postChat<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/erp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({})) as T & { error?: string; message?: string }
  if (!response.ok) throw new Error(result.error || result.message || 'Chat request failed. Please try again.')
  return result
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function conversationIdFor(firstId: string, secondId: string): string {
  return JSON.stringify([firstId, secondId].sort())
}

function formatChatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatView({ user }: { user: ChatUser }) {
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<AttachmentPreview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [openingAttachment, setOpeningAttachment] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const objectUrlsRef = useRef<string[]>([])

  const reload = useCallback(async (conversationId = selectedConversationId) => {
    const [data, messageData] = await Promise.all([
      postChat<ChatData>({ action: 'listChatData' }),
      conversationId
        ? postChat<{ messages: ChatMessage[] }>({ action: 'listChatMessages', conversationId })
        : Promise.resolve({ messages: [] as ChatMessage[] }),
    ])
    setContacts(data.contacts)
    setThreads(data.threads)
    setMessages(messageData.messages)
    return data
  }, [selectedConversationId])

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        await reload()
        if (active) {
          setLoading(false)
          setError('')
        }
      } catch (requestError) {
        if (active) {
          setLoading(false)
          setError(requestError instanceof Error ? requestError.message : 'Unable to load chats.')
        }
      }
    }
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 12000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [reload])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, selectedConversationId])

  useEffect(() => () => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
  }, [])

  const selectedThread = threads.find(thread => thread.conversationId === selectedConversationId)
  const selectedContact = contacts.find(contact => contact.id === selectedRecipientId)
  const isSelectedParticipant = !!selectedThread &&
    (selectedThread.participant1Id === user.id || selectedThread.participant2Id === user.id)
  const recipientId = selectedRecipientId || (selectedThread && isSelectedParticipant
    ? selectedThread.participant1Id === user.id ? selectedThread.participant2Id : selectedThread.participant1Id
    : '')
  const selectedTitle = selectedThread
    ? isSelectedParticipant
      ? selectedThread.participant1Id === user.id ? selectedThread.participant2Name : selectedThread.participant1Name
      : `${selectedThread.participant1Name} and ${selectedThread.participant2Name}`
    : selectedContact?.name || ''
  const canSend = !!recipientId && recipientId !== user.id && !sending
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredThreads = useMemo(() => threads.filter(thread => {
    const label = `${thread.participant1Name} ${thread.participant2Name} ${thread.lastMessage}`.toLocaleLowerCase()
    return !normalizedSearch || label.includes(normalizedSearch)
  }), [threads, normalizedSearch])
  const filteredContacts = useMemo(() => contacts
    .filter(contact => contact.id !== user.id)
    .filter(contact => !normalizedSearch || `${contact.name} ${contact.role}`.toLocaleLowerCase().includes(normalizedSearch)),
  [contacts, normalizedSearch, user.id])

  const startConversation = (contact: ChatContact) => {
    setSelectedConversationId(conversationIdFor(user.id, contact.id))
    setSelectedRecipientId(contact.id)
    setText('')
    setFile(null)
    setMessages([])
    setError('')
  }

  const selectThread = (thread: ChatThread) => {
    setSelectedConversationId(thread.conversationId)
    setSelectedRecipientId(thread.participant1Id === user.id
      ? thread.participant2Id
      : thread.participant2Id === user.id ? thread.participant1Id : '')
    setText('')
    setFile(null)
    setError('')
  }

  const closePreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview.url)
      objectUrlsRef.current = objectUrlsRef.current.filter(url => url !== preview.url)
      setPreview(null)
    }
  }

  const openAttachment = async (message: ChatMessage) => {
    if (!message.attachment) return
    setOpeningAttachment(message.id)
    setError('')
    try {
      const attachment = await postChat<{ name: string; mimeType: string; base64: string }>({
        action: 'readChatAttachment',
        messageId: message.id,
      })
      const binary = atob(attachment.base64)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
      const url = URL.createObjectURL(new Blob([bytes], { type: attachment.mimeType }))
      objectUrlsRef.current.push(url)
      setPreview({ url, name: attachment.name, mimeType: attachment.mimeType })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to open attachment.')
    } finally {
      setOpeningAttachment('')
    }
  }

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) return
    const messageText = text.trim()
    if (!messageText && !file) {
      setError('Write a message or attach an image/PDF.')
      return
    }
    if (file) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError('Attachments must be 3 MB or smaller.')
        return
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        setError('Choose a JPEG, PNG, GIF, WebP image, or PDF.')
        return
      }
    }
    setSending(true)
    setError('')
    try {
      let attachment: { name: string; mimeType: string; base64: string } | undefined
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        attachment = { name: file.name, mimeType: file.type.toLowerCase(), base64: toBase64(bytes) }
      }
      const result = await postChat<{ message: ChatMessage }>({
        action: 'sendChatMessage',
        recipientId,
        text: messageText,
        attachment,
      })
      setText('')
      setFile(null)
      setSelectedConversationId(result.message.conversationId)
      setSelectedRecipientId(recipientId)
      setMessages(previous => [...previous, result.message])
      await reload(result.message.conversationId)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the message.')
    } finally {
      setSending(false)
    }
  }

  const selectFile = (selected: File | undefined) => {
    setError('')
    if (!selected) {
      setFile(null)
      return
    }
    if (!ALLOWED_MIME_TYPES.includes(selected.type.toLowerCase())) {
      setFile(null)
      setError('Choose a JPEG, PNG, GIF, WebP image, or PDF.')
      return
    }
    if (selected.size > MAX_ATTACHMENT_BYTES) {
      setFile(null)
      setError('Attachments must be 3 MB or smaller.')
      return
    }
    setFile(selected)
  }

  const adminCanView = user.role === 'Super Admin'

  return (
    <section className="chat-page">
      <div className="page-heading chat-page-heading">
        <div><p>TEAM COMMUNICATION</p><h1>Chat</h1></div>
        <button className="chat-refresh-button" type="button" onClick={() => { void reload().catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Unable to refresh chats.')) }} aria-label="Refresh chats">
          <RefreshCw size={17} /> Refresh
        </button>
      </div>
      <div className="chat-disclosure" role="note">
        <MessageCircle size={18} />
        <span>
          {adminCanView
            ? 'As Super Admin, you can view all conversations and attachments. Messages and files disappear after 48 hours and are permanently deleted by scheduled cleanup.'
            : 'Conversations are visible to their participants and the Super Admin. Messages and files disappear after 48 hours and are permanently deleted by scheduled cleanup.'}
        </span>
      </div>
      {error && <div className="chat-error" role="alert"><AlertCircle size={17} />{error}</div>}
      <div className="chat-workspace">
        <aside className="chat-sidebar" aria-label="Conversations and contacts">
          <div className="chat-sidebar-title"><strong>Messages</strong><span>{threads.length}</span></div>
          <label className="chat-search">
            <span className="sr-only">Search chats and people</span>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search chats or people" />
          </label>
          <div className="chat-list-scroll">
            <div className="chat-list-label">CONVERSATIONS</div>
            {filteredThreads.length ? filteredThreads.map(thread => {
              const isParticipant = thread.participant1Id === user.id || thread.participant2Id === user.id
              const title = isParticipant
                ? thread.participant1Id === user.id ? thread.participant2Name : thread.participant1Name
                : `${thread.participant1Name} and ${thread.participant2Name}`
              return (
                <button
                  type="button"
                  key={thread.conversationId}
                  className={`chat-list-item${selectedConversationId === thread.conversationId ? ' selected' : ''}`}
                  onClick={() => selectThread(thread)}
                >
                  <span className="chat-avatar">{title.slice(0, 1).toUpperCase()}</span>
                  <span className="chat-list-copy">
                    <strong>{title}</strong>
                    <span>{thread.lastMessage || 'Attachment'}</span>
                  </span>
                  <time>{formatChatTime(thread.sentAt)}</time>
                </button>
              )
            }) : <p className="chat-list-empty">{loading ? 'Loading conversations…' : 'No conversations yet.'}</p>}
            <div className="chat-list-label chat-people-label">PEOPLE</div>
            {filteredContacts.map(contact => (
              <button
                type="button"
                key={contact.id}
                className={`chat-list-item${selectedRecipientId === contact.id ? ' selected' : ''}`}
                onClick={() => startConversation(contact)}
              >
                <span className="chat-avatar">{contact.name.slice(0, 1).toUpperCase()}</span>
                <span className="chat-list-copy"><strong>{contact.name}</strong><span>{contact.role}</span></span>
              </button>
            ))}
            {!loading && filteredContacts.length === 0 && <p className="chat-list-empty">No active team members found.</p>}
          </div>
        </aside>
        <div className="chat-conversation">
          {selectedConversationId ? (
            <>
              <header className="chat-conversation-header">
                <span className="chat-avatar">{selectedTitle.slice(0, 1).toUpperCase() || '?'}</span>
                <div><strong>{selectedTitle || 'Conversation'}</strong><span>{selectedThread && !isSelectedParticipant ? 'Admin view · participants only can reply' : 'Private conversation'}</span></div>
              </header>
              {selectedThread && !isSelectedParticipant && adminCanView && (
                <div className="chat-admin-thread-note">
                  This is a private conversation between its participants. To message someone, select their name in People.
                </div>
              )}
              <div className="chat-message-list" aria-live="polite">
                {messages.length ? messages.map(message => (
                  <article className={`chat-message${message.senderId === user.id ? ' own' : ''}`} key={message.id}>
                    <div className="chat-message-meta">
                      <strong>{message.senderName}</strong><span>{formatChatTime(message.sentAt)}</span>
                    </div>
                    {message.text && <p>{message.text}</p>}
                    {message.attachment && (
                      <button
                        type="button"
                        className="chat-attachment"
                        onClick={() => { void openAttachment(message) }}
                        disabled={openingAttachment === message.id}
                      >
                        {message.attachment.mimeType === 'application/pdf' ? <FileText size={20} /> : <Image size={20} />}
                        <span><strong>{openingAttachment === message.id ? 'Opening…' : message.attachment.name}</strong><small>{formatFileSize(message.attachment.size)}</small></span>
                      </button>
                    )}
                  </article>
                )) : <div className="chat-empty-conversation">{loading ? 'Loading messages…' : 'No messages yet. Start the conversation.'}</div>}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-composer" onSubmit={sendMessage}>
                {file && <div className="chat-selected-file"><Paperclip size={14} />{file.name}<button type="button" onClick={() => setFile(null)} aria-label="Remove attachment"><X size={14} /></button></div>}
                <div className="chat-composer-row">
                  <label className="chat-attach-button" title="Attach image or PDF">
                    <Paperclip size={19} />
                    <span className="sr-only">Attach image or PDF</span>
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={event => selectFile(event.currentTarget.files?.[0])} />
                  </label>
                  <textarea
                    value={text}
                    onChange={event => setText(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                      }
                    }}
                    maxLength={4000}
                    placeholder={recipientId ? 'Write a message…' : 'Choose a person to start a private chat'}
                    disabled={!recipientId || sending}
                    aria-label="Message"
                  />
                  <button className="chat-send-button" type="submit" disabled={!canSend || (!text.trim() && !file)} aria-label="Send message">
                    <Send size={18} />
                  </button>
                </div>
                <div className="chat-composer-foot"><span>Enter to send · Shift+Enter for a new line</span><span>{text.length}/4000</span></div>
              </form>
            </>
          ) : (
            <div className="chat-welcome">
              <div className="chat-welcome-icon"><MessageCircle size={28} /></div>
              <h2>Stay connected</h2>
              <p>Select a conversation or choose a person to send a message.</p>
            </div>
          )}
        </div>
      </div>
      {preview && (
        <div className="chat-preview-backdrop" role="presentation" onClick={closePreview}>
          <div className="chat-preview-dialog" role="dialog" aria-modal="true" aria-label={`Attachment: ${preview.name}`} onClick={event => event.stopPropagation()}>
            <div className="chat-preview-header"><strong>{preview.name}</strong><button type="button" onClick={closePreview} aria-label="Close attachment"><X size={19} /></button></div>
            {preview.mimeType.startsWith('image/')
              ? <img src={preview.url} alt={preview.name} />
              : <iframe title={preview.name} src={preview.url} />}
          </div>
        </div>
      )}
    </section>
  )
}
