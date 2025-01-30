import React, { useState } from 'react';
import loginImage from '../../../backend/uploads/loginpage1.jpg'; // One Image for both

const Loginn = () => {
  const [selectedRole, setSelectedRole] = useState('');

  const handleRoleSelection = (role) => {
    setSelectedRole(role);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      {/* Main Container */}
      <div className="flex w-full max-w-4xl rounded-lg shadow-2xl bg-white overflow-hidden">
        {/* Left Side: Login Form */}
        <div className="flex-1 p-6 lg:p-12">
          <img
            className="mx-auto h-10 w-auto"
            src="https://tailwindui.com/plus/img/logos/mark.svg?color=indigo&shade=600"
            alt="Your Company"
          />
          <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>

          <form className="mt-8 space-y-6" action="#" method="POST">
            {/* Role Selection */}
            <div>
              <p className="text-sm font-medium text-gray-900">Login as:</p>
              <div className="mt-4 flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelection('Admin')}
                  className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    selectedRole === 'Admin'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-transparent text-gray-900 outline outline-1 outline-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelection('Player')}
                  className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    selectedRole === 'Player'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-transparent text-gray-900 outline outline-1 outline-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Player
                </button>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900"
              >
                Email address
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 outline-gray-300 placeholder-gray-400 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900"
              >
                Password
              </label>
              <div className="mt-2">
                <input
                  type="password"
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 outline-gray-300 placeholder-gray-400 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Image */}
        <div className="hidden lg:flex lg:flex-1">
          {/* Use same image for both roles */}
          <img
            src={loginImage}
            alt="Login"
            className={`h-full w-full object-cover transition-all duration-500 ease-in-out ${
              selectedRole === 'Admin' ? 'opacity-90' : 'opacity-100'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default Loginn;
