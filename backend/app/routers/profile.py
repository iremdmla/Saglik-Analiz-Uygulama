from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import audit
from ..database import get_db
from ..models import HealthProfile, User
from ..schemas import ProfileIn, ProfileOut
from ..security import get_current_user
from ..services.analysis import age_from, bmi_info

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _get_or_create(db: Session, user: User) -> HealthProfile:
    if not user.profile:
        user.profile = HealthProfile()
        db.commit()
    return user.profile


def _out(p: HealthProfile) -> ProfileOut:
    out = ProfileOut.model_validate(p)
    out.bmi, out.bmi_category = bmi_info(p.height_cm, p.weight_kg)
    out.age = age_from(p.birth_date)
    return out


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _out(_get_or_create(db, user))


@router.put("", response_model=ProfileOut)
def update_profile(data: ProfileIn, request: Request, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    p = _get_or_create(db, user)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    audit.log(db, request, "PROFILE_UPDATE", "Sağlık profili güncellendi", user=user,
              entity_type="health_profiles", entity_id=p.id)
    return _out(p)
