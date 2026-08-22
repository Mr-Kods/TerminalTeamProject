import os
import sys
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS

# Добавляем путь к папке backend для надежного импорта config
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(app.instance_path, exist_ok=True)

    # Безопасный CORS без "null" и без конфликтов wildcard origins
    CORS(
        app, 
        supports_credentials=True, 
        resources={
            r"/*": {
                "origins": [
                    "http://127.0.0.1:5000",
                    "http://localhost:5000",
                    "http://127.0.0.1:8080",
                    "http://localhost:8080"
                ]
            }
        }
    )

    db.init_app(app)
    login_manager.init_app(app)

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        try:
            return db.session.get(User, int(user_id))
        except Exception:
            return None

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Необходима авторизация'}), 401

    from app.auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint)

    from app.routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    with app.app_context():
        db.create_all()

    return app