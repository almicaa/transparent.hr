FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY shared ./shared

WORKDIR /app/backend
ENV PYTHONPATH=/app
EXPOSE 8000

# Bring the database up to the code's schema before serving. If a migration
# fails the container exits, and Render keeps the previous deploy running.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
