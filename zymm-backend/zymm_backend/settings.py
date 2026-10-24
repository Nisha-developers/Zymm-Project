import os
from pathlib import Path
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
if not DEBUG and SECRET_KEY.startswith("dev-only"):
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY when DJANGO_DEBUG=0")
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# No login in Zymm, so no auth/sessions apps. "daphne" first makes `runserver` serve ASGI (WebSocket).
INSTALLED_APPS = ["daphne", "corsheaders", "channels", "assistant"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", "django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "zymm_backend.urls"
ASGI_APPLICATION = "zymm_backend.asgi.application"

# SQLite by default; set DB_ENGINE=mysql (and DB_* vars, plus `pip install mysqlclient`) to use MySQL.
if os.environ.get("DB_ENGINE") == "mysql":
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.mysql", "NAME": os.environ.get("DB_NAME", "zymm"),
        "USER": os.environ.get("DB_USER", "root"), "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", "127.0.0.1"), "PORT": os.environ.get("DB_PORT", "3306"),
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

# The React dev server runs on :5173. The frontend sends its anonymous id in X-Client-Id.
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
CORS_ALLOW_HEADERS = [*default_headers, "x-client-id"]

LOGGING = {"version": 1, "disable_existing_loggers": False,
           "handlers": {"console": {"class": "logging.StreamHandler"}},
           "loggers": {"assistant": {"handlers": ["console"], "level": "INFO"}}}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
