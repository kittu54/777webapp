# 🤖 Article Share (Vibecoded Implementation)

A full-stack article sharing web application generated using AI (Replit Agent). This implementation uses a monolithic architecture where the Node.js backend serves a static Vanilla JavaScript frontend.

## 📂 Architecture

* **Backend:** Node.js with Express.js
* **Database:** SQLite3 (Persistent file: `database.sqlite`)
* **Authentication:** Server-side sessions using `express-session` and `bcrypt` for password hashing.
* **Frontend:** Vanilla HTML, CSS, and JavaScript (served from the `public/` directory).

## 🚀 Installation & Setup

1.  **Navigate to the directory:**
    ```bash
    cd P4/vibes
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Server:**
    ```bash
    node server.js
    ```

4.  **Access the Application:**
    Open your browser and navigate to: `http://localhost:5000`
    *(Note: The server runs on port 5000 by default)*

## 🔑 Administrative Access

On the first startup, the system automatically seeds an Admin account if it does not already exist.

* **Username:** `admin`
* **Password:** `admin`

**Admin Privileges:**
* The admin account has the ability to delete **any** article posted to the platform.
* Regular users can only delete their own articles.

## 🛡️ Security Features

* **Password Encryption:** User passwords are hashed using `bcrypt` (salt rounds: 10) before storage.
* **Session Management:** Uses HTTP sessions (`express-session`) to manage user login states.
* **Input Validation:**
    * Usernames must be at least 3 characters.
    * Passwords must be at least 4 characters.
    * Article URLs are validated to ensure they are properly formatted.
* **XSS Protection:** The frontend implements basic HTML escaping (`escapeHtml` function) when rendering user content to prevent Cross-Site Scripting.