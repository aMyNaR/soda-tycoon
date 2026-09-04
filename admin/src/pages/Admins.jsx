import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';

export default function Admins({ showToast }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'SUPPORT' });

  const load = () => adminApi.admins().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  if (!list) return <div className="muted">...</div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ marginBottom: 14 }}>🛡️ مدیریت ادمین‌ها</h2>
      <div className="card">
        <h3>➕ ادمین جدید</h3>
        <div className="row">
          <input className="input" style={{ width: 150 }} placeholder="نام کاربری" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="input" style={{ width: 180 }} type="password" placeholder="رمز (۸+ کاراکتر)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input" style={{ width: 140 }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="SUPPORT">SUPPORT</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
          <button className="btn green" onClick={async () => {
            try { await adminApi.createAdmin(form.username, form.password, form.role); showToast('ادمین ساخته شد'); setForm({ username: '', password: '', role: 'SUPPORT' }); load(); }
            catch (e) { showToast(e.message, 'error'); }
          }}>ساخت</button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          SUPPORT: فقط مشاهده | MODERATOR: +Ban/مشاهده Log | ADMIN: +هدیه/ویرایش محتوا | SUPER_ADMIN: همه دسترسی‌ها
        </div>
      </div>
      <table className="table">
        <thead><tr><th>نام کاربری</th><th>Role</th><th>ساخته‌شده</th><th></th></tr></thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td>{a.username}</td><td>{a.role}</td><td>{new Date(a.createdAt).toLocaleDateString('fa-IR')}</td>
              <td><button className="btn red sm" onClick={async () => {
                if (!confirm(`ادمین ${a.username} حذف شود؟`)) return;
                try { await adminApi.deleteAdmin(a.id); showToast('حذف شد'); load(); }
                catch (e) { showToast(e.message, 'error'); }
              }}>حذف</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
