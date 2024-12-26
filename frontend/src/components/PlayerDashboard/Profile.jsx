import React, { useState } from 'react';

const Profile = () => {
    // Hardcoded player data (replace with actual dynamic data if needed)
    const [player, setPlayer] = useState({
        id: '12345',
        name: 'John Doe',
        mobile: '9876543210',
        email: 'john.doe@example.com',
        profilePhoto: 'https://via.placeholder.com/150',
    });

    const [newProfilePhoto, setNewProfilePhoto] = useState(player.profilePhoto);

    // Handle profile photo upload
    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setNewProfilePhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle password update (mock-up functionality)
    const handlePasswordUpdate = () => {
        alert('Password update feature is under construction!');
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center space-x-4">
                    {/* Profile Image */}
                    <img
                        src={newProfilePhoto}
                        alt="Profile"
                        className="w-24 h-24 rounded-full"
                    />
                    <div>
                        {/* Player Info */}
                        <p className="text-lg font-semibold">Name: {player.name}</p>
                        <p>Email: {player.email}</p>
                        <p>Mobile: {player.mobile}</p>
                        <p>ID: {player.id}</p>
                    </div>
                </div>

                {/* Change Profile Picture */}
                <div className="mt-4">
                    <input
                        type="file"
                        onChange={handlePhotoUpload}
                        className="block text-sm text-gray-600"
                    />
                </div>

                {/* Update Password Button */}
                <button
                    onClick={handlePasswordUpdate}
                    className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                    Update Password
                </button>
            </div>
        </div>
    );
};

export default Profile;
