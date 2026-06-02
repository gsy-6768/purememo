import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllPlans, getWordsByPlan, getDB } from '../db/database.js'
import cet4 from '../data/cet4.json'
import cet6 from '../data/cet6.json'

export default function HomePage() {
  const [plans, setPlans] = useState([])
  const [dueStats, setDueStats] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 确保内置词库已导入
      await ensureBuiltinLibraries()
      
      const p = await getAllPlans()
      setPlans(p)
      
      // 统计每个计划待复习数
      const stats = {}
      for (const plan of p) {
        const words = await getWordsByPlan(plan.id)
        const now = Date.now()
        const due = words.filter(w => w.nextReviewTime && w.nextReviewTime <= now && !w.isPaused)
        const newWords = words.filter(w => !w.nextReviewTime && !w.isPaused)
        stats[plan.id] = { due: due.length, new: newWords.length, total: words.length }
      }
      setDueStats(stats)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function ensureBuiltinLibraries() {
    const d = await getDB()
    const existing = await d.getAll('libraries')
    const existingLibs = new Map(existing.map(l => [l.id, l]))
    
    const builtins = [
      { id: 'cet4', name: '大学英语四级', words: cet4 },
      { id: 'cet6', name: '大学英语六级', words: cet6 }
    ]
    
    for (const lib of builtins) {
      const old = existingLibs.get(lib.id)
      // 强制用最新词库覆盖（无论是新增还是已有）
      const newLib = { id: lib.id, name: lib.name, words: lib.words }
      
      // 如果是已有计划，同步更新已入库的单词记录
      if (old && old.words && old.words.length !== lib.words.length) {
        const plans = await d.getAll('plans')
        const plan = plans.find(p => p.libraryId === lib.id)
        if (plan) {
          const tx = d.transaction('words', 'readwrite')
          // 获取已有单词记录
          const existingWords = await tx.store.index('planId').getAll(plan.id)
          const existingWordSet = new Set(existingWords.map(w => w.word))
          
          // 添加新词库中有但学习记录中没有的新单词
          let added = 0
          for (const w of lib.words) {
            if (!existingWordSet.has(w.word)) {
              await tx.store.put({
                id: `${plan.id}_${w.word}`,
                planId: plan.id,
                word: w.word,
                phonetic_uk: w.phonetic_uk || '',
                phonetic_us: w.phonetic_us || '',
                pos: w.pos || '',
                meaning: w.meaning || '',
                example: w.example || '',
                isPaused: false,
                ef: 2.5, interval: 0, repetitions: 0,
                memoryStrength: 0, totalReviews: 0,
                correctStreak: 0, lastReviewTime: null,
                nextReviewTime: null, learnedDate: null,
                reviewHistory: []
              })
              added++
            }
          }
          await tx.done
          if (added > 0) console.log(`为计划 ${plan.name} 补充了 ${added} 个新单词`)
        }
      }
      
      await d.put('libraries', newLib)
    }
  }

  async function createPlan(libId) {
    const d = await getDB()
    const lib = await d.get('libraries', libId)
    if (!lib) return
    
    const planId = `plan_${Date.now()}`
    const plan = {
      id: planId,
      name: lib.name,
      libraryId: libId,
      createdAt: Date.now(),
      dailyNewLimit: 5000,
      dailyReviewLimit: 5000
    }
    await d.put('plans', plan)
    
    // 为词库中每个单词创建学习记录
    const words = lib.words.map(w => ({
      id: `${planId}_${w.word}`,
      planId: planId,
      word: w.word,
      phonetic_uk: w.phonetic_uk || '',
      phonetic_us: w.phonetic_us || '',
      pos: w.pos || '',
      meaning: w.meaning || '',
      example: w.example || '',
      isPaused: false,
      ef: 2.5,
      interval: 0,
      repetitions: 0,
      memoryStrength: 0,
      totalReviews: 0,
      correctStreak: 0,
      lastReviewTime: null,
      nextReviewTime: null,
      learnedDate: null,
      reviewHistory: []
    }))
    
    const tx = d.transaction('words', 'readwrite')
    for (const w of words) {
      await tx.store.put(w)
    }
    await tx.done
    
    loadData()
  }

  if (loading) return (
    <div className="flex items-center justify-center pt-20">
      <p className="text-gray-400 animate-pulse">加载中...</p>
    </div>
  )

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      {/* 标题 */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">PureMemo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">纯算法·离线背单词</p>
      </div>

      {/* 已有学习计划 */}
      {plans.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">我的学习计划</h2>
          {plans.map(plan => {
            const s = dueStats[plan.id] || { due: 0, new: 0, total: 0 }
            return (
              <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <span className="text-xs text-gray-400">{s.total} 词</span>
                </div>
                <div className="flex gap-4 mb-3 text-sm">
                  <span className="text-danger-500">待复习 {s.due}</span>
                  <span className="text-primary-500">可学新词 {s.new}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/study/${plan.id}`)}
                    disabled={s.due === 0 && s.new === 0}
                    className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium text-sm btn-press disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    开始学习
                  </button>
                  <button
                    onClick={() => navigate(`/stats?plan=${plan.id}`)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm btn-press"
                  >
                    详情
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 创建学习计划 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
        <h2 className="font-semibold mb-3">添加学习计划</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => createPlan('cet4')} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
            <span className="text-xl block mb-1">📘</span>
            <span className="text-sm font-medium">四级词汇</span>
            <span className="text-xs text-gray-400 block">{cet4.length} 词</span>
          </button>
          <button onClick={() => createPlan('cet6')} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
            <span className="text-xl block mb-1">📕</span>
            <span className="text-sm font-medium">六级词汇</span>
            <span className="text-xs text-gray-400 block">{cet6.length} 词</span>
          </button>
        </div>
      </div>
    </div>
  )
}
