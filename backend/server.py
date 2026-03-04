from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import httpx
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "distriai")
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

async def send_email_notification(subject: str, html_content: str):
    if not RESEND_API_KEY:
        return
    try:
        async with httpx.AsyncClient() as http_client:
            await http_client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": "DISTRIAI <noreply@distriai.tech>", "to": "partnerships@distriai.tech", "subject": subject, "html": html_content}
            )
    except Exception as e:
        print(f"Email error: {e}")

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

@app.get("/api/")
async def root():
    return {"message": "DISTRIAI API", "status": "running"}

@app.post("/api/pilot-request")
async def submit_pilot_request(data: PilotRequest):
    if data.honeypot:
        return {"success": True, "message": "Request submitted."}
    if not data.name or not data.email:
        raise HTTPException(status_code=400, detail="Name and email required.")
    db.pilot_requests.insert_one({"name": data.name, "email": data.email, "role": data.role, "company": data.company, "message": data.message, "status": "new", "created_at": datetime.now(timezone.utc).isoformat()})
    await send_email_notification(f"New Pilot Request from {data.company or data.name}", f"<h2>New Pilot Request</h2><p>Name: {data.name}</p><p>Email: {data.email}</p><p>Company: {data.company}</p><p>Message: {data.message}</p>")
    return {"success": True, "message": "Pilot request submitted successfully. We will contact you within 48 hours."}

@app.post("/api/node-waitlist")
async def submit_node_waitlist(data: NodeWaitlist):
    if data.honeypot:
        return {"success": True, "message": "Request submitted."}
    if not data.name or not data.email:
        raise HTTPException(status_code=400, detail="Name and email required.")
    db.node_waitlist.insert_one({"name": data.name, "email": data.email, "gpu_type": data.gpu_type, "country": data.country, "status": "new", "created_at": datetime.now(timezone.utc).isoformat()})
    await send_email_notification(f"New Node Operator: {data.name}", f"<h2>New Node Waitlist</h2><p>Name: {data.name}</p><p>Email: {data.email}</p><p>GPU: {data.gpu_type}</p><p>Country: {data.country}</p>")
    return {"success": True, "message": "Successfully joined the node operator waitlist!"}

@app.post("/api/newsletter")
async def subscribe_newsletter(data: Newsletter):
    if data.honeypot:
        return {"success": True, "message": "Subscribed."}
    if not data.email:
        raise HTTPException(status_code=400, detail="Email required.")
    if db.newsletter_subscribers.find_one({"email": data.email}):
        return {"success": True, "message": "You are already subscribed!"}
    db.newsletter_subscribers.insert_one({"email": data.email, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"success": True, "message": "Successfully subscribed to updates!"}

@app.get("/api/admin")
async def admin_get(request: Request, action: Optional[str] = None):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth.replace("Bearer ", "") != os.environ.get("ADMIN_PASSWORD", "admin123"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if action == "stats":
        return {"pilot_requests": list(db.pilot_requests.find({}, {"_id": 0})), "pilot_count": db.pilot_requests.count_documents({}), "node_waitlist": list(db.node_waitlist.find({}, {"_id": 0})), "node_count": db.node_waitlist.count_documents({}), "newsletter_subscribers": list(db.newsletter_subscribers.find({}, {"_id": 0})), "subscriber_count": db.newsletter_subscribers.count_documents({})}
    return {"error": "Invalid action"}
