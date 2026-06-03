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
  const [detailWord, setDetailWord] = useState(null)
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
              <button onClick={() => setDetailWord(w)} className="shrink-0 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium btn-press">学习</button>
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

      {/* 单词详情浮层 */}
      {detailWord && (() => {
        const w = detailWord
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setDetailWord(null)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
              {/* 头部 */}
              <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{w.word}</h2>
                    <button onClick={() => speakWord(w.word)} className="text-gray-400 hover:text-primary-500">🔊</button>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${w.frequencyTier === 'core' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-700' : w.frequencyTier === 'advanced' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700' : 'text-gray-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>{w.lib}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">/{w.phonetic_uk}/  /{w.phonetic_us}/</div>
                </div>
                <button onClick={() => setDetailWord(null)} className="text-gray-300 hover:text-gray-500 text-lg">✕</button>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
                <div className="text-base font-medium text-primary-600 dark:text-primary-400">{w.meaning}</div>

                {/* 易错标记 */}
                {w.reviewHistory && w.reviewHistory.filter(r => r.rating === 'forgot').length >= 2 && (
                  <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">📉 易错词</div>
                )}

                {/* 搭配 */}
                {w.collocations && w.collocations.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">📎 常考搭配</div>
                    <div className="flex flex-col gap-1">
                      {w.collocations.map((c, i) => {
                        const hasCn = c.includes(' — ')
                        return (
                          <div key={i} className="flex items-baseline gap-2 px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs border border-blue-100 dark:border-blue-800">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{hasCn ? c.split(' — ')[0] : c}</span>
                            {hasCn && <span className="text-gray-500 dark:text-gray-400">— {c.split(' — ')[1]}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 词根 */}
                {w.root && (w.root.root || w.root.prefix) && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">🌱 词根词缀</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      {w.root.prefix?.root && <div><span className="font-medium text-green-700 dark:text-green-300">{w.root.prefix.root}</span><span className="text-gray-500"> — {w.root.prefix.meaning}</span></div>}
                      {w.root.root && <div><span className="font-medium text-green-700 dark:text-green-300">{w.root.root.root}</span><span className="text-gray-500"> — {w.root.root.meaning}</span></div>}
                      {w.root.root?.related?.length > 0 && <div className="text-gray-500 mt-1">同根词: {w.root.root.related.slice(0, 8).join(' · ')}</div>}
                    </div>
                  </div>
                )}

                {/* 助记 */}
                {w.mnemonic && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">💡 助记</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{w.mnemonic}</div>
                  </div>
                )}

                {/* 例句 */}
                {w.example && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">📖 例句</div>
                      <button onClick={() => speakWord(w.example.includes(' — ') ? w.example.split(' — ')[0] : w.example)}
                        className="text-gray-400 hover:text-primary-500 text-xs">🔊</button>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 italic">"{w.example.includes(' — ') ? w.example.split(' — ')[0] : w.example}"</div>
                    {w.example.includes(' — ') && <div className="text-xs text-gray-500 mt-0.5">{w.example.split(' — ')[1]}</div>}
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button onClick={() => setDetailWord(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm btn-press">关闭</button>
                <button onClick={() => { setDetailWord(null); navigate('/') }} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium btn-press">开始学习</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
