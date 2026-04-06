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

# ─── Predefined stages with sub-stages and exercises (from Daftar Stage spreadsheet) ───
DEFAULT_STAGES = {
    "PPL": {
        "description": "Private Pilot License",
        "sub_stages": [
            {"name": "Simulator Visual", "exercises": ["V1","V2","V3","V4"]},
            {"name": "Terbang Presolo", "exercises": ["A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15","A16","A17","A18","A19","A20"]},
            {"name": "Terbang Area", "exercises": ["B1","B2","B3","B4","B5","B6","B7","B8","B9","B10","B11","B12","B13","B14","B15","B16","B17"]},
            {"name": "Terbang Instrumen Area", "exercises": ["C1","C2"]},
            {"name": "Terbang Radio Instrumen", "exercises": ["D1"]},
            {"name": "Terbang Malam", "exercises": ["E1","E2","E3"]},
            {"name": "Terbang Cross Country", "exercises": ["F1","F2","F3","F4"]},
            {"name": "Simulator Radio Instrument", "exercises": ["R1"]},
        ],
        "exercises": ["V1","V2","V3","V4","A1","A2","A3","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14","A15","A16","A17","A18","A19","A20","B1","B2","B3","B4","B5","B6","B7","B8","B9","B10","B11","B12","B13","B14","B15","B16","B17","C1","C2","D1","E1","E2","E3","F1","F2","F3","F4","R1"]
    },
    "CPL": {
        "description": "Commercial Pilot License",
        "sub_stages": [
            {"name": "Simulator Visual", "exercises": ["VC1","VC2","VC3","VC4","VC5"]},
            {"name": "Simulator Instrumen", "exercises": ["IC1","IC2","IC3","IC4","IC5","IC6","IC7","IC8","IC9","IC10"]},
            {"name": "Terbang Area", "exercises": ["BC1","BC2","BC3","BC4","BC5","BC6","BC7","BC8","BC9","BC10","BC11","BC12","BC13","BC14","BC15","BC16"]},
            {"name": "Terbang Instrumen Area", "exercises": ["CC1","CC2","CC3","CC4","CC5","CC6","CC7","CC8","CC9","CC10","CC11","CC12","CC13","CC14","CC15","CC16","CC17","CC18","CC19","CC20","CC21","CC22","CC23","CC24","CC25","CC26","CC27","CC28","CC29","CC30","CC31","CC32","CC33"]},
            {"name": "Terbang Radio Instrumen", "exercises": ["DC1","DC2","DC3","DC4","DC5"]},
            {"name": "Terbang Malam", "exercises": ["EC1","EC2","EC3","EC4","EC5"]},
            {"name": "Terbang Cross Country", "exercises": ["FC1","FC2","FC3","FC4","FC5","FC6"]},
            {"name": "Simulator Radio Instrument", "exercises": ["RC1","RC2","RC3","RC4","RC5"]},
        ],
        "exercises": ["VC1","VC2","VC3","VC4","VC5","IC1","IC2","IC3","IC4","IC5","IC6","IC7","IC8","IC9","IC10","BC1","BC2","BC3","BC4","BC5","BC6","BC7","BC8","BC9","BC10","BC11","BC12","BC13","BC14","BC15","BC16","CC1","CC2","CC3","CC4","CC5","CC6","CC7","CC8","CC9","CC10","CC11","CC12","CC13","CC14","CC15","CC16","CC17","CC18","CC19","CC20","CC21","CC22","CC23","CC24","CC25","CC26","CC27","CC28","CC29","CC30","CC31","CC32","CC33","DC1","DC2","DC3","DC4","DC5","EC1","EC2","EC3","EC4","EC5","FC1","FC2","FC3","FC4","FC5","FC6","RC1","RC2","RC3","RC4","RC5"]
    },
    "IR": {
        "description": "Instrument Rating",
        "sub_stages": [
            {"name": "Simulator Instrumen", "exercises": ["CI1","CI2","CI3","CI4","CI5"]},
            {"name": "Terbang Instrumen Area", "exercises": ["II1","II2","II3","II4","II5"]},
            {"name": "Terbang Radio Instrumen", "exercises": ["RI1","RI2","RI3","RI4","RI5","RI6","RI7","RI8","RI9","RI10","RI11"]},
            {"name": "Simulator Radio Instrumen", "exercises": ["DI1","DI2","DI3","DI4","DI5","DI6","DI7","DI8","DI9","DI10"]},
            {"name": "Terbang Instrumen Cross Country", "exercises": ["FI1","FI2"]},
        ],
        "exercises": ["CI1","CI2","CI3","CI4","CI5","II1","II2","II3","II4","II5","RI1","RI2","RI3","RI4","RI5","RI6","RI7","RI8","RI9","RI10","RI11","DI1","DI2","DI3","DI4","DI5","DI6","DI7","DI8","DI9","DI10","FI1","FI2"]
    },
    "FIC": {
        "description": "Flight Instructor Course",
        "sub_stages": [
            {"name": "Terbang Instructor", "exercises": ["FIC1","FIC2","FIC3","FIC4","FIC5","FIC6","FIC7","FIC8","FIC9","FIC10","FIC11","FIC12","FIC13","FIC14","FIC15","FIC16","FIC17","FIC18","FIC19","FIC20","FIC21","FIC22","FIC23"]},
        ],
        "exercises": ["FIC1","FIC2","FIC3","FIC4","FIC5","FIC6","FIC7","FIC8","FIC9","FIC10","FIC11","FIC12","FIC13","FIC14","FIC15","FIC16","FIC17","FIC18","FIC19","FIC20","FIC21","FIC22","FIC23"]
    },
    "ME": {
        "description": "Multi Engine",
        "sub_stages": [
            {"name": "Simulator Multi Engine", "exercises": ["ME1","ME2","ME5","ME8","ME11"]},
            {"name": "Terbang Multi Engine", "exercises": ["ME3","ME4","ME6","ME7","ME9","ME10","ME12"]},
        ],
        "exercises": ["ME1","ME2","ME3","ME4","ME5","ME6","ME7","ME8","ME9","ME10","ME11","ME12"]
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
    phone: Optional[str] = ""

class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    callsign: Optional[str] = None
    license_expiry: Optional[str] = None
    duty_hours: Optional[str] = None
    phone: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    license_expiry: str
    course_id: Optional[str] = None
    phone: Optional[str] = ""

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    license_expiry: Optional[str] = None
    course_id: Optional[str] = None
    phone: Optional[str] = None

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

# ─── Flight Notes / Comments ───
class FlightNoteCreate(BaseModel):
    student_id: str
    student_name: str
    exercise: str
    stage_name: str
    note: str
    rating: Optional[str] = ""  # e.g. "satisfactory", "needs improvement", "excellent"
    date: str

class FlightNoteUpdate(BaseModel):
    note: Optional[str] = None
    rating: Optional[str] = None

# ─── Announcements ───
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"  # normal, important, urgent
    target_role: str = "all"  # all, instructor, student

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None
    target_role: Optional[str] = None

# ─── Student Progress ───
class ProgressCreate(BaseModel):
    student_id: str
    stage_name: str
    exercise: str
    completed_date: str
    instructor_callsign: str = ""
    remarks: str = ""

class EmailNotificationRequest(BaseModel):
    to_email: str
    subject: str
    body: str

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
    courses_list = await db.courses.find({}, {"_id": 0}).to_list(1000)
    courses_map = {c["id"]: c for c in courses_list}
    for s in students:
        if s.get("course_id"):
            s["course"] = courses_map.get(s["course_id"])
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
    all_students = await db.students.find({}, {"_id": 0}).to_list(5000)
    students_by_course = {}
    for s in all_students:
        cid = s.get("course_id")
        if cid:
            students_by_course.setdefault(cid, []).append(s)
    for c in courses:
        c["students"] = students_by_course.get(c["id"], [])
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

# ──────────── FLIGHT NOTES / COMMENTS ────────────
@api_router.get("/flight-notes")
async def get_flight_notes(student_id: Optional[str] = None, instructor_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if instructor_id:
        query["instructor_id"] = instructor_id
    notes = await db.flight_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return notes

@api_router.post("/flight-notes")
async def create_flight_note(data: FlightNoteCreate, current_user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["instructor_id"] = current_user.get("_id", "")
    doc["instructor_name"] = current_user.get("name", "")
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.flight_notes.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/flight-notes/{nid}")
async def update_flight_note(nid: str, data: FlightNoteUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data")
    result = await db.flight_notes.update_one({"id": nid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/flight-notes/{nid}")
async def delete_flight_note(nid: str, current_user: dict = Depends(get_current_user)):
    result = await db.flight_notes.delete_one({"id": nid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── ANNOUNCEMENTS ────────────
@api_router.get("/announcements")
async def get_announcements(current_user: dict = Depends(get_current_user)):
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return announcements

@api_router.post("/announcements")
async def create_announcement(data: AnnouncementCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "instructor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["author_name"] = current_user.get("name", "")
    doc["author_role"] = current_user.get("role", "")
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.announcements.insert_one(doc)
    return clean_doc(doc)

@api_router.put("/announcements/{aid}")
async def update_announcement(aid: str, data: AnnouncementUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "instructor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No data")
    result = await db.announcements.update_one({"id": aid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Updated"}

@api_router.delete("/announcements/{aid}")
async def delete_announcement(aid: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "instructor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.announcements.delete_one({"id": aid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── STUDENT PROGRESS TRACKER ────────────
@api_router.get("/progress/{student_id}")
async def get_student_progress(student_id: str, current_user: dict = Depends(get_current_user)):
    progress = await db.student_progress.find({"student_id": student_id}, {"_id": 0}).to_list(5000)
    return progress

@api_router.post("/progress")
async def create_progress(data: ProgressCreate, current_user: dict = Depends(get_current_user)):
    # Check if already completed
    existing = await db.student_progress.find_one({
        "student_id": data.student_id, "stage_name": data.stage_name, "exercise": data.exercise
    })
    if existing:
        raise HTTPException(status_code=400, detail="Exercise already marked as completed")
    doc = data.model_dump()
    doc["id"] = make_id()
    doc["marked_by"] = current_user.get("name", "")
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.student_progress.insert_one(doc)
    return clean_doc(doc)

@api_router.delete("/progress/{pid}")
async def delete_progress(pid: str, current_user: dict = Depends(get_current_user)):
    result = await db.student_progress.delete_one({"id": pid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}

# ──────────── WHATSAPP SHARE ────────────
@api_router.get("/share/whatsapp/{date}")
async def get_whatsapp_links(date: str, current_user: dict = Depends(get_current_user)):
    entries = await db.schedule_entries.find({"date": date}, {"_id": 0}).to_list(5000)
    if not entries:
        return {"links": [], "message": "No schedules for this date"}

    # Get all aircraft
    aircraft_map = {}
    for ac in await db.aircraft.find({}, {"_id": 0}).to_list(100):
        aircraft_map[ac["id"]] = ac.get("registration", "")

    # Group entries by student
    student_schedules = {}
    instructor_schedules = {}
    for e in entries:
        sname = e.get("student_name", "")
        icall = e.get("instructor_callsign", "")
        ac_reg = aircraft_map.get(e.get("aircraft_id", ""), "")
        period = e.get("period_number", "")
        exercise = e.get("exercise", "")
        time_slot = f"Period {period}"

        if sname:
            if sname not in student_schedules:
                student_schedules[sname] = []
            student_schedules[sname].append(f"- {time_slot}: {ac_reg} | FI: {icall} | EXC: {exercise}")

        if icall:
            if icall not in instructor_schedules:
                instructor_schedules[icall] = []
            instructor_schedules[icall].append(f"- {time_slot}: {ac_reg} | Student: {sname} | EXC: {exercise}")

    # Build links
    links = []
    # Get student phone numbers
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    student_phones = {s["name"]: s.get("phone", "") for s in students}

    # Get instructor phone numbers
    instructors = await db.instructors.find({}, {"_id": 0}).to_list(1000)
    instructor_phones = {i["callsign"]: i.get("phone", "") for i in instructors}

    for sname, flights in student_schedules.items():
        phone = student_phones.get(sname, "")
        msg = f"*Flight Schedule - {date}*\n\nHi {sname},\nBerikut jadwal penerbangan Anda:\n\n" + "\n".join(flights) + "\n\nTerima kasih."
        encoded_msg = msg.replace(" ", "%20").replace("\n", "%0A").replace("*", "%2A")
        wa_link = f"https://wa.me/{phone}?text={encoded_msg}" if phone else ""
        links.append({"type": "student", "name": sname, "phone": phone, "message": msg, "wa_link": wa_link})

    for icall, flights in instructor_schedules.items():
        phone = instructor_phones.get(icall, "")
        msg = f"*Flight Schedule - {date}*\n\nHi {icall},\nBerikut jadwal mengajar Anda:\n\n" + "\n".join(flights) + "\n\nTerima kasih."
        encoded_msg = msg.replace(" ", "%20").replace("\n", "%0A").replace("*", "%2A")
        wa_link = f"https://wa.me/{phone}?text={encoded_msg}" if phone else ""
        links.append({"type": "instructor", "name": icall, "phone": phone, "message": msg, "wa_link": wa_link})

    return {"links": links, "date": date}

# ──────────── EMAIL NOTIFICATION (Gmail SMTP) ────────────
@api_router.post("/notifications/send-email")
async def send_email_notification(data: EmailNotificationRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "instructor"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    gmail_user = os.environ.get("GMAIL_USER", "")
    gmail_pass = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not gmail_user or not gmail_pass:
        raise HTTPException(status_code=503, detail="Gmail credentials not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to backend .env")

    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    try:
        msg = MIMEMultipart()
        msg["From"] = gmail_user
        msg["To"] = data.to_email
        msg["Subject"] = data.subject
        msg.attach(MIMEText(data.body, "html"))

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(gmail_user, gmail_pass)
        server.sendmail(gmail_user, data.to_email, msg.as_string())
        server.quit()
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

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
    await db.flight_notes.create_index("id", unique=True)
    await db.announcements.create_index("id", unique=True)
    await db.student_progress.create_index("id", unique=True)
    await db.student_progress.create_index([("student_id", 1), ("stage_name", 1), ("exercise", 1)])

    # Seed default stages - update if sub_stages missing
    for name, info in DEFAULT_STAGES.items():
        existing = await db.stages.find_one({"name": name})
        if not existing:
            await db.stages.insert_one({"id": make_id(), "name": name, "description": info["description"], "exercises": info["exercises"], "sub_stages": info.get("sub_stages", []), "created_at": datetime.now(timezone.utc).isoformat()})
        elif not existing.get("sub_stages"):
            await db.stages.update_one({"name": name}, {"$set": {"exercises": info["exercises"], "sub_stages": info.get("sub_stages", [])}})

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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
