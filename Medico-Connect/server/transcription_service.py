import whisper
import librosa
import numpy as np
import soundfile as sf
import noisereduce as nr
import uuid
import os
import sys
import json
import requests
from typing import Dict
import re
import torch

# Check for GPU acceleration
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[Transcription] Using device: {device}")

# Load Whisper model with GPU support and smaller model for speed
model_size = "base"  # Options: tiny, base, small, medium, large
model = whisper.load_model(model_size, device=device)
print(f"[Transcription] Loaded {model_size} model on {device}")

AUDIO_DIR = "server/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# ---------------------------
# Audio Preprocessing
# ---------------------------

def preprocess_audio(input_path):
    y, sr = librosa.load(input_path, sr=16000)

    # Reject very short audio
    if len(y) < sr:
        raise ValueError("Audio too short")

    # Normalize volume
    y = librosa.util.normalize(y)

    # Noise reduction
    y = nr.reduce_noise(y=y, sr=sr, prop_decrease=0.9)

    # Trim silence
    y, _ = librosa.effects.trim(y, top_db=25)

    clean_path = f"{AUDIO_DIR}/clean_{uuid.uuid4()}.wav"
    sf.write(clean_path, y, sr)

    return clean_path

# ---------------------------
# Speech to Text
# ---------------------------

def speech_to_text(audio_path: str) -> dict:
    result = model.transcribe(
        audio_path,
        language="en",
        fp16=torch.cuda.is_available(),  # Use FP16 for GPU speed
        verbose=False  # Reduce output for speed
    )

    return {
        "text": result.get("text", "").strip(),
        "language": result.get("language", "unknown")
    }

# ---------------------------
# Intent Classification
# ---------------------------

INTENTS = [
    "APPOINTMENT",
    "ENQUIRY", 
    "GENERAL_ENQUIRY",
    "FOLLOW_UP",
    "MEDICAL_DICTATION",
    "NOT_INTERESTED"
]

INTENT_PATTERNS = {
    "APPOINTMENT": [
        "book an appointment",
        "schedule an appointment", 
        "want to see the doctor",
        "consult the doctor",
        "appointment availability",
        "when can i see",
        "available slots",
        "book a slot"
    ],

    "ENQUIRY": [
        "enquire about appointment",
        "appointment enquiry",
        "when is doctor available",
        "doctor availability", 
        "consultation timing",
        "appointment timing",
        "available for consultation",
        "doctor available",
        "consultation availability"
    ],

    "GENERAL_ENQUIRY": [
        "enquire about",
        "want to know",
        "need information",
        "can you tell me",
        "looking for details",
        "what is",
        "how much",
        "general information"
    ],

    "FOLLOW_UP": [
        "follow up",
        "checking again", 
        "previous consultation",
        "earlier appointment"
    ],

    "MEDICAL_DICTATION": [
        "dear doctor",
        "referral letter",
        "date of birth",
        "clinical examination",
        "on examination",
        "diagnosis",
        "treatment plan"
    ],

    "NOT_INTERESTED": [
        "not interested",
        "don't want",
        "stop calling",
        "no longer needed"
    ]
}

def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def score_intents(text: str) -> Dict[str, int]:
    scores = {intent: 0 for intent in INTENTS}

    for intent, patterns in INTENT_PATTERNS.items():
        for phrase in patterns:
            if phrase in text:
                scores[intent] += 1

    return scores

def resolve_intent(scores: Dict[str, int]) -> str:
    # If medical dictation is dominant → force MEDICAL_DICTATION
    if scores["MEDICAL_DICTATION"] >= 2:
        return "MEDICAL_DICTATION"

    # Not interested always wins
    if scores["NOT_INTERESTED"] >= 1:
        return "NOT_INTERESTED"

    # Pick highest scoring intent
    best_intent = max(scores, key=scores.get)

    # If no signal at all
    if scores[best_intent] == 0:
        return "GENERAL_ENQUIRY"  # safe default

    return best_intent

def classify_intent(text: str) -> Dict:
    normalized_text = normalize_text(text)
    scores = score_intents(normalized_text)
    final_intent = resolve_intent(scores)

    # Only appointment-related enquiries and actual appointments are hot leads
    is_hot = final_intent in ["APPOINTMENT", "ENQUIRY", "FOLLOW_UP"]

    confidence = min(0.95, 0.5 + (scores.get(final_intent, 0) * 0.15))

    return {
        "intent": final_intent,
        "confidence": round(confidence, 2),
        "scores": scores,
        "is_hot": is_hot
    }

# ---------------------------
# Main Processing Function
# ---------------------------

def process_audio_url(audio_url: str, twilio_sid: str, twilio_token: str) -> Dict:
    try:
        print(f"[Transcription] Starting transcription for URL: {audio_url}")
        
        # Download audio from Twilio
        response = requests.get(
            audio_url,
            auth=(twilio_sid, twilio_token),
            timeout=30
        )
        response.raise_for_status()
        
        print(f"[Transcription] Downloaded audio, size: {len(response.content)} bytes")
        
        # Save raw audio
        raw_audio_path = f"{AUDIO_DIR}/raw_{uuid.uuid4()}.wav"
        with open(raw_audio_path, 'wb') as f:
            f.write(response.content)
        
        print(f"[Transcription] Saved raw audio to: {raw_audio_path}")
        
        # Preprocess audio
        clean_audio_path = preprocess_audio(raw_audio_path)
        print(f"[Transcription] Preprocessed audio to: {clean_audio_path}")
        
        # Transcribe
        transcription_result = speech_to_text(clean_audio_path)
        print(f"[Transcription] Transcription result: {transcription_result['text']}")
        
        # Classify intent
        intent_result = classify_intent(transcription_result["text"])
        print(f"[Transcription] Intent classification: {intent_result}")
        
        # Clean up temp files
        os.remove(raw_audio_path)
        os.remove(clean_audio_path)
        
        return {
            "success": True,
            "transcription": transcription_result,
            "intent": intent_result
        }
        
    except Exception as e:
        print(f"[Transcription] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python transcription_service.py <audio_url> <twilio_sid> <twilio_token>"}))
        sys.exit(1)
    
    audio_url = sys.argv[1]
    twilio_sid = sys.argv[2]
    twilio_token = sys.argv[3]
    
    result = process_audio_url(audio_url, twilio_sid, twilio_token)
    print(json.dumps(result))