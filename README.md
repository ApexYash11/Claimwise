# 🛡️ ClaimWise - AI-Powered Insurance Policy Analysis Platform

**ClaimWise** is a production-ready, enterprise-grade platform that revolutionizes insurance policy management through advanced AI analysis. Upload insurance policies, get intelligent insights, compare coverage options, and chat with your documents using state-of-the-art language models.

## ⚠️ SECURITY NOTICE

**As of [Current Date]**: A critical chat data leakage vulnerability has been identified and **FIXED**. 
- **Issue**: Chat conversations were shared between users on the same browser/device
- **Fix**: Implemented user-specific storage with server-side authentication
- **Action**: All users should refresh their browsers to load the secure version
- **Details**: See [CHAT_LEAKAGE_FIX.md](./CHAT_LEAKAGE_FIX.md) for complete technical details

## ✨ Key Features

- 🔍 **AI-Powered Policy Analysis** - Comprehensive policy breakdown with claim readiness scoring
- 📊 **Policy Comparison** - Side-by-side analysis of multiple insurance policies  
- 💬 **Document Chat** - Interactive Q&A with your policy documents using RAG
- 📈 **Smart Insights** - Premium optimization, coverage gap analysis, and renewal alerts
- 🔒 **Enterprise Security** - JWT authentication, user data isolation, and secure file handling
- ⚡ **High Performance** - Advanced caching, rate limiting, and real-time monitoring
- 📱 **Modern UI** - Responsive design with dark mode and accessibility features
- 🤖 **AI Transparency** - Clear disclosure of AI-powered features with user guidance

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Next.js 15** (App Router) with TypeScript
- **React 18** with modern hooks and suspense
- **Tailwind CSS** + **shadcn/ui** for beautiful, accessible components
- **Supabase Client** for authentication and real-time features

### Backend  
- **FastAPI** with async/await and automatic API documentation
- **Enhanced Production Systems**:
  - 🛡️ **Comprehensive Error Handling** - Structured exceptions with recovery suggestions
  - 📊 **Performance Monitoring** - Real-time metrics and request tracking
  - 💾 **Multi-Strategy Caching** - LRU, LFU, FIFO, and TTL cache algorithms
  - 🚦 **Smart Rate Limiting** - Token bucket, fixed window, and sliding window algorithms
  - 🧠 **Advanced Embeddings** - Multiple providers (OpenAI, HuggingFace, SentenceTransformers)

### Infrastructure
- **Supabase** - PostgreSQL database, authentication, and file storage
- **AI/ML Services**:
  - 🤖 **Groq** - Ultra-fast LLM inference for policy analysis
  - 🧠 **Google Gemini** - Advanced reasoning and document understanding
  - 🔗 **OpenAI** - High-quality embeddings and chat completions
- **OCR Pipeline** - Tesseract + pdf2image + poppler for document processing

---

## 📁 Project Structure

```
claimwise/
├── 🌐 frontend/                    # Next.js Application
│   ├── app/                       # App Router Pages
│   │   ├── (auth)/               # Authentication pages
│   │   ├── dashboard/            # User dashboard
│   │   ├── upload/               # Policy upload interface
│   │   ├── analyze/              # AI analysis results
│   │   ├── chat/                 # Document chat interface
│   │   └── compare/              # Policy comparison tool
│   ├── components/               # Reusable UI Components
│   │   ├── ui/                   # shadcn/ui base components
│   │   ├── auth/                 # Authentication components
│   │   ├── analysis/             # Policy analysis widgets
│   │   └── layout/               # Layout components
│   ├── lib/                      # Utility Libraries
│   │   ├── api.ts                # API client with retry logic
│   │   ├── auth.ts               # Authentication helpers
│   │   └── supabase.ts           # Supabase client
│   └── hooks/                    # Custom React hooks
│
├── ⚡ backend/                     # FastAPI Application  
│   ├── src/                      # Source Code
│   │   ├── main.py               # FastAPI app with all enhancements
│   │   ├── auth.py               # JWT authentication & authorization
│   │   ├── db.py                 # Supabase database operations
│   │   ├── models.py             # Pydantic data models
│   │   ├── llm.py & llm_groq.py  # AI/LLM integrations
│   │   ├── OCR.py                # Document processing pipeline
│   │   ├── rag.py                # RAG implementation
│   │   └── 🚀 Production Enhancements:
│   │       ├── exceptions.py     # Comprehensive error handling
│   │       ├── monitoring.py     # Performance monitoring
│   │       ├── caching.py        # Multi-strategy caching
│   │       ├── rate_limiting.py  # Smart rate limiting
│   │       ├── embeddings.py     # Advanced embedding system
│   │       └── content_filters.py # Content optimization
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables (not committed)
│
└── 📚 Documentation
    ├── README.md                 # This file
    └── README_RAG_PLAN.md        # RAG implementation details
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ and **pnpm** (or npm)
- **Python** 3.11+ with **pip**
- **Tesseract OCR** and **Poppler** (for local development)
- **Supabase** project with database and storage configured

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate
# macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your API keys and configuration

# Start the server
uvicorn src.main:app --reload
```

