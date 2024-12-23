import React, { useState } from "react";
import villageApi from "../api/villageApi"; // Import the frontend API

const Registration = () => {
  const [formData, setFormData] = useState({
    village_name: "",
    team_name: "",
    admin_name: "",
    email_address: "",
    phone_number: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission status

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Set submitting state
    try {
      const response = await villageApi.registerVillage(formData); // Call the API
      console.log("Village registered:", response.data);
      alert("Village registered successfully!");
      setFormData({
        village_name: "",
        team_name: "",
        admin_name: "",
        email_address: "",
        phone_number: "",
      }); // Reset form
    } catch (error) {
      console.error("Error registering village:", error);
      alert("Failed to register village. Please try again.");
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Village Registration
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Village Name */}
          <div>
            <label
              htmlFor="village_name"
              className="block text-sm font-medium text-gray-700"
            >
              Village Name
            </label>
            <input
              type="text"
              id="village_name"
              name="village_name"
              value={formData.village_name}
              onChange={handleChange}
              required
              placeholder="Enter your village name"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          {/* Team Name */}
          <div>
            <label
              htmlFor="team_name"
              className="block text-sm font-medium text-gray-700"
            >
              Team Name
            </label>
            <input
              type="text"
              id="team_name"
              name="team_name"
              value={formData.team_name}
              onChange={handleChange}
              required
              placeholder="Enter your team name"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          {/* Admin Name */}
          <div>
            <label
              htmlFor="admin_name"
              className="block text-sm font-medium text-gray-700"
            >
              Admin Name
            </label>
            <input
              type="text"
              id="admin_name"
              name="admin_name"
              value={formData.admin_name}
              onChange={handleChange}
              required
              placeholder="Enter admin's full name"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email_address"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email_address"
              name="email_address"
              value={formData.email_address}
              onChange={handleChange}
              required
              placeholder="Enter admin's email address"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone_number"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
              placeholder="Enter admin's phone number"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-gray-700 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className={`w-full rounded-md px-4 py-2 text-white font-medium shadow-sm ${
                isSubmitting
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Register Village"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Registration;
