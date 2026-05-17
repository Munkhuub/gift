import { useState } from "react";

const tierColors = {
  GOD: { bg: '#FFF8ED', text: '#92400E', border: '#FCD34D' },
  PLATINUM: { bg: '#F0F4FF', text: '#1E3A8A', border: '#93C5FD' },
  GOLD: { bg: '#FFFBEB', text: '#78350F', border: '#FDE68A' },
  SILVER: { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' },
};

export default function Dashboard({ clients, onMarkDelivered }) {
  const pending = clients.filter(c => !c.giftDone);
  const done = clients.filter(c => c.giftDone);
  const godPending = clients.filter(c => c.tier === 'GOD' && !c.giftDone);

  return (
    <div>
      {godPending.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#92400E' }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span><strong>{godPending.length} GOD-tier client{godPending.length > 1 ? 's' : ''}</strong> have not received gifts yet — immediate action needed.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total clients', value: clients.length, color: '#1E293B' },
          { label: 'Gifts pending', value: pending.length, color: pending.length > 0 ? '#DC2626' : '#16A34A' },
          { label: 'Gifts delivered', value: done.length, color: '#16A34A' },
          { label: 'GOD tier pending', value: godPending.length, color: godPending.length > 0 ? '#D97706' : '#16A34A' },
        ].map(m => (
          <div key={m.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pending deliveries</div>
      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#16A34A', fontSize: 14, background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
          ✅ All gifts have been delivered!
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
              {['Name', 'Tier', 'Phone', 'Loan contract', 'Action'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pending.map(c => {
              const tc = tierColors[c.tier] || tierColors.SILVER;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 500 }}>{c.last} {c.first}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{c.tier}</span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#64748B' }}>{c.phone}</td>
                  <td style={{ padding: '12px 10px' }}>
                    {c.loan
                      ? <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 500, border: '1px solid #BFDBFE' }}>✓ Yes</span>
                      : <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <button onClick={() => onMarkDelivered(c.id)} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#1E293B', fontWeight: 500 }}>
                      Mark delivered ✓
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