The backend will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
# Navigate to frontend directory  
cd frontend

# Install dependencies
pnpm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start the development server
pnpm dev
```

The frontend will be available at `http://localhost:3000`

---

## 🔧 Environment Configuration

### Backend Environment Variables (`.env`)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_STORAGE_BUCKET=your-bucket-name

# AI/LLM API Keys
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Application Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
LOG_LEVEL=INFO
EMBEDDING_DIM=768

# Optional: Monitoring and Performance
ENABLE_MONITORING=true
CACHE_TTL=3600
RATE_LIMIT_ENABLED=true
```

### Frontend Environment Variables (`.env.local`)

```bash
# Supabase Public Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_DEBUG_MODE=false
```

---

## 📚 API Documentation

### Core Endpoints

#### 🔐 Authentication
- `POST /auth/login` - User login with JWT token response
- `POST /auth/refresh` - Refresh JWT tokens
- `GET /auth/me` - Get current user information

#### 📄 Policy Management  
- `POST /upload-policy` - Upload and process insurance policy documents
- `GET /policies` - List user's uploaded policies
- `DELETE /policies/{policy_id}` - Remove a policy

#### 🧠 AI Analysis
- `POST /analyze-policy` - Comprehensive AI policy analysis
- `POST /compare-policies` - Compare multiple policies side-by-side
- `POST /chat` - Interactive Q&A with policy documents
- `GET /analysis/{policy_id}` - Retrieve cached analysis results

#### 📊 Dashboard & Insights
- `GET /dashboard/stats` - User dashboard statistics  
- `GET /activities` - User activity history and timeline
- `GET /insights` - Personalized policy insights and recommendations

#### 🔧 System & Monitoring
- `GET /health` - System health check with detailed status
- `GET /metrics` - Performance metrics (admin only)
- `GET /cache/stats` - Cache performance statistics
- `GET /rate-limit/stats` - Rate limiting statistics

### Enhanced Features

#### 🛡️ Error Handling
- **Structured Exceptions**: Comprehensive error types with recovery suggestions
- **Global Exception Handler**: Consistent error responses across all endpoints
- **Automatic Retry Logic**: Built-in retry mechanisms for external API calls

#### 📊 Performance Monitoring  
- **Request Tracking**: Detailed metrics for every API call
- **System Metrics**: CPU, memory, and disk usage monitoring
- **Custom Alerts**: Configurable thresholds for performance issues

#### 💾 Advanced Caching
- **Multiple Strategies**: LRU, LFU, FIFO, and TTL cache algorithms
- **Intelligent Invalidation**: Smart cache updates based on data changes
- **Background Cleanup**: Automated cache maintenance and optimization

#### 🚦 Smart Rate Limiting
- **Multiple Algorithms**: Token bucket, fixed window, and sliding window
- **Per-User Limits**: Customizable rate limits based on user tiers
- **Graceful Degradation**: Smooth handling of rate limit exceeded scenarios

---

## 🧪 Testing & Development

### Running Tests

```bash
# Backend Tests
cd backend
source .venv/bin/activate  # or .\.venv\Scripts\Activate on Windows
pytest tests/ -v --cov=src

# Frontend Tests  
cd frontend
pnpm test
pnpm test:e2e  # End-to-end tests
```

### Development Tools

```bash
# Backend Development
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Frontend Development
pnpm dev        # Development server
pnpm build      # Production build
pnpm lint       # Code linting
pnpm type-check # TypeScript validation

# Database Management
pnpm db:push    # Push schema changes
pnpm db:studio  # Open Supabase studio
```

### API Testing

```bash
# Health Check
curl http://localhost:8000/health

# Upload Policy (with authentication)
curl -X POST "http://localhost:8000/upload-policy" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@policy.pdf" \
  -F "policy_name=My Policy"

# Get Analysis
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/analysis/POLICY_ID
```

---

## 🚀 Deployment Guide

### Production Deployment

#### Backend Deployment (Render/Railway/DigitalOcean)

```bash
# 1. Build and deploy backend
git push origin main  # Triggers automatic deployment

# 2. Set environment variables in platform dashboard:
# - All environment variables from .env.example
# - Set LOG_LEVEL=INFO for production
# - Configure monitoring and alerting

# 3. Health check endpoint
curl https://your-api-domain.com/health
```

#### Frontend Deployment (Vercel/Netlify)

```bash
# 1. Connect repository to Vercel
# 2. Set environment variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY  
# - NEXT_PUBLIC_API_URL (your backend URL)

# 3. Deploy
vercel --prod
```

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend Dockerfile  
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
    ports:
      - "8000:8000"
  
  frontend:
    build: ./frontend  
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## 🛠️ Troubleshooting Guide

### Common Issues & Solutions

#### 🔒 Authentication Errors
```bash
# Problem: 401 Unauthorized errors
# Solution: Check JWT configuration
export SUPABASE_JWT_SECRET="your-actual-jwt-secret"

