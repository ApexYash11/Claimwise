from fastapi import FastAPI
from dotenv import load_dotenv
import os 


load_dotenv() # loading  enviroment variable form .env
app = FastAPI()

@app.get("/")
def read_root():
    return {"Claimwise  is on "}


