# 🛡️ ClaimWise
### AI-Powered Insurance Policy Analysis Platform

Transform the way you understand and manage insurance policies with cutting-edge AI technology.

---

## 🌐 Live Demo

**Experience ClaimWise in action:**

🚀 **Frontend**: [https://claimwise-fht9.vercel.app/](https://claimwise-fht9.vercel.app/)  
⚡ **API Backend**: [https://claimwise.onrender.com/](https://claimwise.onrender.com/)  
📖 **API Documentation**: [https://claimwise.onrender.com/docs](https://claimwise.onrender.com/docs)

> **Note**: The backend may take 30-60 seconds to wake up on first visit (Render free tier cold start)

---

## 📋 Overview

**ClaimWise** is a production-ready, enterprise-grade platform that revolutionizes insurance policy management through advanced AI analysis. Upload your insurance documents, receive comprehensive insights, compare coverage options, and interact with your policies through intelligent chat functionality.

Our platform combines modern web technologies with powerful AI models to deliver:
- **Instant Policy Analysis** - Deep understanding of coverage, terms, and conditions
- **Smart Comparisons** - Side-by-side policy evaluation with gap analysis
- **Interactive Chat** - Natural language queries about your policies using RAG technology
- **Premium Optimization** - Identify cost savings and coverage improvements
- **Renewal Management** - Automated alerts and recommendations

---

## ✨ Core Features

### 🎯 **User Features**
- **🔍 AI Policy Analysis** - Comprehensive document breakdown with claim readiness scoring
- **📊 Multi-Policy Comparison** - Side-by-side analysis with coverage gap identification
- **💬 Document Chat** - Interactive Q&A using Retrieval-Augmented Generation (RAG)
- **📈 Smart Insights** - Premium optimization and coverage recommendations
- **📱 Modern Interface** - Responsive design with dark mode and accessibility features
- **🔔 Renewal Alerts** - Automated notifications for policy expirations

### ⚙️ **Technical Features**
- **🛡️ Enterprise Security** - JWT authentication with user data isolation
- **⚡ High Performance** - Advanced caching strategies and rate limiting
- **📊 Real-time Monitoring** - System metrics and performance tracking
- **🔄 Error Recovery** - Comprehensive error handling with user guidance
- **🚀 Production Ready** - Docker support with CI/CD pipeline integration
- **🧠 Multi-LLM Support** - Integration with Groq, Gemini, and OpenAI models

---

## 🏗️ Technology Stack

### **Frontend**
```
Next.js 15 (App Router) + TypeScript
React 18 with Suspense & Server Components
Tailwind CSS + shadcn/ui Components
Supabase Client (Auth + Real-time)
```

### **Backend**
```
FastAPI (Python 3.11+) with Async/Await
Supabase (PostgreSQL + Authentication)
AI/ML: Groq + Gemini + OpenAI
OCR: Tesseract + Poppler + pdf2image
Production: Caching + Rate Limiting + Monitoring
```

---

## 📁 Project Structure

```
claimwise/
├── 📱 frontend/                    # Next.js Application
│   ├── app/                       # App Router
│   │   ├── (auth)/               # Auth pages (login, signup)
│   │   ├── dashboard/            # Main dashboard
│   │   ├── upload/               # Policy upload interface
│   │   ├── analyze/              # Analysis results
│   │   ├── chat/                 # AI chat interface
│   │   └── compare/              # Policy comparison
│   ├── components/               # React Components
│   │   ├── ui/                   # shadcn/ui base components
│   │   ├── auth/                 # Authentication forms
│   │   ├── analysis/             # Policy analysis widgets
│   │   ├── chat/                 # Chat interface components
│   │   └── layout/               # Layout components
│   ├── lib/                      # Utilities
│   │   ├── api.ts                # API client with retry
│   │   ├── auth.ts               # Auth helpers
│   │   └── supabase.ts           # Supabase config
│   └── hooks/                    # Custom React hooks
│
├── ⚡ backend/                     # FastAPI Application
│   ├── src/                      # Core Application
│   │   ├── main.py               # FastAPI app entry
│   │   ├── auth.py               # JWT authentication
│   │   ├── db.py                 # Database operations
│   │   ├── models.py             # Pydantic models
│   │   ├── routes.py             # API endpoints
│   │   ├── llm.py                # AI integrations
│   │   ├── rag.py                # RAG implementation
│   │   └── 🚀 Production Features:
│   │       ├── exceptions.py     # Error handling
│   │       ├── monitoring.py     # Performance metrics
│   │       ├── caching.py        # Multi-strategy cache
│   │       ├── rate_limiting.py  # Request throttling
│   │       └── embeddings.py     # Vector embeddings
│   ├── tests/                    # Test suite
│   └── requirements.txt          # Dependencies
│
└── 📚 docs/                       # Documentation
    ├── api/                      # API documentation
    └── deployment/               # Deployment guides
```

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ with pnpm
- Python 3.11+ with pip
- Supabase project configured
- AI API keys (Groq, Gemini, OpenAI)

---

### **Backend Setup**

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv .venv
# Windows
.\.venv\Scripts\Activate
# macOS/Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Start development server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at `http://localhost:8000`  
📖 API docs at `http://localhost:8000/docs`

---

### **Frontend Setup**

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your config
# For quick testing, use: NEXT_PUBLIC_API_URL=https://claimwise.onrender.com

# 4. Start development server
pnpm dev
```

✅ Frontend running at `http://localhost:3000`  
🌐 **Or try the live demo**: [https://claimwise-fht9.vercel.app/](https://claimwise-fht9.vercel.app/)

---

## 🗄️ Database Schema

### **Core Tables**

```sql
-- Users table (managed by Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies table
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_name VARCHAR NOT NULL,
  policy_number VARCHAR,
  provider VARCHAR,
  policy_type VARCHAR,
  extracted_text TEXT,
  file_path VARCHAR,
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat logs table  
CREATE TABLE chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🛠️ API Endpoints

### **🔐 Authentication**
```http
POST /auth/login          # User login
POST /auth/refresh        # Refresh JWT token
GET  /auth/me             # Current user info
```

### **📄 Policy Management**
```http
POST /upload-policy       # Upload & process policy
GET  /policies            # List user policies
GET  /policies/{id}       # Get specific policy
DELETE /policies/{id}     # Delete policy
```

### **🧠 AI Analysis**
```http
POST /analyze-policy      # Comprehensive analysis
POST /compare-policies    # Multi-policy comparison
POST /chat               # Interactive Q&A
GET  /analysis/{id}      # Cached analysis results
```

### **📊 Monitoring**
```http
GET  /health             # System health check
GET  /metrics            # Performance metrics
GET  /cache/stats        # Cache performance
```

### **Example API Usage**

```bash
# Test the live API
curl https://claimwise.onrender.com/health

# Upload policy (requires authentication)
curl -X POST "https://claimwise.onrender.com/upload-policy" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@policy.pdf" \
  -F "policy_name=My Policy"
```

```json
// POST /analyze-policy
{
  "policy_id": "uuid-here",
  "analysis_type": "comprehensive"
}

// Response
{
  "policy_id": "uuid-here",
  "analysis": {
    "policy_type": "Health Insurance",
    "provider": "Example Insurance Co.",
    "premium": "$250/month",
    "coverage_amount": "$1,000,000",
    "deductible": "$2,500",
    "key_features": ["Emergency Care", "Preventive Services"],
    "claim_readiness_score": 85
  },
  "insights": {
    "coverage_gaps": [],
    "cost_optimization": "Consider higher deductible for 15% savings"
  }
}
```

---

## 🚀 Deployment

### **Live Production URLs**

✅ **Frontend (Vercel)**: [https://claimwise-fht9.vercel.app/](https://claimwise-fht9.vercel.app/)  
✅ **Backend (Render)**: [https://claimwise.onrender.com/](https://claimwise.onrender.com/)  
📚 **API Docs**: [https://claimwise.onrender.com/docs](https://claimwise.onrender.com/docs)

---

### **Backend Deployment (Render)**

```bash
# 1. Environment Variables (Set in Render Dashboard)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
ALLOWED_ORIGINS=https://claimwise-fht9.vercel.app

# 2. Deploy command
git push origin main  # Auto-deploys to Render
```

### **Frontend Deployment (Vercel)**

```bash
# 1. Environment Variables (Set in Vercel Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://claimwise.onrender.com

# 2. Deploy command
vercel --prod  # Or push to main branch for auto-deploy
```

### **Docker Deployment**

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
```

```bash
# Deploy with Docker
docker-compose up -d
```

---

## 🧪 Testing

### **Backend Testing**
```bash
cd backend
source .venv/bin/activate

# Run all tests with coverage
pytest tests/ -v --cov=src --cov-report=html

# Run specific test categories
pytest tests/test_auth.py -v
pytest tests/test_analysis.py -v
pytest tests/test_chat.py -v
```

### **Frontend Testing**
```bash
cd frontend

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### **Development Process**
1. **Fork the repository** and create a feature branch
2. **Set up development environment** using the Quick Start guide
3. **Make your changes** with proper tests and documentation
4. **Run the test suite** to ensure everything works
5. **Submit a pull request** with a clear description

### **Code Standards**
- **Backend**: Black formatting, type hints, comprehensive tests
- **Frontend**: TypeScript strict mode, ESLint, Prettier formatting
- **Commits**: Conventional Commits format
- **Documentation**: Update README and API docs for new features

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**ClaimWise** is built and maintained by a dedicated team of developers, AI engineers, and insurance domain experts.

- **Lead Developer**: [ApexYash11](https://github.com/ApexYash11)

---

## 📞 Support

### **Get Help**
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ApexYash11/Claimwise/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/ApexYash11/Claimwise/discussions)


---

**ClaimWise – Empowering users with AI-driven insurance insights. 🛡️**
