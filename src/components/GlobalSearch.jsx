import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { speakWord } from '../utils/tts.js'

let allWords = null
async function getAllWords() {
  if (allWords) return allWords
  const [cet4, cet6] = await Promise.all([
    import('../data/cet4.json').then(m => m.default),
    import('../data/cet6.json').then(m => m.default),
  ])
  allWords = [...cet4.map(w => ({ ...w, lib: 'CET-4' })), ...cet6.map(w => ({ ...w, lib: 'CET-6' }))]
  return allWords
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [selectedLib, setSelectedLib] = useState('all')
  const [results, setResults] = useState([])
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) { setResults([]); return }
    let cancelled = false
    getAllWords().then(words => {
      if (cancelled) return
      let filtered = words
      if (selectedLib === 'CET-4') filtered = filtered.filter(w => w.lib === 'CET-4')
      else if (selectedLib === 'CET-6') filtered = filtered.filter(w => w.lib === 'CET-6')
      filtered = filtered.filter(w =>
        w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)
      ).slice(0, 50)
      setResults(filtered)
    })
    return () => { cancelled = true }
  }, [query, selectedLib])

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-4 pb-3">
        <h1 className="text-2xl font-bold mb-3">🔍 搜索单词</h1>
        <input ref={inputRef} type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入单词或中文释义..."
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:border-primary-500 dark:text-white"
          autoComplete="off" />
      </div>
      <div className="flex gap-2 mb-3">
        {['all', 'CET-4', 'CET-6'].map(lib => (
          <button key={lib} onClick={() => setSelectedLib(lib)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium btn-press ${selectedLib === lib ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
          >{lib === 'all' ? '全部词库' : lib}</button>
        ))}
      </div>
      {query ? (
        <div className="space-y-1">
          {results.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">未找到匹配的单词</p>
          ) : results.map(w => (
            <div key={w.lib + '_' + w.word} className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-3 flex items-center gap-3">
              <button onClick={() => navigate('/')} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{w.word}</span>
                  <button onClick={e => { e.stopPropagation(); speakWord(w.word) }} className="text-gray-300 hover:text-primary-500 text-xs">🔊</button>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${w.frequencyTier === 'core' ? 'text-amber-600 bg-amber-50 border-amber-200' : w.frequencyTier === 'advanced' ? 'text-purple-600 bg-purple-50 border-purple-200' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>{w.lib}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{w.meaning}</div>
              </button>
              <button onClick={() => navigate('/')} className="shrink-0 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium btn-press">学习</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-20">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-sm">输入单词或中文开始搜索</p>
          <p className="text-xs mt-2">支持 CET-4 + CET-6 共 8500+ 词</p>
        </div>
      )}
    </div>
  )
}
