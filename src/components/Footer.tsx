import { Wordmark } from "./Wordmark.tsx";

export function Footer() {
  return (
    <footer className="footer">
      <Wordmark size="footer" />
      <div className="footer-meta">
        <a className="footer-links" href="https://github.com/NickCastillo">
          GitHub
        </a>
        <a
          className="footer-links"
          href="https://www.instagram.com/_nickcamera/"
        >
          Photography Instagram
        </a>
        <span className="footer-copy">© 2026 — for fun</span>
      </div>
    </footer>
  );
}
