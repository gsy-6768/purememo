import React, { useState, useEffect, useRef } from 'react'
import { getAllPlans, getWordsByPlan, getWeakWords, saveWord, getDB, deletePlan } from '../db/database.js'
import { ListSkeleton } from './Skeleton.jsx'

export default function WordLibrary() {
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [words, setWords] = useState([])
  const [filter, setFilter] = useState('all')
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState('')

  useEffect(() => { getAllPlans().then(setPlans) }, [])

  useEffect(() => {
    if (selectedPlan) {
      getWordsByPlan(selectedPlan.id).then(setWords)
    }
  }, [selectedPlan])

  function showMsg(msg) { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  async function importTxt(file) {
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (!selectedPlan) return
    
    const d = await getDB()
    const existing = await getWordsByPlan(selectedPlan.id)
    const existingWords = new Set(existing.map(w => w.word))
    
    let count = 0
    const tx = d.transaction('words', 'readwrite')
    for (const line of lines) {
      const word = line.trim().split(/[,\t]/)[0].trim()
      if (word && !existingWords.has(word)) {
        await tx.store.put({
          id: `${selectedPlan.id}_${word}`,
          planId: selectedPlan.id,
          word,
          phonetic_uk: '', phonetic_us: '',
          pos: '', meaning: '', example: '',
          isPaused: false, ef: 2.5, interval: 0,
          repetitions: 0, memoryStrength: 0,
          totalReviews: 0, correctStreak: 0,
          lastReviewTime: null, nextReviewTime: null,
          learnedDate: null, reviewHistory: []
        })
        count++
        existingWords.add(word)
      }
    }
    await tx.done
    showMsg(`成功导入 ${count} 个单词`)
    getWordsByPlan(selectedPlan.id).then(setWords)
  }

  async function importCsv(file) {
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (!selectedPlan) return
    
    const d = await getDB()
    const existing = await getWordsByPlan(selectedPlan.id)
    const existingWords = new Set(existing.map(w => w.word))
    
    let count = 0
    const tx = d.transaction('words', 'readwrite')
    for (const line of lines) {
      const parts = line.split(',')
      const word = parts[0]?.trim()
      if (word && !existingWords.has(word)) {
        await tx.store.put({
          id: `${selectedPlan.id}_${word}`,
          planId: selectedPlan.id,
          word,
          phonetic_uk: parts[1]?.trim() || '',
          phonetic_us: parts[1]?.trim() || '',
          pos: parts[2]?.trim() || '',
          meaning: parts[3]?.trim() || '',
          example: parts[4]?.trim() || '',
          isPaused: false, ef: 2.5, interval: 0,
          repetitions: 0, memoryStrength: 0,
          totalReviews: 0, correctStreak: 0,
          lastReviewTime: null, nextReviewTime: null,
          learnedDate: null, reviewHistory: []
        })
        count++
        existingWords.add(word)
      }
    }
    await tx.done
    showMsg(`成功导入 ${count} 个单词`)
    getWordsByPlan(selectedPlan.id).then(setWords)
  }

  async function addSingleWord() {
    const word = prompt('输入要添加的单词：')
    if (!word || !selectedPlan) return
    const d = await getDB()
    await d.put('words', {
      id: `${selectedPlan.id}_${word.trim()}`,
      planId: selectedPlan.id,
      word: word.trim(),
      phonetic_uk: '', phonetic_us: '',
      pos: '', meaning: '', example: '',
      isPaused: false, ef: 2.5, interval: 0,
      repetitions: 0, memoryStrength: 0,
      totalReviews: 0, correctStreak: 0,
      lastReviewTime: null, nextReviewTime: null,
      learnedDate: null, reviewHistory: []
    })
    showMsg(`已添加: ${word.trim()}`)
    getWordsByPlan(selectedPlan.id).then(setWords)
  }

  async function removeWord(wordId) {
    if (!confirm('确定移除此单词？')) return
    const d = await getDB()
    await d.delete('words', wordId)
    setWords(prev => prev.filter(w => w.id !== wordId))
    showMsg('已移除')
  }

  async function handleDeletePlan(planId) {
    if (!confirm('确定删除整个学习计划？所有学习记录将丢失！')) return
    await deletePlan(planId)
    setSelectedPlan(null)
    getAllPlans().then(setPlans)
  }

  const filtered = filter === 'all' ? words :
    filter === 'mastered' ? words.filter(w => w.memoryStrength >= 0.7) :
    filter === 'learning' ? words.filter(w => w.nextReviewTime && w.memoryStrength < 0.7) :
    filter === 'new' ? words.filter(w => !w.nextReviewTime) :
    words.filter(w => (w.reviewHistory || []).filter(r => r.rating === 'forgot').length >= 2)

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">📚 词库管理</h1>
      </div>

      {message && (
        <div className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-lg text-sm mb-3">
          {message}
        </div>
      )}

      {/* 计划选择 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {plans.map(p => (
          <button key={p.id} onClick={() => setSelectedPlan(p)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium btn-press ${
              selectedPlan?.id === p.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selectedPlan && (
        <>
          {/* 操作按钮 */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs btn-press">
              📥 导入 TXT/CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={e => {
              const f = e.target.files?.[0]
              if (f) f.name.endsWith('.csv') ? importCsv(f) : importTxt(f)
              e.target.value = ''
            }} />
            <button onClick={addSingleWord} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs btn-press">
              ➕ 手动添加
            </button>
            <button onClick={() => handleDeletePlan(selectedPlan.id)} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-danger-200 dark:border-gray-700 rounded-lg text-xs text-danger-500 btn-press ml-auto">
              🗑 删除计划
            </button>
          </div>

          {/* 过滤 */}
          <div className="flex gap-2 text-xs mb-3">
          {(() => {
            const weakCount = words.filter(w => (w.reviewHistory || []).filter(r => r.rating === 'forgot').length >= 2).length
            return [
              { key: 'all', label: `全部 (${words.length})` },
              { key: 'new', label: `未学 (${words.filter(w => !w.nextReviewTime).length})` },
              { key: 'learning', label: `学习中 (${words.filter(w => w.nextReviewTime && w.memoryStrength < 0.7).length})` },
              { key: 'mastered', label: `已掌握 (${words.filter(w => w.memoryStrength >= 0.7).length})` },
              ...(weakCount > 0 ? [{ key: 'weak', label: `📉 易错词 (${weakCount})` }] : [])
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-2 py-1 rounded ${filter === f.key ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-500'}`}
              >{f.label}</button>
            ))
          })()}
          </div>

          {/* 单词列表 */}
          <div className="space-y-1">
            {filtered.slice(0, 200).map(w => (
              <div key={w.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <span className="font-medium">{w.word}</span>
                  {w.meaning && <span className="text-xs text-gray-400 ml-2">{w.pos} {w.meaning}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    !w.nextReviewTime ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' :
                    w.memoryStrength >= 0.7 ? 'bg-success-100 dark:bg-success-900/30 text-success-600' :
                    'bg-warning-100 dark:bg-warning-900/30 text-warning-600'
                  }`}>
                    {!w.nextReviewTime ? '未学' : w.memoryStrength >= 0.7 ? '已掌握' : '学习中'}
                  </span>
                  <button onClick={() => removeWord(w.id)} className="text-gray-300 hover:text-danger-500 text-xs">✕</button>
                </div>
              </div>
            ))}
            {filtered.length > 200 && (
              <p className="text-center text-xs text-gray-400 py-2">仅显示前 200 个，共 {filtered.length} 个</p>
            )}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8">暂无单词</p>
            )}
          </div>
        </>
      )}

      {!selectedPlan && (
        <div className="text-center text-gray-400 py-20">
          <div className="text-4xl mb-4">📖</div>
          <p>请先选择一个学习计划</p>
        </div>
      )}
    </div>
  )
}
