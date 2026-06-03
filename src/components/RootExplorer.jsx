import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import rootsData from '../data/roots.json'

const ORIGIN_TAGS = {
  '拉丁': { label: '拉丁语', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  '希腊': { label: '希腊语', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  '古英语': { label: '古英语', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  '法语': { label: '法语', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

export default function RootExplorer() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all') // all | latin | greek
  const navigate = useNavigate()

  const rootList = useMemo(() => {
    const list = Object.values(rootsData.roots)
    let filtered = list

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(r =>
        r.root.toLowerCase().includes(q) ||
        r.meaning.toLowerCase().includes(q)
      )
    }

    // Origin filter
    if (filter === 'latin') filtered = filtered.filter(r => r.origin?.includes('拉丁'))
    else if (filter === 'greek') filtered = filtered.filter(r => r.origin?.includes('希腊'))

    return filtered.sort((a, b) => b.words.length - a.words.length)
  }, [search, filter])

  function getOriginTag(origin) {
    if (!origin) return null
    for (const [key, tag] of Object.entries(ORIGIN_TAGS)) {
      if (origin.includes(key)) return tag
    }
    return null
  }

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">🌱 词根字典</h1>
        <p className="text-xs text-gray-400 mt-1">共 {rootsData.meta.totalRoots} 个词根，映射 {rootsData.meta.totalMappedWords} 个单词</p>
      </div>

      {/* 搜索 */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索词根名或含义..."
        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:border-primary-500 dark:text-white mb-3"
      />

      {/* 过滤标签 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: `全部 (${Object.keys(rootsData.roots).length})` },
          { key: 'latin', label: `拉丁语 (${Object.values(rootsData.roots).filter(r => r.origin?.includes('拉丁')).length})` },
          { key: 'greek', label: `希腊语 (${Object.values(rootsData.roots).filter(r => r.origin?.includes('希腊')).length})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium btn-press ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {/* 词根列表 */}
      <div className="space-y-2">
        {rootList.map(root => {
          const isExpanded = expanded === root.root
          const tag = getOriginTag(root.origin)
          return (
            <div key={root.root} className="bg-white dark:bg-gray-800 rounded-xl card-shadow overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : root.root)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono font-bold text-primary-600 dark:text-primary-400">{root.root}</span>
                    {tag && <span className={`text-[10px] px-1.5 py-0.5 rounded ${tag.color}`}>{tag.label}</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{root.meaning}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{root.words.length} 词</span>
                  <span className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                  {root.origin && (
                    <div className="text-xs text-gray-400 mt-2 mb-2">来源：{root.origin}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {root.words.slice(0, 30).map(w => (
                      <button key={w}
                        onClick={() => navigate(`/library?word=${w}`)}
                        className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 btn-press"
                      >
                        {w}
                      </button>
                    ))}
                    {root.words.length > 30 && (
                      <span className="text-xs text-gray-400 self-center ml-1">+{root.words.length - 30} 更多</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {rootList.length === 0 && (
          <p className="text-center text-gray-400 py-10">未找到匹配的词根</p>
        )}
      </div>
    </div>
  )
}
