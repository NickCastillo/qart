import { ArrowLeft } from 'lucide-react'
import { PIECES } from '../pieces.ts'

export function Piece({ pieceId }: { pieceId: string }) {
  const piece = PIECES[pieceId]
  if (!piece) return null
  if (piece.ownChrome) {
    return <iframe className="stage-frame-full" src={piece.src} title={piece.name} allow="fullscreen" />
  }
  return (
    <div className="stage">
      <div className="stage-bar">
        <a className="back-link" href="#/">
          <ArrowLeft size={16} />
          HOME
        </a>
        <span className="stage-title">{piece.name}</span>
      </div>
      <iframe className="stage-frame" src={piece.src} title={piece.name} allow="fullscreen" />
    </div>
  )
}
