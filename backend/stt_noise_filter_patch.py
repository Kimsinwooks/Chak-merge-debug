from pathlib import Path

p = Path("chak_runtime_api.py")
text = p.read_text(encoding="utf-8")

if "def ffmpeg_to_wav_16k_mono_denoise" not in text:
    insert = r'''

def ffmpeg_to_wav_16k_mono_denoise(src_path: str, dst_path: str):
    """
    실시간 STT용 노이즈 필터.
    highpass + lowpass + afftdn + dynaudnorm 적용.
    """
    import subprocess

    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(src_path),
        "-ac", "1",
        "-ar", "16000",
        "-vn",
        "-af",
        "highpass=f=120,lowpass=f=7800,afftdn=nf=-25,dynaudnorm=f=150:g=15",
        str(dst_path),
    ]

    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr[-1200:])
'''
    # import들 다음에 붙이는 대신 파일 끝에 붙여도 함수 정의는 가능
    text += insert

p.write_text(text, encoding="utf-8")
print("denoise function ensured")
