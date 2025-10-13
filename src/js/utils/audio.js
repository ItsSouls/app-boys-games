// Funciones de audio y sonidos del juego

// Variables para controlar la reproducción de voz
let currentSpeech = null;
let isSpeaking = false;

// Función para pronunciar palabras (Text-to-Speech)
export function speakWord(word) {
  if ('speechSynthesis' in window) {
    // Prevenir múltiples llamadas simultáneas
    if (isSpeaking) {
      console.log(`⏭️ Ignorando llamada duplicada para: "${word}" (ya pronunciando)`);
      return;
    }
    
    // Validar que tenemos una palabra válida
    if (!word || typeof word !== 'string' || word.trim() === '') {
      console.log(`⚠️ Palabra inválida para pronunciar: "${word}"`);
      return;
    }
    
    // Cancelar cualquier pronunciación anterior
    speechSynthesis.cancel();
    
    // Marcar como ocupado
    isSpeaking = true;
    
    console.log(`🎯 Iniciando pronunciación: "${word}"`);
    
    // Crear nueva pronunciación
    const utterance = new SpeechSynthesisUtterance(word.trim());
    utterance.lang = 'es-ES'; // Español
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    
    // Eventos para controlar el estado
    utterance.onstart = () => {
      console.log(`🔊 Pronunciando: "${word}"`);
    };
    
    utterance.onend = () => {
      isSpeaking = false;
      currentSpeech = null;
      console.log(`✅ Pronunciación completada: "${word}"`);
    };
    
    utterance.onerror = () => {
      isSpeaking = false;
      currentSpeech = null;
      console.log(`❌ Error en pronunciación: "${word}"`);
    };
    
    // Guardar referencia y reproducir
    currentSpeech = utterance;
    speechSynthesis.speak(utterance);
    
  } else {
    console.log('Text-to-speech no disponible');
  }
}

// Función para cancelar la pronunciación actual
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    currentSpeech = null;
    isSpeaking = false;
    console.log('🔇 Pronunciación cancelada');
  }
}

// Funciones de sonido mejoradas usando Web Audio API
export function playSuccessSound() {
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const audioContext = new (AudioContext || webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(780, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1040, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }
}

export function playErrorSound() {
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const audioContext = new (AudioContext || webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }
}
