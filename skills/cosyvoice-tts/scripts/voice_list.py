#!/usr/bin/env python3
"""
Voice List Script
List available voices from SiliconFlow.
"""

import json
import requests
from pathlib import Path

# Configuration
SKILL_DIR = Path(__file__).parent.parent
CONFIG_FILE = SKILL_DIR / "config" / "settings.json"


def load_config():
    """Load configuration from settings.json"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}


def list_voices(config: dict = None):
    """List all available voices"""
    config = config or load_config()
    
    url = "https://api.siliconflow.cn/v1/audio/voice/list"
    headers = {
        "Authorization": f"Bearer {config.get('api_key')}"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to list voices: {response.text}")
        return []
    
    voices = response.json()
    return voices


def main():
    config = load_config()
    
    print("🎙️ Available Voices\n")
    print("=" * 60)
    
    # System preset voices
    print("\n📌 System Preset Voices:")
    print("-" * 40)
    
    preset_voices = [
        ("alex", "沉稳男声", "FunAudioLLM/CosyVoice2-0.5B:alex"),
        ("benjamin", "低沉男声", "FunAudioLLM/CosyVoice2-0.5B:benjamin"),
        ("charles", "磁性男声", "FunAudioLLM/CosyVoice2-0.5B:charles"),
        ("david", "欢快男声", "FunAudioLLM/CosyVoice2-0.5B:david"),
        ("anna", "沉稳女声", "FunAudioLLM/CosyVoice2-0.5B:anna"),
        ("bella", "激情女声", "FunAudioLLM/CosyVoice2-0.5B:bella"),
        ("claire", "温柔女声", "FunAudioLLM/CosyVoice2-0.5B:claire"),
        ("diana", "欢快女声", "FunAudioLLM/CosyVoice2-0.5B:diana"),
    ]
    
    for name, desc, voice_id in preset_voices:
        print(f"  {name:12} - {desc:10} ({voice_id})")
    
    # Custom voices from config
    custom_voices = config.get('custom_voices', {})
    if custom_voices:
        print("\n🎭 Custom Voices:")
        print("-" * 40)
        for name, uri in custom_voices.items():
            print(f"  {name:12} - {uri}")
    
    # Try to get user voices from API
    try:
        api_voices = list_voices(config)
        if api_voices:
            print("\n☁️ Cloud Voices:")
            print("-" * 40)
            for voice in api_voices:
                name = voice.get('customName', 'Unknown')
                uri = voice.get('uri', '')
                print(f"  {name:12} - {uri}")
    except Exception as e:
        pass  # API might require additional auth
    
    print("\n" + "=" * 60)
    print("\n💡 Usage:")
    print("   python3 scripts/tts_client.py --text '你好' --voice FunAudioLLM/CosyVoice2-0.5B:claire")
    print("   python3 scripts/tts_client.py --text '你好' --voice speech:your-voice-uri")


if __name__ == '__main__':
    main()