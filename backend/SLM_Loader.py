import os
import requests

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

load_dotenv('.env')

router = APIRouter()

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')
OLLAMA_GENERATE_URL = f'{OLLAMA_BASE_URL}/api/generate'
OLLAMA_CHAT_URL = f'{OLLAMA_BASE_URL}/api/chat'
OLLAMA_TAGS_URL = f'{OLLAMA_BASE_URL}/api/tags'

QWEN_MODEL_NAME = os.getenv('QWEN_OLLAMA_MODEL_NAME', 'qwen2.5:3b')
GEMMA_MODEL_NAME = os.getenv('GEMMA_MODEL_NAME', 'gemma3:27b')


class PromptRequest(BaseModel):
    prompt: str
    model_name: str = Field(default='qwen', description='qwen 또는 gemma 또는 Ollama 모델명')
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.9


class ChatPromptRequest(BaseModel):
    system_prompt: str = ''
    user_prompt: str
    model_name: str = Field(default='qwen', description='qwen 또는 gemma 또는 Ollama 모델명')
    max_new_tokens: int = 512
    temperature: float = 0.2
    top_p: float = 0.9
    format_json: bool = False


def build_prompt(user_text: str) -> str:
    return (
        '당신은 한국어로 답변하는 로컬 SLM이다.\n'
        '사용자의 질문에 간결하고 정확하게 답변하라.\n'
        '회의, 채팅, STT 내용이 주어지면 핵심 요약, 결정사항, 할 일, 리스크를 구조화하라.\n\n'
        f'사용자: {user_text}\n'
        '어시스턴트:'
    )


def check_ollama_server() -> None:
    try:
        res = requests.get(OLLAMA_BASE_URL, timeout=5)
        res.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            f'Ollama 서버에 연결할 수 없습니다: {OLLAMA_BASE_URL}\n'
            '터미널에서 `ollama serve`를 실행하세요.'
        )
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f'Ollama 서버 확인 실패: {str(e)}')


def get_ollama_model_names() -> list[str]:
    check_ollama_server()
    try:
        res = requests.get(OLLAMA_TAGS_URL, timeout=10)
        res.raise_for_status()
        data = res.json()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f'Ollama 모델 목록 조회 실패: {str(e)}')
    return [m.get('name') for m in data.get('models', []) if m.get('name')]


def assert_ollama_model_exists(model_name: str) -> None:
    model_names = get_ollama_model_names()
    if model_name not in model_names:
        raise RuntimeError(
            f'Ollama에 모델이 없습니다: {model_name}\n'
            f'현재 설치된 모델: {model_names}\n'
            f'필요하면 `ollama pull {model_name}`를 실행하세요.'
        )


def resolve_model_name(model_name: str | None) -> str:
    normalized = (model_name or 'qwen').lower().strip()
    if normalized in {'qwen', 'qwen2.5', 'qwen2.5-3b', 'qwen2.5:3b', 'general', 'default', 'realtime', 'live'}:
        return QWEN_MODEL_NAME
    if normalized in {'gemma', 'gemma3', 'gemma3:27b', 'report', 'analysis', 'meeting_report'}:
        return GEMMA_MODEL_NAME
    return model_name.strip()


def _ollama_options(max_new_tokens: int, temperature: float, top_p: float) -> dict:
    return {
        'num_predict': int(max_new_tokens or 256),
        'temperature': float(temperature if temperature is not None else 0.7),
        'top_p': float(top_p if top_p is not None else 0.9),
        'repeat_penalty': 1.1,
    }


def generate_ollama_response(
    user_text: str,
    model_name: str = 'qwen',
    max_new_tokens: int = 256,
    temperature: float = 0.7,
    top_p: float = 0.9,
) -> str:
    resolved_model_name = resolve_model_name(model_name)
    assert_ollama_model_exists(resolved_model_name)
    payload = {
        'model': resolved_model_name,
        'prompt': build_prompt(user_text),
        'stream': False,
        'options': _ollama_options(max_new_tokens, temperature, top_p),
    }
    try:
        res = requests.post(OLLAMA_GENERATE_URL, json=payload, timeout=600)
        res.raise_for_status()
    except requests.exceptions.Timeout:
        raise RuntimeError(f'Ollama 응답 시간이 초과되었습니다. model={resolved_model_name}')
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f'Ollama HTTP 오류: {str(e)} / 응답 내용: {res.text}\n사용 모델: {resolved_model_name}')
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f'Ollama 호출 실패: {str(e)}')
    data = res.json()
    answer = data.get('response', '').strip()
    if not answer:
        raise RuntimeError(f'Ollama 응답이 비어 있습니다: {data}')
    return answer


def generate_ollama_chat_response(
    system_prompt: str,
    user_prompt: str,
    model_name: str = 'qwen',
    max_new_tokens: int = 512,
    temperature: float = 0.2,
    top_p: float = 0.9,
    format_json: bool = False,
) -> str:
    resolved_model_name = resolve_model_name(model_name)
    assert_ollama_model_exists(resolved_model_name)
    messages = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.append({'role': 'user', 'content': user_prompt})
    payload = {
        'model': resolved_model_name,
        'messages': messages,
        'stream': False,
        'options': _ollama_options(max_new_tokens, temperature, top_p),
    }
    if format_json:
        payload['format'] = 'json'
    try:
        res = requests.post(OLLAMA_CHAT_URL, json=payload, timeout=900)
        res.raise_for_status()
    except requests.exceptions.Timeout:
        raise RuntimeError(f'Ollama chat 응답 시간이 초과되었습니다. model={resolved_model_name}')
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f'Ollama chat HTTP 오류: {str(e)} / 응답 내용: {res.text}\n사용 모델: {resolved_model_name}')
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f'Ollama chat 호출 실패: {str(e)}')
    data = res.json()
    answer = (data.get('message') or {}).get('content', '').strip()
    if not answer:
        answer = data.get('response', '').strip()
    if not answer:
        raise RuntimeError(f'Ollama chat 응답이 비어 있습니다: {data}')
    return answer


