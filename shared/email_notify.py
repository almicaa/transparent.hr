"""Minimal SMTP notification helper — used by the scraper to email a summary
after each run. Credentials come from env vars, never hardcoded."""

import os
import smtplib
import ssl
from email.mime.text import MIMEText


def send_notification(subject: str, body: str) -> bool:
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "465"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    to_addr = os.environ.get("NOTIFY_EMAIL", user)

    if not all([host, user, password, to_addr]):
        print("[email] SMTP nije konfiguriran (nedostaju env varijable), preskačem notifikaciju.")
        return False

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to_addr

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context) as server:
            server.login(user, password)
            server.sendmail(user, [to_addr], msg.as_string())
        print(f"[email] Notifikacija poslana na {to_addr}.")
        return True
    except Exception as e:
        print(f"[email] Slanje nije uspjelo: {e}")
        return False
