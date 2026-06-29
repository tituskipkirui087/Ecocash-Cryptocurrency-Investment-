'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const fetchWithdrawals = async () => {
    try {
        const { data } = await api.get('admin/withdrawals')
      setWithdrawals(data.data)
    } catch (err) {
      toast.error('Failed')
    } finally {
      setLoading(false)
    }
  }

  const approveWithdrawal = async (id: string) => {
    try {
          await api.put(`withdrawals/${id}/approve`, { transactionHash: 'tx_' + Date.now() })
      toast.success('Withdrawal approved')
      fetchWithdrawals()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  const rejectWithdrawal = async (id: string) => {
    try {
          await api.put(`withdrawals/${id}/reject`, {})
      toast.success('Withdrawal rejected')
      fetchWithdrawals()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Withdrawal Management</h1>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b text-left text-sm font-medium text-gray-500">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{w.user.firstName} {w.user.lastName}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${Number(w.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{w.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{w.status.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 flex gap-2">
                    {w.status === 'WITHDRAWAL_PENDING' && (
                      <>
                        <button onClick={() => approveWithdrawal(w.id)} className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                          <CheckCircle size={14} /> Paid
                        </button>
                        <button onClick={() => rejectWithdrawal(w.id)} className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
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
