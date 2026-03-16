# 🔐 Full Stack Auth System
### Node.js + Express + TypeScript + MongoDB + React + Tailwind

---

## 📁 Project Structure

```
auth-project/
├── backend/
│   ├── src/
│   │   ├── config/         → db.ts, env.ts, passport.ts
│   │   ├── controllers/    → auth.controller.ts
│   │   ├── middlewares/    → auth.middleware.ts, validation.middleware.ts
│   │   ├── models/         → user.model.ts
│   │   ├── routes/         → auth.routes.ts, admin.routes.ts
│   │   ├── services/       → email.service.ts
│   │   ├── utils/          → jwt.utils.ts, response.utils.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── api/            → axios.ts, auth.api.ts
    │   ├── components/     → ProtectedRoute.tsx
    │   ├── context/        → AuthContext.tsx
    │   ├── pages/          → Login, Register, Verify, Dashboard, etc.
    │   ├── types/          → index.ts
    │   ├── App.tsx
    │   └── main.tsx
    ├── .env.example
    └── package.json
```

---

## ✅ Features

- ✅ Register with email + password
- ✅ 6-digit email verification OTP (10 min expiry)
- ✅ Login with JWT (Access Token 15min + Refresh Token 7d)
- ✅ Auto refresh token with Axios interceptors
- ✅ Google OAuth 2.0
- ✅ Forgot Password (email link)
- ✅ Reset Password (hashed token)
- ✅ Role-based access: `user` and `admin`
- ✅ Admin routes (get all users, change roles, delete)
- ✅ Rate limiting on auth routes
- ✅ Full TypeScript (backend + frontend)

---

## 🚀 Installation & Setup

### Step 1 — Clone / Copy project

```bash
cd auth-project
```

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
```

Copy env file and fill in values:
```bash
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb://localhost:27017/authdb
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_other_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev
```
Backend runs at: **http://localhost:5000**

---

### Step 3 — Frontend Setup

```bash
cd ../frontend
npm install
```

Copy env:
```bash
cp .env.example .env
```

Start frontend:
```bash
npm run dev
```
Frontend runs at: **http://localhost:3000**

---

## 🔑 Google OAuth Setup

From your Google Cloud Console screenshot, your credentials are already configured:
- **Authorized JS Origin:** `http://localhost:3000`
- **Redirect URI:** `http://localhost:5000/auth/google/callback`

Copy your **Client ID** and **Client Secret** from Google Cloud Console into your backend `.env`.

For Gmail App Password:
1. Go to Google Account → Security → 2-Step Verification → App Passwords
2. Generate password for "Mail"
3. Use that 16-character password as `EMAIL_PASS`

---

## 📮 Postman Testing Guide

### Base URL: `http://localhost:5000`

---

### 1. Register
```
POST /auth/register
Body (JSON):
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Test@123"
}
```
→ Check email for 6-digit code

---

### 2. Verify Email
```
POST /auth/verify-email
Body (JSON):
{
  "email": "john@example.com",
  "code": "123456"
}
```

---

### 3. Login
```
POST /auth/login
Body (JSON):
{
  "email": "john@example.com",
  "password": "Test@123"
}
```
→ Copy the `accessToken` and `refreshToken` from response

---

### 4. Get Profile (Protected)
```
GET /auth/profile
Headers:
  Authorization: Bearer <accessToken>
```

---

### 5. Refresh Token
```
POST /auth/refresh-token
Body (JSON):
{
  "refreshToken": "<your_refresh_token>"
}
```

---

### 6. Forgot Password
```
POST /auth/forgot-password
Body (JSON):
{
  "email": "john@example.com"
}
```
→ Check email for reset link

---

### 7. Reset Password
```
POST /auth/reset-password
Body (JSON):
{
  "token": "<token_from_email_url>",
  "password": "NewPass@123"
}
```

---

### 8. Logout
```
POST /auth/logout
Headers:
  Authorization: Bearer <accessToken>
```

---

### 9. Admin — Get All Users
```
GET /admin/users
Headers:
  Authorization: Bearer <admin_accessToken>
```

To make a user admin, update in MongoDB:
```js
db.users.updateOne({ email: "john@example.com" }, { $set: { role: "admin" } })
```

---

### 10. Google OAuth (Browser Only)
```
GET http://localhost:5000/auth/google
```
→ Opens Google login page → redirects to frontend `/oauth-success?accessToken=...`

---

## 🏭 Make User Admin (MongoDB Shell)

```bash
mongosh
use authdb
db.users.updateOne({ email: "john@example.com" }, { $set: { role: "admin" } })
```

---

## 🌐 API Endpoints Summary

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | No | Register user |
| POST | /auth/verify-email | No | Verify 6-digit OTP |
| POST | /auth/resend-code | No | Resend OTP |
| POST | /auth/login | No | Login |
| POST | /auth/refresh-token | No | Get new tokens |
| POST | /auth/logout | Yes | Logout |
| POST | /auth/forgot-password | No | Send reset email |
| POST | /auth/reset-password | No | Reset password |
| GET | /auth/profile | Yes | Get profile |
| GET | /auth/google | No | Google OAuth |
| GET | /admin/users | Admin | Get all users |
| PATCH | /admin/users/:id/role | Admin | Change user role |
| DELETE | /admin/users/:id | Admin | Delete user |
| GET | /health | No | Health check |
