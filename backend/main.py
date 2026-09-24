import os
import shutil
import uuid
import json
import pandas as pd
from typing import Optional, Dict
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from starlette.background import BackgroundTask
from fastapi.middleware.cors import CORSMiddleware
import io
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dotenv import load_dotenv

from database import engine, SessionLocal, Base
from models import DataSession, IssueLog, CleaningAction
from services.tabular import profile_tabular_data, clean_tabular_data
from services.vision import profile_images, clean_images
from services.llm import generate_chat_response
from services.report import generate_pdf_report

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CleanIQ API", description="Data Quality Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Store mapping: session_id -> {"original": DataFrame, "current": DataFrame}
ACTIVE_DATAFRAMES = {}
IMAGE_ISSUES_CACHE = {}
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def cleanup_files(*paths):
    for p in paths:
        try:
            if os.path.exists(p):
                if os.path.isdir(p):
                    shutil.rmtree(p, ignore_errors=True)
                else:
                    os.remove(p)
        except Exception as e:
            print(f"Cleanup error on {p}: {e}")

@app.post("/upload/tabular")
async def upload_tabular(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files allowed")
        
    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        try:
            if file.filename.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)
        except Exception:
            raise HTTPException(status_code=400, detail="The uploaded file is corrupted or unreadable.")
            
        profile = profile_tabular_data(df)
        
        db_session = DataSession(
            session_id=session_id,
            filename=file.filename,
            file_type="tabular",
            dqs_before=profile["dqs"],
            summary_stats=json.dumps(profile)
        )
        db.add(db_session)
        db.commit()
        
        ACTIVE_DATAFRAMES[session_id] = {
            "original": df.copy(),
            "current": df.copy()
        }
        
        background_tasks.add_task(cleanup_files, file_path)
        return {"session_id": session_id, "profile": profile}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload/image")
