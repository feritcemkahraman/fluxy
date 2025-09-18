# Fluxy - Discord-like Chat Application

A modern, real-time chat application built with React, Node.js, and Socket.IO.

## Features

- Real-time messaging
- Voice channels
- Server management
- User authentication
- File uploads
- Direct messages
- Friend system
- Customizable user settings

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Radix UI Components
- Socket.IO Client
- Axios for API calls

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- Multer for file uploads

### Deployment
- Netlify (Frontend + Serverless Functions)
- MongoDB Atlas

## Local Development

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up environment variables
4. Start the development servers

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your MongoDB URI and JWT secret
3. Configure other environment variables as needed

### Running Locally

```bash
# Start backend server
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

## Netlify Deployment

### Prerequisites

- Netlify account
- MongoDB Atlas database
- Domain (optional)

### Deployment Steps

1. **Connect Repository**
   - Push your code to GitHub
   - Connect your repository to Netlify

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
   - Functions directory: `netlify/functions`

3. **Environment Variables**
   Set these in Netlify dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string for JWT signing
   - `FRONTEND_URL`: Your Netlify app URL
   - `NODE_ENV`: `production`

4. **Deploy**
   - Netlify will automatically build and deploy your app
   - Functions will be available at `/.netlify/functions/api`

### Post-Deployment

1. Update your MongoDB Atlas network access to allow Netlify's IP ranges
2. Test the deployed application
3. Set up custom domain if desired

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Servers
- `GET /api/servers` - Get user's servers
- `POST /api/servers` - Create new server
- `GET /api/servers/:id` - Get server details

### Channels
- `GET /api/servers/:serverId/channels` - Get server channels
- `POST /api/channels` - Create new channel

### Messages
- `GET /api/channels/:channelId/messages` - Get channel messages
- `POST /api/messages` - Send message

## Socket.IO Events

### Client to Server
- `joinServer` - Join a server room
- `sendMessage` - Send a message
- `joinVoiceChannel` - Join voice channel
- `typing` - Send typing indicator

### Server to Client
- `newMessage` - New message received
- `userStatusUpdate` - User status changed
- `voiceChannelUpdate` - Voice channel state changed

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and Socket services
│   │   ├── context/        # React context providers
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── backend/
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── uploads/           # File uploads
├── netlify/
│   └── functions/         # Serverless functions
└── netlify.toml           # Netlify configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support or questions, please open an issue on GitHub.