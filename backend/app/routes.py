import os
import re
import json
import logging
from typing import Optional, Union, List, Any
import requests
from flask import Blueprint, jsonify, request, current_app, send_from_directory, Response, abort
from flask_login import login_required, current_user
from pydantic import BaseModel, Field, ValidationError

from app import db
from app.models import Recommendation, ChatSession, utc_now

logger = logging.getLogger(__name__)
main = Blueprint('main', __name__)

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

ALLOWED_STATIC_EXTENSIONS = {
    '.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.ttf', '.woff', '.woff2'
}
FORBIDDEN_DIR_NAMES = {'backend', 'terminal.py', 'instance', 'venv', '.venv', '__pycache__', '.git'}

# --- СТАТИКА И ФРОНТЕНД С ЗАЩИТОЙ ---
@main.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@main.route('/favicon.ico')
def favicon():
    return Response(status=204)

@main.route('/<path:filename>')
def static_files(filename):
    # Предотвращение утечки исходного кода, .env, .db, .git и других файлов
    norm_path = os.path.normpath(filename).replace('\\', '/')
    parts = norm_path.split('/')

    # Запрет скрытых файлов и служебных директорий
    for part in parts:
        if part.startswith('.') or part.lower() in FORBIDDEN_DIR_NAMES:
            abort(404)

    _, ext = os.path.splitext(norm_path)
    if ext.lower() not in ALLOWED_STATIC_EXTENSIONS:
        abort(404)

    full_target = os.path.abspath(os.path.join(FRONTEND_DIR, norm_path))
    if not full_target.startswith(FRONTEND_DIR) or not os.path.isfile(full_target):
        abort(404)

    return send_from_directory(FRONTEND_DIR, norm_path)

# --- УСТОЙЧИВЫЕ PYDANTIC СХЕМЫ ДЛЯ ОТВЕТА ИИ ---
class ProfessionItem(BaseModel):
    id: Optional[Union[int, str]] = 1
    title: str = Field(default="Профессия", description="Название профессии")
    institution: str = Field(default="Учебное заведение Калининградской области", description="Основное учебное заведение")
    short_description: str = Field(default="", description="Краткое описание специфики профессии")
    duration: Optional[str] = Field(default="", description="Срок и форма обучения")
    budget_places: Optional[str] = Field(default="", description="Данные о бюджетных местах")
    tuition_cost: Optional[str] = Field(default="", description="Стоимость платного обучения")
    salary: Optional[str] = Field(default="", description="Средняя зарплата в регионе")
    viability_reason: Optional[str] = Field(default="", description="Перспектива в регионе")
    website: Optional[str] = Field(default="", description="Официальный сайт")
    address: Optional[str] = Field(default="", description="Адрес в Калининградской области")
    phone: Optional[str] = Field(default="", description="Контактный телефон")

class RecommendationsResponse(BaseModel):
    intro_summary: Optional[str] = Field(default="Подборка актуальных направлений образования в Калининградской области:", description="Вводный обзор")
    professions: List[ProfessionItem] = Field(default_factory=list, description="Рекомендованные профессии")

