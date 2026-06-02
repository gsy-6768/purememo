import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getWordsByPlan, saveWord, getSetting, getPlan } from '../db/database.js'
import { calculateNextReview, getTodayNewCount, calculateCurrentMemoryStrength } from '../algorithms/spaced-repetition.js'
import { speakWord } from '../utils/tts.js'

export default function StudyView() {
  const { planId } = useParams()
  const navigate = useNavigate()
  
  const [words, setWords] = useState([])
  const [plan, setPlan] = useState(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, hazy: 0, forgot: 0, newLearned: 0 })
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    async function init() {
      const p = await getPlan(planId)
      setPlan(p)
      
      const autoS = await getSetting('autoSpeak')
      setAutoSpeak(autoS !== 'false')
      
      const allWords = await getWordsByPlan(planId)
      if (!allWords.length) { navigate('/'); return }
      
      const now = Date.now()
      // 分离复习和新词
      const dueWords = allWords.filter(w => w.nextReviewTime && w.nextReviewTime <= now && !w.isPaused)
      const newWords = allWords.filter(w => !w.nextReviewTime && !w.isPaused)
      
      // 新词数量限制
      const todayNew = await getSetting('dailyNewLimit')
      const dailyNewLimit = todayNew ? parseInt(todayNew) : (p?.dailyNewLimit || 20)
      const dailyReviewLimit = parseInt(await getSetting('dailyReviewLimit')) || (p?.dailyReviewLimit || 100)
      
      const alreadyLearned = allWords.filter(w => w.learnedDate && w.learnedDate >= new Date().setHours(0,0,0,0))
      const canLearnNew = Math.max(0, dailyNewLimit - alreadyLearned.length)
      const availableNew = newWords.slice(0, canLearnNew)
      
      // 复习限制
      const limitedDue = dueWords.slice(0, dailyReviewLimit)
      
      // 合并：复习优先，然后新词
      const studyList = [...limitedDue, ...availableNew]
      
      // 打乱顺序 - 复习词按到期时间排序，新词打乱
      const shuffledNew = availableNew.sort(() => Math.random() - 0.5)
      const finalList = [...limitedDue, ...shuffledNew]
      
      setWords(finalList)
      setTotalCount(finalList.length)
      setLoading(false)
      
      if (finalList.length === 0) {
        navigate('/')
      }
    }
    init()
  }, [planId])

  const current = words[index]

  const handleFeedback = useCallback(async (rating) => {
    if (!current) return
    
    const updated = calculateNextReview(current, rating)
    const now = Date.now()
    
    // 更新学习状态
    const newWord = { ...current, ...updated }
    if (!newWord.learnedDate) newWord.learnedDate = now
    
    // 如果所有词都学完了或是新词第一次学
    await saveWord(newWord)
    
    // 更新统计
    setSessionStats(prev => {
      const next = { ...prev, reviewed: prev.reviewed + 1 }
      if (!current.nextReviewTime) next.newLearned = prev.newLearned + 1
      if (rating === 'known') next.correct = prev.correct + 1
      if (rating === 'hazy') next.hazy = prev.hazy + 1
      if (rating === 'forgot') next.forgot = prev.forgot + 1
      return next
    })
    
    setFlipped(false)
    
    if (index + 1 >= words.length) {
      // 学习完成，跳转到完成页
      navigate(`/complete/${planId}`, { state: { stats: { ...sessionStats, reviewed: sessionStats.reviewed + 1 } } })
    } else {
      setIndex(i => i + 1)
    }
  }, [current, index, words, planId, navigate, sessionStats])

  // 键盘快捷键
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
      if (flipped) {
        if (e.key === '1') handleFeedback('forgot')
        if (e.key === '2') handleFeedback('hazy')
        if (e.key === '3') handleFeedback('known')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, handleFeedback])

  // 自动发音
  useEffect(() => {
    if (current && autoSpeak && !flipped) {
      speakWord(current.word)
    }
  }, [current, autoSpeak, flipped])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 animate-pulse">准备学习中...</p>
    </div>
  )

  if (!current) return null

  const progress = totalCount > 0 ? (index / totalCount) * 100 : 0

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* 顶部信息 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg">✕</button>
        <span className="text-sm text-gray-400">{plan?.name}</span>
        <span className="text-sm text-gray-500">{index + 1}/{totalCount}</span>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
        <div className="bg-primary-500 h-1.5 rounded-full progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {/* 卡片 */}
      <div className="flex-1 flex items-center justify-center" onClick={() => !flipped && setFlipped(true)}>
        <div className="w-full max-w-sm aspect-[3/4] perspective cursor-pointer">
          <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
            {/* 正面：单词 */}
            <div className="card-face bg-white dark:bg-gray-800 card-shadow flex flex-col items-center justify-center p-8">
              <h2 className="text-3xl font-bold mb-3 text-center">{current.word}</h2>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-400">英 /{current.phonetic_uk}/</span>
                <button onClick={(e) => { e.stopPropagation(); speakWord(current.word, 'uk') }} className="text-gray-400 hover:text-primary-500 text-lg">🔊</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">美 /{current.phonetic_us}/</span>
                <button onClick={(e) => { e.stopPropagation(); speakWord(current.word, 'us') }} className="text-gray-400 hover:text-primary-500 text-lg">🔊</button>
              </div>
              <p className="text-xs text-gray-300 mt-6">点击卡片或按空格键翻转</p>
            </div>

            {/* 背面：释义 */}
            <div className="card-face card-back bg-white dark:bg-gray-800 card-shadow flex flex-col items-center justify-center p-8">
              <h2 className="text-2xl font-bold mb-2">{current.word}</h2>
              <div className="text-lg text-primary-600 dark:text-primary-400 font-medium mb-4">
                {current.pos} {current.meaning}
              </div>
              {current.example && (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center italic border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                  "{current.example}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 反馈按钮 */}
      <div className={`transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex gap-3 py-4">
          <button onClick={() => handleFeedback('forgot')} className="flex-1 py-3 bg-danger-500 text-white rounded-xl font-medium text-sm btn-press active:bg-danger-600 shadow-lg shadow-danger-500/30">
            <div className="text-lg">😅</div>
            <div>忘记</div>
            <div className="text-xs opacity-70">按键 1</div>
          </button>
          <button onClick={() => handleFeedback('hazy')} className="flex-1 py-3 bg-warning-500 text-white rounded-xl font-medium text-sm btn-press active:bg-warning-600 shadow-lg shadow-warning-500/30">
            <div className="text-lg">🤔</div>
            <div>模糊</div>
            <div className="text-xs opacity-70">按键 2</div>
          </button>
          <button onClick={() => handleFeedback('known')} className="flex-1 py-3 bg-success-500 text-white rounded-xl font-medium text-sm btn-press active:bg-success-600 shadow-lg shadow-success-500/30">
            <div className="text-lg">✅</div>
            <div>认识</div>
            <div className="text-xs opacity-70">按键 3</div>
          </button>
        </div>
      </div>
    </div>
  )
}
