# 🚀 Running CleanIQ from Scratch

Because CleanIQ is a robust, multi-modal application, it consists of two distinct subsystems that must **both** be running simultaneously to work:

1. **The Python Backend** (FastAPI - runs the AI models and dataset logic)
2. **The React Frontend** (Vite - runs the beautiful web dashboard you see in your browser)

Here are the detailed steps on how to execute them manually every time, as well as the quick automated shortcut!

---

## ⚡ Method 1: The One-Click Shortcut (Recommended)

1. Navigate to your main project folder: `C:\Users\hp\Desktop\BE PROJECT\claude_proj`
2. Locate the file named **`start_app.bat`**.
3. **Double-click it.**
4. It will safely spawn two background command prompt windows. One will trigger the backend, and the other will launch the frontend dashboard locally in your browser.

> [!NOTE] 
> Do not close the two black command prompt windows while developing! If you close them, the server cleanly shuts down.

---

## 🛠️ Method 2: The Manual Approach (If you want to view terminal logs)

If you ever need to restart one part of the application or want to see exactly what the Python models are doing, you can execute them locally in two separate terminals inside VSCode or Powershell.

### Step A: Starting the Backend

1. Open your first terminal.
2. Navigate exactly into the `backend` directory:
   ```bash
   cd backend
   ```
3. Activate the Python Virtual Environment (so it knows where your installed libraries like Pandas and Scikit-Learn are):
   ```bash
   .\venv\Scripts\activate
   ```
   *(You should see `(venv)` appear on the left side of your terminal line indicating success).*
4. Start the FastAPI server on port 8000:
   ```bash
   uvicorn main:app --reload
   ```
*(You will see a green text `Application startup complete` when it successfully binds)*.

### Step B: Starting the Frontend

1. Open a **second**, completely new terminal window (keep the backend one running!).
2. Navigate directly into the `frontend` directory:
   ```bash
   cd frontend
   ```
3. Boot the React development server:
   ```bash
   npm run dev
   ```
4. Look for the `Local: http://localhost:5173/` link inside the console, and click it (or CTRL+Click) to open your beautiful running CleanIQ pipeline in the browser!

---

> [!IMPORTANT]
> **API Key Reminder:** If the Chatbot LLM features ever fail to load, ensure your `.env` file within the `backend` folder contains a valid `GROQ_API_KEY=YOUR-KEY-HERE` configuration variable!
