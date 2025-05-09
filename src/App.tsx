import React, { useState, useEffect } from 'react'
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
  { label: '1W', value: { days: 7, interval: 'daily', points: 7 } },
  { label: '1M', value: { days: 30, interval: 'daily', points: 30 } },
  { label: '6M', value: { days: 180, interval: 'daily', points: 180 } },
  { label: '1Y', value: { days: 365, interval: 'daily', points: 365 } },
  { label: '5Y', value: { days: 1825, interval: 'daily', points: 1825 } },
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
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [prices, setPrices] = useState<number[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]) // Default 1M
  const [darkMode, setDarkMode] = useState(true)
  const [selectedCoin, setSelectedCoin] = useState(COINS[0])
  const API_KEY = 'CG-HrbZesQHPwm6fmZD6kmJTqse'
  const BASE_URL = 'https://api.coingecko.com/api/v3'

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    // Check API status first
    const checkApiStatus = async () => {
      try {
        console.log('Checking CoinGecko API status...')
        const response = await fetchWithRetry(
          `${BASE_URL}/ping`,
          {}
        )
        console.log('CoinGecko API status:', response.data)
        return true
      } catch (error) {
        console.error('CoinGecko API status check failed:', error)
        setError('CoinGecko API appears to be unavailable. Please try again later.')
        return false
      }
    }

    checkApiStatus().then(isAvailable => {
      if (isAvailable) {
        fetchCryptoData(selectedCoin.id, selectedTimeframe)
      }
    })
  }, []) // Run only on mount

  useEffect(() => {
    const delay = 1000 // 1 second delay between API calls
    const timeoutId = setTimeout(() => {
      fetchCryptoData(selectedCoin.id, selectedTimeframe)
    }, delay)
    return () => clearTimeout(timeoutId)
  }, [selectedCoin, selectedTimeframe])

  const fetchWithRetry = async (url: string, options: any, retries = 3, delay = 2000) => {
    try {
      // Add API key as a header instead of URL parameter
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-cg-demo-api-key': API_KEY
      }
      
      console.log(`Attempting request to: ${url}`)
      
      const response = await axios.get(url, {
        ...options,
        headers: {
          ...options.headers,
          ...headers
        },
        timeout: 10000,
      })
      
      console.log(`Success response from ${url}:`, {
        status: response.status,
        headers: response.headers,
        data: response.data ? 'Data received' : 'No data'
      })
      return response
    } catch (error: any) {
      console.error(`Error in fetchWithRetry for ${url}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })
      
      if (retries > 0) {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response?.headers['retry-after']) || delay / 1000
          const retryDelay = retryAfter * 1000
          console.log(`Rate limited, retrying in ${retryDelay}ms. Retries left: ${retries}`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return fetchWithRetry(url, options, retries - 1, delay * 2)
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed. Please check your CoinGecko API key.')
        } else if (error.code === 'ECONNABORTED' || !error.response) {
          console.log(`Request failed, retrying in ${delay}ms. Retries left: ${retries}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return fetchWithRetry(url, options, retries - 1, delay * 2)
        }
      }
      throw error
    }
  }

  const fetchCryptoData = async (coinId: string, timeframe: typeof TIMEFRAMES[0]) => {
    try {
      setLoading(true)
      setError('')
      console.log('Starting fetchCryptoData with:', { coinId, timeframe })

      // First API call - Get coin data
      const coinRes = await fetchWithRetry(
        `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
        {}
      )

      // Wait 2 seconds between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Second API call - Get chart data
      const chartRes = await fetchWithRetry(
        `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${timeframe.value.days}&interval=${timeframe.value.interval}`,
        {}
      )

      if (!coinRes.data || !chartRes.data) {
        console.error('Invalid API response:', {
          coinResData: !!coinRes.data,
          chartResData: !!chartRes.data
        })
        throw new Error('Invalid response from CoinGecko API')
      }

      console.log('Successfully fetched data:', {
        coin: coinRes.data.symbol,
        currentPrice: coinRes.data.market_data?.current_price?.usd,
        priceDataPoints: chartRes.data.prices?.length
      })

      setCryptoData(coinRes.data)
      
      // Process price data
      if (chartRes.data.prices?.length > 0) {
        let priceArr = chartRes.data.prices.map((p: number[]) => p[1])
        if (priceArr.length > timeframe.value.points) {
          const step = Math.floor(priceArr.length / timeframe.value.points)
          priceArr = priceArr.filter((_: unknown, i: number) => i % step === 0)
        }
        setPrices(priceArr)
      } else {
        setPrices([])
      }
    } catch (err: any) {
      console.error('Detailed API Error:', {
        response: err.response,
        message: err.message,
        code: err.code
      })

      let errorMessage = 'Failed to fetch cryptocurrency data. '
      
      if (err.response?.status === 429) {
        errorMessage += 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage += 'Authentication failed. Please check your CoinGecko API key.'
      } else if (err.response?.data?.error) {
        errorMessage += err.response.data.error
      } else if (err.message) {
        errorMessage += `Error: ${err.message}`
      }
      
      setError(errorMessage)
      setCryptoData(null)
      setPrices([])
    } finally {
      setLoading(false)
    }
  }

  const handleTimeframeChange = (tf: typeof TIMEFRAMES[0]) => {
    setSelectedTimeframe(tf)
  }

  const handleCoinClick = (coin: typeof COINS[0]) => {
    setSelectedCoin(coin)
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
        {/* Ticker Buttons */}
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

        {/* Interval Buttons */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap w-full max-w-lg">
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

        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : cryptoData && (
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