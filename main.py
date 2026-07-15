from pathlib import Path
import whisper

# ==========================
# Configuration
# ==========================
MODEL_NAME = "medium"  # tiny, base, small, medium, large
LANGUAGE = "vi"

INPUT_VIDEO = Path("data/input/demo.mp4")
OUTPUT_DIR = Path("data/transcript")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ==========================
# Check input
# ==========================
if not INPUT_VIDEO.exists():
    raise FileNotFoundError(f"Video not found: {INPUT_VIDEO}")

print(f"Loading Whisper model ({MODEL_NAME})...")

model = whisper.load_model(MODEL_NAME)

print("Transcribing video...")

result = model.transcribe(
    str(INPUT_VIDEO),
    language=LANGUAGE,
    fp16=False  # CPU phải để False
)

output_file = OUTPUT_DIR / f"{INPUT_VIDEO.stem}.txt"

with open(output_file, "w", encoding="utf-8") as f:
    f.write(result["text"])

print(f"\nDone!")
print(f"Transcript saved to: {output_file}")