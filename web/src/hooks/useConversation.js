import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../AppContext'
import * as convApi from '../api/conversations'

export function useConversation() {
  const { token, setError } = useAppContext()
  const [conversation, setConversation]         = useState(null)
  const [contact, setContact]                   = useState(null)
  const [listingConversations, setListingConvs] = useState([])
  const [myConversations, setMyConversations]   = useState([])
  const [contactsRevealed, setContactsRevealed] = useState([])
  const convRef = useRef(null)
  convRef.current = conversation

  // Clear all state on logout
  useEffect(() => {
    if (!token) {
      setConversation(null)
      setContact(null)
      setListingConvs([])
      setMyConversations([])
      setContactsRevealed([])
    }
  }, [token])

  const loadConversation = async (convId) => {
    try {
      const res = await convApi.getConversation(convId)
      setConversation(res.data)
    } catch (err) {
      if (err.response?.status !== 403) {
        setError(err.response?.data?.detail || 'Failed to load conversation')
      }
    }
  }

  const startWithPrice = async (listingId, price) => {
    const res = await convApi.startWithPrice(listingId, price)
    setConversation(res.data)
    setContact(null)
    return res.data
  }

  const loadMyListingConversation = async (listingId) => {
    try {
      const res = await convApi.getMyListingConversation(listingId)
      if (res.data) setConversation(res.data)
      setContact(null)
    } catch { /* no existing conversation is fine */ }
  }

  const doAction = async (action, value = null) => {
    if (!convRef.current) return
    try {
      const res = await convApi.doAction(convRef.current.id, action, value)
      setConversation(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed')
    }
  }

  const markSeen = async (convId) => {
    try {
      await convApi.markSeen(convId)
    } catch { /* non-fatal */ }
  }

  const revealContact = async () => {
    if (!convRef.current) return
    try {
      const res = await convApi.getContact(convRef.current.id)
      setContact(res.data)
      // Contact fetch marks seen server-side; refresh conv to clear badge
      loadConversation(convRef.current.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load contact')
    }
  }

  const loadListingConversations = async (listingId) => {
    try {
      const res = await convApi.getListingConversations(listingId)
      setListingConvs(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load conversations')
    }
  }

  const loadContactsRevealed = async (listingId) => {
    try {
      const res = await convApi.getContactsRevealed(listingId)
      setContactsRevealed(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load buyers')
    }
  }

  const loadMyConversations = async () => {
    try {
      const res = await convApi.getMyConversations()
      setMyConversations(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load history')
    }
  }

  const resetConversation = () => {
    setConversation(null)
    setContact(null)
  }

  // Poll for updates while a conversation is open
  useEffect(() => {
    if (!conversation?.id) return
    const id = setInterval(() => loadConversation(conversation.id), 4000)
    return () => clearInterval(id)
  }, [conversation?.id])

  return {
    conversation, contact, listingConversations, myConversations, contactsRevealed,
    startWithPrice, loadConversation, loadMyListingConversation, doAction,
    markSeen, revealContact, loadListingConversations, loadMyConversations,
    loadContactsRevealed, resetConversation,
  }
}
