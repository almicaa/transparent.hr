import Logo from "../ui/Logo"

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Logo size={20} />
        <span className="meta">© {new Date().getFullYear()} transparent.hr — poslovi s vidljivom plaćom u Hrvatskoj.</span>
      </div>
    </footer>
  )
}
