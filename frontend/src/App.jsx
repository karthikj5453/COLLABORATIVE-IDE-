import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    socket.on("update-code", (newCode) => {
      setCode(newCode);
    });
  }, []);

  const joinRoom = () => {
    if (room.trim() !== "") {
      socket.emit("join-room", room);
      setJoined(true);
    }
  };

  const handleChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    socket.emit("code-change", { roomId: room, code: newCode });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      {!joined ? (
        <>
          <h2>Antigravity Collaborative IDE</h2>
          <input
            placeholder="Enter Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <br /><br />
          <button onClick={joinRoom}>Join Room</button>
        </>
      ) : (
        <>
          <h3>Room: {room}</h3>
          <textarea
            rows="18"
            cols="90"
            value={code}
            onChange={handleChange}
            placeholder="Start typing code here..."
          />
        </>
      )}
    </div>
  );
}

export default App;
