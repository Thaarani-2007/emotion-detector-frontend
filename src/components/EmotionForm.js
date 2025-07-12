// EmotionForm.js
import React, { useState, useRef, useEffect } from 'react';
import { predictEmotion } from '../api/emotionAPI';
import './EmotionForm.css';

export default function EmotionForm() {
  const [file, setFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [result, setResult] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [animationId, setAnimationId] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      setAudioURL(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult('');
    setConfidence(null);
    setError('');

    if (!file) {
      setError("Please upload or record an audio file (WAV, MP3, or WEBM)");
      return;
    }

    try {
      const res = await predictEmotion(file);
      if (res.error) {
        setError(res.error);
      } else {
        setResult(res.emotion);
        setConfidence(res.confidence);
      }
    } catch (err) {
      setError("Failed to connect to backend: " + err.message);
    }
  };

  const startRecording = async () => {
    setError('');
    setResult('');
    setConfidence(null);
    setRecordingTime(0);
  
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("❌ Your browser doesn't support microphone access.");
        return;
      }
  
      // Clear previous file
      setFile(null);
      setAudioURL(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
      const recorder = new MediaRecorder(stream);
      const chunks = [];
  
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
  
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recorded_audio.webm', {
          type: 'audio/webm',
        });
  
        setFile(audioFile);
        setAudioURL(URL.createObjectURL(audioFile));
        cancelAnimationFrame(animationId);
        clearInterval(intervalRef.current);
      };
  
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
  
      setAudioContext(audioCtx);
      setAnalyser(analyserNode);
      setTimeout(() => {
        if (canvasRef.current) {
          drawWaveform(analyserNode);
        } else {
          console.warn("Canvas not ready for drawing.");
        }
      }, 100); // Delay for canvas to mount
  
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
  
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("🎤 Microphone access error:", err);
  
      // Detect error type and set a clear message
      if (err.name === 'NotAllowedError') {
        setError("❌ Microphone access denied by user. Please allow it in browser settings.");
      } else if (err.name === 'NotFoundError') {
        setError("⚠️ No microphone found. Please connect a mic and try again.");
      } else if (err.name === 'SecurityError') {
        setError("🔒 Microphone access is only allowed on HTTPS or localhost.");
      } else {
        setError("⚠️ Microphone access failed: " + err.message);
      }
    }
  };
  

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
    }
  };

  const drawWaveform = (analyser) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 1.5;
        ctx.fillStyle = '#38a169';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      const id = requestAnimationFrame(draw);
      setAnimationId(id);
    };

    draw();
  };

  return (
    <div className="emotion-container">
      <div className="form-card">
        <h1 className="title">🎙️ Emotion Detector</h1>

        <form onSubmit={handleSubmit} className="form-area">
          <label className="upload-label">Upload a WAV or MP3 file</label>
          <input
            type="file"
            accept="audio/wav, audio/mp3, audio/mpeg, audio/webm"
            onChange={handleFileChange}
            ref={fileInputRef}
          />

          <div className="record-controls">
            {!recording ? (
              <button type="button" className="record-button" onClick={startRecording}>
                🎤 Start Recording
              </button>
            ) : (
              <button type="button" className="record-button stop" onClick={stopRecording}>
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          {recording && (
            <>
              <div className="record-timer">{formatTime(recordingTime)}</div>
              <div className="waveform-container">
                <canvas ref={canvasRef} width="300" height="80" className="waveform-canvas"></canvas>
              </div>
            </>
          )}

          {audioURL && (
            <div className="audio-section">
              <label>Preview:</label>
              <audio controls src={audioURL} className="audio-preview" />
            </div>
          )}

          <button type="submit" className="submit-button">
            🚀 Predict Emotion
          </button>
        </form>

        {result && (
          <div className="result success">
            <p><strong>Predicted Emotion:</strong> {result}</p>
            <p><strong>Confidence:</strong> {confidence}%</p>
          </div>
        )}
        {error && (
          <div className="result error">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
} 
