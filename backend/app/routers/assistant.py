from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import audit
from ..database import get_db
from ..models import ChatMessage, ChatSession, User
from ..schemas import ChatIn, ChatMessageOut, ChatSessionOut
from ..security import get_current_user
from ..services import ai
from ..services.analysis import age_from
from ..utils import get_owned
from .analysis import compute_for

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.get("/status")
def status(_: User = Depends(get_current_user)):
    return {"configured": ai.is_configured(),
            "mode": "gemini" if ai.is_configured() else "fallback",
            "message": None if ai.is_configured() else
            "Gemini API anahtarı tanımlı değil. Asistan kural tabanlı yedek modda çalışıyor."}


@router.get("/sessions", response_model=list[ChatSessionOut])
def sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChatSession).filter_by(user_id=user.id).order_by(ChatSession.created_at.desc()).limit(30).all()


@router.get("/sessions/{sid}", response_model=list[ChatMessageOut])
def messages(sid: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_owned(db, ChatSession, sid, user, request).messages


@router.delete("/sessions/{sid}", status_code=204)
def delete_session(sid: int, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(get_owned(db, ChatSession, sid, user, request))
    db.commit()


@router.post("/chat")
def chat(data: ChatIn, request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.session_id:
        session = get_owned(db, ChatSession, data.session_id, user, request)
    else:
        session = ChatSession(user_id=user.id, title=data.message[:60])
        db.add(session)
        db.flush()
    history = [(m.role, m.content) for m in session.messages]
    p = user.profile
    # Modele kimlik bilgisi gönderilmez; yalnızca yaş, cinsiyet ve analiz özeti
    profile_info = {"yaş": age_from(p.birth_date) if p else None, "cinsiyet": p.gender if p else None}
    reply = ai.answer(data.message, history, compute_for(db, user), profile_info)
    db.add_all([ChatMessage(session=session, role="user", content=data.message),
                ChatMessage(session=session, role="assistant", content=reply)])
    audit.log(db, request, "ASSISTANT_CHAT", "Asistana soru soruldu", user=user,
              entity_type="chat_sessions", entity_id=session.id, commit=False)
    db.commit()
    return {"session_id": session.id, "reply": reply, "mode": "gemini" if ai.is_configured() else "fallback"}
