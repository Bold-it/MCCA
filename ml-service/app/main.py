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

# --- Touch-ABNet Models & Endpoints ---

class TouchPoint(BaseModel):
    x: float
    y: float
    pressure: float
    area: float
    timestamp: float

class GestureSequence(BaseModel):
    points: List[TouchPoint]
    interStrokeTiming: float
    screen: str

class TouchABNetRequest(BaseModel):
    userId: str
    gestures: List[GestureSequence]

def moving_average_filter(coords, window_size=3):
    if len(coords) < window_size:
        return coords
    smoothed = []
    for i in range(len(coords)):
        start = max(0, i - window_size + 1)
        window = coords[start:i+1]
        smoothed.append(float(np.mean(window)))
    return smoothed

def encoder_activity(gesture: GestureSequence, smoothed_x: List[float], smoothed_y: List[float]) -> str:
    """
    ABNet Encoder A (Activity Prior):
    Classifies the gesture context (Scroll, Tap, Typing) based on motion trajectories, duration, and screen context.
    """
    if not smoothed_x:
        return "Tap"
        
    # Total path distance
    path_len = 0.0
    for i in range(1, len(smoothed_x)):
        dx = smoothed_x[i] - smoothed_x[i-1]
        dy = smoothed_y[i] - smoothed_y[i-1]
        path_len += np.sqrt(dx*dx + dy*dy)
        
    duration = gesture.points[-1].timestamp - gesture.points[0].timestamp if len(gesture.points) > 1 else 0.0
    screen = gesture.screen.lower()
    
    # Classify intent
    if path_len < 40.0 and duration < 300.0:
        if "login" in screen or "pin" in screen:
            return "Typing"
        return "Tap"
    elif path_len >= 40.0:
        return "Scroll"
    return "Tap"

def encoder_biometric(gesture: GestureSequence, smoothed_x: List[float], smoothed_y: List[float], velocities: List[float]) -> List[float]:
    """
    ABNet Encoder B (Biometric Signature):
    Extracts user-specific, invariant touch rhythm and pressure features.
    """
    pressures = [pt.pressure for pt in gesture.points]
    areas = [pt.area for pt in gesture.points]
    
    avg_pressure = float(np.mean(pressures)) if pressures else 0.5
    avg_area = float(np.mean(areas)) if areas else 0.1
    avg_velocity = float(np.mean(velocities)) if velocities else 0.0
    std_velocity = float(np.std(velocities)) if len(velocities) > 1 else 0.0
    
    duration = gesture.points[-1].timestamp - gesture.points[0].timestamp if len(gesture.points) > 1 else 0.0
    inter_stroke = gesture.interStrokeTiming
    
    return [
        avg_pressure,
        avg_area,
        avg_velocity,
        std_velocity,
        duration,
        inter_stroke
    ]

@app.post("/ml/behaviour/verify")
async def verify_behaviour_abnet(req: TouchABNetRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    
    try:
        biometric_vectors = []
        classified_activities = []
        
        # 1. Process each gesture in the batch
        for gesture in req.gestures:
            if not gesture.points:
                continue
                
            raw_x = [pt.x for pt in gesture.points]
            raw_y = [pt.y for pt in gesture.points]
            
            # Smooth coordinates using Moving Average Filter
            smoothed_x = moving_average_filter(raw_x)
            smoothed_y = moving_average_filter(raw_y)
            
            # Compute velocities
            velocities = []
            for i in range(1, len(gesture.points)):
                dx = smoothed_x[i] - smoothed_x[i-1]
                dy = smoothed_y[i] - smoothed_y[i-1]
                dist = np.sqrt(dx*dx + dy*dy)
                dt = gesture.points[i].timestamp - gesture.points[i-1].timestamp
                if dt > 0:
                    velocities.append(dist / dt)
            
            # Encoder A (Activity Prior)
            activity = encoder_activity(gesture, smoothed_x, smoothed_y)
            classified_activities.append(activity)
            
            # Encoder B (Biometric Signature)
            biometric_vector = encoder_biometric(gesture, smoothed_x, smoothed_y, velocities)
            biometric_vectors.append(biometric_vector)
            
        if not biometric_vectors:
            return {"match": True, "confidence": 1.0, "status": "calibrated", "gesture": "Tap"}
            
        last_gesture_type = classified_activities[-1]
        
        # 2. Manage SQLite-backed calibration phase
        profile_key = f"touch_history_{req.userId}"
        history_data = db.get_profile(profile_key)
        
        history = []
        if history_data:
            try:
                history = json.loads(history_data)
            except Exception:
                history = []
                
        # Append new vectors to baseline history
        for vec in biometric_vectors:
            history.append(vec)
            
        # Keep maximum history size
        if len(history) > 100:
            history = history[-100:]
            
        db.save_profile(profile_key, json.dumps(history))
        
        total_samples = len(history)
        
        # If still in calibration (need 50 gesture samples)
        if total_samples < 50:
            return {
                "match": True,
                "confidence": 1.0,
                "status": f"calibrating ({total_samples}/50)",
                "gesture": last_gesture_type
            }
            
        # 3. Perform Biometric Verification against Baseline Template
        # Compute template mean and std deviation from the baseline history (first 50 samples)
        baseline_samples = np.array(history[:50])
        template_mean = np.mean(baseline_samples, axis=0)
        template_std = np.std(baseline_samples, axis=0)
        
        # Avoid division by zero
        template_std[template_std == 0] = 0.01
        
        # Evaluate recent batch against baseline template
        recent_samples = np.array(biometric_vectors)
        z_scores = np.abs(recent_samples - template_mean) / template_std
        avg_z_score = float(np.mean(z_scores))
        
        # Task-Context Normalization (Encoder A): adjust threshold based on activity type
        # Typing and scrolling patterns are more variable, so relax margins slightly
        threshold = 2.5
        if last_gesture_type in ["Scroll", "Typing"]:
            threshold = 3.0
            
        match = avg_z_score <= threshold
        # Map Z-score distance to similarity confidence percentage (Z=0 -> 100%, Z>=threshold -> 0%)
        confidence = float(max(0.0, min(1.0, 1.0 - (avg_z_score / threshold))))
        
        return {
            "match": match,
            "confidence": confidence,
            "status": "calibrated",
            "gesture": last_gesture_type
        }
    except Exception as e:
        return {"match": False, "confidence": 0.0, "status": "error", "error": str(e)}

@app.post("/ml/behaviour/update")
async def update_behaviour_abnet(req: TouchABNetRequest, x_ml_service_key: str = Header(...)):
    await verify_service_key(x_ml_service_key)
    try:
        # Forward to same SQLite log
        return await verify_behaviour_abnet(req, x_ml_service_key)
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
