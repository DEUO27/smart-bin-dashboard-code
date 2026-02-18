import { useState, useEffect } from 'react'
import StatCard from './components/StatCard'
import { MeasurementChart } from './components/Charts'
import StatusCards from './components/StatusCards'
import { RecentMediciones, RecentEventos, RecentRecolecciones } from './components/RecentTables'
import RouteBuilder from './components/RouteBuilder'

import CollectionForm from './components/CollectionForm'

function App() {
  const [summary, setSummary] = useState(null)
  const [seriesData, setSeriesData] = useState([])
  const [recentData, setRecentData] = useState({ mediciones: [], eventos: [], recolecciones: [] })
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [sumRes, recRes] = await Promise.all([
        fetch('/api/summary'),
        fetch('/api/recent')
      ])
      if (!sumRes.ok || !recRes.ok) throw new Error('API Error')
      const sumData = await sumRes.json()
      const recData = await recRes.json()
      setSummary(sumData)
      setRecentData(recData)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetch(`/api/series/mediciones?hours=${hours}`)
      .then(res => res.json())
      .then(data => setSeriesData(data))
      .catch(err => console.error(err))
  }, [hours])

  if (loading) return <div className="p-10 text-center text-xl">Cargando Dashboard...</div>
  if (!summary) return <div className="p-10 text-center text-red-500">Error cargando datos. Asegúrate que el backend esté corriendo en el puerto 3000.</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-green-600 text-white p-6 shadow-md">
        <h1 className="text-3xl font-bold">ECOBINS IoT Dashboard</h1>
      </header>

      <main className="container mx-auto px-4 mt-8 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Mediciones" value={summary.counts.mediciones} icon="📊" color="bg-emerald-500" />
          <StatCard title="Eventos" value={summary.counts.eventos_actuador} icon="🔔" color="bg-green-500" />
          <StatCard title="Recolecciones" value={summary.counts.recolecciones} icon="🚛" color="bg-yellow-500" />
          <StatCard title="Sensores" value={summary.counts.sensores} icon="📡" color="bg-purple-500" />
          <StatCard title="Actuadores" value={summary.counts.actuadores} icon="⚙️" color="bg-red-500" />
          <StatCard title="Botes" value={summary.counts.botes} icon="🗑️" color="bg-indigo-500" />
        </div>

        {/* Status Cards Row */}
        <StatusCards boatStatus={summary.boatStatus} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Row 2 (Span 2 cols) */}
          <div className="lg:col-span-2">
            <MeasurementChart data={seriesData} hours={hours} setHours={setHours} />
          </div>
          {/* Collection Form (Span 1 col) */}
          <div>
            <CollectionForm onCollectionAdded={fetchData} />
          </div>
        </div>

        {/* Recent Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentMediciones data={recentData.mediciones} />
          <RecentEventos data={recentData.eventos} />
          <RecentRecolecciones data={recentData.recolecciones} />
        </div>

        {/* Route Builder */}
        <RouteBuilder />
      </main>
    </div>
  )
}

export default App
