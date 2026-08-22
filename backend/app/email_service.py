import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr

try:
    from config import Config
except ImportError:
    from ..config import Config

logger = logging.getLogger(__name__)

def send_password_reset_email(to_email: str, code: str) -> bool:
    """
    Отправляет email с 6-значным кодом подтверждения для сброса пароля.
    Если параметры SMTP не заданы в .env, логирует код в консоль и возвращает True (режим разработки).
    """
    smtp_server = Config.SMTP_SERVER
    smtp_port = Config.SMTP_PORT
    smtp_user = Config.SMTP_USER
    smtp_password = Config.SMTP_PASSWORD
    smtp_use_ssl = Config.SMTP_USE_SSL
    smtp_use_tls = Config.SMTP_USE_TLS
    sender_name = Config.SMTP_SENDER_NAME

    # Режим разработки (если SMTP не настроен)
    if not smtp_server or not smtp_user or not smtp_password:
        logger.info(f"[DEV SMTP FALLBACK] Код восстановления для {to_email}: {code}")
        print(f"\n=======================================================")
        print(f"[DEV EMAIL SIMULATOR] Получатель: {to_email}")
        print(f"[КОД ПОДТВЕРЖДЕНИЯ]: {code} (действителен 10 минут)")
        print(f"[ИНФО] Для реальной отправки укажите SMTP_SERVER, SMTP_USER, SMTP_PASSWORD в .env")
        print(f"=======================================================\n")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = Header('Код подтверждения для сброса пароля', 'utf-8')
        msg['From'] = formataddr((str(Header(sender_name, 'utf-8')), smtp_user))
        msg['To'] = to_email

        # Текстовая версия
        text_content = f"""
Здравствуйте!

Вы запросили восстановление пароля в сервисе «Найди профессию по интересам в Калининградской области».

Ваш код подтверждения: {code}

Код действителен в течение 10 минут. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

С уважением,
Команда Terminal Team
"""

        # Брендированная HTML-версия
        html_content = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f7f9;
      color: #1a1a1a;
      margin: 0;
      padding: 30px 15px;
    }}
    .email-card {{
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      padding: 40px 32px;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.06);
      border: 1px solid #ebebf0;
    }}
    .email-brand {{
      font-size: 22px;
      font-weight: 800;
      color: #000000;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }}
    .email-brand-sub {{
      font-size: 13px;
      color: #666666;
      margin-bottom: 28px;
    }}
    .email-title {{
      font-size: 18px;
      font-weight: 600;
      color: #111111;
      margin-bottom: 12px;
    }}
    .email-text {{
      font-size: 14.5px;
      line-height: 1.5;
      color: #444444;
      margin-bottom: 24px;
    }}
    .code-box {{
      background: #f1f2f6;
      border: 1.5px dashed #000000;
      border-radius: 16px;
      padding: 18px 24px;
      text-align: center;
      margin: 28px 0;
    }}
    .code-digits {{
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 9px;
      color: #000000;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      margin-left: 9px;
    }}
    .code-note {{
      font-size: 12.5px;
      color: #777777;
      margin-top: 8px;
    }}
    .security-notice {{
      font-size: 12px;
      line-height: 1.45;
      color: #888888;
      background: #fafafa;
      border-left: 3px solid #cbff3b;
      padding: 10px 14px;
      border-radius: 6px;
      margin-top: 24px;
    }}
    .email-footer {{
      margin-top: 32px;
      padding-top: 18px;
      border-top: 1px solid #eeeeee;
      font-size: 12px;
      color: #999999;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-brand">Найди профессию</div>
    <div class="email-brand-sub">по интересам в Калининградской области</div>

    <div class="email-title">Восстановление доступа к аккаунту</div>
    <div class="email-text">
      Мы получили запрос на сброс пароля для вашей учётной записи. Введите этот 6-значный код на сайте:
    </div>

    <div class="code-box">
      <div class="code-digits">{code}</div>
      <div class="code-note">Код действителен в течение 10 минут</div>
    </div>

    <div class="security-notice">
      🔒 <strong>Безопасность:</strong> Если вы не запрашивали восстановление пароля, не беспокойтесь — ваш аккаунт в безопасности. Просто проигнорируйте данное сообщение.
    </div>

    <div class="email-footer">
      © 2026 Terminal Team • Калининградская область
    </div>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        if smtp_use_ssl or smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=12)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=12)
            if smtp_use_tls or smtp_port == 587:
                server.starttls()

        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, [to_email], msg.as_string())
        server.quit()

        logger.info(f"[SUCCESS] Email с кодом восстановления отправлен на {to_email} через {smtp_server}:{smtp_port}")
        return True

    except Exception as e:
        logger.error(f"[ERROR] Ошибка отправки email на {to_email} через SMTP: {e}")
        # Логируем код для разработчика в случае сбоя внешнего сервера
        print(f"\n[FALLBACK КОД ДЛЯ {to_email}]: {code} (из-за ошибки SMTP: {e})\n")
        return False
