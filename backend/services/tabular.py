import pandas as pd
import numpy as np
import re
from sklearn.impute import KNNImputer
from bs4 import BeautifulSoup

def calculate_dqs(completeness, consistency, validity, uniqueness):
    """ Calculate Data Quality Score (0-100) """
    return (completeness * 0.4 + consistency * 0.2 + validity * 0.2 + uniqueness * 0.2)

def is_text_column(series: pd.Series):
    """ Evaluate if a column is dense NLP text vs typical categorical string """
    if not pd.api.types.is_object_dtype(series):
        return False
        
    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False
        
    unique_ratio = len(non_null.unique()) / len(non_null)
    if unique_ratio < 0.60: 
        return False
        
    avg_words = non_null.apply(lambda x: len(x.split())).mean()
    if avg_words <= 3: 
        return False
        
    return True

def smart_round(value, original_series):
    """ Enforce dynamic decimal precision mimicking localized array characteristics """
    try:
        non_null = original_series.dropna()
        if len(non_null) == 0:
            return value
            
        is_all_ints = all(v == int(v) for v in non_null if isinstance(v, (int, float)))
        if is_all_ints:
            return int(round(value))
            
        max_decimals = 0
        for v in non_null:
            v_str = str(v)
            if '.' in v_str:
                decimals = len(v_str.split('.')[-1])
                if decimals > max_decimals:
                    max_decimals = decimals
                    
        decimals = min(max_decimals, 2)
        return round(float(value), decimals)
    except Exception:
        return value

