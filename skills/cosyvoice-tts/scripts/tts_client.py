#!/usr/bin/env python3
"""
CosyVoice TTS Client
Generate speech using SiliconFlow CosyVoice2 API with voice cloning support.
"""

import argparse
import json
import os
import sys
import tempfile
import subprocess
from pathlib import Path
import requests

# Configuration
SKILL_DIR = Path(__file__).parent.parent
CONFIG_FILE = SKILL_DIR / "config" / "settings.json"
TEMP_DIR = Path("/tmp/cosyvoice-tts")


def load_config():
    """Load configuration from settings.json"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_config(config):
    """Save configuration to settings.json"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def ensure_temp_dir():
    """Ensure temp directory exists"""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    return TEMP_DIR


def text_to_speech(
    text: str,
    voice: str = None,
    output: str = None,
    format: str = None,
    speed: float = None,
    config: dict = None
) -> str:
    """
    Convert text to speech using CosyVoice2 API.
    
    Args:
        text: Text to convert to speech
        voice: Voice ID (preset or custom)
        output: Output file path
        format: Audio format (mp3, wav, opus)
        speed: Speech speed (0.25-4.0)
        config: Configuration dict
    
    Returns:
        Path to generated audio file
    """
    config = config or load_config()
    
    # Use defaults from config
    voice = voice or config.get('default_voice', 'FunAudioLLM/CosyVoice2-0.5B:claire')
    format = format or config.get('default_format', 'mp3')
    speed = speed or config.get('default_speed', 1.0)
    
    # Ensure temp directory
    temp_dir = ensure_temp_dir()
    
    # Determine output path
    if output:
        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        import uuid
        output_path = temp_dir / f"{uuid.uuid4()}.{format}"
    
    # API endpoint
    url = "https://api.siliconflow.cn/v1/audio/speech"
    
    headers = {
        "Authorization": f"Bearer {config.get('api_key')}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": config.get('model', 'FunAudioLLM/CosyVoice2-0.5B'),
        "input": text,
        "voice": voice,
        "response_format": format,
        "speed": speed,
        "stream": True
    }
    
    print(f"🎙️ Generating speech with voice: {voice}")
    print(f"📝 Text: {text[:50]}{'...' if len(text) > 50 else ''}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, stream=True)
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            raise Exception(f"API request failed: {response.status_code}")
        
        # Write streaming response to file
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
        
        file_size = output_path.stat().st_size
        if file_size == 0:
            raise Exception("Generated file is empty")
        
        print(f"✅ Audio saved to: {output_path} ({file_size} bytes)")
        return str(output_path)
        
    except Exception as e:
        print(f"❌ Error generating speech: {e}")
        raise


def convert_to_ogg(input_path: str, output_path: str = None) -> str:
    """Convert audio to OGG format for Telegram"""
    output_path = output_path or input_path.rsplit('.', 1)[0] + '.ogg'
    
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:a', 'libopus', '-b:a', '128k',
        output_path
    ], check=True, capture_output=True)
    
    return output_path


def main():
    parser = argparse.ArgumentParser(description='CosyVoice TTS Client')
    parser.add_argument('--text', '-t', required=True, help='Text to convert to speech')
    parser.add_argument('--voice', '-v', help='Voice ID (preset or custom)')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--format', '-f', choices=['mp3', 'wav', 'opus'], help='Audio format')
    parser.add_argument('--speed', '-s', type=float, help='Speech speed (0.25-4.0)')
    parser.add_argument('--ogg', action='store_true', help='Convert to OGG for Telegram')
    parser.add_argument('--telegram', action='store_true', help='Output OGG format for Telegram')
    parser.add_argument('--discord', action='store_true', help='Output MP3 format for Discord')
    parser.add_argument('--emotion', '-e', help='Add emotion prefix to text')
    
    args = parser.parse_args()
    
    # Prepare text with emotion if specified
    text = args.text
    if args.emotion:
        text = f"<|endofprompt|>{text}"
    
    # Determine format based on platform
    format = args.format
    if args.telegram:
        format = 'opus'  # Will convert to OGG later
    elif args.discord:
        format = 'mp3'
    
    # Load config
    config = load_config()
    
    # Generate speech
    output_path = text_to_speech(
        text=text,
        voice=args.voice,
        output=args.output,
        format=format,
        speed=args.speed,
        config=config
    )
    
    # Convert to OGG if requested
    if args.telegram or args.ogg:
        ogg_path = convert_to_ogg(output_path)
        print(f"📱 Telegram OGG: {ogg_path}")
        output_path = ogg_path
    
    # Output result
    print(f"\n🎵 Generated audio: {output_path}")
    return output_path


if __name__ == '__main__':
    main()