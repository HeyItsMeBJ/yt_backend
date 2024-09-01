
# YouTube Backend Project

This project is a backend system for a YouTube-like application, built using the MERN stack. It provides functionalities for video uploading, user authentication, video management, and more.

## Features

- **User Authentication**: Secure user registration and login using JSON Web Tokens (JWT) and bcrypt.
- **Video Uploading**: Handle video file uploads with proper validation and storage.
- **Video Management**: CRUD operations for video resources.
- **Middleware**: Ensure secure routing, file uploads, and request handling.
- **Data Aggregation**: Efficient querying and data aggregation using MongoDB's aggregate pipelines.
- **Subscription Handling**: Manage user subscriptions and related features.

## Technologies Used

- **Node.js**: JavaScript runtime for building the backend.
- **Express.js**: Web framework for Node.js to create RESTful APIs.
- **MongoDB**: NoSQL database for storing user and video data.
- **Mongoose**: ODM for MongoDB, used to interact with the database.
- **JSON Web Tokens (JWT)**: For secure user authentication.
- **bcrypt**: For hashing and securely storing user passwords.
- **Multer**: Middleware for handling multipart/form-data, used for file uploads.

## Getting Started

### Prerequisites

- Node.js
- MongoDB

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/yt-backend.git
    ```
2. Navigate to the project directory:
    ```sh
    cd yt-backend
    ```
3. Install dependencies:
    ```sh
    npm install
    ```

### Configuration

1. Create a `.env` file in the root directory and add the following environment variables:
    ```plaintext
    MONGO_URI=your_mongodb_uri
    JWT_SECRET=your_jwt_secret
    ```

### Running the Application

1. Start the server:
    ```sh
    npm start
    ```

2. The server will run on `http://localhost:5000`.

## API Endpoints

- **Auth**:
  - `POST /api/auth/register`: Register a new user.
  - `POST /api/auth/login`: Login an existing user.
  
- **Videos**:
  - `POST /api/videos`: Upload a new video.
  - `GET /api/videos`: Get all videos.
  - `GET /api/videos/:id`: Get a video by ID.
  - `PUT /api/videos/:id`: Update a video by ID.
  - `DELETE /api/videos/:id`: Delete a video by ID.

- **Subscriptions**:
  - `POST /api/subscriptions`: Subscribe to a channel.
  - `GET /api/subscriptions`: Get all subscriptions.

## License

This project is licensed under the MIT License.

## Acknowledgements

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [JWT](https://jwt.io/)
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [Multer](https://www.npmjs.com/package/multer)

## Contact

- GitHub: [Bhupesh Jain](https://github.com/HeyItsMeBJ)
- Email: bhupeshjain3221@gmail.com
