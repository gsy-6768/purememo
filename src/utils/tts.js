import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

/**
 * TTS 发音工具 - 自动选择平台实现
 * - Android (Capacitor): 原生 TextToSpeech 引擎
 * - Web/PWA: Web Speech API 降级
 */
export async function speakWord(word, accent = 'us') {
  const lang = accent === 'us' ? 'en-US' : 'en-GB';

  // Capacitor 原生平台 (Android)
  if (Capacitor.isNativePlatform()) {
    try {
      // 检查语言是否可用，不可用则打开安装引导
      const { supported } = await TextToSpeech.isLanguageSupported({ lang });
      if (!supported) {
        TextToSpeech.openInstall();
        return;
      }
      await TextToSpeech.speak({
        text: word,
        lang,
        rate: 0.85,
        pitch: 1.0,
        volume: 1.0,
      });
    } catch (e) {
      console.error('TTS error:', e);
    }
    return;
  }

  // Web/PWA 降级：Web Speech API
  if (!window.speechSynthesis) return;
  
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = lang;
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith(lang));
  if (preferredVoice) utterance.voice = preferredVoice;
  
  window.speechSynthesis.speak(utterance);
}
