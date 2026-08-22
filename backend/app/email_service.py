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

        # Формируем индивидуальные карточки для каждой цифры
        digits_html = "".join([
            f'<span style="display: inline-block; width: 44px; height: 54px; line-height: 54px; text-align: center; background-color: #ffffff; border: 1.5px solid #000000; border-radius: 12px; font-size: 28px; font-weight: 800; color: #000000; margin: 0 3px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.04); vertical-align: middle;">{d}</span>'
            for d in code
        ])

        # Брендированная HTML-версия
        html_content = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Код восстановления пароля</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f6; color: #18181b; margin: 0; padding: 36px 16px; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 28px; border: 1px solid #e4e4e7; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06); overflow: hidden;">
    <tr>
      <td style="padding: 40px 36px 36px 36px;">
        
        <!-- Шапка сервиса с фирменным стилем -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
          <tr>
            <td>
              <div style="font-size: 24px; font-weight: 800; color: #000000; letter-spacing: -0.6px; line-height: 1.2;">
                Найди профессию
              </div>
              <div style="font-size: 13.5px; color: #52525b; margin-top: 5px;">
                по интересам в <span style="background-color: #cbff3b; color: #000000; font-weight: 700; padding: 2px 7px; border-radius: 5px; display: inline-block;">Калининградской области</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Разделитель -->
        <div style="height: 1px; background-color: #f4f4f5; margin-bottom: 26px;"></div>

        <!-- Заголовок и пояснение -->
        <div style="font-size: 18px; font-weight: 700; color: #09090b; margin-bottom: 10px;">
          Восстановление доступа к аккаунту
        </div>
        <div style="font-size: 14.5px; line-height: 1.55; color: #3f3f46; margin-bottom: 26px;">
          Вы запросили сброс пароля. Для подтверждения вашей личности и установки нового пароля введите этот 6-значный код на сайте:
        </div>

        <!-- Блок с кодом подтверждения в виде отдельных плашек -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto; text-align: center;">
          <tr>
            <td align="center" style="background-color: #f8f8fa; border-radius: 18px; padding: 24px 16px; border: 1px solid #ededf2;">
              <div style="white-space: nowrap;">
                {digits_html}
              </div>
              <div style="font-size: 12.5px; color: #71717a; margin-top: 14px; font-weight: 500;">
                ⏱ Код действителен в течение <strong>10 минут</strong>
              </div>
            </td>
          </tr>
        </table>

        <!-- Предупреждение о безопасности -->
        <div style="background-color: #fafafa; border-left: 4px solid #cbff3b; border-radius: 8px; padding: 12px 16px; font-size: 12.5px; line-height: 1.5; color: #52525b; margin-bottom: 28px;">
          🔒 <strong>Безопасность:</strong> Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо — ваш аккаунт остаётся под надёжной защитой.
        </div>

        <!-- Подвал карточки -->
        <div style="border-top: 1px solid #f4f4f5; padding-top: 20px; font-size: 11.5px; line-height: 1.45; color: #a1a1aa; text-align: center;">
          <div style="font-weight: 600; color: #71717a; margin-bottom: 4px;">
            Terminal Team • Калининградская область
          </div>
          <div>
            © Министерство молодёжной политики Калининградской области • АНО «Цифровое развитие», 2026
          </div>
        </div>

      </td>
    </tr>
  </table>
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
