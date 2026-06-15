import { Link } from "react-router-dom";
import { getTaskCountByMood} from "../Data/taskStorage"


export default function CongruencePage() {


                   {/* State specfic previews */}
            const stateCards = [
                {
                    title: "Focused",
                    description: "Ready for Deep work that moves the needle.",
                    
                    lastSession: "No Sessions Yet",
                    readyTasks: `${getTaskCountByMood("Focused")} Task/s`,
                    nextTask: "No Focus Tasks",

                    buttonText: "Enter Focus",
                    route: "/focus",
                },

                {
                    title: "Planning",
                    description: "Organize ideas and prepare for execution.",

                    lastSession: "No Sessions Yet",
                    readyTasks: `${getTaskCountByMood("Planning")} Task/s`,
                    nextTask: "No Planning Tasks",

                    buttonText: "Start Planning",
                    route: "/planning",
            },

            {
                    title: "Recharge",
                    description:
                    "Recover energy while staying engaged through reflection, learning, or light creative work.",

                    lastSession: "No Sessions Yet",
                    readyTasks: `${getTaskCountByMood("Recharge")} Task/s`,
                    nextTask: "No Recharge Tasks",

                    buttonText: "Begin Recharge",
                    route: "/recharge",
            },
                
            ]


                return (
                    
                    <main>

                        <header>

                            <h1> Congruence </h1>

                            <p>Congruence is the alignment between who you actually are, who you want to be
                            , and how you act every day. </p>

                            <p> Within BetterEveryDay, Congruence dynamically matches the activities you choose to work on with your energy 
                            and focus levels. </p>

                        </header>

                                    {/* Congruence explination */}
                                <div className = " how-it-works">
                                    <h2> How it works </h2>

                                    <ol>

                                        <li>Select how you're showing up today.</li>

                                        <li>Better Every Day recommends work that matches your mindset.</li>

                                        <li>Stay productive with activities designed for that state.</li>

                                    </ol>
                                    
                                </div>
                                                 {/* Mood specfic Preview cards */}
                                        <div className="state-selection">

                                            <h2>
                                                How are you showing up today?
                                            </h2>

                                                  {/* Display State cards with all info */}
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

                                                                            {/*Button to Page  */}
                                                                        <Link to = { state.route }>
                                                                            <button> { state.buttonText } </button>
                                                                        </Link>

                                                                        </div>
                                                
                                            ))}

                                                                
                                        </div>


                    
                    </main>
                );
}