# --- ВСПОМОГАТЕЛЬНЫЙ УСТОЙЧИВЫЙ JSON-ПАРСЕР ---
def extract_and_parse_json(text: str) -> dict:
    """Извлекает и преобразует JSON из любого сырого текста ИИ."""
    if not text or not text.strip():
        raise ValueError("Пустой ответ от языковой модели")

    raw = text.strip()

    # 1. Попытка прямого парсинга
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, list):
            return {"intro_summary": "", "professions": parsed}
    except json.JSONDecodeError:
        pass

    # 2. Поиск по markdown-блокам ```json ... ``` или ``` ... ```
    md_matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", raw, re.IGNORECASE)
    for snippet in md_matches:
        snippet = snippet.strip()
        try:
            parsed = json.loads(snippet)
            if isinstance(parsed, dict):
                return parsed
            if isinstance(parsed, list):
                return {"intro_summary": "", "professions": parsed}
        except json.JSONDecodeError:
            pass

    # 3. Поиск диапазона от первой { до последней }
    first_brace = raw.find('{')
    last_brace = raw.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        snippet = raw[first_brace:last_brace + 1]
        try:
            parsed = json.loads(snippet)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            # Очистка возможных висячих запятых или некорректных символов
            cleaned = re.sub(r',\s*([\}\]])', r'\1', snippet)
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                pass

    # 4. Поиск массива [ ... ]
    first_bracket = raw.find('[')
    last_bracket = raw.rfind(']')
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        snippet = raw[first_bracket:last_bracket + 1]
        try:
            parsed = json.loads(snippet)
            if isinstance(parsed, list):
                return {"intro_summary": "", "professions": parsed}
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Не удалось распознать JSON в ответе: {raw[:300]}")

# --- СИСТЕМНЫЕ ПРОМПТЫ ---

# 1. Промпт для генерации структурированных рекомендаций
RECOMMENDATION_SYSTEM_INSTRUCTION = (
    "Ты — профессиональный карьерный консультант и эксперт по образованию в Калининградской области. "
    "Твоя задача — проанализировать интересы пользователя и условия его обучения, а затем "
    "предложить РОВНО 3 подходящие профессии, колледжи, техникумы или вузы именно в Калининградской области "
    "(обращай внимание на города: Калининград, Гусев, Советск, Черняховск, Полесск, Светлый и др., а также на базу образования: после 9 или 11 класса). "
    "Каждую предложенную тобой профессию надо будет проанализировать, агрегировать данные крупных HR-порталов, "
    "аналитических отчетов рынка труда и исследований вакансий и показать пользователю среднюю заработную плату, "
    "основываясь на реальных показателях региона. Также стоит очень кратко указать, почему эта профессия «нужна» и она «будет жить». "
    "В прогнозах используй формулировки «прогноз», «ожидается», «вероятно».\n\n"
    "ОГРАНИЧЕНИЯ:\n"
    "1. Ты обязан показывать вузы, колледжи и профессии ТОЛЬКО в Калининградской области!\n"
    "2. Если пользователь задает вопросы не по теме, ответь, что специализируешься только на образовании и профессиях в Калининградской области.\n\n"
    "ВАЖНО: Твой ответ ОБЯЗАТЕЛЬНО должен быть валидным JSON-объектом следующей структуры:\n"
    "{\n"
    '  "intro_summary": "краткий вводный анализ ситуации",\n'
    '  "professions": [\n'
    '    {\n'
    '      "id": 1,\n'
    '      "title": "Название профессии",\n'
    '      "institution": "Учебное заведение в КО",\n'
    '      "short_description": "Описание направления",\n'
    '      "duration": "Срок обучения",\n'
    '      "budget_places": "Количество бюджетных мест",\n'
    '      "tuition_cost": "Стоимость платного обучения",\n'
    '      "salary": "Средняя зарплата (прогноз/ожидается)",\n'
    '      "viability_reason": "Почему профессия нужна в регионе",\n'
    '      "website": "Сайт",\n'
    '      "address": "Адрес в КО",\n'
    '      "phone": "Телефон"\n'
    '    }\n'
    '  ]\n'
    "}"
)

