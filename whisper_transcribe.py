import argparse
import json
import os
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Whisper Transcription Helper")
    parser.add_argument("--input", required=True, help="Path to input audio/video file")
    parser.add_argument("--output", required=True, help="Path to output json file")
    parser.add_argument("--model", default="base", help="Model size: tiny, base, small, medium, large")
    parser.add_argument("--language", default="vi", help="Language code")
    args = parser.parse_args()

    # Import whisper here to avoid load times on argument validation
    try:
        import whisper
    except ImportError:
        print("Error: openai-whisper library is not installed in the Python environment.")
        sys.exit(1)

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    print(f"Loading Whisper model ({args.model})...", flush=True)
    try:
        model = whisper.load_model(args.model)
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        sys.exit(1)

    print("Transcribing file...", flush=True)
    try:
        result = model.transcribe(
            str(input_path),
            language=args.language if args.language else None,
            fp16=False
        )
    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        sys.exit(1)

    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "id": str(seg.get("id", "")),
            "startMs": int(seg.get("start", 0) * 1000),
            "endMs": int(seg.get("end", 0) * 1000),
            "text": seg.get("text", "").strip()
        })

    output_data = {
        "text": result.get("text", ""),
        "subtitles": segments
    }

    try:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"Transcription successful. Saved to {args.output}", flush=True)
    except Exception as e:
        print(f"Error saving output JSON: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
