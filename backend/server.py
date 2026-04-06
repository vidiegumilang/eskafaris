from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import io
import json
import pandas as pd
from openpyxl import Workbook

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

# ─── Predefined flight periods ───
DEFAULT_PERIODS = [
    {"number": 1, "label": "1st Period", "start": "01:00", "end": "02:00"},
    {"number": 2, "label": "2nd Period", "start": "02:30", "end": "03:30"},
    {"number": 3, "label": "3rd Period", "start": "04:00", "end": "05:00"},
    {"number": 4, "label": "REST Period", "start": "05:00", "end": "06:00"},
    {"number": 5, "label": "4th Period", "start": "06:30", "end": "07:30"},
    {"number": 6, "label": "5th Period", "start": "08:00", "end": "09:00"},
    {"number": 7, "label": "6th Period", "start": "09:30", "end": "10:30"},
    {"number": 8, "label": "8th Period", "start": "12:00", "end": "13:00"},
    {"number": 9, "label": "9th Period", "start": "13:00", "end": "14:00"},
    {"number": 10, "label": "10th Period", "start": "14:00", "end": "15:00"},
]

# ─── Predefined stages with exercises ───
DEFAULT_STAGES = {
    "PPL": {
        "description": "Private Pilot License",
        "exercises": [
            "A1","A2","A3","A4","A5","A6","A7","A8","A9","A10",
            "A11","A12","A13","A14","A15","A16","A17","A18","A19"
        ]
    },
    "CPL": {
        "description": "Commercial Pilot License",
        "exercises": [
            "B1","B2","B3","B4","B5","B6","B7","B8","B9","B10",
            "B11","B12","B13","B14","B15","B16","B17","B18","B19","B20"
        ]
    },
    "IR": {
        "description": "Instrument Rating",
        "exercises": [
            "C1","C2","C3","C4","C5","C6","C7","C8","C9","C10"
        ]
    },
    "FIC": {
        "description": "Flight Instructor Course",
        "exercises": [
            "CC1","CC2","CC3","CC4","CC5","CC6","CC7","CC8","CC9","CC10",
            "CC11","CC12","CC13","CC14","CC15","CC16","CC17","CC18","CC19","CC20",
            "CC21","CC22","CC23","CC24","CC25"
        ]
    },
    "ME": {
        "description": "Multi Engine",
        "exercises": [
            "D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"
        ]
    }
}

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def make_id():
    return str(ObjectId())

def clean_doc(doc):
    """Remove MongoDB _id from a document dict."""
    if doc and "_id" in doc:
        del doc["_id"]
    return doc

# ─── Pydantic models ───
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class InstructorCreate(BaseModel):
    name: str
    callsign: str
    license_expiry: str
    duty_hours: Optional[str] = "0:00"

class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    callsign: Optional[str] = None
    license_expiry: Optional[str] = None
    duty_hours: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    license_expiry: str
    course_id: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    license_expiry: Optional[str] = None
    course_id: Optional[str] = None

class AircraftCreate(BaseModel):
    registration: str
    total_hours: str = "0:00"
    status_hours: float = 0
    is_insured: bool = True
    aircraft_type: str = ""
    remarks: str = ""

class AircraftUpdate(BaseModel):
    registration: Optional[str] = None
    total_hours: Optional[str] = None
    status_hours: Optional[float] = None
    is_insured: Optional[bool] = None
    aircraft_type: Optional[str] = None
    remarks: Optional[str] = None

class StageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    exercises: Optional[List[str]] = None

class StageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    exercises: Optional[List[str]] = None

class CourseCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ScheduleEntryCreate(BaseModel):
    date: str
    period_number: int
    aircraft_id: str
    instructor_callsign: str = ""
    student_name: str = ""
    exercise: str = ""
    block_off: str = ""
    block_on: str = ""
    remarks: str = ""
    course_id: str = ""
    status: str = "scheduled"

class ScheduleEntryUpdate(BaseModel):
    instructor_callsign: Optional[str] = None
    student_name: Optional[str] = None
    exercise: Optional[str] = None
    block_off: Optional[str] = None
    block_on: Optional[str] = None
    remarks: Optional[str] = None
    course_id: Optional[str] = None
    status: Optional[str] = None

class DailySummaryUpdate(BaseModel):
    date: str
    aircraft_complaints: Optional[dict] = None
    weather_remarks: Optional[str] = None
    total_sortie: Optional[int] = None
    sortie_available: Optional[int] = None

