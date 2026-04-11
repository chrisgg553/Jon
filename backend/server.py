from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Create the main app
app = FastAPI()

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth")
products_router = APIRouter(prefix="/products")
orders_router = APIRouter(prefix="/orders")
customers_router = APIRouter(prefix="/customers")
payments_router = APIRouter(prefix="/payments")
contact_router = APIRouter(prefix="/contact")
admin_router = APIRouter(prefix="/admin")

# Pydantic Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image: str
    features: List[str] = []
    stock: int = 100

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: str
    created_at: datetime

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    items: List[OrderItem]
    customer_email: str
    customer_name: str
    payment_method: str
    total: float

class Order(BaseModel):
    id: str
    items: List[OrderItem]
    customer_email: str
    customer_name: str
    payment_method: str
    total: float
    status: str
    created_at: datetime

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

class CheckoutRequest(BaseModel):
    items: List[OrderItem]
    customer_email: str
    customer_name: str
    origin_url: str

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Auth Routes
@auth_router.post("/login")
async def login(request: LoginRequest, response: Response):
    email = request.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }

# Product Routes
@products_router.get("", response_model=List[dict])
async def get_products(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@products_router.get("/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@products_router.post("")
async def create_product(product: ProductCreate, user: dict = Depends(get_admin_user)):
    product_dict = product.model_dump()
    product_dict["id"] = str(uuid.uuid4())
    product_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(product_dict)
    return {"id": product_dict["id"], "message": "Product created"}

# Orders Routes
@orders_router.get("")
async def get_orders(user: dict = Depends(get_admin_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@orders_router.get("/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_admin_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@orders_router.patch("/{order_id}/status")
async def update_order_status(order_id: str, status: str, user: dict = Depends(get_admin_user)):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated"}

@orders_router.post("")
async def create_order(order: OrderCreate):
    order_dict = order.model_dump()
    order_dict["id"] = str(uuid.uuid4())
    order_dict["status"] = "pending"
    order_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Update or create customer
    customer = await db.customers.find_one({"email": order.customer_email})
    if customer:
        await db.customers.update_one(
            {"email": order.customer_email},
            {
                "$inc": {"total_spent": order.total, "order_count": 1},
                "$set": {"last_order": datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.customers.insert_one({
            "id": str(uuid.uuid4()),
            "email": order.customer_email,
            "name": order.customer_name,
            "total_spent": order.total,
            "order_count": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_order": datetime.now(timezone.utc).isoformat()
        })
    
    return {"id": order_dict["id"], "message": "Order created"}

# Customers Routes
@customers_router.get("")
async def get_customers(user: dict = Depends(get_admin_user)):
    customers = await db.customers.find({}, {"_id": 0}).sort("total_spent", -1).to_list(1000)
    return customers

@customers_router.get("/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_admin_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

# Payments Routes
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

@payments_router.post("/checkout")
async def create_checkout_session(checkout_data: CheckoutRequest, request: Request):
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Calculate total from items on server side
    total = sum(item.price * item.quantity for item in checkout_data.items)
    
    success_url = f"{checkout_data.origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_data.origin_url}/checkout/cancel"
    
    # Create order first
    order_id = str(uuid.uuid4())
    order_dict = {
        "id": order_id,
        "items": [item.model_dump() for item in checkout_data.items],
        "customer_email": checkout_data.customer_email,
        "customer_name": checkout_data.customer_name,
        "payment_method": "stripe",
        "total": total,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_dict)
    
    checkout_request = CheckoutSessionRequest(
        amount=float(total),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": order_id,
            "customer_email": checkout_data.customer_email
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "order_id": order_id,
        "amount": total,
        "currency": "usd",
        "customer_email": checkout_data.customer_email,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id, "order_id": order_id}

@payments_router.get("/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction and transaction.get("payment_status") != "paid":
        if status.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            # Update order status
            if transaction.get("order_id"):
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                # Update customer stats
                order = await db.orders.find_one({"id": transaction["order_id"]})
                if order:
                    customer = await db.customers.find_one({"email": order["customer_email"]})
                    if customer:
                        await db.customers.update_one(
                            {"email": order["customer_email"]},
                            {
                                "$inc": {"total_spent": order["total"], "order_count": 1},
                                "$set": {"last_order": datetime.now(timezone.utc).isoformat()}
                            }
                        )
                    else:
                        await db.customers.insert_one({
                            "id": str(uuid.uuid4()),
                            "email": order["customer_email"],
                            "name": order["customer_name"],
                            "total_spent": order["total"],
                            "order_count": 1,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "last_order": datetime.now(timezone.utc).isoformat()
                        })
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@payments_router.get("")
async def get_payments(user: dict = Depends(get_admin_user)):
    payments = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return payments

# Webhook for Stripe
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, request.headers.get("Stripe-Signature"))
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("order_id"):
                await db.orders.update_one(
                    {"id": transaction["order_id"]},
                    {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"status": "error"}

# Contact Routes
@contact_router.post("")
async def submit_contact(message: ContactMessage):
    message_dict = message.model_dump()
    message_dict["id"] = str(uuid.uuid4())
    message_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    message_dict["read"] = False
    message_dict["replied"] = False
    
    await db.contact_messages.insert_one(message_dict)
    return {"message": "Message sent successfully", "id": message_dict["id"]}

@contact_router.get("")
async def get_contact_messages(user: dict = Depends(get_admin_user)):
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return messages

@contact_router.patch("/{message_id}/read")
async def mark_message_read(message_id: str, user: dict = Depends(get_admin_user)):
    await db.contact_messages.update_one({"id": message_id}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

# Admin Stats Routes
@admin_router.get("/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    # Total revenue
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Today's orders
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today.isoformat()}})
    
    # Total customers
    total_customers = await db.customers.count_documents({})
    
    # Pending orders
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Unread messages
    unread_messages = await db.contact_messages.count_documents({"read": False})
    
    # Revenue last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    revenue_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago.isoformat()}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "revenue": {"$sum": "$total"},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily_revenue = await db.orders.aggregate(revenue_pipeline).to_list(30)
    
    return {
        "total_revenue": total_revenue,
        "today_orders": today_orders,
        "total_customers": total_customers,
        "pending_orders": pending_orders,
        "unread_messages": unread_messages,
        "daily_revenue": daily_revenue
    }

# Include routers
api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(orders_router)
api_router.include_router(customers_router)
api_router.include_router(payments_router)
api_router.include_router(contact_router)
api_router.include_router(admin_router)

@api_router.get("/")
async def root():
    return {"message": "ModZone API"}

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup events
@app.on_event("startup")
async def startup_event():
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")
    
    # Seed products if empty
    product_count = await db.products.count_documents({})
    if product_count == 0:
        products = [
            {
                "id": str(uuid.uuid4()),
                "name": "Instagram Followers Pack - 1K",
                "description": "Get 1,000 high-quality Instagram followers delivered within 24-48 hours. Real accounts, no bots.",
                "price": 4.99,
                "category": "instagram",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/655e1532e1292ee0ed97a3630f535f85eec26b99fc53ccd59c9fd1e6a02c0bfa.png",
                "features": ["1,000 Followers", "24-48hr Delivery", "No Password Required", "Lifetime Guarantee"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Instagram Followers Pack - 5K",
                "description": "Get 5,000 high-quality Instagram followers delivered within 48-72 hours. Real accounts, no bots.",
                "price": 19.99,
                "category": "instagram",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/655e1532e1292ee0ed97a3630f535f85eec26b99fc53ccd59c9fd1e6a02c0bfa.png",
                "features": ["5,000 Followers", "48-72hr Delivery", "No Password Required", "Lifetime Guarantee"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Instagram Likes Pack - 500",
                "description": "Boost your posts with 500 high-quality Instagram likes. Instant delivery.",
                "price": 2.99,
                "category": "instagram",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/655e1532e1292ee0ed97a3630f535f85eec26b99fc53ccd59c9fd1e6a02c0bfa.png",
                "features": ["500 Likes", "Instant Delivery", "High Quality", "Safe & Secure"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "PS5 Jailbreak Account - Premium",
                "description": "Full access PS5 jailbreak account with premium features. Includes modded games library access.",
                "price": 49.99,
                "category": "ps5",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/f6d5a23131a3a8713ddb671a2aee3c848f0214443cefa5726d7399ba61540f98.png",
                "features": ["Full Jailbreak Access", "Modded Games", "Online Features", "24/7 Support"],
                "stock": 50,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "PS5 Modded Save - GTA V",
                "description": "Max money, max rank, all unlocks GTA V save file for PS5. Easy installation guide included.",
                "price": 19.99,
                "category": "ps5",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/f6d5a23131a3a8713ddb671a2aee3c848f0214443cefa5726d7399ba61540f98.png",
                "features": ["Max Money", "Max Rank", "All Unlocks", "Installation Guide"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Xbox Modded Account - Ultimate",
                "description": "Xbox account with premium Game Pass Ultimate and modded achievements.",
                "price": 34.99,
                "category": "xbox",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/f6d5a23131a3a8713ddb671a2aee3c848f0214443cefa5726d7399ba61540f98.png",
                "features": ["Game Pass Ultimate", "Modded Achievements", "Full Access", "Warranty"],
                "stock": 30,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Xbox Modded Save - Forza",
                "description": "Fully modded Forza Horizon 5 save with all cars, max credits, and VIP status.",
                "price": 14.99,
                "category": "xbox",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/f6d5a23131a3a8713ddb671a2aee3c848f0214443cefa5726d7399ba61540f98.png",
                "features": ["All Cars Unlocked", "Max Credits", "VIP Status", "Easy Setup"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Game Save Bundle - Offline Pack",
                "description": "Collection of 50+ modded game saves for various platforms. Works offline.",
                "price": 7.99,
                "category": "saves",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/97f8067cc30f730e27308c2788eff05ffd24a991ae75b51c4a9e9431d20353.png",
                "features": ["50+ Game Saves", "Multi-Platform", "Offline Compatible", "Instant Download"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Game Save Bundle - Online Pack",
                "description": "Collection of 30+ online-compatible modded saves. Cloud sync support.",
                "price": 12.99,
                "category": "saves",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/97f8067cc30f730e27308c2788eff05ffd24a991ae75b51c4a9e9431d20353.png",
                "features": ["30+ Game Saves", "Online Compatible", "Cloud Sync", "Regular Updates"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "GTA Online Modded Account",
                "description": "Fully loaded GTA Online account with $500M+, max rank, and all properties.",
                "price": 29.99,
                "category": "accounts",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/e5e116757e86bb4c47405791dd8bf4cd9843346436ab28f401172b5fa4071eb3.png",
                "features": ["$500M+ Cash", "Max Rank", "All Properties", "All Vehicles"],
                "stock": 25,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Warzone Modded Account",
                "description": "Call of Duty Warzone account with unlock all, max level, and rare camos.",
                "price": 24.99,
                "category": "accounts",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/e5e116757e86bb4c47405791dd8bf4cd9843346436ab28f401172b5fa4071eb3.png",
                "features": ["Unlock All", "Max Level", "Rare Camos", "Battle Pass"],
                "stock": 40,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Fortnite OG Account",
                "description": "Rare Fortnite account with OG skins including Renegade Raider and Black Knight.",
                "price": 149.99,
                "category": "accounts",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/e5e116757e86bb4c47405791dd8bf4cd9843346436ab28f401172b5fa4071eb3.png",
                "features": ["OG Skins", "Renegade Raider", "Black Knight", "500+ Skins"],
                "stock": 10,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "FIFA Ultimate Team Coins - 1M",
                "description": "1 Million FIFA Ultimate Team coins. Safe transfer method, quick delivery.",
                "price": 9.99,
                "category": "accounts",
                "image": "https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/e5e116757e86bb4c47405791dd8bf4cd9843346436ab28f401172b5fa4071eb3.png",
                "features": ["1M Coins", "Safe Transfer", "Quick Delivery", "All Platforms"],
                "stock": 999,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.products.insert_many(products)
        logger.info(f"Seeded {len(products)} products")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("category")
    await db.orders.create_index("customer_email")
    await db.orders.create_index("status")
    await db.customers.create_index("email", unique=True)
    await db.payment_transactions.create_index("session_id")
    
    # Write credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Login\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
