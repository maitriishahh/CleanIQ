@echo off
echo Starting CleanIQ...

echo Starting FastAPI Backend...
cd backend
start cmd /k ".\venv\Scripts\activate && uvicorn main:app --reload"

echo Starting React Frontend...
cd ../frontend
start cmd /k "npm run dev"

echo CleanIQ is starting in separate windows!
exit
