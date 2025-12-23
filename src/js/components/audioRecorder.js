// audioRecorder.js - Componente de grabación de audio
// Permite grabar audio desde el micrófono con límite de 2.5 segundos

const MAX_DURATION = 2500; // 2.5 segundos en milisegundos

/**
 * Crea un grabador de audio
 * @param {Object} options
 * @param {HTMLElement} options.container - Contenedor donde se renderiza
 * @param {Function} options.onAudioRecorded - Callback que recibe el audio en base64
 * @param {string} options.initialAudio - Audio inicial en base64 (opcional)
 * @returns {Object} API del grabador
 */
export function createAudioRecorder({ container, onAudioRecorded, initialAudio = null }) {
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingTimer = null;
  let audioBlob = null;
  let audioBase64 = initialAudio;

  const state = {
    isRecording: false,
    hasAudio: !!initialAudio,
    recordingProgress: 0
  };

  render();

  function render() {
    container.innerHTML = `
      <div class="audio-recorder">
        <div class="audio-recorder__controls">
          ${state.hasAudio ? `
            <button type="button" class="audio-recorder__btn audio-recorder__btn--play" id="audio-play-btn" title="Reproducir">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2L13 8L3 14V2Z"/>
              </svg>
            </button>
          ` : ''}

          ${!state.isRecording ? `
            <button type="button" class="audio-recorder__btn audio-recorder__btn--record" id="audio-record-btn" title="Grabar audio">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="6"/>
              </svg>
              ${state.hasAudio ? 'Regrabar' : 'Grabar'}
            </button>
          ` : `
            <button type="button" class="audio-recorder__btn audio-recorder__btn--stop" id="audio-stop-btn" title="Detener">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="4" y="4" width="8" height="8"/>
              </svg>
              Detener
            </button>
            <div class="audio-recorder__progress">
              <div class="audio-recorder__progress-bar" style="width: ${state.recordingProgress}%"></div>
            </div>
          `}

          ${state.hasAudio ? `
            <button type="button" class="audio-recorder__btn audio-recorder__btn--delete" id="audio-delete-btn" title="Eliminar audio">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M5 4V2H11V4M12 4V14H4V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          ` : ''}
        </div>

        <div class="audio-recorder__info">
          ${state.hasAudio ? '<span class="audio-recorder__status">✓ Audio grabado</span>' : '<span class="audio-recorder__hint">Máx. 2.5 segundos</span>'}
        </div>
      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    const recordBtn = container.querySelector('#audio-record-btn');
    const stopBtn = container.querySelector('#audio-stop-btn');
    const playBtn = container.querySelector('#audio-play-btn');
    const deleteBtn = container.querySelector('#audio-delete-btn');

    recordBtn?.addEventListener('click', startRecording);
    stopBtn?.addEventListener('click', stopRecording);
    playBtn?.addEventListener('click', playAudio);
    deleteBtn?.addEventListener('click', deleteAudio);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        audioBlob = blob;

        // Convertir a base64
        const reader = new FileReader();
        reader.onloadend = () => {
          audioBase64 = reader.result;
          state.hasAudio = true;
          state.isRecording = false;
          state.recordingProgress = 0;

          if (onAudioRecorded) {
            onAudioRecorded(audioBase64);
          }

          render();
        };
        reader.readAsDataURL(blob);

        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      state.isRecording = true;
      state.recordingProgress = 0;
      render();

      // Iniciar progreso
      const startTime = Date.now();
      recordingTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        state.recordingProgress = Math.min(100, (elapsed / MAX_DURATION) * 100);

        // Actualizar barra de progreso
        const progressBar = container.querySelector('.audio-recorder__progress-bar');
        if (progressBar) {
          progressBar.style.width = `${state.recordingProgress}%`;
        }

        if (elapsed >= MAX_DURATION) {
          stopRecording();
        }
      }, 50);

    } catch (error) {
      console.error('[audioRecorder] Error accessing microphone:', error);
      alert('No se pudo acceder al micrófono. Asegúrate de haber dado permisos.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && state.isRecording) {
      mediaRecorder.stop();

      if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
      }
    }
  }

  function playAudio() {
    if (audioBase64) {
      const audio = new Audio(audioBase64);
      audio.play().catch(err => {
        console.warn('[audioRecorder] Error playing audio:', err);
      });
    } else if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.play().catch(err => {
        console.warn('[audioRecorder] Error playing audio:', err);
      });
    }
  }

  function deleteAudio() {
    if (confirm('¿Eliminar el audio grabado?')) {
      audioBlob = null;
      audioBase64 = null;
      state.hasAudio = false;

      if (onAudioRecorded) {
        onAudioRecorded(null);
      }

      render();
    }
  }

  function cleanup() {
    if (recordingTimer) {
      clearInterval(recordingTimer);
    }
    if (mediaRecorder && state.isRecording) {
      mediaRecorder.stop();
    }
  }

  return {
    getAudio: () => audioBase64,
    setAudio: (base64) => {
      audioBase64 = base64;
      state.hasAudio = !!base64;
      render();
    },
    cleanup
  };
}
