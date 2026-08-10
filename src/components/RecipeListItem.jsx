export default function RecipeListItem({ recipe, onEdit, onToggleVisibility, onDelete, isVisibilityLoading = false, isDeleteLoading = false }) {
  const d = recipe.data || {};
  const vis = d.privacy_setting === 'public' ? 'public' : 'private';
  const total = (parseInt(d.prep_time_minutes, 10) || 0) + (parseInt(d.cook_time_minutes, 10) || 0);
  const timeStr = total ? `${total} min` : '–';
  const srv = d.servings ? `${d.servings} servings` : '–';
  const img = d.image || 'https://images.unsplash.com/vector-1762854783600-6aaf7761e42e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'  || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=160&fit=crop';
  const isActionLoading = isVisibilityLoading || isDeleteLoading;

  return (
    <div className="recipe-list-item" data-visibility={vis} data-id={recipe._id}>
      <div className="recipe-list-img"><img src={img} alt={d.recipe_name || ''} loading="lazy" /></div>
      <div className="recipe-list-body">
        <div className="recipe-list-title">{d.recipe_name || ''}</div>
        <p className="recipe-list-desc">{d.description || ''}</p>
        <div className="recipe-list-meta">
          <span>🕐 {timeStr}</span>
          <span>🍽 {srv}</span>
          <span>{d.difficulty || ''}</span>
        </div>
      </div>
      <div className="recipe-list-actions">
        <span className={`visibility-badge visibility-badge--${vis}`}>{vis === 'public' ? '🌐 Public' : '🔒 Private'}</span>
        <div className="recipe-list-action-row">
          <button type="button" className="btn btn-outline btn-sm" onClick={onEdit} disabled={isActionLoading}>Edit</button>
          <button
            type="button"
            className="btn-icon"
            title={isVisibilityLoading ? 'Updating visibility...' : 'Toggle visibility'}
            onClick={onToggleVisibility}
            disabled={isActionLoading}
            aria-busy={isVisibilityLoading}
          >
            {isVisibilityLoading ? <span className="btn-loader" aria-hidden="true" /> : vis === 'public' ? '🌐' : '🔒'}
          </button>
          <button
            type="button"
            className="btn-icon"
            title={isDeleteLoading ? 'Deleting recipe...' : 'Delete recipe'}
            onClick={onDelete}
            disabled={isActionLoading}
            aria-busy={isDeleteLoading}
          >
            {isDeleteLoading ? <span className="btn-loader" aria-hidden="true" /> : '🗑'}
          </button>
        </div>
      </div>
    </div>
  );
}
