import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import passages from '../data/passages.json'
import cet4 from '../data/cet4.json'
import cet6 from '../data/cet6.json'

// Build word lookup map from CET data
const wordMap = {}
for (const w of [...cet4, ...cet6]) {
  wordMap[w.word.toLowerCase()] = w
}

export default function ReadingView() {
  const [selected, setSelected] = useState(null)
  const [popupWord, setPopupWord] = useState(null)
  const [saved, setSaved] = useState(new Set())
  const navigate = useNavigate()

  // Tokenize passage: split into words and non-words
  const tokens = useMemo(() => {
    if (!selected) return []
    const regex = /([a-zA-Z'-]+|[^a-zA-Z'-]+)/g
    return selected.content.match(regex) || []
  }, [selected])

  function handleWordClick(word) {
    const clean = word.toLowerCase().replace(/[^a-z'-]/g, '')
    if (!clean || clean.length < 2) return
    const info = wordMap[clean]
    if (info) setPopupWord({ word: clean, data: info })
  }

  function toggleSave(word) {
    setSaved(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  // Passage list view
  if (!selected) {
    return (
      <div className="pb-20 px-4 max-w-lg mx-auto">
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold">📖 沉浸式阅读</h1>
          <p className="text-xs text-gray-400 mt-1">在语境中背单词，点击单词查看释义</p>
        </div>
        <div className="space-y-2">
          {passages.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className="w-full bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 text-left btn-press">
              <div className="font-semibold text-sm">{p.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.level === 'CET-6' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {p.level}
                </span>
                <span className="text-xs text-gray-400">~{p.content.split(' ').length} 词</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{p.content.slice(0, 120)}...</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Reading view
  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => { setSelected(null); setPopupWord(null) }} className="text-gray-400 hover:text-gray-600 btn-press text-lg">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm truncate">{selected.title}</h1>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${selected.level === 'CET-6' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {selected.level}
          </span>
        </div>
      </div>

      {/* Passage content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-5 leading-relaxed text-sm text-gray-700 dark:text-gray-300">
        {tokens.map((token, i) => {
          const clean = token.toLowerCase().replace(/[^a-z'-]/g, '')
          const isWord = clean.length >= 2 && wordMap[clean]
          if (!isWord) return <span key={i}>{token}</span>
          return (
            <span key={i} className="relative group">
              <button
                onClick={() => handleWordClick(token)}
                className="text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded px-0.5 -mx-0.5 transition-colors cursor-pointer border-b border-dotted border-primary-300 dark:border-primary-700"
              >
                {token}
              </button>
            </span>
          )
        })}
      </div>

      {/* Saved count */}
      {saved.size > 0 && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          已标记 {saved.size} 个单词
        </div>
      )}

      {/* Word popup */}
      {popupWord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={() => setPopupWord(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold">{popupWord.data.word}</h2>
                <div className="text-xs text-gray-400 mt-0.5">
                  /{popupWord.data.phonetic_uk}/  /{popupWord.data.phonetic_us}/
                </div>
              </div>
              <button onClick={() => setPopupWord(null)} className="text-gray-300 hover:text-gray-500">✕</button>
            </div>
            <div className="text-base text-primary-600 dark:text-primary-400 font-medium mb-3">
              {popupWord.data.meaning}
            </div>
            {popupWord.data.example && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                "{popupWord.data.example}"
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => toggleSave(popupWord.word)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium btn-press ${
                  saved.has(popupWord.word)
                    ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 border border-success-300'
                    : 'bg-primary-600 text-white'
                }`}
              >
                {saved.has(popupWord.word) ? '✅ 已标记' : '📥 标记学习'}
              </button>
              <button onClick={() => setPopupWord(null)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm btn-press">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
