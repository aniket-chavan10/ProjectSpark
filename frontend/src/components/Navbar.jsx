import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../backend/uploads/images/logo.webp"

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
          <div className="flex-shrink-0">
  <img
    src={logo} // Update this path
    alt="logo"
    className="w-16 h-16 object-contain transform transition-transform duration-500 hover:scale-105"
  />
</div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </a>
                <a href="/news" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  News
                </a>
                <a href="/players" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Players
                </a>
                <a href="/rankings" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Rankings
                </a>
                <a href="/about" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  About
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/sign-in")}
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/sign-up")}
              className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600"
            >
              Sign Up
            </button>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-700 inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`${isOpen ? "block" : "hidden"} md:hidden`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <a href="/" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            Home
          </a>
          <a href="/news" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            News
          </a>
          <a href="/players" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            Players
          </a>
          <a href="/rankings" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            Rankings
          </a>
          <a href="/about" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            About
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
