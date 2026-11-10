# SocialHub - Full-Stack Social Media Platform

A complete social media platform built with Node.js, Express, and SQLite. Features include user authentication, posts with images, comments, likes, follow system, and real-time feed.

## Features

### User Management
- User registration and login
- Secure password hashing with bcrypt
- Session-based authentication
- User profiles with bio and stats
- Search users by username or name

### Posts
- Create posts with text and images
- View personalized feed
- Delete your own posts
- Image upload support (JPEG, PNG, GIF)
- View posts by specific users

### Interactions
- Like/unlike posts
- Comment on posts
- Delete your own comments
- Real-time like and comment counts

### Social Features
- Follow/unfollow users
- View followers and following lists
- Follower and following counts
- User profiles with statistics

## Tech Stack

**Frontend:**
- HTML5
- CSS3 (Custom responsive design)
- Vanilla JavaScript (No frameworks)

**Backend:**
- Node.js
- Express.js
- better-sqlite3 (SQLite database)
- express-session (Session management)
- bcryptjs (Password hashing)
- multer (File uploads)
- express-validator (Input validation)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Steps

1. **Extract the files** to a folder (e.g., `social-media-platform`)

2. **Open terminal/command prompt** in the project folder

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create uploads folder:**
   ```bash
   mkdir uploads
   ```
   
   On Windows Command Prompt:
   ```cmd
   md uploads
   ```

5. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Open your browser** and go to:
   ```
   http://localhost:3000
   ```

## Usage

### Getting Started

1. **Register a new account:**
   - Click "Sign up" on the welcome screen
   - Enter username, email, full name, and password
   - Click "Sign Up"

2. **Login:**
   - Enter your username and password
   - Click "Login"

3. **Create your first post:**
   - Type your message in the "What's on your mind?" box
   - Optionally add an image by clicking "Add Photo"
   - Click "Post"

4. **Interact with posts:**
   - Click ❤️ to like a post
   - Click 💬 to view and add comments
   - Click 🗑️ to delete your own posts

5. **Find and follow users:**
   - Use the search bar at the top
   - Click on a user to view their profile
   - Click "Follow" to follow them
   - View their posts on their profile page

6. **Manage your profile:**
   - Click "Profile" in the navigation
   - View your posts, followers, and following counts

## Project Structure

```
social-media-platform/
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── social_media.db        # SQLite database (created automatically)
├── public/                # Frontend files
│   ├── index.html        # Main HTML file
│   ├── styles.css        # All CSS styles
│   └── script.js         # Frontend JavaScript
├── uploads/              # User uploaded images
└── README.md             # This file
```

## Database Schema

The SQLite database includes the following tables:

- **users** - User accounts and profiles
- **posts** - User posts with content and images
- **comments** - Comments on posts
- **likes** - Post likes
- **followers** - Follow relationships between users

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user/current` - Get current user info

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/search/:query` - Search users
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/followers` - Get followers list
- `GET /api/users/:id/following` - Get following list

### Posts
- `POST /api/posts` - Create new post
- `GET /api/posts` - Get all posts (feed)
- `GET /api/posts/user/:userId` - Get user's posts
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post

### Comments
- `POST /api/posts/:id/comments` - Add comment
- `GET /api/posts/:id/comments` - Get comments
- `DELETE /api/comments/:id` - Delete comment

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- SQL injection prevention with prepared statements
- Input validation and sanitization
- File upload restrictions (type and size)
- XSS protection with HTML escaping
- CSRF protection via session tokens

## Customization

### Change Port
Edit `server.js` line 9:
```javascript
const PORT = process.env.PORT || 3000; // Change 3000 to your port
```

### Change Session Secret
Edit `server.js` line 76:
```javascript
secret: 'your-new-secret-key-here'
```

### Modify Upload Limits
Edit `server.js` line 85:
```javascript
limits: { fileSize: 5 * 1024 * 1024 }, // Change 5MB to your limit
```

### Update Colors
Edit `public/styles.css` lines 8-15 (CSS variables):
```css
:root {
    --primary-color: #1877f2; /* Change to your color */
    --secondary-color: #42b72a;
    /* ... */
}
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, change the port in `server.js` or kill the process:
```bash
# Find process using port 3000
npx kill-port 3000
```

### Database Locked Error
Stop the server and restart it. The database file might be in use by another process.

### Images Not Uploading
- Check that the `uploads` folder exists
- Verify file size is under 5MB
- Ensure file type is JPEG, PNG, or GIF

### Module Not Found
Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Development Tips

### Reset Database
Delete `social_media.db` file and restart the server. A fresh database will be created.

### View Database
Use SQLite browser:
```bash
npm install -g sqlite3
sqlite3 social_media.db
```

### Enable Debug Logging
Add to `server.js` after line 11:
```javascript
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
```

## Future Enhancements

Potential features to add:
- Direct messaging
- Notifications system
- Email verification
- Password reset functionality
- Post editing
- Image filters and cropping
- Video uploads
- Stories feature
- Hashtags and trending topics
- Privacy settings
- Block/report users
- Admin dashboard

## License

MIT License - feel free to use this project for learning and personal projects.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments in `server.js`
3. Verify all dependencies are installed correctly

---

**Created with ❤️ for learning full-stack development**
