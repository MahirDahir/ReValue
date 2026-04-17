import { useAppContext } from '../AppContext'

export default function ChatView({
  listing,
  chatBuyer,
  messages,
  messageInput,
  setMessageInput,
  chatMessagesRef,
  isAtBottom,
  hasNewMessages,
  scrollToBottom,
  handleChatScroll,
  onSend,
  onBack,
}) {
  const { user, mode } = useAppContext()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const content = messageInput.trim()
    if (!content) return
    setMessageInput('')
    try {
      await onSend(content)
    } catch {
      setMessageInput(content)
    }
  }

  return (
    <div className="form-container" style={{ maxWidth: '700px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '15px' }}>← Back</button>
      <h2>💬 {listing?.title}</h2>
      <p style={{ marginBottom: '15px', color: '#888', fontSize: '14px' }}>
        {mode === 'seller'
          ? <>Buyer: <strong>{chatBuyer?.buyer_name}</strong></>
          : <>Seller: <strong>{listing?.seller_name}</strong></>
        }
      </p>
      <div className="chat-container">
        <div className="chat-messages" ref={chatMessagesRef} onScroll={handleChatScroll}>
          {messages.length === 0 && (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No messages yet. Say hi!</p>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}>
              <p>{msg.content}</p>
              <small>{new Date(msg.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>

        {!isAtBottom && (
          <button
            className={`scroll-to-bottom ${hasNewMessages ? 'has-new' : ''}`}
            onClick={scrollToBottom}
            title="Scroll to latest message"
          >
            ↓
          </button>
        )}

        {listing?.status === 'sold' ? (
          <div style={{ padding: '10px 14px', background: '#ffebee', borderTop: '1px solid #eee', fontSize: '13px', color: '#b71c1c', textAlign: 'center' }}>
            🔴 This listing has been sold — messaging is disabled
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="chat-input">
            <input
              type="text"
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              required
            />
            <button type="submit" className="btn btn-primary">Send</button>
          </form>
        )}
      </div>
    </div>
  )
}
