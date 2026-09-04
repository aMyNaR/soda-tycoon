import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { fmt } from '../util.js';

// مدیریت Recipe / Ingredient / City / Boost / Box / Daily Rewards
export default function Content({ showToast }) {
  const [tab, setTab] = useState('RECIPES');
  return (
    <div>
      <h2 style={{ marginBottom: 14 }}>🏭 مدیریت محتوا و اقتصاد</h2>
      <div className="row" style={{ marginBottom: 14 }}>
        {[['RECIPES', '📖 Recipeها'], ['INGREDIENTS', '🍬 ماده‌ها'], ['CITIES', '🌎 شهرها'], ['BOOSTS', '⚡ بوست‌ها'], ['BOXES', '🎁 جعبه‌ها'], ['DAILY', '🎁 پاداش روزانه']].map(([k, l]) => (
          <button key={k} className={`btn sm ${tab === k ? '' : 'dark'}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'RECIPES' && <Recipes showToast={showToast} />}
      {tab === 'INGREDIENTS' && <Ingredients showToast={showToast} />}
      {tab === 'CITIES' && <Cities showToast={showToast} />}
      {tab === 'BOOSTS' && <Boosts showToast={showToast} />}
      {tab === 'BOXES' && <Boxes showToast={showToast} />}
      {tab === 'DAILY' && <DailyRewards showToast={showToast} />}
    </div>
  );
}

function Recipes({ showToast }) {
  const [recipes, setRecipes] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const [r, i] = await Promise.all([adminApi.recipes(), adminApi.ingredients()]);
      setRecipes(r); setIngredients(i);
    } catch (e) { showToast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  if (!recipes) return <div className="muted">...</div>;

  return (
    <div>
      <button className="btn green sm" style={{ marginBottom: 12 }} onClick={() => setCreating(!creating)}>➕ Recipe جدید</button>

      {creating && <RecipeForm ingredients={ingredients} onSave={async (b) => {
        try { await adminApi.createRecipe(b); showToast('Recipe ساخته شد'); setCreating(false); load(); }
        catch (e) { showToast(e.message, 'error'); }
      }} />}

      <table className="table">
        <thead>
          <tr><th>کلید</th><th>نام</th><th>Rarity</th><th>Level</th><th>قیمت</th><th>زمان (دق)</th><th>بچ</th><th>تقاضا</th><th>فعال</th><th></th></tr>
        </thead>
        <tbody>
          {recipes.map((r) => (
            <tr key={r.id}>
              <td>{r.key}</td>
              <td>{r.emoji} {r.name}</td>
              <td>{r.rarity}</td>
              <td>{r.requiredLevel}</td>
              <td>{fmt(r.basePrice)}</td>
              <td>{Math.round(r.productionMs / 60000)}</td>
              <td>{r.batchSize}</td>
              <td>{r.demand}</td>
              <td>{r.active ? '✓' : '✕'}</td>
              <td>
                <button className="btn dark sm" onClick={() => setEditing(editing === r.id ? null : r.id)}>✏️</button>
                <button className="btn red sm" style={{ marginRight: 4 }} onClick={async () => {
                  try { await adminApi.deactivateRecipe(r.id); showToast('غیرفعال شد'); load(); }
                  catch (e) { showToast(e.message, 'error'); }
                }}>⛔</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && recipes.filter((r) => r.id === editing).map((r) => (
        <RecipeForm key={r.id} recipe={r} ingredients={ingredients} onSave={async (b) => {
          try { await adminApi.updateRecipe(r.id, b); showToast('ذخیره شد'); setEditing(null); load(); }
          catch (e) { showToast(e.message, 'error'); }
        }} />
      ))}
    </div>
  );
}

function RecipeForm({ recipe, ingredients, onSave }) {
  const [f, setF] = useState(recipe ? { ...recipe } : {
    key: '', name: '', emoji: '🥤', flavor: 'CUSTOM', rarity: 'COMMON',
    requiredLevel: 1, basePrice: 50, productionMs: 300000, batchSize: 10, xpReward: 10, demand: 1, qualityBonus: 0,
    ingredients: [],
  });

  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const addIng = () => setF({ ...f, ingredients: [...f.ingredients, { ingredientId: ingredients[0]?.id, quantity: 1 }] });

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <h3>{recipe ? `ویرایش: ${recipe.name}` : 'Recipe جدید'}</h3>
      {!recipe && <div className="row">
        <input className="input" style={{ width: 150 }} placeholder="key (galaxy_soda)" value={f.key} onChange={upd('key')} />
        <input className="input" style={{ width: 150 }} placeholder="نام" value={f.name} onChange={upd('name')} />
        <input className="input" style={{ width: 60 }} placeholder="🥤" value={f.emoji} onChange={upd('emoji')} />
      </div>}
      {recipe && <input className="input" style={{ width: 150, marginBottom: 8 }} value={f.name} onChange={upd('name')} />}
      <div className="row">
        <select className="input" style={{ width: 130 }} value={f.rarity} onChange={upd('rarity')}>
          {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map((r) => <option key={r}>{r}</option>)}
        </select>
        <input className="input" style={{ width: 80 }} type="number" value={f.requiredLevel} onChange={upd('requiredLevel')} placeholder="Level" title="Level لازم" />
        <input className="input" style={{ width: 90 }} type="number" value={f.basePrice} onChange={upd('basePrice')} placeholder="قیمت" title="قیمت پایه" />
        <input className="input" style={{ width: 110 }} type="number" value={f.productionMs} onChange={upd('productionMs')} placeholder="زمان ms" title="زمان تولید (میلی‌ثانیه)" />
        <input className="input" style={{ width: 70 }} type="number" value={f.batchSize} onChange={upd('batchSize')} placeholder="بچ" title="تعداد در هر تولید" />
        <input className="input" style={{ width: 70 }} type="number" value={f.demand} onChange={upd('demand')} placeholder="تقاضا" title="ضریب تقاضا" />
        <input className="input" style={{ width: 70 }} type="number" value={f.xpReward} onChange={upd('xpReward')} placeholder="XP" title="XP" />
      </div>

      <div className="muted" style={{ margin: '10px 0 6px' }}>مواد اولیه:</div>
      {f.ingredients.map((ing, i) => (
        <div key={i} className="row" style={{ marginBottom: 6 }}>
          <select className="input" style={{ width: 200 }} value={ing.ingredientId}
            onChange={(e) => {
              const arr = [...f.ingredients];
              arr[i] = { ...arr[i], ingredientId: parseInt(e.target.value) };
              setF({ ...f, ingredients: arr });
            }}>
            {ingredients.map((x) => <option key={x.id} value={x.id}>{x.emoji} {x.name} ({x.key})</option>)}
          </select>
          <input className="input" style={{ width: 70 }} type="number" value={ing.quantity}
            onChange={(e) => {
              const arr = [...f.ingredients];
              arr[i] = { ...arr[i], quantity: parseInt(e.target.value) || 1 };
              setF({ ...f, ingredients: arr });
            }} />
          <button className="btn red sm" onClick={() => setF({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button className="btn dark sm" onClick={addIng}>+ ماده</button>

      <div style={{ marginTop: 12 }}>
        <button className="btn green" onClick={() => onSave(f)}>💾 ذخیره</button>
      </div>
    </div>
  );
}

function Ingredients({ showToast }) {
  const [list, setList] = useState(null);
  const [edits, setEdits] = useState({});
  const load = () => adminApi.ingredients().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  if (!list) return <div className="muted">...</div>;

  return (
    <table className="table">
      <thead><tr><th>کلید</th><th>نام</th><th>Rarity</th><th>قیمت پایه</th><th>قیمت فعلی</th><th>فعال</th><th>تغییر قیمت</th></tr></thead>
      <tbody>
        {list.map((i) => (
          <tr key={i.id}>
            <td>{i.key}</td><td>{i.emoji} {i.name}</td><td>{i.rarity}</td>
            <td>{fmt(i.basePrice)}</td><td>{fmt(i.price)}</td>
            <td>{i.active ? '✓' : '✕'}</td>
            <td>
              <input className="input" style={{ width: 90 }} type="number" placeholder={String(i.price)}
                value={edits[i.id] ?? ''} onChange={(e) => setEdits({ ...edits, [i.id]: e.target.value })} />
              <button className="btn blue sm" style={{ marginRight: 4 }} onClick={async () => {
                try { await adminApi.updateIngredient(i.id, { price: parseInt(edits[i.id]) }); showToast('قیمت تغییر کرد'); load(); }
                catch (e) { showToast(e.message, 'error'); }
              }}>💾</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cities({ showToast }) {
  const [list, setList] = useState(null);
  const load = () => adminApi.cities().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  if (!list) return <div className="muted">...</div>;

  const upd = async (id, body) => {
    try { await adminApi.updateCity(id, body); showToast('ذخیره شد'); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <table className="table">
      <thead><tr><th>شهر</th><th>Level لازم</th><th>ضریب قیمت</th><th>هزینه ارسال</th><th>طعم محبوب</th><th>فعال</th></tr></thead>
      <tbody>
        {list.map((c) => (
          <tr key={c.id}>
            <td>{c.emoji} {c.name}</td>
            <td><input className="input" style={{ width: 70 }} defaultValue={c.requiredLevel} onBlur={(e) => upd(c.id, { requiredLevel: e.target.value })} /></td>
            <td><input className="input" style={{ width: 70 }} defaultValue={c.priceMultiplier} onBlur={(e) => upd(c.id, { priceMultiplier: e.target.value })} /></td>
            <td><input className="input" style={{ width: 80 }} defaultValue={c.deliveryCost} onBlur={(e) => upd(c.id, { deliveryCost: e.target.value })} /></td>
            <td><input className="input" style={{ width: 120 }} defaultValue={c.popularFlavor} onBlur={(e) => upd(c.id, { popularFlavor: e.target.value })} /></td>
            <td><button className={`btn sm ${c.active ? 'green' : 'dark'}`} onClick={() => upd(c.id, { active: !c.active })}>{c.active ? 'فعال' : 'خاموش'}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Boosts({ showToast }) {
  const [list, setList] = useState(null);
  const load = () => adminApi.boosts().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  if (!list) return <div className="muted">...</div>;

  return (
    <table className="table">
      <thead><tr><th>کلید</th><th>نام</th><th>درصد</th><th>مدت (دق)</th><th>هزینه گم</th><th>فعال</th></tr></thead>
      <tbody>
        {list.map((b) => (
          <tr key={b.id}>
            <td>{b.key}</td><td>{b.emoji} {b.name}</td>
            <td><input className="input" style={{ width: 70 }} defaultValue={b.percent} onBlur={(e) => adminApi.updateBoost(b.id, { percent: e.target.value }).then(load)} /></td>
            <td><input className="input" style={{ width: 80 }} defaultValue={b.durationMin} onBlur={(e) => adminApi.updateBoost(b.id, { durationMin: e.target.value }).then(load)} /></td>
            <td><input className="input" style={{ width: 70 }} defaultValue={b.gemCost} onBlur={(e) => adminApi.updateBoost(b.id, { gemCost: e.target.value }).then(load)} /></td>
            <td><button className={`btn sm ${b.active ? 'green' : 'dark'}`} onClick={async () => { await adminApi.updateBoost(b.id, { active: !b.active }); load(); }}>{b.active ? 'فعال' : 'خاموش'}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Boxes({ showToast }) {
  const [list, setList] = useState(null);
  const load = () => adminApi.boxes().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  if (!list) return <div className="muted">...</div>;

  return (
    <>
      {list.map((b) => (
        <div key={b.key} className="card">
          <h3>{b.emoji} {b.name} <span className="badge">{b.rarity}</span></h3>
          <div className="muted">🪙 {fmt(b.coinCost)} | 💎 {b.gemCost}</div>
          <table className="table" style={{ marginTop: 8 }}>
            <thead><tr><th>آیتم</th><th>نوع</th><th>کلید</th><th>تعداد</th><th>وزن</th></tr></thead>
            <tbody>
              {b.items.map((i) => {
                const total = b.items.reduce((s, x) => s + x.weight, 0);
                return (
                  <tr key={i.id}>
                    <td>{i.emoji} {i.label}</td><td>{i.kind}</td><td>{i.key || '—'}</td>
                    <td>{i.quantity}</td>
                    <td>{i.weight} ({Math.round((i.weight / total) * 100)}٪)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function DailyRewards({ showToast }) {
  const [list, setList] = useState(null);
  const load = () => adminApi.dailyRewards().then(setList).catch((e) => showToast(e.message, 'error'));
  useEffect(() => { load(); }, []);
  if (!list) return <div className="muted">...</div>;

  const upd = async (day, body) => {
    try { await adminApi.updateDailyReward(day, body); showToast('ذخیره شد'); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <table className="table">
      <thead><tr><th>روز</th><th>نوع</th><th>کلید</th><th>مقدار</th><th>برچسب</th></tr></thead>
      <tbody>
        {list.map((d) => (
          <tr key={d.day}>
            <td>{d.day}</td>
            <td>
              <select className="input" style={{ width: 100 }} defaultValue={d.kind} onChange={(e) => upd(d.day, { kind: e.target.value })}>
                {['COIN', 'GEM', 'ITEM', 'BOOST', 'BOX'].map((k) => <option key={k}>{k}</option>)}
              </select>
            </td>
            <td><input className="input" style={{ width: 120 }} defaultValue={d.key} onBlur={(e) => upd(d.day, { key: e.target.value })} /></td>
            <td><input className="input" style={{ width: 80 }} type="number" defaultValue={d.quantity} onBlur={(e) => upd(d.day, { quantity: e.target.value })} /></td>
            <td><input className="input" style={{ width: 180 }} defaultValue={d.label} onBlur={(e) => upd(d.day, { label: e.target.value })} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