def analyze_imputation_reasoning(df: pd.DataFrame):
    """ Build explicit reasoning mapping for missing variables outlining why Auto-Suggestion picks certain algorithms """
    reasoning_dict = {}
    total_rows = len(df)
    
    if total_rows == 0:
        return reasoning_dict
        
    for col in df.columns:
        if is_text_column(df[col]):
            continue # Text specific anomalies are handled inside profile regex engine natively 
            
        missing_count = int(df[col].isnull().sum())
        if missing_count == 0:
            continue
            
        missing_pct = round((missing_count / total_rows) * 100, 1)
        is_numeric = pd.api.types.is_numeric_dtype(df[col])
        unique_count = int(df[col].nunique())
        
        suggested_method = ""
        suggested_value = None
        reasoning = ""
        factors = []
        has_outliers = False
        outliers_count = 0
        skewness = 0.0

        if missing_pct > 40:
            suggested_method = "drop_column"
            reasoning = f"Column '{col}' has {missing_pct}% missing values ({missing_count}/{total_rows} rows). Imputing this many values would introduce more noise than signal into your models. Recommended action: Drop this column entirely."
            factors.append(f"Missing: {missing_pct}% — exceeding safe imputation bounds")
            
        elif not is_numeric and unique_count > (total_rows * 0.9):
            suggested_method = "drop_row"
            reasoning = f"Column '{col}' appears to be an identifier or high-cardinality descriptive column ({unique_count} distinct text values). Imputing specific IDs is logically invalid. Recommended action: Purge rows possessing missing values."
            factors.append(f"High Cardinality: {unique_count} unique combinations detected")
            
        elif unique_count <= 2:
            suggested_method = "mode"
            val = df[col].mode()[0] if not df[col].mode().empty else "N/A"
            suggested_value = str(val) if not pd.isna(val) else "N/A"
            reasoning = f"Column '{col}' acts as a binary variable (only 2 distinct classes found). Injecting continuous logic breaks structure. Filling with categorical Mode ({suggested_value}) maintains the original unaligned class distributions."
            factors.append(f"Distribution: Sparse binary classification feature")
            
        elif not is_numeric:
            suggested_method = "mode"
            val = df[col].mode()[0] if not df[col].mode().empty else "N/A"
            suggested_value = str(val) if not pd.isna(val) else "N/A"
            mode_count = int(df[col].value_counts().iloc[0]) if not df[col].value_counts().empty else 0
            reasoning = f"Column '{col}' acts as abstract categorical text. Computing the generalized Mode ('{suggested_value}', appearing natively {mode_count} times) serves as the definitive statistically valid imputation constraint for non-numerical blocks."
            factors.append(f"Data Object: Isolated Categorical Feature")
            
        else:
            skewness = round(float(df[col].skew()), 3)
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            outlier_mask = (df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))
            outliers_count = int(outlier_mask.sum())
            has_outliers = (outliers_count > 0)
            
            val_median = smart_round(df[col].median(), df[col])
            val_mean = smart_round(df[col].mean(), df[col])
            
            if missing_pct > 20 and missing_pct <= 40:
                suggested_method = "knn"
                suggested_value = "Algorithm"
                reasoning = f"Column '{col}' exceeds {missing_pct}% empty gaps. Activating KNN imputation calculates the 5 nearest mathematically similar rows across all numeric features estimating predictive values. It natively preserves inter-column distributions significantly better than static baselines."
                factors.append(f"Missing Level: {missing_pct}% — approaching sparse bounds")
                factors.append("Strategy: Activating ML k-Nearest Neighbors prediction logic")
                
            elif has_outliers:
                suggested_method = "median"
                suggested_value = val_median
                reasoning = f"Column '{col}' inherently contains {outliers_count} dynamically mapped outliers via rigorous IQR tracking methods. Enforcing Median ({suggested_value}) over Mean ({val_mean}) systematically nullifies outlier explosion vulnerabilities inside replaced entities."
                factors.append(f"Outliers Identified: {outliers_count} distinct deviations (IQR tracking)")
                factors.append(f"Skew Factor: {skewness}")
                
            elif abs(skewness) > 0.5:
                suggested_method = "median"
                suggested_value = val_median
                skew_desc = "right-skewed" if skewness > 0 else "left-skewed"
                reasoning = f"Column '{col}' natively forms a {skew_desc} array (skewness measure: {skewness}). Imputing raw Means heavily distorts inferences by pulling bounds. Supplying Median ({suggested_value}) strictly mirrors true central tendencies."
                factors.append(f"Shape: Substantial Skewness geometry detected ({skewness})")
                
            else:
                suggested_method = "mean"
                suggested_value = val_mean
                reasoning = f"Column '{col}' possesses a highly normal, symmetric linear distribution (skewness proximity near zero: {skewness}). Executing the continuous Mean ({suggested_value}) safely acts as the most accurate statistically grounded injection for isolated missing components."
                factors.append(f"Shape: Normalized Symmetrical Distribution ({skewness})")
                factors.append("Stability: Zero outlier interference flags configured")

        reasoning_dict[col] = {
            "column": col,
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "suggested_method": suggested_method,
            "suggested_value": suggested_value,
            "skewness": skewness,
            "has_outliers": has_outliers,
            "outlier_count": outliers_count,
            "reasoning": reasoning,
            "reasoning_factors": factors
        }
        
    return reasoning_dict
    
