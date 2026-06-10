import { Link } from "react-router-dom";

export default function CongruencePage() {
    return (
        
        <main>
        <header>

        <h1> Congruence </h1>

        <p>Congruence is the alignment between who you actually are, who you want to be, and how you act every day.
        Within BetterEveryDay, Congruence dynamically matches the activities you choose to work on with your energy 
        and focus levels. </p>

        <h2> Select your current mood and BetterEveryDay will recommend tasks that best match your energy and mindset. </h2>

        <p> What MOOD are you in?</p>

        <Link to = "/focus">
        <button> Focused </button>
        </Link>

        <Link to = "/curious">
        <button> Curious </button>
        </Link>
        <Link to = "/social">
        <button> Social </button>
        </Link>
        <Link to = "/creative">
        <button> Creative </button>
        </Link>
        <Link to = "/overwhelmed">
        <button> Overwhelmed </button>
        </Link>


        </header>
        </main>
    );
}