# Better Every Day

Better Every Day is a desktop productivity application dedicated to providing a unique workspace designed to help users stay focused, organized, and productive. By combining task management, note-taking, focus sessions, and future desktop productivity tools into a single application, Better Every Day aims to reduce distractions and create an environment where users can do their best work.

Built with React, TypeScript, Vite, and Electron, the application combines a modern web interface with the capabilities of a native desktop application, allowing it to run across Windows, Linux, and macOS while supporting future desktop-specific features.

---

## Beta Status

BetterEveryDay is currently in active beta development. New features, improvements, and bug fixes are released regularly as we continue refining the application based on user feedback. Every release is focused on improving stability, usability, and creating a better productivity experience.

---


## Releases

The latest stable release can always be downloaded from the GitHub Releases page. Existing desktop installations automatically receive updates through the built-in update system whenever a newer version is published.

---

## Current Features

### Productivity Features

* Dashboard with activity navigation
* Congruence-based focus mode selection
* Dynamic activity pages
* Task management foundation
* Notebook and Journey organization
* Folder-based Notebook Browser
* Folder-based Journey Browser
* Persistent notes using Local Storage
* Dynamic task previews
* React Router navigation
* Responsive desktop interface


### Desktop Application


* Windows installer with automatic updates
* Floating timer window
* Adjustable countdown timer
* Electron desktop integration
* Native desktop window
* React application hosted inside Electron
* Built-in automatic update system
* Integrated desktop development workflow using `npm run dashboard`

---

## Technology Stack

### Frontend

* React
* TypeScript
* React Router
* Vite

### Desktop

* Electron
* Electron Builder

### Storage

* Local Storage (Current)
* SQLite (Planned)

---

## Development

Install project dependencies:

```bash
npm install
```

Start the desktop development environment:

```bash
npm run dashboard
```

This command will:

* Start the Vite development server
* Wait for the server to become available
* Launch the Electron desktop application

Create a production installer:

```bash
npm run installer
```

Publish a production release with automatic updates:

```bash
npm run installer:publish
```

---

## Project Structure

```text
electron/
    main.js          # Electron main process

src/
    Components/
    Css/
    Data/
    Features/
    App.tsx
    main.tsx

backend/
    (Backend services)
```

---


## Roadmap

### In Progress

* Beta testing
* Code documentation and comments
* Improved project documentation
* User interface polish
* Performance improvements



#### Productivity


* Focus session tracking
* Session history
* Calendar integration
* Habit tracking improvements

#### Desktop

* Native desktop notifications
* System tray integration
* Multiple Electron windows

#### Backend

* SQLite database integration
* Backend services
* Cloud synchronization
* Cross-platform application packaging

#### Future

* Local AI productivity tools
* Better Every Day Office
* Team collaboration features
* Productivity analytics

---

## Vision

Better Every Day is built on the belief that productivity is personal. Our goal is to create a workspace that helps users learn, grow, and evolve while staying focused on what matters most. By bringing together powerful productivity tools into one distraction-free desktop experience, we strive to help every user accomplish more every day.

As the application grows, it will grow alongside its users through continuous feedback, thoughtful iteration, and meaningful improvements. We believe the best products are built with their communities, not just for them, and every release moves us one step closer to creating the ideal productivity workspace.

We're committed to starting with a great product and making it better every single day.

**Come try Better Every Day—we're building a productivity experience you'll love.**
