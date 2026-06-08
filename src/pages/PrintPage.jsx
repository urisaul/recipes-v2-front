import { useEffect, useMemo } from 'react';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function PrintPage() {
  const params = new URLSearchParams(window.location.search);
  const showImage = params.get('showImage') !== 'false';
  const showNutrition = params.get('showNutrition') !== 'false';
  const recipe = useMemo(() => {
    const raw = sessionStorage.getItem('rb-print-recipe');
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    if (recipe) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [recipe]);

  if (!recipe) {
    return (
      <main className="print-page" id="printContent">
        <div className="print-loading">
          <span style={{ fontSize: '2rem' }}>🍴</span>
          <p>No recipe data found. Please open this page from the Recipe page.</p>
        </div>
      </main>
    );
  }

  const totalMin = (parseInt(recipe.prepTime, 10) || 0) + (parseInt(recipe.cookTime, 10) || 0);
  const tags = recipe.tags || [];
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : recipe.ingredients ? recipe.ingredients.split('\n').filter(Boolean) : [];
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : recipe.instructions ? recipe.instructions.split('\n').filter(Boolean) : [];

  return (
    <>
      <div className="print-toolbar">
        <span className="print-toolbar-logo">🍴 RecipeBook</span>
        <div className="print-toolbar-actions">
          <button className="toolbar-btn" type="button" onClick={() => window.close()}>✕ Close</button>
          <button className="toolbar-btn toolbar-btn--primary" type="button" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      <main className="print-page" id="printContent">
        <div className="print-header">
          <h1 className="print-title">{recipe.title}</h1>
          <span className="print-logo-mark">🍴 RecipeBook</span>
        </div>

        <div className="print-meta">
          <span className="print-chip">🕐 {escapeHtml(String(recipe.prepTime))} min prep</span>
          <span className="print-chip">🔥 {escapeHtml(String(recipe.cookTime))} min cook</span>
          <span className="print-chip">⏱ {totalMin} min total</span>
          <span className="print-chip">🍽 {escapeHtml(String(recipe.servings))} servings</span>
          {recipe.difficulty ? <span className="print-chip">📊 {recipe.difficulty}</span> : null}
        </div>

        {recipe.author ? <p className="print-author">Recipe by <strong>{recipe.author}</strong></p> : null}

        {tags.length ? <div className="print-tags">{tags.map((t) => <span className="print-tag" key={t}>{t}</span>)}</div> : null}

        {showImage && recipe.image ? (
          <div className="print-hero"><img src={recipe.image} alt={recipe.title || ''} /></div>
        ) : null}

        {recipe.description ? <p className="print-description">{recipe.description}</p> : null}

        <div className="print-body">
          <div>
            <h2 className="print-section-title">Ingredients</h2>
            <ul className="print-ingredients">
              {ingredients.map((ing) => <li className="print-ingredient" key={ing}>{ing}</li>)}
            </ul>

            {showNutrition ? (
              <div className="print-nutrition">
                <h3 className="print-section-title">Nutrition <small style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>per serving</small></h3>
                <div className="print-nutrition-grid">
                  <div className="print-nutrition-item"><span className="print-nutrition-value">{recipe.nutrition?.calories || '—'}</span><span className="print-nutrition-label">Calories</span></div>
                  <div className="print-nutrition-item"><span className="print-nutrition-value">{recipe.nutrition?.fat || '—'}</span><span className="print-nutrition-label">Fat</span></div>
                  <div className="print-nutrition-item"><span className="print-nutrition-value">{recipe.nutrition?.carbs || '—'}</span><span className="print-nutrition-label">Carbs</span></div>
                  <div className="print-nutrition-item"><span className="print-nutrition-value">{recipe.nutrition?.protein || '—'}</span><span className="print-nutrition-label">Protein</span></div>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <h2 className="print-section-title">Instructions</h2>
            <ol className="print-steps">
              {instructions.map((step, i) => (
                <li className="print-step" key={`${step}-${i}`}>
                  <div className="print-step-num">{i + 1}</div>
                  <p className="print-step-text">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    </>
  );
}
