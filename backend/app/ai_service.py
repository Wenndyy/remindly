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
        self.api_key = os.getenv("MISTRAL_API", "")
        self.base_url = "https://api.mistral.ai/v1/chat/completions"
        self.model = "mistral-small-latest"  # Cost-effective model for short messages
        
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


# Singleton instance
ai_service = MistralAIService()


def get_ai_service() -> MistralAIService:
    """Get the AI service singleton instance."""
    return ai_service