# 2. Промпт для непрерывного диалога с чат-ботом (Follow-up)
CHAT_SYSTEM_INSTRUCTION = (
    "Ты — ведущий карьерный консультант и эксперт по образованию в Калининградской области. "
    "Ты ведешь непрерывный диалог с пользователем, учитывая ВСЮ предыдущую переписку и контекст.\n\n"
    "ПРАВИЛА И СТРУКТУРА ОТВЕТА:\n"
    "1. ЕСЛИ пользователь просит ЕЩЁ ВАРИАНТЫ, ДРУГИЕ ПРОФЕССИИ или АЛЬТЕРНАТИВНЫЕ КОЛЛЕДЖИ/ВУЗЫ "
    "(например: «а есть еще варианты?», «предложи другие», «что еще есть для фронтенда?», «а какие колледжи есть после 9 класса?»):\n"
    "   ОБЯЗАТЕЛЬНО ОТВЕТЬ В СТРОГОМ JSON ФОРМАТЕ с 1-3 новыми подходящими профессиями/колледжами региона:\n"
    "   ```json\n"
    "   {\n"
    '     "type": "recommendations",\n'
    '     "intro_summary": "Вот еще отличные варианты обучения в Калининградской области:",\n'
    '     "professions": [\n'
    "       {\n"
    '         "id": 1,\n'
    '         "title": "Название специальности",\n'
    '         "institution": "Учебное заведение (КМРК, БФУ, КГТУ, Политех и т.д.)",\n'
    '         "short_description": "Краткое описание специфики",\n'
    '         "duration": "Срок обучения",\n'
    '         "budget_places": "Бюджетные места",\n'
    '         "tuition_cost": "Стоимость обучения",\n'
    '         "salary": "Средняя зарплата (прогноз)",\n'
    '         "viability_reason": "Почему профессия нужна в регионе",\n'
    '         "website": "Сайт приемной комиссии",\n'
    '         "address": "Адрес в регионе",\n'
    '         "phone": "Телефон"\n'
    "       }\n"
    "     ]\n"
    "   }\n"
    "   ```\n\n"
    "2. ЕСЛИ пользователь просит рассказать подробнее о профессии, колледже или задает вопросы:\n"
    "   Обязательно разбивай ответ на красивые визуальные смысловые блоки:\n"
    "   - Используй четкие заголовки разделов с нумерацией, например: `### 1. Чему учат в колледже (на примере...)`.\n"
    "   - При разборе плюсов и минусов профессии/учебы ВСЕГДА используй отдельные блоки `### Плюсы:` и `### Минусы:` с маркированными списками (`* `).\n"
    "   - Оформляй списки с тезисами и выделением важных мыслей **жирным шрифтом**.\n"
    "   - В самом конце задавай дружелюбный вовлекающий вопрос отдельной строкой (например: `Хочешь узнать про проходные баллы или общежитие?`).\n\n"
    "3. Все учебные заведения и специальности должны относиться ИСКЛЮЧИТЕЛЬНО к Калининградской области."
)

# --- УНИВЕРСАЛЬНЫЙ ВЫЗОВ OPENROUTER API ---
def call_openrouter(messages: list, response_json: bool = False) -> str:
    api_key = current_app.config.get('OPENROUTER_API_KEY')
    model = current_app.config.get('OPENROUTER_MODEL', 'google/gemini-2.5-flash')

    if not api_key:
        raise ValueError("OPENROUTER_API_KEY не установлен. Пожалуйста, укажите ключ в .env файле.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://127.0.0.1:5000",
        "X-Title": "Kaliningrad Career Guide"
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2500
    }

    if response_json:
        payload["response_format"] = {"type": "json_object"}

    url = "https://openrouter.ai/api/v1/chat/completions"

    response = requests.post(url, headers=headers, json=payload, timeout=60.0)

    if response.status_code != 200:
        logger.error(f"OpenRouter Error {response.status_code}: {response.text}")
        raise Exception(f"Ошибка OpenRouter API ({response.status_code})")

    data = response.json()
    return data['choices'][0]['message']['content']

