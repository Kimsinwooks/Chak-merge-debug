import gc
import json
import math
import os
import re
import sqlite3
import subprocess
import tempfile
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from faster_whisper import WhisperModel

from session_db import read_live_transcript_text_by_session_id

try:
    from chak_runtime_api import (
        ffmpeg_to_wav_16k_mono,
        call_ollama_chat,
        maybe_web_search,
        REALTIME_SLM_MODEL,
    )
except Exception:
    ffmpeg_to_wav_16k_mono = None
    call_ollama_chat = None
    maybe_web_search = None
    REALTIME_SLM_MODEL = 'qwen2.5:3b'

try:
    import torch
except Exception:
    torch = None

try:
    import soundfile as sf
except Exception:
    sf = None

try:
    from pyannote.audio import Pipeline as PyannotePipeline
except Exception:
    PyannotePipeline = None


router = APIRouter(prefix='/meeting-report', tags=['Meeting Report'])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
DB_PATH = DATA_DIR / 'meeting_app.sqlite3'
OUTPUT_ROOT = DATA_DIR / 'meeting_outputs'

REPORT_SLM_MODEL = os.getenv('REPORT_SLM_MODEL', 'gemma3:27b')
REPORT_CHUNK_MODEL = os.getenv('REPORT_CHUNK_MODEL', REALTIME_SLM_MODEL or 'qwen2.5:3b')
DIARIZATION_MODEL = os.getenv('DIARIZATION_MODEL', 'pyannote/speaker-diarization-community-1')
DIARIZATION_DEFAULT = os.getenv('DIARIZATION_ENABLED', 'false')

STT_MODEL_CACHE = {}
DIARIZATION_PIPELINE = None
DIARIZATION_LOAD_ERROR = None

ALLOWED_STT_MODELS = {'tiny', 'base', 'small', 'medium', 'large-v3', 'large-v3-turbo'}


class AIEventCreate(BaseModel):
    question: str
    answer: str = ''
    askedAtSec: float = 0
    beforeContext: str = ''
    afterContext: str = ''


def now_iso() -> str:
    return datetime.now().isoformat()


def truthy(value) -> bool:
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'y', 'on'}


def get_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def get_row_value(row, key, default=None):
    try:
        if row is not None and key in row.keys():
            return row[key]
    except Exception:
        pass
    return default


def get_room_name_from_session(session) -> str:
    return get_row_value(session, 'room_name', 'default_room') or 'default_room'


def sanitize_path_part(value: str) -> str:
    value = (value or 'default').strip()
    value = re.sub(r'[\\/:*?"<>|]+', '_', value)
    value = re.sub(r'\s+', '_', value)
    return value[:80] or 'default'


