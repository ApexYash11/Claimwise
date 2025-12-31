# ClaimWise Deployment Guide

## 🚀 Backend Deployment (Render)

### Prerequisites
- Render account (https://render.com)
- GitHub repository with code pushed

### Step 1: Connect GitHub to Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing this code

### Step 2: Configure Render Web Service
**Service Name:** `claimwise-backend`  
**Environment:** Python 3.11  
**Build Command:**
```bash
pip install -r backend/requirements.txt
```

**Start Command:**
```bash
cd backend && uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

### Step 3: Add Environment Variables
In Render Dashboard → Environment, add these variables:

```
SUPABASE_URL=<your_supabase_url>
SUPABASE_KEY=<your_supabase_anon_key>
SUPABASE_JWT_SECRET=<your_jwt_secret>
SUPABASE_SERVICE_KEY=<your_service_key>
GROQ_API_KEY=<your_groq_key>
GEMINI_API_KEY=<your_gemini_key>
FRONTEND_URL=https://claimwise.vercel.app
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
SUPABASE_STORAGE_BUCKET=proeject
```

**Note:** Get these values from:
- **Supabase:** Settings → API → Project API Keys
- **Groq:** https://console.groq.com/keys
- **Gemini:** https://aistudio.google.com/app/apikey

### Step 4: Deploy
- Click "Create Web Service"
- Render will automatically deploy when you push to main branch
- Your backend URL will be: `https://claimwise-backend.onrender.com` (or similar)

### Step 5: Update Frontend
- Copy your Render backend URL
- Add to frontend `.env.production`:
  ```
  NEXT_PUBLIC_API_URL=https://claimwise-backend.onrender.com
  ```

---

## 🌐 Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with code pushed

### Step 1: Import Project
1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Select your GitHub repo

### Step 2: Configure Build Settings
**Framework:** Next.js  
**Root Directory:** `frontend`

**Build Command:**
```bash
npm run build
```

**Install Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://pmsooebddaeddjyabghw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
NEXT_PUBLIC_API_URL=https://claimwise-backend.onrender.com
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=https://claimwise.vercel.app/dashboard
```

### Step 4: Update Supabase OAuth
1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Add these redirect URLs:
   ```
   https://claimwise.vercel.app/auth/callback
   https://claimwise.vercel.app/dashboard
   ```

### Step 5: Deploy
- Click "Deploy"
- Vercel will automatically redeploy on pushes to main
- Your frontend URL: `https://claimwise.vercel.app`

---

## ✅ Post-Deployment Checklist

- [ ] Backend is deployed on Render
- [ ] Frontend is deployed on Vercel
- [ ] Environment variables are set on both platforms
- [ ] CORS origins updated in backend (FRONTEND_URL env var)
- [ ] Supabase OAuth redirect URLs include new frontend URL
- [ ] Test login with Google OAuth
- [ ] Test policy upload
- [ ] Test dashboard metrics loading
- [ ] Check backend logs for errors
- [ ] Verify database operations work

---

## 🔍 Troubleshooting

### Backend won't start on Render
- Check build logs: Render Dashboard → Logs
- Ensure all environment variables are set
- Verify `requirements.txt` is in root of backend folder

### Frontend shows "Cannot reach API"
- Check `NEXT_PUBLIC_API_URL` is correct in Vercel
- Verify backend is running: `https://your-backend.onrender.com/healthz`
- Check browser console for CORS errors

### OAuth not working
- Verify redirect URLs in Supabase match your Vercel domain
- Check `NEXT_PUBLIC_SUPABASE_REDIRECT_URL` is correct
- Ensure Google OAuth credentials are configured

### Database connection fails
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check Supabase project is not paused
- Verify network access (Render may need IP whitelisting)

---

## 📝 Notes

- Render free tier has limitations (sleeps after 15min inactivity, 100 hours/month)
- Consider upgrading to Starter ($7/month) for production
- Vercel free tier includes 100GB bandwidth/month
- Keep API keys secure - never commit to GitHub
- Use Render environment variables, not `.env` files in production
