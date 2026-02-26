import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { VehicleSelectPage } from './pages/VehicleSelectPage';
import { ParkingLayoutPage } from './pages/ParkingLayoutPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { DashboardPage } from './pages/DashboardPage';
import { VerifyPage } from './pages/VerifyPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Gate verification — public, no navbar */}
        <Route path="/verify" element={<VerifyPage />} />

        {/* Main app — with navbar */}
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/select" element={<VehicleSelectPage />} />
              <Route path="/layout" element={<ParkingLayoutPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;