def profile_tabular_data(df: pd.DataFrame):
    """ Profile the pandas dataframe """
    total_cells = df.shape[0] * df.shape[1]
    total_rows = df.shape[0]
    
    missing_cells = int(df.isnull().sum().sum())
    missing_by_col = df.isnull().sum()[df.isnull().sum() > 0].to_dict()
    missing_by_col = {k: int(v) for k, v in missing_by_col.items()}
    
    completeness = max(0, 100 - (missing_cells / total_cells * 100)) if total_cells > 0 else 100
    
    duplicate_rows = int(df.duplicated().sum())
    uniqueness = max(0, 100 - (duplicate_rows / total_rows * 100)) if total_rows > 0 else 100
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outliers_count = 0
    outliers_by_col = {}
    for col in numeric_cols:
        col_mean = df[col].mean()
        col_std = df[col].std()
        if col_std > 0:
            z_scores = np.abs((df[col] - col_mean) / col_std)
            outliers = (z_scores > 3).sum()
            if outliers > 0:
                outliers_count += int(outliers)
                outliers_by_col[col] = int(outliers)
            
    # Advanced NLP Text Profiling
    text_issues = {}
    
    html_pattern = re.compile(r'<[^>]+>')
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    whitespace_pattern = re.compile(r'\s{2,}|\t|\n|^\s+|\s+$')
    special_char_pattern = re.compile(r'[@#$%^*~`|]')
    
    for col in df.columns:
        if is_text_column(df[col]):
            non_null = df[col].dropna().astype(str)
            if len(non_null) == 0:
                continue
                
            html_count = int(non_null.apply(lambda x: bool(html_pattern.search(x))).sum())
            url_count = int(non_null.apply(lambda x: bool(url_pattern.search(x))).sum())
            ws_count = int(non_null.apply(lambda x: bool(whitespace_pattern.search(x))).sum())
            spec_count = int(non_null.apply(lambda x: bool(special_char_pattern.search(x))).sum())
            short_count = int(non_null.apply(lambda x: len(x.split()) < 3).sum())
            
            if any([html_count, url_count, ws_count, spec_count, short_count]):
                text_issues[col] = {
                    "html_count": html_count,
                    "url_count": url_count,
                    "whitespace_count": ws_count,
                    "special_char_count": spec_count,
                    "short_text_count": short_count
                }
            
    validity = max(0, 100 - (outliers_count / total_cells * 100)) if total_cells > 0 else 100
    consistency = 100 
    
    dqs = calculate_dqs(completeness, consistency, validity, uniqueness)
    
    imputation_reasons = analyze_imputation_reasoning(df)
    
    return {
        "dqs": round(dqs, 1),
        "total_rows": total_rows,
        "total_columns": df.shape[1],
        "completeness": round(completeness, 1),
        "uniqueness": round(uniqueness, 1),
        "validity": round(validity, 1),
        "consistency": round(consistency, 1),
        "issues": {
            "missing_values": missing_by_col,
            "duplicate_rows": duplicate_rows,
            "outliers": outliers_by_col,
            "text_issues": text_issues
        },
        "imputation_reasons": imputation_reasons
    }

