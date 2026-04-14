# Collaborative Coding, Live Cursor Tracking, and Chat Feature

This plan outlines the integration of real-time collaborative features into the online compiler. We will use **Yjs** (a powerful CRDT framework) for "Google Docs" style code syncing and live cursor tracking, and **Socket.IO** for building a real-time chat application for users in the same room.

## User Review Required

> [!IMPORTANT]  
> This feature introduces a "Room" system. 
> - Every user must be in a room to collaborate. 
> - By default, if you load the app, it will generate a unique room ID in the URL (e.g., `http://localhost:5173/?roomId=xyz123`). 
> - You can copy this URL and share it with others. Anyone with the link will instantly join the same collaborative session, see the code in real-time, see cursors, and participate in the Chat.
> - **Question for user**: Does this URL-sharing approach work well for your requirements, or would you prefer a formal "Lobby" with "Join Room" buttons? (URL-sharing is the standard for Google Docs-like experiences).

> [!WARNING]  
> Due to the integration of real-time multi-user editing, local storage persistence for `code` and `language` will need to be slightly re-worked so it doesn't conflict with incoming changes from other users as they join a live room.

## Proposed Changes

### Server (`server`)

- **Dependencies:** Install `ws` and `y-websocket` (for document syncing) alongside `socket.io` (for chat).
- **Socket.io setup:** Establish a Socket.IO namespace for rooms. When users connect, they emit their `roomId`, and Socket.IO adds them to a broadcast group to relay chat messages.
- **WebSocket Upgrade:** Integrate `y-websocket` directly onto the Express underlying Node `http.Server`. We will intercept the HTTP `upgrade` event so that paths like `ws://localhost:5000/<roomId>` correctly route to Yjs.

#### [MODIFY] server/package.json
- Add `ws` and `y-websocket` dependencies.

#### [MODIFY] server/index.js
- Convert from straight `app.listen()` to using `http.createServer(app)`.
- Set up `Socket.IO` instance and bind `connection`, `join-room`, and `send-chat` events.
- Set up a standard `ws` Server for handling Yjs connections. `y-websocket` exports a handy `setupWSConnection` built specifically for node `ws` that automatically handles document state persistence in memory across rooms.

---

### Client (`client`)

- **Dependencies:** Install `yjs`, `y-websocket`, `y-monaco`, and `uuid` (or just use `crypto.randomUUID` native) to generate specific IDs and colors for cursors.
- **Room Extraction:** Update `App.jsx` to parse `window.location.search` for `roomId`. If absent, append a generic ID and update the URL silently via `window.history.replaceState`.
- **Yjs Provider:** Initialize a `Y.Doc()` and a `WebsocketProvider`. Bind the `Y.Text` type to the current Monaco Model using `y-monaco`'s `MonacoBinding`.
- **Cursor UI:** Supply `awareness` data to Yjs so user colors/names format directly on other clients' code views as glowing cursor boundaries and nametags.
- **UI Tweaks and Chat:** Add a new "Chat" pane. We can restructure the generic "side-panel" into tabs: **Console/Input** and **Chat Room**. This avoids taking up too much screen real estate.

#### [MODIFY] client/package.json
- Add `yjs`, `y-websocket`, `y-monaco`.

#### [MODIFY] client/src/App.jsx
- Read/write `roomId` on mount.
- Add `useEffect` bindings to manage the lifecycle of Yjs, attaching `MonacoBinding` to the active Monaco Editor instance using its `onMount` event.
- Maintain `Socket.IO` connection lifecycle for emitting and listening to chats.
- Add Chat UI logic, and Tab state to flip between Run views and Chat views.

#### [MODIFY] client/src/index.css
- Add rich glass-morphism chat styles. Speech bubbles that pop gracefully out. Tab selectors.
- Configure styles for the Monaco glowing cursors `.yRemoteSelection`.
- Add overall polish to side panels.

## Open Questions

1. **Room Generation**: Instead of the whole page refreshing when changing rooms, I'm proposing an automated "room-per-URL" model out of the box. Do you like this "Link sharing" model?
2. **Username**: For cursors and chat, should we prompt the user for a "Username" when they first enter the platform, or just assign them random funny names (e.g., "Guest-14A", "Guest-8B2") that they can optionally change later?

## Verification Plan

### Automated/Manual Verification
- Start the server (`npm run dev` / `node index.js`).
- Start the client (`npm run dev`).
- Open two different incognito browser windows to the same URL (`/?roomId=test`).
- **Objective 1:** Edit code in Window 1, ensure Window 2 sees the keystrokes instantly.
- **Objective 2:** Check that Window 1's cursor moves in Window 2 and is highlighted with a specific color.
- **Objective 3:** Send a chat message in Window 1, check that Window 2 receives it immediately with a distinct chat bubble style.
- **Objective 4:** Ensure that code execution continues to work smoothly independently of the collaboration tools.
