# Article Share (Manual Implementation)

A secure, full-stack web application for sharing and managing article URLs. This project features a React frontend with a modern UI and a Node.js/Express backend backed by SQLite. It implements core security best practices including JWT authentication, password hashing, rate limiting, and input validation.

## Features

### Functional
* **User Authentication:** Secure Registration and Login using JWT (JSON Web Tokens).
* **Article Management:** Users can post URL links and view a feed of shared articles.
* **Permissions:** Users can delete their own posts.
* **Admin Role:** A built-in Admin account can moderate (delete) any post on the platform.
* **Persistence:** All data is stored persistently in a local SQLite database (`database.db`).

### Security (OWASP Hardening)
* **Password Hashing:** Uses `bcrypt` to salt and hash passwords before storage.
* **Rate Limiting:** Protects `/login` against brute-force attacks (Max 5 attempts per 15 mins).
* **Input Validation:** Validates URLs serverside to prevent XSS and malicious injections using `validator`.
* **Secure Config:** Uses `dotenv` to manage secrets (JWT keys) outside the codebase.

### UI/UX
* **Modern Interface:** Clean, card-based layout inspired by modern SaaS applications.
* **Feedback:** Toast notifications for success/error messages (no browser alerts).
* **Responsive:** Adapts to different screen sizes.
* **Visuals:** Uses `react-icons` for intuitive navigation and actions.

---

## Tech Stack

**Backend:**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** SQLite3
* **Security:** Bcrypt, JSON Web Token (JWT), Express-Rate-Limit, Validator

**Frontend:**
* **Framework:** React (Create React App)
* **HTTP Client:** Axios
* **Styling:** Custom CSS (Flexbox/Grid), Google Fonts (Inter)
* **Icons:** React Icons

---

## Installation

### 1. Prerequisites
Ensure you have **Node.js** (v14+) and **npm** installed.

### 2. Backend Setup
Navigate to the root `manual` directory and install server dependencies:
```bash
cd P4/manual
npm install
```

Create a `.env` file in the `manual` folder to store your secret key:
```
JWT_SECRET=change_this_to_a_secure_random_string
```

### 3. Frontend Setup
Navigate to the client directory and install React dependencies:
```bash
cd client
npm install
```

---

## Running the Application

You must run the Backend and Frontend in two separate terminal windows.

### Terminal 1: Backend
From the `manual` folder:
```bash
node server.js
```

Output: `Server running on http://localhost:3001`

### Terminal 2: Frontend
From the `manual/client` folder:
```bash
npm start
```

The application will launch automatically at `http://localhost:3000`

---

## Default Credentials

On the first run, the server automatically creates an Admin account if one does not exist.

* **Username:** `admin`
* **Password:** `admin`

**Note:** The admin account has special permissions to delete any article from any user.

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/register` | No | Register a new user account. |
| POST | `/login` | No | Login and receive a JWT token. (Rate Limited) |
| GET | `/articles` | No | Retrieve all posted articles. |
| POST | `/articles` | Yes | Post a new article URL (Must be valid HTTP/HTTPS). |
| DELETE | `/articles/:id` | Yes | Delete an article (Owner or Admin only). |

---

## Security Implementation Details

### 1. A07: Identification Failures
* Implemented `express-rate-limit` on the `/login` route to mitigate credential stuffing and brute force attacks.
* Passwords are never stored in plain text; they are hashed with `bcrypt`.

### 2. A03: Injection
* **SQL:** Used `sqlite3` parameterized queries (e.g., `VALUES (?, ?, ?)`) to strictly prevent SQL Injection.
* **XSS:** Used `validator.isURL` to ensure only valid web protocols are stored, preventing JavaScript injection via malicious links.

### 3. A05: Security Misconfiguration
* Sensitive keys (JWT Secrets) are loaded via `.env` files using `dotenv` and are not hardcoded in the source logic.

---

## Project Structure
```
P4/manual/
├── server.js              # Express backend server
├── database.db            # SQLite database (auto-created)
├── .env                   # Environment variables (JWT_SECRET)
├── package.json           # Backend dependencies
├── node_modules/          # Backend dependencies
└── client/
    ├── src/
    │   ├── App.js         # Main React component
    │   ├── App.css        # Application styles
    │   └── index.js       # React entry point
    ├── public/
    ├── package.json       # Frontend dependencies
    └── node_modules/      # Frontend dependencies
```

---

## Development Notes

* The SQLite database (`database.db`) is created automatically on first run.
* JWT tokens expire after 1 hour by default.
* All API responses return JSON format.
* CORS is enabled to allow frontend-backend communication during development.

---

## License

This project is for educational purposes as part of a security implementation assignment.