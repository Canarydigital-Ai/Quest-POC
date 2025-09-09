
import { BrowserRouter, Routes, Route } from "react-router-dom";
import QRScanner from "./pages/QRScanner"; 

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <QRScanner
              onResult={(text) => {
                console.log("QR result:", text);
              }}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
