import React, { useState, useEffect } from 'react'
import { getSetting, setSetting } from '../db/database.js'

export default function Settings({ darkMode, toggleDark, fontSize, setFontSize }) {
  const [settings, setSettings] = useState({
    dailyNewLimit: 5000,
    dailyReviewLimit: 5000,
    autoSpeak: true,
    newOrder: 'mixed'
  })
  const [algoParams, setAlgoParams] = useState({
    initialEF: 2.5,
    efForgotPenalty: 0.2,
    efKnownBonus: 0.1,
    firstInterval: 0.167,
    secondInterval: 24,
    thirdInterval: 72,
    fourthInterval: 168,
    maxInterval: 365,
  })

  useEffect(() => {
    async function load() {
      const dailyNewLimit = await getSetting('dailyNewLimit') || '20'
      const dailyReviewLimit = await getSetting('dailyReviewLimit') || '100'
      const autoSpeak = await getSetting('autoSpeak')
      const newOrder = await getSetting('newOrder') || 'mixed'
      const ttsSpeed = parseFloat(await getSetting('ttsSpeed')) || 0.85
      setSettings({
        dailyNewLimit: parseInt(dailyNewLimit),
        dailyReviewLimit: parseInt(dailyReviewLimit),
        autoSpeak: autoSpeak !== 'false',
        newOrder,
        ttsSpeed
      })
      
      // 加载算法参数
      const ap = {}
      for (const key of ['initialEF', 'efForgotPenalty', 'efKnownBonus', 'firstInterval', 'secondInterval', 'thirdInterval', 'fourthInterval', 'maxInterval']) {
        const val = await getSetting('param_' + key)
        if (val) ap[key] = parseFloat(val)
      }
      if (Object.keys(ap).length > 0) setAlgoParams(prev => ({ ...prev, ...ap }))
    }
    load()
  }, [])

  async function updateSetting(key, value) {
    await setSetting(key, value.toString())
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="pb-20 px-4 max-w-lg mx-auto">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">⚙️ 设置</h1>
      </div>

      <div className="space-y-4">
        {/* 学习目标 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">学习目标</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">每日新学单词上限</label>
              {/* 快捷按钮 */}
              <div className="flex gap-1.5 mb-2">
                {[20, 50, 100, 200].map(n => (
                  <button key={n} onClick={() => updateSetting('dailyNewLimit', n)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium btn-press ${
                      settings.dailyNewLimit === n ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >{n} 词</button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="5" max="5000" step="5"
                  value={settings.dailyNewLimit}
                  onChange={e => updateSetting('dailyNewLimit', parseInt(e.target.value))}
                  className="flex-1 accent-primary-600" />
                <input type="number" min="5" max="5000"
                  value={settings.dailyNewLimit}
                  onChange={e => updateSetting('dailyNewLimit', Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-16 text-center font-semibold py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent dark:text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">每日复习上限</label>
              <div className="flex items-center gap-3">
                <input type="range" min="20" max="5000" step="10"
                  value={settings.dailyReviewLimit}
                  onChange={e => updateSetting('dailyReviewLimit', parseInt(e.target.value))}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-12 text-center">{settings.dailyReviewLimit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 发音 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">🔊 发音</h2>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm">自动发音</span>
            <button onClick={() => updateSetting('autoSpeak', !settings.autoSpeak)}
              className={`w-12 h-6 rounded-full transition-colors ${settings.autoSpeak ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.autoSpeak ? 'translate-x-6.5' : 'translate-x-0.5'}`}></div>
            </button>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">朗读语速</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">慢</span>
              <input type="range" min="0.3" max="1.8" step="0.1"
                value={settings.ttsSpeed || 0.85}
                onChange={e => updateSetting('ttsSpeed', parseFloat(e.target.value))}
                className="flex-1 accent-primary-600" />
              <span className="text-xs text-gray-400">快</span>
              <span className="font-semibold w-10 text-center text-xs">{settings.ttsSpeed || 0.85}x</span>
            </div>
          </div>
        </div>

        {/* 界面 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">界面</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">深色模式</span>
              <button onClick={toggleDark}
                className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6.5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">字体大小</label>
              <div className="flex gap-2">
                {[
                  { key: 'small', label: '小' },
                  { key: 'medium', label: '中' },
                  { key: 'large', label: '大' }
                ].map(opt => (
                  <button key={opt.key} onClick={() => setFontSize(opt.key)}
                    className={`flex-1 py-2 rounded-lg text-sm btn-press ${
                      fontSize === opt.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 学习顺序 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">学习顺序</h2>
          <div className="space-y-2">
            {[
              { key: 'mixed', label: '复习+新词混合' },
              { key: 'reviewFirst', label: '优先复习' },
              { key: 'newFirst', label: '先学新词' }
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-3 py-1.5">
                <input type="radio" name="order" checked={settings.newOrder === opt.key}
                  onChange={() => updateSetting('newOrder', opt.key)}
                  className="accent-primary-600" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 记忆算法 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-4">🧠 记忆算法</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-gray-500 text-xs">初始 EF（熟练度因子）</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min="1.5" max="3.0" step="0.1" value={algoParams.initialEF}
                  onChange={e => { const v = parseFloat(e.target.value); setAlgoParams(p => ({ ...p, initialEF: v })); setSetting('param_initialEF', v) }}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-10 text-center text-xs">{algoParams.initialEF.toFixed(1)}</span>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs">忘记时 EF 降低</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min="0.05" max="0.5" step="0.05" value={algoParams.efForgotPenalty}
                  onChange={e => { const v = parseFloat(e.target.value); setAlgoParams(p => ({ ...p, efForgotPenalty: v })); setSetting('param_efForgotPenalty', v) }}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-10 text-center text-xs">{algoParams.efForgotPenalty.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs">认识时 EF 增加</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min="0.05" max="0.3" step="0.05" value={algoParams.efKnownBonus}
                  onChange={e => { const v = parseFloat(e.target.value); setAlgoParams(p => ({ ...p, efKnownBonus: v })); setSetting('param_efKnownBonus', v) }}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-10 text-center text-xs">{algoParams.efKnownBonus.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs">首次间隔（小时）</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min="0.083" max="4" step="0.083" value={algoParams.firstInterval}
                  onChange={e => { const v = parseFloat(e.target.value); setAlgoParams(p => ({ ...p, firstInterval: v })); setSetting('param_firstInterval', v) }}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-12 text-center text-xs">{algoParams.firstInterval < 1 ? Math.round(algoParams.firstInterval * 60) + 'min' : algoParams.firstInterval + 'h'}</span>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs">二次间隔（小时）</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min="4" max="72" step="4" value={algoParams.secondInterval}
                  onChange={e => { const v = parseFloat(e.target.value); setAlgoParams(p => ({ ...p, secondInterval: v })); setSetting('param_secondInterval', v) }}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-12 text-center text-xs">{Math.round(algoParams.secondInterval / 24)}天</span>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs">最大间隔（天）</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min="30" max="730" step="30" value={algoParams.maxInterval}
                  onChange={e => { const v = parseInt(e.target.value); setAlgoParams(p => ({ ...p, maxInterval: v })); setSetting('param_maxInterval', v) }}
                  className="flex-1 accent-primary-600" />
                <span className="font-semibold w-12 text-center text-xs">{algoParams.maxInterval}天</span>
              </div>
            </div>
            <button onClick={async () => {
              const defaults = { initialEF: 2.5, efForgotPenalty: 0.2, efKnownBonus: 0.1, firstInterval: 0.167, secondInterval: 24, thirdInterval: 72, fourthInterval: 168, maxInterval: 365 }
              setAlgoParams(defaults)
              for (const [k, v] of Object.entries(defaults)) await setSetting('param_' + k, v)
            }} className="w-full py-2 mt-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-500 btn-press">
              恢复默认参数
            </button>
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4">
          <h2 className="font-semibold mb-2">关于</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            PureMemo v1.1.0 — 纯算法版墨墨背单词复刻<br />
            100% 离线运行 · 无广告 · 无数据收集<br />
            核心算法：改良版艾宾浩斯遗忘曲线间隔重复
          </p>
        </div>
      </div>
    </div>
  )
}
