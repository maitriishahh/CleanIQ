import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

csv_content = b'Col1,Col2\n1,Hello\n2,World\n3,Hello world this is text\n4,Another text example here\n'
response = client.post("/upload/tabular", files={"file": ("dummy.csv", csv_content, "text/csv")})

print(response.status_code)
print(response.json())
