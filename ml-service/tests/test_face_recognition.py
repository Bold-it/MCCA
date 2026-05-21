import pytest
import numpy as np
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)
ML_SERVICE_KEY = "your-secure-ml-key"

def test_face_enrol_requires_auth():
    response = client.post("/ml/face/enrol", json={"userId": "123", "images": []})
    assert response.status_code == 403

def test_face_enrol_minimum_images():
    headers = {"X-ML-Service-Key": ML_SERVICE_KEY}
    response = client.post("/ml/face/enrol", headers=headers, json={"userId": "123", "images": ["a", "b"]})
    assert response.status_code == 400
    assert "Minimum 5 images required" in response.json()["detail"]

def test_anomaly_analysis_score():
    headers = {"X-ML-Service-Key": ML_SERVICE_KEY}
    response = client.post("/ml/anomaly/analyse", headers=headers, json={"userId": "123", "signals": {"loc": 1}})
    assert response.status_code == 200
    assert "anomalyScore" in response.json()
    assert response.json()["isAnomaly"] is False

def test_behaviour_update():
    headers = {"X-ML-Service-Key": ML_SERVICE_KEY}
    response = client.post("/ml/behaviour/update", headers=headers, json={
        "userId": "123",
        "events": [{"type": "touch", "x": 10, "y": 20, "pressure": 0.5, "timestamp": 123456789}]
    })
    assert response.status_code == 200
    assert response.json()["success"] is True
