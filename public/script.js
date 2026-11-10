// Global state
let currentUser = null;
let currentPostIdForComments = null;
let searchTimeout = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Create post form
    document.getElementById('createPostForm').addEventListener('submit', handleCreatePost);
    
    // Image input change
    document.getElementById('postImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('selectedFileName').textContent = `Selected: ${file.name}`;
        } else {
            document.getElementById('selectedFileName').textContent = '';
        }
    });
    
    // Add comment form
    document.getElementById('addCommentForm').addEventListener('submit', handleAddComment);
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user/current');
        if (response.ok) {
            currentUser = await response.json();
            showMainApp();
            loadFeed();
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuthModal();
    }
}

// Show/Hide UI elements
function showAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
}

function hideAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function showMainApp() {
    hideAuthModal();
    document.getElementById('navbar').style.display = 'block';
    document.getElementById('mainContent').style.display = 'block';
}

// Auth functions
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
    document.getElementById('authTitle').textContent = 'Create Account';
    document.getElementById('authError').textContent = '';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('authTitle').textContent = 'Welcome to SocialHub';
    document.getElementById('authError').textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Login successful!', 'success');
            await checkAuthStatus();
        } else {
            document.getElementById('authError').textContent = data.error || 'Login failed';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('authError').textContent = 'Network error. Please try again.';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const full_name = document.getElementById('registerFullName').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, full_name, password })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Registration successful!', 'success');
            await checkAuthStatus();
        } else {
            document.getElementById('authError').textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        console.error('Register error:', error);
        document.getElementById('authError').textContent = 'Network error. Please try again.';
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        showAuthModal();
        showLoginForm();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Navigation
function showFeed() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('feedView').classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('feedBtn').classList.add('active');
    
    loadFeed();
}

function showProfile(userId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('profileView').classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (userId === currentUser.id) {
        document.getElementById('profileBtn').classList.add('active');
    }
    
    loadProfile(userId);
}

// Search users
async function searchUsers() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsContainer = document.getElementById('searchResults');

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    if (query.length < 2) {
        resultsContainer.classList.remove('active');
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/users/search/${encodeURIComponent(query)}`);
            const users = await response.json();

            if (users.length > 0) {
                resultsContainer.innerHTML = users.map(user => `
                    <div class="search-result-item" onclick="showProfile(${user.id}); document.getElementById('searchResults').classList.remove('active'); document.getElementById('searchInput').value = '';">
                        <div class="search-result-avatar">${user.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="font-weight: 600;">${escapeHtml(user.full_name)}</div>
                            <div style="font-size: 0.85rem; color: var(--text-light);">@${escapeHtml(user.username)}</div>
                        </div>
                    </div>
                `).join('');
                resultsContainer.classList.add('active');
            } else {
                resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-light);">No users found</div>';
                resultsContainer.classList.add('active');
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
}

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    const searchContainer = document.querySelector('.nav-search');
    if (searchContainer && !searchContainer.contains(e.target)) {
        document.getElementById('searchResults').classList.remove('active');
    }
});

// Load feed
async function loadFeed() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '<p class="loading">Loading posts...</p>';

    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>No posts yet. Be the first to share something!</p>
                </div>
            `;
        } else {
            container.innerHTML = posts.map(post => renderPost(post)).join('');
        }
    } catch (error) {
        console.error('Load feed error:', error);
        container.innerHTML = '<p class="loading">Error loading posts</p>';
    }
}

