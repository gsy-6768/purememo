import React, { useState, useEffect, useRef } from 'react'

export default function SpellingMode({ word, onComplete }) {
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [showHint, setShowHint] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setInput('')
    setFeedback(null)
    setShowHint(false)
    inputRef.current?.focus()
  }, [word.word])

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus()
  }, [])

  function handleSubmit() {
    const answer = input.trim().toLowerCase()
    const correct = word.word.toLowerCase()
    if (answer === correct) {
      setFeedback('correct')
      setTimeout(() => onComplete('known'), 800)
    } else {
      setFeedback('wrong')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function handleTryAgain() {
    setInput('')
    setFeedback(null)
    setShowHint(true)
    inputRef.current?.focus()
  }

  function handleSkip() {
    onComplete('forgot')
  }

  const wordDisplay = showHint
    ? word.word.split('').map((ch, i) => i < 2 ? ch : '_').join(' ')
    : '_ '.repeat(word.word.length).trim()

  return (
    <div className="flex-1 flex flex-col px-4 max-w-lg mx-auto w-full">
      {/* 释义和音标 */}
      <div className="bg-white dark:bg-gray-800 card-shadow rounded-xl p-6 mb-4 text-center">
        <div className="text-sm text-gray-400 mb-1">{word.pos}</div>
        <div className="text-lg font-medium text-primary-600 dark:text-primary-400 mb-3">
          {word.meaning}
        </div>
        <div className="text-xs text-gray-400">
          英 /{word.phonetic_uk}/  美 /{word.phonetic_us}/
        </div>
      </div>

      {/* 例句提示 */}
      {word.example && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4 italic leading-relaxed px-2">
          "{word.example.split(' — ')[0]}"
        </div>
      )}

      {/* 输入区 */}
      <div className="bg-white dark:bg-gray-800 card-shadow rounded-xl p-6 mb-4">
        {feedback === null && (
          <>
            <div className="text-center mb-3">
              <span className="text-lg font-mono tracking-widest text-gray-500 dark:text-gray-400">
                {wordDisplay}
              </span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="在此输入单词..."
              className="w-full text-center text-xl py-3 border-b-2 border-gray-200 dark:border-gray-600 bg-transparent focus:outline-none focus:border-primary-500 dark:text-white placeholder-gray-300"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={handleSkip} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm btn-press">
                跳过
              </button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium btn-press">
                确认
              </button>
            </div>
          </>
        )}

        {feedback === 'correct' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-lg font-bold text-success-500 mb-1">拼写正确！</div>
            <div className="text-2xl font-bold">{word.word}</div>
          </div>
        )}

        {feedback === 'wrong' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">❌</div>
            <div className="text-sm text-gray-500 mb-3">正确拼写：</div>
            <div className="text-2xl font-bold text-danger-500 mb-4">{word.word}</div>
            <div className="flex gap-2">
              <button onClick={handleSkip} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm btn-press">
                跳过
              </button>
              <button onClick={handleTryAgain} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium btn-press">
                再试一次
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 提示：显示单词长度 */}
      <div className="text-center text-xs text-gray-400">
        {word.word.length} 个字母
      </div>
    </div>
  )
}
