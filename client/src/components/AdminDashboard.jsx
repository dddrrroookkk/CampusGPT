import { useState } from "react";

function AdminDashboard({ user, onBack, onLogout }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch(
        "http://127.0.0.1:5000/api/documents/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Upload failed"
        );
      }

      setMessage(
        `${data.fileName} uploaded successfully. ${data.chunks} chunks created.`
      );

      setFile(null);

      document.getElementById("pdfInput").value = "";
    } catch (error) {
      console.error("Upload error:", error);

      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-page">

      {/* Header */}

      <header className="admin-header">
        <div>
          <h1>CampusGPT</h1>
          <p>Admin Dashboard</p>
        </div>

        <div className="admin-header-actions">
          <span>{user.name}</span>

          <button onClick={onBack}>
            Chat
          </button>

          <button onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main */}

      <main className="admin-container">

        <div className="admin-card">

          <div className="admin-icon">
            📄
          </div>

          <h2>
            Upload Campus Document
          </h2>

          <p className="admin-description">
            Upload an official campus PDF to add
            its information to CampusGPT.
          </p>

          {/* File input */}

          <label
            htmlFor="pdfInput"
            className="file-label"
          >
            {file
              ? file.name
              : "Choose a PDF file"}
          </label>

          <input
            id="pdfInput"
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setMessage("");
              setError("");
            }}
            className="file-input"
          />

          {/* Upload */}

          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading
              ? "Processing document..."
              : "Upload Document"}
          </button>

          {/* Success */}

          {message && (
            <div className="upload-success">
              ✅ {message}
            </div>
          )}

          {/* Error */}

          {error && (
            <div className="upload-error">
              ❌ {error}
            </div>
          )}

          {uploading && (
            <p className="processing-text">
              Extracting text, creating chunks
              and generating embeddings...
              <br />
              This may take a little while for
              large PDFs.
            </p>
          )}

        </div>

      </main>
    </div>
  );
}

export default AdminDashboard;