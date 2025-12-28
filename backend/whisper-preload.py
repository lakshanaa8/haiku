#!/usr/bin/env python3
"""
Preload Whisper model at server startup to avoid loading delays
"""
import whisper
import torch
import sys

def preload_whisper():
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model_size = "base"  # Fast model for real-time processing
        
        print(f"[Whisper] Preloading {model_size} model on {device}...")
        model = whisper.load_model(model_size, device=device)
        print(f"[Whisper] Model preloaded successfully")
        
        return True
    except Exception as e:
        print(f"[Whisper] Failed to preload model: {e}")
        return False

if __name__ == "__main__":
    success = preload_whisper()
    sys.exit(0 if success else 1)