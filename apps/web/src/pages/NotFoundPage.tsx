import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';

export function NotFoundPage() {
  return (
    <PageHeader
      eyebrow="Erro 404"
      title="Página não encontrada"
      description="O endereço acessado não existe ou foi movido."
      actions={
        <Link to="/" className="btn btn-primary">
          Voltar ao dashboard
        </Link>
      }
    />
  );
}
