import re
import secrets
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models import User, PasswordResetCode, utc_now

logger = logging.getLogger(__name__)
auth = Blueprint('auth', __name__)

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

@auth.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'error': 'Заполните email и пароль'}), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({'error': 'Введите корректный адрес электронной почты'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Пароль должен быть не менее 6 символов'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Пользователь с таким email уже зарегистрирован'}), 400

    try:
        user = User(email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        login_user(user, remember=True)
        return jsonify({
            'message': 'Регистрация успешна',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.email.split('@')[0],
                'first_name': user.first_name or '',
                'last_name': user.last_name or ''
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Ошибка регистрации: {e}", exc_info=True)
        return jsonify({'error': 'Ошибка базы данных при создании аккаунта'}), 500

@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    remember = data.get('remember', True)

    if not email or not password:
        return jsonify({'error': 'Введите email и пароль'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Неверный email или пароль'}), 401

    login_user(user, remember=remember)
    return jsonify({
        'message': 'Вход выполнен успешно',
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.email.split('@')[0],
            'first_name': user.first_name or '',
            'last_name': user.last_name or ''
        }
    }), 200

@auth.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Вы вышли из системы'}), 200

@auth.route('/api/user/me', methods=['GET'])
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'email': current_user.email,
                'username': current_user.email.split('@')[0],
                'first_name': current_user.first_name or '',
                'last_name': current_user.last_name or ''
            }
        }), 200
    return jsonify({'authenticated': False, 'user': None}), 200

@auth.route('/api/user/update', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json() or {}
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip().lower()

    if email:
        if not re.match(EMAIL_REGEX, email):
            return jsonify({'error': 'Некорректный формат email'}), 400
        existing = User.query.filter_by(email=email).first()
        if existing and existing.id != current_user.id:
            return jsonify({'error': 'Этот email уже занят другим пользователем'}), 400
        current_user.email = email

    current_user.first_name = first_name
    current_user.last_name = last_name

    try:
        db.session.commit()
        return jsonify({
            'message': 'Профиль обновлен',
            'user': {
                'id': current_user.id,
                'email': current_user.email,
                'username': current_user.email.split('@')[0],
                'first_name': current_user.first_name,
                'last_name': current_user.last_name
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Ошибка обновления профиля: {e}")
        return jsonify({'error': 'Не удалось сохранить изменения'}), 500

@auth.route('/api/user/delete', methods=['DELETE'])
@login_required
def delete_account():
    user = current_user._get_current_object()
    try:
        logout_user()
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Аккаунт удален'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Ошибка удаления аккаунта: {e}")
        return jsonify({'error': 'Не удалось удалить аккаунт'}), 500

# --- ВОССТАНОВЛЕНИЕ ПАРОЛЯ (PASSWORD RECOVERY) ---

@auth.route('/api/recovery/request', methods=['POST'])
def recovery_request():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({'error': 'Введите корректный email'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Пользователь с таким email не найден'}), 404

    # Генерируем 6-значный криптографически стойкий код
    raw_code = f"{secrets.randbelow(900000) + 100000}"
    expires = utc_now() + timedelta(minutes=10)

    # Помечаем старые неиспользованные коды как недействительные
    PasswordResetCode.query.filter_by(email=email, used=False).update({'used': True})

    reset_entry = PasswordResetCode(
        email=email,
        expires_at=expires
    )
    reset_entry.set_code(raw_code)
    db.session.add(reset_entry)

    try:
        db.session.commit()
        # В реальной почтовой системе код отправляется на email
        print(f"\n[КОД ВОССТАНОВЛЕНИЯ ДЛЯ {email}]: {raw_code} (действителен 10 минут)\n")
        logger.info(f"Сгенерирован код восстановления для {email}: {raw_code}")
        return jsonify({'message': 'Код подтверждения успешно сформирован', 'email': email}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Ошибка создания кода восстановления: {e}")
        return jsonify({'error': 'Ошибка сервера при генерации кода'}), 500

@auth.route('/api/recovery/verify', methods=['POST'])
def recovery_verify():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()

    if not email or not code or len(code) != 6:
        return jsonify({'error': 'Введите 6-значный код'}), 400

    now = utc_now()
    reset_entries = PasswordResetCode.query.filter(
        PasswordResetCode.email == email,
        PasswordResetCode.used == False,
        PasswordResetCode.expires_at > now
    ).order_by(PasswordResetCode.created_at.desc()).all()

    matched_entry = None
    for entry in reset_entries:
        if entry.check_code(code):
            matched_entry = entry
            break

    if not matched_entry:
        return jsonify({'error': 'Неверный или просроченный код'}), 400

    # Создаем временный токен сброса для 3-го шага
    reset_token = secrets.token_urlsafe(32)
    matched_entry.reset_token = reset_token
    try:
        db.session.commit()
        return jsonify({'message': 'Код подтвержден', 'reset_token': reset_token}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Ошибка сервера'}), 500

@auth.route('/api/recovery/reset', methods=['POST'])
def recovery_reset():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    reset_token = data.get('reset_token', '').strip()
    new_password = data.get('new_password', '').strip()

    if not email or not reset_token or not new_password:
        return jsonify({'error': 'Заполните все поля'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Пароль должен быть не менее 6 символов'}), 400

    now = utc_now()
    matched_entry = PasswordResetCode.query.filter(
        PasswordResetCode.email == email,
        PasswordResetCode.reset_token == reset_token,
        PasswordResetCode.used == False,
        PasswordResetCode.expires_at > now
    ).first()

    if not matched_entry:
        return jsonify({'error': 'Сессия восстановления истекла или недействительна'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    try:
        user.set_password(new_password)
        matched_entry.used = True
        db.session.commit()

        login_user(user, remember=True)
        return jsonify({
            'message': 'Пароль успешно изменен',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.email.split('@')[0],
                'first_name': user.first_name or '',
                'last_name': user.last_name or ''
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Ошибка сохранения нового пароля: {e}")
        return jsonify({'error': 'Не удалось обновить пароль'}), 500