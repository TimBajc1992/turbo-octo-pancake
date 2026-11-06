import App from "./LegacyApp";
import "./style.css";
export default function LegacyEntry() {
  return (
    <>
      <aside
        style={{
          padding: "10px 20px",
          background: "#313936",
          color: "#fff",
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
