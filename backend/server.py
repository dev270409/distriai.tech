from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import os
from pymongo import MongoClient

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "distriai")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Models
class PilotRequest(BaseModel):
    name: str
    email: str
    role: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None
    honeypot: Optional[str] = None

class NodeWaitlist(BaseModel):
    name: str
    email: str
    gpu_type: Optional[str] = None
    country: Optional[str] = None
    honeypot: Optional[str] = None

class Newsletter(BaseModel):
    email: str
    honeypot: Optional[str] = None

# Rate limiting (simple in-memory)
rate_limit_store = {}

def check_rate_limit(ip: str, endpoint: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    key = f"{endpoint}_{ip}"
    
    if key not in rate_limit_store:
        rate_limit_store[key] = []
    
    # Clean old requests
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < window_seconds]
    
    if len(rate_limit_store[key]) >= max_requests:
        return False
    
    rate_limit_store[key].append(now)
    return True

@app.get("/api/")
async def root():
    return {"message": "DISTRIAI API", "status": "running"}

@app.post("/api/pilot-request")
async def submit_pilot_request(data: PilotRequest, request: Request):
    # Honeypot check
    if data.honeypot:
        return {"success": True, "message": "Request submitted successfully."}
    
    # Validation
    if not data.name or not data.email:
        raise HTTPException(status_code=400, detail="Name and email are required.")
    
    # Rate limiting
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip, "pilot"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    # Save to database
    doc = {
        "name": data.name,
        "email": data.email,
        "role": data.role,
        "company": data.company,
        "message": data.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = db.pilot_requests.insert_one(doc)
    
    return {
        "success": True,
        "message": "Pilot request submitted successfully. We will contact you within 48 hours."
    }

@app.post("/api/node-waitlist")
async def submit_node_waitlist(data: NodeWaitlist, request: Request):
    if data.honeypot:
        return {"success": True, "message": "Request submitted successfully."}
    
    if not data.name or not data.email:
        raise HTTPException(status_code=400, detail="Name and email are required.")
    
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip, "node"):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    doc = {
        "name": data.name,
        "email": data.email,
        "gpu_type": data.gpu_type,
        "country": data.country,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.node_waitlist.insert_one(doc)
    
    return {
        "success": True,
        "message": "Successfully joined the node operator waitlist!"
    }

@app.post("/api/newsletter")
async def subscribe_newsletter(data: Newsletter, request: Request):
    if data.honeypot:
        return {"success": True, "message": "Subscribed successfully."}
    
    if not data.email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip, "newsletter", max_requests=10):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    # Check if already subscribed
    existing = db.newsletter_subscribers.find_one({"email": data.email})
    if existing:
        return {"success": True, "message": "You are already subscribed!"}
    
    doc = {
        "email": data.email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.newsletter_subscribers.insert_one(doc)
    
    return {
        "success": True,
        "message": "Successfully subscribed to updates!"
    }

@app.get("/api/admin")
async def admin_get(request: Request, action: Optional[str] = None, table: Optional[str] = None):
    auth = request.headers.get("Authorization", "")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    if not auth.startswith("Bearer ") or auth.replace("Bearer ", "") != admin_password:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if action == "stats":
        pilots = list(db.pilot_requests.find({}, {"_id": 0}))
        nodes = list(db.node_waitlist.find({}, {"_id": 0}))
        subscribers = list(db.newsletter_subscribers.find({}, {"_id": 0}))
        
        return {
            "pilot_requests": pilots,
            "pilot_count": len(pilots),
            "node_waitlist": nodes,
            "node_count": len(nodes),
            "newsletter_subscribers": subscribers,
            "subscriber_count": len(subscribers)
        }
    
    return {"error": "Invalid action"}

@app.post("/api/admin")
async def admin_post(request: Request):
    auth = request.headers.get("Authorization", "")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    if not auth.startswith("Bearer ") or auth.replace("Bearer ", "") != admin_password:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    body = await request.json()
    table = body.get("table")
    doc_id = body.get("id")
    status = body.get("status")
    
    if table == "pilot_requests":
        db.pilot_requests.update_one({"_id": doc_id}, {"$set": {"status": status}})
    elif table == "node_waitlist":
        db.node_waitlist.update_one({"_id": doc_id}, {"$set": {"status": status}})
    
    return {"success": True}
