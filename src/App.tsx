import { BrowserRouter, Routes, Route } from "react-router-dom";
import QRGenerator from "./pages/QRGenerator";
import QRScanner from "./pages/QRScanner";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QRGenerator />} />
        <Route
          path="/scan"
          element={
            <QRScanner
              onResult={(text) => {
                console.log("QR result:", text);
                // Example: parse and act
                try {
                  const payload = JSON.parse(text);
                  // e.g., if (payload.t === "rsvp") { ...mark attendance... }
                } catch {
                  // Non-JSON QR (e.g., URL) — handle as needed
                }
              }}
              onError={(e) => console.error(e)}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
