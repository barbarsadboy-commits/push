# JhnzSuite

Fullstack SaaS platform for WhatsApp automation, website building, and more.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, Framer Motion
- **Backend:** Firebase (Auth, Firestore, Storage), Vercel Serverless Functions
- **Database:** Firestore (NoSQL)
- **Authentication:** Firebase Auth

## Environment Variables
Copy `.env.example` to `.env` and fill in the values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
SUPERADMIN_EMAIL=sumiyatun993@gmail.com
SUPERADMIN_PASSWORD=JhnzXzyDev
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server:
   ```bash
   npm run dev
   ```

## Deployment

1. Push to GitHub
2. Import project to Vercel
3. Add Environment Variables in Vercel Dashboard
4. Deploy

## Folder Structure

```
/src
  /components
    /auth       # Auth related components
    /layout     # Layout components (Sidebar, Navbar)
    /ui         # Reusable UI components
  /lib
    firebase.ts # Firebase initialization
    store.ts    # State management (Zustand)
    utils.ts    # Utility functions
  /pages
    /dashboard  # Dashboard subpages
    Admin.tsx   # Master Admin Panel
    Landing.tsx # Landing Page
    Login.tsx   # Login Page
    Register.tsx# Register Page
  App.tsx       # Main Router
  main.tsx      # Entry point
```

## Features

- **WhatsApp Automation:** Send messages, scan groups (Mocked UI)
- **Website Builder:** Create and deploy subdomains (Mocked)
- **Payment Pages:** Create payment links (Mocked)
- **Testimonials:** Manage product testimonials
- **Linktree:** Create bio pages
- **Master Admin:** Full system control
- **VIP System:** Manual activation via Telegram

## Security

- Role-based Access Control (RBAC)
- Protected Routes
- Input Validation
- Rate Limiting (Simulated)
