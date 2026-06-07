import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import SpellingMode from './SpellingMode.jsx'
import QuizMode from './QuizMode.jsx'
import FillBlankMode from './FillBlankMode.jsx'
import { getWordsByPlan, getWeakWords, saveWord, getSetting, getPlan, accumulateDailyStat } from '../db/database.js'
import { calculateNextReview, getTodayNewCount, calculateCurrentMemoryStrength } from '../algorithms/spaced-repetition.js'
import { getWordWeakness } from '../db/database.js'
import { speakWord, speakSentence } from '../utils/tts.js'

export default function StudyView() {
  const { planId } = useParams()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'flip'
  const weakMode = searchParams.get('weak') === '1'
  const navigate = useNavigate()
  
  const [plan, setPlan] = useState(null)
  const [currentWord, setCurrentWord] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, hazy: 0, forgot: 0, newLearned: 0 })
  const [masteredCount, setMasteredCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [loading, setLoading] = useState(true)
  const [cardKey, setCardKey] = useState(0)
  const queueRef = useRef([])
  const statsRef = useRef({ reviewed: 0, correct: 0, hazy: 0, forgot: 0, newLearned: 0 })

  useEffect(() => {
    async function init() {
      const p = await getPlan(planId)
      setPlan(p)
      
      const autoS = await getSetting('autoSpeak')
      setAutoSpeak(autoS !== 'false')
      
      const allWords = weakMode
        ? await getWeakWords(planId)
        : await getWordsByPlan(planId)
      if (!allWords.length) { navigate('/'); return }
      
      const now = Date.now()
      // 分离复习和新词
      const dueWords = allWords.filter(w => w.nextReviewTime && w.nextReviewTime <= now && !w.isPaused)
      const newWords = allWords.filter(w => !w.nextReviewTime && !w.isPaused)
      
      // 新词数量限制
      const todayNew = await getSetting('dailyNewLimit')
      const dailyNewLimit = todayNew ? parseInt(todayNew) : 20
      const dailyReviewLimit = parseInt(await getSetting('dailyReviewLimit')) || 100
      
      const alreadyLearned = allWords.filter(w => w.learnedDate && w.learnedDate >= new Date().setHours(0,0,0,0))
      const canLearnNew = Math.max(0, dailyNewLimit - alreadyLearned.length)
      // 新词先打乱再截取，确保每次都是随机顺序
      const shuffledNewWords = [...newWords].sort(() => Math.random() - 0.5)
      const availableNew = shuffledNewWords.slice(0, canLearnNew)
      
      // 复习限制
      const limitedDue = dueWords.slice(0, dailyReviewLimit)
      
      const finalList = [...limitedDue, ...availableNew]
      
      queueRef.current = finalList.map(w => ({ word: w, requiredKnown: 1 }))
      setCurrentWord(queueRef.current[0]?.word || null)
      setTotalCount(finalList.length)
      setMasteredCount(0)
      setLoading(false)
      
      if (finalList.length === 0) {
        navigate('/')
      }
    }
    init()
  }, [planId])

  const handleFeedback = useCallback(async (rating) => {
    const item = queueRef.current[0]
    if (!item) return
    const { word } = item
    
    const updated = calculateNextReview(word, rating)
    const now = Date.now()
    
    const newWord = { ...word, ...updated }
    if (!newWord.learnedDate) newWord.learnedDate = now
    await saveWord(newWord)
    item.word = newWord // 更新队列中的引用，确保后续识别为已复习
    
    const isNew = !word.nextReviewTime
    let mastered = false
    
    if (rating === 'known') {
      item.requiredKnown -= 1
      if (item.requiredKnown <= 0) {
        mastered = true
      }
    } else if (rating === 'hazy') {
      item.requiredKnown = 2
    } else { // forgot
      item.requiredKnown = 3
    }
    
    queueRef.current.shift() // 移出当前词
    
    accumulateDailyStat(planId, rating, isNew).catch(e => console.error('stat error:', e))
    
    if (mastered) {
      setMasteredCount(m => m + 1)
      setCardKey(k => k + 1)
      setSessionStats(prev => {
        const next = { ...prev, reviewed: prev.reviewed + 1, newLearned: isNew ? prev.newLearned + 1 : prev.newLearned, correct: rating === 'known' ? prev.correct + 1 : prev.correct, hazy: rating === 'hazy' ? prev.hazy + 1 : prev.hazy, forgot: rating === 'forgot' ? prev.forgot + 1 : prev.forgot }
        statsRef.current = next
        return next
      })
    } else {
      // === 智能间隔放置 ===
      // requiredKnown 越高 → 间隔越大
      // 剩余词数越多 → 前移（保证足够间隔）
      const spacingRatio = item.requiredKnown >= 3 ? 0.50 : item.requiredKnown >= 2 ? 0.40 : 0.25
      const queueLen = queueRef.current.length
      const insertPos = Math.min(queueLen, Math.max(4, Math.floor(queueLen * spacingRatio)))
      queueRef.current.splice(insertPos, 0, item)
      setCardKey(k => k + 1)
      setSessionStats(prev => {
        const next = { ...prev, reviewed: prev.reviewed + 1, correct: rating === 'known' ? prev.correct + 1 : prev.correct, hazy: rating === 'hazy' ? prev.hazy + 1 : prev.hazy, forgot: rating === 'forgot' ? prev.forgot + 1 : prev.forgot }
        statsRef.current = next
        return next
      })
    }
    
    setFlipped(false)
    
    if (queueRef.current.length === 0) {
      navigate(`/complete/${planId}`, { state: { stats: statsRef.current } })
    } else {
      setCurrentWord(queueRef.current[0].word)
    }
  }, [planId, navigate])

  // 键盘快捷键（仅翻卡模式）
  useEffect(() => {
    if (mode !== 'flip') return
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
      if (flipped && e.key === '1') handleFeedback('forgot')
      if (flipped && e.key === '2') handleFeedback('hazy')
      if (flipped && e.key === '3') handleFeedback('known')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, handleFeedback, mode])

  // 自动发音
  useEffect(() => {
    if (currentWord && autoSpeak && !flipped) {
      speakWord(currentWord.word)
    }
  }, [currentWord, autoSpeak, flipped])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 animate-pulse">准备学习中...</p>
    </div>
  )

  const current = currentWord
  if (!current) return null

  const progress = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* 顶部信息 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg">✕</button>
        <span className="text-sm text-gray-400">{plan?.name}</span>
        <span className="text-sm text-gray-500">{masteredCount}/{totalCount}</span>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
        <div className="bg-primary-500 h-1.5 rounded-full progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {/* 内容区：根据模式渲染 */}
      {mode === 'flip' ? (
        <>
      {/* 翻卡模式 */}
      <div className="flex-1 flex items-center justify-center" onClick={() => !flipped && setFlipped(true)}>
        <div key={cardKey} className="w-full max-w-sm aspect-[3/4] perspective cursor-pointer">
          <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
            {/* 正面：单词 */}
            <div className="card-face bg-white dark:bg-gray-800 card-shadow flex flex-col items-center justify-center p-8">
              <h2 className="text-3xl font-bold mb-3 text-center">{current.word}</h2>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-gray-400">/{current.phonetic_uk}/  /{current.phonetic_us}/</span>
                <button onClick={(e) => { e.stopPropagation(); speakWord(current.word, 'us') }} className="text-gray-400 hover:text-primary-500 text-lg" title="发音">🔊</button>
              </div>
              <p className="text-xs text-gray-300 mt-6">点击卡片或按空格键翻转</p>
            </div>

            {/* 背面：释义 + 丰富内容 */}
            <div className="card-face card-back bg-white dark:bg-gray-800 card-shadow flex flex-col p-6 overflow-y-auto">
              {/* 单词和释义 */}
              <div className="text-center mb-3 shrink-0">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{current.word}</h2>
                  <button onClick={(e) => { e.stopPropagation(); speakWord(current.word, 'us') }} className="text-gray-400 hover:text-primary-500">🔊</button>
                </div>
                <div className="text-base text-primary-600 dark:text-primary-400 font-medium">
                  {current.meaning}
                </div>
              </div>

              {/* 易错标记 */}
              {(() => {
                const w = getWordWeakness(current)
                if (!w.weak) return null
                const colors = { severe: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', mild: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }
                return <div className={`text-center text-xs py-1 px-3 rounded-lg mb-2 ${colors[w.level] || colors.warning}`}>📉 易错词 — {w.reason}</div>
              })()}

              <div className="space-y-3 text-sm">
                {/* 常考搭配 */}
                {current.collocations && current.collocations.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">📎 常考搭配</div>
                    <div className="flex flex-col gap-1.5">
                      {current.collocations.map((c, i) => {
                        // 支持 "en — cn" 格式
                        const hasCn = c.includes(' — ')
                        const en = hasCn ? c.split(' — ')[0] : c
                        const cn = hasCn ? c.split(' — ')[1] : ''
                        return (
                          <div key={i} className="flex items-baseline gap-2 px-2.5 py-1.5 bg-white dark:bg-gray-700 rounded text-xs border border-blue-100 dark:border-blue-800">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{en}</span>
                            {cn && <span className="text-gray-500 dark:text-gray-400">— {cn}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 词根词缀 */}
                {current.root && (current.root.root || current.root.prefix) && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">🌱 词根词缀</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      {current.root.prefix && current.root.prefix.root && (
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-300">{current.root.prefix.root}</span>
                          <span className="text-gray-500"> — {current.root.prefix.meaning}</span>
                        </div>
                      )}
                      {current.root.root && (
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-300">{current.root.root.root}</span>
                          <span className="text-gray-500"> — {current.root.root.meaning}</span>
                          <div className="text-gray-400">来源: {current.root.root.origin}</div>
                        </div>
                      )}
                      {current.root.root && current.root.root.related && current.root.root.related.length > 0 && (
                        <div className="text-gray-500 mt-1">
                          同根词: {current.root.root.related.join(' · ')}
                        </div>
                      )}
                      {current.root.suffix && current.root.suffix.root && (
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-300">{current.root.suffix.root}</span>
                          <span className="text-gray-500"> — {current.root.suffix.meaning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 助记 */}
                {current.mnemonic && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">💡 助记</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{current.mnemonic}</div>
                  </div>
                )}

                {/* 近/反义词 */}
                {(current.synonyms?.length > 0 || current.antonyms?.length > 0) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">🔄 同义/反义</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {current.synonyms?.length > 0 && (
                        <div>同义: {current.synonyms.slice(0,5).join(' · ')}</div>
                      )}
                      {current.antonyms?.length > 0 && (
                        <div>反义: {current.antonyms.join(' · ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 例句 */}
                {current.example && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">📖 例句</div>
                      <button onClick={(e) => { e.stopPropagation(); speakSentence(current.example) }}
                        className="text-gray-400 hover:text-primary-500 text-xs btn-press">🔊</button>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">
                      "{current.example.split(' — ')[0]}"
                    </div>
                    {current.example.includes(' — ') && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                        {current.example.split(' — ')[1]}
                      </div>
                    )}
                  </div>
                )}

                {/* 额外例句 */}
                {current.extraExamples && current.extraExamples.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">更多例句</div>
                    {current.extraExamples.map((ex, i) => (
                      <div key={i} className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed mb-1 last:mb-0">
                        "{ex}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
      <div className="text-center text-xs text-gray-400 mt-2">点击卡片空白区翻转</div>
        </>
      ) : mode === 'spell' ? (
        <SpellingMode word={current} onComplete={handleFeedback} />
      ) : mode === 'quiz' ? (
        <QuizMode word={current} allWords={queueRef.current.map(i => i.word)} onComplete={handleFeedback} />
      ) : mode === 'fill' ? (
        <FillBlankMode word={current} onComplete={handleFeedback} />
      ) : null}
    </div>
  )
}