# --- РОУТ ПОДБОРА ПРОФЕССИЙ ---
@main.route('/api/recommend-profession', methods=['POST'])
def recommend_profession():
    data = request.get_json() or {}
    interests = data.get('interests', '').strip()
    conditions = data.get('conditions', '').strip()
    chat_id = data.get('chat_id')
    lang = data.get('lang', 'ru')

    if not interests:
        return jsonify({'error': 'Пожалуйста, введите ваши интересы.' if lang != 'en' else 'Please enter your interests.'}), 400

    user_prompt = f"Интересы пользователя: {interests}\n"
    if conditions:
        user_prompt += f"Условия обучения, локация и база образования: {conditions}"

    system_inst = RECOMMENDATION_SYSTEM_INSTRUCTION
    if lang == 'en':
        system_inst += (
            "\n\nIMPORTANT: The user has selected ENGLISH language. Return all JSON textual fields "
            "(title, short_description, viability_reason, duration, budget_places, tuition_cost, salary, intro_summary) "
            "in ENGLISH. Keep Russian regional institutions accurate in English (e.g., IKBFU, KSTU, Technical College in Kaliningrad)."
        )

    messages = [
        {"role": "system", "content": system_inst},
        {"role": "user", "content": user_prompt}
    ]

    try:
        raw_text = call_openrouter(messages, response_json=True)
        parsed_dict = extract_and_parse_json(raw_text)

        # Автоматическая адаптация ключей при альтернативных названиях
        if "professions" not in parsed_dict:
            for alt_key in ('items', 'data', 'recommendations', 'results', 'jobs', 'professions_list'):
                if alt_key in parsed_dict and isinstance(parsed_dict[alt_key], list):
                    parsed_dict['professions'] = parsed_dict[alt_key]
                    break

        if "intro_summary" not in parsed_dict:
            default_summary = "Recommended study programs in Kaliningrad Region:" if lang == 'en' else "Подборка подходящих направлений обучения в Калининградской области:"
            parsed_dict['intro_summary'] = parsed_dict.get('summary') or parsed_dict.get('intro') or parsed_dict.get('description') or default_summary

        validated_data = RecommendationsResponse.model_validate(parsed_dict)
        response_dict = validated_data.model_dump()
        response_dict['type'] = 'recommendations'

        # Автоматическое сохранение / обновление сессии чата в БД
        saved_chat_id = None
        if current_user.is_authenticated:
            # 1. Сохраняем в таблицу рекомендаций (для обратной совместимости)
            rec_record = Recommendation(
                user_id=current_user.id,
                interests=interests,
                conditions=conditions,
                response_json=response_dict
            )
            db.session.add(rec_record)

            # 2. Создаем или обновляем ChatSession
            chat_session = None
            if chat_id:
                chat_session = ChatSession.query.filter_by(id=chat_id, user_id=current_user.id).first()
            
            title = interests[:45] + ('...' if len(interests) > 45 else '')
            initial_messages = [
                {
                    "role": "user",
                    "content": f"Интересы: {interests}\nУсловия: {conditions}" if conditions else f"Интересы: {interests}"
                },
                {
                    "role": "assistant",
                    "type": "recommendations",
                    "content": json.dumps(response_dict, ensure_ascii=False),
                    "data": response_dict
                }
            ]

            if not chat_session:
                chat_session = ChatSession(
                    user_id=current_user.id,
                    title=title,
                    interests=interests,
                    conditions=conditions,
                    messages_json=initial_messages
                )
                db.session.add(chat_session)
            else:
                chat_session.interests = interests
                chat_session.conditions = conditions
                chat_session.title = title
                chat_session.messages_json = initial_messages
                chat_session.updated_at = utc_now()

            db.session.commit()
            saved_chat_id = chat_session.id

        response_dict['chat_id'] = saved_chat_id
        return jsonify(response_dict), 200

    except Exception as e:
        logger.error(f"Ошибка подбора профессий через OpenRouter: {e}", exc_info=True)
        return jsonify({'error': f'Ошибка сервиса подбора: {str(e)}'}), 500

