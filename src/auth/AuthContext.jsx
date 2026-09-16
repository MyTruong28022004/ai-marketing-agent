import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, restoreSession, setAccessToken } from '../lib/api'

const AuthContext = createContext(null)
const WORKSPACE_KEY = 'milo.workspaceId'

function selectPreferredWorkspace(items) {
  if (!items.length) return null
  const remembered = localStorage.getItem(WORKSPACE_KEY)
  return items.find(item => item.workspace.id === remembered) || items[0]
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [selectedMembership, setSelectedMembership] = useState(null)

  const loadWorkspaces = useCallback(async () => {
    const items = await apiRequest('/workspaces')
    setWorkspaces(items)
    setSelectedMembership(current => {
      const selected = items.find(item => item.workspace.id === current?.workspace.id) || selectPreferredWorkspace(items)
      if (selected) localStorage.setItem(WORKSPACE_KEY, selected.workspace.id)
      return selected
    })
    return items
  }, [])

  useEffect(() => {
    let active = true
    restoreSession()
      .then(async session => {
        if (!active) return
        setUser(session.user)
        await loadWorkspaces()
        if (active) setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        setAccessToken(null)
        setStatus('guest')
      })
    return () => { active = false }
  }, [loadWorkspaces])

  const finishAuthentication = useCallback(async (result) => {
    setAccessToken(result.accessToken)
    setUser(result.user)
    const items = await loadWorkspaces()
    setStatus('authenticated')
    return items
  }, [loadWorkspaces])

  const login = useCallback(async credentials => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    return finishAuthentication(result)
  }, [finishAuthentication])

  const register = useCallback(async payload => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return finishAuthentication(result)
  }, [finishAuthentication])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, false)
    } finally {
      setAccessToken(null)
      setUser(null)
      setWorkspaces([])
      setSelectedMembership(null)
      localStorage.removeItem(WORKSPACE_KEY)
      setStatus('guest')
    }
  }, [])

  const selectWorkspace = useCallback(workspaceId => {
    const membership = workspaces.find(item => item.workspace.id === workspaceId)
    if (!membership) return
    localStorage.setItem(WORKSPACE_KEY, workspaceId)
    setSelectedMembership(membership)
  }, [workspaces])

  const updateSelectedWorkspace = useCallback(workspace => {
    setWorkspaces(items => items.map(item => item.workspace.id === workspace.id ? { ...item, workspace: { ...item.workspace, ...workspace } } : item))
    setSelectedMembership(current => current?.workspace.id === workspace.id
      ? { ...current, workspace: { ...current.workspace, ...workspace } }
      : current)
  }, [])

  const value = useMemo(() => ({
    status,
    user,
    workspaces,
    selectedMembership,
    workspace: selectedMembership?.workspace || null,
    role: selectedMembership?.role || null,
    login,
    register,
    logout,
    selectWorkspace,
    reloadWorkspaces: loadWorkspaces,
    updateSelectedWorkspace,
  }), [status, user, workspaces, selectedMembership, login, register, logout, selectWorkspace, loadWorkspaces, updateSelectedWorkspace])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
