'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Search, Shield } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
        const { data } = await api.get('admin/users')
      setUsers(data.data)
    } catch (err) {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (userId: string) => {
    try {
        await api.put(`admin/users/${userId}/status`, { isActive: false })
      toast.success('User status updated')
      fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 focus:border-ecocash-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b text-left text-sm font-medium text-gray-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Verified</th>
                <th className="px-6 py-3">Investments</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.isVerified ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user._count?.investments || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      <Shield size={14} />
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
