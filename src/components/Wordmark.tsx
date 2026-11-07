interface WordmarkProps {
  size?: 'nav' | 'footer'
}

export function Wordmark({ size = 'nav' }: WordmarkProps) {
  return (
    <span className={`wordmark wordmark--${size}`}>
      <span className="wm-cap">Q</span>
      <span className="wm-low">a</span>
      <span className="wm-cap">R</span>
      <span className="wm-low">t</span>
    </span>
  )
}
