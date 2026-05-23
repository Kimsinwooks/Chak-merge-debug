import sqlite3
from pathlib import Path

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "meeting_app.sqlite3"

DATA_DIR.mkdir(parents=True, exist_ok=True)

def table_exists(cur, table):
    row = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None

def add_col(cur, table, col, ddl):
    if not table_exists(cur, table):
        print(f"[SKIP] table not found: {table}")
        return

    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({table})").fetchall()]

    if col not in cols:
        print(f"[MIGRATE] add {table}.{col}")
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")
    else:
PYint("DB:", DB_PATH)")essions", "noise_filter_enabled", "INTEGER DEFAULT 1"))
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend
conda activate capstone-ui
python migrate_db_v3_stt_model_noise.py
[SKIP] table not found: meeting_sessions
[SKIP] table not found: meeting_sessions
[SKIP] table not found: meeting_sessions
[MIGRATE] done
DB: data/meeting_app.sqlite3
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged

mkdir -p workspace-ui/src/services

for f in \
  meetingReportService.js \
  roomLibraryApi.js \
  todoCalendarApi.js \
  chatApi.js \
  roomAdminApi.js \
  authApi.js \
  roomApi.js
do
  if [ -f ~/Chak_backend_ref/workspace-ui/src/services/$f ]; then
    cp ~/Chak_backend_ref/workspace-ui/src/services/$f workspace-ui/src/services/$f
    echo "copied service: $f"
  else
    echo "[MISS] service not found: $f"
  fi
done
copied service: meetingReportService.js
copied service: roomLibraryApi.js
copied service: todoCalendarApi.js
copied service: chatApi.js
copied service: roomAdminApi.js
copied service: authApi.js
copied service: roomApi.js
(capstone-ui) airlab-02@airlab-02:~/Chak_merged$ cd ~/Chak_merged

mkdir -p workspace-ui/src/components

for f in \
  STTWorkspace.jsx \
  MeetingReportView.jsx \
  CalendarView.jsx \
  RoomChat.jsx \
  TodoBoard.jsx \
  FloatingMiniAssistant.jsx \
  RoomSelector.jsx
do
  if [ -f ~/Chak_backend_ref/workspace-ui/src/components/$f ]; then
    cp ~/Chak_backend_ref/workspace-ui/src/components/$f workspace-ui/src/components/$f
    echo "copied feature component: $f"
  else
    echo "[MISS] component not found: $f"
  fi
done
copied feature component: STTWorkspace.jsx
copied feature component: MeetingReportView.jsx
copied feature component: CalendarView.jsx
copied feature component: RoomChat.jsx
copied feature component: TodoBoard.jsx
copied feature component: FloatingMiniAssistant.jsx
copied feature component: RoomSelector.jsx
(capstone-ui) airlab-02@airlab-02:~/Chak_merged$ cd ~/Chak_merged/workspace-ui/src/components

cat > KimSTTWorkspace.jsx <<'EOF'
import STTWorkspace from './STTWorkspace'

export default function KimSTTWorkspace(props) {
  return <STTWorkspace {...props} />
}
EOF

cat > KimRoomChat.jsx <<'EOF'
import RoomChat from './RoomChat'

export default function KimRoomChat(props) {
  return <RoomChat {...props} />
}
EOF

cat > KimTodoBoard.jsx <<'EOF'
import TodoBoard from './TodoBoard'

export default function KimTodoBoard(props) {
  return <TodoBoard {...props} />
}
EOF

cat > KimFloatingMiniAssistant.jsx <<'EOF'
import FloatingMiniAssistant from './FloatingMiniAssistant'

