import smtplib
from email.message import EmailMessage
from app.config import settings


def send_email(to: str, subject: str, body: str):
    msg = EmailMessage()
    msg["From"] = settings.email_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        raise RuntimeError(f"Email sending failed: {str(e)}")
