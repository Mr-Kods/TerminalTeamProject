import os
import socket
from app import create_app

app = create_app()

def get_local_ip():
    """Определяет локальный IP-адрес в текущей сети Wi-Fi/Ethernet."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

if __name__ == '__main__':
    local_ip = get_local_ip()
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')

    print("\n" + "=" * 62)
    print("  [>] Сервер 'Найди профессию' запущен и готов к работе!")
    print("=" * 62)
    print(f"  [*] Локально на твоем ПК:    http://127.0.0.1:{port}")
    print(f"  [*] Ссылка по локальной сети: http://{local_ip}:{port}")
    print(f"  [*] Режим отладки (Debug):   {'ВКЛЮЧЕН' if debug_mode else 'ВЫКЛЮЧЕН'}")
    print("=" * 62 + "\n")

    app.run(host='0.0.0.0', port=port, debug=debug_mode)