class FakeTensor:
    def __init__(self, text: str):
        self.text = text
    def to(self, *args, **kwargs):
        return self


class OllamaBatchEncoding(dict):
    def __init__(self, text: str):
        super().__init__()
        self['input_text'] = FakeTensor(text)
    def to(self, *args, **kwargs):
        return self


class OllamaTokenizerCompat:
    pad_token = '<pad>'
    eos_token = ''
    pad_token_id = 0
    eos_token_id = 0
    def __call__(self, text, *args, **kwargs):
        if isinstance(text, list):
            text = '\n'.join([str(x) for x in text])
        return OllamaBatchEncoding(str(text))
    def decode(self, output, skip_special_tokens=True, *args, **kwargs):
        if isinstance(output, FakeTensor):
            return output.text
        return str(output)


class OllamaQwenCompat:
    backend = 'ollama'
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.device = 'ollama'
    def eval(self):
        return self
    def to(self, *args, **kwargs):
        return self
    def parameters(self):
        return iter([])
    def generate(self, *args, **kwargs):
        input_text_obj = kwargs.get('input_text')
        prompt = input_text_obj.text if isinstance(input_text_obj, FakeTensor) else str(input_text_obj or '')
        max_new_tokens = int(kwargs.get('max_new_tokens', 256) or 256)
        temperature = float(kwargs.get('temperature', 0.7) or 0.7)
        top_p = float(kwargs.get('top_p', 0.9) or 0.9)
        answer = generate_ollama_response(prompt, 'qwen', max_new_tokens, temperature, top_p)
        return [FakeTensor(f'어시스턴트: {answer}')]


_QWEN_COMPAT_MODEL = OllamaQwenCompat(QWEN_MODEL_NAME)
_QWEN_COMPAT_TOKENIZER = OllamaTokenizerCompat()


def load_qwen():
    return _QWEN_COMPAT_MODEL, _QWEN_COMPAT_TOKENIZER


def generate_slm_response(user_text: str, max_new_tokens: int = 256, temperature: float = 0.7, top_p: float = 0.9) -> str:
    return generate_ollama_response(user_text, 'qwen', max_new_tokens, temperature, top_p)


def generate_qwen_response(user_text: str, max_new_tokens: int = 256, temperature: float = 0.7, top_p: float = 0.9) -> str:
    return generate_slm_response(user_text, max_new_tokens, temperature, top_p)


def generate_gemma_response(user_text: str, max_new_tokens: int = 256, temperature: float = 0.7, top_p: float = 0.9) -> str:
    return generate_ollama_response(user_text, 'gemma', max_new_tokens, temperature, top_p)


def generate_response_by_model(user_text: str, model_name: str = 'qwen', max_new_tokens: int = 256, temperature: float = 0.7, top_p: float = 0.9) -> str:
    normalized = (model_name or 'qwen').lower().strip()
    if normalized in {'qwen', 'qwen2.5', 'qwen2.5-3b', 'qwen2.5:3b', 'general', 'default', 'realtime', 'live'}:
        return generate_slm_response(user_text, max_new_tokens, temperature, top_p)
    if normalized in {'gemma', 'gemma3', 'gemma3:27b', 'report', 'analysis', 'meeting_report'}:
        return generate_gemma_response(user_text, max_new_tokens, temperature, top_p)
    return generate_ollama_response(user_text, model_name, max_new_tokens, temperature, top_p)


@router.get('/slm/health')
def slm_health():
    try:
        model_names = get_ollama_model_names()
        return {
            'ok': True,
            'ollamaBaseUrl': OLLAMA_BASE_URL,
            'availableModels': model_names,
            'qwen': {'alias': 'qwen', 'modelName': QWEN_MODEL_NAME, 'exists': QWEN_MODEL_NAME in model_names, 'backend': 'ollama'},
            'gemma': {'alias': 'gemma', 'modelName': GEMMA_MODEL_NAME, 'exists': GEMMA_MODEL_NAME in model_names, 'backend': 'ollama'},
            'compat': {'load_qwenReturns': 'model, tokenizer', 'tokenizerReturns': 'OllamaBatchEncoding', 'supportsInputsToDevice': True, 'supportsDictComprehensionToDevice': True, 'supportsModelGenerate': True},
        }
    except Exception as e:
        return {'ok': False, 'ollamaBaseUrl': OLLAMA_BASE_URL, 'error': str(e)}


@router.post('/slm/generate')
def api_generate_text(req: PromptRequest):
    try:
        response = generate_response_by_model(req.prompt, req.model_name, req.max_new_tokens, req.temperature, req.top_p)
        return {'prompt': req.prompt, 'model_name': req.model_name, 'resolved_model_name': resolve_model_name(req.model_name), 'response': response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLM 생성 실패: {str(e)}')


@router.post('/slm/chat')
def api_generate_chat(req: ChatPromptRequest):
    try:
        response = generate_ollama_chat_response(req.system_prompt, req.user_prompt, req.model_name, req.max_new_tokens, req.temperature, req.top_p, req.format_json)
        return {'model_name': req.model_name, 'resolved_model_name': resolve_model_name(req.model_name), 'response': response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLM chat 생성 실패: {str(e)}')
