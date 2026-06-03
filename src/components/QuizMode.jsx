import React, { useState, useEffect, useMemo } from 'react'

export default function QuizMode({ word, allWords, onComplete }) {
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [shuffled, setShuffled] = useState([])

  // 生成选项：1 个正确答案 + 3 个干扰项
  useEffect(() => {
    setSelected(null)
    setFeedback(null)
    
    // 从同词库抽 3 个不同的干扰释义
    const others = allWords
      .filter(w => w.word !== word.word && w.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning)
    
    const options = [word.meaning, ...others].sort(() => Math.random() - 0.5)
    setShuffled(options)
  }, [word.word])

  function handleSelect(option) {
    if (feedback) return
    setSelected(option)
    const isCorrect = option === word.meaning
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) {
      // 正确：短暂停顿后自动继续
      setTimeout(() => onComplete('known'), 800)
    }
    // 错误：等待用户点击"下一题"按钮
  }

  function handleNext() {
    onComplete('forgot')
  }

  return (
    <div className="flex-1 flex flex-col px-4 max-w-lg mx-auto w-full">
      {/* 题目 */}
      <div className="bg-white dark:bg-gray-800 card-shadow rounded-xl p-8 mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-3xl font-bold">{word.word}</h2>
          <button onClick={(e) => { e.stopPropagation(); /* speak */ }} className="text-gray-400 hover:text-primary-500">🔊</button>
        </div>
        <div className="text-xs text-gray-400 mb-1">{word.pos}</div>
        <div className="text-xs text-gray-400">
          /{word.phonetic_uk}/  /{word.phonetic_us}/
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
        选择正确的释义
      </p>

      {/* 选项 */}
      <div className="space-y-2">
        {shuffled.map((option, i) => {
          let btnClass = 'w-full p-3.5 rounded-xl text-sm text-left border transition-all duration-200 btn-press '
          if (feedback === null) {
            btnClass += 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
          } else if (option === word.meaning) {
            btnClass += 'bg-success-50 dark:bg-success-900/20 border-success-500 text-success-700 dark:text-success-300 font-medium'
          } else if (option === selected) {
            btnClass += 'bg-danger-50 dark:bg-danger-900/20 border-danger-500 text-danger-700 dark:text-danger-300'
          } else {
            btnClass += 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 opacity-50'
          }
          return (
            <button key={i} onClick={() => handleSelect(option)} className={btnClass}>
              <span className="inline-block w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-center text-xs leading-6 mr-2 font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      {/* 反馈 */}
      {feedback === 'correct' && (
        <div className="text-center mt-4 text-success-500 font-medium text-sm">✅ 正确！</div>
      )}
      {feedback === 'wrong' && (
        <div className="text-center mt-5">
          <div className="text-danger-500 text-sm mb-3">
            ❌ 正确答案：<span className="font-semibold">{word.meaning}</span>
          </div>
          <button onClick={handleNext} className="px-8 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium btn-press shadow-lg shadow-primary-500/20">
            下一题 →
          </button>
        </div>
      )}
    </div>
  )
}
