"""
AI Service Module for Remindly.

Uses Mistral LLM to generate smart, personalized reminder messages
for upcoming events and tasks.
"""
import os
import time
from typing import List, Optional
from datetime import datetime, timedelta
import httpx
from dotenv import load_dotenv

# Load .env file explicitly
load_dotenv()


class MistralAIService:
    """
    Service for generating AI-powered reminder messages using Mistral LLM.
    
    This service creates personalized, contextual reminders for upcoming 
    events within a 3-day window.
    
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
        event_title: str, 
        event_date: str,
        days_until: int,
        event_time: Optional[str] = None,
        event_description: Optional[str] = None,
        project_name: Optional[str] = None
    ) -> str:
        """
        Generate a personalized reminder message for an event.
        
        Args:
            event_title: Title of the event
            event_date: Date of the event (YYYY-MM-DD format)
            days_until: Number of days until the event
            event_time: Optional time of the event
            event_description: Optional event description
            project_name: Optional project name
            
        Returns:
            AI-generated reminder message or fallback message
        """
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
            return ai_message
        
        # Fallback message if API fails
        if days_until == 0:
            return f"⏰ Hari ini ada {event_title}! Jangan lupa ya!"
        elif days_until == 1:
            return f"📅 Besok ada {event_title}. Siapkan dari sekarang!"
        else:
            return f"🗓️ {event_title} akan berlangsung dalam {days_until} hari."
    
    def generate_summary(self, events: List[dict]) -> str:
        """
        Generate an overall AI summary of multiple upcoming events.
        
        Args:
            events: List of event dictionaries with title, date, days_until
            
        Returns:
            AI-generated summary of upcoming schedule
        """
        if not events:
            return "✨ Tidak ada tugas dalam 3 hari ke depan. Waktu santai!"
            
        event_list = "\n".join([
            f"- {e['title']} ({e['days_until']} hari lagi)" 
            for e in events[:5]  # Limit to 5 events for prompt
        ])
        
        prompt = (
            f"Kamu punya {len(events)} tugas dalam 3 hari ke depan:\n"
            f"{event_list}\n\n"
            f"Buat ringkasan singkat dan tips untuk mengatur waktu."
        )
        
        ai_summary = self._call_mistral(prompt, max_tokens=200)
        
        if ai_summary:
            return ai_summary
            
        # Fallback summary
        return f"📋 Kamu punya {len(events)} tugas dalam 3 hari ke depan. Semangat!"
    
    def chat_with_schedule_assistant(
        self, 
        user_message: str, 
        conversation_history: List[dict] = None,
        timezone: str = "Asia/Jakarta"
    ) -> dict:
        """
        Process a chat message with the schedule assistant.
        Can return either clarifying questions or a structured schedule proposal.
        
        Args:
            user_message: The user's message
            conversation_history: Previous messages in the conversation
            timezone: User's timezone
            
        Returns:
            Dict with 'type' ('chat' or 'schedule_proposal') and content
        """
        if not self.api_key:
            print("[AI Service] Chat request failed: API key not configured")
            return {
                "type": "error",
                "message": "AI API key not configured. Please set MISTRAL_API_KEY in .env file."
            }
        
        system_prompt = f"""Kamu adalah Asisten Jadwal Remindly, AI yang membantu pengguna membuat dan mengatur jadwal mereka. Selalu jawab dalam Bahasa Indonesia.

ATURAN PENTING:
1. Jika permintaan pengguna kurang detail (tanggal, waktu, durasi), ajukan 1-3 pertanyaan klarifikasi.
2. Jika sudah punya informasi lengkap, berikan jadwal dalam format JSON.
3. Gunakan timezone: {timezone}
4. Referensi tanggal: Gunakan hari ini sebagai basis untuk tanggal relatif (besok, lusa, dll).

FORMAT RESPONS:
- Untuk pertanyaan klarifikasi: Jawab dengan teks percakapan natural dalam Bahasa Indonesia.
- Untuk proposal jadwal: Berikan ringkasan singkat, lalu blok JSON dengan struktur PERSIS seperti ini:

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
      "notes": "Catatan opsional",
      "category": "Nama kategori"
    }}
  ]
}}
```

JSON harus valid dan bisa di-parse. Jangan ada komentar di dalam JSON."""

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

