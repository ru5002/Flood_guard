import { Link } from "react-router-dom";
import "./sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Link to="/" className="side-link">Home</Link>
      <Link to="/map" className="side-link">See Predictions</Link>
      <Link to="/weather" className="side-link">See Weather</Link>
      <Link to="/donate" className="side-link">Donate</Link>
      <Link to="/login" className="side-link">Login</Link>
    </aside>
  );
}
