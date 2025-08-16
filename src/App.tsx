import { useState } from 'react'
import './App.css'

function App(): JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">MarketPulse</h1>
          <p className="text-gray-600">Financial Dashboard Platform</p>
        </div>
        <div className="card mb-6">
          <button 
            className="btn-primary mb-4"
            onClick={() => setCount((count) => count + 1)}
          >
            count is {count}
          </button>
          <p className="text-sm text-gray-500">
            Edit <code className="bg-gray-100 px-2 py-1 rounded">src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="text-gray-500">
          Welcome to MarketPulse - Your Financial Dashboard
        </p>
      </div>
    </div>
  )
}

export default App
