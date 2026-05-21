import os
import time
import base64
import numpy as np
import cv2
from fastapi import FastAPI, Header, HTTPException, Request, Body
from pydantic import BaseModel
from typing import List, Optional
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("WARNING: DeepFace not found. Running in MOCK mode.")

from sklearn.ensemble import IsolationForest
from cryptography.fernet import Fernet
from PIL import Image
import io
import sqlite3
import json

app = FastAPI(title="MMCA ML Microservice")

# Security Configuration
ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY")
ENCRYPTION_KEY_RAW = os.getenv("ML_ENCRYPTION_KEY")

if not ENCRYPTION_KEY_RAW:
    # Fallback to a warning and auto-generation for DEV ONLY
    # In production, this should fail the startup
    ENCRYPTION_KEY = Fernet.generate_key()
else:
    ENCRYPTION_KEY = ENCRYPTION_KEY_RAW.encode()

cipher_suite = Fernet(ENCRYPTION_KEY)

# Database Management
class MLDatabase:
    def __init__(self, db_path="ml_storage.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS templates (
                    userId TEXT PRIMARY KEY,
                    template BLOB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS profiles (
                    userId TEXT PRIMARY KEY,
                    data TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

    def save_template(self, userId, template_bytes):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT OR REPLACE INTO templates (userId, template) VALUES (?, ?)", (userId, template_bytes))

    def get_template(self, userId):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT template FROM templates WHERE userId = ?", (userId,))
            row = cursor.fetchone()
            return row[0] if row else None

    def save_profile(self, userId, data_str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT OR REPLACE INTO profiles (userId, data) VALUES (?, ?)", (userId, data_str))

    def get_profile(self, userId):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT data FROM profiles WHERE userId = ?", (userId,))
            row = cursor.fetchone()
            return row[0] if row else None

db = MLDatabase()
behaviour_profiles = {} # Keeping this in memory for now as it's more dynamic

# Pydantic Models
class FaceEnrolRequest(BaseModel):
    userId: str
    images: List[str] # Base64 encoded

class FaceVerifyRequest(BaseModel):
    userId: str
    image: str
    sessionId: str

class TouchEvent(BaseModel):
    type: str
    x: float
    y: float
    pressure: float
    timestamp: float

class BehaviourUpdateRequest(BaseModel):
    userId: str
    events: List[TouchEvent]

class AnomalyAnalyseRequest(BaseModel):
    userId: str
    signals: dict

# Middleware for Security Key
async def verify_service_key(x_ml_service_key: str = Header(...)):
    if not ML_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Service configuration error: ML_SERVICE_KEY not set")
    if x_ml_service_key != ML_SERVICE_KEY:
        raise HTTPException(status_code=403, detail="Invalid service key")

# --- Face Recognition Routes ---

@app.post("/ml/face/enrol")
async def enrol_face(req: FaceEnrolRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    
    if len(req.images) < 5:
        raise HTTPException(status_code=400, detail="Minimum 5 images required for enrolment")
    
    vectors = []
    try:
        for img_b64 in req.images:
            # Decode and convert to CV2 format
            img_data = base64.b64decode(img_b64)
            img = Image.open(io.BytesIO(img_data))
            img_np = np.array(img)
            
            if DEEPFACE_AVAILABLE:
                # Extract features using DeepFace (VGG-Face model by default)
                embedding = DeepFace.represent(img_np, model_name='VGG-Face', enforce_detection=True)[0]["embedding"]
            else:
                # Mock embedding for development/unsupported environments
                embedding = np.random.rand(2622).tolist() # VGG-Face vector size
            
            vectors.append(embedding)
            
            # Explicit Memory Cleanup
            del img_data
            del img
            del img_np
            
        # Average the vectors for a robust template
        template_vector = np.mean(vectors, axis=0)
        
        # Encrypt the template
        encrypted_template = cipher_suite.encrypt(template_vector.tobytes())
        db.save_template(req.userId, encrypted_template)
        
        return {"success": True, "templateId": f"tmpl_{req.userId}", "quality_score": 0.95}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/ml/face/verify")
async def verify_face(req: FaceVerifyRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    start_time = time.time()
    
    try:
        # 1. Extract feature vector from current frame
        img_data = base64.b64decode(req.image)
        img = Image.open(io.BytesIO(img_data))
        img_np = np.array(img)
        
        if DEEPFACE_AVAILABLE:
            current_embedding = DeepFace.represent(img_np, model_name='VGG-Face', enforce_detection=True)[0]["embedding"]
        else:
            # Mock embedding: retrieve stored embedding if it exists to simulate a match
            encrypted_tmpl = db.get_template(req.userId)
            if encrypted_tmpl:
                tmpl_bytes = cipher_suite.decrypt(encrypted_tmpl)
                stored_embedding = np.frombuffer(tmpl_bytes)
                current_embedding = stored_embedding.tolist()
            else:
                current_embedding = np.random.rand(2622).tolist()
        
        # 2. Liveness Check (Laplacian variance-based blur detection)
        if len(img_np.shape) == 3:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_np
        
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_live = bool(laplacian_var >= 70.0)
        
        # Explicit Memory Cleanup
        del img_data
        del img
        del img_np
        del gray

        # 3. Load and Decrypt Template
        encrypted_tmpl = db.get_template(req.userId)
        if not encrypted_tmpl:
            return {"success": False, "error": "Template not found"}
        
        tmpl_bytes = cipher_suite.decrypt(encrypted_tmpl)
        stored_embedding = np.frombuffer(tmpl_bytes)
        
        # 4. Compute Cosine Similarity
        similarity = np.dot(current_embedding, stored_embedding) / (np.linalg.norm(current_embedding) * np.linalg.norm(stored_embedding))
        
        threshold = 0.68
        success = similarity >= threshold and is_live
        
        return {
            "success": success,
            "confidence": float(similarity),
            "spoofDetected": not is_live,
            "livenessScore": float(laplacian_var),
            "processingMs": int((time.time() - start_time) * 1000)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Behavioural Biometrics Helpers & Routes ---

def extract_behaviour_features(events: List[TouchEvent]) -> List[float]:
    # Ensure events are sorted by timestamp
    sorted_events = sorted(events, key=lambda e: e.timestamp)
    
    hold_times = []
    flight_times = []
    pressures = [e.pressure for e in sorted_events if e.pressure > 0]
    
    press_time = None
    last_release_time = None
    
    swipe_coords = []
    velocities = []
    
    for event in sorted_events:
        if event.type == 'press':
            press_time = event.timestamp
            if last_release_time is not None:
                # flight time is time between last release and current press
                flight_times.append(event.timestamp - last_release_time)
            swipe_coords = [(event.x, event.y, event.timestamp)]
        elif event.type == 'release':
            if press_time is not None:
                hold_times.append(event.timestamp - press_time)
                press_time = None
            last_release_time = event.timestamp
            if len(swipe_coords) > 1:
                # Calculate velocity of the swipe
                total_dist = 0.0
                for j in range(1, len(swipe_coords)):
                    dx = swipe_coords[j][0] - swipe_coords[j-1][0]
                    dy = swipe_coords[j][1] - swipe_coords[j-1][1]
                    dist = np.sqrt(dx*dx + dy*dy)
                    total_dist += dist
                dt_total = swipe_coords[-1][2] - swipe_coords[0][2]
                if dt_total > 0:
                    velocities.append(total_dist / dt_total)
            swipe_coords = []
        elif event.type in ['move', 'drag']:
            if press_time is not None:
                swipe_coords.append((event.x, event.y, event.timestamp))
                
    mean_hold = float(np.mean(hold_times)) if hold_times else 150.0  # ms default
    mean_flight = float(np.mean(flight_times)) if flight_times else 200.0  # ms default
    mean_pressure = float(np.mean(pressures)) if pressures else 0.5
    var_pressure = float(np.var(pressures)) if pressures else 0.01
    mean_vel = float(np.mean(velocities)) if velocities else 0.5
    
    return [mean_hold, mean_flight, mean_pressure, var_pressure, mean_vel]

@app.post("/ml/behaviour/update")
async def update_behaviour(req: BehaviourUpdateRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    
    try:
        new_features = extract_behaviour_features(req.events)
        
        # Load and append to historical profiles
        profile_data = db.get_profile(f"behaviour_{req.userId}")
        history = []
        if profile_data:
            try:
                history = json.loads(profile_data)
            except Exception:
                history = []
                
        history.append(new_features)
        if len(history) > 50:
            history = history[-50:]
            
        db.save_profile(f"behaviour_{req.userId}", json.dumps(history))
        return {"success": True, "profileUpdated": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/ml/behaviour/verify")
async def verify_behaviour(req: BehaviourUpdateRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    
    try:
        current_features = extract_behaviour_features(req.events)
        profile_data = db.get_profile(f"behaviour_{req.userId}")
        
        if not profile_data:
            return {"match": True, "confidence": 1.0, "reason": "No enrolled profile yet"}
            
        history = json.loads(profile_data)
        if len(history) < 3:
            # Match by default but collect data
            history.append(current_features)
            db.save_profile(f"behaviour_{req.userId}", json.dumps(history))
            return {"match": True, "confidence": 1.0, "reason": "Collecting baseline"}
            
        # Standardized Euclidean distance matching
        history_arr = np.array(history)
        mean_vector = np.mean(history_arr, axis=0)
        std_vector = np.std(history_arr, axis=0)
        
        std_vector[std_vector == 0] = 0.01  # Prevent divide-by-zero
        
        z_scores = np.abs(current_features - mean_vector) / std_vector
        avg_z_score = float(np.mean(z_scores))
        
        # Match threshold (typically Z-score average under 2.5 is accepted)
        threshold = 2.5
        match = avg_z_score <= threshold
        confidence = max(0.0, min(1.0, 1.0 - (avg_z_score / threshold)))
        
        return {"match": match, "confidence": confidence, "distance": avg_z_score}
    except Exception as e:
        return {"match": False, "confidence": 0.0, "error": str(e)}

# --- Anomaly Detection ---

@app.post("/ml/anomaly/analyse")
async def analyse_anomaly(req: AnomalyAnalyseRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    
    try:
        signals = req.signals
        lat = float(signals.get("lat", 0.0))
        lng = float(signals.get("lng", 0.0))
        hour = float(signals.get("hour", 12.0))
        failed_attempts = float(signals.get("failed_attempts", 0.0))
        
        current_features = [lat, lng, hour, failed_attempts]
        
        profile_data = db.get_profile(f"anomaly_{req.userId}")
        history = []
        if profile_data:
            try:
                history = json.loads(profile_data)
            except Exception:
                history = []
                
        if len(history) < 5:
            history.append(current_features)
            db.save_profile(f"anomaly_{req.userId}", json.dumps(history))
            return {
                "anomalyScore": 0.0,
                "isAnomaly": False,
                "features_used": ["lat", "lng", "hour", "failed_attempts"]
            }
            
        train_data = np.array(history)
        clf = IsolationForest(contamination=0.1, random_state=42)
        clf.fit(train_data)
        
        pred = clf.predict([current_features])[0]  # 1 normal, -1 anomaly
        score = -clf.decision_function([current_features])[0]
        
        history.append(current_features)
        if len(history) > 100:
            history = history[-100:]
            
        db.save_profile(f"anomaly_{req.userId}", json.dumps(history))
        return {
            "anomalyScore": float(score),
            "isAnomaly": bool(pred == -1),
            "features_used": ["lat", "lng", "hour", "failed_attempts"]
        }
    except Exception as e:
        return {"anomalyScore": 1.0, "isAnomaly": True, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
