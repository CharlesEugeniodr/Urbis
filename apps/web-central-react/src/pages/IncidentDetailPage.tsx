import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOccurrenceDetail, useTriageMutation } from '../api/hooks';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Check, X, Copy } from 'lucide-react';

export const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useOccurrenceDetail(id!);
  const triageMut = useTriageMutation();

  if (isLoading) return <div>Carregando detalhes...</div>;
  if (!data) return <div>Ocorrência não encontrada.</div>;

  const handleTriage = (decision: string) => {
    triageMut.mutate({ id: id!, decision });
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer'}}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="detail-grid">
        <div className="detail-card">
          <h2>Protocolo: {data.protocol || data.id}</h2>
          <div style={{margin: '15px 0'}}><StatusBadge status={data.status} /></div>
          <p><strong>Categoria:</strong> {data.categoryCode}</p>
          <p><strong>Descrição:</strong> {data.description}</p>
          <p><strong>Endereço:</strong> {data.address || 'Não informado'}</p>
          <p><strong>Score ICI:</strong> {(data.iciScore * 100).toFixed(1)}%</p>
        </div>

        {(data.status === 'OPEN' || data.status === 'TRIAGE') && (
          <div className="detail-card">
            <h3>Triagem</h3>
            <p style={{marginBottom: 15}}>Analise a ocorrência e defina a decisão:</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              <button className="btn-primary" style={{background: '#2dbd69'}} onClick={() => handleTriage('PROCEDENT')}><Check size={16}/> Procedente</button>
              <button className="btn-primary" style={{background: '#7f8b94'}} onClick={() => handleTriage('IMPROCEDENT')}><X size={16}/> Improcedente</button>
              <button className="btn-primary" style={{background: '#f29b32'}} onClick={() => handleTriage('DUPLICATE')}><Copy size={16}/> Duplicada</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
