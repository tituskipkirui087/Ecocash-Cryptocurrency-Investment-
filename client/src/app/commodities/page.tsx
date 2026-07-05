'use client'

import Link from 'next/link'
import { TrendingUp, BarChart3, Shield, Clock } from 'lucide-react'

export default function CommoditiesPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Commodities Trading</h1>
            <p className="text-gray-400 max-w-2xl mx-auto">Trade gold, oil, natural gas and agricultural commodities with competitive pricing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-dark-400 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Precious Metals</h3>
              <p className="text-gray-400">Gold, Silver, Platinum - hedge against inflation and market volatility</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Energy Markets</h3>
              <p className="text-gray-400">Crude Oil, Natural Gas, Brent - volatile markets with high profit potential</p>
            </div>
            <div className="bg-dark-400 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Agricultural</h3>
              <p className="text-gray-400">Wheat, Corn, Soybeans - trade seasonal trends in soft commodities</p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/dashboard/investments" className="inline-block px-8 py-3 bg-gradient-to-r from-yellow-600 to-amber-500 text-white rounded-lg font-semibold hover:opacity-90 transition-all">
              Start Commodities Trading
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}