export default function KimFloatingMiniAssistant(props) {
EOFeturn <FloatingMiniAssistant {...props} />
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/workspace-ui/src/components$ cd ~/Chak_merged/workspace-ui

cat > vite.config.js <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
EOF
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/workspace-ui$ cd ~/Chak_merged/backend
nano .env
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend
conda activate capstone-ui

python -m py_compile main.py meeting_report_api.py SLM_Loader.py room_library_api.py todo_calendar_api.py chat_api.py room_admin_api.py
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend
conda activate capstone-ui

pkill -f "uvicorn main:app" || true
uvicorn main:app --reload --host 0.0.0.0 --port 8000
INFO:     Will watch for changes in these directories: ['/home/airlab-02/Chak_merged/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [32419] using StatReload
[WARN] mindmap_api import failed: No module named 'mindmap_api'
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/pyannote/audio/core/io.py:47: UserWarning:
torchcodec is not installed correctly so built-in audio decoding will fail. Solutions are:
* use audio preloaded in-memory as a {'waveform': (channel, time) torch.Tensor, 'sample_rate': int} dictionary;
* fix torchcodec installation. Error message was:

Could not load libtorchcodec. Likely causes:
          1. FFmpeg is not properly installed in your environment. We support
             versions 4, 5, 6, 7, and 8, and we attempt to load libtorchcodec
             for each of those versions. Errors for versions not installed on
             your system are expected; only the error for your installed FFmpeg
             version is relevant. On Windows, ensure you've installed the
             "full-shared" version which ships DLLs.
          2. The PyTorch version (2.11.0+cu130) is not compatible with
             this version of TorchCodec. Refer to the version compatibility
             table:
             https://github.com/pytorch/torchcodec?tab=readme-ov-file#installing-torchcodec.
          3. Another runtime dependency; see exceptions below.

        The following exceptions were raised as we tried to load libtorchcodec:

[start of libtorchcodec loading traceback]
FFmpeg version 8:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core8.so

FFmpeg version 7:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core7.so

FFmpeg version 6:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core6.so

FFmpeg version 5:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core5.so

FFmpeg version 4:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core4.so
[end of libtorchcodec loading traceback].
  warnings.warn(
[MEETING_REPORT] fixed clean router loaded: chunked qwen/gemma analysis, pyannote optional default-off
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/authlib/_joserfc_helpers.py:8: AuthlibDeprecationWarning: authlib.jose module is deprecated, please use joserfc instead.
It will be compatible before version 2.0.0.
  from authlib.jose import ECKey
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
INFO:     Started server process [32421]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
^CINFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [32421]
INFO:     Stopping reloader process [32419]
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ uvicorn main:app --reload --host 0.0.0.0 --port 8000
INFO:     Will watch for changes in these directories: ['/home/airlab-02/Chak_merged/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [32454] using StatReload
[WARN] mindmap_api import failed: No module named 'mindmap_api'
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/pyannote/audio/core/io.py:47: UserWarning:
torchcodec is not installed correctly so built-in audio decoding will fail. Solutions are:
* use audio preloaded in-memory as a {'waveform': (channel, time) torch.Tensor, 'sample_rate': int} dictionary;
* fix torchcodec installation. Error message was:

Could not load libtorchcodec. Likely causes:
          1. FFmpeg is not properly installed in your environment. We support
             versions 4, 5, 6, 7, and 8, and we attempt to load libtorchcodec
             for each of those versions. Errors for versions not installed on
             your system are expected; only the error for your installed FFmpeg
             version is relevant. On Windows, ensure you've installed the
             "full-shared" version which ships DLLs.
          2. The PyTorch version (2.11.0+cu130) is not compatible with
             this version of TorchCodec. Refer to the version compatibility
             table:
             https://github.com/pytorch/torchcodec?tab=readme-ov-file#installing-torchcodec.
          3. Another runtime dependency; see exceptions below.

        The following exceptions were raised as we tried to load libtorchcodec:

[start of libtorchcodec loading traceback]
FFmpeg version 8:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core8.so

FFmpeg version 7:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core7.so

FFmpeg version 6:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core6.so

FFmpeg version 5:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core5.so

FFmpeg version 4:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core4.so
[end of libtorchcodec loading traceback].
  warnings.warn(
[MEETING_REPORT] fixed clean router loaded: chunked qwen/gemma analysis, pyannote optional default-off
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/authlib/_joserfc_helpers.py:8: AuthlibDeprecationWarning: authlib.jose module is deprecated, please use joserfc instead.
It will be compatible before version 2.0.0.
  from authlib.jose import ECKey
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
INFO:     Started server process [32456]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     127.0.0.1:56352 - "GET /base-health HTTP/1.1" 200 OK
^CINFO:     Shutting down
INFO:     Finished server process [32456]
ERROR:    Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/uvicorn/_compat.py", line 60, in asyncio_run
    return loop.run_until_complete(main)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/asyncio/base_events.py", line 636, in run_until_complete
    self.run_forever()
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/asyncio/base_events.py", line 603, in run_forever
    self._run_once()
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/asyncio/base_events.py", line 1909, in _run_once
    handle._run()
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/asyncio/events.py", line 80, in _run
    self._context.run(self._callback, *self._args)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/uvicorn/server.py", line 78, in serve
    with self.capture_signals():
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/contextlib.py", line 142, in __exit__
    next(self.gen)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/uvicorn/server.py", line 339, in capture_signals
    signal.raise_signal(captured_signal)
KeyboardInterrupt

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/starlette/routing.py", line 645, in lifespan
    await receive()
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/uvicorn/lifespan/on.py", line 137, in receive
    return await self.receive_queue.get()
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/asyncio/queues.py", line 159, in get
    await getter
asyncio.exceptions.CancelledError

INFO:     Stopping reloader process [32454]
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ uvicorn main:app --reload --host 0.0.0.0 --port 8000
INFO:     Will watch for changes in these directories: ['/home/airlab-02/Chak_merged/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [32929] using StatReload
[WARN] mindmap_api import failed: No module named 'mindmap_api'
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/pyannote/audio/core/io.py:47: UserWarning:
torchcodec is not installed correctly so built-in audio decoding will fail. Solutions are:
* use audio preloaded in-memory as a {'waveform': (channel, time) torch.Tensor, 'sample_rate': int} dictionary;
* fix torchcodec installation. Error message was:

Could not load libtorchcodec. Likely causes:
          1. FFmpeg is not properly installed in your environment. We support
             versions 4, 5, 6, 7, and 8, and we attempt to load libtorchcodec
             for each of those versions. Errors for versions not installed on
             your system are expected; only the error for your installed FFmpeg
             version is relevant. On Windows, ensure you've installed the
             "full-shared" version which ships DLLs.
          2. The PyTorch version (2.11.0+cu130) is not compatible with
             this version of TorchCodec. Refer to the version compatibility
             table:
             https://github.com/pytorch/torchcodec?tab=readme-ov-file#installing-torchcodec.
          3. Another runtime dependency; see exceptions below.

        The following exceptions were raised as we tried to load libtorchcodec:

[start of libtorchcodec loading traceback]
FFmpeg version 8:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core8.so

FFmpeg version 7:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core7.so

FFmpeg version 6:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core6.so

FFmpeg version 5:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core5.so

FFmpeg version 4:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core4.so
[end of libtorchcodec loading traceback].
  warnings.warn(
[MEETING_REPORT] fixed clean router loaded: chunked qwen/gemma analysis, pyannote optional default-off
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/authlib/_joserfc_helpers.py:8: AuthlibDeprecationWarning: authlib.jose module is deprecated, please use joserfc instead.
It will be compatible before version 2.0.0.
  from authlib.jose import ECKey
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
INFO:     Started server process [32931]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     127.0.0.1:55486 - "GET /base-health HTTP/1.1" 200 OK
WARNING:  StatReload detected changes in 'main.py'. Reloading...
INFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [32931]
[WARN] mindmap_api import failed: No module named 'mindmap_api'
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/pyannote/audio/core/io.py:47: UserWarning:
torchcodec is not installed correctly so built-in audio decoding will fail. Solutions are:
* use audio preloaded in-memory as a {'waveform': (channel, time) torch.Tensor, 'sample_rate': int} dictionary;
* fix torchcodec installation. Error message was:

Could not load libtorchcodec. Likely causes:
          1. FFmpeg is not properly installed in your environment. We support
             versions 4, 5, 6, 7, and 8, and we attempt to load libtorchcodec
             for each of those versions. Errors for versions not installed on
             your system are expected; only the error for your installed FFmpeg
             version is relevant. On Windows, ensure you've installed the
             "full-shared" version which ships DLLs.
          2. The PyTorch version (2.11.0+cu130) is not compatible with
             this version of TorchCodec. Refer to the version compatibility
             table:
             https://github.com/pytorch/torchcodec?tab=readme-ov-file#installing-torchcodec.
          3. Another runtime dependency; see exceptions below.

        The following exceptions were raised as we tried to load libtorchcodec:

[start of libtorchcodec loading traceback]
FFmpeg version 8:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core8.so

FFmpeg version 7:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core7.so

FFmpeg version 6:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core6.so

FFmpeg version 5:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core5.so

FFmpeg version 4:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core4.so
[end of libtorchcodec loading traceback].
  warnings.warn(
[MEETING_REPORT] fixed clean router loaded: chunked qwen/gemma analysis, pyannote optional default-off
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/authlib/_joserfc_helpers.py:8: AuthlibDeprecationWarning: authlib.jose module is deprecated, please use joserfc instead.
It will be compatible before version 2.0.0.
  from authlib.jose import ECKey
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
INFO:     Started server process [33458]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
^CINFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [33458]
INFO:     Stopping reloader process [32929]
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ pkill -f "uvicorn main:app" || true
uvicorn main:app --reload --host 0.0.0.0 --port 8000
INFO:     Will watch for changes in these directories: ['/home/airlab-02/Chak_merged/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [33495] using StatReload
[WARN] mindmap_api import failed: No module named 'mindmap_api'
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/pyannote/audio/core/io.py:47: UserWarning:
torchcodec is not installed correctly so built-in audio decoding will fail. Solutions are:
* use audio preloaded in-memory as a {'waveform': (channel, time) torch.Tensor, 'sample_rate': int} dictionary;
* fix torchcodec installation. Error message was:

Could not load libtorchcodec. Likely causes:
          1. FFmpeg is not properly installed in your environment. We support
             versions 4, 5, 6, 7, and 8, and we attempt to load libtorchcodec
             for each of those versions. Errors for versions not installed on
             your system are expected; only the error for your installed FFmpeg
             version is relevant. On Windows, ensure you've installed the
             "full-shared" version which ships DLLs.
          2. The PyTorch version (2.11.0+cu130) is not compatible with
             this version of TorchCodec. Refer to the version compatibility
             table:
             https://github.com/pytorch/torchcodec?tab=readme-ov-file#installing-torchcodec.
          3. Another runtime dependency; see exceptions below.

        The following exceptions were raised as we tried to load libtorchcodec:

[start of libtorchcodec loading traceback]
FFmpeg version 8:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core8.so

FFmpeg version 7:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core7.so

FFmpeg version 6:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core6.so

FFmpeg version 5:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core5.so

FFmpeg version 4:
Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1503, in load_library
    ctypes.CDLL(path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/ctypes/__init__.py", line 374, in __init__
    self._handle = _dlopen(self._name, mode)
OSError: libnppicc.so.13: cannot open shared object file: No such file or directory

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/_internally_replaced_utils.py", line 93, in load_torchcodec_shared_libraries
    torch.ops.load_library(core_library_path)
  File "/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torch/_ops.py", line 1505, in load_library
    raise OSError(f"Could not load this library: {path}") from e
OSError: Could not load this library: /home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/torchcodec/libtorchcodec_core4.so
[end of libtorchcodec loading traceback].
  warnings.warn(
[MEETING_REPORT] fixed clean router loaded: chunked qwen/gemma analysis, pyannote optional default-off
/home/airlab-02/anaconda3/envs/capstone-ui/lib/python3.10/site-packages/authlib/_joserfc_helpers.py:8: AuthlibDeprecationWarning: authlib.jose module is deprecated, please use joserfc instead.
It will be compatible before version 2.0.0.
  from authlib.jose import ECKey
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
[FINAL_ROUTE_OVERRIDE] removed existing route: POST /ai/chat
INFO:     Started server process [33497]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
^CINFO:     Shutting down
INFO:     Waiting for application shutdown.
INFO:     Application shutdown complete.
INFO:     Finished server process [33497]
INFO:     Stopping reloader process [33495]
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend

grep -Rni "mindmap" .
./.ipynb_checkpoints/runtime_routes-checkpoint.py:1300:  "mindmapText": "[00:00~01:00] 주제 - [01:00~03:00] 주제"
./.ipynb_checkpoints/runtime_routes-checkpoint.py:1326:            "mindmapText": "[00:00~{}] 회의 전체 논의 요약".format(seconds_to_mmss(total_sec)),
./.ipynb_checkpoints/runtime_routes-checkpoint.py:1371:        "mindmapText": parsed.get("mindmapText") or " - ".join([f"[{b['start']}~{b['end']}] {b['topic']}" for b in blocks]),
./.ipynb_checkpoints/api-checkpoint.py:3:from mindmap_generator import generate_mindmap
./.ipynb_checkpoints/api-checkpoint.py:10:@app.post("/mindmap")
./.ipynb_checkpoints/api-checkpoint.py:11:def create_mindmap(data: InputText):
./.ipynb_checkpoints/api-checkpoint.py:12:    result = generate_mindmap(data.text)
./.ipynb_checkpoints/main-checkpoint.py:126:    from mindmap_api import router as mindmap_router
./.ipynb_checkpoints/main-checkpoint.py:128:    mindmap_router = None
./.ipynb_checkpoints/main-checkpoint.py:129:    print(f"[WARN] mindmap_api import failed: {e}")
./.ipynb_checkpoints/main-checkpoint.py:274:        "mindmap": mindmap_router is not None,
./.ipynb_checkpoints/main-checkpoint.py:299:if mindmap_router is not None:
./.ipynb_checkpoints/main-checkpoint.py:300:    app.include_router(mindmap_router)
./.ipynb_checkpoints/meeting_report_api-checkpoint.py:771:def build_mindmap_text(topic_blocks):
./.ipynb_checkpoints/meeting_report_api-checkpoint.py:858:        'mindmapText': final_raw.get('mindmapText') or build_mindmap_text(merged_blocks),
grep: ./__pycache__/main.cpython-310.pyc: binary file matches
grep: ./__pycache__/meeting_report_api.cpython-310.pyc: binary file matches
./api.py:31:# from mindmap_generator import generate_mindmap
./api.py:38:# @app.post("/mindmap")
./api.py:39:# def create_mindmap(data: InputText):
./api.py:40:#     result = generate_mindmap(data.text)
./requirements.txt:3:# → /stt/upload, /mindmap 같은 API 엔드포인트를 만들기 위해 사용
./main.py:126:    from mindmap_api import router as mindmap_router
./main.py:128:    mindmap_router = None
./main.py:129:    print(f"[WARN] mindmap_api import failed: {e}")
./main.py:274:        "mindmap": mindmap_router is not None,
./main.py:299:if mindmap_router is not None:
./main.py:300:    app.include_router(mindmap_router)
./meeting_report_api.py.bak_override4_canonical_report_routes:640:def build_mindmap_text(topic_blocks):
./meeting_report_api.py.bak_override4_canonical_report_routes:1179:        "mindmapText": raw.get("mindmapText") or build_mindmap_text(norm_blocks),
./meeting_report_api.py.bak_override4_canonical_report_routes:1261:  "mindmapText": "[00:00~02:00] 한 문장형 주제명 - [02:00~05:00] 한 문장형 주제명",
./meeting_report_api.py.bak_pyannote_waveform_input:640:def build_mindmap_text(topic_blocks):
./meeting_report_api.py.bak_pyannote_waveform_input:1179:        "mindmapText": raw.get("mindmapText") or build_mindmap_text(norm_blocks),
./meeting_report_api.py.bak_pyannote_waveform_input:1261:  "mindmapText": "[00:00~02:00] 한 문장형 주제명 - [02:00~05:00] 한 문장형 주제명",
./App.jsx:7:import Mindmap from './components/Mindmap'
./App.jsx:261:          {activeView === 'mindmap' && (
./App.jsx:262:            <Mindmap
./meeting_report_api.py.bak_chunked_report_fallback:640:def build_mindmap_text(topic_blocks):
./meeting_report_api.py.bak_chunked_report_fallback:1179:        "mindmapText": raw.get("mindmapText") or build_mindmap_text(norm_blocks),
./meeting_report_api.py.bak_chunked_report_fallback:1261:  "mindmapText": "[00:00~02:00] 한 문장형 주제명 - [02:00~05:00] 한 문장형 주제명",
./main.py.bak:40:    from mindmap_api import router as mindmap_router
./main.py.bak:42:    mindmap_router = None
./main.py.bak:43:    print(f"[WARN] mindmap_api import failed: {e}")
./main.py.bak:147:        "mindmap": mindmap_router is not None,
./main.py.bak:155:if mindmap_router is not None:
./main.py.bak:156:    app.include_router(mindmap_router)
./meeting_report_api.py.bak_override5_require_room:640:def build_mindmap_text(topic_blocks):
./meeting_report_api.py.bak_override5_require_room:1179:        "mindmapText": raw.get("mindmapText") or build_mindmap_text(norm_blocks),
./meeting_report_api.py.bak_override5_require_room:1261:  "mindmapText": "[00:00~02:00] 한 문장형 주제명 - [02:00~05:00] 한 문장형 주제명",
./meeting_report_api.py.bak_override5_require_room:3596:    # 5) minutes/mindmap 보정
./meeting_report_api.py.bak_override5_require_room:3603:    if not report.get("mindmapText"):
./meeting_report_api.py.bak_override5_require_room:3605:            report["mindmapText"] = build_mindmap_text(topic_blocks)
./meeting_report_api.py.bak_override5_require_room:3607:            report["mindmapText"] = " -> ".join([b.get("topic") or "" for b in topic_blocks])
./meeting_report_api.py:771:def build_mindmap_text(topic_blocks):
./meeting_report_api.py:858:        'mindmapText': final_raw.get('mindmapText') or build_mindmap_text(merged_blocks),
./main.py.bak_remove_mindmap_import:126:    from mindmap_api import router as mindmap_router
./main.py.bak_remove_mindmap_import:128:    mindmap_router = None
./main.py.bak_remove_mindmap_import:129:    print(f"[WARN] mindmap_api import failed: {e}")
./main.py.bak_remove_mindmap_import:274:        "mindmap": mindmap_router is not None,
./main.py.bak_remove_mindmap_import:299:if mindmap_router is not None:
./main.py.bak_remove_mindmap_import:300:    app.include_router(mindmap_router)
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend

cp main.py main.py.bak_remove_mindmap_$(date +%Y%m%d_%H%M%S)

python - <<'PY'
from pathlib import Path
import re

p = Path("main.py")
text = p.read_text(encoding="utf-8")
old = text

# 1) try/except로 mindmap_api import하는 블록 제거
text = re.sub(
    r'''
\ntry:\n
(?:[ \t]+.*mindmap.*\n)+
except\s+Exception\s+as\s+e:\n
(?:[ \t]+.*\n){0,5}?
[ \t]*mindmap_available\s*=\s*False\n?
''',
    '\nmindmap_available = False\n',
    text,
    flags=re.IGNORECASE | re.VERBOSE,
)

# 2) 단독 import/include 라인 제거
text = re.sub(r'^\s*from\s+mindmap_api\s+import\s+.*\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*import\s+mindmap_api\s*.*\n', '', text, flags=re.MULTILINE)
PYint("changed =", old != text)f-8") False\n"ndmap.*\)\s*\n', '', text, flags=re.MULTILINE | re.IGNORECASE)
changed = True
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ python - <<'PY'
from pathlib import Path                                 cp main.py main.py.bak_remove_mindmap_$(date +%Y%m%d_%H%M%S)

(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend
conda activate capstone-ui

python -m py_compile main.py mindmap_api.py
Sorry: IndentationError: expected an indented block after 'try' statement on line 125 (main.py, line 126)(capstone-ui) a(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend

cp ~/Chak_backend_ref/backend/main.py ./main.py
(capstone-ui) airlab-02@airlab-02:~/Chak_merged/backend$ cd ~/Chak_merged/backend

cat > mindmap_api.py <<'PY'
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/mindmap", tags=["Mindmap Disabled"])

@router.get("/health")
def mindmap_disabled_health():
    return {
        "enabled": False,
        "message": "Mindmap feature is disabled. Use To-Do and Calendar instead.",
    }

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def mindmap_disabled(path: str):
    raise HTTPException(
        status_code=410,
        detail="Mindmap feature has been removed. Use To-Do and Calendar instead.",
    )
