import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { getSetting } from '../db/database.js';

/**
 * TTS 发音工具
 * - speakWord(text, accent): 单词发音
 * - speakSentence(text): 句子发音（使用用户的语速偏好）
 */

async function getSpeed() {
  const s = await getSetting('ttsSpeed')
  return parseFloat(s) || 0.85
}

// 缓存 voices
let cachedVoices = []
function getVoices() {
  if (cachedVoices.length) return Promise.resolve(cachedVoices)
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) { cachedVoices = voices; resolve(voices) }
    else { window.speechSynthesis.onvoiceschanged = () => { cachedVoices = window.speechSynthesis.getVoices(); resolve(cachedVoices) } }
  })
}

export async function speakWord(word, accent = 'us') {
  const lang = accent === 'us' ? 'en-US' : 'en-GB'
  const rate = await getSpeed()

  if (Capacitor.isNativePlatform()) {
    try {
      const { supported } = await TextToSpeech.isLanguageSupported({ lang })
      if (!supported) { TextToSpeech.openInstall(); return }
      await TextToSpeech.speak({ text: word, lang, rate, pitch: 1.0, volume: 1.0 })
    } catch (e) { console.error('TTS error:', e) }
    return
  }

  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = 1
  utterance.volume = 1
  const voices = await getVoices()
  const preferred = voices.find(v => v.lang.startsWith(lang))
  if (preferred) utterance.voice = preferred
  window.speechSynthesis.speak(utterance)
}

/**
 * 朗读句子
 */
export async function speakSentence(text) {
  if (!text) return
  // 提取英文部分（去掉中文翻译）
  const en = text.includes(' — ') ? text.split(' — ')[0].trim() : text
  await speakWord(en, 'us')
}
