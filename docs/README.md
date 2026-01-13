# Documentation Page - PDF Management (MongoDB)

## Overview

The documentation page displays PDFs stored in a MongoDB database. This allows for centralized storage and management of documentation files without relying on the local file system of the server.

## 🎯 Features

### 1. **Upload PDFs**
- Click the "Upload PDF" button in the top-right corner
- Select any PDF file from your computer (max 50MB)
- File is uploaded and stored directly in MongoDB
- **File Validation**:
  - Only `.pdf` files accepted
  - Max size: 50MB
- **Smart Notifications**: Success/Error feedback with animations

### 2. **View PDFs**
- Displays all PDFs stored in the database
- Clicking a card opens the PDF in the **same tab**
- PDF is served directly from the database via `/api/pdfs/view/:id`

### 3. **Automatic Updates**
- List refreshes automatically after upload

## 🔧 Technical Details

### Database Schema (MongoDB)

Uses Mongoose with the following schema:
- `fileName`: Original filename (unique)
- `displayName`: Formatted name for display
- `fileData`: Binary data (Buffer)
- `contentType`: MIME type (application/pdf)
- `size`: File size in bytes
- `uploadedAt`: Timestamp

### API Endpoints

**GET `/api/pdfs`**
- Returns metadata for all PDFs (excluding binary data for performance)
- Response: `[{ name, fileName, path, uploadedAt }]`

**POST `/api/pdfs/upload`**
- Accepts `multipart/form-data`
- Parses file using `formidable`
- Saves binary data to MongoDB
- Returns success status

**GET `/api/pdfs/view/:id`**
- Streams the PDF binary data from MongoDB to the browser
- Sets correct Content-Type and Content-Disposition

## 🚀 Usage

1. **Configure Database**: ensure `MONGODB_URI` is set in `.env`
2. **Access Page**: Navigate to `/service/documentation`
3. **Manage**: Upload and View PDFs directly from the UI

## 📦 Dependencies

- **Utilities**: `src/utils/database.js` (MongoDB connection)
- **Plugin**: `src/plugins/pdfManifestPlugin.js` (API handlers)
- **Model**: `src/models/PDF.js` (Mongoose Schema)
- **Packages**: `mongoose`, `mongodb`, `formidable`, `dotenv`
