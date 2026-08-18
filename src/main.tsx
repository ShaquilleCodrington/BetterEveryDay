
import ReactDOM from "react-dom/client";
import App from "./App";
import { HashRouter } from "react-router-dom";

import { FirebaseUIProvider } from "@firebase-oss/ui-react";
import { firebaseUI } from "./Services/firebase/config";

import "./Css/index.css";
import "@firebase-oss/ui-styles/dist.min.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <FirebaseUIProvider ui={firebaseUI}>
      <App />
    </FirebaseUIProvider>
  </HashRouter>
);