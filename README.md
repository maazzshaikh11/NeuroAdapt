# 🧠 NeuroAdapt

NeuroAdapt is an AI-powered browser accessibility platform designed to improve the reading experience for individuals with Dyslexia, ADHD, and other cognitive reading challenges.

The project consists of:

- 🌐 AI-powered Chrome Extension
- 📊 React Dashboard
- ⚙️ Node.js + Express Backend
- 🤖 AI Text Simplification API

---

# Features

- AI Text Simplification
- Focus Mode
- Bionic Reading
- OpenDyslexic Font Support
- Light, Dark & Auto Themes
- User Authentication
- Personalized Accessibility Preferences
- Usage Analytics Dashboard
- Cloud-based User Profile Synchronization

---

# Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- JWT Authentication

### AI
- Groq API / LLM
- Natural Language Processing

### Deployment

Dashboard:
https://neuro-adapt-eight.vercel.app

Backend API:
https://neuroadapt-backend.onrender.com

Chrome Extension:
Chrome Web Store (Pending Review)

---

# Project Structure

```
backend/
dashboard/
extension/
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/maazzshaikh11/NeuroAdapt.git
```

Install dependencies

```bash
cd backend
npm install

cd ../dashboard
npm install

cd ../extension
npm install
```

---

# Environment Variables

Backend

```
MONGODB_URI=
JWT_SECRET=
GROQ_API_KEY=
FRONTEND_URL=
ALLOWED_ORIGINS=
```

Dashboard

```
VITE_API_BASE_URL=
```

Extension

```
VITE_API_BASE_URL=
VITE_DASHBOARD_URL=
```

---

# Authors

Team DSY:
- Muaz Shaikh
- Ashokkumar Bhati
- Piyush Ghadge
- Keval Shah

---

# License

This project is developed for educational and research purposes.
