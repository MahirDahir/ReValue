export default function ConversationsView({ listing, conversations, onSelectBuyer, onBack }) {
  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>💬 Chats — {listing?.title}</h2>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Select a buyer to view their messages</p>
      {conversations.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No buyers have messaged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {conversations.map(buyer => (
            <div key={buyer.buyer_id} className="conversation-row" onClick={() => onSelectBuyer(buyer)}>
              <div className="conversation-avatar">{buyer.buyer_name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="conversation-name">{buyer.buyer_name}</div>
                <div className="conversation-phone">{buyer.buyer_phone}</div>
              </div>
              {buyer.unread_count > 0
                ? <span className="badge" style={{ marginLeft: 'auto' }}>{buyer.unread_count}</span>
                : <span style={{ marginLeft: 'auto', color: '#aaa', fontSize: '13px' }}>Open →</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
