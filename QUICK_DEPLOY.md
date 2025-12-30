# 🚀 Quick Deployment Steps

## For Backend (Render)

1. **Connect to Render:**
   - Go to https://render.com
   - Connect your GitHub repo
   - Create new Web Service

2. **Configure:**
   - Runtime: Python 3.11
   - Build: `pip install -r backend/requirements.txt`
   - Start: `cd backend && uvicorn src.main:app --host 0.0.0.0 --port $PORT`

3. **Environment Variables** (in Render Dashboard):
   ```
   SUPABASE_URL=https://pmsooebddaeddjyabghw.supabase.co
   SUPABASE_KEY=<your_anon_key>
   SUPABASE_JWT_SECRET=<from_supabase>
   SUPABASE_SERVICE_KEY=<from_supabase>
   GROQ_API_KEY=<your_groq_key>
   GEMINI_API_KEY=<your_gemini_key>
   FRONTEND_URL=https://claimwise.vercel.app
   ```

4. **After Deploy:**
   - Copy your backend URL (e.g., `https://claimwise-backend.onrender.com`)
   - Update frontend's `NEXT_PUBLIC_API_URL`

---

## For Frontend (Vercel)

1. **Deploy:**
   - Go to https://vercel.com/new
   - Import your GitHub repo
   - Select "frontend" as root directory

2. **Environment Variables** (in Vercel Settings):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://pmsooebddaeddjyabghw.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   NEXT_PUBLIC_API_URL=https://claimwise-backend.onrender.com
   NEXT_PUBLIC_SUPABASE_REDIRECT_URL=https://claimwise.vercel.app/dashboard
   ```

3. **Update Supabase:**
   - Go to Supabase Dashboard → Auth → Providers → Google
   - Add redirect URLs:
     - `https://claimwise.vercel.app/auth/callback`
     - `https://claimwise.vercel.app/dashboard`

4. **Deploy:** Click Deploy!

---

## ✅ Test Everything

- [ ] Visit https://claimwise.vercel.app
- [ ] Test Google OAuth login
- [ ] Upload a policy
- [ ] Check dashboard metrics
- [ ] Test chat with policies