def clean_tabular_data(df_current: pd.DataFrame, operations: dict):
    """ Apply explicit NLP structural operations vs numeric """
    df = df_current.copy()
    cleaning_log = []
    
    reasons = analyze_imputation_reasoning(df)
    
    html_pattern = re.compile(r'<[^>]+>')
    url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    whitespace_pattern = re.compile(r'\s{2,}|\t|\n')
    special_char_pattern = re.compile(r'[@#$%^*~`|]')
    
    for col, method in operations.items():
        if col not in df.columns:
            continue
            
        initial_missing = df[col].isnull().sum()
        actual_method = method
        
        if actual_method == "ignore":
            continue

        # Convert auto/suggested first
        if actual_method == "auto" or actual_method == "suggested":
            reason = reasons.get(col)
            if reason:
                actual_method = reason["suggested_method"]
            elif pd.api.types.is_numeric_dtype(df[col]):
                actual_method = "median"
            else:
                actual_method = "mode"

        # Now check missing after conversion
        if initial_missing == 0 and actual_method not in ["drop", "drop_row", "drop_column", "clean_text"]:
            continue
        
        # Determine if NLP execution pathway
        if actual_method == "clean_text":
            def sanitize_string(val):
                if pd.isna(val):
                    return val
                val_str = str(val)
                if bool(html_pattern.search(val_str)):
                    try:
                        val_str = BeautifulSoup(val_str, "html.parser").get_text()
                    except:
                        val_str = html_pattern.sub(' ', val_str)
                val_str = url_pattern.sub('', val_str)
                val_str = special_char_pattern.sub('', val_str)
                val_str = whitespace_pattern.sub(' ', val_str).strip()
                return val_str
                
            df[col] = df[col].apply(sanitize_string)
            
            # Automatically wipe sparse noise (< 3 word vectors) per auto-detect heuristic
            before_len = len(df)
            df = df[df[col].apply(lambda x: pd.isna(x) or len(str(x).split()) >= 3)]
            dropped_short = before_len - len(df)
            
            log_msg = f"✅ Column \"{col}\": Robust NLP filtering executed; wiped HTML tags, decoupled URLs/Regex artifacts, and stripped arbitrary spacing formatting natively."
            if dropped_short > 0:
                log_msg += f" {dropped_short} exceptionally short text strings (< 3 logical words) inherently isolated and purged."
                
            cleaning_log.append({
                "column": col, "issue_type": "text_issues", "method": "NLP Sanitization Check", "value_used": "Regex ML", "rows_affected": len(df),
                "message": log_msg
            })
            continue # NLP block complete 

        # Resume internal Tabular algorithms
            
        if actual_method == "drop_column":
            df.drop(columns=[col], inplace=True)
            cleaning_log.append({
                "column": col, "issue_type": "missing_values", "method": "Drop Column", "value_used": "N/A", "rows_affected": len(df),
                "message": f"✅ Column \"{col}\": Feature comprehensively dropped exclusively preserving signal bounds."
            })
            
        elif actual_method == "drop" or actual_method == "drop_row":
            before_len = len(df)
            df.dropna(subset=[col], inplace=True)
            dropped = before_len - len(df)
            if dropped > 0:
                cleaning_log.append({
                    "column": col, "issue_type": "missing_values", "method": "Drop Row", "value_used": "N/A", "rows_affected": dropped,
                    "message": f"✅ Column \"{col}\": {dropped} missing value rows explicitly flagged and purged"
                })
                
        elif actual_method == "median":
            if pd.api.types.is_numeric_dtype(df[col]):
                raw_val = df[col].median()
                val = smart_round(raw_val, df[col])
                df[col] = df[col].fillna(val)
                cleaning_log.append({
                    "column": col, "issue_type": "missing_values", "method": "Median", "value_used": val, "rows_affected": int(initial_missing),
                    "message": f"✅ Column \"{col}\": {initial_missing} missing values robustly filled evaluating central median tracking ({val})"
                })
        
        elif actual_method == "mean":
            if pd.api.types.is_numeric_dtype(df[col]):
                raw_val = df[col].mean()
                val = smart_round(raw_val, df[col])
                df[col] = df[col].fillna(val)
                cleaning_log.append({
                    "column": col, "issue_type": "missing_values", "method": "Mean", "value_used": val, "rows_affected": int(initial_missing),
                    "message": f"✅ Column \"{col}\": {initial_missing} missing gaps smoothly converged via standard mean symmetry calculation ({val})"
                })
                
        elif actual_method == "mode":
            if not df[col].mode().empty:
                val = df[col].mode()[0]
                df[col] = df[col].fillna(val)
                val_str = str(val) if not pd.isna(val) else "N/A"
                cleaning_log.append({
                    "column": col, "issue_type": "missing_values", "method": "Mode", "value_used": val_str, "rows_affected": int(initial_missing),
                    "message": f"✅ Column \"{col}\": {initial_missing} components categorically substituted isolating exact distribution Modes ({val_str})"
                })
                
        elif actual_method == "knn":
            if pd.api.types.is_numeric_dtype(df[col]):
                imputer = KNNImputer(n_neighbors=5)
                num_cols = df.select_dtypes(include=[np.number]).columns
                if len(num_cols) > 0:
                    imputed_data = imputer.fit_transform(df[num_cols])
                    imputed_df = pd.DataFrame(imputed_data, columns=num_cols, index=df.index)
                    
                    imputed_col_raw = imputed_df[col]
                    imputed_col_rounded = imputed_col_raw.apply(lambda x: smart_round(x, df[col]))
                    df[col] = imputed_col_rounded
                    
                    cleaning_log.append({
                        "column": col, "issue_type": "missing_values", "method": "KNN (Algorithm)", "value_used": "Predictive Logic", "rows_affected": int(initial_missing),
                        "message": f"✅ Column \"{col}\": {initial_missing} structures algorithmically extrapolated computing geometric distances within k-nearest groupings"
                    })
                
    return df, cleaning_log
