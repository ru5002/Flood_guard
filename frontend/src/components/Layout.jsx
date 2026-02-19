import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./layout.css";

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="body">
        <Sidebar />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
