# POC Quick Start Guide

This guide will help you get the RecycleBottles POC running in minutes.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (running locally on port 5432)
- MongoDB (running locally on port 27017)

## Step 1: Start Databases

### PostgreSQL
```bash
# Windows (if installed as service)
net start postgresql

# Or using Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=recycle_bottles postgres:15
```

### MongoDB
```bash
# Windows (if installed as service)
net start MongoDB

# Or using Docker
docker run -d -p 27017:27017 mongo:7
```

## Step 2: Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux

# Edit .env and set your SECRET_KEY (at least 32 characters)

# Start the backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be running at: **http://localhost:8000**
API Docs at: **http://localhost:8000/docs**

## Step 3: Setup Web Frontend

Open a **new terminal** and run:

```bash
cd web

# Install dependencies
npm install

# Start the development server
npm run dev
```

Web app will be running at: **http://localhost:3000**

## Step 4: Test the POC Flow

### As Seller:
1. Go to http://localhost:3000
2. Click **Register**
3. Create an account (e.g., seller@test.com)
4. Click **Sell** button
5. Fill in the listing form:
   - Title: "50 Plastic Water Bottles"
   - Description: "Clean, empty plastic bottles for recycling"
   - Type: Plastic
   - Quantity: 50
   - Location: Use default coordinates or your own
   - Add an image (optional)
6. Click **Create Listing**

### As Buyer:
1. Click **Logout**
2. Click **Register** again
3. Create a different account (e.g., buyer@test.com)
4. Browse the listings - you should see the seller's listing
5. Click **Chat** on the listing
6. Send a message to negotiate price: "Hi, I'm interested. Would you take $5 for all 50?"

### Complete the Sale:
1. Switch back to seller account (or open in incognito)
2. Go to your listing
3. Click **Mark Sold** to complete the transaction

## API Endpoints for Testing

You can also test via the API docs at http://localhost:8000/docs:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/listings/` - Get all listings
- `POST /api/listings/` - Create listing (requires auth)
- `POST /api/messages/` - Send message (requires auth)

## Troubleshooting

### Database Connection Errors
- Ensure PostgreSQL is running on port 5432
- Ensure MongoDB is running on port 27017
- Check credentials in `.env` file

### Port Already in Use
- Backend: Change port in `uvicorn main:app --reload --port 8001`
- Frontend: Change port in `vite.config.js`

### Module Not Found
- Backend: Make sure virtual environment is activated
- Frontend: Run `npm install` again

## Next Steps

After the POC is working, you can:
1. Add more features (payment integration, ratings)
2. Build the React Native mobile app
3. Deploy to production
