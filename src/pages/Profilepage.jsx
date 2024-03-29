import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import NavbarForProfilePage from "../components/NavbarForProfilePage.jsx"
import "../styles/profilepage.css";

const ProfilePage = () => {
  const [userData, setUserData] = useState({});
  const fileInputRef = useRef(null); // Reference to the file input
  const [newPassword, setNewPassword] = useState(""); // For users to edit and set new password
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(
          "http://localhost:5000/api/auth/ProfilePage",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUserData(response.data);
      } catch (error) {
        console.error("Error fetching profile", error);
        // Handle error (e.g., redirect to login if unauthorized)
      }
    };

    fetchProfile();
  }, []);

  const handleImageUpload = async (e) => {
    // Check if a file is selected
  if (e.target.files.length === 0) {
    console.error("No file selected for upload");
    return;
  }

    const formData = new FormData();
    formData.append("profileImage", e.target.files[0]);
    console.log("Uploading file:", e.target.files[0].name);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/uploads",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      ); // Update the user's profile state
      console.log("Upload response:", response.data);
      if (response.data) {
        setUserData(response.data);
      }
    } catch (error) {
      console.error("Error uploading image", error);
    }
  };

  const triggerFileInput = () => {
    // Trigger the hidden file input
    fileInputRef.current.click();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/auth/change-password",
        { newPassword, email: userData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Password changed successfully");
      setNewPassword("");
    } catch (error) {
      console.error("Error changing password", error);
      alert("Failed to change password");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (confirmDelete) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete("http://localhost:5000/api/auth/delete-account", {
          data: { email: userData.email },  
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Account deleted successfully");
        localStorage.removeItem("token"); // Remove token from storage
        window.location.href = "/"; // Redirect to home or login page
      } catch (error) {
        console.error("Error deleting account", error);
        alert("Failed to delete account");
      }
    }
  };

  return (

    <>
    <div className="custom-profilepage-background"><NavbarForProfilePage /></div>
    <div className="bg-light custom-profilepage-container">
      <h1 className="text-center fw-bold mt-5 p-5 ">{userData.name}</h1>
      <div className="text-center">
        
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />
      <div className="text-center">
        <Link to="/cartpage">
        <button
          className="btn btn-success m-3 custom-profilepage-vsc"
          
        >
          View Shopping Cart
        </button>
        </Link>
      </div>

      {/* Edit And Set Password Form */}
      <div className="text-center">
        <form onSubmit={handlePasswordChange}>
          
          <button type="submit" className="btn btn-warning custom-profilepage-changepassword">Change Password</button>
          <br></br>
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New Password"
          />
          <button
            onClick={togglePasswordVisibility}
            type="button"
            className="bg-transparent border-0 custom-profilepage-showpassword"
          >
            {showPassword ? "Hide" : "Show"} Password 👀
          </button>
        </form>
      </div>

      {/* Add Delete Account Button */}
      <div className="text-center mt-4">
        <button className="btn btn-danger custom-profilepage-deletebutton" onClick={handleDeleteAccount}>
          Delete Account
        </button>
      </div>
    </div>
  
    </>
    );
};

export default ProfilePage;


//userData.profileImagePath && (
  //<img
   // src=""
    //alt=""
   // className="rounded-circle"
   // style={{ width: "500px", height: "500px" }}
  //>
//)