# ──────────── AUTH ENDPOINTS ────────────
@api_router.post("/auth/register")
async def register(user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    password_hash = hash_password(user_data.password)
    new_user = {"email": email, "password_hash": password_hash, "name": user_data.name, "role": user_data.role, "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return {"id": user_id, "email": email, "name": user_data.name, "role": user_data.role}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    email = credentials.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    return {"id": user_id, "email": user["email"], "name": user["name"], "role": user["role"]}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ──────────── INSTRUCTORS ────────────
@api_router.get("/instructors")
async def get_instructors(current_user: dict = Depends(get_current_user)):
    return await db.instructors.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/instructors")
async def create_instructor(data: InstructorCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.instructors.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/instructors/{iid}")
async def update_instructor(iid: str, data: InstructorUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.instructors.update_one({"id": iid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/instructors/{iid}")
async def delete_instructor(iid: str, current_user: dict = Depends(get_current_user)):
    result = await db.instructors.delete_one({"id": iid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── STUDENTS ────────────
@api_router.get("/students")
async def get_students(current_user: dict = Depends(get_current_user)):
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    for s in students:
        if s.get("course_id"):
            course = await db.courses.find_one({"id": s["course_id"]}, {"_id": 0})
            s["course"] = course
    return students

@api_router.post("/students")
async def create_student(data: StudentCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.students.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/students/{sid}")
async def update_student(sid: str, data: StudentUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.students.update_one({"id": sid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/students/{sid}")
async def delete_student(sid: str, current_user: dict = Depends(get_current_user)):
    result = await db.students.delete_one({"id": sid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── AIRCRAFT ────────────
@api_router.get("/aircraft")
async def get_aircraft(current_user: dict = Depends(get_current_user)):
    return await db.aircraft.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/aircraft")
async def create_aircraft(data: AircraftCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.aircraft.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/aircraft/{aid}")
async def update_aircraft(aid: str, data: AircraftUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.aircraft.update_one({"id": aid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/aircraft/{aid}")
async def delete_aircraft(aid: str, current_user: dict = Depends(get_current_user)):
    result = await db.aircraft.delete_one({"id": aid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── STAGES ────────────
@api_router.get("/stages")
async def get_stages(current_user: dict = Depends(get_current_user)):
    return await db.stages.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/stages")
async def create_stage(data: StageCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.stages.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/stages/{sid}")
async def update_stage(sid: str, data: StageUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.stages.update_one({"id": sid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/stages/{sid}")
async def delete_stage(sid: str, current_user: dict = Depends(get_current_user)):
    result = await db.stages.delete_one({"id": sid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── COURSES ────────────
@api_router.get("/courses")
async def get_courses(current_user: dict = Depends(get_current_user)):
    courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    for c in courses:
        students = await db.students.find({"course_id": c["id"]}, {"_id": 0}).to_list(1000)
        c["students"] = students
    return courses

@api_router.post("/courses")
async def create_course(data: CourseCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.courses.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/courses/{cid}")
async def update_course(cid: str, data: CourseUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.courses.update_one({"id": cid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/courses/{cid}")
async def delete_course(cid: str, current_user: dict = Depends(get_current_user)):
    result = await db.courses.delete_one({"id": cid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── PERIODS ────────────
@api_router.get("/periods")
async def get_periods(current_user: dict = Depends(get_current_user)):
    return DEFAULT_PERIODS

# ──────────── SCHEDULE ENTRIES ────────────
@api_router.get("/schedules")
async def get_schedules(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query["date"] = date
    entries = await db.schedule_entries.find(query, {"_id": 0}).to_list(5000)
    return entries

@api_router.post("/schedules")
async def create_schedule_entry(data: ScheduleEntryCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.schedule_entries.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/schedules/{eid}")
async def update_schedule_entry(eid: str, data: ScheduleEntryUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.schedule_entries.update_one({"id": eid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/schedules/{eid}")
async def delete_schedule_entry(eid: str, current_user: dict = Depends(get_current_user)):
    result = await db.schedule_entries.delete_one({"id": eid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# Batch create/update schedule entries for a whole day
@api_router.post("/schedules/batch")
async def batch_upsert_schedules(entries: List[ScheduleEntryCreate], current_user: dict = Depends(get_current_user)):
    created = 0
    updated = 0
    for entry in entries:
        existing = await db.schedule_entries.find_one({
            "date": entry.date,
            "period_number": entry.period_number,
            "aircraft_id": entry.aircraft_id
        })
        if existing:
            update_data = {k: v for k, v in entry.model_dump().items() if k not in ("date", "period_number", "aircraft_id")}
            await db.schedule_entries.update_one({"_id": existing["_id"]}, {"$set": update_data})
            updated += 1
        else:
            doc = entry.model_dump()
            doc["id"] = make_id()
            doc["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.schedule_entries.insert_one(doc)
            created += 1
    return {"message": f"Created {created}, Updated {updated} entries"}

# ──────────── DAILY SUMMARY ────────────
@api_router.get("/daily-summary/{date}")
async def get_daily_summary(date: str, current_user: dict = Depends(get_current_user)):
    summary = await db.daily_summaries.find_one({"date": date}, {"_id": 0})
    if not summary:
        # Build from schedule entries
        entries = await db.schedule_entries.find({"date": date}, {"_id": 0}).to_list(5000)
        aircraft_list = await db.aircraft.find({"is_insured": True}, {"_id": 0}).to_list(100)
        total_flights = len([e for e in entries if e.get("student_name")])
        total_aircraft = len(aircraft_list)
        sortie_available = total_aircraft * len(DEFAULT_PERIODS)
        summary = {
            "date": date,
            "total_flights": total_flights,
            "total_aircraft": total_aircraft,
            "sortie_available": sortie_available,
            "total_sortie": sortie_available,
            "weather_remarks": "",
            "aircraft_complaints": {},
        }
    return summary

@api_router.post("/daily-summary")
async def update_daily_summary(data: DailySummaryUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.daily_summaries.update_one(
        {"date": data.date},
        {"$set": update_data},
        upsert=True
    )
    return {"message": "Summary updated"}

# ──────────── IMPORT ENDPOINTS ────────────
@api_router.post("/import/instructors")
async def import_instructors(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        df = pd.read_csv(io.BytesIO(contents))
    count = 0
    for _, row in df.iterrows():
        doc = {
            "id": make_id(),
            "name": str(row.get("name", "")),
            "callsign": str(row.get("callsign", "")),
            "license_expiry": str(row.get("license_expiry", "")),
            "duty_hours": str(row.get("duty_hours", "0:00")),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.instructors.insert_one(doc)
        count += 1
    return {"message": f"Imported {count} instructors"}

@api_router.post("/import/students")
async def import_students(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        df = pd.read_csv(io.BytesIO(contents))
    count = 0
    for _, row in df.iterrows():
        course_name = str(row.get("course", ""))
        course_id = ""
        if course_name:
            course = await db.courses.find_one({"name": course_name})
            if course:
                course_id = course.get("id", "")
        doc = {
            "id": make_id(),
            "name": str(row.get("name", "")),
            "license_expiry": str(row.get("license_expiry", "")),
            "course_id": course_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.students.insert_one(doc)
        count += 1
    return {"message": f"Imported {count} students"}

@api_router.post("/import/aircraft")
async def import_aircraft(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        df = pd.read_csv(io.BytesIO(contents))
    count = 0
    for _, row in df.iterrows():
        doc = {
            "id": make_id(),
            "registration": str(row.get("registration", "")),
            "total_hours": str(row.get("total_hours", "0:00")),
            "status_hours": float(row.get("status_hours", 0)),
            "is_insured": bool(row.get("is_insured", True)),
            "aircraft_type": str(row.get("aircraft_type", "")),
            "remarks": str(row.get("remarks", "")),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.aircraft.insert_one(doc)
        count += 1
    return {"message": f"Imported {count} aircraft"}

# ──────────── NOTIFICATIONS ────────────
@api_router.get("/notifications/expiring-licenses")
async def get_expiring_licenses(current_user: dict = Depends(get_current_user)):
    next_month = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    expiring_instructors = []
    expiring_students = []
    for instr in await db.instructors.find({}, {"_id": 0}).to_list(1000):
        if instr.get("license_expiry") and instr["license_expiry"] <= next_month:
            expiring_instructors.append(instr)
    for stud in await db.students.find({}, {"_id": 0}).to_list(1000):
        if stud.get("license_expiry") and stud["license_expiry"] <= next_month:
            expiring_students.append(stud)
    return {"instructors": expiring_instructors, "students": expiring_students, "total": len(expiring_instructors) + len(expiring_students)}

# ──────────── EXPORT ────────────
@api_router.get("/export/schedules")
async def export_schedules(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query["date"] = date
    entries = await db.schedule_entries.find(query, {"_id": 0}).to_list(5000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Flight Schedules"
    ws.append(["Date", "Period", "Aircraft", "Instructor", "Student", "Exercise", "Block Off", "Block On", "Remarks", "Course", "Status"])
    for e in entries:
        ws.append([e.get("date",""), e.get("period_number",""), e.get("aircraft_id",""), e.get("instructor_callsign",""), e.get("student_name",""), e.get("exercise",""), e.get("block_off",""), e.get("block_on",""), e.get("remarks",""), e.get("course_id",""), e.get("status","")])
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=flight_schedules.xlsx"})

# ──────────── STARTUP ────────────
@app.on_event("startup")
async def startup_event():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@flightops.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing_admin = await db.users.find_one({"email": admin_email})
    if existing_admin is None:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password), "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    await db.users.create_index("email", unique=True)
    await db.instructors.create_index("id", unique=True)
    await db.students.create_index("id", unique=True)
    await db.aircraft.create_index("id", unique=True)
    await db.stages.create_index("id", unique=True)
    await db.courses.create_index("id", unique=True)
    await db.schedule_entries.create_index("id", unique=True)
    await db.schedule_entries.create_index([("date", 1), ("period_number", 1), ("aircraft_id", 1)])

    # Seed default stages
    for name, info in DEFAULT_STAGES.items():
        existing = await db.stages.find_one({"name": name})
        if not existing:
            await db.stages.insert_one({"id": make_id(), "name": name, "description": info["description"], "exercises": info["exercises"], "created_at": datetime.now(timezone.utc).isoformat()})

    # Write test credentials
    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n## Admin\n")
        f.write(f"- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- POST /api/auth/logout\n- GET /api/auth/me\n")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
