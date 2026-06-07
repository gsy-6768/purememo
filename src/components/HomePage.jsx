import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllPlans, getAllDailyStats, getWordsByPlan, getSetting, setSetting, getWeakWords, getDB } from '../db/database.js'
import { useToast } from './Toast.jsx'
// cet4/cet6 loaded lazily to reduce bundle size

export default function HomePage() {
  const [plans, setPlans] = useState([])
  const [dueStats, setDueStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [modePicker, setModePicker] = useState(null)
  const [streak, setStreak] = useState(0)
  const [todayDone, setTodayDone] = useState({ learned: 0, reviewed: 0, targetNew: 20, targetReview: 100 })
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 确保内置词库已导入（带版本检测，避免每次重复处理）
      // 确保内置词库已导入
      await ensureBuiltinLibraries()
      const p = await getAllPlans()
      setPlans(p)
      
      const dailyNewLimit = parseInt(await getSetting('dailyNewLimit')) || 20
      const dailyReviewLimit = parseInt(await getSetting('dailyReviewLimit')) || 100
      const todayStart = new Date().setHours(0, 0, 0, 0)

      // 连续打卡天数
      const allStats = await getAllDailyStats()
      const dateSet = new Set(allStats.map(s => s.date))
      let streakCount = 0
      const d = new Date()
      while (true) {
        const dateStr = d.toISOString().slice(0, 10)
        if (dateSet.has(dateStr)) {
          streakCount++
          d.setDate(d.getDate() - 1)
        } else break
      }
      setStreak(streakCount)

      // 今日完成情况
      const today = new Date().toISOString().slice(0, 10)
      const todayStats = allStats.filter(s => s.date === today)
      const todayLearned = todayStats.reduce((sum, s) => sum + (s.newLearned || 0), 0)
      const todayReviewed = todayStats.reduce((sum, s) => sum + (s.reviewed || 0), 0)
      setTodayDone({ learned: todayLearned, reviewed: todayReviewed, targetNew: dailyNewLimit, targetReview: dailyReviewLimit })

      const stats = {}
      for (const plan of p) {
        const words = await getWordsByPlan(plan.id)
        const now = Date.now()
        const due = words.filter(w => w.nextReviewTime && w.nextReviewTime <= now && !w.isPaused)
        const newWords = words.filter(w => !w.nextReviewTime && !w.isPaused)
        const learned = words.filter(w => w.lastReviewTime)

        // 核心词掌握进度（懒加载词库数据）
        const libName = plan.name === '大学英语四级' ? 'cet4' : plan.name === '大学英语六级' ? 'cet6' : ''
        let totalCore = 0
        let coreWords = []
        if (libName) {
          const data = await import(`../data/${libName}.json`).then(m => m.default)
          coreWords = data.filter(w => w.frequencyTier === 'core')
          totalCore = coreWords.length
        }
        // 已学的核心词
        const learnedWords = new Set(learned.map(w => w.word))
        const coreLearned = coreWords.filter(w => learnedWords.has(w.word)).length

        // 今日已学新词数
        const alreadyLearned = words.filter(w => w.learnedDate && w.learnedDate >= todayStart)
        const canLearnNew = Math.max(0, dailyNewLimit - alreadyLearned.length)
        const availableNew = Math.min(newWords.length, canLearnNew)

        // 今日待学习 = 复习上限内 + 新词上限内
        const todayStudy = Math.min(due.length, dailyReviewLimit) + availableNew

        stats[plan.id] = { due: due.length, new: newWords.length, total: words.length, today: todayStudy, coreLearned, totalCore }
      }
      
      setDueStats(stats)
      
      // 易错词（延迟计算，避免阻塞首页渲染）
      setTimeout(async () => {
        const updated = { ...stats }
        for (const plan of p) {
          const weakWords = await getWeakWords(plan.id)
          updated[plan.id] = { ...updated[plan.id], weakCount: weakWords.length }
        }
        setDueStats(updated)
      }, 100)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function ensureBuiltinLibraries() {
    const d = await getDB()
    const existing = await d.getAll('libraries')
    const existingLibs = new Map(existing.map(l => [l.id, l]))
    
    // 懒加载词库数据
    const [cet4json, cet6json] = await Promise.all([
      import('../data/cet4.json').then(m => m.default),
      import('../data/cet6.json').then(m => m.default),
    ])
    const builtins = [
      { id: 'cet4', name: '大学英语四级', words: cet4json },
      { id: 'cet6', name: '大学英语六级', words: cet6json }
    ]
    for (const lib of builtins) {
      const oldLib = existingLibs.get(lib.id)
      const newLib = { id: lib.id, name: lib.name, words: lib.words }
      const newWordMap = new Map(lib.words.map(w => [w.word, w]))
      
      // 找到关联的学习计划
      const plans = await d.getAll('plans')
      const plan = plans.find(p => p.libraryId === lib.id)
      
      if (plan) {
        const tx = d.transaction('words', 'readwrite')
        const existingWords = existingLibs.has(lib.id)
          ? await tx.store.index('planId').getAll(plan.id)
          : []
        
        const existingByWord = new Map(existingWords.map(w => [w.word, w]))
        let updated = 0, added = 0
        
        for (const w of lib.words) {
          const existing = existingByWord.get(w.word)
          // 丰富内容字段（从 JSON 同步到 IndexedDB）
          const enrichedFields = {
            frequencyTier: w.frequencyTier || 'common',
            collocations: w.collocations || [],
            root: w.root || null,
            mnemonic: w.mnemonic || '',
            synonyms: w.synonyms || [],
            antonyms: w.antonyms || [],
            extraExamples: w.extraExamples || [],
            relatedWords: w.relatedWords || [],
          }
          if (existing) {
            // 检查是否有变化（基础字段变化，或缺少丰富字段）
            const needsUpdate =
              existing.meaning !== (w.meaning || '') ||
              existing.example !== (w.example || '') ||
              existing.phonetic_uk !== (w.phonetic_uk || '') ||
              existing.phonetic_us !== (w.phonetic_us || '') ||
              existing.pos !== (w.pos || '') ||
              !existing.frequencyTier ||  // 旧数据没有丰富字段，强制同步
              existing.frequencyTier !== enrichedFields.frequencyTier
            if (needsUpdate) {
              tx.store.put({
                ...existing,
                ...enrichedFields,
                phonetic_uk: w.phonetic_uk || '',
                phonetic_us: w.phonetic_us || '',
                pos: w.pos || '',
                meaning: w.meaning || '',
                example: w.example || '',
              })
              updated++
            }
          } else {
            // 添加新单词（含丰富字段）
            await tx.store.put({
              id: `${plan.id}_${w.word}`,
              planId: plan.id,
              word: w.word,
              phonetic_uk: w.phonetic_uk || '',
              phonetic_us: w.phonetic_us || '',
              pos: w.pos || '',
              meaning: w.meaning || '',
              example: w.example || '',
              ...enrichedFields,
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
        if (updated > 0 || added > 0) {
          console.log(`为计划 ${plan.name}: 更新 ${updated} 词, 新增 ${added} 词`)
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
      dailyNewLimit: 20,
      dailyReviewLimit: 100
    }
    await d.put('plans', plan)
    
    // 为词库中每个单词创建学习记录（含丰富字段）
    const words = lib.words.map(w => ({
      id: `${planId}_${w.word}`,
      planId: planId,
      word: w.word,
      phonetic_uk: w.phonetic_uk || '',
      phonetic_us: w.phonetic_us || '',
      pos: w.pos || '',
      meaning: w.meaning || '',
      example: w.example || '',
      frequencyTier: w.frequencyTier || 'common',
      collocations: w.collocations || [],
      root: w.root || null,
      mnemonic: w.mnemonic || '',
      synonyms: w.synonyms || [],
      antonyms: w.antonyms || [],
      extraExamples: w.extraExamples || [],
      relatedWords: w.relatedWords || [],
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
    
    // 批量写入，减少 async 开销
    const tx = d.transaction('words', 'readwrite')
    const store = tx.store
    for (let i = 0; i < words.length; i += 200) {
      const batch = words.slice(i, i + 200)
      for (const w of batch) store.put(w)
    }
    await tx.done
    toast(`已创建「${lib.name}」学习计划`, 'success')
    
    loadData()
  }

  if (loading) return (
    <div className="pb-20 px-4 max-w-lg mx-auto animate-pulse pt-20">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      {/* 标题 + 打卡 */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">PureMemo</h1>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-orange-500">🔥</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">连续 {streak} 天</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">纯算法·离线背单词</p>
      </div>

      {/* 今日进度环 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#4F46E5" strokeWidth="3" strokeDasharray={`${Math.min(100, Math.round(todayDone.learned + todayDone.reviewed > 0 ? ((todayDone.learned + todayDone.reviewed) / (todayDone.targetNew + todayDone.targetReview)) * 100 : 0))}, 100`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                {Math.min(100, Math.round(todayDone.learned + todayDone.reviewed > 0 ? ((todayDone.learned + todayDone.reviewed) / (todayDone.targetNew + todayDone.targetReview)) * 100 : 0))}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {todayDone.learned + todayDone.reviewed > 0 ? '今日已学习' : '今日尚未学习'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              新学 {todayDone.learned} / {todayDone.targetNew} · 复习 {todayDone.reviewed} / {todayDone.targetReview}
            </div>
            <div className="flex gap-1 mt-1.5">
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${todayDone.learned + todayDone.reviewed > 0 ? 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                {todayDone.learned + todayDone.reviewed > 0 ? '✅ 已完成' : '⏳ 待学习'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 已有学习计划 */}
      {plans.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">我的学习计划</h2>
          {plans.map(plan => {
            const s = dueStats[plan.id] || { due: 0, new: 0, total: 0, today: 0, coreLearned: 0, totalCore: 0, weakCount: 0 }
            const corePct = s.totalCore > 0 ? Math.round((s.coreLearned / s.totalCore) * 100) : 0
            return (
              <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <span className="text-xs text-gray-400">{s.total} 词</span>
                </div>
                {/* 核心词进度 */}
                {s.totalCore > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">⭐ 核心词</span>
                      <span className="text-gray-500">{s.coreLearned}/{s.totalCore} ({corePct}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${corePct}%` }}></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 mb-2 text-sm">
                  <span className="text-success-500 font-medium">今日待学习 {s.today}</span>
                  <span className="text-danger-500">待复习 {s.due}</span>
                  <span className="text-primary-500">可学新词 {s.new}</span>
                </div>
                {s.weakCount > 0 && (
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="text-danger-400">📉 易错词 {s.weakCount} 个</span>
                    <button onClick={() => navigate(`/study/${plan.id}?mode=flip&weak=1`)}
                      className="px-2 py-0.5 bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 rounded border border-danger-200 dark:border-danger-800 hover:bg-danger-100 btn-press">
                      复习易错词
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => s.today > 0 ? setModePicker({ planId: plan.id }) : setModePicker({ planId: plan.id, limitReached: true, currentLimit: todayDone.targetNew })}
                    className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium text-sm btn-press"
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

      {/* 学习模式选择器 / 已达上限提示 */}
      {modePicker && (() => {
        const isLimitReached = modePicker.limitReached
        const pid = modePicker.planId
        return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setModePicker(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            {isLimitReached ? (
              <>
                <div className="text-center mb-5">
                  <div className="text-4xl mb-2">🎯</div>
                  <h2 className="font-bold text-lg">今日目标已完成！</h2>
                  <p className="text-xs text-gray-400 mt-1">已达到每日新学单词上限，是否增加？</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[20, 30, 50, 100].map(add => {
                    const total = (modePicker.currentLimit || 20) + add
                    return (
                      <button key={add} onClick={async () => {
                        await setSetting('dailyNewLimit', String(total))
                        setModePicker({ planId: pid })
                        loadData()
                      }}
                        className="p-3 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
                        <span className="text-lg font-bold">+{add}</span>
                        <span className="text-xs text-gray-400 block">共 {total} 个</span>
                      </button>
                    )
                  })}
                </div>
                <div className="text-center">
                  <button onClick={() => navigate(`/stats?plan=${pid}`)}
                    className="text-xs text-primary-500 hover:text-primary-600 mr-4">查看统计</button>
                  <button onClick={() => setModePicker(null)}
                    className="text-xs text-gray-400 hover:text-gray-600">关闭</button>
                </div>
              </>
            ) : (
              <>
              <div className="text-center mb-5">
                <h2 className="font-bold text-lg">选择学习模式</h2>
                <p className="text-xs text-gray-400 mt-1">今日待学习 {dueStats[pid]?.today || 0} 个单词</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { navigate(`/study/${pid}?mode=flip`); setModePicker(null) }}
                  className="p-4 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
                  <span className="text-2xl block mb-1">🃏</span>
                  <span className="text-sm font-medium">翻卡记忆</span>
                  <span className="text-xs text-gray-400 block mt-0.5">看单词→回想释义</span>
                </button>
                <button onClick={() => { navigate(`/study/${pid}?mode=spell`); setModePicker(null) }}
                  className="p-4 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
                  <span className="text-2xl block mb-1">✍️</span>
                  <span className="text-sm font-medium">拼写模式</span>
                  <span className="text-xs text-gray-400 block mt-0.5">看释义→输入单词</span>
                </button>
                <button onClick={() => { navigate(`/study/${pid}?mode=quiz`); setModePicker(null) }}
                  className="p-4 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
                  <span className="text-2xl block mb-1">🎯</span>
                  <span className="text-sm font-medium">选择题</span>
                  <span className="text-xs text-gray-400 block mt-0.5">四选一选释义</span>
                </button>
                <button onClick={() => { navigate(`/study/${pid}?mode=fill`); setModePicker(null) }}
                  className="p-4 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
                  <span className="text-2xl block mb-1">📝</span>
                  <span className="text-sm font-medium">例句填空</span>
                  <span className="text-xs text-gray-400 block mt-0.5">看例句→填入单词</span>
                </button>
              </div>
              <button onClick={() => setModePicker(null)} className="w-full mt-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 btn-press">
                取消
              </button>
              </>
            )}
          </div>
        </div>
        )
      })()}

      {/* 创建学习计划 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
        <h2 className="font-semibold mb-3">添加学习计划</h2>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => createPlan('cet4')} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
            <span className="text-xl block mb-1">📘</span>
            <span className="text-sm font-medium">四级词汇</span>
            <span className="text-xs text-gray-400 block">4544 词</span>
          </button>
          <button onClick={() => createPlan('cet6')} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 btn-press">
            <span className="text-xl block mb-1">📕</span>
            <span className="text-sm font-medium">六级词汇</span>
            <span className="text-xs text-gray-400 block">3991 词</span>
          </button>
        </div>
      </div>
    </div>
  )
}
