export default function PageHeader({ title, text }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {text && <p className="text-muted">{text}</p>}
    </div>
  );
}
