import React, { useState, useEffect } from 'react'
import { getAllDailyStats, getWordsByPlan, getAllPlans, getReviewForecast, exportAllData, importAllData, clearAllData } from '../db/database.js'
import { calculateCurrentMemoryStrength, getMasteryLevel } from '../algorithms/spaced-repetition.js'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ReviewCalendar from './ReviewCalendar.jsx'

export default function Statistics() {
  const [dailyStats, setDailyStats] = useState([])
  const [plans, setPlans] = useState([])
  const [masteryData, setMasteryData] = useState({ unlearned: 0, learning: 0, mastered: 0, forgotten: 0 })
  const [tab, setTab] = useState('daily')
  const [forecast, setForecast] = useState({})

  useEffect(() => {
    async function load() {
      const stats = await getAllDailyStats()
      setDailyStats(stats.sort((a, b) => a.date.localeCompare(b.date)).slice(-30))
      
      const p = await getAllPlans()
      setPlans(p)
      
      // 统计掌握程度
      let unlearned = 0, learning = 0, mastered = 0, forgotten = 0
      for (const plan of p) {
        const words = await getWordsByPlan(plan.id)
        for (const w of words) {
          const level = getMasteryLevel(w)
          if (level === 'unlearned') unlearned++
          else if (level === 'learning') learning++
          else if (level === 'mastered') mastered++
          else forgotten++
        }
      }
      setMasteryData({ unlearned, learning, mastered, forgotten })
      
      // 复习预测（取第一个计划或全部）
      const targetPlan = p[0]
      if (targetPlan) {
        const f = await getReviewForecast(targetPlan.id, 90)
        setForecast(f)
      }
    }
    load()
  }, [])

  async function handleExport() {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `PureMemo_backup_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        await importAllData(data)
        alert('数据恢复成功！请刷新页面')
        window.location.reload()
      } catch { alert('文件格式错误') }
    }
    input.click()
  }

  async function handleClearData() {
    if (!confirm('确定清除所有数据？此操作不可恢复！')) return
    if (!confirm('再次确认：所有学习记录将被永久删除！')) return
    await clearAllData()
    alert('数据已清除')
    window.location.reload()
  }

  const total = masteryData.unlearned + masteryData.learning + masteryData.mastered + masteryData.forgotten
  const masteredPct = total > 0 ? Math.round((masteryData.mastered / total) * 100) : 0

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">📊 数据统计</h1>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'calendar', label: '📅 日历' },
          { key: 'daily', label: '每日学习' },
          { key: 'mastery', label: '掌握程度' },
          { key: 'data', label: '数据管理' }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium btn-press ${
              tab === t.key ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'calendar' && (
        <ReviewCalendar forecast={forecast} />
      )}

      {tab === 'daily' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
            <h2 className="font-semibold mb-4">最近 30 天学习趋势</h2>
            {dailyStats.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无学习记录，开始学习吧！</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reviewed" name="复习" stroke="#4F46E5" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="newLearned" name="新学" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {dailyStats.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
              <h2 className="font-semibold mb-4">正确率趋势</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyStats.map(d => ({ ...d, accuracy: d.reviewed > 0 ? Math.round((d.correct / d.reviewed) * 100) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="accuracy" name="正确率" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab === 'mastery' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">单词掌握分布</h2>
          {total === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无单词数据</p>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={[
                      { name: '未学习', value: masteryData.unlearned, color: '#9ca3af' },
                      { name: '学习中', value: masteryData.learning, color: '#f59e0b' },
                      { name: '已掌握', value: masteryData.mastered, color: '#22c55e' },
                      { name: '已遗忘', value: masteryData.forgotten, color: '#f87171' },
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      dataKey="value" paddingAngle={2}>
                      {['#9ca3af', '#f59e0b', '#22c55e', '#f87171'].map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-gray-400"></span><span className="flex-1 text-gray-500">未学习</span><span>{masteryData.unlearned}</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-warning-500"></span><span className="flex-1 text-gray-500">学习中</span><span>{masteryData.learning}</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-success-500"></span><span className="flex-1 text-gray-500">已掌握</span><span>{masteryData.mastered}</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-danger-400"></span><span className="flex-1 text-gray-500">已遗忘</span><span>{masteryData.forgotten}</span></div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
            <h2 className="font-semibold mb-3">备份与恢复</h2>
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium btn-press">
                📤 导出备份
              </button>
              <button onClick={handleImport} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium btn-press">
                📥 恢复备份
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
            <h2 className="font-semibold mb-3 text-danger-500">危险操作</h2>
            <button onClick={handleClearData} className="w-full py-2.5 border border-danger-300 text-danger-500 rounded-lg text-sm font-medium btn-press">
              🗑 清除所有数据
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
