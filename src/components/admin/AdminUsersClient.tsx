'use client'

import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface UserRow {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  teacher_profiles?: { is_verified: boolean }[] | { is_verified: boolean } | null
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (role) params.set('role', role)
    if (q) params.set('q', q)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    if (res.ok) {
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [role])

  async function search(e: React.FormEvent) {
    e.preventDefault()
    await load()
  }

  async function toggleActive(user: UserRow) {
    setBusyId(user.id)
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    setBusyId(null)
    await load()
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-white/50 mt-1">{total} accounts on Stanza</p>
      </div>

      <form onSubmit={search} className="flex flex-wrap gap-3 mb-6">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="admin">Admins</option>
        </select>
        <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Search</button>
      </form>

      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-white/30 text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/40">
                <th className="text-left py-3 px-4 font-normal">Name</th>
                <th className="text-left py-3 px-4 font-normal">Email</th>
                <th className="text-left py-3 px-4 font-normal">Role</th>
                <th className="text-left py-3 px-4 font-normal">Status</th>
                <th className="text-left py-3 px-4 font-normal">Joined</th>
                <th className="text-right py-3 px-4 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const profile = Array.isArray(u.teacher_profiles) ? u.teacher_profiles[0] : u.teacher_profiles
                return (
                  <tr key={u.id} className="border-b border-white/[0.04]">
                    <td className="py-3 px-4 text-white font-medium">
                      {u.full_name}
                      {u.role === 'teacher' && profile?.is_verified && (
                        <span className="ml-2 text-[10px] text-[#C9A84C]">verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white/50">{u.email}</td>
                    <td className="py-3 px-4 capitalize text-white/60">{u.role}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {u.is_active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/35 text-xs">{formatRelativeTime(u.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={busyId === u.id || u.role === 'admin'}
                        className="text-xs text-white/40 hover:text-white disabled:opacity-30"
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && users.length === 0 && (
          <p className="p-8 text-center text-white/30 text-sm">No users found</p>
        )}
      </div>
    </div>
  )
}