# Verify token in backend logs
tail -f logs/claimwise.log | grep "JWT"
```

#### 🌐 CORS Issues
```bash  
# Problem: Browser CORS errors
# Solution: Update ALLOWED_ORIGINS
ALLOWED_ORIGINS="http://localhost:3000,https://your-domain.vercel.app"

# Check CORS middleware in main.py
```

#### 📄 File Upload Problems
```bash
# Problem: File processing failures
# Solution: Verify OCR dependencies
tesseract --version
pdftoppm -h

# Check file size limits (default 10MB)
MAX_FILE_SIZE=20971520  # 20MB
```

#### 🚀 Performance Issues
```bash
# Check system metrics
curl http://localhost:8000/metrics

# Monitor cache performance
curl http://localhost:8000/cache/stats

# Check rate limiting
curl http://localhost:8000/rate-limit/stats
```

#### 🗄️ Database Connection Issues
```bash
# Verify Supabase connection
curl -H "apikey: YOUR_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     "https://YOUR_PROJECT.supabase.co/rest/v1/policies"

# Check database schema
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

#### 🌐 SSR & Hydration Issues
```bash
# Problem: useLayoutEffect SSR warnings
# Solution: Warnings are suppressed in development via next.config.mjs

# Problem: Hydration mismatches
# Solution: Use ClientOnly wrapper for client-specific components
import { ClientOnly } from "@/components/ui/client-only"

# Example usage:
<ClientOnly fallback={<div>Loading...</div>}>
  <ComponentThatNeedsClient />
</ClientOnly>
```

### Performance Optimization

#### Backend Optimization
- **Enable Caching**: Set `CACHE_TTL=3600` for 1-hour cache
- **Configure Rate Limits**: Adjust limits based on your usage patterns  
- **Monitor Memory**: Use `GET /metrics` to track resource usage
- **Database Indexing**: Ensure proper indexes on frequently queried columns

#### Frontend Optimization  
- **Enable ISR**: Use Incremental Static Regeneration for policy pages
- **Image Optimization**: Use Next.js Image component for policy previews
- **Code Splitting**: Lazy load heavy components and pages
- **CDN Configuration**: Configure proper caching headers

---

## 📈 Monitoring & Analytics

### Built-in Monitoring

- **Request Metrics**: Response times, error rates, and throughput
- **System Health**: CPU, memory, and disk usage tracking
- **Cache Performance**: Hit rates, memory usage, and eviction statistics  
- **Rate Limiting**: Request patterns and limit enforcement
- **Error Tracking**: Comprehensive error logging with stack traces

### Dashboard Access

```bash
# System metrics (admin only)
GET /metrics

# Performance dashboard  
GET /dashboard/system

# Error analytics
GET /errors/summary?days=7

# User activity insights
GET /analytics/users?period=30d
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/ApexYash11/Claimwise.git
   cd Claimwise
   ```

2. **Setup Development Environment**
   ```bash
   # Backend setup
   cd backend && pip install -r requirements.txt
   # Frontend setup  
   cd frontend && pnpm install
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

4. **Run Tests**
   ```bash
   # Backend tests
   pytest tests/ --cov=src
   # Frontend tests
   pnpm test
   ```

5. **Submit Pull Request**
   - Write clear commit messages
   - Include tests for new features
   - Update documentation as needed

### Code Style

- **Backend**: Black formatter, isort, flake8 linting
- **Frontend**: Prettier, ESLint, TypeScript strict mode
- **Commits**: Conventional Commits format

---

## 📄 License & Support

### License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

### Support & Community

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ApexYash11/Claimwise/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/ApexYash11/Claimwise/discussions)
- 📧 **Email Support**: support@claimwise.ai
- 💬 **Community Discord**: [Join our Discord](https://discord.gg/claimwise)

### Enterprise Support

For enterprise deployments, custom integrations, or priority support, contact us at enterprise@claimwise.ai

---

## 🔮 Roadmap

### Upcoming Features

- [ ] **Multi-language Support** - Support for regional languages
- [ ] **Mobile App** - React Native iOS/Android apps  
- [ ] **Advanced Analytics** - Predictive insights and recommendations
- [ ] **Integration APIs** - Connect with insurance providers
- [ ] **Blockchain Verification** - Document authenticity verification
- [ ] **Voice Interface** - Voice-based policy queries

### Recent Updates

- [x] **Enhanced Error Handling** - Comprehensive exception management
- [x] **Performance Monitoring** - Real-time system metrics
- [x] **Advanced Caching** - Multi-strategy cache implementation
- [x] **Smart Rate Limiting** - Intelligent request throttling  
- [x] **Embedding System** - Multi-provider embedding support

---

**Made with ❤️ by the ClaimWise Team**

*Empowering users to make informed insurance decisions through AI-powered analysis and insights.*