def ensure_report_tables():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS meeting_sessions (
            id TEXT PRIMARY KEY,
            room_name TEXT DEFAULT 'default_room',
            title TEXT NOT NULL,
            meeting_time TEXT,
            keywords TEXT,
            meeting_type TEXT,
            realtime_recording_enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            stopped_at TEXT,
            status TEXT DEFAULT 'live',
            created_by TEXT
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS library_items (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            scope TEXT NOT NULL,
            bucket TEXT NOT NULL,
            kind TEXT NOT NULL,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            text_content TEXT,
            preview_line TEXT,
            created_at TEXT NOT NULL,
            room_name TEXT DEFAULT 'default_room',
            created_by TEXT
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS meeting_ai_events (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT,
            asked_at_sec REAL DEFAULT 0,
            before_context TEXT,
            after_context TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS meeting_report_cache (
            session_id TEXT PRIMARY KEY,
            report_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            room_name TEXT DEFAULT 'default_room',
            output_dir TEXT,
            final_summary_path TEXT,
            todo_json_path TEXT,
            todo_markdown_path TEXT,
            transcript_path TEXT
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS todo_items (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            assignee_type TEXT DEFAULT 'team',
            assignee_user_id TEXT,
            assignee_name TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            recommended_due_date TEXT,
            due_date TEXT,
            week_label TEXT,
            calendar_scope TEXT DEFAULT 'team',
            source_topic_id TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY,
            room_name TEXT,
            scope TEXT NOT NULL,
            owner_user_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            start_time TEXT,
            end_time TEXT,
            week_label TEXT,
            source_session_id TEXT,
            source_todo_id TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS transcript_lines (
            id TEXT PRIMARY KEY,
            room_name TEXT NOT NULL,
            session_id TEXT NOT NULL,
            start_sec REAL NOT NULL,
            end_sec REAL NOT NULL,
            speaker TEXT DEFAULT '익명1',
            speaker_id TEXT,
            text TEXT NOT NULL,
            source TEXT DEFAULT 'whisper',
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


def release_stt_models():
    STT_MODEL_CACHE.clear()
    gc.collect()
    if torch is not None:
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
        except Exception:
            pass
    print('[MEMORY] released faster-whisper cache')


def release_diarization_pipeline():
    global DIARIZATION_PIPELINE
    DIARIZATION_PIPELINE = None
    gc.collect()
    if torch is not None:
        try:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.ipc_collect()
        except Exception:
            pass
    print('[MEMORY] released pyannote diarization pipeline')


def release_all_ai_memory():
    release_stt_models()
    release_diarization_pipeline()


def parse_time_to_sec(time_text: str) -> float:
    parts = str(time_text or '').strip().split(':')
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except Exception:
        return 0.0
    return 0.0


def format_sec(sec: float) -> str:
    sec = max(0, int(float(sec or 0)))
    hh = sec // 3600
    mm = (sec % 3600) // 60
    ss = sec % 60
    if hh > 0:
        return f'{hh:02d}:{mm:02d}:{ss:02d}'
    return f'{mm:02d}:{ss:02d}'


def tokenize(text: str) -> List[str]:
    stopwords = {
        '그리고', '그래서', '근데', '일단', '이제', '그냥', '저희', '우리', '제가',
        '있는', '없는', '하면', '해서', '되는', '같은', '회의', '내용', '부분',
        '합니다', '했습니다', '같습니다', '있습니다', '없습니다', '거예요', '네', '어',
        '지금', '이거', '저거', '그거', '아까', '다음', '정도', '뭔가', '계속',
        '익명1', '익명2', '익명3', '익명4', 'the', 'and', 'for', 'with', 'this', 'that', 'you', 'are',
    }
    tokens = re.findall(r'[가-힣A-Za-z0-9_]{2,}', str(text or '').lower())
    return [t for t in tokens if t not in stopwords]


def top_keywords(text: str, k: int = 8) -> List[str]:
    return [w for w, _ in Counter(tokenize(text)).most_common(k)]


def get_selected_whisper_model(model_name: str):
    model_name = model_name or 'medium'
    if model_name not in ALLOWED_STT_MODELS:
        model_name = 'medium'
    if model_name in STT_MODEL_CACHE:
        return STT_MODEL_CACHE[model_name]
    try:
        model = WhisperModel(model_name, device='cuda', compute_type='float16')
        print(f'[STT] loaded faster-whisper on cuda: {model_name}')
    except Exception as e:
        print(f'[STT] cuda load failed, fallback cpu int8: {e}')
        model = WhisperModel(model_name, device='cpu', compute_type='int8')
        print(f'[STT] loaded faster-whisper on cpu: {model_name}')
    STT_MODEL_CACHE[model_name] = model
    return model


def safe_ffmpeg_to_wav(src_path: str, dst_path: str):
    if ffmpeg_to_wav_16k_mono is not None:
        return ffmpeg_to_wav_16k_mono(src_path, dst_path)
    cmd = ['ffmpeg', '-y', '-i', src_path, '-ac', '1', '-ar', '16000', '-vn', dst_path]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-1200:])


def get_diarization_pipeline():
    global DIARIZATION_PIPELINE, DIARIZATION_LOAD_ERROR
    if DIARIZATION_PIPELINE is not None:
        return DIARIZATION_PIPELINE
    if PyannotePipeline is None:
        DIARIZATION_LOAD_ERROR = 'pyannote.audio가 설치되어 있지 않습니다.'
        return None
    token = os.getenv('HF_TOKEN', '').strip()
    if not token:
        DIARIZATION_LOAD_ERROR = 'HF_TOKEN이 설정되어 있지 않습니다.'
        return None
    try:
        pipe = PyannotePipeline.from_pretrained(DIARIZATION_MODEL, token=token)
        if torch is not None and torch.cuda.is_available():
            try:
                pipe.to(torch.device('cuda'))
            except Exception as e:
                print(f'[DIARIZATION] cuda move failed: {e}')
        DIARIZATION_PIPELINE = pipe
        DIARIZATION_LOAD_ERROR = None
        print('[DIARIZATION] pyannote pipeline loaded')
        return DIARIZATION_PIPELINE
    except Exception as e:
        DIARIZATION_LOAD_ERROR = str(e)
        print(f'[DIARIZATION] pipeline load failed: {e}')
        return None


def load_wav_for_pyannote(wav_path: str):
    if sf is None or torch is None:
        return wav_path
    audio, sample_rate = sf.read(wav_path, dtype='float32', always_2d=True)
    return {'waveform': torch.from_numpy(audio.T), 'sample_rate': int(sample_rate)}


def run_diarization(wav_path: str, speaker_count: Optional[int] = None):
    pipe = get_diarization_pipeline()
    if pipe is None:
        return []
    kwargs = {}
    if speaker_count and speaker_count > 0:
        kwargs['num_speakers'] = int(speaker_count)
    try:
        audio_input = load_wav_for_pyannote(wav_path)
        diarization = pipe(audio_input, **kwargs)
    except TypeError:
        diarization = pipe(wav_path)
    except Exception as e:
        print(f'[DIARIZATION] run failed: {e}')
        return []
    diar_source = getattr(diarization, 'exclusive_speaker_diarization', None) or diarization
    turns, speaker_map = [], {}
    for turn, _, speaker in diar_source.itertracks(yield_label=True):
        if speaker not in speaker_map:
            speaker_map[speaker] = f'익명{len(speaker_map) + 1}'
        turns.append({'startSec': round(float(turn.start), 2), 'endSec': round(float(turn.end), 2), 'speaker': speaker_map[speaker], 'speakerId': str(speaker)})
    print(f'[DIARIZATION] turns={len(turns)} speakers={list(speaker_map.values())}')
    return turns


def overlap(a_start, a_end, b_start, b_end):
    return max(0.0, min(a_end, b_end) - max(a_start, b_start))


def assign_speakers(asr_segments, diar_turns):
    if not diar_turns:
        return asr_segments
    for seg in asr_segments:
        best_turn, best_overlap = None, 0.0
        for turn in diar_turns:
            ov = overlap(seg['startSec'], seg['endSec'], turn['startSec'], turn['endSec'])
            if ov > best_overlap:
                best_overlap, best_turn = ov, turn
        if best_turn:
            seg['speaker'] = best_turn['speaker']
            seg['speakerId'] = best_turn.get('speakerId') or best_turn['speaker']
    return asr_segments


def transcribe_audio_with_selected_model(file_path: str, model_name: str = 'medium', language: str = 'ko', diarization_enabled: Optional[bool] = None, speaker_count: Optional[int] = None) -> str:
    if diarization_enabled is None:
        diarization_enabled = truthy(DIARIZATION_DEFAULT)
    model_name = model_name if model_name in ALLOWED_STT_MODELS else 'medium'
    model = get_selected_whisper_model(model_name)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_wav:
        wav_path = tmp_wav.name
    try:
        safe_ffmpeg_to_wav(file_path, wav_path)
        segments, _info = model.transcribe(
            wav_path,
            language=language or None,
            vad_filter=True,
            beam_size=5,
            temperature=0.0,
            condition_on_previous_text=True,
            word_timestamps=False,
        )
        asr_segments = []
        for seg in segments:
            text = (seg.text or '').strip()
            if not text:
                continue
            start_sec = float(seg.start)
            end_sec = max(float(seg.end), start_sec + 0.5)
            asr_segments.append({'startSec': round(start_sec, 2), 'endSec': round(end_sec, 2), 'speaker': '익명1', 'speakerId': 'SPEAKER_1', 'text': text})
        diar_turns = run_diarization(wav_path, speaker_count) if diarization_enabled else []
        assigned = assign_speakers(asr_segments, diar_turns)
        return '\n'.join([f'[{format_sec(s["startSec"])}~{format_sec(s["endSec"])}] {s.get("speaker") or "익명1"}: {s.get("text") or ""}' for s in assigned])
    finally:
        try:
            os.remove(wav_path)
        except Exception:
            pass


def extract_transcript_lines(raw_text: str):
    lines = []
    pattern = re.compile(r'\[(?P<start>\d{1,2}:\d{2}(?::\d{2})?)\s*~\s*(?P<end>\d{1,2}:\d{2}(?::\d{2})?)\]\s*(?P<body>.*)')
    for raw_line in str(raw_text or '').splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        m = pattern.search(raw_line)
        if m:
            start_sec = parse_time_to_sec(m.group('start'))
            end_sec = parse_time_to_sec(m.group('end'))
            body = m.group('body').strip()
            speaker, text = '익명1', body
            if ':' in body:
                left, right = body.split(':', 1)
                if len(left.strip()) <= 24:
                    speaker, text = left.strip(), right.strip()
            end_sec = max(end_sec, start_sec + 1)
            lines.append({'startSec': start_sec, 'endSec': end_sec, 'start': format_sec(start_sec), 'end': format_sec(end_sec), 'speaker': speaker or '익명1', 'speakerId': speaker or '익명1', 'text': text})
        else:
            prev_end = lines[-1]['endSec'] if lines else 0
            lines.append({'startSec': prev_end, 'endSec': prev_end + 5, 'start': format_sec(prev_end), 'end': format_sec(prev_end + 5), 'speaker': '익명1', 'speakerId': '익명1', 'text': raw_line})
    return lines


def transcript_to_prompt_lines(transcript_lines):
    return '\n'.join([f'[{line["start"]}~{line["end"]}] {line.get("speaker") or "익명1"}: {line.get("text") or ""}' for line in transcript_lines])


def build_transcript_text(transcript_lines):
    return transcript_to_prompt_lines(transcript_lines)


def save_transcript_lines_to_db(session_id: str, room_name: str, transcript_lines):
    ensure_report_tables()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('DELETE FROM transcript_lines WHERE session_id = ?', (session_id,))
    now = now_iso()
    for line in transcript_lines:
        text = (line.get('text') or '').strip()
        if not text:
            continue
        speaker = line.get('speaker') or '익명1'
        speaker_id = line.get('speakerId') or line.get('speaker_id') or speaker
        source = 'pyannote_whisper' if speaker != '익명1' else 'whisper'
        cur.execute('''
            INSERT INTO transcript_lines (id, room_name, session_id, start_sec, end_sec, speaker, speaker_id, text, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), room_name, session_id, float(line.get('startSec', 0)), float(line.get('endSec', 0)), speaker, speaker_id, text, source, now))
    conn.commit()
    conn.close()


def save_session(title: str, meeting_type: str = 'uploaded_audio', room_name: str = 'default_room'):
    ensure_report_tables()
    session_id = str(uuid.uuid4())
    now = now_iso()
    conn = get_conn()
    conn.execute('''
        INSERT INTO meeting_sessions (id, title, room_name, meeting_time, keywords, meeting_type, realtime_recording_enabled, created_at, stopped_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (session_id, title, room_name, now, '', meeting_type, 0, now, now, 'stopped'))
    conn.commit()
    conn.close()
    return session_id


def save_library_item(session_id: str, bucket: str, kind: str, name: str, file_path: str, text_content: str, room_name: str = 'default_room', created_by: Optional[str] = None):
    ensure_report_tables()
    item_id = str(uuid.uuid4())
    preview = text_content.splitlines()[0][:220] if text_content else name
    conn = get_conn()
    conn.execute('''
        INSERT INTO library_items (id, session_id, scope, bucket, kind, name, file_path, text_content, preview_line, created_at, room_name, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (item_id, session_id, 'session', bucket, kind, name, file_path, text_content, preview, now_iso(), room_name, created_by))
    conn.commit()
    conn.close()
    return item_id


def read_session(session_id: str):
    conn = get_conn()
    row = conn.execute('SELECT * FROM meeting_sessions WHERE id = ?', (session_id,)).fetchone()
    conn.close()
    return row


def read_transcript_text(session_id: str):
    try:
        live_text = read_live_transcript_text_by_session_id(session_id)
        if live_text and live_text.strip():
            return live_text
    except Exception:
        pass
    conn = get_conn()
    rows = conn.execute('''
        SELECT text_content, preview_line
        FROM library_items
        WHERE session_id = ? AND bucket IN ('live_recordings', 'post_meeting_recordings')
        ORDER BY created_at ASC
    ''', (session_id,)).fetchall()
    conn.close()
    texts = []
    for r in rows:
        t = r['text_content'] or r['preview_line'] or ''
        if t.strip():
            texts.append(t.strip())
    return '\n'.join(texts)


def read_library_items_for_session(session_id: str):
    conn = get_conn()
    rows = conn.execute('''
        SELECT id, session_id, bucket, kind, name, file_path, preview_line, created_at, room_name
        FROM library_items WHERE session_id = ? ORDER BY created_at DESC
    ''', (session_id,)).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def read_ai_events(session_id: str):
    ensure_report_tables()
    conn = get_conn()
    rows = conn.execute('SELECT * FROM meeting_ai_events WHERE session_id = ? ORDER BY asked_at_sec ASC, created_at ASC', (session_id,)).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def extract_json_object(text: str):
    cleaned = (text or '').strip()
    if cleaned.startswith('```'):
        cleaned = re.sub(r'^```(?:json)?', '', cleaned).strip()
        cleaned = re.sub(r'```$', '', cleaned).strip()
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start == -1 or end == -1 or end <= start:
        raise ValueError('JSON object not found')
    return json.loads(cleaned[start:end + 1])


def ollama_json(system_prompt: str, user_prompt: str, model: str, max_chars: int = 12000, temperature: float = 0.2):
    if call_ollama_chat is None:
        raise RuntimeError('call_ollama_chat 연결 실패')
    text = call_ollama_chat(model, system_prompt, user_prompt[:max_chars])
    return extract_json_object(text)


def split_transcript_for_chunks(lines, target_sec: int = 420, max_chars: int = 5200):
    if not lines:
        return []
    chunks, current, start_sec, char_len = [], [], float(lines[0]['startSec']), 0
    for line in lines:
        line_text = f'[{line["start"]}~{line["end"]}] {line.get("speaker") or "익명1"}: {line.get("text") or ""}'
        duration = float(line['endSec']) - start_sec
        too_long = current and (duration >= target_sec or char_len + len(line_text) >= max_chars)
        if too_long:
            chunks.append(current)
            current, start_sec, char_len = [], float(line['startSec']), 0
        current.append(line)
        char_len += len(line_text) + 1
    if current:
        chunks.append(current)
    return chunks


def fallback_topic_name(text: str, idx: int) -> str:
    kws = top_keywords(text, 3)
    if kws:
        return f'{kws[0]} 중심 논의'
    return f'{idx}번째 회의 구간 정리'


def heuristic_chunk_summary(chunk, idx: int):
    text = ' '.join([x.get('text') or '' for x in chunk])
    kws = top_keywords(text, 8)
    topic = fallback_topic_name(text, idx)
    summary = ' '.join([x.get('text') or '' for x in chunk[:5]])[:420] or '해당 구간의 발화를 요약할 수 없습니다.'
    todos = []
    if any(w in text for w in ['해야', '부탁', '준비', '알려', '정리', '업로드', '공유', '제출']):
        todos.append({'title': f'{topic} 후속 작업 정리', 'description': summary[:220], 'priority': 'medium'})
    return {'topic': topic, 'summary': summary, 'keywords': kws, 'todos': todos}


def analyze_chunk_with_slm(chunk, idx: int):
    chunk_text = transcript_to_prompt_lines(chunk)
    system = '''너는 회의 STT 일부 구간을 분석하는 AI다. 반드시 JSON 하나만 출력한다. 구간의 의미를 보고 짧은 주제명, 요약, 키워드, 후속 작업을 만든다. 원문을 그대로 복붙하지 말고 의미를 압축한다.'''
    user = f'''
아래 회의 STT 구간을 분석하라.

출력 JSON schema:
{{
  "topic": "12~30자 한국어 주제명",
  "summary": "2~3문장 요약",
  "keywords": ["키워드1", "키워드2"],
  "todos": [{{"title": "후속 작업", "description": "설명", "priority": "low|medium|high"}}]
}}

[STT]
{chunk_text}
'''.strip()
    try:
        raw = ollama_json(system, user, REPORT_CHUNK_MODEL, max_chars=7000, temperature=0.1)
    except Exception as e:
        print(f'[REPORT_CHUNK] qwen chunk failed idx={idx}: {e}')
        raw = heuristic_chunk_summary(chunk, idx)
    topic = str(raw.get('topic') or fallback_topic_name(chunk_text, idx)).strip()[:40]
    summary = str(raw.get('summary') or '').strip()[:900]
    if not summary:
        summary = heuristic_chunk_summary(chunk, idx)['summary']
    keywords = raw.get('keywords') if isinstance(raw.get('keywords'), list) else top_keywords(chunk_text, 8)
    todos = raw.get('todos') if isinstance(raw.get('todos'), list) else []
    start_sec = float(chunk[0]['startSec'])
    end_sec = float(chunk[-1]['endSec'])
    return {
        'id': f'topic_{idx}',
        'topic': topic,
        'title': topic,
        'startSec': start_sec,
        'endSec': max(end_sec, start_sec + 1),
        'start': format_sec(start_sec),
        'end': format_sec(end_sec),
        'durationSec': max(1, int(end_sec - start_sec)),
        'keywords': [str(x)[:30] for x in keywords[:8]],
        'summary': summary,
        'text': chunk_text[:1800],
        'lineIndexes': [],
        'chunkTodos': todos,
    }


def normalize_week_label(value: str = '', idx: int = 1, text: str = '') -> str:
    raw = str(value or '').strip()
    source = f'{raw}\n{text or ""}'
    m = re.search(r'(\d+)\s*주\s*차?', source)
    if m:
        return f'{int(m.group(1))}주차'
    if re.search(r'이번\s*주', source):
        return '1주차'
    if re.search(r'다음\s*주', source):
        return '2주차'
    if re.search(r'다다음\s*주', source):
        return '3주차'
    if re.search(r'중간\s*발표|중간\s*점검', source):
        return '중간발표 주차'
    if re.search(r'최종\s*발표|최종\s*제출|마감', source):
        return '최종발표 주차'
    return f'{idx}주차' if idx <= 5 else ''


def normalize_todo_item(item, idx: int):
    item = item if isinstance(item, dict) else {}
    title = str(item.get('title') or f'후속 작업 {idx}').strip()
    desc = str(item.get('description') or item.get('detail') or '').strip()
    assignee = str(item.get('assigneeType') or item.get('assignee_type') or 'team').strip()
    if assignee not in {'team', 'personal'}:
        assignee = 'team'
    scope = str(item.get('calendarScope') or item.get('calendar_scope') or assignee).strip()
    if scope not in {'team', 'personal'}:
        scope = 'team'
    priority = str(item.get('priority') or 'medium').strip().lower()
    if priority not in {'low', 'medium', 'high'}:
        priority = 'medium'
    status = str(item.get('status') or 'open').strip().lower()
    if status not in {'open', 'in_progress', 'done', 'cancelled'}:
        status = 'open'
    return {
        'id': str(item.get('id') or f'todo_{idx}'),
        'title': title,
        'description': desc,
        'assigneeType': assignee,
        'assigneeUserId': item.get('assigneeUserId') or item.get('assignee_user_id') or '',
        'assigneeName': item.get('assigneeName') or item.get('assignee_name') or '',
        'priority': priority,
        'status': status,
        'recommendedDueDate': item.get('recommendedDueDate') or item.get('recommended_due_date') or '',
        'dueDate': item.get('dueDate') or item.get('due_date') or '',
        'weekLabel': normalize_week_label(item.get('weekLabel') or item.get('week_label') or '', idx, f'{title}\n{desc}'),
        'calendarScope': scope,
        'sourceTopicId': item.get('sourceTopicId') or item.get('source_topic_id') or '',
    }


def normalize_calendar_suggestion(item, idx: int):
    item = item if isinstance(item, dict) else {}
    scope = str(item.get('scope') or item.get('calendarScope') or 'team').strip()
    if scope not in {'team', 'personal'}:
        scope = 'team'
    title = str(item.get('title') or f'추천 일정 {idx}').strip()
    desc = str(item.get('description') or '').strip()
    return {
        'id': str(item.get('id') or f'calendar_suggestion_{idx}'),
        'title': title,
        'description': desc,
        'scope': scope,
        'recommendedDate': item.get('recommendedDate') or item.get('recommended_due_date') or '',
        'weekLabel': normalize_week_label(item.get('weekLabel') or item.get('week_label') or '', idx, f'{title}\n{desc}'),
        'sourceTodoId': item.get('sourceTodoId') or item.get('source_todo_id') or '',
        'reason': item.get('reason') or '회의 후속 일정으로 추천됨',
    }


def build_minutes_markdown(topic_blocks, todo_items, ai_events):
    out = ['# 회의록 정리', '', '## 1. 논의 흐름']
    for b in topic_blocks:
        out.append(f'- [{b["start"]}~{b["end"]}] **{b["topic"]}**: {b["summary"]}')
    out += ['', '## 2. To-Do']
    if todo_items:
        for t in todo_items:
            out.append(f'- [{t.get("weekLabel") or "주차 미정"}] {t.get("title")}: {t.get("description") or ""}')
    else:
        out.append('- 생성된 To-Do가 없습니다.')
    out += ['', '## 3. AI 사용 시점']
    if ai_events:
        for e in ai_events:
            out.append(f'- [{format_sec(e["asked_at_sec"])}] {e["question"]}')
    else:
        out.append('- 기록된 AI 질의가 없습니다.')
    return '\n'.join(out)


def build_mindmap_text(topic_blocks):
    return ' -> '.join([f'[{b["start"]}~{b["end"]}] {b["topic"]}' for b in topic_blocks])


def build_calendar_suggestions(todo_items):
    return [normalize_calendar_suggestion({'title': t.get('title'), 'description': t.get('description'), 'scope': t.get('calendarScope') or 'team', 'weekLabel': t.get('weekLabel'), 'sourceTodoId': t.get('id'), 'reason': '회의 To-Do 기반 추천 일정'}, i) for i, t in enumerate(todo_items[:8], start=1)]


def final_gemma_merge(session, topic_blocks, ai_events, web_context):
    summaries = '\n'.join([f'{i}. [{b["start"]}~{b["end"]}] {b["topic"]}\n요약: {b["summary"]}\n키워드: {", ".join(b.get("keywords") or [])}' for i, b in enumerate(topic_blocks, start=1)])
    ai_events_text = '\n'.join([f'[{format_sec(e["asked_at_sec"])}] Q: {e["question"]}\nA: {e["answer"]}' for e in ai_events]) or '(AI 사용 기록 없음)'
    system = '''너는 chunk별 회의 요약을 통합해 최종 회의록과 To-Do를 만드는 AI다. 반드시 JSON 하나만 출력한다. topicBlocks의 시간은 유지하되 주제명이 중복되면 더 구체적으로 바꿔라.'''
    user = f'''
회의 제목: {session['title']}

[chunk 요약]
{summaries}

[AI 사용 시점]
{ai_events_text}

[웹 참고]
{web_context or '(없음)'}

출력 JSON schema:
{{
  "topicBlocks": [{{"id":"topic_1", "topic":"구체적 주제명", "summary":"보강 요약"}}],
  "minutesMarkdown": "# 회의록 정리 ...",
  "todoItems": [{{"id":"todo_1", "title":"할 일", "description":"설명", "assigneeType":"team", "priority":"medium", "status":"open", "weekLabel":"1주차", "calendarScope":"team", "sourceTopicId":"topic_1"}}],
  "calendarSuggestions": [{{"id":"calendar_suggestion_1", "title":"일정 제목", "description":"설명", "scope":"team", "recommendedDate":"", "weekLabel":"1주차", "sourceTodoId":"todo_1", "reason":"이유"}}]
}}
'''.strip()
    try:
        raw = ollama_json(system, user, REPORT_SLM_MODEL, max_chars=11000, temperature=0.1)
        return raw
    except Exception as e:
        print(f'[REPORT_FINAL] gemma merge failed, chunk summaries used: {e}')
        return {}


def generate_slm_report(session, transcript_text, transcript_lines, ai_events):
    release_all_ai_memory()
    if not transcript_lines:
        transcript_lines = extract_transcript_lines(transcript_text)
    total_sec = max([float(x.get('endSec') or 0) for x in transcript_lines], default=0)
    chunks = split_transcript_for_chunks(transcript_lines, target_sec=int(os.getenv('REPORT_CHUNK_SEC', '420')), max_chars=int(os.getenv('REPORT_CHUNK_MAX_CHARS', '5200')))
    topic_blocks = [analyze_chunk_with_slm(chunk, idx) for idx, chunk in enumerate(chunks, start=1)]
    web_context = ''
    if maybe_web_search is not None and truthy(os.getenv('REPORT_USE_WEB', 'false')):
        try:
            web_context = maybe_web_search(f'{session["title"]} {session["keywords"]} 회의 배경', True)
        except Exception as e:
            print(f'[REPORT] web search ignored: {e}')
    release_all_ai_memory()
    final_raw = final_gemma_merge(session, topic_blocks, ai_events, web_context) if topic_blocks else {}
    final_blocks_map = {str(b.get('id') or f'topic_{i+1}'): b for i, b in enumerate(final_raw.get('topicBlocks') or []) if isinstance(b, dict)}
    merged_blocks = []
    for i, b in enumerate(topic_blocks, start=1):
        patch = final_blocks_map.get(b['id']) or {}
        if patch.get('topic'):
            b['topic'] = str(patch['topic']).strip()[:42]
            b['title'] = b['topic']
        if patch.get('summary'):
            b['summary'] = str(patch['summary']).strip()[:1000]
        merged_blocks.append(b)
    raw_todos = final_raw.get('todoItems') or []
    if not raw_todos:
        for b in merged_blocks:
            for todo in b.get('chunkTodos') or []:
                if isinstance(todo, dict):
                    todo.setdefault('sourceTopicId', b['id'])
                    raw_todos.append(todo)
        if not raw_todos:
            for b in merged_blocks[:5]:
                raw_todos.append({'title': f'{b["topic"]} 후속 작업 정리', 'description': b['summary'][:240], 'assigneeType': 'team', 'priority': 'medium', 'status': 'open', 'sourceTopicId': b['id']})
    todo_items = [normalize_todo_item(t, i) for i, t in enumerate(raw_todos[:12], start=1)]
    calendar_suggestions = [normalize_calendar_suggestion(c, i) for i, c in enumerate((final_raw.get('calendarSuggestions') or build_calendar_suggestions(todo_items))[:10], start=1)]
    room_name = get_room_name_from_session(session)
    return {
        'session': {'id': session['id'], 'title': session['title'], 'roomName': room_name, 'meetingTime': session['meeting_time'], 'keywords': session['keywords'], 'meetingType': session['meeting_type'], 'status': session['status']},
        'totalSec': int(total_sec),
        'transcriptLines': transcript_lines,
        'topicBlocks': merged_blocks,
        'topics': merged_blocks,
        'progressBars': merged_blocks,
        'aiEvents': [{'id': e['id'], 'question': e['question'], 'answer': e['answer'], 'askedAtSec': e['asked_at_sec'], 'askedAt': format_sec(e['asked_at_sec']), 'beforeContext': e['before_context'], 'afterContext': e['after_context'], 'createdAt': e['created_at']} for e in ai_events],
        'minutesMarkdown': final_raw.get('minutesMarkdown') or build_minutes_markdown(merged_blocks, todo_items, ai_events),
        'mindmapText': final_raw.get('mindmapText') or build_mindmap_text(merged_blocks),
        'todoItems': todo_items,
        'todos': todo_items,
        'calendarSuggestions': calendar_suggestions,
        'webContext': web_context,
        'analysisModel': REPORT_SLM_MODEL,
        'analysisChunkModel': REPORT_CHUNK_MODEL,
        'analysisMode': 'chunked_gemma_analysis' if final_raw else 'chunked_qwen_analysis',
        'diarizationStatus': 'not_applied',
        'diarizationNote': '화자 분리는 업로드 시 옵션이 켜진 경우에만 적용됩니다. 리포트 생성 전에는 pyannote 메모리를 해제합니다.',
    }


def report_output_dir(room_name: str, session_id: str) -> Path:
    return OUTPUT_ROOT / sanitize_path_part(room_name) / sanitize_path_part(session_id)


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content or '', encoding='utf-8')


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def build_todo_markdown(todo_items, calendar_suggestions):
    out = ['# To-Do List', '']
    if not todo_items:
        out.append('- 생성된 To-Do가 없습니다.')
    for i, todo in enumerate(todo_items, start=1):
        out += [f'## {i}. {todo.get("title")}', '', f'- 설명: {todo.get("description") or "-"}', f'- 담당 유형: {todo.get("assigneeType") or "team"}', f'- 담당자: {todo.get("assigneeName") or "-"}', f'- 우선순위: {todo.get("priority") or "medium"}', f'- 상태: {todo.get("status") or "open"}', f'- 추천 마감일: {todo.get("recommendedDueDate") or "-"}', f'- 주차: {todo.get("weekLabel") or "-"}', f'- 캘린더 범위: {todo.get("calendarScope") or "team"}', '']
    out += ['---', '', '# Calendar Suggestions', '']
    if not calendar_suggestions:
        out.append('- 추천 일정이 없습니다.')
    for i, item in enumerate(calendar_suggestions, start=1):
        out += [f'## {i}. {item.get("title")}', '', f'- 설명: {item.get("description") or "-"}', f'- 범위: {item.get("scope") or "team"}', f'- 추천 날짜: {item.get("recommendedDate") or "-"}', f'- 주차: {item.get("weekLabel") or "-"}', f'- 이유: {item.get("reason") or "-"}', '']
    return '\n'.join(out)


def save_todo_items_to_db(session_id: str, room_name: str, todo_items):
    ensure_report_tables()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('DELETE FROM todo_items WHERE session_id = ?', (session_id,))
    now = now_iso()
    for i, todo in enumerate(todo_items, start=1):
        cur.execute('''
            INSERT INTO todo_items (id, room_name, session_id, title, description, assignee_type, assignee_user_id, assignee_name, priority, status, recommended_due_date, due_date, week_label, calendar_scope, source_topic_id, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), room_name, session_id, todo.get('title') or f'후속 작업 {i}', todo.get('description') or '', todo.get('assigneeType') or 'team', todo.get('assigneeUserId') or '', todo.get('assigneeName') or '', todo.get('priority') or 'medium', todo.get('status') or 'open', todo.get('recommendedDueDate') or '', todo.get('dueDate') or '', todo.get('weekLabel') or '', todo.get('calendarScope') or 'team', todo.get('sourceTopicId') or '', None, now, now))
    conn.commit()
    conn.close()


def clear_output_library_items(session_id: str):
    conn = get_conn()
    conn.execute("DELETE FROM library_items WHERE session_id = ? AND bucket IN ('analysis_outputs', 'todo_outputs')", (session_id,))
    conn.commit()
    conn.close()


def save_report_outputs(session, report: dict):
    ensure_report_tables()
    session_id = session['id']
    room_name = get_room_name_from_session(session)
    output_dir = report_output_dir(room_name, session_id)
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / 'report.json'
    summary_path = output_dir / 'final_summary.md'
    transcript_path = output_dir / 'transcript.txt'
    progress_path = output_dir / 'progress_blocks.json'
    todo_json_path = output_dir / 'todo_list.json'
    todo_md_path = output_dir / 'todo_list.md'
    transcript_text = build_transcript_text(report.get('transcriptLines') or [])
    todo_payload = {'session': report.get('session'), 'todoItems': report.get('todoItems') or [], 'calendarSuggestions': report.get('calendarSuggestions') or []}
    write_json(report_path, report)
    write_text(summary_path, report.get('minutesMarkdown') or '')
    write_text(transcript_path, transcript_text)
    write_json(progress_path, report.get('topicBlocks') or [])
    write_json(todo_json_path, todo_payload)
    write_text(todo_md_path, build_todo_markdown(report.get('todoItems') or [], report.get('calendarSuggestions') or []))
    clear_output_library_items(session_id)
    save_library_item(session_id, 'analysis_outputs', 'meeting_report_json', 'report.json', str(report_path), json.dumps(report, ensure_ascii=False)[:5000], room_name)
    save_library_item(session_id, 'analysis_outputs', 'meeting_summary_markdown', 'final_summary.md', str(summary_path), report.get('minutesMarkdown') or '', room_name)
    save_library_item(session_id, 'analysis_outputs', 'progress_blocks_json', 'progress_blocks.json', str(progress_path), json.dumps(report.get('topicBlocks') or [], ensure_ascii=False)[:5000], room_name)
    save_library_item(session_id, 'todo_outputs', 'todo_list_json', 'todo_list.json', str(todo_json_path), json.dumps(todo_payload, ensure_ascii=False)[:5000], room_name)
    save_library_item(session_id, 'todo_outputs', 'todo_list_markdown', 'todo_list.md', str(todo_md_path), todo_md_path.read_text(encoding='utf-8'), room_name)
    save_todo_items_to_db(session_id, room_name, report.get('todoItems') or [])
    return {'outputDir': str(output_dir), 'reportPath': str(report_path), 'finalSummaryPath': str(summary_path), 'transcriptPath': str(transcript_path), 'progressBlocksPath': str(progress_path), 'todoJsonPath': str(todo_json_path), 'todoMarkdownPath': str(todo_md_path)}


def cache_report(session_id: str, report: dict, output_info: Optional[dict] = None):
    ensure_report_tables()
    output_info = output_info or {}
    room_name = report.get('session', {}).get('roomName') or 'default_room'
    now = now_iso()
    conn = get_conn()
    conn.execute('''
        INSERT INTO meeting_report_cache (session_id, report_json, created_at, updated_at, room_name, output_dir, final_summary_path, todo_json_path, todo_markdown_path, transcript_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET report_json=excluded.report_json, updated_at=excluded.updated_at, room_name=excluded.room_name, output_dir=excluded.output_dir, final_summary_path=excluded.final_summary_path, todo_json_path=excluded.todo_json_path, todo_markdown_path=excluded.todo_markdown_path, transcript_path=excluded.transcript_path
    ''', (session_id, json.dumps(report, ensure_ascii=False), now, now, room_name, output_info.get('outputDir'), output_info.get('finalSummaryPath'), output_info.get('todoJsonPath'), output_info.get('todoMarkdownPath'), output_info.get('transcriptPath')))
    conn.commit()
    conn.close()


def read_cached_report(session_id: str):
    ensure_report_tables()
    conn = get_conn()
    row = conn.execute('SELECT report_json FROM meeting_report_cache WHERE session_id = ?', (session_id,)).fetchone()
    conn.close()
    if not row:
        return None
    try:
        return json.loads(row['report_json'])
    except Exception:
        return None


@router.post('/upload-audio')
async def upload_audio_for_report(file: UploadFile = File(...), stt_model: str = Form('medium'), language: str = Form('ko'), room_name: str = Form(''), analyze_after: str = Form('0'), diarization_enabled: str = Form('0'), speaker_count: str = Form('')):
    ensure_report_tables()
    normalized_room = str(room_name or '').strip()
    if not normalized_room or normalized_room == 'default_room':
        raise HTTPException(status_code=400, detail='room_name이 필요합니다. 특정 룸에 입장한 뒤 STT 파일을 업로드하세요.')
    allowed = {'.wav', '.mp3', '.m4a', '.webm', '.mp4', '.aac', '.ogg', '.flac', '.wma', '.wmv'}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail='음성/영상 파일만 업로드할 수 있습니다.')
    stt_model = stt_model if stt_model in ALLOWED_STT_MODELS else 'medium'
    session_id = save_session(title=f'{Path(file.filename).stem} ({stt_model})', meeting_type='uploaded_audio', room_name=normalized_room)
    upload_dir = DATA_DIR / 'uploaded_audio' / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    dst = upload_dir / file.filename
    with open(dst, 'wb') as f:
        f.write(await file.read())
    try:
        spk_count = int(speaker_count) if str(speaker_count).strip() else None
    except Exception:
        spk_count = None
    diar_enabled = truthy(diarization_enabled)
    try:
        transcript = transcribe_audio_with_selected_model(str(dst), stt_model, language or 'ko', diar_enabled, spk_count)
    except Exception as e:
        release_all_ai_memory()
        raise HTTPException(status_code=500, detail=f'ST 변환 실패: {str(e)}')
    finally:
        release_all_ai_memory()
    save_library_item(session_id, 'post_meeting_recordings', f'uploaded_audio_transcript_{stt_model}', file.filename, str(dst), transcript, normalized_room)
    transcript_lines = extract_transcript_lines(transcript)
    save_transcript_lines_to_db(session_id, normalized_room, transcript_lines)
    speakers = []
    for line in transcript_lines:
        speaker = line.get('speaker') or '익명1'
        if speaker not in speakers:
            speakers.append(speaker)
    should_analyze = truthy(analyze_after)
    report = None
    if should_analyze:
        session = read_session(session_id)
        ai_events = read_ai_events(session_id)
        report = generate_slm_report(session, transcript, transcript_lines, ai_events)
        report['sttModel'] = stt_model
        report['language'] = language or 'ko'
        report['diarizationStatus'] = 'applied' if len(speakers) > 1 else ('fallback_single_speaker' if diar_enabled else 'not_applied')
        report['diarizationSpeakers'] = speakers
        output_info = save_report_outputs(session, report)
        report['outputInfo'] = output_info
        cache_report(session_id, report, output_info)
    if diar_enabled and len(speakers) > 1:
        status, note = 'applied', f'화자 분리 적용됨: {", ".join(speakers)}'
    elif diar_enabled:
        status, note = 'fallback_single_speaker', f'화자 분리를 시도했지만 단일 화자로 저장되었습니다. {DIARIZATION_LOAD_ERROR or ""}'
    else:
        status, note = 'not_applied', '화자 분리 옵션이 꺼져 있어 익명1 기준으로 저장했습니다.'
    return {'sessionId': session_id, 'filename': file.filename, 'sttModel': stt_model, 'language': language or 'ko', 'roomName': normalized_room, 'transcriptPreview': transcript[:800], 'report': report, 'analysisDeferred': not should_analyze, 'diarizationStatus': status, 'diarizationSpeakers': speakers, 'diarizationNote': note, 'message': 'STT 변환 완료. 분석 화면에서 Gemma 회의 분석을 별도로 생성합니다.' if not should_analyze else 'STT 변환 및 Gemma 분석 완료.'}


@router.post('/{session_id}/ai-event')
def create_ai_event(session_id: str, payload: AIEventCreate):
    ensure_report_tables()
    if not read_session(session_id):
        raise HTTPException(status_code=404, detail='세션을 찾을 수 없습니다.')
    conn = get_conn()
    event_id = str(uuid.uuid4())
    conn.execute('''
        INSERT INTO meeting_ai_events (id, session_id, question, answer, asked_at_sec, before_context, after_context, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (event_id, session_id, payload.question, payload.answer, payload.askedAtSec, payload.beforeContext, payload.afterContext, now_iso()))
    conn.commit()
    conn.close()
    return {'id': event_id, 'sessionId': session_id, 'askedAtSec': payload.askedAtSec}


@router.get('/{session_id}/items')
def get_session_items(session_id: str):
    ensure_report_tables()
    if not read_session(session_id):
        raise HTTPException(status_code=404, detail='세션을 찾을 수 없습니다.')
    return {'items': read_library_items_for_session(session_id)}


@router.get('/{session_id}/transcript')
def get_meeting_transcript(session_id: str):
    ensure_report_tables()
    if not read_session(session_id):
        raise HTTPException(status_code=404, detail='세션을 찾을 수 없습니다.')
    conn = get_conn()
    rows = conn.execute('SELECT * FROM transcript_lines WHERE session_id = ? ORDER BY start_sec ASC, end_sec ASC', (session_id,)).fetchall()
    conn.close()
    if rows:
        lines, speakers = [], []
        for r in rows:
            speaker = r['speaker'] or '익명1'
            if speaker not in speakers:
                speakers.append(speaker)
            lines.append({'startSec': r['start_sec'], 'endSec': r['end_sec'], 'start': format_sec(r['start_sec']), 'end': format_sec(r['end_sec']), 'speaker': speaker, 'speakerId': r['speaker_id'], 'text': r['text']})
        diar_applied = len([s for s in speakers if s.startswith('익명')]) > 1
        return {'sessionId': session_id, 'transcriptText': build_transcript_text(lines), 'transcriptLines': lines, 'speakers': speakers, 'diarizationStatus': 'applied' if diar_applied else 'fallback_single_speaker', 'diarizationNote': f'화자 분리 적용됨: {", ".join(speakers)}' if diar_applied else '현재 저장된 STT는 단일 화자 또는 fallback 결과입니다.'}
    text = read_transcript_text(session_id)
    lines = extract_transcript_lines(text)
    session = read_session(session_id)
    if session:
        save_transcript_lines_to_db(session_id, get_room_name_from_session(session), lines)
    speakers = []
    for line in lines:
        speaker = line.get('speaker') or '익명1'
        if speaker not in speakers:
            speakers.append(speaker)
    return {'sessionId': session_id, 'transcriptText': text, 'transcriptLines': lines, 'speakers': speakers or ['익명1'], 'diarizationStatus': 'fallback_single_speaker', 'diarizationNote': '저장된 transcript_lines가 없어 기존 STT 텍스트를 기준으로 복원했습니다.'}


@router.post('/{session_id}/regenerate')
def regenerate_meeting_report(session_id: str):
    ensure_report_tables()
    release_all_ai_memory()
    session = read_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='세션을 찾을 수 없습니다.')
    transcript = read_transcript_text(session_id)
    lines = extract_transcript_lines(transcript)
    if not lines:
        raise HTTPException(status_code=400, detail='분석할 STT transcript가 없습니다.')
    room_name = get_room_name_from_session(session)
    save_transcript_lines_to_db(session_id, room_name, lines)
    ai_events = read_ai_events(session_id)
    report = generate_slm_report(session, transcript, lines, ai_events)
    output_info = save_report_outputs(session, report)
    report['outputInfo'] = output_info
    cache_report(session_id, report, output_info)
    return report


@router.get('/{session_id}')
def get_meeting_report(session_id: str):
    ensure_report_tables()
    release_all_ai_memory()
    session = read_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail='세션을 찾을 수 없습니다.')
    cached = read_cached_report(session_id)
    if cached and cached.get('analysisMode') in {'chunked_gemma_analysis', 'chunked_qwen_analysis'}:
        return cached
    return regenerate_meeting_report(session_id)


print('[MEETING_REPORT] fixed clean router loaded: chunked qwen/gemma analysis, pyannote optional default-off')
