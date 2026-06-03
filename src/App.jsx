import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import StudyView from './components/StudyView.jsx'
import StudyComplete from './components/StudyComplete.jsx'
import WordLibrary from './components/WordLibrary.jsx'
import Statistics from './components/Statistics.jsx'
import Settings from './components/Settings.jsx'
import HomePage from './components/HomePage.jsx'
import { getSetting, setSetting } from './db/database.js'

export default function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState('medium')
  const [loaded, setLoaded] = useState(false)
  const location = useLocation()

  useEffect(() => {
    Promise.all([
      getSetting('darkMode'),
      getSetting('fontSize')
    ]).then(([darkVal, fontVal]) => {
      if (darkVal === 'true' || darkVal === true) {
        setDarkMode(true)
        document.documentElement.classList.add('dark')
      }
      const fsize = fontVal || 'medium'
      setFontSize(fsize)
      document.documentElement.classList.add('font-' + fsize)
      setLoaded(true)
    })
  }, [])

  const toggleDark = async () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    await setSetting('darkMode', next ? 'true' : 'false')
  }

  const updateFontSize = async (size) => {
    setFontSize(size)
    document.documentElement.classList.remove('font-small', 'font-medium', 'font-large')
    document.documentElement.classList.add('font-' + size)
    await setSetting('fontSize', size)
  }

  if (!loaded) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-400 animate-pulse">加载中...</p>
    </div>
  )

  const hideNav = location.pathname.startsWith('/study/') || 
                  location.pathname.startsWith('/complete/')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/study/:planId" element={<StudyView />} />
        <Route path="/complete/:planId" element={<StudyComplete />} />
        <Route path="/library" element={<WordLibrary />} />
        <Route path="/stats" element={<Statistics />} />
        <Route path="/settings" element={
          <Settings darkMode={darkMode} toggleDark={toggleDark} fontSize={fontSize} setFontSize={updateFontSize} />
        } />
      </Routes>
      {!hideNav && <NavBar />}
    </div>
  )
}
