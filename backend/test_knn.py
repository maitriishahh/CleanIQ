import pandas as pd
import numpy as np
from sklearn.impute import KNNImputer

def test_knn_on_dummy():
    # Construct a dummy dataset similar to Titanic
    df = pd.DataFrame({
        'Survived': [0, 1, 1, 1, 0, 0, 0, 1],
        'Pclass': [3, 1, 3, 1, 3, 3, 2, 3],
        'Name': ["A", "B", "C", "D", "E", "F", "G", "H"],
        'Sex': ["male", "female", "female", "female", "male", "male", "female", "male"],
        'Age': [22.0, 38.0, 26.0, 35.0, 35.0, np.nan, np.nan, 2.0],
        'SibSp': [1, 1, 0, 1, 0, 0, 1, 4],
        'Fare': [7.25, 71.28, 7.92, 53.1, 8.05, 8.45, 14.45, 29.12]
    })
    
    initial_missing = df['Age'].isnull().sum()
    print("Initial missing Age:", initial_missing)
    
    col = 'Age'
    if pd.api.types.is_numeric_dtype(df[col]):
        imputer = KNNImputer(n_neighbors=5)
        num_cols = df.select_dtypes(include=[np.number]).columns
        
        # What happens here?
        imputed_data = imputer.fit_transform(df[num_cols])
        imputed_df = pd.DataFrame(imputed_data, columns=num_cols, index=df.index)
        
        imputed_col_raw = imputed_df[col]
        print("Imputed raw values:\n", imputed_col_raw)
        
        # smart round simulation
        def smart_round(value, original_series):
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
            except Exception as e:
                print("Exception round:", e)
                return value
                
        imputed_col_rounded = imputed_col_raw.apply(lambda x: smart_round(x, df[col]))
        print("Rounded values:\n", imputed_col_rounded)
        df[col] = imputed_col_rounded
        print("Final missing:", df[col].isnull().sum())

test_knn_on_dummy()