// Load profile
async function loadProfile(userId) {
    const headerContainer = document.getElementById('profileHeader');
    const postsContainer = document.getElementById('profilePosts');

    headerContainer.innerHTML = '<p class="loading">Loading profile...</p>';
    postsContainer.innerHTML = '';

    try {
        const response = await fetch(`/api/users/${userId}`);
        const user = await response.json();

        const isOwnProfile = userId === currentUser.id;

        headerContainer.innerHTML = `
            <div class="profile-info">
                <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
                <div class="profile-details">
                    <h2>${escapeHtml(user.full_name)}</h2>
                    <div class="profile-username">@${escapeHtml(user.username)}</div>
                    ${user.bio ? `<div class="profile-bio">${escapeHtml(user.bio)}</div>` : ''}
                </div>
            </div>
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-value">${user.posts_count}</div>
                    <div class="stat-label">Posts</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${user.followers_count}</div>
                    <div class="stat-label">Followers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${user.following_count}</div>
                    <div class="stat-label">Following</div>
                </div>
            </div>
            ${!isOwnProfile ? `
                <div class="profile-actions">
                    <button class="btn-primary" onclick="toggleFollow(${userId})" id="followBtn-${userId}">
                        ${user.is_following ? 'Unfollow' : 'Follow'}
                    </button>
                </div>
            ` : ''}
        `;

        // Load user's posts
        const postsResponse = await fetch(`/api/posts/user/${userId}`);
        const posts = await postsResponse.json();

        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p>${isOwnProfile ? 'You haven\'t posted anything yet' : 'No posts yet'}</p>
                </div>
            `;
        } else {
            postsContainer.innerHTML = posts.map(post => renderPost(post)).join('');
        }
    } catch (error) {
        console.error('Load profile error:', error);
        headerContainer.innerHTML = '<p class="loading">Error loading profile</p>';
    }
}

// Render post
function renderPost(post) {
    const timeAgo = getTimeAgo(post.created_at);
    const isOwnPost = post.user_id === currentUser.id;

    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-user-info" onclick="showProfile(${post.user_id})">
                    <div class="post-avatar">${post.username.charAt(0).toUpperCase()}</div>
                    <div class="post-user-details">
                        <h4>${escapeHtml(post.full_name)}</h4>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                </div>
                ${isOwnPost ? `<button class="post-delete" onclick="deletePost(${post.id})">🗑️</button>` : ''}
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            ${post.image ? `<img src="/uploads/${post.image}" alt="Post image" class="post-image">` : ''}
            <div class="post-stats">
                <span>${post.likes_count} ${post.likes_count === 1 ? 'like' : 'likes'}</span>
                <span>${post.comments_count} ${post.comments_count === 1 ? 'comment' : 'comments'}</span>
            </div>
            <div class="post-actions">
                <button class="post-action-btn ${post.user_liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    ${post.user_liked ? '❤️' : '🤍'} Like
                </button>
                <button class="post-action-btn" onclick="openComments(${post.id})">
                    💬 Comment
                </button>
            </div>
        </div>
    `;
}

// Create post
async function handleCreatePost(e) {
    e.preventDefault();
    
    const content = document.getElementById('postContent').value;
    const imageInput = document.getElementById('postImage');
    const formData = new FormData();
    
    formData.append('content', content);
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showNotification('Post created successfully!', 'success');
            document.getElementById('createPostForm').reset();
            document.getElementById('selectedFileName').textContent = '';
            loadFeed();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Failed to create post', 'error');
        }
    } catch (error) {
        console.error('Create post error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Post deleted successfully', 'success');
            document.querySelector(`[data-post-id="${postId}"]`).remove();
        } else {
            showNotification('Failed to delete post', 'error');
        }
    } catch (error) {
        console.error('Delete post error:', error);
        showNotification('Network error', 'error');
    }
}

// Toggle like
async function toggleLike(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            
            // Update like button
            const likeBtn = postCard.querySelector('.post-action-btn');
            if (data.liked) {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = '❤️ Like';
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = '🤍 Like';
            }
            
            // Reload to update counts
            if (document.getElementById('feedView').classList.contains('active')) {
                loadFeed();
            } else {
                const profileView = document.getElementById('profileView');
                if (profileView.classList.contains('active')) {
                    const userId = postCard.querySelector('.post-user-info').getAttribute('onclick').match(/\d+/)[0];
                    loadProfile(parseInt(userId));
                }
            }
        }
    } catch (error) {
        console.error('Toggle like error:', error);
    }
}

// Comments
function openComments(postId) {
    currentPostIdForComments = postId;
    document.getElementById('commentModal').classList.add('active');
    loadComments(postId);
}

function closeCommentModal() {
    document.getElementById('commentModal').classList.remove('active');
    currentPostIdForComments = null;
}

async function loadComments(postId) {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '<p class="loading">Loading comments...</p>';

    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        const comments = await response.json();

        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No comments yet</p>';
        } else {
            container.innerHTML = comments.map(comment => `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div>
                            <span class="comment-user">${escapeHtml(comment.username)}</span>
                            <span class="comment-time"> · ${getTimeAgo(comment.created_at)}</span>
                        </div>
                        ${comment.user_id === currentUser.id ? `
                            <button class="comment-delete" onclick="deleteComment(${comment.id})">Delete</button>
                        ` : ''}
                    </div>
                    <div class="comment-content">${escapeHtml(comment.content)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Load comments error:', error);
        container.innerHTML = '<p class="loading">Error loading comments</p>';
    }
}

async function handleAddComment(e) {
    e.preventDefault();
    
    const content = document.getElementById('commentInput').value;

    try {
        const response = await fetch(`/api/posts/${currentPostIdForComments}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            document.getElementById('commentInput').value = '';
            loadComments(currentPostIdForComments);
            
            // Update comment count in post
            if (document.getElementById('feedView').classList.contains('active')) {
                loadFeed();
            }
        } else {
            showNotification('Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showNotification('Network error', 'error');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }

    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            document.querySelector(`[data-comment-id="${commentId}"]`).remove();
            showNotification('Comment deleted', 'success');
            
            // Reload feed to update counts
            if (document.getElementById('feedView').classList.contains('active')) {
                loadFeed();
            }
        } else {
            showNotification('Failed to delete comment', 'error');
        }
    } catch (error) {
        console.error('Delete comment error:', error);
        showNotification('Network error', 'error');
    }
}

// Follow/Unfollow
async function toggleFollow(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/follow`, {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            const btn = document.getElementById(`followBtn-${userId}`);
            btn.textContent = data.following ? 'Unfollow' : 'Follow';
            showNotification(data.message, 'success');
            
            // Reload profile to update counts
            loadProfile(userId);
        }
    } catch (error) {
        console.error('Toggle follow error:', error);
        showNotification('Network error', 'error');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return past.toLocaleDateString();
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
