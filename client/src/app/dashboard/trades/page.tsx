'use client'

import TradingViewWidget from '@/components/TradingViewWidget'

const cryptoSymbols = [
  { symbol: 'BINANCE:BTCUSDT', name: 'BTC/USDT' },
  { symbol: 'BINANCE:ETHUSDT', name: 'ETH/USDT' },
  { symbol: 'BINANCE:BNBUSDT', name: 'BNB/USDT' },
  { symbol: 'BINANCE:XRPUSDT', name: 'XRP/USDT' },
  { symbol: 'BINANCE:ADAUSDT', name: 'ADA/USDT' },
  { symbol: 'BINANCE:DOGEUSDT', name: 'DOGE/USDT' },
]

export default function TradesPage() {
  return (
    <div className="fixed inset-0 inset-y-16 lg:inset-y-0 lg:pl-64 z-10 bg-gray-50">
      <div className="p-4 lg:p-6 h-full overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Market Overview</h1>
        <p className="text-sm text-gray-500 mb-4">Live cryptocurrency prices from Binance</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cryptoSymbols.map((item) => (
            <div key={item.symbol} className="bg-white rounded-2xl p-4 shadow-lg">
              <h2 className="text-lg font-semibold mb-2 text-gray-800">{item.name}</h2>
              <TradingViewWidget 
                symbol={item.symbol} 
                height={400}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}