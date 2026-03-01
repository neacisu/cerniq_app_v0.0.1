FROM python:3.13-slim
WORKDIR /app
RUN groupadd -g 1001 cerniq && useradd -u 1001 -g cerniq -s /bin/false cerniq
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chown -R cerniq:cerniq /app
USER cerniq
EXPOSE 64077
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:64077/health', timeout=2).read()"
CMD ["python", "main.py"]
