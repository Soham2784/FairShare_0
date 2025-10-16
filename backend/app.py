from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from pathlib import Path

# Load the trained model from the same directory as this file
MODEL_PATH = Path(__file__).with_name("trip_cost_predictor.pkl")
model = joblib.load(MODEL_PATH)

app = FastAPI()

# Allow frontend (React) to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define what data we expect from the frontend
class TripData(BaseModel):
    destination: str
    days: int
    travel_way: str
    people: int
    avg_age: int
    gender: str

@app.get("/")
def root():
    return {"message": "Trip Cost Predictor API running!"}

@app.post("/predict")
def predict_trip(data: TripData):
    try:
        # Map incoming fields to the model's expected column names
        df = pd.DataFrame([{
            "destination": data.destination,
            "Duration (days)": data.days,
            "Transportation type": data.travel_way,
            "people": data.people,
            "avg_age": data.avg_age,
            "gender": data.gender,
        }])

        prediction = model.predict(df)[0]
        return {"predicted_total_cost": float(prediction)}
    except Exception as e:
        # Return error details to help diagnose model/pipeline issues
        return {"error": str(e)}
