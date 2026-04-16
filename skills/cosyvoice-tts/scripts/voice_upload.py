#!/usr/bin/env python3
"""
Voice Upload Script
Upload custom voice reference audio to SiliconFlow for voice cloning.
"""

import argparse
import base64
import json
import os
import sys
from pathlib import Path
import requests

# Configuration
SKILL_DIR = Path(__file__).parent.parent
CONFIG_FILE = SKILL_DIR / "config" / "settings.json"
TEMPLATES_DIR = SKILL_DIR / "templates"


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


def upload_voice(
    audio_path: str,
    name: str,
    text: str,
    config: dict = None
) -> str:
    """
    Upload reference audio for voice cloning.
    
    Args:
        audio_path: Path to reference audio file
        name: Custom name for the voice
        text: Transcript of the reference audio
        config: Configuration dict
    
    Returns:
        Voice URI string
    """
    config = config or load_config()
    
    url = "https://api.siliconflow.cn/v1/uploads/audio/voice"
    headers = {
        "Authorization": f"Bearer {config.get('api_key')}"
    }
    
    # Check file exists
    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    print(f"🎙️ Uploading voice: {name}")
    print(f"📁 Audio file: {audio_path}")
    print(f"📝 Transcript: {text[:50]}{'...' if len(text) > 50 else ''}")
    
    # Upload via file
    with open(audio_file, 'rb') as f:
        files = {'file': f}
        data = {
            'model': config.get('model', 'FunAudioLLM/CosyVoice2-0.5B'),
            'customName': name,
            'text': text
        }
        
        response = requests.post(url, headers=headers, files=files, data=data)
    
    if response.status_code != 200:
        print(f"❌ Upload failed: {response.text}")
        raise Exception(f"Upload failed: {response.status_code}")
    
    result = response.json()
    voice_uri = result.get('uri', '')
    
    print(f"✅ Voice uploaded successfully!")
    print(f"🎤 Voice URI: {voice_uri}")
    
    # Save to config
    if 'custom_voices' not in config:
        config['custom_voices'] = {}
    config['custom_voices'][name] = voice_uri
    save_config(config)
    
    return voice_uri


def upload_voice_base64(
    audio_path: str,
    name: str,
    text: str,
    config: dict = None
) -> str:
    """
    Upload reference audio using base64 encoding.
    """
    config = config or load_config()
    
    url = "https://api.siliconflow.cn/v1/uploads/audio/voice"
    headers = {
        "Authorization": f"Bearer {config.get('api_key')}",
        "Content-Type": "application/json"
    }
    
    # Read and encode audio file
    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    # Determine MIME type
    suffix = audio_file.suffix.lower()
    mime_types = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.opus': 'audio/opus'
    }
    mime_type = mime_types.get(suffix, 'audio/mpeg')
    
    with open(audio_file, 'rb') as f:
        audio_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    data = {
        'model': config.get('model', 'FunAudioLLM/CosyVoice2-0.5B'),
        'customName': name,
        'audio': f"data:{mime_type};base64,{audio_base64}",
        'text': text
    }
    
    print(f"🎙️ Uploading voice (base64): {name}")
    
    response = requests.post(url, headers=headers, data=json.dumps(data))
    
    if response.status_code != 200:
        print(f"❌ Upload failed: {response.text}")
        raise Exception(f"Upload failed: {response.status_code}")
    
    result = response.json()
    voice_uri = result.get('uri', '')
    
    print(f"✅ Voice uploaded successfully!")
    print(f"🎤 Voice URI: {voice_uri}")
    
    # Save to config
    if 'custom_voices' not in config:
        config['custom_voices'] = {}
    config['custom_voices'][name] = voice_uri
    save_config(config)
    
    return voice_uri


def main():
    parser = argparse.ArgumentParser(description='Upload custom voice for TTS')
    parser.add_argument('--audio', '-a', required=True, help='Path to reference audio file')
    parser.add_argument('--name', '-n', required=True, help='Custom voice name')
    parser.add_argument('--text', '-t', required=True, help='Transcript of reference audio')
    parser.add_argument('--base64', action='store_true', help='Use base64 encoding')
    
    args = parser.parse_args()
    
    config = load_config()
    
    if args.base64:
        voice_uri = upload_voice_base64(
            audio_path=args.audio,
            name=args.name,
            text=args.text,
            config=config
        )
    else:
        voice_uri = upload_voice(
            audio_path=args.audio,
            name=args.name,
            text=args.text,
            config=config
        )
    
    print(f"\n🎵 Voice ready! Use with:")
    print(f"   --voice {voice_uri}")
    
    return voice_uri


if __name__ == '__main__':
    main()