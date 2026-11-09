import App from "./LegacyApp";
import "./style.css";
import "./midnight-bone.css";
export default function LegacyEntry() {
  return (
    <>
      <aside
        style={{
          padding: "10px 20px",
          background: "#1F2A44",
          color: "#F2EEE6",
          fontSize: 12,
          position: "relative",
          zIndex: 100,
        }}
      >
        Prejšnji vmesnik Težišče · isti podatki{" "}
        <button
          style={{ marginLeft: 12 }}
          onClick={() => {
            localStorage.removeItem("moc-forma:interface");
            location.reload();
          }}
        >
          Odpri Moč & Formo
        </button>
      </aside>
      <App />
    </>
  );
}
