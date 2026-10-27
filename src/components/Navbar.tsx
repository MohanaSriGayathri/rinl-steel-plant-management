import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuth();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Production', path: '/production' },
    { name: 'Materials Request', path: '/materials-request' },
    { name: 'Vendor Management', path: '/vendor-management' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      console.log('Navbar: Starting logout...');
      setIsMenuOpen(false); // Close mobile menu first
      
      await signOut();
      
      console.log('Navbar: Logout successful, navigating to home...');
      navigate('/', { replace: true }); // Use replace to prevent back navigation
      
      // Force a page reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Navbar: Error during logout:', error);
      // Even if there's an error, navigate to home
      navigate('/', { replace: true });
      window.location.reload();
    }
  };

  return (
    <nav className="bg-slate-900 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="https://upload.wikimedia.org/wikipedia/en/f/ff/Rashtriya_Ispat_Nigam.svg" alt="RINL Logo" className="h-8 w-8" />

              <span className="text-white text-xl font-bold">RINL</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-blue-700 text-white'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-300 text-sm">
                  Welcome, {userProfile?.employee_id || user.email?.split('@')[0] || 'User'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
                >
                  <User className="h-4 w-4" />
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-slate-800">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isActive(item.path)
                    ? 'bg-blue-700 text-white'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="border-t border-gray-700 pt-4">
              {user ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 text-gray-300 text-sm">
                    Welcome, {userProfile?.employee_id || user.email?.split('@')[0] || 'User'}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 text-teal-500 hover:text-teal-400 transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;