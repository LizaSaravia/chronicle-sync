import os

from dotenv import load_dotenv

from .worker import ChronicleWorker

load_dotenv()

# Create worker instance
is_local = os.getenv("ENVIRONMENT", "development") != "production"
worker = ChronicleWorker(is_local=is_local)

# Export FastAPI app for uvicorn
app = worker.app
