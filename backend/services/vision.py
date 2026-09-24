import cv2
import os
import zipfile
import imagehash
from PIL import Image

def profile_images(zip_path: str, extract_path: str):
    """ Profile the image dataset """
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)
    
    blurry_images = []
    corrupt_images = []
    hashes = {}
    duplicate_images = []
    class_counts = {}
    
    total_images = 0
    valid_extensions = {'.png', '.jpg', '.jpeg'}
    
    for root, _, files in os.walk(extract_path):
        folder_name = os.path.basename(root)
        if folder_name not in class_counts and folder_name != os.path.basename(extract_path):
            class_counts[folder_name] = 0
            
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext not in valid_extensions:
                continue
                
            total_images += 1
            if folder_name != os.path.basename(extract_path) and folder_name in class_counts:
                class_counts[folder_name] += 1
                
            file_path = os.path.join(root, file)
            
            # Check corruption
            try:
                img = Image.open(file_path)
                img.verify() # Verify integrity
                
                # Reopen to compute hash and blur
                img = Image.open(file_path).convert('RGB')
                
                # Check duplicates via imagehash
                h = str(imagehash.average_hash(img))
                if h in hashes:
                    duplicate_images.append(file_path)
                else:
                    hashes[h] = file_path
                    
                # Check blurriness
                cv_img = cv2.imread(file_path)
                if cv_img is not None:
                    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
                    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
                    if variance < 100: # Threshold for blurriness
                        blurry_images.append(file_path)
                        
            except Exception as e:
                corrupt_images.append(file_path)
                
    # DQS logic for images
    if total_images == 0:
        raise ValueError("The uploaded ZIP file contains no valid images.")
        
    integrity = 100
    issues_count = len(blurry_images) + len(corrupt_images) + len(duplicate_images)
    integrity = max(0, 100 - (issues_count / total_images * 100))
        
    return {
        "dqs": round(integrity, 1),
        "total_images": total_images,
        "issues": {
            "blurry": len(blurry_images),
            "corrupt": len(corrupt_images),
            "duplicates": len(duplicate_images),
            "class_imbalance": class_counts
        },
        "issues_lists": {
            "blurry": blurry_images,
            "corrupt": corrupt_images,
            "duplicates": duplicate_images
        }
    }

def clean_images(extract_path: str, operations: list[str], issues_cache: dict, current_profile: dict):
    """
    Apply cleaning operations on images.
    Returns: (updated_profile, cleaning_log)
    """
    import shutil
    import os
    cleaning_log = []
    
    total_images = current_profile.get("total_images", 0)
    issues = current_profile.get("issues", {})
    
    corrupt_count = issues.get("corrupt", 0)
    duplicates_count = issues.get("duplicates", 0)
    blurry_count = issues.get("blurry", 0)
    
    if "remove_corrupt" in operations:
        removed = 0
        for path in issues_cache.get("corrupt", []):
            if os.path.exists(path):
                try:
                    os.remove(path)
                    removed += 1
                except OSError:
                    pass
        if removed > 0:
            cleaning_log.append({"method": "remove_corrupt", "message": f"Removed {removed} corrupt images"})
            total_images -= removed
            corrupt_count = max(0, corrupt_count - removed)
            issues_cache["corrupt"] = []

    if "remove_duplicates" in operations:
        removed = 0
        for path in issues_cache.get("duplicates", []):
            if os.path.exists(path):
                try:
                    os.remove(path)
                    removed += 1
                except OSError:
                    pass
        if removed > 0:
            cleaning_log.append({"method": "remove_duplicates", "message": f"Removed {removed} duplicate images"})
            total_images -= removed
            duplicates_count = max(0, duplicates_count - removed)
            issues_cache["duplicates"] = []

    if "filter_blurry" in operations:
        blurry_folder = os.path.join(extract_path, "blurry")
        os.makedirs(blurry_folder, exist_ok=True)
        moved = 0
        for path in issues_cache.get("blurry", []):
            if os.path.exists(path):
                try:
                    basename = os.path.basename(path)
                    new_path = os.path.join(blurry_folder, f"{moved}_{basename}")
                    shutil.move(path, new_path)
                    moved += 1
                except OSError:
                    pass
        if moved > 0:
            cleaning_log.append({"method": "filter_blurry", "message": f"Moved {moved} blurry images to /blurry/ folder"})
            # Blurry images moved to a subfolder still technically exist in total?
            # User says "Move blurry images to a /blurry/ subfolder ... Recalculate metrics"
            # It's better to exclude them from the primary set, so we decrement total images.
            total_images -= moved
            blurry_count = max(0, blurry_count - moved)
            issues_cache["blurry"] = []

    # Calculate new DQS
    if total_images <= 0:
        total_images = 0
        integrity = 100
    else:
        issues_count = blurry_count + corrupt_count + duplicates_count
        integrity = max(0, 100 - (issues_count / total_images * 100))

    new_profile = {
        "dqs": round(integrity, 1),
        "total_images": total_images,
        "issues": {
            "blurry": blurry_count,
            "corrupt": corrupt_count,
            "duplicates": duplicates_count,
            "class_imbalance": issues.get("class_imbalance", {})
        }
    }
    
    return new_profile, cleaning_log
