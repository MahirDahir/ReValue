import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppContext } from '../AppContext'
import * as messagesApi from '../api/messages'

export function useMessages() {
  const { setError } = useAppContext()
  const [messages, setMessages]           = useState([])
  const [messageInput, setMessageInput]   = useState('')
  const [conversations, setConversations] = useState([])
  const [chatBuyer, setChatBuyer]         = useState(null)
  const [chatListUnreadCounts, setChatListUnreadCounts] = useState({})

  // Smart chat scroll
  const chatMessagesRef = useRef(null)
  const [isAtBottom, setIsAtBottom]         = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const isAtBottomRef = useRef(true)
  const userSentRef   = useRef(false)

  const loadMessages = async (listing, buyer = null) => {
    if (!listing) return
    try {
      const res = await messagesApi.getListingMessages(listing.id, buyer?.buyer_id ?? null)
      setMessages(res.data)
    } catch { console.error('Failed to load messages') }
  }

  const loadConversations = async (listing) => {
    try {
      const res = await messagesApi.getListingConversations(listing.id)
      setConversations(res.data)
    } catch { console.error('Failed to load conversations') }
  }

  const loadBuyerUnreadCounts = async (token) => {
    if (!token) return
    try {
      const res = await messagesApi.getChatList()
      const counts = {}
      res.data.forEach(chat => {
        const lid = chat.listing_id
        if (lid && chat.unread_count > 0) counts[lid] = (counts[lid] || 0) + chat.unread_count
      })
      setChatListUnreadCounts(counts)
    } catch {}
  }

  const send = async (selectedListing, mode, content) => {
    if (!content || !selectedListing) return
    const receiver_id = mode === 'seller' ? chatBuyer?.buyer_id : selectedListing.seller_id
    const res = await messagesApi.sendMessage(selectedListing.id, receiver_id, content)
    userSentRef.current = true
    setMessages(prev => [...prev, res.data])
  }

  const notifyBuyersOfSale = async (listingId) => {
    try {
      const res = await messagesApi.getListingConversations(listingId)
      for (const buyer of res.data) {
        await messagesApi.sendMessage(
          listingId, buyer.buyer_id,
          '🔴 This listing has been sold. Thank you for your interest!'
        )
      }
    } catch { /* non-fatal */ }
  }

  const scrollToBottom = useCallback(() => {
    const el = chatMessagesRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setIsAtBottom(true)
    isAtBottomRef.current = true
    setHasNewMessages(false)
  }, [])

  // Scroll to bottom after new messages arrive
  useEffect(() => {
    if (userSentRef.current) {
      userSentRef.current = false
      scrollToBottom()
      return
    }
    if (isAtBottomRef.current) {
      scrollToBottom()
    } else {
      setHasNewMessages(true)
    }
  }, [messages])

  const handleChatScroll = () => {
    const el = chatMessagesRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setIsAtBottom(atBottom)
    isAtBottomRef.current = atBottom
    if (atBottom) setHasNewMessages(false)
  }

  const resetChat = () => {
    setMessages([])
    isAtBottomRef.current = true
    setIsAtBottom(true)
    setHasNewMessages(false)
  }

  return {
    messages, setMessages, messageInput, setMessageInput,
    conversations, setConversations, chatBuyer, setChatBuyer,
    chatListUnreadCounts, setChatListUnreadCounts,
    chatMessagesRef, isAtBottom, hasNewMessages,
    isAtBottomRef, userSentRef,
    loadMessages, loadConversations, loadBuyerUnreadCounts,
    send, notifyBuyersOfSale,
    scrollToBottom, handleChatScroll, resetChat,
  }
}
