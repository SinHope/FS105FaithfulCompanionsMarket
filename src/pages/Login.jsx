import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import NavbarForLoginPage from "../components/NavbarForLoginPage";
import fcmlogo from "../images/logo/fcmlogo.jpeg";
import "../styles/Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        }
      );

      // If login is successful, response.data will contain the JWT token
      const token = response.data.token;
      const role = response.data.role;
      // Store the token securely on the client (e.g., in local storage or a state management solution)
      // For simplicity, you can use local storage for now:
      localStorage.setItem("token", token);

      // Clear any previous error message
      setErrorMessage("");
      if (role === "admin") {
        // Redirect to the admin page
        navigate("/admin/add-item");
      } else {
        // Redirect to the homepage
        navigate("/homepage");
      }

      // Redirect to a protected route or perform other actions based on successful login
      // For example, you can navigate to a dashboard:
      // history.push("/dashboard");
    } catch (err) {
      // Handle login failure and display an error message
      setSuccessMessage("");
      setErrorMessage(err.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div>
      <NavbarForLoginPage />
      <div className="row">
        {/* Column for the image */}
        <div className="col-md-6">
          <img
            src={fcmlogo}
            alt="Description"
            className="img-fluid custom-login-fcmlogo" // Bootstrap class for responsive images1`
          />
        </div>

        <div className="col-md-6">
          <div className="card custom-login-box">
            <div className="card-header p-5 custom-login-title">Login</div>
            {successMessage && (
              <p style={{ color: "green" }}>{successMessage}</p>
            )}
            {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group p-1">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    className="form-control email-input"
                    id="email"
                    name="email"
                    placeholder="Enter your email address here"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group p-1">
                  <label htmlFor="password">Password:</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control password-input"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    onClick={togglePasswordVisibility}
                    type="button"
                    className="bg-warning text-white password-input"
                  >
                    {showPassword ? "Hide" : "Show"} Password 👀
                  </button>
                </div>
                <button type="submit" className="custom-login-loginbutton">
                  Login
                </button>
                <Link to="/signup">
                  <button className="custom-login-registerbutton">
                    Don't have an account yet? Sign ups here!
                  </button>
                </Link>
                <br></br>
                <Link
                  to="/resetpassword"
                  style={{ textDecoration: "none", color: "black" }}
                  className="custom-login-forgotpassword-link"
                >
                  <em className="custom-login-forgotpassword">
                    Forgot your password? No worries. Reset now!
                  </em>
                </Link>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
