import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Auth from "./components/Auth";
import "./index.css";

const API_URL = "https://campusgpt-tam1.onrender.com";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <CampusChat
      user={user}
      onLogout={handleLogout}
    />
  );
}

function CampusChat({ user, onLogout }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/chat/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load history"
          );
        }

        setMessages(data.messages || []);
      } catch (error) {
        console.error("History error:", error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, []);

  const askQuestion = async () => {
    if (!question.trim() || loading) return;

    const userQuestion = question.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userQuestion,
      },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            question: userQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Something went wrong"
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong while connecting to CampusGPT.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>CampusGPT</h1>

          <p>
            AI-powered campus knowledge assistant
          </p>
        </div>

        <div className="user-section">
          <span>{user.name}</span>

          <button onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="chat-container">
        {historyLoading ? (
          <div className="welcome">
            <div className="logo">🎓</div>

            <h2>
              Loading your conversations...
            </h2>
          </div>
        ) : messages.length === 0 ? (
          <div className="welcome">
            <div className="logo">🎓</div>

            <h2>
              Welcome, {user.name}
            </h2>

            <p>
              Ask questions about academics,
              examinations, hostel, placements
              and other campus information.
            </p>

            <div className="suggestions">
              <button
                onClick={() =>
                  setQuestion(
                    "What are the hostel rules?"
                  )
                }
              >
                What are the hostel rules?
              </button>

              <button
                onClick={() =>
                  setQuestion(
                    "What are the placement eligibility requirements?"
                  )
                }
              >
                What are the placement
                eligibility requirements?
              </button>

              <button
                onClick={() =>
                  setQuestion(
                    "What is the attendance requirement?"
                  )
                }
              >
                What is the attendance
                requirement?
              </button>
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message-row ${message.role}`}
              >
                <div className="avatar">
                  {message.role === "user"
                    ? "👤"
                    : "🤖"}
                </div>

                <div className="message">
                  <div className="message-content">
                    {message.role === "assistant" ? (
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>

                  {message.sources &&
                    message.sources.length > 0 && (
                      <div className="sources">
                        <strong>
                          Sources
                        </strong>

                        {message.sources.map(
                          (source, i) => (
                            <div
                              className="source"
                              key={i}
                            >
                              <span>
                                📄{" "}
                                {source.documentName}
                              </span>

                              <small>
                                Relevance:{" "}
                                {source.score?.toFixed(2)}
                              </small>
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-row assistant">
                <div className="avatar">
                  🤖
                </div>

                <div className="message">
                  <div className="typing">
                    CampusGPT is thinking...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="input-area">
        <div className="input-box">
          <textarea
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask CampusGPT something..."
            rows="1"
          />

          <button
            className="send-button"
            onClick={askQuestion}
            disabled={
              loading || !question.trim()
            }
          >
            ➤
          </button>
        </div>

        <p className="hint">
          CampusGPT answers using the available
          campus documents.
        </p>
      </div>
    </div>
  );
}

export default App;