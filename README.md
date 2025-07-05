# English Communication Voice Platform

A real-time voice communication platform designed to help users practice and improve their English speaking skills through peer-to-peer conversations, featuring live transcription and grammar feedback.

## Features

- **User Authentication**: Secure sign-up and login powered by Clerk
- **Friend System**: Add friends and manage connections
- **Voice Calls**: 
  - Random matching with other users
  - Direct calls with friends
  - Real-time audio communication using WebRTC
- **Live Transcription**: Real-time speech-to-text using Assembly AI
- **Grammar Analysis**: Post-call grammar feedback using OpenAI GPT-4
- **Call History**: Review past conversations with transcripts and feedback

## Tech Stack

- **Frontend**:
  - React with Vite
  - Tailwind CSS for styling
  - Socket.io Client for real-time communication
  - WebRTC for peer-to-peer voice calls

- **Backend**:
  - Node.js with Express
  - MongoDB for data storage
  - Socket.io for real-time events
  - Assembly AI for transcription
  - OpenAI GPT-4 for grammar analysis

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Clerk account for authentication
- Assembly AI API key
- OpenAI API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/english-voice-platform.git
   cd english-voice-platform
   ```

2. Install dependencies:
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Fill in the required environment variables

4. Start the development servers:
   ```bash
   # Start the backend server
   cd server
   npm run dev

   # Start the frontend development server
   cd ../client
   npm run dev
   ```

## Environment Variables

### Server (.env)
```
PORT=3000
MONGODB_URI=your_mongodb_uri
CLIENT_URL=http://localhost:5173
CLERK_SECRET_KEY=your_clerk_secret_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Client (.env)
```
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # React components
│       ├── context/       # React context providers
│       └── services/      # API and utility services
│
└── server/                # Backend Node.js application
    ├── src/
    │   ├── models/        # MongoDB models
    │   ├── routes/        # Express routes
    │   └── services/      # Business logic services
    └── .env.example       # Example environment variables
```

## Deployment

This application can be deployed using Vercel for the frontend and Render for the backend. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment Steps:

1. **Backend (Render)**:
   - Connect your GitHub repository to Render
   - Set root directory to `server`
   - Configure environment variables
   - Deploy

2. **Frontend (Vercel)**:
   - Connect your GitHub repository to Vercel
   - Set root directory to `client`
   - Configure environment variables
   - Deploy

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.