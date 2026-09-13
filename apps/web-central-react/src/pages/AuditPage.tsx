import React from 'react';
export const AuditPage = () => (
  <div className="table-card">
    <div className="table-header"><h3>Log de Auditoria</h3></div>
    <table>
      <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr></thead>
      <tbody>
        <tr><td>{new Date().toLocaleString('pt-BR')}</td><td>Operador</td><td>LOGIN</td><td>Sucesso</td></tr>
      </tbody>
    </table>
  </div>
);
