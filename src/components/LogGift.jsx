import { useState } from "react";

export default function LogGift({ clients, history, onLog }) {
  const [form, setForm] = useState({ clientId: '', date: new Date().toISOString().split('T')[0], type: '', deliveredBy: '', loan: false, note: '' });
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.clientId) { alert('Please select a client'); return; }
    setSaving(true);
    setError("");
    const saved = await onLog({
      clientId: parseInt(form.clientId, 10),
      date: form.date,
      type: form.type,
      deliveredBy: form.deliveredBy,
      loan: form.loan,
      note: form.note,
    });
    setSaving(false);

    if (!saved) {
      setError("Could not save this delivery record.");
      return;
    }

    setSuccess(true);
    setForm({ clientId: '', date: new Date().toISOString().split('T')[0], type: '', deliveredBy: '', loan: false, note: '' });
    setTimeout(() => setSuccess(false), 3000);
  };

  const inputStyle = { fontSize: 13, width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', color: '#1E293B', outline: 'none' };
  const labelStyle = { fontSize: 12, color: '#64748B', display: 'block', marginBottom: 5, fontWeight: 500 };

  return (
    <div>
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, maxWidth: 560 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 20 }}>Record a gift delivery</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Client *</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)} style={inputStyle}>
              <option value="">Select client...</option>
              {clients.filter(c => !c.giftDone).map(c => (
                <option key={c.id} value={c.id}>{c.last} {c.first} ({c.tier})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Delivery date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Gift type</label>
            <input value={form.type} onChange={e => set('type', e.target.value)} placeholder="e.g. Premium gift box" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Delivered by</label>
            <input value={form.deliveredBy} onChange={e => set('deliveredBy', e.target.value)} placeholder="Staff name" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Note</label>
          <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optional note..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#1E293B' }}>
            <input type="checkbox" checked={form.loan} onChange={e => set('loan', e.target.checked)} style={{ width: 15, height: 15 }} />
            Client has an active loan contract
          </label>
        </div>

        <button disabled={saving} onClick={handleSubmit} style={{ fontSize: 13, padding: '10px 22px', borderRadius: 8, border: 'none', background: '#1E293B', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save delivery record ✓'}
        </button>

        {success && (
          <div style={{ marginTop: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#16A34A', fontWeight: 500 }}>
            ✅ Gift delivery recorded successfully!
          </div>
        )}
        {error && (
          <div style={{ marginTop: 14, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#B91C1C', fontWeight: 500 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#1D4ED8', display: 'flex', gap: 8, alignItems: 'center', maxWidth: 560 }}>
        🔒 <span>Gift records are now saved through your app backend, so the data persists instead of resetting on refresh.</span>
      </div>

      <div style={{ marginTop: 20, maxWidth: 560 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Recent gift log records
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          {history.length === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: '#94A3B8' }}>
              No gift logs saved yet.
            </div>
          ) : (
            history.slice(0, 5).map((entry, index) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px 14px',
                  borderTop: index === 0 ? 'none' : '1px solid #F1F5F9',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
                  {entry.clientName}
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {entry.deliveredAt} • {entry.giftType}
                  {entry.deliveredBy ? ` • ${entry.deliveredBy}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
