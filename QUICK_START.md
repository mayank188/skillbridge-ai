# SkillBridge AI - Quick Start Guide

## ⚡ Get Started in 5 Minutes

### Step 1: Verify Prerequisites
```bash
# Check Node.js version (should be >= 18)
node --version

# Check npm version
npm --version
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 3: Configure Environment
The `.env` file is already configured, but ensure:
```env
PORT=5000
MONGODB_URI=mongodb+srv://... (your MongoDB connection)
JWT_SECRET=supersecret (change for production!)
OPENAI_API_KEY=sk-... (add your OpenAI API key)
CORS_ORIGIN=http://localhost:5173
```

**Important**: Whitelist your IP in MongoDB Atlas:
1. Go to MongoDB Atlas → Security → Network Access
2. Click "Add IP Address"
3. Enter your IP or use 0.0.0.0/0 (development only)

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
npm run dev
```
✅ Backend running at http://localhost:5000
✅ Check health: http://localhost:5000/health

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
✅ Frontend running at http://localhost:5173

### Step 5: Test the Platform

1. **Open Landing Page**
   ```
   http://localhost:5173/
   ```

2. **Register as Candidate**
   - Click "Get Started" or "Register"
   - Fill in: Name, Email, Password
   - Select Role: "Candidate"
   - Click Register

3. **Login**
   - Use your email and password
   - You're redirected to Candidate Dashboard

4. **Test Features**
   - View dashboard metrics
   - Upload a sample resume (PDF)
   - System will extract skills using AI
   - Generate and take a quiz
   - Complete a project assignment

## 🔑 Test Credentials

If you want to test quickly without registering:
```
Email: test@example.com
Password: password123
```
(If this account doesn't exist, register one)

## 📊 API Testing

### Check Health
```bash
curl http://localhost:5000/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "candidate"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Dashboard (replace with your token)
```bash
curl http://localhost:5000/api/candidate/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Key Features to Try

### 1. Resume Upload & Skill Extraction
- Upload a PDF resume
- System extracts skills using AI
- Skills categorized by type (Frontend, Backend, etc.)

### 2. Quiz Generation
- AI generates questions based on your skills
- Answer questions with timer
- View score and skill breakdown

### 3. Project Assignment
- Get an AI-generated project matching your skill level
- Submit your GitHub project link
- Get AI evaluation with scores

### 4. Job Browsing
- View available jobs
- See skill match percentage
- Identify missing skills
- Apply to jobs

### 5. Dashboard Analytics
- View your Skill Index
- Track test scores
- Monitor project evaluations
- Analyze progress

## 📁 Project Structure

```
hackathon/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   └── lib/        # Axios client
│   └── package.json
├── controllers/        # API business logic
├── models/            # MongoDB schemas
├── routes/            # API endpoint definitions
├── services/          # AI, matching, PDF services
├── middleware/        # Auth, upload handlers
├── server.js          # Express server
├── .env              # Configuration
├── README.md         # Full documentation
├── DEPLOYMENT.md     # Production deployment
└── PROJECT_SUMMARY.md # What's been built
```

## 🔧 Customization

### Change Port
Edit `.env`:
```env
PORT=3000  # Change to your preferred port
```

### Add More Skills
Skills are auto-extracted from resume, but you can manually add them through the UI.

### Customize Quiz Difficulty
When generating quizzes, you can select: beginner, intermediate, advanced

### Modify Team Limits
Edit controllers to change max files, skills, questions, etc.

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: Could not connect to MongoDB
Solution: 
1. Check MongoDB URI in .env
2. Whitelist your IP in MongoDB Atlas
3. Ensure cluster is running
```

### OpenAI API Error
```
Error: OpenAI API error
Solution:
1. Check OPENAI_API_KEY in .env
2. Verify API key is valid
3. Check OpenAI account has credits
4. Review API rate limits
```

### Port Already in Use
```
Error: EADDRINUSE: address already in use :::5000
Solution: Kill the process using the port
Windows: taskkill /PID 2660 /F
Mac/Linux: lsof -ti:5000 | xargs kill -9
```

### Frontend Not Loading
```
Make sure backend is running first
Check: http://localhost:5000/health returns ok
```

## 📚 Next Steps

1. **Explore the Code**:
   - Backend: Check `controllers/` for business logic
   - Frontend: Check `client/src/pages/` for UI

2. **Customize Features**:
   - Edit AI prompts in `services/aiService.js`
   - Modify scoring algorithm in `services/matchingService.js`
   - Update UI colors in `client/tailwind.config.js`

3. **Add New Features**:
   - Follow the patterns established
   - Add new routes, controllers, and pages
   - Reference `PROJECT_SUMMARY.md` for guidance

4. **Deploy to Production**:
   - Read `DEPLOYMENT.md` for platform-specific guides
   - Configure production environment
   - Set up monitoring and backups

## 📖 Full Documentation

- **README.md**: Complete feature list and API documentation
- **DEPLOYMENT.md**: Production deployment guides
- **PROJECT_SUMMARY.md**: What's been built and next steps

## 🆘 Need Help?

1. Check if backend is running: `curl http://localhost:5000/health`
2. Check if frontend is running: Visit `http://localhost:5173/`
3. Review error messages in browser console and server logs
4. Consult documentation files for detailed help
5. Verify all environment variables are set correctly

## 🚀 Ready to Code?

You now have a fully functional AI-powered hiring platform!

- Backend: ✅ Complete
- Frontend Foundation: ✅ Complete  
- Authentication: ✅ Working
- Database: ✅ Connected
- AI Services: ✅ Configured

**Start developing, and happy coding! 💻**

---

*SkillBridge AI - Hire by Skills, Not Resumes*
