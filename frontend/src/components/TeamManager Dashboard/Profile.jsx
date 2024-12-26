import React, { useState } from 'react';

const Profile = ({ profilePhoto, setProfilePhoto }) => {
    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setProfilePhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <div className="bg-white p-4 rounded-lg shadow">
                <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-full mb-4"
                />
                <input
                    type="file"
                    onChange={handlePhotoUpload}
                    className="block text-sm text-gray-600 mb-4"
                />
                <p className="mt-4">Name: Team Manager</p>
                <p>Email: manager@example.com</p>
            </div>
        </div>
    );
};

export default Profile;
