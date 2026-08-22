from datetime import datetime, timezone
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

def utc_now():
    return datetime.now(timezone.utc)

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(64), nullable=True, default='')
    last_name = db.Column(db.String(64), nullable=True, default='')
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)
    
    recommendations = db.relationship(
        'Recommendation', 
        backref='user', 
        lazy='dynamic', 
        cascade='all, delete-orphan'
    )
    chat_sessions = db.relationship(
        'ChatSession',
        backref='user',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    title = db.Column(db.String(256), nullable=False, default='Новый диалог')
    interests = db.Column(db.Text, nullable=False, default='')
    conditions = db.Column(db.Text, nullable=True, default='')
    messages_json = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

class Recommendation(db.Model):
    __tablename__ = 'recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    interests = db.Column(db.Text, nullable=False)
    conditions = db.Column(db.Text, nullable=True)
    response_json = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

class PasswordResetCode(db.Model):
    __tablename__ = 'password_reset_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    code_hash = db.Column(db.String(256), nullable=False)
    reset_token = db.Column(db.String(128), nullable=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    def set_code(self, code: str):
        self.code_hash = generate_password_hash(code)

    def check_code(self, code: str) -> bool:
        return check_password_hash(self.code_hash, code)