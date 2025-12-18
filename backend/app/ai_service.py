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
4. **Berikan Alamat**: Jika pengguna bertanya tentang alamat, berikan alamat YASIR yaitu pada "Komplek Permata Buah Batu, Blok C No 29".

CARA MEMBEDAKAN:
- "cek jadwal hari ini", "jadwal besok apa", "apa saja jadwalku" → LIHAT jadwal existing
- "buatkan jadwal", "tambah meeting", "ingatkan saya" → BUAT jadwal baru
- "halo", "hi", "apa kabar" → SAPAAN biasa
- "rumah yasir", "rumah yassir", "rumah subhan", "rumah ambabhan" → BERIKAN ALAMAT YASIR

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
        existing_events: list = None,
        current_time: str = None,
        current_date: str = None
    ) -> dict:
        """
        Suggest alternative times when a schedule conflict is detected.
        Uses Mistral AI for smart recommendations that consider current time.
        
        Args:
            conflicting_event_title: Title of the conflicting event
            conflicting_start: Start time of conflicting event (HH:MM)
            conflicting_end: End time of conflicting event (HH:MM)
            date: Date of the event (YYYY-MM-DD)
            duration_minutes: Duration of the new event in minutes
            existing_events: List of existing events on that day
            current_time: Current time (HH:MM) - to filter past suggestions
            current_date: Current date (YYYY-MM-DD) - to check if scheduling for today
            
        Returns:
            Dict with suggested alternative time slots
        """
        # Parse current time for filtering
        current_time_mins = None
        is_today = False
        
        if current_date and date == current_date and current_time:
            is_today = True
            try:
                ct_parts = current_time.split(":")
                current_time_mins = int(ct_parts[0]) * 60 + int(ct_parts[1])
            except Exception:
                current_time_mins = None
        
        # Build existing events context for AI
        events_context = ""
        busy_slots = []
        if existing_events:
            events_list = []
            for event in existing_events:
                start = event.get('start_time', '')
                end = event.get('end_time', '')
                title = event.get('title', '')
                if start and end:
                    events_list.append(f"- {title}: {start} - {end}")
                    busy_slots.append({"start": start, "end": end, "title": title})
            if events_list:
                events_context = "\n".join(events_list)
        
        # Try AI-powered suggestions first
        if self.api_key:
            ai_suggestions = self._get_ai_alternative_times(
                conflicting_event_title=conflicting_event_title,
                conflicting_start=conflicting_start,
                conflicting_end=conflicting_end,
                date=date,
                duration_minutes=duration_minutes,
                events_context=events_context,
                current_time=current_time if is_today else None,
                is_today=is_today
            )
            if ai_suggestions:
                # Filter past suggestions if scheduling for today
                if is_today and current_time_mins is not None:
                    ai_suggestions = self._filter_past_suggestions(ai_suggestions, current_time_mins)
                
                if ai_suggestions:
                    return {
                        "suggestions": ai_suggestions[:3],
                        "conflicting_event": conflicting_event_title
                    }
        
        # Fallback: Simple algorithm with current time awareness
        suggestions = []
        
        try:
            conf_start_parts = conflicting_start.split(":")
            conf_end_parts = conflicting_end.split(":")
            conf_start_mins = int(conf_start_parts[0]) * 60 + int(conf_start_parts[1])
            conf_end_mins = int(conf_end_parts[0]) * 60 + int(conf_end_parts[1])
            
            # Minimum start time: either 07:00 or current_time + 15 min buffer (if today)
            min_start_mins = 7 * 60
            if is_today and current_time_mins is not None:
                min_start_mins = max(min_start_mins, current_time_mins + 15)
            
            # Suggestion 1: Before the conflicting event (only if feasible)
            before_end_mins = conf_start_mins
            before_start_mins = before_end_mins - duration_minutes
            if before_start_mins >= min_start_mins:
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
            if after_start_mins >= min_start_mins and after_end_mins <= 22 * 60:
                after_start = f"{after_start_mins // 60:02d}:{after_start_mins % 60:02d}"
                after_end = f"{after_end_mins // 60:02d}:{after_end_mins % 60:02d}"
                suggestions.append({
                    "label": "Setelah",
                    "startTime": after_start,
                    "endTime": after_end
                })
            
            # Suggestion 3: Find a free slot that doesn't conflict with anything
            # Try afternoon if available
            afternoon_start_mins = max(14 * 60, min_start_mins)
            afternoon_end_mins = afternoon_start_mins + duration_minutes
            if (afternoon_start_mins >= conf_end_mins or afternoon_end_mins <= conf_start_mins) and afternoon_end_mins <= 18 * 60:
                # Check against other existing events
                slot_available = True
                for slot in busy_slots:
                    try:
                        slot_start = int(slot["start"].split(":")[0]) * 60 + int(slot["start"].split(":")[1])
                        slot_end = int(slot["end"].split(":")[0]) * 60 + int(slot["end"].split(":")[1])
                        if afternoon_start_mins < slot_end and afternoon_end_mins > slot_start:
                            slot_available = False
                            break
                    except Exception:
                        continue
                
                if slot_available:
                    afternoon_start = f"{afternoon_start_mins // 60:02d}:{afternoon_start_mins % 60:02d}"
                    afternoon_end = f"{afternoon_end_mins // 60:02d}:{afternoon_end_mins % 60:02d}"
                    suggestions.append({
                        "label": "Siang",
                        "startTime": afternoon_start,
                        "endTime": afternoon_end
                    })
            
            # If still no suggestions, try morning slot
            if len(suggestions) < 2:
                morning_start_mins = max(9 * 60, min_start_mins)
                morning_end_mins = morning_start_mins + duration_minutes
                if (morning_start_mins >= conf_end_mins or morning_end_mins <= conf_start_mins) and morning_end_mins <= 12 * 60:
                    slot_available = True
                    for slot in busy_slots:
                        try:
                            slot_start = int(slot["start"].split(":")[0]) * 60 + int(slot["start"].split(":")[1])
                            slot_end = int(slot["end"].split(":")[0]) * 60 + int(slot["end"].split(":")[1])
                            if morning_start_mins < slot_end and morning_end_mins > slot_start:
                                slot_available = False
                                break
                        except Exception:
                            continue
                    
                    if slot_available:
                        morning_start = f"{morning_start_mins // 60:02d}:{morning_start_mins % 60:02d}"
                        morning_end = f"{morning_end_mins // 60:02d}:{morning_end_mins % 60:02d}"
                        suggestions.append({
                            "label": "Pagi",
                            "startTime": morning_start,
                            "endTime": morning_end
                        })
                        
        except Exception as e:
            print(f"Error calculating alternative times: {e}")
        
        # If no suggestions found, provide defaults that respect current time
        if not suggestions:
            if is_today and current_time_mins is not None:
                # For today, only suggest future times
                next_hour = ((current_time_mins // 60) + 1) * 60 + 30  # Next hour + 30 min
                if next_hour + duration_minutes <= 22 * 60:
                    suggestions.append({
                        "label": "Segera",
                        "startTime": f"{next_hour // 60:02d}:{next_hour % 60:02d}",
                        "endTime": f"{(next_hour + duration_minutes) // 60:02d}:{(next_hour + duration_minutes) % 60:02d}"
                    })
            else:
                suggestions = [
                    {"label": "Pagi", "startTime": "09:00", "endTime": f"{9 + int(duration_minutes/60):02d}:{duration_minutes % 60:02d}"},
                    {"label": "Siang", "startTime": "14:00", "endTime": f"{14 + int(duration_minutes/60):02d}:{duration_minutes % 60:02d}"}
                ]
        
        return {
            "suggestions": suggestions[:3],
            "conflicting_event": conflicting_event_title
        }
    
    def _filter_past_suggestions(self, suggestions: list, current_time_mins: int) -> list:
        """Filter out suggestions that start before current time + 15 min buffer."""
        filtered = []
        min_start = current_time_mins + 15  # 15 minute buffer
        
        for suggestion in suggestions:
            try:
                start_parts = suggestion["startTime"].split(":")
                start_mins = int(start_parts[0]) * 60 + int(start_parts[1])
                if start_mins >= min_start:
                    filtered.append(suggestion)
            except Exception:
                continue
        
        return filtered
    
    def _get_ai_alternative_times(
        self,
        conflicting_event_title: str,
        conflicting_start: str,
        conflicting_end: str,
        date: str,
        duration_minutes: int,
        events_context: str,
        current_time: str = None,
        is_today: bool = False
    ) -> list:
        """
        Use Mistral AI to suggest smart alternative time slots.
        
        Returns:
            List of time slot suggestions or None if AI fails
        """
        if not self.api_key:
            return None
        
        current_time_context = ""
        if is_today and current_time:
            current_time_context = f"\nWAKTU SEKARANG: {current_time} (Hari ini! Jangan sarankan waktu yang sudah lewat)"
        
        events_info = ""
        if events_context:
            events_info = f"\nJADWAL LAIN HARI ITU:\n{events_context}"
        
        prompt = f"""Kamu adalah asisten penjadwalan yang membantu mencari waktu alternatif untuk jadwal yang bentrok.

KONTEKS:
- Tanggal yang diminta: {date}
- Durasi kegiatan: {duration_minutes} menit
- Jadwal yang bentrok: "{conflicting_event_title}" pada {conflicting_start} - {conflicting_end}{current_time_context}{events_info}

TUGAS:
Sarankan 2-3 slot waktu alternatif yang:
1. TIDAK bentrok dengan jadwal yang ada
2. Masih dalam jam wajar (07:00 - 22:00)
3. Jika hari ini, HARUS setelah waktu sekarang (minimal 15 menit dari sekarang)
4. Prioritaskan jam kerja normal (09:00-17:00) jika memungkinkan

JAWAB HANYA dalam format JSON berikut:
{{
  "slots": [
    {{"label": "Nama singkat (Pagi/Siang/Sore/Malam/Setelah)", "start": "HH:MM", "end": "HH:MM"}},
    {{"label": "Nama singkat", "start": "HH:MM", "end": "HH:MM"}}
  ]
}}

PENTING: 
- Hanya berikan JSON, tanpa penjelasan tambahan
- Pastikan durasi setiap slot = {duration_minutes} menit
- Jangan sarankan waktu yang sudah lewat jika ini hari ini"""

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "Kamu adalah asisten penjadwalan. Selalu jawab dengan JSON yang valid saja."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 300,
                "temperature": 0.3
            }
            
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
                
                # Extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', ai_response)
                if json_match:
                    parsed = json.loads(json_match.group())
                    slots = parsed.get("slots", [])
                    
                    # Convert to expected format
                    suggestions = []
                    for slot in slots:
                        suggestions.append({
                            "label": slot.get("label", "Alternatif"),
                            "startTime": slot.get("start", ""),
                            "endTime": slot.get("end", "")
                        })
                    
                    return suggestions if suggestions else None
                    
        except Exception as e:
            print(f"[AI Service] Error getting AI alternative times: {e}")
        
        return None
    
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

    def generate_invitation_email(
        self,
        event_title: str,
        event_date: str,
        event_time: Optional[str],
        meeting_type: str,  # 'onsite' | 'online'
        location: Optional[str],
        meeting_link: Optional[str],
        organizer_name: str,
        description: Optional[str]
    ) -> Dict[str, str]:
        """
        Generate formal invitation email for guests (email-only),
        based on meeting_type: onsite or online.
        """

        cache_key = f"email_invite_{event_title}_{event_date}_{meeting_type}"
        cached = _get_from_cache(cache_key)
        if cached:
            return cached

        # Validasi meeting_type
        meeting_type = meeting_type.lower()
        # Tentukan label lokasi berdasarkan meeting_type
        if meeting_type == "online":
            location_label = "Tautan Meeting"
            location_value = location or "Akan diinformasikan"
        else:
            location_label = "Tempat Acara"
            location_value = location or "Akan diinformasikan"

        context_parts = [
            f"Judul Acara: {event_title}",
            f"Tanggal: {event_date}",
            f"Waktu: {event_time or 'Menyesuaikan'}",
            f"{location_label}: {location_value}",
            f"Penyelenggara: {organizer_name}",
            f"Jenis Acara: {'Tatap Muka (Onsite)' if meeting_type == 'onsite' else 'Daring (Online)'}",
        ]

        


        if description:
            context_parts.append(f"Deskripsi: {description[:200]}")

        system_prompt = (
            "Kamu adalah asisten profesional yang MENULIS EMAIL UNDANGAN RESMI.\n"
            "Gunakan Bahasa Indonesia FORMAL dan BAKU.\n\n"
            "ATURAN WAJIB:\n"
            "- Gunakan sapaan umum: 'Yth. Bapak/Ibu'\n"
            "- Jangan menyebut nama penerima\n"
            "- Jangan gunakan emoji\n"
            "- Jelaskan dengan jelas apakah acara ONLINE atau ONSITE\n"
            "- Jika ONLINE, sertakan tautan meeting\n"
            "- Jika ONSITE, sertakan lokasi acara\n"
            "- Sertakan ajakan konfirmasi kehadiran\n\n"
            "STRUKTUR EMAIL WAJIB:\n"   
            "1. Salam pembuka\n"
            "2. Maksud undangan\n"
            "3. Detail acara (tanggal, waktu, lokasi/tautan)\n"
            "4. Ajakan konfirmasi kehadiran\n"
            "5. Penutup dan nama penyelenggara\n\n"
            "FORMAT OUTPUT (HARUS PERSIS):\n"
            "Subject: <judul email>\n"
            "Body:\n"
            "<isi email lengkap tanpa markdown>"
        )

        user_prompt = (
            "KONTEKS ACARA:\n"
            + "\n".join(context_parts)
            + "\n\nTulis email undangan resmi sesuai aturan di atas."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 450,
            "temperature": 0.3
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                response.raise_for_status()

                content = response.json()["choices"][0]["message"]["content"].strip()
                parsed = self._parse_invitation_email(content)

                if parsed["subject"] and parsed["body"]:
                    _set_cache(cache_key, parsed)
                    return parsed

        except Exception as e:
            print(f"[AI Service] Invitation email generation failed: {str(e)}")

        fallback = self._fallback_invitation_by_type(
            event_title,
            event_date,
            event_time,
            meeting_type,
            location,
            meeting_link,
            organizer_name,
        )
        _set_cache(cache_key, fallback)
        return fallback




    def _parse_invitation_email(self, text: str) -> Dict[str, str]:
        subject = ""
        body_lines = []
        in_body = False

        for line in text.splitlines():
            line = line.strip()
            if line.lower().startswith("subject:"):
                subject = line.replace("Subject:", "").strip()
            elif line.lower().startswith("body"):
                in_body = True
            elif in_body:
                body_lines.append(line)

        body = "\n".join(body_lines).strip()

        return {
            "subject": subject,
            "body": body
        }

    def _fallback_invitation_by_type(
        self,
        event_title: str,
        event_date: str,
        event_time: Optional[str],
        meeting_type: str,
        location: Optional[str],
        meeting_link: Optional[str],
        organizer_name: str
    ) -> Dict[str, str]:

        is_online = meeting_type == "online"

        subject = f"Undangan {'Rapat' if is_online else 'Acara'}: {event_title}"

        location_label = "Tautan Meeting" if is_online else "Tempat Acara"
        location_value = (
            meeting_link if is_online and meeting_link
            else location if location
            else "Akan diinformasikan"
        )

        meeting_phrase = (
            "yang akan dilaksanakan secara daring"
            if is_online
            else "yang akan diselenggarakan secara luring"
        )

        body = f"""
    Yth. Bapak/Ibu,

Dengan hormat,

Sehubungan dengan akan dilaksanakannya kegiatan "{event_title}", bersama ini kami mengundang
Bapak/Ibu untuk berkenan menghadiri acara tersebut {meeting_phrase}, dengan rincian sebagai berikut:

Judul Acara   : {event_title}
Hari/Tanggal : {event_date}
Waktu         : {event_time or 'Menyesuaikan'}
{location_label} : {location_value}

Demikian undangan ini kami sampaikan. Besar harapan kami Bapak/Ibu dapat
berkenan hadir serta melakukan konfirmasi kehadiran sebelum acara berlangsung.

Atas perhatian dan partisipasi Bapak/Ibu, kami ucapkan terima kasih.

Hormat kami,

Panitia
    """

        return {
            "subject": subject,
            "body": body.strip()
        }

# Singleton instance
ai_service = MistralAIService()


def get_ai_service() -> MistralAIService:
    """Get the AI service singleton instance."""
    return ai_service

