#!/usr/bin/env python3
"""
TTS utility for OpenClaw agents.
Provides easy integration for voice output to Telegram and Discord.
"""

import json
import os
import sys
import tempfile
import subprocess
from pathlib import Path
from openai import OpenAI

# Configuration
SKILL_DIR = Path(__file__).parent.parent
CONFIG_FILE = SKILL_DIR / "config" / "settings.json"


def load_config():
    """Load configuration from settings.json"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}


def generate_speech(
    text: str,
    voice: str = None,
    emotion: str = None,
    format: str = "mp3"
) -> str:
    """
    Generate speech from text.
    
    Args:
        text: Text to convert to speech
        voice: Voice ID (optional, uses default from config)
        emotion: Emotion prefix (optional)
        format: Output format (mp3, opus, wav)
    
    Returns:
        Path to generated audio file
    """
    config = load_config()
    
    # Prepare text
    if emotion:
        text = f"<|endofprompt|>{text}"
    
    # Get voice
    if not voice:
        # Check for custom voices
        custom_voices = config.get('custom_voices', {})
        if 'jujingyi' in custom_voices:
            voice = custom_voices['jujingyi']
        else:
            voice = config.get('default_voice', 'FunAudioLLM/CosyVoice2-0.5B:claire')
    
    # Create client
    client = OpenAI(
        api_key=config.get('api_key'),
        base_url=config.get('base_url', 'https://api.siliconflow.cn/v1')
    )
    
    # Generate
    output_path = tempfile.mktemp(suffix=f'.{format}')
    
    with client.audio.speech.with_streaming_response.create(
        model=config.get('model', 'FunAudioLLM/CosyVoice2-0.5B'),
        voice=voice,
        input=text,
        response_format=format
    ) as response:
        response.stream_to_file(output_path)
    
    return output_path


def generate_telegram_voice(text: str, voice: str = None) -> str:
    """
    Generate voice message for Telegram (OGG format).
    
    Args:
        text: Text to convert to speech
        voice: Voice ID (optional)
    
    Returns:
        Path to OGG audio file
    """
    # Generate opus first
    opus_path = generate_speech(text, voice, format="opus")
    
    # Convert to OGG for Telegram
    ogg_path = opus_path.rsplit('.', 1)[0] + '.ogg'
    subprocess.run([
        'ffmpeg', '-y', '-i', opus_path,
        '-c:a', 'libopus', '-b:a', '128k',
        ogg_path
    ], check=True, capture_output=True)
    
    # Clean up opus
    os.remove(opus_path)
    
    return ogg_path


def generate_discord_voice(text: str, voice: str = None) -> str:
    """
    Generate voice message for Discord (MP3 format).
    
    Args:
        text: Text to convert to speech
        voice: Voice ID (optional)
    
    Returns:
        Path to MP3 audio file
    """
    return generate_speech(text, voice, format="mp3")


# CLI interface
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='TTS Utility')
    parser.add_argument('--text', '-t', required=True, help='Text to speak')
    parser.add_argument('--voice', '-v', help='Voice ID')
    parser.add_argument('--telegram', action='store_true', help='Output for Telegram (OGG)')
    parser.add_argument('--discord', action='store_true', help='Output for Discord (MP3)')
    parser.add_argument('--emotion', '-e', help='Add emotion prefix')
    
    args = parser.parse_args()
    
    if args.telegram:
        path = generate_telegram_voice(args.text, args.voice)
    elif args.discord:
        path = generate_discord_voice(args.text, args.voice)
    else:
        path = generate_speech(args.text, args.voice, args.emotion)
    
    print(path)