import requests

url = 'http://127.0.0.1:8000/test-gemini'
files = {'file': open('Medical_Insurance_Policy_Sample_2.pdf','rb')}
resp = requests.post(url, files=files)
print(resp.status_code)
print(resp.text)
