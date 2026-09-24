import pandas as pd
import numpy as np
import json
import sys
# Import from backend
from services.tabular import clean_tabular_data

def run_test():
    df = pd.DataFrame({
        'Survived': [0, 1, 1, 1, 0, 0, 0, 1],
        'Pclass': [3, 1, 3, 1, 3, 3, 2, 3],
        'Name': ["A", "B", "C", "D", "E", "F", "G", "H"],
        'Sex': ["male", "female", "female", "female", "male", "male", "female", "male"],
        'Age': [22.0, 38.0, 26.0, 35.0, 35.0, np.nan, np.nan, 2.0],
        'SibSp': [1, 1, 0, 1, 0, 0, 1, 4],
        'Fare': [7.25, 71.28, 7.92, 53.1, 8.05, 8.45, 14.45, 29.12]
    })
    
    operations = {"Age": "suggested"}
    df_cleaned, log = clean_tabular_data(df, operations)
    
    print("LOG:")
    for m in log:
        print(m)
    print("\nDF AFTER:")
    print(df_cleaned['Age'])

if __name__ == "__main__":
    run_test()
