# SkillBridge AI by TechMarcos - Production-Ready Full-Stack Hiring Platform

A comprehensive AI-powered hiring platform that matches candidates with opportunities through genuine capability evaluation using skill assessments, dynamic quizzes, and project evaluations.

## 🚀 Tech Stack

**Frontend:**
- React 18 with Vite
- TailwindCSS for styling
- Framer Motion for animations
- Recharts for data visualization
- Lucide React for icons
- Axios for API calls

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- OpenAI API for AI features
- Multer for file uploads
- Helmet & Rate Limiting for security

## 📁 Project Structure

```
hackathon/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   │   ├── Landing.jsx         # Landing page
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── CandidateDashboard.jsx
│   │   │   ├── RecruiterDashboard.jsx
│   │   │   └── Test.jsx
│   │   ├── components/             # Reusable components
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   └── ResumeUpload.jsx
│   │   ├── context/                # Context (Auth)
│   │   ├── lib/                    # Axios config
│   │   ├── utils/                  # Utility functions
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── config/                          # Configuration
│   └── db.js                       # MongoDB connection
│
├── controllers/                     # Business logic
│   ├── authController.js
│   ├── candidateController.js
│   ├── quizController.js
│   ├── projectController.js
│   ├── jobController.js
│   ├── adminController.js
│   └── resumeController.js
│
├── middleware/                      # Express middleware
│   ├── auth.js                     # JWT authentication
│   └── upload.js                   # Multer configuration
│
├── models/                          # Mongoose schemas
│   ├── User.js
│   ├── Job.js
│   ├── Application.js
│   ├── TestResult.js
│   └── ProjectSubmission.js
│
├── routes/                          # API routes
│   ├── auth.js
│   ├── candidate.js
│   ├── quiz.js
│   ├── project.js
│   ├── jobs.js
│   ├── resume.js
│   └── admin.js
│
├── services/                        # Business services
│   ├── aiService.js               # OpenAI integration
│   ├── matchingService.js         # Skill matching algorithm
│   ├── pdfService.js              # PDF text extraction
│   ├── quizGradingService.js
│   ├── quizService.js
│   └── projectService.js
│
├── utils/                           # Utilities
│   └── jwt.js                      # JWT utilities
│
├── server.js                        # Express server entry
├── .env                            # Environment variables
└── package.json
```

## 🎯 Features

### Candidate Panel
- **Dashboard**: Overview of skills, scores, and progress
- **Resume Upload & Skill Extraction**: Upload PDF, extract skills using AI
- **Dynamic Quizzes**: Adaptive tests based on skill level
- **Project Assignments**: Real-world projects matching skill level
- **Project Evaluation**: AI-powered code and project review
- **Job Listings**: Browse jobs with skill matching
- **Skill Gap Analysis**: Identify missing skills for target jobs
- **Progress Tracking**: Detailed analytics and score breakdown

### Recruiter Panel
- **Job Management**: Create and manage job postings
- **Candidate Ranking**: Smart matching based on weighted scoring
- **Candidate Profiles**: View detailed skill assessments and project work
- **Shortlisting**: Manage candidate pipeline
- **Analytics**: Hiring metrics and skill trends

### Admin Panel
- **Platform Analytics**: User statistics, skill distribution
- **User Management**: Manage candidates and recruiters
- **Job Moderation**: Approve/reject job postings
- **System Health**: Monitor platform metrics

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcryptjs with 12 rounds
- **Role-Based Access Control**: Middleware-enforced roles
- **Rate Limiting**: Prevents brute force attacks
- **Helmet.js**: Sets HTTP security headers
- **Input Validation**: Server-side validation on all endpoints
- **Environment Variables**: Secure credential management

## 📊 Matching Algorithm 

```
Score Calculation:
- Skill Match (40%): Percentage of required skills candidate has
- Test Score (35%): Performance on skills assessment
- Project Score (25%): Quality of submitted projects

FinalScore = 0.4 * SkillMatch + 0.35 * TestScore + 0.25 * ProjectScore
```

## 🤖 AI Features

1. **Resume Skill Extraction**: Automatically extract technical skills from PDFs
2. **Question Generation**: Create adaptive quiz questions based on skills
3. **Project Generation**: Generate mini-projects matching skill level
4. **Project Evaluation**: AI-powered code and project review
5. **Skill Gap Analysis**: Identify learning paths for career growth

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Candidate
- `GET /api/candidate/dashboard` - Get dashboard data
- `POST /api/candidate/resume/upload-and-extract` - Upload resume
- `GET /api/candidate/jobs` - List jobs with matching
- `POST /api/candidate/jobs/apply` - Apply for job
- `GET /api/candidate/jobs/:jobId/gap-analysis` - Skill gap analysis

### Quiz
- `POST /api/quiz/generate` - Generate quiz questions
- `POST /api/quiz/submit` - Submit quiz answers
- `GET /api/quiz/history` - Get test history
- `GET /api/quiz/result/:testId` - Get test details

