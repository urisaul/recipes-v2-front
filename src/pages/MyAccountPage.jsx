import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import RecipeListItem from '../components/RecipeListItem';
import { FAVORITES_OBJECT_ID, PORTAL_ID, RECIPES_OBJECT_ID } from '../lib/constants';
import { getApiClient } from '../lib/portalApi';

const emptyRecipeForm = {
  recipeTitle: '',
  recipeDesc: '',
  recipeCategory: '',
  recipeDifficulty: 'easy',
  prepTime: '',
  cookTime: '',
  servings: '',
  calories: '',
  fat: '',
  protein: '',
  carbs: '',
  recipePublic: false,
};

export default function MyAccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [sort, setSort] = useState('newest');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ingredients, setIngredients] = useState(['', '']);
  const [steps, setSteps] = useState(['']);
  const [form, setForm] = useState(emptyRecipeForm);
  const [isSaving, setIsSaving] = useState(false);
  const [visibilityLoadingId, setVisibilityLoadingId] = useState('');
  const [deleteLoadingId, setDeleteLoadingId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const api = await getApiClient();
        const currentUser = await api.auth.verifyToken();
        const displayName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || '';
        setUser({ displayName, shortName: currentUser.firstName || displayName });
        await loadRecipes(api);
      } catch {
        navigate('/login');
      }
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return recipes;
    if (activeTab === 'favorites') {
      const favoriteSet = new Set(favoriteRecipeIds);
      return recipes.filter((recipe) => favoriteSet.has(String(recipe?._id || '')));
    }
    return recipes.filter((r) => (r.data?.privacy_setting === 'public' ? 'public' : 'private') === activeTab);
  }, [activeTab, favoriteRecipeIds, recipes]);

  function toRecipeIdList(records) {
    const idSet = new Set();
    const candidateKeys = [
      'recipes',
      'savedRecipeId',
      'recipeId',
      'recipe_id',
      'favoriteRecipeId',
      'favouriteRecipeId',
      'recipeIds',
      'savedRecipeIds',
    ];

    records.forEach((record) => {
      const data = record?.data || record || {};
      candidateKeys.forEach((key) => {
        const value = data[key];
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (entry !== null && entry !== undefined && String(entry).trim()) {
              idSet.add(String(entry));
            }
          });
          return;
        }
        if (value !== null && value !== undefined && String(value).trim()) {
          idSet.add(String(value));
        }
      });
    });

    return Array.from(idSet);
  }

  async function loadRecipes(apiClient, sortValue) {
    const api = apiClient || (await getApiClient());
    const currentSort = sortValue || sort;
    const sortParam = currentSort === 'newest'
      ? [{ field: 'creation_date', order: 'desc' }]
      : currentSort === 'oldest'
        ? [{ field: 'creation_date', order: 'asc' }]
        : currentSort === 'name-asc'
          ? [{ field: 'recipe_name', order: 'asc' }]
          : [{ field: 'recipe_name', order: 'desc' }];
    const [recipesData, favoritesData] = await Promise.all([
      api.auth.getData({ portalId: PORTAL_ID, objectId: RECIPES_OBJECT_ID, page: 1, limit: 100, sort: sortParam }),
      api.auth.getData({ portalId: PORTAL_ID, objectId: FAVORITES_OBJECT_ID, page: 1, limit: 500 }),
    ]);
    const records = Array.isArray(recipesData) ? recipesData : recipesData?.data || recipesData?.records || [];
    const favoriteRecords = Array.isArray(favoritesData) ? favoritesData : favoritesData?.data || favoritesData?.records || [];
    setRecipes(records);
    setFavoriteRecipeIds(toRecipeIdList(favoriteRecords));
  }

  function openNewModal() {
    setEditId('');
    setForm(emptyRecipeForm);
    setIngredients(['', '']);
    setSteps(['']);
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(true);
  }

  function openEditModal(recipe) {
    const d = recipe.data || {};
    setEditId(recipe._id);
    setForm({
      recipeTitle: d.recipe_name || '',
      recipeDesc: d.description || '',
      recipeCategory: d.category || '',
      recipeDifficulty: d.difficulty || 'easy',
      prepTime: d.prep_time_minutes || '',
      cookTime: d.cook_time_minutes || '',
      servings: d.servings || '',
      calories: d.calories || '',
      fat: d.fat || '',
      protein: d.protein || '',
      carbs: d.carbs || '',
      recipePublic: d.privacy_setting === 'public',
    });
    const ing = Array.isArray(d.ingredients) ? d.ingredients : d.ingredients ? String(d.ingredients).split('\n').filter(Boolean) : [''];
    const stp = Array.isArray(d.instructions) ? d.instructions : d.instructions ? String(d.instructions).split('\n').filter(Boolean) : [''];
    setIngredients(ing.length ? ing : ['']);
    setSteps(stp.length ? stp : ['']);
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(true);
  }

  async function onSubmitRecipe(e) {
    e.preventDefault();
    if (isSaving) return;

    if (!form.recipeTitle.trim()) {
      alert('Please enter a recipe title.');
      return;
    }

    const recipeFields = {
      recipe_name: form.recipeTitle.trim(),
      description: form.recipeDesc.trim(),
      category: form.recipeCategory,
      difficulty: form.recipeDifficulty,
      prep_time_minutes: form.prepTime,
      cook_time_minutes: form.cookTime,
      servings: form.servings,
      calories: form.calories,
      fat: form.fat,
      protein: form.protein,
      carbs: form.carbs,
      ingredients: ingredients.map((i) => i.trim()).filter(Boolean).join('\n'),
      instructions: steps.map((s) => s.trim()).filter(Boolean).join('\n'),
      privacy_setting: form.recipePublic ? 'public' : 'private',
    };

    const fd = new FormData();
    fd.append('portalId', PORTAL_ID);
    Object.entries(recipeFields).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        fd.append(`data[${key}]`, value);
      }
    });
    if (imageFile) fd.append('image', imageFile);

    try {
      setIsSaving(true);
      const api = await getApiClient();
      if (editId) {
        await api.auth.updateData(editId, fd);
      } else {
        fd.append('objectId', RECIPES_OBJECT_ID);
        await api.auth.createData(fd);
      }
      await loadRecipes(api);
      setModalOpen(false);
    } catch (err) {
      alert(err?.data?.message || 'Failed to save recipe.');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleVisibility(recipe) {
    if (visibilityLoadingId === recipe._id) return;

    const isPublic = recipe.data?.privacy_setting === 'public';
    try {
      setVisibilityLoadingId(recipe._id);
      const api = await getApiClient();
      await api.auth.updateData(recipe._id, { portalId: PORTAL_ID, data: { privacy_setting: isPublic ? 'private' : 'public' } });
      await loadRecipes(api);
    } catch {}
    finally {
      setVisibilityLoadingId('');
    }
  }

  async function deleteRecipe(recipe) {
    if (deleteLoadingId === recipe._id) return;
    if (!window.confirm('Delete this recipe? This cannot be undone.')) return;
    try {
      setDeleteLoadingId(recipe._id);
      const api = await getApiClient();
      await api.auth.deleteData(recipe._id, { portalId: PORTAL_ID });
      await loadRecipes(api);
    } catch {}
    finally {
      setDeleteLoadingId('');
    }
  }

  const publicCount = recipes.filter((r) => r.data?.privacy_setting === 'public').length;
  const privateCount = recipes.length - publicCount;
  const savesCount = recipes.reduce((sum, r) => sum + (r.data?.savedCount || r.data?.savesCount || r.data?.savedBy?.length || 0), 0);
  const favoritesCount = useMemo(() => {
    const favoriteSet = new Set(favoriteRecipeIds);
    return recipes.filter((recipe) => favoriteSet.has(String(recipe?._id || ''))).length;
  }, [favoriteRecipeIds, recipes]);

  return (
    <>
      <Navbar
        links={[
          { to: '/', label: 'Home', end: true },
          { to: '/my-account', label: 'My Recipes' },
          { to: '/profile', label: 'Profile' },
        ]}
        user={user}
      />

      <div className="page-header">
        <div className="container">
          <div className="page-header-inner">
            <div>
              <h1 className="page-title">My Recipes</h1>
              <p className="page-subtitle">Manage, edit, and share your personal cookbook</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={openNewModal}>+ New Recipe</button>
          </div>
        </div>
      </div>

      <main className="container">
        <div className="stats-row">
          <div className="stat-card"><div className="stat-card-value">{recipes.length}</div><div className="stat-card-label">Total recipes</div></div>
          <div className="stat-card"><div className="stat-card-value">{publicCount}</div><div className="stat-card-label">Public</div></div>
          <div className="stat-card"><div className="stat-card-value">{privateCount}</div><div className="stat-card-label">Private</div></div>
          <div className="stat-card"><div className="stat-card-value">{savesCount}</div><div className="stat-card-label">Saves by others</div></div>
        </div>

        <div className="section-header">
          <div className="tabs" role="tablist">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('all')}>All</button>
          <button className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('public')}>Public</button>
          <button className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('private')}>Private</button>
          <button className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('favorites')}>Favorites ({favoritesCount})</button>
          </div>
          <select className="sort-select" aria-label="Sort recipes" value={sort} onChange={(e) => { setSort(e.target.value); loadRecipes(null, e.target.value); }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>

        <div className="recipe-list" id="recipeList">
          {filtered.length ? (
            filtered.map((recipe) => (
              <RecipeListItem
                key={recipe._id}
                recipe={recipe}
                onEdit={() => openEditModal(recipe)}
                onToggleVisibility={() => toggleVisibility(recipe)}
                onDelete={() => deleteRecipe(recipe)}
                isVisibilityLoading={visibilityLoadingId === recipe._id}
                isDeleteLoading={deleteLoadingId === recipe._id}
              />
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🍴</div>
              <div className="empty-state-title">No recipes yet</div>
              <div className="empty-state-desc">Add your first recipe to get started.</div>
              <button className="btn btn-primary" type="button" onClick={openNewModal}>+ New Recipe</button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modalTitle" onClick={(e) => !isSaving && e.target.classList.contains('modal-overlay') && setModalOpen(false)}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title" id="modalTitle">{editId ? 'Edit Recipe' : 'New Recipe'}</h2>
            <button className="modal-close" type="button" onClick={() => setModalOpen(false)} disabled={isSaving}>✕</button>
          </div>

          <form onSubmit={onSubmitRecipe} noValidate>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cover Photo</label>
                <div className="file-upload-area" onClick={() => !isSaving && document.getElementById('coverPhotoInput').click()}>
                  <input
                    type="file"
                    id="coverPhotoInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isSaving}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                  <div className="file-upload-icon">📷</div>
                  <p className="file-upload-text">Drag & drop an image or <span>browse</span></p>
                  {previewUrl ? <img src={previewUrl} className="upload-preview" alt="Preview" style={{ display: 'block' }} /> : null}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="recipeTitle">Recipe Title <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input id="recipeTitle" className="form-input" value={form.recipeTitle} onChange={(e) => setForm((v) => ({ ...v, recipeTitle: e.target.value }))} placeholder="e.g. Grandma's Lasagna" required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="recipeDesc">Description</label>
                <textarea id="recipeDesc" className="form-textarea" rows="3" value={form.recipeDesc} onChange={(e) => setForm((v) => ({ ...v, recipeDesc: e.target.value }))} placeholder="A short description of your recipe..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="recipeCategory">Category</label>
                  <select id="recipeCategory" className="form-select" value={form.recipeCategory} onChange={(e) => setForm((v) => ({ ...v, recipeCategory: e.target.value }))}>
                    <option value="">Select category</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="desserts">Desserts</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="snacks">Snacks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="recipeDifficulty">Difficulty</label>
                  <select id="recipeDifficulty" className="form-select" value={form.recipeDifficulty} onChange={(e) => setForm((v) => ({ ...v, recipeDifficulty: e.target.value }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="prepTime">Prep (min)</label>
                  <input id="prepTime" type="number" className="form-input" min="0" value={form.prepTime} onChange={(e) => setForm((v) => ({ ...v, prepTime: e.target.value }))} placeholder="10" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="cookTime">Cook (min)</label>
                  <input id="cookTime" type="number" className="form-input" min="0" value={form.cookTime} onChange={(e) => setForm((v) => ({ ...v, cookTime: e.target.value }))} placeholder="30" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="servings">Servings</label>
                  <input id="servings" type="number" className="form-input" min="1" value={form.servings} onChange={(e) => setForm((v) => ({ ...v, servings: e.target.value }))} placeholder="4" />
                </div>
              </div>

              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="calories">Calories</label>
                  <input id="calories" type="text" className="form-input" value={form.calories} onChange={(e) => setForm((v) => ({ ...v, calories: e.target.value }))} placeholder="180" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="fat">Fat</label>
                  <input id="fat" type="text" className="form-input" value={form.fat} onChange={(e) => setForm((v) => ({ ...v, fat: e.target.value }))} placeholder="14g" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="carbs">Carbs</label>
                  <input id="carbs" type="text" className="form-input" value={form.carbs} onChange={(e) => setForm((v) => ({ ...v, carbs: e.target.value }))} placeholder="8g" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="protein">Protein</label>
                  <input id="protein" type="text" className="form-input" value={form.protein} onChange={(e) => setForm((v) => ({ ...v, protein: e.target.value }))} placeholder="6g" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ingredients</label>
                <div className="dynamic-list">
                  {ingredients.map((item, i) => (
                    <div className="dynamic-list-item" key={`ing-${i}`}>
                      <input className="form-input" value={item} onChange={(e) => setIngredients((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))} placeholder="e.g. 2 cups flour" />
                      <button type="button" className="remove-item-btn" aria-label="Remove" onClick={() => ingredients.length > 1 && setIngredients((prev) => prev.filter((_, idx) => idx !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-item-btn" onClick={() => setIngredients((prev) => [...prev, ''])}>+ Add ingredient</button>
              </div>

              <div className="form-group">
                <label className="form-label">Instructions</label>
                <div className="dynamic-list">
                  {steps.map((item, i) => (
                    <div className="dynamic-list-item" key={`step-${i}`}>
                      <input className="form-input" value={item} onChange={(e) => setSteps((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))} placeholder={`Step ${i + 1}: ...`} />
                      <button type="button" className="remove-item-btn" aria-label="Remove" onClick={() => steps.length > 1 && setSteps((prev) => prev.filter((_, idx) => idx !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-item-btn" onClick={() => setSteps((prev) => [...prev, ''])}>+ Add step</button>
              </div>

              <div className="form-group">
                <label className="form-label">Visibility</label>
                <div className="toggle-wrap">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.recipePublic} onChange={(e) => setForm((v) => ({ ...v, recipePublic: e.target.checked }))} />
                    <span className="toggle-slider" />
                  </label>
                  <span className="toggle-label">{form.recipePublic ? 'Public' : 'Private'}</span>
                </div>
                <p className="form-hint">Toggle on to make this recipe visible to everyone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving} aria-busy={isSaving}>
                {isSaving ? (
                  <>
                    <span className="btn-loader" aria-hidden="true" />
                    Saving...
                  </>
                ) : 'Save Recipe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
