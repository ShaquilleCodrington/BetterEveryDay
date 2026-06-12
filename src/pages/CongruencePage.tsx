import { Link } from "react-router-dom";

const stateCards = [
    {
        title: "Focused",
        description: "Ready for Deep work that moves the needle.",
        
        lastSession: "No Sessions Yet",
        readyTasks: "0 Tasks",
        nextTask: "No Focus Tasks",

        buttonText: "Enter Focus",
        route: "/focus",
    },

    {
        title: "Planning",
        description: "Organize ideas and prepare for execution.",

        lastSession: "No Sessions Yet",
        readyTasks: "0 Tasks",
        nextTask: "No Planning Tasks",

        buttonText: "Start Planning",
        route: "/planning",
  },

  {
        title: "Recharge",
        description:
        "Recover energy while staying engaged through reflection, learning, or light creative work.",

        lastSession: "No Sessions Yet",
        readyTasks: "0 Tasks",
        nextTask: "No Recharge Tasks",

        buttonText: "Begin Recharge",
        route: "/recharge",
  },
    
]

export default function CongruencePage() {
    return (
        
        <main>

            <header>

                <h1> Congruence </h1>

                <p>Congruence is the alignment between who you actually are, who you want to be
                , and how you act every day. </p>

                <p> Within BetterEveryDay, Congruence dynamically matches the activities you choose to work on with your energy 
                and focus levels. </p>

                 </header>

                 <div className = " how-it-works">
                    <h2> How it works </h2>

                    <ol>

                        <li>Select how you're showing up today.</li>

                        <li>Better Every Day recommends work that matches your mindset.</li>

                        <li>Stay productive with activities designed for that state.</li>

                    </ol>
                    
                 </div>

                     <div className="state-selection">

                        <h2>
                            How are you showing up today?
                        </h2>

                        
                        { stateCards.map((state) => (

                            <div key = { state.title }
                                 className="state-card">

                            <h3>{state.title}</h3>

                            <p>{state.description}</p>
                            
                            <hr />

                            <div className = "state-preview">

                                <p> <strong> Last Session </strong>
                                <br /> { state.lastSession } </p>

                                <p> <strong> Ready Tasks </strong>
                                <br /> { state.readyTasks } </p>

                                <p> <strong> Next Task up </strong>
                                <br /> { state.nextTask } </p>

                            </div>
                            
                            <Link to = { state.route }>
                                <button> { state.buttonText } </button>
                            </Link>

                            </div>
                            
                        ))}

                                             
                    </div>


           
        </main>
    );
}