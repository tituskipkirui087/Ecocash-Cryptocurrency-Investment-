'use client'

import Link from 'next/link'
import { TrendingUp, BarChart3, Shield, Clock } from 'lucide-react'

export default function IndicesPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-900 border-b border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/images/ecocash-logo.svg" alt="EcoCash" className="h-7 w-auto" />
            <span className="ml-2 text-lg font-bold"><span className="text-brand-blue">ECO</span><span className="text-red-500">CASH</span></span>
          </Link>
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="text-gray-300 hover:text-white text-sm">Home</Link>
            <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Indices Trading</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">Trade major global indices including S&P 500, Dow Jones, FTSE and DAX with instant execution</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-dark-400 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">US Indices</h3>
              <p className="text-gray-400">S&P 500, Dow Jones, Nasdaq - track the US economy performance</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Global Indices</h3>
              <p className="text-gray-400">FTSE 100, DAX, CAC 40 - diversify across world markets</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Index CFDs</h3>
              <p className="text-gray-400">Trade with leverage up to 10x with tight spreads</p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/dashboard/investments" className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-lg font-semibold hover:opacity-90 transition-all">
              Start Indices Trading
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}