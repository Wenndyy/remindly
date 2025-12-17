"""
AI Service Module for Remindly.

Uses Mistral LLM to generate smart, personalized reminder messages
for upcoming events and tasks.
"""
import os
import time
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import httpx
from dotenv import load_dotenv

# Load .env file explicitly
load_dotenv()

# =============================================================================
# IN-MEMORY CACHE FOR AI RESPONSES
# =============================================================================
_ai_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl = 3600  # 1 hour cache TTL
_executor = ThreadPoolExecutor(max_workers=10)  # For parallel AI calls


def _get_cache_key(prefix: str, event_id: int, event_date: str) -> str:
    """Generate cache key for AI responses."""
    return f"{prefix}_{event_id}_{event_date}"


def _get_from_cache(cache_key: str) -> Optional[str]:
    """Get value from cache if not expired."""
    if cache_key in _ai_cache:
        cached = _ai_cache[cache_key]
        if time.time() - cached['timestamp'] < _cache_ttl:
            return cached['value']
        else:
            # Clean up expired entry
            del _ai_cache[cache_key]
    return None


def _set_cache(cache_key: str, value: str) -> None:
    """Set value in cache with current timestamp."""
    _ai_cache[cache_key] = {
        'value': value,
        'timestamp': time.time()
    }


class MistralAIService:
    """
    Service for generating AI-powered reminder messages using Mistral LLM.
    
    This service creates personalized, contextual reminders for upcoming 
    events within a 3-day window. Includes caching to avoid redundant API calls.
    
    Attributes:
        api_key: Mistral API key from environment
        base_url: Mistral API endpoint
        model: Model to use for generation
    """
    
    def __init__(self):
        """Initialize Mistral AI service with API configuration."""
        # Check both possible env var names
        self.api_key = os.getenv("MISTRAL_API_KEY") or os.getenv("MISTRAL_API", "")
        self.base_url = "https://api.mistral.ai/v1/chat/completions"
        self.model = "mistral-small-latest"  # Cost-effective model for short messages
        
        # Log API key status at startup (without exposing the key)
        if self.api_key:
            print(f"[AI Service] MISTRAL API key loaded: True (length: {len(self.api_key)})")
        else:
            print("[AI Service] WARNING: MISTRAL API key NOT found! Set MISTRAL_API_KEY in .env")
        
    def _call_mistral(self, prompt: str, max_tokens: int = 150) -> Optional[str]:
        """
        Make API call to Mistral.
        
        Args:
            prompt: The prompt to send to Mistral
            max_tokens: Maximum tokens in response
            
        Returns:
            Generated text or None if API call fails
        """
        if not self.api_key:
            return None
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Kamu adalah asisten pengingat tugas yang ramah dan membantu. "
                               "Berikan pengingat singkat, jelas, dan memotivasi dalam Bahasa Indonesia. "
                               "Gunakan emoji yang relevan untuk membuat pesan lebih menarik. "
                               "Maksimal 2-3 kalimat."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": max_tokens,
            "temperature": 0.7
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    self.base_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Mistral API error: {str(e)}")
            return None
    
    def generate_reminder_message(
        self, 
        event_id: int,
        event_title: str, 
        event_date: str,
        days_until: int,
        event_time: Optional[str] = None,
        event_description: Optional[str] = None,
        project_name: Optional[str] = None
    ) -> str:
        """
        Generate a personalized reminder message for an event with caching.
        
        Args:
            event_id: Unique ID of the event (for cache key)
            event_title: Title of the event
            event_date: Date of the event (YYYY-MM-DD format)
            days_until: Number of days until the event
            event_time: Optional time of the event
            event_description: Optional event description
            project_name: Optional project name
            
        Returns:
            AI-generated reminder message or fallback message
        """
        # Check cache first
        cache_key = _get_cache_key("reminder", event_id, event_date)
        cached_value = _get_from_cache(cache_key)
        if cached_value:
            return cached_value
        
        # Build context for the prompt
        context_parts = [f"Judul: {event_title}"]
        
        if days_until == 0:
            context_parts.append("Waktu: HARI INI!")
        elif days_until == 1:
            context_parts.append("Waktu: BESOK!")
        else:
            context_parts.append(f"Waktu: {days_until} hari lagi ({event_date})")
            
        if event_time:
            context_parts.append(f"Jam: {event_time}")
            
        if project_name:
            context_parts.append(f"Proyek: {project_name}")
            
        if event_description:
            context_parts.append(f"Deskripsi: {event_description[:100]}")
        
        prompt = (
            f"Buat pengingat singkat dan memotivasi untuk tugas berikut:\n"
            f"{chr(10).join(context_parts)}\n\n"
            f"Buat pesan pengingat yang ramah dan membantu."
        )
        
        ai_message = self._call_mistral(prompt)
        
        if ai_message:
            # Cache the result
            _set_cache(cache_key, ai_message)
            return ai_message
        
        # Fallback message if API fails
        fallback = self._get_fallback_reminder(event_title, days_until)
        return fallback
    
    def _get_fallback_reminder(self, event_title: str, days_until: int) -> str:
        """Generate fallback reminder message when API fails."""
        if days_until == 0:
            return f"⏰ Hari ini ada {event_title}! Jangan lupa ya!"
        elif days_until == 1:
            return f"📅 Besok ada {event_title}. Siapkan dari sekarang!"
        else:
            return f"🗓️ {event_title} akan berlangsung dalam {days_until} hari."
    
    def generate_summary(self, events: List[dict], summary_date: str = None) -> str:
        """
        Generate an overall AI summary of multiple upcoming events with caching.
        
        Args:
            events: List of event dictionaries with title, date, days_until
            summary_date: Date for cache key (defaults to today)
            
        Returns:
            AI-generated summary of upcoming schedule
        """
        if not events:
            return "✨ Tidak ada jadwal hari ini. Waktu santai!"
        
        # Use today's date as cache key for summary
        if not summary_date:
            summary_date = datetime.now().strftime("%Y-%m-%d")
        
        # Create unique key based on event titles (sorted)
        event_titles = sorted([e.get('title', '') for e in events])
        cache_key = f"summary_{summary_date}_{hash(tuple(event_titles))}"
        
        cached_value = _get_from_cache(cache_key)
        if cached_value:
            return cached_value
            
        event_list = "\n".join([
            f"- {e['title']} ({e['days_until']} hari lagi)" 
            for e in events[:5]  # Limit to 5 events for prompt
        ])
        
        prompt = (
            f"Kamu punya {len(events)} jadwal hari ini:\n"
            f"{event_list}\n\n"
            f"Buat ringkasan singkat dan tips untuk mengatur waktu."
        )
        
        ai_summary = self._call_mistral(prompt, max_tokens=200)
        
        if ai_summary:
            _set_cache(cache_key, ai_summary)
            return ai_summary
            
        # Fallback summary
        return f"📋 Kamu punya {len(events)} jadwal hari ini. Semangat!"
    
    def chat_with_schedule_assistant(
        self, 
        user_message: str, 
        conversation_history: List[dict] = None,
        timezone: str = "Asia/Jakarta",
        user_events: List[dict] = None
    ) -> dict:
        """
        Process a chat message with the schedule assistant.
        Can return either clarifying questions or a structured schedule proposal.
        
        Args:
            user_message: The user's message
            conversation_history: Previous messages in the conversation
            timezone: User's timezone
            user_events: List of user's existing events for context
            
        Returns:
            Dict with 'type' ('chat' or 'schedule_proposal') and content
        """
        if not self.api_key:
            print("[AI Service] Chat request failed: API key not configured")
            return {
                "type": "error",
                "message": "AI API key not configured. Please set MISTRAL_API_KEY in .env file."
            }
        
        # Get current date for context
        today = datetime.now()
        today_str = today.strftime("%Y-%m-%d")
        tomorrow_str = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        today_display = today.strftime("%A, %d %B %Y")
        
        # Build events context if available
        events_context = ""
        if user_events:
            events_list = []
            for event in user_events[:15]:  # Limit to 15 events for context
                event_date = event.get('start_date', '')
                event_time = event.get('start_time', '')
                end_time = event.get('end_time', '')
                title = event.get('title', 'Untitled')
                location = event.get('location', '')
                
                event_str = f"- {title} pada {event_date}"
                if event_time:
                    event_str += f" jam {event_time}"
                    if end_time:
                        event_str += f"-{end_time}"
                if location:
                    event_str += f" di {location}"
                events_list.append(event_str)
            
            events_context = f"""
JADWAL PENGGUNA (dari database):
{chr(10).join(events_list)}
"""
        
        system_prompt = f"""Kamu adalah Asisten Jadwal Remindly, AI yang membantu pengguna mengatur jadwal kalender mereka. Selalu jawab dalam Bahasa Indonesia dengan ramah dan natural.

KONTEKS WAKTU:
- Hari ini: {today_display}
- Tanggal hari ini: {today_str}
- Tanggal besok: {tomorrow_str}
- Timezone: {timezone}
{events_context}

TUGAS UTAMA:
1. **Melihat Jadwal**: Jika pengguna bertanya tentang jadwal mereka (hari ini, besok, minggu ini), lihat data JADWAL PENGGUNA di atas dan sampaikan dengan natural.
2. **Membuat Jadwal Baru**: Jika pengguna ingin membuat jadwal baru, bantu dengan pertanyaan klarifikasi lalu berikan proposal JSON.
3. **Sapaan Biasa**: Jika hanya sapaan, balas ramah dan tawarkan bantuan.

CARA MEMBEDAKAN:
- "cek jadwal hari ini", "jadwal besok apa", "apa saja jadwalku" → LIHAT jadwal existing
- "buatkan jadwal", "tambah meeting", "ingatkan saya" → BUAT jadwal baru
- "halo", "hi", "apa kabar" → SAPAAN biasa

ATURAN RESPONS:
1. Untuk MELIHAT jadwal: Gunakan data JADWAL PENGGUNA di atas. Jika tidak ada jadwal, bilang "belum ada jadwal".
2. Untuk BUAT jadwal baru: Jika detail kurang (tanggal/waktu), tanya dulu. Jika lengkap, berikan JSON proposal.
3. Untuk sapaan: Balas ramah, tawarkan bantuan jadwal.

FORMAT JSON (HANYA untuk membuat jadwal baru dengan detail lengkap):
```json
{{
  "title": "Proposal Jadwal",
  "timezone": "{timezone}",
  "items": [
    {{
      "title": "Judul kegiatan",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "notes": "Catatan opsional"
    }}
  ]
}}
```

PENTING: 
- Jangan kirim JSON untuk pertanyaan tentang jadwal existing.
- Jangan ulangi proposal sebelumnya jika user bertanya tentang jadwalnya."""

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-10:]:  # Limit to last 10 messages
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        messages.append({"role": "user", "content": user_message})
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    self.base_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                ai_response = data["choices"][0]["message"]["content"].strip()
                
                # Check if response contains a schedule proposal (JSON block)
                import re
                json_match = re.search(r'```json\s*([\s\S]*?)\s*```', ai_response)
                
                if json_match:
                    try:
                        import json
                        schedule_data = json.loads(json_match.group(1))
                        # Extract text before the JSON block as summary
                        summary = ai_response[:json_match.start()].strip()
                        return {
                            "type": "schedule_proposal",
                            "message": summary if summary else "Here's your proposed schedule:",
                            "schedule": schedule_data
                        }
                    except json.JSONDecodeError:
                        pass
                
                # Regular chat response
                return {
                    "type": "chat",
                    "message": ai_response
                }
                
        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            print(f"[AI Service] Mistral API HTTP error: {error_detail}")
            return {
                "type": "error",
                "message": f"AI service error: {error_detail}"
            }
        except httpx.RequestError as e:
            print(f"[AI Service] Mistral API request error: {str(e)}")
            return {
                "type": "error",
                "message": f"AI service connection error: {str(e)}"
            }
        except Exception as e:
            import traceback
            print(f"[AI Service] Mistral API error in chat: {str(e)}")
            traceback.print_exc()
            return {
                "type": "error",
                "message": f"AI service error: {str(e)}"
            }
    
    def suggest_reminders(
        self,
        task_title: str,
        task_date: str,
        task_time: Optional[str] = None,
        task_type: Optional[str] = None
    ) -> dict:
        """
        Suggest reminder timings for a task.
        
        Returns:
            Dict with suggestions array and reasoning
        """
        if not self.api_key:
            # Return default suggestions if API unavailable
            return {
                "suggestions": [
                    {"label": "10 menit sebelumnya", "minutes_before": 10},
                    {"label": "1 jam sebelumnya", "minutes_before": 60},
                    {"label": "1 hari sebelumnya", "minutes_before": 1440}
                ],
                "reasoning_summary": "Saran pengingat default"
            }
        
        prompt = f"""Sarankan waktu pengingat yang optimal untuk tugas ini:
Judul: {task_title}
Tanggal: {task_date}
Waktu: {task_time or 'Tidak ditentukan'}
Tipe: {task_type or 'Umum'}

Kembalikan HANYA JSON valid dalam format ini (label dalam Bahasa Indonesia):
{{
  "suggestions": [
    {{"label": "10 menit sebelumnya", "minutes_before": 10}},
    {{"label": "1 jam sebelumnya", "minutes_before": 60}},
    {{"label": "1 hari sebelumnya", "minutes_before": 1440}}
  ],
  "reasoning_summary": "Penjelasan singkat dalam satu kalimat Bahasa Indonesia"
}}

Berikan 3 saran yang sesuai untuk jenis tugas ini."""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "Kamu adalah asisten yang membantu menyarankan waktu pengingat. Selalu jawab dengan JSON yang valid saja."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 300,
            "temperature": 0.3
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    self.base_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                ai_response = data["choices"][0]["message"]["content"].strip()
                
                import json
                import re
                # Try to extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', ai_response)
                if json_match:
                    return json.loads(json_match.group())
                    
        except Exception as e:
            print(f"Mistral API error in suggest_reminders: {str(e)}")
        
        # Fallback
        return {
            "suggestions": [
                {"label": "10 menit sebelumnya", "minutes_before": 10},
                {"label": "1 jam sebelumnya", "minutes_before": 60},
                {"label": "1 hari sebelumnya", "minutes_before": 1440}
            ],
            "reasoning_summary": "Saran pengingat default"
        }
    
    def suggest_alternative_times(
        self,
        conflicting_event_title: str,
        conflicting_start: str,
        conflicting_end: str,
        date: str,
        duration_minutes: int,
        existing_events: list = None
    ) -> dict:
        """
        Suggest alternative times when a schedule conflict is detected.
        
        Args:
            conflicting_event_title: Title of the conflicting event
            conflicting_start: Start time of conflicting event (HH:MM)
            conflicting_end: End time of conflicting event (HH:MM)
            date: Date of the event (YYYY-MM-DD)
            duration_minutes: Duration of the new event in minutes
            existing_events: List of existing events on that day
            
        Returns:
            Dict with suggested alternative time slots
        """
        # Calculate duration in hours for display
        duration_hours = duration_minutes / 60
        
        # Build existing events context
        events_context = ""
        if existing_events:
            events_list = []
            for event in existing_events:
                start = event.get('start_time', '')
                end = event.get('end_time', '')
                title = event.get('title', '')
                if start and end:
                    events_list.append(f"- {title}: {start} - {end}")
            if events_list:
                events_context = f"\n\nJadwal lain di hari yang sama:\n" + "\n".join(events_list)
        
        # Simple algorithm: find slots before and after conflict
        suggestions = []
        
        # Parse conflicting times
        try:
            conf_start_parts = conflicting_start.split(":")
            conf_end_parts = conflicting_end.split(":")
            conf_start_mins = int(conf_start_parts[0]) * 60 + int(conf_start_parts[1])
            conf_end_mins = int(conf_end_parts[0]) * 60 + int(conf_end_parts[1])
            
            # Suggestion 1: Before the conflicting event
            before_end_mins = conf_start_mins
            before_start_mins = before_end_mins - duration_minutes
            if before_start_mins >= 7 * 60:  # Not earlier than 07:00
                before_start = f"{before_start_mins // 60:02d}:{before_start_mins % 60:02d}"
                before_end = f"{before_end_mins // 60:02d}:{before_end_mins % 60:02d}"
                suggestions.append({
                    "label": "Sebelum",
                    "startTime": before_start,
                    "endTime": before_end
                })
            
            # Suggestion 2: After the conflicting event
            after_start_mins = conf_end_mins
            after_end_mins = after_start_mins + duration_minutes
            if after_end_mins <= 22 * 60:  # Not later than 22:00
                after_start = f"{after_start_mins // 60:02d}:{after_start_mins % 60:02d}"
                after_end = f"{after_end_mins // 60:02d}:{after_end_mins % 60:02d}"
                suggestions.append({
                    "label": "Setelah",
                    "startTime": after_start,
                    "endTime": after_end
                })
            
            # Suggestion 3: Afternoon slot (if not already covering that time)
            afternoon_start_mins = 14 * 60  # 14:00
            afternoon_end_mins = afternoon_start_mins + duration_minutes
            if (afternoon_start_mins >= conf_end_mins or afternoon_end_mins <= conf_start_mins) and afternoon_end_mins <= 18 * 60:
                afternoon_start = f"{afternoon_start_mins // 60:02d}:{afternoon_start_mins % 60:02d}"
                afternoon_end = f"{afternoon_end_mins // 60:02d}:{afternoon_end_mins % 60:02d}"
                suggestions.append({
                    "label": "Siang",
                    "startTime": afternoon_start,
                    "endTime": afternoon_end
                })
        except Exception as e:
            print(f"Error calculating alternative times: {e}")
        
        # If no suggestions found, provide defaults
        if not suggestions:
            suggestions = [
                {"label": "Pagi", "startTime": "09:00", "endTime": f"{9 + int(duration_minutes/60):02d}:{duration_minutes % 60:02d}"},
                {"label": "Siang", "startTime": "14:00", "endTime": f"{14 + int(duration_minutes/60):02d}:{duration_minutes % 60:02d}"}
            ]
        
        return {
            "suggestions": suggestions[:3],  # Max 3 suggestions
            "conflicting_event": conflicting_event_title
        }
    
    def parse_natural_language_task(self, user_input: str, current_date: str) -> dict:
        """
        Parse natural language into structured task/event data.
        
        Args:
            user_input: Natural language description of task
            current_date: Current date in YYYY-MM-DD format
            
        Returns:
            Dict with parsed task data or clarifying questions
        """
        if not self.api_key:
            return {
                "type": "error",
                "message": "AI service is temporarily unavailable. Please try again later."
            }
        
        prompt = f"""Parse this task request into structured data:
"{user_input}"

Current date: {current_date}

RULES:
1. If information is missing (date, time, duration), ask 1-3 clarifying questions.
2. For recurring tasks, use RRULE-like format.
3. Only return JSON if you have enough information.

For questions, respond naturally.
For complete tasks, return ONLY valid JSON:
{{
  "type": "schedule",
  "title": "Task title",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "all_day": false,
  "recurrence": null,
  "reminder": {{"minutes_before": 60}},
  "notes": ""
}}

For recurring: recurrence = {{"frequency": "WEEKLY", "by_day": ["MO", "WE", "FR"]}}"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a task parser assistant. Parse natural language into structured task data. Ask clarifying questions when needed."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.3
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    self.base_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                ai_response = data["choices"][0]["message"]["content"].strip()
                
                import json
                import re
                # Try to extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', ai_response)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group())
                        if "type" in parsed:
                            return {"type": "task", "data": parsed}
                    except json.JSONDecodeError:
                        pass
                
                # Return as clarifying response
                return {
                    "type": "clarification",
                    "message": ai_response
                }
                
        except Exception as e:
            print(f"Mistral API error in parse_natural_language: {str(e)}")
            return {
                "type": "error",
                "message": "AI service is temporarily unavailable. Please try again later."
            }


# Singleton instance
ai_service = MistralAIService()


def get_ai_service() -> MistralAIService:
    """Get the AI service singleton instance."""
    return ai_service

