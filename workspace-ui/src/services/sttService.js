//const BASE_URL = 'http://127.0.0.1:8000';    기존코드(신우)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';


export async function uploadTranscription(file, finalModelName) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('final_model_name', finalModelName);

  const response = await fetch(`${BASE_URL}/stt/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'STT 업로드 실패');
  }

  const data = await response.json();
  console.log('uploadTranscription response:', data);
  return data;
}

export async function fetchTranscriptionSessions() {
  const response = await fetch(`${BASE_URL}/stt/sessions`);
  if (!response.ok) throw new Error('세션 목록 조회 실패');
  return await response.json();
}

export async function fetchTranscriptionDetail(sessionId) {
  const response = await fetch(`${BASE_URL}/stt/sessions/${sessionId}`);
  if (!response.ok) throw new Error('세션 상세 조회 실패');
  return await response.json();
}

export async function startRealtimeMeeting(channelName, realtimeModelName, finalModelName) {
  const formData = new FormData();
  formData.append('channel_name', channelName);
  formData.append('realtime_model_name', realtimeModelName);
  formData.append('final_model_name', finalModelName);

  const response = await fetch(`${BASE_URL}/stt/realtime/start`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '실시간 회의 시작 실패');
  }

  return await response.json();
}

export async function uploadRealtimeChunk(sessionId, blob, offsetSec) {
  const formData = new FormData();
  formData.append('session_id', String(sessionId));
  formData.append('offset_sec', String(offsetSec));
  formData.append('file', blob, `chunk_${Date.now()}.webm`);

  const response = await fetch(`${BASE_URL}/stt/realtime/chunk`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '실시간 chunk 업로드 실패');
  }

  return await response.json();
}

export async function stopRealtimeMeeting(sessionId) {
  const formData = new FormData();
  formData.append('session_id', String(sessionId));

  const response = await fetch(`${BASE_URL}/stt/realtime/stop`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '실시간 회의 종료 실패');
  }

  return await response.json();
  
}