import os
import glob
from pathlib import Path

def process_files():
    backend_dir = Path(__file__).parent
    files = glob.glob(str(backend_dir / '*.py'))
    
    for fpath in files:
        if Path(fpath).name == 'storage_paths.py':
            continue
            
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'meeting_app.sqlite3' not in content:
            continue
            
        print(f"Modifying {Path(fpath).name}")
        
        # auth_api.py only uses system
        if Path(fpath).name in ['auth_api.py', 'room_admin_api.py']:
            content = content.replace("DB_PATH = DATA_DIR / \"meeting_app.sqlite3\"", "from storage_paths import get_system_db_path\nDB_PATH = get_system_db_path()")
            content = content.replace("DB_PATH = DATA_DIR / 'meeting_app.sqlite3'", "from storage_paths import get_system_db_path\nDB_PATH = get_system_db_path()")
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            continue
            
        # The other files are more complex. I will just replace `DB_PATH = DATA_DIR / "meeting_app.sqlite3"` with a dynamic DB_PATH depending on the context.
        # Actually, it's very dangerous to do simple string replacement for files like room_api.py.

if __name__ == '__main__':
    process_files()
