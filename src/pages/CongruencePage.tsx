import { Link } from "react-router-dom";

export default function CongruencePage() {
  return (
    <div>
      <h1>Congruence</h1>
      <hr />
      <p className="congruence-intro">
        Congruence is the alignment between who you actually are, who you want to be,
        and how you act every day. Within BetterEveryDay, Congruence dynamically matches
        the activities you choose to work on with your energy and focus levels.
      </p>

      <div className="section-heading">Select your current mood</div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
        BetterEveryDay will recommend tasks that best match your energy and mindset.
      </p>

      <div className="mood-grid">
        <Link to="/focus"><button>Focused</button></Link>
        <Link to="/curious"><button>Curious</button></Link>
        <Link to="/social"><button>Social</button></Link>
        <Link to="/creative"><button>Creative</button></Link>
        <Link to="/overwhelmed"><button>Overwhelmed</button></Link>
      </div>
    </div>
  );
}
