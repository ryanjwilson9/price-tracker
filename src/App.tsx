import { useState, useEffect } from 'react'
import axios from 'axios'
import { Sparklines, SparklinesLine } from 'react-sparklines'

const COINS = [
  { symbol: 'BTC', id: 'bitcoin' },
  { symbol: 'ETH', id: 'ethereum' },
  { symbol: 'SOL', id: 'solana' },
  { symbol: 'BNB', id: 'binancecoin' },
  { symbol: 'XRP', id: 'ripple' },
  { symbol: 'ADA', id: 'cardano' },
  { symbol: 'DOGE', id: 'dogecoin' },
  { symbol: 'DOT', id: 'polkadot' },
  { symbol: 'AVAX', id: 'avalanche-2' },
  { symbol: 'USDT', id: 'tether' },
]

const TIMEFRAMES = [
  { label: '1H', value: { days: 1, interval: 'minutely', points: 60 } },
  { label: '1D', value: { days: 1, interval: 'hourly', points: 24 } },
  { label: '5D', value: { days: 5, interval: 'hourly', points: 120 } },
  { label: '7D', value: { days: 7, interval: 'hourly', points: 168 } },
  { label: '1M', value: { days: 30, interval: 'daily', points: 30 } },
]

interface CryptoData {
  name: string
  symbol: string
  market_data: {
    current_price: {
      usd: number
    }
    price_change_percentage_24h: number
  }
}

function App() {
  const [symbol, setSymbol] = useState('')
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prices, setPrices] = useState<number[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]) // Default 1D
  const [darkMode, setDarkMode] = useState(true)
  const [selectedCoin, setSelectedCoin] = useState(COINS[0])

  useEffect(() => {
    // Set dark mode class on mount and when toggled
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    fetchCryptoData(selectedCoin.id, selectedTimeframe)
    // eslint-disable-next-line
  }, [selectedCoin, selectedTimeframe])

  const fetchCryptoData = async (coinId: string, timeframe = selectedTimeframe) => {
    try {
      setLoading(true)
      setError('')
      const [coinRes, chartRes] = await Promise.all([
        axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`),
        axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${timeframe.value.days}&interval=${timeframe.value.interval}`)
      ])
      setCryptoData(coinRes.data)
      let priceArr = chartRes.data.prices.map((p: number[]) => p[1])
      if (priceArr.length > timeframe.value.points) {
        const step = Math.floor(priceArr.length / timeframe.value.points)
        priceArr = priceArr.filter((_:unknown, i: number) => i % step === 0)
      }
      setPrices(priceArr)
    } catch (err) {
      setError('Failed to fetch cryptocurrency data. Please check the symbol and try again.')
      setCryptoData(null)
      setPrices([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (symbol.trim()) {
      setSelectedCoin({ symbol: symbol.trim().toUpperCase(), id: symbol.trim().toLowerCase() })
    }
  }

  const handleTimeframeChange = (tf: typeof TIMEFRAMES[0]) => {
    setSelectedTimeframe(tf)
  }

  const handleCoinClick = (coin: typeof COINS[0]) => {
    setSelectedCoin(coin)
    setSymbol('')
  }

  const toggleDarkMode = () => setDarkMode((prev) => !prev)

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-100 dark:bg-gray-900 font-sans transition-colors duration-300">
      {/* Header */}
      <header className="w-full py-4 px-4 flex justify-between items-center bg-white/90 dark:bg-gray-900/90 shadow-md sticky top-0 z-10 backdrop-blur">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Crypto Price Tracker</h1>
        <button
          onClick={toggleDarkMode}
          className="ml-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m8.485-8.485h-1.5m-15 0H3m15.364-6.364l-1.06 1.06m-12.728 0l-1.06-1.06m12.728 12.728l-1.06-1.06m-12.728 0l-1.06 1.06M16.24 7.76A6.5 6.5 0 117.76 16.24 6.5 6.5 0 0116.24 7.76z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0112 21.75c-5.385 0-9.75-4.365-9.75-9.75 0-4.136 2.635-7.64 6.248-9.002a.75.75 0 01.977.73v.342c0 4.28 3.463 7.75 7.75 7.75h.342a.75.75 0 01.73.977z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-2 py-8">
        <div className="flex flex-wrap justify-center gap-3 mb-6 w-full max-w-lg">
          {COINS.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => handleCoinClick(coin)}
              className={`px-4 py-2 rounded-lg font-bold border transition-colors duration-150 text-sm md:text-base shadow-sm ${selectedCoin.symbol === coin.symbol ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600'}`}
            >
              {coin.symbol}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-lg mb-6">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Or enter another symbol (e.g., LTC, MATIC)"
            className="flex-1 px-4 py-3 rounded-l-xl border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-lg text-gray-900 dark:text-white shadow"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-r-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 shadow"
          >
            {loading ? 'Loading...' : 'Track'}
          </button>
        </form>
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors duration-150 ${selectedTimeframe.label === tf.label ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {error && (
          <div className="p-4 mb-4 text-red-700 bg-red-100 dark:bg-red-900/60 rounded-lg text-center font-semibold max-w-lg w-full">
            {error}
          </div>
        )}
        {cryptoData && (
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl p-8 flex flex-col items-center w-full max-w-lg backdrop-blur-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 tracking-wide">{cryptoData.symbol.toUpperCase()}</h2>
            <p className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">${cryptoData.market_data.current_price.usd.toLocaleString()}</p>
            <p className={`text-lg font-semibold mb-4 ${cryptoData.market_data.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-400'}`}>
              24h Change: {cryptoData.market_data.price_change_percentage_24h.toFixed(2)}%
            </p>
            {prices.length > 0 && (
              <div className="w-full h-32">
                <Sparklines data={prices} width={400} height={100} margin={5}>
                  <SparklinesLine color="#2563eb" style={{ fill: 'none' }} />
                </Sparklines>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-gray-400 dark:text-gray-500 text-sm bg-transparent">
        Powered by CoinGecko • Built with React & Tailwind CSS
      </footer>
    </div>
  )
}

export default App
