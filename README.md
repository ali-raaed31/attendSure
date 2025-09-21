# AttendSure

Demo app that uploads contacts, launches Vapi.ai outbound reminder calls, and stores results.

## Backend (FastAPI)

### Setup

1. Create a Python venv and install dependencies:

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
```

2. Create a `.env` with the following keys:

```
VAPI_API_KEY=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=
BASE_URL=http://localhost:8000
DATABASE_URL=sqlite:///./attendsure.db
FRONTEND_ORIGIN=http://localhost:3000
WEBHOOK_SECRET=
CONCURRENCY_LIMIT=2
ENVIRONMENT=development
USE_VAPI_SCHEDULER=true
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

3. Run the API:

```bash
uvicorn attendsure.app:app --reload --port 8000
```

### Endpoints

- POST `/api/contacts/upload` (multipart CSV or JSON body)
- POST `/api/contacts`
- GET `/api/contacts`
- POST `/api/calls/launch`
- GET `/api/calls`
- GET `/api/calls/{id}`
- POST `/webhooks/vapi/end-of-call`
- GET `/health`

## Frontend

Next.js app (TBD) using App Router and shadcn/ui.

## Development notes

- Use `ngrok http 8000` to expose webhooks externally and set Vapi webhook URL to `https://<ngrok-id>.ngrok.io/webhooks/vapi/end-of-call`.
- Concurrency limited to 2 concurrent calls using a semaphore in memory.