### Projects
- `POST /api/project/generate` - Generate project assignment
- `POST /api/project/submit` - Submit project
- `POST /api/project/:projectId/evaluate` - Evaluate project
- `GET /api/project/history` - Get projects
- `GET /api/project/:projectId` - Get project details

### Jobs
- `POST /api/jobs` - Create job (recruiters)
- `GET /api/jobs` - Get recruiting jobs
- `GET /api/jobs/:id/candidates` - Get job candidates
- `POST /api/jobs/:id/shortlist` - Shortlist candidate

### Admin
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:userId/status` - Suspend/activate user
- `GET /api/admin/jobs` - List all jobs
- `PATCH /api/admin/jobs/:jobId/status` - Approve/reject job

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- MongoDB Atlas account
- OpenAI API key

### Setup

1. **Clone and install dependencies**
   ```bash
   cd c:\hackathon
   npm install
   cd client
   npm install
   cd ..
   ```

2. **Configure environment variables**
   
   Edit `.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_secret
   OPENAI_API_KEY=your_openai_api_key
   CORS_ORIGIN=http://localhost:5173
   ```

3. **MongoDB IP Whitelist**
   - Go to MongoDB Atlas → Security → Network Access
   - Add your current IP or use 0.0.0.0/0 (development only)

4. **Start the application**
   
   Terminal 1 (Backend):
   ```bash
   npm run dev
   # Server runs on http://localhost:5000
   ```

   Terminal 2 (Frontend):
   ```bash
   cd client
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

5. **Access the application**
   - Landing: http://localhost:5173/
   - Register: http://localhost:5173/register
   - Login: http://localhost:5173/login

## 🧪 Sample Test Data

After registering, you can:
1. Upload a sample resume (PDF)
2. Complete a skill assessment quiz
3. Accept a project assignment
4. Submit project with GitHub link

## 📦 Deployment

### Production Build

```bash
# Build frontend
cd client
npm run build

# Frontend runs on port 5173
# Backend runs on port 5000
```

### Environment Setup for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=production_mongodb_uri
JWT_SECRET=production_jwt_secret
OPENAI_API_KEY=production_openai_key
CORS_ORIGIN=your_production_domain
```

### Deployment Platforms

- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Heroku, Railway, Render, AWS EC2
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary (optional for production)

## 📚 Key Technical Decisions

1. **Mongoose for ODM**: Provides schema validation and middleware hooks
2. **JWT for Auth**: Stateless authentication suitable for APIs
3. **Memory Storage for Multer**: Faster processing without disk I/O
4. **Recharts for Visualization**: Lightweight and customizable charts
5. **Framer Motion**: Smooth, performant animations
6. **OpenAI GPT-3.5-Turbo**: Cost-effective AI for skill analysis

## 🔄 Workflow

1. **Candidate Journey**:
   - Register → Upload Resume → Extract Skills → Take Quiz → Complete Project → Submit Project → Get Evaluated → Find Matching Jobs → Apply

2. **Recruiter Journey**:
   - Register → Create Job → View Applications → Rank Candidates → Shortlist → View Detailed Profiles

3. **Admin Journey**:
   - Monitor platform health → Manage users → Moderate jobs → Review analytics

## 🛠️ Troubleshooting

### MongoDB Connection Error
- Ensure IP is whitelisted in MongoDB Atlas
- Check MONGODB_URI in .env
- Verify cluster is active

### JWT Authentication Fails
- Check JWT_SECRET is set in .env
- Ensure token is in Authorization header
- Verify token hasn't expired

### AI Features Not Working
- Verify OPENAI_API_KEY is valid
- Check API rate limits
- Monitor OpenAI usage

### File Upload Issues
- Ensure file is PDF format
- Check file size < 5MB
- Verify multer middleware is loaded

## 📈 Performance Optimization

- **Frontend**: Code splitting, lazy loading, image optimization
- **Backend**: Database indexing, caching, query optimization
- **API**: Pagination, response compression, rate limiting
- **AI**: Prompt optimization, response caching

## 📝 Code Quality

- Clean MVC architecture
- Consistent error handling
- Input validation on all endpoints
- JSDoc comments on major functions
- Modular component design
- Environment-based configuration

## 🔮 Future Enhancements

- Video interviews support
- Live collaboration with VS Code Live Share integration
- Mobile app (React Native)
- Advanced analytics dashboard
- Slack integration
- LinkedIn OAuth
- Multi-language support
- WebSocket for real-time notifications

## 📄 License

This project is provided as-is for educational and commercial use.

## 👥 Support

For issues, feature requests, or improvements, please refer to the project documentation or contact the development team.

---

**Built with ❤️ using modern web technologies**

SkillBridge AI - Hire by Skills, Not Resumes.
