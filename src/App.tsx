import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Dashboard() {
  return (
    <div className="min-h-screen bg-ui-base">
      <header className="bg-brand-primary text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Budget App</h1>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-ui-surface rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-text-main mb-4">Dashboard</h2>
          <p className="text-gray-600">Track your budgets, expenses, and savings.</p>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
