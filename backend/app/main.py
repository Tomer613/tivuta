from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import random
from jose import JWTError, jwt
from passlib.context import CryptContext

from . import models, schemas, database

# Security configuration
SECRET_KEY = "tivuta_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Initialize the FastAPI app
app = FastAPI(title="Tivuta - The Working Haredi Ecosystem")

# Enable CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to provide a database session for each request
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth Utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/")
def read_root():
    return {"message": "Welcome to the Tivuta API", "status": "active"}

# Auth Endpoints
@app.post("/auth/signup", response_model=schemas.UserRead)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        phone=user_in.phone,
        hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserRead)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users/dashboard", response_model=schemas.DashboardData)
def get_user_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns personalized dashboard data.
    """
    # Spending distribution requested by user:
    # 20% Fashion, 50% Supermarkets, 10% Attractions, 15% Judaism, 5% Health
    distribution = [
        {"label": "אופנה", "value": 20, "color": "#8884d8"},
        {"label": "סופרים", "value": 50, "color": "#8dd1e1"},
        {"label": "אטרקציות", "value": 10, "color": "#82ca9d"},
        {"label": "יהדות", "value": 15, "color": "#ffc658"},
        {"label": "בריאות וביטוחים", "value": 5, "color": "#ff8042"}
    ]
    
    # Fetch user's orders (mocking some if empty)
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()
    
    # If new user, give them some mock history for demo
    if not orders:
        mock_orders = [
            {"title_he": "קנייה בסופר 'אושר עד'", "amount": 450.0, "status": "completed", "date": datetime.now() - timedelta(days=2)},
            {"title_he": "חליפת צמר - בגדי גברים", "amount": 1200.0, "status": "completed", "date": datetime.now() - timedelta(days=5)},
            {"title_he": "מנוי שנתי למקווה", "amount": 350.0, "status": "completed", "date": datetime.now() - timedelta(days=10)},
            {"title_he": "כרטיסים לספארי", "amount": 280.0, "status": "completed", "date": datetime.now() - timedelta(days=15)},
        ]
        for m in mock_orders:
            new_order = models.Order(user_id=current_user.id, **m)
            db.add(new_order)
        db.commit()
        orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).all()

    return {
        "distribution": distribution,
        "total_savings": 850.0, # Mock savings for demo
        "monthly_expenses": 4500.0, # Mock expenses for May
        "recent_orders": orders
    }

# Catalog Endpoints
@app.get("/categories", response_model=List[schemas.CategorySchema])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).filter(models.Category.is_active == True).all()
    return categories

@app.get("/trending", response_model=List[schemas.ItemSchema])
def get_trending_items(db: Session = Depends(get_db)):
    db_items = db.query(models.Item).filter(models.Item.is_active == True).limit(8).all()
    return db_items

@app.get("/items", response_model=List[schemas.ItemSchema])
def get_all_items(db: Session = Depends(get_db)):
    """
    Returns all active items for the 'All Benefits' page.
    """
    return db.query(models.Item).filter(models.Item.is_active == True).all()

@app.get("/categories/{slug}", response_model=schemas.CategorySchema)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@app.get("/categories/{slug}/items", response_model=List[schemas.ItemSchema])
def get_category_items(slug: str, db: Session = Depends(get_db)):
    items = db.query(models.Item).join(models.SubCategory).join(models.Category).filter(models.Category.slug == slug).all()
    return items