# --- РОУТ УТОЧНЯЮЩЕГО ДИАЛОГА (ЧАТ-БОТ) ---
@main.route('/api/chat-followup', methods=['POST'])
def chat_followup():
    data = request.get_json() or {}
    history_messages = data.get('messages', [])
    user_message = data.get('message', '').strip()
    history_context = data.get('context', '')
    chat_id = data.get('chat_id')
    lang = data.get('lang', 'ru')

    chat_inst = CHAT_SYSTEM_INSTRUCTION
    if lang == 'en':
        chat_inst += (
            "\n\nIMPORTANT: The user has selected ENGLISH language. Answer in clear, friendly, and structured ENGLISH. "
            "Keep section titles formatted (e.g., `### 1. What you will study`, `### Pros:`, `### Cons:`), "
            "and ask closing engaging questions in English."
        )

    llm_messages = [{"role": "system", "content": chat_inst}]

    last_user_content = user_message
    if history_messages and isinstance(history_messages, list):
        for m in history_messages:
            if isinstance(m, dict) and m.get('role') in ('user', 'assistant') and m.get('content'):
                llm_messages.append({
                    "role": m['role'],
                    "content": str(m['content'])
                })
                if m['role'] == 'user':
                    last_user_content = str(m['content'])
    elif user_message:
        llm_messages.append({
            "role": "user",
            "content": f"Контекст ранее подобранных профессий:\n{history_context}\n\nВопрос пользователя: {user_message}"
        })
    else:
        return jsonify({'error': 'Сообщение не может быть пустым'}), 400

    try:
        raw_text = call_openrouter(llm_messages, response_json=False)

        # Проверяем, вернул ли ИИ новые структурированные рекомендации
        result_payload = None
        try:
            parsed_dict = extract_and_parse_json(raw_text)
            if "professions" in parsed_dict or any(k in parsed_dict for k in ('items', 'data', 'recommendations', 'results')):
                if "professions" not in parsed_dict:
                    for alt_key in ('items', 'data', 'recommendations', 'results', 'jobs'):
                        if alt_key in parsed_dict and isinstance(parsed_dict[alt_key], list):
                            parsed_dict['professions'] = parsed_dict[alt_key]
                            break
                if "intro_summary" not in parsed_dict:
                    parsed_dict['intro_summary'] = parsed_dict.get('summary') or parsed_dict.get('intro') or "Вот еще подходящие направления обучения в Калининградской области:"

                validated_data = RecommendationsResponse.model_validate(parsed_dict)
                result_payload = validated_data.model_dump()
                result_payload['type'] = 'recommendations'
        except Exception:
            pass

        if not result_payload:
            result_payload = {'type': 'text', 'reply': raw_text}

        # Автоматически сохраняем шаг диалога в БД
        if current_user.is_authenticated and chat_id:
            chat_session = ChatSession.query.filter_by(id=chat_id, user_id=current_user.id).first()
            if chat_session:
                current_msgs = list(chat_session.messages_json or [])
                # Добавляем вопрос пользователя, если его ещё нет
                if not current_msgs or current_msgs[-1].get('role') != 'user' or current_msgs[-1].get('content') != last_user_content:
                    current_msgs.append({"role": "user", "content": last_user_content})
                
                # Добавляем ответ ИИ
                if result_payload.get('type') == 'recommendations':
                    current_msgs.append({
                        "role": "assistant",
                        "type": "recommendations",
                        "content": json.dumps(result_payload, ensure_ascii=False),
                        "data": result_payload
                    })
                else:
                    current_msgs.append({
                        "role": "assistant",
                        "type": "text",
                        "content": raw_text,
                        "reply": raw_text
                    })

                chat_session.messages_json = current_msgs
                chat_session.updated_at = utc_now()
                db.session.commit()

        result_payload['chat_id'] = chat_id
        return jsonify(result_payload), 200

    except Exception as e:
        logger.error(f"Ошибка Followup через OpenRouter: {e}", exc_info=True)
        return jsonify({'error': 'Не удалось получить ответ на уточняющий вопрос.'}), 500

