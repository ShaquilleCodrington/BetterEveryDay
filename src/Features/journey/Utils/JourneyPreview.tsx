import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Journey } from "../types";
import { loadJourneys, saveJourneys } from "../Storage/journeyStorage";

import type { JourneySession } from "../Session/journeySession";
import { loadSessions } from "../Storage/sessionStorage";

import type { JourneyPlan } from "../Plan/journeyPlan";
import { loadPlans } from "../Plan/journeyPlan";

import {  setPlan } from "../Plan/journeyPlan";

import JourneyPlanPopup from "../Plan/JourneyPlanPopup";

import { getJourneyStats } from "./journeyStats";

import type { Notebook } from "../../notes/types";

import { loadNotebooks, saveNotebooks } from "../../notes/storage/notebookStorage";

import PreviewLayout from "../../../Components/Dashboard/PreviewLayout";
import { getMostRecentJourney } from "./journeyQueries";
import { createJourney } from "./JourneyFactory";
import { useAuthConnector } from "../../../Services/firebase/connector";


let rememberedJourneyId: string | null = null;

// ======================================================
// NOTEBOOK SELECT POPUP
// ======================================================
// CHANGED: extracted into a local sub-component. Previously
// this exact JSX block was duplicated in both the "nothing
// selected yet" render path and inside the Identity slot of
// the "selected" render path. Now both call this once.

interface NotebookSelectPopupProps
{
    journeys: Journey[];
    notebooks: Notebook[];
    onSelect: (journeyId: string) => void;
    onClose: () => void;
}


function NotebookSelectPopup(
{
    journeys,
    notebooks,
    onSelect,
    onClose,

}: NotebookSelectPopupProps)
{
    return (
        <div
            style={{
                position: "relative",
                 width: 300,
                background: "#1a1a2e",
                borderRadius: 8,
                padding: 12,
                zIndex: 1000,
            }}
        >
            <h4>Select Notebook</h4>

            {journeys.map((journey) =>
            {
                const notebook =
                    notebooks.find(
                        (notebookItem) =>
                            notebookItem.id === journey.notebookId
                    );

                return (
                    <div
                        key={journey.journeyId}
                        onClick={() => onSelect(journey.journeyId)}
                        style={{
                            padding: "10px",
                            cursor: "pointer",
                            borderBottom:
                                "1px solid rgba(255,255,255,.15)",
                        }}
                    >
                        {notebook?.title ?? "Untitled Journey"}
                    </div>
                );
            })}

            <button onClick={onClose}>
                Close
            </button>
        </div>
    );
}


// ======================================================
// JOURNEY PREVIEW
// ======================================================

