// Auth Feature Types - Discord Style

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} username - Username
 * @property {string} displayName - Display name
 * @property {string} avatar - Avatar URL
 * @property {string} status - User status (online, offline, away, dnd)
 * @property {Date} createdAt - Account creation date
 * @property {Date} lastSeen - Last seen date
 */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user - Current user
 * @property {string|null} token - JWT token
 * @property {boolean} isAuthenticated - Authentication status
 * @property {boolean} isLoading - Loading state
 * @property {string|null} error - Error message
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email - User email
 * @property {string} password - User password
 */

/**
 * @typedef {Object} RegisterCredentials
 * @property {string} email - User email
 * @property {string} username - Username
 * @property {string} displayName - Display name
 * @property {string} password - User password
 * @property {string} confirmPassword - Password confirmation
 */

/**
 * @typedef {Object} AuthFormState
 * @property {Object} data - Form data
 * @property {Object} errors - Form errors
 * @property {boolean} isValid - Form validity
 * @property {boolean} isSubmitting - Submission state
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Success status
 * @property {User} user - User data (if successful)
 * @property {string} token - JWT token (if successful)
 * @property {string} error - Error message (if failed)
 */
