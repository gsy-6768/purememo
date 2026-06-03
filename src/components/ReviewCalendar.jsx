import React, { useState, useEffect } from 'react'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const days = lastDay.getDate()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
}

export default function ReviewCalendar({ forecast }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const today = now.toISOString().slice(0, 10)
  const cells = getMonthData(year, month)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  // Find max reviews in this month for color scaling
  let maxReviews = 0
  cells.forEach(d => {
    if (d) {
      const key = `${monthKey}-${String(d).padStart(2, '0')}`
      maxReviews = Math.max(maxReviews, forecast[key] || 0)
    }
  })

  function getColor(count) {
    if (count === 0) return ''
    const ratio = maxReviews > 0 ? count / maxReviews : 0
    if (ratio > 0.7) return 'bg-red-400 dark:bg-red-500'
    if (ratio > 0.4) return 'bg-orange-400 dark:bg-orange-500'
    if (ratio > 0.15) return 'bg-blue-400 dark:bg-blue-500'
    return 'bg-blue-300 dark:bg-blue-600'
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600 btn-press">‹</button>
        <h2 className="font-semibold">{year} 年 {month + 1} 月</h2>
        <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600 btn-press">›</button>
      </div>

      {/* 星期头 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-xs text-gray-400 py-1">{w}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="aspect-square" />
          
          const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`
          const count = forecast[dateKey] || 0
          const isToday = dateKey === today
          const isFuture = dateKey > today

          return (
            <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg relative ${isToday ? 'ring-2 ring-primary-500' : ''} ${isFuture ? '' : 'opacity-60'}`}>
              <span className={`text-xs font-medium ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {day}
              </span>
              {count > 0 && (
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getColor(count)}`} />
              )}
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-gray-500 dark:text-gray-400">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-400">
        <span>少</span>
        <div className="w-2.5 h-2.5 rounded-full bg-blue-300 dark:bg-blue-600" />
        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 dark:bg-blue-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-orange-400 dark:bg-orange-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500" />
        <span>多</span>
      </div>
    </div>
  )
}
