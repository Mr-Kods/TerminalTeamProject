import os
import secrets
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Загружаем .env из папки backend или из корня
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))

load_dotenv(os.path.join(BASE_DIR, '.env'))
load_dotenv(os.path.join(ROOT_DIR, '.env'))

class Config:
    _secret = os.environ.get('SECRET_KEY')
    if not _secret:
        _secret = secrets.token_hex(32)
        logger.warning("SECRET_KEY не установлен в .env, сгенерирован временный случайный ключ.")
    SECRET_KEY = _secret
    
    # Безопасность сессионных кук
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Путь к базе данных SQLite
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'database.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Ключи API
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
    OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'google/gemini-2.5-flash')