# --- ИСТОРИЯ ЧАТОВ И СЕССИЙ ---
@main.route('/api/chats', methods=['GET'])
@login_required
def get_chats():
    chats = ChatSession.query.filter_by(user_id=current_user.id)\
        .order_by(ChatSession.created_at.asc()).all()
    
    data = []
    for c in chats:
        msg_count = len(c.messages_json) if isinstance(c.messages_json, list) else 0
        data.append({
            'id': c.id,
            'title': c.title or 'Диалог без названия',
            'interests': c.interests,
            'conditions': c.conditions,
            'message_count': msg_count,
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'updated_at': c.updated_at.isoformat() if c.updated_at else None
        })
    
    return jsonify({'chats': data}), 200

@main.route('/api/chats/<int:chat_id>', methods=['GET'])
@login_required
def get_chat_by_id(chat_id):
    chat = ChatSession.query.filter_by(id=chat_id, user_id=current_user.id).first()
    if not chat:
        return jsonify({'error': 'Диалог не найден'}), 404
    
    return jsonify({
        'id': chat.id,
        'title': chat.title,
        'interests': chat.interests,
        'conditions': chat.conditions,
        'messages': chat.messages_json or [],
        'created_at': chat.created_at.isoformat() if chat.created_at else None,
        'updated_at': chat.updated_at.isoformat() if chat.updated_at else None
    }), 200

@main.route('/api/chats/<int:chat_id>', methods=['PATCH', 'PUT'])
@login_required
def rename_chat(chat_id):
    chat = ChatSession.query.filter_by(id=chat_id, user_id=current_user.id).first()
    if not chat:
        return jsonify({'error': 'Диалог не найден'}), 404
    
    data = request.get_json() or {}
    new_title = data.get('title', '').strip()
    if new_title:
        chat.title = new_title[:100]
        db.session.commit()
        return jsonify({'message': 'Название диалога обновлено', 'title': chat.title}), 200
    return jsonify({'error': 'Название не может быть пустым'}), 400

@main.route('/api/chats/<int:chat_id>', methods=['DELETE'])
@login_required
def delete_chat(chat_id):
    chat = ChatSession.query.filter_by(id=chat_id, user_id=current_user.id).first()
    if not chat:
        return jsonify({'error': 'Диалог не найден'}), 404
    
    db.session.delete(chat)
    db.session.commit()
    return jsonify({'message': 'Диалог успешно удален'}), 200

@main.route('/api/chats', methods=['DELETE'])
@login_required
def delete_all_chats():
    ChatSession.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': 'Все диалоги успешно удалены'}), 200

@main.route('/api/chats/sync', methods=['POST'])
@login_required
def sync_local_chats():
    data = request.get_json() or {}
    local_chats = data.get('chats', [])
    synced_count = 0

    for lc in local_chats:
        if not isinstance(lc, dict) or not lc.get('messages'):
            continue
        title = lc.get('title') or (lc.get('interests', '')[:45] + ('...' if len(lc.get('interests', '')) > 45 else '')) or 'Сохраненный диалог'
        new_session = ChatSession(
            user_id=current_user.id,
            title=title,
            interests=lc.get('interests', ''),
            conditions=lc.get('conditions', ''),
            messages_json=lc.get('messages', [])
        )
        db.session.add(new_session)
        synced_count += 1

    if synced_count > 0:
        db.session.commit()

    return jsonify({'message': f'Синхронизировано {synced_count} диалогов', 'synced_count': synced_count}), 200

@main.route('/api/history', methods=['GET'])
@login_required
def legacy_history():
    user_recs = Recommendation.query.filter_by(user_id=current_user.id)\
        .order_by(Recommendation.created_at.desc()).all()
    
    history_data = [
        {
            'id': item.id,
            'interests': item.interests,
            'conditions': item.conditions,
            'created_at': item.created_at.isoformat(),
            'recommendations': item.response_json
        }
        for item in user_recs
    ]
    return jsonify({'history': history_data}), 200