from fastapi import FastAPI
from .database import engine
from . import models

# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Haredi Working Community Portal")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Haredi Portal API"}