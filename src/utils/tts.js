/**
 * Web Speech API TTS 发音工具
 */
export function speakWord(word, accent = 'us') {
  if (!window.speechSynthesis) return;
  
  window.speechSynthesis.cancel(); // 取消之前的发音
  
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent === 'us' ? 'en-US' : 'en-GB';
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // 尝试选择合适的语音
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    accent === 'us' ? v.lang.startsWith('en-US') : v.lang.startsWith('en-GB')
  );
  if (preferredVoice) utterance.voice = preferredVoice;
  
  window.speechSynthesis.speak(utterance);
}
