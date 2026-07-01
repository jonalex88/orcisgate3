import { Route, Routes } from 'react-router'
import { DmTableView } from './features/table/DmTableView.js'
import { JoinGameScreen } from './features/table/JoinGameScreen.js'
import { PlayerConnectRoute } from './features/table/PlayerConnectRoute.js'
import { PlayerTableView } from './features/table/PlayerTableView.js'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinGameScreen />} />
      <Route path="/game/:gameKey/dm" element={<DmTableView />} />
      <Route path="/game/:gameKey/connect" element={<PlayerConnectRoute />} />
      <Route path="/game/:gameKey/player" element={<PlayerTableView />} />
    </Routes>
  )
}
