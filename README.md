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

## Frontend (Next.js + shadcn/ui + Tailwind v3)

### What we built

- Dark mode with theme toggle and a left sidebar with logo
- Dashboard widgets using shadcn Cards and Lucide icons
- Appointments page (`/contacts`) with:
  - Import CSV modal and Add Patient modal
  - Table with Call and Summary actions
  - Call modal shows appointment details, DOB, and live call status
- Calls pages:
  - `/calls`: launch calls UI, selectable patients, schedule at, call history table with status badges, results preview, duration
  - `/calls/[id]`: detailed call page with structured VAPI results, summary, raw JSON for debugging

### Run the frontend

```
cd frontend
npm install
npm run dev
# Local: http://localhost:3000
```

Tailwind is pinned to v3 for compatibility; PostCSS uses `tailwindcss` and `autoprefixer`.

### CSV format (sample-data/patients_sample.csv)

Columns supported/expected:

```
name,gender,phone,appointment_date,appointment_time,doctor_name,dob
```

All fields are stored; `dob` is displayed in the call modal and forwarded to VAPI as a variable.

### Call flow and variables

1. Frontend launches calls via `POST /api/calls/launch` with:
   - `patientIds: number[]`
2. Backend creates call records and launches VAPI with variables:
   - Legacy keys: `name`, `gender`, `appointment_date`, `appointment_time`, `doctor_name`
   - Assistant keys: `app_date`, `app_time`, `full_name`, `dob`, `doctor`
3. End-of-call webhook stores `summary`, `structured_json`, and raw payload linked to the call.

### Manual API tests

Create a patient:

```
POST http://localhost:8000/api/contacts
{
  "name": "Test Patient",
  "gender": "male",
  "phone": "+13346335055",
  "dob": "1990-01-01",
  "appointment_date": "2025-09-27",
  "appointment_time": "14:30",
  "doctor_name": "Dr. Test"
}
```

Launch a call:

```
POST http://localhost:8000/api/calls/launch
{
  "patientIds": [1]
}
```

### Environment notes

- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Required `.env` keys: `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_PHONE_NUMBER_ID`, `FRONTEND_ORIGIN`

### Troubleshooting

- Port in use (3000/8000): stop prior processes or change ports.
- Tailwind PostCSS error: we use Tailwind v3; ensure `postcss.config.js` uses `tailwindcss` directly.
- `patientIds is required`: ensure payload uses `patientIds` (camelCase). Backend also accepts `patient_ids`.
- DOB missing in UI: ensure data contains `dob`; recreate DB if schema changed.
- Not Found for contacts: use `/api/contacts` (not `/api/patients`).

## Development notes

- Use `ngrok http 8000` to expose webhooks externally and set Vapi webhook URL to `https://<ngrok-id>.ngrok.io/webhooks/vapi/end-of-call`.
- Concurrency limited to 2 concurrent calls using a semaphore in memory.

## Recent changes (high-level)

- Implemented dark mode, sidebar, and shadcn UI components
- Rebuilt Appointments (`/contacts`) page with import/add/call modals
- Fixed Start Call flow; payload now `patientIds` and variables forwarded to VAPI
- Added DOB to DB schema, CSV import, UI, and VAPI variables
- Redesigned Calls pages (`/calls`, `/calls/[id]`) with status badges and structured results


