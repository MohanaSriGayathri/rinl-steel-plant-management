import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const parseSupabaseError = (errorMessage: string): string => {
    try {
      console.log('Signup: Parsing error message:', errorMessage);
      
      // Check for specific error patterns
      if (errorMessage.includes('User already registered')) {
        return 'An account with this email already exists. Please use a different email or try logging in.';
      }
      
      if (errorMessage.includes('over_email_send_rate_limit')) {
        return 'For security purposes, you can only request this after 12 seconds.';
      }
      
      if (errorMessage.includes('email_address_invalid')) {
        return 'Please enter a valid email address.';
      }
      
      if (errorMessage.includes('password_too_short')) {
        return 'Password must be at least 6 characters long.';
      }
      
      if (errorMessage.includes('signup_disabled')) {
        return 'Account registration is currently disabled.';
      }

      if (errorMessage.includes('duplicate key value violates unique constraint')) {
        if (errorMessage.includes('users_email_key')) {
          return 'An account with this email already exists.';
        }
        if (errorMessage.includes('users_employee_id_key')) {
          return 'An account with this employee ID already exists.';
        }
        return 'This account information is already in use.';
      }
      
      // Return the original message if no specific parsing is needed
      return errorMessage;
    } catch (e) {
      console.error('Signup: Error parsing error message:', e);
      return 'An error occurred during signup. Please try again.';
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): string | null => {
    if (!formData.id.trim()) {
      return 'Employee ID is required';
    }

    if (!formData.email.trim()) {
      return 'Email address is required';
    }

    if (!validateEmail(formData.email)) {
      return 'Please enter a valid email address';
    }

    if (!formData.password) {
      return 'Password is required';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (!formData.role) {
      return 'Please select a role';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    console.log('Signup: Starting signup process for:', formData.email);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(
        formData.id.trim(),
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.role
      );

      if (error) {
        console.error('Signup: SignUp error:', error);
        const userFriendlyError = parseSupabaseError(error.message || 'An error occurred during signup');
        setError(userFriendlyError);
      } else {
        console.log('Signup: Account created successfully');
        setSuccess('Account created successfully! You can now sign in with your credentials.');
        
        // Clear form
        setFormData({
          id: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: ''
        });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Signup: Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <img src="https://upload.wikimedia.org/wikipedia/en/f/ff/Rashtriya_Ispat_Nigam.svg" alt="RINL Logo" className="h-15 w-14" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Join RINL
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Create your steel plant management account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-300 mb-2">
                Employee ID
              </label>
              <input
                id="id"
                name="id"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-600 placeholder-gray-400 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:z-10"
                placeholder="Enter your employee ID"
                value={formData.id}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-600 placeholder-gray-400 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:z-10"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:z-10"
                  placeholder="Create a password (min 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-600 placeholder-gray-400 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:z-10"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-600 placeholder-gray-400 text-white bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:z-10"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select your role</option>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-600 bg-slate-700 rounded"
              disabled={loading}
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
              I agree to the{' '}
              <a href="#" className="text-teal-500 hover:text-teal-400">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-teal-500 hover:text-teal-400">
                Privacy Policy
              </a>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <UserPlus className="h-5 w-5 text-teal-500 group-hover:text-teal-400" />
              </span>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-teal-500 hover:text-teal-400">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;