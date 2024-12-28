import React, { useState } from "react";
import playerApi from "../../api/playerApi";

const AddNewPlayer = () => {
  const [playerDetails, setPlayerDetails] = useState({
    full_name: "",
    mobile_number: "",
    email: "",
    profile_picture: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlayerDetails({
      ...playerDetails,
      [name]: value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPlayerDetails({
      ...playerDetails,
      profile_picture: file,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("full_name", playerDetails.full_name);
      formData.append("mobile_number", playerDetails.mobile_number);
      formData.append("email", playerDetails.email);
      if (playerDetails.profile_picture) {
        formData.append("profile_picture", playerDetails.profile_picture);
      }

      const response = await playerApi.createPlayer(formData); // Pass the formData to API
      console.log("Player added successfully:", response.data);
      alert("Player added successfully!");

      // Reset the form
      setPlayerDetails({
        full_name: "",
        mobile_number: "",
        email: "",
        profile_picture: null,
      });
    } catch (error) {
      console.error("Error adding player:", error);
      alert("Failed to add player. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Players</h1>

      {/* Form to Add New Player */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Add New Player
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={playerDetails.full_name}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              placeholder="Enter full name"
              required
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="mobile_number"
              value={playerDetails.mobile_number}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              placeholder="Enter mobile number"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={playerDetails.email}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              placeholder="Enter email address"
              required
            />
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Profile Picture
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-gray-700 border border-gray-300 rounded-lg shadow-sm file:bg-blue-50 file:border-0 file:text-blue-600 file:rounded-lg file:px-4 file:py-2 file:cursor-pointer hover:file:bg-blue-100"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding Player..." : "Add Player"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddNewPlayer;
