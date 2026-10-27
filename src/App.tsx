import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import About from './pages/About';
import Inventory from './pages/Inventory';
import Production from './pages/Production';
import MaterialsRequest from './pages/MaterialsRequest';
import VendorManagement from './pages/VendorManagement';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/production" element={<Production />} />
            <Route path="/materials-request" element={<MaterialsRequest />} />
            <Route path="/vendor-management" element={<VendorManagement />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Home />} />
          </Routes>
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;