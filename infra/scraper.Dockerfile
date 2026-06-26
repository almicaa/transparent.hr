FROM mcr.microsoft.com/playwright/python:v1.60.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scraper ./scraper
COPY shared ./shared
COPY run_all_scrapers.py .

ENV PYTHONPATH=/app

CMD ["python", "run_all_scrapers.py"]
