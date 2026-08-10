import { Link } from 'react-router-dom';

const diffClass = { easy: 'easy', medium: 'medium', hard: 'hard', advanced: 'hard' };

export default function RecipeCard({ recipe, isFavorite, onToggleFavorite }) {
  const p = recipe.properties || {};
  const img = p.image || 'https://images.unsplash.com/vector-1762854783600-6aaf7761e42e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=260&fit=crop';
  const total = (parseInt(p.prep_time_minutes, 10) || 0) + (parseInt(p.cook_time_minutes, 10) || 0);
  const timeStr = total ? `${total} min` : '';
  const servings = p.servings ? `${p.servings} servings` : '';
  const diff = (p.complexity_level || '').toLowerCase();
  const badgeCls = diffClass[diff] || 'easy';
  const badgeLabel = p.complexity_level || 'Easy';
  const author = p.author || '';
  const avatarLetter = author ? author.charAt(0).toUpperCase() : '';
  const category = (p.recipecategories || []).join(' ');

  return (
    <article className="recipe-card" data-category={category}>
      <Link to={`/recipe/${recipe._id}`} className="recipe-card-img-wrap">
        <img src={img} alt={p.recipe_name || ''} className="recipe-card-img" loading="lazy" />
        <span className={`recipe-badge recipe-badge--${badgeCls}`}>{badgeLabel}</span>
        {onToggleFavorite ? (
          <button
            type="button"
            className="recipe-card-fav-btn"
            onClick={(e) => { e.preventDefault(); onToggleFavorite(recipe._id); }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        ) : null}
      </Link>
      <div className="recipe-card-body">
        <div className="recipe-card-meta">
          {timeStr ? <span className="meta-item">🕐 {timeStr}</span> : null}
          {servings ? <span className="meta-item">🍽 {servings}</span> : null}
        </div>
        <h3 className="recipe-card-title"><Link to={`/recipe/${recipe._id}`}>{p.recipe_name}</Link></h3>
        <p className="recipe-card-desc">{p.description || ''}</p>
        {author ? (
          <div className="recipe-card-footer">
            <div className="recipe-author">
              <div className="avatar avatar--sm">{avatarLetter}</div>
              <span>{author}</span>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
