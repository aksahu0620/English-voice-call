# English Voice Platform Deployment Guide

This guide will help you deploy the English Voice Platform using Vercel for the frontend and Render for the backend.

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Render Account**: Sign up at [render.com](https://render.com)
4. **MongoDB Atlas Account**: For database hosting
5. **Clerk Account**: For authentication

## Step 1: Set up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Add your IP address to the whitelist (or use 0.0.0.0/0 for all IPs)

## Step 2: Deploy Backend to Render

### 2.1 Connect to GitHub
1. Log in to [Render](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository

### 2.2 Configure the Web Service
- **Name**: `english-voice-platform-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `server`

### 2.3 Environment Variables
Add these environment variables in Render:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/english-voice-platform
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLIENT_URL=https://your-vercel-app.vercel.app
PORT=10000
JWT_SECRET=your_jwt_secret
```

### 2.4 Deploy
Click "Create Web Service" and wait for deployment to complete.

## Step 3: Deploy Frontend to Vercel

### 3.1 Connect to GitHub
1. Log in to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository

### 3.2 Configure the Project
- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3 Environment Variables
Add these environment variables in Vercel:

```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=https://your-render-app.onrender.com
VITE_SERVER_URL=https://your-render-app.onrender.com
```

### 3.4 Deploy
Click "Deploy" and wait for deployment to complete.

## Step 4: Update URLs

After both deployments are complete:

1. **Update Render Environment Variables**:
   - Replace `CLIENT_URL` with your Vercel app URL

2. **Update Vercel Environment Variables**:
   - Replace `VITE_API_URL` and `VITE_SERVER_URL` with your Render app URL

3. **Redeploy both services** to apply the changes

## Step 5: Configure Clerk

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Add your Vercel domain to the allowed origins
3. Update your Clerk application settings with the new URLs

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the `CLIENT_URL` in Render matches your Vercel URL exactly
2. **Socket.io Connection Issues**: Ensure the `VITE_SERVER_URL` points to your Render app
3. **Build Failures**: Check that all dependencies are properly listed in `package.json`

### Environment Variables Checklist

**Render (Backend)**:
- ✅ `MONGODB_URI`
- ✅ `CLERK_SECRET_KEY`
- ✅ `CLERK_PUBLISHABLE_KEY`
- ✅ `CLIENT_URL`
- ✅ `PORT`
- ✅ `JWT_SECRET`

**Vercel (Frontend)**:
- ✅ `VITE_CLERK_PUBLISHABLE_KEY`
- ✅ `VITE_API_URL`
- ✅ `VITE_SERVER_URL`

## URLs After Deployment

- **Frontend**: `https://your-app-name.vercel.app`
- **Backend**: `https://your-app-name.onrender.com`

## Monitoring

- **Vercel**: Check deployment status and logs in your Vercel dashboard
- **Render**: Monitor your service in the Render dashboard
- **MongoDB Atlas**: Monitor database performance and connections

## Security Notes

1. Never commit `.env` files to your repository
2. Use strong, unique secrets for `JWT_SECRET`
3. Regularly rotate your Clerk API keys
4. Monitor your MongoDB Atlas access logs 