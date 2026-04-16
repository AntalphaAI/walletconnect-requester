---
name: cosyvoice-tts
description: AI voice cloning TTS using SiliconFlow CosyVoice2 API. Supports custom voice cloning for Telegram and Discord. Use when you need to generate speech with a cloned voice or custom voice profile.
metadata:
  openclaw:
    emoji: "🎙️"
    os:
      - linux
    requires:
      bins:
        - python3
        - ffmpeg
---

# CosyVoice TTS Skill

> **Voice cloning TTS powered by SiliconFlow CosyVoice2-0.5B**

## Features

- 🎭 **Voice Cloning** - Clone any voice from 8-10 seconds of reference audio
- 🌐 **Multi-language** - Supports Chinese, English, Japanese, Korean, and Chinese dialects
- 💬 **Multi-platform** - Output to Telegram (OGG) and Discord (MP3/OGG)
- 🎵 **Emotion Control** - Generate speech with different emotional expressions

## Prerequisites

1. **SiliconFlow API Key** - Get from https://cloud.siliconflow.cn/account/ak
2. **FFmpeg** - For audio format conversion
3. **Python 3.8+** with `openai` and `requests` packages

## Installation

```bash
# Install dependencies
pip install openai requests

# FFmpeg (if not installed)
sudo apt install ffmpeg -y
```

## Configuration

Edit `config/settings.json`:

```json
{
  "api_key": "your-api-key",
  "model": "FunAudioLLM/CosyVoice2-0.5B",
  "default_voice": "claire",
  "default_format": "mp3",
  "default_speed": 1.0
}
```

## Commands

### `tts` - Generate Speech

```bash
# Basic usage
python3 scripts/tts_client.py --text "你好，这是一条测试语音"

# With custom voice
python3 scripts/tts_client.py --text "Hello" --voice speech:your-voice-uri

# Output to file
python3 scripts/tts_client.py --text "测试" --output /tmp/voice.mp3

# Specify format (mp3, wav, opus)
python3 scripts/tts_client.py --text "测试" --format opus
```

### `upload-voice` - Upload Custom Voice

```bash
# Upload reference audio for voice cloning
python3 scripts/voice_upload.py \
  --audio /path/to/reference.mp3 \
  --name "my-voice" \
  --text "Reference audio transcript"
```

### `list-voices` - List Available Voices

```bash
python3 scripts/voice_list.py
```

## Usage Examples

### In OpenClaw Session

```
# Generate voice message
cosyvoice-tts --text "主人，今天的日程已经安排好了"

# With emotion
cosyvoice-tts --text "<|endofprompt|>太开心了！今天天气真好！" --emotion happy
```

### Telegram Output

The skill automatically converts to OGG format for Telegram voice messages:

```bash
python3 scripts/tts_client.py --text "语音内容" --telegram
```

### Discord Output

```bash
python3 scripts/tts_client.py --text "语音内容" --discord
```

## Voice Cloning Guide

### Best Practices for Reference Audio

- **Duration**: 8-10 seconds (max 30s)
- **Quality**: Clear speech, no background noise
- **Format**: MP3 (192kbps+) or WAV
- **Content**: Natural speech with emotion

### Emotion Control

Use special tokens in input text:

```
<|endofprompt|>  # End of prompt, start generation
[laughter]       # Insert laughter
[sighs]          # Insert sigh
```

Example:
```
cosyvoice-tts --text "<|endofprompt|>今天真是太开心了！[laughter]终于放假了！"
```

## API Reference

This skill uses SiliconFlow's OpenAI-compatible API:

- **Endpoint**: `https://api.siliconflow.cn/v1`
- **Model**: `FunAudioLLM/CosyVoice2-0.5B`
- **Pricing**: Charged by UTF-8 byte count of input text

## Troubleshooting

### Voice not found error
- Run `list-voices` to check available voices
- Re-upload the reference audio if needed

### Audio quality issues
- Ensure reference audio is high quality
- Try adjusting `speed` parameter (0.25-4.0)

### Format conversion fails
- Install FFmpeg: `sudo apt install ffmpeg`

---

**Maintainer**: OpenClaw Team
**License**: MIT