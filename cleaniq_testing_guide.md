    # CleanIQ Comprehensive Testing Guide

This guide will help you thoroughly evaluate every functionality within the CleanIQ Data Quality Platform. To execute a complete test, you need specific dataset characteristics (e.g., missing values, textual noise, outliers, image duplicates).

---

## Part 1: Recommended Kaggle Datasets

Instead of using fully polished datasets, you need datasets notorious for being "dirty" to test CleanIQ's profiling and smart imputation algorithms.

### 1. Tabular Data (Missing Values & Outliers)
**Recommendation:** [Housing Prices or Titanic Dataset](https://www.kaggle.com/c/titanic/data)
- **Why use it:** 
  - Contains heavily missing numeric data (e.g., `Age` in Titanic or `LotFrontage` in Housing).
  - Contains highly missing categorical columns (`Cabin` or `PoolQC`), triggering the platform's recommendation to "Drop Column" natively.
  - Contains subtle outliers (e.g., `Fare`), triggering the platform's Skewness calculations and Median suggestions.
- **How to use:** Download as `.csv` or `.xlsx` and drag it right into the Uploader.

### 2. Tabular Data (NLP / Unstructured Metadata)
**Recommendation:** [IMDB Dataset of 50K Movie Reviews](https://www.kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews)
- **Why use it:**
  - Perfect for triggering CleanIQ's NLP Validation Engine.
  - Reviews often contain raw `<br />` HTML tags, arbitrary URLs, and severe whitespace formatting noise. 
  - Exposes the intelligent string sanitization functionality instead of pure numerical algorithms.
- **How to use:** Download the CSV. Before uploading, you might want to truncate it to roughly ~5,000 rows (in Excel or Python) to speed up JSON transfer optimization testing, then drop it into the Uploader.

### 3. Image Data (Corruption & Duplicates)
**Recommendation:** [Dogs vs. Cats (Subset)](https://www.kaggle.com/c/dogs-vs-cats/data)
- **Why use it:**
  - Easy to download and package into a `.zip`.
- **How to prep the ZIP for testing:**
  Before uploading, manually "dirty" the dataset to see CleanIQ catch it:
  1. Take any 3 images and copy-paste them in the same folder (Test Duplicates).
  2. Open an image in Notepad, delete a chunk of random text, and save it (Test Corruption).
  3. Compress the folder into a `.zip` archive and upload.

---

## Part 2: Step-by-Step Functionality Checklist

Follow these steps to systematically audit the application endpoints and UI workflows.

### Phase 1: Upload & Initial Profiling
- [ ] **Tabular Upload:** Drop the `Titanic.csv` file. 
  - *Expected Result:* The upload spins, then loads the Quality Assessment dashboard.
- [ ] **DQS Calibration:** Check the Data Quality Score in the top left card.
  - *Expected Result:* It should dynamically animate to a number (e.g., 68/100) and identify "Missing Values" and "Outliers" in the pie chart.
- [ ] **Image Upload Workflow:** Click "Start New Analysis" and drop the `.zip` file.
  - *Expected Result:* Identifies duplicates and corrupted files, calculating a completely different metric suite.

### Phase 2: Action Center (Hybrid Reasoning Engine)
> [!IMPORTANT]
> The Action Center is the mathematical core of CleanIQ. Verify that the reasoning text matches the actual dataset.

Upload your Tabular dataset and check the Action Interface blocks:
- [ ] **Algorithmic Logic:** Look at a column with missing data (like `Age`). Read the italicized text.
  - *Expected Result:* It should mathematically justify picking `Median`, `Mean`, `Mode`, or `KNN`, noting the specific Skewness factor or Outlier count it detected using the IQR method.
- [ ] **Drop Column Bias:** Look at a heavily missing column (like `Cabin`).
  - *Expected Result:* The AI should recommend outrightly dropping the column because missing metrics exceed 40%.
- [ ] **NLP Triggers:** If you uploaded the IMDB dataset, check the blue NLP Action blocks.
  - *Expected Result:* It should log exactly how many rows evaluate to nested DOM HTML elements or unmasked URLs.

### Phase 3: Executing the Clean (Data Transparency)
- [ ] **Changing a Selection:** Manually override one of the AI's suggestions (e.g., change `Mean` to `Force Exact Mode`).
- [ ] **Execution:** Click the **"Map Configured Sanitizations"** button.
  - *Expected Result:* A success tooltip should appear. The Data Quality Score (DQS) should recalculate and actively increase (e.g., jump from 68 to 92).
- [ ] **Action Log History:** Scroll to the bottom "Action Log History" panel.
  - *Expected Result:* You should see an audited log of which algorithms executed (e.g., "*KNN computed geometric distances*") and the exact value representations used.
- [ ] **Highlights map:** Toggle between "Original Data" and "Viewing Cleaned State".
  - *Expected Result:* In the cleaned state, any row that got imputed or sanitized should now be distinctly highlighted in **Yellow** for visual transparency!

### Phase 4: Groq AI Chat Assistant
- [ ] **Prompt Context:** Ask the bot: *"What is my current DQS score and why is it low?"*
  - *Expected Result:* The bot should respond referencing the actual live statistics from your dataset.
- [ ] **Prompt Methodology:** Ask the bot: *"Why did you use Median instead of Mean for the Fare column?"*
  - *Expected Result:* The bot should explain that IQR outlier detection mapped extreme tracking bounds, making Mean unsafe.
- [ ] **Error Handling Check:** If you temporarily alter/remove your `GROQ_API_KEY` in `.env`, the bot should cleanly reply with an error message saying it couldn't connect rather than crashing the page.

### Phase 5: Exporting & Session Tracking
- [ ] **Download CSV:** Click the "Download Cleaned Dataset (.csv)" button at the top of the Action Center.
  - *Expected Result:* The output downloaded should include your imputed values and no longer have missing cells.
- [ ] **Download PDF:** Click the "Download PDF Report" button.
  - *Expected Result:* A styled analytical PDF should generate summarizing the cleaning actions and DQS jump.
- [ ] **Undo Mechanism:** Click "Undo All Changes" at the topmost right.
  - *Expected Result:* The DQS resets back to its initial score, the dataset preview removes the yellow highlights, and the logs clear.
- [ ] **History Logs:** Click the "History" tab on the main top navigation menu.
  - *Expected Result:* You should see a card of the dataset you just profiled locking in the "Initial DQS" vs "Final DQS" timestamps. Clicking "Export Action Report" on this page should actively spool up a loader spinner before downloading the PDF.
