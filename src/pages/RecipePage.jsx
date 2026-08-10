import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { API_BASE, FAVORITES_OBJECT_ID, PORTAL_ID, PUBLIC_CATEGORIES_OBJECT_ID, PUBLIC_RECIPES_OBJECT_ID } from '../lib/constants';
import { getApiClient, getVerifiedUser } from '../lib/portalApi';

const diffClass = { easy: 'easy', medium: 'medium', hard: 'hard', advanced: 'hard' };

function scaleIngredient(text, factor) {
  return text.replace(/(\d+(\.\d+)?)/g, (match) => {
    const scaled = parseFloat(match) * factor;
    return Number.isInteger(scaled) ? scaled : scaled.toFixed(1).replace(/\.0$/, '');
  });
}

function parseMarkdown(text) {
  if (!text) return text;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

function normalizeRecipeIds(value) {
  const idSet = new Set();

  function add(nextValue) {
    if (nextValue === null || nextValue === undefined) return;

    if (Array.isArray(nextValue)) {
      nextValue.forEach(add);
      return;
    }

    if (typeof nextValue === 'object') {
      ['_id', 'id', 'recipeId', 'recipe_id'].forEach((key) => {
        if (key in nextValue) add(nextValue[key]);
      });
      return;
    }

    String(nextValue)
      .split(/[\n,]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((idValue) => idSet.add(idValue));
  }

  add(value);
  return Array.from(idSet);
}

export default function RecipePage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [catMap, setCatMap] = useState({});
  const [saveOn, setSaveOn] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [servings, setServings] = useState(4);
  const [baseServings, setBaseServings] = useState(4);
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [favoritesRecordId, setFavoritesRecordId] = useState(null);
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);

  useEffect(() => {
    getVerifiedUser()
      .then((u) => {
        const name = u?.name || u?.firstName || u?.email || '';
        if (name) {
          setUser({ displayName: name, shortName: u?.firstName || name });
        }
        if (u) loadUserFavorites();
      })
      .catch(() => {});
  }, []);

  async function loadUserFavorites() {
    try {
      const api = await getApiClient();
      const data = await api.auth.getData({ portalId: PORTAL_ID, objectId: FAVORITES_OBJECT_ID, page: 1, limit: 1 });
      const records = Array.isArray(data) ? data : data?.data || data?.records || [];
      const record = records[0];
      if (record) {
        setFavoritesRecordId(record._id);
        const recipeIds = normalizeRecipeIds(record?.data?.recipes || []);
        setFavoriteRecipes(recipeIds);
        if (id && recipeIds.includes(id)) {
          setSaveOn(true);
        }
      }
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const [recipeData, catData] = await Promise.all([
          fetch(`${API_BASE}/public-data/${PUBLIC_RECIPES_OBJECT_ID}?id=${id}`).then((res) => res.json()),
          fetch(`${API_BASE}/public-data/${PUBLIC_CATEGORIES_OBJECT_ID}`).then((res) => res.json()).catch(() => []),
        ]);
        const catRecords = Array.isArray(catData) ? catData : catData?.data || catData?.records || [];
        setCatMap(Object.fromEntries(catRecords.map((c) => [c._id, c.properties?.category_name || c._id])));

        const records = Array.isArray(recipeData) ? recipeData : recipeData?.data || recipeData?.records || [];
        const found = records.find((item) => item._id === id) || records[0] || null;
        if (!found) {
          return;
        }
        const s = parseInt(found.properties?.servings, 10) || 4;
        setServings(s);
        setBaseServings(s);
        setRecipe(found);
      } catch {
        setRecipe({ error: true });
      }
    })();
  }, [id]);

  const p = recipe?.properties || {};
  const tags = useMemo(() => (p.recipecategories || []).map((tag) => catMap[tag] || tag), [catMap, p.recipecategories]);
  const ingredients = useMemo(() => {
    const raw = Array.isArray(p.ingredients) ? p.ingredients : p.ingredients ? p.ingredients.split('\n').filter(Boolean) : [];
    const factor = servings / baseServings;
    return raw.map((item) => scaleIngredient(item, factor));
  }, [baseServings, p.ingredients, servings]);
  const steps = useMemo(() => (Array.isArray(p.instructions) ? p.instructions : p.instructions ? p.instructions.split('\n').filter(Boolean) : []), [p.instructions]);

  async function onToggleSave() {
    if (!favoritesRecordId || !id) return;
    const next = !saveOn;
    setSaveOn(next);
    const newRecipes = next
      ? [...favoriteRecipes.filter((r) => r !== id), id]
      : favoriteRecipes.filter((r) => r !== id);
    try {
      const api = await getApiClient();
      await api.auth.updateData(favoritesRecordId, {
        portalId: PORTAL_ID,
        data: { recipes: newRecipes },
      });
      setFavoriteRecipes(newRecipes);
    } catch {
      setSaveOn(!next);
    }
  }

  function openPrint(showImage, showNutrition) {
    const recipeData = {
      title: p.recipe_name || '',
      description: p.description || '',
      prepTime: p.prep_time_minutes || '',
      cookTime: p.cook_time_minutes || '',
      servings,
      author: p.author || '',
      difficulty: p.complexity_level || '',
      image: p.image || '',
      tags,
      ingredients,
      instructions: steps,
      nutrition: { calories: p.calories, fat: p.fat, carbs: p.carbs, protein: p.protein },
    };
    sessionStorage.setItem('rb-print-recipe', JSON.stringify(recipeData));
    const params = new URLSearchParams({
      showImage: String(showImage),
      showNutrition: String(showNutrition),
    });
    const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
    appBaseUrl.hash = `/recipe-print?${params.toString()}`;
    window.open(appBaseUrl.toString(), '_blank');
    setPrintOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    } catch {
      setCopyLabel('Copy');
    }
  }

  const prep = parseInt(p.prep_time_minutes, 10) || 0;
  const cook = parseInt(p.cook_time_minutes, 10) || 0;
  const total = prep + cook;
  const diff = (p.complexity_level || '').toLowerCase();

  return (
    <>
      <Navbar
        links={[
          { to: '/', label: 'Home', end: true },
          { to: '/my-account', label: 'My Recipes' },
        ]}
        user={user || { displayName: 'Jane', shortName: 'Jane' }}
      />

      <main className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <Link to="/#browse">Browse</Link>
          <span className="breadcrumb-sep">›</span>
          <span>{p.recipe_name || ''}</span>
        </nav>

        {recipe?.error ? (
          <div style={{ margin: 'var(--space-lg) auto', maxWidth: '640px', padding: 'var(--space-md) var(--space-lg)', background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 500 }}>
            Could not load the recipe. Please check the link or try again later.
          </div>
        ) : null}

        {!recipe || recipe.error ? null : (
          <div className="recipe-detail-layout">
            <article>
              <div className="recipe-hero-img-wrap">
                <img id="recipeHeroImg" src={p.image || ''} alt={p.recipe_name || ''} className="recipe-hero-img" />
              </div>

              <h1 className="recipe-detail-title">{p.recipe_name}</h1>

              <div className="recipe-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={onToggleSave}>{saveOn ? '♥ Saved' : '♡ Save'}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShareOpen(true)}>Share</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPrintOpen(true)}>🖨 Print</button>
                <Link to="/my-account" className="btn btn-ghost btn-sm">✎ Edit</Link>
              </div>

              <div className="recipe-meta-row">
                <span className="meta-chip">🕐 {prep} min prep</span>
                <span className="meta-chip">🔥 {cook} min cook</span>
                <span className="meta-chip">🍽 {servings} servings</span>
                <span className={`recipe-badge recipe-badge--${diffClass[diff] || 'easy'}`} style={{ position: 'static' }}>{p.complexity_level || ''}</span>
              </div>

              <div className="recipe-author-row">
                <div className="avatar avatar--md">{(p.author || '?')[0].toUpperCase()}</div>
                <div className="recipe-author-info">
                  <div className="recipe-author-label">Recipe by</div>
                  <div className="recipe-author-name">{p.author || ''}</div>
                </div>
              </div>

              <div className="recipe-tags">
                {tags.map((tag) => <span key={tag} className="tag-pill active" style={{ pointerEvents: 'none' }}>{tag}</span>)}
              </div>

              <p className="recipe-description">{parseMarkdown(p.description || '')}</p>

              <section className="content-section">
                <h2 className="content-section-title">Ingredients</h2>
                <ul className="ingredients-list">
                  {ingredients.map((ing) => (
                    <li key={ing} className="ingredient-item"><input type="checkbox" className="ingredient-check" aria-label="Check off ingredient" /><span>{parseMarkdown(ing)}</span></li>
                  ))}
                </ul>
              </section>

              <section className="content-section">
                <h2 className="content-section-title">Instructions</h2>
                <ol className="steps-list">
                  {steps.map((step, i) => (
                    <li key={`${step}-${i}`} className="step-item"><div className="step-number">{i + 1}</div><p className="step-text">{parseMarkdown(step)}</p></li>
                  ))}
                </ol>
              </section>
            </article>

            <aside className="recipe-sidebar">
              <div className="card">
                <div className="card-header">Servings</div>
                <div className="card-body">
                  <div className="serving-adjuster">
                    <button type="button" className="serving-btn" onClick={() => setServings((v) => Math.max(1, v - 1))}>−</button>
                    <span className="serving-count">{servings}</span>
                    <button type="button" className="serving-btn" onClick={() => setServings((v) => v + 1)}>+</button>
                  </div>
                  <p className="form-hint" style={{ marginTop: 'var(--space-xs)' }}>Ingredient quantities update automatically.</p>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Time</div>
                <div className="card-body" style={{ gap: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span style={{ color: 'var(--color-text-secondary)' }}>Prep</span><span style={{ fontWeight: 600 }}>{prep ? `${prep} min` : ''}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}><span style={{ color: 'var(--color-text-secondary)' }}>Cook</span><span style={{ fontWeight: 600 }}>{cook ? `${cook} min` : ''}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border)' }}><span style={{ fontWeight: 600 }}>Total</span><span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{total ? `${total} min` : ''}</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Nutrition <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>per serving</span></div>
                <div className="card-body">
                  <div className="nutrition-grid">
                    <div className="nutrition-item"><span className="nutrition-value">{p.calories || '—'}</span><span className="nutrition-label">Calories</span></div>
                    <div className="nutrition-item"><span className="nutrition-value">{p.fat || '—'}</span><span className="nutrition-label">Fat</span></div>
                    <div className="nutrition-item"><span className="nutrition-value">{p.carbs || '—'}</span><span className="nutrition-label">Carbs</span></div>
                    <div className="nutrition-item"><span className="nutrition-value">{p.protein || '—'}</span><span className="nutrition-label">Protein</span></div>
                  </div>
                  <p className="form-hint">Estimates based on standard ingredients.</p>
                </div>
              </div>

              <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} onClick={onToggleSave}>{saveOn ? '♥ Saved' : '♡ Save Recipe'}</button>
              <button type="button" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} onClick={() => setShareOpen(true)}>Share</button>
            </aside>
          </div>
        )}
      </main>

      <Footer />

      <div className={`modal-overlay ${printOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="printModalTitle" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setPrintOpen(false); }}>
        <div className="modal" style={{ maxWidth: '400px' }}>
          <div className="modal-header">
            <h2 className="modal-title" id="printModalTitle">🖨 Print Settings</h2>
            <button className="modal-close" type="button" onClick={() => setPrintOpen(false)}>✕</button>
          </div>
          <div className="modal-body" style={{ gap: 'var(--space-md)' }}>
            <button type="button" className="btn btn-outline" onClick={() => openPrint(true, true)}>Print with image + nutrition</button>
            <button type="button" className="btn btn-outline" onClick={() => openPrint(true, false)}>Print with image only</button>
            <button type="button" className="btn btn-outline" onClick={() => openPrint(false, false)}>Print text only</button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${shareOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="shareModalTitle" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) setShareOpen(false); }}>
        <div className="modal" style={{ maxWidth: '420px' }}>
          <div className="modal-header">
            <h2 className="modal-title" id="shareModalTitle">Share Recipe</h2>
            <button className="modal-close" type="button" onClick={() => setShareOpen(false)}>✕</button>
          </div>
          <div className="modal-body" style={{ gap: 'var(--space-sm)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Copy the link to share this recipe:</p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <input type="text" className="form-input" value={window.location.href} readOnly style={{ fontSize: '0.875rem' }} />
              <button type="button" className="btn btn-primary btn-sm" onClick={copyLink}>{copyLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