export default function JourneyPreview()
{
    const navigate =
        useNavigate();

    // ======================================================
    // DATA
    // ======================================================

    const [journeys, setJourneys] =
        useState<Journey[]>([]);

    const [sessions, setSessions] =
        useState<JourneySession[]>([]);

    const [plans, setPlans] =
        useState<JourneyPlan[]>([]);

    const [notebooks, setNotebooks] =
        useState<Notebook[]>([]);

   useEffect(() =>
{
    const loadedJourneys = loadJourneys();

    setJourneys(loadedJourneys);
    setSessions(loadSessions());
    setPlans(loadPlans());
    setNotebooks(loadNotebooks());

    if (rememberedJourneyId)
{
    setSelectedJourneyId(rememberedJourneyId);
}
else
{
    const defaultJourney = getMostRecentJourney(loadedJourneys);

    if (defaultJourney)
    {
        selectJourney(defaultJourney.journeyId);
    }
}

}, []);

    // ======================================================
    // NOTEBOOK SELECTION
    // ======================================================

    const [selectedJourneyId, setSelectedJourneyId] =
        useState<string | null>(null);

    const [showSelectPopup, setShowSelectPopup] =
        useState(false);

    const selectedJourney =
        journeys.find(
            (journey) =>
                journey.journeyId === selectedJourneyId
        ) ?? null;

    const selectedNotebook =
        selectedJourney
            ? notebooks.find(
                  (notebook) =>
                      notebook.id === selectedJourney.notebookId
              ) ?? null
            : null;

    const relevantSessions =
        sessions.filter(
            (session) =>
                session.journeyId === selectedJourneyId
        );

    const selectedPlan =
        plans.find(
            (plan) =>
                plan.journeyId === selectedJourneyId
        ) ?? null;

    const currentUser = useAuthConnector();
    
    function handleCreateJourney()
{

    const userId = currentUser?.uid ?? null;
    const { journey, notebook } = createJourney(userId);

    const updatedJourneys = [...journeys, journey];
    const updatedNotebooks = [...notebooks, notebook];

    saveJourneys(updatedJourneys);
    setJourneys(updatedJourneys);

    saveNotebooks(updatedNotebooks);
    setNotebooks(updatedNotebooks);

    selectJourney(journey.journeyId);
}

function handleSelectJourney(journeyId: string)
    {
        selectJourney(journeyId);
        setShowSelectPopup(false);
    }

function selectJourney(journeyId: string)
{
    rememberedJourneyId = journeyId;
    setSelectedJourneyId(journeyId);
}

    // ======================================================
    // CURRENT STATE
    // ======================================================

    const stats =
        getJourneyStats(selectedJourney, relevantSessions);

    // ======================================================
    // RECOMMENDATION
    // ======================================================

    const sevenDaysAgo =
        Date.now() - 7 * 24 * 60 * 60 * 1000;

    const sessionsThisWeek =
        relevantSessions.filter(
            (session) =>
                session.status === "Completed" &&
                session.startedAt &&
                new Date(session.startedAt).getTime() >= sevenDaysAgo
        ).length;

    const weeklyGoal =
        selectedPlan?.sessionsPerWeek ?? 0;

    const remainingSessions =
        weeklyGoal - sessionsThisWeek;

    const recommendationText =
        weeklyGoal === 0
            ? "Set a weekly session goal to get a recommendation."
            : remainingSessions <= 0
                ? "You've hit your weekly goal. Nice work."
                : `${remainingSessions} more session${remainingSessions === 1 ? "" : "s"} will complete your weekly goal.`;





    
    
    
        const [showPlanPopup, setShowPlanPopup] =
            useState(false);
    
    
        function handleSavePlan(data:
        {
            purpose: string;
            sessionsPerWeek: number;
        })
        {
        if (!selectedJourney)
        {
            return;
        }
    
        const updatedPlan: JourneyPlan =
        {
            journeyId: selectedJourney.journeyId,
            purpose: data.purpose,
            sessionsPerWeek: data.sessionsPerWeek,
            createdAt: selectedPlan?.createdAt ?? new Date().toISOString(),
        };
    
        const updatedPlans = setPlan(updatedPlan);
    
        setPlans(updatedPlans);
    
        setShowPlanPopup(false)
    }

    // ======================================================
    // RENDER — NOTHING SELECTED YET
    // ======================================================

    if (!selectedJourneyId)
    {
        return (
            <div style={{ position: "relative" }}>
                <p>Select a notebook to see its Journey info.</p>
                <br />
                <button onClick={() => setShowSelectPopup(true)}>
                    Switch Journey
                </button>

               
                 <br />
                {showSelectPopup && (
                    <NotebookSelectPopup
                        journeys={journeys}
                        notebooks={notebooks}
                        onSelect={handleSelectJourney}
                        onClose={() => setShowSelectPopup(false)}
                    />
                    
                )}
                   <button
                onClick={handleCreateJourney}
                style={{
                    padding: "10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                }}
            >
                + New Journey
            </button>

            </div>
        );
    }

    // ======================================================
    // RENDER — SELECTED JOURNEY
    // ======================================================

    return (
        <PreviewLayout

            identity={
                <div style={{ position: "relative" }}>

                    <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setShowSelectPopup(true)}
                    style={{
                            padding: "10px",
                            
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                     >
                        Switch Journey
                        
                    </button>

                     <button
                        onClick={handleCreateJourney}
                        style={{
                            padding: "10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        + New Journey
                    </button>
                </div>

                    <br />
                    <br />
                    <h3>Journey Title: {selectedNotebook?.title ?? "Untitled Journey"} </h3>
                    <p>Purpose: {selectedPlan?.purpose ?? "No purpose set yet."}</p>

                    {showSelectPopup && (
                        <NotebookSelectPopup
                            journeys={journeys}
                            notebooks={notebooks}
                            onSelect={handleSelectJourney}
                            onClose={() => setShowSelectPopup(false)}
                        />
                    )}
                </div>
            }

            currentState={
                <div>
                    <p>Total Sessions: {stats.sessionCount}</p>
                    <p>Completed Sessions: {stats.completedCount}</p>
                    <p>Total Session Time: {stats.totalMinutes} minutes</p>
                    <p>Journey Lifetime: {stats.journeyLifetime} days</p>
                </div>
            }

            recommendation={
                <div>
                <p>{recommendationText}</p>
                <br />
                <button  onClick={() =>
                navigate(`/journey?journeyId=${selectedJourneyId}`)
            }
        >
            Open {selectedNotebook?.title ?? "Journal"}
        </button>

        <div>

                    <div>
                
                    <br/>
            <h3>Journey Plan</h3>

            {selectedPlan ? (
        <>
            <p>
                <strong>Purpose:</strong>{" "}
                {selectedPlan.purpose}
            </p>

            <p>
                <strong>Sessions Per Week:</strong>{" "}
                {selectedPlan.sessionsPerWeek}
            </p>
            
                    <br />
            <button onClick={() => setShowPlanPopup(true)}>
                        {selectedPlan ? "Edit Plan" : "Set Journey Plan"}
                    </button>

                    <br />
                        </>
                    ) : (
                        <p>No plan set yet.</p>
                    )}
            
            {showPlanPopup && selectedJourney && (
                <JourneyPlanPopup
                    initialPurpose={selectedPlan?.purpose}
                    initialSessionsPerWeek={selectedPlan?.sessionsPerWeek}
                    onClose={() => setShowPlanPopup(false)}
                    onSave={handleSavePlan}
                />
            )}

                    
                </div>

                    <br />
        </div>
                </div>
            }

           quickActions={
    <div>
         <br />

        <button onClick={() => navigate("/journey")}>
            Open Journey
        </button>

        
    </div>
}
        />
    );
}