async def upload_image(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are supported for image upload")
        
    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{session_id}_{file.filename}")
    extract_path = os.path.join(UPLOAD_DIR, session_id)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        try:
            profile = profile_images(file_path, extract_path)
            issues_lists = profile.pop("issues_lists", {})
            IMAGE_ISSUES_CACHE[session_id] = issues_lists
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        
        db_session = DataSession(
            session_id=session_id,
            filename=file.filename,
            file_type="image",
            dqs_before=profile["dqs"],
            summary_stats=json.dumps(profile)
        )
        db.add(db_session)
        db.commit()
        
        background_tasks.add_task(cleanup_files, file_path)
        return {"session_id": session_id, "profile": profile}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    session_id: str
    message: str
    
@app.post("/chat")
async def chat_with_data(req: ChatRequest, db: Session = Depends(get_db)):
    db_session = db.query(DataSession).filter(DataSession.session_id == req.session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    summary = json.loads(db_session.summary_stats) if db_session.summary_stats else {}
    
    # Inject historical cleaning log to make the chatbot aware of "how was data cleaned"
    actions = db.query(CleaningAction).filter(CleaningAction.session_id == req.session_id).all()
    if actions:
        summary["recent_cleaning_actions"] = [{"action": a.action_type, "description": a.description} for a in actions]
        
    response = generate_chat_response(query=req.message, dataset_summary=summary)
    
    return {"reply": response}

class CleanRequest(BaseModel):
    session_id: str
    operations: Dict[str, str] # e.g. {"Age": "median", "Cabin": "drop"}
    
@app.post("/clean/tabular")
async def clean_tabular(req: CleanRequest, db: Session = Depends(get_db)):
    session_cache = ACTIVE_DATAFRAMES.get(req.session_id)
    if not session_cache:
        raise HTTPException(status_code=404, detail="Dataframe not found in session memory")
        
    df_current = session_cache["current"]
    df_cleaned, cleaning_log = clean_tabular_data(df_current, req.operations)
    
    # Update current memory cache
    ACTIVE_DATAFRAMES[req.session_id]["current"] = df_cleaned
    
    profile = profile_tabular_data(df_cleaned)
    
    # Save actions to DB
    for log in cleaning_log:
        action_log = CleaningAction(
            session_id=req.session_id,
            action_type=log["method"],
            description=log["message"]
        )
        db.add(action_log)
    
    db_session = db.query(DataSession).filter(DataSession.session_id == req.session_id).first()
    if db_session:
        db_session.dqs_after = profile["dqs"]
        db_session.summary_stats = json.dumps(profile)
    
    db.commit()
    return {"profile": profile, "cleaning_log": cleaning_log}

class ImageCleanRequest(BaseModel):
    session_id: str
    operations: list[str]

@app.post("/clean/images")
async def clean_images_endpoint(req: ImageCleanRequest, db: Session = Depends(get_db)):
    issues_cache = IMAGE_ISSUES_CACHE.get(req.session_id)
    if issues_cache is None:
        raise HTTPException(status_code=404, detail="Image session cache not found")
        
    db_session = db.query(DataSession).filter(DataSession.session_id == req.session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    current_profile = json.loads(db_session.summary_stats) if db_session.summary_stats else {}
    extract_path = os.path.join(UPLOAD_DIR, req.session_id)
    
    new_profile, cleaning_log = clean_images(extract_path, req.operations, issues_cache, current_profile)
    
    # Save actions to DB
    for log in cleaning_log:
        action_log = CleaningAction(
            session_id=req.session_id,
            action_type=log["method"],
            description=log["message"]
        )
        db.add(action_log)
        
    db_session.dqs_after = new_profile["dqs"]
    db_session.summary_stats = json.dumps(new_profile)
    db.commit()
    
    return {"profile": new_profile, "cleaning_log": cleaning_log}

@app.post("/clean/undo")
async def clean_undo(req: ChatRequest, db: Session = Depends(get_db)):
    # Reusing ChatRequest since it just needs session_id, ignore message
    session_cache = ACTIVE_DATAFRAMES.get(req.session_id)
    if not session_cache:
        raise HTTPException(status_code=404, detail="Dataframe not found in session memory")
        
    # Reset current to original
    original_df = session_cache["original"].copy()
    ACTIVE_DATAFRAMES[req.session_id]["current"] = original_df
    
    profile = profile_tabular_data(original_df)
    
    db_session = db.query(DataSession).filter(DataSession.session_id == req.session_id).first()
    if db_session:
        db_session.dqs_after = None # Clear after score
        db_session.summary_stats = json.dumps(profile)
        
        # Clear action history
        db.query(CleaningAction).filter(CleaningAction.session_id == req.session_id).delete()
        
    db.commit()
    return {"profile": profile, "message": "Successfully reverted to original data"}

@app.get("/data/preview/{session_id}")
async def get_data_preview(session_id: str):
    session_cache = ACTIVE_DATAFRAMES.get(session_id)
    if not session_cache:
        raise HTTPException(status_code=404, detail="Dataframe not found in session memory")
        
    df_orig = session_cache["original"].copy()
    df_curr = session_cache["current"].copy()
    
    # Simple sampling logic to return top 100 rows focusing on modified rows if any
    
    
    # For simplicity in JSON transmission, we just send top N where missing existed
    # To keep response light
    columns = df_curr.columns.tolist()
    
    # Truncate to maximum 100 rows for view payload
    head_n = min(100, len(df_curr))
    
    data_orig = df_orig.head(head_n).fillna("").to_dict(orient="records")
    data_curr = df_curr.head(head_n).fillna("").to_dict(orient="records")
    
    # Generate difference mapping dictionary [row_idx: [col1, col2]]
    # Comparing only the top head_n 
    diff = {}
    for i in range(head_n):
        changed_cols = []
        for col in columns:
            val_o = df_orig.iloc[i][col]
            val_c = df_curr.iloc[i][col]
            if pd.isna(val_o) and pd.isna(val_c):
                continue
            if val_o != val_c:
                # also consider nan vs filled
                if str(val_o) != str(val_c):
                    changed_cols.append(col)
        if changed_cols:
            diff[i] = changed_cols

    return {
        "columns": columns,
        "original_data": data_orig,
        "current_data": data_curr,
        "diff": diff
    }

@app.get("/report/{session_id}")
async def get_report(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(DataSession).filter(DataSession.session_id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    pdf_path = os.path.join(UPLOAD_DIR, f"{session_id}_report.pdf")
    generate_pdf_report(db_session, pdf_path)
    
    dataset_name = db_session.filename.rsplit('.', 1)[0]

    return FileResponse(pdf_path, filename=f"CleanIQ_{dataset_name}_Report.pdf", media_type="application/pdf", background=BackgroundTask(cleanup_files, pdf_path))
    
@app.get("/download/{session_id}")
async def download_cleaned(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(DataSession).filter(DataSession.session_id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if db_session.file_type == "image":
        extract_path = os.path.join(UPLOAD_DIR, session_id)
        if not os.path.exists(extract_path):
            raise HTTPException(status_code=404, detail="Cleaned image dataset not found on server")
            
        zip_filename = f"cleaned_{session_id}"
        zip_path = os.path.join(UPLOAD_DIR, zip_filename + ".zip")
        shutil.make_archive(os.path.join(UPLOAD_DIR, zip_filename), 'zip', extract_path)
        
        return FileResponse(
            zip_path, 
            filename=f"CleanIQ_Cleaned_{db_session.filename}", 
            media_type="application/zip",
            background=BackgroundTask(cleanup_files, zip_path)
        )

    session_cache = ACTIVE_DATAFRAMES.get(session_id)
    if not session_cache:
        raise HTTPException(status_code=404, detail="Dataframe not found in active memory")
        
    df_curr = session_cache["current"]
    
    original_name = db_session.filename if db_session else "dataset.csv"
    if original_name.endswith(('.xlsx', '.xls')):
        original_name = original_name.rsplit('.', 1)[0] + '.csv'
        
    clean_name = original_name.rsplit('.', 1)[0]
    
    output = io.StringIO()
    df_curr.to_csv(output, index=False)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cleaned_{clean_name}.csv"}
    )

@app.get("/history")
async def get_history(db: Session = Depends(get_db)):
    sessions = db.query(DataSession).order_by(DataSession.created_at.desc()).all()
    history_data = []
    for s in sessions:
        history_data.append({
            "session_id": s.session_id,
            "filename": s.filename,
            "file_type": s.file_type,
            "dqs_before": s.dqs_before,
            "dqs_after": s.dqs_after,
            "created_at": s.created_at
        })
    return {"history": history_data}
    
@app.get("/")
def read_root():
    return {"status": "ok", "message": "CleanIQ API is running"}
