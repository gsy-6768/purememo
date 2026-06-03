import React, { useState, useEffect, useRef } from 'react'

export default function FillBlankMode({ word, onComplete }) {
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const inputRef = useRef(null)

  // 从例句中提取填空句
  const fillSentence = word.example
    ? word.example.split(' — ')[0].replace(
        new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        '________'
      )
    : ''

  useEffect(() => {
    setInput('')
    setFeedback(null)
    setShowHint(false)
    inputRef.current?.focus()
  }, [word.word])

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

  return (
    <div className="flex-1 flex flex-col px-4 max-w-lg mx-auto w-full">
      {/* 例句填空 */}
      <div className="bg-white dark:bg-gray-800 card-shadow rounded-xl p-6 mb-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">📖 填入缺失的单词</div>
        <div className="text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-2">
          {fillSentence || '(暂无例句)'}
        </div>
        {word.example?.includes(' — ') && (
          <div className="text-xs text-gray-400 mt-1">
            {word.example.split(' — ')[1]}
          </div>
        )}
      </div>

      {/* 提示区 */}
      <div className="bg-white dark:bg-gray-800 card-shadow rounded-xl p-6 mb-4">
        <div className="text-center mb-3">
          <span className="text-sm text-gray-400">词性：{word.pos}  |  字母数：{word.word.length}</span>
          {showHint && (
            <div className="mt-2 text-lg font-mono tracking-widest text-primary-500">
              首字母：{word.word[0]}
            </div>
          )}
        </div>

        {feedback === null && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="填入单词..."
              className="w-full text-center text-xl py-3 border-b-2 border-gray-200 dark:border-gray-600 bg-transparent focus:outline-none focus:border-primary-500 dark:text-white placeholder-gray-300"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowHint(true)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm btn-press">
                💡 提示
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
            <div className="text-lg font-bold text-success-500">正确！</div>
          </div>
        )}

        {feedback === 'wrong' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">❌</div>
            <div className="text-lg font-bold text-danger-500 mb-1">{word.word}</div>
            <div className="text-sm text-gray-500 mb-3">{word.meaning}</div>
            <button onClick={() => { setInput(''); setFeedback(null) }} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm btn-press">
              再试一次
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
